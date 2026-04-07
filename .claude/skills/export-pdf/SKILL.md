---
name: export-pdf
description: 将患者的营养方案导出为专业 PDF 报告，包含营养评估、配餐方案和运动处方（不含健康档案）。
argument-hint: <患者姓名>（留空则处理 results/ 下所有患者）
disable-model-invocation: true
---

# PDF 报告导出 Skill

将 `results/<患者姓名>/` 下的 Markdown 方案转换为专业格式的 PDF 报告。

## 输入

- `$ARGUMENTS`: 患者姓名（对应 `results/` 下的子目录名）
- 留空则遍历所有患者

## 输出

- `results/<患者姓名>/营养方案报告.pdf` - 完整的 PDF 报告
- `results/<患者姓名>/营养方案报告.html` - 中间 HTML 文件（可选保留）

## 报告内容结构

PDF 报告包含以下章节：

1. **封面页** - 患者姓名、报告日期
2. **营养评估** - 能量目标、营养素分配、饮食原则
3. **配餐方案** - 每日食谱（支持多周）
4. **运动处方** - 运动建议、注意事项、进阶计划

> 健康档案不包含在报告中。

## 处理步骤

### 步骤 1: 检查并安装依赖

```bash
cd /Users/bytedance/projects/营养方案

# 检查是否已有 package.json（scripts 目录下）
ls scripts/

# 安装依赖（marked 用于解析 Markdown，playwright 用于生成 PDF）
npm install --save-dev marked
npm install -g playwright
npx playwright install chromium
```

### 步骤 2: 生成导出脚本

在 `scripts/export-pdf.js` 写入以下完整脚本（**直接覆盖写入，不要手动编辑**）：

```javascript
const { chromium } = require('playwright');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(PROJECT_ROOT, 'results');

// ── CSS 模板 ──────────────────────────────────────────────
const CSS = `
@page { size: A4; margin: 18mm 20mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
  font-size: 10pt;
  line-height: 1.7;
  color: #1a1a2e;
  background: #fff;
}

