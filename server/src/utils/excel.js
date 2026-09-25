const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { DATA_FOLDER } = require('../config');

/** Find a file in DATA_FOLDER whose name matches one of the given keywords. */
function findFile(keywords) {
  if (!fs.existsSync(DATA_FOLDER)) {
    throw new Error(`Data folder not found: ${DATA_FOLDER}`);
  }
  const files = fs.readdirSync(DATA_FOLDER).filter((f) => /\.xlsx?$/i.test(f) && !f.startsWith('~$'));
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const match = files.find((f) => {
    const lower = f.toLowerCase();
    return lowerKeywords.some((k) => lower.includes(k));
  });
  return match ? path.join(DATA_FOLDER, match) : null;
}

/** Load a workbook fresh from disk (no caching - always reflects latest saved file). */
function loadWorkbook(filePath) {
  return XLSX.readFile(filePath, { cellDates: true, cellNF: false, cellText: false });
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

module.exports = {
  findFile,
  loadWorkbook,
  sheetToGrid,
  sheetToObjects,
  toNumber,
  toPercent,
  cleanStr,
  toISODate,
};
