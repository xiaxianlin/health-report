import { getPatientById } from '@/lib/parser'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { HealthProfile } from '@/components/health-profile'
import { NutritionAssess } from '@/components/nutrition-assess'
import { MealPlanView } from '@/components/meal-plan'
import { ExercisePlanView } from '@/components/exercise-plan'

export const dynamic = 'force-dynamic'

export default async function PatientPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const decodedName = decodeURIComponent(name)
  const patient = getPatientById(decodedName)
  if (!patient) notFound()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card border-b-primary/20">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">← 返回</Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{patient.name}</h1>
              <p className="text-sm text-muted-foreground">
                {patient.gender} · {patient.age}岁 · BMI {patient.bmi} · {patient.date}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue={patient.nutritionAssessment ? 'assessment' : 'profile'} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-10">
            <TabsTrigger value="profile">健康档案</TabsTrigger>
            <TabsTrigger value="assessment" disabled={!patient.nutritionAssessment}>
              营养评估
            </TabsTrigger>
            <TabsTrigger value="mealplan" disabled={patient.mealPlans.length === 0}>
              配餐方案{patient.mealPlans.length > 1 ? ` (${patient.mealPlans.length}周)` : ''}
            </TabsTrigger>
            <TabsTrigger value="exercise" disabled={!patient.exercisePrescription}>
              运动建议
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <HealthProfile patient={patient} />
          </TabsContent>

          <TabsContent value="assessment" className="mt-6">
            {patient.nutritionAssessment && (
              <NutritionAssess assessment={patient.nutritionAssessment} patientName={patient.name} />
            )}
          </TabsContent>

          <TabsContent value="mealplan" className="mt-6">
            {patient.mealPlans.map((plan) => (
              <MealPlanView key={plan.weekNumber} plan={plan} patientName={patient.name} />
            ))}
          </TabsContent>

          <TabsContent value="exercise" className="mt-6">
            {patient.exercisePrescription && (
              <ExercisePlanView prescription={patient.exercisePrescription} patientName={patient.name} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
