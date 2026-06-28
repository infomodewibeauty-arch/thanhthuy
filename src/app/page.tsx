'use client';

import React, { useState, useTransition } from 'react';
import { FileSpreadsheet, RefreshCw, BarChart3, Database, Brain, ArrowLeft, AlertTriangle } from 'lucide-react';
import UploadZone from '../components/UploadZone';
import KPICards from '../components/KPICards';
import ChartSection from '../components/ChartSection';
import DataTable from '../components/DataTable';
import AIReport from '../components/AIReport';
import { cleanExcelData as cleanExcel, normalizeString } from '../utils/dataCleaner';
import { analyzeData, compileGeminiPayload } from '../utils/analyticsEngine';
import { parseExcelFile, ParsedExcelResult } from '../utils/excelParser';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  
  const [cleanRows, setCleanRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const [analytics, setAnalytics] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition(); // transition for heavy tab rendering
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'table' | 'ai'>('overview');

  // Handle successful client-side parsing
  const handleFileLoaded = (result: ParsedExcelResult, loadedFile: File) => {
    setError(null);
    setFile(loadedFile);
    setSheetNames(result.sheetNames);
    setCurrentSheet(result.selectedSheet);
    processParsedData(result.data);
  };

  // Run cleaner and compiler on parsed JSON
  const processParsedData = (data: any[]) => {
    try {
      const cleaned = cleanExcel(data);
      if (cleaned.cleanRows.length === 0) {
        throw new Error('File không có dữ liệu hợp lệ (tất cả các dòng đều trống).');
      }

      setCleanRows(cleaned.cleanRows);
      setColumnMapping(cleaned.columnMapping as Record<string, string>);
      setWarnings(cleaned.warnings);

      const stats = analyzeData(cleaned.cleanRows);
      setAnalytics(stats);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xử lý dữ liệu.');
      handleReset();
    }
  };

  // Re-parse file when user selects a different sheet
  const handleSheetChange = async (newSheet: string) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await parseExcelFile(file, newSheet);
      setCurrentSheet(newSheet);
      processParsedData(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi chuyển đổi sheet dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset dashboard state to upload a new file
  const handleReset = () => {
    setFile(null);
    setSheetNames([]);
    setCurrentSheet('');
    setCleanRows([]);
    setColumnMapping({});
    setWarnings([]);
    setAnalytics(null);
    setError(null);
    setActiveTab('overview');
  };

  // Prepare data payload for Gemini report endpoint
  const geminiPayload = React.useMemo(() => {
    if (cleanRows.length === 0 || !analytics) return null;
    return compileGeminiPayload(cleanRows, analytics, columnMapping);
  }, [cleanRows, analytics, columnMapping]);

  return (
    <main className="min-h-screen pb-16 px-4 md:px-8">
      {/* 1. Dashboard Header */}
      <header className="max-w-6xl mx-auto pt-10 pb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center justify-center gap-2.5">
          <FileSpreadsheet className="w-9 h-9 text-indigo-400" />
          <span className="text-gradient">Excel AI Analytics Dashboard</span>
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto">
          Tải lên bảng tính của bạn để nhận diện cột thông minh, trực quan hóa các chỉ số kinh doanh và tự động viết báo cáo phân tích tài chính bằng AI.
        </p>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* 2. Global Error State Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 mb-6 max-w-3xl mx-auto shadow-inner animate-pulse-slow">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-semibold">Lỗi xảy ra: </span>
              {error}
            </div>
          </div>
        )}

        {/* 3. Empty State: Show File Upload */}
        {!file ? (
          <UploadZone
            onSuccess={handleFileLoaded}
            onError={setError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        ) : (
          /* 4. Loaded State: Show Dashboard workspace */
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl glass-panel gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-slate-100 truncate max-w-xs sm:max-w-sm md:max-w-md">{file.name}</p>
                  <p className="text-xs text-indigo-300">
                    Dung lượng: {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Multi-sheet selection dropdown */}
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Chọn Sheet:</span>
                    <select
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      value={currentSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      disabled={isLoading}
                    >
                      {sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold shadow transition-all duration-200 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Đổi file khác
                </button>
              </div>
            </div>

            {/* Warnings Container */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((warn, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300/90 text-xs flex items-start gap-2.5 shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800/80 bg-slate-900/10 p-1 rounded-xl gap-1">
              <button
                onClick={() => startTransition(() => setActiveTab('overview'))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Database className="w-4 h-4" />
                Tổng quan
              </button>
              <button
                onClick={() => startTransition(() => setActiveTab('charts'))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeTab === 'charts'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Biểu đồ
              </button>
              <button
                onClick={() => startTransition(() => setActiveTab('table'))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeTab === 'table'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Database className="w-4 h-4" />
                Bảng dữ liệu
              </button>
              <button
                onClick={() => startTransition(() => setActiveTab('ai'))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Brain className="w-4 h-4" />
                Báo cáo AI
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-96 transition-all duration-200">
              {activeTab === 'overview' && analytics && (
                <div className="space-y-6 animate-fadeIn">
                  {/* KPI Figures */}
                  <KPICards summary={analytics.summary} hasMetric={analytics.hasMetric} />

                  {/* Summary Breakdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Products quick-list */}
                    {analytics.hasMetric.product && analytics.topProducts.length > 0 && (
                      <div className="p-5 rounded-2xl glass-panel shadow-md">
                        <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-700/60 pb-2">
                          Top sản phẩm bán chạy nhất
                        </h4>
                        <div className="space-y-3">
                          {analytics.topProducts.slice(0, 5).map((item: any, i: number) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-full font-semibold">
                                  {i + 1}
                                </span>
                                <span className="text-slate-300 font-medium max-w-[160px] truncate">{item.name}</span>
                              </div>
                              <span className="font-bold text-slate-200">
                                {analytics.hasMetric.revenue ? `${item.value.toLocaleString('vi-VN')} ₫` : `${item.ordersCount} đơn`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Regions quick-list */}
                    {analytics.hasMetric.region && analytics.regionBreakdown.length > 0 && (
                      <div className="p-5 rounded-2xl glass-panel shadow-md">
                        <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-700/60 pb-2">
                          Doanh số theo khu vực kinh doanh
                        </h4>
                        <div className="space-y-3">
                          {analytics.regionBreakdown.slice(0, 5).map((item: any, i: number) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-full font-semibold">
                                  {i + 1}
                                </span>
                                <span className="text-slate-300 font-medium max-w-[160px] truncate">{item.name}</span>
                              </div>
                              <span className="font-bold text-slate-200">
                                {analytics.hasMetric.revenue ? `${item.value.toLocaleString('vi-VN')} ₫` : `${item.ordersCount} đơn`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'charts' && analytics && (
                <div className="animate-fadeIn">
                  <ChartSection analytics={analytics} />
                </div>
              )}

              {activeTab === 'table' && cleanRows.length > 0 && (
                <div className="animate-fadeIn">
                  <DataTable data={cleanRows} columnMapping={columnMapping} />
                </div>
              )}

              {activeTab === 'ai' && geminiPayload && (
                <div className="animate-fadeIn">
                  <AIReport payload={geminiPayload} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
