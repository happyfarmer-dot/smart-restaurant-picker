import React, { useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import type { AppMode } from '../types/restaurant';

interface ApiKeyModalProps {
  isOpen: boolean;
  mode: AppMode;
  apiKey: string;
  onClose: () => void;
  onSave: (mode: AppMode, apiKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  mode,
  apiKey,
  onClose,
  onSave,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [selectedMode, setSelectedMode] = useState<AppMode>(mode);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (selectedMode === 'live' && !trimmed) {
      return;
    }
    onSave(selectedMode, trimmed);
    onClose();
  };

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
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <KeyRound className="w-4 h-4 text-orange-500" />
            <span>資料來源與 Google Maps API 設定</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMode('mock')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                selectedMode === 'mock'
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500/30'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">演示模擬模式</div>
              <div className="text-[11px] text-slate-500 mt-1">
                免 API Key，內建 27 筆台灣在地餐廳資料即時體驗
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('live')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                selectedMode === 'live'
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500/30'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">真實 Google API</div>
              <div className="text-[11px] text-slate-500 mt-1">
                串接 Maps JS API 與 Places API (New) 即時資料
              </div>
            </button>
          </div>

          {selectedMode === 'live' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Google Maps API Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="輸入 AIza... 開頭的 API Key"
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
              <p className="text-[11px] text-slate-500 flex items-start gap-1 leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                金鑰僅儲存於您的瀏覽器 localStorage，需啟用 Maps JavaScript API、Places API (New) 與 Geocoding API。
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition cursor-pointer"
            >
              套用設定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
