# 我的網路使用報告(服務已終止) 使用說明書
這是 Chrome 擴充功能「[我的網路使用報告](https://chrome.google.com/webstore/detail/anepijmkiffdjchfonbcnngnkogjllhg/)」的使用手冊

## 隱私權條款
請參閱[副本](./privacy_policy.md)，正本為擴充功能中任意頁面最下方連結中的內容

## 使用方法
於任何頁面點擊網址列右邊的![圖示](./icon/icon48.png)，即可進入報表頁面

## 問題回報或功能建議
請使用本專案的 [issues](https://github.com/ncu-dart/MySafariReport/issues)分頁進行回報

## [更新紀錄](./Change_Log.md)
亦可透過擴充功能中任意頁面最下方連結查看。

## 程式碼開源使用條款
- 本專案的所有權為國立中央大學 資訊工程學系 資料分析科學實驗室。
- 禁止未經許可，直接將此專案上架到任何商店。
- 本專案程式碼僅供學術使用，禁止任何未經許可的商業用途。

## 資料夾架構
---/icon: 專案圖標  
 |-/Release: 所有推送版本的紀錄（最終穩定版本為1.214）  
 |  
 |-/活動抽獎: 抽獎活動紀錄  
 |  
 |-/Change_Log.md: 版本更新紀錄，停用許久  
 |  
 |-/privacy_policy.md: 使用者隱私權協議副本  
 |  
 |-/README.md  
 |  
 --/Source  
    |-/Client: Chrome Extesion(最後一版本)  
    |   |-frameworks: 使用到的額外套件功能  
    |   |-modules: 主要功能模組  
    |   |   |-/background: 背景工作模組，主要資料蒐集傳送、控制的模組  
    |   |   |-/footer: 頁面共通的頁腳  
    |   |   |-/header: 頁面共通的頁首  
    |   |   |-/icons: 各個頁面使用到的icons  
    |   |   |-/notiify: 通知功能模組  
    |   |   |-/privacy: 隱私權宣告頁面  
    |   |   |-/report: 報表模組，使用者服務功能  
    |   |   --/reward: 積分功能相關模組  
    |   |  
    |   --manifest.json: 擴充功能設定檔案  
    |  
    |-/Relay_Server: 中繼HTTPS伺服器  
    |  
    |-/Main_Server: 主要運算伺服器  
    |  
    --README.md  
