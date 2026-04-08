const fs = require('fs');
const path = require('path');

// 生成 UUID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 生成查看码
function generateViewCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 18; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 解析 Markdown 表格
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

// 提取章节
function extractSection(content, heading) {
  const regex = new RegExp(`${heading}([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

// 解析健康档案
function parseHealthRecord(content) {
  const result = {
    name: '', gender: '', age: 0, height: 0, weight: 0, bmi: 0, bmiCategory: '',
    bloodPressure: '', date: '', allergies: [], diagnoses: [], medications: [],
    labGroups: [], lifestyles: [], nutritionNotes: []
  };

  const nameMatch = content.match(/姓名[:：]\s*(.+)/m);
  const genderMatch = content.match(/性别[:：]\s*(.+)/m);
  const ageMatch = content.match(/年龄[:：]\s*(\d+)/m);
  const heightMatch = content.match(/身高[:：]\s*(\d+)/m);
  const weightMatch = content.match(/体重[:：]\s*(\d+(?:\.\d+)?)/m);
  const bmiMatch = content.match(/BMI[:：]\s*(\d+(?:\.\d+)?)/m);
  const bmiCatMatch = content.match(/BMI[:：]\s*\d+(?:\.\d+)?\s*\((.+?)\)/m);
  const bpMatch = content.match(/血压[:：]\s*(.+)/m);
  const dateMatch = content.match(/建档日期[:：]\s*(.+)/m);

  if (nameMatch) result.name = nameMatch[1].trim();
  if (genderMatch) result.gender = genderMatch[1].trim();
  if (ageMatch) result.age = parseInt(ageMatch[1]);
  if (heightMatch) result.height = parseInt(heightMatch[1]);
  if (weightMatch) result.weight = parseFloat(weightMatch[1]);
  if (bmiMatch) result.bmi = parseFloat(bmiMatch[1]);
  if (bmiCatMatch) result.bmiCategory = bmiCatMatch[1].trim();
  if (bpMatch) result.bloodPressure = bpMatch[1].trim();
  if (dateMatch) result.date = dateMatch[1].trim();

  // 解析检验指标分组
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
        results: rows.map(row => ({
          indicator: row[0] || '',
          value: row[1] || '',
          unit: row[2] || '',
          reference: row[3] || '',
          status: row[4] === '↑' ? 'high' :
                  row[4] === '↑↑' ? 'very_high' :
                  row[4] === '↓' ? 'low' :
                  row[4] === '↓↓' ? 'very_low' : 'normal'
        }))
      };
    });
  }

  // 解析诊断
  const diagnosisSection = extractSection(content, '## 诊断');
  if (diagnosisSection) {
    const diagMatches = diagnosisSection.match(/\d+\.\s*(.+)/g);
    if (diagMatches) {
      result.diagnoses = diagMatches.map(d => d.replace(/^\d+\.\s*/, '').trim());
    }
  }

  return result;
}

// 解析营养评估
function parseNutritionAssessment(content) {
  if (!content) return null;

  const result = {
    bmr: 0, tdee: 0, targetEnergy: 0, activityLevel: '',
    macros: [], microTargets: [], mealDistribution: [],
    principles: [], recommendedFoods: [], forbiddenFoods: [],
    drugInteractions: [], keyNotes: [], references: []
  };

  const bmrMatch = content.match(/BMR[:：]?\s*(?:.*?)=\s*(\d+)/s);
  if (bmrMatch) result.bmr = parseInt(bmrMatch[1]);

  const tdeeMatch = content.match(/TDEE[:：]?\s*(?:.*?)=\s*(\d+)/s);
  if (tdeeMatch) result.tdee = parseInt(tdeeMatch[1]);

  const targetMatch = content.match(/调整后目标能量[:：]\s*(\d+)/);
  if (targetMatch) result.targetEnergy = parseInt(targetMatch[1]);

  const activityMatch = content.match(/活动水平[:：]\s*\*\*(.+?)\*\*/);
  if (activityMatch) result.activityLevel = activityMatch[1].trim();

  // 宏量营养素
  const macroSection = extractSection(content, '### 宏量营养素');
  if (macroSection) {
    const rows = parseTable(macroSection);
    result.macros = rows.map(row => ({
      name: row[0] || '',
      target: parseInt(row[1]) || 0,
      unit: row[2] || 'g',
      percent: parseInt(row[3]) || 0,
      range: row[4] || '',
      source: row[5] || ''
    })).filter(m => m.name && m.name !== '营养素');
  }

  // 微量营养素
  const microSection = extractSection(content, '### 微量营养素重点');
  if (microSection) {
    const rows = parseTable(microSection);
    result.microTargets = rows.map(row => ({
      name: row[0] || '',
      target: row[1] || '',
      reason: row[2] || ''
    })).filter(m => m.name && m.name !== '营养素');
  }

  // 餐次分配
  const mealDistSection = extractSection(content, '### 三餐能量分配');
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

  // 饮食原则
  const principleSection = extractSection(content, '## 饮食原则');
  if (principleSection) {
    const items = principleSection.match(/-\s+(.+)/g);
    if (items) {
      result.principles = items.map(i => i.replace(/^-\s*/, '').trim());
    }
  }

  // 推荐食物
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

  // 禁忌食物
  const forbiddenSection = extractSection(content, '## 禁忌食物');
  if (forbiddenSection) {
    const rows = parseTable(forbiddenSection);
    result.forbiddenFoods = rows.map(row => {
      // 提取 severity 的主要部分（去掉括号内容）
      let severity = row[2] || '适量控制';
      severity = severity.replace(/[（(].*?[）)]/g, '').trim();
      return {
        food: row[0] || '',
        reason: row[1] || '',
        severity: severity
      };
    }).filter(f => f.food && f.food !== '食物');
  }

  // 关键注意事项
  const keyNotesSection = extractSection(content, '## 关键注意事项');
  if (keyNotesSection) {
    const items = keyNotesSection.match(/\d+\.\s*(.+)/g);
    if (items) {
      result.keyNotes = items.map(i => i.replace(/^\d+\.\s*/, '').trim());
    }
  }

  return result;
}

// 解析配餐方案
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

  // 解析元数据
  const weekMatch = content.match(/适用周期[:：]\s*第(\d+)周/);
  if (weekMatch) result.weekNumber = parseInt(weekMatch[1]);

  const targetMatch = content.match(/每日目标[:：]\s*(\d+)\s*kcal/);
  if (targetMatch) result.targetEnergy = parseInt(targetMatch[1]);

  // 解析每日食谱 - 只匹配纯日期标题，排除"## 周X营养汇总"
  const dayMatches = content.match(/## 周[一二三四五六日]\s*\n([\s\S]*?)(?=## 周[一二三四五六日]\s*\n|## 一周营养总览|$)/g);
  if (dayMatches) {
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    result.days = dayMatches.map((dayContent, idx) => {
      const dayName = dayNames[idx] || `第${idx + 1}天`;
      const meals = [];

      // 解析每餐
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

  // 解析每周汇总
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

  // 解析采购清单
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

// 解析运动处方
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

  // 日期
  const dateMatch = content.match(/\*\*生成日期\*\*[:：]\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) result.date = dateMatch[1];

  // 安全性评估
  const safetySection = extractSection(content, '## 一、运动安全性评估');
  if (safetySection) {
    // 评估表格
    const evalTable = safetySection.match(/### 1\.1[\s\S]*?(?=###|$)/);
    if (evalTable) {
      const rows = parseTable(evalTable[0]);
      result.safety.evaluations = rows.map(row => ({
        item: row[0] || '',
        status: row[1] || '',
        safety: row[2] || ''
      })).filter(e => e.item && e.item !== '评估项目');
    }

    // 禁忌
    const contraindMatch = safetySection.match(/### 1\.2[\s\S]*?(?=###|$)/);
    if (contraindMatch) {
      const items = contraindMatch[0].match(/-\s*(.+)/g);
      if (items) {
        result.safety.contraindications = items.map(i => i.replace(/^-\s*/, '').trim());
      }
    }
  }

  // 运动处方总则
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

    const maxHRMatch = prescriptionSection.match(/最大心率.*?(\d+)/);
    if (maxHRMatch) result.prescription.maxHR = parseInt(maxHRMatch[1]);
  }

  // 有氧运动
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

  // 抗阻训练
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

  // 柔韧与平衡
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

  // 一周运动计划
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

  // 单次运动流程
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

  // 运动与营养协同
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

// 主程序
const args = process.argv.slice(2);
const patientName = args[0];
const options = {
  only: null,      // --only <file>: 只更新指定文件
  force: false,    // --force: 强制重新生成
  skipValidation: false  // --skip-validation: 跳过验证
};

// 解析参数
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--only' && args[i + 1]) {
    options.only = args[i + 1];
    i++;
  } else if (args[i] === '--force') {
    options.force = true;
  } else if (args[i] === '--skip-validation') {
    options.skipValidation = true;
  }
}

if (!patientName || patientName.startsWith('--')) {
  console.error('用法: node data-transform.js <患者姓名> [选项]');
  console.error('');
  console.error('选项:');
  console.error('  --only <文件>       只更新指定文件 (health|nutrition|exercise|meal)');
  console.error('  --force             强制重新生成 (忽略现有 data.json)');
  console.error('  --skip-validation   跳过数据验证');
  console.error('');
  console.error('示例:');
  console.error('  node data-transform.js 夏先生');
  console.error('  node data-transform.js 夏先生 --only exercise');
  console.error('  node data-transform.js 夏先生 --force');
  process.exit(1);
}

const sourceDir = path.join('results', patientName);

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ 错误: 源目录不存在: ${sourceDir}`);
  console.error('提示: 请确保工作目录存在（如 results/夏先生/）');
  process.exit(1);
}

