'use client';

import React from 'react';
import {
  Users, UserCheck, UserMinus, TrendingDown, Clock, CalendarDays,
  TrendingUp, CreditCard, Coins, Percent, ShoppingBag, Database,
  LayoutGrid, Hash, AlignLeft, Calendar
} from 'lucide-react';
import { UnifiedAnalyticsResult } from '../utils/analyticsEngine';
import { HRAnalyticsResult } from '../utils/hrAnalytics';
import { SalesAnalyticsResult } from '../utils/salesAnalytics';
import { GenericAnalyticsResult } from '../utils/genericAnalytics';

interface KPICardsProps {
  analytics: UnifiedAnalyticsResult;
}

interface KPICard {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  shadow: string;
  visible: boolean;
}

// ─── HR KPI Cards ────────────────────────────────────────────────────────────
function buildHRCards(r: HRAnalyticsResult): KPICard[] {
  const { summary, detectedCols } = r;
  const pct = (n: number | null) => n !== null ? n.toFixed(1) + '%' : 'N/A';
  const num = (n: number | null | undefined) => n !== null && n !== undefined ? n.toLocaleString('vi-VN') : 'N/A';

  return [
    {
      id: 'total',
      title: 'Tổng nhân sự',
      value: num(summary.totalEmployees),
      subtitle: 'Headcount',
      icon: Users,
      color: 'from-indigo-500 to-violet-600',
      shadow: 'shadow-indigo-500/15',
      visible: true,
    },
    {
      id: 'active',
      title: 'Đang làm việc',
      value: num(summary.activeCount),
      subtitle: 'Active',
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/15',
      visible: detectedCols['employment_status'] || true,
    },
    {
      id: 'inactive',
      title: 'Đã nghỉ việc',
      value: num(summary.inactiveCount),
      subtitle: 'Inactive / Left',
      icon: UserMinus,
      color: 'from-rose-500 to-pink-500',
      shadow: 'shadow-rose-500/15',
      visible: summary.inactiveCount > 0,
    },
    {
      id: 'attrition',
      title: 'Tỷ lệ nghỉ việc',
      value: pct(summary.attritionRate),
      subtitle: `${summary.attritionCount} người`,
      icon: TrendingDown,
      color: 'from-orange-500 to-red-500',
      shadow: 'shadow-orange-500/15',
      visible: summary.attritionRate !== null,
    },
    {
      id: 'avg-age',
      title: 'Độ tuổi TB',
      value: summary.avgAge !== null ? summary.avgAge.toString() + ' tuổi' : 'N/A',
      subtitle: 'Trung bình',
      icon: CalendarDays,
      color: 'from-cyan-500 to-blue-500',
      shadow: 'shadow-cyan-500/15',
      visible: summary.avgAge !== null,
    },
    {
      id: 'tenure',
      title: 'Thâm niên TB',
      value: summary.avgTenureYears !== null ? summary.avgTenureYears.toFixed(1) + ' năm' : 'N/A',
      subtitle: 'Trung bình',
      icon: Clock,
      color: 'from-amber-500 to-yellow-500',
      shadow: 'shadow-amber-500/15',
      visible: summary.avgTenureYears !== null,
    },
  ];
}

// ─── Sales KPI Cards ─────────────────────────────────────────────────────────
function buildSalesCards(r: SalesAnalyticsResult): KPICard[] {
  const { summary, detectedCols } = r;
  const fmt = (v: number | null) =>
    v !== null ? Math.round(v).toLocaleString('vi-VN') + ' ₫' : 'N/A';

  return [
    {
      id: 'rows',
      title: 'Tổng số dòng',
      value: summary.totalRows.toLocaleString('vi-VN'),
      icon: Database,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/10',
      visible: true,
    },
    {
      id: 'revenue',
      title: 'Tổng doanh thu',
      value: fmt(summary.totalRevenue),
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/10',
      visible: detectedCols['revenue'],
    },
    {
      id: 'cost',
      title: 'Tổng chi phí',
      value: fmt(summary.totalCost),
      icon: CreditCard,
      color: 'from-rose-500 to-orange-500',
      shadow: 'shadow-rose-500/10',
      visible: detectedCols['cost'],
    },
    {
      id: 'profit',
      title: 'Tổng lợi nhuận',
      value: fmt(summary.totalProfit),
      icon: Coins,
      color: 'from-violet-500 to-indigo-500',
      shadow: 'shadow-violet-500/10',
      visible: detectedCols['profit'],
    },
    {
      id: 'margin',
      title: 'Tỷ suất lợi nhuận',
      value: summary.profitMargin !== null ? summary.profitMargin.toFixed(2) + '%' : 'N/A',
      icon: Percent,
      color: 'from-amber-500 to-yellow-500',
      shadow: 'shadow-amber-500/10',
      visible: detectedCols['revenue'] && detectedCols['profit'],
    },
    {
      id: 'orders',
      title: 'Tổng đơn hàng',
      value: summary.totalOrders !== null ? summary.totalOrders.toLocaleString('vi-VN') : 'N/A',
      icon: ShoppingBag,
      color: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-fuchsia-500/10',
      visible: detectedCols['order'],
    },
  ];
}

// ─── Generic KPI Cards ────────────────────────────────────────────────────────
function buildGenericCards(r: GenericAnalyticsResult): KPICard[] {
  const { summary } = r;
  return [
    {
      id: 'rows',
      title: 'Tổng số dòng',
      value: summary.totalRows.toLocaleString('vi-VN'),
      icon: Database,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/10',
      visible: true,
    },
    {
      id: 'cols',
      title: 'Tổng số cột',
      value: summary.totalCols.toString(),
      icon: LayoutGrid,
      color: 'from-indigo-500 to-violet-500',
      shadow: 'shadow-indigo-500/10',
      visible: true,
    },
    {
      id: 'numeric',
      title: 'Cột số',
      value: summary.numericCols.toString(),
      icon: Hash,
      color: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/10',
      visible: true,
    },
    {
      id: 'category',
      title: 'Cột danh mục',
      value: summary.categoryCols.toString(),
      icon: AlignLeft,
      color: 'from-amber-500 to-yellow-500',
      shadow: 'shadow-amber-500/10',
      visible: true,
    },
    {
      id: 'date',
      title: 'Cột ngày tháng',
      value: summary.dateCols.toString(),
      icon: Calendar,
      color: 'from-rose-500 to-pink-500',
      shadow: 'shadow-rose-500/10',
      visible: true,
    },
  ];
}

export default function KPICards({ analytics }: KPICardsProps) {
  let cards: KPICard[];

  if (analytics.datasetType === 'HR_WORKFORCE') {
    cards = buildHRCards(analytics as HRAnalyticsResult);
  } else if (analytics.datasetType === 'SALES_FINANCE') {
    cards = buildSalesCards(analytics as SalesAnalyticsResult);
  } else {
    cards = buildGenericCards(analytics as GenericAnalyticsResult);
  }

  const visible = cards.filter((c) => c.visible);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
      {visible.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`p-6 rounded-2xl glass-panel shadow-lg ${card.shadow} flex items-center justify-between group overflow-hidden relative`}
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-white/5 to-white/0 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex flex-col min-w-0">
              <span className="text-slate-400 text-xs font-medium mb-1 truncate">{card.title}</span>
              <span className="text-2xl font-bold text-slate-100 tracking-tight truncate">{card.value}</span>
              {card.subtitle && (
                <span className="text-slate-500 text-xs mt-1">{card.subtitle}</span>
              )}
            </div>
            <div className={`p-3.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md shadow-black/15 group-hover:rotate-6 transition-transform duration-300 shrink-0 ml-4`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
