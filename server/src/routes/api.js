const express = require('express');
const { DEPARTMENTS } = require('../config');
const { fetchWorkbookFromOneDrive } = require('../utils/excel');
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

// In-memory instant cache
const serverCache = new Map();
const sseClients = new Set();
let activeDepartmentId = 'sw-engineering';
let broadcastDebounce = null;
let isCloudFetchInProgress = false;

function broadcastChange(deptId) {
  const payload = JSON.stringify({ type: 'file_changed', departmentId: deptId || 'all', timestamp: Date.now() });
  for (const client of [...sseClients]) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function notifyChange(deptId) {
  if (broadcastDebounce) clearTimeout(broadcastDebounce);
  broadcastDebounce = setTimeout(() => {
    broadcastChange(deptId);
  }, 20);
}

/**
 * Parses and updates the department cache directly from the live OneDrive Cloud URL in memory.
 */
async function syncDepartmentFromCloud(deptId) {
  const dept = DEPARTMENTS.find((d) => d.id === deptId);
  const parser = PARSERS[deptId];
  if (!dept || !parser) throw new Error(`Unknown department "${deptId}"`);

  if (!dept.cloudUrl) throw new Error(`No cloudUrl configured for department "${deptId}"`);

  const wb = await fetchWorkbookFromOneDrive(dept.cloudUrl);
  if (!wb) throw new Error(`Could not load workbook for department "${deptId}" from cloud`);

  const data = parser(wb);
  if (!data) throw new Error(`Could not parse data for department "${deptId}"`);

  const prev = serverCache.get(deptId);
  const hasChanged =
    !prev ||
    JSON.stringify(prev.data.kpis) !== JSON.stringify(data.kpis) ||
    JSON.stringify(prev.data.tables) !== JSON.stringify(data.tables);

  data.sourceUrl = dept.cloudUrl;
  data.sourceType = 'cloud';
  data.generatedAt = hasChanged ? new Date().toISOString() : (prev?.data?.generatedAt || new Date().toISOString());

  serverCache.set(deptId, {
    data,
    timestamp: Date.now(),
  });

  if (hasChanged) {
    notifyChange(deptId);
  }

  return data;
}

// 1. Ultra-fast continuous live cloud worker: streams the active department every 800ms directly from OneDrive cloud
(async function continuousActiveCloudWorker() {
  while (true) {
    if (activeDepartmentId && !isCloudFetchInProgress) {
      isCloudFetchInProgress = true;
      try {
        await syncDepartmentFromCloud(activeDepartmentId);
      } catch {}
      finally {
        isCloudFetchInProgress = false;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }
})();

// 2. Background rotation for other inactive departments
let backgroundIndex = 0;
setInterval(async () => {
  const otherDepts = DEPARTMENTS.filter((d) => d.id !== activeDepartmentId);
  if (otherDepts.length === 0) return;
  const dept = otherDepts[backgroundIndex % otherDepts.length];
  backgroundIndex++;
  try {
    await syncDepartmentFromCloud(dept.id);
  } catch {}
}, 4000);

// 3. Initial pre-load on startup across all departments in parallel directly from live cloud
Promise.all(
  DEPARTMENTS.map((dept) =>
    syncDepartmentFromCloud(dept.id).catch(() => {})
  )
);

const router = express.Router();

// Real-time SSE event stream for instantaneous updates
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
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

// Returns parsed dashboard: ALWAYS instantaneous (0ms) from memory cache
router.get('/departments/:id/dashboard', async (req, res) => {
  try {
    const deptId = req.params.id;
    activeDepartmentId = deptId;
    let cached = serverCache.get(deptId);

    if (cached) {
      return res.json(cached.data);
    }

    // If cold start, fetch from live cloud stream
    const data = await syncDepartmentFromCloud(deptId);
    return res.json(data);
  } catch (e) {
    const cached = serverCache.get(req.params.id);
    if (cached) {
      return res.json(cached.data);
    }
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
