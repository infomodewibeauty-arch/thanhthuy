# Excel AI Analytics Dashboard

Web app cho phép tải lên file Excel hoặc CSV, tự động đọc dữ liệu cục bộ tại client, trực quan hóa bằng dashboard KPI & biểu đồ trực quan, và tự động sinh báo cáo phân tích kinh doanh chuyên sâu bằng Google Gemini API.

Giao diện được thiết kế với phong cách hiện đại (Sleek Dark Mode, Glassmorphism, Ambient Glow) phục vụ cho chủ doanh nghiệp, bộ phận kinh doanh, nhân sự, kế toán và quản lý vận hành.

---

## 📂 Cấu trúc thư mục dự án

```text
excel-ai-analytics/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate-report/
│   │   │       └── route.ts         # Endpoint gọi API Google Gemini
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Giao diện chính phối hợp các tab
│   │   └── globals.css              # CSS với Glassmorphic & Custom Theme
│   ├── components/
│   │   ├── UploadZone.tsx           # Khu vực kéo thả file & cảnh báo bảo mật
│   │   ├── KPICards.tsx             # Các thẻ chỉ số KPI tài chính/vận hành
│   │   ├── ChartSection.tsx         # Trực quan hóa biểu đồ động bằng Recharts
│   │   ├── DataTable.tsx            # Bảng hiển thị (sắp xếp, tìm kiếm, phân trang)
│   │   └── AIReport.tsx             # Panel sinh và hiển thị báo cáo AI
│   └── utils/
│       ├── excelParser.ts           # Đọc file client-side bằng SheetJS
│       ├── dataCleaner.ts           # Chuẩn hóa tên cột & lọc dòng rỗng
│       └── analyticsEngine.ts       # Tính toán KPI & chuẩn bị payload Gemini
├── .env.example                     # Tệp biến môi trường mẫu
├── .env.local                       # Tệp chứa API Key cục bộ (đã bỏ qua git)
├── package.json                     # Quản lý các dependency
├── tailwind.config.ts               # Cấu hình Tailwind CSS
└── tsconfig.json                    # Cấu hình TypeScript
```

---

## 🛠️ Hướng dẫn cài đặt và chạy cục bộ (Local)

### Yêu cầu hệ thống
- Đã cài đặt **Node.js** (Phiên bản v18 trở lên được khuyến nghị. Bản v20.11.1 được tích hợp sẵn ở thư mục `scratch/node-portable`).

### Bước 1: Khởi động Terminal và cấu hình Path Node.js
Nếu bạn đang sử dụng phiên bản Node.js có sẵn trong thư mục portable:
```powershell
$env:PATH = "C:\Users\DELL\.gemini\antigravity\scratch\node-portable\node-v20.11.1-win-x64;" + $env:PATH
```

### Bước 2: Cài đặt các gói thư viện
Di chuyển vào thư mục dự án và cài đặt dependencies:
```bash
cd C:\Users\DELL\.gemini\antigravity\scratch\excel-ai-analytics
npm install
```

### Bước 3: Cấu hình khóa API Google Gemini
1. Tạo một khóa API tại [Google AI Studio](https://aistudio.google.com/).
2. Đổi tên tệp `.env.example` thành `.env.local` hoặc chỉnh sửa trực tiếp `.env.local` ở gốc thư mục:
```text
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY
```

### Bước 4: Chạy server chạy thử nghiệm (Development)
Khởi động dev server:
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Hướng dẫn đóng gói Production

Để tạo bản build tối ưu hóa hiệu năng phục vụ chạy thực tế:
```bash
npm run build
```

Sau khi build thành công, bạn có thể chạy thử bản production cục bộ bằng lệnh:
```bash
npm run start
```

---

## 🚀 Hướng dẫn deploy lên môi trường Cloud

### Phương án 1: Deploy lên Vercel (Khuyến nghị)
Next.js được phát triển bởi Vercel, vì thế việc deploy lên Vercel cực kỳ đơn giản và miễn phí:
1. Đăng ký tài khoản trên [Vercel](https://vercel.com).
2. Cài đặt Vercel CLI toàn cục (hoặc dùng `npx`):
   ```bash
   npm install -g vercel
   ```
3. Chạy lệnh deploy ở thư mục dự án:
   ```bash
   vercel
   ```
4. Làm theo hướng dẫn trên màn hình để liên kết dự án.
5. **Quan trọng:** Vào trang thiết lập dự án trên Dashboard của Vercel (Settings > Environment Variables) và thêm biến:
   - Key: `GEMINI_API_KEY`
   - Value: `<Khóa API Gemini của bạn>`
6. Deploy lên production:
   ```bash
   vercel --prod
   ```

### Phương án 2: Deploy lên Firebase Hosting
Vì ứng dụng có một API Route động (`/api/generate-report`), bạn cần kết hợp Firebase Hosting với Firebase Functions hoặc Cloud Run để hỗ trợ server-side.
1. Cài đặt Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Đăng nhập và khởi tạo dự án:
   ```bash
   firebase login
   firebase init hosting
   ```
3. Cấu hình Firebase Hosting để chuyển hướng các yêu cầu `/api/*` tới một Cloud Function xử lý Next.js Serverless. (Chi tiết tham khảo tài liệu Firebase Next.js integration).

---

## 📝 Checklist kiểm thử trước khi sử dụng

Để đảm bảo dashboard hoạt động hoàn hảo với các file Excel thực tế, bạn có thể chạy thử các trường hợp kiểm thử sau:

- [ ] **File đúng chuẩn:** File Excel chứa đầy đủ các cột Ngày, Doanh thu, Chi phí, Sản phẩm, Khách hàng để kiểm tra việc vẽ tất cả 6 biểu đồ và tính toán đầy đủ KPI tài chính.
- [ ] **File thiếu cột:** Upload file chỉ có cột ngày và số lượng. Hệ thống sẽ phát ra cảnh báo màu vàng ở đầu trang báo thiếu cột doanh thu/chi phí nhưng vẫn hiển thị bảng dữ liệu chi tiết và các thống kê liên quan.
- [ ] **File có nhiều sheet:** File Excel có từ 2 sheet trở lên. Hệ thống sẽ tự động hiển thị thanh chọn dropdown "Chọn Sheet" ở góc trên bên phải để người dùng dễ dàng chuyển đổi qua lại.
- [ ] **Định dạng số và ngày hỗn hợp:** Cột doanh thu chứa ký tự đặc biệt như "1.200.000 đ", "$450.00", "50%". Hệ thống phải làm sạch và tính toán chính xác số liệu tổng.
- [ ] **File lỗi hoặc rỗng:** Upload file rỗng hoặc định dạng không được hỗ trợ (ví dụ file hình ảnh .png). Hệ thống phải hiển thị thông báo lỗi màu đỏ rõ ràng bằng tiếng Việt.
- [ ] **Mất kết nối API:** Khi tắt mạng hoặc xóa `GEMINI_API_KEY` khỏi cấu hình, nút "Tạo báo cáo AI" phải báo lỗi chi tiết bằng tiếng Việt giúp người dùng biết cách xử lý.
