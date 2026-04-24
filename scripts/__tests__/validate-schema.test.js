const { validateData, formatValidationResult } = require('../validate-schema');

function validData(overrides = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    viewCode: 'abcdef1234567890ab',
    name: '测试患者',
    gender: '男',
    age: 35,
    height: 170,
    weight: 70,
    bmi: 24.2,
    bloodPressure: '120/80',
    date: '2025-01-01',
    diagnoses: ['高血压'],
    medications: [],
    labGroups: [{
      title: '血液检查',
      results: [
        { indicator: '血糖', value: '5.0', unit: 'mmol/L', reference: '3.9-6.1', status: 'normal' }
      ]
    }],
    nutritionAssessment: {
      bmr: 1700,
      tdee: 2000,
      targetEnergy: 1800,
      macros: [
        { name: '蛋白质', target: 90, unit: 'g', percent: 20, range: '15-25', source: '一般需求' },
        { name: '碳水', target: 250, unit: 'g', percent: 55, range: '50-65', source: '一般需求' },
        { name: '脂肪', target: 50, unit: 'g', percent: 25, range: '20-30', source: '一般需求' }
      ],
      forbiddenFoods: [
        { food: '酒精', reason: '肝损伤', severity: '完全禁止' }
      ]
    },
    mealPlans: [{
      weekNumber: 1,
      days: [{ day: '周一', meals: [{ type: '早餐', items: [{ food: '面包', amount: '50g' }] }] }]
    }],
    exercisePrescription: {
      phases: [{ name: '适应期', weeks: '1-4周', days: [] }]
    },
    ...overrides
  };
}

describe('validateData()', () => {
  it('passes valid data', () => {
    const result = validateData(validData());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe('required fields', () => {
    it('reports missing id', () => {
      const result = validateData(validData({ id: undefined }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('reports missing viewCode', () => {
      const result = validateData(validData({ viewCode: undefined }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('viewCode'))).toBe(true);
    });

    it('reports missing name', () => {
      const result = validateData(validData({ name: undefined }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });
  });

  describe('uuid format', () => {
    it('rejects invalid UUID format', () => {
      const result = validateData(validData({ id: 'not-a-uuid' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('UUID'))).toBe(true);
    });

    it('accepts valid UUID', () => {
      const result = validateData(validData({ id: '550e8400-e29b-41d4-a716-446655440000' }));
      expect(result.valid).toBe(true);
    });
  });

  describe('viewCode format', () => {
    it('rejects invalid viewCode', () => {
      const result = validateData(validData({ viewCode: 'short' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('viewCode'))).toBe(true);
    });

    it('rejects viewCode with uppercase', () => {
      const result = validateData(validData({ viewCode: 'ABCDEF1234567890AB' }));
      expect(result.valid).toBe(false);
    });

    it('accepts valid 18-char viewCode', () => {
      const result = validateData(validData({ viewCode: 'abcdef1234567890ab' }));
      expect(result.valid).toBe(true);
    });
  });

  describe('labGroups', () => {
    it('rejects missing labGroups', () => {
      const result = validateData(validData({ labGroups: undefined }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('labGroups'))).toBe(true);
    });

    it('rejects empty labGroups', () => {
      const result = validateData(validData({ labGroups: [] }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('labGroups'))).toBe(true);
    });

    it('rejects invalid status enum', () => {
      const result = validateData(validData({
        labGroups: [{
          title: '测试',
          results: [{ indicator: 'test', value: '1', status: 'invalid_status' }]
        }]
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    it('accepts all valid status values', () => {
      const statuses = ['normal', 'high', 'low', 'very_high', 'very_low'];
      for (const status of statuses) {
        const result = validateData(validData({
          labGroups: [{
            title: '测试',
            results: [{ indicator: 'test', value: '1', unit: '', reference: '', status }]
          }]
        }));
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('nutritionAssessment', () => {
    it('rejects macros with fewer than 3 items', () => {
      const result = validateData(validData({
        nutritionAssessment: { macros: [{ name: '蛋白质', target: 90, percent: 20 }] }
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('macros'))).toBe(true);
    });

    it('rejects macro with string target', () => {
      const result = validateData(validData({
        nutritionAssessment: {
          macros: [
            { name: '蛋白质', target: '90', percent: 20 },
            { name: '碳水', target: 250, percent: 55 },
            { name: '脂肪', target: 50, percent: 25 }
          ]
        }
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('target'))).toBe(true);
    });

    it('rejects invalid forbiddenFoods severity', () => {
      const result = validateData(validData({
        nutritionAssessment: {
          ...validData().nutritionAssessment,
          forbiddenFoods: [{ food: '酒', reason: 'test', severity: 'invalid' }]
        }
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('severity'))).toBe(true);
    });

    it('accepts all valid severity values', () => {
      const severities = ['完全禁止', '严格限制', '适量控制'];
      for (const severity of severities) {
        const result = validateData(validData({
          nutritionAssessment: {
            macros: [
              { name: '蛋白质', target: 90, percent: 20 },
              { name: '碳水', target: 250, percent: 55 },
              { name: '脂肪', target: 50, percent: 25 }
            ],
            forbiddenFoods: [{ food: '酒', reason: 'test', severity }]
          }
        }));
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('mealPlans', () => {
    it('rejects mealPlan with empty days', () => {
      const result = validateData(validData({
        mealPlans: [{ weekNumber: 1, days: [] }]
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('days'))).toBe(true);
    });

    it('rejects mealPlan with string weekNumber', () => {
      const result = validateData(validData({
        mealPlans: [{ weekNumber: '1', days: [{ day: '周一' }] }]
      }));
      expect(result.valid).toBe(false);
    });
  });

  describe('numeric types', () => {
    it('rejects string age', () => {
      const result = validateData(validData({ age: '35' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('age'))).toBe(true);
    });

    it('rejects string height', () => {
      const result = validateData(validData({ height: '170' }));
      expect(result.valid).toBe(false);
    });
  });
});

describe('formatValidationResult()', () => {
  it('formats success message', () => {
    const result = formatValidationResult({ valid: true, errors: [] });
    expect(result).toContain('✓');
  });

  it('formats failure message with error count', () => {
    const result = formatValidationResult({
      valid: false,
      errors: ['缺少必填字段: id', 'viewCode 格式不正确']
    });
    expect(result).toContain('✗');
    expect(result).toContain('2 个错误');
    expect(result).toContain('缺少必填字段: id');
  });
});
