import type { AdvisorSummary } from '../types'

export const FACULTY_NUDGE_X_LIMIT = 0.9
export const FACULTY_NUDGE_Y_LIMIT = 0.72

export interface AdvisorPlotCoordinate {
  x: number
  y: number
  groupSize: number
  nudged: boolean
}

export interface FacultyNudgeLayout {
  coordinates: Map<string, AdvisorPlotCoordinate>
  duplicateGroupCount: number
  nudgedPointCount: number
  maxOffsetX: number
  maxOffsetY: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function phaseFor(key: string): number {
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
  }
  return ((hash >>> 0) / 0xffffffff) * Math.PI * 2
}

export function createFacultyNudgeLayout(advisors: AdvisorSummary[]): FacultyNudgeLayout {
  const groups = new Map<string, AdvisorSummary[]>()
  for (const advisor of advisors) {
    const key = `${advisor.thesisCount}|${advisor.clusterCount}`
    const rows = groups.get(key) ?? []
    rows.push(advisor)
    groups.set(key, rows)
  }

  const coordinates = new Map<string, AdvisorPlotCoordinate>()
  let duplicateGroupCount = 0
  let nudgedPointCount = 0
  let maxOffsetX = 0
  let maxOffsetY = 0

  for (const [key, rows] of groups) {
    if (rows.length === 1) {
      const advisor = rows[0]
      coordinates.set(advisor.name, {
        x: advisor.thesisCount,
        y: advisor.clusterCount,
        groupSize: 1,
        nudged: false,
      })
      continue
    }

    duplicateGroupCount += 1
    nudgedPointCount += rows.length
    const ordered = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    const phase = phaseFor(key)
    const rawOffsets = ordered.map((_, index) => {
      const radius = Math.sqrt((index + 0.5) / ordered.length)
      const angle = phase + index * GOLDEN_ANGLE
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
    })
    const meanX = rawOffsets.reduce((total, point) => total + point.x, 0) / rawOffsets.length
    const meanY = rawOffsets.reduce((total, point) => total + point.y, 0) / rawOffsets.length
    const centeredOffsets = rawOffsets.map((point) => ({ x: point.x - meanX, y: point.y - meanY }))
    const extentX = Math.max(...centeredOffsets.map((point) => Math.abs(point.x)))
    const extentY = Math.max(...centeredOffsets.map((point) => Math.abs(point.y)))
    const targetX = Math.min(FACULTY_NUDGE_X_LIMIT, 0.18 + 0.052 * Math.sqrt(ordered.length))
    const targetY = Math.min(FACULTY_NUDGE_Y_LIMIT, 0.14 + 0.043 * Math.sqrt(ordered.length))

    ordered.forEach((advisor, index) => {
      const offsetX = extentX === 0 ? 0 : centeredOffsets[index].x * targetX / extentX
      const offsetY = extentY === 0 ? 0 : centeredOffsets[index].y * targetY / extentY
      maxOffsetX = Math.max(maxOffsetX, Math.abs(offsetX))
      maxOffsetY = Math.max(maxOffsetY, Math.abs(offsetY))
      coordinates.set(advisor.name, {
        x: advisor.thesisCount + offsetX,
        y: advisor.clusterCount + offsetY,
        groupSize: ordered.length,
        nudged: true,
      })
    })
  }

  return { coordinates, duplicateGroupCount, nudgedPointCount, maxOffsetX, maxOffsetY }
}
