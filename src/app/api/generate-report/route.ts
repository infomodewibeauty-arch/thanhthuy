import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Prompt builders per dataset type ─────────────────────────────────────

function buildHRPrompt(body: any): string {
  const { rowCount, summary, columns, sampleRows } = body;
  const colList = (columns as any[]).map((c: any) => `- "${c.original}" → ${c.mapped}`).join('\n');
  return `
Bạn là chuyên gia phân tích nhân sự (HR Analytics Expert) cấp cao với hơn 15 năm kinh nghiệm.
Dựa trên dữ liệu Workforce/HR dưới đây, hãy viết báo cáo phân tích nhân sự toàn diện bằng tiếng Việt.

═══ DỮ LIỆU TỔNG QUAN ═══
${summary.summaryText}

Cơ cấu theo Business Unit: ${summary.byBusinessUnit}
Cơ cấu theo Phòng ban: ${summary.byDepartment}
Cơ cấu theo Team: ${summary.byTeam}
Cơ cấu theo Giới tính: ${summary.byGender}
Cơ cấu theo Địa điểm: ${summary.byLocation}
Cơ cấu theo Job Level: ${summary.byJobLevel}
Phân bổ Performance: ${summary.byPerformance}
Phân bổ Potential: ${summary.byPotential}
Phân bổ Flight Risk: ${summary.byFlightRisk}
Nhân sự Flight Risk cao: ${summary.highRiskEmployees}

Mapping cột dữ liệu:
${colList}

Mẫu dữ liệu (5 dòng):
${JSON.stringify(sampleRows, null, 2)}

═══ YÊU CẦU BÁO CÁO ═══
Viết báo cáo phân tích nhân sự chuyên nghiệp, bằng tiếng Việt, định dạng Markdown, bao gồm:

## 1. Tổng quan lực lượng lao động
- Quy mô tổ chức, tỷ lệ nhân sự đang làm việc vs đã nghỉ

## 2. Cơ cấu tổ chức
- Phân bổ theo Business Unit, Department, Team, Location, Job Level

## 3. Đa dạng & Hòa nhập (Diversity & Inclusion)
- Cơ cấu giới tính, độ tuổi, thâm niên

## 4. Phân tích Hiệu suất & Tiềm năng
- Phân bổ Performance, Potential. Xác định nhóm High Performance / High Potential

## 5. Rủi ro nghỉ việc (Flight Risk & Attrition)
- Tỷ lệ nghỉ việc, phân bổ Flight Risk, nhân sự rủi ro cao cần chú ý

## 6. Điểm mạnh của tổ chức
- Những điểm tích cực về cơ cấu nhân sự

## 7. Vấn đề cần chú ý & rủi ro
- Các điểm yếu, bất cân bằng hoặc rủi ro trong cơ cấu nhân sự

## 8. Đề xuất hành động cho HR Manager
- Ít nhất 5 hành động cụ thể, có thể thực hiện ngay

## 9. Kết luận dành cho Ban lãnh đạo
- Thông điệp cốt lõi và 3 ưu tiên chiến lược nhân sự

Hãy tham chiếu trực tiếp vào các con số, tên phòng ban, tỷ lệ cụ thể từ dữ liệu trên.
`.trim();
}

