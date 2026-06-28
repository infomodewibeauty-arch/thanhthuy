import { StandardColumnKey } from './dataCleaner';

export interface FinancialSummary {
  totalRows: number;
  totalRevenue: number | null;
  totalCost: number | null;
  totalProfit: number | null;
  profitMargin: number | null; // as percentage
  totalOrders: number | null;
}

export interface GroupedAggregation {
  name: string;
  value: number;
  ordersCount: number;
}

export interface TrendPoint {
  dateStr: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface AnalyticsResult {
  summary: FinancialSummary;
  hasMetric: Record<StandardColumnKey, boolean>;
  topProducts: GroupedAggregation[];
  topCustomers: GroupedAggregation[];
  topEmployees: GroupedAggregation[];
  departmentBreakdown: GroupedAggregation[];
  regionBreakdown: GroupedAggregation[];
  timeTrend: TrendPoint[];
}

/**
 * Main analytics compiler. Takes cleaned rows and generates dashboard figures.
 */
export function analyzeData(cleanRows: any[]): AnalyticsResult {
  const result: AnalyticsResult = {
    summary: {
      totalRows: cleanRows.length,
      totalRevenue: null,
      totalCost: null,
      totalProfit: null,
      profitMargin: null,
      totalOrders: null
    },
    hasMetric: {
      revenue: false,
      cost: false,
      profit: false,
      date: false,
      product: false,
      customer: false,
      employee: false,
      department: false,
      region: false,
      order: false
    },
    topProducts: [],
    topCustomers: [],
    topEmployees: [],
    departmentBreakdown: [],
    regionBreakdown: [],
    timeTrend: []
  };

  if (cleanRows.length === 0) return result;

  // 1. Check which standard metrics are available
  const sample = cleanRows[0];
  const keys = Object.keys(sample) as StandardColumnKey[];
  keys.forEach((k) => {
    // If at least one row has a non-null value for this key
    const hasValue = cleanRows.some((r) => r[k] !== null && r[k] !== undefined);
    if (hasValue) {
      result.hasMetric[k] = true;
    }
  });

  // 2. Financial Metrics Summation
  let sumRevenue = 0;
  let sumCost = 0;
  let sumProfit = 0;
  let hasRevenue = result.hasMetric.revenue;
  let hasCost = result.hasMetric.cost;
  let hasProfit = result.hasMetric.profit;

  cleanRows.forEach((row) => {
    if (hasRevenue && row.revenue !== null) sumRevenue += row.revenue;
    if (hasCost && row.cost !== null) sumCost += row.cost;
    if (hasProfit && row.profit !== null) sumProfit += row.profit;
  });

  // Logic: if profit is missing, but revenue & cost are present, calculate Profit = Revenue - Cost
  if (hasRevenue && hasCost && !hasProfit) {
    sumProfit = sumRevenue - sumCost;
    hasProfit = true;
    result.hasMetric.profit = true;
    // Inject calculated profit back into cleanRows for grouping later
    cleanRows.forEach((row) => {
      if (row.revenue !== null && row.cost !== null) {
        row.profit = row.revenue - row.cost;
      } else {
        row.profit = (row.revenue || 0) - (row.cost || 0);
      }
    });
  }

  if (hasRevenue) result.summary.totalRevenue = sumRevenue;
  if (hasCost) result.summary.totalCost = sumCost;
  if (hasProfit) result.summary.totalProfit = sumProfit;

  // Profit Margin: Profit / Revenue * 100
  if (hasRevenue && hasProfit && sumRevenue > 0) {
    result.summary.profitMargin = (sumProfit / sumRevenue) * 100;
  }

  // 3. Orders Count
  if (result.hasMetric.order) {
    const uniqueOrders = new Set<string>();
    cleanRows.forEach((row) => {
      if (row.order !== null && row.order !== undefined) {
        uniqueOrders.add(row.order.toString());
      }
    });
    result.summary.totalOrders = uniqueOrders.size;
  }

  // Helper for Grouping
  const getTopGroup = (key: StandardColumnKey): GroupedAggregation[] => {
    if (!result.hasMetric[key]) return [];

    const groups: Record<string, { value: number; ordersCount: number }> = {};
    cleanRows.forEach((row) => {
      const name = row[key]?.toString().trim() || 'N/A';
      const rev = row.revenue !== null ? Number(row.revenue) : 0;
      
      if (!groups[name]) {
        groups[name] = { value: 0, ordersCount: 0 };
      }
      
      // Accumulate value (prioritize revenue, otherwise fall back to count)
      groups[name].value += hasRevenue ? rev : 1;
      groups[name].ordersCount += 1;
    });

    return Object.entries(groups)
      .map(([name, item]) => ({
        name,
        value: Math.round(item.value * 100) / 100,
        ordersCount: item.ordersCount
      }))
      .sort((a, b) => b.value - a.value); // Sort descending
  };

  // Compile Grouped Aggregations
  result.topProducts = getTopGroup('product').slice(0, 10);
  result.topCustomers = getTopGroup('customer').slice(0, 10);
  result.topEmployees = getTopGroup('employee').slice(0, 10);
  result.departmentBreakdown = getTopGroup('department');
  result.regionBreakdown = getTopGroup('region');

  // 4. Time Series Trend
  if (result.hasMetric.date) {
    const datesMap: Record<string, { revenue: number; cost: number; profit: number; timestamp: number }> = {};
    
    cleanRows.forEach((row) => {
      const dateObj = row.date as Date;
      if (!dateObj || isNaN(dateObj.getTime())) return;

      // Decide label. Format Date to YYYY-MM-DD or YYYY-MM
      // Let's use YYYY-MM-DD for grouping first
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      const dayKey = `${year}-${month}-${day}`;
      const rev = row.revenue !== null ? Number(row.revenue) : 0;
      const cst = row.cost !== null ? Number(row.cost) : 0;
      const prf = row.profit !== null ? Number(row.profit) : 0;

      if (!datesMap[dayKey]) {
        datesMap[dayKey] = { revenue: 0, cost: 0, profit: 0, timestamp: dateObj.getTime() };
      }
      datesMap[dayKey].revenue += rev;
      datesMap[dayKey].cost += cst;
      datesMap[dayKey].profit += prf;
    });

    const dailyPoints = Object.entries(datesMap)
      .map(([dateStr, item]) => ({
        dateStr,
        revenue: Math.round(item.revenue * 100) / 100,
        cost: Math.round(item.cost * 100) / 100,
        profit: Math.round(item.profit * 100) / 100,
        timestamp: item.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // If there are too many unique dates (e.g. > 31), group by month to keep charts readable
    if (dailyPoints.length > 31) {
      const monthlyMap: Record<string, { revenue: number; cost: number; profit: number }> = {};
      dailyPoints.forEach((dp) => {
        const monthKey = dp.dateStr.slice(0, 7); // "YYYY-MM"
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { revenue: 0, cost: 0, profit: 0 };
        }
        monthlyMap[monthKey].revenue += dp.revenue;
        monthlyMap[monthKey].cost += dp.cost;
        monthlyMap[monthKey].profit += dp.profit;
      });

      result.timeTrend = Object.entries(monthlyMap)
        .map(([dateStr, item]) => ({
          dateStr, // Format YYYY-MM
          revenue: Math.round(item.revenue * 100) / 100,
          cost: Math.round(item.cost * 100) / 100,
          profit: Math.round(item.profit * 100) / 100
        }))
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    } else {
      result.timeTrend = dailyPoints.map(({ dateStr, revenue, cost, profit }) => ({
        dateStr,
        revenue,
        cost,
        profit
      }));
    }
  }

  return result;
}

/**
 * Prepares summary packet to be sent to Gemini API.
 * Keeps payload lightweight to avoid token limits on large datasets.
 */
export function compileGeminiPayload(
  cleanRows: any[],
  analytics: AnalyticsResult,
  columnMapping: Record<string, string>
) {
  // Capture column mapping information
  const columnsList = Object.entries(columnMapping).map(([raw, mapped]) => ({
    original: raw,
    mapped: mapped
  }));

  // Create a text tóm tắt
  const financeText = `
- Tổng số dòng dữ liệu: ${analytics.summary.totalRows}
- Doanh thu: ${analytics.summary.totalRevenue !== null ? analytics.summary.totalRevenue.toLocaleString('vi-VN') : 'Không có dữ liệu'}
- Chi phí: ${analytics.summary.totalCost !== null ? analytics.summary.totalCost.toLocaleString('vi-VN') : 'Không có dữ liệu'}
- Lợi nhuận: ${analytics.summary.totalProfit !== null ? analytics.summary.totalProfit.toLocaleString('vi-VN') : 'Không có dữ liệu'}
- Tỷ suất lợi nhuận: ${analytics.summary.profitMargin !== null ? `${analytics.summary.profitMargin.toFixed(2)}%` : 'Không có dữ liệu'}
- Số đơn hàng: ${analytics.summary.totalOrders !== null ? analytics.summary.totalOrders : 'Không có dữ liệu'}
  `.trim();

  // Pick top lists summaries
  const topProductsSummary = analytics.topProducts.slice(0, 5).map((p) => `${p.name}: ${p.value.toLocaleString('vi-VN')}`).join(', ');
  const topCustomersSummary = analytics.topCustomers.slice(0, 5).map((c) => `${c.name}: ${c.value.toLocaleString('vi-VN')}`).join(', ');
  const topEmployeesSummary = analytics.topEmployees.slice(0, 5).map((e) => `${e.name}: ${e.value.toLocaleString('vi-VN')}`).join(', ');
  const departmentSummary = analytics.departmentBreakdown.map((d) => `${d.name}: ${d.value.toLocaleString('vi-VN')}`).join(', ');
  const regionSummary = analytics.regionBreakdown.map((r) => `${r.name}: ${r.value.toLocaleString('vi-VN')}`).join(', ');

  // Get trend summary
  const trendSummary = analytics.timeTrend.slice(0, 6).map((t) => `${t.dateStr} (Doanh thu: ${t.revenue.toLocaleString('vi-VN')}, Lợi nhuận: ${t.profit.toLocaleString('vi-VN')})`).join('; ');

  // Generate 5 sample rows of actual data, omitting long values if any
  const sampleRows = cleanRows.slice(0, 5).map((row) => {
    const formatted: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      if (v instanceof Date) {
        formatted[k] = v.toISOString().split('T')[0];
      } else {
        formatted[k] = v;
      }
    });
    return formatted;
  });

  return {
    columns: columnsList,
    rowCount: analytics.summary.totalRows,
    summary: {
      financeText,
      topProducts: topProductsSummary || 'Không có dữ liệu',
      topCustomers: topCustomersSummary || 'Không có dữ liệu',
      topEmployees: topEmployeesSummary || 'Không có dữ liệu',
      departments: departmentSummary || 'Không có dữ liệu',
      regions: regionSummary || 'Không có dữ liệu',
      trends: trendSummary || 'Không có dữ liệu'
    },
    detectedMetrics: analytics.hasMetric,
    sampleRows,
    chartInsights: {
      hasTrend: analytics.timeTrend.length > 0,
      hasTopProducts: analytics.topProducts.length > 0,
      hasTopRegions: analytics.regionBreakdown.length > 0,
      hasTopCustomers: analytics.topCustomers.length > 0,
      hasTopEmployees: analytics.topEmployees.length > 0
    }
  };
}
