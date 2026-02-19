import { useState } from 'react'
import { Lock } from 'lucide-react'
import { verifyPassword, setAuthToken } from '../api'

interface PasswordGateProps {
  onSuccess: () => void
}

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      const ok = await verifyPassword(password)
      if (ok) {
        setAuthToken(password)
        onSuccess()
      } else {
        setError('密码错误')
      }
    } catch {
      setError('验证失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary/10 border border-white/60 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-start to-brand-end bg-clip-text text-transparent">
              SiteHub
            </h1>
            <p className="text-sm text-slate-400 mt-1">请输入访问密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="访问密码"
                autoFocus
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all placeholder:text-slate-400"
              />
              {error && (
                <p className="text-xs text-red-500 mt-2 ml-1">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-brand-start to-brand-end px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              {loading ? '验证中...' : '进入'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
