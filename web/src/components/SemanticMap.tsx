import { useMemo, useState } from 'react'
import { DeckGL } from '@deck.gl/react'
import {
  COORDINATE_SYSTEM,
  OrbitView,
  OrthographicView,
  type PickingInfo,
} from '@deck.gl/core'
import { LineLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { SphereGeometry } from '@luma.gl/engine'
import { LocateFixed } from 'lucide-react'
import type { ClusterSummary, MapMode, ThesisPoint } from '../types'
import { clusterColorRgb } from '../lib/colors'

interface SemanticMapProps {
  points: ThesisPoint[]
  clusters: ClusterSummary[]
  mode: MapMode
  selectedId: string | null
  selectedClusterId?: number | null
  yearCutoff?: number | null
  onSelect: (point: ThesisPoint | null) => void
  onClusterSelect?: (clusterId: number) => void
  ariaLabel: string
}

interface GridLine {
  source: [number, number, number]
  target: [number, number, number]
}

const MAP_CENTER: [number, number, number] = [7.74, 4.56, 3.42]
const THESIS_SPHERE = new SphereGeometry({ id: 'thesis-sphere', radius: 1, nlat: 8, nlong: 12 })
const COMMUNITY_SPHERE = new SphereGeometry({
  id: 'community-sphere',
  radius: 1,
  nlat: 14,
  nlong: 18,
})

type MapObject = ThesisPoint | ClusterSummary

function isClusterSummary(object: MapObject): object is ClusterSummary {
  return 'centroid' in object && 'count' in object
}

function buildGrid(): GridLine[] {
  const lines: GridLine[] = []
  const minX = 3.6
  const maxX = 11.9
  const minY = 0.3
  const maxY = 8.5
  const floor = 0.55
  for (let x = 4; x <= 12; x += 1) {
    lines.push({ source: [x, minY, floor], target: [x, maxY, floor] })
  }
  for (let y = 1; y <= 8; y += 1) {
    lines.push({ source: [minX, y, floor], target: [maxX, y, floor] })
  }
  return lines
}

const GRID_LINES = buildGrid()

export function SemanticMap({
  points,
  clusters,
  mode,
  selectedId,
  selectedClusterId = null,
  yearCutoff = null,
  onSelect,
  onClusterSelect,
  ariaLabel,
}: SemanticMapProps) {
  const [resetVersion, setResetVersion] = useState(0)

  const visibleClusterIds = useMemo(() => new Set(points.map((point) => point.clusterId)), [points])
  const visibleClusters = useMemo(
    () => clusters.filter((cluster) => visibleClusterIds.has(cluster.id)),
    [clusters, visibleClusterIds],
  )

  const layers = useMemo(() => {
    const gridLayer = new LineLayer<GridLine>({
      id: `atlas-grid-${mode}`,
      data: GRID_LINES,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getSourcePosition: (line) => mode === '3d' ? line.source : [line.source[0], line.source[1], -0.05],
      getTargetPosition: (line) => mode === '3d' ? line.target : [line.target[0], line.target[1], -0.05],
      getColor: mode === '3d' ? [60, 70, 66, 42] : [60, 70, 66, 24],
      getWidth: 1,
      widthUnits: 'pixels',
      pickable: false,
    })

    const pointColor = (point: ThesisPoint): [number, number, number, number] => {
        const selected = point.id === selectedId
        const clusterMuted = selectedClusterId !== null && point.clusterId !== selectedClusterId
        const timelineAlpha = yearCutoff === null ? 220 : point.year === yearCutoff ? 255 : 112
        const alpha = selected ? 255 : clusterMuted ? 34 : timelineAlpha
        return selected ? [15, 20, 18, 255] : clusterColorRgb(point.clusterId, alpha)
    }

    const pointLayer = mode === '2d'
      ? new ScatterplotLayer<ThesisPoint>({
          id: `theses-2d-${yearCutoff ?? 'all'}`,
          data: points,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          getPosition: (point) => [point.x, point.y, 0],
          getFillColor: pointColor,
          getLineColor: (point) => (point.id === selectedId ? [250, 252, 246, 255] : [250, 252, 246, 130]),
          getRadius: (point) => {
            if (point.id === selectedId) return 9
            if (yearCutoff !== null && point.year === yearCutoff) return 6.6
            return 4.6
          },
          radiusUnits: 'pixels',
          lineWidthUnits: 'pixels',
          getLineWidth: (point) => (point.id === selectedId ? 2.4 : 0.45),
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [15, 20, 18, 70],
          updateTriggers: {
            getFillColor: [selectedId, selectedClusterId, yearCutoff],
            getRadius: [selectedId, yearCutoff],
            getLineColor: [selectedId],
            getLineWidth: [selectedId],
          },
          transitions: {
            getFillColor: 260,
            getRadius: 260,
          },
        })
      : new SimpleMeshLayer<ThesisPoint>({
          id: `thesis-spheres-${yearCutoff ?? 'all'}`,
          data: points,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          mesh: THESIS_SPHERE,
          sizeScale: 0.064,
          getPosition: (point) => [point.x, point.y, point.z],
          getColor: pointColor,
          getScale: (point) => {
            if (point.id === selectedId) return [1.9, 1.9, 1.9]
            if (yearCutoff !== null && point.year === yearCutoff) return [1.45, 1.45, 1.45]
            return [1, 1, 1]
          },
          material: {
            ambient: 0.42,
            diffuse: 0.64,
            shininess: 48,
            specularColor: [220, 230, 224],
          },
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 90],
          updateTriggers: {
            getColor: [selectedId, selectedClusterId, yearCutoff],
            getScale: [selectedId, yearCutoff],
          },
          transitions: {
            getColor: 260,
            getScale: 260,
          },
        })

    const centroidLayer = mode === '2d'
      ? new ScatterplotLayer<ClusterSummary>({
          id: 'cluster-centroids-2d',
          data: visibleClusters,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          getPosition: (cluster) => [cluster.centroid[0], cluster.centroid[1], 0.01],
          getFillColor: [247, 248, 243, 210],
          getLineColor: (cluster) => clusterColorRgb(cluster.id, 230),
          getRadius: 12,
          radiusUnits: 'pixels',
          lineWidthUnits: 'pixels',
          getLineWidth: 1.5,
          stroked: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 120],
        })
      : new SimpleMeshLayer<ClusterSummary>({
          id: 'cluster-spheres-3d',
          data: visibleClusters,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          mesh: COMMUNITY_SPHERE,
          sizeScale: 0.17,
          getPosition: (cluster) => [
            cluster.centroid[0],
            cluster.centroid[1],
            cluster.centroid[2] + 0.16,
          ],
          getColor: (cluster) => clusterColorRgb(cluster.id, 255),
          material: {
            ambient: 0.38,
            diffuse: 0.72,
            shininess: 64,
            specularColor: [242, 246, 242],
          },
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 110],
        })

    const labelLayer = new TextLayer<ClusterSummary>({
      id: `cluster-labels-${mode}`,
      data: visibleClusters,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: (cluster) => [
        cluster.centroid[0],
        cluster.centroid[1],
        mode === '3d' ? cluster.centroid[2] + 0.18 : 0.02,
      ],
      getText: (cluster) => String(cluster.id).padStart(2, '0'),
      getColor: mode === '3d' ? [255, 255, 255, 255] : [17, 24, 21, 255],
      getSize: mode === '3d' ? 11 : 10,
      sizeUnits: 'pixels',
      fontFamily: 'Manrope Variable, sans-serif',
      fontWeight: 700,
      fontSettings: mode === '3d'
        ? { sdf: true, fontSize: 64, buffer: 4 }
        : { sdf: false },
      outlineWidth: mode === '3d' ? 1.8 : 0,
      outlineColor: [17, 24, 21, 210],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      billboard: true,
      pickable: true,
      parameters: mode === '3d' ? { depthCompare: 'always' } : undefined,
    })

    return [gridLayer, pointLayer, centroidLayer, labelLayer]
  }, [mode, points, selectedClusterId, selectedId, visibleClusters, yearCutoff])

  const view = mode === '2d'
    ? new OrthographicView({ id: 'semantic-2d', controller: true, flipY: false })
    : new OrbitView({ id: 'semantic-3d', controller: true, orbitAxis: 'Z' })

  const initialViewState = mode === '2d'
    ? { target: [MAP_CENTER[0], MAP_CENTER[1], 0] as [number, number, number], zoom: 6.05, minZoom: 4.2, maxZoom: 10 }
    : {
        target: MAP_CENTER,
        zoom: 5.45,
        rotationOrbit: -32,
        rotationX: 27,
        minZoom: 3.8,
        maxZoom: 9,
        minRotationX: -70,
        maxRotationX: 70,
      }

  function handleClick(info: PickingInfo<MapObject>) {
    if (!info.object) {
      onSelect(null)
      return
    }
    if (isClusterSummary(info.object)) {
      onClusterSelect?.(info.object.id)
      return
    }
    onSelect(info.object)
  }

  return (
    <div className="semantic-map" role="img" aria-label={ariaLabel}>
      <DeckGL
        key={`${mode}-${resetVersion}`}
        views={view}
        initialViewState={initialViewState}
        layers={layers}
        onClick={handleClick}
        getTooltip={({ object }: PickingInfo<MapObject>) => {
          if (!object) return null
          if (isClusterSummary(object)) {
            return {
              text: `Comunidad ${String(object.id).padStart(2, '0')}\n${object.theme}\n${object.count} tesis · ${object.programCount} programas · ${object.yearMin}–${object.yearMax}`,
              style: {
                backgroundColor: '#111815',
                color: '#f8faf5',
                fontFamily: 'Manrope Variable, sans-serif',
                fontSize: '12px',
                lineHeight: '1.5',
                borderRadius: '6px',
                maxWidth: '300px',
                padding: '10px 12px',
                borderLeft: `3px solid rgb(${clusterColorRgb(object.id).slice(0, 3).join(',')})`,
              },
            }
          }
          return {
            text: `${object.title}\n${object.author} · ${object.year}\n${object.clusterTheme}`,
            style: {
              backgroundColor: '#111815',
              color: '#f8faf5',
              fontFamily: 'Manrope Variable, sans-serif',
              fontSize: '12px',
              lineHeight: '1.45',
              borderRadius: '6px',
              maxWidth: '320px',
              padding: '10px 12px',
            },
          }
        }}
        getCursor={({ isDragging, isHovering }) => (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab')}
      />
      <button
        className="map-reset icon-button"
        type="button"
        aria-label="Restablecer encuadre"
        data-tooltip="Restablecer encuadre"
        onClick={() => setResetVersion((value) => value + 1)}
      >
        <LocateFixed size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
