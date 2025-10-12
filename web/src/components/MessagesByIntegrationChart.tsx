"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

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
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366", // Verde de WhatsApp
  },
  telegram: {
    label: "Telegram",
    color: "#0088cc", // Azul de Telegram
  },
  instagram: {
    label: "Instagram",
    color: "#E4405F", // Rosa de Instagram
  },
  messenger: {
    label: "Messenger",
    color: "#0084FF", // Azul de Messenger
  },
} satisfies ChartConfig

interface MessagesByIntegrationChartProps {
  data?: Array<{ 
    date: string; 
    whatsapp: number; 
    telegram: number;
    instagram: number;
    messenger: number;
  }>;
  loading?: boolean;
}

export function MessagesByIntegrationChart({ data = [], loading = false }: MessagesByIntegrationChartProps) {
  // Calcular totales por integración
  const totals = data.reduce((acc, item) => {
    acc.whatsapp += item.whatsapp;
    acc.telegram += item.telegram;
    acc.instagram += item.instagram;
    acc.messenger += item.messenger;
    return acc;
  }, { whatsapp: 0, telegram: 0, instagram: 0, messenger: 0 });

  const totalMessages = Object.values(totals).reduce((sum, val) => sum + val, 0);

  // Calcular integración más activa
  const mostActive = Object.entries(totals)
    .filter(([_, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)[0];

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
        <CardTitle>Mensajes por Integración</CardTitle>
        <CardDescription>
          Mensajes totales por plataforma en los últimos 7 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 6)} // "ene 1"
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="whatsapp"
              type="monotone"
              stroke="var(--color-whatsapp)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="telegram"
              type="monotone"
              stroke="var(--color-telegram)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="instagram"
              type="monotone"
              stroke="var(--color-instagram)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="messenger"
              type="monotone"
              stroke="var(--color-messenger)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            {totalMessages > 0 ? (
              <>
                <div className="flex items-center gap-2 leading-none font-medium">
                  {mostActive && (
                    <>
                      {chartConfig[mostActive[0] as keyof typeof chartConfig].label} es la más activa con {mostActive[1]} mensajes
                      <TrendingUp className="h-4 w-4" />
                    </>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-2 leading-none">
                  {dateRange} • Total: {totalMessages} mensajes
                </div>
              </>
            ) : (
              <div className="text-muted-foreground leading-none">
                No hay mensajes registrados aún
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

