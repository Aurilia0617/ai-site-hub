import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSites, useCreateSite, useUpdateSite, useDeleteSite, checkAuth } from './api'
import { SiteCard } from './components/SiteCard'
import { SiteFormDialog } from './components/SiteFormDialog'
import { ImportExportBar } from './components/ImportExportBar'
import { PasswordGate } from './components/PasswordGate'
import { toast } from 'sonner'
import { Plus, Search, Compass } from 'lucide-react'
import type { Site } from './types'

type FilterTag = 'checkin' | 'benefit'
type AuthState = 'loading' | 'authenticated' | 'need-password'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')

  const handleAuthRequired = useCallback(() => {
    setAuthState('need-password')
  }, [])

  useEffect(() => {
    checkAuth().then(({ required }) => {
      if (!required) {
        setAuthState('authenticated')
      } else {
        const token = sessionStorage.getItem('site-hub-token')
        setAuthState(token ? 'authenticated' : 'need-password')
      }
    }).catch(() => {
      setAuthState('authenticated')
    })
  }, [])

  useEffect(() => {
    window.addEventListener('auth-required', handleAuthRequired)
    return () => window.removeEventListener('auth-required', handleAuthRequired)
  }, [handleAuthRequired])

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    )
  }

  if (authState === 'need-password') {
    return <PasswordGate onSuccess={() => setAuthState('authenticated')} />
  }

  return <MainContent />
}

function MainContent() {
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<Set<FilterTag>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)

  const filters = useMemo(() => {
    const f: { q?: string; is_checkin?: boolean; is_benefit?: boolean } = {}
    if (search.trim()) f.q = search.trim()
    if (activeTags.has('checkin')) f.is_checkin = true
    if (activeTags.has('benefit')) f.is_benefit = true
    return f
  }, [search, activeTags])

  const { data, isLoading, error } = useSites(filters)
  const createMutation = useCreateSite()
  const updateMutation = useUpdateSite()
  const deleteMutation = useDeleteSite()

  function toggleTag(tag: FilterTag) {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function openCreate() {
    setEditingSite(null)
    setDialogOpen(true)
  }

  function openEdit(site: Site) {
    setEditingSite(site)
    setDialogOpen(true)
  }

  function handleDelete(site: Site) {
    if (!confirm(`确定删除「${site.name}」？`)) return
    deleteMutation.mutate(site.id, {
      onSuccess: () => toast.success('已删除'),
      onError: (err) => toast.error(`删除失败：${err.message}`),
    })
  }

  function handleSubmit(formData: Partial<Site>) {
    if (editingSite) {
      updateMutation.mutate(
        { id: editingSite.id, ...formData },
        {
          onSuccess: () => {
            toast.success('已更新')
            setDialogOpen(false)
          },
          onError: (err) => toast.error(`更新失败：${err.message}`),
        },
      )
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success('已添加')
          setDialogOpen(false)
        },
        onError: (err) => toast.error(`添加失败：${err.message}`),
      })
    }
  }

  const sites = data?.items ?? []
  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6">
      {/* Floating Header */}
      <header className="sticky top-4 z-40 mx-auto max-w-5xl rounded-2xl bg-white/80 backdrop-blur-xl shadow-lg shadow-primary/5 border border-white/50 p-4 mb-8 mt-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-brand-start to-brand-end bg-clip-text text-transparent">
            SiteHub
          </h1>
          <div className="flex items-center gap-2">
            <ImportExportBar />
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-start to-brand-end px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              添加站点
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索站点名称、网址、站长..."
              className="w-full bg-white/60 border-0 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-100/80 rounded-xl flex gap-1">
              <button
                onClick={() => toggleTag('checkin')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTags.has('checkin')
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                签到站
              </button>
              <button
                onClick={() => toggleTag('benefit')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTags.has('benefit')
                    ? 'bg-white shadow-sm text-pink-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                福利站
              </button>
            </div>
            {sites.length > 0 && (
              <span className="text-xs text-slate-400 ml-1">
                共 {data?.total ?? 0} 个站点
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto">
        {isLoading && (
          <div className="text-center py-20 text-slate-400">加载中...</div>
        )}
        {error && (
          <div className="text-center py-20 text-destructive">
            加载失败：{error.message}
          </div>
        )}
        {!isLoading && !error && sites.length === 0 && (
          <div
            onClick={openCreate}
            className="border-2 border-dashed border-slate-300 rounded-3xl p-16 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary/40 hover:bg-primary-50/30 transition-all"
          >
            <Compass className="w-12 h-12 text-slate-300 group-hover:text-primary transition-colors mb-4" />
            <p className="text-lg font-semibold text-slate-400 group-hover:text-slate-600 transition-colors mb-1">
              {search || activeTags.size > 0 ? '没有匹配的站点' : '添加你的第一个站点'}
            </p>
            <p className="text-sm text-slate-300 group-hover:text-slate-400 transition-colors">
              {search || activeTags.size > 0 ? '试试调整筛选条件' : '点击此处开始管理你的公益站'}
            </p>
          </div>
        )}
        {!isLoading && !error && sites.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {/* Dialog */}
      <SiteFormDialog
        open={dialogOpen}
        site={editingSite}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        loading={isMutating}
      />
    </div>
  )
}
