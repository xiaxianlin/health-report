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
- `运动处方.md`（可选）

### 步骤 2.5: 解析运动处方（如存在）

如果 `运动处方.md` 存在，解析为 `exercisePrescription` 对象：

```
头部 blockquote → date: string（"生成日期: YYYY-MM-DD"）

section(安全性评估):
  ### 1.1 运动前医学评估 → 表格(3列): evaluations: [{item, status, safety}]
    注：如果表格列名为"当前状态"/"运动安全性"，则映射为 status/safety
    如果列名为"评估结果"/"风险等级"，则同样映射为 status/safety
  ### 1.2 运动禁忌症筛查 → 列表: contraindications: string[]
    注：每项应为字符串。如果是表格，提取第一列内容
  ### 1.3 安全性总评 → blockquote: conclusion: string

section(运动处方):
  ### 2.1 处方总则 → 表格(2列，key-value):
    运动类型 → prescription.type
    运动强度 → prescription.intensity
    运动频率 → prescription.frequency
    运动时长 → prescription.duration
    目标心率 → prescription.targetHR（提取为字符串）
    最大心率 → prescription.maxHR（从说明中提取数字）
    注：忽略"每周运动量"等非标准字段
  ### 2.2 有氧运动处方 → 表格(2列，key-value): aerobic: {exercises, intensity, frequency, duration, notes}
    推荐项目 → exercises, 强度 → intensity, 频率 → frequency, 时长 → duration, 注意/每周总量 → notes
  ### 2.3 抗阻训练处方 → 同上格式: resistance: {...}
  ### 2.4 柔韧性 → 同上格式: flexibility: {...}

section(一周运动计划) → 按 ### 子标题分阶段:
  phases: [{
    name: string（子标题中提取，如"适应期"）,
    weeks: string（如"第1-4周"，如缺失则根据 name 推断）,
    days: [{day, content, duration, intensity}],  // 表格4列，忽略 type 字段
    weeklyTotal: string（表格下方的总结行，如为"weeklySummary"则映射为 weeklyTotal）
  }]

section(单次运动流程) → 代码块中的编号步骤:
  sessionFlow: string[]（每个步骤一行，合并子步骤）

section(运动与营养协同):
  ### 5.1 运动时间与进餐安排 → 表格(3列): timing: [{period, time, note}]
    注：如果表格列名为"时间点/策略/目的"，则映射为 period/time/note
    标准字段：period（时段）, time（时间）, note（说明）
  ### 5.2 运动前后营养策略 → 表格(2列): strategies: [{scenario, strategy}]
    注：每行必须转换为 {scenario, strategy} 对象格式
    如果源数据是字符串列表，转换为对象列表
  ### 5.3 运动与降糖药物协同 → 表格(2列): drugInteractions: [{drug, note}]
    注：如该 section 不存在，设为空数组 []
  ### 5.4 运动与减重目标协同 → 列表合并为: energyBalance: string
    注：如无此 section，使用空字符串 ""

section(注意事项) → 按 ### 子标题分组:
  precautions: [{category: string, items: string[]}]
  每个子标题下的表格提取注意事项列的内容

section(循序渐进计划):
  ### 各阶段目标与评估节点 → 表格: progression: [{phase, time, exerciseGoal, healthGoal, assessment}]
  ### 停止运动并就医的情况 → 列表: stopConditions: string[]

section(参考来源) → 编号列表: references: string[]（去除链接，只保留标题和来源描述）
```

如 `运动处方.md` 不存在，`exercisePrescription` 设为 `null`。

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

### 步骤 3.5: 生成标识与查看码

为每个用户生成：

- `id`: 使用 Bash 工具执行 `python3 -c "import uuid; print(uuid.uuid4())"` 生成 UUID v4
- `viewCode`: 使用 Bash 工具执行 `python3 -c "import random, string; print(''.join(random.choices(string.ascii_lowercase + string.digits, k=18)))"` 生成 18 位随机字符串（小写字母+数字）

**如果 `results/<用户名>/data.json` 已存在（且包含 `id` 和 `viewCode`），则复用已有值，不要重新生成。**

向用户报告生成的查看码。

### 步骤 4: 组装输出 JSON

输出 JSON 严格遵循以下 TypeScript 结构（与 `web/src/lib/types.ts` 保持一致）:

