import React, { useEffect, useState } from 'react';
import { Dices, ExternalLink, MapPin, RefreshCw, Sparkles, Star, X } from 'lucide-react';
import { PRICE_OPTIONS, type Restaurant } from '../types/restaurant';
import { buildGoogleMapsDeepLink, formatDistanceAndEta } from '../utils/geo';

interface RandomPickerModalProps {
  isOpen: boolean;
  candidates: Restaurant[];
  onClose: () => void;
  onFocusRestaurant: (restaurant: Restaurant) => void;
}

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  isOpen,
  candidates,
  onClose,
  onFocusRestaurant,
}) => {
  const [drawnIds, setDrawnIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [previewName, setPreviewName] = useState('');

  const runDraw = (excludeIds: string[]) => {
    if (candidates.length === 0) {
      setPicked(null);
      return;
    }

    let pool = candidates.filter((r) => !excludeIds.includes(r.id));
    let nextExclude = excludeIds;
    if (pool.length === 0) {
      // 若全部抽過一輪則重設紀錄
      pool = candidates;
      nextExclude = [];
    }

    setIsSpinning(true);
    let tick = 0;
    const interval = window.setInterval(() => {
      const randomPreview = candidates[Math.floor(Math.random() * candidates.length)];
      setPreviewName(randomPreview.name);
      tick++;
      if (tick >= 12) {
        window.clearInterval(interval);
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        setPicked(chosen);
        setDrawnIds([...nextExclude, chosen.id]);
        setIsSpinning(false);
        onFocusRestaurant(chosen);
      }
    }, 75);
  };

  useEffect(() => {
    if (isOpen) {
      setDrawnIds([]);
      runDraw([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const priceObj = picked ? PRICE_OPTIONS.find((p) => p.level === picked.priceLevel) : null;
  const eta = picked ? formatDistanceAndEta(picked.distanceMeters ?? 0) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-pop-in space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>幫我抽一家｜命定餐廳決定器</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            目前篩選清單內沒有餐廳可抽籤，請先放寬篩選條件或擴大圈選範圍。
          </div>
        ) : isSpinning ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3 bg-orange-50/70 rounded-2xl border border-orange-100">
            <Dices className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="text-xs font-medium text-slate-500">正在從 {candidates.length} 間餐廳中為你挑選...</p>
            <p className="text-base font-bold text-slate-900 px-4 text-center">{previewName}</p>
          </div>
        ) : picked ? (
          <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/60 border border-orange-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500 text-white">
                {picked.cuisine}
              </span>
              <span className="text-xs font-medium text-slate-600">
                {eta?.distanceText} · 步行 {eta?.walkMinutes} 分
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">{picked.name}</h3>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                {picked.rating.toFixed(1)}
              </span>
              <span className="text-slate-500">({picked.reviewCount.toLocaleString()} 則評論)</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">
                {priceObj?.symbol} {picked.avgCostText}
              </span>
            </div>

            <p className="text-xs text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {picked.address}
            </p>

            {picked.signatureDishes.length > 0 && (
              <p className="text-xs text-slate-700 bg-white/80 rounded-xl px-3 py-2 border border-orange-100">
                <span className="font-semibold text-orange-700">推薦必點：</span>
                {picked.signatureDishes.join('、')}
              </p>
            )}
          </div>
        ) : null}

        {candidates.length > 0 && !isSpinning && picked && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => runDraw(drawnIds)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              這家不行，重抽一家
            </button>
            <a
              href={buildGoogleMapsDeepLink(picked)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm"
            >
              Google Maps 導航
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
