import type { LatLng, Restaurant } from '../types/restaurant';

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
 * 判斷目標座標點是否位於多邊形頂點陣列內部
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
 * 用於將不規則手繪多邊形轉換為 Google Places API (New) searchNearby 所需的圓形 locationRestriction，
 * 再搭配前端 isPointInPolygon 精準剔除多邊形外的店家。
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

  // 以重心為初始圓心，找出最大半徑並做 Ritter's bounding circle 近似最佳化
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

  // 找離 farthestA 最遠的點 farthestB
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

  // 確保所有頂點都在圓內
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

  // 加上 50 公尺緩衝，並限制於 Google Places API 上限 50000m
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
  const walkMinutes = Math.max(1, Math.round(meters / 75)); // 約 4.5 km/h
  const scooterMinutes = Math.max(1, Math.round(meters / 450)); // 市區騎車約 27 km/h
  return { distanceText, walkMinutes, scooterMinutes };
}

/**
 * Google 官方標準深度連結（Deep Link）
 */
export function buildGoogleMapsDeepLink(restaurant: Restaurant): string {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
  if (restaurant.placeId && !restaurant.placeId.startsWith('mock_')) {
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(restaurant.placeId)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(restaurant.placeId)}`;
}
