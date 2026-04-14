---
name: openclaw-health-workflow
description: 当前工作空间专用的健康报告总工作流。用于 health-report 项目的病历解析、营养评估、运动处方、配餐生成、数据转换、PDF 导出和可视化报告。适用于用户要求运行完整健康方案流程、继续中断流程、或在当前空间内复用 Claude skills 工作流时。
---

# OpenClaw Health Workflow

这是当前工作空间私有的总路由 skill，用于把仓库内原有 `.claude/skills/` 工作流迁移为 OpenClaw 可遵循的技能体系。

## 何时使用

当用户提出以下需求时使用本 skill：
- 运行完整健康报告工作流
- 从病历/体检报告生成完整健康方案
- 继续某个中断的健康方案流程
- 在当前空间内复用或迁移 Claude skills
- 导出 PDF / 生成可视化 HTML / 转换 data.json

## 工作方式

优先把任务路由到以下工作空间私有 skills：
- `parse-medical-record`
- `nutrition-assess`
- `exercise-plan`
- `meal-plan`
- `data-transform`
- `export-pdf`
- `visualize-report`

## 执行原则

1. **只在当前工作空间使用**，不要假设这些 skills 在全局已安装。
2. 每次先判断用户要的是：单步执行 / 完整流程 / 继续流程。
3. 完整流程顺序固定为：
   1) 病历解析
   2) 营养评估
   3) 运动处方
   4) 配餐生成
   5) 数据转换
   6) PDF 导出
   7) 可视化 HTML
4. 三个阶段必须做外部参考检索并保存到 `knowledge/references/`：
   - 营养评估
   - 运动处方
   - 配餐生成
5. 所有输出必须落到仓库规范目录：
   - `records/<客户>/`
   - `results/<姓名>/`
   - `results/<姓名>_<日期>/`
6. 所有医疗建议都必须保留免责声明，不得伪装成医生诊断。

## 参考资料

先读这些 reference，不要把所有细节塞在当前文件：
- `references/mapping.md`：Claude skills → OpenClaw skills 的映射关系
- `references/repo-structure.md`：仓库结构和关键规则

## 继续流程（resume）判断规则

查看 `results/<姓名>/` 下是否存在：
- 仅有 `健康档案.md` → 从营养评估继续
- 有 `营养评估.md` 但无 `运动处方.md` → 从运动处方继续
- 有 `运动处方.md` 但无 `配餐方案_第1周.md` → 从配餐继续
- 有配餐但无 `data.json` → 从数据转换继续
- 有 `data.json` 但无 PDF/HTML → 从导出继续

## 迁移边界

这个 skill 主要提供**路由和规则统一**。
各单步技能的具体格式、约束和输出模板放在对应 skill 中，不在这里重复。
