import React, { useEffect } from 'react';
import { RotateCcw, UtensilsCrossed } from 'lucide-react';
import type { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';

interface RestaurantListProps {
  restaurants: Restaurant[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (restaurant: Restaurant) => void;
  onExclude: (id: string) => void;
  onRelaxFilters: () => void;
}

export const RestaurantList: React.FC<RestaurantListProps> = ({
  restaurants,
  isLoading,
  selectedId,
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
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
          <h3 className="text-sm font-bold text-slate-800">找不到符合條件的餐廳</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            目前圈選的範圍可能太小，或星等／評論數／料理條件過於嚴格。
          </p>
        </div>
        <button
          type="button"
          onClick={onRelaxFilters}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          一鍵放寬篩選條件
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