/* ── 封面 ── */
.cover {
  page-break-after: always;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240mm;
  text-align: center;
  background: linear-gradient(160deg, #0f3460 0%, #16213e 60%, #1a1a2e 100%);
  color: #fff;
  margin: -18mm -20mm;
  padding: 40mm 30mm;
}
.cover-logo {
  font-size: 9pt;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #a0c4ff;
  margin-bottom: 20mm;
}
.cover h1 {
  font-size: 28pt;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 8mm;
  color: #fff;
}
.cover-subtitle {
  font-size: 12pt;
  color: #a0c4ff;
  margin-bottom: 20mm;
}
.cover-meta {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 6mm 12mm;
  font-size: 11pt;
  line-height: 2.2;
  color: #e0e0ff;
}
.cover-meta strong { color: #fff; }
.cover-disclaimer {
  margin-top: 16mm;
  font-size: 8pt;
  color: rgba(255,255,255,0.4);
}

/* ── 章节标题 ── */
.section-header {
  page-break-before: always;
  margin: 0 0 6mm 0;
  padding: 4mm 6mm;
  background: linear-gradient(90deg, #0f3460, #1a5fb4);
  border-radius: 4px;
  color: #fff;
}
.section-header h2 {
  font-size: 14pt;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
  border: none;
  margin: 0;
  padding: 0;
}
.section-header .section-sub {
  font-size: 8pt;
  color: rgba(255,255,255,0.7);
  margin-top: 1mm;
}

/* ── 正文标题 ── */
h1, h2, h3, h4 { font-weight: 600; }
h2 {
  font-size: 13pt;
  color: #0f3460;
  border-bottom: 2px solid #0f3460;
  padding-bottom: 2mm;
  margin: 6mm 0 3mm 0;
}
h3 {
  font-size: 11pt;
  color: #1a5fb4;
  border-left: 3px solid #1a5fb4;
  padding-left: 3mm;
  margin: 5mm 0 2mm 0;
}
h4 {
  font-size: 10pt;
  color: #2d6a4f;
  margin: 4mm 0 2mm 0;
}

/* ── 段落和列表 ── */
p { margin: 2mm 0; }
ul, ol { margin: 2mm 0 2mm 6mm; padding: 0; }
li { margin: 1mm 0; }
ul li { list-style: disc; }
ol li { list-style: decimal; }

/* ── 引用块（> 开头）→ 提示框 ── */
blockquote {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  border-radius: 0 4px 4px 0;
  padding: 3mm 4mm;
  margin: 3mm 0;
  color: #1e40af;
  font-size: 9.5pt;
}
blockquote p { margin: 0; }

/* ── 代码块 → 信息框 ── */
pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 3mm 4mm;
  margin: 3mm 0;
  font-family: "PingFang SC", "Microsoft YaHei", monospace;
  font-size: 8.5pt;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 8.5pt;
  font-family: "PingFang SC", "Microsoft YaHei", monospace;
}
pre code { background: none; padding: 0; }

/* ── 表格 ── */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 3mm 0;
  font-size: 9pt;
}
thead tr { background: #0f3460; color: #fff; }
thead th {
  padding: 2.5mm 3mm;
  font-weight: 600;
  text-align: left;
  border: 1px solid #0a2545;
}
tbody tr:nth-child(even) { background: #f0f4ff; }
tbody tr:hover { background: #e8f0fe; }
tbody td {
  padding: 2mm 3mm;
  border: 1px solid #d1d9e6;
  vertical-align: top;
}

/* ── 强调 ── */
strong { font-weight: 700; color: #0f3460; }
em { color: #1a5fb4; font-style: normal; font-weight: 500; }

/* ── hr 分隔线 ── */
hr {
  border: none;
  border-top: 1px dashed #cbd5e1;
  margin: 4mm 0;
}

/* ── 分页控制 ── */
.page-break { page-break-before: always; }
table { page-break-inside: auto; }
tr { page-break-inside: avoid; }

/* ── 页脚 ── */
.footer {
  position: fixed;
  bottom: 8mm;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 7.5pt;
  color: #94a3b8;
  border-top: 1px solid #e2e8f0;
  padding-top: 2mm;
}
`;

// ── 章节配置 ──────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'nutrition',
    title: '营养评估',
    subtitle: 'Nutrition Assessment',
    glob: (dir) => {
      const f = path.join(dir, '营养评估.md');
      return fs.existsSync(f) ? [f] : [];
    },
  },
  {
    key: 'meal',
    title: '配餐方案',
    subtitle: 'Meal Plan',
    glob: (dir) => {
      return fs.readdirSync(dir)
        .filter(f => f.startsWith('配餐方案') && f.endsWith('.md'))
        .sort()
        .map(f => path.join(dir, f));
    },
  },
  {
    key: 'exercise',
    title: '运动处方',
    subtitle: 'Exercise Prescription',
    glob: (dir) => {
      const f = path.join(dir, '运动处方.md');
      return fs.existsSync(f) ? [f] : [];
    },
  },
];

// ── 生成 HTML ─────────────────────────────────────────────
function buildHtml(patientName, patientDir) {
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // 封面
  let body = `
<div class="cover">
  <div class="cover-logo">AI Nutrition System</div>
  <h1>个性化营养方案报告</h1>
  <div class="cover-subtitle">Personalized Nutrition Plan</div>
  <div class="cover-meta">
    <div><strong>患者姓名</strong>　${patientName}</div>
    <div><strong>报告日期</strong>　${date}</div>
    <div><strong>生成机构</strong>　AI 营养咨询系统</div>
  </div>
  <div class="cover-disclaimer">本报告由 AI 辅助生成，仅供参考，不构成医疗建议</div>
</div>
`;

  const included = [];

  for (const section of SECTIONS) {
    const files = section.glob(patientDir);
    if (files.length === 0) continue;

    included.push(section.title);

    body += `
<div class="section-header">
  <h2>${section.title}</h2>
  <div class="section-sub">${section.subtitle}</div>
</div>
`;

    for (const file of files) {
      const md = fs.readFileSync(file, 'utf8');
      // 多个配餐文件之间加文件名小标题
      if (files.length > 1) {
        const fname = path.basename(file, '.md');
        body += `<h3>${fname}</h3>\n`;
      }
      body += marked.parse(md);
    }
  }

  return { html: wrapHtml(patientName, body), included };
}

function wrapHtml(patientName, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>营养方案报告 - ${patientName}</title>
  <style>${CSS}</style>
</head>
<body>
${body}
<div class="footer">营养方案报告 · ${patientName} · 仅供参考，不构成医疗建议</div>
</body>
</html>`;
}

// ── 导出单个患者 ──────────────────────────────────────────
async function exportPatient(patientName) {
  const patientDir = path.join(RESULTS_DIR, patientName);
  if (!fs.existsSync(patientDir)) {
    console.error(`❌ 目录不存在: ${patientDir}`);
    return false;
  }

  console.log(`\n📋 处理: ${patientName}`);

  const { html, included } = buildHtml(patientName, patientDir);

  const htmlPath = path.join(patientDir, '营养方案报告.html');
  const pdfPath = path.join(patientDir, '营养方案报告.pdf');

  fs.writeFileSync(htmlPath, html, 'utf8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();

  const size = Math.round(fs.statSync(pdfPath).size / 1024);
  console.log(`✅ ${patientName} - 营养方案报告.pdf (${size} KB)`);
  included.forEach(s => console.log(`   - ${s}: ✓`));
  console.log(`   输出路径: ${pdfPath}`);
  return true;
}

// ── 主入口 ────────────────────────────────────────────────
async function main() {
  const target = process.argv[2];

  if (target) {
    await exportPatient(target);
  } else {
    // 导出所有患者
    const patients = fs.readdirSync(RESULTS_DIR)
      .filter(d => fs.statSync(path.join(RESULTS_DIR, d)).isDirectory());

    if (patients.length === 0) {
      console.log('⚠️  results/ 目录下没有患者数据');
      return;
    }

    for (const p of patients) {
      await exportPatient(p);
    }
  }
}

main().catch(err => {
  console.error('❌ 导出失败:', err.message);
  process.exit(1);
});
```

### 步骤 3: 安装 marked 并运行

```bash
cd /Users/bytedance/projects/营养方案

# 若根目录没有 package.json，先初始化
[ -f package.json ] || npm init -y

# 安装 marked（Markdown 解析库）
npm install marked

# 运行导出
node scripts/export-pdf.js 张先生
```

### 步骤 4: 验证输出

- 检查 PDF 文件是否生成
- 确认文件大小合理（> 50KB）
- 向用户报告导出结果

## 设计说明

**为什么用 `marked` 解析 Markdown？**

之前的方式是手动将 Markdown 拼接成 HTML 字符串，导致 Markdown 语法符号（`---`、`` ` ``、`|` 等）直接暴露在文档中，格式混乱。

现在改为：
1. 读取原始 `.md` 文件
2. 用 `marked` 库正确解析成干净的 HTML（表格、列表、代码块、引用块全部自动转换）
3. 套用专业 CSS 模板后生成 PDF

**CSS 设计亮点：**
- 封面：深色渐变背景，现代感
- 章节标题：蓝色渐变色块，自动分页
- 表格：深色表头，隔行背景
- 引用块（`>`）：蓝色左边框提示框
- 代码块（` ``` `）：灰色背景信息框

## 错误处理

- 如患者目录不存在，报错提示
- 如 Markdown 文件不存在，跳过该章节
- 如 `marked` 未安装，提示 `npm install marked`
- 如 Playwright 未安装，提示安装命令

## 输出示例

```
✅ 张先生 - 营养方案报告.pdf (312 KB)
   - 营养评估: ✓
   - 配餐方案: ✓
   - 运动处方: ✓
   输出路径: results/张先生/营养方案报告.pdf
```
