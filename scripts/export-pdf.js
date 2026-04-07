#!/usr/bin/env node
/**
 * PDF 报告导出脚本 - 紧凑版
 * 将 Markdown 营养方案转换为高密度 PDF 报告
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

// 解析 Markdown 文件
async function parseMarkdown(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

// 提取关键数据
function extractHealthProfile(content) {
  const data = {
    name: '', gender: '', age: '', height: '', weight: '', bmi: '',
    bloodPressure: '', diagnoses: [], medications: [], labResults: []
  };

  // 提取基本信息
  const nameMatch = content.match(/姓名[:：]\s*(.+)/);
  if (nameMatch) data.name = nameMatch[1].trim();

  const genderMatch = content.match(/性别[:：]\s*(.+)/);
  if (genderMatch) data.gender = genderMatch[1].trim();

  const ageMatch = content.match(/年龄[:：]\s*(\d+)/);
  if (ageMatch) data.age = ageMatch[1];

  const heightMatch = content.match(/身高[:：]\s*(\d+)/);
  if (heightMatch) data.height = heightMatch[1];

  const weightMatch = content.match(/体重[:：]\s*(\d+)/);
  if (weightMatch) data.weight = weightMatch[1];

  const bmiMatch = content.match(/BMI[:：]\s*([\d.]+)/);
  if (bmiMatch) data.bmi = bmiMatch[1];

  // 提取诊断
  const diagnosesSection = content.match(/## 诊断[\s\S]*?(?=##|$)/);
  if (diagnosesSection) {
    data.diagnoses = diagnosesSection[0].match(/^-\s*(.+)/gm)?.map(s => s.replace(/^-\s*/, '')) || [];
  }

  return data;
}

