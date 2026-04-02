'use client'

import type { PatientData } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const statusConfig: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  normal: { label: '正常', className: 'bg-health-normal text-health-normal-foreground border-health-normal-foreground/20', icon: 'check' },
  high: { label: '偏高', className: 'bg-health-warning text-health-warning-foreground border-health-warning-foreground/20', icon: 'arrow-up' },
  very_high: { label: '偏高', className: 'bg-health-danger text-health-danger-foreground border-health-danger-foreground/20', icon: 'double-arrow-up' },
  low: { label: '偏低', className: 'bg-health-info text-health-info-foreground border-health-info-foreground/20', icon: 'arrow-down' },
  very_low: { label: '偏低', className: 'bg-health-danger text-health-danger-foreground border-health-danger-foreground/20', icon: 'double-arrow-down' },
}

function StatusIcon({ icon }: { icon: string }) {
  const props = { className: 'size-3 shrink-0', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
  switch (icon) {
    case 'check':
      return <svg {...props}><path d="M2 6l3 3 5-5" /></svg>
    case 'arrow-up':
      return <svg {...props}><path d="M6 2v8M3 5l3-3 3 3" /></svg>
    case 'double-arrow-up':
      return <svg {...props}><path d="M6 1v10M3 4l3-3 3 3M3 7l3-3 3 3" /></svg>
    case 'arrow-down':
      return <svg {...props}><path d="M6 10V2M3 7l3 3 3-3" /></svg>
    case 'double-arrow-down':
      return <svg {...props}><path d="M6 11V1M3 8l3 3 3-3M3 5l3 3 3-3" /></svg>
    default:
      return null
  }
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.normal
  return (
    <Badge variant="outline" className={`gap-0.5 ${config.className}`}>
      <StatusIcon icon={config.icon} />
      {config.label}
    </Badge>
  )
}

interface HealthProfileProps {
  patient: PatientData
}

export function HealthProfile({ patient }: HealthProfileProps) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
            <InfoField label="性别" value={patient.gender} />
            <InfoField label="年龄" value={`${patient.age} 岁`} />
            <InfoField label="身高" value={`${patient.height} cm`} />
            <InfoField label="体重" value={`${patient.weight} kg`} />
            <div>
              <span className="text-xs text-muted-foreground">BMI</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{patient.bmi}</span>
                <Badge variant="secondary" className="text-xs">
                  {patient.bmiCategory}
                </Badge>
              </div>
            </div>
            <InfoField label="血压" value={patient.bloodPressure} />
          </div>
        </CardContent>
      </Card>

      {/* 诊断 */}
      {patient.diagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>诊断</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {patient.diagnoses.map((d, i) => (
                <Badge key={i} variant={i === 0 ? 'default' : 'secondary'}>
                  {d}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 检验结果 */}
      {patient.labGroups.length > 0 && (
        <div className="space-y-4">
          {patient.labGroups.map((group, gi) => (
            <Card key={gi}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>指标</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead>参考范围</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.results.map((r, ri) => (
                      <TableRow key={ri} className={
                          r.status === 'very_high' || r.status === 'very_low'
                            ? 'border-l-2 border-l-health-danger-foreground bg-health-danger/30'
                            : r.status === 'high'
                              ? 'border-l-2 border-l-health-warning-foreground bg-health-warning/30'
                              : r.status === 'low'
                                ? 'border-l-2 border-l-health-info-foreground bg-health-info/30'
                                : ''
                        }>
                        <TableCell className="font-medium">{r.indicator}</TableCell>
                        <TableCell>{r.value}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell>{r.reference}</TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 用药信息 */}
      {patient.medications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>用药信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>药品</TableHead>
                  <TableHead>剂量</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.medications.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.dose}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                    <TableCell>{m.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 营养重点关注 */}
      {patient.nutritionNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>营养重点关注</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-1.5">
              {patient.nutritionNotes.map((note, i) => (
                <li key={i} className="text-sm">{note}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 生活方式 */}
      {patient.lifestyles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>生活方式</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1.5">
              {patient.lifestyles.map((item, i) => (
                <li key={i} className="text-sm">{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