// 检查必需文件
const healthRecordPath = path.join(sourceDir, '健康档案.md');
if (!fs.existsSync(healthRecordPath)) {
  console.error(`❌ 错误: 必需文件不存在: ${healthRecordPath}`);
  console.error('提示: 请先运行 /parse-medical-record 或手动创建健康档案');
  process.exit(1);
}

console.log(`开始转换: ${patientName}`);

// 读取所有 Markdown 文件
try {
  var healthRecord = fs.readFileSync(healthRecordPath, 'utf-8');
} catch (e) {
  console.error(`❌ 错误: 无法读取健康档案: ${e.message}`);
  process.exit(1);
}

const nutritionAssessment = fs.existsSync(path.join(sourceDir, '营养评估.md'))
  ? fs.readFileSync(path.join(sourceDir, '营养评估.md'), 'utf-8')
  : null;
const exercisePrescription = fs.existsSync(path.join(sourceDir, '运动处方.md'))
  ? fs.readFileSync(path.join(sourceDir, '运动处方.md'), 'utf-8')
  : null;

// 读取所有配餐方案文件（支持多周）
const mealPlanFiles = fs.readdirSync(sourceDir)
  .filter(f => f.match(/^配餐方案_第\d+周\.md$/))
  .sort(); // 按文件名排序（第1周, 第2周, ...）

