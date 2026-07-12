import { useCallback, useEffect, useState } from 'react'
import type { AnalyticsPayload, AtlasPayload, DetailsPayload, ThesisDetails } from '../types'

let detailsPromise: Promise<DetailsPayload> | null = null

function dataUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}data/${fileName}`
}

async function fetchJson<T>(fileName: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(dataUrl(fileName), { signal })
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${fileName} (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function useAtlasData() {
  const [atlas, setAtlas] = useState<AtlasPayload | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetchJson<AtlasPayload>('atlas.json', controller.signal),
      fetchJson<AnalyticsPayload>('analytics.json', controller.signal),
    ])
      .then(([atlasPayload, analyticsPayload]) => {
        setAtlas(atlasPayload)
        setAnalytics(analyticsPayload)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los datos.')
      })

    return () => controller.abort()
  }, [])

  const loadDetails = useCallback(async (thesisId: string): Promise<ThesisDetails | null> => {
    detailsPromise ??= fetchJson<DetailsPayload>('details.json')
    const payload = await detailsPromise
    return payload.details[thesisId] ?? null
  }, [])

  return {
    atlas,
    analytics,
    error,
    loading: !atlas || !analytics,
    loadDetails,
  }
}
