# CSS 命名規則 + v20 色彩規範

> 改 CSS 前必讀。所有 v20 改造後的 class 都以 `.ys-` 開頭。

---

## v20 色彩規範（CSS 變數）

```css
:root {
  --navy-deep: #000d22;     /* Hero/Stats 主背景 */
  --navy: #0A1D37;          /* 卡片、Footer 背景 */
  --navy-darker: #000d22;   /* Header/Nav 背景（同 navy-deep）*/
  --navy-light: #102443;    /* Hover */
  --gold: #D4B37D;          /* 主金色 */
  --gold-dark: #C5A265;     /* 深金 */
  --gold-light: #E6D3B3;    /* 淡金 */
  --white-bg: #faf9f6;      /* 淺背景 */
}
```

舊變數對應（已改值，向下相容）：
- `--color-primary` → `#0A1D37`（原 `#1a2845`）
- `--color-primary-dark` → `#000d22`
- `--color-primary-light` → `#102443`
- `--color-accent` → `#D4B37D`（原 `#c8a96b`）
- `--color-accent-light` → `#E6D3B3`
- `--color-accent-dark` → `#C5A265`

**規則**：寫 CSS 一律用 `var(--gold)` 不寫 `#D4B37D`，方便未來統一改色。

---

## Header 區（`.ys-header`）

```
.ys-header                  整個頁首區
├─ .ys-logo-block           Logo + 標題容器
│  ├─ .ys-logo-link         (a 標籤)
│  ├─ .ys-logo-img          Logo 圖（56×56 金色圖徽）
│  ├─ .ys-logo-zh           主標「永旭智慧財產事務所」
│  └─ .ys-logo-en           副標「YONG SYU INTELLECTUAL...」
├─ .ys-header-right         右側容器
│  ├─ .ys-phone             電話 ☎ 07-345-3388
│  │  └─ .ys-phone-icon
│  ├─ .ys-cta-btn           CTA「立即諮詢」金色按鈕
│  ├─ .ys-lang              EN / 中 語系切換（桌面顯示，手機隱藏）
│  └─ .ys-menu-btn          漢堡按鈕（手機顯示，桌面隱藏）
│     #ys-menu-toggle       同一個元素的 id（JS 用）
```

## Nav 區（`.ys-nav`）

```
.ys-nav                     導覽列容器
├─ a[data-page="..."]       Nav 連結（首頁/關於我們/...）
│  └─ .active               當前頁標記（金色底線）
└─ .ys-nav-lang             語系切換（手機漢堡內顯示，桌面隱藏）
                            class="ys-nav-lang" 是專屬 class
                            桌面 @media (min-width: 769px) display: none
```

## Hero 區（首頁 `.ys-hero`）

```
.ys-hero                    首頁主視覺區
├─ .ys-hero-bg              背景圖（桌面用，手機 display: none）
├─ .ys-hero-overlay         漸層遮罩
├─ .ys-hero-content         文字內容容器
│  ├─ .ys-hero-title        h1 「保護您的 品牌、創意與發明」
│  ├─ .ys-hero-points       條列容器
│  │  └─ .ys-hero-point     單一條列
│  │     └─ .ys-check       金色打勾圈
│  ├─ .ys-hero-buttons      雙按鈕容器
│  │  ├─ .ys-btn-primary    立即免費諮詢（金底）
│  │  └─ .ys-btn-outline    了解我們的服務（外框）
│  └─ .ys-hero-note         下方註記小字
└─ .ys-hero::after          ❌ 已棄用（手機原本放 pen-mobile.png）
```

**手機版重要差異**（≤768px）：
- `.ys-hero-bg` `display: none`
- `.ys-hero-overlay` `display: none`
- `.ys-hero::after` `content: none`（棄用 pen-mobile.png）
- `.ys-hero` 直接 `background-image: url('../img/hero-bg.jpg')` + 漸層遮罩

## Hero 區（內頁 `.page-hero`）

```
.page-hero                  內頁主視覺（about/services/insights/news/contact）
└─ .container
   ├─ .breadcrumb           ❌ 已隱藏（display: none）
   ├─ .section-label        上方小金字「ABOUT YSIPO」等
   ├─ h1                    大標
   ├─ .hero-subtitle-main   副標主（較亮、較大）
   └─ .hero-subtitle-sub    副標副（較淡、較小）
```

