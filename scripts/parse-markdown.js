const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

function generateViewCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 18; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function parseTable(content) {
  if (!content) return [];
  const lines = content.split('\n').filter(l => l.trim());
  const tableLines = lines.filter(l => l.startsWith('|'));
  if (tableLines.length < 2) return [];

  const dataLines = tableLines.filter(l => !l.match(/^\|[\s\-:]+\|/));

  return dataLines.slice(1).map(line => {
    const cells = line.split('|').slice(1, -1).map(c => c.trim().replace(/\*\*/g, ''));
    return cells;
  }).filter(row => row.some(cell => cell));
}

function extractSection(content, heading) {
  const regex = new RegExp(`${heading}([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseHealthRecord(content) {
  const result = {
    name: '', gender: '', age: 0, height: 0, weight: 0, bmi: 0, bmiCategory: '',
    bloodPressure: '', date: '', allergies: [], diagnoses: [], medications: [],
    labGroups: [], lifestyles: [], nutritionNotes: []
  };

  const nameMatch = content.match(/姓名[:：]\s*(.+)/m);
  const genderMatch = content.match(/性别[:：]\s*(.+)/m);
  const ageMatch = content.match(/年龄[:：]\s*(\d+)/m);
  const heightMatch = content.match(/身高[:：]\s*(\d+(?:\.\d+)?)/m);
  const weightMatch = content.match(/体重[:：]\s*(\d+(?:\.\d+)?)/m);
  const bmiMatch = content.match(/BMI[:：]\s*\*{0,2}(\d+(?:\.\d+)?)/m);
  const bmiCatMatch = content.match(/BMI[:：].*?[（(](.+?)[）)]/m);
  const bpMatch = content.match(/血压[:：]\s*(.+)/m);
  const dateMatch = content.match(/(?:建档日期|生成日期)[:：]\s*(.+)/m);

  if (nameMatch) result.name = nameMatch[1].trim();
  if (genderMatch) result.gender = genderMatch[1].trim();
  if (ageMatch) result.age = parseInt(ageMatch[1]);
  if (heightMatch) result.height = parseFloat(heightMatch[1]);
  if (weightMatch) result.weight = parseFloat(weightMatch[1]);
  if (bmiMatch) result.bmi = parseFloat(bmiMatch[1]);
  if (bmiCatMatch) result.bmiCategory = bmiCatMatch[1].trim();
  if (bpMatch) result.bloodPressure = bpMatch[1].trim();
  if (dateMatch) result.date = dateMatch[1].trim();

  const labSection = extractSection(content, '## 检验指标');
  if (labSection) {
    const groupMatches = labSection.split(/###\s+/).filter(g => g.trim());
    result.labGroups = groupMatches.map(group => {
      const lines = group.split('\n');
      const title = lines[0].trim();
      const tableContent = group.substring(group.indexOf('\n'));
      const rows = parseTable(tableContent);

      return {
        title,
        results: rows.map(row => {
          const rawStatus = row[4] || '';
          let status = 'normal';
          if (rawStatus.includes('↑↑')) status = 'very_high';
          else if (rawStatus.includes('↓↓')) status = 'very_low';
          else if (rawStatus.includes('↑')) status = 'high';
          else if (rawStatus.includes('↓')) status = 'low';
          return {
            indicator: row[0] || '',
            value: row[1] || '',
            unit: row[2] || '',
            reference: row[3] || '',
            status
          };
        })
      };
    });
  }

  const diagnosisSection = extractSection(content, '## 诊断');
  if (diagnosisSection) {
    const diagMatches = diagnosisSection.match(/\d+\.\s*(.+)/g);
    if (diagMatches) {
      result.diagnoses = diagMatches.map(d => d.replace(/^\d+\.\s*/, '').trim());
    }
  }

  return result;
}

function parseNutritionAssessment(content) {
  if (!content) return null;

  const result = {
    bmr: 0, tdee: 0, targetEnergy: 0, activityLevel: '',
    macros: [], microTargets: [], mealDistribution: [],
    principles: [], recommendedFoods: [], forbiddenFoods: [],
    drugInteractions: [], keyNotes: [], references: []
  };

  const bmrMatch = content.match(/\*\*BMR[:：\]]?\s*(\d+)/);
  if (bmrMatch) result.bmr = parseInt(bmrMatch[1]);

  const tdeeMatch = content.match(/\*\*TDEE[:：\]]?\s*(\d+)/);
  if (tdeeMatch) result.tdee = parseInt(tdeeMatch[1]);

  const targetMatch = content.match(/\*{0,2}调整后目标能量\*{0,2}[:：].*?=\s*\*{0,2}(\d+)/);
  if (targetMatch) result.targetEnergy = parseInt(targetMatch[1]);

  const activityMatch = content.match(/活动水平[:：]\s*\*\*(.+?)\*\*/);
  if (activityMatch) result.activityLevel = activityMatch[1].trim();

  const macroSection = extractSection(content, '### 宏量营养素');
  if (macroSection) {
    const rows = parseTable(macroSection);
    result.macros = rows.map(row => {
      const targetStr = row[1] || '';
      // target 格式如 "90 g" 或 "1620 kcal"
      const unitMatch = targetStr.match(/[a-zA-Z]+(\/天)?/);
      const unit = unitMatch ? unitMatch[0] : 'g';
      return {
        name: row[0] || '',
        target: parseInt(targetStr) || 0,
        unit,
        percent: parseInt(row[2]) || 0,
        range: row[3] || '',
        source: row[4] || ''
      };
    }).filter(m => m.name && m.name !== '营养素');
  }

  const microSection = extractSection(content, '### 微量营养素重点');
  if (microSection) {
    const rows = parseTable(microSection);
    result.microTargets = rows.map(row => ({
      name: row[0] || '',
      target: row[1] || '',
      reason: row[2] || ''
    })).filter(m => m.name && m.name !== '营养素');
  }

  const mealDistSection = extractSection(content, '## 三餐能量分配');
  if (mealDistSection) {
    const rows = parseTable(mealDistSection);
    result.mealDistribution = rows.map(row => ({
      meal: row[0] || '',
      energy: parseInt(row[1]) || 0,
      percent: parseInt(row[2].replace('%', '')) || 0,
      protein: parseInt(row[3]) || 0,
      carbs: parseInt(row[4]) || 0,
      fat: parseInt(row[5]) || 0
    })).filter(m => m.meal && !m.meal.includes('餐次'));
  }

  const principleSection = extractSection(content, '## 饮食原则');
  if (principleSection) {
    const items = principleSection.match(/-\s+(.+)/g);
    if (items) {
      result.principles = items.map(i => i.replace(/^-\s*/, '').trim());
    }
  }

  const recFoodSection = extractSection(content, '## 推荐食物清单');
  if (recFoodSection) {
    const categories = recFoodSection.split(/###\s+/).filter(c => c.trim());
    result.recommendedFoods = categories.map(cat => {
      const lines = cat.split('\n');
      const categoryName = lines[0].trim();
      const items = [];
      for (const line of lines.slice(1)) {
        const match = line.match(/-\s*(.+)/);
        if (match) {
          items.push({ name: match[1].trim() });
        }
      }
      return { category: categoryName, items };
    }).filter(c => c.items.length > 0);
  }

  const forbiddenSection = extractSection(content, '## 禁忌食物');
  if (forbiddenSection) {
    const rows = parseTable(forbiddenSection);
    result.forbiddenFoods = rows.map(row => {
      let severity = row[2] || '适量控制';
      severity = severity.replace(/[（(].*?[）)]/g, '').trim();
      return {
        food: row[0] || '',
        reason: row[1] || '',
        severity: severity
      };
    }).filter(f => f.food && f.food !== '食物');
  }

  const keyNotesSection = extractSection(content, '## 关键注意事项');
  if (keyNotesSection) {
    const items = keyNotesSection.match(/\d+\.\s*(.+)/g);
    if (items) {
      result.keyNotes = items.map(i => i.replace(/^\d+\.\s*/, '').trim());
    }
  }

  return result;
}

function parseMealPlan(content) {
  if (!content) return null;

  const result = {
    weekNumber: 1,
    targetEnergy: 0,
    targetProtein: 0,
    targetCarbs: 0,
    targetFat: 0,
    days: [],
    weeklySummary: [],
    weeklyAnalysis: [],
    shoppingList: [],
    references: []
  };

  const weekMatch = content.match(/适用周期[:：]\s*第(\d+)周/);
  if (weekMatch) result.weekNumber = parseInt(weekMatch[1]);

  const targetMatch = content.match(/每日目标[:：]\s*(\d+)\s*kcal/);
  if (targetMatch) result.targetEnergy = parseInt(targetMatch[1]);

  const dayMatches = content.match(/## 周[一二三四五六日]\s*\n([\s\S]*?)(?=## 周[一二三四五六日]\s*\n|## 一周营养总览|$)/g);
  if (dayMatches) {
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    result.days = dayMatches.map((dayContent, idx) => {
      const dayName = dayNames[idx] || `第${idx + 1}天`;
      const meals = [];

      const mealMatches = dayContent.match(/### 早餐([\s\S]*?)(?=### 午餐|$)/);
      const lunchMatch = dayContent.match(/### 午餐([\s\S]*?)(?=### 晚餐|$)/);
      const dinnerMatch = dayContent.match(/### 晚餐([\s\S]*?)(?=\*\*周|$)/);

      ['早餐', '午餐', '晚餐'].forEach((mealType, i) => {
        let mealContent = '';
        if (i === 0) mealContent = mealMatches ? mealMatches[1] : '';
        else if (i === 1) mealContent = lunchMatch ? lunchMatch[1] : '';
        else mealContent = dinnerMatch ? dinnerMatch[1] : '';

        const energyMatch = mealContent.match(/(\d+)\s*kcal/);
        const energy = energyMatch ? `${energyMatch[1]} kcal` : '';

        const rows = parseTable(mealContent);
        const items = rows.map(row => ({
          food: row[0] || '',
          amount: row[1] || '',
          method: row[2] || '',
          note: row[3] || ''
        })).filter(item => item.food && item.food !== '食物');

        if (items.length > 0) {
          meals.push({ type: mealType, energy, items });
        }
      });

      const dailyTotalMatch = dayContent.match(/\*\*周.+全天\*\*[:：]\s*(.+)/);
      const dailyTotal = dailyTotalMatch ? dailyTotalMatch[1].trim() : '';

      return { day: dayName, meals, dailyTotal };
    });
  }

  const summarySection = extractSection(content, '## 一周营养总览');
  if (summarySection) {
    const rows = parseTable(summarySection);
    result.weeklySummary = rows.map(row => ({
      day: row[0] || '',
      energy: parseInt(row[1]) || 0,
      protein: parseFloat(row[2]) || 0,
      fat: parseFloat(row[3]) || 0,
      carbs: parseFloat(row[4]) || 0
    })).filter(s => s.day && !s.day.includes('星期') && !s.day.includes('日均'));
  }

  const shoppingSection = extractSection(content, '## 采购清单');
  if (shoppingSection) {
    const categories = shoppingSection.split(/###\s+/).filter(c => c.trim());
    result.shoppingList = categories.map(cat => {
      const lines = cat.split('\n');
      const categoryName = lines[0].trim();
      const items = [];
      for (const line of lines.slice(1)) {
        const match = line.match(/-\s*(.+)/);
        if (match) {
          items.push(match[1].trim());
        }
      }
      return { category: categoryName, items };
    }).filter(c => c.items.length > 0);
  }

  return result;
}

function parseExercisePrescription(content) {
  if (!content) return null;

  const result = {
    date: '',
    safety: { evaluations: [], contraindications: [], conclusion: '' },
    prescription: { type: '', intensity: '', frequency: '', duration: '', targetHR: '', maxHR: 0 },
    aerobic: { exercises: '', intensity: '', frequency: '', duration: '', notes: '' },
    resistance: { exercises: '', intensity: '', frequency: '', duration: '', notes: '' },
    flexibility: { exercises: '', intensity: '', frequency: '', duration: '', notes: '' },
    phases: [],
    sessionFlow: [],
    nutritionSynergy: { timing: [], strategies: [], drugInteractions: [], energyBalance: '' },
    precautions: [],
    stopConditions: [],
    progression: [],
    references: []
  };

  const dateMatch = content.match(/\*\*生成日期\*\*[:：]\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) result.date = dateMatch[1];

  const safetySection = extractSection(content, '## 一、运动安全性评估');
  if (safetySection) {
    const evalTable = safetySection.match(/### 1\.1[\s\S]*?(?=###|$)/);
    if (evalTable) {
      const rows = parseTable(evalTable[0]);
      result.safety.evaluations = rows.map(row => ({
        item: row[0] || '',
        status: row[1] || '',
        safety: row[2] || ''
      })).filter(e => e.item && e.item !== '评估项目');
    }

    // 禁忌症（可能在 1.1 中以列表形式出现，或在单独的 1.2 中）
    const contraindSection = safetySection.match(/### 1\.1[\s\S]*?(?=###|$)/);
    const allItems = [];
    if (contraindSection) {
      const items = contraindSection[0].match(/[-\*]\s+(.+)/g);
      if (items) {
        items.forEach(i => {
          const text = i.replace(/^[-\*]\s*/, '').trim();
          if (text && !text.startsWith('**') && text.length > 2) {
            allItems.push(text);
          }
        });
      }
    }
    result.safety.contraindications = allItems.filter(i =>
      !i.includes('绝对禁忌') && !i.includes('相对禁忌')
    );
  }

  const prescriptionSection = extractSection(content, '### 2.2 运动参数总览');
  if (prescriptionSection) {
    const rows = parseTable(prescriptionSection);
    rows.forEach(row => {
      const key = row[0];
      const value = row[1];
      if (key.includes('运动类型')) result.prescription.type = value;
      else if (key.includes('强度')) result.prescription.intensity = value;
      else if (key.includes('频率')) result.prescription.frequency = value;
      else if (key.includes('时长')) result.prescription.duration = value;
    });

    const targetHRMatch = prescriptionSection.match(/靶心率.*?=\s*(\d+\s*~\s*\d+)/);
    if (targetHRMatch) result.prescription.targetHR = targetHRMatch[1] + ' bpm';

    const maxHRMatch = prescriptionSection.match(/最大心率.*?=\s*(\d+)/);
    if (maxHRMatch) result.prescription.maxHR = parseInt(maxHRMatch[1]);
  }

  const aerobicSection = extractSection(content, '#### 有氧运动');
  if (aerobicSection) {
    const rows = parseTable(aerobicSection);
    if (rows.length > 0) {
      result.aerobic = {
        exercises: rows.map(r => r[0]).join(', '),
        intensity: rows[0][1] || '',
        frequency: rows[0][2] || '',
        duration: rows[0][3] || '',
        notes: rows[0][4] || ''
      };
    }
  }

  const resistanceSection = extractSection(content, '#### 抗阻训练');
  if (resistanceSection) {
    const rows = parseTable(resistanceSection);
    if (rows.length > 0) {
      result.resistance = {
        exercises: rows.map(r => r[0]).join(', '),
        intensity: rows[0][1] || '',
        frequency: rows[0][2] || '',
        duration: rows[0][3] || '',
        notes: ''
      };
    }
  }

  const flexSection = extractSection(content, '#### 柔韧与平衡');
  if (flexSection) {
    const rows = parseTable(flexSection);
    if (rows.length > 0) {
      result.flexibility = {
        exercises: rows.map(r => r[0]).join(', '),
        intensity: '',
        frequency: '',
        duration: rows[0][1] || '',
        notes: ''
      };
    }
  }

  const planSection = extractSection(content, '## 三、一周运动计划');
  if (planSection) {
    const phases = planSection.split(/### /).filter(p => p.trim());
    result.phases = phases.map(phase => {
      const lines = phase.split('\n');
      const phaseName = lines[0].trim();
      const weeksMatch = phaseName.match(/（(.+?)）/);
      const weeks = weeksMatch ? weeksMatch[1] : '';
      const name = phaseName.replace(/（.+?）/, '').trim();

      const rows = parseTable(phase);
      const days = rows.map(row => ({
        day: row[0] || '',
        content: row[1] || '',
        duration: row[2] || '',
        intensity: row[3] || ''
      })).filter(d => d.day && d.day.includes('周'));

      const totalMatch = phase.match(/（第.+?周日均.*?([\d\-]+).*?）/);
      const weeklyTotal = totalMatch ? `约 ${totalMatch[1]} 分钟` : '';

      return { name, weeks, days, weeklyTotal };
    }).filter(p => p.days.length > 0);
  }

  const flowSection = extractSection(content, '## 四、单次运动标准流程');
  if (flowSection) {
    const sections = flowSection.split(/### /).filter(s => s.trim());
    sections.forEach(section => {
      const items = section.match(/\d+\.\s*(.+)/g);
      if (items) {
        result.sessionFlow.push(...items.map(i => i.replace(/^\d+\.\s*/, '').trim()));
      }
    });
  }

  const synergySection = extractSection(content, '## 五、运动与营养协同');
  if (synergySection) {
    const timingTable = synergySection.match(/### 5\.1[\s\S]*?(?=###|$)/);
    if (timingTable) {
      const rows = parseTable(timingTable[0]);
      result.nutritionSynergy.timing = rows.map(row => ({
        period: row[0] || '',
        time: row[1] || '',
        note: row[2] || ''
      })).filter(t => t.period && t.period !== '运动时段');
    }

    const strategyTable = synergySection.match(/### 5\.2[\s\S]*?(?=###|$)/);
    if (strategyTable) {
      const rows = parseTable(strategyTable[0]);
      result.nutritionSynergy.strategies = rows.map(row => ({
        scenario: row[0] || '',
        strategy: row[1] || ''
      })).filter(s => s.scenario && s.scenario !== '场景');
    }
  }

  return result;
}

module.exports = {
  uuidv4,
  generateViewCode,
  parseTable,
  extractSection,
  parseHealthRecord,
  parseNutritionAssessment,
  parseMealPlan,
  parseExercisePrescription
};
