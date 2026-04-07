#!/usr/bin/env node
/**
 * PDF 报告导出脚本
 * 将 Markdown 营养方案转换为 PDF 报告
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

// 生成 HTML 报告
function generateHTML(patientName, data) {
  const today = new Date().toLocaleDateString('zh-CN');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>营养方案报告 - ${patientName}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .cover {
      page-break-after: always;
      text-align: center;
      padding-top: 120px;
      min-height: 100vh;
    }
    .cover h1 {
      font-size: 32pt;
      color: #1a5fb4;
      margin-bottom: 60px;
      font-weight: 600;
    }
    .cover .subtitle {
      font-size: 16pt;
      color: #666;
      margin-bottom: 80px;
    }
    .cover .info-box {
      display: inline-block;
      text-align: left;
      background: #f8f9fa;
      padding: 40px 60px;
      border-radius: 8px;
      border-left: 4px solid #1a5fb4;
    }
    .cover .info-box p {
      font-size: 14pt;
      color: #444;
      margin: 12px 0;
      line-height: 1.8;
    }
    .cover .info-box .label {
      color: #666;
      display: inline-block;
      width: 100px;
    }
    .cover .info-box .value {
      color: #1a5fb4;
      font-weight: 600;
    }
    h2 {
      color: #1a5fb4;
      border-bottom: 2px solid #1a5fb4;
      padding-bottom: 10px;
      margin-top: 40px;
      font-size: 18pt;
      page-break-after: avoid;
    }
    h3 {
      color: #4a5568;
      margin-top: 25px;
      font-size: 14pt;
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #edf2f7;
      font-weight: 600;
      color: #2d3748;
    }
    tr:nth-child(even) {
      background: #f7fafc;
    }
    .highlight-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .highlight-box h4 {
      margin: 0 0 10px 0;
      font-size: 14pt;
    }
    .energy-display {
      display: flex;
      justify-content: space-around;
      text-align: center;
      margin: 20px 0;
    }
    .energy-item {
      background: #f0f7ff;
      padding: 15px 25px;
      border-radius: 8px;
      border: 2px solid #1a5fb4;
    }
    .energy-item .number {
      font-size: 24pt;
      font-weight: bold;
      color: #1a5fb4;
    }
    .energy-item .unit {
      font-size: 10pt;
      color: #666;
    }
    .energy-item .label {
      font-size: 11pt;
      color: #444;
      margin-top: 5px;
    }
    .warning {
      background: #fff5f5;
      border-left: 4px solid #e53e3e;
      padding: 12px 15px;
      margin: 15px 0;
      color: #c53030;
    }
    .tip {
      background: #f0fff4;
      border-left: 4px solid #38a169;
      padding: 12px 15px;
      margin: 15px 0;
      color: #276749;
    }
    .meal-section {
      background: #fffaf0;
      border: 1px solid #fbd38d;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
    }
    .meal-section h4 {
      color: #c05621;
      margin: 0 0 10px 0;
      font-size: 12pt;
    }
    .meal-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px dashed #fbd38d;
    }
    .meal-item:last-child {
      border-bottom: none;
    }
    .page-break {
      page-break-before: always;
    }
    .section {
      page-break-inside: avoid;
    }
    .disclaimer {
      margin-top: 50px;
      padding: 20px;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 9pt;
      color: #718096;
      page-break-inside: avoid;
    }
    .disclaimer h3 {
      color: #e53e3e;
      margin-top: 0;
    }
    ul, ol {
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
    .status-high { color: #e53e3e; font-weight: bold; }
    .status-low { color: #3182ce; font-weight: bold; }
    .status-normal { color: #38a169; }
  </style>
</head>
<body>
  <!-- 封面 -->
  <div class="cover">
    <h1>个性化营养方案报告</h1>
    <div class="subtitle">Personalized Nutrition Plan Report</div>
    <div class="info-box">
      <p><span class="label">患者姓名：</span><span class="value">${patientName}</span></p>
      <p><span class="label">报告日期：</span><span class="value">${today}</span></p>
      <p><span class="label">生成机构：</span><span class="value">AI 营养咨询系统</span></p>
    </div>
  </div>

  <!-- 健康档案 -->
  ${data.healthProfile ? renderHealthProfile(data.healthProfile) : ''}

  <!-- 营养评估 -->
  ${data.nutritionAssessment ? renderNutritionAssessment(data.nutritionAssessment) : ''}

  <!-- 配餐方案 -->
  ${data.mealPlans ? renderMealPlans(data.mealPlans) : ''}

  <!-- 运动处方 -->
  ${data.exercisePrescription ? renderExercisePrescription(data.exercisePrescription) : ''}

  <!-- 免责声明 -->
  <div class="disclaimer page-break">
    <h3>⚠️ 免责声明</h3>
    <p>本报告由 AI 辅助生成，仅提供营养参考信息，不构成医疗诊断或治疗建议。患有疾病者请务必遵医嘱，如有疑问请咨询注册营养师或主治医生。</p>
    <p>本报告中的营养建议基于患者提供的信息和一般营养学原理，个体差异可能需要调整。在实施任何饮食或运动方案前，请咨询专业医疗人员。</p>
    <p>报告生成日期：${today}</p>
  </div>
</body>
</html>`;
}

// 渲染健康档案
function renderHealthProfile(content) {
  return `
  <div class="page-break">
    <h2>一、健康档案</h2>
    <div class="section">
      ${markdownToHTML(content)}
    </div>
  </div>`;
}

// 渲染营养评估
function renderNutritionAssessment(content) {
  return `
  <div class="page-break">
    <h2>二、营养评估</h2>
    <div class="section">
      ${markdownToHTML(content)}
    </div>
  </div>`;
}

// 渲染配餐方案
function renderMealPlans(content) {
  return `
  <div class="page-break">
    <h2>三、配餐方案</h2>
    <div class="section">
      ${markdownToHTML(content)}
    </div>
  </div>`;
}

// 渲染运动处方
function renderExercisePrescription(content) {
  return `
  <div class="page-break">
    <h2>四、运动处方</h2>
    <div class="section">
      ${markdownToHTML(content)}
    </div>
  </div>`;
}

// Markdown 转 HTML（简化版）
function markdownToHTML(markdown) {
  let html = markdown
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 引用块
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // 表格处理（简化）
    .replace(/\|([^\n]+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    // 无序列表
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    // 换行
    .replace(/\n/g, '<br>');

  // 包装段落
  html = '<p>' + html + '</p>';

  // 修复表格
  html = html.replace(/<tr>(.*?)<\/tr>/gs, (match, content) => {
    if (content.includes('<td>---</td>')) return '';
    return `<table>${match}</table>`;
  });

  // 修复列表
  html = html.replace(/(<li>.*<\/li>)+/gs, (match) => {
    return `<ul>${match}</ul>`;
  });

  return html;
}

// 主函数
async function exportPDF(patientName) {
  const resultsDir = path.join(process.cwd(), 'results');
  const patientDir = path.join(resultsDir, patientName);

  // 检查目录是否存在
  try {
    await fs.access(patientDir);
  } catch {
    console.error(`❌ 错误：找不到患者目录 "${patientName}"`);
    console.log(`请确保 results/${patientName}/ 目录存在`);
    process.exit(1);
  }

  console.log(`📄 正在导出 "${patientName}" 的 PDF 报告...\n`);

  // 读取所有 Markdown 文件
  const data = {};
  const files = {
    healthProfile: '健康档案.md',
    nutritionAssessment: '营养评估.md',
    mealPlans: '配餐方案.md',
    exercisePrescription: '运动处方.md'
  };

  for (const [key, filename] of Object.entries(files)) {
    const content = await parseMarkdown(path.join(patientDir, filename));
    if (content) {
      data[key] = content;
      console.log(`  ✅ 读取 ${filename}`);
    } else {
      console.log(`  ⚠️  跳过 ${filename}（不存在）`);
    }
  }

  if (Object.keys(data).length === 0) {
    console.error('\n❌ 错误：未找到任何 Markdown 文件');
    process.exit(1);
  }

  // 生成 HTML
  console.log('\n🎨 生成 HTML...');
  const html = generateHTML(patientName, data);

  // 保存 HTML（调试用）
  const htmlPath = path.join(patientDir, '营养方案报告.html');
  await fs.writeFile(htmlPath, html, 'utf-8');
  console.log(`  💾 已保存 HTML: ${htmlPath}`);

  // 使用 Playwright 生成 PDF
  console.log('\n📑 生成 PDF...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfPath = path.join(patientDir, '营养方案报告.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' }
    });

    // 获取文件大小
    const stats = await fs.stat(pdfPath);
    const sizeKB = Math.round(stats.size / 1024);

    console.log(`\n✅ 导出成功！`);
    console.log(`📄 ${pdfPath} (${sizeKB} KB)`);
    console.log(`\n包含内容：`);
    if (data.healthProfile) console.log('   • 健康档案');
    if (data.nutritionAssessment) console.log('   • 营养评估');
    if (data.mealPlans) console.log('   • 配餐方案');
    if (data.exercisePrescription) console.log('   • 运动处方');

  } catch (error) {
    console.error('\n❌ PDF 生成失败:', error.message);
    console.log('\n💡 提示：HTML 文件已保存，可手动用浏览器打印为 PDF');
    console.log(`   ${htmlPath}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

// 导出所有患者
async function exportAll() {
  const resultsDir = path.join(process.cwd(), 'results');

  try {
    const entries = await fs.readdir(resultsDir, { withFileTypes: true });
    const patients = entries.filter(e => e.isDirectory()).map(e => e.name);

    if (patients.length === 0) {
      console.error('❌ 错误：results/ 目录下没有患者文件夹');
      process.exit(1);
    }

    console.log(`发现 ${patients.length} 个患者:\n`);

    for (const patient of patients) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`处理: ${patient}`);
      console.log('='.repeat(50));
      try {
        await exportPDF(patient);
      } catch (error) {
        console.error(`\n❌ 导出 "${patient}" 失败:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ 错误：无法读取 results/ 目录');
    console.error(error.message);
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const patientName = args[0];

if (patientName) {
  exportPDF(patientName).catch(error => {
    console.error('❌ 导出失败:', error.message);
    process.exit(1);
  });
} else {
  exportAll().catch(error => {
    console.error('❌ 批量导出失败:', error.message);
    process.exit(1);
  });
}
