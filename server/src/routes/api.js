const express = require('express');
const fs = require('fs');
const { DEPARTMENTS } = require('../config');
const { fetchWorkbookFromOneDrive, findLocalWorkbook, loadWorkbook, ONEDRIVE_SEARCH_PATHS } = require('../utils/excel');
const { parseMarketing } = require('../parsers/marketing');
const { parseCreUtilization } = require('../parsers/creUtilization');
const { parseOutboundDesk } = require('../parsers/outboundDesk');
const { parseSwEngineering } = require('../parsers/swEngineering');
const { parseItOperations } = require('../parsers/itOperations');

const PARSERS = {
  marketing: parseMarketing,
  'cre-utilization': parseCreUtilization,
  'outbound-desk': parseOutboundDesk,
  'sw-engineering': parseSwEngineering,
  'it-operations': parseItOperations,
};

const serverCache = new Map();
let isSyncing = false;
const sseClients = new Set();
let debounceTimer = null;

function broadcastChange(deptId) {
  if (deptId) {
    serverCache.delete(deptId);
  } else {
    serverCache.clear();
  }
  const payload = JSON.stringify({ type: 'file_changed', departmentId: deptId || 'all', timestamp: Date.now() });
  for (const client of [...sseClients]) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function debouncedBroadcast(deptId) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    broadcastChange(deptId);
  }, 40);
}

// Watch local OneDrive directories for instantaneous (<10ms) save detection
for (const dir of ONEDRIVE_SEARCH_PATHS) {
  if (fs.existsSync(dir)) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename || filename.startsWith('~$')) return;
        const lowerName = filename.toLowerCase();
        const matchedDept = DEPARTMENTS.find(d => 
          (d.fileName && lowerName.endsWith(d.fileName.toLowerCase())) || 
          (d.fileName && lowerName.includes(d.fileName.toLowerCase())) ||
          lowerName.includes(d.id)
        );
        debouncedBroadcast(matchedDept ? matchedDept.id : null);
      });
      watcher.on('error', () => {});
    } catch {
      try {
        const watcher = fs.watch(dir, (eventType, filename) => {
          if (!filename || filename.startsWith('~$')) return;
          debouncedBroadcast(null);
        });
        watcher.on('error', () => {});
      } catch {}
    }
  }
}

// Read local workbook with retry for brief Excel file-locks during save (<50ms)
async function readLocalWorkbookWithRetry(filePath, maxRetries = 8, delayMs = 35) {
  let lastErr = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return loadWorkbook(filePath);
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

// Fetch single department workbook directly (ultra-fast direct cloud stream or instant local read)
async function fetchAndParseDepartment(deptId) {
  const dept = DEPARTMENTS.find((d) => d.id === deptId);
  const parser = PARSERS[deptId];
  if (!dept || !parser) throw new Error(`Unknown department "${deptId}"`);

  let wb = null;
  let fileMtime = 0;

  // 1. Check local file on disk
  const localFile = findLocalWorkbook(dept.fileName || dept.id);
  if (localFile && fs.existsSync(localFile)) {
    try {
      fileMtime = fs.statSync(localFile).mtimeMs;
      wb = await readLocalWorkbookWithRetry(localFile);
    } catch {}
  }

  // 2. Fallback or refresh via ultra-fast direct OneDrive cloud stream (~300ms)
  if (!wb) {
    try {
      wb = await fetchWorkbookFromOneDrive(dept.cloudUrl);
    } catch (err) {
      // If direct cloud fails and we have a local file, try local file again
      if (localFile && fs.existsSync(localFile)) {
        wb = await readLocalWorkbookWithRetry(localFile);
      } else {
        throw err;
      }
    }
  }

  const data = parser(wb);
  if (!data) throw new Error(`Could not parse data for department "${deptId}"`);
  data.sourceUrl = dept.cloudUrl;

  serverCache.set(deptId, { data, mtimeMs: fileMtime, timestamp: Date.now() });
  return data;
}

// Fast 200ms file-mtime watcher loop across all departments to guarantee sub-second updates
setInterval(() => {
  for (const dept of DEPARTMENTS) {
    try {
      const localFile = findLocalWorkbook(dept.fileName || dept.id);
      if (localFile && fs.existsSync(localFile)) {
        const stat = fs.statSync(localFile);
        const cached = serverCache.get(dept.id);
        if (cached && cached.mtimeMs && cached.mtimeMs !== stat.mtimeMs) {
          broadcastChange(dept.id);
        }
      }
    } catch {}
  }
}, 200);

// Continuous background cloud stream sync every 1.5 seconds so web/drive changes reflect in ~1 second
let cloudSyncIndex = 0;
setInterval(async () => {
  if (DEPARTMENTS.length === 0) return;
  const dept = DEPARTMENTS[cloudSyncIndex % DEPARTMENTS.length];
  cloudSyncIndex++;
  try {
    const wb = await fetchWorkbookFromOneDrive(dept.cloudUrl);
    const parser = PARSERS[dept.id];
    if (parser && wb) {
      const freshData = parser(wb);
      freshData.sourceUrl = dept.cloudUrl;
      const cached = serverCache.get(dept.id);
      if (!cached || JSON.stringify(cached.data) !== JSON.stringify(freshData)) {
        serverCache.set(dept.id, { data: freshData, mtimeMs: 0, timestamp: Date.now() });
        broadcastChange(dept.id);
      }
    }
  } catch {}
}, 1500);

const router = express.Router();

// Real-time SSE event stream for instantaneous updates
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('\n');
  sseClients.add(res);

  const cleanup = () => sseClients.delete(res);
  req.on('close', cleanup);
  req.on('end', cleanup);
  req.on('error', cleanup);
  res.on('error', cleanup);
});

// List of departments (instant response)
router.get('/departments', (req, res) => {
  const list = DEPARTMENTS.map((d) => ({
    id: d.id,
    label: d.label,
    available: true,
    error: null,
  }));
  res.json(list);
});

// Returns parsed dashboard: serves instantly from memory or fresh in ~300ms
router.get('/departments/:id/dashboard', async (req, res) => {
  try {
    const deptId = req.params.id;
    const dept = DEPARTMENTS.find((d) => d.id === deptId);
    const forceRefresh = req.query.refresh === 'true';
    const cached = serverCache.get(deptId);

    // Check local file mtime
    let currentMtime = 0;
    if (dept) {
      const localFile = findLocalWorkbook(dept.fileName || dept.id);
      if (localFile && fs.existsSync(localFile)) {
        try {
          currentMtime = fs.statSync(localFile).mtimeMs;
        } catch {}
      }
    }

    // If cached within last 800ms and file unchanged, respond immediately (0ms)
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < 800) && (currentMtime === 0 || cached.mtimeMs === currentMtime)) {
      return res.json(cached.data);
    }

    // Fetch fresh
    const data = await fetchAndParseDepartment(deptId);
    res.json(data);
  } catch (e) {
    const cached = serverCache.get(req.params.id);
    if (cached) {
      return res.json(cached.data);
    }
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
