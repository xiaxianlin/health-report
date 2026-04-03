# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个个性化营养方案管理系统，包含完整的营养评估、配餐方案生成和运动处方功能。系统由 Claude Skills 生成 Markdown 格式的健康方案，再转换为结构化 JSON 数据，最后通过 Next.js Web 应用可视化展示。

## Build & Development Commands

```bash
# Development (Next.js dev server on port 3000)
npm run dev

# Production build (Next.js standalone)
npm run build

# Linting
npm run lint

# Cloudflare Workers build & deploy (requires Node.js 22)
npm run cf:build      # Build with OpenNext for Cloudflare
npm run cf:dev        # Local dev with Wrangler
npm run cf:deploy     # Deploy to Cloudflare Workers
npm run deploy        # Build & deploy combined
```

**Note:** Cloudflare deployment requires Node.js 22. The project uses OpenNext Cloudflare adapter (`@opennextjs/cloudflare`) for edge runtime compatibility.

## Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Patient list (masked info)
│   │   ├── patient/[id]/       # Patient detail page
│   │   │   └── page.tsx        # Verifies ID, renders PatientDetailGuard
│   │   └── api/patients/[id]/verify/
│   │       └── route.ts        # POST {code} → returns patient data (edge runtime)
│   ├── components/
│   │   ├── patient-detail-guard.tsx  # Auth guard with view code input
│   │   ├── health-profile.tsx        # Health档案 display
│   │   ├── nutrition-assess.tsx      # 营养评估 display
│   │   ├── meal-plan.tsx             # 配餐方案 display
│   │   ├── exercise-plan.tsx         # 运动处方 display
│   │   └── ui/                       # shadcn/ui components
│   └── lib/
│       ├── types.ts            # TypeScript interfaces (PatientData, etc.)
│       ├── parser.ts           # Data access functions
│       ├── patients-data.ts    # Static imports of all patient JSON files
│       └── utils.ts            # Utility functions (cn, etc.)
├── data/                       # Patient JSON files (UUID-named)
├── public/                     # Static assets
├── wrangler.jsonc              # Cloudflare Workers config
├── next.config.ts              # Next.js config (edge runtime init)
└── open-next.config.ts         # OpenNext Cloudflare config
```

## Architecture

### Data Flow

```
病历/手动输入
    ↓
Claude Skills (/.claude/skills/)
    - nutrition-workflow: 完整工作流（档案→评估→配餐→运动）
    - parse-medical-record: 病历解析
    - meal-plan: 配餐生成
    - exercise-plan: 运动处方
    - data-transform: Markdown → JSON 转换
    ↓
results/<患者姓名>/             # Markdown 输出目录
    ├── 健康档案.md
    ├── 营养评估.md
    ├── 配餐方案_第1周.md
    └── 运动处方.md
    ↓
data-transform skill
    ↓
web/data/<uuid>.json           # 结构化数据（Git-tracked）
    ↓
web/src/lib/patients-data.ts   # 静态导入所有 JSON
    ↓
Next.js App (edge runtime)     # 页面渲染
```

### Key Architectural Decisions

1. **Static JSON Data**: Patient data is stored as static JSON files in `web/data/` and imported at build time. No database is used.

2. **View Code Protection**: Patient details require a 6-digit view code (`viewCode` in JSON). The code is verified via `/api/patients/[id]/verify` API route.

3. **Edge Runtime**: All pages and API routes use `export const runtime = 'edge'` for Cloudflare Workers compatibility.

4. **Privacy Masking**: The patient list page (`/`) shows masked information (name → 张**, age → 30-39岁). Full details only shown after code verification.

5. **Client-side Caching**: Verified patient data is cached in `sessionStorage` to avoid re-entering the code during the session.

### Type System

The data schema is defined in `src/lib/types.ts` with these main types:

- `PatientData` - Complete patient record with all modules
- `PatientBasicInfo` - Masked info for list view
- `NutritionAssessment` - 营养评估数据
- `MealPlan` - 配餐方案（支持多周）
- `ExercisePrescription` - 运动处方

### Cloudflare Deployment

The app is configured for Cloudflare Workers using OpenNext:

- `wrangler.jsonc` - Worker config with nodejs_compat flag
- `open-next.config.ts` - OpenNext build config
- Build output: `.open-next/worker.js`
- Assets served via Workers Sites (`ASSETS` binding)

## Skills Integration

The project includes Claude Skills in `/.claude/skills/`:

- **nutrition-workflow**: Complete workflow from medical record to meal plan
- **data-transform**: Converts Markdown outputs to structured JSON for web
- **meal-plan**, **exercise-plan**, **nutrition-assess**, **parse-medical-record**: Individual steps

When modifying the data schema, update both `src/lib/types.ts` and the `data-transform` skill's parsing rules.

## Adding New Patients

1. Run `/nutrition-workflow <病历文件>` to generate Markdown outputs in `results/`
2. Run `/data-transform <患者姓名>` to generate JSON in `web/data/`
3. The JSON file is automatically imported via `web/src/lib/patients-data.ts`
4. Commit the new JSON file to Git
