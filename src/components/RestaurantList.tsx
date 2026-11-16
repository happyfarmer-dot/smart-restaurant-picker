import React, { useEffect } from 'react';
import { ExternalLink, RotateCcw, UtensilsCrossed } from 'lucide-react';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';

interface RestaurantListProps {
  restaurants: Restaurant[];
  isLoading: boolean;
  selectedId: string | null;
  googleMapsAreaUrl: string;
  onSelect: (restaurant: Restaurant) => void;
  onExclude: (id: string) => void;
  onRelaxFilters: () => void;
}

export const RestaurantList: React.FC<RestaurantListProps> = ({
  restaurants,
  isLoading,
  selectedId,
  googleMapsAreaUrl,
  onSelect,
  onExclude,
  onRelaxFilters,
}) => {
  // 地圖點擊圖釘時，自動平滑捲動至對應餐廳卡片
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`restaurant-card-${selectedId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  if (isLoading && restaurants.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 animate-pulse"
          >
            <div className="flex justify-between">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-8 w-full bg-slate-200 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center space-y-3">
        <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800">目前圈選範圍與條件下找不到餐廳</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            你可以放寬篩選條件、拉大半徑，或直接帶入此範圍座標到 Google Maps 查看所有餐飲店家。
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onRelaxFilters}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            一鍵放寬篩選條件並擴大範圍
          </button>
          <a
            href={googleMapsAreaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            直接在 Google Maps 搜此範圍
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 置頂：一鍵開啟 Google Maps 搜尋此圈選範圍 */}
      <a
        href={googleMapsAreaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 hover:bg-sky-100 transition text-xs font-semibold"
      >
        <span>想直接看 Google Maps 真實星等與評論？點此開啟此圈選範圍</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-sky-700" />
      </a>

      {restaurants.map((r) => (
        <RestaurantCard
          key={r.id}
          restaurant={r}
          isSelected={r.id === selectedId}
          onSelect={onSelect}
          onExclude={onExclude}
        />
      ))}
    </div>
  );
};
