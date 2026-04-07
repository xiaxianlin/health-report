---
name: visualize-report
description: 将 data.json 营养方案数据转换为可视化 HTML 网页，风格与 Web 详情页一致
argument-hint: <患者姓名>（留空则处理 results/ 下所有患者）
disable-model-invocation: true
---

# 可视化报告 Skill

将 `results/<患者姓名>/data.json` 转换为可视化 HTML 网页，采用与 Web 详情页一致的卡片式设计风格。

## 输入

- `$ARGUMENTS`: 患者姓名（对应 `results/` 下的子目录名）
- 留空则遍历所有患者

## 输出

- `results/<患者姓名>/可视化报告.html` - 可视化 HTML 报告

## 数据结构

脚本读取 `data.json`，其结构如下：

```typescript
{
  // 基本信息
  name: string
  gender: string
  age: number
  height: number
  weight: number
  bmi: number
  bmiCategory: string
  bloodPressure: string
  date: string
  allergies: string[]
  diagnoses: string[]
  medications: { name, dose, purpose, note }[]
  labGroups: { title, results: { indicator, value, unit, reference, status }[] }[]
  lifestyles: string[]
  nutritionNotes: string[]

  // 营养评估
  nutritionAssessment: {
    bmr: number
    tdee: number
    targetEnergy: number
    activityLevel: string
    macros: { name, target, unit, percent, range, source }[]
    microTargets: { name, target, reason }[]
    mealDistribution: { meal, energy, percent, protein, carbs, fat }[]
    principles: string[]
    recommendedFoods: { category, items: { name }[] }[]
    forbiddenFoods: { food, reason, severity }[]
    drugInteractions: { drug, note }[]
    keyNotes: string[]
  }

  // 配餐方案
  mealPlans: [{
    weekNumber: number
    targetEnergy: number
    targetProtein: number
    targetCarbs: number
    targetFat: number
    days: [{
      day: string  // 周一-周日
      meals: [{
        type: string  // 早餐/午餐/晚餐/加餐
        energy: string
        items: { food, amount, method, note }[]
      }]
      dailyTotal: string
    }]
  }]

  // 运动处方
  exercisePrescription: {
    date: string
    safety: {
      evaluations: { item, status, safety }[]
      contraindications: string[]
      conclusion: string
    }
    prescription: { type, intensity, frequency, duration, targetHR, maxHR }
    aerobic: { exercises, intensity, frequency, duration, notes }
    resistance: { exercises, intensity, frequency, duration, notes }
    flexibility: { exercises, intensity, frequency, duration, notes }
    phases: [{
      name: string  // 适应期/进阶期/巩固期
      weeks: string
      days: { day, content, duration, intensity }[]
      weeklyTotal: string
    }]
  }
}
```

## 生成脚本

脚本位置: `scripts/visualize-report.js`

## 使用方法

### 命令行

```bash
# 单个患者
node scripts/visualize-report.js 张先生

# 所有患者
node scripts/visualize-report.js
```

### Skill 调用

```bash
/visualize-report 张先生
```

或处理所有患者：

```bash
/visualize-report
```

## 输出示例

```
✅ 张先生 - 可视化报告.html
输出路径: results/张先生/可视化报告.html
```

## 页面结构

### 1. 健康档案 Tab

- 基本信息卡片（姓名、性别、年龄、身高、体重、BMI、血压）
- 诊断标签
- 检验指标表格（按分组显示，带状态颜色）
- 用药信息表格

### 2. 营养评估 Tab

- 能量计算（BMR/TDEE/目标能量）
- 宏量营养素饼图 + 表格
- 餐次能量分配进度条 + 表格
- 推荐食物（分类标签）
- 禁忌食物表格（带严重程度标识）
- 药物-营养交互表格

### 3. 配餐方案 Tab

- 每日食谱（7天展开显示）
  - 每餐用颜色标识（早餐/午餐/晚餐）
  - 食物、用量、做法、备注
  - 每日营养合计

### 4. 运动建议 Tab

- 安全性评估表格
- 运动处方概览
- 有氧/抗阻/柔韧三栏卡片
- 分阶段运动计划（适应期/进阶期/巩固期）

## 样式特性

- **响应式布局**: 移动端适配
- **交互式 Tabs**: 点击切换不同模块
- **颜色编码**:
  - 正常值: 绿色
  - 偏高/偏低: 黄色
  - 严重异常: 红色
  - 餐次颜色: 早餐(橙)/午餐(蓝)/晚餐(浅蓝)
- **打印友好**: 打印时显示所有内容

## 注意事项

1. HTML 文件可直接在浏览器中打开查看
2. 纯 CSS + 原生 JavaScript，无需构建工具
3. 样式与 Web 详情页保持一致
4. 依赖 data.json 文件，如不存在需先运行 `/data-transform`
