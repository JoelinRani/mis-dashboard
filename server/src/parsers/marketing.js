const { findFile, loadWorkbook, sheetToObjects, toNumber, cleanStr } = require('../utils/excel');

/**
 * Marketing Lead Generation (Client-wise) dashboard.
 *
 * Source grain: Client x County x Property Type x Account Type -> Leads Generated.
 * The workbook's "Date/Resource Name/Attempt Target/Hours Utilized/Actual
 * Target/Records attempted/Quality%" columns are present in the header but
 * are entirely blank in the source file, so they are ignored here. The
 * trailing "Total" row (Account Type = Total, everything else blank) is
 * dropped - KPIs are recomputed from the real rows instead of trusting it.
 */
function parseMarketing() {
  const file = findFile(['marketing', 'lead generation']);
  if (!file) return null;

  const wb = loadWorkbook(file);
  const sheet = wb.Sheets['MIS Data'] || wb.Sheets[wb.SheetNames.find((n) => /mis data/i.test(n))];
  if (!sheet) throw new Error('Marketing workbook: "MIS Data" sheet not found');

  const { rows } = sheetToObjects(sheet, 0);

  const records = rows
    .map((r) => ({
      client: cleanStr(r['Client']),
      county: cleanStr(r['County']),
      state: cleanStr(r['State']),
      propertyType: cleanStr(r['Property Type']),
      accountType: cleanStr(r['Account Type']),
      leadsGenerated: toNumber(r['Leads Generated'], null),
      preliminaryResearch: cleanStr(r['Preliminary Research']),
    }))
    // drop the manual "Total" row and any fully-blank rows
    .filter((r) => r.client && r.accountType && r.accountType !== 'Total' && r.leadsGenerated !== null);

  const sum = (arr, fn) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
  const distinct = (arr, fn) => new Set(arr.map(fn).filter(Boolean)).size;

  const totalLeads = sum(records, (r) => r.leadsGenerated);
  const doneLeads = sum(records.filter((r) => r.preliminaryResearch === 'Done'), (r) => r.leadsGenerated);

  const groupSum = (keyFn) => {
    const map = new Map();
    records.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + (r.leadsGenerated || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byClient = groupSum((r) => r.client);
  const byState = groupSum((r) => r.state);
  const byAccountType = groupSum((r) => r.accountType);
  const byPropertyType = groupSum((r) => r.propertyType);

  const kpis = [
    { key: 'totalLeads', label: 'Total Leads Generated', value: totalLeads, format: 'number' },
    { key: 'clients', label: 'Clients', value: distinct(records, (r) => r.client), format: 'number' },
    { key: 'states', label: 'States Covered', value: distinct(records, (r) => r.state), format: 'number' },
    { key: 'counties', label: 'Counties Covered', value: distinct(records, (r) => r.county), format: 'number' },
    {
      key: 'researchDonePct',
      label: 'Preliminary Research Done',
      value: totalLeads ? Math.round((doneLeads / totalLeads) * 1000) / 10 : 0,
      format: 'percent',
    },
    {
      key: 'agentCodedPct',
      label: 'Agent Coded Share',
      value: totalLeads
        ? Math.round((sum(records.filter((r) => r.accountType === 'Agent Coded'), (r) => r.leadsGenerated) / totalLeads) * 1000) / 10
        : 0,
      format: 'percent',
    },
  ];

  const charts = [
    { id: 'byClient', title: 'Leads by Client', type: 'bar', labels: byClient.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byClient.map((x) => x[1]) }] },
    { id: 'byState', title: 'Leads by State', type: 'bar', labels: byState.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byState.map((x) => x[1]) }] },
    { id: 'byAccountType', title: 'Leads by Account Type', type: 'pie', labels: byAccountType.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byAccountType.map((x) => x[1]) }] },
    { id: 'byPropertyType', title: 'Leads by Property Type', type: 'pie', labels: byPropertyType.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byPropertyType.map((x) => x[1]) }] },
  ];

  return {
    department: 'marketing',
    label: 'Marketing Lead Generation',
    sourceFile: file.split('/').pop(),
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'leads',
        label: 'Leads by Client / Location',
        dimensions: [
          { key: 'client', label: 'Client' },
          { key: 'state', label: 'State' },
          { key: 'county', label: 'County' },
          { key: 'propertyType', label: 'Property Type' },
          { key: 'accountType', label: 'Account Type' },
          { key: 'preliminaryResearch', label: 'Preliminary Research' },
        ],
        metric: { key: 'leadsGenerated', label: 'Leads Generated', agg: 'sum' },
        records,
      },
    ],
    dataNotes: [
      'Date, Resource Name, Attempt Target/Day, Hours Utilized, Actual Target, Records attempted and Quality% columns are blank in the source workbook and are not shown.',
      'The manual "Total" row in MIS Data is excluded; all totals above are recomputed from the individual rows.',
    ],
  };
}

module.exports = { parseMarketing };
