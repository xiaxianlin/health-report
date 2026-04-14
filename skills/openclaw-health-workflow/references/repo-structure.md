# 仓库结构与关键规则

## 关键目录

- `.claude/skills/`：原始 Claude skills
- `skills/`：当前工作空间私有 OpenClaw skills
- `knowledge/`：知识库
- `knowledge/references/`：外部检索参考
- `records/`：输入资料
- `results/`：输出结果
- `scripts/`：转换、导出、可视化脚本

## 工作流顺序

1. 健康档案
2. 营养评估
3. 运动处方
4. 配餐方案
5. data.json
6. PDF
7. HTML

## 强制规则

- 营养评估 / 运动处方 / 配餐阶段必须执行外部检索
- 外部检索结果必须保存到 `knowledge/references/`
- 最终输出必须可回溯到 `results/<姓名>/` 或 `results/<姓名>_<日期>/`
- 所有报告需要免责声明
- 数据一致性优先于文风
