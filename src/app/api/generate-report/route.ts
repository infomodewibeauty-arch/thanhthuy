import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse Request Body
    const body = await req.json();
    const { columns, rowCount, summary, detectedMetrics, sampleRows, chartInsights, apiKey: bodyApiKey } = body;

    // 2. Resolve API Key — prefer request body (user-supplied) over env var
    const apiKey = (bodyApiKey as string)?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa có Gemini API Key. Vui lòng nhập API Key trong tab "Báo cáo AI" của ứng dụng.' },
        { status: 400 }
      );
    }

    if (!rowCount || !columns) {
      return NextResponse.json(
        { error: 'Dữ liệu đầu vào không hợp lệ hoặc thiếu.' },
        { status: 400 }
      );
    }

    // 3. Construct Prompt
    const prompt = `
Hãy đóng vai một chuyên gia phân tích kinh doanh (Business Analyst) chuyên nghiệp và có tầm nhìn chiến lược.
Dựa trên dữ liệu tóm tắt từ file Excel được tải lên dưới đây, hãy viết một báo cáo phân tích chi tiết bằng tiếng Việt.

DỮ LIỆU TÓM TẮT:
- Tổng số dòng dữ liệu: ${rowCount}
- Các chỉ số tài chính và hoạt động chính:
${summary.financeText}

- Danh sách các cột dữ liệu được ánh xạ:
${columns.map((c: any) => `- Cột gốc "${c.original}" được hiểu là "${c.mapped}"`).join('\n')}

- Top 5 sản phẩm bán chạy nhất (nếu có):
${summary.topProducts}

- Top 5 khách hàng hàng đầu (nếu có):
${summary.topCustomers}

- Top 5 nhân viên xuất sắc nhất (nếu có):
${summary.topEmployees}

- Phân tích theo Phòng ban (nếu có):
${summary.departments}

- Phân tích theo Khu vực (nếu có):
${summary.regions}

- Xu hướng kinh doanh theo thời gian (nếu có):
${summary.trends}

- 5 dòng dữ liệu mẫu để tham khảo cấu trúc:
${JSON.stringify(sampleRows, null, 2)}

Yêu cầu báo cáo phải sử dụng ngôn ngữ Tiếng Việt, mang tính chuyên nghiệp cao, súc tích và có cấu trúc rõ ràng bằng định dạng Markdown. Báo cáo bắt buộc phải bao gồm đầy đủ các phần sau:
1. **Tổng quan dữ liệu**: Mô tả ngắn gọn về quy mô dữ liệu, chất lượng dữ liệu và các cột được phân tích.
2. **Các chỉ số nổi bật**: Nhấn mạnh các KPI quan trọng (Doanh thu, Chi phí, Lợi nhuận, Tỷ suất lợi nhuận, Đơn hàng, v.v.). Nhận xét xem các chỉ số có tốt không.
3. **Xu hướng chính**: Phân tích xu hướng phát triển theo thời gian (ngày, tháng) hoặc theo các nhóm hàng/khu vực.
4. **Điểm mạnh**: Những mặt tích cực hoặc điểm sáng trong hoạt động kinh doanh (sản phẩm bán tốt, khách hàng lớn, nhân viên xuất sắc, khu vực tăng trưởng cao).
5. **Điểm yếu**: Những điểm sụt giảm hoặc tỷ lệ chi phí quá cao cần lưu ý.
6. **Rủi ro hoặc bất thường trong dữ liệu**: Cảnh báo các biến động đột biến, chi phí vượt kiểm soát, tỷ suất lợi nhuận âm hoặc các dấu hiệu rủi ro khác trong số liệu.
7. **Cơ hội cải thiện**: Những điểm có thể tối ưu hóa quy trình, tăng doanh thu hoặc cắt giảm chi phí.
8. **Đề xuất hành động cụ thể**: Các bước hành động chi tiết và thực tế dành cho các phòng ban hoặc nhà quản lý.
9. **Kết luận dành cho nhà quản lý**: Tóm tắt thông điệp cốt lõi và khuyến nghị quan trọng nhất để ban giám đốc ra quyết định nhanh.

Hãy trình bày báo cáo bằng định dạng Markdown đẹp mắt, có cấu trúc tốt, sử dụng tiêu đề, danh sách gạch đầu dòng và bảng biểu (nếu cần thiết) để báo cáo dễ đọc, trực quan. Tránh viết chung chung, hãy tham chiếu trực tiếp đến các con số cụ thể và tên sản phẩm/khách hàng/khu vực xuất hiện trong dữ liệu tóm tắt trên.
`;

    // 4. Call Gemini API with model fallback chain
    // Try models in order — free-tier compatible first
    const MODEL_FALLBACK_CHAIN = [
      'gemini-2.0-flash-lite',   // lightest, most free-tier friendly
      'gemini-1.5-flash',        // standard free-tier model
      'gemini-1.5-flash-8b',     // smallest 1.5 variant
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    let text = '';
    let lastError: any = null;

    for (const modelName of MODEL_FALLBACK_CHAIN) {
      try {
        console.log(`[Gemini] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        if (text) {
          console.log(`[Gemini] Success with model: ${modelName}`);
          break; // success — stop trying
        }
      } catch (err: any) {
        lastError = err;
        const errMsg: string = err.message || '';
        // Only continue to next model on quota/rate-limit errors
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[Gemini] Model ${modelName} quota exceeded, trying next...`);
          continue;
        }
        // For other errors (invalid key, network, etc.) — throw immediately
        throw err;
      }
    }

    if (!text) {
      // All models exhausted
      throw lastError || new Error('Tất cả các mô hình AI đều không khả dụng.');
    }

    // 5. Return Response
    return NextResponse.json({ report: text });
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    // Provide helpful error messages for common API issues
    let msg = error.message || 'Lỗi kết nối API.';
    if (msg.includes('API_KEY_INVALID') || msg.includes('400 Bad Request') || msg.includes('API key not valid')) {
      msg = 'API Key không hợp lệ. Vui lòng kiểm tra lại key tại https://aistudio.google.com/app/apikey';
    } else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      msg = 'Tài khoản Google AI của bạn đã vượt giới hạn miễn phí hôm nay. Vui lòng thử lại vào ngày mai hoặc kích hoạt billing tại https://ai.google.dev/pricing';
    } else if (msg.includes('404')) {
      msg = 'Mô hình AI không tìm thấy. Vui lòng liên hệ hỗ trợ.';
    }
    return NextResponse.json(
      { error: `Không thể tạo báo cáo AI. ${msg}` },
      { status: 500 }
    );
  }
}
