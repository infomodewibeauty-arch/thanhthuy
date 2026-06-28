'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { parseExcelFile, ParsedExcelResult } from '../utils/excelParser';

interface UploadZoneProps {
  onSuccess: (result: ParsedExcelResult, file: File) => void;
  onError: (msg: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function UploadZone({ onSuccess, onError, isLoading, setIsLoading }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    try {
      const result = await parseExcelFile(file);
      onSuccess(result, file);
    } catch (err: any) {
      onError(err.message || 'Lỗi không xác định khi đọc file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative flex flex-col items-center justify-center p-12 rounded-2xl cursor-pointer transition-all duration-300 border-2 border-dashed 
          ${
            isDragActive
              ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.25)] scale-[1.01]'
              : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60 shadow-lg'
          }
          glass-panel`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-300 font-medium">Đang đọc và phân tích dữ liệu Excel...</p>
            <p className="text-slate-500 text-sm mt-1">Quá trình này diễn ra hoàn toàn trên trình duyệt của bạn</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 mb-5 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">
              Kéo thả file Excel hoặc CSV vào đây
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md">
              Hỗ trợ định dạng <span className="text-indigo-300 font-semibold">.xlsx</span>,{' '}
              <span className="text-indigo-300 font-semibold">.xls</span>, hoặc{' '}
              <span className="text-indigo-300 font-semibold">.csv</span>. Dung lượng tối đa 10MB.
            </p>
            <button
              type="button"
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200"
            >
              Chọn file từ máy tính
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed max-w-3xl mx-auto shadow-inner">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5 text-amber-200">Lưu ý bảo mật dữ liệu nhạy cảm:</span>
          Dữ liệu của bạn được tải và tính toán cục bộ (client-side). Hệ thống sẽ không tải tệp Excel thô lên bất cứ máy chủ nào. Chỉ các số liệu thống kê tóm tắt và 5 dòng dữ liệu mẫu ngẫu nhiên mới được gửi qua API an toàn tới Google Gemini để tạo báo cáo phân tích kinh doanh.
        </div>
      </div>
    </div>
  );
}
