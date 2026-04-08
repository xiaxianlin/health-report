# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个个性化营养方案生成与管理系统，包含：
1. **CLI 工作流**（Claude Skills）：从患者信息输入生成完整营养方案
   - 支持3类信息来源：体检报告、病历档案、手动录入
2. **PDF 导出**：将方案导出为专业 PDF 报告
3. **可视化报告**：将方案生成为可交互的 HTML 网页

## Architecture

### 数据流向

```
病历/输入 → Markdown（results/<患者>/） → 输出（PDF / 可视化 HTML）
                ↓
            JSON（data.json）
```

1. **生成阶段**（Skills）：读取病历 → 生成健康档案/营养评估/配餐方案/运动处方（Markdown）
2. **转换阶段**（data-transform）：解析 Markdown → 结构化 JSON（results/<患者>/data.json）
3. **输出阶段**：
   - PDF 导出：`/export-pdf` → `营养方案报告.pdf`
   - 可视化报告：`/visualize-report` → `可视化报告.html`

### 目录结构

```
.claude/skills/          # Claude Skills（核心工作流）
  nutrition-workflow/    # 完整工作流入口
  parse-medical-record/  # 病历解析
  nutrition-assess/      # 营养评估
  meal-plan/             # 配餐生成
  exercise-plan/         # 运动处方
  data-transform/        # Markdown → JSON 转换
  export-pdf/            # PDF 导出
  visualize-report/      # 可视化 HTML 报告

knowledge/               # 知识库
  disease-diet-rules.md  # 疾病饮食规则
  food-nutrition-guide.md # 食材营养数据
  meal-templates.md      # 餐单模板
  nutrient-reference.md  # 营养素参考
  references/            # 检索保存的参考资料

results/                 # 患者方案输出
  <姓名>/                  # 工作目录（存放 Markdown 源文件）
    健康档案.md
    营养评估.md
    配餐方案_第1周.md
    运动处方.md

  <姓名>_<日期>/           # 版本化输出目录（自动生成，包含所有导出文件）
    健康档案.md            # 从工作目录复制
    营养评估.md
    配餐方案_第1周.md
    运动处方.md
    data.json              # 结构化数据（由 data-transform 生成）
    营养方案报告.pdf        # PDF 报告（由 export-pdf 生成）
    可视化报告.html         # 可视化报告（由 visualize-report 生成）

scripts/                 # 独立脚本
  export-pdf.js          # PDF 导出脚本
  visualize-report.js    # 可视化报告生成脚本

records/                 # 客户档案输入目录（按客户分子目录）
  <客户姓名>/              # 每个客户一个独立目录
    体检报告.pdf           # 体检报告（PDF格式）
    病历.pdf               # 病历档案（PDF格式）
    手动录入.md            # 手动录入的健康数据（Markdown格式）
    其他检查报告.jpg        # 其他格式的检查报告
```

**records 目录使用说明**：
- 每个客户在 `records/` 下有一个独立子目录
- 支持多种输入格式：PDF 体检报告、PDF 病历、Markdown 手动录入
- 文件名应清晰标识内容类型，便于识别
- 示例：`records/夏显林/爱康国宾体检报告_2025.pdf`

### 关键数据类型

JSON 数据结构定义见 `data.json`：
- 基本信息：name, gender, age, height, weight, bmi, bloodPressure, date, diagnoses, medications
- 检验指标：labGroups[{ title, results[{ indicator, value, unit, reference, status }] }]
- 营养评估：nutritionAssessment{ bmr, tdee, targetEnergy, macros, mealDistribution, recommendedFoods, forbiddenFoods }
- 配餐方案：mealPlans[{ weekNumber, days[{ day, meals[{ type, items }] }] }]
- 运动处方：exercisePrescription{ safety, prescription, phases, aerobic, resistance, flexibility }

## Commands

### 根目录（CLI 脚本）

