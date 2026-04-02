---
name: data-transform
description: 将 Markdown 健康档案、营养评估、配餐方案解析为结构化 JSON，供 Web 应用直接消费。
argument-hint: <用户名>（留空则转换 results/ 下所有用户）
disable-model-invocation: true
---

# 数据转化 Skill

将 `results/<用户名>/` 下的 Markdown 文件解析为结构化 JSON，输出到同目录下。

## 输入

- `$ARGUMENTS`: 用户名（对应 `results/` 下的子目录名）
- 留空则遍历所有用户

## 处理步骤

### 步骤 1: 定位用户目录

- 如果指定了用户名，定位 `results/<用户名>/`
- 如果留空，遍历 `results/` 下所有子目录

### 步骤 2: 读取 Markdown 文件

每个用户目录可能包含：
- `健康档案.md`（必须存在）
- `营养评估.md`（可选）
- `配餐方案_第N周.md`（可选，可多份）

### 步骤 3: 解析为结构化数据

严格按以下 Schema 解析，输出 JSON 文件 `data.json` 到同一用户目录。

#### 解析规则

**section() 函数**: 通过 `## heading` 精确匹配章节，截取到下一个 `##` 或文件结尾。

**fieldValue() 函数**: 从 `- 字段: 值` 格式中提取值，支持 `**bold**` 和 `（注释）`。

**parseTable() 函数**: 解析 Markdown 表格为二维数组，跳过分隔行，去除 `**`。

#### 健康档案解析

```
section(基本信息) → 逐行匹配:
  - 姓名 → name: string
  - 性别 → gender: string
  - 年龄 → age: number
  - 身高 → height: number
  - 体重 → weight: number
  - BMI → bmi: number, bmiCategory: string（从括号中提取）
  - 血压 → bloodPressure: string（格式: 收缩压/舒张压）
  - 过敏 → allergies: string[]

section(检验指标) → 按 ### 子标题分组:
  labGroups: [{title: string, results: [{indicator, value, unit, reference, status}]}]
  status 自动判定: ↑↑→very_high, ↑→high, ↓→low, ↓↓→very_low, 无标记→normal

section(诊断) → 编号列表:
  diagnoses: string[]

section(用药) → 表格（4列）:
  medications: [{name, dose, purpose, note}]

section(生活方式) → 列表:
  lifestyles: string[]

section(营养重点关注方向) → 编号列表:
  nutritionNotes: string[]
```

#### 营养评估解析

```
section(基础代谢计算):
  ### BMR → 代码块中最后一个 "= <num> kcal" (取 ≈ 前的值)
  ### 活动水平 → "当前活动水平: **<text>**"
  ### TDEE → 代码块中 "TDEE = ... = <num> kcal"
  ### 目标能量 → "目标能量: <num> kcal"

section(每日营养目标):
  ### 宏量营养素 → 表格(5列): [{name, target, unit, percent, range, source}]
  ### 微量营养素重点 → 表格(3列): [{name, target, reason}]
  ### 三餐能量分配 → 表格(6列): [{meal, energy, percent, protein, carbs, fat}]

section(饮食原则) → 列表: principles: string[]
section(推荐食物清单) → ### 子标题分组: [{category, items: [{name, ...}]}]
section(禁忌食物) → 表格(3列): [{food, reason, severity}]
section(药物-营养交互) → 表格(2列): [{drug, note}]
section(参考来源) → 编号列表: references: string[]
section(关键注意事项) → 编号列表: keyNotes: string[]
```

#### 配餐方案解析

```
元数据 blockquote:
  日期 → date: string
  适用周期 → weekNumber: number（"第N周"提取）
  每日目标 → targetEnergy/targetProtein/targetCarbs/targetFat: number

## 周一 ~ 周日 → dayPlans:
  每个 ## 周X 下:
    ### 早餐/午餐/晚餐 → meals: [{type, energy, items: [{food, amount, method, note}]}]
    **周X全天** → dailyTotal: string

## 一周营养总览 → 表格:
  weeklySummary: [{day, energy, protein, fat, carbs, extra?: Record<string,number>}]
  跳过含"日均"/"目标"/"达标"的行
  extra 列: 第5列及之后的列名→值

## 采购清单 → ### 子标题分组:
  shoppingList: [{category, items: string[]}]

## 参考来源 → 编号列表: references: string[]
```

### 步骤 4: 组装输出 JSON

输出 JSON 严格遵循以下 TypeScript 结构（与 `web/src/lib/types.ts` 保持一致）:

```typescript
{
  // 基本信息
  name: string,
  gender: string,
  age: number,
  height: number,
  weight: number,
  bmi: number,
  bmiCategory: string,
  bloodPressure: string,
  date: string,
  allergies: string[],
  diagnoses: string[],
  medications: { name: string, dose: string, purpose: string, note: string }[],
  labGroups: { title: string, results: { indicator: string, value: string, unit: string, reference: string, status: string }[] }[],
  lifestyles: string[],
  nutritionNotes: string[],

  // 营养评估（可选，无文件时为 null）
  nutritionAssessment: {
    bmr: number,
    tdee: number,
    targetEnergy: number,
    activityLevel: string,
    macros: { name: string, target: number, unit: string, percent: number, range: string, source: string }[],
    microTargets: { name: string, target: string, reason: string }[],
    mealDistribution: { meal: string, energy: number, percent: number, protein: number, carbs: number, fat: number }[],
    principles: string[],
    recommendedFoods: { category: string, items: { name: string, [key: string]: string }[] }[],
    forbiddenFoods: { food: string, reason: string, severity: string }[],
    drugInteractions: { drug: string, note: string }[],
    keyNotes: string[],
    references: string[]
  } | null,

  // 配餐方案（可选，可多周）
  mealPlans: {
    weekNumber: number,
    targetEnergy: number,
    targetProtein: number,
    targetCarbs: number,
    targetFat: number,
    days: {
      day: string,
      meals: { type: string, energy: string, items: { food: string, amount: string, method: string, note: string }[] }[],
      dailyTotal: string
    }[],
    weeklySummary: { day: string, energy: number, protein: number, fat: number, carbs: number, extra?: Record<string, number> }[],
    weeklyAnalysis: string[],
    shoppingList: { category: string, items: string[] }[],
    references: string[]
  }[]
}
```

### 步骤 5: 保存和验证

1. 将 JSON 写入 `web/data/<用户名>.json`
2. 使用 Read 工具读取文件头部，确认存在且 JSON 合法
3. 对所有转换后的 data.json 做基本校验：
   - name 非空
   - labGroups 至少有 1 组
   - nutritionAssessment 的 macros 至少有 3 项（如有评估文件）
   - mealPlans 的每个 plan 的 days 至少有 1 天（如有配餐文件）

## 输出

1. 每个用户目录下生成 `data.json`
2. 向用户报告转换结果：每个用户的 name、labGroups 数、macros 数、mealPlans 数

## 注意事项

- 这是纯数据转化步骤，不修改任何 Markdown 文件
- 如果 data.json 已存在，覆盖写入
- 数值字段必须为 number 类型，不可为 string
- status 枚举值只能是: normal, high, low, very_high, very_low
- severity 枚举值只能是: 完全禁止, 严格限制, 适量控制
- 如果某个文件不存在（如无营养评估），对应字段设为 null（nutritionAssessment）或空数组（mealPlans）
