import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { DepartmentSummary } from '../../core/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent implements OnInit {
  departments: DepartmentSummary[] = [];
  loading = true;
  loadError = false;

  isCollapsed = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState !== null) {
      this.isCollapsed = savedState === 'true';
    }
    this.load();
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebar_collapsed', String(this.isCollapsed));
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.api.getDepartments().subscribe({
      next: (list) => {
        this.departments = list;
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      },
    });
  }
}
