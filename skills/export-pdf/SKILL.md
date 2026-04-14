---
name: export-pdf
description: 将 results/<姓名>/ 下的 Markdown 方案转换为专业格式 PDF 报告（营养方案报告.pdf）。
---

# Export PDF

将患者的营养方案导出为专业 PDF 报告。

## 输入

- 患者姓名（对应 `results/<姓名>/`）
- 留空则遍历所有患者

## 输出

- `results/<姓名>/营养方案报告.pdf`
- `results/<姓名>/营养方案报告.html`（中间 HTML，可选保留）

## 报告内容

1. 封面页（患者姓名、报告日期）
2. 营养评估
3. 配餐方案
4. 运动处方

> 健康档案不包含在报告中。

## 执行方式

直接运行仓库已有脚本：
```bash
node scripts/export-pdf.js <姓名>
```

或处理所有患者：
```bash
node scripts/export-pdf.js
```

脚本位置：`scripts/export-pdf.js`
脚本依赖：`marked`（Markdown 解析）、`playwright`（PDF 生成）。

## 输出后

向用户报告 PDF 输出路径。
