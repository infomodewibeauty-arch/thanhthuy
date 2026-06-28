'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AnalyticsResult } from '../utils/analyticsEngine';

interface ChartSectionProps {
  analytics: AnalyticsResult;
}

// Premium Chart Color Palette
const COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#3b82f6'  // Blue
];

export default function ChartSection({ analytics }: ChartSectionProps) {
  const { hasMetric, timeTrend, topProducts, topCustomers, topEmployees, departmentBreakdown, regionBreakdown } = analytics;

  // Custom tooltips with dark glassmorphic style
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md text-xs">
          <p className="font-semibold text-slate-200 mb-1">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} style={{ color: pld.color || pld.fill }} className="font-medium">
              {pld.name}: {typeof pld.value === 'number' ? pld.value.toLocaleString('vi-VN') : pld.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* 1. Time Series Area Chart */}
      {hasMetric.date && timeTrend.length > 0 && (
        <div className="p-6 rounded-2xl glass-panel shadow-lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-6">Xu hướng Doanh thu, Chi phí & Lợi nhuận</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="dateStr" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toLocaleString('vi-VN')}M` : val.toLocaleString('vi-VN')}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                {hasMetric.revenue && (
                  <Area 
                    type="monotone" 
                    name="Doanh thu" 
                    dataKey="revenue" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                )}
                {hasMetric.cost && (
                  <Area 
                    type="monotone" 
                    name="Chi phí" 
                    dataKey="cost" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    fill="transparent" 
                  />
                )}
                {hasMetric.profit && (
                  <Area 
                    type="monotone" 
                    name="Lợi nhuận" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2. Top Products Bar Chart */}
        {hasMetric.product && topProducts.length > 0 && (
          <div className="p-6 rounded-2xl glass-panel shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">Top 10 Sản phẩm Doanh số cao nhất</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toLocaleString('vi-VN')}M` : val.toLocaleString('vi-VN')}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar name="Doanh số" dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. Region Pie Chart */}
        {hasMetric.region && regionBreakdown.length > 0 && (
          <div className="p-6 rounded-2xl glass-panel shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">Cơ cấu Doanh thu theo Khu vực</h3>
            <div className="w-full h-80 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-1/2 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {regionBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-2">
                {regionBreakdown.slice(0, 6).map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate max-w-[120px] font-medium">{entry.name}:</span>
                    <span className="ml-auto font-bold text-slate-100">{entry.value.toLocaleString('vi-VN')} ₫</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. Department Pie Chart */}
        {hasMetric.department && departmentBreakdown.length > 0 && (
          <div className="p-6 rounded-2xl glass-panel shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">Doanh thu theo Phòng ban / Bộ phận</h3>
            <div className="w-full h-80 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-1/2 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      {departmentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-2">
                {departmentBreakdown.slice(0, 6).map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                    <span className="truncate max-w-[120px] font-medium">{entry.name}:</span>
                    <span className="ml-auto font-bold text-slate-100">{entry.value.toLocaleString('vi-VN')} ₫</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. Top Customers Bar Chart */}
        {hasMetric.customer && topCustomers.length > 0 && (
          <div className="p-6 rounded-2xl glass-panel shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">Top 5 Khách hàng lớn nhất</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers.slice(0, 5)} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toLocaleString('vi-VN')}M` : val.toLocaleString('vi-VN')}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar name="Chi tiêu" dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 6. Top Employees Bar Chart */}
        {hasMetric.employee && topEmployees.length > 0 && (
          <div className="p-6 rounded-2xl glass-panel shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">Top 5 Nhân viên Doanh số xuất sắc</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEmployees.slice(0, 5)} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toLocaleString('vi-VN')}M` : val.toLocaleString('vi-VN')}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar name="Doanh số đạt" dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
