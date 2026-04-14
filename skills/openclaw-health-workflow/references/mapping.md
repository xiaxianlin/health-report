# Claude skills → OpenClaw skills 映射

## 总览

| Claude Skill | OpenClaw Skill | 用途 |
|---|---|---|
| nutrition-workflow | openclaw-health-workflow | 总工作流路由 |
| parse-medical-record | parse-medical-record | 解析病历/体检/手动录入 |
| nutrition-assess | nutrition-assess | 生成营养评估 |
| exercise-plan | exercise-plan | 生成运动处方 |
| meal-plan | meal-plan | 生成配餐方案 |
| data-transform | data-transform | Markdown → data.json |
| export-pdf | export-pdf | 导出 PDF |
| visualize-report | visualize-report | 生成可视化 HTML |

## 迁移原则

1. 尽量保留原 skill 的结构化要求。
2. 删除 Claude 特定字段，例如 `disable-model-invocation`、`argument-hint` 对执行逻辑的依赖。
3. 改为面向当前 OpenClaw 会话可理解的操作说明。
4. 对大段脚本生成类内容，优先引用仓库内现有 `scripts/*.js`，不要在 skill 内重复粘贴整份脚本。
5. 所有路径默认基于当前工作空间。
