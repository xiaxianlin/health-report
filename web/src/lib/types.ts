// 结构化数据类型 — 与 data-transform skill 输出的 data.json Schema 一致

// ===== 健康档案 =====

export interface Medication {
  name: string
  dose: string
  purpose: string
  note: string
}

export interface LabResult {
  indicator: string
  value: string
  unit: string
  reference: string
  status: 'normal' | 'high' | 'low' | 'very_high' | 'very_low'
}

export interface LabGroup {
  title: string
  results: LabResult[]
}

// ===== 营养评估 =====

export interface MacroTarget {
  name: string
  target: number
  unit: string
  percent: number
  range: string
  source: string
}

export interface MicroTarget {
  name: string
  target: string
  reason: string
}

export interface MealDistribution {
  meal: string
  energy: number
  percent: number
  protein: number
  carbs: number
  fat: number
}

export interface ForbiddenItem {
  food: string
  reason: string
  severity: '完全禁止' | '严格限制' | '适量控制'
}

export interface DrugInteraction {
  drug: string
  note: string
}

export interface NutritionAssessment {
  bmr: number
  tdee: number
  targetEnergy: number
  activityLevel: string
  macros: MacroTarget[]
  microTargets: MicroTarget[]
  mealDistribution: MealDistribution[]
  principles: string[]
  recommendedFoods: { category: string; items: Record<string, string>[] }[]
  forbiddenFoods: ForbiddenItem[]
  drugInteractions: DrugInteraction[]
  keyNotes: string[]
  references: string[]
}

// ===== 配餐方案 =====

export interface MealItem {
  food: string
  amount: string
  method: string
  note: string
}

export interface Meal {
  type: string
  energy: string
  items: MealItem[]
}

export interface DayPlan {
  day: string
  meals: Meal[]
  dailyTotal: string
}

export interface WeeklySummaryRow {
  day: string
  energy: number
  protein: number
  fat: number
  carbs: number
  extra?: Record<string, number>
}

export interface ShoppingCategory {
  category: string
  items: string[]
}

export interface MealPlan {
  weekNumber: number
  targetEnergy: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  days: DayPlan[]
  weeklySummary: WeeklySummaryRow[]
  weeklyAnalysis: string[]
  shoppingList: ShoppingCategory[]
  references: string[]
}

// ===== 运动处方 =====

export interface ExerciseEvaluation {
  item: string
  // 格式A（多数患者）
  status?: string
  safety?: string
  // 格式B（陈女士）
  result?: string
  riskLevel?: string
}

export interface ExerciseSafety {
  evaluations: ExerciseEvaluation[]
  contraindications: string[] | { item: string; status: string }[]
  conclusion: string
}

export interface ExercisePrescriptionParams {
  type: string
  intensity: string
  frequency: string
  duration: string
  targetHR: string
  maxHR: number
}

export interface ExerciseSubPrescription {
  exercises: string
  intensity: string
  frequency: string
  duration: string
  notes?: string
  [key: string]: unknown
}

export interface ExerciseWeekDay {
  day: string
  content: string
  duration: string
  intensity: string
}

export interface ExercisePhase {
  name: string
  weeks?: string
  days: ExerciseWeekDay[]
  weeklyTotal?: string
  weeklySummary?: Record<string, string>
  principles?: string[]
}

export interface ExerciseNutritionSynergy {
  timing: ({ period: string; time: string; note: string } | { timepoint: string; strategy: string; purpose: string })[]
  strategies: { scenario: string; strategy: string }[] | string[]
  drugInteractions?: { drug: string; note: string }[]
  energyBalance: string
  [key: string]: unknown
}

export interface ExerciseProgressPhase {
  phase: string
  time: string
  exerciseGoal: string
  healthGoal: string
  assessment: string
}

export interface ExercisePrescription {
  date: string
  safety: ExerciseSafety
  prescription: ExercisePrescriptionParams
  aerobic: ExerciseSubPrescription
  resistance: ExerciseSubPrescription
  flexibility: ExerciseSubPrescription
  phases: ExercisePhase[]
  sessionFlow: string[]
  nutritionSynergy: ExerciseNutritionSynergy
  precautions: { category: string; items: string[] }[]
  stopConditions: string[]
  progression: ExerciseProgressPhase[]
  references: string[]
}

// ===== 用户（顶层） =====

export interface PatientData {
  // 标识与访问
  id: string
  viewCode: string

  // 基本信息
  name: string
  gender: string
  age: number
  height: number
  weight: number
  bmi: number
  bmiCategory: string
  bloodPressure: string
  date: string
  allergies: string[]
  diagnoses: string[]
  medications: Medication[]
  labGroups: LabGroup[]
  lifestyles: string[]
  nutritionNotes: string[]

  // 营养评估（可选）
  nutritionAssessment: NutritionAssessment | null

  // 配餐方案（可多周）
  mealPlans: MealPlan[]

  // 运动处方（可选）
  exercisePrescription: ExercisePrescription | null
}

export interface PatientBasicInfo {
  id: string
  name: string
  gender: string
  age: number
  bmi: number
  bmiCategory: string
  date: string
  diagnoses: string[]
  hasNutritionAssessment: boolean
  hasMealPlans: boolean
  hasExercisePrescription: boolean
}
