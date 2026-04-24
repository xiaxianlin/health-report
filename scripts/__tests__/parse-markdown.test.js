const fs = require('fs');
const path = require('path');
const {
  parseHealthRecord,
  parseNutritionAssessment,
  parseMealPlan,
  parseExercisePrescription,
  parseTable,
  extractSection
} = require('../parse-markdown');

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

// ─── Helpers ────────────────────────────────────────────────

describe('parseTable()', () => {
  it('parses a simple markdown table', () => {
    const input = `| 食物 | 份量 |
|------|------|
| 燕麦 | 50g |
| 牛奶 | 250ml |`;
    const result = parseTable(input);
    expect(result).toEqual([
      ['燕麦', '50g'],
      ['牛奶', '250ml']
    ]);
  });

  it('returns empty array for non-table content', () => {
    expect(parseTable('')).toEqual([]);
    expect(parseTable('some text')).toEqual([]);
    expect(parseTable('| not enough')).toEqual([]);
  });

  it('strips bold markers from cells', () => {
    const input = `| 营养素 | 目标值 |
|--------|--------|
| **总能量** | **1620 kcal** |`;
    const result = parseTable(input);
    expect(result[0][0]).toBe('总能量');
    expect(result[0][1]).toBe('1620 kcal');
  });
});

describe('extractSection()', () => {
  const content = `## 诊断\n1. 脂肪肝\n\n## 用药\n无\n\n## 其他\n### 子标题\n内容`;

  it('extracts sections by heading', () => {
    const section = extractSection(content, '## 诊断');
    expect(section).toBe('1. 脂肪肝');
  });

  it('stops at next heading of same level', () => {
    const section = extractSection(content, '## 用药');
    expect(section).toBe('无');
  });

  it('returns empty string for missing heading', () => {
    expect(extractSection(content, '## 不存在')).toBe('');
  });
});

// ─── parseHealthRecord ──────────────────────────────────────

describe('parseHealthRecord()', () => {
  it('parses basic info from real health record fixture', () => {
    const content = loadFixture('健康档案.md');
    const result = parseHealthRecord(content);

    expect(result.name).toBe('夏先生');
    expect(result.gender).toBe('男');
    expect(result.height).toBe(170.5);
    expect(result.weight).toBe(87.1);
    expect(result.bmi).toBe(30.0);
    expect(result.bmiCategory).toContain('肥胖');
    expect(result.bloodPressure).toContain('97/58');
    expect(result.date).toBe('2025-04-07');
  });

  it('parses lab groups with status indicators', () => {
    const content = loadFixture('健康档案.md');
    const result = parseHealthRecord(content);

    expect(result.labGroups.length).toBeGreaterThanOrEqual(1);
    const bloodGroup = result.labGroups[0];
    expect(bloodGroup.title).toBe('血液检查');

    const cholesterol = bloodGroup.results.find(r => r.indicator.includes('总胆固醇'));
    expect(cholesterol).toBeDefined();
    expect(cholesterol.value).toBe('5.71');
    expect(cholesterol.status).toBe('high');

    const ast = bloodGroup.results.find(r => r.indicator.includes('AST'));
    expect(ast).toBeDefined();
    expect(ast.status).toBe('high');

    const glucose = bloodGroup.results.find(r => r.indicator.includes('空腹血糖'));
    expect(glucose).toBeDefined();
    expect(glucose.status).toBe('normal');
  });

  it('parses diagnoses list', () => {
    const content = loadFixture('健康档案.md');
    const result = parseHealthRecord(content);

    expect(result.diagnoses.length).toBeGreaterThanOrEqual(5);
    expect(result.diagnoses[0]).toContain('脂肪肝');
    expect(result.diagnoses[1]).toContain('肥胖');
    expect(result.diagnoses[2]).toContain('总胆固醇增高');
  });

  it('handles empty/edge content gracefully', () => {
    const result = parseHealthRecord('');
    expect(result.name).toBe('');
    expect(result.labGroups).toEqual([]);
    expect(result.diagnoses).toEqual([]);
  });

  it('extracts date from both formats', () => {
    const r1 = parseHealthRecord('> 生成日期: 2025-04-07\n姓名: 张三');
    expect(r1.date).toBe('2025-04-07');

    const r2 = parseHealthRecord('## 基本信息\n建档日期: 2025-03-15\n姓名: 张三');
    expect(r2.date).toBe('2025-03-15');
  });
});

