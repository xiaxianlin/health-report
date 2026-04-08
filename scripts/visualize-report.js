#!/usr/bin/env node

/**
 * 可视化报告生成脚本
 * 读取 data.json 生成可视化 HTML 报告
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(PROJECT_ROOT, 'results');

// 颜色配置
const COLORS = {
  breakfast: '#E69F00',
  lunch: '#0072B2',
  dinner: '#56B4E9',
  snack: '#009E73',
  macros: {
    '蛋白质': '#0072B2',
    '碳水化合物': '#E69F00',
    '脂肪': '#009E73',
    '膳食纤维': '#CC79A7'
  }
};

/**
 * 获取状态样式类
 */
function getStatusClass(status) {
  const map = {
    'normal': 'status-normal',
    'high': 'status-high',
    'low': 'status-high',
    'very_high': 'status-very-high',
    'very_low': 'status-very-high'
  };
  return map[status] || '';
}

function getStatusBadgeClass(status) {
  const map = {
    'normal': 'badge-secondary',
    'high': 'badge-warning',
    'low': 'badge-warning',
    'very_high': 'badge-destructive',
    'very_low': 'badge-destructive'
  };
  return map[status] || 'badge-secondary';
}

function getStatusLabel(status) {
  const map = {
    'normal': '正常',
    'high': '偏高',
    'low': '偏低',
    'very_high': '超标',
    'very_low': '过低'
  };
  return map[status] || status;
}

function getSeverityClass(severity) {
  if (severity.includes('完全禁止')) return 'badge-destructive';
  if (severity.includes('严格限制')) return 'badge-warning';
  return 'badge-secondary';
}

function getIntensityClass(intensity) {
  if (intensity.includes('极低')) return 'intensity-low';
  if (intensity.includes('低')) return 'intensity-light';
  if (intensity.includes('中等')) return 'intensity-medium';
  if (intensity.includes('高')) return 'intensity-high';
  return 'intensity-moderate';
}

/**
 * 生成宏量营养素饼图 SVG
 */
