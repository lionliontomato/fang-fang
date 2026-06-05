# 莫蘭迪藍歌單網站（GitHub Pages 版）

## 檔案
請把這些檔案放在 GitHub repo 根目錄：

- index.html
- style.css
- script.js
- .nojekyll

## 試算表連動
目前已連到這份 Google Sheet：
`1-4mY86ruT2HnTWpPI9MJ9MYPWVTE_Yi3Zoe3PZIMSbs`

讀取規則：

- A 欄：歌名
- B 欄：歌手
- C 欄：歌曲分類 / 標籤
- D 欄：歌曲連結（可空）
- F 欄：網站上方標籤按鈕清單

F 欄只控制按鈕，不會依照列數套到歌曲；每首歌實際屬於什麼分類，是看自己的 C 欄。

## GitHub Pages 設定
1. 建立一個 GitHub repository。
2. 上傳 ZIP 解壓縮後的全部檔案到根目錄，不要包在資料夾裡。
3. 到 Settings → Pages。
4. Source 選 Deploy from a branch。
5. Branch 選 main，資料夾選 /root。
6. 儲存後等待 GitHub 產生網址。

## 如果網站顯示讀不到試算表
請確認 Google Sheet 分享權限是：「知道連結的任何人」可以「檢視」。
