/// <reference types="google.maps" />
import type { CuisineType, LatLng, PriceLevel, Restaurant, ScenarioTag } from '../types/restaurant';

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadedApiKey: string | null = null;
let loadingPromise: Promise<typeof google> | null = null;

/**
 * 動態載入 Google Maps JavaScript API (含 places 與 drawing/geometry 函式庫)
 */
export function loadGoogleMapsScript(apiKey: string): Promise<typeof google> {
  if (window.google?.maps && loadedApiKey === apiKey) {
    return Promise.resolve(window.google);
  }
  if (loadingPromise && loadedApiKey === apiKey) {
    return loadingPromise;
  }

  loadedApiKey = apiKey;
  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-js-sdk');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,drawing,geometry&language=zh-TW&region=TW`;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error('Google Maps SDK 載入失敗'));
      }
    };
    script.onerror = () => reject(new Error('無法連線至 Google Maps API，請檢查 API Key 或網路狀態'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

function mapGooglePriceLevel(priceLevel?: string): { level: PriceLevel; text: string } {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return { level: 1, text: 'NT$ 200 以下' };
    case 'PRICE_LEVEL_MODERATE':
      return { level: 2, text: 'NT$ 200 – 500' };
    case 'PRICE_LEVEL_EXPENSIVE':
      return { level: 3, text: 'NT$ 500 – 1,000' };
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return { level: 4, text: 'NT$ 1,000 以上' };
    default:
      return { level: 2, text: '約 NT$ 200 – 500' };
  }
}

function inferCuisineFromTypes(types: string[] = [], name = ''): CuisineType {
  const joined = `${types.join(' ')} ${name}`.toLowerCase();
  if (joined.includes('ramen') || joined.includes('japanese') || joined.includes('sushi') || joined.includes('日') || joined.includes('拉麵') || joined.includes('壽司')) return '日式料理';
  if (joined.includes('korean') || joined.includes('韓')) return '韓式料理';
  if (joined.includes('hot_pot') || joined.includes('火鍋') || joined.includes('鍋')) return '火鍋';
  if (joined.includes('barbecue') || joined.includes('燒肉') || joined.includes('居酒屋')) return '燒肉/居酒屋';
  if (joined.includes('hamburger') || joined.includes('american') || joined.includes('漢堡') || joined.includes('美式')) return '美式/漢堡';
  if (joined.includes('italian') || joined.includes('pasta') || joined.includes('pizza') || joined.includes('steak') || joined.includes('義')) return '義式/西餐';
  if (joined.includes('brunch') || joined.includes('breakfast') || joined.includes('早午餐')) return '早午餐';
  if (joined.includes('cafe') || joined.includes('bakery') || joined.includes('coffee') || joined.includes('咖啡') || joined.includes('甜點')) return '咖啡廳/甜點';
  if (joined.includes('vegetarian') || joined.includes('vegan') || joined.includes('素')) return '素食/健康餐';
  if (joined.includes('noodle') || joined.includes('麵') || joined.includes('小吃')) return '小吃/麵食';
  return '中式/台菜';
}

/**
 * 呼叫 Google Places API (New) - searchNearby
 * 支援圓形 locationRestriction（當多邊形模式時，傳入最小外接圓）
 */
export async function searchNearbyPlacesNew(
  apiKey: string,
  center: LatLng,
  radiusMeters: number
): Promise<Restaurant[]> {
  const clampedRadius = Math.min(50000, Math.max(100, radiusMeters));
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.currentOpeningHours,places.reservable,places.dineIn',
    },
    body: JSON.stringify({
      includedTypes: ['restaurant', 'cafe', 'bakery'],
      maxResultCount: 20,
      languageCode: 'zh-TW',
      locationRestriction: {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: clampedRadius,
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Places API (New) 請求失敗 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const places = (data.places || []) as Array<Record<string, any>>;

  return places.map((p, idx) => {
    const priceInfo = mapGooglePriceLevel(p.priceLevel);
    const name = p.displayName?.text || `餐廳 #${idx + 1}`;
    const tags: ScenarioTag[] = [];
    if (p.dineIn !== false) tags.push('有冷氣內用');
    if (p.reservable) tags.push('可線上/電話訂位');
    if (priceInfo.level <= 2) tags.push('一人友善');
    if (priceInfo.level >= 2) tags.push('適合多人聚餐');

    const isOpenNow = p.currentOpeningHours?.openNow ?? true;
    return {
      id: p.id || `live-${idx}`,
      placeId: p.id || '',
      name,
      cuisine: inferCuisineFromTypes(p.types, name),
      priceLevel: priceInfo.level,
      avgCostText: priceInfo.text,
      rating: p.rating ?? 4.0,
      reviewCount: p.userRatingCount ?? 0,
      lat: p.location?.latitude ?? center.lat,
      lng: p.location?.longitude ?? center.lng,
      isOpenNow,
      closingTimeText: isOpenNow ? '營業中（依 Google Maps 為準）' : '目前休息中',
      address: p.formattedAddress || '台灣',
      signatureDishes: [],
      tags,
    };
  });
}

/**
 * 使用 Google Geocoding API 搜尋地址或地標
 */
export async function geocodeAddress(apiKey: string, query: string): Promise<LatLng | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=zh-TW&region=tw&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}
