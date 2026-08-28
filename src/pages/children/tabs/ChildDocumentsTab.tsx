import { useState, useEffect, useRef } from "react"
import { Upload, FileText, Trash2, Download, Paperclip, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
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

  return (
    <div className="space-y-6">
      {/* Upload Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="w-full sm:w-60">
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
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? "Enviando..." : "Novo Documento / Anexo"}</span>
          </button>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-base">Nenhum documento anexado</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Faça upload de atividades, testes escaneados, laudos ou relatórios.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Fazer Upload</span>
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:border-foreground/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)}
                      {doc.category ? ` · ${doc.category.replace("_", " ")}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Visualizar / Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
