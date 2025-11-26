import { IconTrendingDown, IconTrendingUp, IconUsers, IconChartBar } from "@tabler/icons-react"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SectionCardsAlt() {
  return (
    <div className="px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2">
        <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <CardHeader className="relative pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription className="text-base font-medium">Revenue Performance</CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">$24,580</CardTitle>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <IconChartBar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Monthly Growth</p>
                <p className="text-xs text-muted-foreground">Compared to last month</p>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                <IconTrendingUp className="h-3 w-3" />
                +18.2%
              </Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[82%] bg-gradient-to-r from-primary to-primary/60 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <CardHeader className="relative pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription className="text-base font-medium">User Engagement</CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">8,942</CardTitle>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <IconUsers className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Active Sessions</p>
                <p className="text-xs text-muted-foreground">Last 30 days average</p>
              </div>
              <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                <IconTrendingUp className="h-3 w-3" />
                +5.4%
              </Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[68%] bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <CardHeader className="relative pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription className="text-base font-medium">Conversion Rate</CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">3.24%</CardTitle>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <IconTrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Target Achievement</p>
                <p className="text-xs text-muted-foreground">Against quarterly goal</p>
              </div>
              <Badge variant="default" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                <IconTrendingUp className="h-3 w-3" />
                +2.1%
              </Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[75%] bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <CardHeader className="relative pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription className="text-base font-medium">Churn Rate</CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">1.8%</CardTitle>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <IconTrendingDown className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Retention Impact</p>
                <p className="text-xs text-muted-foreground">Lower is better</p>
              </div>
              <Badge variant="default" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                <IconTrendingDown className="h-3 w-3" />
                -0.3%
              </Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[45%] bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
