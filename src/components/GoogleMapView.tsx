/// <reference types="google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DrawMode, LatLng, Restaurant } from '../types/restaurant';
import { loadGoogleMapsScript } from '../utils/placesApi';

interface GoogleMapViewProps {
  apiKey: string;
  center: LatLng;
  circleCenter: LatLng;
  radiusMeters: number;
  drawMode: DrawMode;
  polygon: LatLng[];
  isPolygonClosed: boolean;
  restaurants: Restaurant[];
  selectedId: string | null;
  onCircleCenterChange: (center: LatLng) => void;
  onPolygonChange: (points: LatLng[], closed: boolean) => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onSdkError: (msg: string) => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  apiKey,
  center,
  circleCenter,
  radiusMeters,
  drawMode,
  polygon,
  isPolygonClosed,
  restaurants,
  selectedId,
  onCircleCenterChange,
  onPolygonChange,
  onSelectRestaurant,
  onSdkError,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const centerMarkerRef = useRef<google.maps.Marker | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [sdkReady, setSdkReady] = useState(false);

  // 初始化 Google Maps
  useEffect(() => {
    let mounted = true;
    loadGoogleMapsScript(apiKey)
      .then((g) => {
        if (!mounted || !mapContainerRef.current) return;
        const map = new g.maps.Map(mapContainerRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        setSdkReady(true);
      })
      .catch((err) => {
        if (mounted) onSdkError(err instanceof Error ? err.message : 'Google Maps 載入失敗');
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // 同步地圖中心
  useEffect(() => {
    if (sdkReady && mapRef.current) {
      mapRef.current.panTo(center);
    }
  }, [center, sdkReady]);

  // 繪製圓形半徑 / 可拖曳中心點
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.google) return;
    const g = window.google;

    if (circleRef.current) circleRef.current.setMap(null);
    if (centerMarkerRef.current) centerMarkerRef.current.setMap(null);

    if (drawMode === 'circle') {
      const circle = new g.maps.Circle({
        map: mapRef.current,
        center: circleCenter,
        radius: radiusMeters,
        fillColor: '#f97316',
        fillOpacity: 0.14,
        strokeColor: '#f97316',
        strokeOpacity: 0.85,
        strokeWeight: 2,
      });
      circleRef.current = circle;

      const marker = new g.maps.Marker({
        map: mapRef.current,
        position: circleCenter,
        draggable: true,
        title: '拖曳調整搜尋中心點',
      });
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          onCircleCenterChange({ lat: pos.lat(), lng: pos.lng() });
        }
      });
      centerMarkerRef.current = marker;
    }
  }, [sdkReady, drawMode, circleCenter, radiusMeters, onCircleCenterChange]);

  // 多邊形繪製與點擊事件
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;

    if (polygonRef.current) polygonRef.current.setMap(null);
    if (polylineRef.current) polylineRef.current.setMap(null);

    let clickListener: google.maps.MapsEventListener | null = null;

    if (drawMode === 'polygon') {
      if (isPolygonClosed && polygon.length >= 3) {
        polygonRef.current = new g.maps.Polygon({
          map,
          paths: polygon,
          fillColor: '#f97316',
          fillOpacity: 0.18,
          strokeColor: '#ea580c',
          strokeWeight: 2.5,
        });
      } else if (polygon.length > 0) {
        polylineRef.current = new g.maps.Polyline({
          map,
          path: polygon,
          strokeColor: '#ea580c',
          strokeWeight: 2.5,
        });
      }

      if (!isPolygonClosed) {
        clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onPolygonChange([...polygon, { lat: e.latLng.lat(), lng: e.latLng.lng() }], false);
        });
      }
    }

    return () => {
      if (clickListener) g.maps.event.removeListener(clickListener);
    };
  }, [sdkReady, drawMode, polygon, isPolygonClosed, onPolygonChange]);

  // 餐廳圖釘 Markers
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = restaurants.map((r) => {
      const isSelected = r.id === selectedId;
      const marker = new g.maps.Marker({
        map,
        position: { lat: r.lat, lng: r.lng },
        title: `${r.name} (${r.rating}★)`,
        label: {
          text: r.rating.toFixed(1),
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 'bold',
        },
        zIndex: isSelected ? 999 : 1,
      });
      marker.addListener('click', () => {
        onSelectRestaurant(r);
      });
      return marker;
    });
  }, [sdkReady, restaurants, selectedId, onSelectRestaurant]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {drawMode === 'polygon' && (
        <div className="absolute bottom-24 lg:bottom-5 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs">
          {!isPolygonClosed ? (
            <>
              <span className="text-slate-700 font-medium">
                點擊地圖放置多邊形頂點（已放 {polygon.length} 點）
              </span>
              {polygon.length >= 3 && (
                <button
                  type="button"
                  onClick={() => onPolygonChange(polygon, true)}
                  className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 cursor-pointer"
                >
                  完成封閉
                </button>
              )}
            </>
          ) : (
            <span className="text-emerald-700 font-semibold">多邊形範圍已套用</span>
          )}
          {polygon.length > 0 && (
            <button
              type="button"
              onClick={() => onPolygonChange([], false)}
              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              title="清除多邊形"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
