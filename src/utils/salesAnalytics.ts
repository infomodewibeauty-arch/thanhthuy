/**
 * salesAnalytics.ts
 * Sales/Finance dataset analytics — refactored from original analyticsEngine.ts
 */

import { normalizeCol } from './columnDetection';
import { parseCleanDate, parseCleanNumber } from './dataCleaner';

const SALES_ALIAS: Record<string, string> = {
  // Revenue
  revenue: 'revenue', doanh_thu: 'revenue', doanthu: 'revenue', sales: 'revenue',
  amount: 'revenue', total_amount: 'revenue', totalamount: 'revenue',
  thanh_tien: 'revenue', thanhtien: 'revenue', thu_nhap: 'revenue',
  // Cost
  cost: 'cost', chi_phi: 'cost', chiphi: 'cost', expense: 'cost', expenses: 'cost',
  gia_von: 'cost', giavon: 'cost',
  // Profit
  profit: 'profit', loi_nhuan: 'profit', loinhuan: 'profit', margin: 'profit', gain: 'profit',
  // Date
  date: 'date', ngay: 'date', time: 'date', created_at: 'date', timestamp: 'date',
  ngay_ban: 'date', ngayban: 'date', thoi_gian: 'date',
  // Product
  product: 'product', san_pham: 'product', sanpham: 'product', item: 'product',
  sku: 'product', hang_hoa: 'product', ten_hang: 'product',
  // Customer
  customer: 'customer', khach_hang: 'customer', khachhang: 'customer',
  client: 'customer', ten_khach: 'customer',
  // Employee/Salesperson
  employee: 'employee', nhan_vien: 'employee', nhanvien: 'employee',
  salesperson: 'employee', staff: 'employee', salesman: 'employee',
  // Department
  department: 'department', phong_ban: 'department', phongban: 'department',
  team: 'department', bo_phan: 'department',
  // Region
  region: 'region', khu_vuc: 'region', khuvuc: 'region', location: 'region',
  area: 'region', tinh_thanh: 'region', city: 'region',
  // Order
  order: 'order', don_hang: 'order', donhang: 'order', order_id: 'order',
  invoice: 'order', ma_don: 'order',
};

export interface SalesColumnMap { [raw: string]: string; }

export interface SalesGroupItem {
  name: string;
  value: number;
  count: number;
}

export interface TrendPoint {
  dateStr: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SalesSummary {
  totalRows: number;
  totalRevenue: number | null;
  totalCost: number | null;
  totalProfit: number | null;
  profitMargin: number | null;
  totalOrders: number | null;
}

export interface SalesAnalyticsResult {
  datasetType: 'SALES_FINANCE';
  columnMap: SalesColumnMap;
  detectedCols: Record<string, boolean>;
  summary: SalesSummary;
  topProducts: SalesGroupItem[];
  topCustomers: SalesGroupItem[];
  topEmployees: SalesGroupItem[];
  departmentBreakdown: SalesGroupItem[];
  regionBreakdown: SalesGroupItem[];
  timeTrend: TrendPoint[];
  rawRows: any[];
}

export function buildSalesColumnMap(rawCols: string[]): SalesColumnMap {
  const map: SalesColumnMap = {};
  rawCols.forEach((raw) => {
    const norm = normalizeCol(raw);
    map[raw] = SALES_ALIAS[norm] ?? raw;
  });
  return map;
}

export function analyzeSalesData(
  rawRows: any[],
  columnMap: SalesColumnMap
): SalesAnalyticsResult {
  // Remap rows
  const mapped = rawRows.map((row) => {
    const r: Record<string, any> = {};
    Object.entries(row).forEach(([raw, val]) => {
      const std = columnMap[raw] ?? raw;
      if (std === 'revenue' || std === 'cost' || std === 'profit') {
        r[std] = parseCleanNumber(val);
      } else if (std === 'date') {
        r[std] = parseCleanDate(val);
      } else {
        r[std] = val !== null && val !== undefined ? val.toString().trim() : null;
      }
    });
    return r;
  });

  const detectedCols: Record<string, boolean> = {};
  const KEYS = ['revenue','cost','profit','date','product','customer','employee','department','region','order'];
  KEYS.forEach((k) => {
    detectedCols[k] = mapped.some((r) => r[k] !== null && r[k] !== undefined && r[k] !== '');
  });

  let sumRevenue = 0, sumCost = 0, sumProfit = 0;
  mapped.forEach((row) => {
    if (detectedCols['revenue'] && row['revenue'] !== null) sumRevenue += row['revenue'];
    if (detectedCols['cost'] && row['cost'] !== null) sumCost += row['cost'];
    if (detectedCols['profit'] && row['profit'] !== null) sumProfit += row['profit'];
  });

  if (detectedCols['revenue'] && detectedCols['cost'] && !detectedCols['profit']) {
    sumProfit = sumRevenue - sumCost;
    detectedCols['profit'] = true;
    mapped.forEach((row) => { row['profit'] = (row['revenue'] || 0) - (row['cost'] || 0); });
  }

  const profitMargin =
    detectedCols['revenue'] && detectedCols['profit'] && sumRevenue > 0
      ? (sumProfit / sumRevenue) * 100
      : null;

  let totalOrders: number | null = null;
  if (detectedCols['order']) {
    const uniq = new Set<string>();
    mapped.forEach((r) => { if (r['order']) uniq.add(r['order'].toString()); });
    totalOrders = uniq.size;
  }

  const getTopGroup = (key: string): SalesGroupItem[] => {
    if (!detectedCols[key]) return [];
    const groups: Record<string, { value: number; count: number }> = {};
    mapped.forEach((row) => {
      const name = row[key]?.toString().trim() || 'N/A';
      const rev = detectedCols['revenue'] && row['revenue'] !== null ? Number(row['revenue']) : 0;
      if (!groups[name]) groups[name] = { value: 0, count: 0 };
      groups[name].value += detectedCols['revenue'] ? rev : 1;
      groups[name].count += 1;
    });
    return Object.entries(groups)
      .map(([name, g]) => ({ name, value: Math.round(g.value * 100) / 100, count: g.count }))
      .sort((a, b) => b.value - a.value);
  };

  // Time trend
  let timeTrend: TrendPoint[] = [];
  if (detectedCols['date']) {
    const dmap: Record<string, { revenue: number; cost: number; profit: number; ts: number }> = {};
    mapped.forEach((row) => {
      const d = row['date'] as Date;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!dmap[key]) dmap[key] = { revenue: 0, cost: 0, profit: 0, ts: d.getTime() };
      dmap[key].revenue += row['revenue'] ?? 0;
      dmap[key].cost += row['cost'] ?? 0;
      dmap[key].profit += row['profit'] ?? 0;
    });
    const points = Object.entries(dmap)
      .map(([dateStr, v]) => ({ dateStr, ...v }))
      .sort((a, b) => a.ts - b.ts);
    if (points.length > 31) {
      const mmap: Record<string, { revenue: number; cost: number; profit: number }> = {};
      points.forEach((p) => {
        const mk = p.dateStr.slice(0, 7);
        if (!mmap[mk]) mmap[mk] = { revenue: 0, cost: 0, profit: 0 };
        mmap[mk].revenue += p.revenue;
        mmap[mk].cost += p.cost;
        mmap[mk].profit += p.profit;
      });
      timeTrend = Object.entries(mmap)
        .map(([dateStr, v]) => ({ dateStr, ...v }))
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    } else {
      timeTrend = points.map(({ dateStr, revenue, cost, profit }) => ({ dateStr, revenue, cost, profit }));
    }
  }

