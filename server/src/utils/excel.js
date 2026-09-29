const XLSX = require('xlsx');

/** Convert OneDrive sharing URL to direct cloud download URL. */
function getOneDriveDirectDownloadUrl(url) {
  if (!url) return null;
  const match = url.match(/\/c\/([^\/]+)\/([^\/?]+)/);
  if (match) {
    const [, cid, token] = match;
    return `https://onedrive.live.com/personal/${cid}/_layouts/15/download.aspx?share=${token}`;
  }
  return url;
}

/** Fetch and parse an Excel workbook directly from OneDrive Cloud in memory with WAF protection. */
async function fetchWorkbookFromOneDrive(url) {
  const directUrl = getOneDriveDirectDownloadUrl(url);

  const res = await fetch(directUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch live OneDrive cloud workbook (HTTP ${res.status}): ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('OneDrive returned HTML instead of Excel binary (WAF rate limit or blocked session)');
  }

  const arrayBuffer = await res.arrayBuffer();
  return XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true, cellNF: false, cellText: false });
}

/** Convert a sheet to an array-of-arrays (raw grid), trimming trailing empty rows. */
function sheetToGrid(sheet) {
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true, blankrows: true });
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
    obj.__row = r + 1;
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

module.exports = {
  fetchWorkbookFromOneDrive,
  sheetToGrid,
  sheetToObjects,
  toNumber,
  toPercent,
  cleanStr,
  toISODate,
};
