"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from '@/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

export const description = "An interactive line chart for Tesla stock price"

const chartConfig = {
  price: {
    label: "Price",
    theme: {
      light: "hsl(220 90% 50%)",
      dark: "hsl(220 90% 60%)",
    },
  },
} satisfies ChartConfig

interface StockData {
  date: string
  price: number
}

export function ChartRevenueLine() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("365d")
  const [stockData, setStockData] = React.useState<StockData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // Fetch stock data when timeRange changes
  React.useEffect(() => {
    const fetchStockData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/tesla-stock?timeRange=${timeRange}`)
        const data = await response.json()
        setStockData(data)
      } catch (error) {
        console.error('Error fetching stock data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStockData()
  }, [timeRange])

  const filteredData = stockData

  const getTimeRangeLabel = () => {
    if (timeRange === "365d") return "the last 12 months"
    if (timeRange === "180d") return "the last 6 months"
    if (timeRange === "30d") return "Last 30 days"
    if (timeRange === "7d") return "Last 7 days"
    return "the last 12 months"
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Tesla Stock Price</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {getTimeRangeLabel()}
          </span>
          <span className="@[540px]/card:hidden">
            {timeRange === "365d" ? "Last 12 months" : timeRange === "180d" ? "Last 6 months" : timeRange === "30d" ? "Last 30 days" : "Last 7 days"}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="365d">Last 12 months</ToggleGroupItem>
            <ToggleGroupItem value="180d">Last 6 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 12 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="365d" className="rounded-lg">
                Last 12 months
              </SelectItem>
              <SelectItem value="180d" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="text-muted-foreground">Loading stock data...</div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-price)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-price)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  return `$${value.toFixed(0)}`
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }}
                    indicator="dot"
                    formatter={(value) => {
                      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }}
                  />
                }
              />
              <Area
                dataKey="price"
                type="natural"
                fill="url(#fillPrice)"
                stroke="var(--color-price)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
