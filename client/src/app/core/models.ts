export interface DepartmentSummary {
  id: string;
  label: string;
  available: boolean;
  error: string | null;
}

export type KpiFormat = 'number' | 'percent';

export interface Kpi {
  key: string;
  label: string;
  value: number;
  format: KpiFormat;
}

export type ChartType = 'bar' | 'pie' | 'line';

export interface ChartSeries {
  name: string;
  data: number[];
}

export interface ChartDef {
  id: string;
  title: string;
  type: ChartType;
  labels: string[];
  series: ChartSeries[];
}

export interface DimensionDef {
  key: string;
  label: string;
}

export type MetricAgg = 'sum' | 'count' | 'avg';

export interface MetricDef {
  key: string | null;
  label: string;
  agg: MetricAgg;
}

export type Record = { [key: string]: any };

export interface TableDef {
  key: string;
  label: string;
  dimensions: DimensionDef[];
  metric: MetricDef;
  records: Record[];
}

export interface AgentComparisonRow {
  agent: string;
  attempts: number;
  uniqueLeads: number;
  connectRate: number;
}

export interface DashboardData {
  department: string;
  label: string;
  sourceFile: string;
  sourceUrl?: string;
  generatedAt: string;
  kpis: Kpi[];
  charts: ChartDef[];
  tables: TableDef[];
  agentComparison?: AgentComparisonRow[];
  dataNotes: string[];
}
