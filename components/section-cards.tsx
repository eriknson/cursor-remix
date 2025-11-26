import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 py-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Revenue</CardDescription>
          <CardTitle className="text-2xl">$1,200.00</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="mr-1 h-3 w-3" />
              50%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2">
            Trending up this month <IconTrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground">
            Visitors for the last 12 months
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Acquisition</CardDescription>
          <CardTitle className="text-2xl">2,540</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown className="mr-1 h-3 w-3" />
              -80%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2">
            Down 80% this period <IconTrendingDown className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground">
            Review acquisition channels
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Active Users</CardDescription>
          <CardTitle className="text-2xl">45,678</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="mr-1 h-3 w-3" />
              50%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2">
            Strong user retention <IconTrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground">Engagement exceed targets</div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Growth Rate</CardDescription>
          <CardTitle className="text-2xl">12%</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="mr-1 h-3 w-3" />
              +12%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2">
            Steady performance increase <IconTrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground">Meets growth projections</div>
        </CardFooter>
      </Card>
    </div>
  )
}
