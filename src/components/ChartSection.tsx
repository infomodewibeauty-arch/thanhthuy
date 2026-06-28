'use client';

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { UnifiedAnalyticsResult } from '../utils/analyticsEngine';
import { HRAnalyticsResult } from '../utils/hrAnalytics';
import { SalesAnalyticsResult } from '../utils/salesAnalytics';
import { GenericAnalyticsResult } from '../utils/genericAnalytics';
import { AlertTriangle } from 'lucide-react';

const COLORS = [
  '#6366f1','#10b981','#06b6d4','#f59e0b','#8b5cf6',
  '#ec4899','#f43f5e','#3b82f6','#14b8a6','#f97316',
];

interface ChartSectionProps {
  analytics: UnifiedAnalyticsResult;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md text-xs">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((pld: any, i: number) => (
        <p key={i} style={{ color: pld.color || pld.fill }} className="font-medium">
          {pld.name}: {typeof pld.value === 'number' ? pld.value.toLocaleString('vi-VN') : pld.value}
        </p>
      ))}
    </div>
  );
};

// ─── Reusable chart widgets ────────────────────────────────────────────────

function PieWidget({ title, data, colorOffset = 0 }: {
  title: string;
  data: { name: string; count: number }[];
  colorOffset?: number;
}) {
  if (!data.length) return null;
  const chartData = data.slice(0, 8).map((d) => ({ name: d.name, value: d.count }));
  return (
    <div className="p-5 rounded-2xl glass-panel shadow-lg">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-48 h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                paddingAngle={3} dataKey="value">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center text-xs gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[(i + colorOffset) % COLORS.length] }} />
              <span className="text-slate-300 truncate max-w-[120px]">{item.name}</span>
              <span className="ml-auto font-bold text-slate-100">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarWidget({ title, data, color, labelKey = 'name', valueKey = 'count', horizontal = false }: {
  title: string;
  data: { name: string; count?: number; value?: number }[];
  color: string;
  labelKey?: string;
  valueKey?: string;
  horizontal?: boolean;
}) {
  if (!data.length) return null;
  const chartData = data.slice(0, 10).map((d: any) => ({
    name: d.name,
    value: d[valueKey] ?? d.count ?? 0,
  }));
  return (
    <div className="p-5 rounded-2xl glass-panel shadow-lg">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">{title}</h3>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          {horizontal ? (
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false}
                tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v.toLocaleString('vi-VN')} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar name={title} dataKey="value" fill={color} radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false}
                angle={-30} textAnchor="end" interval={0} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar name={title} dataKey="value" fill={color} radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── HR Chart Section ──────────────────────────────────────────────────────
