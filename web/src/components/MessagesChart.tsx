"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  received: {
    label: "Recibidos",
    color: "#14b8a6", // Nexly teal
  },
  sent: {
    label: "Enviados",
    color: "#22c55e", // Nexly green
  },
} satisfies ChartConfig

interface MessagesChartProps {
  data?: Array<{ date: string; sent: number; received: number }>;
  loading?: boolean;
}

export function MessagesChart({ data = [], loading = false }: MessagesChartProps) {
  // Calcular totales y cambio porcentual
  const totalMessages = data.reduce((sum, item) => sum + item.sent + item.received, 0);
  const lastThreeDays = data.slice(-3).reduce((sum, item) => sum + item.sent + item.received, 0);
  const prevThreeDays = data.slice(-6, -3).reduce((sum, item) => sum + item.sent + item.received, 0);
  
  const percentChange = prevThreeDays > 0 
    ? ((lastThreeDays - prevThreeDays) / prevThreeDays * 100).toFixed(1)
    : "0";
  const isPositive = parseFloat(percentChange) >= 0;

  // Formatear rango de fechas
  const dateRange = data.length > 0 
    ? `${data[0].date} - ${data[data.length - 1].date}`
    : "Últimos 7 días";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-32" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad de Mensajes</CardTitle>
        <CardDescription>
          Mensajes enviados y recibidos en los últimos 7 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[15rem] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 0,
              right: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillReceived" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-received)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-received)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillSent" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-sent)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sent)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="received"
              type="natural"
              fill="url(#fillReceived)"
              fillOpacity={0.4}
              stroke="var(--color-received)"
              stackId="a"
            />
            <Area
              dataKey="sent"
              type="natural"
              fill="url(#fillSent)"
              fillOpacity={0.4}
              stroke="var(--color-sent)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {totalMessages > 0 ? (
                <>
                  {isPositive ? "Incremento" : "Disminución"} del {Math.abs(parseFloat(percentChange))}% en los últimos 3 días
                  {isPositive && <TrendingUp className="h-4 w-4" />}
                </>
              ) : (
                "No hay datos de mensajes aún"
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {dateRange}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

