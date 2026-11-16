export interface LatLng {
  lat: number;
  lng: number;
}

export type CuisineType =
  | '中式/台菜'
  | '日式料理'
  | '韓式料理'
  | '美式/漢堡'
  | '義式/西餐'
  | '火鍋'
  | '燒肉/居酒屋'
  | '早午餐'
  | '咖啡廳/甜點'
  | '小吃/麵食'
  | '素食/健康餐';

export type PriceLevel = 1 | 2 | 3 | 4;

export type ScenarioTag =
  | '一人友善'
  | '適合多人聚餐'
  | '可線上/電話訂位'
  | '有冷氣內用'
  | '周邊好停車'
  | '寵物友善';

export type SortOption = 'recommended' | 'rating' | 'reviews' | 'distance';

export type DrawMode = 'circle' | 'polygon';

export type AppMode = 'mock' | 'live';

export interface Restaurant {
  id: string;
  placeId: string;
  name: string;
  cuisine: CuisineType;
  priceLevel: PriceLevel;
  avgCostText: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  isOpenNow: boolean;
  closingTimeText: string; // e.g. "21:30 打烊" or "24 小時營業"
  address: string;
  signatureDishes: string[];
  tags: ScenarioTag[];
  distanceMeters?: number;
}

export interface FilterState {
  cuisines: CuisineType[];
  priceLevels: PriceLevel[];
  minRating: number;
  minReviews: number;
  onlyOpenNow: boolean;
  tags: ScenarioTag[];
  sortBy: SortOption;
  searchQuery: string;
}

export interface LandmarkPreset {
  id: string;
  label: string;
  center: LatLng;
}

export const CUISINE_OPTIONS: CuisineType[] = [
  '中式/台菜',
  '日式料理',
  '韓式料理',
  '美式/漢堡',
  '義式/西餐',
  '火鍋',
  '燒肉/居酒屋',
  '早午餐',
  '咖啡廳/甜點',
  '小吃/麵食',
  '素食/健康餐',
];

export const PRICE_OPTIONS: { level: PriceLevel; symbol: string; label: string; range: string }[] = [
  { level: 1, symbol: '$', label: '平價', range: 'NT$ 200 以下' },
  { level: 2, symbol: '$$', label: '中價位', range: 'NT$ 200 – 500' },
  { level: 3, symbol: '$$$', label: '中高價位', range: 'NT$ 500 – 1,000' },
  { level: 4, symbol: '$$$$', label: '高級餐廳', range: 'NT$ 1,000 以上' },
];

export const REVIEW_THRESHOLD_OPTIONS = [
  { value: 0, label: '不限評論數' },
  { value: 50, label: '50 則以上' },
  { value: 100, label: '100 則以上' },
  { value: 500, label: '500 則以上' },
];

export const SCENARIO_TAGS: ScenarioTag[] = [
  '一人友善',
  '適合多人聚餐',
  '可線上/電話訂位',
  '有冷氣內用',
  '周邊好停車',
  '寵物友善',
];
