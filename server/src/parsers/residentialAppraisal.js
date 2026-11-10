const { sheetToObjects, toNumber, toPercent, cleanStr, toISODate } = require('../utils/excel');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function dateToMonth(dateVal) {
  if (!dateVal) return null;
  const iso = toISODate(dateVal);
  if (!iso || typeof iso !== 'string') return null;
  const match = iso.match(/^\d{4}-(\d{2})-\d{2}/);
  if (match) {
    const monthIndex = parseInt(match[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return MONTH_NAMES[monthIndex];
    }
  }
  return null;
}

function parseResidentialAppraisal(wb) {
  if (!wb) return null;

  const sepMisSheet = wb.Sheets['Sep-MIS'] || wb.Sheets['Prod+NP Mins'] || wb.Sheets['Prod+NP'] || wb.Sheets['Sep'] || wb.Sheets['Sep Check'];
  const l1Sheet = wb.Sheets['Level 1'];
  const otherSheet = wb.Sheets['Other Level'];

  if (!sepMisSheet && !l1Sheet && !otherSheet) {
    return null;
  }

  // 1. Parse Performance Logs (from Prod+NP Mins / Sep-MIS page)
  const agentTeamMap = new Map();
  let performance = [];

  if (sepMisSheet) {
    const sepMisData = sheetToObjects(sepMisSheet, 1);
    performance = sepMisData.rows
      .map((r) => {
        const name = cleanStr(r['Names']);
        const teamLead = cleanStr(r['Team Lead']) || 'General';
        if (name && teamLead && teamLead !== 'General') {
          agentTeamMap.set(name.toLowerCase(), teamLead);
        }
        const date = toISODate(r['Date']);
        const month = dateToMonth(r['Date']);
        return {
          date,
          month,
          teamLead,
          empId: cleanStr(r['Emp ID']),
          name,
          actualProdPct: toPercent(r['Actual Production%']),
          overallProdPct: toPercent(r['Overall Production%']),
          overallUtilPct: toPercent(r['Overall Utilization%']),
          overallProdMins: toNumber(r['OverallProdMins'], 0),
          prodMins: toNumber(r['Prod Mins'], 0),
          nonProdMins: toNumber(r['NonProd Mins'], 0),
          overallMins: toNumber(r['Overall Mins'], 0),
          l1Count: toNumber(r['Level1'], 0),
          l2Count: toNumber(r['Level2'], 0),
          l3Count: toNumber(r['Level3'], 0),
          l4Count: toNumber(r['Level4'], 0),
          l5Count: toNumber(r['Level5'], 0),
          rentalCount: toNumber(r['Rental/Clone Orders'], 0),
          comments: cleanStr(r['Comments']),
        };
      })
      .filter((p) => p.name || p.teamLead);
  }

  // 2. Parse Detailed Orders (from Level 1 and Other Level)
  const orders = [];

  if (l1Sheet) {
    const l1Data = sheetToObjects(l1Sheet, 0);
    l1Data.rows.forEach((r) => {
      if (!r['File Number'] && !r['Address']) return;
      const agent = cleanStr(r['L1Agent']);
      const teamLead = (agent ? agentTeamMap.get(agent.toLowerCase()) : null) || 'General';
      const dueDate = toISODate(r['Due Date']);
      const productionDate = toISODate(r['Production Date']);
      const month = dateToMonth(r['Production Date']) || dateToMonth(r['Due Date']);
      orders.push({
        fileNumber: cleanStr(r['File Number']),
        address: cleanStr(r['Address']),
        state: cleanStr(r['State']) || 'N/A',
        primaryAppraiser: cleanStr(r['Primary Appraiser']),
        reportType: cleanStr(r['Report Type']),
        orderedByName: cleanStr(r['Ordered By Name']) || 'Unknown',
        dueDate,
        processStatus: cleanStr(r['Process Status']) || 'Completed',
        zone: cleanStr(r['Zone']),
        market: cleanStr(r['Market']),
        productionDate,
        month,
        level: 'Level 1',
        agent: agent || 'Unassigned',
        teamLead,
        status: cleanStr(r['L1Status']) || 'Completed',
        shift: cleanStr(r['L1Shift']) || 'Day',
        compsCount: cleanStr(r['Comps Received?']),
      });
    });
  }

  if (otherSheet) {
    const otherData = sheetToObjects(otherSheet, 0);
    otherData.rows.forEach((r) => {
      if (!r['File Number'] && !r['Address']) return;
      const dueDate = toISODate(r['Due Date']);
      const productionDate = toISODate(r['Production Date']);
      const month = dateToMonth(r['Production Date']) || dateToMonth(r['Due Date']);
      const base = {
        fileNumber: cleanStr(r['File Number']),
        address: cleanStr(r['Address']),
        state: cleanStr(r['State']) || 'N/A',
        primaryAppraiser: cleanStr(r['Primary Appraiser']),
        reportType: cleanStr(r['Report Type']),
        orderedByName: cleanStr(r['Ordered By Name']) || 'Unknown',
        dueDate,
        processStatus: cleanStr(r['Process Status']) || 'Completed',
        zone: cleanStr(r['Zone']),
        market: cleanStr(r['Market']),
        productionDate,
        month,
        compsCount: toNumber(r['# of Comps'], null),
      };

      for (let lvl = 2; lvl <= 5; lvl++) {
        const agent = cleanStr(r[`L${lvl}Agent`]);
        if (agent) {
          const teamLead = (agent ? agentTeamMap.get(agent.toLowerCase()) : null) || 'General';
          orders.push({
            ...base,
            level: `Level ${lvl}`,
            agent,
            teamLead,
            status: cleanStr(r[`L${lvl}Status`]) || 'Completed',
            shift: cleanStr(r[`L${lvl}Shift`]) || 'Day',
          });
        }
      }
    });
  }

  // 3. Aggregate Employee Summary
  const empMap = new Map();
  performance.forEach((p) => {
    if (!p.name) return;
    const key = p.name.toLowerCase();
    if (!empMap.has(key)) {
      empMap.set(key, {
        name: p.name,
        teamLead: p.teamLead,
        prodMins: 0,
        nonProdMins: 0,
        overallMins: 0,
        prodPcts: [],
        utilPcts: [],
        l1Count: 0,
        l2Count: 0,
        l3Count: 0,
        l4Count: 0,
        l5Count: 0,
        rentalCount: 0,
        daysActive: 0,
      });
    }
    const item = empMap.get(key);
    item.prodMins += p.prodMins;
    item.nonProdMins += p.nonProdMins;
    item.overallMins += p.overallMins;
    if (p.overallProdPct !== null && p.overallProdPct > 0) item.prodPcts.push(p.overallProdPct);
    if (p.overallUtilPct !== null && p.overallUtilPct > 0) item.utilPcts.push(p.overallUtilPct);
    item.l1Count += p.l1Count;
    item.l2Count += p.l2Count;
    item.l3Count += p.l3Count;
    item.l4Count += p.l4Count;
    item.l5Count += p.l5Count;
    item.rentalCount += p.rentalCount;
    item.daysActive++;
  });

  const employeeSummary = [...empMap.values()]
    .map((e) => {
      const avgProdPct = e.prodPcts.length
        ? Math.round((e.prodPcts.reduce((a, b) => a + b, 0) / e.prodPcts.length) * 10) / 10
        : 0;
      const avgUtilPct = e.utilPcts.length
        ? Math.round((e.utilPcts.reduce((a, b) => a + b, 0) / e.utilPcts.length) * 10) / 10
        : 0;
      const totalFilesCompleted = e.l1Count + e.l2Count + e.l3Count + e.l4Count + e.l5Count + e.rentalCount;
      return {
        name: e.name,
        teamLead: e.teamLead,
        prodHours: Math.round((e.prodMins / 60) * 10) / 10,
        nonProdHours: Math.round((e.nonProdMins / 60) * 10) / 10,
        overallHours: Math.round((e.overallMins / 60) * 10) / 10,
        avgProdPct,
        avgUtilPct,
        l1Count: e.l1Count,
        l2Count: e.l2Count,
        l3Count: e.l3Count,
        l4Count: e.l4Count,
        l5Count: e.l5Count,
        totalFilesCompleted,
        daysActive: e.daysActive,
      };
    })
    .sort((a, b) => b.totalFilesCompleted - a.totalFilesCompleted);

  // 4. Calculate KPIs
  const totalOrders = orders.length;
  const totalClients = new Set(orders.map((o) => o.orderedByName).filter(Boolean)).size;
  const activeStaff = employeeSummary.length;
  const totalProdMinutes = performance.reduce((sum, p) => sum + (p.prodMins || 0), 0);
  const totalProdHours = Math.round(totalProdMinutes / 60);

  const validProd = performance.map((p) => p.overallProdPct).filter((v) => v !== null && v > 0);
  const overallProductivity = validProd.length
    ? Math.round((validProd.reduce((a, b) => a + b, 0) / validProd.length) * 10) / 10
    : 0;

  const validUtil = performance.map((p) => p.overallUtilPct).filter((v) => v !== null && v > 0);
  const overallUtilization = validUtil.length
    ? Math.round((validUtil.reduce((a, b) => a + b, 0) / validUtil.length) * 10) / 10
    : 0;

  const kpis = [
    { key: 'totalOrders', label: 'TOTAL ORDERS PROCESSED', value: totalOrders, format: 'number' },
    { key: 'overallProductivity', label: 'OVERALL PRODUCTIVITY %', value: overallProductivity, format: 'percent' },
    { key: 'overallUtilization', label: 'OVERALL UTILIZATION %', value: overallUtilization, format: 'percent' },
    { key: 'totalProdHours', label: 'TOTAL PRODUCTION HOURS', value: totalProdHours, format: 'number' },
    { key: 'activeStaff', label: 'ACTIVE PRODUCTION STAFF', value: activeStaff, format: 'number' },
    { key: 'totalClients', label: 'CLIENTS & AMCs SERVED', value: totalClients, format: 'number' },
  ];

  // 5. Helper aggregations for Charts
  const groupCount = (arr, keyFn) => {
    const map = new Map();
    arr.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const groupSum = (arr, keyFn, valFn) => {
    const map = new Map();
    arr.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + (valFn(r) || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byClient = groupCount(orders, (o) => o.orderedByName).slice(0, 10);
  const byReportType = groupCount(orders, (o) => o.reportType).slice(0, 8);
  const byLevel = [
    ['Level 1', orders.filter((o) => o.level === 'Level 1').length],
    ['Level 2', orders.filter((o) => o.level === 'Level 2').length],
    ['Level 3', orders.filter((o) => o.level === 'Level 3').length],
    ['Level 4', orders.filter((o) => o.level === 'Level 4').length],
    ['Level 5', orders.filter((o) => o.level === 'Level 5').length],
  ];
  const byTeamLead = groupSum(performance, (p) => p.teamLead, (p) => Math.round((p.prodMins || 0) / 60));
  const byAgent = employeeSummary.slice(0, 10).map((s) => [s.name, s.totalFilesCompleted]);
  const byState = groupCount(orders, (o) => o.state).slice(0, 10);

  const charts = [
    {
      id: 'ordersByClient',
      title: 'Appraisal Orders by Client / AMC',
      type: 'bar',
      labels: byClient.map((x) => x[0]),
      series: [{ name: 'Orders', data: byClient.map((x) => x[1]) }],
    },
    {
      id: 'ordersByReportType',
      title: 'Orders by Appraisal Report Type',
      type: 'bar',
      labels: byReportType.map((x) => x[0]),
      series: [{ name: 'Orders', data: byReportType.map((x) => x[1]) }],
    },
    {
      id: 'volumeByLevel',
      title: 'Production Volume by Level',
      type: 'bar',
      labels: byLevel.map((x) => x[0]),
      series: [{ name: 'Orders', data: byLevel.map((x) => x[1]) }],
    },
    {
      id: 'productivityByTeamLead',
      title: 'Production Hours by Team Lead',
      type: 'pie',
      labels: byTeamLead.map((x) => x[0]),
      series: [{ name: 'Hours Logged', data: byTeamLead.map((x) => x[1]) }],
    },
    {
      id: 'topAgents',
      title: 'Top 10 Agents by Volume Completed',
      type: 'bar',
      labels: byAgent.map((x) => x[0]),
      series: [{ name: 'Files Completed', data: byAgent.map((x) => x[1]) }],
    },
    {
      id: 'ordersByState',
      title: 'Appraisal Distribution by State',
      type: 'bar',
      labels: byState.map((x) => x[0]),
      series: [{ name: 'Orders', data: byState.map((x) => x[1]) }],
    },
  ];

  return {
    department: 'residential-appraisal',
    label: 'Residential Appraisal',
    sourceFile: 'Sep MIS - 2026.xlsx',
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'orders',
        title: 'Appraisal Orders',
        records: orders,
      },
      {
        key: 'performance',
        title: 'Daily Production Logs',
        records: performance,
      },
      {
        key: 'employeeSummary',
        title: 'Employee Performance Summary',
        records: employeeSummary,
      },
    ],
  };
}

module.exports = { parseResidentialAppraisal };
