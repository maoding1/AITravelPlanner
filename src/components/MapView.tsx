"use client";

import { useEffect, useRef } from "react";
import type { ItineraryDay } from "@/types/travel";

type AMapMarker = {
  setMap: (map: AMapMap | null) => void;
};

type AMapMarkerOptions = {
  position: [number, number];
  title: string;
  icon?: string;
};

type AMapPolyline = {
  setMap: (map: AMapMap | null) => void;
};

type AMapPolylineOptions = {
  path: [number, number][];
  strokeColor: string;
  strokeWeight?: number;
  lineJoin?: "round" | "miter" | "bevel";
  lineCap?: "round" | "square" | "butt";
  showDir?: boolean;
  zIndex?: number;
};

type AMapMap = {
  setFitView?: (markers: AMapMarker[]) => void;
  destroy?: () => void;
};

type AMapPoi = {
  name?: string;
  location?:
  | {
    getLng?: () => number;
    getLat?: () => number;
    lng?: number;
    lat?: number;
  }
  | string;
};

type AMapPlaceSearch = {
  search: (
    keyword: string,
    callback: (status: "complete" | "no_data" | string, result: { poiList?: { pois?: AMapPoi[] } }) => void
  ) => void;
};

type AMapGlobal = {
  Map: new (container: HTMLDivElement, options: { resizeEnable: boolean; zoom: number }) => AMapMap;
  Marker: new (options: AMapMarkerOptions) => AMapMarker;
  Polyline: new (options: AMapPolylineOptions) => AMapPolyline;
  PlaceSearch?: new (options: { city?: string; pageSize?: number }) => AMapPlaceSearch;
};

declare global {
  interface Window {
    AMap?: AMapGlobal;
  }
}

export type MapViewProps = {
  days: ItineraryDay[];
};

export function MapView({ days }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<AMapMarker[]>([]);
  const polylinesRef = useRef<AMapPolyline[]>([]);
  const mapRef = useRef<AMapMap | null>(null);
  const placeSearchRef = useRef<AMapPlaceSearch | null>(null);
  const geocodeCacheRef = useRef<Map<string, [number, number]>>(new Map());

  useEffect(() => {
    const globalAMap = window.AMap;
    if (!globalAMap) {
      console.warn("AMap JS SDK not loaded. Ensure the script tag is injected via layout.");
      return () => undefined;
    }

    if (mapContainerRef.current) {
      mapRef.current = new globalAMap.Map(mapContainerRef.current, {
        resizeEnable: true,
        zoom: 11,
      });
    }

    if (!placeSearchRef.current && typeof globalAMap.PlaceSearch === "function") {
      placeSearchRef.current = new globalAMap.PlaceSearch({ city: "全国", pageSize: 5 });
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach((line) => line.setMap(null));
      polylinesRef.current = [];
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const globalAMap = window.AMap;
    const map = mapRef.current;
    if (!globalAMap || !map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((line) => line.setMap(null));
    polylinesRef.current = [];

    const dayPoints = days.map((day) =>
      day.activities
        .filter((activity) => Boolean(activity.location))
        .map((activity) => ({
          name: activity.location!.name,
          position: [activity.location!.lng, activity.location!.lat] as [number, number],
        }))
    );

    const points = dayPoints.flat();

    const validPoints = points.filter((point) =>
      Number.isFinite(point.position[0]) && Number.isFinite(point.position[1]) && (point.position[0] !== 0 || point.position[1] !== 0)
    );

    validPoints.forEach((point, idx) => {
      const marker = new globalAMap.Marker({
        position: point.position,
        title: point.name,
        icon: `https://webapi.amap.com/theme/v1.3/markers/n/mark_b${(idx % 10) + 1}.png`,
      });
      marker.setMap(map);
      markersRef.current.push(marker);
    });

    const unresolvedNames = points
      .filter((point) => point.position[0] === 0 && point.position[1] === 0 && point.name)
      .map((point) => point.name);

    const placeSearch = placeSearchRef.current;

    unresolvedNames.forEach((name) => {
      if (!name) {
        return;
      }

      if (geocodeCacheRef.current.has(name)) {
        const position = geocodeCacheRef.current.get(name)!;
        const marker = new globalAMap.Marker({ position, title: name });
        marker.setMap(map);
        markersRef.current.push(marker);
        return;
      }

      placeSearch?.search(name, (status, result) => {
        if (status !== "complete" || !result.poiList?.pois?.length) {
          return;
        }

        const poi = result.poiList.pois[0];
        if (!poi.location) {
          return;
        }

        let lng = 0;
        let lat = 0;

        if (typeof poi.location === "string") {
          const [lngStr, latStr] = poi.location.split(",");
          lng = Number(lngStr);
          lat = Number(latStr);
        } else {
          lng = poi.location.lng ?? poi.location.getLng?.() ?? 0;
          lat = poi.location.lat ?? poi.location.getLat?.() ?? 0;
        }

        if (!Number.isFinite(lng) || !Number.isFinite(lat) || (!lng && !lat)) {
          return;
        }

        const position: [number, number] = [lng, lat];
        geocodeCacheRef.current.set(name, position);
        const marker = new globalAMap.Marker({ position, title: poi.name ?? name });
        marker.setMap(map);
        markersRef.current.push(marker);
        map.setFitView?.(markersRef.current);
      });
    });

    if (markersRef.current.length) {
      map.setFitView?.(markersRef.current);
    }

    const palette = ["#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ec4899", "#64748b"];

    dayPoints.forEach((pointsOfDay, dayIndex) => {
      const path = pointsOfDay
        .filter((point) =>
          Number.isFinite(point.position[0]) && Number.isFinite(point.position[1]) && (point.position[0] !== 0 || point.position[1] !== 0)
        )
        .map((point) => point.position);

      if (path.length < 2) {
        return;
      }

      const polyline = new globalAMap.Polyline({
        path,
        strokeColor: palette[dayIndex % palette.length],
        strokeWeight: 4,
        lineJoin: "round",
        lineCap: "round",
        showDir: true,
        zIndex: 60,
      });
      polyline.setMap(map);
      polylinesRef.current.push(polyline);
    });
  }, [days]);

  return <div ref={mapContainerRef} className="h-72 w-full rounded-xl border border-slate-200" />;
}
