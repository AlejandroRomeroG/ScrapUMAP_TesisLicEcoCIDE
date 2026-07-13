import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Grid3X3, Share2 } from 'lucide-react'
import { EChart, type ResponsiveChartOption } from './EChart'
import type { AnalyticsPayload, ProgramSummary } from '../types'
import { clusterColor } from '../lib/colors'
import { formatCoefficient, formatNumber, formatPercent, shortProgram } from '../lib/format'

interface ProgramsViewProps {
  analytics: AnalyticsPayload
}

interface HeatmapClick {
  value?: [number, number, number, number, string, string]
}

type ProgramMode = 'profile' | 'similarity'

function programAxisLabel(program: ProgramSummary): string {
  const prefix = program.level === 'Licenciatura' ? 'L' : program.level === 'Maestría' ? 'M' : 'D'
  return `${prefix} · ${shortProgram(program.degreeProgram)}`
}

export function ProgramsView({ analytics }: ProgramsViewProps) {
  const [mode, setMode] = useState<ProgramMode>('profile')
  const [selectedName, setSelectedName] = useState(
    [...analytics.programs].sort((a, b) => b.thesisCount - a.thesisCount)[0]?.degreeProgram ?? '',
  )

  const orderedPrograms = useMemo(
    () => [...analytics.programs].sort((a, b) => {
      const levelOrder = { Licenciatura: 0, Maestría: 1, Doctorado: 2 }
      const levelDelta = (levelOrder[a.level as keyof typeof levelOrder] ?? 3) - (levelOrder[b.level as keyof typeof levelOrder] ?? 3)
      return levelDelta || b.thesisCount - a.thesisCount
    }),
    [analytics.programs],
  )

  const selected = analytics.programs.find((program) => program.degreeProgram === selectedName) ?? orderedPrograms[0]
  const programNames = orderedPrograms.map((program) => program.degreeProgram)
  const programLabels = orderedPrograms.map(programAxisLabel)
  const clusters = [...analytics.clusters].sort((a, b) => a.id - b.id)

  const profileOption = useMemo<ResponsiveChartOption>(() => ({ width, compact }) => {
    const matrix = new Map(
      analytics.programMatrix.map((datum) => [`${datum.degreeProgram}|${datum.clusterId}`, datum]),
    )
    const medium = width < 820
    const gridLeft = compact ? 76 : medium ? 154 : 245
    const values = orderedPrograms.flatMap((program, y) => clusters.map((cluster, x) => {
      const datum = matrix.get(`${program.degreeProgram}|${cluster.id}`)
      return [x, y, datum?.programShare ?? 0, datum?.count ?? 0, program.degreeProgram, cluster.theme]
    }))
    return {
      animationDuration: 420,
      animationEasing: 'cubicOut',
      aria: { enabled: true },
      grid: {
        left: gridLeft,
        right: compact ? 8 : 30,
        top: compact ? 14 : 24,
        bottom: compact ? 64 : 74,
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#111815',
        borderWidth: 0,
        textStyle: { color: '#f8faf5', fontFamily: 'Manrope Variable' },
        formatter: (params: unknown) => {
          const value = (params as HeatmapClick).value
          if (!value) return ''
          return `<strong>${value[4]}</strong><br/>${value[5]}<br/><b>${formatPercent(value[2])}</b> · ${formatNumber(value[3])} tesis`
        },
      },
      xAxis: {
        type: 'category',
        data: clusters.map((cluster) => String(cluster.id).padStart(2, '0')),
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#aeb5ad' } },
        axisTick: { show: false },
        axisLabel: { color: '#4e5953', fontFamily: 'Manrope Variable', fontSize: compact ? 8 : 11 },
      },
      yAxis: {
        type: 'category',
        data: programLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#25302a',
          fontFamily: 'Manrope Variable',
          fontSize: compact ? 8 : medium ? 9 : 11,
          width: compact ? 66 : medium ? 138 : 220,
          overflow: 'truncate',
        },
      },
      visualMap: {
        type: 'piecewise',
        orient: 'horizontal',
        left: gridLeft,
        bottom: compact ? 2 : 5,
        dimension: 2,
        itemWidth: compact ? 10 : 14,
        itemHeight: compact ? 8 : 10,
        itemGap: compact ? 4 : 10,
        textGap: compact ? 2 : 5,
        textStyle: { color: '#66716b', fontFamily: 'Manrope Variable', fontSize: compact ? 7 : 10 },
        pieces: [
          { min: 0.2, label: '20%+', color: '#111815' },
          { min: 0.1, max: 0.199999, label: '10–20%', color: '#3f6257' },
          { min: 0.05, max: 0.099999, label: '5–10%', color: '#7f9b91' },
          { min: 0.000001, max: 0.049999, label: '<5%', color: '#cbd4ce' },
          { min: 0, max: 0, label: '0%', color: '#eef0ec' },
        ],
      },
      series: [{
        type: 'heatmap',
        data: values,
        itemStyle: { borderColor: '#f7f8f4', borderWidth: 2, borderRadius: 2 },
        emphasis: { itemStyle: { borderColor: '#111815', borderWidth: 2 } },
      }],
    }
  }, [analytics.programMatrix, clusters, orderedPrograms, programLabels])

  const similarityOption = useMemo<ResponsiveChartOption>(() => ({ width, compact }) => {
    const matrix = new Map(
      analytics.programSimilarity.map((datum) => [`${datum.programA}|${datum.programB}`, datum]),
    )
    const medium = width < 820
    const gridLeft = compact ? 76 : medium ? 154 : 245
    const values = programNames.flatMap((programA, y) => programNames.map((programB, x) => {
      const datum = matrix.get(`${programA}|${programB}`)
      return [x, y, datum?.similarity ?? 0, programA, programB]
    }))
    return {
      animationDuration: 420,
      aria: { enabled: true },
      grid: {
        left: gridLeft,
        right: compact ? 8 : 30,
        top: compact ? 14 : 24,
        bottom: compact ? 94 : 155,
      },
      tooltip: {
        backgroundColor: '#111815',
        borderWidth: 0,
        textStyle: { color: '#f8faf5', fontFamily: 'Manrope Variable' },
        formatter: (params: unknown) => {
          const value = (params as { value?: [number, number, number, string, string] }).value
          if (!value) return ''
          return `<strong>${value[3]}</strong><br/>${value[4]}<br/>Similitud coseno <b>${formatCoefficient(value[2])}</b>`
        },
      },
      xAxis: {
        type: 'category',
        data: programLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          rotate: compact ? 52 : 58,
          color: '#4e5953',
          fontFamily: 'Manrope Variable',
          fontSize: compact ? 7 : 9,
          interval: compact ? 1 : 0,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'category',
        data: programLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#25302a',
          fontFamily: 'Manrope Variable',
          fontSize: compact ? 8 : medium ? 9 : 11,
          width: compact ? 66 : medium ? 138 : 220,
          overflow: 'truncate',
        },
      },
      visualMap: {
        type: 'piecewise',
        orient: 'horizontal',
        left: gridLeft,
        bottom: compact ? 2 : 10,
        dimension: 2,
        itemWidth: compact ? 10 : 14,
        itemHeight: compact ? 8 : 10,
        itemGap: compact ? 4 : 10,
        textGap: compact ? 2 : 5,
        textStyle: { color: '#66716b', fontFamily: 'Manrope Variable', fontSize: compact ? 7 : 10 },
        pieces: [
          { min: 0.9, label: '0.90–1', color: '#0d675a' },
          { min: 0.75, max: 0.899999, label: '0.75–0.90', color: '#4a8c7d' },
          { min: 0.6, max: 0.749999, label: '0.60–0.75', color: '#8bb4a8' },
          { min: 0.4, max: 0.599999, label: '0.40–0.60', color: '#c9d8d2' },
          { min: 0, max: 0.399999, label: '<0.40', color: '#eef0ec' },
        ],
      },
      series: [{
        type: 'heatmap',
        data: values,
        itemStyle: { borderColor: '#f7f8f4', borderWidth: 1.5, borderRadius: 2 },
        emphasis: { itemStyle: { borderColor: '#111815', borderWidth: 2 } },
      }],
    }
  }, [analytics.programSimilarity, programLabels, programNames])

  const similarPrograms = useMemo(
    () => analytics.programSimilarity
      .filter((datum) => datum.programA === selected.degreeProgram && datum.programB !== selected.degreeProgram)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5),
    [analytics.programSimilarity, selected.degreeProgram],
  )

  function handleChartClick(params: unknown) {
    const value = (params as HeatmapClick).value
    const program = mode === 'profile' ? value?.[4] : value?.[4]
    if (typeof program === 'string') setSelectedName(program)
  }

  return (
    <section className="analysis-view programs-view">
      <div className="analysis-toolbar">
        <div>
          <span className="eyebrow">21 programas · 20 territorios</span>
          <h2>Perfiles que se pueden comparar</h2>
        </div>
        <div className="segmented-control labeled" aria-label="Modo de comparación de programas">
          <button type="button" aria-pressed={mode === 'profile'} onClick={() => setMode('profile')}>
            <Grid3X3 size={16} aria-hidden="true" /> Perfil temático
          </button>
          <button type="button" aria-pressed={mode === 'similarity'} onClick={() => setMode('similarity')}>
            <Share2 size={16} aria-hidden="true" /> Similitud
          </button>
        </div>
      </div>

      <div className="analysis-split">
        <div className="chart-region">
          <div className="chart-heading">
            <div>
              <h3>{mode === 'profile' ? 'Mezcla temática por programa' : 'Afinidad entre programas'}</h3>
              <p>{mode === 'profile' ? 'Cada fila suma 100% de la producción del programa.' : 'Coseno entre distribuciones temáticas; 1 indica perfiles idénticos.'}</p>
            </div>
            <span>Fuente: Parquet canónico</span>
          </div>
          <div className="chart-scroll">
            <EChart
              option={mode === 'profile' ? profileOption : similarityOption}
              className="program-chart"
              ariaLabel={mode === 'profile' ? 'Mapa de calor de temas por programa' : 'Matriz de similitud entre programas'}
              onClick={handleChartClick}
            />
          </div>
        </div>

        <motion.aside
          className="analysis-context"
          key={selected.degreeProgram}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          <span className="eyebrow">{selected.level}</span>
          <h2>{selected.program}</h2>
          <div className="metric-strip three">
            <div><strong>{formatNumber(selected.thesisCount)}</strong><span>tesis</span></div>
            <div><strong>{selected.clusterCount}</strong><span>temas</span></div>
            <div><strong>{formatPercent(selected.themeEntropy)}</strong><span>diversidad</span></div>
          </div>
          <div className="dominant-theme" style={{ borderColor: clusterColor(Number(selected.mainClusterLabel.match(/[0-9]+/)?.[0] ?? 0)) }}>
            <span>Tema principal · {formatPercent(selected.mainClusterShare)}</span>
            <p>{selected.mainCluster}</p>
          </div>
          {mode === 'profile' ? (
            <div className="context-section">
              <span>Mezcla principal</span>
              {selected.topThemes.map((theme) => <p key={theme}>{theme}</p>)}
            </div>
          ) : (
            <div className="similar-list">
              <span>Programas más cercanos</span>
              {similarPrograms.map((program) => (
                <button key={program.programB} type="button" onClick={() => setSelectedName(program.programB)}>
                  <span><strong>{shortProgram(program.programB)}</strong><small>{formatCoefficient(program.similarity)} coseno</small></span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          <label className="program-picker">
            <span>Cambiar programa</span>
            <select value={selectedName} onChange={(event) => setSelectedName(event.target.value)}>
              {orderedPrograms.map((program) => <option key={program.degreeProgram}>{program.degreeProgram}</option>)}
            </select>
          </label>
        </motion.aside>
      </div>
    </section>
  )
}
