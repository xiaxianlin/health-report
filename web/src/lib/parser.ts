import fs from 'fs'
import path from 'path'
import type { PatientData } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')

/** Scan web/data/ for all JSON files */
function listJsonFiles(): string[] {
  if (!fs.existsSync(DATA_DIR)) return []
  return fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
}

/** Read and parse a single JSON file */
function readData(filename: string): PatientData | null {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')
    return JSON.parse(raw) as PatientData
  } catch {
    return null
  }
}

/** Get all patients sorted by date */
export function getAllPatients(): PatientData[] {
  return listJsonFiles()
    .map(f => readData(f))
    .filter((d): d is PatientData => d !== null)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/** Get single patient by id (filename without .json) or by name field */
export function getPatientById(id: string): PatientData | null {
  // Try exact filename match
  const direct = readData(`${id}.json`)
  if (direct) return direct
  // Fallback: match by name field
  return getAllPatients().find(p => p.name === id) || null
}