const mealPlans = [];
for (const file of mealPlanFiles) {
  const weekMatch = file.match(/第(\d+)周/);
  const weekNumber = weekMatch ? parseInt(weekMatch[1]) : 1;
  const content = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
  const parsed = parseMealPlan(content);
  if (parsed) {
    parsed.weekNumber = weekNumber; // 确保周数正确
    mealPlans.push(parsed);
  }
}

// 解析数据
const healthData = parseHealthRecord(healthRecord);
const nutritionData = parseNutritionAssessment(nutritionAssessment);
const exerciseData = parseExercisePrescription(exercisePrescription);

// 从健康档案获取日期，生成目标目录名
// 支持格式："建档日期: 2025-03-15" 或 "> 生成日期: 2025-04-07"
const dateMatch = healthRecord.match(/(?:建档日期|生成日期)[:：]\s*(\d{4}[-/]\d{2}[-/]\d{2})/);
const dateStr = dateMatch ? dateMatch[1].replace(/\//g, '-') : new Date().toISOString().split('T')[0];
const targetDirName = `${healthData.name || patientName}_${dateStr}`;
const targetDir = path.join('results', targetDirName);

// 创建目标目录
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`创建目录: ${targetDirName}`);
}

// 复制 Markdown 文件到目标目录（如果不存在）
const filesToCopy = [
  '健康档案.md',
  '营养评估.md',
  '运动处方.md'
];
let copiedCount = 0;
for (const file of filesToCopy) {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
    try {
      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
    } catch (e) {
      console.warn(`⚠️ 复制文件失败: ${file} - ${e.message}`);
    }
  }
}

