"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ItineraryListItem = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
};

export type DashboardItineraryListProps = {
  items: ItineraryListItem[];
};

export function DashboardItineraryList({ items }: DashboardItineraryListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/itineraries/${id}`, {
          method: "DELETE",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          console.error("Failed to delete itinerary", response.status, await response.text());
          return;
        }

        const payload = await response.json().catch(() => null);
        console.info("Itinerary deleted", id, payload);

        if (!payload?.success) {
          console.error("Delete API did not confirm success", payload);
          return;
        }

        setLocalItems((prev) => prev.filter((item) => item.id !== id));
        router.refresh();
      } catch (error) {
        console.error("Failed to delete itinerary", error);
      }
    });
  };

  if (!localItems.length) {
    return <p className="text-sm text-slate-500">暂无行程，回到首页生成一份专属计划吧。</p>;
  }

  return (
    <section className="space-y-4">
      {localItems.map((item) => (
        <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="text-sm text-slate-500">
                {item.destination} · {item.start_date} - {item.end_date}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">预算</p>
              <p className="text-base font-semibold text-slate-900">
                {item.currency} {item.budget.toFixed(0)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/${item.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
            >
              查看详情
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              删除
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
