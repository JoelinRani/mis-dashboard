import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ChartDef } from '../../core/models';
import { categoricalPalette } from '../../core/chart-colors';

Chart.register(...registerables);

export interface ChartSliceClickEvent {
  chartId: string;
  chartTitle: string;
  label: string;
  datasetLabel?: string;
  value?: number;
}

@Component({
  selector: 'app-chart-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-panel.component.html',
  styleUrl: './chart-panel.component.css',
})
export class ChartPanelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) chart!: ChartDef;
  @Output() sliceClick = new EventEmitter<ChartSliceClickEvent>();
  @Output() chartClick = new EventEmitter<ChartDef>();
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chartInstance: Chart | null = null;
  private viewReady = false;

  constructor(private zone: NgZone) { }

  get isEmpty(): boolean {
    return !this.chart || !this.chart.labels?.length || !this.chart.series?.length;
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.zone.runOutsideAngular(() => this.render());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chart'] && this.viewReady) {
      this.zone.runOutsideAngular(() => this.render());
    }
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  onViewTable(): void {
    this.chartClick.emit(this.chart);
  }

  private render(): void {
    if (!this.canvasRef || this.isEmpty) return;
    this.chartInstance?.destroy();

    const palette = categoricalPalette();
    const isPie = this.chart.type === 'pie';
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#52514e';
    const gridline = getComputedStyle(document.documentElement).getPropertyValue('--gridline').trim() || '#e1e0d9';
    const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface-1').trim() || '#fcfcfb';

    const datasets = this.chart.series.map((s, seriesIdx) => ({
      label: s.name,
      data: s.data,
      backgroundColor: isPie
        ? this.chart.labels.map((_, i) => palette[i % palette.length])
        : palette[seriesIdx % palette.length],
      borderColor: isPie ? surface : palette[seriesIdx % palette.length],
      borderWidth: isPie ? 2 : 0,
      borderRadius: isPie ? 0 : 4,
      maxBarThickness: 34,
      hoverOffset: isPie ? 6 : 0,
    }));

    const config: ChartConfiguration = {
      type: isPie ? 'pie' : 'bar',
      data: { labels: this.chart.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 150,
        animation: false,
        onClick: (_event, elements) => {
          if (elements && elements.length > 0) {
            const el = elements[0];
            const index = el.index;
            const label = this.chart.labels[index];
            const dataset = this.chart.series[el.datasetIndex];
            const val = dataset?.data[index];
            this.zone.run(() => {
              this.sliceClick.emit({
                chartId: this.chart.id,
                chartTitle: this.chart.title,
                label,
                datasetLabel: dataset?.name,
                value: val,
              });
            });
          } else {
            this.zone.run(() => {
              this.chartClick.emit(this.chart);
            });
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement;
          if (target) {
            target.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
        },
        plugins: {
          legend: {
            display: isPie || this.chart.series.length > 1,
            position: 'bottom',
            labels: { color: textSecondary, boxWidth: 12, font: { size: 11.5 }, padding: 12 },
          },
          tooltip: {
            backgroundColor: '#0b0b0b',
            padding: 10,
            titleFont: { size: 12 },
            bodyFont: { size: 12 },
            callbacks: {
              afterBody: () => 'Click to open detailed records pop-up',
            },

          },
        },
        scales: isPie
          ? {}
          : {
            x: { grid: { display: false }, ticks: { color: textSecondary, font: { size: 11 } } },
            y: {
              beginAtZero: true,
              suggestedMax: 1,
              title: {
                display: this.chart.id === 'defectsBySeverity',
                text: 'Count',
                color: textSecondary,
                font: { size: 11, weight: 'bold' },
              },
              grid: { color: gridline },
              ticks: {
                color: textSecondary,
                font: { size: 11 },
                stepSize: this.chart.id === 'defectsBySeverity' ? 0.1 : undefined,
              },
            },
          },
      },
    };

    this.chartInstance = new Chart(this.canvasRef.nativeElement, config);
  }
}

