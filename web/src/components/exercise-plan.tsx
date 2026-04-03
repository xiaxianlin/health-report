'use client'

import type { ExercisePrescription, ExercisePhase, ExerciseEvaluation } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'

interface ExercisePlanViewProps {
  prescription: ExercisePrescription
  patientName: string
}

const INTENSITY_COLORS: Record<string, string> = {
  '低': 'bg-green-100 text-green-800 border-green-200',
  '低-中': 'bg-lime-100 text-lime-800 border-lime-200',
  '中低': 'bg-lime-100 text-lime-800 border-lime-200',
  '中低-中': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '中等': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '中': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '中-高': 'bg-orange-100 text-orange-800 border-orange-200',
  '高': 'bg-red-100 text-red-800 border-red-200',
}

function getIntensityClass(intensity: string): string {
  for (const [key, cls] of Object.entries(INTENSITY_COLORS)) {
    if (intensity.includes(key)) return cls
  }
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

/* ---------- Safety Assessment ---------- */
function SafetyCard({ prescription }: { prescription: ExercisePrescription }) {
  const { safety } = prescription
  return (
    <Card>
      <CardHeader>
        <CardTitle>安全性评估</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>评估项目</TableHead>
              <TableHead>当前状态</TableHead>
              <TableHead>运动安全性</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safety.evaluations.map((e: ExerciseEvaluation, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{e.item}</TableCell>
                <TableCell>{e.status ?? e.result}</TableCell>
                <TableCell>{e.safety ?? e.riskLevel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {safety.contraindications.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">相对禁忌/需注意</p>
            <ul className="flex flex-col gap-1 pl-5 list-disc">
              {safety.contraindications.map((c: string | { item: string; status: string }, i: number) => (
                <li key={i} className="text-sm">{typeof c === 'string' ? c : `${c.item}：${c.status}`}</li>
              ))}
            </ul>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-sm font-medium">
            {safety.conclusion}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

/* ---------- Prescription Overview ---------- */
function PrescriptionOverview({ prescription }: { prescription: ExercisePrescription }) {
  const { prescription: p } = prescription
  return (
    <Card>
      <CardHeader>
        <CardTitle>运动处方</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ParamCard label="运动类型" value={p.type} />
          <ParamCard label="运动强度" value={p.intensity} />
          <ParamCard label="运动频率" value={p.frequency} />
          <ParamCard label="运动时长" value={p.duration} />
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">靶心率：</span>
          <Badge variant="outline" className="text-sm">{p.targetHR}</Badge>
          <span className="text-sm text-muted-foreground ml-2">最大心率 {p.maxHR} bpm</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ParamCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}

/* ---------- Exercise Detail Tables ---------- */
function ExerciseDetailCard({ prescription }: { prescription: ExercisePrescription }) {
  const subs = [
    { label: '有氧运动', data: prescription.aerobic, color: 'bg-blue-500' },
    { label: '抗阻训练', data: prescription.resistance, color: 'bg-orange-500' },
    { label: '柔韧/传统运动', data: prescription.flexibility, color: 'bg-green-500' },
  ]

  const fields: { key: string; label: string; value: string }[][] = subs.map(({ data }) => [
    { key: 'exercises', label: '推荐项目', value: data.exercises },
    { key: 'intensity', label: '强度', value: data.intensity },
    { key: 'frequency', label: '频率', value: data.frequency },
    { key: 'duration', label: '时长', value: data.duration },
    ...(data.notes ? [{ key: 'notes', label: '说明', value: data.notes }] : []),
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>运动明细</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {subs.map(({ label, color }, i) => (
            <div key={label} className="min-w-[260px] flex-1 rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <span className={`inline-block size-2.5 rounded-full ${color}`} />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <div className="flex flex-col gap-2 px-4 py-3">
                {fields[i].map(({ key, label: lbl, value }) => (
                  <div key={key}>
                    <span className="text-xs text-muted-foreground">{lbl}</span>
                    <p className="text-sm leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- Weekly Plan ---------- */
function WeeklyPlanCard({ phases }: { phases: ExercisePhase[] }) {
  if (phases.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>一周运动计划</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={phases[0].name}>
          <TabsList className="mb-4 w-full flex-wrap">
            {phases.map((phase) => (
              <TabsTrigger key={phase.name} value={phase.name}>
                {phase.name}{phase.weeks ? `（${phase.weeks}）` : ''}
              </TabsTrigger>
            ))}
          </TabsList>
          {phases.map((phase) => (
            <TabsContent key={phase.name} value={phase.name}>
              <div className="flex flex-col gap-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>星期</TableHead>
                      <TableHead>运动内容</TableHead>
                      <TableHead>时长</TableHead>
                      <TableHead>强度</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phase.days.map((d) => (
                      <TableRow key={d.day}>
                        <TableCell className="font-medium">{d.day}</TableCell>
                        <TableCell>{d.content}</TableCell>
                        <TableCell>{d.duration}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getIntensityClass(d.intensity)}`}>
                            {d.intensity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {phase.weeklyTotal && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-2 text-center">
                    <span className="text-sm font-medium">周均运动量：{phase.weeklyTotal}</span>
                  </div>
                )}
                {phase.weeklySummary && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-2">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
                      {Object.entries(phase.weeklySummary).map(([k, v]) => (
                        <span key={k}><span className="font-medium">{k}：</span>{v}</span>
                      ))}
                    </div>
                  </div>
                )}
                {phase.principles && phase.principles.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1">原则</p>
                    <ul className="flex flex-col gap-1 pl-5 list-disc">
                      {phase.principles.map((p, i) => (
                        <li key={i} className="text-sm">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

/* ---------- Session Flow ---------- */
function SessionFlowCard({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>单次运动流程</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3 pl-5 list-decimal">
          {steps.map((step, i) => (
            <li key={i} className="text-sm leading-relaxed pl-1">{step}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

/* ---------- Nutrition Synergy ---------- */
function NutritionSynergyCard({ prescription }: { prescription: ExercisePrescription }) {
  const { nutritionSynergy } = prescription
  return (
    <Card>
      <CardHeader>
        <CardTitle>运动与营养协同</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {nutritionSynergy.timing.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">运动时间与进餐</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">时段</TableHead>
                  <TableHead className="text-xs">推荐时间</TableHead>
                  <TableHead className="text-xs">饮食配合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nutritionSynergy.timing.map((t, i) => {
                  const period = 'period' in t ? t.period : ('timepoint' in t ? t.timepoint : '')
                  const time = 'time' in t ? t.time : ('strategy' in t ? t.strategy : '')
                  const note = 'note' in t ? t.note : ('purpose' in t ? t.purpose : '')
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{period}</TableCell>
                      <TableCell className="text-xs">{time}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{note}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {nutritionSynergy.strategies.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">运动前后营养策略</p>
            {typeof nutritionSynergy.strategies[0] === 'string' ? (
              <ul className="flex flex-col gap-1.5 pl-5 list-disc">
                {nutritionSynergy.strategies.map((s, i) => (
                  <li key={i} className="text-sm leading-relaxed pl-1">{s as string}</li>
                ))}
              </ul>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">场景</TableHead>
                    <TableHead className="text-xs">策略</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(nutritionSynergy.strategies as { scenario: string; strategy: string }[]).map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{s.scenario}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.strategy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {nutritionSynergy.drugInteractions && nutritionSynergy.drugInteractions.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">药物-运动交互</p>
            {nutritionSynergy.drugInteractions.map((d, i) => (
              <Alert key={i} className="mb-2">
                <AlertDescription>
                  <span className="font-semibold">{d.drug}</span>
                  <span className="mx-1.5">—</span>
                  <span className="text-muted-foreground">{d.note}</span>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {nutritionSynergy.energyBalance && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium">能量平衡：</span>
            <span className="ml-2 text-sm text-muted-foreground">{nutritionSynergy.energyBalance}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- Precautions ---------- */
function PrecautionsCard({ precautions }: { precautions: { category: string; items: string[] }[] }) {
  if (precautions.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>注意事项</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {precautions.map((group) => (
          <Collapsible key={group.category} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold hover:bg-muted/50 transition-colors">
              <span>{group.category}</span>
              <span className="text-xs text-muted-foreground">{group.items.length} 项</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="flex flex-col gap-1.5 pl-5 pb-2 list-disc">
                {group.items.map((item, i) => (
                  <li key={i} className="text-sm leading-relaxed pl-1">{item}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  )
}

/* ---------- Progression ---------- */
function ProgressionCard({ prescription }: { prescription: ExercisePrescription }) {
  const { progression, stopConditions } = prescription
  return (
    <Card>
      <CardHeader>
        <CardTitle>循序渐进计划</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {progression.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>阶段</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>运动目标</TableHead>
                <TableHead>健康目标</TableHead>
                <TableHead>评估节点</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progression.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.phase}</TableCell>
                  <TableCell>{p.time}</TableCell>
                  <TableCell className="text-sm">{p.exerciseGoal}</TableCell>
                  <TableCell className="text-sm">{p.healthGoal}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.assessment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {stopConditions.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2 text-health-danger-foreground">停止运动并就医的情况</p>
            <ul className="flex flex-col gap-1 pl-5 list-disc">
              {stopConditions.map((c, i) => (
                <li key={i} className="text-sm">{c}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- Main Component ---------- */
export function ExercisePlanView({ prescription, patientName }: ExercisePlanViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Safety */}
      <SafetyCard prescription={prescription} />

      {/* 2. Prescription Overview */}
      <PrescriptionOverview prescription={prescription} />

      {/* 3. Exercise Detail */}
      <ExerciseDetailCard prescription={prescription} />

      {/* 4. Weekly Plan */}
      <WeeklyPlanCard phases={prescription.phases} />

      {/* 5. Session Flow */}
      <SessionFlowCard steps={prescription.sessionFlow} />

      {/* 6. Nutrition Synergy */}
      <NutritionSynergyCard prescription={prescription} />

      {/* 7. Precautions */}
      <PrecautionsCard precautions={prescription.precautions} />

      {/* 8. Progression */}
      <ProgressionCard prescription={prescription} />

      {/* 9. References */}
      {prescription.references.length > 0 && (
        <Card size="sm">
          <CardContent className="pt-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              参考文献
            </p>
            <ol className="flex flex-col gap-1 pl-4 list-decimal">
              {prescription.references.map((ref, i) => (
                <li key={i} className="text-xs text-muted-foreground">{ref}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ExercisePlanView
