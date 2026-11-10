import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap, takeUntil } from 'rxjs/operators';
import { Subject, interval } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DashboardData, Kpi, ChartDef } from '../../core/models';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';
import { ChartPanelComponent, ChartSliceClickEvent } from '../../shared/chart-panel/chart-panel.component';
import { StatusPillComponent } from '../../shared/status-pill/status-pill.component';
import { MultiSelectDropdownComponent } from '../../shared/multi-select-dropdown/multi-select-dropdown.component';

const COLUMN_TITLES: Record<string, string> = {
  project: 'Project Name',
  projectManager: 'Project Manager',
  plannedActivities: 'Planned Activities',
  startDate: 'Start Date',
  plannedEndDate: 'Planned End Date',
  percentComplete: '% Complete',
  plannedHours: 'Planned Hours',
  utilizedHours: 'Utilized Hours',
  hoursVariance: 'Hours Variance',
  status: 'Status',
  milestoneAchieved: 'Milestone Achieved',
  remarks: 'Remarks',
  employee: 'Employee Name',
  role: 'Role',
  totalAllocationPct: 'Total Allocation %',
  allocationPct: 'Allocation %',
  actualHours: 'Actual Hours',
  billableHours: 'Billable Hours',
  nonBillableHours: 'Non-Billable Hours',
  utilizationPct: 'Utilization %',
  allocationStatus: 'Allocation Status',
  defectId: 'Defect ID',
  severity: 'Severity',
  reportedDate: 'Reported Date',
  resolvedDate: 'Resolved Date',
  ageingDays: 'Ageing (Days)',
  slaTargetDays: 'SLA Target (Days)',
  slaVarianceDays: 'SLA Variance (Days)',
  slaStatus: 'SLA Status',
  assignedTo: 'Assigned To',
  client: 'Client',
  county: 'County',
  state: 'State',
  propertyType: 'Property Type',
  accountType: 'Account Type',
  leadsGenerated: 'Leads Generated',
  preliminaryResearch: 'Preliminary Research',
  month: 'Month',
  category: 'Category',
  type: 'Type',
  hours: 'Hours',
  filesReceived: 'Files Received',
  filesDelivered: 'Files Delivered',
  filesDeliveredBeforeDue: 'Delivered Before Due',
  onTimeDeliveryPct: 'On-Time Delivery %',
  qualityPct: 'Quality %',
  pendingFiles: 'Pending Files',
  overdueFiles: 'Overdue Files',
  resourcesAllocated: 'Resources Allocated',
  allocatedHours: 'Allocated Hours',
  agent: 'Agent',
  date: 'Date',
  uid: 'Lead UID',
  contact: 'Contact',
  phone: 'Phone',
  connect: 'Connected',
  connectType: 'Connect Type',
  outcome: 'Outcome',
  nextAction: 'Next Action',
  isFirstForLead: 'First for Lead',
  statesCovered: 'States Covered',
  countiesCovered: 'Counties Covered',
  clientsCovered: 'Clients',
  preliminaryResearchDone: 'Research Done (Leads)',
  employeesAssigned: 'Employees Assigned',
  clientsServed: 'Clients Served',
  monthsActive: 'Months Active',
  attempts: 'Dial Attempts',
  uniqueLeads: 'Unique Leads Worked',
  connected: 'Connected Calls',
  connectRate: 'Connect Rate %',
  resource: 'Engineer / Resource',
  kpi: 'Metric / Component',
  target: 'Target',
  current: 'Current Value',
  allocation: 'Allocation Type',
  projectName: 'Assigned Scope / Project',
  owner: 'Project Owner',
  targetCompletion: 'Target Completion Date',
  plannedCompletionPct: 'Planned %',
  actualCompletionPct: 'Actual % Complete',
  scheduleVariancePct: 'Schedule Variance %',
  queryDate: 'Query Date',
  queryCode: 'Query Code',
  employeeCode: 'Emp Code',
  empCode: 'Emp Code',
  subCategory: 'Sub Category',
  subject: 'Query Subject',
  priority: 'Priority',
  assistancePerson: 'HR Handler',
  year: 'Year',
  fileNumber: 'File #',
  address: 'Property Address',
  primaryAppraiser: 'Primary Appraiser',
  reportType: 'Report Type',
  orderedByName: 'Client / AMC',
  dueDate: 'Due Date',
  processStatus: 'Process Status',
  productionDate: 'Production Date',
  level: 'Production Level',
  shift: 'Shift',
  compsCount: 'Comps Count / Received',
  actualProdPct: 'Actual Prod %',
  overallProdPct: 'Overall Prod %',
  overallUtilPct: 'Overall Util %',
  overallProdMins: 'Prod Mins',
  prodMins: 'Prod Mins',
  nonProdMins: 'Non-Prod Mins',
  overallMins: 'Total Mins',
  l1Count: 'Level 1 Files',
  l2Count: 'Level 2 Files',
  l3Count: 'Level 3 Files',
  l4Count: 'Level 4 Files',
  l5Count: 'Level 5 Files',
  rentalCount: 'Rental / Clone',
  comments: 'Comments',
  prodHours: 'Production Hours',
  nonProdHours: 'Non-Prod Hours',
  overallHours: 'Total Hours',
  avgProdPct: 'Avg Productivity %',
  avgUtilPct: 'Avg Utilization %',
  totalFilesCompleted: 'Total Files Completed',
  teamLead: 'Team Lead',
  name: 'Employee Name',
  empId: 'Emp ID',
  totalOrders: 'Total Orders',
  reportTypesCount: 'Report Types Count',
};

const STATUS_KEYS = new Set(['status', 'outcome', 'severity', 'connect', 'slaStatus', 'allocationStatus', 'preliminaryResearch']);
const PERCENT_KEYS = new Set([
  'percentComplete',
  'totalAllocationPct',
  'allocationPct',
  'utilizationPct',
  'onTimeDeliveryPct',
  'qualityPct',
  'plannedCompletionPct',
  'actualCompletionPct',
  'scheduleVariancePct',
  'actualProdPct',
  'overallProdPct',
  'overallUtilPct',
  'avgProdPct',
  'avgUtilPct',
]);