```typescript
{
  // 标识与访问
  id: string,          // UUID v4
  viewCode: string,    // 18位随机字符串查看码

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
  }[],

  // 运动处方（可选，无文件时为 null）
  exercisePrescription: {
    date: string,
    safety: {
      evaluations: { item: string, status: string, safety: string }[],
      contraindications: string[],  // 字符串数组，不是对象数组
      conclusion: string
    },
    prescription: {
      type: string,
      intensity: string,
      frequency: string,
      duration: string,
      targetHR: string,
      maxHR: number
      // 注：无 weeklyVolume 字段
    },
    aerobic: { exercises: string, intensity: string, frequency: string, duration: string, notes: string },
    resistance: { exercises: string, intensity: string, frequency: string, duration: string, notes: string },
    flexibility: { exercises: string, intensity: string, frequency: string, duration: string, notes: string },
    phases: {
      name: string,
      weeks: string,  // 如"第1-4周"，必须存在
      days: {
        day: string,
        content: string,
        duration: string,
        intensity: string
        // 注：无 type 字段
      }[],
      weeklyTotal: string  // 注：不是 weeklySummary
    }[],
    sessionFlow: string[],
    nutritionSynergy: {
      timing: { period: string, time: string, note: string }[],
      strategies: { scenario: string, strategy: string }[],  // 必须是对象数组
      drugInteractions: { drug: string, note: string }[],  // 必须存在，可为空
      energyBalance: string
      // 注：无 nutritionComparison, snackSuggestions 字段
    },
    precautions: { category: string, items: string[] }[],
    stopConditions: string[],
    progression: { phase: string, time: string, exerciseGoal: string, healthGoal: string, assessment: string }[],
    references: string[]
  } | null
}
```

### 步骤 5: 保存和验证

1. 将 JSON 写入 `results/<用户名>/data.json`
2. 使用 Read 工具读取文件头部，确认存在且 JSON 合法
3. 对所有转换后的 JSON 做基本校验：
   - id 非空且为合法 UUID 格式
   - viewCode 为 18 位随机字符串
   - name 非空
   - labGroups 至少有 1 组
   - nutritionAssessment 的 macros 至少有 3 项（如有评估文件）
   - mealPlans 的每个 plan 的 days 至少有 1 天（如有配餐文件）
   - exercisePrescription 的 phases 至少有 1 个阶段（如有运动处方文件）
   - exercisePrescription.safety.evaluations 使用 status/safety 字段（非 result/riskLevel）
   - exercisePrescription.safety.contraindications 为字符串数组
   - exercisePrescription.phases 使用 weeklyTotal 字段（非 weeklySummary）
   - exercisePrescription.nutritionSynergy.strategies 为对象数组 {scenario, strategy}

## 输出

1. 每个用户目录下生成 `data.json` 文件（路径：`results/<用户名>/data.json`）
2. 向用户报告转换结果：每个用户的 name、查看码、labGroups 数、macros 数、mealPlans 数

## 数据一致性规范

为确保所有生成的 data.json 结构一致，必须遵循以下规则：

| 字段路径 | 类型 | 说明 |
|---------|------|------|
| `exercisePrescription.safety.evaluations[]` | `{item, status, safety}` | 使用 status/safety，**禁用** result/riskLevel |
| `exercisePrescription.safety.contraindications[]` | `string[]` | 字符串数组，**禁用** `{item, status}` 对象 |
| `exercisePrescription.prescription` | object | **无** weeklyVolume 字段 |
| `exercisePrescription.phases[].weeks` | string | 必须存在，如"第1-4周" |
| `exercisePrescription.phases[].weeklyTotal` | string | 使用 weeklyTotal，**禁用** weeklySummary |
| `exercisePrescription.phases[].days[]` | object | **无** type 字段 |
| `exercisePrescription.nutritionSynergy.timing[]` | `{period, time, note}` | 标准字段名 |
| `exercisePrescription.nutritionSynergy.strategies[]` | `{scenario, strategy}` | 对象数组，**禁用** 字符串数组 |
| `exercisePrescription.nutritionSynergy` | object | **无** nutritionComparison/snackSuggestions 字段 |

## 注意事项

- 这是纯数据转化步骤，不修改任何 Markdown 文件
- 如果 data.json 已存在，覆盖写入
- 数值字段必须为 number 类型，不可为 string
- status 枚举值只能是: normal, high, low, very_high, very_low
- severity 枚举值只能是: 完全禁止, 严格限制, 适量控制
- 如果某个文件不存在（如无营养评估），对应字段设为 null（nutritionAssessment）或空数组（mealPlans）