function HRCharts({ r }: { r: HRAnalyticsResult }) {
  const { summary, detectedCols } = r;
  const noCharts = !summary.byDepartment.length && !summary.byGender.length &&
    !summary.byLocation.length && !summary.byJobLevel.length;

  if (noCharts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <AlertTriangle className="w-10 h-10 mb-3 text-amber-400" />
        <p>Không đủ dữ liệu phân nhóm để vẽ biểu đồ.</p>
      </div>
    );
  }

  // Flight risk progress bars
  const FlightRiskBars = () => {
    if (!summary.byFlightRisk.length) return null;
    const total = summary.byFlightRisk.reduce((s, x) => s + x.count, 0);
    const riskColors: Record<string, string> = {
      high: '#f43f5e', cao: '#f43f5e', low: '#10b981', thap: '#10b981',
      medium: '#f59e0b', trung: '#f59e0b',
    };
    return (
      <div className="p-5 rounded-2xl glass-panel shadow-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Phân bổ Flight Risk (Rủi ro nghỉ việc)</h3>
        <div className="space-y-3">
          {summary.byFlightRisk.map((item) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            const col = riskColors[item.name.toLowerCase()] ?? '#6366f1';
            return (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{item.name}</span>
                  <span className="text-slate-400">{item.count} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: col }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Performance distribution
  const PerformanceBars = () => {
    if (!summary.byPerformance.length) return null;
    const total = summary.byPerformance.reduce((s, x) => s + x.count, 0);
    const perfColors = ['#6366f1','#10b981','#f59e0b','#f43f5e','#8b5cf6'];
    return (
      <div className="p-5 rounded-2xl glass-panel shadow-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Phân bổ Hiệu suất (Performance)</h3>
        <div className="space-y-3">
          {summary.byPerformance.map((item, i) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{item.name}</span>
                  <span className="text-slate-400">{item.count} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: perfColors[i % perfColors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Department + Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary.byDepartment.length > 0 && (
          <BarWidget
            title="Nhân sự theo Phòng ban"
            data={summary.byDepartment.map((d) => ({ ...d, value: d.count }))}
            color="#6366f1"
            valueKey="value"
          />
        )}
        {summary.byLocation.length > 0 && (
          <PieWidget title="Phân bổ theo Địa điểm" data={summary.byLocation} colorOffset={2} />
        )}
      </div>

      {/* Row 2: Business Unit + Job Level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary.byBusinessUnit.length > 0 && (
          <BarWidget
            title="Nhân sự theo Business Unit"
            data={summary.byBusinessUnit.map((d) => ({ ...d, value: d.count }))}
            color="#10b981"
            valueKey="value"
            horizontal
          />
        )}
        {summary.byJobLevel.length > 0 && (
          <BarWidget
            title="Phân bổ theo Job Level"
            data={summary.byJobLevel.map((d) => ({ ...d, value: d.count }))}
            color="#8b5cf6"
            valueKey="value"
          />
        )}
      </div>

      {/* Row 3: Gender + Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary.byGender.length > 0 && (
          <PieWidget title="Phân bổ theo Giới tính" data={summary.byGender} colorOffset={4} />
        )}
        {summary.byTeam.length > 0 && (
          <BarWidget
            title="Nhân sự theo Team"
            data={summary.byTeam.map((d) => ({ ...d, value: d.count }))}
            color="#06b6d4"
            valueKey="value"
            horizontal
          />
        )}
      </div>

      {/* Row 4: Performance + Flight Risk + Potential */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceBars />
        <FlightRiskBars />
        {summary.byPotential.length > 0 && (
          <PieWidget title="Phân bổ Potential" data={summary.byPotential} colorOffset={6} />
        )}
      </div>

      {/* High Flight Risk Table */}
      {summary.highFlightRisk.length > 0 && (
        <div className="p-5 rounded-2xl glass-panel shadow-lg">
          <h3 className="text-sm font-semibold text-rose-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danh sách nhân sự có Flight Risk cao ({summary.highFlightRisk.length} người)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/60">
                  {Object.keys(summary.highFlightRisk[0] || {}).slice(0, 8).map((k) => (
                    <th key={k} className="text-left py-2 px-3 text-slate-400 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.highFlightRisk.slice(0, 15).map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                    {Object.values(row).slice(0, 8).map((val: any, j) => (
                      <td key={j} className="py-1.5 px-3 text-slate-300">
                        {val?.toString() ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sales Chart Section ──────────────────────────────────────────────────
function SalesCharts({ r }: { r: SalesAnalyticsResult }) {
  const { detectedCols, timeTrend, topProducts, topCustomers, topEmployees, departmentBreakdown, regionBreakdown } = r;
  return (
    <div className="space-y-6">
      {/* Time trend */}
      {timeTrend.length > 0 && (
        <div className="p-5 rounded-2xl glass-panel shadow-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Xu hướng Doanh thu & Lợi nhuận</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v.toLocaleString('vi-VN')} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                {detectedCols['revenue'] && (
                  <Area type="monotone" name="Doanh thu" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#gradRev)" />
                )}
                {detectedCols['profit'] && (
                  <Area type="monotone" name="Lợi nhuận" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradProfit)" />
                )}
                {detectedCols['cost'] && (
                  <Area type="monotone" name="Chi phí" dataKey="cost" stroke="#f43f5e" strokeWidth={2} fill="transparent" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topProducts.length > 0 && (
          <BarWidget title="Top Sản phẩm" data={topProducts.map((d) => ({ ...d, count: d.count }))} color="#6366f1" valueKey="value" horizontal />
        )}
        {regionBreakdown.length > 0 && (
          <PieWidget title="Doanh số theo Khu vực" data={regionBreakdown.map((d) => ({ name: d.name, count: d.count }))} />
        )}
        {topCustomers.length > 0 && (
          <BarWidget title="Top Khách hàng" data={topCustomers.map((d) => ({ ...d, count: d.count }))} color="#10b981" valueKey="value" horizontal />
        )}
        {topEmployees.length > 0 && (
          <BarWidget title="Top Nhân viên" data={topEmployees.map((d) => ({ ...d, count: d.count }))} color="#8b5cf6" valueKey="value" />
        )}
        {departmentBreakdown.length > 0 && (
          <PieWidget title="Doanh số theo Phòng ban" data={departmentBreakdown.map((d) => ({ name: d.name, count: d.count }))} colorOffset={2} />
        )}
      </div>
    </div>
  );
}

// ─── Generic Chart Section ────────────────────────────────────────────────
function GenericCharts({ r }: { r: GenericAnalyticsResult }) {
  const categoryCols = r.summary.columns.filter(
    (c) => c.kind === 'category' && c.topValues.length > 1
  ).slice(0, 6);

  if (!categoryCols.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <AlertTriangle className="w-10 h-10 mb-3 text-amber-400" />
        <p>Không phát hiện cột danh mục phù hợp để vẽ biểu đồ.</p>
        <p className="text-xs mt-1">Hãy xem bảng dữ liệu bên dưới.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {categoryCols.map((col, ci) => (
        <PieWidget
          key={col.name}
          title={`Phân bổ: ${col.name}`}
          data={col.topValues.map((v) => ({ name: v.name, count: v.count }))}
          colorOffset={ci * 2}
        />
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────
export default function ChartSection({ analytics }: ChartSectionProps) {
  if (analytics.datasetType === 'HR_WORKFORCE') {
    return <HRCharts r={analytics as HRAnalyticsResult} />;
  }
  if (analytics.datasetType === 'SALES_FINANCE') {
    return <SalesCharts r={analytics as SalesAnalyticsResult} />;
  }
  return <GenericCharts r={analytics as GenericAnalyticsResult} />;
}
