/**
 * JSON Schema 验证
 * 验证 data.json 数据完整性
 */

const VALID_STATUS = ['normal', 'high', 'low', 'very_high', 'very_low'];
const VALID_SEVERITY = ['完全禁止', '严格限制', '适量控制'];

/**
 * 验证 data.json 数据
 * @param {object} data - 解析后的 data.json
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateData(data) {
  const errors = [];

  // 1. 必填字段检查
  const requiredFields = ['id', 'viewCode', 'name', 'labGroups'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`缺少必填字段: ${field}`);
    }
  }

  // 2. ID 格式检查 (UUID)
  if (data.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)) {
    errors.push(`id 格式不正确 (应为 UUID): ${data.id}`);
  }

  // 3. viewCode 格式检查 (18位小写字母+数字)
  if (data.viewCode && !/^[a-z0-9]{18}$/.test(data.viewCode)) {
    errors.push(`viewCode 格式不正确 (应为 18 位小写字母+数字): ${data.viewCode}`);
  }

  // 4. labGroups 检查
  if (data.labGroups) {
    if (!Array.isArray(data.labGroups) || data.labGroups.length === 0) {
      errors.push('labGroups 必须是非空数组');
    } else {
      data.labGroups.forEach((group, gIdx) => {
        if (!group.title) {
          errors.push(`labGroups[${gIdx}] 缺少 title`);
        }
        if (!Array.isArray(group.results)) {
          errors.push(`labGroups[${gIdx}] results 必须是数组`);
        } else {
          group.results.forEach((result, rIdx) => {
            // status 枚举检查
            if (result.status && !VALID_STATUS.includes(result.status)) {
              errors.push(`labGroups[${gIdx}].results[${rIdx}].status 无效: ${result.status}`);
            }
          });
        }
      });
    }
  }

  // 5. nutritionAssessment 检查
  if (data.nutritionAssessment) {
    const na = data.nutritionAssessment;

    // macros 检查
    if (na.macros) {
      if (!Array.isArray(na.macros) || na.macros.length < 3) {
        errors.push('nutritionAssessment.macros 至少包含 3 项');
      } else {
        na.macros.forEach((macro, mIdx) => {
          if (typeof macro.target !== 'number') {
            errors.push(`nutritionAssessment.macros[${mIdx}].target 应为数字`);
          }
          if (typeof macro.percent !== 'number') {
            errors.push(`nutritionAssessment.macros[${mIdx}].percent 应为数字`);
          }
        });
      }
    }

    // forbiddenFoods 检查
    if (na.forbiddenFoods) {
      na.forbiddenFoods.forEach((food, fIdx) => {
        if (food.severity && !VALID_SEVERITY.includes(food.severity)) {
          errors.push(`nutritionAssessment.forbiddenFoods[${fIdx}].severity 无效: ${food.severity}`);
        }
      });
    }
  }

  // 6. mealPlans 检查
  if (data.mealPlans && data.mealPlans.length > 0) {
    data.mealPlans.forEach((plan, pIdx) => {
      if (!Array.isArray(plan.days) || plan.days.length === 0) {
        errors.push(`mealPlans[${pIdx}] days 必须是非空数组`);
      }
      if (typeof plan.weekNumber !== 'number') {
        errors.push(`mealPlans[${pIdx}].weekNumber 应为数字`);
      }
    });
  }

  // 7. exercisePrescription 检查
  if (data.exercisePrescription) {
    const ex = data.exercisePrescription;
    if (ex.phases && ex.phases.length === 0) {
      errors.push('exercisePrescription.phases 必须是非空数组');
    }
  }

  // 8. 数值类型检查
  const numericFields = ['age', 'height', 'weight', 'bmi'];
  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== 'number') {
      errors.push(`${field} 应为数字类型`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 格式化验证结果
 */
function formatValidationResult(result) {
  if (result.valid) {
    return '✓ 数据验证通过';
  }

  let output = `✗ 数据验证失败 (${result.errors.length} 个错误):\n`;
  result.errors.forEach((err, idx) => {
    output += `  ${idx + 1}. ${err}\n`;
  });
  return output;
}

module.exports = { validateData, formatValidationResult };

// 如果直接运行脚本，验证指定患者的 data.json
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');

  const patientName = process.argv[2];
  const resultsDir = path.join(__dirname, '..', 'results');

  if (!patientName) {
    console.error('用法: node validate-schema.js <患者姓名>');
    console.error('示例: node validate-schema.js 夏先生');
    process.exit(1);
  }

  // 查找患者目录（优先使用带日期的目录）
  const dirs = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith(patientName))
    .filter(f => fs.statSync(path.join(resultsDir, f)).isDirectory())
    .filter(f => fs.existsSync(path.join(resultsDir, f, 'data.json')))
    .sort();

  if (dirs.length === 0) {
    console.error(`未找到患者目录: ${patientName}`);
    process.exit(1);
  }

  // 使用最后一个（最新的）带 data.json 的目录
  const patientDir = dirs[dirs.length - 1];
  const dataPath = path.join(resultsDir, patientDir, 'data.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`未找到 data.json: ${dataPath}`);
    process.exit(1);
  }

  console.log(`验证: ${patientDir}\n`);

  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const result = validateData(data);
    console.log(formatValidationResult(result));

    if (!result.valid) {
      process.exit(1);
    }
  } catch (e) {
    console.error(`验证失败: ${e.message}`);
    process.exit(1);
  }
}