**背景圖綁定**：靠 `body.page-{name}` class（main.js 動態加）+ CSS 選擇器
```css
body.page-about    .page-hero { background-image: url('../img/hero-about.jpg'); }
body.page-services .page-hero { background-image: url('../img/hero-services.jpg'); }
/* ... */
```

## Stats 區（`.ys-stats`）

```
.ys-stats                   數據條（首頁限定）
└─ .ys-stat × 4             單一數據格
   ├─ .ys-stat-img          icon
   ├─ .ys-stat-num          數字（25+ / 16+ / Top 20 / 100+）
   └─ .ys-stat-label        標籤文字
```

## Service 區（`.ys-service`）

```
.ys-service                 服務區（首頁限定）
├─ .ys-service-tag          上方小標「SERVICE」
├─ .ys-service-title        大標「我們的專業服務」
├─ .ys-service-sub          副標
└─ .ys-service-grid         卡片格線容器
   └─ .ys-service-card × 4
      ├─ .ys-service-icon-wrap    icon 容器
      ├─ .ys-service-name         中文名（專利申請）
      ├─ .ys-service-name-en      英文副標（PATENT APPLICATION）
      ├─ .ys-service-desc         描述文字
      └─ .ys-service-more         「了解更多 →」連結
```

## Footer 區（`.ys-footer`）

```
.ys-footer                  整個頁尾深藍區
└─ .ys-footer-inner
   └─ .ys-footer-grid       4 欄 grid
      ├─ .ys-footer-col.ys-footer-brand   品牌欄
      │  ├─ .ys-footer-logo
      │  │  ├─ .ys-footer-logo-zh
      │  │  └─ .ys-footer-logo-en
      │  └─ .ys-footer-about              簡介文字
      ├─ .ys-footer-col                   服務項目
      │  ├─ .ys-footer-title
      │  └─ .ys-footer-list (ul > li > a)
      ├─ .ys-footer-col                   快速連結
      └─ .ys-footer-col.ys-footer-contact 聯絡資訊
         └─ .ys-office × 2                高雄 / 台北
            ├─ .ys-office-name
            └─ .ys-office-info
└─ .ys-footer-bottom        最底部版權字
```

## 浮動元件

```
.floating-line-btn          LINE 浮動按鈕（右下綠圈）
```

---

## RWD 斷點

| 範圍 | 用途 |
|------|------|
| `@media (min-width: 1200px)` | 桌面寬螢幕 |
| `@media (min-width: 769px)` | 桌面 / 大平板 |
| `@media (max-width: 1199px)` | 平板以下 |
| `@media (max-width: 768px)` | 手機 |
| `@media (max-width: 767px)` | 手機（嚴格）|

**重要**：寫 RWD 規則時注意 768 / 767 一致性。`min-width: 769` 對應的隱藏邊界是 `max-width: 768`。

---

## CSS 修改原則

1. **改 CSS 優先「追加到 main.css 末尾」**，不要改既有規則（避免污染）
2. 若必須改既有規則，用 `perl -i -pe`（不是 sed，sed 處理中文會出狀況）
3. `!important` 是最後手段，能用選擇器特定性解決就不用
4. 命名新 class 一律用 `.ys-` 前綴（保持命名一致）
5. **絕不寫 inline style 在 HTML 內**（除非實在沒辦法）
6. 顏色用 `var(--gold)` 而非 `#D4B37D`
7. 字級用 px 不要用 em（避免巢狀繼承混亂）

---

## 常見錯誤

| 錯誤 | 正確做法 |
|------|---------|
| 改了 main.css 但忘記 partial 也要對齊 | partial 是 HTML 結構，要看是 class 改名還是樣式改 |
| 桌面改 CSS 沒測手機 | 必檢 ≥1200 / 768-1199 / ≤767 三斷點 |
| 改首頁忘記內頁也要改 | 5 個內頁通常共用樣式，要全部測一輪 |
| 改中文版忘記英文版 | 中英文檔案要對稱改動 |
| 寫 `.hero-xxx` 沒加 `.ys-` 前綴 | 統一用 `.ys-` 前綴避免衝突 |
| 用 `!important` 蓋掉自己沒看到的舊規則 | 先 `grep -n "目標選擇器"` 找出衝突的規則再修 |
