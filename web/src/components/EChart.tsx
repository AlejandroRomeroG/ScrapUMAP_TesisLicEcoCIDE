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

interface EChartProps {
  option: EChartsCoreOption
  className?: string
  ariaLabel: string
  onClick?: (params: unknown) => void
}

export function EChart({ option, className = '', ariaLabel, onClick }: EChartProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!elementRef.current) return
    const chart = echarts.init(elementRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(elementRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: false })
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
