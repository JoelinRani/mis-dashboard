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
      this.selectedStatuses.length > 0
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
      const allSubCats = new Set<string>();
      const allPrios = new Set<string>();
      const allHands = new Set<string>();
      const allStats = new Set<string>();

      queries.forEach((q) => {
        if (q.year) allYears.add(String(q.year));
        if (q.month) allMonths.add(q.month);
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
      this.subCategoriesList = [...allSubCats].sort();
      this.prioritiesList = [...allPrios].sort();
      this.assistancePersonsList = [...allHands].sort();
      this.statusesList = [...allStats].sort();

      this.selectedYears = this.selectedYears.filter((y) => this.yearsList.includes(y));
      this.selectedMonths = this.selectedMonths.filter((m) => this.monthsList.includes(m));
      this.selectedSubCategories = this.selectedSubCategories.filter((s) => this.subCategoriesList.includes(s));
      this.selectedPriorities = this.selectedPriorities.filter((p) => this.prioritiesList.includes(p));
      this.selectedAssistancePersons = this.selectedAssistancePersons.filter((a) => this.assistancePersonsList.includes(a));
      this.selectedStatuses = this.selectedStatuses.filter((st) => this.statusesList.includes(st));
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
      const allSubCats = new Set<string>();
      const allPrios = new Set<string>();
      const allHands = new Set<string>();
      const allStats = new Set<string>();

      queries.forEach((q) => {
        if (q.year) allYears.add(String(q.year));
        if (q.month) allMonths.add(q.month);
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
      this.subCategoriesList = [...allSubCats].sort();
      this.prioritiesList = [...allPrios].sort();
      this.assistancePersonsList = [...allHands].sort();
      this.statusesList = [...allStats].sort();

      this.selectedYears = [];
      this.selectedMonths = [];
      this.selectedSubCategories = [];
      this.selectedPriorities = [];
      this.selectedAssistancePersons = [];
      this.selectedStatuses = [];

      this.updateFilteredHrQueryData();
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
    }
  }

  updateFilteredHrQueryData(): void {
    if (!this.data || this.data.department !== 'hr-query') return;

    const queriesAll = this.getTableRecords('queries');

    const filteredQueries = queriesAll.filter((q) => {
      const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
      const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
      const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
      const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
      const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
      const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
      return matchYear && matchMonth && matchSubCat && matchPrio && matchHand && matchStat;
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
      const projects = this.getTableRecords('projects');
      const assignments = this.getTableRecords('assignments');
      const employeeSummary = this.getTableRecords('employeeSummary');
      const defects = this.getTableRecords('defects');

      switch (kpi.key) {
        case 'totalProjects':
        case 'avgPercentComplete':
        case 'projectHoursVariancePct':
          this.showDataModal(`All Projects (${projects.length})`, projects);
          break;
        case 'onTrack':
          this.showDataModal(`On Track Projects (${kpi.value})`, projects.filter((p) => p.status === 'On Track'));
          break;
        case 'atRisk':
          this.showDataModal(`At Risk Projects (${kpi.value})`, projects.filter((p) => p.status === 'At Risk'));
          break;
        case 'delayed':
          this.showDataModal(`Delayed Projects (${kpi.value})`, projects.filter((p) => p.status === 'Delayed'));
          break;
        case 'headcount':
        case 'avgAllocationPct':
          this.showDataModal(`Team Members (${employeeSummary.length})`, employeeSummary);
          break;
        case 'avgUtilizationPct':
          this.showDataModal(
            `Resource Utilization (${employeeSummary.length})`,
            employeeSummary.map((e) => ({
              employee: e.employee,
              role: e.role,
              plannedHours: e.plannedHours,
              actualHours: e.actualHours,
              utilizationPct: e.utilizationPct,
            }))
          );
          break;
        case 'billableHours':
          this.showDataModal(`Billable Resource Assignments`, assignments.filter((a) => (a.billableHours || 0) > 0));
          break;
        case 'nonBillableHours':
          this.showDataModal(`Non-Billable Resource Assignments`, assignments.filter((a) => (a.nonBillableHours || 0) > 0));
          break;
        case 'totalDefects':
        case 'slaCompliancePct':
          this.showDataModal(`Defects Logged (${defects.length})`, defects);
          break;
        case 'openDefects':
          this.showDataModal(`Open Defects (${kpi.value})`, defects.filter((d) => d.status !== 'Closed'));
          break;
        case 'criticalOpen':
          this.showDataModal(`Critical & Open Defects (${kpi.value})`, defects.filter((d) => d.severity === 'Critical' && d.status !== 'Closed'));
          break;
        default:
          this.showDataModal(kpi.label, this.data.tables[0]?.records || []);
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
      const calls = this.getTableRecords('calls');
      switch (kpi.key) {
        case 'agents':
          this.showDataModal(`Active Agents (${kpi.value})`, this.getAgentsSummary(calls));
          break;
        case 'uniqueLeads':
          this.showDataModal(`Unique Leads Worked (${kpi.value})`, calls.filter((c) => c.isFirstForLead));
          break;
        case 'connectRate':
        case 'liveConversations':
          this.showDataModal(`Connected Calls (${kpi.value})`, calls.filter((c) => c.connect === 'Yes'));
          break;
        case 'voicemailRate':
          this.showDataModal(`Voicemail Attempts`, calls.filter((c) => c.outcome === 'Voicemail'));
          break;
        default:
          this.showDataModal(`Call Attempts (${calls.length})`, calls);
          break;
      }
    } else if (dep === 'it-operations') {
      const itKpi = this.getTableRecords('itKpi');
      const resources = this.getTableRecords('resources');
      const projects = this.getTableRecords('projects');

      switch (kpi.key) {
        case 'criticalAvailability':
          this.showDataModal(
            `Critical Resource Availability`,
            itKpi.filter(r => r.category.toLowerCase().includes('infra')).map(r => ({
              kpi: r.kpi,
              target: r.target,
              current: r.current,
              status: r.status,
            }))
          );
          break;
        case 'slaCompliance':
          this.showDataModal(
            `SLA Compliance`,
            itKpi.filter(r => r.kpi.toLowerCase().includes('sla') || r.category.toLowerCase().includes('oper')).map(r => ({
              kpi: r.kpi,
              target: r.target,
              current: r.current,
              status: r.status,
            }))
          );
          break;
        case 'openTickets':
          this.showDataModal(
            `Support Tickets & Operations`,
            itKpi.filter(r => r.category.toLowerCase().includes('oper') || r.kpi.toLowerCase().includes('ticket')).map(r => ({
              kpi: r.kpi,
              target: r.target,
              current: r.current,
              status: r.status,
            }))
          );
          break;
        case 'backupSuccess':
          this.showDataModal(
            `Backup Success Rate`,
            itKpi.filter(r => r.category.toLowerCase().includes('backup')).map(r => ({
              kpi: r.kpi,
              target: r.target,
              current: r.current,
              status: r.status,
            }))
          );
          break;
        case 'patchCompliance':
          this.showDataModal(
            `Patch Compliance & Security`,
            itKpi.filter(r => r.category.toLowerCase().includes('sec')).map(r => ({
              kpi: r.kpi,
              target: r.target,
              current: r.current,
              status: r.status,
            }))
          );
          break;
        case 'majorOutages':
          this.showDataModal(
            `Major Outages & Critical Issues`,
            itKpi.filter(r => r.category.toLowerCase().includes('critical') || r.kpi.toLowerCase().includes('outage')).map(r => ({
              kpi: r.kpi,
              target: r.target,
              current: r.current,
              status: r.status,
            }))
          );
          break;
        default:
          this.showDataModal(`IT Infrastructure & Security Matrix`, itKpi.map(r => ({
            category: r.category,
            kpi: r.kpi,
            target: r.target,
            current: r.current,
            status: r.status,
          })));
          break;
      }
    } else if (dep === 'hr-query') {
      const queriesAll = this.getTableRecords('queries');
      const queries = queriesAll.filter((q) => {
        const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
        const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
        const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
        const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
        const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
        const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
        return matchYear && matchMonth && matchSubCat && matchPrio && matchHand && matchStat;
      });

      const filterSubtitle = `Filters Applied — Year: ${this.selectedYears.join(', ') || 'All'}, Month: ${this.selectedMonths.join(', ') || 'All'}, Sub-Category: ${this.selectedSubCategories.join(', ') || 'All'}, Priority: ${this.selectedPriorities.join(', ') || 'All'}, Handler: ${this.selectedAssistancePersons.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}`;

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
    }
  }

  // --- Aggregation Summaries for Particular Data Views --------------------

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
      const projects = this.getTableRecords('projects');
      const assignments = this.getTableRecords('assignments');
      const defects = this.getTableRecords('defects');

      if (event.chartId === 'projectStatus') {
        const filtered = projects.filter((p) => p.status === event.label);
        this.showDataModal(`Projects: ${event.label} (${filtered.length})`, filtered);
      } else if (event.chartId === 'defectsBySeverity') {
        const filtered = defects.filter((d) => d.severity === event.label && d.status !== 'Closed');
        if (filtered.length > 0) {
          this.showDataModal(`Open Defects: ${event.label} Severity (${filtered.length})`, filtered);
        }
      } else if (event.chartId === 'slaBreakdown') {
        const filtered = defects.filter((d) => d.slaStatus === event.label);
        this.showDataModal(`Defects: SLA ${event.label} (${filtered.length})`, filtered);
      } else if (event.chartId === 'hoursByEmployee') {
        const filtered = assignments.filter((a) => a.employee === event.label);
        this.showDataModal(`Resource Assignments: ${event.label} (${filtered.length})`, filtered);
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
      const calls = this.getTableRecords('calls');
      if (event.chartId === 'byDay') {
        this.showDataModal(`Calls on Date: ${event.label}`, calls.filter((c) => c.date === event.label));
      } else if (event.chartId === 'byOutcome') {
        this.showDataModal(`Calls with Outcome: ${event.label}`, calls.filter((c) => c.outcome === event.label));
      } else if (event.chartId === 'byAgent') {
        this.showDataModal(`Calls for Agent: ${event.label}`, calls.filter((c) => c.agent === event.label));
      }
    } else if (dep === 'it-operations') {
      const itKpi = this.getTableRecords('itKpi');
      const resources = this.getTableRecords('resources');
      const projects = this.getTableRecords('projects');

      if (event.chartId === 'infraHealth') {
        const match = itKpi.filter((r) => r.kpi.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : itKpi.filter(r => r.category.toLowerCase().includes('infra'));
        this.showDataModal(`Infrastructure: ${event.label}`, list.map(r => ({
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })));
      } else if (event.chartId === 'secCompliance') {
        const match = itKpi.filter((r) => r.kpi.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : itKpi.filter(r => r.category.toLowerCase().includes('sec') || r.category.toLowerCase().includes('backup'));
        this.showDataModal(`Security / Backup: ${event.label}`, list.map(r => ({
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })));
      } else if (event.chartId === 'resourceUtil') {
        const match = resources.filter((r) => r.resource.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : resources;
        this.showDataModal(`Resource Details: ${event.label}`, list.map(r => ({
          resource: r.resource,
          role: r.role,
          allocation: r.allocation,
          projectName: r.projectName,
          plannedHours: r.plannedHours,
          actualHours: r.actualHours,
          utilizationPct: r.utilizationPct,
          status: r.status,
        })));
      } else if (event.chartId === 'projectProgress') {
        const match = projects.filter((p) => p.project.toLowerCase() === event.label.toLowerCase());
        const list = match.length ? match : projects;
        this.showDataModal(`Project Details: ${event.label}`, list.map(p => ({
          project: p.project,
          owner: p.owner,
          startDate: p.startDate,
          targetCompletion: p.targetCompletion,
          plannedCompletionPct: p.plannedCompletionPct,
          actualCompletionPct: p.actualCompletionPct,
          scheduleVariancePct: p.scheduleVariancePct,
          status: p.status,
        })));
      } else if (event.chartId === 'overallRAG') {
        const filtered = itKpi.filter((r) => r.status.toLowerCase() === event.label.toLowerCase()).map(r => ({
          category: r.category,
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        }));
        this.showDataModal(`IT Components (${event.label} Status - ${filtered.length})`, filtered);
      }
    } else if (dep === 'hr-query') {
      const queriesAll = this.getTableRecords('queries');
      const queries = queriesAll.filter((q) => {
        const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
        const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
        const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
        const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
        const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
        const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
        return matchYear && matchMonth && matchSubCat && matchPrio && matchHand && matchStat;
      });

      const filterSubtitle = `Filters Applied — Year: ${this.selectedYears.join(', ') || 'All'}, Month: ${this.selectedMonths.join(', ') || 'All'}, Sub-Category: ${this.selectedSubCategories.join(', ') || 'All'}, Priority: ${this.selectedPriorities.join(', ') || 'All'}, Handler: ${this.selectedAssistancePersons.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}`;

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
    }
  }

  onChartClick(chart: ChartDef): void {
    if (!this.data) return;
    const dep = this.data.department;

    if (dep === 'sw-engineering') {
      if (chart.id === 'projectStatus') {
        this.showDataModal(`All Projects`, this.getTableRecords('projects'));
      } else if (chart.id === 'defectsBySeverity') {
        const openDefects = this.getTableRecords('defects').filter((d) => d.status !== 'Closed');
        if (openDefects.length > 0) {
          this.showDataModal(`Open Defects`, openDefects);
        }
      } else if (chart.id === 'slaBreakdown') {
        this.showDataModal(`All Defects`, this.getTableRecords('defects'));
      } else if (chart.id === 'hoursByEmployee') {
        this.showDataModal(`Team Allocations`, this.getTableRecords('employeeSummary'));
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
      this.showDataModal(chart.title, this.getTableRecords('calls'));
    } else if (dep === 'it-operations') {
      if (chart.id === 'infraHealth') {
        this.showDataModal('Infrastructure Availability & Health', this.getTableRecords('itKpi').filter(r => r.category.toLowerCase().includes('infra')).map(r => ({
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })));
      } else if (chart.id === 'secCompliance') {
        this.showDataModal('Security & Backup Compliance', this.getTableRecords('itKpi').filter(r => r.category.toLowerCase().includes('sec') || r.category.toLowerCase().includes('backup')).map(r => ({
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })));
      } else if (chart.id === 'resourceUtil') {
        this.showDataModal('IT Staff Resource Utilization', this.getTableRecords('resources').map(r => ({
          resource: r.resource,
          role: r.role,
          allocation: r.allocation,
          projectName: r.projectName,
          plannedHours: r.plannedHours,
          actualHours: r.actualHours,
          utilizationPct: r.utilizationPct,
          status: r.status,
        })));
      } else if (chart.id === 'projectProgress') {
        this.showDataModal('Active IT Projects', this.getTableRecords('projects').map(p => ({
          project: p.project,
          owner: p.owner,
          startDate: p.startDate,
          targetCompletion: p.targetCompletion,
          plannedCompletionPct: p.plannedCompletionPct,
          actualCompletionPct: p.actualCompletionPct,
          scheduleVariancePct: p.scheduleVariancePct,
          status: p.status,
        })));
      } else if (chart.id === 'overallRAG') {
        this.showDataModal('Overall IT Health Matrix', this.getTableRecords('itKpi').map(r => ({
          category: r.category,
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })));
      } else {
        this.showDataModal(chart.title, this.getTableRecords('itKpi').map(r => ({
          category: r.category,
          kpi: r.kpi,
          target: r.target,
          current: r.current,
          status: r.status,
        })));
      }
    } else if (dep === 'hr-query') {
      const queriesAll = this.getTableRecords('queries');
      const queries = queriesAll.filter((q) => {
        const matchYear = !q.year || !this.selectedYears.length || this.selectedYears.includes(String(q.year));
        const matchMonth = !q.month || !this.selectedMonths.length || this.selectedMonths.includes(q.month);
        const matchSubCat = !q.subCategory || !this.selectedSubCategories.length || this.selectedSubCategories.includes(q.subCategory);
        const matchPrio = !q.priority || !this.selectedPriorities.length || this.selectedPriorities.includes(q.priority);
        const matchHand = !q.assistancePerson || !this.selectedAssistancePersons.length || this.selectedAssistancePersons.includes(q.assistancePerson);
        const matchStat = !q.status || !this.selectedStatuses.length || this.selectedStatuses.includes(q.status);
        return matchYear && matchMonth && matchSubCat && matchPrio && matchHand && matchStat;
      });
      const filterSubtitle = `Filters Applied — Year: ${this.selectedYears.join(', ') || 'All'}, Month: ${this.selectedMonths.join(', ') || 'All'}, Sub-Category: ${this.selectedSubCategories.join(', ') || 'All'}, Priority: ${this.selectedPriorities.join(', ') || 'All'}, Handler: ${this.selectedAssistancePersons.join(', ') || 'All'}, Status: ${this.selectedStatuses.join(', ') || 'All'}`;
      this.showDataModal(chart.title, queries, filterSubtitle);
    }
  }

  onAgentClick(agent: string): void {
    const calls = this.getTableRecords('calls');
    this.showDataModal(`Call Log: ${agent}`, calls.filter((c) => c.agent === agent));
  }
}


