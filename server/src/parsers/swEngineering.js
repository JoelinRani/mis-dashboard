const { findFile, loadWorkbook, sheetToObjects, sheetToGrid, toNumber, toPercent, cleanStr, toISODate } = require('../utils/excel');

/**
 * Software Engineering MIS. Three distinct entity grains live in this
 * workbook: Projects (1 row/project), Resource Assignments (1 row per
 * employee-project pair - the same employee can have several rows) and
 * Defects (1 row/defect). The workbook's own "Dashboard" sheet has a
 * confirmed formula bug (its Project Status pie chart source references the
 * wrong column/a single fixed cell and always evaluates to zero, and the
 * Defect KPIs are hardcoded to row 5 only) - all KPIs below are recomputed
 * directly from the detail sheets instead of reusing those formulas.
 */
function parseSwEngineering() {
  const file = findFile(['swengg', 'sw engg', 'software']);
  if (!file) return null;

  const wb = loadWorkbook(file);
  const projectSheet = wb.Sheets['Project Status'];
  const resourceSheet = wb.Sheets['Resource Utilization'];
  const defectSheet = wb.Sheets['Defect Tracking'];
  if (!projectSheet || !resourceSheet || !defectSheet) {
    throw new Error('SW Engineering workbook: expected "Project Status", "Resource Utilization" and "Defect Tracking" sheets');
  }

  // --- Projects (header on row 4, i.e. index 3) -----------------------------
  const { rows: projectRows } = sheetToObjects(projectSheet, 3);
  const projects = projectRows
    .filter((r) => cleanStr(r['Project Name']))
    .map((r) => ({
      project: cleanStr(r['Project Name']),
      projectManager: cleanStr(r['Project Manager']),
      plannedActivities: cleanStr(r['Planned Activities']),
      startDate: toISODate(r['Start Date']),
      plannedEndDate: toISODate(r['Planned End Date']),
      percentComplete: toPercent(r['% Complete']),
      plannedHours: toNumber(r['Planned Hours'], null),
      utilizedHours: toNumber(r['Utilized Hours'], null),
      hoursVariance: toNumber(r['Hours Variance'], null),
      status: cleanStr(r['Status (RAG)']),
      milestoneAchieved: cleanStr(r['Milestone Achieved']),
      remarks: cleanStr(r['Remarks']),
    }));

  // --- Resource assignments (detail table, header row 4 / index 3) --------
  const { rows: assignmentRows } = sheetToObjects(resourceSheet, 3);
  const assignments = assignmentRows
    .filter((r) => cleanStr(r['Employee Name']) && cleanStr(r['Project Allocated']))
    .map((r) => ({
      employee: cleanStr(r['Employee Name']),
      role: cleanStr(r['Role']),
      project: cleanStr(r['Project Allocated']),
      allocationPct: toPercent(r['Allocation %']),
      plannedHours: toNumber(r['Planned Hours'], null),
      billableHours: toNumber(r['Billable Hours'], null),
      nonBillableHours: toNumber(r['Non-Billable Hours'], null),
      actualHours: toNumber(r['Actual Hours'], null),
    }));

  // --- Employee allocation summary (second table, header around row 42) ---
  const grid = sheetToGrid(resourceSheet);
  const summaryHeaderIdx = grid.findIndex((row) => row[0] === 'S.No' && row[1] === 'Employee Name' && row[3] === 'Total Allocation %');
  const { rows: summaryRows } = summaryHeaderIdx >= 0 ? sheetToObjects(resourceSheet, summaryHeaderIdx) : { rows: [] };
  const employeeSummary = summaryRows
    .filter((r) => cleanStr(r['Employee Name']))
    .map((r) => ({
      employee: cleanStr(r['Employee Name']),
      role: cleanStr(r['Role']),
      totalAllocationPct: toPercent(r['Total Allocation %']),
      plannedHours: toNumber(r['Planned Hours'], null),
      actualHours: toNumber(r['Actual Hours'], null),
      utilizationPct: toPercent(r['Utilization %']),
      allocationStatus: cleanStr(r['Allocation Status']),
    }));

  // --- Defects (header row 4 / index 3) + SLA policy table -----------------
  const { rows: defectRows } = sheetToObjects(defectSheet, 3, { stopAfterBlank: 1 });
  const defects = defectRows
    .filter((r) => cleanStr(r['Defect ID']))
    .map((r) => ({
      defectId: cleanStr(r['Defect ID']),
      project: cleanStr(r['Project']),
      severity: cleanStr(r['Severity']),
      status: cleanStr(r['Status']),
      reportedDate: toISODate(r['Reported Date']),
      resolvedDate: toISODate(r['Resolved Date']),
      ageingDays: toNumber(r['Ageing (Days)'], null),
      slaTargetDays: toNumber(r['SLA Target (Days)'], null),
      slaVarianceDays: toNumber(r['SLA Variance (Days)'], null),
      slaStatus: cleanStr(r['SLA Status']),
      assignedTo: cleanStr(r['Assigned To']),
    }));

  const sum = (arr, fn) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
  const avg = (arr, fn) => {
    const vals = arr.map(fn).filter((v) => v !== null && v !== undefined);
    return vals.length ? sum(vals.map((v) => ({ v })), (r) => r.v) / vals.length : 0;
  };
  const count = (arr, pred) => arr.filter(pred).length;
  const distinct = (arr, fn) => new Set(arr.map(fn).filter(Boolean)).size;

  const onTrack = count(projects, (p) => p.status === 'On Track');
  const atRisk = count(projects, (p) => p.status === 'At Risk');
  const delayed = count(projects, (p) => p.status === 'Delayed');
  const plannedHoursSum = sum(projects, (p) => p.plannedHours);
  const utilizedHoursSum = sum(projects, (p) => p.utilizedHours);

  const totalDefects = defects.length;
  const openDefects = count(defects, (d) => d.status !== 'Closed');
  const closedDefects = count(defects, (d) => d.status === 'Closed');
  const criticalOpen = count(defects, (d) => d.severity === 'Critical' && d.status !== 'Closed');
  const slaBreaches = count(defects, (d) => d.slaStatus === 'Breached');

  const kpis = [
    { key: 'totalProjects', label: 'Total Projects', value: projects.length, format: 'number' },
    { key: 'avgPercentComplete', label: 'Avg % Complete', value: Math.round(avg(projects, (p) => p.percentComplete) * 10) / 10, format: 'percent' },
    { key: 'headcount', label: 'Team Headcount', value: employeeSummary.length || distinct(assignments, (a) => a.employee), format: 'number' },
    { key: 'avgUtilizationPct', label: 'Avg Utilization %', value: Math.round(avg(employeeSummary, (e) => e.utilizationPct) * 10) / 10, format: 'percent' },
    { key: 'billableHours', label: 'Billable Hours', value: sum(assignments, (a) => a.billableHours), format: 'number' },
    { key: 'nonBillableHours', label: 'Non-Billable Hours', value: sum(assignments, (a) => a.nonBillableHours), format: 'number' },
  ];

  const groupCount = (arr, keyFn) => {
    const map = new Map();
    arr.forEach((r) => {
      const k = keyFn(r) || 'Unspecified';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()];
  };

  const projectStatusDist = groupCount(projects, (p) => p.status);
  const defectsBySeverity = groupCount(defects.filter((d) => d.status !== 'Closed'), (d) => d.severity);
  const slaBreakdown = groupCount(defects, (d) => d.slaStatus);
  const hoursByEmployee = [...employeeSummary]
    .sort((a, b) => (b.actualHours || 0) - (a.actualHours || 0))
    .slice(0, 15)
    .map((e) => [e.employee, e.actualHours || 0]);

  const charts = [
    { id: 'projectStatus', title: 'Project Status Distribution', type: 'pie', labels: projectStatusDist.map((x) => x[0]), series: [{ name: 'Projects', data: projectStatusDist.map((x) => x[1]) }] },
    { id: 'defectsBySeverity', title: 'Open Defects by Severity', type: 'bar', labels: defectsBySeverity.map((x) => x[0]), series: [{ name: 'Defects', data: defectsBySeverity.map((x) => x[1]) }] },
    { id: 'slaBreakdown', title: 'SLA Status Breakdown', type: 'pie', labels: slaBreakdown.map((x) => x[0]), series: [{ name: 'Defects', data: slaBreakdown.map((x) => x[1]) }] },
    { id: 'hoursByEmployee', title: 'Actual Hours by Employee', type: 'bar', labels: hoursByEmployee.map((x) => x[0]), series: [{ name: 'Hours', data: hoursByEmployee.map((x) => x[1]) }] },
  ];

  return {
    department: 'sw-engineering',
    label: 'Software Engineering',
    sourceFile: file.split('/').pop(),
    generatedAt: new Date().toISOString(),
    kpis,
    charts,
    tables: [
      {
        key: 'projects',
        label: 'Projects',
        dimensions: [
          { key: 'project', label: 'Project' },
          { key: 'projectManager', label: 'Project Manager' },
          { key: 'status', label: 'Status (RAG)' },
        ],
        metric: { key: null, label: 'Projects', agg: 'count' },
        records: projects,
      },
      {
        key: 'assignments',
        label: 'Resource Assignments',
        dimensions: [
          { key: 'employee', label: 'Employee' },
          { key: 'role', label: 'Role' },
          { key: 'project', label: 'Project' },
        ],
        metric: { key: 'actualHours', label: 'Actual Hours', agg: 'sum' },
        records: assignments,
      },
      {
        key: 'employeeSummary',
        label: 'Employee Allocation Summary',
        dimensions: [
          { key: 'employee', label: 'Employee' },
          { key: 'role', label: 'Role' },
          { key: 'allocationStatus', label: 'Allocation Status' },
        ],
        metric: { key: 'actualHours', label: 'Actual Hours', agg: 'sum' },
        records: employeeSummary,
      },
      {
        key: 'defects',
        label: 'Defects',
        dimensions: [
          { key: 'project', label: 'Project' },
          { key: 'severity', label: 'Severity' },
          { key: 'status', label: 'Status' },
          { key: 'slaStatus', label: 'SLA Status' },
          { key: 'assignedTo', label: 'Assigned To' },
        ],
        metric: { key: null, label: 'Defects', agg: 'count' },
        records: defects,
      },
    ],
    dataNotes: [
      'The source workbook\'s own Dashboard has a formula bug: its "Project Status Distribution" chart source references the wrong column (Planned Hours instead of Status) and a single fixed cell, so it always showed zero - this app recomputes the distribution directly from Project Status rows instead.',
      'The workbook\'s Defect KPIs are hardcoded to row 5 only and will not scale as more defects are logged - this app counts every row in Defect Tracking instead.',
      'Project names are not fully consistent between sheets (e.g. "MAKO - Phase 3" vs "MAKO" / "MAKO Phase 3") - drill-down by project reflects the workbook\'s own spelling per row rather than merging them.',
      'This report is marked "Draft" in its filename and currently contains a very small sample (3 projects, 1 defect) for the August 2026 reporting period.',
    ],
  };
}

module.exports = { parseSwEngineering };