// 复制所有配餐方案文件（支持多周）
for (const file of mealPlanFiles) {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  if (!fs.existsSync(targetPath)) {
    try {
      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
    } catch (e) {
      console.warn(`⚠️ 复制文件失败: ${file} - ${e.message}`);
    }
  }
}

if (copiedCount > 0) {
  console.log(`复制 ${copiedCount} 个文件到新目录`);
}

// 生成或复用 ID 和查看码
let id = uuidv4();
let viewCode = generateViewCode();
let existingData = null;
const existingDataPath = path.join(targetDir, 'data.json');
if (fs.existsSync(existingDataPath) && !options.force) {
  try {
    existingData = JSON.parse(fs.readFileSync(existingDataPath, 'utf-8'));
    if (existingData.id) id = existingData.id;
    if (existingData.viewCode) viewCode = existingData.viewCode;
    console.log('复用已有 ID 和查看码');
  } catch (e) {
    console.log('生成新的 ID 和查看码');
  }
} else if (options.force) {
  console.log('强制重新生成 (--force)');
}

// 组装最终数据
// 支持增量更新：--only 参数只更新指定部分
let finalData;
if (options.only && existingData) {
  // 增量更新模式
  console.log(`\n📝 增量更新: ${options.only}`);
  finalData = { ...existingData };

  switch (options.only) {
    case 'health':
      Object.assign(finalData, healthData);
      break;
    case 'nutrition':
      finalData.nutritionAssessment = nutritionData;
      break;
    case 'meal':
      finalData.mealPlans = mealPlans;
      break;
    case 'exercise':
      finalData.exercisePrescription = exerciseData;
      break;
    default:
      console.error(`❌ 未知的 --only 值: ${options.only}`);
      console.error('支持的值: health, nutrition, meal, exercise');
      process.exit(1);
  }
} else {
  // 全量更新模式
  finalData = {
    id,
    viewCode,
    ...healthData,
    nutritionAssessment: nutritionData,
    mealPlans: mealPlans,  // 支持多周配餐
    exercisePrescription: exerciseData
  };
}

// 验证数据
const { validateData, formatValidationResult } = require('./validate-schema');
const validation = validateData(finalData);
if (!validation.valid) {
  console.warn('\n⚠️ 数据验证警告:');
  validation.errors.forEach(err => console.warn(`  - ${err}`));
}

// 保存到目标目录
fs.writeFileSync(existingDataPath, JSON.stringify(finalData, null, 2), 'utf-8');

console.log('\n✓ 转换完成!');
console.log(`  患者: ${finalData.name}`);
console.log(`  目录: ${targetDirName}`);
console.log(`  查看码: ${viewCode}`);
console.log(`  检验组数: ${finalData.labGroups.length}`);
console.log(`  宏量营养素: ${finalData.nutritionAssessment?.macros.length || 0}`);
console.log(`  配餐方案: ${finalData.mealPlans.length} 周`);
console.log(`  运动处方: ${finalData.exercisePrescription ? '有' : '无'}`);
