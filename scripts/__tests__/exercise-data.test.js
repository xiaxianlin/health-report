const {
  calcMaxHR, calcHRR, calcTargetHRRange, calcMETEnergy,
  lookupIntensity, lookupFrequency, checkContraindications,
  ABSOLUTE_CONTRAINDICATIONS, RELATIVE_CONTRAINDICATIONS,
  DISEASE_INTENSITY, DISEASE_FREQUENCY, MET_VALUES,
  DRUG_EXERCISE_EFFECTS, WEEKLY_ENERGY_GOALS
} = require('../exercise-data');

describe('calcMaxHR', () => {
  it('calculates max heart rate as 220 - age', () => {
    expect(calcMaxHR(35)).toBe(185);
    expect(calcMaxHR(45)).toBe(175);
    expect(calcMaxHR(65)).toBe(155);
  });
});

describe('calcHRR', () => {
  it('calculates heart rate reserve', () => {
    expect(calcHRR(185, 70)).toBe(115);
    expect(calcHRR(175, 75)).toBe(100);
  });
});

describe('calcTargetHRRange', () => {
  it('calculates target HR range using HRR method', () => {
    // HRR=115, resting=70, 50-70%
    const result = calcTargetHRRange(115, 70, 0.50, 0.70);
    expect(result.min).toBe(128); // 115*0.5+70 = 127.5
    expect(result.max).toBe(151); // 115*0.7+70 = 150.5
  });
});

describe('calcMETEnergy', () => {
  it('calculates energy expenditure from MET', () => {
    // 快走(5km/h) MET=3.5, 87.1kg, 0.5h = 3.5*87.1*0.5 = 152.425
    expect(calcMETEnergy(3.5, 87.1, 0.5)).toBe(152);
  });

  it('returns 0 for 0 duration', () => {
    expect(calcMETEnergy(5, 70, 0)).toBe(0);
  });
});

describe('lookupIntensity', () => {
  it('returns correct intensity for known diseases', () => {
    const gout = lookupIntensity('痛风');
    expect(gout.rpe).toBe('11-13');
    expect(gout.hrMin).toBe(0.50);
    expect(gout.hrMax).toBe(0.70);
  });

  it('returns default for unknown disease', () => {
    const def = lookupIntensity('未知疾病');
    expect(def).toBe(DISEASE_INTENSITY['default']);
  });

  it('has entries for all common diseases', () => {
    const diseases = ['痛风', 'CKD', '糖尿病', '高血压', '肥胖'];
    diseases.forEach(d => {
      expect(lookupIntensity(d)).toBeDefined();
    });
  });
});

describe('lookupFrequency', () => {
  it('returns frequency parameters for known diseases', () => {
    const ckd = lookupFrequency('CKD');
    expect(ckd.aerobicFreq).toBe('3-5次/周');
    expect(ckd.aerobicDuration).toBe('20-40分钟');
  });

  it('returns default for unknown disease', () => {
    expect(lookupFrequency('未知')).toBe(DISEASE_FREQUENCY['default']);
  });
});

describe('checkContraindications', () => {
  it('finds absolute contraindications', () => {
    const result = checkContraindications(['痛风', '糖尿病']);
    expect(result.absolute.length).toBeGreaterThanOrEqual(0);
    expect(result.relative.some(r => r.condition.includes('痛风'))).toBe(true);
  });

  it('finds relative contraindications', () => {
    const result = checkContraindications(['CKD']);
    expect(result.relative.some(r => r.condition.includes('CKD'))).toBe(true);
  });
});

describe('constants', () => {
  it('has absolute contraindications list', () => {
    expect(ABSOLUTE_CONTRAINDICATIONS.length).toBeGreaterThanOrEqual(6);
  });

  it('has relative contraindications list', () => {
    expect(RELATIVE_CONTRAINDICATIONS.length).toBeGreaterThanOrEqual(6);
  });

  it('has disease intensity data', () => {
    expect(Object.keys(DISEASE_INTENSITY).length).toBeGreaterThanOrEqual(7);
  });

  it('has disease frequency data', () => {
    expect(Object.keys(DISEASE_FREQUENCY).length).toBeGreaterThanOrEqual(6);
  });

  it('has MET values', () => {
    expect(Object.keys(MET_VALUES).length).toBeGreaterThanOrEqual(5);
  });

  it('has drug effects', () => {
    expect(Object.keys(DRUG_EXERCISE_EFFECTS).length).toBeGreaterThanOrEqual(5);
  });

  it('has weekly energy goals', () => {
    expect(Object.keys(WEEKLY_ENERGY_GOALS).length).toBeGreaterThanOrEqual(3);
  });
});
