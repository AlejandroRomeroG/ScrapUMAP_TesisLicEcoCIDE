import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  ChevronRight,
  Filter,
  Pause,
  Play,
  Search,
  X,
} from 'lucide-react'
import type {
  AnalyticsPayload,
  AtlasFilters,
  MapMode,
  ThesisDetails,
  ThesisPoint,
} from '../types'
import { clusterColor } from '../lib/colors'
import { formatNumber, languageLabel, normalizeSearch } from '../lib/format'

interface AtlasMapViewProps {
  points: ThesisPoint[]
  analytics: AnalyticsPayload
  filters: AtlasFilters
  onFiltersChange: (filters: AtlasFilters) => void
  selected: ThesisPoint | null
  onSelect: (point: ThesisPoint | null) => void
  loadDetails: (thesisId: string) => Promise<ThesisDetails | null>
  timelineMode?: boolean
}

const EMPTY_FILTERS: AtlasFilters = {
  query: '',
  level: '',
  program: '',
  clusterId: null,
}

const SemanticMap = lazy(() => import('./SemanticMap').then((module) => ({ default: module.SemanticMap })))

export function AtlasMapView({
  points,
  analytics,
  filters,
  onFiltersChange,
  selected,
  onSelect,
  loadDetails,
  timelineMode = false,
}: AtlasMapViewProps) {
  const [mode, setMode] = useState<MapMode>('2d')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [year, setYear] = useState(analytics.meta.yearMax)
  const [playing, setPlaying] = useState(false)
  const [details, setDetails] = useState<ThesisDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const levels = useMemo(
    () => Object.keys(analytics.meta.levelCounts).sort((a, b) => a.localeCompare(b, 'es')),
    [analytics.meta.levelCounts],
  )
  const programs = useMemo(
    () => [...new Set(points.map((point) => point.degreeProgram))].sort((a, b) => a.localeCompare(b, 'es')),
    [points],
  )

  const query = normalizeSearch(filters.query)
  const preClusterPoints = useMemo(
    () => points.filter((point) => {
      if (filters.level && point.level !== filters.level) return false
      if (filters.program && point.degreeProgram !== filters.program) return false
      if (!query) return true
      return normalizeSearch([
        point.title,
        point.author,
        point.advisor ?? '',
        point.program,
        point.clusterTheme,
        point.subtopic,
      ].join(' ')).includes(query)
    }),
    [filters.level, filters.program, points, query],
  )

  const filteredPoints = useMemo(
    () => preClusterPoints.filter((point) => filters.clusterId === null || point.clusterId === filters.clusterId),
    [filters.clusterId, preClusterPoints],
  )

  const displayedPoints = useMemo(
    () => timelineMode ? filteredPoints.filter((point) => point.year <= year) : filteredPoints,
    [filteredPoints, timelineMode, year],
  )

  const clusterCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const point of preClusterPoints) counts.set(point.clusterId, (counts.get(point.clusterId) ?? 0) + 1)
    return counts
  }, [preClusterPoints])

  const yearStats = useMemo(() => {
    const newThisYear = filteredPoints.filter((point) => point.year === year).length
    const accumulated = filteredPoints.filter((point) => point.year <= year).length
    const clusterCountsAtYear = new Map<number, number>()
    for (const point of filteredPoints) {
      if (point.year > year) continue
      clusterCountsAtYear.set(point.clusterId, (clusterCountsAtYear.get(point.clusterId) ?? 0) + 1)
    }
    const topClusters = analytics.clusters
      .map((cluster) => ({ cluster, count: clusterCountsAtYear.get(cluster.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    return { newThisYear, accumulated, topClusters }
  }, [analytics.clusters, filteredPoints, year])

  const activeFilterCount = [filters.level, filters.program, filters.clusterId].filter((value) => value !== '' && value !== null).length

  useEffect(() => {
    if (!playing || !timelineMode) return
    const timer = window.setInterval(() => {
      setYear((current) => {
        if (current >= analytics.meta.yearMax) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 520)
    return () => window.clearInterval(timer)
  }, [analytics.meta.yearMax, playing, timelineMode])

  useEffect(() => {
    if (!selected) {
      setDetails(null)
      return
    }
    let active = true
    setDetails(null)
    setDetailsLoading(true)
    loadDetails(selected.id)
      .then((value) => {
        if (active) setDetails(value)
      })
      .finally(() => {
        if (active) setDetailsLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadDetails, selected])

  useEffect(() => {
    if (selected && !displayedPoints.some((point) => point.id === selected.id)) onSelect(null)
  }, [displayedPoints, onSelect, selected])

  function updateFilter<Key extends keyof AtlasFilters>(key: Key, value: AtlasFilters[Key]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  function togglePlayback() {
    if (!playing && year >= analytics.meta.yearMax) setYear(analytics.meta.yearMin)
    setPlaying((value) => !value)
  }

  const selectedCluster = filters.clusterId === null
    ? null
    : analytics.clusters.find((cluster) => cluster.id === filters.clusterId) ?? null

  return (
    <section className="map-view" aria-label={timelineMode ? 'Película temporal de tesis' : 'Mapa semántico de tesis'}>
      <div className="map-toolbar">
        <label className="search-control">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar tesis, autor, asesor o tema</span>
          <input
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Buscar tesis, autor, asesor o tema"
            type="search"
          />
          {filters.query && (
            <button type="button" aria-label="Limpiar búsqueda" onClick={() => updateFilter('query', '')}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="segmented-control" aria-label="Dimensiones del mapa">
          {(['2d', '3d'] as MapMode[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          className="filter-toggle"
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <Filter size={17} aria-hidden="true" />
          Filtros
          {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            className="filter-band"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <label>
              <span>Nivel</span>
              <select value={filters.level} onChange={(event) => updateFilter('level', event.target.value)}>
                <option value="">Todos los niveles</option>
                {levels.map((level) => <option key={level}>{level}</option>)}
              </select>
            </label>
            <label>
              <span>Programa</span>
              <select value={filters.program} onChange={(event) => updateFilter('program', event.target.value)}>
                <option value="">Todos los programas</option>
                {programs.map((program) => <option key={program}>{program}</option>)}
              </select>
            </label>
            <button
              className="clear-filters"
              type="button"
              disabled={activeFilterCount === 0}
              onClick={() => onFiltersChange({ ...EMPTY_FILTERS, query: filters.query })}
            >
              <X size={16} aria-hidden="true" />
              Restablecer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="map-workspace">
        <div className="map-stage">
          <Suspense fallback={<div className="map-loading">Preparando mapa WebGL…</div>}>
            <SemanticMap
              points={displayedPoints}
              fitPoints={filteredPoints}
              clusters={analytics.clusters}
              mode={mode}
              selectedId={selected?.id ?? null}
              selectedClusterId={filters.clusterId}
              yearCutoff={timelineMode ? year : null}
              onSelect={onSelect}
              onClusterSelect={(clusterId) => updateFilter('clusterId', clusterId)}
              ariaLabel={`${formatNumber(displayedPoints.length)} tesis visibles en mapa semántico ${mode.toUpperCase()}`}
            />
          </Suspense>

          <div className="map-readout" aria-live="polite">
            <strong>{formatNumber(displayedPoints.length)}</strong>
            <span>tesis visibles</span>
          </div>

          <div className="map-mode-hint">
            {mode === '2d' ? 'Arrastra para mover · rueda para acercar' : 'Arrastra para orbitar · rueda para acercar'}
          </div>

          {timelineMode && (
            <div className="timeline-dock">
              <button
                className="play-button"
                type="button"
                aria-label={playing ? 'Pausar película' : 'Reproducir película'}
                onClick={togglePlayback}
              >
                {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} fill="currentColor" aria-hidden="true" />}
              </button>
              <div className="timeline-year">
                <span>Año</span>
                <strong>{year}</strong>
              </div>
              <label className="timeline-range">
                <span className="sr-only">Año de corte</span>
                <input
                  type="range"
                  min={analytics.meta.yearMin}
                  max={analytics.meta.yearMax}
                  value={year}
                  onChange={(event) => {
                    setPlaying(false)
                    setYear(Number(event.target.value))
                  }}
                />
                <span className="range-labels">
                  <span>{analytics.meta.yearMin}</span>
                  <span>{analytics.meta.yearMax}</span>
                </span>
              </label>
              <div className="timeline-counts">
                <span><strong>{formatNumber(yearStats.newThisYear)}</strong> nuevas</span>
                <span><strong>{formatNumber(yearStats.accumulated)}</strong> acumuladas</span>
              </div>
            </div>
          )}
        </div>

        <aside className="map-context" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                className="thesis-detail"
                key={selected.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="context-heading">
                  <span className="eyebrow">Tesis seleccionada</span>
                  <button type="button" className="icon-button" aria-label="Cerrar detalle" onClick={() => onSelect(null)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <h2>{selected.title}</h2>
                <p className="detail-author">{selected.author}</p>
                <dl className="detail-facts">
                  <div><dt>Año</dt><dd>{selected.year}</dd></div>
                  <div><dt>Nivel</dt><dd>{selected.level}</dd></div>
                  <div><dt>Programa</dt><dd>{selected.program}</dd></div>
                  <div><dt>Idioma</dt><dd>{languageLabel(selected.language)}</dd></div>
                  <div><dt>Asesoría</dt><dd>{selected.advisor ?? 'No registrada'}</dd></div>
                </dl>
                <div className="theme-marker" style={{ '--cluster-color': clusterColor(selected.clusterId) } as CSSProperties}>
                  <span>{String(selected.clusterId).padStart(2, '0')}</span>
                  <p>{selected.clusterTheme}</p>
                </div>
                <div className="subtopic-line">
                  <span>Subtema</span>
                  <p>{selected.subtopic}</p>
                </div>
                <div className="abstract-block">
                  <span>Resumen</span>
                  {detailsLoading ? <p className="loading-copy">Cargando resumen…</p> : <p>{details?.abstract ?? 'Sin resumen disponible.'}</p>}
                </div>
                {details && details.subjects.length > 0 && (
                  <div className="subjects-line">
                    <span>Materias</span>
                    <p>{details.subjects.join(' · ')}</p>
                  </div>
                )}
                <a className="source-link" href={selected.url} target="_blank" rel="noreferrer">
                  Abrir ficha original
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </motion.div>
            ) : timelineMode ? (
              <motion.div key="timeline-context" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="eyebrow">Pulso temático · {year}</span>
                <h2>Cómo se expande el mapa</h2>
                <p className="context-intro">La posición de cada tesis permanece fija; el tiempo revela cuándo se incorporó al paisaje.</p>
                <ol className="rank-list timeline-rank">
                  {yearStats.topClusters.map(({ cluster, count }) => (
                    <li key={cluster.id}>
                      <button type="button" onClick={() => updateFilter('clusterId', cluster.id)}>
                        <span className="rank-index" style={{ backgroundColor: clusterColor(cluster.id) }}>{String(cluster.id).padStart(2, '0')}</span>
                        <span className="rank-copy"><strong>{cluster.theme}</strong><small>{formatNumber(count)} acumuladas</small></span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              </motion.div>
            ) : selectedCluster ? (
              <motion.div key={`cluster-${selectedCluster.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="context-heading">
                  <span className="eyebrow">Territorio {String(selectedCluster.id).padStart(2, '0')}</span>
                  <button type="button" className="icon-button" aria-label="Quitar filtro de tema" onClick={() => updateFilter('clusterId', null)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <h2>{selectedCluster.theme}</h2>
                <p className="context-intro">{formatNumber(selectedCluster.count)} tesis · {selectedCluster.programCount} programas · {selectedCluster.yearMin}–{selectedCluster.yearMax}</p>
                <div className="keyword-cloud" aria-label="Palabras clave">
                  {selectedCluster.keywords.slice(0, 10).map((keyword, index) => (
                    <span key={keyword} style={{ fontSize: `${1.28 - index * 0.035}rem` }}>{keyword}</span>
                  ))}
                </div>
                <div className="context-section">
                  <span>Programas con mayor presencia</span>
                  {selectedCluster.topPrograms.slice(0, 4).map((program) => <p key={program}>{program}</p>)}
                </div>
              </motion.div>
            ) : (
              <motion.div key="cluster-index" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="eyebrow">Veinte territorios</span>
                <h2>Explora por tema</h2>
                <p className="context-intro">Selecciona un territorio para aislarlo o entra directamente a una tesis desde el mapa.</p>
                <ol className="rank-list cluster-index-list">
                  {analytics.clusters.map((cluster) => (
                    <li key={cluster.id}>
                      <button
                        type="button"
                        disabled={(clusterCounts.get(cluster.id) ?? 0) === 0}
                        onClick={() => updateFilter('clusterId', cluster.id)}
                      >
                        <span className="rank-index" style={{ backgroundColor: clusterColor(cluster.id) }}>{String(cluster.id).padStart(2, '0')}</span>
                        <span className="rank-copy"><strong>{cluster.theme}</strong><small>{formatNumber(clusterCounts.get(cluster.id) ?? 0)} visibles</small></span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </section>
  )
}