// 紧凑 HTML 生成
function generateCompactHTML(patientName, data) {
  const today = new Date().toLocaleDateString('zh-CN');

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>营养方案报告 - ${patientName}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #222;
    }

    /* 紧凑头部 */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1a5fb4;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-left h1 {
      font-size: 16pt;
      color: #1a5fb4;
      margin: 0;
    }
    .header-left .subtitle {
      font-size: 8pt;
      color: #666;
    }
    .header-right {
      text-align: right;
      font-size: 8pt;
    }
    .header-right .label { color: #666; }
    .header-right .value { color: #1a5fb4; font-weight: bold; }

    /* 紧凑分区 */
    .section {
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #1a5fb4;
      border-left: 3px solid #1a5fb4;
      padding-left: 6px;
      margin-bottom: 6px;
    }

    /* 紧凑信息网格 */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px 12px;
      font-size: 8pt;
      margin-bottom: 8px;
    }
    .info-item {
      display: flex;
    }
    .info-label {
      color: #666;
      min-width: 40px;
    }
    .info-value {
      font-weight: 600;
    }

    /* 紧凑表格 */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 6px;
    }
    th, td {
      border: 0.5px solid #ccc;
      padding: 3px 5px;
      text-align: left;
    }
    th {
      background: #e8f0fe;
      font-weight: 600;
      font-size: 7.5pt;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    td:first-child {
      font-weight: 500;
    }

    /* 状态标签 */
    .status {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 2px;
      font-size: 7pt;
      font-weight: bold;
    }
    .status-high { background: #fee2e2; color: #c53030; }
    .status-low { background: #dbeafe; color: #1e40af; }
    .status-normal { background: #d1fae5; color: #047857; }

    /* 紧凑列表 */
    .compact-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .compact-list li {
      padding: 2px 0;
      padding-left: 12px;
      position: relative;
      font-size: 8pt;
    }
    .compact-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #1a5fb4;
    }

    /* 紧凑卡片 */
    .card {
      border: 0.5px solid #ddd;
      border-radius: 4px;
      padding: 6px;
      margin-bottom: 6px;
    }
    .card-header {
      font-weight: bold;
      font-size: 9pt;
      color: #1a5fb4;
      margin-bottom: 4px;
      border-bottom: 1px dashed #ddd;
      padding-bottom: 2px;
    }

    /* 紧凑数值展示 */
    .metrics-row {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .metric {
      flex: 1;
      background: linear-gradient(135deg, #1a5fb4 0%, #3b82f6 100%);
      color: white;
      padding: 6px;
      border-radius: 4px;
      text-align: center;
    }
    .metric-value {
      font-size: 14pt;
      font-weight: bold;
    }
    .metric-unit {
      font-size: 7pt;
      opacity: 0.9;
    }
    .metric-label {
      font-size: 7pt;
      margin-top: 2px;
      opacity: 0.9;
    }

    /* 紧凑警告 */
    .warning-inline {
      background: #fff7ed;
      border-left: 2px solid #f97316;
      padding: 4px 6px;
      margin: 4px 0;
      font-size: 8pt;
    }

    /* 两列布局 */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    /* 紧凑餐次 */
    .meal-card {
      border: 0.5px solid #ddd;
      padding: 4px 6px;
      margin-bottom: 4px;
      border-radius: 3px;
    }
    .meal-title {
      font-weight: bold;
      font-size: 8pt;
      color: #b45309;
      margin-bottom: 2px;
    }
    .meal-item {
      font-size: 7.5pt;
      padding: 1px 0;
    }

    /* 分页控制 */
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }

    /* 页脚 */
    .footer {
      margin-top: 12px;
      padding-top: 6px;
      border-top: 1px solid #ddd;
      font-size: 7pt;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- 紧凑头部 -->
  <div class="header">
    <div class="header-left">
      <h1>营养方案报告</h1>
      <div class="subtitle">Personalized Nutrition Plan</div>
    </div>
    <div class="header-right">
      <div><span class="label">患者：</span><span class="value">${patientName}</span></div>
      <div><span class="label">日期：</span><span class="value">${today}</span></div>
    </div>
  </div>
`;

  // 健康档案
  if (data.healthProfile) {
    const health = extractHealthProfile(data.healthProfile);
    html += `
  <div class="section">
    <div class="section-title">一、健康档案</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">姓名：</span><span class="info-value">${health.name || patientName}</span></div>
      <div class="info-item"><span class="info-label">性别：</span><span class="info-value">${health.gender || '-'}</span></div>
      <div class="info-item"><span class="info-label">年龄：</span><span class="info-value">${health.age || '-'}岁</span></div>
      <div class="info-item"><span class="info-label">身高：</span><span class="info-value">${health.height || '-'}cm</span></div>
      <div class="info-item"><span class="info-label">体重：</span><span class="info-value">${health.weight || '-'}kg</span></div>
      <div class="info-item"><span class="info-label">BMI：</span><span class="info-value">${health.bmi || '-'}</span></div>
      <div class="info-item"><span class="info-label">血压：</span><span class="info-value">${health.bloodPressure || '-'}</span></div>
    </div>
    ${health.diagnoses.length ? `
    <div class="avoid-break">
      <strong>诊断：</strong>
      <ul class="compact-list">
        ${health.diagnoses.map(d => `<li>${d}</li>`).join('')}
      </ul>
    </div>` : ''}
  </div>
`;
  }

  // 营养评估
  if (data.nutritionAssessment) {
    html += renderCompactNutrition(data.nutritionAssessment);
  }

  // 配餐方案
  if (data.mealPlans) {
    html += renderCompactMealPlans(data.mealPlans);
  }

  // 运动处方
  if (data.exercisePrescription) {
    html += renderCompactExercise(data.exercisePrescription);
  }

  // 页脚
  html += `
  <div class="footer">
    本报告由 AI 辅助生成，仅供参考，不构成医疗建议。如有疑问请咨询专业医生。
  </div>
</body>
</html>`;

  return html;
}

// 紧凑营养评估
function renderCompactNutrition(content) {
  // 提取关键数值
  const bmr = content.match(/BMR.*?([\d,]+)\s*kcal/i)?.[1]?.replace(',', '') || '';
  const tdee = content.match(/TDEE.*?([\d,]+)\s*kcal/i)?.[1]?.replace(',', '') || '';
  const target = content.match(/目标能量[:：]\s*([\d,]+)/i)?.[1]?.replace(',', '') || '';

  return `
  <div class="section avoid-break">
    <div class="section-title">二、营养评估</div>
    <div class="metrics-row">
      ${bmr ? `<div class="metric"><div class="metric-value">${bmr}</div><div class="metric-unit">kcal</div><div class="metric-label">基础代谢</div></div>` : ''}
      ${tdee ? `<div class="metric"><div class="metric-value">${tdee}</div><div class="metric-unit">kcal</div><div class="metric-label">总消耗</div></div>` : ''}
      ${target ? `<div class="metric"><div class="metric-value">${target}</div><div class="metric-unit">kcal</div><div class="metric-label">目标摄入</div></div>` : ''}
    </div>
    ${renderMarkdownCompact(content)}
  </div>
`;
}

// 紧凑配餐方案
function renderCompactMealPlans(content) {
  const days = content.match(/##\s*周[一二三四五六日][\s\S]*?(?=##|$)/g) || [];

  let html = `
  <div class="section">
    <div class="section-title">三、配餐方案</div>
`;

  days.slice(0, 3).forEach(day => {
    const dayName = day.match(/##\s*(周[一二三四五六日])/)?.[1] || '';
    const meals = day.match(/###\s*(早餐|午餐|晚餐)[\s\S]*?(?=###|$)/g) || [];

    html += `<div class="avoid-break"><strong>${dayName}</strong>`;
    meals.forEach(meal => {
      const mealName = meal.match(/###\s*(早餐|午餐|晚餐)/)?.[1] || '';
      const items = meal.match(/-\s*(.+)/g) || [];

      html += `
        <div class="meal-card">
          <div class="meal-title">${mealName}</div>
          ${items.map(i => `<div class="meal-item">${i.replace(/^-\s*/, '')}</div>`).join('')}
        </div>`;
    });
    html += `</div>`;
  });

  if (days.length > 3) {
    html += `<div style="font-size:8pt;color:#666;text-align:center;margin-top:4px;">... 共 ${days.length} 天方案，详见完整文档 ...</div>`;
  }

  html += `</div>`;
  return html;
}

// 紧凑运动处方
function renderCompactExercise(content) {
  return `
  <div class="section avoid-break">
    <div class="section-title">四、运动处方</div>
    ${renderMarkdownCompact(content)}
  </div>
`;
}

// 紧凑 Markdown 渲染
function renderMarkdownCompact(md) {
  let html = md
    .replace(/^###\s*(.+)$/gm, '<strong style="color:#1a5fb4;">$1</strong>')
    .replace(/^##\s*(.+)$/gm, '')
    .replace(/^#\s*(.+)$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:1px 3px;border-radius:2px;font-size:7.5pt;">$1</code>')
    .replace(/^\|\s*([^|]+)\|([^|]+)\|/gm, '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dotted #ddd;"><span>$1</span><span style="color:#1a5fb4;font-weight:500;">$2</span></div>')
    .replace(/^-\s*(.+)$/gm, '<li style="margin:1px 0;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:#1a5fb4;">•</span>$1</li>')
    .replace(/\n{3,}/g, '\n\n');

  return `<div style="font-size:8pt;">${html}</div>`;
}

// 主函数
async function exportPDF(patientName) {
  const resultsDir = path.join(process.cwd(), 'results');
  const patientDir = path.join(resultsDir, patientName);

  try {
    await fs.access(patientDir);
  } catch {
    console.error(`❌ 找不到患者目录: ${patientName}`);
    process.exit(1);
  }

  console.log(`📄 导出 "${patientName}" 的 PDF 报告...`);

  const data = {};
  const files = [
    ['healthProfile', '健康档案.md'],
    ['nutritionAssessment', '营养评估.md'],
    ['mealPlans', '配餐方案_第1周.md'],
    ['mealPlans', '配餐方案.md'],
    ['exercisePrescription', '运动处方.md']
  ];

  for (const [key, filename] of files) {
    const content = await parseMarkdown(path.join(patientDir, filename));
    if (content && !data[key]) {
      data[key] = content;
    }
  }

  const html = generateCompactHTML(patientName, data);

  // 保存 HTML
  const htmlPath = path.join(patientDir, '营养方案报告.html');
  await fs.writeFile(htmlPath, html, 'utf-8');

  // 生成 PDF
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });

  const pdfPath = path.join(patientDir, '营养方案报告.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' }
  });

  await browser.close();

  const stats = await fs.stat(pdfPath);
  const sizeKB = Math.round(stats.size / 1024);

  console.log(`✅ 导出成功: ${pdfPath} (${sizeKB} KB)`);
  return pdfPath;
}

// 批量导出
async function exportAll() {
  const resultsDir = path.join(process.cwd(), 'results');
  const entries = await fs.readdir(resultsDir, { withFileTypes: true });
  const patients = entries.filter(e => e.isDirectory()).map(e => e.name);

  console.log(`发现 ${patients.length} 个患者\n`);

  for (const patient of patients) {
    try {
      await exportPDF(patient);
    } catch (err) {
      console.error(`❌ "${patient}" 失败: ${err.message}`);
    }
  }
}

// 命令行
const patientName = process.argv[2];
if (patientName) {
  exportPDF(patientName).catch(err => {
    console.error('❌ 失败:', err.message);
    process.exit(1);
  });
} else {
  exportAll().catch(err => {
    console.error('❌ 批量失败:', err.message);
    process.exit(1);
  });
}
