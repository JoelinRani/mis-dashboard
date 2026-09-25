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

const serverCache = new Map();
let isSyncing = false;

// Fetch single department workbook directly in-memory
async function fetchAndParseDepartment(deptId) {
  const dept = DEPARTMENTS.find((d) => d.id === deptId);
  const parser = PARSERS[deptId];
  if (!dept || !parser) throw new Error(`Unknown department "${deptId}"`);

  const wb = await fetchWorkbookFromOneDrive(dept.cloudUrl);
  const data = parser(wb);
  if (!data) throw new Error(`Could not parse data for department "${deptId}"`);
  data.sourceUrl = dept.cloudUrl;

  serverCache.set(deptId, { data, timestamp: Date.now() });
  return data;
}

// Background sync for all departments to ensure instantaneous (<1ms) response times
async function syncAllDepartments() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await Promise.allSettled(
      DEPARTMENTS.map((d) => fetchAndParseDepartment(d.id))
    );
  } finally {
    isSyncing = false;
  }
}

// Warm up memory cache immediately on boot
syncAllDepartments().catch(console.error);

// Background sync every 5 seconds so fresh edits are always ready in RAM
setInterval(() => {
  syncAllDepartments().catch(console.error);
}, 5000);

const router = express.Router();

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

// Returns parsed dashboard: serves instantly from memory or fresh on refresh
router.get('/departments/:id/dashboard', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const cached = serverCache.get(req.params.id);

    // If cached and no forced refresh requested, respond instantly (0ms)
    if (!forceRefresh && cached) {
      return res.json(cached.data);
    }

    // Force refresh or cold cache: fetch fresh from cloud
    const data = await fetchAndParseDepartment(req.params.id);
    res.json(data);
  } catch (e) {
    // If live fetch fails but we have cached version, fallback to cached to avoid breaking UI
    const cached = serverCache.get(req.params.id);
    if (cached) {
      return res.json(cached.data);
    }
    console.error(`Failed to load department ${req.params.id}:`, e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
