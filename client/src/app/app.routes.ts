import { Routes } from '@angular/router';
import { ShellComponent } from './features/shell/shell.component';
import { DepartmentDashboardComponent } from './features/department-dashboard/department-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'marketing', pathMatch: 'full' },
      { path: ':departmentId', component: DepartmentDashboardComponent },
    ],
  },
];
