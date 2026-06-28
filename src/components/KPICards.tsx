'use client';

import React from 'react';
import { Database, TrendingUp, CreditCard, Coins, Percent, ShoppingBag } from 'lucide-react';
import { FinancialSummary } from '../utils/analyticsEngine';

interface KPICardsProps {
  summary: FinancialSummary;
  hasMetric: Record<string, boolean>;
}

export default function KPICards({ summary, hasMetric }: KPICardsProps) {
  // Helper to format currency or numbers
  const formatCurrency = (val: number | null) => {
    if (val === null) return 'N/A';
    // If it looks like integer or large numbers, format nicely
    return Math.round(val).toLocaleString('vi-VN') + ' ₫';
  };

  const formatPercentage = (val: number | null) => {
    if (val === null) return 'N/A';
    return val.toFixed(2) + '%';
  };

  const cards = [
    {
      id: 'total-rows',
      title: 'Tổng số dòng dữ liệu',
      value: summary.totalRows.toLocaleString('vi-VN'),
      icon: Database,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/10',
      visible: true
    },
    {
      id: 'revenue',
      title: 'Tổng doanh thu',
      value: formatCurrency(summary.totalRevenue),
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/10',
      visible: hasMetric.revenue
    },
    {
      id: 'cost',
      title: 'Tổng chi phí',
      value: formatCurrency(summary.totalCost),
      icon: CreditCard,
      color: 'from-rose-500 to-orange-500',
      shadow: 'shadow-rose-500/10',
      visible: hasMetric.cost
    },
    {
      id: 'profit',
      title: 'Tổng lợi nhuận',
      value: formatCurrency(summary.totalProfit),
      icon: Coins,
      color: 'from-violet-500 to-indigo-500',
      shadow: 'shadow-violet-500/10',
      visible: hasMetric.profit
    },
    {
      id: 'margin',
      title: 'Tỷ suất lợi nhuận',
      value: formatPercentage(summary.profitMargin),
      icon: Percent,
      color: 'from-amber-500 to-yellow-500',
      shadow: 'shadow-amber-500/10',
      visible: hasMetric.revenue && hasMetric.profit
    },
    {
      id: 'orders',
      title: 'Tổng số đơn hàng',
      value: summary.totalOrders !== null ? summary.totalOrders.toLocaleString('vi-VN') : 'N/A',
      icon: ShoppingBag,
      color: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-fuchsia-500/10',
      visible: hasMetric.order
    }
  ];

  const visibleCards = cards.filter((c) => c.visible);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {visibleCards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className={`p-6 rounded-2xl glass-panel glass-panel-hover shadow-lg ${card.shadow} flex items-center justify-between group overflow-hidden relative`}
          >
            {/* Ambient Background Glow inside the card */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-white/5 to-white/0 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
            
            <div className="flex flex-col">
              <span className="text-slate-400 text-sm font-medium mb-1.5">{card.title}</span>
              <span className="text-2xl font-bold text-slate-100 tracking-tight">
                {card.value}
              </span>
            </div>

            <div className={`p-4 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md shadow-black/15 group-hover:rotate-6 transition-transform duration-300`}>
              <IconComponent className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
