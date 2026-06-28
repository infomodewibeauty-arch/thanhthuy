/**
 * hrAnalytics.ts
 * All HR/Workforce-specific data processing and analytics
 */

import { normalizeCol } from './columnDetection';
import { parseCleanDate } from './dataCleaner';

// ─── HR Column Aliases ───────────────────────────────────────────────────────
const HR_ALIAS: Record<string, string> = {
  // Employee ID
  emp_id: 'emp_id', employee_id: 'emp_id', employeeid: 'emp_id', empid: 'emp_id', id: 'emp_id',
  // Business Unit
  business_unit: 'business_unit', businessunit: 'business_unit', bu: 'business_unit',
  // Department
  department: 'department', dept: 'department', phong_ban: 'department', phongban: 'department',
  // Team
  team: 'team', nhom: 'team',
  // Manager
  manager_id: 'manager_id', managerid: 'manager_id', manager: 'manager_id',
  // Job Level
  job_level: 'job_level', joblevel: 'job_level', grade: 'job_level', level: 'job_level', cap_bac: 'job_level',
  // Gender
  gender: 'gender', gioi_tinh: 'gender', gioitinh: 'gender', sex: 'gender',
  // Age
  age: 'age', tuoi: 'age',
  // Ethnicity
  ethnicity: 'ethnicity', race: 'ethnicity',
  // Location
  location: 'location', loc: 'location', office: 'location', city: 'location', dia_diem: 'location',
  country: 'location', region: 'location',
  // Hire Date
  hire_date: 'hire_date', hiredate: 'hire_date', joining_date: 'hire_date', joiningdate: 'hire_date',
  start_date: 'hire_date', ngay_vao_lam: 'hire_date',
  // Performance
  performance: 'performance', performance_rating: 'performance', performancerating: 'performance',
  perf: 'performance', danh_gia: 'performance',
  // Potential
  potential: 'potential', potential_rating: 'potential', potentialrating: 'potential',
  tiem_nang: 'potential',
  // Flight Risk
  flight_risk: 'flight_risk', flightrisk: 'flight_risk', attrition_risk: 'flight_risk',
  attritionrisk: 'flight_risk', risk: 'flight_risk', nguy_co_nghi: 'flight_risk',
  // Employment Status
  employment_status: 'employment_status', employmentstatus: 'employment_status',
  status: 'employment_status', emp_status: 'employment_status', trang_thai: 'employment_status',
  // Salary (optional)
  salary: 'salary', luong: 'salary', wage: 'salary', compensation: 'salary',
  // Attrition (binary flag)
  attrition: 'attrition', attrition_flag: 'attrition', left: 'attrition', churned: 'attrition',
};

export interface HRColumnMap {
  [rawCol: string]: string; // rawCol → HR standard key or rawCol itself
}

export interface HRSummary {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  attritionCount: number;
  attritionRate: number | null;
  avgAge: number | null;
  avgTenureYears: number | null;
  // breakdowns
  byBusinessUnit: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byTeam: { name: string; count: number }[];
  byGender: { name: string; count: number }[];
  byLocation: { name: string; count: number }[];
  byJobLevel: { name: string; count: number }[];
  byPerformance: { name: string; count: number }[];
  byPotential: { name: string; count: number }[];
  byFlightRisk: { name: string; count: number }[];
  highFlightRisk: any[];
}

export interface HRAnalyticsResult {
  datasetType: 'HR_WORKFORCE';
  columnMap: HRColumnMap;
  detectedCols: Record<string, boolean>;
  summary: HRSummary;
  rawRows: any[];
}

/** Map raw columns to HR standard keys */
export function buildHRColumnMap(rawCols: string[]): HRColumnMap {
  const map: HRColumnMap = {};
  rawCols.forEach((raw) => {
    const norm = normalizeCol(raw);
    map[raw] = HR_ALIAS[norm] ?? raw;
  });
  return map;
}

