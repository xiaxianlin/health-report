const fs = require('fs');
const path = require('path');
const { validateData } = require('../validate-schema');
const {
  uuidv4, generateViewCode,
  parseHealthRecord, parseNutritionAssessment,
  parseMealPlan, parseExercisePrescription
} = require('../parse-markdown');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

/**
 * Integration test: full pipeline Markdown → parsed data → assembled JSON → schema validation.
 * Tests the same logic as the CLI data-transform.js, but reads fixtures directly
 * instead of going through a subprocess (more reliable, faster).
 */
describe('data-transform pipeline integration', () => {
  let data;

  beforeAll(() => {
    // Step 1: Read all fixture Markdown files
    const healthMd = loadFixture('健康档案.md');
    const nutritionMd = loadFixture('营养评估.md');
    const exerciseMd = loadFixture('运动处方.md');
    const mealMd = loadFixture('配餐方案_第1周.md');

    // Step 2: Parse each one
    const healthData = parseHealthRecord(healthMd);
    const nutritionData = parseNutritionAssessment(nutritionMd);
    const exerciseData = parseExercisePrescription(exerciseMd);
    const mealData = parseMealPlan(mealMd);
    const mealPlans = [mealData];

    // Step 3: Assemble (same as data-transform.js lines 195-204)
    data = {
      id: uuidv4(),
      viewCode: generateViewCode(),
      ...healthData,
      nutritionAssessment: nutritionData,
      mealPlans,
      exercisePrescription: exerciseData
    };
  });

  it('produces valid data.json structure', () => {
    // Verify core fields
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.viewCode).toMatch(/^[a-z0-9]{18}$/);
    expect(data.name).toBe('夏先生');
    expect(data.height).toBe(170.5);
    expect(data.weight).toBe(87.1);
    expect(data.bmi).toBe(30);
    expect(data.bmiCategory).toContain('肥胖');
    expect(data.bloodPressure).toContain('97/58');
    expect(data.date).toBe('2025-04-07');
  });

  it('parses lab groups with correct status mapping', () => {
    expect(data.labGroups.length).toBeGreaterThanOrEqual(1);
    const blood = data.labGroups[0];
    expect(blood.title).toBe('血液检查');
    expect(blood.results.length).toBeGreaterThan(5);

    const tc = blood.results.find(r => r.indicator.includes('总胆固醇'));
    expect(tc.status).toBe('high');

    const ast = blood.results.find(r => r.indicator.includes('AST'));
    expect(ast.status).toBe('high');

    const glucose = blood.results.find(r => r.indicator.includes('空腹血糖'));
    expect(glucose.status).toBe('normal');
  });

  it('parses diagnoses', () => {
    expect(data.diagnoses.length).toBeGreaterThanOrEqual(5);
    expect(data.diagnoses[0]).toContain('脂肪肝');
  });

  it('parses nutrition assessment correctly', () => {
    const na = data.nutritionAssessment;
    expect(na).not.toBeNull();
    expect(na.bmr).toBe(1767);
    expect(na.tdee).toBe(2120);
    expect(na.targetEnergy).toBe(1620);
    expect(na.activityLevel).toBe('久坐');

    // Macros
    expect(na.macros.length).toBeGreaterThanOrEqual(5);
    const protein = na.macros.find(m => m.name.includes('蛋白质'));
    expect(protein.target).toBe(90);
    expect(protein.percent).toBe(22);

    // Meal distribution
    expect(na.mealDistribution.length).toBeGreaterThanOrEqual(3);
    const lunch = na.mealDistribution.find(m => m.meal.includes('午餐'));
    expect(lunch.energy).toBe(650);

    // Forbidden foods
    const alcohol = na.forbiddenFoods.find(f => f.food.includes('酒精'));
    expect(alcohol.severity).toBe('完全禁止');
  });

  it('parses meal plan with 7 days', () => {
    expect(data.mealPlans.length).toBe(1);
    const mp = data.mealPlans[0];
    expect(mp.weekNumber).toBe(1);
    expect(mp.targetEnergy).toBe(1620);
    expect(mp.days.length).toBe(7);
    expect(mp.days[0].day).toBe('周一');

    // Each day has 3 meals
    const monday = mp.days[0];
    expect(monday.meals.length).toBe(3);
    expect(monday.meals[0].type).toBe('早餐');
    expect(monday.meals[0].items.length).toBeGreaterThan(0);

    // Weekly summary
    expect(mp.weeklySummary.length).toBeGreaterThanOrEqual(7);
    const monSum = mp.weeklySummary.find(s => s.day.includes('周一'));
    expect(monSum.energy).toBe(1620);

    // Shopping list
    expect(mp.shoppingList.length).toBeGreaterThan(0);
    const proteinCat = mp.shoppingList.find(c => c.category.includes('蛋白质'));
    expect(proteinCat.items.length).toBeGreaterThan(0);
  });

  it('parses exercise prescription', () => {
    const ep = data.exercisePrescription;
    expect(ep).not.toBeNull();
    expect(ep.date).toBe('2025-04-07');

    // Safety evaluation
    expect(ep.safety.evaluations.length).toBeGreaterThanOrEqual(5);
    const bp = ep.safety.evaluations.find(e => e.item.includes('血压'));
    expect(bp.safety).toContain('可运动');

    expect(ep.safety.contraindications.length).toBeGreaterThan(0);

    // Prescription
    expect(ep.prescription.type).toContain('快走');
    expect(ep.prescription.maxHR).toBe(185);

    // Phases (weekly plan)
    expect(ep.phases.length).toBeGreaterThanOrEqual(3);
    expect(ep.phases[0].days.length).toBe(7);

    // Session flow
    expect(ep.sessionFlow.length).toBeGreaterThan(0);

    // Nutrition synergy
    expect(ep.nutritionSynergy.timing.length).toBeGreaterThan(0);
    expect(ep.nutritionSynergy.strategies.length).toBeGreaterThan(0);
  });

  it('passes schema validation', () => {
    const validation = validateData(data);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});

describe('data-transform id/viewCode reuse', () => {
  it('generates valid UUID and viewCode', () => {
    const id = uuidv4();
    const code = generateViewCode();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(code).toMatch(/^[a-z0-9]{18}$/);
    expect(uuidv4()).not.toBe(uuidv4()); // IDs are unique
  });
});

describe('data-transform partial data handling', () => {
  it('handles health-record-only case', () => {
    const healthMd = loadFixture('健康档案.md');
    const healthData = parseHealthRecord(healthMd);

    const data = {
      id: uuidv4(),
      viewCode: generateViewCode(),
      ...healthData,
      nutritionAssessment: null,
      mealPlans: [],
      exercisePrescription: null
    };

    expect(data.name).toBe('夏先生');
    expect(data.nutritionAssessment).toBeNull();
    expect(data.mealPlans).toEqual([]);
    expect(data.exercisePrescription).toBeNull();
    expect(data.labGroups.length).toBeGreaterThan(0);
  });
});
