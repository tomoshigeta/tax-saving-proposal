import { useEffect, useRef } from 'react'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type Chart as ChartType,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js'
import { VIZ } from './theme'

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
)

/** 定年の時点に点線とラベルを引く。データではなく注記なので系列色を使わない */
const retirementLine = (yearsToRetirement: number): Plugin<'bar' | 'line'> => ({
  id: 'retirementLine',
  afterDatasetsDraw(chart: ChartType) {
    const x = chart.scales.x
    const y = chart.scales.y
    if (!x || !y || yearsToRetirement <= 0) return

    const px = x.getPixelForValue(yearsToRetirement - 1)
    if (!Number.isFinite(px)) return

    const { ctx } = chart
    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1
    ctx.strokeStyle = VIZ.textMuted
    ctx.moveTo(px, y.top)
    ctx.lineTo(px, y.bottom)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = VIZ.textSecondary
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = px > (x.left + x.right) / 2 ? 'right' : 'left'
    ctx.fillText('定年', px + (px > (x.left + x.right) / 2 ? -4 : 4), y.top + 10)
    ctx.restore()
  },
})

const axisText = { color: VIZ.textSecondary, font: { size: 10 } }
const nf = new Intl.NumberFormat('ja-JP')
const manTick = (v: number) => (v === 0 ? '0' : `${nf.format(Math.round(v / 10_000))}万`)

/** 両グラフで横軸(年)を揃えるための共通設定 */
const sharedX = (labels: number[]) => ({
  type: 'category' as const,
  grid: { display: false },
  border: { color: VIZ.grid },
  ticks: {
    ...axisText,
    // 目盛りの間引きは下の callback が担う。autoSkip に任せると 10年 / 20年 が落ちる
    autoSkip: false,
    maxRotation: 0,
    callback(this: unknown, index: string | number) {
      const year = labels[Number(index)]
      // 5年刻みと初年度だけラベルを出す
      return year !== undefined && (year === 1 || year % 5 === 0) ? `${year}年` : ''
    },
  },
})

const sharedY = {
  beginAtZero: true,
  grid: { color: VIZ.grid, lineWidth: 1 },
  border: { display: false },
  ticks: { ...axisText, callback: (v: string | number) => manTick(Number(v)) },
}

function useChart(config: ChartConfiguration) {
  const ref = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!ref.current) return
    chartRef.current = new Chart(ref.current, config)
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  })

  return ref
}

interface Props {
  years: number[]
  values: number[]
  yearsToRetirement: number
}

/** 年間節税額の推移。単一系列なので凡例は置かず、見出しが系列名を兼ねる */
export function TaxSavingChart({ years, values, yearsToRetirement }: Props) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          data: values,
          backgroundColor: VIZ.series1,
          maxBarThickness: 24,
          borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: { x: sharedX(years), y: sharedY },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${years[items[0]?.dataIndex ?? 0] ?? 0}年目`,
            label: (item) => `年間節税額 ${nf.format(Math.trunc(item.parsed.y ?? 0))}円`,
          },
        },
      },
    },
    plugins: [retirementLine(yearsToRetirement)],
  })

  return <canvas ref={ref} aria-label="年間節税額の推移" role="img" />
}

/** ローン残債の推移 */
export function LoanBalanceChart({ years, values, yearsToRetirement }: Props) {
  const ref = useChart({
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          data: values,
          borderColor: VIZ.series2,
          backgroundColor: `${VIZ.series2}1a`,
          borderWidth: 2,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: VIZ.series2,
          pointHoverBorderColor: VIZ.surface,
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      scales: { x: sharedX(years), y: sharedY },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${years[items[0]?.dataIndex ?? 0] ?? 0}年目`,
            label: (item) => `ローン残債 ${nf.format(Math.trunc(item.parsed.y ?? 0))}円`,
          },
        },
      },
    },
    plugins: [retirementLine(yearsToRetirement)],
  })

  return <canvas ref={ref} aria-label="ローン残債の推移" role="img" />
}
