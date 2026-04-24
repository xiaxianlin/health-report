# CLAUDE.md

个性化营养方案生成与管理系统。

## Architecture

```
病历/输入 → Markdown（/tmp/<患者>/） → JSON → 输出（PDF / 可视化 HTML）
```

Skills 生成 Markdown → `data-transform` 解析为 JSON → `export-pdf`/`visualize-report` 输出最终产物。

### 目录结构

```
.claude/skills/           # Claude Skills
  nutrition-workflow/     #   完整工作流入口
  collect-info/           #   对话式信息录入
  parse-medical-record/   #   病历解析 → 健康档案
  nutrition-assess/       #   营养评估
  meal-plan/              #   配餐生成
  exercise-plan/          #   运动处方
  data-transform/         #   Markdown → JSON
  export-pdf/             #   PDF 导出
  visualize-report/       #   可视化 HTML

knowledge/                # 知识库
  disease-diet-rules.md, food-nutrition-guide.md, meal-templates.md, nutrient-reference.md
  references/             # 检索保存的参考资料

results/<姓名>_<日期>/     # 版本化输出目录（自动生成，只读）：Markdown + data.json + PDF + HTML
/tmp/<姓名>/              # 工作目录（中间产物，流程完成后自动删除）
records/<客户姓名>/        # 客户档案输入（体检报告.pdf、病历.pdf、手动录入.md 等）
scripts/                  # Node.js 脚本
  parse-markdown.js, data-transform.js, validate-schema.js, export-pdf.js, visualize-report.js
  __tests__/ (5 files, 101 tests)
```

### data.json 关键结构

```
name, gender, age, height, weight, bmi, bloodPressure, diagnoses, medications, labGroups
nutritionAssessment { bmr, tdee, targetEnergy, macros[], mealDistribution[], recommendedFoods[], forbiddenFoods[] }
mealPlans[{ weekNumber, days[{ day, meals[{ type, items }] }] }]
exercisePrescription{ safety, prescription, phases, aerobic, resistance, flexibility }
```

## Commands

| 用途 | 命令 |
|------|------|
| 测试 | `npm test` |
| 数据转换 | `node scripts/data-transform.js <姓名>` |
| PDF 导出 | `node scripts/export-pdf.js [姓名]` |
| 可视化报告 | `node scripts/visualize-report.js [姓名]` |

## Skills

所有技能通过 `/skill-name` 调用：

| Skill | 用途 |
|-------|------|
| `/nutrition-workflow` | 完整工作流 |
| `/collect-info` | 对话录入（无文件时使用）|
| `/parse-medical-record <文件>` | 病历解析 |
| `/nutrition-assess <姓名>` | 营养评估 |
| `/meal-plan <天数> [周数]` | 配餐生成 |
| `/exercise-plan <姓名>` | 运动处方 |
| `/data-transform <姓名>` | Markdown → JSON |
| `/export-pdf <姓名>` | PDF 导出 |
| `/visualize-report <姓名>` | 可视化报告 |

### 工作流

所有方式走通后的统一收尾：
```
cp /tmp/<姓名>/*.md results/<姓名>/ && node scripts/data-transform.js <姓名>
rm -rf /tmp/<姓名>/ results/<姓名>/  # 清理中间产物
```

**方式一：records 目录读取**
```
/parse-medical-record records/<客户姓名>/体检报告.pdf
```
**方式二：直接指定文件**
```
/parse-medical-record <文件路径>
```
**方式三：对话录入**
```
/collect-info  → 逐一提问收集信息
```

三种方式最终都生成 `/tmp/<姓名>/健康档案.md`，然后依次：`/nutrition-assess` → `/exercise-plan` → `/meal-plan` → 收尾步骤。

## Key Conventions

### Markdown 命名
`健康档案.md` | `营养评估.md` | `配餐方案_第N周.md` | `运动处方.md`

### JSON Schema 约束
- `id`: UUID v4, `viewCode`: 18位随机小写字母+数字
- `labGroups[].results[].status`: `normal|high|low|very_high|very_low`
- `forbiddenFoods[].severity`: `完全禁止|严格限制|适量控制`
- 数值字段必须为 number

### 脚本模糊匹配
- 输入"夏先生"自动匹配最新的 `夏先生_<日期>` 目录

## Dependencies

`marked` (Markdown → HTML), `playwright` (PDF 生成)
