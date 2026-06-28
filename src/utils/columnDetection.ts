/**
 * columnDetection.ts
 * Detects dataset type by analyzing column headers.
 * Returns: 'HR_WORKFORCE' | 'SALES_FINANCE' | 'GENERIC'
 */

export type DatasetType = 'HR_WORKFORCE' | 'SALES_FINANCE' | 'GENERIC';

/** Remove accents, lowercase, collapse spaces */
export function normalizeCol(str: string): string {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9_\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─── HR / Workforce signal columns ───────────────────────────────────────────
const HR_SIGNALS: string[] = [
  'emp_id', 'employee_id', 'employeeid', 'empid',
  'hire_date', 'hiredate', 'joining_date', 'joiningdate',
  'job_level', 'joblevel', 'job_grade', 'jobgrade',
  'flight_risk', 'flightrisk', 'attrition', 'attrition_flag',
  'performance', 'performance_rating', 'performancerating',
  'potential', 'potential_rating', 'potentialrating',
  'business_unit', 'businessunit', 'business unit',
  'employment_status', 'employmentstatus', 'emp_status', 'empstatus',
  'headcount', 'manager_id', 'managerid', 'manager id',
  'gender', 'ethnicity', 'age', 'tenure',
];

// ─── Sales / Finance signal columns ─────────────────────────────────────────
const SALES_SIGNALS: string[] = [
  'revenue', 'doanh_thu', 'doanthu', 'sales', 'amount',
  'total_amount', 'totalamount', 'thanh_tien', 'thanhtien',
  'profit', 'loi_nhuan', 'loinhuan', 'margin',
  'cost', 'chi_phi', 'chiphi', 'expense', 'expenses',
  'invoice', 'order_id', 'orderid', 'order id',
  'quantity', 'so_luong', 'soluong',
  'unit_price', 'unitprice', 'don_gia', 'dongia',
  'customer', 'khach_hang', 'khachhang', 'client',
  'product', 'san_pham', 'sanpham', 'item', 'sku',
];

/**
 * Scores how many signal columns match, returns type with highest score.
 * Requires at least 2 HR signals to classify as HR_WORKFORCE (to avoid false positives).
 */
export function detectDatasetType(rawColumns: string[]): DatasetType {
  const normalized = rawColumns.map(normalizeCol);

  let hrScore = 0;
  let salesScore = 0;

  normalized.forEach((col) => {
    if (HR_SIGNALS.includes(col)) hrScore++;
    if (SALES_SIGNALS.includes(col)) salesScore++;
  });

  // Also check partial matches (column contains signal keyword)
  normalized.forEach((col) => {
    if (!HR_SIGNALS.includes(col)) {
      const hrPartial = HR_SIGNALS.some(
        (s) => col.includes(s) || s.includes(col.replace(/_/g, ''))
      );
      if (hrPartial) hrScore += 0.5;
    }
    if (!SALES_SIGNALS.includes(col)) {
      const salesPartial = SALES_SIGNALS.some(
        (s) => col.includes(s) || s.includes(col.replace(/_/g, ''))
      );
      if (salesPartial) salesScore += 0.5;
    }
  });

  if (hrScore >= 2 && hrScore > salesScore) return 'HR_WORKFORCE';
  if (salesScore >= 2 && salesScore > hrScore) return 'SALES_FINANCE';
  if (hrScore >= 2) return 'HR_WORKFORCE';
  if (salesScore >= 2) return 'SALES_FINANCE';
  return 'GENERIC';
}

/** Returns Vietnamese label for dataset type */
export function datasetTypeLabel(type: DatasetType): string {
  switch (type) {
    case 'HR_WORKFORCE': return 'Nhân sự / Workforce';
    case 'SALES_FINANCE': return 'Kinh doanh / Tài chính';
    case 'GENERIC': return 'Dữ liệu tổng hợp';
  }
}
