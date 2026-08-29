import { useState, useEffect, useRef } from "react"
import { Upload, FileText, Trash2, Download, Paperclip, Plus, FileSpreadsheet, Image as ImageIcon, File } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Select } from "@/components/ui/Select"
import { formatDate } from "@/lib/utils"
import toast from "react-hot-toast"
import type { Document } from "@/types/database"

interface ChildDocumentsTabProps {
  childId: string
}

const CATEGORIES = [
  { value: "todas", label: "Todas as categorias" },
  { value: "avaliacao_inicial", label: "Avaliação Inicial" },
  { value: "atividades", label: "Atividades & Exercícios" },
  { value: "testes", label: "Testes Aplicados" },
  { value: "relatorios", label: "Relatórios & Pareceres" },
  { value: "documentos_pais", label: "Documentos dos Pais" },
  { value: "outros", label: "Outros" },
]

export function ChildDocumentsTab({ childId }: ChildDocumentsTabProps) {
  const { professional } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("todas")
  const [selectedCategory, setSelectedCategory] = useState("atividades")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [childId])

  async function loadDocuments() {
    setLoading(true)
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })

    setDocuments(data || [])
    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !professional) return

    setUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const filePath = `${professional.id}/${childId}/${fileName}`

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("child-documents")
        .upload(filePath, file)

      if (storageError) throw storageError

      const { data: publicUrlData } = supabase.storage
        .from("child-documents")
        .getPublicUrl(filePath)

      // Save database record
      const { error: dbError } = await supabase.from("documents").insert({
        professional_id: professional.id,
        child_id: childId,
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        file_type: fileExt || null,
        file_size: file.size,
        category: selectedCategory,
      })

      if (dbError) throw dbError

      toast.success("Documento anexado com sucesso!")
      loadDocuments()
    } catch (err: any) {
      toast.error(err.message || "Erro no upload do arquivo")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Deseja remover o arquivo "${doc.file_name}"?`)) return

    try {
      await supabase.from("documents").delete().eq("id", doc.id)
      toast.success("Documento removido")
      loadDocuments()
    } catch (err) {
      toast.error("Erro ao remover documento")
    }
  }

  const filtered = documents.filter((d) => {
    if (categoryFilter === "todas") return true
    return d.category === categoryFilter
  })

  function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase() || ""
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return <ImageIcon className="w-5 h-5 text-[#7C3AED]" />
    if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-[#10B981]" />
    if (["pdf", "doc", "docx"].includes(ext)) return <FileText className="w-5 h-5 text-[#0284C7]" />
    return <File className="w-5 h-5 text-[#6B7C83]" />
  }

  return (
    <div className="space-y-5 max-w-full overflow-hidden">
      {/* Upload Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:w-64">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={CATEGORIES}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>{uploading ? "Enviando..." : "+ Novo Documento / Anexo"}</span>
          </button>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
            <FileText className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-[#0D2329]">Nenhum documento anexado</h3>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              Faça upload de atividades, testes escaneados, laudos médicos ou relatórios complementares.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black inline-flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>+ Fazer Upload de Documento</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-3xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED]/40 hover:shadow-md transition-all flex items-center justify-between gap-3 w-full max-w-full overflow-hidden"
            >
              {/* Icon & Truncated Filename */}
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <div className="w-10 h-10 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] flex items-center justify-center shrink-0 shadow-2xs">
                  {getFileIcon(doc.file_name)}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p
                    className="text-xs sm:text-sm font-black text-[#0D2329] truncate block max-w-full"
                    title={doc.file_name}
                  >
                    {doc.file_name}
                  </p>
                  <p className="text-[11px] font-semibold text-[#6B7C83] truncate mt-0.5">
                    {formatDate(doc.created_at)}
                    {doc.category ? ` · ${doc.category.replace("_", " ")}` : ""}
                  </p>
                </div>
              </div>

              {/* Actions: Download & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-[#6B7C83] hover:text-[#7C3AED] hover:bg-[#EDE9FE] rounded-xl transition-colors"
                  title="Visualizar / Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  className="p-2 text-[#8CAAB1] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Excluir documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
