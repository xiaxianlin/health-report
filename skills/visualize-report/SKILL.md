---
name: visualize-report
description: 将 results/<姓名>/data.json 转换为可视化 HTML 网页（可视化报告.html）。
---

# Visualize Report

将 `data.json` 转换为可视化 HTML 网页，采用卡片式设计风格。

## 输入

- 患者姓名（对应 `results/<姓名>/`）
- 留空则遍历所有患者

## 输出

- `results/<姓名>/可视化报告.html`

## 页面结构

1. **健康档案 Tab**：基本信息、诊断标签、检验指标表格、用药信息
2. **营养评估 Tab**：能量计算、宏量营养素、餐次分配、推荐/禁忌食物、药物交互
3. **配餐方案 Tab**：每日食谱（7天展开）、每餐颜色标识、每日营养合计
4. **运动建议 Tab**：安全性评估、运动处方、有氧/抗阻/柔韧卡片、分阶段计划

## 样式特性

- 响应式布局，移动端适配
- 交互式 Tabs
- 颜色编码（正常=绿，偏高/偏低=黄，严重异常=红）
- 打印友好
- 纯 CSS + 原生 JavaScript，无需构建工具

## 执行方式

直接运行仓库已有脚本：
```bash
node scripts/visualize-report.js <姓名>
```

或处理所有患者：
```bash
node scripts/visualize-report.js
```

## 依赖

需要 `data.json` 已存在。如不存在，先执行 `/data-transform <姓名>`。

## 输出后

向用户报告 HTML 输出路径，并说明可直接用浏览器打开。
