'use client'

import { useState } from 'react'
import type { MealPlan, DayPlan, Meal, WeeklySummaryRow } from '@/lib/types'
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
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts'

interface MealPlanViewProps {
  plan: MealPlan
  patientName: string
}

const MEAL_COLORS: Record<string, string> = {
  早餐: '#E69F00',
  午餐: '#0072B2',
  晚餐: '#56B4E9',
  加餐: '#009E73',
}

const NUTRIENT_COLORS: Record<string, string> = {
  energy: '#D55E00',
  protein: '#56B4E9',
  fat: '#E69F00',
  carbs: '#009E73',
}

const EXTRA_COLORS: Record<string, string> = {
  磷: '#CC79A7',
  钾: '#0072B2',
  铁: '#D55E00',
  维C: '#E69F00',
  钙: '#009E73',
  锌: '#56B4E9',
  钠: '#F0E442',
  膳食纤维: '#D55E00',
  优质蛋白: '#CC79A7',
}

const DAY_KEYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getExtraColor(key: string): string {
  return EXTRA_COLORS[key] ?? `hsl(${(key.length * 67) % 360}, 65%, 50%)`
}

/* ---------- Meal Type Badge ---------- */
function MealTypeBadge({ type }: { type: Meal['type'] }) {
  const color = MEAL_COLORS[type] ?? '#8884d8'
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <span
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {type}
    </Badge>
  )
}

