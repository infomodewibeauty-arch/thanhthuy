import * as XLSX from 'xlsx';

export interface ParsedExcelResult {
  sheetNames: string[];
  selectedSheet: string;
  data: any[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Parses an Excel or CSV file client-side using SheetJS
 * @param file The file object from input or drag-and-drop
 * @param sheetName Optional specific sheet name to read (defaults to the first sheet)
 */
export async function parseExcelFile(file: File, sheetName?: string): Promise<ParsedExcelResult> {
  return new Promise((resolve, reject) => {
    // 1. Validation
    if (!file) {
      return reject(new Error('Vui lòng chọn hoặc kéo thả một file dữ liệu.'));
    }

    if (file.size > MAX_FILE_SIZE) {
      return reject(new Error('File quá lớn. Vui lòng upload file dưới 10MB.'));
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['xlsx', 'xls', 'csv'];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      return reject(new Error('Không đọc được file. Vui lòng kiểm tra lại định dạng (hỗ trợ .xlsx, .xls, .csv).'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          return reject(new Error('Không thể đọc nội dung file.'));
        }

        // Parse workbook
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true, // Auto-parse dates
          cellNF: false,
          cellText: false
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error('File không có sheet dữ liệu nào hoặc bị hỏng.'));
        }

        const sheetNames = workbook.SheetNames;
        // Default to first sheet if not specified
        const targetSheetName = sheetName || sheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];

        if (!worksheet) {
          return reject(new Error(`Không tìm thấy sheet "${targetSheetName}" trong file.`));
        }

        // Convert worksheet to JSON (header: 1 returns array of arrays, default returns array of objects)
        // We use defval: null to preserve columns with missing values in row-by-row objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: null,
          raw: true
        });

        if (rawJson.length === 0) {
          return reject(new Error('File không có dữ liệu hợp lệ (sheet rỗng).'));
        }

        resolve({
          sheetNames,
          selectedSheet: targetSheetName,
          data: rawJson
        });
      } catch (error: any) {
        console.error('SheetJS parse error:', error);
        reject(new Error('Không đọc được file. Vui lòng kiểm tra lại định dạng.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi trong quá trình đọc file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
