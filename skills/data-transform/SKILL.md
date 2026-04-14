---
name: data-transform
description: 将 results/<姓名>/ 下的 Markdown 文件解析为结构化 JSON（data.json），并生成带日期的版本目录。
---

# Data Transform

将 `results/<姓名>/` 下的 Markdown 文件解析为结构化 JSON，输出到版本化目录。

## 输入

- 用户名（对应 `results/<姓名>/`）
- 留空则遍历所有用户

## 读取文件

每个用户目录可能包含：
- `健康档案.md`（必须）
- `营养评估.md`（可选）
- `配餐方案_第N周.md`（可选，可多份）
- `运动处方.md`（可选）

## 解析规则

详细解析规则见仓库原文件 `.claude/skills/data-transform/SKILL.md`，本 skill 仅保留执行要点：

1. 按章节精确匹配 `## heading` 提取各模块。
2. 从 `- 字段: 值` 格式提取值，支持 `**bold**` 和 `（注释）`。
3. 解析 Markdown 表格为二维数组，跳过分隔行，去除 `**`。
4. 检验指标状态自动判定：↑↑→very_high, ↑→high, ↓→low, ↓↓→very_low, 无标记→normal。

## 标识与查看码

- `id`：UUID v4（通过 `python3 -c "import uuid; print(uuid.uuid4())"` 生成）
- `viewCode`：18位随机字符串（小写+数字，通过 Python random 生成）

**如果已有 `data.json` 且包含 `id` 和 `viewCode`，复用已有值。**

## 输出

1. 在 `results/<姓名>/` 下生成/覆盖 `data.json`
2. 创建版本化目录 `results/<姓名>_<日期>/`（日期格式 YYYY-MM-DD）
3. 将 `results/<姓名>/` 下的所有 Markdown 文件复制到版本目录
4. 将 `data.json` 复制到版本目录

## 执行方式

直接运行仓库已有脚本：
```bash
node scripts/data-transform.js <姓名>
```

或处理所有用户：
```bash
node scripts/data-transform.js
```

## 输出后

向用户报告生成的查看码，并提示可继续 `/export-pdf` 或 `/visualize-report`。