// ─── parseNutritionAssessment ───────────────────────────────

describe('parseNutritionAssessment()', () => {
  it('parses energy values from real nutrition assessment fixture', () => {
    const content = loadFixture('营养评估.md');
    const result = parseNutritionAssessment(content);

    expect(result).not.toBeNull();
    expect(result.bmr).toBe(1767);
    expect(result.tdee).toBe(2120);
    expect(result.targetEnergy).toBe(1620);
    expect(result.activityLevel).toBe('久坐');
  });

  it('parses macros from real fixture', () => {
    const content = loadFixture('营养评估.md');
    const result = parseNutritionAssessment(content);

    expect(result.macros.length).toBeGreaterThanOrEqual(5);
    const protein = result.macros.find(m => m.name.includes('蛋白质'));
    expect(protein).toBeDefined();
    expect(protein.target).toBe(90);
    expect(protein.percent).toBe(22);

    const energy = result.macros.find(m => m.name.includes('总能量'));
    expect(energy).toBeDefined();
    expect(energy.target).toBe(1620);
  });

  it('parses micro targets', () => {
    const content = loadFixture('营养评估.md');
    const result = parseNutritionAssessment(content);

    expect(result.microTargets.length).toBeGreaterThanOrEqual(5);
    const sodium = result.microTargets.find(m => m.name.includes('钠'));
    expect(sodium).toBeDefined();
    expect(sodium.reason).toContain('心血管');
  });

  it('parses meal distribution', () => {
    const content = loadFixture('营养评估.md');
    const result = parseNutritionAssessment(content);

    expect(result.mealDistribution.length).toBeGreaterThanOrEqual(3);
    const lunch = result.mealDistribution.find(m => m.meal.includes('午餐'));
    expect(lunch).toBeDefined();
    expect(lunch.energy).toBe(650);
    expect(lunch.percent).toBe(40);
  });

  it('parses principles, recommended foods, and forbidden foods', () => {
    const content = loadFixture('营养评估.md');
    const result = parseNutritionAssessment(content);

    expect(result.principles.length).toBeGreaterThan(0);
    expect(result.principles.some(p => p.includes('减重'))).toBe(true);

    expect(result.recommendedFoods.length).toBeGreaterThan(0);
    const staple = result.recommendedFoods.find(c => c.category.includes('主食'));
    expect(staple).toBeDefined();
    expect(staple.items.length).toBeGreaterThan(0);

    expect(result.forbiddenFoods.length).toBeGreaterThan(0);
    const alcohol = result.forbiddenFoods.find(f => f.food.includes('酒精'));
    expect(alcohol).toBeDefined();
    expect(alcohol.severity).toBe('完全禁止');
  });

  it('parses key notes', () => {
    const content = loadFixture('营养评估.md');
    const result = parseNutritionAssessment(content);

    expect(result.keyNotes.length).toBeGreaterThanOrEqual(4);
    expect(result.keyNotes[0]).toContain('戒酒');
  });

  it('returns null for null/empty input', () => {
    expect(parseNutritionAssessment(null)).toBeNull();
    expect(parseNutritionAssessment('')).toBeNull();
  });
});

// ─── parseMealPlan ──────────────────────────────────────────