```bash
# 安装依赖
npm install

# 数据转换（Markdown → JSON，自动生成带日期目录）
node scripts/data-transform.js <姓名>

# PDF 导出（单个患者）
node scripts/export-pdf.js <姓名>

# PDF 导出（所有患者）
node scripts/export-pdf.js

# 可视化报告（单个患者）
node scripts/visualize-report.js <姓名>

# 可视化报告（所有患者）
node scripts/visualize-report.js

# 目录迁移（旧格式 → 新格式）
node scripts/migrate-directories.js
```

## Skills 使用指南

所有技能通过 `/skill-name` 调用：

| Skill | 用途 |
|-------|------|
| `/nutrition-workflow` | 完整工作流：病历 → 健康档案 → 营养评估 → 配餐方案 → 运动处方 |
| `/nutrition-workflow resume` | 继续上次中断的流程 |
| `/parse-medical-record <文件>` | 解析病历为健康档案（支持 records/<客户>/ 目录或直接文件路径） |
| `/nutrition-assess <姓名>` | 基于健康档案生成营养评估 |
| `/meal-plan <姓名>` | 生成配餐方案 |
| `/exercise-plan <姓名>` | 生成运动处方 |
| `/data-transform <姓名>` | Markdown → JSON 转换 |
| `/export-pdf <姓名>` | 导出 PDF 报告 |
| `/visualize-report <姓名>` | Markdown → 可视化 HTML 报告 |

### Workflow 流程

**方式一：从 records 目录读取（推荐）**

```
客户档案存入 records/<客户姓名>/
  ↓
/parse-medical-record records/<客户姓名>/体检报告.pdf
  ↓
生成 results/<姓名>/健康档案.md → 用户确认
  ↓
/nutrition-assess <姓名> → 生成 results/<姓名>/营养评估.md
  ↓
/exercise-plan <姓名> → 生成 results/<姓名>/运动处方.md
  ↓
/meal-plan <姓名> → 生成 results/<姓名>/配餐方案_第1周.md
  ↓
/data-transform <姓名> → 生成 results/<姓名>_<日期>/
  ↓
/export-pdf <姓名> 或 /visualize-report <姓名>
```

**方式二：直接指定文件路径**

```
/parse-medical-report <文件路径>
  ↓
生成 results/<姓名>/健康档案.md
  ↓
...后续步骤相同
```

**目录结构说明**：

1. **工作目录** (`results/<姓名>/`)
   - 存放 Markdown 源文件（健康档案、营养评估等）
   - 由 `/nutrition-workflow` 生成和更新
   - 可随时修改，是主要的编辑位置

2. **版本化输出目录** (`results/<姓名>_<日期>/`)
   - 由 `/data-transform` 自动生成
   - 目录名包含日期，保证唯一性（如 `夏先生_2025-04-07`）
   - 包含所有输出文件：data.json、PDF、HTML
   - **只读**，不应直接修改

**工作流程**：
1. 在 `results/<姓名>/` 编辑 Markdown 文件
2. 运行 `data-transform <姓名>` 生成带日期的版本目录
3. 运行 `export-pdf` 或 `visualize-report` 生成最终报告
4. 如需修改，回到步骤1重新编辑，会生成新的日期版本

**脚本模糊匹配**：
- 输入"夏先生"会自动匹配最新的 `夏先生_<日期>` 目录
- 优先使用带日期的版本目录，其次使用工作目录

## Key Conventions

### Markdown 文件命名
- `健康档案.md` - 患者基本信息、检验指标、诊断、用药
- `营养评估.md` - 能量计算、营养素目标、饮食原则
- `配餐方案_第1周.md` - 配餐（支持多周：第2周、第3周等）
- `运动处方.md` - 运动建议和安全注意事项

### JSON Schema 约束
- `id`: UUID v4（由 data-transform 生成）
- `viewCode`: 18位随机字符串（小写字母+数字）
- `labGroups[].results[].status`: 枚举 `normal|high|low|very_high|very_low`
- `forbiddenFoods[].severity`: 枚举 `完全禁止|严格限制|适量控制`
- 数值字段必须为 number 类型，不可为 string

## Dependencies

- `marked` - Markdown 解析（PDF 导出使用）
- `playwright` - PDF 生成
