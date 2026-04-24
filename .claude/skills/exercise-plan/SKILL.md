---
name: exercise-plan
description: 基于健康档案和营养评估生成个性化运动处方
argument-hint: <健康档案路径> <营养评估路径>（留空则使用最新的）
disable-model-invocation: true
---

# 运动处方 Skill

基于健康档案和营养评估，检索公开运动指南，生成个性化运动处方。

## 输入

`$ARGUMENTS`：格式 `[健康档案路径] [营养评估路径]`，均可留空

## 处理步骤

### 步骤 1: 读取健康档案和营养评估

**健康档案** — 提取：基本信息、诊断疾病、异常指标、用药、生活方式
**营养评估** — 提取：能量目标、宏量营养素、体重管理目标、药物交互、注意事项

### 步骤 2: 读取参考数据

运行以下命令查看运动处方参考数据（禁忌、强度、频率、MET值、药物影响等）：
```bash
node -e "const d = require('./scripts/exercise-data'); console.log(JSON.stringify({contraindications: d.ABSOLUTE_CONTRAINDICATIONS.length + ' absolute, ' + d.RELATIVE_CONTRAINDICATIONS.length + ' relative', intensities: Object.keys(d.DISEASE_INTENSITY).join(', '), frequencies: Object.keys(d.DISEASE_FREQUENCY).join(', '), mets: Object.keys(d.MET_VALUES).join(', '), drugs: Object.keys(d.DRUG_EXERCISE_EFFECTS).join(', ')}))"
```

### 步骤 3: 检索公开运动指南参考（必须执行）

至少 **3 个 WebSearch**（疾病权威运动指南、运动禁忌与安全、多病叠加调整），保存到 `knowledge/references/参考_运动处方_[关键词]_YYYY-MM-DD.md` 并验证。

优先来源：ACSM指南、WHO身体活动建议、中华医学会运动医学分会

### 步骤 4: 运动安全性评估

#### 4.1 绝对禁忌筛查
检查数据模块中的 `ABSOLUTE_CONTRAINDICATIONS`：急性痛风发作、血糖极度异常、未控制重度高血压、CKD 5期未透析、不稳定心绞痛/近期心梗、急性感染发热。

#### 4.2 相对禁忌与限制
参考 `RELATIVE_CONTRAINDICATIONS` 中的疾病限制，关注运动类型和强度调整。

#### 4.3 药物影响评估
参考 `DRUG_EXERCISE_EFFECTS`：利尿剂（脱水/补水）、β受体阻滞剂（改用RPE评估强度）、降糖药（低血糖风险）、他汀类（肌痛）、抗凝药（避免碰撞）。

### 步骤 5: 运动处方设计

#### 5.1 运动类型
**有氧**: 快走/游泳/骑自行车/椭圆机（疾病优选见参考数据）
**抗阻**: 低中强度，8-12个动作，10-15次/组
**柔韧平衡**: 每次运动后拉伸10分钟，老年人增加平衡训练

#### 5.2 运动强度
最大心率 HRmax = 220 - 年龄。靶心率 = (HRR × 强度%) + 安静心率。
按疾病查 `DISEASE_INTENSITY` 获取 RPE 和心率范围，用脚本计算：
```bash
node -e "
const { calcMaxHR, calcHRR, calcTargetHRRange, lookupIntensity } = require('./scripts/exercise-data');
const maxHR = calcMaxHR(45);
const hrr = calcHRR(maxHR, 70);
const intensity = lookupIntensity('糖尿病');
const range = calcTargetHRRange(hrr, 70, intensity.hrMin, intensity.hrMax);
console.log('HRmax:', maxHR, 'Target HR:', range.min + '-' + range.max + ' bpm, RPE:', intensity.rpe);
"
```

#### 5.3 运动频率与时长
按疾病查 `DISEASE_FREQUENCY` 获取有氧/抗阻的频率和时长。久坐人群从 10-15分钟/次开始，每周递增5分钟。

#### 5.4 运动能量消耗
kcal = MET × 体重(kg) × 时间(h)。参考 `MET_VALUES` 数据。
按体重目标查 `WEEKLY_ENERGY_GOALS` 设定每周运动能耗目标。

#### 5.5 一周运动计划
设计7天计划（交替有氧/抗阻/休息），单次流程：热身5-10分 → 主体20-45分 → 整理放松5-10分

### 步骤 6: 运动与营养协同

- 餐后1-2小时运动最佳；糖尿病患者禁止空腹运动
- 运动后30-60分钟补充蛋白质+碳水
- 补水：运动前2h 400-600ml，运动中每15-20分 150-250ml，痛风患者补水量增加50%
- 计算运动与饮食的能量平衡

### 步骤 7: 生成运动处方报告

完整报告需包含以下部分：
1. **运动安全性评估** — 禁忌筛查、药物影响、安全等级（绿/黄/红）
2. **运动处方** — 目标、参数总览（类型/强度/频率/时长/靶心率/周能耗）、推荐运动项目（有氧/抗阻/柔韧/禁忌）
3. **一周运动计划** — 每日运动内容/强度/时长/预估能耗 + 周合计
4. **单次运动标准流程** — 热身/主体/整理
5. **运动与营养协同** — 时间安排、营养补充、补水计划、能量平衡
6. **注意事项与应急处理** — 一般注意、疾病特殊注意、不适处理、何时就医
7. **循序渐进计划** — 久坐人群的适应期→提升期→巩固期→维持期
8. **参考来源与免责声明**

### 步骤 8: 保存处方

保存到 `/tmp/<用户名>/运动处方.md`。运动能耗 >300 kcal/天时提示用户可能需要调整营养目标。

## 完成后操作

运动处方完成后不要执行 data-transform，等工作流所有阶段全部完成后再统一进行数据转换和清理。

## 注意事项

- 强度宁低勿高，特别是多病叠加患者
- 痛风强调低强度（高强度→乳酸堆积→升高尿酸）
- CKD患者运动后疲劳持续>24小时需降低强度
- 糖尿病患者运动时随身携带含糖食品
- 老年人必须包含平衡训练和防跌倒内容
- 永久链接内容必须包含免责声明
