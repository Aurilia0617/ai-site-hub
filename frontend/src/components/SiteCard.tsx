import { useState } from 'react'
import type { Site, Maintainer } from '@/types'
import { CalendarCheck, ExternalLink, Gift, Pencil, Trash2, User, Tag, StickyNote, Copy, Check, Wallet } from 'lucide-react'
import { useSiteBalance } from '../api'

interface SiteCardProps {
  site: Site
  onEdit: (site: Site) => void
  onDelete: (site: Site) => void
}

export function SiteCard({ site, onEdit, onDelete }: SiteCardProps) {
  const [copied, setCopied] = useState(false)
  const isNewApi = site.site_type === 'new-api'
  const { data: balanceData, isLoading: balanceLoading } = useSiteBalance(site.id, isNewApi)

  const balanceText = balanceData?.data
    ? `LDC ${(balanceData.data.quota / 500000).toFixed(2)}`
    : null

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(site.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const checkinHref = site.is_checkin
    ? site.checkin_url?.trim() ||
      `${site.url.replace(/\/$/, '')}/console/personal`
    : ''

  const benefitHref = site.is_benefit
    ? site.benefit_url?.trim() || ''
    : ''

  const gradientClass = site.is_benefit
    ? 'from-welfare-start to-welfare-end'
    : 'from-brand-start to-brand-end'

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
      {/* Top gradient bar */}
      {(site.is_checkin || site.is_benefit) && (
        <div className={`h-1.5 w-full bg-gradient-to-r ${gradientClass}`} />
      )}

      {/* Content */}
      <div className="p-5 pt-4 flex-1 flex flex-col">
        {/* Row 1: Title (clickable) */}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-lg text-slate-800 line-clamp-1 hover:text-primary transition-colors"
        >
          {site.name}
        </a>

        {/* Row 2: Tags */}
        {(site.is_checkin || site.is_benefit) && (
          <div className="flex gap-2 mt-2">
            {site.is_checkin && (
              <a
                href={checkinHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-start/10 to-brand-end/10 px-2.5 py-1 text-xs font-medium text-primary-700 hover:from-brand-start/20 hover:to-brand-end/20 transition-all border border-primary/15`}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarCheck className="w-3 h-3" />
                签到站
              </a>
            )}
            {site.is_benefit && (
              benefitHref ? (
                <a
                  href={benefitHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-welfare-start/10 to-welfare-end/10 px-2.5 py-1 text-xs font-medium text-pink-700 hover:from-welfare-start/20 hover:to-welfare-end/20 transition-all border border-pink-500/15"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Gift className="w-3 h-3" />
                  福利站
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-welfare-start/10 to-welfare-end/10 px-2.5 py-1 text-xs font-medium text-pink-700 border border-pink-500/15">
                  <Gift className="w-3 h-3" />
                  福利站
                </span>
              )
            )}
          </div>
        )}

        {/* URL with status dot */}
        <div className="flex items-center gap-2 mt-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" title="可访问" />
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-primary hover:underline min-w-0 transition-colors truncate"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{site.url}</span>
          </a>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1 text-slate-300 hover:text-primary hover:bg-primary-50 transition-colors"
            title="复制网址"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Balance for New API sites */}
        {isNewApi && (
          <div className="flex items-center gap-1.5 mt-3">
            <Wallet className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="text-xs font-medium text-slate-500">
              {balanceLoading
                ? '查询中...'
                : balanceText !== null
                  ? balanceText
                  : '余额不可用'}
            </span>
          </div>
        )}

        {/* Custom Tags */}
        {site.tags && site.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {site.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {site.notes && (
          <div className="flex items-start gap-1.5 mt-3 text-xs text-slate-400">
            <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{site.notes}</span>
          </div>
        )}

        {/* Maintainers */}
        {site.maintainers.length > 0 && (
          <div className="mt-auto pt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
              <User className="w-3.5 h-3.5" />
              <span>站长</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {site.maintainers.map((m: Maintainer) => (
                <span key={m.id} className="text-xs">
                  {m.contact_url ? (
                    <a
                      href={m.contact_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {m.name}
                    </a>
                  ) : (
                    <span className="text-slate-600">{m.name}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-5 pb-4 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => onEdit(site)}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-primary hover:bg-primary-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          编辑
        </button>
        <button
          onClick={() => onDelete(site)}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-destructive hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除
        </button>
      </div>
    </div>
  )
}
