import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trash2 } from 'lucide-react';
import type { DrawMode, LatLng, Restaurant } from '../types/restaurant';

interface LeafletMapViewProps {
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
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const vertexLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // 初始化 Leaflet 地圖（OpenStreetMap 圖磚，完全免 API Key）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    vertexLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 平滑移動地圖中心
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.panTo([center.lat, center.lng], { animate: true });
  }, [center]);

  // 繪製圓形半徑與可拖曳中心點
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
      circleLayerRef.current = null;
    }
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }

    if (drawMode === 'circle') {
      circleLayerRef.current = L.circle([circleCenter.lat, circleCenter.lng], {
        radius: radiusMeters,
        color: '#f97316',
        weight: 2,
        dashArray: '6 4',
        fillColor: '#f97316',
        fillOpacity: 0.14,
      }).addTo(map);

      const centerIcon = L.divIcon({
        className: 'custom-center-pin',
        html: `<div style="width:20px;height:20px;border-radius:9999px;background:#f97316;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:grab;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([circleCenter.lat, circleCenter.lng], {
        icon: centerIcon,
        draggable: true,
        title: '拖曳調整搜尋中心點',
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onCircleCenterChange({ lat: pos.lat, lng: pos.lng });
      });

      centerMarkerRef.current = marker;
    }
  }, [drawMode, circleCenter, radiusMeters, onCircleCenterChange]);

  // 繪製手繪多邊形與點擊事件
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }
    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }
    vertexLayerRef.current?.clearLayers();

    if (drawMode === 'polygon') {
      const latlngs = polygon.map((p) => [p.lat, p.lng] as [number, number]);

      if (isPolygonClosed && latlngs.length >= 3) {
        polygonLayerRef.current = L.polygon(latlngs, {
          color: '#ea580c',
          weight: 2.5,
          fillColor: '#f97316',
          fillOpacity: 0.16,
        }).addTo(map);
      } else if (latlngs.length > 0) {
        polylineLayerRef.current = L.polyline(latlngs, {
          color: '#ea580c',
          weight: 2.5,
        }).addTo(map);
      }

      polygon.forEach((pt, idx) => {
        const isFirst = idx === 0 && !isPolygonClosed;
        const vIcon = L.divIcon({
          className: 'polygon-vertex',
          html: `<div style="width:${isFirst ? 14 : 10}px;height:${isFirst ? 14 : 10}px;border-radius:9999px;background:${isFirst ? '#10b981' : '#ea580c'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [isFirst ? 14 : 10, isFirst ? 14 : 10],
          iconAnchor: [isFirst ? 7 : 5, isFirst ? 7 : 5],
        });
        const vm = L.marker([pt.lat, pt.lng], { icon: vIcon });
        if (isFirst && polygon.length >= 3) {
          vm.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            onPolygonChange(polygon, true);
          });
        }
        vertexLayerRef.current?.addLayer(vm);
      });
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (drawMode === 'polygon' && !isPolygonClosed) {
        onPolygonChange([...polygon, { lat: e.latlng.lat, lng: e.latlng.lng }], false);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [drawMode, polygon, isPolygonClosed, onPolygonChange]);

  // 繪製餐廳圖釘 Markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const bg = isSelected ? '#dc2626' : '#0f172a';
      const size = isSelected ? 32 : 26;

      const labelText = r.source === 'osm' ? '食' : r.rating.toFixed(1);
      const icon = L.divIcon({
        className: 'restaurant-marker',
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#fff;font-weight:700;font-size:${isSelected ? 11 : 10}px;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);cursor:pointer;">${labelText}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([r.lat, r.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
        title: r.name,
      });

      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        onSelectRestaurant(r);
      });

      layer.addLayer(marker);
    });
  }, [restaurants, selectedId, onSelectRestaurant]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full z-0" />

      {drawMode === 'polygon' && (
        <div className="absolute bottom-24 lg:bottom-5 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs">
          {!isPolygonClosed ? (
            <>
              <span className="text-slate-700 font-medium">
                點擊地圖放置多邊形頂點（已放 {polygon.length} 點，至少 3 點）
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
            <span className="text-emerald-700 font-semibold">
              多邊形範圍已套用（射線法精準過濾）
            </span>
          )}
          {polygon.length > 0 && (
            <button
              type="button"
              onClick={() => onPolygonChange([], false)}
              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              title="清除重畫"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
