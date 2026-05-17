# RWD 測試 Checklist

> 動到任何 CSS 後必跑一輪。

---

## 三個關鍵斷點

| 寬度 | 對應裝置 | 怎麼測 |
|------|---------|-------|
| **≥1200px** | 桌面寬螢幕 | 直接看 |
| **768-1199px** | 平板 / 小筆電 | F12 縮窗到 1000px 左右 |
| **≤767px** | 手機 | F12 切 Device Mode → iPhone 12 Pro (390×844) |

---

## 各斷點檢查項

### 桌面 ≥1200px

- [ ] Header Logo + 標題 + 電話 + CTA + EN 都正常顯示
- [ ] Nav 6 個連結橫向排列，當前頁有金色底線
- [ ] Hero 大標 + 條列 3 點 + 雙按鈕 + 鋼筆背景全部正常
- [ ] 4 個 Stats 數據格水平排列
- [ ] Service 4 張卡水平排列
- [ ] Footer 4 欄水平排列
- [ ] LINE 浮動按鈕在右下

### 平板 768-1199px

- [ ] Header 是否還是水平佈局（電話可能會藏起來）
- [ ] Nav 是否還是水平（或開始換行）
- [ ] Hero 內頁背景圖 `background-position` 是 `75% X%`（不是桌面的 `right X%`）
- [ ] Stats 是否變 2 列（2×2）
- [ ] Service 卡片是否變 2 列（2×2）
- [ ] Footer 是否變 2 列

### 手機 ≤767px

- [ ] **漢堡按鈕顯示**（Header 右上 ☰）
- [ ] 電話 / CTA / EN 在 Header 上**隱藏**
- [ ] 點漢堡 → Nav 下拉顯示
- [ ] Nav 最下方有 **English**（金色分隔線區隔）
- [ ] 再點漢堡 → Nav 收起
- [ ] Hero 文字不被背景圖蓋住
- [ ] Hero 背景圖（hero-bg.jpg）顯示鋼筆 + 書本（左側深漸層遮罩）
- [ ] **Header 底 + Hero 底有金線**
- [ ] Stats 變單列或 2 列
- [ ] Service 卡變單列
- [ ] Footer 各欄垂直堆疊
- [ ] 按鈕觸控區夠大（≥44px）
- [ ] 字級不會太小（≥14px）

---

## 內頁特殊檢查

5 個內頁（about/services/insights/news/contact）：

- [ ] `body.page-{name}` class 有正確加上（看 F12 Elements → `<body>`）
- [ ] Hero 背景圖正確（依頁面不同）
- [ ] 內頁 Hero 麵包屑已隱藏（不顯示「首頁 › 關於我們」）
- [ ] Hero 文字左對齊（不置中）
- [ ] section-label 上方小金字（ABOUT YSIPO 等）顯示
- [ ] 副標斷兩行（特別 about 頁的「永續服務 / 25 年智財實務 | 2010 創立」）

---

## 中英文版對照

如果改的是共用元件，**兩邊都要看**：

- [ ] 中文版正常：https://ysipo.com.tw
- [ ] 英文版正常：https://ysipo.com.tw/en/index.html
- [ ] 中 → EN 切換可用（點 Header 右上 EN）
- [ ] EN → 中 切換可用（點 Header 右上 中）

---

## DevTools 快捷

```
F12 開啟工具
Ctrl+Shift+M  切換 Device Mode
Ctrl+Shift+R  強制重抓（清本機快取）
Ctrl+Shift+C  Inspector 選取元素
```

裝置模擬推薦選 iPhone 12 Pro (390×844) 或 iPhone SE (375×667)。

---

## 真實裝置測試（必要的時候）

DevTools 模擬 ≠ 真實裝置！差異點：

| 項目 | DevTools | 真實 iPhone |
|------|---------|------------|
| Safari 私有 CSS bug | ❌ 看不出 | ✅ 會出現 |
| Touch event | ❌ 用滑鼠模擬 | ✅ 真正觸控 |
| 字型 rendering | 不同 | iOS 系統字 |
| 滾動慣性 | 不同 | iOS smooth scroll |
| 鋼筆位置（background-position）| **常常不準** | 才是真實樣子 |

→ **手機相關改動，最後一定用實機 + 無痕視窗驗證**。