  return {
    datasetType: 'SALES_FINANCE',
    columnMap,
    detectedCols,
    summary: {
      totalRows: mapped.length,
      totalRevenue: detectedCols['revenue'] ? sumRevenue : null,
      totalCost: detectedCols['cost'] ? sumCost : null,
      totalProfit: detectedCols['profit'] ? sumProfit : null,
      profitMargin,
      totalOrders,
    },
    topProducts: getTopGroup('product').slice(0, 10),
    topCustomers: getTopGroup('customer').slice(0, 10),
    topEmployees: getTopGroup('employee').slice(0, 10),
    departmentBreakdown: getTopGroup('department'),
    regionBreakdown: getTopGroup('region'),
    timeTrend,
    rawRows: mapped,
  };
}

export function compileSalesGeminiPayload(result: SalesAnalyticsResult, originalColumnMap: SalesColumnMap) {
  const { summary, detectedCols } = result;
  const columns = Object.entries(originalColumnMap).map(([original, mapped]) => ({ original, mapped }));
  const fmt = (v: number | null) => v !== null ? v.toLocaleString('vi-VN') : 'Không có dữ liệu';
  const financeText = [
    `Tổng doanh thu: ${fmt(summary.totalRevenue)}`,
    `Tổng chi phí: ${fmt(summary.totalCost)}`,
    `Tổng lợi nhuận: ${fmt(summary.totalProfit)}`,
    `Tỷ suất lợi nhuận: ${summary.profitMargin !== null ? summary.profitMargin.toFixed(2)+'%' : 'N/A'}`,
    `Số đơn hàng: ${summary.totalOrders ?? 'N/A'}`,
  ].join('\n');
  const formatList = (arr: SalesGroupItem[]) =>
    arr.slice(0,5).map((x) => `${x.name}: ${x.value.toLocaleString('vi-VN')}`).join(', ') || 'Không có';
  const sampleRows = result.rawRows.slice(0,5).map((row) => {
    const r: Record<string,any> = {};
    Object.entries(row).forEach(([k,v]) => { r[k] = v instanceof Date ? v.toISOString().split('T')[0] : v; });
    return r;
  });
  return {
    datasetType: 'SALES_FINANCE',
    columns,
    rowCount: summary.totalRows,
    summary: {
      financeText,
      topProducts: formatList(result.topProducts),
      topCustomers: formatList(result.topCustomers),
      topEmployees: formatList(result.topEmployees),
      departments: result.departmentBreakdown.slice(0,5).map(x=>`${x.name}: ${x.count}`).join(', ') || 'N/A',
      regions: result.regionBreakdown.slice(0,5).map(x=>`${x.name}: ${x.count}`).join(', ') || 'N/A',
      trends: result.timeTrend.slice(0,6).map(t=>`${t.dateStr} (DT: ${t.revenue.toLocaleString('vi-VN')})`).join('; ') || 'N/A',
    },
    sampleRows,
  };
}
