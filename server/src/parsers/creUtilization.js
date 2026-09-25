const { findFile, loadWorkbook, sheetToObjects, toNumber, toPercent, cleanStr } = require('../utils/excel');

// Non-client time categories that appear as columns in "Utilization Data"
// alongside real client names - these represent internal/non-billable time,
// not client work, and are tagged separately rather than folded into the
// "hours by client" numbers.
const INTERNAL_CATEGORIES = new Set(['Sketching', 'Training', 'Other', 'Leave']);
// Computed helper columns in "Utilization Data" that must NOT be treated as
// client/category columns (they're formula outputs tied to the live Excel
// dashboard's selected filters, e.g. SelClientHours/SelRank/EmpRank).
const HELPER_COLUMNS = new Set(['Total', 'SelClientHours', 'SelRank', 'ClientTotal', 'EmpFirst', 'EmpRank']);

function parseCreUtilization() {
  const file = findFile(['client_utilization', 'client utilization', 'utilization dashboard']);
  if (!file) return null;

  const wb = loadWorkbook(file);
  const misSheet = wb.Sheets['MIS Data'];
  const utilSheet = wb.Sheets['Utilization Data'];
  if (!misSheet || !utilSheet) throw new Error('CRE workbook: expected "MIS Data" and "Utilization Data" sheets');

  // --- Deliverables (MIS Data): one row per Month x Client -----------------
  const { rows: misRows } = sheetToObjects(misSheet, 3);
  const deliverables = misRows
    .filter((r) => cleanStr(r['Month']) && cleanStr(r['Client Name']))
    .map((r) => ({
      month: cleanStr(r['Month']),
      client: cleanStr(r['Client Name']),
      filesReceived: toNumber(r['Files Received']),
      filesDelivered: toNumber(r['Files Delivered']),
      filesDeliveredBeforeDue: toNumber(r['Files Delivered Before Due Date']),
      onTimeDeliveryPct: toPercent(r['On-Time Delivery %']),
      qualityPct: toPercent(r['Quality %']),
      pendingFiles: toNumber(r['Pending Files']),
      overdueFiles: toNumber(r['Overdue Files']),
      resourcesAllocated: toNumber(r['Resources Allocated']),
      allocatedHours: toNumber(r['Allocated Hours']),
    }));

  // --- Utilization (wide, one column per client -> unpivot) ---------------
  const { headers, rows: utilRowsRaw } = sheetToObjects(utilSheet, 3);
  const categoryColumns = headers.filter((h) => h !== 'Month' && h !== 'Employee' && !HELPER_COLUMNS.has(h));

  const utilization = [];
  utilRowsRaw
    .filter((r) => cleanStr(r['Month']) && cleanStr(r['Employee']))
    .forEach((r) => {
      const month = cleanStr(r['Month']);
      const employee = cleanStr(r['Employee']);
      categoryColumns.forEach((col) => {
        const hours = toNumber(r[col], 0);
        if (hours <= 0) return; // skip zero entries, keeps drill-down meaningful
        utilization.push({
          month,
          employee,
          category: col,
          type: INTERNAL_CATEGORIES.has(col) ? 'internal' : 'client',
          hours,
        });
      });
    });

  const sum = (arr, fn) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
  const avg = (arr, fn) => (arr.length ? sum(arr, fn) / arr.length : 0);
  const distinct = (arr, fn) => new Set(arr.map(fn).filter(Boolean)).size;

  const totalReceived = sum(deliverables, (r) => r.filesReceived);
  const totalDelivered = sum(deliverables, (r) => r.filesDelivered);
  const clientHours = utilization.filter((u) => u.type === 'client');

  const kpis = [
    { key: 'filesReceived', label: 'Files Received', value: totalReceived, format: 'number' },
    { key: 'filesDelivered', label: 'Files Delivered', value: totalDelivered, format: 'number' },
    { key: 'onTimePct', label: 'Avg On-Time Delivery', value: Math.round(avg(deliverables, (r) => r.onTimeDeliveryPct) * 10) / 10, format: 'percent' },
    { key: 'qualityPct', label: 'Avg Quality', value: Math.round(avg(deliverables, (r) => r.qualityPct) * 10) / 10, format: 'percent' },
    { key: 'pendingFiles', label: 'Pending Files', value: sum(deliverables, (r) => r.pendingFiles), format: 'number' },
    { key: 'overdueFiles', label: 'Overdue Files', value: sum(deliverables, (r) => r.overdueFiles), format: 'number' },
  ];

  const groupSum = (arr, keyFn, valFn) => {
    const map = new Map();
    arr.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + (valFn(r) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const byMonthReceived = groupSum(deliverables, (r) => r.month, (r) => r.filesReceived).sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]));
  const byMonthDelivered = groupSum(deliverables, (r) => r.month, (r) => r.filesDelivered).sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]));
  const hoursByClient = groupSum(clientHours, (u) => u.category, (u) => u.hours).slice(0, 12);
  const hoursByEmployee = groupSum(clientHours, (u) => u.employee, (u) => u.hours).slice(0, 15);

  const charts = [
    {
      id: 'filesByMonth', title: 'Files Received vs Delivered by Month', type: 'bar',
      labels: byMonthReceived.map((x) => x[0]),
      series: [
        { name: 'Files Received', data: byMonthReceived.map((x) => x[1]) },
        { name: 'Files Delivered', data: byMonthDelivered.map((x) => x[1]) },
      ],
    },
    { id: 'hoursByClient', title: 'Hours by Client (Top 12)', type: 'bar', labels: hoursByClient.map((x) => x[0]), series: [{ name: 'Hours', data: hoursByClient.map((x) => x[1]) }] },
    { id: 'hoursByEmployee', title: 'Hours by Employee (Top 15)', type: 'bar', labels: hoursByEmployee.map((x) => x[0]), series: [{ name: 'Hours', data: hoursByEmployee.map((x) => x[1]) }] },
  ];

  return {
    department: 'cre-utilization',
    label: 'MIS Client Utilization (CRE)',
    sourceFile: file.split('/').pop(),
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'deliverables',
        label: 'Deliverables by Month / Client',
        dimensions: [
          { key: 'month', label: 'Month' },
          { key: 'client', label: 'Client' },
        ],
        metric: { key: 'filesReceived', label: 'Files Received', agg: 'sum' },
        records: deliverables,
      },
      {
        key: 'utilization',
        label: 'Resource Hours by Client',
        dimensions: [
          { key: 'month', label: 'Month' },
          { key: 'employee', label: 'Employee' },
          { key: 'category', label: 'Client / Category' },
          { key: 'type', label: 'Type' },
        ],
        metric: { key: 'hours', label: 'Hours', agg: 'sum' },
        records: utilization,
      },
    ],
    dataNotes: [
      'Only months with populated rows are shown; the source workbook has template rows reserved for future months that are still blank.',
      '"Utilization Data" is stored one column per client (wide format) in the workbook; it has been unpivoted here into one row per Employee x Client x Month.',
      'Sketching, Training, Other and Leave are internal (non-billable) time categories, not clients - they are tagged type="internal" and excluded from client-hours totals.',
      'All KPI totals are recomputed directly from the detail rows rather than reusing the workbook\'s own SUMIFS formulas.',
    ],
  };
}

module.exports = { parseCreUtilization };
