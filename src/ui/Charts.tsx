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
  type ChartConfiguration,
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

const axisText = { color: VIZ.textMuted, font: { size: 9 } }
const nf = new Intl.NumberFormat('ja-JP')
const manTick = (v: number) => (v === 0 ? '0' : `${nf.format(Math.round(v / 10_000))}万`)

/** 横軸(年)の共通設定。節税額は試算期間、残債は返済期間と範囲は違うが、目盛りの規則は揃える */
const sharedX = (labels: number[]) => ({
  type: 'category' as const,
  grid: { display: false },
  border: { color: VIZ.axis },
  ticks: {
    ...axisText,
    // 目盛りの間引きは下の callback が担う。autoSkip に任せると 10年 / 20年 が落ちる
    autoSkip: false,
    maxRotation: 0,
    callback(this: unknown, index: string | number) {
      const i = Number(index)
      const year = labels[i]
      if (year === undefined) return ''
      if (i === labels.length - 1) return `${year}年`
      // 5年刻みと初年度だけラベルを出す。最終目盛りと重なる位置は空ける
      const isLandmark = year === 1 || year % 5 === 0
      return isLandmark && i < labels.length - 2 ? `${year}年` : ''
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
}

/** 年間節税額の推移。単一系列なので凡例は置かず、見出しが系列名を兼ねる */
export function TaxSavingChart({ years, values }: Props) {
  const ref = useChart({
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          data: values,
          backgroundColor: VIZ.series,
          maxBarThickness: 22,
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
  })

  return <canvas ref={ref} aria-label="年間節税額の推移" role="img" />
}

/** ローン残債の推移 */
export function LoanBalanceChart({ years, values }: Props) {
  const ref = useChart({
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          data: values,
          borderColor: VIZ.series,
          backgroundColor: VIZ.seriesFill,
          borderWidth: 2,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: VIZ.series,
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
  })

  return <canvas ref={ref} aria-label="ローン残債の推移" role="img" />
}