function buildSalesPrompt(body: any): string {
  const { rowCount, summary, columns, sampleRows } = body;
  const colList = (columns as any[]).map((c: any) => `- "${c.original}" → ${c.mapped}`).join('\n');
  return `
Bạn là chuyên gia phân tích kinh doanh (Business Analyst) cấp cao với tầm nhìn chiến lược.
Dựa trên dữ liệu kinh doanh/tài chính dưới đây, hãy viết báo cáo phân tích toàn diện bằng tiếng Việt.

═══ DỮ LIỆU KINH DOANH ═══
Tổng số dòng: ${rowCount}
${summary.financeText}

Top sản phẩm: ${summary.topProducts}
Top khách hàng: ${summary.topCustomers}
Top nhân viên: ${summary.topEmployees}
Theo phòng ban: ${summary.departments}
Theo khu vực: ${summary.regions}
Xu hướng thời gian: ${summary.trends}

Mapping cột:
${colList}

Mẫu dữ liệu:
${JSON.stringify(sampleRows, null, 2)}

═══ YÊU CẦU BÁO CÁO ═══
Viết báo cáo phân tích kinh doanh chuyên nghiệp bằng tiếng Việt, định dạng Markdown:

## 1. Tổng quan dữ liệu
## 2. Các chỉ số KPI nổi bật
## 3. Xu hướng theo thời gian
## 4. Phân tích sản phẩm & khách hàng
## 5. Điểm mạnh
## 6. Điểm yếu & rủi ro
## 7. Cơ hội cải thiện
## 8. Đề xuất hành động cụ thể
## 9. Kết luận cho Ban lãnh đạo
`.trim();
}

function buildGenericPrompt(body: any): string {
  const { rowCount, summary, columns, sampleRows } = body;
  const colList = (columns as any[]).map((c: any) => `- "${c.original}" (${c.mapped})`).join('\n');
  return `
Bạn là chuyên gia phân tích dữ liệu (Data Analyst). Hãy phân tích bộ dữ liệu sau và viết báo cáo bằng tiếng Việt.

═══ THÔNG TIN DATASET ═══
${summary.overviewText}

Chi tiết các cột:
${summary.columnDetails}

Các cột:
${colList}

Mẫu dữ liệu:
${JSON.stringify(sampleRows, null, 2)}

═══ YÊU CẦU BÁO CÁO ═══
Viết báo cáo phân tích dữ liệu bằng tiếng Việt, định dạng Markdown:

## 1. Tổng quan bộ dữ liệu
## 2. Chất lượng dữ liệu (missing values, anomalies)
## 3. Phân tích từng cột quan trọng
## 4. Phân phối và xu hướng nổi bật
## 5. Phát hiện bất thường (nếu có)
## 6. Đề xuất bước phân tích tiếp theo
## 7. Kết luận
`.trim();
}

// ─── Model fallback chain ─────────────────────────────────────────────────
const MODEL_CHAIN = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey: bodyApiKey, datasetType } = body;

    const apiKey = (bodyApiKey as string)?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa có Gemini API Key. Vui lòng nhập API Key trong tab "Báo cáo AI".' },
        { status: 400 }
      );
    }

    // Build prompt based on dataset type
    let prompt: string;
    if (datasetType === 'HR_WORKFORCE') {
      prompt = buildHRPrompt(body);
    } else if (datasetType === 'SALES_FINANCE') {
      prompt = buildSalesPrompt(body);
    } else {
      prompt = buildGenericPrompt(body);
    }

    // Try models in sequence
    const genAI = new GoogleGenerativeAI(apiKey);
    let text = '';
    let lastError: any = null;

    for (const modelName of MODEL_CHAIN) {
      try {
        console.log(`[Gemini] Trying model: ${modelName} for dataset type: ${datasetType}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        text = result.response.text();
        if (text) {
          console.log(`[Gemini] Success: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err.message ?? '';
        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[Gemini] Quota exceeded on ${modelName}, trying next...`);
          continue;
        }
        throw err;
      }
    }

    if (!text) {
      throw lastError || new Error('Tất cả mô hình AI đều không khả dụng.');
    }

    return NextResponse.json({ report: text });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    let msg = error.message ?? 'Lỗi kết nối API.';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      msg = 'API Key không hợp lệ. Vui lòng kiểm tra tại https://aistudio.google.com/app/apikey';
    } else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      msg = 'Đã vượt giới hạn miễn phí. Vui lòng thử lại ngày mai hoặc kích hoạt billing.';
    } else if (msg.includes('404')) {
      msg = 'Mô hình AI không tìm thấy. Vui lòng liên hệ hỗ trợ.';
    }
    return NextResponse.json({ error: `Không thể tạo báo cáo: ${msg}` }, { status: 500 });
  }
}
