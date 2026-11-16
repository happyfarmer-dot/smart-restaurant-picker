import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { DrawMode, LatLng, Restaurant } from '../types/restaurant';
import { computeMinimumBoundingCircle } from '../utils/geo';

interface MockInteractiveMapProps {
  center: LatLng;
  circleCenter: LatLng;
  radiusMeters: number;
  drawMode: DrawMode;
  polygon: LatLng[];
  isPolygonClosed: boolean;
  restaurants: Restaurant[];
  allAreaRestaurants: Restaurant[];
  selectedId: string | null;
  onCenterChange: (center: LatLng) => void;
  onCircleCenterChange: (center: LatLng) => void;
  onPolygonChange: (points: LatLng[], closed: boolean) => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

export const MockInteractiveMap: React.FC<MockInteractiveMapProps> = ({
  center,
  circleCenter,
  radiusMeters,
  drawMode,
  polygon,
  isPolygonClosed,
  restaurants,
  allAreaRestaurants,
  selectedId,
  onCenterChange,
  onCircleCenterChange,
  onPolygonChange,
  onSelectRestaurant,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const dragRef = useRef<{
    active: boolean;
    type: 'pan' | 'centerPin' | null;
    startX: number;
    startY: number;
    startCenter: LatLng;
    moved: boolean;
  }>({
    active: false,
    type: null,
    startX: 0,
    startY: 0,
    startCenter: center,
    moved: false,
  });

  const getMetersPerDeg = useCallback((lat: number) => {
    return {
      mPerDegLat: 110750,
      mPerDegLng: 111320 * Math.cos((lat * Math.PI) / 180),
    };
  }, []);

  const latLngToScreen = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      const { mPerDegLat, mPerDegLng } = getMetersPerDeg(center.lat);
      const pxPerMeter = 0.2 * zoom;
      return {
        x: width / 2 + (lng - center.lng) * mPerDegLng * pxPerMeter,
        y: height / 2 + (center.lat - lat) * mPerDegLat * pxPerMeter,
      };
    },
    [center, zoom, getMetersPerDeg]
  );

  const screenToLatLng = useCallback(
    (x: number, y: number, width: number, height: number): LatLng => {
      const { mPerDegLat, mPerDegLng } = getMetersPerDeg(center.lat);
      const pxPerMeter = 0.2 * zoom;
      return {
        lat: center.lat - (y - height / 2) / pxPerMeter / mPerDegLat,
        lng: center.lng + (x - width / 2) / pxPerMeter / mPerDegLng,
      };
    },
    [center, zoom, getMetersPerDeg]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width;
    const H = rect.height;
    const pxPerMeter = 0.2 * zoom;

    // 地圖底色
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, W, H);

