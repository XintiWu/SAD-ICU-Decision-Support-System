# ICU 護理分配決策支援系統

本系統協助 ICU 護理長在每班班前，依據病患麻煩度評估快速完成護理師分床，並提供即時戰情室與交班單。

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| 後端 | Node.js HTTP server + REST API |
| 資料庫 | PostgreSQL |
| 部署 | Vercel（前端）、Render（後端）|

## 快速啟動

**環境需求：** Node.js、PostgreSQL

```bash
# 安裝套件並建立資料庫（含 Demo 資料）
npm install
npm run db:setup

# 啟動後端（port 8787）
npm run api:dev

# 另開終端機啟動前端
npm run dev
```

> 如前端出現 `Failed to fetch`，請確認後端已啟動：`curl http://127.0.0.1:8787/api/v1/health`

## 主要功能

- **麻煩度評估**：護理師填寫每位病患的客觀與主觀負荷因素
- **系統建議分床**：依負荷分數自動產生護理師分床建議，護理長可調整後確認
- **戰情室**：即時顯示全區床位與護理師負荷狀態
- **交班單**：自動彙整當班摘要

## 文件索引

| # | 文件 | 說明 |
|---|------|------|
| 1 | [User Stories Mapping](docs/01_user-stories/01_user-stories.md) | 使用者故事對照表 |
| 2 | [BPMN 流程圖](docs/02_BPMN/02_bpmn.md) | 業務流程模型 |
| 4 | [Tests](docs/04_tests/04a_tests.md) | 測試報告 |
| 5 | [Project Tracking](docs/05_Project_Tracking/05_project-tracking.md) | 專案管理追蹤 |
| 6 | [API Documentation](docs/06_api-docs/06_api-docs.md) | Open API 文件 |
| 8 | [EER Diagram](docs/08_ER_Diagram/08_er-diagram.md) | 資料庫關係圖 |
| — | [開發記錄](docs/00_develop_record/NOTES.md) | 後端開發進度與實作紀錄 |
| — | [領域知識](docs/09_Domain_info/STAT519.md) | ICU 護理領域資訊 |

## 資料

- [病人模擬資料](data/病人模擬資料.json)
- [護理師班表範本](data/護理師班表-7日.xlsx)
