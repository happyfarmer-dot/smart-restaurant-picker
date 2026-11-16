import React from 'react';
import {
  Clock,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Users,
} from 'lucide-react';
import {
  CUISINE_OPTIONS,
  PRICE_OPTIONS,
  REVIEW_THRESHOLD_OPTIONS,
  SCENARIO_TAGS,
  type CuisineType,
  type FilterState,
  type PriceLevel,
  type ScenarioTag,
  type SortOption,
} from '../types/restaurant';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onRelaxFilters: () => void;
  excludedCount: number;
  onRestoreExcluded: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onRelaxFilters,
  excludedCount,
  onRestoreExcluded,
}) => {
  const toggleCuisine = (c: CuisineType) => {
    const exists = filters.cuisines.includes(c);
    onChange({
      ...filters,
      cuisines: exists
        ? filters.cuisines.filter((item) => item !== c)
        : [...filters.cuisines, c],
    });
  };

  const togglePrice = (p: PriceLevel) => {
    const exists = filters.priceLevels.includes(p);
    onChange({
      ...filters,
      priceLevels: exists
        ? filters.priceLevels.filter((item) => item !== p)
        : [...filters.priceLevels, p],
    });
  };

  const toggleTag = (t: ScenarioTag) => {
    const exists = filters.tags.includes(t);
    onChange({
      ...filters,
      tags: exists
        ? filters.tags.filter((item) => item !== t)
        : [...filters.tags, t],
    });
  };

  return (
    <div className="space-y-4">
      {/* 關鍵字搜尋 */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          placeholder="搜尋店名、料理或招牌菜..."
          className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
        />
      </div>

      {/* 營業狀態 + 排序 */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.onlyOpenNow}
            onChange={(e) => onChange({ ...filters, onlyOpenNow: e.target.checked })}
            className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
          />
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          僅顯示目前營業中
        </label>

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as SortOption })}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
          >
            <option value="recommended">綜合推薦</option>
            <option value="rating">評分最高</option>
            <option value="reviews">評論數最多</option>
            <option value="distance">距離最近</option>
          </select>
        </div>
      </div>

      {/* 料理類型 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-orange-500" />
            料理類型（複選）
          </span>
          {filters.cuisines.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, cuisines: [] })}
              className="text-xs text-orange-600 hover:underline cursor-pointer"
            >
              清除 ({filters.cuisines.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CUISINE_OPTIONS.map((c) => {
            const active = filters.cuisines.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCuisine(c)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-white border-orange-500 font-medium shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* 預算價位 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">預算價位（台幣區間）</span>
          {filters.priceLevels.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, priceLevels: [] })}
              className="text-xs text-orange-600 hover:underline cursor-pointer"
            >
              不限
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRICE_OPTIONS.map((p) => {
            const active = filters.priceLevels.includes(p.level);
            return (
              <button
                key={p.level}
                type="button"
                onClick={() => togglePrice(p.level)}
                className={`text-xs px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? 'bg-orange-50 border-orange-500 text-orange-800 font-semibold ring-1 ring-orange-500/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{p.symbol} {p.label}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{p.range}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 評分與可信度雙重過濾 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              最低 Google 星等
            </span>
            <span className="font-bold text-amber-600">{filters.minRating.toFixed(1)} 星以上</span>
          </div>
          <input
            type="range"
            min={3.5}
            max={4.8}
            step={0.1}
            value={filters.minRating}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>3.5★</span>
            <span>4.0★</span>
            <span>4.5★</span>
            <span>4.8★</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            最低評論數（防洗評價）
          </span>
          <select
            value={filters.minReviews}
            onChange={(e) => onChange({ ...filters, minReviews: Number(e.target.value) })}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
          >
            {REVIEW_THRESHOLD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 用餐情境標籤 */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 block">貼心用餐情境（複選）</span>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIO_TAGS.map((tag) => {
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                  active
                    ? 'bg-slate-800 text-white border-slate-800 font-medium'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* 底部重設與已略過提示 */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onRelaxFilters}
          className="text-xs text-slate-500 hover:text-orange-600 inline-flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重設篩選條件
        </button>

        {excludedCount > 0 && (
          <button
            type="button"
            onClick={onRestoreExcluded}
            className="text-xs text-orange-600 hover:underline font-medium cursor-pointer"
          >
            恢復已略過 ({excludedCount})
          </button>
        )}
      </div>
    </div>
  );
};
