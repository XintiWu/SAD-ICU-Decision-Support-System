# ICU 護理分配決策支援系統

> 114-2 SA&D 第五組：江德偉、陳琳瑄、彭子承、楊沛縈、房輝旻、賴政妘、吳昕醍

本系統協助 ICU 護理長在每班班前，依據病患麻煩度評估、床位鄰近性與護理師班表快速完成護理師分床，並提供 STAT 醫囑追蹤、即時戰情室與交班快照。

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
# 1. 安裝套件
npm install

# 2. 建立資料庫（含 Demo 資料）
npm run db:setup

# 3. 啟動後端（port 8787）
npm run api:dev

# 4. 另開終端機啟動前端
npm run dev
```

> 如前端出現 `Failed to fetch`，請確認後端已啟動：`curl http://127.0.0.1:8787/api/v1/health`

### PostgreSQL 初始化說明

`npm run db:setup` 會建立並重置 demo database：`sad_frontend_v2`。此指令需要本機已啟動 PostgreSQL，且可以連到 admin database。

預設連線值如下：

```txt
DATABASE_ADMIN_URL=postgresql://postgres@%2Ftmp/postgres
DATABASE_URL=postgresql://postgres@%2Ftmp/sad_frontend_v2
```

如果本機 PostgreSQL 不是使用 `/tmp` Unix socket，或帳號密碼不是 `postgres`，請改用 TCP connection string：

```bash
DATABASE_ADMIN_URL=postgresql://postgres:password@localhost:5432/postgres \
DATABASE_URL=postgresql://postgres:password@localhost:5432/sad_frontend_v2 \
npm run db:setup
```

後端啟動時也要使用同一組 `DATABASE_URL`：

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/sad_frontend_v2 npm run api:dev
```

若看到以下錯誤，代表 PostgreSQL 尚未啟動，或連線位置與 README 預設值不同：

```txt
connect ENOENT /tmp/.s.PGSQL.5432
```

請先啟動 PostgreSQL，或改用上方 TCP connection string。

### 助教驗收建議流程

重新 clone 或解壓縮 zip 後，可依序執行：

```bash
npm install
npm run db:setup
npm test
npm run lint
npm run build
npm run api:dev
```

後端啟動後，另開終端機確認：

```bash
curl http://127.0.0.1:8787/api/v1/health
curl http://127.0.0.1:8787/api/v1/me
```

`/api/v1/health` 回傳成功代表 server 已啟動；`/api/v1/me` 回傳成功代表資料庫也已初始化完成。

## 主要功能

- **麻煩度評估**：護理師填寫每位病患的客觀與主觀負荷因素
- **系統建議分床**：依病患負荷、床位鄰近性與護理師班表產生分床建議，護理長可拖曳調整後確認
- **STAT 醫囑**：支援突發醫囑建立、匯入與完成狀態追蹤
- **戰情室**：依已確認分床即時彙整各護理師病患、任務、STAT 醫囑與剩餘負荷
- **交班快照**：分床確認後封存交班資料，保留當下分床與病患摘要
- **班表匯入**：支援 xlsx 護理師班表匯入，建立班別與出勤護理師

## 文件索引
| # | 文件 | 說明 |
|---|------|------|
| 00a | [System Design Document](docs/00_system_design_doc/00a_system_design.md) | 系統架構、資料庫設計、API 設計 |
| 00b | [Deployment](docs/00_system_design_doc/00b_deployment.md) | 部署說明 |
| 01a | [User Stories Mapping](docs/01_user-stories/01a_user-stories.md) | 使用者故事對照表（29 stories，7 epics） |
| 01b | [User Research](docs/01_user-stories/01b_user-research.md) | 使用者研究 |
| 01c | [使用者問卷調查與需求分析](docs/01_user-stories/04_使用者問卷調查與需求分析.pdf) | 問卷調查報告 PDF |
| 02 | [BPMN 流程圖](docs/02_BPMN/02_bpmn.md) | 業務流程模型 |
| 04 | [Tests](docs/04_tests/04_tests.md) | 測試報告與測試程式碼副本 |
| 05 | [Project Tracking](docs/05_Project_Tracking/05_專案管理.pdf) | 專案管理追蹤 PDF |
| 06 | [API Documentation](docs/06_API_docs/06_api-docs.md) | Open API 文件 |
| 08 | [ER Diagram](docs/08_ER_Diagram/08_er-diagram.md) | 資料庫關係圖 |

## 資料

- [病人模擬資料](data/病人模擬資料.json)
- [護理師班表範本](data/護理師班表-7日.xlsx)
