const fs = require('fs');
const path = require('path');
const {
  uuidv4, generateViewCode,
  parseHealthRecord, parseNutritionAssessment,
  parseMealPlan, parseExercisePrescription
} = require('./parse-markdown');

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
