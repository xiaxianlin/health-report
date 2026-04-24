/**
 * Deterministic nutrition calculations (BMR, TDEE, macro targets).
 * Used by nutrition-assess skill to replace inline formulas.
 */

const ACTIVITY_COEFFICIENTS = {
  '久坐': 1.2,
  '轻度活动': 1.375,
  '中度活动': 1.55,
  '高度活动': 1.725
};

const WEIGHT_GOAL_DEFICITS = {
  '减重': -400,
  '维持': 0,
  '增重': 250
};

const MACRO_ENERGY = { protein: 4, carbs: 4, fat: 9 };

/**
 * Mifflin-St Jeor BMR calculation.
 * @param {'男'|'女'} gender
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} ageYears
 * @returns {number}
 */
function calcBMR(gender, weightKg, heightCm, ageYears) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(gender === '女' ? base - 161 : base + 5);
}

/**
 * Calculate TDEE from BMR and activity level.
 * @param {number} bmr
 * @param {string} activityLevel — key in ACTIVITY_COEFFICIENTS
 * @returns {number|null} null if unknown activity level
 */
function calcTDEE(bmr, activityLevel) {
  const coeff = ACTIVITY_COEFFICIENTS[activityLevel];
  return coeff ? Math.round(bmr * coeff) : null;
}

/**
 * Adjust TDEE for weight management goal.
 * @param {number} tdee
 * @param {'减重'|'维持'|'增重'} weightGoal
 * @returns {number}
 */
function calcTargetEnergy(tdee, weightGoal) {
  const deficit = WEIGHT_GOAL_DEFICITS[weightGoal];
  if (deficit === undefined) return tdee;
  return tdee + deficit;
}

/**
 * Convert energy + macro percentages to gram targets.
 * @param {number} totalEnergyKcal
 * @param {number} proteinPct — e.g. 22 for 22%
 * @param {number} carbPct
 * @param {number} fatPct
 * @returns {{ protein: number, carbs: number, fat: number, fiber: number }}
 */
function calcMacroGrams(totalEnergyKcal, proteinPct, carbPct, fatPct) {
  return {
    protein: Math.round((totalEnergyKcal * (proteinPct / 100)) / MACRO_ENERGY.protein),
    carbs: Math.round((totalEnergyKcal * (carbPct / 100)) / MACRO_ENERGY.carbs),
    fat: Math.round((totalEnergyKcal * (fatPct / 100)) / MACRO_ENERGY.fat),
    fiber: Math.round(totalEnergyKcal > 0 ? totalEnergyKcal / 1000 * 14 : 0)
  };
}

/**
 * Distribute total energy across meals by percentages.
 * @param {number} totalEnergy
 * @param {{ name: string, pct: number }[]} meals
 * @returns {{ meal: string, energy: number, percent: number }[]}
 */
function calcMealDistribution(totalEnergy, meals) {
  return meals.map(m => ({
    meal: m.name,
    energy: Math.round(totalEnergy * (m.pct / 100)),
    percent: m.pct
  }));
}

/**
 * Validate that macro percentages sum to ~100%.
 * @param {number} proteinPct
 * @param {number} carbPct
 * @param {number} fatPct
 * @returns {{ valid: boolean, total: number, diff: number }}
 */
function validateMacroPcts(proteinPct, carbPct, fatPct) {
  const total = proteinPct + carbPct + fatPct;
  return { valid: Math.abs(total - 100) <= 2, total, diff: total - 100 };
}

/**
 * Validate calculated totals against targets.
 * @param {{ protein: number, carbs: number, fat: number, fiber: number }} actual
 * @param {{ protein: number, carbs: number, fat: number, fiber: number }} target
 * @param {number} [tolerance=0.1] — fractional tolerance (default ±10%)
 * @returns {{ valid: boolean, deviations: object }}
 */
function validateMealTotals(actual, target, tolerance = 0.1) {
  const deviations = {};
  for (const key of ['protein', 'carbs', 'fat', 'fiber']) {
    deviations[key] = target[key] > 0 ? (actual[key] - target[key]) / target[key] : 0;
  }
  const valid = Object.values(deviations).every(d => Math.abs(d) <= tolerance);
  return { valid, deviations };
}

/**
 * Check energy consistency: protein*4 + carbs*4 + fat*9 ≈ totalEnergy.
 * @param {{ protein: number, carbs: number, fat: number }} macros
 * @param {number} declaredEnergy
 * @param {number} [tolerance=50]
 * @returns {{ valid: boolean, calculated: number, diff: number }}
 */
function checkEnergyConsistency(macros, declaredEnergy, tolerance = 50) {
  const calculated =
    (macros.protein || 0) * MACRO_ENERGY.protein +
    (macros.carbs || 0) * MACRO_ENERGY.carbs +
    (macros.fat || 0) * MACRO_ENERGY.fat;
  return {
    valid: Math.abs(calculated - declaredEnergy) <= tolerance,
    calculated,
    diff: calculated - declaredEnergy
  };
}

module.exports = {
  ACTIVITY_COEFFICIENTS,
  WEIGHT_GOAL_DEFICITS,
  calcBMR,
  calcTDEE,
  calcTargetEnergy,
  calcMacroGrams,
  calcMealDistribution,
  validateMacroPcts,
  validateMealTotals,
  checkEnergyConsistency
};
