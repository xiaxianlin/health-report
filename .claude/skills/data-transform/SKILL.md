---
name: data-transform
description: 将 Markdown 健康档案、营养评估、配餐方案解析为结构化 JSON
argument-hint: <用户名>（留空则转换 results/ 下所有用户）
disable-model-invocation: true
---

# 数据转化 Skill

将 `results/<用户名>/` 下的 Markdown 文件解析为结构化 JSON，输出到版本化目录。

## 输入

- `$ARGUMENTS`: 用户名（对应 `results/` 下的子目录名，如"夏先生"）
- 留空则遍历所有用户

## 处理步骤

### 步骤 1: 确定用户名

- 如果参数指定了用户名，使用该用户
- 如果留空，使用 Bash 列出 `results/` 下所有不包含 `_` 的子目录（即工作目录），逐一处理每个用户

### 步骤 2: 复制中间文件 + 运行转换

先用 Bash 复制 `/tmp/<用户名>/` 的 Markdown 文件到 `results/<用户名>/`，然后运行脚本：

```bash
mkdir -p results/<用户名> && cp /tmp/<用户名>/*.md results/<用户名>/
node scripts/data-transform.js <用户名>
```

脚本会：
1. 读取 `results/<用户名>/` 下的所有 Markdown 文件
2. 解析为结构化 JSON
3. 自动创建版本化目录 `results/<用户名>_YYYY-MM-DD/`
4. 复制 Markdown 源文件到新目录
5. 输出 `data.json`
6. 执行 schema 验证

### 步骤 3: 清理中间产物

```bash
rm -rf /tmp/<用户名>/ results/<用户名>/
```

### 步骤 4: 报告结果

读取生成的 `data.json`，向用户报告：
- 患者姓名
- 查看码
- 检验指标组数
- 宏量营养素项数
- 配餐方案周数
- 是否有运动处方

## 注意事项

- 不会修改任何 Markdown 文件
- 如果 data.json 已存在，会复用 id 和 viewCode
- 支持 `--only <health|nutrition|meal|exercise>` 增量更新
- 数值字段必须为 number 类型，所有校验由脚本自动完成
