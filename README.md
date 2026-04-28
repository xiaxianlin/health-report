# 个性化营养方案生成与管理系统

基于病历/体检报告的个性化营养评估、配餐与运动方案生成系统。输入病历或体检报告，自动产出营养评估报告、配餐方案、运动处方及可视化 HTML/PDF。

## 工作流

```
病历/输入 → Markdown → JSON → 输出（PDF / 可视化 HTML）
```

三种录入方式，均生成统一中间产物，再依次进行营养评估、运动处方、配餐生成：

1. **病历解析**：`/parse-medical-record <文件路径>` 解析体检报告 PDF
2. **对话录入**：`/collect-info` 逐一提问收集信息
3. **records 目录读取**：放入 `records/<客户姓名>/` 目录自动读取

最终收尾：

```bash
cp /tmp/<姓名>/*.md results/<姓名>/ && node scripts/data-transform.js <姓名>
rm -rf /tmp/<姓名>/ results/<姓名>/
```

## 目录结构

```
.claude/skills/           # Claude Skills（9 个技能）
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
  disease-diet-rules.md   #   疾病饮食规则
  food-nutrition-guide.md #   食物营养指南
  meal-templates.md       #   配餐模板
  nutrient-reference.md   #   营养素参考
  references/             #   参考资料

docs/                     # 文档
scripts/                  # Node.js 脚本
  data-transform.js       # Markdown → JSON 转换
  calculate-nutrition.js  # 营养计算
  parse-markdown.js       # Markdown 解析
  validate-schema.js      # Schema 校验
  export-pdf.js           # PDF 导出
  visualize-report.js     # 可视化 HTML 生成
  exercise-data.js        # 运动数据
  migrate-directories.js  # 目录迁移
  __tests__/              # 测试（101 个测试用例）

results/<姓名>_<日期>/     # 版本化输出目录
records/<客户姓名>/        # 客户档案输入目录
```

## 快速开始

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 数据转换：Markdown → JSON
npm run transform <姓名>

# 导出 PDF
npm run export-pdf <姓名>

# 生成可视化报告
npm run report <姓名>

# Schema 校验
npm run validate <姓名>
```

> 姓名支持模糊匹配，如输入"夏先生"自动匹配最新的 `夏先生_<日期>` 目录。

## Skills

所有技能通过 `/skill-name` 调用：

| Skill | 用途 |
|-------|------|
| `/nutrition-workflow` | 完整工作流入口 |
| `/collect-info` | 对话式信息录入 |
| `/parse-medical-record <文件>` | 病历解析 |
| `/nutrition-assess <姓名>` | 营养评估 |
| `/meal-plan <天数> [周数]` | 配餐生成 |
| `/exercise-plan <姓名>` | 运动处方 |
| `/data-transform <姓名>` | Markdown → JSON |
| `/export-pdf <姓名>` | PDF 导出 |
| `/visualize-report <姓名>` | 可视化报告 |

## 技术栈

- **运行环境**: Node.js
- **Markdown 解析**: marked
- **PDF 生成**: Playwright
- **测试框架**: Vitest

## 数据模型

`data.json` 核心结构：

```
name, gender, age, height, weight, bmi, bloodPressure
diagnoses[], medications[], labGroups[]
nutritionAssessment { bmr, tdee, targetEnergy, macros[], mealDistribution[],
  recommendedFoods[], forbiddenFoods[] }
mealPlans[{ weekNumber, days[{ day, meals[{ type, items }] }] }]
exercisePrescription { safety, prescription, phases, aerobic, resistance, flexibility }
```
