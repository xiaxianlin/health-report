const {
  calcBMR, calcTDEE, calcTargetEnergy,
  calcMacroGrams, calcMealDistribution,
  validateMacroPcts, validateMealTotals, checkEnergyConsistency,
  ACTIVITY_COEFFICIENTS, WEIGHT_GOAL_DEFICITS
} = require('../calculate-nutrition');

describe('calcBMR', () => {
  it('calculates male BMR using Mifflin-St Jeor', () => {
    // 男, 87.1kg, 170.5cm, 45岁
    // 10*87.1 + 6.25*170.5 - 5*45 + 5 = 871 + 1065.625 - 225 + 5 = 1716.625
    expect(calcBMR('男', 87.1, 170.5, 45)).toBe(1717);
  });

  it('calculates female BMR using Mifflin-St Jeor', () => {
    // 女, 60kg, 165cm, 30岁
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    expect(calcBMR('女', 60, 165, 30)).toBe(1320);
  });

  it('rounds the result', () => {
    // 10*70 + 6.25*175 - 5*40 + 5 = 700 + 1093.75 - 200 + 5 = 1598.75
    expect(calcBMR('男', 70, 175, 40)).toBe(1599);
  });
});

describe('calcTDEE', () => {
  it('multiplies BMR by correct activity coefficient', () => {
    expect(calcTDEE(1717, '久坐')).toBe(2060);
    expect(calcTDEE(1717, '轻度活动')).toBe(2361);
    expect(calcTDEE(1717, '中度活动')).toBe(2661);
    expect(calcTDEE(1717, '高度活动')).toBe(2962);
  });

  it('returns null for unknown activity level', () => {
    expect(calcTDEE(1717, '未知')).toBeNull();
  });
});

describe('calcTargetEnergy', () => {
  it('applies deficit for 减重', () => {
    expect(calcTargetEnergy(2120, '减重')).toBe(1720);
  });

  it('returns TDEE for 维持', () => {
    expect(calcTargetEnergy(2120, '维持')).toBe(2120);
  });

  it('applies surplus for 增重', () => {
    expect(calcTargetEnergy(2120, '增重')).toBe(2370);
  });

  it('returns TDEE for unknown goal', () => {
    expect(calcTargetEnergy(2120, '未知')).toBe(2120);
  });
});

describe('calcMacroGrams', () => {
  it('converts energy + pcts to grams', () => {
    // 1620 kcal, 22% protein, 53% carbs, 25% fat
    const result = calcMacroGrams(1620, 22, 53, 25);
    expect(result.protein).toBe(89);   // 1620*0.22/4 = 89.1
    expect(result.carbs).toBe(215);     // 1620*0.53/4 = 214.65
    expect(result.fat).toBe(45);        // 1620*0.25/9 = 45
    expect(result.fiber).toBe(23);      // 1620/1000*14 = 22.68
  });

  it('returns zero for zero energy', () => {
    const result = calcMacroGrams(0, 22, 53, 25);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.fiber).toBe(0);
  });
});

describe('calcMealDistribution', () => {
  it('distributes energy across meals', () => {
    const meals = [
      { name: '早餐', pct: 30 },
      { name: '午餐', pct: 40 },
      { name: '晚餐', pct: 30 }
    ];
    const result = calcMealDistribution(1620, meals);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ meal: '早餐', energy: 486, percent: 30 });
    expect(result[1]).toEqual({ meal: '午餐', energy: 648, percent: 40 });
    expect(result[2]).toEqual({ meal: '晚餐', energy: 486, percent: 30 });
  });
});

describe('validateMacroPcts', () => {
  it('accepts percentages summing to 100', () => {
    expect(validateMacroPcts(22, 53, 25).valid).toBe(true);
  });

  it('rejects percentages far from 100', () => {
    expect(validateMacroPcts(10, 10, 10).valid).toBe(false);
  });
});

describe('validateMealTotals', () => {
  const target = { protein: 90, carbs: 215, fat: 45, fiber: 23 };

  it('passes when within tolerance', () => {
    const actual = { protein: 88, carbs: 210, fat: 44, fiber: 22 };
    const result = validateMealTotals(actual, target);
    expect(result.valid).toBe(true);
  });

  it('fails when outside tolerance', () => {
    const actual = { protein: 70, carbs: 180, fat: 30, fiber: 15 };
    const result = validateMealTotals(actual, target);
    expect(result.valid).toBe(false);
  });
});

describe('checkEnergyConsistency', () => {
  it('detects consistent energy', () => {
    const result = checkEnergyConsistency({ protein: 89, carbs: 215, fat: 45 }, 1620);
    // 89*4 + 215*4 + 45*9 = 356 + 860 + 405 = 1621
    expect(result.valid).toBe(true);
    expect(Math.abs(result.diff)).toBeLessThanOrEqual(50);
  });
});

describe('constants', () => {
  it('has 4 activity coefficients', () => {
    expect(Object.keys(ACTIVITY_COEFFICIENTS)).toHaveLength(4);
  });

  it('has 3 weight goal deficits', () => {
    expect(Object.keys(WEIGHT_GOAL_DEFICITS)).toHaveLength(3);
  });
});
