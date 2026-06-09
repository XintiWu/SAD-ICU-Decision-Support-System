# BPMN 流程圖

系統三條主要業務流程。BPMN 2.0 XML 檔案位於同目錄，可匯入 [bpmn.io](https://bpmn.io) 或 Camunda Modeler 查看與編輯。

| 流程 | XML 檔案 |
|------|----------|
| 麻煩度評估 | [burden_assessment.bpmn](burden_assessment.bpmn) |
| 分床與交班 | [allocation_handover.bpmn](allocation_handover.bpmn) |
| STAT 突發醫囑 | [stat_orders.bpmn](stat_orders.bpmn) |

---

## 流程一：麻煩度評估

> 護理師在班前填寫各自負責病患的主觀麻煩度評估，系統計算 `total_score` 供分床演算法使用。

```mermaid
flowchart LR
    S([開始]) --> A[護理師\n進入麻煩度評估頁]
    A --> B[系統\n載入本班評估資料\nGET /burden-assessments]
    B --> C[護理師\n填寫主觀評估因素\nRASS / Boolean / Level]
    C --> D{儲存方式}
    D -->|存草稿| E[護理師\n儲存草稿\nstatus = draft]
    D -->|提交| F[護理師\n提交評估\nstatus = submitted]
    E --> G[系統\n重新計算 subjective_total\n與 total_score]
    F --> G
    G --> End([結束])
```

---

## 流程二：分床與交班

> 小組長在班前產生分床建議、人工調整後確認分床，系統建立交班快照封存當下分配結果。

```mermaid
flowchart LR
    S([開始]) --> A[小組長\n進入分床頁]
    A --> B[系統\n載入護理師、病患、評估、STAT 資料]
    B --> C[系統\n執行分床演算法\nPOST /allocation-runs/suggest]
    C --> D[小組長\n檢視分床建議]
    D --> E{需要調整?}
    E -->|是| F[小組長\n拖曳調整分配]
    F --> G[系統\n儲存草稿\nPUT /items]
    G --> D
    E -->|否| H[小組長\n確認分床\nPOST /confirm]
    H --> I[系統\n檢查未分配病患]
    I --> J{仍有未分配?}
    J -->|是| D
    J -->|否| K[系統\n建立交班快照\nhandoff_snapshots]
    K --> L[小組長\n查看交班結果]
    L --> End([結束])
```

---

## 流程三：STAT 突發醫囑

> 醫師在班中建立突發醫囑，護理師待辦頁與小組長戰情室即時顯示，使用者可標記完成或取消。

```mermaid
flowchart LR
    S([開始]) --> A[醫師\n建立 STAT 醫囑\n/doctor/stat]
    A --> B[系統\n寫入 stat_orders\nstatus = pending]
    B --> C{並行通知}
    C --> D[護理師\n待辦頁查看 STAT\n/nurse/todo]
    C --> E[小組長\n戰情室查看 STAT\n/leader/war-room]
    D --> F{更新狀態}
    E --> F
    F -->|完成| G[系統\n更新 status = done]
    F -->|取消| H[系統\n更新 status = cancelled]
    G --> End([結束])
    H --> End
```