/** Count distinct values in a column, returning sorted array */
function countByField(rows: any[], field: string): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    const val = row[field];
    if (val === null || val === undefined || val === '') return;
    const key = val.toString().trim();
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function safeNum(val: any): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Main HR analytics computation */
export function analyzeHRData(
  rawRows: any[],
  columnMap: HRColumnMap
): HRAnalyticsResult {
  // Remap rows to standard HR keys
  const mapped = rawRows.map((row) => {
    const r: Record<string, any> = {};
    Object.entries(row).forEach(([raw, val]) => {
      const std = columnMap[raw] ?? raw;
      // Keep first mapping (avoid overwrite)
      if (!(std in r)) r[std] = val;
    });
    return r;
  });

  const detectedCols: Record<string, boolean> = {};
  const stdKeys = Object.values(columnMap);
  const uniqueStdKeys = [...new Set(stdKeys)];
  uniqueStdKeys.forEach((k) => {
    const hasVal = mapped.some(
      (r) => r[k] !== null && r[k] !== undefined && r[k] !== ''
    );
    detectedCols[k] = hasVal;
  });

  const totalEmployees = mapped.length;

  // Active / Inactive
  let activeCount = totalEmployees;
  let inactiveCount = 0;
  if (detectedCols['employment_status']) {
    const active = mapped.filter((r) => {
      const s = (r['employment_status'] ?? '').toString().toLowerCase();
      return s.includes('active') || s.includes('hoat dong') || s === '1' || s === 'yes';
    });
    activeCount = active.length;
    inactiveCount = totalEmployees - activeCount;
  }

  // Attrition
  let attritionCount = 0;
  let attritionRate: number | null = null;
  if (detectedCols['attrition']) {
    const attrited = mapped.filter((r) => {
      const v = (r['attrition'] ?? '').toString().toLowerCase();
      return v === 'yes' || v === '1' || v === 'true' || v === 'left';
    });
    attritionCount = attrited.length;
    attritionRate = totalEmployees > 0 ? (attritionCount / totalEmployees) * 100 : null;
  } else if (inactiveCount > 0) {
    attritionCount = inactiveCount;
    attritionRate = totalEmployees > 0 ? (inactiveCount / totalEmployees) * 100 : null;
  }

  // Average Age
  let avgAge: number | null = null;
  if (detectedCols['age']) {
    const ages = mapped.map((r) => safeNum(r['age'])).filter((v) => v !== null) as number[];
    if (ages.length > 0) avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
  }

  // Average Tenure
  let avgTenureYears: number | null = null;
  if (detectedCols['hire_date']) {
    const now = new Date();
    const tenures = mapped
      .map((r) => {
        const d = parseCleanDate(r['hire_date']);
        if (!d) return null;
        return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      })
      .filter((v) => v !== null && v >= 0 && v < 60) as number[];
    if (tenures.length > 0) {
      avgTenureYears = tenures.reduce((a, b) => a + b, 0) / tenures.length;
    }
  }

  // High Flight Risk employees
  const HIGH_RISK_VALUES = ['high', 'cao', '3', 'yes', 'true'];
  const highFlightRisk = detectedCols['flight_risk']
    ? mapped
        .filter((r) => {
          const v = (r['flight_risk'] ?? '').toString().toLowerCase().trim();
          return HIGH_RISK_VALUES.includes(v);
        })
        .slice(0, 20)
    : [];

  const summary: HRSummary = {
    totalEmployees,
    activeCount,
    inactiveCount,
    attritionCount,
    attritionRate,
    avgAge: avgAge !== null ? Math.round(avgAge * 10) / 10 : null,
    avgTenureYears: avgTenureYears !== null ? Math.round(avgTenureYears * 10) / 10 : null,
    byBusinessUnit: detectedCols['business_unit'] ? countByField(mapped, 'business_unit') : [],
    byDepartment: detectedCols['department'] ? countByField(mapped, 'department') : [],
    byTeam: detectedCols['team'] ? countByField(mapped, 'team') : [],
    byGender: detectedCols['gender'] ? countByField(mapped, 'gender') : [],
    byLocation: detectedCols['location'] ? countByField(mapped, 'location') : [],
    byJobLevel: detectedCols['job_level'] ? countByField(mapped, 'job_level') : [],
    byPerformance: detectedCols['performance'] ? countByField(mapped, 'performance') : [],
    byPotential: detectedCols['potential'] ? countByField(mapped, 'potential') : [],
    byFlightRisk: detectedCols['flight_risk'] ? countByField(mapped, 'flight_risk') : [],
    highFlightRisk,
  };

  return {
    datasetType: 'HR_WORKFORCE',
    columnMap,
    detectedCols,
    summary,
    rawRows: mapped,
  };
}

/** Build Gemini payload for HR report */
export function compileHRGeminiPayload(result: HRAnalyticsResult, originalColumnMap: HRColumnMap) {
  const { summary, detectedCols } = result;
  const columns = Object.entries(originalColumnMap).map(([original, mapped]) => ({
    original,
    mapped,
  }));

  const summaryText = `
Tổng số nhân sự: ${summary.totalEmployees}
Đang làm việc (Active): ${summary.activeCount}
Đã nghỉ / Inactive: ${summary.inactiveCount}
Số nhân sự nghỉ việc (Attrition): ${summary.attritionCount}
Tỷ lệ nghỉ việc: ${summary.attritionRate !== null ? summary.attritionRate.toFixed(1) + '%' : 'Không có dữ liệu'}
Độ tuổi trung bình: ${summary.avgAge !== null ? summary.avgAge : 'Không có dữ liệu'}
Thâm niên trung bình: ${summary.avgTenureYears !== null ? summary.avgTenureYears.toFixed(1) + ' năm' : 'Không có dữ liệu'}
`.trim();

  const formatBreakdown = (arr: { name: string; count: number }[]) =>
    arr.slice(0, 8).map((x) => `${x.name}: ${x.count}`).join(', ') || 'Không có dữ liệu';

  const sampleRows = result.rawRows.slice(0, 5).map((row) => {
    const r: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      if (v instanceof Date) r[k] = v.toISOString().split('T')[0];
      else r[k] = v;
    });
    return r;
  });

  const highRiskSample = summary.highFlightRisk.slice(0, 5).map((r) => {
    const fields: Record<string, any> = {};
    ['emp_id', 'department', 'job_level', 'performance', 'potential', 'flight_risk'].forEach((k) => {
      if (r[k] !== undefined) fields[k] = r[k];
    });
    return fields;
  });

  return {
    datasetType: 'HR_WORKFORCE',
    columns,
    rowCount: summary.totalEmployees,
    summary: {
      summaryText,
      byBusinessUnit: formatBreakdown(summary.byBusinessUnit),
      byDepartment: formatBreakdown(summary.byDepartment),
      byTeam: formatBreakdown(summary.byTeam),
      byGender: formatBreakdown(summary.byGender),
      byLocation: formatBreakdown(summary.byLocation),
      byJobLevel: formatBreakdown(summary.byJobLevel),
      byPerformance: formatBreakdown(summary.byPerformance),
      byPotential: formatBreakdown(summary.byPotential),
      byFlightRisk: formatBreakdown(summary.byFlightRisk),
      highRiskEmployees: JSON.stringify(highRiskSample),
    },
    sampleRows,
  };
}
