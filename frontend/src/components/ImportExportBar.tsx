import { useRef } from 'react'
import { Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useImportSites, exportSites } from '@/api'

export function ImportExportBar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportSites()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        importMutation.mutate(
          { data, mode: 'upsert' },
          {
            onSuccess: (result) => {
              toast.success(`导入成功：新增 ${result.created_sites} 个，更新 ${result.updated_sites} 个`)
            },
            onError: (err) => {
              toast.error(`导入失败：${err.message}`)
            },
          },
        )
      } catch {
        toast.error('JSON 解析失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleExport() {
    try {
      await exportSites()
      toast.success('导出成功')
    } catch (err) {
      toast.error(`导出失败：${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importMutation.isPending}
        title="导入"
        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors disabled:opacity-50"
      >
        <Upload className="w-5 h-5" />
      </button>
      <button
        onClick={handleExport}
        title="导出"
        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors"
      >
        <Download className="w-5 h-5" />
      </button>
    </div>
  )
}
