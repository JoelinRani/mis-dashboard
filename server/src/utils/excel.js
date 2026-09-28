const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { DATA_FOLDER } = require('../config');

const ONEDRIVE_SEARCH_PATHS = [
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'OneDrive', 'Fw_ MIS Dashboard'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'OneDrive - Park Corporates', 'Fw_ MIS Dashboard'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'Downloads', 'Fw_ MIS Dashboard'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'Downloads'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'Desktop'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'OneDrive'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'OneDrive - Park Corporates'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\JoelinRaniJ', 'Documents'),
];

/** Find the newest local workbook across all OneDrive and local directories. */
function findLocalWorkbook(fileNameOrKeywords) {
  const keywords = Array.isArray(fileNameOrKeywords) ? fileNameOrKeywords : [fileNameOrKeywords];
  let bestMatch = null;
  let bestMtime = 0;

  for (const dir of ONEDRIVE_SEARCH_PATHS) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter((f) => /\.xlsx?$/i.test(f) && !f.startsWith('~$'));
      for (const kw of keywords) {
        if (!kw) continue;
        const lowerKw = kw.toLowerCase();
        for (const file of files) {
          const lowerFile = file.toLowerCase();
          if (lowerFile === lowerKw || lowerFile.endsWith(lowerKw) || lowerFile.includes(lowerKw)) {
            const fullPath = path.join(dir, file);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.mtimeMs > bestMtime) {
                bestMtime = stat.mtimeMs;
                bestMatch = fullPath;
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  return bestMatch;
}

/** Load a workbook fresh from disk (no caching - always reflects latest saved file). */
function loadWorkbook(filePath) {
  return XLSX.readFile(filePath, { cellDates: true, cellNF: false, cellText: false });
}

const cloudSessionCache = new Map();

/** Fetch and parse an Excel workbook directly from OneDrive over HTTPS into memory (always fresh, ultra-fast streaming in ~300ms). */
async function fetchWorkbookFromOneDrive(url) {
  const noCacheHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  const cachedSession = cloudSessionCache.get(url);
  const now = Date.now();

  // 1. Try direct ultra-fast fetch if session was resolved within last 15 minutes (~250-350ms)
  if (cachedSession && (now - cachedSession.resolvedAt < 15 * 60 * 1000)) {
    try {
      const directUrl = cachedSession.directUrl + (cachedSession.directUrl.includes('?') ? `&_t=${now}` : `?_t=${now}`);
      const res = await fetch(directUrl, {
        headers: {
          ...noCacheHeaders,
          ...(cachedSession.cookieHeader ? { Cookie: cachedSession.cookieHeader } : {})
        }
      });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        return XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true, cellNF: false, cellText: false });
      }
    } catch {
      // Fallback to full redirect resolution
    }
  }

  // 2. Full redirect resolution (initial connection or session refresh)
  let curr = url.includes('?') ? `${url}&download=1&_t=${now}` : `${url}?download=1&_t=${now}`;
  const cookieMap = new Map();
  let finalUrl = curr;

  for (let i = 0; i < 10; i++) {
    const cookieHeader = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(curr, {
      redirect: 'manual',
      headers: {
        ...noCacheHeaders,
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      }
    });

    const setCookies = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);
    for (const c of setCookies) {
      const pair = c.split(';')[0];
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        cookieMap.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
      }
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) break;
      curr = new URL(loc, curr).toString();
      finalUrl = curr;
      continue;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch OneDrive workbook (HTTP ${res.status}): ${res.statusText}`);
    }

    const cookieHeaderFinal = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    cloudSessionCache.set(url, { directUrl: finalUrl, cookieHeader: cookieHeaderFinal, resolvedAt: now });

    const arrayBuffer = await res.arrayBuffer();
    return XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true, cellNF: false, cellText: false });
  }
  throw new Error('Failed to resolve OneDrive download redirect after 10 attempts');
}

/** Convert a sheet to an array-of-arrays (raw grid), trimming trailing empty rows. */
function sheetToGrid(sheet) {
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true, blankrows: true });
  // trim fully-blank trailing rows
  let lastNonEmpty = -1;
  grid.forEach((row, i) => {
    if (row.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) lastNonEmpty = i;
  });
  return grid.slice(0, lastNonEmpty + 1);
}

/**
 * Convert a sheet to an array of objects using the row at headerRowIndex (0-based)
 * as keys, reading down until it hits `stopAt` consecutive fully-blank rows.
 */
function sheetToObjects(sheet, headerRowIndex = 0, { stopAfterBlank = 3 } = {}) {
  const grid = sheetToGrid(sheet);
  const headerRow = (grid[headerRowIndex] || []).map((h) => (h === null || h === undefined ? '' : String(h).trim()));
  const rows = [];
  let blankStreak = 0;
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const isBlank = row.every((c) => c === null || c === undefined || String(c).trim() === '');
    if (isBlank) {
      blankStreak++;
      if (blankStreak >= stopAfterBlank) break;
      continue;
    }
    blankStreak = 0;
    const obj = {};
    headerRow.forEach((key, ci) => {
      if (!key) return;
      obj[key] = row[ci] === undefined ? null : row[ci];
    });
    obj.__row = r + 1; // 1-based excel row number, useful for traceability
    rows.push(obj);
  }
  return { headers: headerRow.filter(Boolean), rows };
}

function toNumber(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,%]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function toPercent(v) {
  // Excel percentages come through as decimals (0.95) already when the cell
  // format is %, so just clamp/round for display as a 0-100 number.
  const n = toNumber(v, null);
  if (n === null) return null;
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

function cleanStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toISODate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function getFileMtime(keywords) {
  try {
    const file = findFile(keywords);
    if (!file || !fs.existsSync(file)) return 0;
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

module.exports = {
  ONEDRIVE_SEARCH_PATHS,
  findLocalWorkbook,
  findFile: findLocalWorkbook,
  getFileMtime,
  loadWorkbook,
  fetchWorkbookFromOneDrive,
  sheetToGrid,
  sheetToObjects,
  toNumber,
  toPercent,
  cleanStr,
  toISODate,
};
