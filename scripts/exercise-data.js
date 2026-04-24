/**
 * Exercise prescription lookup tables and calculations.
 * Used by exercise-plan skill to replace inline tables.
 */

/** Absolute contraindications — must not exercise without medical clearance. */
const ABSOLUTE_CONTRAINDICATIONS = [
  { condition: '急性痛风发作期', detail: '关节红肿热痛' },
  { condition: '空腹血糖 >16.7 mmol/L 或 <3.9 mmol/L', detail: '血糖严重异常' },
  { condition: '收缩压 >180 mmHg 或 舒张压 >110 mmHg', detail: '重度高血压未控制' },
  { condition: 'CKD 5期（eGFR <15）未透析', detail: '终末期肾病未透析' },
  { condition: '不稳定心绞痛、近期心梗', detail: '心血管急症' },
  { condition: '急性感染或发热', detail: '体温 >38.5°C' }
];

/** Relative contraindications — exercise modifications required. */
const RELATIVE_CONTRAINDICATIONS = [
  { condition: '痛风/高尿酸', restriction: '避免高强度无氧运动、大量出汗运动', reason: '乳酸堆积抑制尿酸排泄；出汗脱水浓缩尿酸' },
  { condition: 'CKD 3-4期', restriction: '中低强度有氧为主，避免高强度', reason: '防止肌肉分解加重氮质血症' },
  { condition: '糖尿病', restriction: '避免空腹运动，随身携带糖块', reason: '低血糖风险' },
  { condition: '高血压', restriction: '避免屏气动作（大重量力量训练）、倒立', reason: '血压骤升风险' },
  { condition: '肥胖/超重', restriction: '避免高冲击运动（跑跳）、保护关节', reason: '关节损伤风险' },
  { condition: '服用利尿剂', restriction: '注意补水和电解质', reason: '脱水和电解质紊乱风险' }
];

/** Disease -> exercise intensity parameters. */
const DISEASE_INTENSITY = {
  '痛风':     { rpe: '11-13', hrMin: 0.50, hrMax: 0.70 },
  '高尿酸':   { rpe: '11-13', hrMin: 0.50, hrMax: 0.70 },
  'CKD':      { rpe: '11-13', hrMin: 0.40, hrMax: 0.60 },
  '糖尿病':   { rpe: '12-14', hrMin: 0.50, hrMax: 0.70 },
  '高血压':   { rpe: '11-13', hrMin: 0.50, hrMax: 0.70 },
  '肥胖':     { rpe: '12-14', hrMin: 0.60, hrMax: 0.75 },
  '超重':     { rpe: '12-14', hrMin: 0.60, hrMax: 0.75 },
  'default':  { rpe: '12-14', hrMin: 0.64, hrMax: 0.76 }
};

/** Disease -> exercise frequency/duration parameters. */
const DISEASE_FREQUENCY = {
  '痛风':     { aerobicFreq: '4-5次/周', aerobicDuration: '30-45分钟', resistanceFreq: '2次/周', resistanceDuration: '20分钟' },
  'CKD':      { aerobicFreq: '3-5次/周', aerobicDuration: '20-40分钟', resistanceFreq: '2-3次/周', resistanceDuration: '20分钟' },
  '糖尿病':   { aerobicFreq: '5-7次/周', aerobicDuration: '30-60分钟', resistanceFreq: '2-3次/周', resistanceDuration: '20-30分钟' },
  '高血压':   { aerobicFreq: '5-7次/周', aerobicDuration: '30-45分钟', resistanceFreq: '2-3次/周', resistanceDuration: '20分钟' },
  '肥胖':     { aerobicFreq: '5-7次/周', aerobicDuration: '45-60分钟', resistanceFreq: '2-3次/周', resistanceDuration: '20-30分钟' },
  'default':  { aerobicFreq: '3-5次/周', aerobicDuration: '30-60分钟', resistanceFreq: '2-3次/周', resistanceDuration: '20-30分钟' }
};

/** MET values for common exercises (used for energy expenditure estimation). */
const MET_VALUES = {
  '快走(5km/h)': 3.5,
  '快走(6km/h)': 4.3,
  '慢跑(7km/h)': 6.5,
  '游泳(中速)': 6.0,
  '骑自行车(中速)': 5.0,
  '太极拳': 3.0,
  '瑜伽': 2.5,
  '力量训练(中强度)': 5.0
};

