import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DashboardData, DepartmentSummary } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';
  private dashboardCache = new Map<string, DashboardData>();

  constructor(private http: HttpClient) { }

  getDepartments(): Observable<DepartmentSummary[]> {
    return this.http.get<DepartmentSummary[]>(`${this.baseUrl}/departments`).pipe(
      tap((depts) => {
        // Pre-fetch all available departments into memory in background for instant switching
        depts.forEach((d) => {
          if (d.available && !this.dashboardCache.has(d.id)) {
            this.getDashboard(d.id).subscribe();
          }
        });
      })
    );
  }

  getCachedDashboard(departmentId: string): DashboardData | undefined {
    return this.dashboardCache.get(departmentId);
  }

  getDashboard(departmentId: string, forceRefresh = false): Observable<DashboardData> {
    if (!forceRefresh && this.dashboardCache.has(departmentId)) {
      return of(this.dashboardCache.get(departmentId)!);
    }
    const url = forceRefresh
      ? `${this.baseUrl}/departments/${departmentId}/dashboard?refresh=true`
      : `${this.baseUrl}/departments/${departmentId}/dashboard`;
    return this.http.get<DashboardData>(url).pipe(
      tap((data) => this.dashboardCache.set(departmentId, data))
    );
  }

  clearCache(departmentId?: string): void {
    if (departmentId) {
      this.dashboardCache.delete(departmentId);
    } else {
      this.dashboardCache.clear();
    }
  }
}
