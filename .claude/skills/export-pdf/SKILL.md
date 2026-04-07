---
name: export-pdf
description: 将患者的营养方案导出为专业 PDF 报告，包含健康档案、营养评估、配餐方案和运动处方。
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

1. **封面页** - 患者姓名、报告日期、机构信息
2. **健康档案** - 基本信息、检验指标、诊断、用药
3. **营养评估** - 能量目标、营养素分配、饮食原则
4. **配餐方案** - 每日食谱、营养核算、采购清单
5. **运动处方** - 运动建议、注意事项、进阶计划
6. **免责声明** - 医疗免责声明

## 使用方法

### 前置准备

在使用本 skill 前，请确保已安装依赖：

```bash
# 安装 Playwright（仅需首次）
cd /Users/bytedance/projects/营养方案
npm install -g playwright
npx playwright install chromium
```

### 方式 1: 导出单个患者

```
/export-pdf 张先生
```

### 方式 2: 导出所有患者

```
/export-pdf
```

### 方式 3: 直接使用脚本

```bash
cd /Users/bytedance/projects/营养方案
node scripts/export-pdf.js 张先生    # 单个患者
node scripts/export-pdf.js            # 所有患者
```

## 处理步骤

### 步骤 1: 检查依赖

确保已安装 Node.js 和 Playwright：

```bash
# 检查 Node.js
node -v

# 安装 Playwright（如未安装）
npm install -g playwright
npx playwright install chromium
```

### 步骤 2: 读取患者数据

读取以下 Markdown 文件（如存在）：
- `results/<患者>/健康档案.md`
- `results/<患者>/营养评估.md`
- `results/<患者>/配餐方案_第N周.md`（可多份）
- `results/<患者>/运动处方.md`

### 步骤 3: 生成 HTML

使用以下样式生成 HTML：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    .cover {
      page-break-after: always;
      text-align: center;
      padding-top: 150px;
    }
    .cover h1 {
      font-size: 28pt;
      color: #2c5282;
      margin-bottom: 40px;
    }
    .cover .info {
      font-size: 14pt;
      color: #666;
      line-height: 2;
    }
    h2 {
      color: #2c5282;
      border-bottom: 2px solid #2c5282;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    h3 {
      color: #4a5568;
      margin-top: 20px;
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
    }
    .highlight {
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .warning {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 12px;
      margin: 15px 0;
    }
    .tip {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 12px;
      margin: 15px 0;
    }
    .disclaimer {
      margin-top: 40px;
      padding: 20px;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #666;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <!-- 内容 -->
</body>
</html>
```

### 步骤 4: 转换为 PDF

使用 Playwright 将 HTML 转为 PDF：

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(htmlContent);
await page.pdf({
  path: '营养方案报告.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
});
await browser.close();
```

### 步骤 5: 验证输出

- 检查 PDF 文件是否生成
- 确认文件大小合理（> 10KB）
- 向用户报告导出结果

## HTML 生成规则

### 封面页

```html
<div class="cover">
  <h1>个性化营养方案报告</h1>
  <div class="info">
    <p>患者姓名：{name}</p>
    <p>报告日期：{date}</p>
    <p>生成机构：AI 营养咨询系统</p>
  </div>
</div>
```

### 健康档案

- 基本信息：表格展示
- 检验指标：分组表格，异常值用颜色标注
- 诊断列表：带图标的列表
- 用药信息：表格展示

### 营养评估

- 能量计算：突出显示 BMR、TDEE、目标能量
- 营养素目标：表格展示（名称、目标值、单位、比例）
- 饮食原则：带序号的列表
- 推荐/禁忌食物：分类展示

### 配餐方案

- 每日食谱：三餐表格，包含食物、份量、做法
- 营养核算：每日总量表格
- 采购清单：按类别分组

### 运动处方

- 运动参数：突出显示框
- 运动计划：表格或列表
- 注意事项：警告样式
- 停止条件：红色警告框

## 注意事项

1. **字体支持**：确保中文字体正确显示（使用系统默认中文字体）
2. **分页控制**：每个章节从新页开始
3. **表格分页**：长表格允许跨页
4. **图片处理**：如有图片，需转为 base64 嵌入
5. **文件大小**：优化 HTML 避免生成过大的 PDF

## 错误处理

- 如患者目录不存在，报错提示
- 如 Markdown 文件不存在，跳过该章节
- 如 Playwright 未安装，提示安装命令
- 如 PDF 生成失败，保留 HTML 文件供手动转换

## 输出示例

```
✅ 张先生 - 营养方案报告.pdf (245 KB)
   - 健康档案: ✓
   - 营养评估: ✓
   - 配餐方案: ✓ (第1周)
   - 运动处方: ✓

输出路径: results/张先生/营养方案报告.pdf
```
