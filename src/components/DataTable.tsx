'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface DataTableProps {
  data: any[];
  /** Optional: map from internal key → display label */
  columnLabels?: Record<string, string>;
}

const PAGE_SIZE = 50;

export default function DataTable({ data, columnLabels = {} }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 text-sm">
        Không có dữ liệu để hiển thị.
      </div>
    );
  }

  // Collect all columns from all rows (handles sparse data)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const columns = useMemo(() => {
    const keys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [data]);

  // Filter by search
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) =>
        v !== null && v !== undefined && v.toString().toLowerCase().includes(q)
      )
    );
  }, [data, search]);

  // Sort
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const aStr = av instanceof Date ? av.getTime().toString() : av.toString();
      const bStr = bv instanceof Date ? bv.getTime().toString() : bv.toString();
      const aNum = Number(av);
      const bNum = Number(bv);
      const cmp = !isNaN(aNum) && !isNaN(bNum)
        ? aNum - bNum
        : aStr.localeCompare(bStr, 'vi');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const formatCell = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (val instanceof Date) return val.toLocaleDateString('vi-VN');
    return val.toString();
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-indigo-400" />
      : <ChevronDown className="w-3 h-3 text-indigo-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Search + info bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm trong bảng..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <p className="text-xs text-slate-500 shrink-0">
          {filtered.length.toLocaleString('vi-VN')} / {data.length.toLocaleString('vi-VN')} dòng
          {' | '}Trang {page}/{totalPages}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl glass-panel overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap cursor-pointer hover:text-indigo-300 hover:bg-slate-700/30 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>{columnLabels[col] ?? col}</span>
                      <SortIcon col={col} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            ‹ Trước
          </button>

          {/* Page numbers */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            Sau ›
          </button>
        </div>
      )}
    </div>
  );
}
