import { getPatientBasicInfo } from '@/lib/parser'
import { notFound } from 'next/navigation'
import { PatientDetailGuard } from '@/components/patient-detail-guard'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = getPatientBasicInfo(id)
  if (!patient) notFound()

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-16">
        <PatientDetailGuard patientId={patient.id} />
      </main>
    </div>
  )
}
