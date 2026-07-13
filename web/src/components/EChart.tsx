import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import {
  BarChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
} from 'echarts/charts'
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
])

export interface ChartSize {
  width: number
  height: number
  compact: boolean
}

export type ResponsiveChartOption = EChartsCoreOption | ((size: ChartSize) => EChartsCoreOption)

interface EChartProps {
  option: ResponsiveChartOption
  className?: string
  ariaLabel: string
  onClick?: (params: unknown) => void
}

function resolvedOption(element: HTMLDivElement, value: ResponsiveChartOption): EChartsCoreOption {
  if (typeof value !== 'function') return value
  const bounds = element.getBoundingClientRect()
  return value({
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
    compact: bounds.width < 600,
  })
}

export function EChart({ option, className = '', ariaLabel, onClick }: EChartProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const optionRef = useRef(option)
  optionRef.current = option

  useEffect(() => {
    if (!elementRef.current) return
    const chart = echarts.init(elementRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    let previousWidth = 0
    let previousHeight = 0
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      if (width === previousWidth && height === previousHeight) return
      previousWidth = width
      previousHeight = height
      chart.resize()
      if (elementRef.current) {
        chart.setOption(resolvedOption(elementRef.current, optionRef.current), {
          notMerge: true,
          lazyUpdate: false,
        })
      }
    })
    observer.observe(elementRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    chartRef.current?.setOption(resolvedOption(element, option), { notMerge: true, lazyUpdate: false })
  }, [option])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onClick) return
    const handler = (params: unknown) => onClick(params)
    chart.on('click', handler)
    return () => {
      if (!chart.isDisposed()) chart.off('click', handler)
    }
  }, [onClick])

  return <div ref={elementRef} className={`echart ${className}`} role="img" aria-label={ariaLabel} />
}
