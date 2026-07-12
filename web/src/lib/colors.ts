export const CLUSTER_COLORS = [
  '#265dff',
  '#e84a3c',
  '#14866d',
  '#e4a019',
  '#8757d6',
  '#008fa3',
  '#d44883',
  '#5f8b32',
  '#de6e23',
  '#3e7cb1',
  '#a4417a',
  '#65702f',
  '#b68b00',
  '#297a8a',
  '#c4523e',
  '#4267b2',
  '#7769b4',
  '#0e8d72',
  '#a65d1d',
  '#53616e',
] as const

export const LEVEL_COLORS: Record<string, string> = {
  Licenciatura: '#265dff',
  Maestría: '#e4a019',
  Doctorado: '#14866d',
}

export function clusterColor(clusterId: number): string {
  return CLUSTER_COLORS[Math.abs(clusterId) % CLUSTER_COLORS.length]
}

export function clusterColorRgb(clusterId: number, alpha = 255): [number, number, number, number] {
  const color = clusterColor(clusterId).slice(1)
  return [
    Number.parseInt(color.slice(0, 2), 16),
    Number.parseInt(color.slice(2, 4), 16),
    Number.parseInt(color.slice(4, 6), 16),
    alpha,
  ]
}

export function alphaColor(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
