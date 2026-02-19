import { useState, useEffect } from 'react'
import type { Site, Maintainer } from '@/types'
import { Plus, X } from 'lucide-react'

interface SiteFormDialogProps {
  open: boolean
  site: Site | null
  onClose: () => void
  onSubmit: (data: Partial<Site>) => void
  loading?: boolean
}

function emptyMaintainer(): Maintainer {
  return { id: '', name: '', contact_url: '' }
}

export function SiteFormDialog({ open, site, onClose, onSubmit, loading }: SiteFormDialogProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [isCheckin, setIsCheckin] = useState(false)
  const [isBenefit, setIsBenefit] = useState(false)
  const [checkinUrl, setCheckinUrl] = useState('')
  const [benefitUrl, setBenefitUrl] = useState('')
  const [maintainers, setMaintainers] = useState<Maintainer[]>([emptyMaintainer()])

  useEffect(() => {
    if (open) {
      if (site) {
        setName(site.name)
        setUrl(site.url)
        setIsCheckin(site.is_checkin)
        setIsBenefit(site.is_benefit)
        setCheckinUrl(site.checkin_url || '')
        setBenefitUrl(site.benefit_url || '')
        setMaintainers(site.maintainers.length > 0 ? site.maintainers : [emptyMaintainer()])
      } else {
        setName('')
        setUrl('')
        setIsCheckin(false)
        setIsBenefit(false)
        setCheckinUrl('')
        setBenefitUrl('')
        setMaintainers([emptyMaintainer()])
      }
    }
  }, [open, site])

  if (!open) return null

  const isEdit = !!site

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validMaintainers = maintainers.filter((m) => m.name.trim())
    onSubmit({
      ...(isEdit ? { id: site!.id } : {}),
      name: name.trim(),
      url: url.trim(),
      is_checkin: isCheckin,
      is_benefit: isBenefit,
      checkin_url: checkinUrl.trim(),
      benefit_url: benefitUrl.trim(),
      maintainers: validMaintainers.map((m) => ({
        id: m.id || '',
        name: m.name.trim(),
        contact_url: (m.contact_url || '').trim(),
      })),
    })
  }

  function updateMaintainer(idx: number, field: keyof Maintainer, value: string) {
    setMaintainers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  function addMaintainer() {
    setMaintainers((prev) => [...prev, emptyMaintainer()])
  }

  function removeMaintainer(idx: number) {
    setMaintainers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-primary/10 border border-white/50 mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-slate-800">{isEdit ? '编辑站点' : '添加站点'}</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">站点名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例如：CloudFlare AI"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">网址 *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-3">
            <label
              className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                isCheckin
                  ? 'border-primary bg-primary-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isCheckin}
                onChange={(e) => setIsCheckin(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-slate-300 text-primary accent-primary"
              />
              <span className="text-sm font-medium text-slate-700">签到站</span>
            </label>
            <label
              className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                isBenefit
                  ? 'border-pink-400 bg-pink-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isBenefit}
                onChange={(e) => setIsBenefit(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-slate-300 text-pink-500 accent-pink-500"
              />
              <span className="text-sm font-medium text-slate-700">福利站</span>
            </label>
          </div>

          {isCheckin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">签到地址</label>
              <input
                type="url"
                value={checkinUrl}
                onChange={(e) => setCheckinUrl(e.target.value)}
                placeholder={`留空则自动生成：${url ? url.replace(/\/$/, '') : 'https://...'}/console/personal`}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400 ml-1">为空时将根据网址自动生成签到页地址</p>
            </div>
          )}

          {isBenefit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">福利地址</label>
              <input
                type="url"
                value={benefitUrl}
                onChange={(e) => setBenefitUrl(e.target.value)}
                placeholder="https://example.com/benefit"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400 ml-1">填写后福利站标签可点击跳转</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700 ml-1">站长</label>
              <button
                type="button"
                onClick={addMaintainer}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加
              </button>
            </div>
            <div className="space-y-2">
              {maintainers.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMaintainer(idx, 'name', e.target.value)}
                    placeholder="名称"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
                  />
                  <input
                    type="text"
                    value={m.contact_url}
                    onChange={(e) => updateMaintainer(idx, 'contact_url', e.target.value)}
                    placeholder="联系方式 (可选)"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
                  />
                  {maintainers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaintainer(idx)}
                      className="rounded-xl p-2 hover:bg-red-50 hover:text-destructive transition-colors text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-brand-start to-brand-end text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
