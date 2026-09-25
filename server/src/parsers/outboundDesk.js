const { findFile, loadWorkbook, sheetToObjects, cleanStr, toISODate } = require('../utils/excel');

/**
 * Outbound Desk: one call-attempt log sheet per agent (currently "Julia Log"
 * and "Sam Log"). The two sheets have slightly different columns (Julia's
 * has Connect Type/Next Action, Sam's doesn't) and different UID/lead-code
 * conventions, so they are unified here into one record set tagged by agent,
 * with missing fields left null rather than assumed. New agent sheets are
 * picked up automatically (any sheet other than Dashboard/Assumptions whose
 * header row contains "UID" and "Outcome").
 */
function parseOutboundDesk(existingWb = null) {
  let wb = existingWb;
  if (!wb) {
    const file = findFile(['outbound']);
    if (!file) return null;
    wb = loadWorkbook(file);
  }
  const agentSheetNames = wb.SheetNames.filter((n) => !/^dashboard$|^assumptions$/i.test(n));

  const records = [];
  agentSheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const { headers, rows } = sheetToObjects(sheet, 0);
    if (!headers.includes('UID') || !headers.includes('Outcome')) return; // not a call-log sheet
    const agent = sheetName.replace(/\s*log\s*$/i, '').trim() || sheetName;

    // recompute "first occurrence of this lead" ourselves (per agent+UID),
    // rather than trusting the workbook's own formula column, so numbers
    // stay correct even if rows are re-sorted or appended out of order.
    const seenUid = new Set();

    rows
      .filter((r) => cleanStr(r['UID']))
      .forEach((r) => {
        const uid = cleanStr(r['UID']);
        const isFirstForLead = !seenUid.has(uid);
        seenUid.add(uid);
        records.push({
          agent,
          date: toISODate(r['Date']),
          uid,
          contact: cleanStr(r['Contact']),
          phone: cleanStr(r['Phone']),
          connect: cleanStr(r['Connect']),
          connectType: cleanStr(r['Connect Type']) || null,
          outcome: cleanStr(r['Outcome']),
          nextAction: cleanStr(r['Next Action']) || null,
          remarks: cleanStr(r['Remarks']),
          isFirstForLead,
        });
      });
  });

  const sum = (arr, fn) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
  const distinct = (arr, fn) => new Set(arr.map(fn).filter(Boolean)).size;
  const count = (arr, pred) => arr.filter(pred).length;

  const totalAttempts = records.length;
  const uniqueLeads = count(records, (r) => r.isFirstForLead);
  const connected = count(records, (r) => r.connect === 'Yes');
  const voicemail = count(records, (r) => r.outcome === 'Voicemail');

  const kpis = [
    { key: 'attempts', label: 'Dial Attempts Logged', value: totalAttempts, format: 'number' },
    { key: 'uniqueLeads', label: 'Unique Leads Worked', value: uniqueLeads, format: 'number' },
    { key: 'connectRate', label: 'Connect Rate', value: totalAttempts ? Math.round((connected / totalAttempts) * 1000) / 10 : 0, format: 'percent' },
    { key: 'liveConversations', label: 'Live Conversations', value: connected, format: 'number' },
    { key: 'voicemailRate', label: 'Voicemail Rate', value: totalAttempts ? Math.round((voicemail / totalAttempts) * 1000) / 10 : 0, format: 'percent' },
    { key: 'agents', label: 'Active Agents', value: distinct(records, (r) => r.agent), format: 'number' },
  ];

  const groupCount = (arr, keyFn) => {
    const map = new Map();
    arr.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byDay = groupCount(records, (r) => r.date).sort((a, b) => (a[0] > b[0] ? 1 : -1));
  const byAgent = groupCount(records, (r) => r.agent);

  // Outcome has ~10 possible values but most are single-digit counts out of
  // 929 attempts - a pie with that many slivers is unreadable and pushes
  // categorical colors past what's safely distinguishable side by side.
  // Keep the top 5 and fold the long tail into "Other".
  const outcomeGroups = groupCount(records, (r) => r.outcome);
  const byOutcome = outcomeGroups.length > 6
    ? [...outcomeGroups.slice(0, 5), ['Other', outcomeGroups.slice(5).reduce((a, x) => a + x[1], 0)]]
    : outcomeGroups;

  const agentComparison = [...new Set(records.map((r) => r.agent))].map((agent) => {
    const agentRows = records.filter((r) => r.agent === agent);
    const agentConnected = count(agentRows, (r) => r.connect === 'Yes');
    return {
      agent,
      attempts: agentRows.length,
      uniqueLeads: count(agentRows, (r) => r.isFirstForLead),
      connectRate: agentRows.length ? Math.round((agentConnected / agentRows.length) * 1000) / 10 : 0,
    };
  });

  const charts = [
    { id: 'byDay', title: 'Dial Attempts by Day', type: 'bar', labels: byDay.map((x) => x[0]), series: [{ name: 'Attempts', data: byDay.map((x) => x[1]) }] },
    { id: 'byOutcome', title: 'Call Outcomes (Combined)', type: 'pie', labels: byOutcome.map((x) => x[0]), series: [{ name: 'Attempts', data: byOutcome.map((x) => x[1]) }] },
    { id: 'byAgent', title: 'Dial Attempts by Agent', type: 'bar', labels: byAgent.map((x) => x[0]), series: [{ name: 'Attempts', data: byAgent.map((x) => x[1]) }] },
  ];

  return {
    department: 'outbound-desk',
    label: 'Outbound Desk',
    sourceFile: 'Outbound-desk-mis-dashboard.xlsx',
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'calls',
        label: 'Call Attempts',
        dimensions: [
          { key: 'agent', label: 'Agent' },
          { key: 'date', label: 'Date' },
          { key: 'outcome', label: 'Outcome' },
          { key: 'connect', label: 'Connected' },
          { key: 'connectType', label: 'Connect Type' },
        ],
        metric: { key: null, label: 'Call Attempts', agg: 'count' },
        records,
      },
    ],
    agentComparison,
    dataNotes: [
      'Julia Log and Sam Log use different column sets (Connect Type / Next Action only exist for Julia); missing fields are left blank rather than guessed for Sam\'s rows.',
      '"Unique Leads Worked" is recomputed here as the first logged attempt per Agent+UID, rather than reusing the workbook\'s own flag column.',
      'Agents currently use different lead-numbering conventions (e.g. CPTA-LAC-... vs TX_2027_HR_...), consistent with working separate lead lists.',
    ],
  };
}

module.exports = { parseOutboundDesk };
