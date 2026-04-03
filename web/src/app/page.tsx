import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAllPatients } from '@/lib/parser'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

/** 脱敏姓名：只保留姓，如 张** */
function maskName(name: string): string {
  return name.charAt(0) + '**'
}

/** BMI 分级中文 */
function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return '偏瘦'
  if (bmi < 24) return '正常'
  if (bmi < 28) return '超重'
  return '肥胖'
}

/** 年龄脱敏：返回年龄段 */
function ageRange(age: number): string {
  const decade = Math.floor(age / 10) * 10
  return `${decade}-${decade + 9}岁`
}

/** 诊断脱敏：具体疾病 → 通用健康问题分类 */
const DIAGNOSIS_MAP: Record<string, string> = {
  '2型糖尿病': '血糖异常',
  '2型 糖尿病': '血糖异常',
  '糖尿病': '血糖异常',
  '高血压': '血压偏高',
  '高血压病': '血压偏高',
  '高血脂': '血脂异常',
  '高脂血症': '血脂异常',
  '血脂异常': '血脂异常',
  '高尿酸血症': '尿酸偏高',
  '痛风': '尿酸偏高',
  '超重': '体重超标',
  '肥胖': '体重超标',
  '脂肪肝': '肝脏问题',
  '非酒精性脂肪肝': '肝脏问题',
  '冠心病': '心血管问题',
  '慢性肾病': '肾脏问题',
  'CKD': '肾脏问题',
  '骨质疏松': '骨密度降低',
  '甲状腺': '甲状腺问题',
  '贫血': '贫血',
  '代谢综合征': '代谢紊乱',
}

/** 将诊断列表转为脱敏后的问题标签，去重 */
function maskDiagnoses(diagnoses: string[]): string[] {
  const tags = new Set<string>()
  for (const d of diagnoses) {
    let matched = false
    for (const [key, val] of Object.entries(DIAGNOSIS_MAP)) {
      if (d.includes(key)) {
        tags.add(val)
        matched = true
        break
      }
    }
    if (!matched) {
      // 未匹配的用通用标签
      tags.add('慢性病管理')
    }
  }
  return [...tags]
}

export default async function HomePage() {
  const patients = getAllPatients()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card border-b-primary/20">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">营养方案管理系统</h1>
          <p className="text-sm text-muted-foreground mt-1">
            基于健康档案的营养评估与个性化配餐方案
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <Link key={p.id} href={`/patient/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{maskName(p.name)}</CardTitle>
                    <span className="text-xs text-muted-foreground">{p.date}</span>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span>{p.gender === '男' ? '♂' : '♀'}</span>
                    <span>{ageRange(p.age)}</span>
                    <span>体重{bmiCategory(p.bmi)}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {maskDiagnoses(p.diagnoses).map((d, i) => (
                      <Badge key={i} variant={i === 0 ? 'default' : 'secondary'} className="text-xs px-2 py-0.5">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                    <span className={p.hasNutritionAssessment ? 'text-health-normal-foreground' : 'text-muted-foreground'}>
                      {p.hasNutritionAssessment ? '✓ 营养评估' : '○ 营养评估'}
                    </span>
                    <span className={p.hasMealPlans ? 'text-health-normal-foreground' : 'text-muted-foreground'}>
                      {p.hasMealPlans ? '✓ 配餐方案' : '○ 配餐方案'}
                    </span>
                    <span className={p.hasExercisePrescription ? 'text-health-normal-foreground' : 'text-muted-foreground'}>
                      {p.hasExercisePrescription ? '✓ 运动处方' : '○ 运动处方'}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5 h-10">
                      查看详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {patients.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">暂无患者数据</p>
          </div>
        )}
      </main>
    </div>
  )
}
