const { sheetToObjects, toNumber, cleanStr, toISODate } = require('../utils/excel');

function parseHrQuery(wb) {
  const sheetName =
    wb.SheetNames.find((s) => s.trim().toUpperCase().includes('DATE')) ||
    wb.SheetNames.find((s) => {
      const sheet = wb.Sheets[s];
      return sheet && sheetToObjects(sheet, 0).rows.length > 0;
    }) ||
    wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return null;

  const { rows } = sheetToObjects(sheet, 0);

  const queries = rows.map((r) => {
    const monthRaw = cleanStr(r['Month']);
    const month = monthRaw === 'Augest' ? 'August' : monthRaw;
    const queryDate = toISODate(r['Query Date']);
    const year = queryDate ? queryDate.substring(0, 4) : (r['Year'] ? cleanStr(r['Year']) : null);
    const queryCode = cleanStr(r['Query Code']);
    const empCode = cleanStr(r['Employee Code']);
    const employee = cleanStr(r['Employee']);
    const category = cleanStr(r['Query Category ']) || cleanStr(r['Query Category']) || 'HR Support';
    const subCategory = cleanStr(r['Query Sub Category ']) || cleanStr(r['Query Sub Category']) || 'General';
    const subject = cleanStr(r['Query Subject']);
    const priority = cleanStr(r['Query Priority']) || 'Normal';
    const assistancePerson = cleanStr(r[' Assistance person']) || cleanStr(r['Assistance person']) || cleanStr(r['Assistance Person']) || 'Unassigned';
    const status = cleanStr(r['Status']) || 'Completed';

    return {
      year,
      month,
      queryDate,
      queryCode,
      empCode,
      employee,
      category,
      subCategory,
      subject,
      priority,
      assistancePerson,
      status,
    };
  }).filter((q) => q.employee || q.queryCode);

  const totalQueries = queries.length;
  const completedQueries = queries.filter((q) => q.status === 'Completed').length;
  const inProcessQueries = queries.filter((q) => q.status === 'In-Process').length;
  const resolutionRatePct = totalQueries ? Math.round((completedQueries / totalQueries) * 1000) / 10 : 0;
  const highPriorityCount = queries.filter((q) => q.priority === 'High' || q.priority === 'Very High').length;
  const highPriorityPct = totalQueries ? Math.round((highPriorityCount / totalQueries) * 1000) / 10 : 0;
  const assistancePersonsCount = new Set(queries.map((q) => q.assistancePerson).filter(Boolean)).size;

  const kpis = [
    { key: 'totalQueries', label: 'TOTAL QUERIES LOGGED', value: totalQueries, format: 'number' },
    { key: 'completedQueries', label: 'COMPLETED QUERIES', value: completedQueries, format: 'number' },
    { key: 'inProcessQueries', label: 'IN-PROCESS QUERIES', value: inProcessQueries, format: 'number' },
    { key: 'resolutionRatePct', label: 'RESOLUTION RATE %', value: resolutionRatePct, format: 'percent' },
    { key: 'highPriorityPct', label: 'HIGH PRIORITY SHARE', value: highPriorityPct, format: 'percent' },
    { key: 'assistancePersonsCount', label: 'HR TEAM HANDLERS', value: assistancePersonsCount, format: 'number' },
  ];

  const groupCount = (arr, keyFn) => {
    const map = new Map();
    arr.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const byMonth = groupCount(queries, (q) => q.month).sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]));
  const bySubCategory = groupCount(queries, (q) => q.subCategory);
  const byPriority = groupCount(queries, (q) => q.priority);
  const byHandler = groupCount(queries, (q) => q.assistancePerson);
  const byStatus = groupCount(queries, (q) => q.status);

  const charts = [
    {
      id: 'bySubCategory',
      title: 'Queries by Sub-Category',
      type: 'bar',
      labels: bySubCategory.map((x) => x[0]),
      series: [{ name: 'Queries', data: bySubCategory.map((x) => x[1]) }],
    },
    {
      id: 'byMonth',
      title: 'Queries Trend by Month',
      type: 'bar',
      labels: byMonth.map((x) => x[0]),
      series: [{ name: 'Queries', data: byMonth.map((x) => x[1]) }],
    },
    {
      id: 'byHandler',
      title: 'Queries Handled by HR Person',
      type: 'bar',
      labels: byHandler.map((x) => x[0]),
      series: [{ name: 'Queries', data: byHandler.map((x) => x[1]) }],
    },
    {
      id: 'byPriority',
      title: 'Queries by Priority',
      type: 'pie',
      labels: byPriority.map((x) => x[0]),
      series: [{ name: 'Queries', data: byPriority.map((x) => x[1]) }],
    },
    {
      id: 'byStatus',
      title: 'Query Status Breakdown',
      type: 'pie',
      labels: byStatus.map((x) => x[0]),
      series: [{ name: 'Queries', data: byStatus.map((x) => x[1]) }],
    },
  ];

  return {
    department: 'hr-query',
    label: 'HR Query & Support',
    sourceFile: 'HR Query Report.xlsm',
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'queries',
        title: 'All HR Queries',
        records: queries,
      },
    ],
  };
}

module.exports = { parseHrQuery };
