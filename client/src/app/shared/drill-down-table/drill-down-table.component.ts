import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableDef, Record as DataRecord } from '../../core/models';
import { StatusPillComponent } from '../status-pill/status-pill.component';

interface GroupRow {
  value: string;
  count: number;
  metricValue: number;
}

const STATUS_LIKE_HINTS = ['status', 'outcome', 'severity', 'connect', 'research', 'rag', 'allocation status'];

@Component({
  selector: 'app-drill-down-table',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPillComponent],
  templateUrl: './drill-down-table.component.html',
  styleUrl: './drill-down-table.component.css',
})
export class DrillDownTableComponent implements OnChanges {
  @Input({ required: true }) table!: TableDef;
  @Input() initialFilters?: Record<string, string>;
  @Input() initialGroupBy?: string;
  @Input() initialView?: 'summary' | 'detail';
  @Input() initialGroupValue?: string | null;

  filters: Record<string, string> = {};
  groupByKey = '';
  view: 'summary' | 'detail' = 'summary';
  selectedGroupValue: string | null = null;
  searchTerm = '';
  sortDir: 'asc' | 'desc' = 'desc';
  detailSortKey: string | null = null;
  detailSortDir: 'asc' | 'desc' = 'asc';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['table'] || changes['initialFilters'] || changes['initialGroupBy'] || changes['initialView'] || changes['initialGroupValue']) {
      this.filters = { ...(this.initialFilters || {}) };
      this.groupByKey = this.initialGroupBy || this.table.dimensions[0]?.key || '';
      this.selectedGroupValue = this.initialGroupValue ?? null;
      this.searchTerm = '';
      this.detailSortKey = null;

      if (this.initialGroupValue) {
        this.view = 'detail';
      } else if (this.initialView) {
        this.view = this.initialView;
      } else {
        this.view = 'summary';
      }
    }
  }


  // --- distinct filter options ---------------------------------------
  distinctValues(dimKey: string): string[] {
    const set = new Set<string>();
    this.table.records.forEach((r) => {
      const v = r[dimKey];
      if (v !== null && v !== undefined && v !== '') set.add(String(v));
    });
    return [...set].sort();
  }

  onFilterChange(dimKey: string, value: string): void {
    if (!value) delete this.filters[dimKey];
    else this.filters[dimKey] = value;
    this.view = 'summary';
  }

  clearFilters(): void {
    this.filters = {};
    this.view = 'summary';
  }

  get activeFilterCount(): number {
    return Object.keys(this.filters).length;
  }

  // --- filtered records -------------------------------------------------
  get filteredRecords(): DataRecord[] {
    return this.table.records.filter((r) =>
      Object.entries(this.filters).every(([k, v]) => String(r[k] ?? '') === v)
    );
  }

  // --- level 2: grouped summary ------------------------------------------
  get groupRows(): GroupRow[] {
    const map = new Map<string, { count: number; sum: number }>();
    this.filteredRecords.forEach((r) => {
      const key = String(r[this.groupByKey] ?? 'Unspecified');
      const entry = map.get(key) ?? { count: 0, sum: 0 };
      entry.count += 1;
      if (this.table.metric.agg !== 'count' && this.table.metric.key) {
        entry.sum += Number(r[this.table.metric.key]) || 0;
      }
      map.set(key, entry);
    });
    const rows: GroupRow[] = [...map.entries()].map(([value, e]) => ({
      value,
      count: e.count,
      metricValue: this.table.metric.agg === 'count' ? e.count : this.table.metric.agg === 'avg' ? (e.count ? e.sum / e.count : 0) : e.sum,
    }));
    rows.sort((a, b) => (this.sortDir === 'desc' ? b.metricValue - a.metricValue : a.metricValue - b.metricValue));
    return rows;
  }

  toggleSort(): void {
    this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
  }

  formatMetric(v: number): string {
    return Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '–';
  }

  // --- level 3: drill into one group -------------------------------------
  openGroup(value: string): void {
    this.selectedGroupValue = value;
    this.view = 'detail';
    this.searchTerm = '';
    this.detailSortKey = null;
  }

  backToSummary(): void {
    this.view = 'summary';
    this.selectedGroupValue = null;
  }

  get groupDetailRecords(): DataRecord[] {
    let rows = this.filteredRecords.filter((r) => String(r[this.groupByKey] ?? 'Unspecified') === this.selectedGroupValue);
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      rows = rows.filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(term)));
    }
    if (this.detailSortKey) {
      const key = this.detailSortKey;
      rows = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
        return this.detailSortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }

  get detailColumns(): string[] {
    const sample = this.table.records[0];
    return sample ? Object.keys(sample) : [];
  }

  columnLabel(key: string): string {
    const dim = this.table.dimensions.find((d) => d.key === key);
    if (dim) return dim.label;
    // camelCase -> Title Case
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }

  isStatusLike(key: string): boolean {
    const lower = this.columnLabel(key).toLowerCase();
    return STATUS_LIKE_HINTS.some((h) => lower.includes(h));
  }

  sortDetailBy(key: string): void {
    if (this.detailSortKey === key) {
      this.detailSortDir = this.detailSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.detailSortKey = key;
      this.detailSortDir = 'asc';
    }
  }

  formatCell(v: any): string {
    if (v === null || v === undefined || v === '') return '–';
    if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return String(v);
  }

  // --- export ---------------------------------------------------------
  exportGroupsCsv(): void {
    const header = [this.groupByLabel, this.table.metric.label, 'Records'];
    const lines = this.groupRows.map((g) => [g.value, g.metricValue, g.count]);
    this.downloadCsv(header, lines, `${this.table.key}-summary.csv`);
  }

  exportDetailCsv(): void {
    const cols = this.detailColumns;
    const lines = this.groupDetailRecords.map((r) => cols.map((c) => r[c]));
    this.downloadCsv(cols.map((c) => this.columnLabel(c)), lines, `${this.table.key}-${this.selectedGroupValue}-detail.csv`);
  }

  get groupByLabel(): string {
    return this.table.dimensions.find((d) => d.key === this.groupByKey)?.label ?? this.groupByKey;
  }

  private downloadCsv(header: string[], rows: any[][], filename: string): void {
    const esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rows].map((row) => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  }
}
