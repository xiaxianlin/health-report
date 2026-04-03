'use client'

import { useState } from 'react'
import type { PatientData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HealthProfile } from '@/components/health-profile'
import { NutritionAssess } from '@/components/nutrition-assess'
import { MealPlanView } from '@/components/meal-plan'
import { ExercisePlanView } from '@/components/exercise-plan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PatientDetailGuardProps {
  patientId: string
}

export function PatientDetailGuard({ patientId }: PatientDetailGuardProps) {
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function verifyPatient(verifyCode: string) {
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })

      if (res.ok) {
        const data: PatientData = await res.json()
        setPatient(data)
      } else {
        setError('查看码不正确')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    verifyPatient(code)
  }

  // Already verified — render full detail
  if (patient) {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPatient(null)
              setCode('')
            }}
            className="text-muted-foreground"
          >
            退出查看
          </Button>
        </div>
        <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-20 rounded-xl p-2 text-base">
          <TabsTrigger value="profile" className="text-lg px-4">健康档案</TabsTrigger>
          <TabsTrigger value="assessment" disabled={!patient.nutritionAssessment} className="text-lg px-4">
            营养评估
          </TabsTrigger>
          <TabsTrigger value="mealplan" disabled={patient.mealPlans.length === 0} className="text-lg px-4">
            配餐方案{patient.mealPlans.length > 1 ? ` (${patient.mealPlans.length}周)` : ''}
          </TabsTrigger>
          <TabsTrigger value="exercise" disabled={!patient.exercisePrescription} className="text-lg px-4">
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
      </div>
    )
  }

  // Not yet verified — show code input
  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">输入查看码</CardTitle>
          <p className="text-sm text-muted-foreground">请输入查看码以查看详细方案</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text"
              maxLength={18}
              placeholder="请输入查看码"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError('')
              }}
              className="text-center tracking-widest"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={code.length === 0 || loading}>
              {loading ? '验证中...' : '查看方案'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
