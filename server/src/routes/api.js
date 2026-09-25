const express = require('express');
const { DEPARTMENTS } = require('../config');
const { parseMarketing } = require('../parsers/marketing');
const { parseCreUtilization } = require('../parsers/creUtilization');
const { parseOutboundDesk } = require('../parsers/outboundDesk');
const { parseSwEngineering } = require('../parsers/swEngineering');

const PARSERS = {
  marketing: parseMarketing,
  'cre-utilization': parseCreUtilization,
  'outbound-desk': parseOutboundDesk,
  'sw-engineering': parseSwEngineering,
};

const serverCache = new Map();

const router = express.Router();

// List of departments the UI can show a picker for
router.get('/departments', (req, res) => {
  const list = DEPARTMENTS.map((d) => {
    let available = true;
    let error = null;
    try {
      let data = serverCache.get(d.id);
      if (!data) {
        data = PARSERS[d.id]();
        if (data) serverCache.set(d.id, data);
      }
      available = !!data;
      if (!data) error = 'Source file not found in the shared folder.';
    } catch (e) {
      available = false;
      error = e.message;
    }
    return { id: d.id, label: d.label, available, error };
  });
  res.json(list);
});

// Returns parsed dashboard, served instantly from memory cache
router.get('/departments/:id/dashboard', (req, res) => {
  const parser = PARSERS[req.params.id];
  if (!parser) return res.status(404).json({ error: `Unknown department "${req.params.id}"` });
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh && serverCache.has(req.params.id)) {
      return res.json(serverCache.get(req.params.id));
    }
    const data = parser();
    if (!data) return res.status(404).json({ error: 'Source file not found in the shared folder for this department yet.' });
    serverCache.set(req.params.id, data);
    res.json(data);
  } catch (e) {
    console.error(`Failed to parse department ${req.params.id}:`, e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
