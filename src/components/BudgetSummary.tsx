import { PieChart } from "lucide-react";
import { calculateBudgetSummary } from "@/lib/aiPlanner";
import type { BudgetLineItem } from "@/types/travel";

export type BudgetSummaryProps = {
  items: BudgetLineItem[];
};

const categoryLabels: Record<BudgetLineItem["category"], string> = {
  transport: "交通",
  accommodation: "住宿",
  dining: "餐饮",
  activities: "活动",
  shopping: "购物",
  misc: "其他",
};

export function BudgetSummary({ items }: BudgetSummaryProps) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        暂无预算记录，生成行程后自动填充。
      </div>
    );
  }

  const summary = calculateBudgetSummary(items);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">预算概览</h2>
          <p className="text-sm text-slate-500">AI 会根据偏好自动估算每天的花费，支持手动调整。</p>
        </div>
        <PieChart className="h-6 w-6 text-cyan-500" />
      </header>
      <div className="mt-6 space-y-4">
        <div className="rounded-lg bg-cyan-50 p-4">
          <p className="text-xs text-cyan-600">总预算估算</p>
          <p className="text-2xl font-semibold text-cyan-900">¥{summary.total.toFixed(0)}</p>
        </div>
        <ul className="space-y-3">
          {Object.entries(summary.byCategory).map(([category, amount]) => (
            <li key={category} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
              <span className="text-sm font-medium text-slate-700">{categoryLabels[category as BudgetLineItem["category"]] ?? category}</span>
              <span className="text-sm font-semibold text-slate-900">¥{amount.toFixed(0)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
