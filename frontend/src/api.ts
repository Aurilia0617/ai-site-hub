import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Site, SitesResponse, ImportResult } from './types'

const API_BASE = '/api/v1'

function getAuthToken(): string {
  return sessionStorage.getItem('site-hub-token') || ''
}

export function setAuthToken(token: string) {
  sessionStorage.setItem('site-hub-token', token)
}

export function clearAuthToken() {
  sessionStorage.removeItem('site-hub-token')
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message || body?.error || `Request failed: ${res.status}`
    if (res.status === 401) {
      clearAuthToken()
      window.dispatchEvent(new CustomEvent('auth-required'))
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function checkAuth(): Promise<{ required: boolean }> {
  const res = await fetch(`${API_BASE}/auth/check`)
  return res.json()
}

export async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.ok === true
}

export interface SiteFilters {
  q?: string
  is_checkin?: boolean
  is_benefit?: boolean
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => fetchJSON<{ tags: string[] }>(`${API_BASE}/tags`),
  })
}

export function useSites(filters: SiteFilters) {
  return useQuery({
    queryKey: ['sites', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.is_checkin !== undefined) params.set('is_checkin', String(filters.is_checkin))
      if (filters.is_benefit !== undefined) params.set('is_benefit', String(filters.is_benefit))
      const qs = params.toString()
      return fetchJSON<SitesResponse>(`${API_BASE}/sites${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useCreateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Site>) =>
      fetchJSON<{ site: Site }>(`${API_BASE}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useUpdateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Site> & { id: string }) =>
      fetchJSON<{ site: Site }>(`${API_BASE}/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useDeleteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<void>(`${API_BASE}/sites/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useImportSites() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, mode }: { data: unknown; mode: string }) =>
      fetchJSON<ImportResult>(`${API_BASE}/import?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export async function exportSites() {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}/export`, { headers })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `site-hub-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export interface BalanceData {
  success: boolean
  data: {
    quota: number
  }
}

export function useSiteBalance(siteId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['balance', siteId],
    queryFn: () => fetchJSON<BalanceData>(`${API_BASE}/sites/${siteId}/balance`),
    enabled,
    staleTime: 60_000,
    refetchInterval: 300_000,
  })
}
