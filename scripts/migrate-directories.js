#!/usr/bin/env node

/**
 * 患者目录迁移脚本
 * 将旧格式目录（姓名/）迁移到新格式（姓名_日期/）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_DIR = path.join(__dirname, '..', 'results');

/**
 * 从健康档案提取日期
 */
function extractDate(healthRecordPath) {
  try {
    const content = fs.readFileSync(healthRecordPath, 'utf-8');
    const dateMatch = content.match(/(?:建档日期|生成日期)[:：]\s*(\d{4}[-/]\d{2}[-/]\d{2})/);
    if (dateMatch) {
      return dateMatch[1].replace(/\//g, '-');
    }
  } catch (e) {
    console.log(`  ⚠️ 无法读取健康档案: ${e.message}`);
  }
  // 使用当前日期作为 fallback
  return new Date().toISOString().split('T')[0];
}

/**
 * 迁移单个目录
 */
function migrateDirectory(dirName) {
  const sourceDir = path.join(RESULTS_DIR, dirName);
  const healthRecordPath = path.join(sourceDir, '健康档案.md');

  // 检查是否是旧格式（不包含下划线）
  if (dirName.includes('_')) {
    console.log(`⏭️ 跳过 ${dirName} (已是新格式)`);
    return { success: false, reason: 'already_new_format' };
  }

  // 检查健康档案是否存在
  if (!fs.existsSync(healthRecordPath)) {
    console.log(`⏭️ 跳过 ${dirName} (无健康档案)`);
    return { success: false, reason: 'no_health_record' };
  }

  // 提取日期
  const dateStr = extractDate(healthRecordPath);
  const targetDirName = `${dirName}_${dateStr}`;
  const targetDir = path.join(RESULTS_DIR, targetDirName);

  // 检查目标目录是否已存在
  if (fs.existsSync(targetDir)) {
    console.log(`⏭️ 跳过 ${dirName} (目标目录 ${targetDirName} 已存在)`);
    return { success: false, reason: 'target_exists' };
  }

  console.log(`\n📝 迁移: ${dirName} → ${targetDirName}`);

  // 创建目标目录
  fs.mkdirSync(targetDir, { recursive: true });

  // 复制所有文件
  const files = fs.readdirSync(sourceDir);
  let copiedCount = 0;
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    // 跳过子目录（如果有）
    if (fs.statSync(sourcePath).isDirectory()) {
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
    copiedCount++;
  }
  console.log(`  ✅ 复制 ${copiedCount} 个文件`);

  // 在新目录运行 data-transform
  console.log(`  🔄 运行 data-transform...`);
  try {
    execSync(`node scripts/data-transform.js "${dirName}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    console.log(`  ✅ data-transform 完成`);
  } catch (e) {
    console.log(`  ⚠️ data-transform 失败: ${e.message}`);
  }

  return { success: true, targetDirName };
}

/**
 * 主函数
 */
function main() {
  console.log('开始目录迁移...\n');

  const dirs = fs.readdirSync(RESULTS_DIR)
    .filter(f => fs.statSync(path.join(RESULTS_DIR, f)).isDirectory());

  console.log(`发现 ${dirs.length} 个目录\n`);

  let migrated = 0;
  let skipped = 0;
  const results = [];

  for (const dir of dirs) {
    const result = migrateDirectory(dir);
    results.push({ dir, ...result });
    if (result.success) migrated++;
    else skipped++;
  }

  console.log('\n' + '='.repeat(40));
  console.log('迁移完成!');
  console.log(`  成功: ${migrated}`);
  console.log(`  跳过: ${skipped}`);
  console.log('='.repeat(40));

  // 输出迁移后的目录列表
  const newDirs = results.filter(r => r.success).map(r => r.targetDirName);
  if (newDirs.length > 0) {
    console.log('\n新创建的目录:');
    newDirs.forEach(d => console.log(`  - ${d}`));
  }
}

main();
