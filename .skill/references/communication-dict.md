# 區塊溝通字典

> Johnny 用什麼口語，對應網站哪個區塊。看不懂口語時來這裡查。

---

## 6 大區塊

| Johnny 說的 | 實際 class | 在哪 |
|------------|-----------|------|
| 「Header」/「頁首」/「最上面那條」 | `.ys-header` | 頂端深藍橫條 |
| 「Nav」/「導覽列」/「選單」 | `.ys-nav` | Header 內右下 |
| 「Hero」/「主視覺」/「首屏」/「滿版那塊」 | `.ys-hero`（首頁）/ `.page-hero`（內頁）| 第一屏大圖 |
| 「Stats」/「數據條」/「下面那條」（首頁）| `.ys-stats` | Hero 下方 |
| 「Service」/「服務區」/「中間 4 張卡」 | `.ys-service` | 首頁限定 |
| 「Footer」/「頁尾」/「最下面那條」 | `.ys-footer` | 頁面最底 |

## Header 內細部

| Johnny 說的 | 實際 class |
|------------|-----------|
| 「Logo」/「圖徽」 | `.ys-logo-img` |
| 「Logo 主標」/「永旭智慧財產事務所那行」 | `.ys-logo-zh` |
| 「Logo 副標」/「YONG SYU 那行」 | `.ys-logo-en` |
| 「電話」/「上面的電話」 | `.ys-phone` |
| 「CTA」/「立即諮詢按鈕」/「右上金色按鈕」 | `.ys-cta-btn` |
| 「EN」/「中」/「語系切換」 | `.ys-lang` |
| 「漢堡」/「漢堡按鈕」/「三條線」 | `.ys-menu-btn`（id: `ys-menu-toggle`）|

## Nav 內細部

| Johnny 說的 | 實際 class |
|------------|-----------|
| 「Nav 連結」/「6 個連結」 | `.ys-nav a[data-page]` |
| 「當前頁標記」/「金線」 | `.ys-nav a.active` |
| 「Nav 內的 English」/「漢堡裡的 English」 | `.ys-nav-lang` |

## Hero 內細部

| Johnny 說的 | 對應位置 |
|------------|---------|
| 「首頁大標」 | `.ys-hero-title` / `h1` |
| 「3 個條列」/「金色打勾那 3 條」 | `.ys-hero-point` |
| 「雙按鈕」/「立即諮詢 + 了解我們的服務」 | `.ys-hero-buttons` |
| 「Hero 註記」/「下面小字」 | `.ys-hero-note` |
| 「鋼筆」/「鋼筆背景」 | `.ys-hero` 的 background（桌面 hero-bg.jpg / 手機也用同一張）|
| 「內頁小金字」/「ABOUT YSIPO 那段」 | `.section-label` |
| 「副標」（內頁）| `.hero-subtitle-main` + `.hero-subtitle-sub` |

## Stats 內細部

| Johnny 說的 | 對應 |
|------------|------|
| 「數據格」/「單一個數字」 | `.ys-stat` |
| 「數字」/「25+」 | `.ys-stat-num` |
| 「標籤」/「數字下的字」 | `.ys-stat-label` |

## Service 內細部

| Johnny 說的 | 對應 |
|------------|------|
| 「服務卡片」/「4 張卡」 | `.ys-service-card` |
| 「卡片名稱」/「專利申請那 4 個字」 | `.ys-service-name` |
| 「英文副標」/「PATENT APPLICATION」 | `.ys-service-name-en` |
| 「卡片描述」 | `.ys-service-desc` |
| 「了解更多」 | `.ys-service-more` |

## Footer 內細部

| Johnny 說的 | 對應 |
|------------|------|
| 「品牌欄」/「Logo 那欄」 | `.ys-footer-brand` |
| 「服務項目」（footer 內）| 第 2 欄 `.ys-footer-list` |
| 「快速連結」 | 第 3 欄 `.ys-footer-list` |
| 「聯絡資訊」/「高雄總部」/「台北分所」 | `.ys-office` |
| 「電話圖示」/「話筒」 | Footer 內 `.ys-office-info` SVG |
| 「傳真圖示」 | `assets/img/icon-fax.svg` |
| 「版權字」/「最底部」 | `.ys-footer-bottom` |

## 浮動 / 全域

| Johnny 說的 | 對應 |
|------------|------|
| 「LINE 按鈕」/「右下角綠圈」 | `.floating-line-btn` |

---

## 頁面口語對照

| 口語 | 檔案 |
|------|------|
| 「首頁」 | `index.html` |
| 「關於我們」/「About 頁」 | `about.html` |
| 「服務項目」/「Services 頁」 | `services.html` |
| 「智財知識」/「Insights 頁」/「文章列表」 | `insights.html` |
| 「新聞動態」/「News 頁」 | `news.html` |
| 「聯絡我們」/「Contact 頁」 | `contact.html` |
| 「英文版」/「EN 版」 | `en/` 目錄下對應檔 |
| 「文章頁」 | `insights/article-*.html` |

---

## 顏色口語對照

| 口語 | CSS 變數 | 色碼 |
|------|---------|------|
| 「深藍」/「主背景」 | `var(--navy-deep)` | `#000d22` |
| 「次深藍」/「卡片底」 | `var(--navy)` | `#0A1D37` |
| 「Hover 藍」 | `var(--navy-light)` | `#102443` |
| 「主金」/「金色」 | `var(--gold)` | `#D4B37D` |
| 「深金」 | `var(--gold-dark)` | `#C5A265` |
| 「淡金」 | `var(--gold-light)` | `#E6D3B3` |
| 「暖白」/「淺底」 | `var(--white-bg)` | `#faf9f6` |

---

## 模糊用詞翻譯範例

| Johnny 說 | 翻譯成 |
|----------|--------|
| 「右上的金色按鈕」 | CTA「立即諮詢」（`.ys-cta-btn`）|
| 「下面那條深藍長條」 | Stats（`.ys-stats`）或 Footer（`.ys-footer`），要看上下文 |
| 「中間 4 張卡」 | Service 卡片（`.ys-service-card`）|
| 「滿版背景圖那塊」 | Hero（`.ys-hero` / `.page-hero`）|
| 「最上面那條」 | Header（`.ys-header`）|
| 「最下面那條」 | Footer 版權列（`.ys-footer-bottom`）|
| 「右下角綠色圓圈」 | LINE 浮動按鈕（`.floating-line-btn`）|
| 「3 個條列」/「3 個打勾」 | Hero 條列（`.ys-hero-point`）|
| 「兩個按鈕」/「雙按鈕」 | Hero 雙按鈕（`.ys-hero-buttons`）|
| 「鋼筆」/「筆」/「鋼筆位置」 | Hero 背景圖內的鋼筆，靠 `background-position` 調 |
| 「分隔線」/「金線」 | Header/Hero 的 `border-bottom: 1px solid var(--gold)` |
| 「電話那一行」 | 視情境：Header `.ys-phone` 或 Footer `.ys-office-info` |
