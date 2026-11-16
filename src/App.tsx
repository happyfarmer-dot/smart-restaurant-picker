import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleDot,
  Crosshair,
  Dices,
  ExternalLink,
  Filter,
  KeyRound,
  List,
  MapPin,
  Pentagon,
  Search,
  Utensils,
} from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FilterPanel } from './components/FilterPanel';
import { GoogleMapView } from './components/GoogleMapView';
import { LeafletMapView } from './components/LeafletMapView';
import { MobileBottomSheet, type SheetStage } from './components/MobileBottomSheet';
import { RandomPickerModal } from './components/RandomPickerModal';
import { RestaurantList } from './components/RestaurantList';
import { LANDMARK_PRESETS, MOCK_RESTAURANTS } from './data/mockRestaurants';
import type {
  AppMode,
  DrawMode,
  FilterState,
  LatLng,
  Restaurant,
} from './types/restaurant';
import {
  buildGoogleMapsAreaSearchUrl,
  computeMinimumBoundingCircle,
  getPolygonCentroid,
  haversineDistanceMeters,
  isPointInPolygon,
} from './utils/geo';
import { geocodeAddress, searchNearbyPlacesNew } from './utils/placesApi';
import { searchNominatimLocation, searchOsmRestaurants } from './utils/osmApi';

const DEFAULT_FILTERS: FilterState = {
  cuisines: [],
  priceLevels: [],
  minRating: 0,
  minReviews: 0,
  onlyOpenNow: true,
  tags: [],
  sortBy: 'recommended',
  searchQuery: '',
};

const STORAGE_KEY_API = 'smart_picker_google_api_key';

function mergeRestaurants(osmList: Restaurant[], mockList: Restaurant[]): Restaurant[] {
  const seenNames = new Set(osmList.map((r) => r.name.trim().toLowerCase()));
  const extraMocks = mockList.filter((m) => !seenNames.has(m.name.trim().toLowerCase()));
  return [...osmList, ...extraMocks];
}

