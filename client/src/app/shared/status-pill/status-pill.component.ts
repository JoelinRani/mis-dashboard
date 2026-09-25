import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { statusRoleFor } from '../../core/chart-colors';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="pill" [class]="'role-' + (role || 'none')">{{ value }}</span>`,
  styleUrl: './status-pill.component.css',
})
export class StatusPillComponent {
  @Input() value: string | null | undefined;

  get role(): string | null {
    return statusRoleFor(this.value);
  }
}
