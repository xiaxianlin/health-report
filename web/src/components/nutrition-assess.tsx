'use client'

import type { NutritionAssessment } from '@/lib/types'
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
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface NutritionAssessProps {
  assessment: NutritionAssessment
  patientName: string
}

const MACRO_COLORS: Record<string, string> = {
  蛋白质: '#56B4E9',
  碳水化合物: '#009E73',
  脂肪: '#E69F00',
}

const MEAL_BAR_COLORS: Record<string, string> = {
  早餐: '#E69F00',
  午餐: '#0072B2',
  晚餐: '#56B4E9',
  加餐: '#009E73',
}

function StatCard({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string
  value: number
  unit: string
  sublabel?: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center gap-1 py-3">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        <span className="text-sm text-muted-foreground">
          {unit}
          {sublabel ? ` · ${sublabel}` : ''}
        </span>
        <span className="text-xs font-medium text-muted-foreground/80">
          {label}
        </span>
      </CardContent>
    </Card>
  )
}

function severityVariant(severity: string) {
  switch (severity) {
    case '完全禁止':
      return 'destructive' as const
    case '严格限制':
      return 'secondary' as const
    case '适量控制':
      return 'outline' as const
    default:
      return 'outline' as const
  }
}

export function NutritionAssess({
  assessment,
  patientName,
}: NutritionAssessProps) {
  const {
    bmr,
    tdee,
    targetEnergy,
    activityLevel,
    macros,
    microTargets,
    mealDistribution,
    principles,
    recommendedFoods,
    forbiddenFoods,
    drugInteractions,
    keyNotes,
    references,
  } = assessment

  // Pie chart data for macro percentages
  const macroPieData = macros.map((m) => ({
    name: m.name,
    value: m.percent,
    fill: MACRO_COLORS[m.name] ?? '#8884d8',
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* ===== 1. Energy Calculation ===== */}
      <Card>
        <CardHeader>
          <CardTitle>
            能量计算
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {patientName} · 活动水平: {activityLevel}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="基础代谢率 (BMR)" value={bmr} unit="kcal" />
            <StatCard label="总能量消耗 (TDEE)" value={tdee} unit="kcal" />
            <StatCard
              label="目标摄入能量"
              value={targetEnergy}
              unit="kcal"
              sublabel="治疗目标"
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== 2. Macro Targets Pie Chart ===== */}
      <Card>
        <CardHeader>
          <CardTitle>宏量营养素目标</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {macroPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value}%`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>营养素</TableHead>
                <TableHead>目标量</TableHead>
                <TableHead>占比</TableHead>
                <TableHead>推荐范围</TableHead>
                <TableHead>来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {macros.map((m) => (
                <TableRow key={m.name}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    {m.target} {m.unit}
                  </TableCell>
                  <TableCell>{m.percent}%</TableCell>
                  <TableCell>{m.range}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.source}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== 3. Meal Distribution ===== */}
      <Card>
        <CardHeader>
          <CardTitle>餐次能量分配</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* CSS horizontal bars */}
          <div className="flex flex-col gap-3">
            {mealDistribution.map((m) => (
              <div key={m.meal} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-sm font-medium text-right">
                  {m.meal}
                </span>
                <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{
                      width: `${m.percent}%`,
                      backgroundColor: MEAL_BAR_COLORS[m.meal] ?? 'var(--primary)',
                      opacity: 0.8,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {m.energy} kcal · {m.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>餐次</TableHead>
                <TableHead>能量 (kcal)</TableHead>
                <TableHead>占比</TableHead>
                <TableHead>蛋白质 (g)</TableHead>
                <TableHead>碳水 (g)</TableHead>
                <TableHead>脂肪 (g)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mealDistribution.map((m) => (
                <TableRow key={m.meal}>
                  <TableCell className="font-medium">{m.meal}</TableCell>
                  <TableCell>{m.energy}</TableCell>
                  <TableCell>{m.percent}%</TableCell>
                  <TableCell>{m.protein}</TableCell>
                  <TableCell>{m.carbs}</TableCell>
                  <TableCell>{m.fat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== 4. Micro Targets ===== */}
      <Card>
        <CardHeader>
          <CardTitle>微量营养素目标</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>营养素</TableHead>
                <TableHead>目标量</TableHead>
                <TableHead>补充原因</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {microTargets.map((m, i) => (
                <TableRow key={`${m.name}-${i}`}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.target}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== 5. Recommended & Forbidden Foods ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recommended */}
        <Card>
          <CardHeader>
            <CardTitle>推荐食物</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recommendedFoods.map((cat) => (
              <div key={cat.category}>
                <p className="mb-1.5 text-sm font-semibold">{cat.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item, i) => (
                    <Badge key={i} variant="secondary">
                      {item.name ?? item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Forbidden */}
        <Card>
          <CardHeader>
            <CardTitle>禁忌 / 限制食物</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>食物</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>严重程度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forbiddenFoods.map((f, i) => (
                  <TableRow key={`${f.food}-${i}`}>
                    <TableCell className="font-medium">{f.food}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityVariant(f.severity)}>
                        {f.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ===== 6. Drug Interactions ===== */}
      {drugInteractions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>药物 - 营养素相互作用</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {drugInteractions.map((d, i) => (
              <Alert key={`${d.drug}-${i}`}>
                <AlertDescription>
                  <span className="font-semibold">{d.drug}</span>
                  <span className="mx-1.5">—</span>
                  <span className="text-muted-foreground">{d.note}</span>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ===== 7. Key Notes ===== */}
      {keyNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>重要注意事项</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 pl-5 list-decimal">
              {keyNotes.map((note, i) => (
                <li key={i} className="text-sm leading-relaxed pl-1">
                  {note}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* ===== Principles (bonus context) ===== */}
      {principles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>膳食原则</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 pl-5 list-disc">
              {principles.map((p, i) => (
                <li key={i} className="text-sm leading-relaxed pl-1">
                  {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ===== References ===== */}
      {references.length > 0 && (
        <Card size="sm">
          <CardContent className="pt-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              参考文献
            </p>
            <ul className="flex flex-col gap-1 pl-4 list-disc">
              {references.map((ref, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {ref}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NutritionAssess
