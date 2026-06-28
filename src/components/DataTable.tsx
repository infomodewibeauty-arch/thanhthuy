'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  data: any[];
  columnMapping: Record<string, string>;
}

export default function DataTable({ data, columnMapping }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Headers list based on the first object keys (original keys)
  const headers = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Handle column header click for sorting
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Format cell value based on its type and mapped key
  const formatCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) return '';

    if (val instanceof Date) {
      // Return YYYY-MM-DD
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    if (typeof val === 'number') {
      const mappedKey = columnMapping[key];
      const isFin = ['revenue', 'cost', 'profit'].includes(mappedKey);
      if (isFin) {
        return Math.round(val).toLocaleString('vi-VN') + ' ₫';
      }
      return val.toLocaleString('vi-VN');
    }

    return val.toString();
  };

  // Filter and Sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Search Filter
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          if (val instanceof Date) {
            return val.toLocaleDateString('vi-VN').toLowerCase().includes(lowerSearch);
          }
          return val.toString().toLowerCase().includes(lowerSearch);
        })
      );
    }

    // 2. Sorting
    if (sortConfig !== null) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        let aValue = a[key];
        let bValue = b[key];

        if (aValue === null || aValue === undefined) return direction === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return direction === 'asc' ? -1 : 1;

        // Parse to Date time if it's a date
        if (aValue instanceof Date && bValue instanceof Date) {
          return direction === 'asc'
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        // Standard comparison
        if (aValue < bValue) {
          return direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(processedData.length / pageSize);
  
  const pagedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & PageSize Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 glass-panel">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm dòng dữ liệu..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>Hiển thị</span>
          <select
            className="bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
          <span>trên {processedData.length} dòng</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/60 glass-panel">
        <table className="min-w-full divide-y divide-slate-700/60 text-sm text-slate-200">
          <thead className="bg-slate-800/60">
            <tr>
              {headers.map((key) => {
                const mappedName = columnMapping[key];
                const isMapped = mappedName !== key;
                return (
                  <th
                    key={key}
                    onClick={() => requestSort(key)}
                    className="px-6 py-3 text-left font-semibold text-xs text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-800 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>
                        {key} 
                        {isMapped && (
                          <span className="text-[10px] text-indigo-300 block normal-case font-normal">
                            ({mappedName})
                          </span>
                        )}
                      </span>
                      {sortConfig && sortConfig.key === key ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        )
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 bg-slate-900/20">
            {pagedData.length > 0 ? (
              pagedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className="hover:bg-slate-800/30 transition-colors duration-150 odd:bg-slate-900/10"
                >
                  {headers.map((key) => (
                    <td key={key} className="px-6 py-3 whitespace-nowrap text-slate-300">
                      {formatCellValue(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-10 text-center text-slate-500 font-medium">
                  Không tìm thấy dữ liệu phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 glass-panel">
          <span className="text-sm text-slate-400">
            Trang <span className="font-semibold text-slate-200">{currentPage}</span> / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
