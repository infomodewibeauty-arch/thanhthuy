'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  FileSpreadsheet, RefreshCw, BarChart3, Database, Brain,
  AlertTriangle, Users, TrendingUp, Layers
} from 'lucide-react';
import UploadZone from '../components/UploadZone';
import KPICards from '../components/KPICards';
import ChartSection from '../components/ChartSection';
import DataTable from '../components/DataTable';
import AIReport from '../components/AIReport';
import { parseExcelFile, ParsedExcelResult } from '../utils/excelParser';
import { analyzeData, compileGeminiPayload, UnifiedAnalyticsResult } from '../utils/analyticsEngine';
import { datasetTypeLabel } from '../utils/columnDetection';

type TabId = 'overview' | 'charts' | 'table' | 'ai';

const DATASET_ICONS: Record<string, React.ElementType> = {
  HR_WORKFORCE: Users,
  SALES_FINANCE: TrendingUp,
  GENERIC: Layers,
};

const DATASET_COLORS: Record<string, string> = {
  HR_WORKFORCE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  SALES_FINANCE: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  GENERIC: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<UnifiedAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const handleFileLoaded = (result: ParsedExcelResult, loadedFile: File) => {
    setError(null);
    setFile(loadedFile);
    setSheetNames(result.sheetNames);
    setCurrentSheet(result.selectedSheet);
    processRawData(result.data);
  };

  const processRawData = (data: any[]) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('File không có dữ liệu hợp lệ (tất cả các dòng đều trống).');
      }
      const result = analyzeData(data);
      setRawRows(data);
      setAnalytics(result);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xử lý dữ liệu.');
      handleReset();
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await parseExcelFile(file, newSheet);
      setCurrentSheet(newSheet);
      processRawData(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi chuyển sheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSheetNames([]);
    setCurrentSheet('');
    setRawRows([]);
    setAnalytics(null);
    setError(null);
    setActiveTab('overview');
  };

  const geminiPayload = useMemo(() => {
    if (!analytics) return null;
    return compileGeminiPayload(analytics);
  }, [analytics]);

  const dsType = analytics?.datasetType ?? 'GENERIC';
  const DsIcon = DATASET_ICONS[dsType] ?? Layers;
  const dsColorClass = DATASET_COLORS[dsType] ?? DATASET_COLORS['GENERIC'];

  // Get raw display rows (use rawRows for table to show all original data)
  const tableRows = rawRows;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Tổng quan', icon: Database },
    { id: 'charts', label: 'Biểu đồ', icon: BarChart3 },
    { id: 'table', label: 'Bảng dữ liệu', icon: FileSpreadsheet },
    { id: 'ai', label: 'Báo cáo AI', icon: Brain },
  ];

  return (
    <main className="min-h-screen pb-16 px-4 md:px-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto pt-10 pb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center justify-center gap-2.5">
          <FileSpreadsheet className="w-9 h-9 text-indigo-400" />
          <span className="text-gradient">Excel AI Analytics Dashboard</span>
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto">
          Tải lên file Excel để nhận diện loại dữ liệu tự động, trực quan hóa dashboard và tạo báo cáo AI chuyên sâu.
        </p>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 mb-6 max-w-3xl mx-auto">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-semibold">Lỗi: </span>{error}
            </div>
          </div>
        )}

        {!file ? (
          <UploadZone
            onSuccess={handleFileLoaded}
            onError={setError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        ) : (
          <div className="space-y-5">
            {/* File Info + Controls Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl glass-panel gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate max-w-xs sm:max-w-sm">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-indigo-300">{(file.size / 1024).toFixed(1)} KB</span>
                    {analytics && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${dsColorClass}`}>
                        <DsIcon className="w-3 h-3" />
                        {datasetTypeLabel(dsType as any)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Sheet:</span>
                    <select
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      value={currentSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      disabled={isLoading}
                    >
                      {sheetNames.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold shadow transition-all duration-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Đổi file
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-900/30 p-1 rounded-xl gap-1 border border-slate-800/50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => startTransition(() => setActiveTab(tab.id))}
                    className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Overview Tab */}
              {activeTab === 'overview' && analytics && (
                <div className="animate-fadeIn space-y-6">
                  <KPICards analytics={analytics} />

                  {/* Overview quick breakdown panels */}
                  {analytics.datasetType === 'HR_WORKFORCE' && (() => {
                    const hr = analytics as import('../utils/hrAnalytics').HRAnalyticsResult;
                    const topDepts = hr.summary.byDepartment.slice(0, 5);
                    const topLocs = hr.summary.byLocation.slice(0, 5);
                    const topLevels = hr.summary.byJobLevel.slice(0, 5);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {topDepts.length > 0 && (
                          <div className="p-5 rounded-2xl glass-panel">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/60 pb-2">Top Phòng ban</h4>
                            <div className="space-y-2">
                              {topDepts.map((d, i) => (
                                <div key={d.name} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-full font-semibold text-[10px]">{i + 1}</span>
                                    <span className="text-slate-300 truncate max-w-[120px]">{d.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {topLocs.length > 0 && (
                          <div className="p-5 rounded-2xl glass-panel">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/60 pb-2">Top Địa điểm</h4>
                            <div className="space-y-2">
                              {topLocs.map((d, i) => (
                                <div key={d.name} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-full font-semibold text-[10px]">{i + 1}</span>
                                    <span className="text-slate-300 truncate max-w-[120px]">{d.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {topLevels.length > 0 && (
                          <div className="p-5 rounded-2xl glass-panel">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/60 pb-2">Job Level</h4>
                            <div className="space-y-2">
                              {topLevels.map((d, i) => (
                                <div key={d.name} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-violet-500/10 text-violet-400 rounded-full font-semibold text-[10px]">{i + 1}</span>
                                    <span className="text-slate-300 truncate max-w-[120px]">{d.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {analytics.datasetType === 'SALES_FINANCE' && (() => {
                    const s = analytics as import('../utils/salesAnalytics').SalesAnalyticsResult;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {s.topProducts.length > 0 && (
                          <div className="p-5 rounded-2xl glass-panel">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/60 pb-2">Top sản phẩm</h4>
                            <div className="space-y-2">
                              {s.topProducts.slice(0, 5).map((p, i) => (
                                <div key={p.name} className="flex justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-full text-[10px]">{i + 1}</span>
                                    <span className="text-slate-300 truncate max-w-[140px]">{p.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{p.value.toLocaleString('vi-VN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {s.regionBreakdown.length > 0 && (
                          <div className="p-5 rounded-2xl glass-panel">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/60 pb-2">Theo khu vực</h4>
                            <div className="space-y-2">
                              {s.regionBreakdown.slice(0, 5).map((r, i) => (
                                <div key={r.name} className="flex justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-full text-[10px]">{i + 1}</span>
                                    <span className="text-slate-300 truncate max-w-[140px]">{r.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{r.value.toLocaleString('vi-VN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {analytics.datasetType === 'GENERIC' && (() => {
                    const g = analytics as import('../utils/genericAnalytics').GenericAnalyticsResult;
                    const catCols = g.summary.columns.filter((c) => c.kind === 'category').slice(0, 2);
                    return catCols.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {catCols.map((col) => (
                          <div key={col.name} className="p-5 rounded-2xl glass-panel">
                            <h4 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700/60 pb-2">{col.name}</h4>
                            <div className="space-y-2">
                              {col.topValues.slice(0, 5).map((v, i) => (
                                <div key={v.name} className="flex justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center bg-amber-500/10 text-amber-400 rounded-full text-[10px]">{i + 1}</span>
                                    <span className="text-slate-300 truncate max-w-[140px]">{v.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-200">{v.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Charts Tab */}
              {activeTab === 'charts' && analytics && (
                <div className="animate-fadeIn">
                  <ChartSection analytics={analytics} />
                </div>
              )}

              {/* Table Tab — always shows, no revenue dependency */}
              {activeTab === 'table' && (
                <div className="animate-fadeIn">
                  <DataTable data={tableRows} />
                </div>
              )}

              {/* AI Report Tab */}
              {activeTab === 'ai' && geminiPayload && (
                <div className="animate-fadeIn">
                  <AIReport payload={geminiPayload} datasetType={dsType as any} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
