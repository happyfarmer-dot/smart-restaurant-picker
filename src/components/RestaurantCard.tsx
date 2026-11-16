import React from 'react';
import {
  Clock,
  ExternalLink,
  Footprints,
  MapPin,
  Star,
  X,
} from 'lucide-react';
import { PRICE_OPTIONS, type Restaurant } from '../types/restaurant';
import { buildGoogleMapsDeepLink, formatDistanceAndEta } from '../utils/geo';

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onSelect: (restaurant: Restaurant) => void;
  onExclude: (id: string) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isSelected,
  onSelect,
  onExclude,
}) => {
  const priceObj = PRICE_OPTIONS.find((p) => p.level === restaurant.priceLevel);
  const eta = formatDistanceAndEta(restaurant.distanceMeters ?? 0);
  const deepLink = buildGoogleMapsDeepLink(restaurant);

  return (
    <article
      id={`restaurant-card-${restaurant.id}`}
      onClick={() => onSelect(restaurant)}
      className={`group relative rounded-2xl border p-3.5 transition-all cursor-pointer bg-white ${
        isSelected
          ? 'border-orange-500 ring-2 ring-orange-500/25 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* 暫時排除按鈕 */}
      <button
        type="button"
        title="今天不想吃，暫時略過"
        onClick={(e) => {
          e.stopPropagation();
          onExclude(restaurant.id);
        }}
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* 標題與料理類型 */}
      <div className="pr-8">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-sm font-bold text-slate-900 leading-snug">
            {restaurant.name}
          </h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100">
            {restaurant.cuisine}
          </span>
        </div>

        {/* 星等 + 評論數 + 價位 */}
        <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
          <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            {restaurant.rating.toFixed(1)}
          </span>
          <span className="text-slate-500">
            ({restaurant.reviewCount.toLocaleString()} 則評論)
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-700">
            {priceObj?.symbol} · {restaurant.avgCostText}
          </span>
        </div>
      </div>

      {/* 營業狀態 + 距離預估 */}
      <div className="flex items-center justify-between gap-2 mt-2.5 text-xs flex-wrap">
        <span
          className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${
            restaurant.isOpenNow
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          <Clock className="w-3 h-3" />
          {restaurant.isOpenNow ? `營業中 · ${restaurant.closingTimeText}` : restaurant.closingTimeText}
        </span>

        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
          <Footprints className="w-3.5 h-3.5 text-slate-400" />
          {eta.distanceText}（步行 {eta.walkMinutes} 分 / 騎車 {eta.scooterMinutes} 分）
        </span>
      </div>

      {/* 地址與情境標籤 */}
      <div className="mt-2 space-y-1.5">
        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{restaurant.address}</span>
        </p>

        {restaurant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {restaurant.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Google Maps 深度連結 */}
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-orange-600 transition"
        >
          在 Google Maps 開啟 / 導航
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
};
