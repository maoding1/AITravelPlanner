import { Clock, MapPin } from "lucide-react";
import type { ItineraryDay } from "@/types/travel";

export type ItineraryTimelineProps = {
  days: ItineraryDay[];
};

export function ItineraryTimeline({ days }: ItineraryTimelineProps) {
  if (!days.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        暂无行程数据，请先生成计划。
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    transport: "交通",
    accommodation: "住宿",
    sightseeing: "景点",
    dining: "餐饮",
    experience: "体验",
    shopping: "购物",
    other: "其他",
  };

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.date} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{day.date}</h3>
              <p className="text-sm text-slate-500">{day.summary}</p>
            </div>
          </header>
          <ol className="space-y-4">
            {day.activities.map((activity) => (
              <li key={activity.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">{activity.title}</h4>
                    {activity.category && (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
                        {categoryLabels[activity.category] ?? activity.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {activity.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.startTime}
                        {activity.endTime ? ` - ${activity.endTime}` : ""}
                      </span>
                    )}
                    {activity.location && (
                      (() => {
                        const hasCoordinates =
                          (activity.location?.lat ?? 0) !== 0 || (activity.location?.lng ?? 0) !== 0;
                        const encodedName = encodeURIComponent(activity.location!.name);
                        const mapUrl = hasCoordinates
                          ? `https://uri.amap.com/marker?position=${activity.location!.lng},${activity.location!.lat}&name=${encodedName}&callnative=0`
                          : `https://uri.amap.com/search?keyword=${encodedName}&callnative=0`;
                        return (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
                          >
                            <MapPin className="h-3 w-3" />
                            {activity.location!.name}
                          </a>
                        );
                      })()
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{activity.description}</p>
                {activity.estimatedCost && (
                  <p className="mt-2 text-xs text-slate-500">预计花费：¥{activity.estimatedCost.toFixed(0)}</p>
                )}
                {activity.bookingUrl && (
                  <a
                    href={activity.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-medium text-cyan-600 hover:text-cyan-700"
                  >
                    查看预定链接
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