function generatePieChartSVG(macros) {
  // 只取蛋白质、碳水、脂肪
  const mainMacros = macros.filter(m =>
    m.name === '蛋白质' || m.name === '碳水化合物' || m.name === '脂肪'
  );

  let svg = '<svg viewBox="0 0 200 200" class="h-48 w-48">';
  let currentAngle = 0;
  const center = 100;
  const radius = 80;

  mainMacros.forEach(macro => {
    const angle = (macro.percent / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const x1 = center + radius * Math.cos(Math.PI * startAngle / 180);
    const y1 = center + radius * Math.sin(Math.PI * startAngle / 180);
    const x2 = center + radius * Math.cos(Math.PI * endAngle / 180);
    const y2 = center + radius * Math.sin(Math.PI * endAngle / 180);

    const largeArc = angle > 180 ? 1 : 0;

    const color = COLORS.macros[macro.name] || '#999';

    svg += `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" />`;

    currentAngle += angle;
  });

  svg += '</svg>';
  return svg;
}

/**
 * 生成健康档案模块
 */
function generateProfileSection(data) {
  const labGroupsHtml = data.labGroups.map(group => `
    <div class="card">
      <div class="card-header"><h2 class="card-title">${group.title}</h2></div>
      <div class="card-content">
        <div class="table-container">
          <table class="table">
            <thead><tr><th>指标</th><th>结果</th><th>单位</th><th>参考范围</th><th>状态</th></tr></thead>
            <tbody>
              ${group.results.map(r => `
                <tr class="${getStatusClass(r.status)}">
                  <td class="font-medium">${r.indicator}</td>
                  <td>${r.value}</td>
                  <td>${r.unit}</td>
                  <td>${r.reference}</td>
                  <td><span class="badge ${getStatusBadgeClass(r.status)}">${getStatusLabel(r.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <!-- 基本信息 -->
    <div class="card">
      <div class="card-header">
        <div class="flex justify-between items-center">
          <h2 class="card-title">基本信息</h2>
          <span class="text-xs text-muted-foreground">${data.date}</span>
        </div>
      </div>
      <div class="card-content">
        <p class="text-lg font-bold mb-4">${data.name}</p>
        <div class="grid-4">
          <div><span class="text-xs text-muted-foreground">性别</span><p class="text-sm font-medium">${data.gender}</p></div>
          <div><span class="text-xs text-muted-foreground">年龄</span><p class="text-sm font-medium">${data.age} 岁</p></div>
          <div><span class="text-xs text-muted-foreground">身高</span><p class="text-sm font-medium">${data.height} cm</p></div>
          <div><span class="text-xs text-muted-foreground">体重</span><p class="text-sm font-medium">${data.weight} kg</p></div>
          <div>
            <span class="text-xs text-muted-foreground">BMI</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">${data.bmi}</span>
              <span class="badge badge-secondary">${data.bmiCategory}</span>
            </div>
          </div>
          <div><span class="text-xs text-muted-foreground">血压</span><p class="text-sm font-medium">${data.bloodPressure} mmHg</p></div>
        </div>
      </div>
    </div>

    <!-- 诊断 -->
    <div class="card">
      <div class="card-header"><h2 class="card-title">诊断</h2></div>
      <div class="card-content">
        <div class="flex flex-wrap gap-2">
          ${data.diagnoses.map((d, i) => `<span class="badge ${i === 0 ? 'badge-default' : 'badge-secondary'}">${d}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- 检验结果 -->
    ${labGroupsHtml}

    <!-- 用药信息 -->
    <div class="card">
      <div class="card-header"><h2 class="card-title">用药信息</h2></div>
      <div class="card-content">
        <div class="table-container">
          <table class="table">
            <thead><tr><th>药品</th><th>剂量</th><th>用途</th><th>备注</th></tr></thead>
            <tbody>
              ${data.medications.map(m => `
                <tr><td class="font-medium">${m.name}</td><td>${m.dose}</td><td>${m.purpose}</td><td>${m.note || '—'}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * 生成营养评估模块
 */
function generateAssessmentSection(data) {
  const na = data.nutritionAssessment;
  if (!na) return '<div class="card"><div class="card-content">暂无营养评估数据</div></div>';

  return `
    <!-- 能量计算 -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">能量计算 <span class="ml-2 text-sm font-normal text-muted-foreground">活动水平: ${na.activityLevel}</span></h2>
      </div>
      <div class="card-content">
        <div class="grid-3">
          <div class="stat-card">
            <div class="stat-value">${na.bmr}</div>
            <div class="stat-label">基础代谢率 (BMR) kcal</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${na.tdee}</div>
            <div class="stat-label">总能量消耗 (TDEE) kcal</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${na.targetEnergy}</div>
            <div class="stat-label">目标摄入能量 kcal</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 宏量营养素 -->
    <div class="card">
      <div class="card-header"><h2 class="card-title">宏量营养素目标</h2></div>
      <div class="card-content">
        <div class="flex items-center justify-center mb-6">
          ${generatePieChartSVG(na.macros)}
          <div class="ml-8 space-y-2">
            ${na.macros.filter(m => m.name !== '总能量').map(m => `
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background: ${COLORS.macros[m.name] || '#999'}"></span>
                <span class="text-sm">${m.name} ${m.percent}%</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="table-container">
          <table class="table">
            <thead><tr><th>营养素</th><th>目标量</th><th>占比</th><th>推荐范围</th><th>来源</th></tr></thead>
            <tbody>
              ${na.macros.map(m => `
                <tr>
                  <td class="font-medium">${m.name}</td>
                  <td>${m.target} ${m.unit}</td>
                  <td>${m.percent}%</td>
                  <td>${m.range}</td>
                  <td class="text-muted-foreground">${m.source}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 餐次能量分配 -->
    <div class="card">
      <div class="card-header"><h2 class="card-title">餐次能量分配</h2></div>
      <div class="card-content">
        <div class="space-y-3 mb-4">
          ${na.mealDistribution.map((m, i) => {
            const mealColors = [COLORS.breakfast, COLORS.lunch, COLORS.dinner];
            return `
              <div class="flex items-center gap-3">
                <span class="w-12 text-sm font-medium text-right">${m.meal}</span>
                <div class="progress-bar flex-1">
                  <div class="progress-fill" style="width: ${m.percent}%; background: ${mealColors[i] || '#999'}">
                    ${m.energy} kcal · ${m.percent}%
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="table-container">
          <table class="table">
            <thead><tr><th>餐次</th><th>能量 (kcal)</th><th>占比</th><th>蛋白质 (g)</th><th>碳水 (g)</th><th>脂肪 (g)</th></tr></thead>
            <tbody>
              ${na.mealDistribution.map(m => `
                <tr><td class="font-medium">${m.meal}</td><td>${m.energy}</td><td>${m.percent}%</td><td>${m.protein}</td><td>${m.carbs}</td><td>${m.fat}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 推荐/禁忌食物 -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h2 class="card-title">推荐食物</h2></div>
        <div class="card-content">
          ${na.recommendedFoods.map(cat => `
            <div class="mb-4">
              <p class="text-sm font-semibold mb-2">${cat.category}</p>
              <div class="flex flex-wrap gap-1.5">
                ${cat.items.map(item => `<span class="badge badge-secondary">${item.name}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2 class="card-title">禁忌 / 限制食物</h2></div>
        <div class="card-content">
          <div class="table-container">
            <table class="table">
              <thead><tr><th>食物</th><th>原因</th><th>严重程度</th></tr></thead>
              <tbody>
                ${na.forbiddenFoods.map(f => `
                  <tr>
                    <td class="font-medium">${f.food}</td>
                    <td class="text-muted-foreground">${f.reason}</td>
                    <td><span class="badge ${getSeverityClass(f.severity)}">${f.severity}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 药物交互 -->
    ${na.drugInteractions.length > 0 ? `
    <div class="card">
      <div class="card-header"><h2 class="card-title">药物-营养交互</h2></div>
      <div class="card-content">
        <div class="table-container">
          <table class="table">
            <thead><tr><th>药物</th><th>注意事项</th></tr></thead>
            <tbody>
              ${na.drugInteractions.map(d => `
                <tr><td class="font-medium">${d.drug}</td><td>${d.note}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    ` : ''}
  `;
}

/**
 * 生成配餐方案模块
 */
function generateMealPlanSection(data) {
  const mealPlans = data.mealPlans;
  if (!mealPlans || mealPlans.length === 0) {
    return '<div class="card"><div class="card-content">暂无配餐方案</div></div>';
  }

  const mealColors = { '早餐': COLORS.breakfast, '午餐': COLORS.lunch, '晚餐': COLORS.dinner, '加餐': COLORS.snack };
  const hasMultiWeek = mealPlans.length > 1;

  // 生成周选择器（如果有多周）
  const weekSelector = hasMultiWeek ? `
    <div class="week-selector mb-4" style="display: flex; gap: 8px; flex-wrap: wrap;">
      ${mealPlans.map((plan, idx) => `
        <button class="week-tab ${idx === 0 ? 'active' : ''}" data-week="${idx}" onclick="switchWeek(${idx})"
                style="padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; background: ${idx === 0 ? 'var(--primary)' : 'var(--secondary)'}; color: ${idx === 0 ? '#fff' : 'var(--foreground)'}; cursor: pointer;">
          第${plan.weekNumber}周
        </button>
      `).join('')}
    </div>
  ` : '';

  // 生成每周的内容
  const weeksContent = mealPlans.map((mealPlan, weekIdx) => `
    <div class="week-content ${weekIdx === 0 ? 'active' : ''}" data-week-content="${weekIdx}" style="${weekIdx === 0 ? '' : 'display: none;'}">
      <div class="card-header" style="margin-bottom: 16px;">
        <p class="text-sm text-muted-foreground">每日目标: ${mealPlan.targetEnergy || '-'} kcal | 蛋白质 ${mealPlan.targetProtein || '-'}g | 碳水 ${mealPlan.targetCarbs || '-'}g | 脂肪 ${mealPlan.targetFat || '-'}g</p>
      </div>
      ${mealPlan.days.map((day) => `
        <div class="day-section mb-6">
          <h3 class="font-semibold text-lg mb-3 pb-2 border-b">${day.day}</h3>
          ${day.meals.map(meal => `
            <div class="meal-section mb-4">
              <div class="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded">
                <span class="w-2.5 h-2.5 rounded-full" style="background: ${mealColors[meal.type] || '#999'}"></span>
                <span class="text-sm font-semibold">${meal.type}</span>
                <span class="text-xs text-muted-foreground ml-auto">${meal.energy}</span>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead><tr><th class="text-xs">食物</th><th class="text-xs w-32">用量</th><th class="text-xs">做法</th><th class="text-xs">备注</th></tr></thead>
                  <tbody>
                    ${meal.items.map(item => `
                      <tr>
                        <td class="text-xs font-medium">${item.food}</td>
                        <td class="text-xs">${item.amount}</td>
                        <td class="text-xs">${item.method}</td>
                        <td class="text-xs text-muted-foreground">${item.note}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
          ${day.dailyTotal ? `<div class="mt-2 p-2 bg-muted/40 rounded text-center text-sm text-muted-foreground">${day.dailyTotal}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');

  return `
    <!-- 每日食谱 -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">配餐方案 (${mealPlans.length} 周)</h2>
      </div>
      <div class="card-content">
        ${weekSelector}
        ${weeksContent}
      </div>
    </div>
    ${hasMultiWeek ? `
    <script>
      function switchWeek(weekIdx) {
        // 更新按钮状态
        document.querySelectorAll('.week-tab').forEach((btn, idx) => {
          if (idx === weekIdx) {
            btn.classList.add('active');
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
          } else {
            btn.classList.remove('active');
            btn.style.background = 'var(--secondary)';
            btn.style.color = 'var(--foreground)';
          }
        });
        // 显示对应周内容
        document.querySelectorAll('.week-content').forEach((content, idx) => {
          content.style.display = idx === weekIdx ? 'block' : 'none';
        });
      }
    </script>
    ` : ''}
  `;
}

/**
 * 生成运动处方模块
 */
function generateExerciseSection(data) {
  const ex = data.exercisePrescription;
  if (!ex) return '<div class="card"><div class="card-content">暂无运动处方</div></div>';

  return `
    <!-- 安全性评估 -->
    <div class="card">
      <div class="card-header"><h2 class="card-title">安全性评估</h2></div>
      <div class="card-content">
        <div class="table-container">
          <table class="table">
            <thead><tr><th>评估项目</th><th>当前状态</th><th>运动安全性</th></tr></thead>
            <tbody>
              ${ex.safety.evaluations.map(e => `
                <tr><td class="font-medium">${e.item}</td><td>${e.status}</td><td>${e.safety}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="alert alert-info mt-4">
          <p class="text-sm font-medium">${ex.safety.conclusion}</p>
        </div>
      </div>
    </div>

    <!-- 运动处方 -->
    <div class="card">
      <div class="card-header"><h2 class="card-title">运动处方</h2></div>
      <div class="card-content">
        <div class="grid-2 mb-4">
          <div class="p-3 border rounded"><span class="text-xs text-muted-foreground">运动类型</span><p class="text-sm font-medium mt-1">${ex.prescription.type}</p></div>
          <div class="p-3 border rounded"><span class="text-xs text-muted-foreground">运动强度</span><p class="text-sm font-medium mt-1">${ex.prescription.intensity}</p></div>
          <div class="p-3 border rounded"><span class="text-xs text-muted-foreground">运动频率</span><p class="text-sm font-medium mt-1">${ex.prescription.frequency}</p></div>
          <div class="p-3 border rounded"><span class="text-xs text-muted-foreground">运动时长</span><p class="text-sm font-medium mt-1">${ex.prescription.duration}</p></div>
        </div>
        <div class="p-3 bg-muted/40 rounded flex items-center gap-2">
          <span class="text-sm font-medium">靶心率：</span>
          <span class="badge badge-outline">${ex.prescription.targetHR}</span>
          <span class="text-sm text-muted-foreground ml-2">最大心率 ${ex.prescription.maxHR} bpm</span>
        </div>
      </div>
    </div>

    <!-- 有氧/抗阻/柔韧 -->
    <div class="grid-3">
      <div class="card">
        <div class="card-header"><h2 class="card-title">有氧运动</h2></div>
        <div class="card-content">
          <p class="text-sm"><strong>项目：</strong>${ex.aerobic.exercises}</p>
          <p class="text-sm mt-2"><strong>强度：</strong>${ex.aerobic.intensity}</p>
          <p class="text-sm mt-2"><strong>频率：</strong>${ex.aerobic.frequency}</p>
          <p class="text-sm mt-2"><strong>时长：</strong>${ex.aerobic.duration}</p>
          <p class="text-xs text-muted-foreground mt-2">${ex.aerobic.notes}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">抗阻训练</h2></div>
        <div class="card-content">
          <p class="text-sm"><strong>项目：</strong>${ex.resistance.exercises}</p>
          <p class="text-sm mt-2"><strong>强度：</strong>${ex.resistance.intensity}</p>
          <p class="text-sm mt-2"><strong>频率：</strong>${ex.resistance.frequency}</p>
          <p class="text-sm mt-2"><strong>时长：</strong>${ex.resistance.duration}</p>
          <p class="text-xs text-muted-foreground mt-2">${ex.resistance.notes}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2 class="card-title">柔韧性训练</h2></div>
        <div class="card-content">
          <p class="text-sm"><strong>项目：</strong>${ex.flexibility.exercises}</p>
          <p class="text-sm mt-2"><strong>强度：</strong>${ex.flexibility.intensity}</p>
          <p class="text-sm mt-2"><strong>频率：</strong>${ex.flexibility.frequency}</p>
          <p class="text-sm mt-2"><strong>时长：</strong>${ex.flexibility.duration}</p>
          <p class="text-xs text-muted-foreground mt-2">${ex.flexibility.notes}</p>
        </div>
      </div>
    </div>

    <!-- 分阶段运动计划 -->
    ${ex.phases.map(phase => `
      <div class="card">
        <div class="card-header"><h2 class="card-title">${phase.name} (${phase.weeks})</h2></div>
        <div class="card-content">
          <div class="table-container">
            <table class="table">
              <thead><tr><th>星期</th><th>运动内容</th><th>时长</th><th>强度</th></tr></thead>
              <tbody>
                ${phase.days.map(d => `
                  <tr>
                    <td class="font-medium">${d.day}</td>
                    <td>${d.content}</td>
                    <td>${d.duration}</td>
                    <td><span class="badge ${getIntensityClass(d.intensity)}">${d.intensity}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${phase.weeklyTotal ? `<div class="mt-4 p-3 bg-muted/40 rounded text-center text-sm font-medium">周均运动量：${phase.weeklyTotal}</div>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}

/**
 * 生成完整 HTML
 */
function generateHTML(data) {
  const hasAssessment = !!data.nutritionAssessment;
  const hasMealPlan = data.mealPlans && data.mealPlans.length > 0;
  const hasExercise = !!data.exercisePrescription;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>营养方案报告 - ${data.name}</title>
  <style>
    /* Reset & Base */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #0a0a0a;
      line-height: 1.5;
    }

    /* Design Tokens */
    :root {
      --background: #ffffff;
      --foreground: #0a0a0a;
      --card: #ffffff;
      --card-foreground: #0a0a0a;
      --primary: #171717;
      --primary-foreground: #fafafa;
      --secondary: #f5f5f5;
      --secondary-foreground: #171717;
      --muted: #f5f5f5;
      --muted-foreground: #737373;
      --border: #e5e5e5;
      --ring: #171717;
      --radius: 0.75rem;

      /* Health Colors */
      --health-normal: #dcfce7;
      --health-normal-foreground: #14532d;
      --health-warning: #fef9c3;
      --health-warning-foreground: #713f12;
      --health-danger: #fee2e2;
      --health-danger-foreground: #991b1b;
      --health-info: #dbeafe;
      --health-info-foreground: #1e3a8a;
    }

    .min-h-screen { min-height: 100vh; }
    .bg-background { background: #f5f5f5; }
    .border-b { border-bottom: 1px solid var(--border); }

    /* Header */
    header {
      background: var(--card);
      border-bottom: 1px solid var(--border);
    }
    .header-content {
      max-width: 72rem;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; }
    .text-muted-foreground { color: var(--muted-foreground); }

    /* Main */
    main {
      max-width: 72rem;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    /* Tabs */
    .tabs-list {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      padding: 0.25rem;
      background: var(--muted);
      border-radius: var(--radius);
      margin-bottom: 1.5rem;
    }
    .tab {
      padding: 0.75rem 1rem;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: calc(var(--radius) - 0.25rem);
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      background: transparent;
    }
    .tab:hover { background: var(--secondary); }
    .tab.active {
      background: var(--background);
      color: var(--foreground);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .tab:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Tab Content */
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Card */
    .card {
      background: var(--card);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card-header { margin-bottom: 1rem; }
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--card-foreground);
    }
    .card-content { color: var(--card-foreground); }

    /* Badge */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-default {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .badge-secondary {
      background: var(--secondary);
      color: var(--secondary-foreground);
    }
    .badge-destructive {
      background: var(--health-danger);
      color: var(--health-danger-foreground);
    }
    .badge-warning {
      background: var(--health-warning);
      color: var(--health-warning-foreground);
    }
    .badge-outline {
      background: transparent;
      border: 1px solid var(--border);
    }

    /* Table */
    .table-container { overflow-x: auto; }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .table th {
      text-align: left;
      padding: 0.75rem;
      font-weight: 500;
      color: var(--muted-foreground);
      border-bottom: 1px solid var(--border);
    }
    .table td {
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .table tr:hover { background: var(--muted); }

    /* Status */
    .status-normal { background: var(--health-normal); }
    .status-normal td { color: var(--health-normal-foreground); }
    .status-high { background: var(--health-warning); }
    .status-high td { color: var(--health-warning-foreground); }
    .status-very-high { background: var(--health-danger); }
    .status-very-high td { color: var(--health-danger-foreground); }

    /* Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
      .tabs-list { grid-template-columns: repeat(2, 1fr); }
    }

    /* Stats */
    .stat-card {
      text-align: center;
      padding: 1.5rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--foreground);
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 0.25rem;
    }

    /* Progress */
    .progress-bar {
      height: 2rem;
      background: var(--muted);
      border-radius: calc(var(--radius) / 2);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: calc(var(--radius) / 2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 500;
    }

    /* Alert */
    .alert {
      padding: 1rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .alert-info {
      background: var(--health-info);
      border-color: var(--health-info-foreground);
      color: var(--health-info-foreground);
    }

    /* Utility */
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .ml-2 { margin-left: 0.5rem; }
    .ml-8 { margin-left: 2rem; }
    .ml-auto { margin-left: auto; }
    .mr-auto { margin-right: auto; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .pb-2 { padding-bottom: 0.5rem; }
    .border { border: 1px solid var(--border); }
    .border-b { border-bottom: 1px solid var(--border); }
    .rounded { border-radius: var(--radius); }
    .hidden { display: none; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-lg { font-size: 1.125rem; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-normal { font-weight: 400; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .bg-muted { background: var(--muted); }
    .w-12 { width: 3rem; }
    .w-32 { width: 8rem; }
    .w-48 { width: 12rem; }
    .h-48 { height: 12rem; }
    .w-2\\.5 { width: 0.625rem; }
    .h-2\\.5 { height: 0.625rem; }
    .w-3 { width: 0.75rem; }
    .h-3 { height: 0.75rem; }
    .rounded-full { border-radius: 9999px; }
    .flex-1 { flex: 1; }
    .h-full { height: 100%; }
    .list-disc { list-style-type: disc; }
    .pl-5 { padding-left: 1.25rem; }
    .day-section { page-break-inside: avoid; }

    /* Intensity */
    .intensity-low { background: #dcfce7; color: #14532d; }
    .intensity-light { background: #ecfccb; color: #365314; }
    .intensity-moderate { background: #fef9c3; color: #713f12; }
    .intensity-medium { background: #fed7aa; color: #7c2d12; }
    .intensity-high { background: #fee2e2; color: #991b1b; }

    /* Print */
    @media print {
      .tabs-list { display: none; }
      .tab-content { display: block !important; }
      .card { break-inside: avoid; }
    }
  </style>
</head>
<body class="min-h-screen bg-background">
  <header>
    <div class="header-content">
      <h1>营养方案报告</h1>
      <p class="text-muted-foreground">${data.name} · ${data.date}</p>
    </div>
  </header>

  <main>
    <div class="tabs-list">
      <button class="tab active" data-tab="profile" onclick="switchTab('profile')">健康档案</button>
      <button class="tab ${!hasAssessment ? 'disabled' : ''}" data-tab="assessment" onclick="${hasAssessment ? "switchTab('assessment')" : ''}" ${!hasAssessment ? 'disabled' : ''}>营养评估</button>
      <button class="tab ${!hasMealPlan ? 'disabled' : ''}" data-tab="mealplan" onclick="${hasMealPlan ? "switchTab('mealplan')" : ''}" ${!hasMealPlan ? 'disabled' : ''}>配餐方案</button>
      <button class="tab ${!hasExercise ? 'disabled' : ''}" data-tab="exercise" onclick="${hasExercise ? "switchTab('exercise')" : ''}" ${!hasExercise ? 'disabled' : ''}>运动建议</button>
    </div>

    <div id="profile" class="tab-content active">
      ${generateProfileSection(data)}
    </div>
    <div id="assessment" class="tab-content">
      ${generateAssessmentSection(data)}
    </div>
    <div id="mealplan" class="tab-content">
      ${generateMealPlanSection(data)}
    </div>
    <div id="exercise" class="tab-content">
      ${generateExerciseSection(data)}
    </div>
  </main>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  </script>
</body>
</html>`;
}

/**
 * 查找患者目录（支持姓名或姓名_日期格式）
 * 优先选择包含 data.json 的最新日期目录
 */
function findPatientDir(patientName) {
  // 1. 查找以姓名开头的目录（姓名_日期格式），优先使用最新的
  const datedDirs = fs.readdirSync(RESULTS_DIR)
    .filter(f => fs.statSync(path.join(RESULTS_DIR, f)).isDirectory())
    .filter(f => f.startsWith(patientName + '_'))
    .filter(f => fs.existsSync(path.join(RESULTS_DIR, f, 'data.json')))
    .sort(); // 按字母排序，最新的日期会在后面

  if (datedDirs.length > 0) {
    return datedDirs[datedDirs.length - 1]; // 返回最新的
  }

  // 2. 直接匹配完整目录名（且包含 data.json）
  const directPath = path.join(RESULTS_DIR, patientName);
  if (fs.existsSync(path.join(directPath, 'data.json'))) {
    return patientName;
  }

  // 3. 如果没有找到带 data.json 的目录，返回原始名称
  return patientName;
}

/**
 * 处理单个患者
 */
function processPatient(patientName) {
  // 查找实际目录名
  const actualDirName = findPatientDir(patientName);
  const patientDir = path.join(RESULTS_DIR, actualDirName);
  const dataPath = path.join(patientDir, 'data.json');
  const outputPath = path.join(patientDir, '可视化报告.html');

  // 检查目录是否存在
  if (!fs.existsSync(patientDir)) {
    console.error(`❌ ${patientName} - 目录不存在: ${patientDir}`);
    return false;
  }

  // 检查 data.json 是否存在
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ ${patientName} - 未找到 data.json`);
    console.error(`   路径: ${dataPath}`);
    return false;
  }

  if (actualDirName !== patientName) {
    console.log(`📁 使用目录: ${actualDirName}`);
  }

  try {
    // 读取并解析 JSON
    let data;
    try {
      const content = fs.readFileSync(dataPath, 'utf-8');
      data = JSON.parse(content);
    } catch (e) {
      console.error(`❌ ${patientName} - JSON 解析失败: ${e.message}`);
      console.error(`   请检查 data.json 是否损坏`);
      return false;
    }

    // 验证必要字段
    if (!data.name) {
      console.error(`❌ ${patientName} - data.json 缺少必要字段: name`);
      return false;
    }

    // 生成 HTML
    const html = generateHTML(data);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ ${patientName} - 可视化报告.html`);
    return true;
  } catch (error) {
    console.error(`❌ ${patientName} - 生成失败: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const patientName = args[0];

  if (patientName) {
    // 处理单个患者
    const result = processPatient(patientName);
    if (!result) {
      console.log('\n提示:');
      console.log('  1. 确保已运行: node scripts/data-transform.js <姓名>');
      console.log('  2. 检查 results/<姓名>/ 目录是否存在');
      process.exit(1);
    }
  } else {
    // 处理所有患者
    const patients = fs.readdirSync(RESULTS_DIR)
      .filter(f => fs.statSync(path.join(RESULTS_DIR, f)).isDirectory())
      .filter(f => fs.existsSync(path.join(RESULTS_DIR, f, 'data.json')));

    console.log(`找到 ${patients.length} 位患者数据\n`);

    let success = 0;
    for (const p of patients) {
      if (processPatient(p)) success++;
    }

    console.log(`\n生成完成: ${success}/${patients.length}`);
  }
}

main();