describe('parseMealPlan()', () => {
  it('parses week metadata from real meal plan fixture', () => {
    const content = loadFixture('配餐方案_第1周.md');
    const result = parseMealPlan(content);

    expect(result).not.toBeNull();
    expect(result.weekNumber).toBe(1);
    expect(result.targetEnergy).toBe(1620);
  });

  it('parses 7 days with 3 meals each', () => {
    const content = loadFixture('配餐方案_第1周.md');
    const result = parseMealPlan(content);

    expect(result.days.length).toBe(7);
    expect(result.days[0].day).toBe('周一');
    expect(result.days[6].day).toBe('周日');
  });

  it('parses meal items with food, amount, and method', () => {
    const content = loadFixture('配餐方案_第1周.md');
    const result = parseMealPlan(content);

    const monday = result.days[0];
    expect(monday.meals.length).toBe(3);

    const breakfast = monday.meals.find(m => m.type === '早餐');
    expect(breakfast).toBeDefined();
    expect(breakfast.items.length).toBeGreaterThan(0);
    expect(breakfast.items[0].food).toBeTruthy();
    expect(breakfast.items[0].amount).toBeTruthy();
  });

  it('parses weekly summary table', () => {
    const content = loadFixture('配餐方案_第1周.md');
    const result = parseMealPlan(content);

    expect(result.weeklySummary.length).toBeGreaterThanOrEqual(7);
    const mondaySummary = result.weeklySummary.find(s => s.day.includes('周一'));
    expect(mondaySummary).toBeDefined();
    expect(mondaySummary.energy).toBe(1620);
  });

  it('parses shopping list', () => {
    const content = loadFixture('配餐方案_第1周.md');
    const result = parseMealPlan(content);

    expect(result.shoppingList.length).toBeGreaterThan(0);
    const protein = result.shoppingList.find(c => c.category.includes('蛋白质'));
    expect(protein).toBeDefined();
    expect(protein.items.length).toBeGreaterThan(0);
  });

  it('returns null for null/empty input', () => {
    expect(parseMealPlan(null)).toBeNull();
    expect(parseMealPlan('')).toBeNull();
  });
});

// ─── parseExercisePrescription ──────────────────────────────

describe('parseExercisePrescription()', () => {
  it('parses date from real exercise prescription fixture', () => {
    const content = loadFixture('运动处方.md');
    const result = parseExercisePrescription(content);

    expect(result).not.toBeNull();
    expect(result.date).toBe('2025-04-07');
  });

  it('parses safety evaluation', () => {
    const content = loadFixture('运动处方.md');
    const result = parseExercisePrescription(content);

    expect(result.safety.evaluations.length).toBeGreaterThanOrEqual(5);
    const bp = result.safety.evaluations.find(e => e.item.includes('血压'));
    expect(bp).toBeDefined();
    expect(bp.status).toContain('舒张压偏低');
    expect(bp.safety).toContain('可运动');

    expect(result.safety.contraindications.length).toBeGreaterThan(0);
    expect(result.safety.contraindications.some(c => c.includes('舒张压'))).toBe(true);
  });

  it('parses prescription params', () => {
    const content = loadFixture('运动处方.md');
    const result = parseExercisePrescription(content);

    expect(result.prescription.type).toContain('快走');
    expect(result.prescription.frequency).toContain('5-7次/周');
    expect(result.prescription.duration).toContain('40-50分钟');
    expect(result.prescription.maxHR).toBe(185);
  });

  it('parses aerobic, resistance, and flexibility plans', () => {
    const content = loadFixture('运动处方.md');
    const result = parseExercisePrescription(content);

    expect(result.aerobic.exercises).toContain('快走');
    expect(result.resistance.exercises).toContain('俯卧撑');
    expect(result.flexibility.exercises).toContain('拉伸');
  });

  it('parses phases (weekly plan)', () => {
    const content = loadFixture('运动处方.md');
    const result = parseExercisePrescription(content);

    expect(result.phases.length).toBeGreaterThanOrEqual(3);
    expect(result.phases[0].name).toContain('适应期');
    expect(result.phases[0].days.length).toBe(7);
  });

  it('parses session flow and nutrition synergy', () => {
    const content = loadFixture('运动处方.md');
    const result = parseExercisePrescription(content);

    expect(result.sessionFlow.length).toBeGreaterThan(0);
    expect(result.nutritionSynergy.timing.length).toBeGreaterThan(0);
    expect(result.nutritionSynergy.strategies.length).toBeGreaterThan(0);
  });

  it('returns null for null/empty input', () => {
    expect(parseExercisePrescription(null)).toBeNull();
    expect(parseExercisePrescription('')).toBeNull();
  });
});
