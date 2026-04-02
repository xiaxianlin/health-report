import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAllPatients } from '@/lib/parser'

export const dynamic = 'force-dynamic'

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
            <Link key={p.name} href={`/patient/${encodeURIComponent(p.name)}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">{p.date}</span>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span>{p.gender === '男' ? '♂' : '♀'}</span>
                    <span>{p.age}岁</span>
                    <span>BMI {p.bmi}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {p.diagnoses.slice(0, 4).map((d, i) => (
                      <Badge key={i} variant={i === 0 ? 'default' : 'secondary'} className="text-sm px-2.5 py-0.5">
                        {d.length > 12 ? d.slice(0, 12) + '…' : d}
                      </Badge>
                    ))}
                    {p.diagnoses.length > 4 && (
                      <Badge variant="outline" className="text-sm px-2.5 py-0.5">+{p.diagnoses.length - 4}</Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                    <span className={p.nutritionAssessment ? 'text-health-normal-foreground' : 'text-muted-foreground'}>
                      {p.nutritionAssessment ? '✓ 营养评估' : '○ 营养评估'}
                    </span>
                    <span className={p.mealPlans.length > 0 ? 'text-health-normal-foreground' : 'text-muted-foreground'}>
                      {p.mealPlans.length > 0 ? `✓ 配餐×${p.mealPlans.length}周` : '○ 配餐方案'}
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
            <p className="text-sm mt-2">请确认 results/ 目录下有用户子目录及 data.json 文件</p>
          </div>
        )}
      </main>
    </div>
  )
}
