# 智慧地圖餐廳選擇器（Smart Restaurant Picker）

支援桌面與手機端（RWD）的繁體中文美食地圖選擇系統，內建 **演示模擬模式（Mock Mode）** 與 **真實 Google Maps API 模式（Live Mode）** 雙軌架構。

## 功能特色

- **雙模式運作**：
  - **演示模擬模式（預設）**：免 API Key，內建 27 筆涵蓋台北（信義、中山）、台中（西屯、西區）、高雄（左營）的真實感在地餐廳資料，開箱即可操作。
  - **真實 Google Maps 模式**：點擊右上角「API Key 設定」輸入金鑰後，無縫切換至 Google Maps JavaScript API 與 Places API (New)。
- **雙模式範圍圈選**：
  - **中心半徑模式**：可拖曳中心點並調整 `200m` – `5km` 搜尋半徑。
  - **手繪多邊形模式**：點擊地圖放置頂點框出不規則街區；系統自動計算「最小外接圓（Minimum Bounding Circle）」向 API 請求，再於前端以 **Point-in-Polygon 射線法** 精準過濾。
- **多維度防踩雷篩選**：料理類型複選、台幣價位區間、最低星等滑桿、最低評論數門檻（防洗評價）、營業中過濾、用餐情境標籤。
- **解決選擇困難**：支援「幫我抽一家」動畫抽籤（不重複重抽）與卡片右上角「暫時略過」。
- **Google Maps 深度連結**：每張卡片底部皆提供標準 `https://www.google.com/maps/search/?api=1&query=...&query_place_id=...` 連結，手機端可直接喚起 Google Maps App。

## 環境設定與執行

```bash
# 1. 安裝相依套件
npm install

# 2. 啟動開發伺服器
npm run dev

# 3. 建置正式版本
npm run build
```

### 啟用真實 Google Maps API 說明
若要使用真實即時資料，請至 [Google Cloud Console](https://console.cloud.google.com/) 建立專案並啟用以下三項 API：
1. **Maps JavaScript API**
2. **Places API (New)**
3. **Geocoding API**

將取得的 API Key 貼入右上角「API Key 設定」即可切換為即時模式。