    // 街道網格
    const topLeft = screenToLatLng(0, 0, W, H);
    const bottomRight = screenToLatLng(W, H, W, H);
    const minorStep = 0.0018;
    const majorStep = 0.0054;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
    ctx.beginPath();
    for (let lat = Math.floor(bottomRight.lat / minorStep) * minorStep; lat <= topLeft.lat; lat += minorStep) {
      const p = latLngToScreen(lat, center.lng, W, H);
      ctx.moveTo(0, p.y);
      ctx.lineTo(W, p.y);
    }
    for (let lng = Math.floor(topLeft.lng / minorStep) * minorStep; lng <= bottomRight.lng; lng += minorStep) {
      const p = latLngToScreen(center.lat, lng, W, H);
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, H);
    }
    ctx.stroke();

    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    for (let lat = Math.floor(bottomRight.lat / majorStep) * majorStep; lat <= topLeft.lat; lat += majorStep) {
      const p = latLngToScreen(lat, center.lng, W, H);
      ctx.moveTo(0, p.y);
      ctx.lineTo(W, p.y);
    }
    for (let lng = Math.floor(topLeft.lng / majorStep) * majorStep; lng <= bottomRight.lng; lng += majorStep) {
      const p = latLngToScreen(center.lat, lng, W, H);
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, H);
    }
    ctx.stroke();

    // 繪製圈選範圍
    if (drawMode === 'circle') {
      const cPos = latLngToScreen(circleCenter.lat, circleCenter.lng, W, H);
      const radiusPx = radiusMeters * pxPerMeter;

      ctx.beginPath();
      ctx.arc(cPos.x, cPos.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#f97316';
      ctx.stroke();
      ctx.setLineDash([]);

      // 可拖曳中心點
      ctx.beginPath();
      ctx.arc(cPos.x, cPos.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('拖曳中心點', cPos.x, cPos.y - 14);
    } else if (polygon.length > 0) {
      // 多邊形最小外接圓參考線（若已封閉）
      if (isPolygonClosed && polygon.length >= 3) {
        const mbc = computeMinimumBoundingCircle(polygon);
        const mbcPos = latLngToScreen(mbc.center.lat, mbc.center.lng, W, H);
        ctx.beginPath();
        ctx.arc(mbcPos.x, mbcPos.y, mbc.radiusMeters * pxPerMeter, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 多邊形本體
      ctx.beginPath();
      polygon.forEach((pt, idx) => {
        const p = latLngToScreen(pt.lat, pt.lng, W, H);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      if (isPolygonClosed) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
        ctx.fill();
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ea580c';
      ctx.stroke();

      // 頂點
      polygon.forEach((pt, idx) => {
        const p = latLngToScreen(pt.lat, pt.lng, W, H);
        ctx.beginPath();
        ctx.arc(p.x, p.y, idx === 0 && !isPolygonClosed ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 && !isPolygonClosed ? '#10b981' : '#ea580c';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      });
    }

    // 繪製範圍外或被過濾的餐廳小點
    const matchedIds = new Set(restaurants.map((r) => r.id));
    allAreaRestaurants.forEach((r) => {
      if (matchedIds.has(r.id)) return;
      const p = latLngToScreen(r.lat, r.lng, W, H);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.32)';
      ctx.fill();
    });

    // 繪製符合條件的餐廳圖釘
    restaurants.forEach((r) => {
      const p = latLngToScreen(r.lat, r.lng, W, H);
      const isSelected = r.id === selectedId;
      const isHovered = r.id === hoverId;
      const active = isSelected || isHovered;
      const radius = active ? 16 : 13;

      // 陰影
      ctx.beginPath();
      ctx.arc(p.x, p.y + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fill();

      // 圓形圖釘
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#dc2626' : '#0f172a';
      ctx.fill();
      ctx.lineWidth = active ? 3 : 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 星等
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${active ? 10 : 9}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(r.rating.toFixed(1), p.x, p.y + 3.5);

      // 店名標籤
      if (active || zoom >= 1.15) {
        const label = r.name.length > 10 ? `${r.name.slice(0, 10)}…` : r.name;
        ctx.font = '600 11px sans-serif';
        const tw = ctx.measureText(label).width + 12;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = isSelected ? '#dc2626' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(p.x - tw / 2, p.y + radius + 4, tw, 19, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillText(label, p.x, p.y + radius + 17);
      }
    });
  }, [
    allAreaRestaurants,
    center,
    circleCenter,
    drawMode,
    hoverId,
    isPolygonClosed,
    latLngToScreen,
    polygon,
    radiusMeters,
    restaurants,
    screenToLatLng,
    selectedId,
    zoom,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const findHitRestaurant = (x: number, y: number, W: number, H: number): Restaurant | null => {
    for (let i = restaurants.length - 1; i >= 0; i--) {
      const r = restaurants[i];
      const p = latLngToScreen(r.lat, r.lng, W, H);
      if (Math.hypot(p.x - x, p.y - y) <= 18) return r;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. 先檢查是否點擊到餐廳圖釘
    const hitPin = findHitRestaurant(x, y, rect.width, rect.height);
    if (hitPin) {
      onSelectRestaurant(hitPin);
      return;
    }

    // 2. 檢查是否拖曳中心點（圓形模式）
    if (drawMode === 'circle') {
      const cPos = latLngToScreen(circleCenter.lat, circleCenter.lng, rect.width, rect.height);
      if (Math.hypot(cPos.x - x, cPos.y - y) <= 16) {
        dragRef.current = {
          active: true,
          type: 'centerPin',
          startX: x,
          startY: y,
          startCenter: circleCenter,
          moved: false,
        };
        return;
      }
    }

    // 3. 預設為拖曳地圖（或點擊新增多邊形頂點）
    dragRef.current = {
      active: true,
      type: 'pan',
      startX: x,
      startY: y,
      startCenter: center,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!dragRef.current.active) {
      const hit = findHitRestaurant(x, y, rect.width, rect.height);
      setHoverId(hit ? hit.id : null);
      return;
    }

    const dx = x - dragRef.current.startX;
    const dy = y - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      dragRef.current.moved = true;
    }

    if (dragRef.current.type === 'centerPin') {
      const geo = screenToLatLng(x, y, rect.width, rect.height);
      onCircleCenterChange(geo);
    } else if (dragRef.current.type === 'pan') {
      const pxPerMeter = 0.2 * zoom;
      const { mPerDegLat, mPerDegLng } = getMetersPerDeg(dragRef.current.startCenter.lat);
      onCenterChange({
        lat: dragRef.current.startCenter.lat + dy / pxPerMeter / mPerDegLat,
        lng: dragRef.current.startCenter.lng - dx / pxPerMeter / mPerDegLng,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const wasClick = dragRef.current.active && !dragRef.current.moved && dragRef.current.type === 'pan';
    dragRef.current.active = false;
    dragRef.current.type = null;

    // 多邊形模式下，純點擊（未拖曳）即新增頂點或封閉多邊形
    if (wasClick && drawMode === 'polygon' && !isPolygonClosed) {
      if (polygon.length >= 3) {
        const firstP = latLngToScreen(polygon[0].lat, polygon[0].lng, rect.width, rect.height);
        if (Math.hypot(firstP.x - x, firstP.y - y) <= 16) {
          onPolygonChange(polygon, true);
          return;
        }
      }
      const pt = screenToLatLng(x, y, rect.width, rect.height);
      onPolygonChange([...polygon, pt], false);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          dragRef.current.active = false;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.12 : 0.89;
          setZoom((z) => Math.min(2.6, Math.max(0.45, z * factor)));
        }}
        className={`w-full h-full block ${
          drawMode === 'polygon' && !isPolygonClosed ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* 多邊形繪製提示條 */}
      {drawMode === 'polygon' && (
        <div className="absolute bottom-24 lg:bottom-5 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs">
          {!isPolygonClosed ? (
            <>
              <span className="text-slate-700 font-medium">
                {polygon.length < 3
                  ? `點擊地圖放置多邊形頂點（已放 ${polygon.length} 點，至少 3 點）`
                  : '點擊綠色起點或「完成封閉」完成手繪圈選'}
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
              多邊形範圍已套用（透過射線法精準過濾）
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

      {/* 右下角縮放按鈕 */}
      <div className="absolute bottom-24 lg:bottom-5 right-3 flex flex-col gap-1.5 z-10">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.6, z * 1.2))}
          className="w-9 h-9 rounded-xl bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
          title="放大地圖"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.45, z / 1.2))}
          className="w-9 h-9 rounded-xl bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
          title="縮小地圖"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            onCenterChange(circleCenter);
            setZoom(1.0);
          }}
          className="w-9 h-9 rounded-xl bg-white/95 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
          title="回到搜尋中心"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
