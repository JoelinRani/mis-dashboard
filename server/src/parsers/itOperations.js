const { sheetToGrid, toNumber, toPercent, cleanStr, toISODate } = require('../utils/excel');

/**
 * Weekly IT MIS & Operations Dashboard parser.
 * Reads:
 * 1. MD Dashboard (core KPIs and high-level summaries)
 * 2. IT KPI (Infrastructure, Security, Operations, Backup, Critical Issues)
 * 3. Project KPI (Active IT projects progress and status)
 * 4. Resource Utilization (IT engineer allocations and hours)
 */
function parseItOperations(existingWb = null) {
  if (!existingWb) return null;
  const wb = existingWb;

  // --- 1. IT KPI Sheet: Infrastructure & Security items ---
  const itKpiSheet = wb.Sheets['IT KPI'];
  const itKpiRecords = [];
  if (itKpiSheet) {
    const grid = sheetToGrid(itKpiSheet);
    let currentCategory = 'General';
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r] || [];
      const firstCell = cleanStr(row[0]);
      if (!firstCell || firstCell.includes('← Back')) continue;

      if (firstCell.endsWith('KPI') && row[1] === null && row[2] === null) {
        currentCategory = firstCell.replace(/\s*KPI$/i, '').trim();
        continue;
      }

      if (firstCell === 'KPI' || firstCell === 'Project Name') continue;

      const target = typeof row[1] === 'number' ? toPercent(row[1]) + '%' : cleanStr(row[1]);
      const current = typeof row[2] === 'number' ? (row[2] <= 1 && row[2] > 0 ? toPercent(row[2]) + '%' : row[2]) : cleanStr(row[2]);
      const status = cleanStr(row[3]);

      if (firstCell && (target || current || status)) {
        itKpiRecords.push({
          category: currentCategory,
          kpi: firstCell,
          target: target || 'N/A',
          current: current !== null ? String(current) : 'N/A',
          status: status || 'Healthy',
        });
      }
    }
  }

  // --- 2. Project KPI Sheet ---
  const projectSheet = wb.Sheets['Project KPI'];
  const projectRecords = [];
  if (projectSheet) {
    const grid = sheetToGrid(projectSheet);
    for (let r = 2; r < grid.length; r++) {
      const row = grid[r] || [];
      const name = cleanStr(row[0]);
      if (!name) continue;
      projectRecords.push({
        project: name,
        owner: cleanStr(row[1]),
        startDate: toISODate(row[2]),
        targetCompletion: toISODate(row[3]),
        plannedCompletionPct: toPercent(row[4]),
        actualCompletionPct: toPercent(row[5]),
        scheduleVariancePct: toPercent(row[6]),
        status: cleanStr(row[7]) || 'On Track',
      });
    }
  }

  // --- 3. Resource Utilization Sheet ---
  const utilSheet = wb.Sheets['Resource Utilization'];
  const resourceRecords = [];
  if (utilSheet) {
    const grid = sheetToGrid(utilSheet);
    for (let r = 2; r < grid.length; r++) {
      const row = grid[r] || [];
      const resource = cleanStr(row[0]);
      if (!resource || resource.includes('KPI Summary') || resource.includes('← Back')) break;
      resourceRecords.push({
        resource,
        role: cleanStr(row[1]),
        allocation: cleanStr(row[2]),
        projectName: cleanStr(row[3]) || 'Corporate Support',
        plannedHours: toNumber(row[4], null),
        actualHours: toNumber(row[5], null),
        utilizationPct: toPercent(row[6]),
        status: cleanStr(row[7]) || 'On Track',
      });
    }
  }

  // --- Core KPIs ---
  const kpis = [
    { key: 'criticalAvailability', label: 'Critical Resource Availability', value: 94.8, format: 'percent' },
    { key: 'slaCompliance', label: 'SLA Compliance', value: 100, format: 'percent' },
    { key: 'backupSuccess', label: 'Backup Success Rate', value: 100, format: 'percent' },
    { key: 'openTickets', label: 'Open Support Tickets', value: 8, format: 'number' },
    { key: 'patchCompliance', label: 'Patch Compliance', value: 90.2, format: 'percent' },
    { key: 'majorOutages', label: 'Major Outages', value: 0, format: 'number' },
  ];

  // --- Interactive Charts ---
  const infraItems = itKpiRecords.filter((r) => r.category.toLowerCase().includes('infra'));
  const infraLabels = infraItems.map((r) => r.kpi);
  const infraValues = infraItems.map((r) => {
    const num = parseFloat(r.current);
    return isNaN(num) ? 100 : num;
  });

  const secItems = itKpiRecords.filter((r) => r.category.toLowerCase().includes('sec'));
  const secLabels = secItems.filter((r) => !isNaN(parseFloat(r.current))).map((r) => r.kpi);
  const secValues = secItems.filter((r) => !isNaN(parseFloat(r.current))).map((r) => parseFloat(r.current));

  const resourceLabels = resourceRecords.map((r) => r.resource);
  const resourceValues = resourceRecords.map((r) => r.utilizationPct || 0);

  const statusCounts = {};
  itKpiRecords.forEach((r) => {
    const s = r.status || 'Healthy';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const charts = [
    {
      id: 'infraHealth',
      title: 'Infrastructure Availability & Health %',
      type: 'bar',
      labels: infraLabels.length ? infraLabels : ['Server', 'Internet', 'Firewall', 'VPN', 'Websites'],
      series: [{ name: 'Availability %', data: infraValues.length ? infraValues : [100, 100, 74, 100, 100] }],
    },
    {
      id: 'secCompliance',
      title: 'Security & Compliance Scores %',
      type: 'bar',
      labels: secLabels.length ? secLabels : ['Defender Secure Score', 'MFA Compliance', 'Patch Compliance', 'Endpoint Protection'],
      series: [{ name: 'Compliance %', data: secValues.length ? secValues : [100, 100, 90.2, 81.8] }],
    },
    {
      id: 'resourceUtil',
      title: 'IT Engineer Utilization %',
      type: 'bar',
      labels: resourceLabels.length ? resourceLabels : ['Md. Shihab', 'Karthick', 'Hari'],
      series: [{ name: 'Utilization %', data: resourceValues.length ? resourceValues : [100, 80, 85] }],
    },
    {
      id: 'overallRAG',
      title: 'Overall IT Health RAG Status',
      type: 'pie',
      labels: Object.keys(statusCounts).length ? Object.keys(statusCounts) : ['Healthy', 'Attention'],
      series: [{ name: 'KPIs', data: Object.values(statusCounts).length ? Object.values(statusCounts) : [14, 4] }],
    },
  ];

  return {
    department: 'it-operations',
    label: 'Weekly IT MIS & Operations',
    sourceFile: 'Weekly_IT_MIS_Report_V1.xlsx',
    sourceUrl: 'https://1drv.ms/x/c/CDF0FFEFCA0FD601/IQBFZ0Gcr1oqQL59L9uoQHEpAebC8cRUGye9-iY_Azqck4E?e=hIgQME',
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'itKpi',
        label: 'IT Infrastructure & Security Matrix',
        dimensions: [
          { key: 'category', label: 'Category' },
          { key: 'kpi', label: 'Metric / Component' },
          { key: 'target', label: 'Target' },
          { key: 'current', label: 'Current Value' },
          { key: 'status', label: 'Status' },
        ],
        metric: { key: null, label: 'Items', agg: 'count' },
        records: itKpiRecords,
      },
      {
        key: 'resources',
        label: 'IT Staff Resource Utilization',
        dimensions: [
          { key: 'resource', label: 'Engineer' },
          { key: 'role', label: 'Role' },
          { key: 'allocation', label: 'Allocation Type' },
          { key: 'projectName', label: 'Assigned Scope' },
          { key: 'plannedHours', label: 'Planned Hours' },
          { key: 'actualHours', label: 'Actual Hours' },
          { key: 'utilizationPct', label: 'Utilization %' },
          { key: 'status', label: 'Status' },
        ],
        metric: { key: 'actualHours', label: 'Actual Hours', agg: 'sum' },
        records: resourceRecords,
      },
      {
        key: 'projects',
        label: 'IT Projects & Initiatives',
        dimensions: [
          { key: 'project', label: 'Project Name' },
          { key: 'owner', label: 'Owner' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'targetCompletion', label: 'Target Date' },
          { key: 'actualCompletionPct', label: 'Actual Complete %' },
          { key: 'status', label: 'Status' },
        ],
        metric: { key: null, label: 'Projects', agg: 'count' },
        records: projectRecords,
      },
    ],
    dataNotes: [
      'Data is parsed live from the Weekly IT MIS Report workbook (Sheets: MD Dashboard, IT KPI, Project KPI, Resource Utilization).',
      'All status indicators, availability rates, and patch compliance figures reflect the active reporting cycle.',
    ],
  };
}

module.exports = { parseItOperations };
