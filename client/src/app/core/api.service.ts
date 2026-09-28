import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DashboardData, DepartmentSummary } from './models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private dashboardCache = new Map<string, DashboardData>();

  constructor(private http: HttpClient) { }

  getDepartments(): Observable<DepartmentSummary[]> {
    return this.http.get<DepartmentSummary[]>(`${this.baseUrl}/departments`);
  }

  getCachedDashboard(departmentId: string): DashboardData | undefined {
    return this.dashboardCache.get(departmentId);
  }

  getDashboard(departmentId: string, forceRefresh = false): Observable<DashboardData> {
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
