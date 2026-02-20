import { useState, useEffect } from 'react'
import type { Site, SiteType, Maintainer } from '@/types'
import { Plus, X } from 'lucide-react'
import { useTags } from '../api'

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
  const [siteType, setSiteType] = useState<SiteType>('other')
  const [apiKey, setApiKey] = useState('')
  const [apiUserId, setApiUserId] = useState('')
  const [isCheckin, setIsCheckin] = useState(false)
  const [isBenefit, setIsBenefit] = useState(false)
  const [checkinUrl, setCheckinUrl] = useState('')
  const [benefitUrl, setBenefitUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState('')
  const [maintainers, setMaintainers] = useState<Maintainer[]>([emptyMaintainer()])

  const { data: tagsData } = useTags()
  const allTags = tagsData?.tags ?? []
  const tagSuggestions = allTags.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      if (site) {
        setName(site.name)
        setUrl(site.url)
        setSiteType(site.site_type || 'other')
        setApiKey(site.api_key || '')
        setApiUserId(site.api_user_id || '')
        setIsCheckin(site.is_checkin)
        setIsBenefit(site.is_benefit)
        setCheckinUrl(site.checkin_url || '')
        setBenefitUrl(site.benefit_url || '')
        setTags(site.tags || [])
        setTagInput('')
        setNotes(site.notes || '')
        setMaintainers(site.maintainers.length > 0 ? site.maintainers : [emptyMaintainer()])
      } else {
        setName('')
        setUrl('')
        setSiteType('other')
        setApiKey('')
        setApiUserId('')
        setIsCheckin(false)
        setIsBenefit(false)
        setCheckinUrl('')
        setBenefitUrl('')
        setTags([])
        setTagInput('')
        setNotes('')
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
      site_type: siteType,
      api_key: siteType === 'new-api' ? apiKey.trim() : '',
      api_user_id: siteType === 'new-api' ? apiUserId.trim() : '',
      is_checkin: isCheckin,
      is_benefit: isBenefit,
      checkin_url: checkinUrl.trim(),
      benefit_url: benefitUrl.trim(),
      tags,
      notes: notes.trim(),
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

          {/* Site Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">站点类型</label>
            <select
              value={siteType}
              onChange={(e) => setSiteType(e.target.value as SiteType)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              <option value="other">其他</option>
              <option value="new-api">New API</option>
            </select>
          </div>

          {siteType === 'new-api' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">系统访问令牌</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="安全设置页面的系统访问令牌"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">用户 ID</label>
                <input
                  type="text"
                  value={apiUserId}
                  onChange={(e) => setApiUserId(e.target.value)}
                  placeholder="个人设置页面中的用户 ID（数字）"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400 font-mono"
                />
                <p className="text-xs text-slate-400 ml-1">填入系统访问令牌和用户 ID 后可在卡片上显示钱包余额</p>
              </div>
            </>
          )}

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

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">标签</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-50 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault()
                    const val = tagInput.trim()
                    if (!tags.includes(val)) setTags((prev) => [...prev, val])
                    setTagInput('')
                  }
                }}
                placeholder="输入标签后回车添加"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400"
              />
              {tagInput && tagSuggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {tagSuggestions.slice(0, 5).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (!tags.includes(t)) setTags((prev) => [...prev, t])
                        setTagInput('')
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-primary-50 hover:text-primary transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加备注信息（可选）"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

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
