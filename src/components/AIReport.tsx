'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, RotateCcw, AlertCircle, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { DatasetType } from '../utils/columnDetection';

interface AIReportProps {
  payload: any;
  datasetType?: DatasetType;
}

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export default function AIReport({ payload, datasetType = 'GENERIC' }: AIReportProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyInputDirty, setKeyInputDirty] = useState(false);

  // Load saved API key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  const saveAndGenerate = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('Vui lòng nhập Gemini API Key trước khi tạo báo cáo.');
      return;
    }
    // Persist key to localStorage
    localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    generateReport(trimmed);
  };

  const generateReport = async (key: string) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, apiKey: key })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo báo cáo.');
      }

      setReport(data.report);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tạo báo cáo AI lúc này. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('Vui lòng nhập Gemini API Key trước khi tạo báo cáo.');
      return;
    }
    generateReport(trimmed);
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setReport(null);
    setError(null);
  };

  // Simple and safe internal markdown-to-JSX parser
  const renderFormattedReport = (mdText: string) => {
    const lines = mdText.split('\n');
    let inList = false;
    let listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    const flushList = (keyPrefix: number) => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="list-disc pl-6 mb-4 space-y-1.5 text-slate-300">
            {...listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    // Helper for bold and italic markers
    const formatInline = (txt: string) => {
      const parts = txt.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-slate-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Heading 1
      if (trimmed.startsWith('# ')) {
        flushList(index);
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-indigo-300 mt-8 mb-4 border-b border-slate-700/60 pb-2 tracking-tight">
            {formatInline(trimmed.substring(2))}
          </h2>
        );
      }
      // Heading 2
      else if (trimmed.startsWith('## ')) {
        flushList(index);
        elements.push(
          <h3 key={index} className="text-xl font-semibold text-slate-100 mt-6 mb-3 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 rounded bg-indigo-500 inline-block" />
            {formatInline(trimmed.substring(3))}
          </h3>
        );
      }
      // Heading 3
      else if (trimmed.startsWith('### ')) {
        flushList(index);
        elements.push(
          <h4 key={index} className="text-lg font-medium text-slate-200 mt-4 mb-2">
            {formatInline(trimmed.substring(4))}
          </h4>
        );
      }
      // Bullet points
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true;
        const textOnly = trimmed.substring(2);
        listItems.push(
          <li key={`li-${index}`} className="text-sm leading-relaxed">
            {formatInline(textOnly)}
          </li>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        flushList(index);
        const textOnly = trimmed.replace(/^\d+\.\s/, '');
        const number = trimmed.match(/^(\d+)\./)?.[1] || '1';
        elements.push(
          <div key={index} className="flex gap-3 mb-3 items-start text-sm leading-relaxed">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold text-xs shrink-0 mt-0.5">
              {number}
            </span>
            <p className="text-slate-300">{formatInline(textOnly)}</p>
          </div>
        );
      }
      // Empty lines
      else if (trimmed === '') {
        flushList(index);
      }
      // Normal paragraphs
      else {
        flushList(index);
        elements.push(
          <p key={index} className="text-slate-300 text-sm leading-relaxed mb-4">
            {formatInline(trimmed)}
          </p>
        );
      }
    });

    // Flush any leftover list items
    flushList(lines.length);

    return elements;
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 space-y-5">

      {/* ── API KEY INPUT PANEL ── */}
      <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 glass-panel">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Key className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">Gemini API Key</h4>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Lấy API Key miễn phí
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="gemini-api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setKeyInputDirty(true); }}
              placeholder="Dán API Key của bạn vào đây (AIza...)"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              title={showKey ? 'Ẩn key' : 'Hiện key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {apiKey && (
            <button
              onClick={handleClearKey}
              className="px-3 py-2 text-xs text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl hover:border-rose-500/40 transition-all duration-200"
              title="Xóa API Key đã lưu"
            >
              Xóa
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Key được lưu cục bộ trên trình duyệt của bạn. Không được gửi đến bất kỳ máy chủ nào của chúng tôi.
        </p>
      </div>

      {/* ── INITIAL STATE: Show Generate Button ── */}
      {!report && !loading && !error && (
        <div className="p-12 text-center rounded-2xl bg-slate-800/40 border border-slate-700/60 glass-panel flex flex-col items-center">
          <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 mb-5 animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            {datasetType === 'HR_WORKFORCE' ? 'Báo cáo phân tích Nhân sự (HR Analytics)' :
             datasetType === 'SALES_FINANCE' ? 'Báo cáo phân tích Kinh doanh' :
             'Báo cáo phân tích Dữ liệu'}
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            {datasetType === 'HR_WORKFORCE'
              ? 'AI sẽ phân tích cơ cấu nhân sự, rủi ro nghỉ việc, hiệu suất và đề xuất hành động cho HR Manager.'
              : datasetType === 'SALES_FINANCE'
              ? 'AI sẽ phân tích doanh thu, chi phí, lợi nhuận và đề xuất chiến lược kinh doanh.'
              : 'AI sẽ phân tích cấu trúc dữ liệu, phân phối và đề xuất insight chuyên sâu.'}
          </p>
          <button
            onClick={saveAndGenerate}
            disabled={!apiKey.trim()}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200"
          >
            <Sparkles className="w-5 h-5" />
            Tạo báo cáo AI bằng Gemini
          </button>
          {!apiKey.trim() && (
            <p className="text-xs text-amber-400/80 mt-3">
              ⚠ Vui lòng nhập Gemini API Key ở trên trước khi tạo báo cáo
            </p>
          )}
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="p-10 rounded-2xl bg-slate-800/40 border border-slate-700/60 glass-panel space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-700/60 pb-4">
            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm font-semibold text-indigo-300 animate-pulse-slow">
              Đang kết nối Google Gemini API để tạo báo cáo phân tích...
            </span>
          </div>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-700/50 rounded w-1/3" />
            <div className="h-3 bg-slate-700/30 rounded w-full" />
            <div className="h-3 bg-slate-700/30 rounded w-5/6" />
            <div className="h-3 bg-slate-700/30 rounded w-11/12" />
            <div className="h-4 bg-slate-700/50 rounded w-1/4 mt-6" />
            <div className="h-3 bg-slate-700/30 rounded w-full" />
            <div className="h-3 bg-slate-700/30 rounded w-4/5" />
          </div>
        </div>
      )}

      {/* ── ERROR STATE ── */}
      {error && !loading && (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 glass-panel flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
          <h4 className="text-base font-semibold text-rose-200 mb-1">Không thể tạo báo cáo AI lúc này</h4>
          <p className="text-rose-300/80 text-sm max-w-lg mb-6 leading-relaxed">
            {error}
          </p>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100 font-medium rounded-xl transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      )}

      {/* ── SUCCESS STATE: Display AI Report ── */}
      {report && (
        <div className="rounded-2xl bg-slate-800/20 border border-slate-700/60 glass-panel overflow-hidden shadow-xl">
          {/* Document Header Controls */}
          <div className="px-6 py-4 bg-slate-800/55 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">Báo cáo phân tích chuyên sâu bởi Gemini AI</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Sao chép toàn bộ báo cáo"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium border border-indigo-500/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tạo lại</span>
              </button>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-8 prose prose-slate max-w-none prose-headings:text-slate-100 prose-p:text-slate-300">
            {renderFormattedReport(report)}
          </div>
        </div>
      )}
    </div>
  );
}
