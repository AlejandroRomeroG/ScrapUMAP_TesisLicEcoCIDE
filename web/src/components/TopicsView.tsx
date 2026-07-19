import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { EChart, type ResponsiveChartOption } from './EChart'
import type { AnalyticsPayload } from '../types'
import { CLUSTER_COLORS, clusterColor } from '../lib/colors'
import { formatCoefficient, formatNumber, formatPercent } from '../lib/format'

interface TopicsViewProps {
  analytics: AnalyticsPayload
}

interface TopicClick {
  value?: [number, number, number, number, string]
}

export function TopicsView({ analytics }: TopicsViewProps) {
  const initialCluster = analytics.clusters.find((cluster) => cluster.theme === 'Crimen, violencia y seguridad')
    ?? analytics.clusters[0]
  const [selectedId, setSelectedId] = useState(initialCluster.id)
  const selected = analytics.clusters.find((cluster) => cluster.id === selectedId) ?? initialCluster

  const topicDomains = useMemo(() => {
    const years = analytics.clusters.map((cluster) => cluster.yearMean)
    const interdisciplinarity = analytics.clusters.map((cluster) => cluster.interdisciplinarity)
    const yearMin = Math.min(...years)
    const yearMax = Math.max(...years)
    const interdisciplinarityMin = Math.min(...interdisciplinarity)
    const interdisciplinarityMax = Math.max(...interdisciplinarity)

    function domain(compact: boolean) {
      const yearPadding = Math.max((yearMax - yearMin) * (compact ? 0.09 : 0.07), compact ? 0.55 : 0.4)
      const interdisciplinarityPadding = Math.max(
        (interdisciplinarityMax - interdisciplinarityMin) * (compact ? 0.14 : 0.1),
        compact ? 0.07 : 0.055,
      )
      return {
        yearMin: yearMin - yearPadding,
        yearMax: yearMax + yearPadding,
        interdisciplinarityMin: Math.max(
          0,
          Math.floor((interdisciplinarityMin - interdisciplinarityPadding) * 20) / 20,
        ),
        interdisciplinarityMax: Math.min(
          1,
          Math.ceil((interdisciplinarityMax + interdisciplinarityPadding) * 20) / 20,
        ),
      }
    }

    return { compact: domain(true), regular: domain(false) }
  }, [analytics.clusters])

  const option = useMemo<ResponsiveChartOption>(() => ({ compact }) => ({
    animationDuration: 560,
    animationEasing: 'cubicOut',
    aria: { enabled: true },
    grid: {
      left: compact ? 44 : 62,
      right: compact ? 14 : 32,
      top: compact ? 24 : 34,
      bottom: compact ? 52 : 68,
    },
    tooltip: {
      backgroundColor: '#111815',
      borderWidth: 0,
      textStyle: { color: '#f8faf5', fontFamily: 'Manrope Variable' },
      formatter: (params: unknown) => {
        const value = (params as TopicClick).value
        if (!value) return ''
        return `<strong>${value[4]}</strong><br/>${formatNumber(value[2])} tesis<br/>Interdisciplinariedad <b>${formatCoefficient(value[1])}</b><br/>Año medio ${formatCoefficient(value[0], 1)}`
      },
    },
    xAxis: {
      type: 'value',
      scale: true,
      min: compact ? topicDomains.compact.yearMin : topicDomains.regular.yearMin,
      max: compact ? topicDomains.compact.yearMax : topicDomains.regular.yearMax,
      splitNumber: compact ? 4 : 5,
      name: compact ? 'Año promedio' : 'Año promedio de publicación',
      nameLocation: 'middle',
      nameGap: compact ? 30 : 42,
      axisLine: { lineStyle: { color: '#aeb5ad' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#66716b',
        fontFamily: 'Manrope Variable',
        fontSize: compact ? 9 : 12,
        formatter: (value: number) => String(Math.round(value)),
      },
      nameTextStyle: { color: '#66716b', fontFamily: 'Manrope Variable', fontSize: compact ? 9 : 12 },
      splitLine: { lineStyle: { color: '#e2e5df' } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      min: compact
        ? topicDomains.compact.interdisciplinarityMin
        : topicDomains.regular.interdisciplinarityMin,
      max: compact
        ? topicDomains.compact.interdisciplinarityMax
        : topicDomains.regular.interdisciplinarityMax,
      splitNumber: compact ? 4 : 5,
      name: compact ? 'Interdisciplina' : 'Interdisciplinariedad',
      nameLocation: 'middle',
      nameGap: compact ? 30 : 46,
      axisLine: { lineStyle: { color: '#aeb5ad' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#66716b',
        fontFamily: 'Manrope Variable',
        fontSize: compact ? 9 : 12,
        formatter: (value: number) => {
          const precision = Math.abs(value * 10 - Math.round(value * 10)) < 0.000001 ? 1 : 2
          return formatCoefficient(value, precision)
        },
      },
      nameTextStyle: { color: '#66716b', fontFamily: 'Manrope Variable', fontSize: compact ? 9 : 12 },
      splitLine: { lineStyle: { color: '#e2e5df' } },
    },
    series: analytics.clusters.map((cluster) => ({
      name: cluster.theme,
      type: 'scatter',
      data: [[cluster.yearMean, cluster.interdisciplinarity, cluster.count, cluster.id, cluster.theme]],
      symbolSize: Math.max(compact ? 18 : 25, Math.sqrt(cluster.count) * (compact ? 3.35 : 4.4)),
      itemStyle: {
        color: clusterColor(cluster.id),
        borderColor: selectedId === cluster.id ? '#111815' : '#f7f8f4',
        borderWidth: selectedId === cluster.id ? 3 : 1.5,
        opacity: selectedId === cluster.id ? 1 : 0.84,
      },
      label: {
        show: true,
        position: 'inside',
        color: '#ffffff',
        fontFamily: 'Space Grotesk Variable',
        fontWeight: 700,
        fontSize: compact ? 8 : 10,
        formatter: String(cluster.id).padStart(2, '0'),
      },
      emphasis: { scale: 1.12 },
    })),
  }), [analytics.clusters, selectedId, topicDomains])

  function handleClick(params: unknown) {
    const value = (params as TopicClick).value
    if (typeof value?.[3] === 'number') setSelectedId(value[3])
  }

  return (
    <section className="analysis-view topics-view">
      <div className="analysis-toolbar">
        <div>
          <span className="eyebrow">Cartografía de temas</span>
          <h2>Volumen, tiempo y mezcla disciplinaria</h2>
        </div>
      </div>

      <div className="analysis-split">
        <div className="chart-region">
          <div className="chart-heading">
            <div>
              <h3>Los veinte territorios del CIDE</h3>
              <p>El tamaño de cada círculo representa el número de tesis; arriba aparecen los temas con mayor mezcla entre programas y, a la derecha, los de publicación más reciente.</p>
            </div>
            <span>n = {formatNumber(analytics.meta.thesisCount)}</span>
          </div>
          <EChart
            option={option}
            className="topic-chart"
            ariaLabel="Dispersión de clusters por año promedio e interdisciplinariedad"
            onClick={handleClick}
          />
        </div>

        <motion.aside
          className="analysis-context topic-context"
          key={selected.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="topic-number" style={{ backgroundColor: CLUSTER_COLORS[selected.id] }}>
            {String(selected.id).padStart(2, '0')}
          </div>
          <span className="eyebrow">Territorio temático</span>
          <h2>{selected.theme}</h2>
          <div className="metric-strip three">
            <div><strong>{formatNumber(selected.count)}</strong><span>tesis</span></div>
            <div><strong>{formatCoefficient(selected.effectivePrograms, 1)}</strong><span>programas efectivos</span></div>
            <div><strong>{formatPercent(selected.interdisciplinarity)}</strong><span>interdisciplina</span></div>
          </div>
          <div className="keyword-cloud compact" aria-label="Palabras clave del territorio">
            {selected.keywords.slice(0, 12).map((keyword, index) => (
              <span key={keyword} style={{ fontSize: `${1.22 - index * 0.03}rem` }}>{keyword}</span>
            ))}
          </div>
          <div className="context-section">
            <span>Programas con mayor presencia</span>
            {selected.topPrograms.slice(0, 4).map((program) => <p key={program}>{program}</p>)}
          </div>
          <div className="context-section representative-list">
            <span>Tesis representativas</span>
            {selected.representativeTheses.map((title) => (
              <p key={title}><ArrowRight size={14} aria-hidden="true" />{title}</p>
            ))}
          </div>
        </motion.aside>
      </div>
    </section>
  )
}