/* ---------- Single Meal Card ---------- */
function MealCard({ meal }: { meal: Meal }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <MealTypeBadge type={meal.type} />
          <span className="text-xs text-muted-foreground">{meal.energy}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {meal.items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">食物</TableHead>
                <TableHead className="text-xs">用量</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">做法</TableHead>
                <TableHead className="text-xs hidden md:table-cell">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meal.items.map((item, i) => (
                <TableRow key={`${item.food}-${i}`}>
                  <TableCell className="text-xs font-medium">{item.food}</TableCell>
                  <TableCell className="text-xs">{item.amount}</TableCell>
                  <TableCell className="text-xs hidden sm:table-cell">{item.method}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                    {item.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">暂无安排</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- Day Plan Panel ---------- */
function DayPlanPanel({ dayPlan }: { dayPlan: DayPlan }) {
  const mainMeals = dayPlan.meals.filter((m) => m.type !== '加餐')
  const snacks = dayPlan.meals.filter((m) => m.type === '加餐')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {mainMeals.map((meal) => (
          <MealCard key={meal.type} meal={meal} />
        ))}
      </div>

      {snacks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {snacks.map((meal) => (
            <MealCard key={meal.type} meal={meal} />
          ))}
        </div>
      )}

      {dayPlan.dailyTotal && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-center">
          <span className="text-sm font-medium">每日合计：</span>
          <span className="ml-2 text-sm text-muted-foreground">{dayPlan.dailyTotal}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- Weekly Nutrition Chart ---------- */
function WeeklyChart({
  summary,
  targetEnergy,
}: {
  summary: WeeklySummaryRow[]
  targetEnergy?: number
}) {
  // Collect extra nutrient keys
  const extraKeys = new Set<string>()
  summary.forEach((row) => {
    if (row.extra) {
      Object.keys(row.extra).forEach((k) => extraKeys.add(k))
    }
  })

  const chartData = summary.map((row) => ({
    day: row.day,
    energy: row.energy,
    protein: row.protein * 10,
    fat: row.fat * 10,
    carbs: row.carbs,
    ...row.extra,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>每周营养趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value)
                  const n = String(name)
                  if (n === 'protein' || n === 'fat') {
                    return [`${(v / 10).toFixed(1)}g`, n === 'protein' ? '蛋白质' : '脂肪']
                  }
                  if (n === 'energy') return [`${v} kcal`, '能量']
                  if (n === 'carbs') return [`${v}g`, '碳水化合物']
                  return [v, n]
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    energy: '能量 (kcal)',
                    protein: '蛋白质 (x10g)',
                    fat: '脂肪 (x10g)',
                    carbs: '碳水 (g)',
                  }
                  return labels[value] ?? value
                }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke={NUTRIENT_COLORS.energy}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="protein"
                stroke={NUTRIENT_COLORS.protein}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="fat"
                stroke={NUTRIENT_COLORS.fat}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="carbs"
                stroke={NUTRIENT_COLORS.carbs}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              {targetEnergy != null && (
                <ReferenceLine
                  y={targetEnergy}
                  stroke={NUTRIENT_COLORS.energy}
                  strokeDasharray="8 4"
                  label={{ value: `目标 ${targetEnergy}`, position: 'insideTopRight', fontSize: 11 }}
                />
              )}
              {Array.from(extraKeys).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={getExtraColor(key)}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- Weekly Summary Table ---------- */
function WeeklySummaryTable({ summary }: { summary: WeeklySummaryRow[] }) {
  // Collect extra keys
  const extraKeys = new Set<string>()
  summary.forEach((row) => {
    if (row.extra) {
      Object.keys(row.extra).forEach((k) => extraKeys.add(k))
    }
  })

  // Compute daily average (exclude 目标 row)
  const dataRows = summary.filter((r) => r.day !== '目标')
  const avgRow: WeeklySummaryRow = {
    day: '日均',
    energy: Math.round(dataRows.reduce((s, r) => s + r.energy, 0) / dataRows.length),
    protein: +(dataRows.reduce((s, r) => s + r.protein, 0) / dataRows.length).toFixed(1),
    fat: +(dataRows.reduce((s, r) => s + r.fat, 0) / dataRows.length).toFixed(1),
    carbs: +(dataRows.reduce((s, r) => s + r.carbs, 0) / dataRows.length).toFixed(1),
    extra: {},
  }
  if (extraKeys.size > 0) {
    extraKeys.forEach((key) => {
      const vals = dataRows.filter((r) => r.extra?.[key] != null).map((r) => r.extra![key])
      if (vals.length > 0) {
        avgRow.extra![key] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      }
    })
  }

  const displayRows = [...summary]
  // Insert average before 目标 row if it exists
  const targetIdx = displayRows.findIndex((r) => r.day === '目标')
  if (targetIdx >= 0) {
    displayRows.splice(targetIdx, 0, avgRow)
  } else {
    displayRows.push(avgRow)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>每周营养汇总</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>能量 (kcal)</TableHead>
                <TableHead>蛋白质 (g)</TableHead>
                <TableHead>脂肪 (g)</TableHead>
                <TableHead>碳水 (g)</TableHead>
                {Array.from(extraKeys).map((key) => (
                  <TableHead key={key}>{key}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row) => {
                const isTarget = row.day === '目标'
                const isAvg = row.day === '日均'
                return (
                  <TableRow
                    key={row.day}
                    className={isTarget || isAvg ? 'bg-muted/50 font-semibold' : ''}
                  >
                    <TableCell className="font-medium">{row.day}</TableCell>
                    <TableCell>{row.energy}</TableCell>
                    <TableCell>{row.protein}</TableCell>
                    <TableCell>{row.fat}</TableCell>
                    <TableCell>{row.carbs}</TableCell>
                    {Array.from(extraKeys).map((key) => (
                      <TableCell key={key}>
                        {row.extra?.[key] ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- Shopping List ---------- */
function ShoppingList({ categories }: { categories: MealPlan['shoppingList'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>采购清单</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {categories.map((cat) => (
          <Collapsible key={cat.category} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
              <span>{cat.category}</span>
              <span className="text-xs text-muted-foreground">
                {cat.items.length} 项
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 px-2 pb-3">
                {cat.items.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  )
}

/* ---------- Main Component ---------- */
export function MealPlanView({ plan, patientName }: MealPlanViewProps) {
  const { weekNumber, targetEnergy: planTargetEnergy, targetProtein, targetCarbs, targetFat, days, weeklySummary, weeklyAnalysis, shoppingList, references } = plan

  // Derive target energy from summary "目标" row
  const targetRow = weeklySummary.find((r) => r.day === '目标')
  const targetEnergy = targetRow?.energy

  // Map day key to DayPlan for quick lookup
  const dayMap = new Map<string, DayPlan>()
  days.forEach((d) => dayMap.set(d.day, d))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>
            第{weekNumber}周膳食方案
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {patientName}
            </span>
          </CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
            <span>目标: {planTargetEnergy} kcal</span>
            <span>蛋白质 {targetProtein}g</span>
            <span>碳水 {targetCarbs}g</span>
            <span>脂肪 {targetFat}g</span>
          </div>
        </CardHeader>
      </Card>

      {/* 1. Day Selector */}
      <Card>
        <CardHeader>
          <CardTitle>每日食谱</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={DAY_KEYS[0]}>
            <TabsList className="mb-4 w-full flex-wrap">
              {DAY_KEYS.map((day) => (
                <TabsTrigger key={day} value={day}>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {DAY_KEYS.map((day) => {
              const dayPlan = dayMap.get(day)
              return (
                <TabsContent key={day} value={day}>
                  {dayPlan ? (
                    <DayPlanPanel dayPlan={dayPlan} />
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      该日暂无食谱安排
                    </p>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Separator />

      {/* 2. Weekly Nutrition Chart */}
      {weeklySummary.length > 0 && (
        <WeeklyChart summary={weeklySummary} targetEnergy={targetEnergy} />
      )}

      {/* 3. Weekly Summary Table */}
      {weeklySummary.length > 0 && (
        <WeeklySummaryTable summary={weeklySummary} />
      )}

      {/* 4. Weekly Analysis */}
      {weeklyAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>周营养分析</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 pl-5 list-disc">
              {weeklyAnalysis.map((item, i) => (
                <li key={i} className="text-sm leading-relaxed pl-1">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 5. Shopping List */}
      {shoppingList.length > 0 && (
        <ShoppingList categories={shoppingList} />
      )}

      {/* 6. References */}
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

export default MealPlanView
