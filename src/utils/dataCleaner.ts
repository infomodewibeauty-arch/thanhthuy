/**
 * Data Cleaning Utility
 * Normalizes headers, cleans numeric/date fields, and drops empty rows
 */

// Direct translation keys for internal usage
export type StandardColumnKey =
  | 'revenue'
  | 'cost'
  | 'profit'
  | 'date'
  | 'product'
  | 'customer'
  | 'employee'
  | 'department'
  | 'region'
  | 'order';

// Synonyms map (all values must be normalized: lowercased, spaces trimmed, Vietnamese accents removed)
const SYNONYMS_MAP: Record<StandardColumnKey, string[]> = {
  revenue: ['doanh thu', 'revenue', 'sales', 'amount', 'total amount', 'tien', 'thanh tien', 'doanhthu', 'thu nhap', 'thunhap'],
  cost: ['chi phi', 'cost', 'expense', 'expenses', 'chiphi', 'gia von', 'giavon', 'chi tieu', 'chitieu'],
  profit: ['loi nhuan', 'profit', 'margin', 'gain', 'loinhuan', 'lai', 'tien lai'],
  date: ['ngay', 'date', 'time', 'created at', 'ngaytao', 'created_at', 'timestamp', 'ngay ban', 'ngayban', 'thoi gian', 'thoigian'],
  product: ['san pham', 'product', 'item', 'sku', 'sanpham', 'hang hoa', 'hanghoa', 'ten hang', 'tenhang'],
  customer: ['khach hang', 'customer', 'client', 'khachhang', 'ten khach hang', 'tenkhachhang', 'nguoi mua', 'nguoimua'],
  employee: ['nhan vien', 'employee', 'staff', 'salesperson', 'nhanvien', 'salesman', 'nguoi ban', 'nguoiban'],
  department: ['phong ban', 'department', 'team', 'phongban', 'bo phan', 'bophan'],
  region: ['khu vuc', 'region', 'area', 'location', 'khuvuc', 'tinh thanh', 'tinhthanh', 'dia chi', 'diachi'],
  order: ['don hang', 'order', 'order id', 'invoice', 'donhang', 'ma don', 'madon', 'ma don hang', 'madonhang', 'so don', 'sodon']
};

/**
 * Remove Vietnamese accents and convert to lowercase for easy matching
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s_]/g, ' ') // replace special chars with space
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Cleans a value representing currency/number
 */
export function parseCleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  
  // Convert to string and clean
  let str = val.toString().trim();
  if (!str) return null;

  // Handle percentages (e.g. 15% -> 0.15)
  const isPercent = str.endsWith('%');
  if (isPercent) {
    str = str.replace('%', '');
  }

  // Remove currency symbols and common spacing
  // e.g. "1.234.567 đ" or "$ 1,234.56"
  str = str.replace(/[đ$₫€¥\s]/gi, '');
  
  // Decide decimal separator (Windows standard varies: 1.234,56 vs 1,234.56)
  // If it contains dots and a comma (e.g. 1.234,56), replace dots with empty and comma with dot
  if (str.includes('.') && str.includes(',')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '').replace('.', '.');
    }
  } else if (str.includes(',')) {
    // If it contains comma but no dot
    // If it looks like 1,234 (thousands separator) vs 12,34 (decimal)
    // Let's count characters after the comma
    const parts = str.split(',');
    if (parts[parts.length - 1].length === 3) {
      // Thousands separator
      str = str.replace(/,/g, '');
    } else {
      // Decimal separator
      str = str.replace(',', '.');
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;
  
  return isPercent ? num / 100 : num;
}

/**
 * Parses date robustly
 */
export function parseCleanDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // If Excel serial number (e.g. 45261)
  if (typeof val === 'number') {
    // Excel base date is Dec 30, 1899 (due to Excel leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const msInDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + val * msInDay);
    return isNaN(date.getTime()) ? null : date;
  }

  const str = val.toString().trim();
  if (!str) return null;

  // Try standard parsing
  let date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  // Try custom parsing for DD/MM/YYYY or YYYY-MM-DD
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Normalizes Excel row keys and cleans cell values
 */
export function cleanExcelData(rawRows: any[]): {
  cleanRows: any[];
  columnMapping: Record<string, StandardColumnKey | string>;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (rawRows.length === 0) {
    return { cleanRows: [], columnMapping: {}, warnings: ['Dữ liệu trống.'] };
  }

  // 1. Determine Column Mapping
  // Get all unique keys from rawRows
  const allKeys = new Set<string>();
  rawRows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      if (k !== null && k !== undefined) allKeys.add(k);
    });
  });

  const columnMapping: Record<string, StandardColumnKey | string> = {};
  const mappedStandardKeys = new Set<StandardColumnKey>();

  allKeys.forEach((rawKey) => {
    const normalizedKey = normalizeString(rawKey);
    let matched = false;

    // Search for a matching synonym key
    for (const [standardKey, synonyms] of Object.entries(SYNONYMS_MAP) as [StandardColumnKey, string[]][]) {
      if (synonyms.includes(normalizedKey)) {
        columnMapping[rawKey] = standardKey;
        mappedStandardKeys.add(standardKey);
        matched = true;
        break;
      }
    }

    if (!matched) {
      columnMapping[rawKey] = rawKey; // Map to itself if no synonym matches
    }
  });

  // Check critical columns missing and generate warnings
  if (!mappedStandardKeys.has('revenue')) {
    warnings.push('Chưa tìm thấy cột doanh thu. Hệ thống vẫn hiển thị bảng dữ liệu nhưng một số KPI tài chính sẽ bị ẩn.');
  }
  if (!mappedStandardKeys.has('date')) {
    warnings.push('Chưa tìm thấy cột ngày tháng. Phân tích xu hướng theo thời gian sẽ bị hạn chế.');
  }

  // 2. Clean data row by row
  const cleanRows: any[] = [];

  rawRows.forEach((row) => {
    // Check if row is completely empty (all values null/empty)
    const values = Object.values(row);
    const isEmpty = values.every((v) => v === null || v === undefined || v.toString().trim() === '');
    if (isEmpty) return; // Skip empty rows

    const cleanedRow: Record<string, any> = {};

    Object.entries(row).forEach(([rawKey, val]) => {
      const mappedKey = columnMapping[rawKey];
      
      // Clean values based on mapped key type
      if (mappedKey === 'revenue' || mappedKey === 'cost' || mappedKey === 'profit') {
        cleanedRow[mappedKey] = parseCleanNumber(val);
      } else if (mappedKey === 'date') {
        cleanedRow[mappedKey] = parseCleanDate(val);
      } else {
        // String columns or other unmapped columns
        if (val === null || val === undefined) {
          cleanedRow[mappedKey] = null;
        } else {
          cleanedRow[mappedKey] = val.toString().trim();
        }
      }
    });

    cleanRows.push(cleanedRow);
  });

  return {
    cleanRows,
    columnMapping,
    warnings
  };
}