/** Drug effects on exercise. */
const DRUG_EXERCISE_EFFECTS = {
  '利尿剂':     { effect: '脱水风险', precaution: '运动前后充分补水，避免高温环境运动' },
  'β受体阻滞剂': { effect: '心率不能作为运动强度指标', precaution: '改用主观疲劳量表（RPE）评估强度' },
  '降糖药':     { effect: '运动中低血糖风险', precaution: '调整运动时间（餐后1-2小时），随身携带糖块' },
  '他汀类':     { effect: '注意肌肉酸痛', precaution: '如运动后严重肌痛需停运就诊' },
  '抗凝药':     { effect: '出血风险', precaution: '避免碰撞类运动' }
};

/** Weekly energy expenditure targets by goal. */
const WEEKLY_ENERGY_GOALS = {
  '减重': { min: 1500, max: 2000, label: '每周通过运动额外消耗' },
  '维持': { min: 1000, max: 1500, label: '每周通过运动消耗' },
  '增重': { min: 500, max: 1000, label: '每周运动消耗控制在' }
};

/**
 * Calculate max heart rate.
 * @param {number} age
 * @returns {number}
 */
function calcMaxHR(age) {
  return 220 - age;
}

/**
 * Calculate heart rate reserve (HRR).
 * @param {number} maxHR
 * @param {number} restingHR
 * @returns {number}
 */
function calcHRR(maxHR, restingHR) {
  return maxHR - restingHR;
}

/**
 * Calculate target HR range using HRR method.
 * @param {number} hrr — heart rate reserve
 * @param {number} restingHR — resting heart rate
 * @param {number} intensityMin — fraction (e.g. 0.50 for 50%)
 * @param {number} intensityMax — fraction (e.g. 0.70 for 70%)
 * @returns {{ min: number, max: number }}
 */
function calcTargetHRRange(hrr, restingHR, intensityMin, intensityMax) {
  return {
    min: Math.round(hrr * intensityMin + restingHR),
    max: Math.round(hrr * intensityMax + restingHR)
  };
}

/**
 * Estimate energy expenditure using MET.
 * @param {number} met — metabolic equivalent
 * @param {number} weightKg
 * @param {number} hours — duration in hours
 * @returns {number} kcal
 */
function calcMETEnergy(met, weightKg, hours) {
  return Math.round(met * weightKg * hours);
}

/**
 * Look up intensity parameters for a disease.
 * Falls back to default if disease not found.
 * @param {string} disease
 * @returns {{ rpe: string, hrMin: number, hrMax: number }|null}
 */
function lookupIntensity(disease) {
  return DISEASE_INTENSITY[disease] || DISEASE_INTENSITY['default'] || null;
}

/**
 * Look up frequency/duration parameters for a disease.
 * @param {string} disease
 * @returns {object|null}
 */
function lookupFrequency(disease) {
  return DISEASE_FREQUENCY[disease] || DISEASE_FREQUENCY['default'] || null;
}

/**
 * Find matching contraindication checks for a list of diagnoses/conditions.
 * @param {string[]} conditions
 * @returns {{ absolute: object[], relative: object[] }}
 */
function checkContraindications(conditions) {
  const absolute = ABSOLUTE_CONTRAINDICATIONS.filter(c =>
    conditions.some(d => c.condition.includes(d))
  );
  const relative = RELATIVE_CONTRAINDICATIONS.filter(c =>
    conditions.some(d => c.condition.includes(d))
  );
  return { absolute, relative };
}

module.exports = {
  ABSOLUTE_CONTRAINDICATIONS,
  RELATIVE_CONTRAINDICATIONS,
  DISEASE_INTENSITY,
  DISEASE_FREQUENCY,
  MET_VALUES,
  DRUG_EXERCISE_EFFECTS,
  WEEKLY_ENERGY_GOALS,
  calcMaxHR,
  calcHRR,
  calcTargetHRRange,
  calcMETEnergy,
  lookupIntensity,
  lookupFrequency,
  checkContraindications
};