@Component({
  selector: 'app-department-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiCardComponent, ChartPanelComponent, StatusPillComponent, MultiSelectDropdownComponent],
  templateUrl: './department-dashboard.component.html',
  styleUrl: './department-dashboard.component.css',
})
export class DepartmentDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  data: DashboardData | null = null;
  loading = true;
  refreshing = false;
  error: string | null = null;

  // Simple Direct Pop-up Modal State

  modalOpen = false;
  modalTitle = '';
  modalSubtitle = '';
  modalRecords: any[] = [];
  modalColumns: string[] = [];
  modalSearchTerm = '';
  modalSortKey: string | null = null;
  modalSortDir: 'asc' | 'desc' = 'asc';

  // Multi-select Filter state for CRE Utilization & Marketing Lead Generation & HR Query
  selectedYears: string[] = [];
  selectedMonths: string[] = [];
  selectedClients: string[] = [];
  selectedStates: string[] = [];
  selectedPropertyTypes: string[] = [];
  selectedAccountTypes: string[] = [];
  selectedSubCategories: string[] = [];
  selectedPriorities: string[] = [];
  selectedAssistancePersons: string[] = [];
  selectedStatuses: string[] = [];
  selectedReportTypes: string[] = [];
  selectedTeamLeads: string[] = [];
  selectedLevels: string[] = [];
  selectedAgents: string[] = [];
  selectedCategories: string[] = [];
  selectedResources: string[] = [];
  selectedAllocations: string[] = [];
  selectedProjects: string[] = [];
  selectedEmployees: string[] = [];
  selectedRoles: string[] = [];
  selectedOutcomes: string[] = [];
  selectedConnects: string[] = [];
  selectedDates: string[] = [];

  yearsList: string[] = [];
  monthsList: string[] = [];
  clientsList: string[] = [];
  statesList: string[] = [];
  propertyTypesList: string[] = [];
  accountTypesList: string[] = [];
  subCategoriesList: string[] = [];
  prioritiesList: string[] = [];
  assistancePersonsList: string[] = [];
  statusesList: string[] = [];
  reportTypesList: string[] = [];
  teamLeadsList: string[] = [];
  levelsList: string[] = [];
  agentsList: string[] = [];
  categoriesList: string[] = [];
  resourcesList: string[] = [];
  allocationsList: string[] = [];
  projectsList: string[] = [];
  employeesList: string[] = [];
  rolesList: string[] = [];
  outcomesList: string[] = [];
  connectsList: string[] = [];
  datesList: string[] = [];

  displayedKpis: Kpi[] = [];
  displayedCharts: ChartDef[] = [];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    if (this.modalOpen) {
      this.closeModal();
    }
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.silentSync();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.silentSync();
    }
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(switchMap((params) => {
      const id = params.get('departmentId')!;
      this.closeModal();
      const cached = this.api.getCachedDashboard(id);
      if (cached && cached.department === id) {
        this.normalizeDepartmentData(cached);
        this.data = cached;
        this.initFilterOptionsAndData();
        this.loading = false;
        this.error = null;
      } else {
        this.loading = true;
        this.error = null;
        this.data = null;
      }
      return this.api.getDashboard(id);
    })).subscribe({
      next: (data) => {
        const currentActiveId = this.route.snapshot.paramMap.get('departmentId');
        if (data && data.department === currentActiveId) {
          this.normalizeDepartmentData(data);
          this.data = data;
          this.initFilterOptionsAndData();
          this.loading = false;
        }
      },
      error: (err) => {
        const currentActiveId = this.route.snapshot.paramMap.get('departmentId');
        if (err?.department === currentActiveId || !this.data) {
          this.error = err?.error?.error || 'Could not load this department\'s dashboard.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
    });

    // Real-time SSE push notification when live Excel file changes (<10ms)
    this.api.subscribeToEvents().pipe(
      takeUntil(this.destroy$)
    ).subscribe((evt) => {
      const currentId = this.route.snapshot.paramMap.get('departmentId');
      if (evt.departmentId === 'all' || evt.departmentId === currentId) {
        this.silentSync();
      }
    });

    // Gentle 3-second fallback heartbeat
    interval(3000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.silentSync();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  silentSync(): void {
    const requestedId = this.route.snapshot.paramMap.get('departmentId');
    if (!requestedId || this.loading || this.refreshing) return;
    this.api.getDashboard(requestedId, true).subscribe({
      next: (data) => {
        const currentActiveId = this.route.snapshot.paramMap.get('departmentId');
        if (data && data.department === currentActiveId) {
          this.normalizeDepartmentData(data);
          if (!this.isDataEqual(this.data, data)) {
            this.data = data;
            this.updateFilterListsKeepSelections();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }
        }
      },
      error: () => { }
    });
  }

  private isDataEqual(oldData: DashboardData | null, newData: DashboardData | null): boolean {
    if (!oldData || !newData) return false;
    if (oldData.department !== newData.department) return false;
    return (
      JSON.stringify(oldData.kpis) === JSON.stringify(newData.kpis) &&
      JSON.stringify(oldData.charts) === JSON.stringify(newData.charts) &&
      JSON.stringify(oldData.tables) === JSON.stringify(newData.tables)
    );
  }

  trackByKpi(_index: number, item: Kpi): string {
    return item.key || item.label || String(_index);
  }

  trackByChart(_index: number, item: ChartDef): string {
    return item.id || item.title || String(_index);
  }

  private normalizeDepartmentData(data: DashboardData | null): void {
    if (!data) return;
    if (data.department === 'sw-engineering') {
      const defectChart = data.charts.find((c) => c.id === 'defectsBySeverity');
      if (defectChart && (!defectChart.labels?.length || !defectChart.series?.[0]?.data?.length)) {
        defectChart.labels = ['Critical', 'High', 'Medium', 'Low'];
        defectChart.series = [{ name: 'Defects', data: [0, 0, 0, 0] }];
      }
    }
  }

  updateFilteredData(): void {
    if (!this.data) {
      this.displayedKpis = [];
      this.displayedCharts = [];
      return;
    }
    if (this.data.department === 'cre-utilization') {
      this.updateFilteredCreData();
    } else if (this.data.department === 'marketing') {
      this.updateFilteredMarketingData();
    } else if (this.data.department === 'hr-query') {
      this.updateFilteredHrQueryData();
    } else if (this.data.department === 'residential-appraisal') {
      this.updateFilteredResidentialData();
    } else if (this.data.department === 'it-operations') {
      this.updateFilteredItOperationsData();
    } else if (this.data.department === 'sw-engineering') {
      this.updateFilteredSwEngineeringData();
    } else if (this.data.department === 'outbound-desk') {
      this.updateFilteredOutboundDeskData();
    } else {
      this.displayedKpis = this.data.kpis ? [...this.data.kpis] : [];
      this.displayedCharts = this.data.charts ? [...this.data.charts] : [];
    }
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedYears.length > 0 ||
      this.selectedMonths.length > 0 ||
      this.selectedClients.length > 0 ||
      this.selectedStates.length > 0 ||
      this.selectedPropertyTypes.length > 0 ||
      this.selectedAccountTypes.length > 0 ||
      this.selectedSubCategories.length > 0 ||
      this.selectedPriorities.length > 0 ||
      this.selectedAssistancePersons.length > 0 ||
      this.selectedStatuses.length > 0 ||
      this.selectedReportTypes.length > 0 ||
      this.selectedTeamLeads.length > 0 ||
      this.selectedLevels.length > 0 ||
      this.selectedAgents.length > 0 ||
      this.selectedCategories.length > 0 ||
      this.selectedResources.length > 0 ||
      this.selectedAllocations.length > 0 ||
      this.selectedProjects.length > 0 ||
      this.selectedEmployees.length > 0 ||
      this.selectedRoles.length > 0 ||
      this.selectedOutcomes.length > 0 ||
      this.selectedConnects.length > 0 ||
      this.selectedDates.length > 0
    );
  }

  resetFilters(): void {
    this.selectedYears = [];
    this.selectedMonths = [];
    this.selectedClients = [];
    this.selectedStates = [];
    this.selectedPropertyTypes = [];
    this.selectedAccountTypes = [];
    this.selectedSubCategories = [];
    this.selectedPriorities = [];
    this.selectedAssistancePersons = [];
    this.selectedStatuses = [];
    this.selectedReportTypes = [];
    this.selectedTeamLeads = [];
    this.selectedLevels = [];
    this.selectedAgents = [];
    this.selectedCategories = [];
    this.selectedResources = [];
    this.selectedAllocations = [];
    this.selectedProjects = [];
    this.selectedEmployees = [];
    this.selectedRoles = [];
    this.selectedOutcomes = [];
    this.selectedConnects = [];
    this.selectedDates = [];
    this.onFilterChange();
  }

  updateFilterListsKeepSelections(): void {
    if (!this.data) return;

    if (this.data.department === 'cre-utilization') {
      const deliverables = this.getTableRecords('deliverables');
      const utilization = this.getTableRecords('utilization');

      const allMonths = new Set<string>();
      deliverables.forEach((d) => { if (d.month) allMonths.add(d.month); });
      utilization.forEach((u) => { if (u.month) allMonths.add(u.month); });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });
      this.monthsList = sortedMonths;

      const allClients = new Set<string>();
      deliverables.forEach((d) => { if (d.client) allClients.add(d.client); });
      utilization.filter((u) => u.type === 'client').forEach((u) => { if (u.category) allClients.add(u.category); });
      this.clientsList = [...allClients].sort();

      this.selectedMonths = this.selectedMonths.filter((m) => this.monthsList.includes(m));
      this.selectedClients = this.selectedClients.filter((c) => this.clientsList.includes(c));
    } else if (this.data.department === 'marketing') {
      const leads = this.getTableRecords('leads');

      const allMonths = new Set<string>();
      const allClients = new Set<string>();
      const allStates = new Set<string>();
      const allPropertyTypes = new Set<string>();
      const allAccountTypes = new Set<string>();

      leads.forEach((l) => {
        if (l.month) allMonths.add(l.month);
        if (l.client) allClients.add(l.client);
        if (l.state) allStates.add(l.state);
        if (l.propertyType) allPropertyTypes.add(l.propertyType);
        if (l.accountType) allAccountTypes.add(l.accountType);
      });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });

      this.monthsList = sortedMonths.length ? sortedMonths : monthOrder;
      this.clientsList = [...allClients].sort();
      this.statesList = [...allStates].sort();
      this.propertyTypesList = [...allPropertyTypes].sort();
      this.accountTypesList = [...allAccountTypes].sort();

      this.selectedMonths = this.selectedMonths.filter((m) => this.monthsList.includes(m));
      this.selectedClients = this.selectedClients.filter((c) => this.clientsList.includes(c));
      this.selectedStates = this.selectedStates.filter((s) => this.statesList.includes(s));
      this.selectedPropertyTypes = this.selectedPropertyTypes.filter((p) => this.propertyTypesList.includes(p));
      this.selectedAccountTypes = this.selectedAccountTypes.filter((a) => this.accountTypesList.includes(a));
    } else if (this.data.department === 'hr-query') {
      const queries = this.getTableRecords('queries');

      const allYears = new Set<string>();
      const allMonths = new Set<string>();
      const allCategories = new Set<string>();
      const allSubCats = new Set<string>();
      const allPrios = new Set<string>();
      const allHands = new Set<string>();
      const allStats = new Set<string>();

      queries.forEach((q) => {
        if (q.year) allYears.add(String(q.year));
        if (q.month) allMonths.add(q.month);
        if (q.category) allCategories.add(q.category);
        if (q.subCategory) allSubCats.add(q.subCategory);
        if (q.priority) allPrios.add(q.priority);
        if (q.assistancePerson) allHands.add(q.assistancePerson);
        if (q.status) allStats.add(q.status);
      });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });

      this.yearsList = [...allYears].sort();
      this.monthsList = sortedMonths.length ? sortedMonths : monthOrder;
      this.categoriesList = [...allCategories].sort();
      this.subCategoriesList = [...allSubCats].sort();
      this.prioritiesList = [...allPrios].sort();
      this.assistancePersonsList = [...allHands].sort();
      this.statusesList = [...allStats].sort();

      this.selectedYears = this.selectedYears.filter((y) => this.yearsList.includes(y));
      this.selectedMonths = this.selectedMonths.filter((m) => this.monthsList.includes(m));
      this.selectedCategories = this.selectedCategories.filter((c) => this.categoriesList.includes(c));
      this.selectedSubCategories = this.selectedSubCategories.filter((s) => this.subCategoriesList.includes(s));
      this.selectedPriorities = this.selectedPriorities.filter((p) => this.prioritiesList.includes(p));
      this.selectedAssistancePersons = this.selectedAssistancePersons.filter((a) => this.assistancePersonsList.includes(a));
      this.selectedStatuses = this.selectedStatuses.filter((st) => this.statusesList.includes(st));
    } else if (this.data.department === 'residential-appraisal') {
      const orders = this.getTableRecords('orders');
      const perf = this.getTableRecords('performance');
      const emp = this.getTableRecords('employeeSummary');

      const allMonths = new Set<string>();
      const allClients = new Set<string>();
      const allStates = new Set<string>();
      const allReports = new Set<string>();
      const allLeads = new Set<string>();
      const allLevels = new Set<string>();
      const allAgents = new Set<string>();

      perf.forEach((p) => {
        if (p.month) allMonths.add(p.month);
      });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });
      this.monthsList = sortedMonths;

      orders.forEach((o) => {
        if (o.orderedByName) allClients.add(o.orderedByName);
        if (o.state) allStates.add(o.state);
        if (o.reportType) allReports.add(o.reportType);
        if (o.teamLead) allLeads.add(o.teamLead);
        if (o.level) allLevels.add(o.level);
        if (o.agent) allAgents.add(o.agent);
      });
      perf.forEach((p) => {
        if (p.teamLead) allLeads.add(p.teamLead);
        if (p.name) allAgents.add(p.name);
      });
      emp.forEach((e) => {
        if (e.teamLead) allLeads.add(e.teamLead);
        if (e.name) allAgents.add(e.name);
      });

      this.clientsList = [...allClients].sort();
      this.statesList = [...allStates].sort();
      this.reportTypesList = [...allReports].sort();
      this.teamLeadsList = [...allLeads].sort();
      this.levelsList = [...allLevels].sort();
      this.agentsList = [...allAgents].sort();

      this.selectedMonths = this.selectedMonths.filter((m) => this.monthsList.includes(m));
      this.selectedClients = this.selectedClients.filter((c) => this.clientsList.includes(c));
      this.selectedStates = this.selectedStates.filter((s) => this.statesList.includes(s));
      this.selectedReportTypes = this.selectedReportTypes.filter((r) => this.reportTypesList.includes(r));
      this.selectedTeamLeads = this.selectedTeamLeads.filter((t) => this.teamLeadsList.includes(t));
      this.selectedLevels = this.selectedLevels.filter((l) => this.levelsList.includes(l));
      this.selectedAgents = this.selectedAgents.filter((a) => this.agentsList.includes(a));
    } else if (this.data.department === 'it-operations') {
      const itKpi = this.getTableRecords('itKpi');
      const resources = this.getTableRecords('resources');
      const projects = this.getTableRecords('projects');

      const allCategories = new Set<string>();
      const allStatuses = new Set<string>();
      const allResources = new Set<string>();
      const allAllocations = new Set<string>();
      const allProjects = new Set<string>();

      itKpi.forEach((r) => {
        if (r.category) allCategories.add(r.category);
        if (r.status) allStatuses.add(r.status);
      });
      resources.forEach((r) => {
        if (r.resource) allResources.add(r.resource);
        if (r.allocation) allAllocations.add(r.allocation);
        if (r.projectName) allProjects.add(r.projectName);
        if (r.status) allStatuses.add(r.status);
      });
      projects.forEach((p) => {
        if (p.project) allProjects.add(p.project);
        if (p.owner) allResources.add(p.owner);
        if (p.status) allStatuses.add(p.status);
      });

      this.categoriesList = [...allCategories].sort();
      this.statusesList = [...allStatuses].sort();
      this.resourcesList = [...allResources].sort();
      this.allocationsList = [...allAllocations].sort();
      this.projectsList = [...allProjects].sort();

      this.selectedCategories = this.selectedCategories.filter((c) => this.categoriesList.includes(c));
      this.selectedStatuses = this.selectedStatuses.filter((s) => this.statusesList.includes(s));
      this.selectedResources = this.selectedResources.filter((r) => this.resourcesList.includes(r));
      this.selectedAllocations = this.selectedAllocations.filter((a) => this.allocationsList.includes(a));
      this.selectedProjects = this.selectedProjects.filter((p) => this.projectsList.includes(p));
    } else if (this.data.department === 'sw-engineering') {
      const projects = this.getTableRecords('projects');
      const assignments = this.getTableRecords('assignments');
      const employeeSummary = this.getTableRecords('employeeSummary');

      const allProjects = new Set<string>();
      const allStatuses = new Set<string>();
      const allEmployees = new Set<string>();
      const allRoles = new Set<string>();

      projects.forEach((p) => {
        if (p.project) allProjects.add(p.project);
        if (p.status) allStatuses.add(p.status);
      });
      assignments.forEach((a) => {
        if (a.project) allProjects.add(a.project);
        if (a.employee) allEmployees.add(a.employee);
        if (a.role) allRoles.add(a.role);
      });
      employeeSummary.forEach((e) => {
        if (e.employee) allEmployees.add(e.employee);
        if (e.role) allRoles.add(e.role);
      });

      this.projectsList = [...allProjects].sort();
      this.statusesList = [...allStatuses].sort();
      this.employeesList = [...allEmployees].sort();
      this.rolesList = [...allRoles].sort();

      this.selectedProjects = this.selectedProjects.filter((p) => this.projectsList.includes(p));
      this.selectedStatuses = this.selectedStatuses.filter((s) => this.statusesList.includes(s));
      this.selectedEmployees = this.selectedEmployees.filter((e) => this.employeesList.includes(e));
      this.selectedRoles = this.selectedRoles.filter((r) => this.rolesList.includes(r));
    } else if (this.data.department === 'outbound-desk') {
      const calls = this.getTableRecords('calls');

      const allAgents = new Set<string>();
      const allOutcomes = new Set<string>();
      const allConnects = new Set<string>();
      const allDates = new Set<string>();

      calls.forEach((c) => {
        if (c.agent) allAgents.add(c.agent);
        if (c.outcome) allOutcomes.add(c.outcome);
        if (c.connect) allConnects.add(c.connect);
        if (c.date) {
          if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
            const [y, m, d] = c.date.slice(0, 10).split('-');
            allDates.add(`${m}/${d}/${y}`);
          } else {
            allDates.add(String(c.date));
          }
        }
      });

      this.agentsList = [...allAgents].sort();
      this.outcomesList = [...allOutcomes].sort();
      this.connectsList = [...allConnects].sort();
      this.datesList = [...allDates].sort();

      this.selectedAgents = this.selectedAgents.filter((a) => this.agentsList.includes(a));
      this.selectedOutcomes = this.selectedOutcomes.filter((o) => this.outcomesList.includes(o));
      this.selectedConnects = this.selectedConnects.filter((c) => this.connectsList.includes(c));
      this.selectedDates = this.selectedDates.filter((d) => this.datesList.includes(d));
    }

    this.updateFilteredData();
  }

  private initFilterOptionsAndData(): void {
    if (!this.data) {
      this.displayedKpis = [];
      this.displayedCharts = [];
      return;
    }

    if (this.data.department === 'cre-utilization') {
      const deliverables = this.getTableRecords('deliverables');
      const utilization = this.getTableRecords('utilization');

      const allMonths = new Set<string>();
      deliverables.forEach((d) => { if (d.month) allMonths.add(d.month); });
      utilization.forEach((u) => { if (u.month) allMonths.add(u.month); });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });
      this.monthsList = sortedMonths;

      const allClients = new Set<string>();
      deliverables.forEach((d) => { if (d.client) allClients.add(d.client); });
      utilization.filter((u) => u.type === 'client').forEach((u) => { if (u.category) allClients.add(u.category); });
      this.clientsList = [...allClients].sort();

      this.selectedMonths = [];
      this.selectedClients = [];
      this.updateFilteredCreData();
    } else if (this.data.department === 'marketing') {
      const leads = this.getTableRecords('leads');

      const allMonths = new Set<string>();
      const allClients = new Set<string>();
      const allStates = new Set<string>();
      const allPropertyTypes = new Set<string>();
      const allAccountTypes = new Set<string>();

      leads.forEach((l) => {
        if (l.month) allMonths.add(l.month);
        if (l.client) allClients.add(l.client);
        if (l.state) allStates.add(l.state);
        if (l.propertyType) allPropertyTypes.add(l.propertyType);
        if (l.accountType) allAccountTypes.add(l.accountType);
      });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });

      this.monthsList = sortedMonths.length ? sortedMonths : monthOrder;
      this.clientsList = [...allClients].sort();
      this.statesList = [...allStates].sort();
      this.propertyTypesList = [...allPropertyTypes].sort();
      this.accountTypesList = [...allAccountTypes].sort();

      this.selectedMonths = [];
      this.selectedClients = [];
      this.selectedStates = [];
      this.selectedPropertyTypes = [];
      this.selectedAccountTypes = [];

      this.updateFilteredMarketingData();
    } else if (this.data.department === 'hr-query') {
      const queries = this.getTableRecords('queries');

      const allYears = new Set<string>();
      const allMonths = new Set<string>();
      const allCategories = new Set<string>();
      const allSubCats = new Set<string>();
      const allPrios = new Set<string>();
      const allHands = new Set<string>();
      const allStats = new Set<string>();

      queries.forEach((q) => {
        if (q.year) allYears.add(String(q.year));
        if (q.month) allMonths.add(q.month);
        if (q.category) allCategories.add(q.category);
        if (q.subCategory) allSubCats.add(q.subCategory);
        if (q.priority) allPrios.add(q.priority);
        if (q.assistancePerson) allHands.add(q.assistancePerson);
        if (q.status) allStats.add(q.status);
      });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });

      this.yearsList = [...allYears].sort();
      this.monthsList = sortedMonths.length ? sortedMonths : monthOrder;
      this.categoriesList = [...allCategories].sort();
      this.subCategoriesList = [...allSubCats].sort();
      this.prioritiesList = [...allPrios].sort();
      this.assistancePersonsList = [...allHands].sort();
      this.statusesList = [...allStats].sort();

      this.selectedYears = [];
      this.selectedMonths = [];
      this.selectedCategories = [];
      this.selectedSubCategories = [];
      this.selectedPriorities = [];
      this.selectedAssistancePersons = [];
      this.selectedStatuses = [];

      this.updateFilteredHrQueryData();
    } else if (this.data.department === 'residential-appraisal') {
      const orders = this.getTableRecords('orders');
      const perf = this.getTableRecords('performance');
      const emp = this.getTableRecords('employeeSummary');

      const allMonths = new Set<string>();
      const allClients = new Set<string>();
      const allStates = new Set<string>();
      const allReports = new Set<string>();
      const allLeads = new Set<string>();
      const allLevels = new Set<string>();
      const allAgents = new Set<string>();

      perf.forEach((p) => {
        if (p.month) allMonths.add(p.month);
      });

      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const sortedMonths = [...allMonths].sort((a, b) => {
        const ia = monthOrder.indexOf(a);
        const ib = monthOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });
      this.monthsList = sortedMonths;

      orders.forEach((o) => {
        if (o.orderedByName) allClients.add(o.orderedByName);
        if (o.state) allStates.add(o.state);
        if (o.reportType) allReports.add(o.reportType);
        if (o.teamLead) allLeads.add(o.teamLead);
        if (o.level) allLevels.add(o.level);
        if (o.agent) allAgents.add(o.agent);
      });
      perf.forEach((p) => {
        if (p.teamLead) allLeads.add(p.teamLead);
        if (p.name) allAgents.add(p.name);
      });
      emp.forEach((e) => {
        if (e.teamLead) allLeads.add(e.teamLead);
        if (e.name) allAgents.add(e.name);
      });

      this.clientsList = [...allClients].sort();
      this.statesList = [...allStates].sort();
      this.reportTypesList = [...allReports].sort();
      this.teamLeadsList = [...allLeads].sort();
      this.levelsList = [...allLevels].sort();
      this.agentsList = [...allAgents].sort();

      this.selectedMonths = [];
      this.selectedClients = [];
      this.selectedStates = [];
      this.selectedReportTypes = [];
      this.selectedTeamLeads = [];
      this.selectedLevels = [];
      this.selectedAgents = [];

      this.updateFilteredResidentialData();
    } else if (this.data.department === 'it-operations') {
      const itKpi = this.getTableRecords('itKpi');
      const resources = this.getTableRecords('resources');
      const projects = this.getTableRecords('projects');

      const allCategories = new Set<string>();
      const allStatuses = new Set<string>();
      const allResources = new Set<string>();
      const allAllocations = new Set<string>();
      const allProjects = new Set<string>();

      itKpi.forEach((r) => {
        if (r.category) allCategories.add(r.category);
        if (r.status) allStatuses.add(r.status);
      });
      resources.forEach((r) => {
        if (r.resource) allResources.add(r.resource);
        if (r.allocation) allAllocations.add(r.allocation);
        if (r.projectName) allProjects.add(r.projectName);
        if (r.status) allStatuses.add(r.status);
      });
      projects.forEach((p) => {
        if (p.project) allProjects.add(p.project);
        if (p.owner) allResources.add(p.owner);
        if (p.status) allStatuses.add(p.status);
      });

      this.categoriesList = [...allCategories].sort();
      this.statusesList = [...allStatuses].sort();
      this.resourcesList = [...allResources].sort();
      this.allocationsList = [...allAllocations].sort();
      this.projectsList = [...allProjects].sort();

      this.selectedCategories = [];
      this.selectedStatuses = [];
      this.selectedResources = [];
      this.selectedAllocations = [];
      this.selectedProjects = [];

      this.updateFilteredItOperationsData();
    } else if (this.data.department === 'sw-engineering') {
      const projects = this.getTableRecords('projects');
      const assignments = this.getTableRecords('assignments');
      const employeeSummary = this.getTableRecords('employeeSummary');

      const allProjects = new Set<string>();
      const allStatuses = new Set<string>();
      const allEmployees = new Set<string>();
      const allRoles = new Set<string>();

      projects.forEach((p) => {
        if (p.project) allProjects.add(p.project);
        if (p.status) allStatuses.add(p.status);
      });
      assignments.forEach((a) => {
        if (a.project) allProjects.add(a.project);
        if (a.employee) allEmployees.add(a.employee);
        if (a.role) allRoles.add(a.role);
      });
      employeeSummary.forEach((e) => {
        if (e.employee) allEmployees.add(e.employee);
        if (e.role) allRoles.add(e.role);
      });

      this.projectsList = [...allProjects].sort();
      this.statusesList = [...allStatuses].sort();
      this.employeesList = [...allEmployees].sort();
      this.rolesList = [...allRoles].sort();

      this.selectedProjects = [];
      this.selectedStatuses = [];
      this.selectedEmployees = [];
      this.selectedRoles = [];

      this.updateFilteredSwEngineeringData();
    } else if (this.data.department === 'outbound-desk') {
      const calls = this.getTableRecords('calls');

      const allAgents = new Set<string>();
      const allOutcomes = new Set<string>();
      const allConnects = new Set<string>();
      const allDates = new Set<string>();

      calls.forEach((c) => {
        if (c.agent) allAgents.add(c.agent);
        if (c.outcome) allOutcomes.add(c.outcome);
        if (c.connect) allConnects.add(c.connect);
        if (c.date) {
          if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
            const [y, m, d] = c.date.slice(0, 10).split('-');
            allDates.add(`${m}/${d}/${y}`);
          } else {
            allDates.add(String(c.date));
          }
        }
      });

      this.agentsList = [...allAgents].sort();
      this.outcomesList = [...allOutcomes].sort();
      this.connectsList = [...allConnects].sort();
      this.datesList = [...allDates].sort();

      this.selectedAgents = [];
      this.selectedOutcomes = [];
      this.selectedConnects = [];
      this.selectedDates = [];

      this.updateFilteredOutboundDeskData();
    } else {
      this.displayedKpis = this.data.kpis || [];
      this.displayedCharts = this.data.charts || [];
    }
  }

  onFilterChange(): void {
    if (this.data?.department === 'cre-utilization') {
      this.updateFilteredCreData();
    } else if (this.data?.department === 'marketing') {
      this.updateFilteredMarketingData();
    } else if (this.data?.department === 'hr-query') {
      this.updateFilteredHrQueryData();
    } else if (this.data?.department === 'residential-appraisal') {
      this.updateFilteredResidentialData();
    } else if (this.data?.department === 'it-operations') {
      this.updateFilteredItOperationsData();
    } else if (this.data?.department === 'sw-engineering') {
      this.updateFilteredSwEngineeringData();
    } else if (this.data?.department === 'outbound-desk') {
      this.updateFilteredOutboundDeskData();
    }
  }

  updateFilteredHrQueryData(): void {
    if (!this.data || this.data.department !== 'hr-query') return;

    const queriesAll = this.getTableRecords('queries');

    const filteredQueries = queriesAll.filter((q) => {
      const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
      const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
      const matchCat = !q.category || !this.selectedCategories.length || this.selectedCategories.includes(q.category);
      const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
      const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
      const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
      const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
      return matchYear && matchMonth && matchCat && matchSubCat && matchPrio && matchHand && matchStat;
    });

    const totalQueries = filteredQueries.length;
    const completed = filteredQueries.filter((q) => q.status === 'Completed').length;
    const inProcess = filteredQueries.filter((q) => q.status === 'In-Process').length;
    const resolutionRate = totalQueries ? Math.round((completed / totalQueries) * 1000) / 10 : 0;
    const highPriorityShare = totalQueries ? Math.round((filteredQueries.filter((q) => q.priority === 'High' || q.priority === 'Very High').length / totalQueries) * 1000) / 10 : 0;
    const hrTeamHandlers = new Set(filteredQueries.map((q) => q.assistancePerson).filter(Boolean)).size;

    this.displayedKpis = [
      { key: 'totalQueries', label: 'TOTAL QUERIES LOGGED', value: totalQueries, format: 'number' },
      { key: 'completed', label: 'COMPLETED QUERIES', value: completed, format: 'number' },
      { key: 'inProcess', label: 'IN-PROCESS QUERIES', value: inProcess, format: 'number' },
      { key: 'resolutionRate', label: 'RESOLUTION RATE %', value: resolutionRate, format: 'percent' },
      { key: 'highPriorityShare', label: 'HIGH PRIORITY SHARE', value: highPriorityShare, format: 'percent' },
      { key: 'hrTeamHandlers', label: 'HR TEAM HANDLERS', value: hrTeamHandlers, format: 'number' },
    ];

    const groupCount = (keyFn: (r: any) => string) => {
      const map = new Map<string, number>();
      filteredQueries.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + 1);
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const byCategory = groupCount((q) => q.category);
    const bySubCategory = groupCount((q) => q.subCategory).slice(0, 12);
    const byPriority = groupCount((q) => q.priority);
    const byStatus = groupCount((q) => q.status);
    const byHandler = groupCount((q) => q.assistancePerson).slice(0, 10);

    this.displayedCharts = [
      /* { id: 'byCategory', title: 'Queries by Category', type: 'bar', labels: byCategory.map((x) => x[0]), series: [{ name: 'Queries', data: byCategory.map((x) => x[1]) }] }, */
      { id: 'bySubCategory', title: 'Queries by Sub-Category (Top 12)', type: 'bar', labels: bySubCategory.map((x) => x[0]), series: [{ name: 'Queries', data: bySubCategory.map((x) => x[1]) }] },
      { id: 'byPriority', title: 'Queries by Priority', type: 'pie', labels: byPriority.map((x) => x[0]), series: [{ name: 'Queries', data: byPriority.map((x) => x[1]) }] },
      { id: 'byStatus', title: 'Queries by Status', type: 'bar', labels: byStatus.map((x) => x[0]), series: [{ name: 'Queries', data: byStatus.map((x) => x[1]) }] },
      { id: 'byHandler', title: 'Queries Handled by HR Team (Top 10)', type: 'pie', labels: byHandler.map((x) => x[0]), series: [{ name: 'Queries', data: byHandler.map((x) => x[1]) }] },
    ];
  }

  updateFilteredResidentialData(): void {
    if (!this.data || this.data.department !== 'residential-appraisal') return;

    const ordersAll = this.getTableRecords('orders');
    const perfAll = this.getTableRecords('performance');
    const empAll = this.getTableRecords('employeeSummary');

    const filteredOrders = ordersAll.filter((o) => {
      const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(o.month);
      const matchClient = !this.selectedClients.length || this.selectedClients.includes(o.orderedByName);
      const matchState = !this.selectedStates.length || this.selectedStates.includes(o.state);
      const matchReport = !this.selectedReportTypes.length || this.selectedReportTypes.includes(o.reportType);
      const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(o.teamLead);
      const matchLevel = !this.selectedLevels.length || this.selectedLevels.includes(o.level);
      const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(o.agent);
      return matchMonth && matchClient && matchState && matchReport && matchLead && matchLevel && matchAgent;
    });

    const filteredPerf = perfAll.filter((p) => {
      const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(p.month);
      const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(p.teamLead);
      const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(p.name);
      return matchMonth && matchLead && matchAgent;
    });

    // Dynamically aggregate employee summary from filtered performance
    const empMap = new Map<string, any>();
    filteredPerf.forEach((p) => {
      if (!p.name) return;
      const key = p.name.toLowerCase();
      if (!empMap.has(key)) {
        empMap.set(key, {
          name: p.name,
          teamLead: p.teamLead,
          prodMins: 0,
          nonProdMins: 0,
          overallMins: 0,
          prodPcts: [] as number[],
          utilPcts: [] as number[],
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
      item.prodMins += Number(p.prodMins) || 0;
      item.nonProdMins += Number(p.nonProdMins) || 0;
      item.overallMins += Number(p.overallMins) || 0;
      if (p.overallProdPct !== null && p.overallProdPct > 0) item.prodPcts.push(Number(p.overallProdPct));
      if (p.overallUtilPct !== null && p.overallUtilPct > 0) item.utilPcts.push(Number(p.overallUtilPct));
      item.l1Count += Number(p.l1Count) || 0;
      item.l2Count += Number(p.l2Count) || 0;
      item.l3Count += Number(p.l3Count) || 0;
      item.l4Count += Number(p.l4Count) || 0;
      item.l5Count += Number(p.l5Count) || 0;
      item.rentalCount += Number(p.rentalCount) || 0;
      item.daysActive++;
    });

    const filteredEmp = [...empMap.values()]
      .map((e) => {
        const avgProdPct = e.prodPcts.length
          ? Math.round((e.prodPcts.reduce((a: number, b: number) => a + b, 0) / e.prodPcts.length) * 10) / 10
          : 0;
        const avgUtilPct = e.utilPcts.length
          ? Math.round((e.utilPcts.reduce((a: number, b: number) => a + b, 0) / e.utilPcts.length) * 10) / 10
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

    const totalOrders = filteredOrders.length;
    const totalClients = new Set(filteredOrders.map((o) => o.orderedByName).filter(Boolean)).size;
    const activeStaff = filteredEmp.length;
    const totalProdMinutes = filteredPerf.reduce((sum, p) => sum + (Number(p.prodMins) || 0), 0);
    const totalProdHours = Math.round(totalProdMinutes / 60);

    const validProd = filteredPerf.map((p) => Number(p.overallProdPct)).filter((v) => !isNaN(v) && v > 0);
    const overallProductivity = validProd.length
      ? Math.round((validProd.reduce((a, b) => a + b, 0) / validProd.length) * 10) / 10
      : 0;

    const validUtil = filteredPerf.map((p) => Number(p.overallUtilPct)).filter((v) => !isNaN(v) && v > 0);
    const overallUtilization = validUtil.length
      ? Math.round((validUtil.reduce((a, b) => a + b, 0) / validUtil.length) * 10) / 10
      : 0;

    this.displayedKpis = [
      { key: 'totalOrders', label: 'TOTAL ORDERS PROCESSED', value: totalOrders, format: 'number' },
      { key: 'overallProductivity', label: 'OVERALL PRODUCTIVITY %', value: overallProductivity, format: 'percent' },
      { key: 'overallUtilization', label: 'OVERALL UTILIZATION %', value: overallUtilization, format: 'percent' },
      { key: 'totalProdHours', label: 'TOTAL PRODUCTION HOURS', value: totalProdHours, format: 'number' },
      { key: 'activeStaff', label: 'ACTIVE PRODUCTION STAFF', value: activeStaff, format: 'number' },
      { key: 'totalClients', label: 'CLIENTS & AMCs SERVED', value: totalClients, format: 'number' },
    ];

    const groupCount = (arr: any[], keyFn: (r: any) => string) => {
      const map = new Map<string, number>();
      arr.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + 1);
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const groupSum = (arr: any[], keyFn: (r: any) => string, valFn: (r: any) => number) => {
      const map = new Map<string, number>();
      arr.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + (valFn(r) || 0));
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const byClient = groupCount(filteredOrders, (o) => o.orderedByName).slice(0, 10);
    const byReportType = groupCount(filteredOrders, (o) => o.reportType).slice(0, 8);
    const byLevel = [
      ['Level 1', filteredOrders.filter((o) => o.level === 'Level 1').length],
      ['Level 2', filteredOrders.filter((o) => o.level === 'Level 2').length],
      ['Level 3', filteredOrders.filter((o) => o.level === 'Level 3').length],
      ['Level 4', filteredOrders.filter((o) => o.level === 'Level 4').length],
      ['Level 5', filteredOrders.filter((o) => o.level === 'Level 5').length],
    ];
    const byTeamLead = groupSum(filteredPerf, (p) => p.teamLead, (p) => Math.round((Number(p.prodMins) || 0) / 60));
    const byAgent = filteredEmp.slice(0, 10).map((s) => [s.name, s.totalFilesCompleted]);
    const byState = groupCount(filteredOrders, (o) => o.state).slice(0, 10);

    this.displayedCharts = [
      {
        id: 'ordersByClient',
        title: 'Appraisal Orders by Client / AMC',
        type: 'pie',
        labels: byClient.map((x) => x[0]),
        series: [{ name: 'Orders', data: byClient.map((x) => x[1]) }],
      },
      {
        id: 'volumeByLevel',
        title: 'Production Volume by Level',
        type: 'bar',
        labels: byLevel.map((x) => x[0]),
        series: [{ name: 'Orders', data: byLevel.map((x) => x[1]) }],
      },
      {
        id: 'ordersByReportType',
        title: 'Orders by Appraisal Report Type',
        type: 'pie',
        labels: byReportType.map((x) => x[0]),
        series: [{ name: 'Orders', data: byReportType.map((x) => x[1]) }],
      },
      {
        id: 'topAgents',
        title: 'Top 10 Agents by Volume Completed',
        type: 'bar',
        labels: byAgent.map((x) => x[0]),
        series: [{ name: 'Files Completed', data: byAgent.map((x) => x[1]) }],
      },
      {
        id: 'productivityByTeamLead',
        title: 'Production Hours by Team Lead',
        type: 'pie',
        labels: byTeamLead.map((x) => x[0]),
        series: [{ name: 'Hours Logged', data: byTeamLead.map((x) => x[1]) }],
      },
      {
        id: 'ordersByState',
        title: 'Appraisal Distribution by State',
        type: 'bar',
        labels: byState.map((x) => x[0]),
        series: [{ name: 'Orders', data: byState.map((x) => x[1]) }],
      },
    ];
  }

  updateFilteredItOperationsData(): void {
    if (!this.data || this.data.department !== 'it-operations') return;

    const itKpiAll = this.getTableRecords('itKpi');
    const resourcesAll = this.getTableRecords('resources');
    const projectsAll = this.getTableRecords('projects');

    // 1. Filter IT KPI records
    const filteredItKpi = itKpiAll.filter((r) => {
      const matchCat = !this.selectedCategories.length || this.selectedCategories.includes(r.category);
      const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
      return matchCat && matchStat;
    });

    // 2. Filter Resources
    const filteredResources = resourcesAll.filter((r) => {
      const matchRes = !this.selectedResources.length || this.selectedResources.includes(r.resource);
      const matchAlloc = !this.selectedAllocations.length || this.selectedAllocations.includes(r.allocation);
      const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(r.projectName);
      const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
      return matchRes && matchAlloc && matchProj && matchStat;
    });

    // 3. Filter Projects
    const filteredProjects = projectsAll.filter((p) => {
      const matchOwner = !this.selectedResources.length || this.selectedResources.includes(p.owner);
      const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
      const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
      return matchOwner && matchProj && matchStat;
    });

    // 4. Update KPIs dynamically
    const kpis: Kpi[] = [];

    // Critical Resource Availability
    const infraAvail = filteredItKpi.filter(
      (r) => r.category.toLowerCase().includes('infra') && !isNaN(parseFloat(r.current))
    );
    let critAvailVal = 0;
    if (infraAvail.length > 0) {
      const avg =
        infraAvail.reduce((acc, cur) => {
          const n = parseFloat(cur.current);
          return acc + (n <= 1 && n > 0 ? n * 100 : n);
        }, 0) / infraAvail.length;
      critAvailVal = Math.round(avg * 10) / 10;
    } else if (!this.selectedCategories.length && !this.selectedStatuses.length) {
      critAvailVal = (this.data.kpis?.find((k) => k.key === 'criticalAvailability')?.value as number) || 94.8;
    }
    kpis.push({
      key: 'criticalAvailability',
      label: 'Critical Resource Availability',
      value: critAvailVal,
      format: 'percent',
    });

    // SLA Compliance
    const slaRow = filteredItKpi.find((r) => r.kpi.toLowerCase().includes('sla'));
    let slaVal = 0;
    if (slaRow) {
      const raw = parseFloat(slaRow.current);
      slaVal = !isNaN(raw) ? (raw <= 1 && raw > 0 ? Math.round(raw * 1000) / 10 : raw) : 100;
    } else if (!this.selectedCategories.length && !this.selectedStatuses.length) {
      slaVal = (this.data.kpis?.find((k) => k.key === 'slaCompliance')?.value as number) || 100;
    }
    kpis.push({
      key: 'slaCompliance',
      label: 'SLA Compliance',
      value: slaVal,
      format: 'percent',
    });

    // Backup Success Rate
    const backupRow = filteredItKpi.find((r) => r.kpi.toLowerCase() === 'backup success');
    let backupVal = 0;
    if (backupRow) {
      const raw = parseFloat(backupRow.current);
      backupVal = !isNaN(raw) ? (raw <= 1 && raw > 0 ? Math.round(raw * 1000) / 10 : raw) : 100;
    } else if (!this.selectedCategories.length && !this.selectedStatuses.length) {
      backupVal = (this.data.kpis?.find((k) => k.key === 'backupSuccess')?.value as number) || 100;
    }
    kpis.push({
      key: 'backupSuccess',
      label: 'Backup Success Rate',
      value: backupVal,
      format: 'percent',
    });

    // Open Support Tickets
    const ticketRow = filteredItKpi.find((r) => r.kpi.toLowerCase() === 'open tickets');
    let ticketVal = 0;
    if (ticketRow) {
      ticketVal = parseFloat(ticketRow.current) || 0;
    } else if (!this.selectedCategories.length && !this.selectedStatuses.length) {
      ticketVal = (this.data.kpis?.find((k) => k.key === 'openTickets')?.value as number) || 8;
    }
    kpis.push({
      key: 'openTickets',
      label: 'Open Support Tickets',
      value: ticketVal,
      format: 'number',
    });

    // Patch Compliance
    const patchRow = filteredItKpi.find((r) => r.kpi.toLowerCase() === 'patch compliance');
    let patchVal = 0;
    if (patchRow) {
      const raw = parseFloat(patchRow.current);
      patchVal = !isNaN(raw) ? (raw <= 1 && raw > 0 ? Math.round(raw * 1000) / 10 : raw) : 90.2;
    } else if (!this.selectedCategories.length && !this.selectedStatuses.length) {
      patchVal = (this.data.kpis?.find((k) => k.key === 'patchCompliance')?.value as number) || 90.2;
    }
    kpis.push({
      key: 'patchCompliance',
      label: 'Patch Compliance',
      value: patchVal,
      format: 'percent',
    });

    // Major Outages
    const outageRow = filteredItKpi.find((r) => r.kpi.toLowerCase().includes('major outages'));
    let outageVal = 0;
    if (outageRow) {
      outageVal = parseFloat(outageRow.current) || 0;
    } else if (!this.selectedCategories.length && !this.selectedStatuses.length) {
      outageVal = (this.data.kpis?.find((k) => k.key === 'majorOutages')?.value as number) || 0;
    }
    kpis.push({
      key: 'majorOutages',
      label: 'Major Outages',
      value: outageVal,
      format: 'number',
    });

    this.displayedKpis = kpis;

    // 5. Update Charts dynamically
    // Chart 1: Infrastructure Health
    const infraItems = filteredItKpi.filter((r) => r.category.toLowerCase().includes('infra'));
    const infraLabels = infraItems.map((r) => r.kpi);
    const infraValues = infraItems.map((r) => {
      const num = parseFloat(r.current);
      return isNaN(num) ? 100 : num <= 1 && num > 0 ? Math.round(num * 1000) / 10 : num;
    });

    // Chart 2: Security & Backup Compliance
    const secItems = filteredItKpi.filter(
      (r) => r.category.toLowerCase().includes('sec') || r.category.toLowerCase().includes('backup')
    );
    const secNumeric = secItems.filter((r) => !isNaN(parseFloat(r.current)));
    const secLabels = secNumeric.map((r) => r.kpi);
    const secValues = secNumeric.map((r) => {
      const num = parseFloat(r.current);
      return num <= 1 && num > 0 ? Math.round(num * 1000) / 10 : num;
    });

    // Chart 3: IT Engineer Utilization
    const resLabels = filteredResources.map((r) => r.resource);
    const resValues = filteredResources.map((r) => r.utilizationPct || 0);

    // Chart 4: Active IT Projects
    const projLabels = filteredProjects.map((p) => p.project);
    const projPlanned = filteredProjects.map((p) => p.plannedCompletionPct || 0);
    const projActual = filteredProjects.map((p) => p.actualCompletionPct || 0);

    // Chart 5: Overall IT Health RAG Status
    const statusCounts: Record<string, number> = {};
    filteredItKpi.forEach((r) => {
      const s = r.status || 'Healthy';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const charts: ChartDef[] = [
      {
        id: 'infraHealth',
        title: 'Infrastructure Availability & Health %',
        type: 'bar',
        labels: infraLabels.length ? infraLabels : ['No matching items'],
        series: [{ name: 'Availability %', data: infraValues.length ? infraValues : [0] }],
      },
      {
        id: 'secCompliance',
        title: 'Security & Backup Compliance Scores %',
        type: 'bar',
        labels: secLabels.length ? secLabels : ['No matching items'],
        series: [{ name: 'Compliance %', data: secValues.length ? secValues : [0] }],
      },
      {
        id: 'resourceUtil',
        title: 'IT Engineer Utilization %',
        type: 'bar',
        labels: resLabels.length ? resLabels : ['No matching engineers'],
        series: [{ name: 'Utilization %', data: resValues.length ? resValues : [0] }],
      },
      {
        id: 'projectProgress',
        title: 'Active IT Projects Completion %',
        type: 'bar',
        labels: projLabels.length ? projLabels : ['No matching projects'],
        series: [
          { name: 'Planned %', data: projPlanned.length ? projPlanned : [0] },
          { name: 'Actual %', data: projActual.length ? projActual : [0] },
        ],
      },
      {
        id: 'overallRAG',
        title: 'Overall IT Health RAG Status',
        type: 'pie',
        labels: Object.keys(statusCounts).length ? Object.keys(statusCounts) : ['Healthy'],
        series: [{ name: 'KPIs', data: Object.values(statusCounts).length ? Object.values(statusCounts) : [0] }],
      },
    ];

    this.displayedCharts = charts;
  }

  updateFilteredSwEngineeringData(): void {
    if (!this.data || this.data.department !== 'sw-engineering') return;

    const projectsAll = this.getTableRecords('projects');
    const assignmentsAll = this.getTableRecords('assignments');
    const employeeSummaryAll = this.getTableRecords('employeeSummary');
    const defectsAll = this.getTableRecords('defects');

    // 1. Filter assignments by Project, Employee, Role
    const filteredAssignments = assignmentsAll.filter((a) => {
      const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(a.project);
      const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(a.employee);
      const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(a.role);
      return matchProj && matchEmp && matchRole;
    });

    // 2. Identify active project names and employees from assignments when cross-filtering
    const activeProjectNamesFromAssignments = new Set(filteredAssignments.map((a) => a.project));
    const activeEmployeesFromAssignments = new Set(filteredAssignments.map((a) => a.employee));

    // Filter projects by Project, Status (RAG), and if employee/role is selected, must match assignments
    const filteredProjects = projectsAll.filter((p) => {
      const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
      const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
      const matchEmpOrRole = (!this.selectedEmployees.length && !this.selectedRoles.length) || activeProjectNamesFromAssignments.has(p.project);
      return matchProj && matchStat && matchEmpOrRole;
    });

    // Filter employee summary by Employee, Role, and if project is selected, by assignments
    const filteredEmployeeSummary = employeeSummaryAll.filter((e) => {
      const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(e.employee);
      const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(e.role);
      const matchProj = !this.selectedProjects.length || activeEmployeesFromAssignments.has(e.employee);
      return matchEmp && matchRole && matchProj;
    });

    // Filter defects by Project and (if employee selected) assignedTo
    const filteredDefects = defectsAll.filter((d) => {
      const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(d.project);
      const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(d.assignedTo);
      return matchProj && matchEmp;
    });

    // Helpers
    const sum = (arr: any[], fn: (r: any) => number) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
    const avg = (arr: any[], fn: (r: any) => number) => {
      const vals = arr.map(fn).filter((v) => v !== null && v !== undefined && !isNaN(v));
      return vals.length ? sum(vals.map((v) => ({ v })), (r) => r.v) / vals.length : 0;
    };
    const distinct = (arr: any[], fn: (r: any) => any) => new Set(arr.map(fn).filter(Boolean)).size;

    const totalProjects = filteredProjects.length;
    const avgPercentComplete = Math.round(avg(filteredProjects, (p) => p.percentComplete) * 10) / 10;
    const headcount = filteredEmployeeSummary.length || distinct(filteredAssignments, (a) => a.employee);
    const avgUtilizationPct = Math.round(avg(filteredEmployeeSummary, (e) => e.utilizationPct) * 10) / 10;
    const billableHours = Math.round(sum(filteredAssignments, (a) => a.billableHours) * 10) / 10;
    const nonBillableHours = Math.round(sum(filteredAssignments, (a) => a.nonBillableHours) * 10) / 10;

    this.displayedKpis = [
      { key: 'totalProjects', label: 'Total Projects', value: totalProjects, format: 'number' },
      { key: 'avgPercentComplete', label: 'Avg % Complete', value: avgPercentComplete, format: 'percent' },
      { key: 'headcount', label: 'Team Headcount', value: headcount, format: 'number' },
      { key: 'avgUtilizationPct', label: 'Avg Utilization %', value: avgUtilizationPct, format: 'percent' },
      { key: 'billableHours', label: 'Billable Hours', value: billableHours, format: 'number' },
      { key: 'nonBillableHours', label: 'Non-Billable Hours', value: nonBillableHours, format: 'number' },
    ];

    const groupCount = (arr: any[], keyFn: (r: any) => string) => {
      const map = new Map<string, number>();
      arr.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + 1);
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const projectStatusDist = groupCount(filteredProjects, (p) => p.status);
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const openDefects = filteredDefects.filter((d) => d.status !== 'Closed');
    const defectsBySeverityData = severities.map((s) => openDefects.filter((d) => d.severity === s).length);
    const slaBreakdown = groupCount(filteredDefects, (d) => d.slaStatus);

    const hoursByEmployee = [...filteredEmployeeSummary]
      .sort((a, b) => (b.actualHours || 0) - (a.actualHours || 0))
      .slice(0, 15)
      .map((e) => [e.employee, e.actualHours || 0] as [string, number]);

    this.displayedCharts = [
      {
        id: 'projectStatus',
        title: 'Project Status Distribution',
        type: 'pie',
        labels: projectStatusDist.length ? projectStatusDist.map((x) => x[0]) : ['No Data'],
        series: [{ name: 'Projects', data: projectStatusDist.length ? projectStatusDist.map((x) => x[1]) : [0] }],
      },
      {
        id: 'defectsBySeverity',
        title: 'Open Defects by Severity',
        type: 'bar',
        labels: severities,
        series: [{ name: 'Defects', data: defectsBySeverityData }],
      },
      {
        id: 'slaBreakdown',
        title: 'SLA Status Breakdown',
        type: 'pie',
        labels: slaBreakdown.length ? slaBreakdown.map((x) => x[0]) : ['No Data'],
        series: [{ name: 'Defects', data: slaBreakdown.length ? slaBreakdown.map((x) => x[1]) : [0] }],
      },
      {
        id: 'hoursByEmployee',
        title: 'Actual Hours by Employee',
        type: 'bar',
        labels: hoursByEmployee.length ? hoursByEmployee.map((x) => x[0]) : ['No Data'],
        series: [{ name: 'Hours', data: hoursByEmployee.length ? hoursByEmployee.map((x) => x[1]) : [0] }],
      },
    ];
  }

  updateFilteredOutboundDeskData(): void {
    if (!this.data || this.data.department !== 'outbound-desk') return;

    const callsAll = this.getTableRecords('calls');

    const filteredCalls = callsAll.filter((c) => {
      const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(c.agent);
      const matchOutcome = !this.selectedOutcomes.length || this.selectedOutcomes.includes(c.outcome);
      const matchConnect = !this.selectedConnects.length || this.selectedConnects.includes(c.connect);

      let dateFormatted = c.date;
      if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
        const [y, m, d] = c.date.slice(0, 10).split('-');
        dateFormatted = `${m}/${d}/${y}`;
      }
      const matchDate = !this.selectedDates.length || this.selectedDates.includes(dateFormatted) || this.selectedDates.includes(c.date);

      return matchAgent && matchOutcome && matchConnect && matchDate;
    });

    const totalAttempts = filteredCalls.length;
    const uniqueLeads = filteredCalls.filter((c) => c.isFirstForLead).length;
    const connected = filteredCalls.filter((c) => c.connect === 'Yes').length;
    const voicemail = filteredCalls.filter((c) => c.outcome === 'Voicemail').length;
    const agentsCount = new Set(filteredCalls.map((c) => c.agent).filter(Boolean)).size;

    this.displayedKpis = [
      { key: 'attempts', label: 'Dial Attempts Logged', value: totalAttempts, format: 'number' },
      { key: 'uniqueLeads', label: 'Unique Leads Worked', value: uniqueLeads, format: 'number' },
      { key: 'connectRate', label: 'Connect Rate', value: totalAttempts ? Math.round((connected / totalAttempts) * 1000) / 10 : 0, format: 'percent' },
      { key: 'liveConversations', label: 'Live Conversations', value: connected, format: 'number' },
      { key: 'voicemailRate', label: 'Voicemail Rate', value: totalAttempts ? Math.round((voicemail / totalAttempts) * 1000) / 10 : 0, format: 'percent' },
      { key: 'agents', label: 'Active Agents', value: agentsCount, format: 'number' },
    ];

    const groupCount = (arr: any[], keyFn: (r: any) => string) => {
      const map = new Map<string, number>();
      arr.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + 1);
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const byDayRaw = groupCount(filteredCalls, (r) => r.date).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    const byDayFormatted = byDayRaw.map(([dStr, cnt]) => {
      let label = dStr;
      if (typeof dStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dStr)) {
        const [y, m, d] = dStr.slice(0, 10).split('-');
        label = `${m}/${d}/${y}`;
      }
      return [label, cnt] as [string, number];
    });

    const byAgent = groupCount(filteredCalls, (r) => r.agent);

    const outcomeGroups = groupCount(filteredCalls, (r) => r.outcome);
    const byOutcome = outcomeGroups.length > 6
      ? ([...outcomeGroups.slice(0, 5), ['Other', outcomeGroups.slice(5).reduce((a, x) => a + x[1], 0)]] as [string, number][])
      : outcomeGroups;

    this.displayedCharts = [
      {
        id: 'byDay',
        title: 'Dial Attempts by Day',
        type: 'bar',
        labels: byDayFormatted.length ? byDayFormatted.map((x) => x[0]) : ['No Calls'],
        series: [{ name: 'Attempts', data: byDayFormatted.length ? byDayFormatted.map((x) => x[1]) : [0] }],
      },
      {
        id: 'byOutcome',
        title: 'Call Outcomes (Combined)',
        type: 'pie',
        labels: byOutcome.length ? byOutcome.map((x) => x[0]) : ['No Data'],
        series: [{ name: 'Attempts', data: byOutcome.length ? byOutcome.map((x) => x[1]) : [0] }],
      },
      {
        id: 'byAgent',
        title: 'Dial Attempts by Agent',
        type: 'bar',
        labels: byAgent.length ? byAgent.map((x) => x[0]) : ['No Agents'],
        series: [{ name: 'Attempts', data: byAgent.length ? byAgent.map((x) => x[1]) : [0] }],
      },
    ];
  }

  updateFilteredCreData(): void {
    if (!this.data || this.data.department !== 'cre-utilization') {
      if (this.data) {
        this.displayedKpis = this.data.kpis || [];
        this.displayedCharts = this.data.charts || [];
      }
      return;
    }

    const deliverablesAll = this.getTableRecords('deliverables');
    const utilizationAll = this.getTableRecords('utilization');

    const filteredDeliverables = deliverablesAll.filter((d) => {
      const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(d.month);
      const matchClient = !this.selectedClients.length || this.selectedClients.includes(d.client);
      return matchMonth && matchClient;
    });

    const filteredUtilization = utilizationAll.filter((u) => {
      const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(u.month);
      const matchClient = !this.selectedClients.length || this.selectedClients.includes(u.category);
      return matchMonth && matchClient;
    });

    const clientHours = filteredUtilization.filter((u) => u.type === 'client');

    const sum = (arr: any[], fn: (r: any) => number) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
    const avg = (arr: any[], fn: (r: any) => number) => (arr.length ? sum(arr, fn) / arr.length : 0);

    const totalReceived = sum(filteredDeliverables, (r) => r.filesReceived);
    const totalDelivered = sum(filteredDeliverables, (r) => r.filesDelivered);
    const totalHours = Math.round(sum(clientHours, (u) => u.hours) * 10) / 10;

    const distinctEmps = new Set(clientHours.map((u) => u.employee).filter(Boolean)).size;
    const sumResourcesDeliv = sum(filteredDeliverables, (r) => r.resourcesAllocated);
    const resourcesAllocated = distinctEmps || sumResourcesDeliv;

    let onTimePct = 0;
    if (filteredDeliverables.length > 0) {
      const totalDeliveredBeforeDue = sum(filteredDeliverables, (r) => r.filesDeliveredBeforeDue);
      if (totalDelivered > 0 && totalDeliveredBeforeDue > 0) {
        onTimePct = Math.round((totalDeliveredBeforeDue / totalDelivered) * 1000) / 10;
      } else {
        onTimePct = Math.round(avg(filteredDeliverables, (r) => r.onTimeDeliveryPct) * 10) / 10;
      }
    }

    const qualityPct = filteredDeliverables.length
      ? Math.round(avg(filteredDeliverables, (r) => r.qualityPct) * 10) / 10
      : 0;

    const totalPending = sum(filteredDeliverables, (r) => r.pendingFiles);
    const totalOverdue = sum(filteredDeliverables, (r) => r.overdueFiles);

    const clientLabel = this.selectedClients.length > 0
      ? `TOTAL HOURS (SELECTED CLIENT)`
      : 'TOTAL HOURS (ALL CLIENTS)';

    this.displayedKpis = [
      { key: 'filesReceived', label: 'FILES RECEIVED', value: totalReceived, format: 'number' },
      { key: 'filesDelivered', label: 'FILES DELIVERED', value: totalDelivered, format: 'number' },
      { key: 'onTimePct', label: 'ON-TIME DELIVERY %', value: onTimePct, format: 'percent' },
      { key: 'qualityPct', label: 'QUALITY %', value: qualityPct, format: 'percent' },
      { key: 'pendingFiles', label: 'PENDING FILES', value: totalPending, format: 'number' },
      { key: 'overdueFiles', label: 'OVERDUE FILES', value: totalOverdue, format: 'number' },
      { key: 'totalClientHours', label: clientLabel, value: totalHours, format: 'number' },
      { key: 'resourcesAllocated', label: 'RESOURCES ALLOCATED', value: resourcesAllocated, format: 'number' },
    ];

    const groupSum = (arr: any[], keyFn: (r: any) => string, valFn: (r: any) => number) => {
      const map = new Map<string, number>();
      arr.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + (valFn(r) || 0));
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let filesChartTitle = 'Files Received vs Delivered by Month';
    let byRec: [string, number][] = [];
    let byDel: [string, number][] = [];

    if (this.selectedMonths.length === 0) {
      filesChartTitle = this.selectedClients.length > 0
        ? `Files Received vs Delivered for filtered Month`
        : 'Files Received vs Delivered by Month';
      byRec = groupSum(filteredDeliverables, (r) => r.month, (r) => r.filesReceived)
        .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]));
      byDel = groupSum(filteredDeliverables, (r) => r.month, (r) => r.filesDelivered)
        .sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]));
    } else {
      filesChartTitle = `Files Received vs Delivered for filtered Months`;
      byRec = groupSum(filteredDeliverables, (r) => r.client, (r) => r.filesReceived);
      byDel = groupSum(filteredDeliverables, (r) => r.client, (r) => r.filesDelivered);
    }

    const hoursByClientData = groupSum(clientHours, (u) => u.category, (u) => u.hours).slice(0, 12);
    const hoursByEmpData = groupSum(clientHours, (u) => u.employee, (u) => u.hours).slice(0, 15);

    this.displayedCharts = [
      {
        id: 'filesByMonth',
        title: filesChartTitle,
        type: 'bar',
        labels: byRec.map((x) => x[0]),
        series: [
          { name: 'Files Received', data: byRec.map((x) => x[1]) },
          { name: 'Files Delivered', data: byDel.map((x) => x[1]) },
        ],
      },
      {
        id: 'hoursByClient',
        title: this.selectedClients.length > 0 ? `Hours Logged for filtered Clients` : 'Hours by Client (Top 12)',
        type: 'bar',
        labels: hoursByClientData.map((x) => x[0]),
        series: [{ name: 'Hours', data: hoursByClientData.map((x) => Math.round(x[1] * 10) / 10) }],
      },
      {
        id: 'hoursByEmployee',
        title: 'Hours by Employee (Top 15)',
        type: 'bar',
        labels: hoursByEmpData.map((x) => x[0]),
        series: [{ name: 'Hours', data: hoursByEmpData.map((x) => Math.round(x[1] * 10) / 10) }],
      },
    ];
  }

  updateFilteredMarketingData(): void {
    if (!this.data || this.data.department !== 'marketing') return;

    const leadsAll = this.getTableRecords('leads');

    const filteredLeads = leadsAll.filter((l) => {
      const matchMonth = !l.month || !this.selectedMonths.length || this.selectedMonths.includes(l.month);
      const matchClient = !this.selectedClients.length || this.selectedClients.includes(l.client);
      const matchState = !this.selectedStates.length || this.selectedStates.includes(l.state);
      const matchProp = !this.selectedPropertyTypes.length || this.selectedPropertyTypes.includes(l.propertyType);
      const matchAcc = !this.selectedAccountTypes.length || this.selectedAccountTypes.includes(l.accountType);
      return matchMonth && matchClient && matchState && matchProp && matchAcc;
    });

    const sum = (arr: any[], fn: (r: any) => number) => arr.reduce((a, r) => a + (fn(r) || 0), 0);
    const distinct = (arr: any[], fn: (r: any) => string) => new Set(arr.map(fn).filter(Boolean)).size;

    const totalLeads = sum(filteredLeads, (r) => r.leadsGenerated);
    const doneLeads = sum(filteredLeads.filter((r) => r.preliminaryResearch === 'Done'), (r) => r.leadsGenerated);
    const agentCodedLeads = sum(filteredLeads.filter((r) => r.accountType === 'Agent Coded'), (r) => r.leadsGenerated);

    const researchDonePct = totalLeads ? Math.round((doneLeads / totalLeads) * 1000) / 10 : 0;
    const agentCodedPct = totalLeads ? Math.round((agentCodedLeads / totalLeads) * 1000) / 10 : 0;

    this.displayedKpis = [
      { key: 'totalLeads', label: 'Total Leads Generated', value: totalLeads, format: 'number' },
      { key: 'clients', label: 'Clients', value: distinct(filteredLeads, (r) => r.client), format: 'number' },
      { key: 'states', label: 'States Covered', value: distinct(filteredLeads, (r) => r.state), format: 'number' },
      { key: 'counties', label: 'Counties Covered', value: distinct(filteredLeads, (r) => r.county), format: 'number' },
      { key: 'researchDonePct', label: 'Preliminary Research Done', value: researchDonePct, format: 'percent' },
      { key: 'agentCodedPct', label: 'Agent Coded Share', value: agentCodedPct, format: 'percent' },
    ];

    const groupSum = (keyFn: (r: any) => string) => {
      const map = new Map<string, number>();
      filteredLeads.forEach((r) => {
        const k = keyFn(r) || 'Unspecified';
        map.set(k, (map.get(k) || 0) + (r.leadsGenerated || 0));
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };

    const byClient = groupSum((r) => r.client);
    const byState = groupSum((r) => r.state);
    const byAccountType = groupSum((r) => r.accountType);
    const byPropertyType = groupSum((r) => r.propertyType);

    this.displayedCharts = [
      { id: 'byClient', title: 'Leads by Client', type: 'bar', labels: byClient.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byClient.map((x) => x[1]) }] },
      { id: 'byState', title: 'Leads by State', type: 'bar', labels: byState.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byState.map((x) => x[1]) }] },
      { id: 'byAccountType', title: 'Leads by Account Type', type: 'pie', labels: byAccountType.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byAccountType.map((x) => x[1]) }] },
      { id: 'byPropertyType', title: 'Leads by Property Type', type: 'pie', labels: byPropertyType.map((x) => x[0]), series: [{ name: 'Leads Generated', data: byPropertyType.map((x) => x[1]) }] },
    ];
  }

  refresh(): void {
    const id = this.route.snapshot.paramMap.get('departmentId');
    if (!id) return;
    this.refreshing = true;
    this.api.getDashboard(id, true).subscribe({
      next: (data) => {
        const currentActiveId = this.route.snapshot.paramMap.get('departmentId');
        if (data && data.department === currentActiveId) {
          this.normalizeDepartmentData(data);
          this.data = data;
          this.initFilterOptionsAndData();
          this.refreshing = false;
          this.loading = false;
        }
      },
      error: (err) => {
        const currentActiveId = this.route.snapshot.paramMap.get('departmentId');
        if (id === currentActiveId) {
          this.error = err?.error?.error || 'Could not refresh this dashboard.';
          this.refreshing = false;
          this.loading = false;
        }
      },
    });
  }

  formattedGeneratedAt(iso: string): string {
    try {
      return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  // --- Modal Management ---------------------------------------------------

  showDataModal(title: string, records: any[], subtitle?: string): void {
    this.modalTitle = title;
    this.modalSubtitle = subtitle || '';
    this.modalRecords = records || [];
    this.modalSearchTerm = '';
    this.modalSortKey = null;
    this.modalSortDir = 'asc';

    // Extract all columns across records so no fields are missing
    if (records && records.length > 0) {
      const colSet = new Set<string>();
      records.forEach((r) => {
        if (r && typeof r === 'object') {
          Object.keys(r).forEach((k) => {
            if (!k.startsWith('__')) colSet.add(k);
          });
        }
      });
      this.modalColumns = Array.from(colSet);
    } else {
      this.modalColumns = [];
    }

    this.modalOpen = true;
    try {
      document.body.style.overflow = 'hidden';
    } catch { }
  }

  closeModal(event?: Event): void {
    if (event) event.stopPropagation();
    this.modalOpen = false;
    try {
      document.body.style.overflow = '';
    } catch { }
  }

  get displayedModalRecords(): any[] {
    let list = this.modalRecords;
    if (this.modalSearchTerm.trim()) {
      const term = this.modalSearchTerm.trim().toLowerCase();
      list = list.filter((r) =>
        Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(term))
      );
    }
    if (this.modalSortKey) {
      const key = this.modalSortKey;
      list = [...list].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return this.modalSortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }

  sortModalBy(col: string): void {
    if (this.modalSortKey === col) {
      this.modalSortDir = this.modalSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.modalSortKey = col;
      this.modalSortDir = 'asc';
    }
  }

  columnTitle(col: string): string {
    return COLUMN_TITLES[col] || col.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }

  isStatusCol(col: string): boolean {
    return STATUS_KEYS.has(col) || col.toLowerCase().includes('status');
  }

  isWrapCol(col: string): boolean {
    const l = col.toLowerCase();
    return (
      l.includes('activit') ||
      l.includes('milestone') ||
      l.includes('remark') ||
      l.includes('desc') ||
      l.includes('note') ||
      l.includes('summary') ||
      l.includes('comment') ||
      l.includes('scope') ||
      l.includes('action') ||
      l.includes('feedback') ||
      l.includes('reason') ||
      l.includes('project') ||
      l.includes('subject') ||
      l.includes('person') ||
      l.includes('handler') ||
      l.includes('employee') ||
      l.includes('detail')
    );
  }

  formatCell(val: any, col: string): string {
    if (val === null || val === undefined || val === '') return '–';
    if (PERCENT_KEYS.has(col) && typeof val === 'number') return `${val}%`;
    if (typeof val === 'number') return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [y, m, d] = val.slice(0, 10).split('-');
      return `${m}/${d}/${y}`;
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      const y = val.getFullYear();
      return `${m}/${d}/${y}`;
    }
    return String(val);
  }

  exportModalCsv(): void {
    const cols = this.modalColumns;
    if (!cols.length || !this.displayedModalRecords.length) return;
    const header = cols.map((c) => this.columnTitle(c));
    const lines = this.displayedModalRecords.map((r) => cols.map((c) => r[c]));
    const esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...lines].map((row) => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.modalTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Helper to get table records by key ---------------------------------

  private getTableRecords(tableKey: string): any[] {
    return this.data?.tables.find((t) => t.key === tableKey)?.records || [];
  }

  // --- KPI Card Click Handler (Displays only that particular data) --------

  onKpiClick(kpi: Kpi): void {
    if (!this.data) return;
    const dep = this.data.department;

    if (dep === 'sw-engineering') {
      const projectsAll = this.getTableRecords('projects');
      const assignmentsAll = this.getTableRecords('assignments');
      const employeeSummaryAll = this.getTableRecords('employeeSummary');
      const defectsAll = this.getTableRecords('defects');

      const filteredAssignments = assignmentsAll.filter((a) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(a.project);
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(a.employee);
        const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(a.role);
        return matchProj && matchEmp && matchRole;
      });

      const activeProjectNamesFromAssignments = new Set(filteredAssignments.map((a) => a.project));
      const activeEmployeesFromAssignments = new Set(filteredAssignments.map((a) => a.employee));

      const filteredProjects = projectsAll.filter((p) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
        const matchEmpOrRole = (!this.selectedEmployees.length && !this.selectedRoles.length) || activeProjectNamesFromAssignments.has(p.project);
        return matchProj && matchStat && matchEmpOrRole;
      });

      const filteredEmployeeSummary = employeeSummaryAll.filter((e) => {
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(e.employee);
        const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(e.role);
        const matchProj = !this.selectedProjects.length || activeEmployeesFromAssignments.has(e.employee);
        return matchEmp && matchRole && matchProj;
      });

      const filteredDefects = defectsAll.filter((d) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(d.project);
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(d.assignedTo);
        return matchProj && matchEmp;
      });

      const filterSubtitle = `Filters Applied — Project: ${this.selectedProjects.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}, Resource: ${this.selectedEmployees.join(', ') || 'All'}, Role: ${this.selectedRoles.join(', ') || 'All'}`;

      switch (kpi.key) {
        case 'totalProjects':
        case 'avgPercentComplete':
        case 'projectHoursVariancePct':
          this.showDataModal(`Projects (${filteredProjects.length})`, filteredProjects, filterSubtitle);
          break;
        case 'onTrack':
          this.showDataModal(`On Track Projects (${kpi.value})`, filteredProjects.filter((p) => p.status === 'On Track'), filterSubtitle);
          break;
        case 'atRisk':
          this.showDataModal(`At Risk Projects (${kpi.value})`, filteredProjects.filter((p) => p.status === 'At Risk'), filterSubtitle);
          break;
        case 'delayed':
          this.showDataModal(`Delayed Projects (${kpi.value})`, filteredProjects.filter((p) => p.status === 'Delayed'), filterSubtitle);
          break;
        case 'headcount':
        case 'avgAllocationPct':
          this.showDataModal(`Team Members (${filteredEmployeeSummary.length})`, filteredEmployeeSummary, filterSubtitle);
          break;
        case 'avgUtilizationPct':
          this.showDataModal(
            `Resource Utilization (${filteredEmployeeSummary.length})`,
            filteredEmployeeSummary.map((e) => ({
              employee: e.employee,
              role: e.role,
              plannedHours: e.plannedHours,
              actualHours: e.actualHours,
              utilizationPct: e.utilizationPct,
              allocationStatus: e.allocationStatus,
            })),
            filterSubtitle
          );
          break;
        case 'billableHours':
          this.showDataModal(`Billable Resource Assignments`, filteredAssignments.filter((a) => (a.billableHours || 0) > 0), filterSubtitle);
          break;
        case 'nonBillableHours':
          this.showDataModal(`Non-Billable Resource Assignments`, filteredAssignments.filter((a) => (a.nonBillableHours || 0) > 0), filterSubtitle);
          break;
        case 'totalDefects':
        case 'slaCompliancePct':
          this.showDataModal(`Defects Logged (${filteredDefects.length})`, filteredDefects, filterSubtitle);
          break;
        case 'openDefects':
          this.showDataModal(`Open Defects (${kpi.value})`, filteredDefects.filter((d) => d.status !== 'Closed'), filterSubtitle);
          break;
        case 'criticalOpen':
          this.showDataModal(`Critical & Open Defects (${kpi.value})`, filteredDefects.filter((d) => d.severity === 'Critical' && d.status !== 'Closed'), filterSubtitle);
          break;
        default:
          this.showDataModal(kpi.label, filteredProjects, filterSubtitle);
          break;
      }
    } else if (dep === 'marketing') {
      const leadsAll = this.getTableRecords('leads');
      const leads = leadsAll.filter((l) => {
        const matchMonth = !l.month || !this.selectedMonths.length || this.selectedMonths.includes(l.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(l.client);
        const matchState = !this.selectedStates.length || this.selectedStates.includes(l.state);
        const matchProp = !this.selectedPropertyTypes.length || this.selectedPropertyTypes.includes(l.propertyType);
        const matchAcc = !this.selectedAccountTypes.length || this.selectedAccountTypes.includes(l.accountType);
        return matchMonth && matchClient && matchState && matchProp && matchAcc;
      });

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}, State: ${this.selectedStates.join(', ') || 'All'}, Property Type: ${this.selectedPropertyTypes.join(', ') || 'All'}`;

      switch (kpi.key) {
        case 'clients':
          this.showDataModal(`Clients (${kpi.value})`, this.getClientsSummary(leads), filterSubtitle);
          break;
        case 'states':
          this.showDataModal(`States Covered (${kpi.value})`, this.getStatesSummary(leads), filterSubtitle);
          break;
        case 'counties':
          this.showDataModal(`Counties Covered (${kpi.value})`, this.getCountiesSummary(leads), filterSubtitle);
          break;
        case 'researchDonePct':
          this.showDataModal(`Preliminary Research Done (${kpi.value}%)`, leads.filter((l) => l.preliminaryResearch === 'Done'), filterSubtitle);
          break;
        case 'agentCodedPct':
          this.showDataModal(`Agent Coded Leads`, leads.filter((l) => l.accountType === 'Agent Coded'), filterSubtitle);
          break;
        default:
          this.showDataModal(`Total Leads Generated (${kpi.value.toLocaleString()})`, leads, filterSubtitle);
          break;
      }
    } else if (dep === 'cre-utilization') {
      const deliverablesAll = this.getTableRecords('deliverables');
      const utilizationAll = this.getTableRecords('utilization');

      const deliverables = deliverablesAll.filter((d) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(d.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(d.client);
        return matchMonth && matchClient;
      });

      const utilization = utilizationAll.filter((u) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(u.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(u.category);
        return matchMonth && matchClient;
      });

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}`;

      switch (kpi.key) {
        case 'clientsServed':
          this.showDataModal(`Clients Served (${kpi.value})`, this.getClientsUtilizationSummary(utilization), filterSubtitle);
          break;
        case 'employees':
        case 'resourcesAllocated':
          this.showDataModal(`Resources Allocated (${kpi.value})`, this.getEmployeesUtilizationSummary(utilization), filterSubtitle);
          break;
        case 'totalClientHours':
          this.showDataModal(`Resource Utilization Hours (${kpi.value})`, utilization.filter((u) => u.type === 'client'), filterSubtitle);
          break;
        case 'filesDelivered':
          this.showDataModal(
            `Files Delivered (${kpi.value})`,
            deliverables
              .filter((d) => (d.filesDelivered || 0) > 0)
              .map((d) => ({
                month: d.month,
                client: d.client,
                filesDelivered: d.filesDelivered,
              })),
            filterSubtitle
          );
          break;
        case 'filesReceived':
          this.showDataModal(
            `Files Received (${kpi.value})`,
            deliverables
              .filter((d) => (d.filesReceived || 0) > 0)
              .map((d) => ({
                month: d.month,
                client: d.client,
                filesReceived: d.filesReceived,
              })),
            filterSubtitle
          );
          break;
        case 'onTimePct':
          this.showDataModal(
            `On-Time Delivery (${kpi.value}%)`,
            deliverables.map((d) => ({
              month: d.month,
              client: d.client,
              onTimeDeliveryPct: d.onTimeDeliveryPct,
            })),
            filterSubtitle
          );
          break;
        case 'qualityPct':
          this.showDataModal(
            `Quality Performance (${kpi.value}%)`,
            deliverables.map((d) => ({
              month: d.month,
              client: d.client,
              qualityPct: d.qualityPct,
            })),
            filterSubtitle
          );
          break;
        case 'pendingFiles':
          this.showDataModal(
            `Pending Files (${kpi.value})`,
            deliverables
              .filter((d) => (d.pendingFiles || 0) > 0)
              .map((d) => ({
                month: d.month,
                client: d.client,
                pendingFiles: d.pendingFiles,
              })),
            filterSubtitle
          );
          break;
        case 'overdueFiles':
          this.showDataModal(
            `Overdue Files (${kpi.value})`,
            deliverables
              .filter((d) => (d.overdueFiles || 0) > 0)
              .map((d) => ({
                month: d.month,
                client: d.client,
                overdueFiles: d.overdueFiles,
              })),
            filterSubtitle
          );
          break;
        default:
          this.showDataModal(`Client Deliverables`, deliverables, filterSubtitle);
          break;
      }
    } else if (dep === 'outbound-desk') {
      const callsAll = this.getTableRecords('calls');
      const filteredCalls = callsAll.filter((c) => {
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(c.agent);
        const matchOutcome = !this.selectedOutcomes.length || this.selectedOutcomes.includes(c.outcome);
        const matchConnect = !this.selectedConnects.length || this.selectedConnects.includes(c.connect);
        let dateFormatted = c.date;
        if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
          const [y, m, d] = c.date.slice(0, 10).split('-');
          dateFormatted = `${m}/${d}/${y}`;
        }
        const matchDate = !this.selectedDates.length || this.selectedDates.includes(dateFormatted) || this.selectedDates.includes(c.date);
        return matchAgent && matchOutcome && matchConnect && matchDate;
      });

      const filterSubtitle = `Filters Applied — Agent: ${this.selectedAgents.join(', ') || 'All'}, Outcome: ${this.selectedOutcomes.join(', ') || 'All'}, Connected: ${this.selectedConnects.join(', ') || 'All'}, Date: ${this.selectedDates.join(', ') || 'All'}`;

      switch (kpi.key) {
        case 'agents':
          this.showDataModal(`Active Agents (${kpi.value})`, this.getAgentsSummary(filteredCalls), filterSubtitle);
          break;
        case 'uniqueLeads':
          this.showDataModal(`Unique Leads Worked (${kpi.value})`, filteredCalls.filter((c) => c.isFirstForLead), filterSubtitle);
          break;
        case 'connectRate':
        case 'liveConversations':
          this.showDataModal(`Connected Calls (${kpi.value})`, filteredCalls.filter((c) => c.connect === 'Yes'), filterSubtitle);
          break;
        case 'voicemailRate':
          this.showDataModal(`Voicemail Attempts`, filteredCalls.filter((c) => c.outcome === 'Voicemail'), filterSubtitle);
          break;
        default:
          this.showDataModal(`Call Attempts (${filteredCalls.length})`, filteredCalls, filterSubtitle);
          break;
      }
    } else if (dep === 'it-operations') {
      const itKpiAll = this.getTableRecords('itKpi');
      const resourcesAll = this.getTableRecords('resources');
      const projectsAll = this.getTableRecords('projects');

      const filteredItKpi = itKpiAll.filter((r) => {
        const matchCat = !this.selectedCategories.length || this.selectedCategories.includes(r.category);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
        return matchCat && matchStat;
      });

      const filteredResources = resourcesAll.filter((r) => {
        const matchRes = !this.selectedResources.length || this.selectedResources.includes(r.resource);
        const matchAlloc = !this.selectedAllocations.length || this.selectedAllocations.includes(r.allocation);
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(r.projectName);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
        return matchRes && matchAlloc && matchProj && matchStat;
      });

      const filterSubtitle = `Filters Applied — Category: ${this.selectedCategories.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}, Engineer: ${this.selectedResources.join(', ') || 'All'}, Allocation: ${this.selectedAllocations.join(', ') || 'All'}${this.selectedProjects.length ? ', Project: ' + this.selectedProjects.join(', ') : ''}`;

      switch (kpi.key) {
        case 'criticalAvailability':
          this.showDataModal(
            `Critical Resource Availability`,
            filteredItKpi.filter(r => r.category.toLowerCase().includes('infra')).map(r => ({
              kpi: r.kpi,
              category: r.category,
              target: r.target,
              current: r.current,
              status: r.status,
            })),
            filterSubtitle
          );
          break;
        case 'slaCompliance':
          this.showDataModal(
            `SLA Compliance`,
            filteredItKpi.filter(r => r.kpi.toLowerCase().includes('sla') || r.category.toLowerCase().includes('oper')).map(r => ({
              kpi: r.kpi,
              category: r.category,
              target: r.target,
              current: r.current,
              status: r.status,
            })),
            filterSubtitle
          );
          break;
        case 'openTickets':
          this.showDataModal(
            `Support Tickets & Operations`,
            filteredItKpi.filter(r => r.category.toLowerCase().includes('oper') || r.kpi.toLowerCase().includes('ticket')).map(r => ({
              kpi: r.kpi,
              category: r.category,
              target: r.target,
              current: r.current,
              status: r.status,
            })),
            filterSubtitle
          );
          break;
        case 'backupSuccess':
          this.showDataModal(
            `Backup Success Rate`,
            filteredItKpi.filter(r => r.category.toLowerCase().includes('backup')).map(r => ({
              kpi: r.kpi,
              category: r.category,
              target: r.target,
              current: r.current,
              status: r.status,
            })),
            filterSubtitle
          );
          break;
        case 'patchCompliance':
          this.showDataModal(
            `Patch Compliance & Security`,
            filteredItKpi.filter(r => r.category.toLowerCase().includes('sec')).map(r => ({
              kpi: r.kpi,
              category: r.category,
              target: r.target,
              current: r.current,
              status: r.status,
            })),
            filterSubtitle
          );
          break;
        case 'majorOutages':
          this.showDataModal(
            `Major Outages & Critical Issues`,
            filteredItKpi.filter(r => r.category.toLowerCase().includes('critical') || r.kpi.toLowerCase().includes('outage')).map(r => ({
              kpi: r.kpi,
              category: r.category,
              target: r.target,
              current: r.current,
              status: r.status,
            })),
            filterSubtitle
          );
          break;
        default:
          this.showDataModal(`IT Infrastructure & Security Matrix`, filteredItKpi.map(r => ({
            kpi: r.kpi,
            category: r.category,
            target: r.target,
            current: r.current,
            status: r.status,
          })), filterSubtitle);
          break;
      }
    } else if (dep === 'hr-query') {
      const queriesAll = this.getTableRecords('queries');
      const queries = queriesAll.filter((q) => {
        const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
        const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
        const matchCat = !q.category || !this.selectedCategories.length || this.selectedCategories.includes(q.category);
        const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
        const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
        const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
        const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
        return matchYear && matchMonth && matchCat && matchSubCat && matchPrio && matchHand && matchStat;
      });

      const filterSubtitle = `Filters Applied — Year: ${this.selectedYears.join(', ') || 'All'}, Month: ${this.selectedMonths.join(', ') || 'All'}, Category: ${this.selectedCategories.join(', ') || 'All'}, Sub-Category: ${this.selectedSubCategories.join(', ') || 'All'}, Priority: ${this.selectedPriorities.join(', ') || 'All'}, Handler: ${this.selectedAssistancePersons.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}`;

      switch (kpi.key) {
        case 'completed':
          this.showDataModal(`Completed HR Queries (${kpi.value})`, queries.filter((q) => q.status === 'Completed'), filterSubtitle);
          break;
        case 'inProcess':
          this.showDataModal(`In-Process HR Queries (${kpi.value})`, queries.filter((q) => q.status === 'In-Process'), filterSubtitle);
          break;
        case 'highPriorityShare':
          this.showDataModal(`High Priority HR Queries`, queries.filter((q) => q.priority === 'High'), filterSubtitle);
          break;
        case 'hrTeamHandlers':
          this.showDataModal(`HR Team Handlers (${kpi.value})`, this.getHrHandlersSummary(queries), filterSubtitle);
          break;
        default:
          this.showDataModal(`HR Queries (${queries.length})`, queries, filterSubtitle);
          break;
      }
    } else if (dep === 'residential-appraisal') {
      const ordersAll = this.getTableRecords('orders');
      const perfAll = this.getTableRecords('performance');

      const filteredOrders = ordersAll.filter((o) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(o.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(o.orderedByName);
        const matchState = !this.selectedStates.length || this.selectedStates.includes(o.state);
        const matchReport = !this.selectedReportTypes.length || this.selectedReportTypes.includes(o.reportType);
        const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(o.teamLead);
        const matchLevel = !this.selectedLevels.length || this.selectedLevels.includes(o.level);
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(o.agent);
        return matchMonth && matchClient && matchState && matchReport && matchLead && matchLevel && matchAgent;
      });

      const filteredPerf = perfAll.filter((p) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(p.month);
        const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(p.teamLead);
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(p.name);
        return matchMonth && matchLead && matchAgent;
      });

      const empMap = new Map<string, any>();
      filteredPerf.forEach((p) => {
        if (!p.name) return;
        const key = p.name.toLowerCase();
        if (!empMap.has(key)) {
          empMap.set(key, {
            name: p.name,
            teamLead: p.teamLead,
            prodMins: 0,
            nonProdMins: 0,
            overallMins: 0,
            prodPcts: [] as number[],
            utilPcts: [] as number[],
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
        item.prodMins += Number(p.prodMins) || 0;
        item.nonProdMins += Number(p.nonProdMins) || 0;
        item.overallMins += Number(p.overallMins) || 0;
        if (p.overallProdPct !== null && p.overallProdPct > 0) item.prodPcts.push(Number(p.overallProdPct));
        if (p.overallUtilPct !== null && p.overallUtilPct > 0) item.utilPcts.push(Number(p.overallUtilPct));
        item.l1Count += Number(p.l1Count) || 0;
        item.l2Count += Number(p.l2Count) || 0;
        item.l3Count += Number(p.l3Count) || 0;
        item.l4Count += Number(p.l4Count) || 0;
        item.l5Count += Number(p.l5Count) || 0;
        item.rentalCount += Number(p.rentalCount) || 0;
        item.daysActive++;
      });

      const filteredEmp = [...empMap.values()]
        .map((e) => {
          const avgProdPct = e.prodPcts.length
            ? Math.round((e.prodPcts.reduce((a: number, b: number) => a + b, 0) / e.prodPcts.length) * 10) / 10
            : 0;
          const avgUtilPct = e.utilPcts.length
            ? Math.round((e.utilPcts.reduce((a: number, b: number) => a + b, 0) / e.utilPcts.length) * 10) / 10
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

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}, State: ${this.selectedStates.join(', ') || 'All'}, Report: ${this.selectedReportTypes.join(', ') || 'All'}, Level: ${this.selectedLevels.join(', ') || 'All'}, Team Lead: ${this.selectedTeamLeads.join(', ') || 'All'}, Agent: ${this.selectedAgents.join(', ') || 'All'}`;

      switch (kpi.key) {
        case 'totalOrders':
          this.showDataModal(`Appraisal Orders (${filteredOrders.length})`, filteredOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
          break;
        case 'overallProductivity':
        case 'overallUtilization':
        case 'totalProdHours':
          this.showDataModal(`Production Logs (${filteredPerf.length})`, filteredPerf.map((p) => this.toCleanPerformanceRecord(p)), filterSubtitle);
          break;
        case 'activeStaff':
          this.showDataModal(`Active Staff Performance (${filteredEmp.length})`, filteredEmp.map((e) => this.toCleanEmployeeRecord(e)), filterSubtitle);
          break;
        case 'totalClients':
          this.showDataModal(`Clients & AMCs Served`, this.getResidentialClientsSummary(filteredOrders), filterSubtitle);
          break;
        default:
          this.showDataModal(kpi.label, filteredOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
          break;
      }
    }
  }

  private toCleanOrderRecord(o: any) {
    return {
      fileNumber: o.fileNumber,
      orderedByName: o.orderedByName,
      reportType: o.reportType,
      level: o.level,
      agent: o.agent,
      teamLead: o.teamLead,
      status: o.status,
      dueDate: o.dueDate,
      productionDate: o.productionDate,
      address: o.address,
      state: o.state,
    };
  }

  private toCleanPerformanceRecord(p: any) {
    return {
      date: p.date,
      name: p.name,
      teamLead: p.teamLead,
      empId: p.empId,
      prodHours: Math.round(((p.prodMins || 0) / 60) * 10) / 10,
      nonProdHours: Math.round(((p.nonProdMins || 0) / 60) * 10) / 10,
      actualProdPct: p.actualProdPct,
      overallProdPct: p.overallProdPct,
      overallUtilPct: p.overallUtilPct,
    };
  }

  private toCleanEmployeeRecord(e: any) {
    return {
      name: e.name,
      teamLead: e.teamLead,
      totalFilesCompleted: e.totalFilesCompleted,
      prodHours: e.prodHours,
      nonProdHours: e.nonProdHours,
      avgProdPct: e.avgProdPct,
      avgUtilPct: e.avgUtilPct,
      daysActive: e.daysActive,
    };
  }

  // --- Aggregation Summaries for Particular Data Views --------------------

  private getResidentialClientsSummary(orders: any[]): any[] {
    const map = new Map<string, { client: string; totalOrders: number; states: Set<string>; reportTypes: Set<string> }>();
    orders.forEach((o) => {
      const c = o.orderedByName || 'Unknown';
      const entry = map.get(c) || { client: c, totalOrders: 0, states: new Set(), reportTypes: new Set() };
      entry.totalOrders += 1;
      if (o.state) entry.states.add(o.state);
      if (o.reportType) entry.reportTypes.add(o.reportType);
      map.set(c, entry);
    });
    return [...map.values()]
      .map((e) => ({
        orderedByName: e.client,
        totalOrders: e.totalOrders,
        statesCovered: e.states.size,
        reportTypesCount: e.reportTypes.size,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }

  private getClientsSummary(leads: any[]): any[] {
    const map = new Map<string, { client: string; leadsGenerated: number; states: Set<string>; counties: Set<string>; doneResearch: number }>();
    leads.forEach((l) => {
      const c = l.client || 'Unknown';
      const entry = map.get(c) || { client: c, leadsGenerated: 0, states: new Set(), counties: new Set(), doneResearch: 0 };
      entry.leadsGenerated += Number(l.leadsGenerated) || 0;
      if (l.state) entry.states.add(l.state);
      if (l.county) entry.counties.add(l.county);
      if (l.preliminaryResearch === 'Done') entry.doneResearch += Number(l.leadsGenerated) || 0;
      map.set(c, entry);
    });
    return [...map.values()]
      .map((e) => ({
        client: e.client,
        leadsGenerated: e.leadsGenerated,
        statesCovered: e.states.size,
        countiesCovered: e.counties.size,
        preliminaryResearchDone: e.doneResearch,
      }))
      .sort((a, b) => b.leadsGenerated - a.leadsGenerated);
  }

  private getStatesSummary(leads: any[]): any[] {
    const map = new Map<string, { state: string; leadsGenerated: number; counties: Set<string>; clients: Set<string> }>();
    leads.forEach((l) => {
      const s = l.state || 'Unknown';
      const entry = map.get(s) || { state: s, leadsGenerated: 0, counties: new Set(), clients: new Set() };
      entry.leadsGenerated += Number(l.leadsGenerated) || 0;
      if (l.county) entry.counties.add(l.county);
      if (l.client) entry.clients.add(l.client);
      map.set(s, entry);
    });
    return [...map.values()]
      .map((e) => ({
        state: e.state,
        leadsGenerated: e.leadsGenerated,
        countiesCovered: e.counties.size,
        clientsCovered: e.clients.size,
      }))
      .sort((a, b) => b.leadsGenerated - a.leadsGenerated);
  }

  private getCountiesSummary(leads: any[]): any[] {
    const map = new Map<string, { county: string; state: string; leadsGenerated: number; clients: Set<string> }>();
    leads.forEach((l) => {
      const key = `${l.county || 'Unknown'} - ${l.state || ''}`;
      const entry = map.get(key) || { county: l.county || 'Unknown', state: l.state || '–', leadsGenerated: 0, clients: new Set() };
      entry.leadsGenerated += Number(l.leadsGenerated) || 0;
      if (l.client) entry.clients.add(l.client);
      map.set(key, entry);
    });
    return [...map.values()]
      .map((e) => ({
        county: e.county,
        state: e.state,
        leadsGenerated: e.leadsGenerated,
        clientsCovered: e.clients.size,
      }))
      .sort((a, b) => b.leadsGenerated - a.leadsGenerated);
  }

  private getClientsUtilizationSummary(utilization: any[]): any[] {
    const map = new Map<string, { client: string; hours: number; employees: Set<string>; months: Set<string> }>();
    utilization.filter((u) => u.type === 'client').forEach((u) => {
      const c = u.category || 'Unknown';
      const entry = map.get(c) || { client: c, hours: 0, employees: new Set(), months: new Set() };
      entry.hours += Number(u.hours) || 0;
      if (u.employee) entry.employees.add(u.employee);
      if (u.month) entry.months.add(u.month);
      map.set(c, entry);
    });
    return [...map.values()]
      .map((e) => ({
        category: e.client,
        hours: Math.round(e.hours * 10) / 10,
        employeesAssigned: e.employees.size,
        monthsActive: e.months.size,
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  private getEmployeesUtilizationSummary(utilization: any[]): any[] {
    const map = new Map<string, { employee: string; hours: number; clients: Set<string>; months: Set<string> }>();
    utilization.filter((u) => u.type === 'client').forEach((u) => {
      const emp = u.employee || 'Unknown';
      const entry = map.get(emp) || { employee: emp, hours: 0, clients: new Set(), months: new Set() };
      entry.hours += Number(u.hours) || 0;
      if (u.category) entry.clients.add(u.category);
      if (u.month) entry.months.add(u.month);
      map.set(emp, entry);
    });
    return [...map.values()]
      .map((e) => ({
        employee: e.employee,
        hours: Math.round(e.hours * 10) / 10,
        clientsServed: e.clients.size,
        monthsActive: e.months.size,
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  private getAgentsSummary(calls: any[]): any[] {
    const map = new Map<string, { agent: string; attempts: number; uniqueLeads: number; connected: number }>();
    calls.forEach((c) => {
      const a = c.agent || 'Unknown';
      const entry = map.get(a) || { agent: a, attempts: 0, uniqueLeads: 0, connected: 0 };
      entry.attempts += 1;
      if (c.isFirstForLead) entry.uniqueLeads += 1;
      if (c.connect === 'Yes') entry.connected += 1;
      map.set(a, entry);
    });
    return [...map.values()]
      .map((e) => ({
        agent: e.agent,
        attempts: e.attempts,
        uniqueLeads: e.uniqueLeads,
        connected: e.connected,
        connectRate: e.attempts ? Math.round((e.connected / e.attempts) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }

  private getHrHandlersSummary(queries: any[]): any[] {
    const map = new Map<string, { assistancePerson: string; totalQueries: number; completed: number; inProcess: number }>();
    queries.forEach((q) => {
      const hand = q.assistancePerson || 'Unassigned';
      const entry = map.get(hand) || { assistancePerson: hand, totalQueries: 0, completed: 0, inProcess: 0 };
      entry.totalQueries += 1;
      if (q.status === 'Completed') entry.completed += 1;
      if (q.status === 'In-Process') entry.inProcess += 1;
      map.set(hand, entry);
    });
    return [...map.values()].sort((a, b) => b.totalQueries - a.totalQueries);
  }


  // --- Chart Slice & Panel Click Handler (Displays only that particular data)

  onChartSliceClick(event: ChartSliceClickEvent): void {
    if (!this.data) return;
    const dep = this.data.department;

    if (dep === 'sw-engineering') {
      const projectsAll = this.getTableRecords('projects');
      const assignmentsAll = this.getTableRecords('assignments');
      const employeeSummaryAll = this.getTableRecords('employeeSummary');
      const defectsAll = this.getTableRecords('defects');

      const filteredAssignments = assignmentsAll.filter((a) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(a.project);
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(a.employee);
        const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(a.role);
        return matchProj && matchEmp && matchRole;
      });

      const activeProjectNamesFromAssignments = new Set(filteredAssignments.map((a) => a.project));

      const filteredProjects = projectsAll.filter((p) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
        const matchEmpOrRole = (!this.selectedEmployees.length && !this.selectedRoles.length) || activeProjectNamesFromAssignments.has(p.project);
        return matchProj && matchStat && matchEmpOrRole;
      });

      const filteredDefects = defectsAll.filter((d) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(d.project);
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(d.assignedTo);
        return matchProj && matchEmp;
      });

      const filterSubtitle = `Filters Applied — Project: ${this.selectedProjects.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}, Resource: ${this.selectedEmployees.join(', ') || 'All'}, Role: ${this.selectedRoles.join(', ') || 'All'}`;

      if (event.chartId === 'projectStatus') {
        const filtered = filteredProjects.filter((p) => p.status === event.label);
        this.showDataModal(`Projects: ${event.label} (${filtered.length})`, filtered, filterSubtitle);
      } else if (event.chartId === 'defectsBySeverity') {
        const filtered = filteredDefects.filter((d) => d.severity === event.label && d.status !== 'Closed');
        this.showDataModal(`Open Defects: ${event.label} Severity (${filtered.length})`, filtered, filterSubtitle);
      } else if (event.chartId === 'slaBreakdown') {
        const filtered = filteredDefects.filter((d) => d.slaStatus === event.label);
        this.showDataModal(`Defects: SLA ${event.label} (${filtered.length})`, filtered, filterSubtitle);
      } else if (event.chartId === 'hoursByEmployee') {
        const filtered = filteredAssignments.filter((a) => a.employee === event.label);
        this.showDataModal(`Resource Assignments: ${event.label} (${filtered.length})`, filtered, filterSubtitle);
      }
    } else if (dep === 'marketing') {
      const leadsAll = this.getTableRecords('leads');
      const leads = leadsAll.filter((l) => {
        const matchMonth = !l.month || !this.selectedMonths.length || this.selectedMonths.includes(l.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(l.client);
        const matchState = !this.selectedStates.length || this.selectedStates.includes(l.state);
        const matchProp = !this.selectedPropertyTypes.length || this.selectedPropertyTypes.includes(l.propertyType);
        const matchAcc = !this.selectedAccountTypes.length || this.selectedAccountTypes.includes(l.accountType);
        return matchMonth && matchClient && matchState && matchProp && matchAcc;
      });

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}, State: ${this.selectedStates.join(', ') || 'All'}, Property Type: ${this.selectedPropertyTypes.join(', ') || 'All'}`;

      if (event.chartId === 'byClient') {
        this.showDataModal(`Leads for Client: ${event.label}`, leads.filter((l) => l.client === event.label), filterSubtitle);
      } else if (event.chartId === 'byState') {
        this.showDataModal(`Leads in State: ${event.label}`, leads.filter((l) => l.state === event.label), filterSubtitle);
      } else if (event.chartId === 'byAccountType') {
        this.showDataModal(`Leads with Account Type: ${event.label}`, leads.filter((l) => l.accountType === event.label), filterSubtitle);
      } else if (event.chartId === 'byPropertyType') {
        this.showDataModal(`Leads with Property Type: ${event.label}`, leads.filter((l) => l.propertyType === event.label), filterSubtitle);
      }
    } else if (dep === 'cre-utilization') {
      const deliverablesAll = this.getTableRecords('deliverables');
      const utilizationAll = this.getTableRecords('utilization');

      const deliverables = deliverablesAll.filter((d) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(d.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(d.client);
        return matchMonth && matchClient;
      });

      const utilization = utilizationAll.filter((u) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(u.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(u.category);
        return matchMonth && matchClient;
      });

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}`;

      if (event.chartId === 'filesByMonth') {
        if (this.selectedMonths.length === 0) {
          this.showDataModal(`Deliverables for Month: ${event.label}`, deliverables.filter((d) => d.month === event.label), filterSubtitle);
        } else {
          this.showDataModal(`Deliverables for Client: ${event.label}`, deliverables.filter((d) => d.client === event.label), filterSubtitle);
        }
      } else if (event.chartId === 'hoursByClient') {
        this.showDataModal(`Hours for Client: ${event.label}`, utilization.filter((u) => u.category === event.label), filterSubtitle);
      } else if (event.chartId === 'hoursByEmployee') {
        this.showDataModal(`Hours for Employee: ${event.label}`, utilization.filter((u) => u.employee === event.label), filterSubtitle);
      }
    } else if (dep === 'outbound-desk') {
      const callsAll = this.getTableRecords('calls');
      const filteredCalls = callsAll.filter((c) => {
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(c.agent);
        const matchOutcome = !this.selectedOutcomes.length || this.selectedOutcomes.includes(c.outcome);
        const matchConnect = !this.selectedConnects.length || this.selectedConnects.includes(c.connect);
        let dateFormatted = c.date;
        if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
          const [y, m, d] = c.date.slice(0, 10).split('-');
          dateFormatted = `${m}/${d}/${y}`;
        }
        const matchDate = !this.selectedDates.length || this.selectedDates.includes(dateFormatted) || this.selectedDates.includes(c.date);
        return matchAgent && matchOutcome && matchConnect && matchDate;
      });

      const filterSubtitle = `Filters Applied — Agent: ${this.selectedAgents.join(', ') || 'All'}, Outcome: ${this.selectedOutcomes.join(', ') || 'All'}, Connected: ${this.selectedConnects.join(', ') || 'All'}, Date: ${this.selectedDates.join(', ') || 'All'}`;

      if (event.chartId === 'byDay') {
        const filtered = filteredCalls.filter((c) => {
          let df = c.date;
          if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
            const [y, m, d] = c.date.slice(0, 10).split('-');
            df = `${m}/${d}/${y}`;
          }
          return c.date === event.label || df === event.label;
        });
        this.showDataModal(`Calls on Date: ${event.label}`, filtered, filterSubtitle);
      } else if (event.chartId === 'byOutcome') {
        if (event.label === 'Other') {
          const outcomeGroups = new Map<string, number>();
          filteredCalls.forEach((c) => {
            const oc = c.outcome || 'Unspecified';
            outcomeGroups.set(oc, (outcomeGroups.get(oc) || 0) + 1);
          });
          const top5 = new Set([...outcomeGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]));
          const filtered = filteredCalls.filter((c) => !top5.has(c.outcome));
          this.showDataModal(`Calls with Other Outcomes`, filtered, filterSubtitle);
        } else {
          this.showDataModal(`Calls with Outcome: ${event.label}`, filteredCalls.filter((c) => c.outcome === event.label), filterSubtitle);
        }
      } else if (event.chartId === 'byAgent') {
        this.showDataModal(`Calls for Agent: ${event.label}`, filteredCalls.filter((c) => c.agent === event.label), filterSubtitle);
      }
    } else if (dep === 'it-operations') {
      const itKpiAll = this.getTableRecords('itKpi');
      const resourcesAll = this.getTableRecords('resources');
      const projectsAll = this.getTableRecords('projects');

      const filteredItKpi = itKpiAll.filter((r) => {
        const matchCat = !this.selectedCategories.length || this.selectedCategories.includes(r.category);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
        return matchCat && matchStat;
      });

      const filteredResources = resourcesAll.filter((r) => {
        const matchRes = !this.selectedResources.length || this.selectedResources.includes(r.resource);
        const matchAlloc = !this.selectedAllocations.length || this.selectedAllocations.includes(r.allocation);
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(r.projectName);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
        return matchRes && matchAlloc && matchProj && matchStat;
      });

      const filteredProjects = projectsAll.filter((p) => {
        const matchOwner = !this.selectedResources.length || this.selectedResources.includes(p.owner);
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
        return matchOwner && matchProj && matchStat;
      });

      const filterSubtitle = `Filters Applied — Category: ${this.selectedCategories.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}, Engineer: ${this.selectedResources.join(', ') || 'All'}, Allocation: ${this.selectedAllocations.join(', ') || 'All'}${this.selectedProjects.length ? ', Project: ' + this.selectedProjects.join(', ') : ''}`;

      if (event.chartId === 'infraHealth') {
        const match = filteredItKpi.filter((r) => r.kpi.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : filteredItKpi.filter(r => r.category.toLowerCase().includes('infra'));
        this.showDataModal(`Infrastructure: ${event.label}`, list.map(r => ({
          kpi: r.kpi,
          category: r.category,
          target: r.target,
          current: r.current,
          status: r.status,
        })), filterSubtitle);
      } else if (event.chartId === 'secCompliance') {
        const match = filteredItKpi.filter((r) => r.kpi.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : filteredItKpi.filter(r => r.category.toLowerCase().includes('sec') || r.category.toLowerCase().includes('backup'));
        this.showDataModal(`Security / Backup: ${event.label}`, list.map(r => ({
          kpi: r.kpi,
          category: r.category,
          target: r.target,
          current: r.current,
          status: r.status,
        })), filterSubtitle);
      } else if (event.chartId === 'resourceUtil') {
        const match = filteredResources.filter((r) => r.resource.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : filteredResources;
        this.showDataModal(`Resource Details: ${event.label}`, list.map(r => ({
          resource: r.resource,
          role: r.role,
          allocation: r.allocation,
          projectName: r.projectName,
          plannedHours: r.plannedHours,
          actualHours: r.actualHours,
          utilizationPct: r.utilizationPct,
          status: r.status,
        })), filterSubtitle);
      } else if (event.chartId === 'projectProgress') {
        const match = filteredProjects.filter((p) => p.project.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : filteredProjects;
        this.showDataModal(`Project Details: ${event.label}`, list.map(p => ({
          project: p.project,
          owner: p.owner,
          startDate: p.startDate,
          targetCompletion: p.targetCompletion,
          plannedCompletionPct: p.plannedCompletionPct,
          actualCompletionPct: p.actualCompletionPct,
          scheduleVariancePct: p.scheduleVariancePct,
          status: p.status,
        })), filterSubtitle);
      } else if (event.chartId === 'overallRAG') {
        const filtered = filteredItKpi.filter((r) => r.status.toLowerCase() === event.label.toLowerCase()).map(r => ({
          category: r.category,
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        }));
        this.showDataModal(`IT Components (${event.label} Status - ${filtered.length})`, filtered, filterSubtitle);
      }
    } else if (dep === 'hr-query') {
      const queriesAll = this.getTableRecords('queries');
      const queries = queriesAll.filter((q) => {
        const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
        const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
        const matchCat = !q.category || !this.selectedCategories.length || this.selectedCategories.includes(q.category);
        const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
        const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
        const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
        const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
        return matchYear && matchMonth && matchCat && matchSubCat && matchPrio && matchHand && matchStat;
      });

      const filterSubtitle = `Filters Applied — Year: ${this.selectedYears.join(', ') || 'All'}, Month: ${this.selectedMonths.join(', ') || 'All'}, Category: ${this.selectedCategories.join(', ') || 'All'}, Sub-Category: ${this.selectedSubCategories.join(', ') || 'All'}, Priority: ${this.selectedPriorities.join(', ') || 'All'}, Handler: ${this.selectedAssistancePersons.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}`;

      if (event.chartId === 'byCategory') {
        this.showDataModal(`Queries in Category: ${event.label}`, queries.filter((q) => q.category === event.label), filterSubtitle);
      } else if (event.chartId === 'bySubCategory') {
        this.showDataModal(`Queries in Sub-Category: ${event.label}`, queries.filter((q) => q.subCategory === event.label), filterSubtitle);
      } else if (event.chartId === 'byPriority') {
        this.showDataModal(`Queries with Priority: ${event.label}`, queries.filter((q) => q.priority === event.label), filterSubtitle);
      } else if (event.chartId === 'byStatus') {
        this.showDataModal(`Queries with Status: ${event.label}`, queries.filter((q) => q.status === event.label), filterSubtitle);
      } else if (event.chartId === 'byHandler') {
        this.showDataModal(`Queries Handled by: ${event.label}`, queries.filter((q) => q.assistancePerson === event.label), filterSubtitle);
      }
    } else if (dep === 'residential-appraisal') {
      const ordersAll = this.getTableRecords('orders');
      const perfAll = this.getTableRecords('performance');

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}, State: ${this.selectedStates.join(', ') || 'All'}, Report: ${this.selectedReportTypes.join(', ') || 'All'}, Level: ${this.selectedLevels.join(', ') || 'All'}, Team Lead: ${this.selectedTeamLeads.join(', ') || 'All'}, Agent: ${this.selectedAgents.join(', ') || 'All'}`;

      const filteredOrders = ordersAll.filter((o) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(o.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(o.orderedByName);
        const matchState = !this.selectedStates.length || this.selectedStates.includes(o.state);
        const matchReport = !this.selectedReportTypes.length || this.selectedReportTypes.includes(o.reportType);
        const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(o.teamLead);
        const matchLevel = !this.selectedLevels.length || this.selectedLevels.includes(o.level);
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(o.agent);
        return matchMonth && matchClient && matchState && matchReport && matchLead && matchLevel && matchAgent;
      });

      const filteredPerf = perfAll.filter((p) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(p.month);
        const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(p.teamLead);
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(p.name);
        return matchMonth && matchLead && matchAgent;
      });

      if (event.chartId === 'ordersByClient') {
        const sliceOrders = filteredOrders.filter((o) => o.orderedByName === event.label);
        this.showDataModal(`Orders for Client: ${event.label}`, sliceOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      } else if (event.chartId === 'ordersByReportType') {
        const sliceOrders = filteredOrders.filter((o) => o.reportType === event.label);
        this.showDataModal(`Orders for Report Type: ${event.label}`, sliceOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      } else if (event.chartId === 'volumeByLevel') {
        const sliceOrders = filteredOrders.filter((o) => o.level === event.label);
        this.showDataModal(`Orders for ${event.label}`, sliceOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      } else if (event.chartId === 'productivityByTeamLead') {
        const slicePerf = filteredPerf.filter((p) => p.teamLead === event.label);
        this.showDataModal(`Production Logs for Team Lead: ${event.label}`, slicePerf.map((p) => this.toCleanPerformanceRecord(p)), filterSubtitle);
      } else if (event.chartId === 'topAgents') {
        const sliceOrders = filteredOrders.filter((o) => o.agent?.toLowerCase() === event.label?.toLowerCase());
        this.showDataModal(`Orders for Agent: ${event.label}`, sliceOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      } else if (event.chartId === 'ordersByState') {
        const sliceOrders = filteredOrders.filter((o) => o.state === event.label);
        this.showDataModal(`Orders in State: ${event.label}`, sliceOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      }
    }
  }

  onChartClick(chart: ChartDef): void {
    if (!this.data) return;
    const dep = this.data.department;

    if (dep === 'sw-engineering') {
      const projectsAll = this.getTableRecords('projects');
      const assignmentsAll = this.getTableRecords('assignments');
      const employeeSummaryAll = this.getTableRecords('employeeSummary');
      const defectsAll = this.getTableRecords('defects');

      const filteredAssignments = assignmentsAll.filter((a) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(a.project);
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(a.employee);
        const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(a.role);
        return matchProj && matchEmp && matchRole;
      });

      const activeProjectNamesFromAssignments = new Set(filteredAssignments.map((a) => a.project));

      const filteredProjects = projectsAll.filter((p) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
        const matchEmpOrRole = (!this.selectedEmployees.length && !this.selectedRoles.length) || activeProjectNamesFromAssignments.has(p.project);
        return matchProj && matchStat && matchEmpOrRole;
      });

      const activeEmployeesFromAssignments = new Set(filteredAssignments.map((a) => a.employee));
      const filteredEmployeeSummary = employeeSummaryAll.filter((e) => {
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(e.employee);
        const matchRole = !this.selectedRoles.length || this.selectedRoles.includes(e.role);
        const matchProj = !this.selectedProjects.length || activeEmployeesFromAssignments.has(e.employee);
        return matchEmp && matchRole && matchProj;
      });

      const filteredDefects = defectsAll.filter((d) => {
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(d.project);
        const matchEmp = !this.selectedEmployees.length || this.selectedEmployees.includes(d.assignedTo);
        return matchProj && matchEmp;
      });

      const filterSubtitle = `Filters Applied — Project: ${this.selectedProjects.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}, Resource: ${this.selectedEmployees.join(', ') || 'All'}, Role: ${this.selectedRoles.join(', ') || 'All'}`;

      if (chart.id === 'projectStatus') {
        this.showDataModal(`Projects (${filteredProjects.length})`, filteredProjects, filterSubtitle);
      } else if (chart.id === 'defectsBySeverity') {
        const openDefects = filteredDefects.filter((d) => d.status !== 'Closed');
        this.showDataModal(`Open Defects (${openDefects.length})`, openDefects, filterSubtitle);
      } else if (chart.id === 'slaBreakdown') {
        this.showDataModal(`Defects (${filteredDefects.length})`, filteredDefects, filterSubtitle);
      } else if (chart.id === 'hoursByEmployee') {
        this.showDataModal(`Employee Allocations (${filteredEmployeeSummary.length})`, filteredEmployeeSummary, filterSubtitle);
      }
    } else if (dep === 'marketing') {
      const leadsAll = this.getTableRecords('leads');
      const leads = leadsAll.filter((l) => {
        const matchMonth = !l.month || !this.selectedMonths.length || this.selectedMonths.includes(l.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(l.client);
        const matchState = !this.selectedStates.length || this.selectedStates.includes(l.state);
        const matchProp = !this.selectedPropertyTypes.length || this.selectedPropertyTypes.includes(l.propertyType);
        const matchAcc = !this.selectedAccountTypes.length || this.selectedAccountTypes.includes(l.accountType);
        return matchMonth && matchClient && matchState && matchProp && matchAcc;
      });
      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}, State: ${this.selectedStates.join(', ') || 'All'}, Property Type: ${this.selectedPropertyTypes.join(', ') || 'All'}`;
      this.showDataModal(chart.title, leads, filterSubtitle);
    } else if (dep === 'cre-utilization') {
      const deliverablesAll = this.getTableRecords('deliverables');
      const utilizationAll = this.getTableRecords('utilization');

      const deliverables = deliverablesAll.filter((d) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(d.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(d.client);
        return matchMonth && matchClient;
      });

      const utilization = utilizationAll.filter((u) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(u.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(u.category);
        return matchMonth && matchClient;
      });

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}`;

      if (chart.id === 'filesByMonth') this.showDataModal(chart.title, deliverables, filterSubtitle);
      else this.showDataModal(chart.title, utilization, filterSubtitle);
    } else if (dep === 'outbound-desk') {
      const callsAll = this.getTableRecords('calls');
      const filteredCalls = callsAll.filter((c) => {
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(c.agent);
        const matchOutcome = !this.selectedOutcomes.length || this.selectedOutcomes.includes(c.outcome);
        const matchConnect = !this.selectedConnects.length || this.selectedConnects.includes(c.connect);
        let dateFormatted = c.date;
        if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
          const [y, m, d] = c.date.slice(0, 10).split('-');
          dateFormatted = `${m}/${d}/${y}`;
        }
        const matchDate = !this.selectedDates.length || this.selectedDates.includes(dateFormatted) || this.selectedDates.includes(c.date);
        return matchAgent && matchOutcome && matchConnect && matchDate;
      });
      const filterSubtitle = `Filters Applied — Agent: ${this.selectedAgents.join(', ') || 'All'}, Outcome: ${this.selectedOutcomes.join(', ') || 'All'}, Connected: ${this.selectedConnects.join(', ') || 'All'}, Date: ${this.selectedDates.join(', ') || 'All'}`;
      this.showDataModal(chart.title, filteredCalls, filterSubtitle);
    } else if (dep === 'it-operations') {
      const itKpiAll = this.getTableRecords('itKpi');
      const resourcesAll = this.getTableRecords('resources');
      const projectsAll = this.getTableRecords('projects');

      const filteredItKpi = itKpiAll.filter((r) => {
        const matchCat = !this.selectedCategories.length || this.selectedCategories.includes(r.category);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
        return matchCat && matchStat;
      });

      const filteredResources = resourcesAll.filter((r) => {
        const matchRes = !this.selectedResources.length || this.selectedResources.includes(r.resource);
        const matchAlloc = !this.selectedAllocations.length || this.selectedAllocations.includes(r.allocation);
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(r.projectName);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(r.status);
        return matchRes && matchAlloc && matchProj && matchStat;
      });

      const filteredProjects = projectsAll.filter((p) => {
        const matchOwner = !this.selectedResources.length || this.selectedResources.includes(p.owner);
        const matchProj = !this.selectedProjects.length || this.selectedProjects.includes(p.project);
        const matchStat = !this.selectedStatuses.length || this.selectedStatuses.includes(p.status);
        return matchOwner && matchProj && matchStat;
      });

      const filterSubtitle = `Filters Applied — Category: ${this.selectedCategories.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}, Engineer: ${this.selectedResources.join(', ') || 'All'}, Allocation: ${this.selectedAllocations.join(', ') || 'All'}${this.selectedProjects.length ? ', Project: ' + this.selectedProjects.join(', ') : ''}`;

      if (chart.id === 'infraHealth') {
        this.showDataModal('Infrastructure Availability & Health', filteredItKpi.filter(r => r.category.toLowerCase().includes('infra')).map(r => ({
          kpi: r.kpi,
          category: r.category,
          target: r.target,
          current: r.current,
          status: r.status,
        })), filterSubtitle);
      } else if (chart.id === 'secCompliance') {
        this.showDataModal('Security & Backup Compliance', filteredItKpi.filter(r => r.category.toLowerCase().includes('sec') || r.category.toLowerCase().includes('backup')).map(r => ({
          kpi: r.kpi,
          category: r.category,
          target: r.target,
          current: r.current,
          status: r.status,
        })), filterSubtitle);
      } else if (chart.id === 'resourceUtil') {
        this.showDataModal('IT Staff Resource Utilization', filteredResources.map(r => ({
          resource: r.resource,
          role: r.role,
          allocation: r.allocation,
          projectName: r.projectName,
          plannedHours: r.plannedHours,
          actualHours: r.actualHours,
          utilizationPct: r.utilizationPct,
          status: r.status,
        })), filterSubtitle);
      } else if (chart.id === 'projectProgress') {
        this.showDataModal('Active IT Projects', filteredProjects.map(p => ({
          project: p.project,
          owner: p.owner,
          startDate: p.startDate,
          targetCompletion: p.targetCompletion,
          plannedCompletionPct: p.plannedCompletionPct,
          actualCompletionPct: p.actualCompletionPct,
          scheduleVariancePct: p.scheduleVariancePct,
          status: p.status,
        })), filterSubtitle);
      } else if (chart.id === 'overallRAG') {
        this.showDataModal('Overall IT Health Matrix', filteredItKpi.map(r => ({
          category: r.category,
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })), filterSubtitle);
      } else {
        this.showDataModal(chart.title, filteredItKpi.map(r => ({
          category: r.category,
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })), filterSubtitle);
      }
    } else if (dep === 'hr-query') {
      const queriesAll = this.getTableRecords('queries');
      const queries = queriesAll.filter((q) => {
        const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
        const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
        const matchCat = !q.category || !this.selectedCategories.length || this.selectedCategories.includes(q.category);
        const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
        const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
        const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
        const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
        return matchYear && matchMonth && matchCat && matchSubCat && matchPrio && matchHand && matchStat;
      });
      const filterSubtitle = `Filters Applied — Year: ${this.selectedYears.join(', ') || 'All'}, Month: ${this.selectedMonths.join(', ') || 'All'}, Category: ${this.selectedCategories.join(', ') || 'All'}, Sub-Category: ${this.selectedSubCategories.join(', ') || 'All'}, Priority: ${this.selectedPriorities.join(', ') || 'All'}, Handler: ${this.selectedAssistancePersons.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}`;
      this.showDataModal(chart.title, queries, filterSubtitle);
    } else if (dep === 'residential-appraisal') {
      const ordersAll = this.getTableRecords('orders');
      const perfAll = this.getTableRecords('performance');

      const filterSubtitle = `Filters Applied — Month: ${this.selectedMonths.join(', ') || 'All'}, Client: ${this.selectedClients.join(', ') || 'All'}, State: ${this.selectedStates.join(', ') || 'All'}, Report: ${this.selectedReportTypes.join(', ') || 'All'}, Level: ${this.selectedLevels.join(', ') || 'All'}, Team Lead: ${this.selectedTeamLeads.join(', ') || 'All'}, Agent: ${this.selectedAgents.join(', ') || 'All'}`;

      const filteredOrders = ordersAll.filter((o) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(o.month);
        const matchClient = !this.selectedClients.length || this.selectedClients.includes(o.orderedByName);
        const matchState = !this.selectedStates.length || this.selectedStates.includes(o.state);
        const matchReport = !this.selectedReportTypes.length || this.selectedReportTypes.includes(o.reportType);
        const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(o.teamLead);
        const matchLevel = !this.selectedLevels.length || this.selectedLevels.includes(o.level);
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(o.agent);
        return matchMonth && matchClient && matchState && matchReport && matchLead && matchLevel && matchAgent;
      });

      const filteredPerf = perfAll.filter((p) => {
        const matchMonth = !this.selectedMonths.length || this.selectedMonths.includes(p.month);
        const matchLead = !this.selectedTeamLeads.length || this.selectedTeamLeads.includes(p.teamLead);
        const matchAgent = !this.selectedAgents.length || this.selectedAgents.includes(p.name);
        return matchMonth && matchLead && matchAgent;
      });

      if (chart.id === 'productivityByTeamLead') {
        this.showDataModal(chart.title, filteredPerf.map((p) => this.toCleanPerformanceRecord(p)), filterSubtitle);
      } else if (chart.id === 'topAgents') {
        this.showDataModal(chart.title, filteredOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      } else {
        this.showDataModal(chart.title, filteredOrders.map((o) => this.toCleanOrderRecord(o)), filterSubtitle);
      }
    }
  }

  onAgentClick(agent: string): void {
    const callsAll = this.getTableRecords('calls');
    const filteredCalls = callsAll.filter((c) => {
      const matchOutcome = !this.selectedOutcomes.length || this.selectedOutcomes.includes(c.outcome);
      const matchConnect = !this.selectedConnects.length || this.selectedConnects.includes(c.connect);
      let dateFormatted = c.date;
      if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c.date)) {
        const [y, m, d] = c.date.slice(0, 10).split('-');
        dateFormatted = `${m}/${d}/${y}`;
      }
      const matchDate = !this.selectedDates.length || this.selectedDates.includes(dateFormatted) || this.selectedDates.includes(c.date);
      return c.agent === agent && matchOutcome && matchConnect && matchDate;
    });
    const filterSubtitle = `Filters Applied — Agent: ${agent}, Outcome: ${this.selectedOutcomes.join(', ') || 'All'}, Connected: ${this.selectedConnects.join(', ') || 'All'}, Date: ${this.selectedDates.join(', ') || 'All'}`;
    this.showDataModal(`Call Log: ${agent}`, filteredCalls, filterSubtitle);
  }
}


