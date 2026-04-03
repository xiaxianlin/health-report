import { ALL_PATIENTS } from './patients-data'
import type { PatientData, PatientBasicInfo } from './types'

export { PatientBasicInfo }

function toBasicInfo(p: PatientData): PatientBasicInfo {
  return {
    id: p.id,
    name: p.name,
    gender: p.gender,
    age: p.age,
    bmi: p.bmi,
    bmiCategory: p.bmiCategory,
    date: p.date,
    diagnoses: p.diagnoses,
    hasNutritionAssessment: p.nutritionAssessment !== null,
    hasMealPlans: p.mealPlans.length > 0,
    hasExercisePrescription: p.exercisePrescription !== null,
  }
}

/** Get all patients basic info sorted by date */
export function getAllPatients(): PatientBasicInfo[] {
  return [...ALL_PATIENTS]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(toBasicInfo)
}

/** Get basic info by UUID */
export function getPatientBasicInfo(id: string): PatientBasicInfo | null {
  const p = ALL_PATIENTS.find((p) => p.id === id)
  return p ? toBasicInfo(p) : null
}

/** Get full patient data by UUID (for verified API only) */
export function getPatientFullData(id: string): PatientData | null {
  return ALL_PATIENTS.find((p) => p.id === id) || null
}

/** Verify view code for a patient, return full data if correct */
export function verifyAndGetPatient(id: string, code: string): PatientData | null {
  const p = getPatientFullData(id)
  if (!p || p.viewCode !== code) return null
  return p
}
