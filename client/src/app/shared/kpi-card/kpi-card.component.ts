import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Kpi } from '../../core/models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.css',
})
export class KpiCardComponent {
  @Input({ required: true }) kpi!: Kpi;
  @Input() clickable = true;
  @Output() cardClick = new EventEmitter<Kpi>();

  get formattedValue(): string {
    const v = this.kpi.value;
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    if (this.kpi.format === 'percent') return `${v}%`;
    return v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }

  onClick(): void {
    if (this.clickable) {
      this.cardClick.emit(this.kpi);
    }
  }
}