export function App() {
  const [appMode, setAppMode] = useState<AppMode>('mock');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY_API) || '');
  const [apiError, setApiError] = useState<string | null>(null);

  // 地圖與圈選狀態
  const [mapCenter, setMapCenter] = useState<LatLng>(LANDMARK_PRESETS[0].center);
  const [circleCenter, setCircleCenter] = useState<LatLng>(LANDMARK_PRESETS[0].center);
  const [radiusMeters, setRadiusMeters] = useState<number>(1200);
  const [drawMode, setDrawMode] = useState<DrawMode>('circle');
  const [polygon, setPolygon] = useState<LatLng[]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState<boolean>(false);

  // 搜尋地標輸入
  const [locationQuery, setLocationQuery] = useState('');

  // 資料與載入狀態（初始帶入內建精選資料，確保頁面開啟立即有清單）
  const [liveRestaurants, setLiveRestaurants] = useState<Restaurant[]>([]);
  const [osmRestaurants, setOsmRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const osmCacheRef = useRef<Map<string, Restaurant[]>>(new Map());

  // 篩選、排除與選取狀態
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // UI 狀態
  const [desktopTab, setDesktopTab] = useState<'list' | 'filter'>('list');
  const [mobileSheetStage, setMobileSheetStage] = useState<SheetStage>('half');
  const [mobileTab, setMobileTab] = useState<'list' | 'filter'>('list');
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // 免 API Key 模式：防抖 + 快取向 OpenStreetMap Overpass API 請求真實餐廳資料
  useEffect(() => {
    if (appMode !== 'mock') return;

    let reqCenter = circleCenter;
    let reqRadius = radiusMeters;

    if (drawMode === 'polygon' && isPolygonClosed && polygon.length >= 3) {
      const mbc = computeMinimumBoundingCircle(polygon);
      reqCenter = mbc.center;
      reqRadius = mbc.radiusMeters;
    }

    const cacheKey = `${reqCenter.lat.toFixed(3)}_${reqCenter.lng.toFixed(3)}_${Math.max(1500, Math.ceil(reqRadius / 500) * 500)}`;
    const cached = osmCacheRef.current.get(cacheKey);
    if (cached) {
      setOsmRestaurants(mergeRestaurants(cached, MOCK_RESTAURANTS));
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchOsmRestaurants(reqCenter, reqRadius);
        if (!cancelled) {
          osmCacheRef.current.set(cacheKey, results);
          setOsmRestaurants(mergeRestaurants(results, MOCK_RESTAURANTS));
        }
      } catch {
        // 若所有 Overpass 鏡像皆忙碌，保留現有或精選台灣資料
        if (!cancelled) {
          setOsmRestaurants((prev) => (prev.length > 0 ? prev : MOCK_RESTAURANTS));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appMode, circleCenter, radiusMeters, drawMode, isPolygonClosed, polygon]);

  // Live Mode 向 Google Places API (New) 請求資料
  const fetchLivePlaces = useCallback(async () => {
    if (appMode !== 'live' || !apiKey) return;
    setIsLoading(true);
    setApiError(null);
    try {
      let reqCenter = circleCenter;
      let reqRadius = radiusMeters;

      if (drawMode === 'polygon' && isPolygonClosed && polygon.length >= 3) {
        const mbc = computeMinimumBoundingCircle(polygon);
        reqCenter = mbc.center;
        reqRadius = mbc.radiusMeters;
      }

      const results = await searchNearbyPlacesNew(apiKey, reqCenter, reqRadius);
      setLiveRestaurants(results);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Google Places API 請求失敗');
    } finally {
      setIsLoading(false);
    }
  }, [appMode, apiKey, circleCenter, radiusMeters, drawMode, isPolygonClosed, polygon]);

  useEffect(() => {
    if (appMode === 'live') {
      fetchLivePlaces();
    }
  }, [appMode, fetchLivePlaces]);

  // 原始資料來源
  const rawSourceRestaurants = appMode === 'live' ? liveRestaurants : osmRestaurants;

  const activeSearchCenter = useMemo(() => {
    return drawMode === 'polygon' && isPolygonClosed && polygon.length >= 3
      ? getPolygonCentroid(polygon)
      : circleCenter;
  }, [drawMode, isPolygonClosed, polygon, circleCenter]);

  const activeSearchRadius = useMemo(() => {
    if (drawMode === 'polygon' && isPolygonClosed && polygon.length >= 3) {
      return computeMinimumBoundingCircle(polygon).radiusMeters;
    }
    return radiusMeters;
  }, [drawMode, isPolygonClosed, polygon, radiusMeters]);

  const googleMapsAreaUrl = useMemo(() => {
    return buildGoogleMapsAreaSearchUrl(activeSearchCenter, activeSearchRadius, filters);
  }, [activeSearchCenter, activeSearchRadius, filters]);

  // 計算距離並執行空間（圓形／多邊形）+ 多維度篩選
  const filteredRestaurants = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    const list = rawSourceRestaurants
      .map((r) => ({
        ...r,
        distanceMeters: Math.round(
          haversineDistanceMeters(activeSearchCenter, { lat: r.lat, lng: r.lng })
        ),
      }))
      .filter((r) => {
        if (excludedIds.includes(r.id)) return false;

        // 空間範圍過濾
        if (drawMode === 'circle') {
          if ((r.distanceMeters ?? Infinity) > radiusMeters) return false;
        } else {
          if (isPolygonClosed && polygon.length >= 3) {
            if (!isPointInPolygon({ lat: r.lat, lng: r.lng }, polygon)) return false;
          } else {
            if ((r.distanceMeters ?? Infinity) > 3500) return false;
          }
        }

        // 篩選條件
        if (filters.onlyOpenNow && !r.isOpenNow) return false;
        if (filters.cuisines.length > 0 && !filters.cuisines.includes(r.cuisine)) return false;
        if (filters.priceLevels.length > 0 && !filters.priceLevels.includes(r.priceLevel)) return false;

        // OSM 無即時 Google 星等與評論數，僅在具備評分資料（Google API / 精選資料）時才依評分門檻過濾
        if (r.source !== 'osm') {
          if (filters.minRating > 0 && r.rating < filters.minRating) return false;
          if (filters.minReviews > 0 && r.reviewCount < filters.minReviews) return false;
        }

        for (const tag of filters.tags) {
          if (!r.tags.includes(tag)) return false;
        }

        if (q) {
          const hay = `${r.name} ${r.cuisine} ${r.address} ${r.signatureDishes.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        return true;
      });

    list.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case 'reviews':
          return b.reviewCount - a.reviewCount;
        case 'distance':
          return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
        case 'recommended':
        default: {
          const scoreA = a.rating * 20 + Math.log10(a.reviewCount + 1) * 5 - (a.distanceMeters ?? 0) / 350;
          const scoreB = b.rating * 20 + Math.log10(b.reviewCount + 1) * 5 - (b.distanceMeters ?? 0) / 350;
          return scoreB - scoreA;
        }
      }
    });

    return list;
  }, [
    rawSourceRestaurants,
    activeSearchCenter,
    drawMode,
    isPolygonClosed,
    polygon,
    radiusMeters,
    excludedIds,
    filters,
  ]);

  // 定位我目前位置 (GPS)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('您的瀏覽器不支援 GPS 定位功能');
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(next);
        setCircleCenter(next);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        alert('無法取得您的 GPS 位置，請確認已允許瀏覽器位置權限。');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 地址 / 地標快速搜尋
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = locationQuery.trim();
    if (!q) return;

    const matchedPreset = LANDMARK_PRESETS.find((p) =>
      p.label.toLowerCase().includes(q.toLowerCase())
    );
    if (matchedPreset) {
      setMapCenter(matchedPreset.center);
      setCircleCenter(matchedPreset.center);
      return;
    }

    if (appMode === 'live' && apiKey) {
      setIsLoading(true);
      const loc = await geocodeAddress(apiKey, q);
      setIsLoading(false);
      if (loc) {
        setMapCenter(loc);
        setCircleCenter(loc);
        return;
      }
    } else {
      setIsLoading(true);
      const loc = await searchNominatimLocation(q);
      setIsLoading(false);
      if (loc) {
        setMapCenter(loc);
        setCircleCenter(loc);
        return;
      }
    }

    if (q.includes('台中') || q.includes('逢甲') || q.includes('西屯')) {
      const target = LANDMARK_PRESETS[2].center;
      setMapCenter(target);
      setCircleCenter(target);
    } else if (q.includes('高雄') || q.includes('巨蛋') || q.includes('左營')) {
      const target = LANDMARK_PRESETS[4].center;
      setMapCenter(target);
      setCircleCenter(target);
    } else if (q.includes('中山') || q.includes('赤峰')) {
      const target = LANDMARK_PRESETS[1].center;
      setMapCenter(target);
      setCircleCenter(target);
    } else {
      const target = LANDMARK_PRESETS[0].center;
      setMapCenter(target);
      setCircleCenter(target);
    }
  };

  const handleSelectRestaurant = useCallback((restaurant: Restaurant) => {
    setSelectedId(restaurant.id);
    setMapCenter({ lat: restaurant.lat, lng: restaurant.lng });
    setDesktopTab('list');
  }, []);

  const handleRelaxFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      minRating: 0,
      minReviews: 0,
      onlyOpenNow: false,
    });
    setExcludedIds([]);
    setRadiusMeters((r) => Math.max(r, 2500));
  };

  const handleSaveApiConfig = (nextMode: AppMode, nextKey: string) => {
    setAppMode(nextMode);
    setApiKey(nextKey);
    if (nextKey) {
      localStorage.setItem(STORAGE_KEY_API, nextKey);
    }
    setApiError(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900">
      {/* 頂部導覽列 */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-3 lg:px-4 py-2.5 flex items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm lg:text-base font-extrabold text-slate-900 truncate">
                智慧地圖餐廳選擇器
              </h1>
              <span
                className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  appMode === 'live'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {appMode === 'live' ? 'Live Google Maps' : '免 API 即時地圖 (OSM)'}
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 truncate">
              圈選街區範圍 × 多條件篩選 × 一鍵跳轉 Google Maps 查看評價與導航
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href={googleMapsAreaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">在 Google Maps 搜此範圍</span>
            <span className="md:hidden">Google Maps</span>
          </a>

          <button
            type="button"
            onClick={() => setIsRandomModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            <span className="hidden sm:inline">幫我抽一家</span>
            <span className="sm:hidden">抽一家</span>
          </button>

          <button
            type="button"
            onClick={() => setIsApiModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden lg:inline">API Key 設定</span>
          </button>
        </div>
      </header>

      {/* API 錯誤提示條 */}
      {apiError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center justify-between">
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => setAppMode('mock')}
            className="font-semibold underline cursor-pointer"
          >
            切換回免 API 即時地圖
          </button>
        </div>
      )}

      {/* 主體雙欄佈局 */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* 桌面版左側面板 (420px) */}
        <aside className="hidden lg:flex w-[420px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 min-h-0">
          <div className="shrink-0 p-3 bg-white border-b border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDesktopTab('list')}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                desktopTab === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              建議餐廳 ({filteredRestaurants.length})
            </button>
            <button
              type="button"
              onClick={() => setDesktopTab('filter')}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                desktopTab === 'filter'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              篩選條件
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5">
            {desktopTab === 'list' ? (
              <RestaurantList
                restaurants={filteredRestaurants}
                isLoading={isLoading}
                selectedId={selectedId}
                googleMapsAreaUrl={googleMapsAreaUrl}
                onSelect={handleSelectRestaurant}
                onExclude={(id) => setExcludedIds((prev) => [...prev, id])}
                onRelaxFilters={handleRelaxFilters}
              />
            ) : (
              <FilterPanel
                appMode={appMode}
                filters={filters}
                onChange={setFilters}
                onRelaxFilters={handleRelaxFilters}
                excludedCount={excludedIds.length}
                onRestoreExcluded={() => setExcludedIds([])}
              />
            )}
          </div>
        </aside>

        {/* 右側 / 手機全螢幕互動地圖區 */}
        <main className="flex-1 relative min-w-0 h-full">
          {/* 頂部浮動搜尋與圈選工具列 */}
          <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pointer-events-none">
            <form
              onSubmit={handleLocationSearch}
              className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-1.5 shadow-md flex-1 max-w-md"
            >
              <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="輸入地標（如：台北信義區、逢甲夜市）"
                className="flex-1 text-xs bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400 min-w-0"
              />
              <select
                aria-label="快速切換台灣熱門區域"
                onChange={(e) => {
                  const found = LANDMARK_PRESETS.find((p) => p.id === e.target.value);
                  if (found) {
                    setMapCenter(found.center);
                    setCircleCenter(found.center);
                  }
                }}
                className="hidden md:block text-[11px] bg-slate-100 text-slate-700 rounded-lg px-2 py-1.5 border-0 focus:outline-none cursor-pointer"
              >
                {LANDMARK_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label.split('（')[0]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLocateMe}
                title="定位我目前位置 (GPS)"
                className="p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition cursor-pointer shrink-0"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </form>

            <div className="pointer-events-auto bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-1.5 shadow-md flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setDrawMode('circle')}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    drawMode === 'circle'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  中心半徑
                </button>
                <button
                  type="button"
                  onClick={() => setDrawMode('polygon')}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    drawMode === 'polygon'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Pentagon className="w-3.5 h-3.5" />
                  手繪多邊形
                </button>
              </div>

              {drawMode === 'circle' && (
                <div className="flex items-center gap-2 px-2">
                  <input
                    type="range"
                    min={200}
                    max={5000}
                    step={100}
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-24 sm:w-28 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 w-14 text-right">
                    {radiusMeters >= 1000
                      ? `${(radiusMeters / 1000).toFixed(1)}km`
                      : `${radiusMeters}m`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {appMode === 'live' && apiKey ? (
            <GoogleMapView
              apiKey={apiKey}
              center={mapCenter}
              circleCenter={circleCenter}
              radiusMeters={radiusMeters}
              drawMode={drawMode}
              polygon={polygon}
              isPolygonClosed={isPolygonClosed}
              restaurants={filteredRestaurants}
              selectedId={selectedId}
              onCircleCenterChange={(c) => setCircleCenter(c)}
              onPolygonChange={(pts, closed) => {
                setPolygon(pts);
                setIsPolygonClosed(closed);
              }}
              onSelectRestaurant={handleSelectRestaurant}
              onSdkError={(msg) => setApiError(msg)}
            />
          ) : (
            <LeafletMapView
              center={mapCenter}
              circleCenter={circleCenter}
              radiusMeters={radiusMeters}
              drawMode={drawMode}
              polygon={polygon}
              isPolygonClosed={isPolygonClosed}
              restaurants={filteredRestaurants}
              selectedId={selectedId}
              onCircleCenterChange={setCircleCenter}
              onPolygonChange={(pts, closed) => {
                setPolygon(pts);
                setIsPolygonClosed(closed);
              }}
              onSelectRestaurant={handleSelectRestaurant}
            />
          )}
        </main>
      </div>

      {/* 手機版三段式 Bottom Sheet */}
      <MobileBottomSheet
        stage={mobileSheetStage}
        onStageChange={setMobileSheetStage}
        headerContent={
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-xs font-bold text-slate-900">
                找到 {filteredRestaurants.length} 間餐廳
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMobileTab('list');
                  if (mobileSheetStage === 'collapsed') setMobileSheetStage('half');
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer ${
                  mobileTab === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                清單
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileTab('filter');
                  setMobileSheetStage('full');
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer ${
                  mobileTab === 'filter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                篩選
              </button>
            </div>
          </div>
        }
      >
        {mobileTab === 'list' ? (
          <RestaurantList
            restaurants={filteredRestaurants}
            isLoading={isLoading}
            selectedId={selectedId}
            googleMapsAreaUrl={googleMapsAreaUrl}
            onSelect={(r) => {
              handleSelectRestaurant(r);
              setMobileSheetStage('half');
            }}
            onExclude={(id) => setExcludedIds((prev) => [...prev, id])}
            onRelaxFilters={handleRelaxFilters}
          />
        ) : (
          <FilterPanel
            appMode={appMode}
            filters={filters}
            onChange={setFilters}
            onRelaxFilters={handleRelaxFilters}
            excludedCount={excludedIds.length}
            onRestoreExcluded={() => setExcludedIds([])}
          />
        )}
      </MobileBottomSheet>

      {/* 彈窗：隨機決定器 & API Key 設定 */}
      <RandomPickerModal
        isOpen={isRandomModalOpen}
        candidates={filteredRestaurants}
        googleMapsAreaUrl={googleMapsAreaUrl}
        onClose={() => setIsRandomModalOpen(false)}
        onFocusRestaurant={handleSelectRestaurant}
        onRelaxFilters={handleRelaxFilters}
      />

      <ApiKeyModal
        isOpen={isApiModalOpen}
        mode={appMode}
        apiKey={apiKey}
        onClose={() => setIsApiModalOpen(false)}
        onSave={handleSaveApiConfig}
      />
    </div>
  );
}

export default App;
