import type { FilterState, LatLng, Restaurant } from '../types/restaurant';

const EARTH_RADIUS_M = 6371000;

/**
 * 計算兩點經緯度之間的大圓距離（公尺）
 */
export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Point-in-Polygon 射線法（Ray-Casting Algorithm）
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 計算多邊形幾何中心點（Centroid）
 */
export function getPolygonCentroid(polygon: LatLng[]): LatLng {
  if (polygon.length === 0) return { lat: 25.0355, lng: 121.5565 };
  let sumLat = 0;
  let sumLng = 0;
  for (const p of polygon) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  return {
    lat: sumLat / polygon.length,
    lng: sumLng / polygon.length,
  };
}

/**
 * 計算多邊形的最小外接圓（Minimum Bounding Circle）
 */
export function computeMinimumBoundingCircle(polygon: LatLng[]): {
  center: LatLng;
  radiusMeters: number;
} {
  if (polygon.length === 0) {
    return { center: { lat: 25.0355, lng: 121.5565 }, radiusMeters: 1000 };
  }
  if (polygon.length === 1) {
    return { center: polygon[0], radiusMeters: 500 };
  }

  const centroid = getPolygonCentroid(polygon);
  let maxDist = 0;
  let farthestA = polygon[0];
  for (const p of polygon) {
    const d = haversineDistanceMeters(centroid, p);
    if (d > maxDist) {
      maxDist = d;
      farthestA = p;
    }
  }

  let spanDist = 0;
  let farthestB = farthestA;
  for (const p of polygon) {
    const d = haversineDistanceMeters(farthestA, p);
    if (d > spanDist) {
      spanDist = d;
      farthestB = p;
    }
  }

  let center: LatLng = {
    lat: (farthestA.lat + farthestB.lat) / 2,
    lng: (farthestA.lng + farthestB.lng) / 2,
  };
  let radius = haversineDistanceMeters(center, farthestA);

  for (const p of polygon) {
    const d = haversineDistanceMeters(center, p);
    if (d > radius) {
      const diff = (d - radius) / 2;
      const ratio = diff / d;
      center = {
        lat: center.lat + (p.lat - center.lat) * ratio,
        lng: center.lng + (p.lng - center.lng) * ratio,
      };
      radius = (radius + d) / 2;
    }
  }

  return {
    center,
    radiusMeters: Math.min(50000, Math.max(200, Math.ceil(radius + 50))),
  };
}

/**
 * 格式化距離與預估步行 / 騎車時間
 */
export function formatDistanceAndEta(meters: number): {
  distanceText: string;
  walkMinutes: number;
  scooterMinutes: number;
} {
  const distanceText =
    meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  const walkMinutes = Math.max(1, Math.round(meters / 75));
  const scooterMinutes = Math.max(1, Math.round(meters / 450));
  return { distanceText, walkMinutes, scooterMinutes };
}

/**
 * Google 官方標準深度連結（Deep Link）
 * - 若具備真實 placeId，附上 query_place_id 精準定位該店家頁面
 * - 若為 OSM 店家無 placeId，附上店家名稱與經緯度，讓 Google Maps 直接聚焦於該店家座標並搜尋
 */
export function buildGoogleMapsDeepLink(restaurant: Restaurant): string {
  const hasRealStreetAddress =
    restaurant.address && !restaurant.address.startsWith('台灣（');

  if (restaurant.placeId) {
    const query = encodeURIComponent(
      hasRealStreetAddress ? `${restaurant.name} ${restaurant.address}` : restaurant.name
    );
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(restaurant.placeId)}`;
  }

  if (hasRealStreetAddress) {
    const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  return `https://www.google.com/maps/search/${encodeURIComponent(restaurant.name)}/@${restaurant.lat.toFixed(6)},${restaurant.lng.toFixed(6)},18z`;
}

/**
 * 一鍵帶入圈選中心、半徑縮放層級與篩選條件，直接開啟 Google Maps 搜尋結果頁
 */
export function buildGoogleMapsAreaSearchUrl(
  center: LatLng,
  radiusMeters: number,
  filters: FilterState
): string {
  const parts: string[] = [];
  if (filters.cuisines.length > 0) {
    parts.push(filters.cuisines.slice(0, 2).join(' '));
  }
  if (filters.searchQuery.trim()) {
    parts.push(filters.searchQuery.trim());
  }
  if (parts.length === 0) {
    parts.push('餐廳 美食');
  } else {
    parts.push('餐廳');
  }
  const zoom = Math.min(
    18,
    Math.max(13, Math.round(16.2 - Math.log2(Math.max(200, radiusMeters) / 400)))
  );
  return `https://www.google.com/maps/search/${encodeURIComponent(parts.join(' '))}/@${center.lat.toFixed(6)},${center.lng.toFixed(6)},${zoom}z`;
}
