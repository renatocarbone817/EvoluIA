import { useState, useEffect, useRef } from "react"
import {
  Folder, FolderOpen, FolderPlus, Upload, Download, Trash2,
  ChevronRight, Home, FileText, Image, Video, Table2,
  File, X, Pencil, Check, Loader2, Sparkles, Plus,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import toast from "react-hot-toast"

// ─── Types ────────────────────────────────────────────────────────────────────
interface LibraryFolder {
  id: string
  professional_id: string
  parent_id: string | null
  name: string
  created_at: string
}

interface LibraryFile {
  id: string
  professional_id: string
  folder_id: string | null
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number
  created_at: string
}

// ─── File icon & color by extension ──────────────────────────────────────────
function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(ext)) return { icon: FileText, color: "text-red-600 bg-red-50 border-red-200", label: "PDF" }
  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Word" }
  if (["xls", "xlsx", "csv"].includes(ext)) return { icon: Table2, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Excel" }
  if (["ppt", "pptx"].includes(ext)) return { icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-200", label: "PPT" }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return { icon: Image, color: "text-purple-600 bg-purple-50 border-purple-200", label: "Imagem" }
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return { icon: Video, color: "text-pink-600 bg-pink-50 border-pink-200", label: "Vídeo" }
  if (["txt"].includes(ext)) return { icon: FileText, color: "text-slate-600 bg-slate-50 border-slate-200", label: "TXT" }
  return { icon: File, color: "text-[#7C3AED] bg-[#EDE9FE] border-[#DDD6FE]", label: ext.toUpperCase() || "Arquivo" }
}

function formatSize(bytes: number) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function BibliotecaPage() {
  const { professional, user } = useAuthStore()
  const profId = professional?.id || user?.id

  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<LibraryFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // New folder input
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameFileValue, setRenameFileValue] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const newFolderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profId) loadContents(currentFolderId)
  }, [profId, currentFolderId])

  useEffect(() => {
    if (creatingFolder) setTimeout(() => newFolderRef.current?.focus(), 50)
  }, [creatingFolder])

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadContents(folderId: string | null) {
    if (!profId) return
    setLoading(true)
    try {
      const foldersQuery = supabase
        .from("library_folders")
        .select("*")
        .eq("professional_id", profId)
        .order("name")

      const filesQuery = supabase
        .from("library_files")
        .select("*")
        .eq("professional_id", profId)
        .order("file_name")

      if (folderId === null) {
        foldersQuery.is("parent_id", null)
        filesQuery.is("folder_id", null)
      } else {
        foldersQuery.eq("parent_id", folderId)
        filesQuery.eq("folder_id", folderId)
      }

      const [foldersRes, filesRes] = await Promise.all([foldersQuery, filesQuery])
      setFolders(foldersRes.data || [])
      setFiles(filesRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  async function openFolder(folder: LibraryFolder) {
    setBreadcrumb((prev) => [...prev, folder])
    setCurrentFolderId(folder.id)
  }

  async function navigateTo(index: number) {
    if (index === -1) {
      setBreadcrumb([])
      setCurrentFolderId(null)
    } else {
      const crumb = breadcrumb[index]
      setBreadcrumb(breadcrumb.slice(0, index + 1))
      setCurrentFolderId(crumb.id)
    }
  }

  // ── Create folder ─────────────────────────────────────────────────────────
  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name || !profId) return
    try {
      const { error } = await supabase.from("library_folders").insert({
        professional_id: profId,
        parent_id: currentFolderId,
        name,
      })
      if (error) throw error
      setNewFolderName("")
      setCreatingFolder(false)
      await loadContents(currentFolderId)
      toast.success(`Pasta "${name}" criada com sucesso!`)
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pasta")
    }
  }

  // ── Rename folder ─────────────────────────────────────────────────────────
  async function handleRenameFolder(id: string) {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    try {
      const { error } = await supabase.from("library_folders").update({ name }).eq("id", id)
      if (error) throw error
      setRenamingId(null)
      await loadContents(currentFolderId)
      toast.success("Pasta renomeada!")
    } catch (err: any) {
      toast.error("Erro ao renomear pasta")
    }
  }

  // ── Delete folder ─────────────────────────────────────────────────────────
  async function handleDeleteFolder(folder: LibraryFolder) {
    if (!confirm(`Excluir a pasta "${folder.name}" e todo o seu conteúdo?`)) return
    try {
      const { error } = await supabase.from("library_folders").delete().eq("id", folder.id)
      if (error) throw error
      await loadContents(currentFolderId)
      toast.success("Pasta excluída!", { icon: "🗑️" })
    } catch (err: any) {
      toast.error("Erro ao excluir pasta")
    }
  }

  // ── Upload file ───────────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!profId || !e.target.files || e.target.files.length === 0) return
    setUploading(true)
    let uploaded = 0

    try {
      for (const file of Array.from(e.target.files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = `${profId}/biblioteca/${currentFolderId || "raiz"}/${Date.now()}_${safeName}`

        const { error: upErr } = await supabase.storage
          .from("child-documents")
          .upload(path, file)

        if (upErr) { toast.error(`Erro ao enviar ${file.name}`); continue }

        const { data: urlData } = supabase.storage.from("child-documents").getPublicUrl(path)

        await supabase.from("library_files").insert({
          professional_id: profId,
          folder_id: currentFolderId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.name.split(".").pop()?.toLowerCase() || null,
          file_size: file.size,
        })
        uploaded++
      }

      if (uploaded > 0) {
        toast.success(`${uploaded} arquivo${uploaded > 1 ? "s" : ""} enviado${uploaded > 1 ? "s" : ""} com sucesso!`, { icon: "🎉" })
        await loadContents(currentFolderId)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ── Rename file ───────────────────────────────────────────────────────────
  async function handleRenameFile(id: string) {
    const name = renameFileValue.trim()
    if (!name) { setRenamingFileId(null); return }
    try {
      const { error } = await supabase.from("library_files").update({ file_name: name }).eq("id", id)
      if (error) throw error
      setRenamingFileId(null)
      await loadContents(currentFolderId)
      toast.success("Arquivo renomeado!")
    } catch (err: any) {
      toast.error("Erro ao renomear arquivo")
    }
  }

  // ── Delete file ───────────────────────────────────────────────────────────
  async function handleDeleteFile(file: LibraryFile) {
    if (!confirm(`Excluir o arquivo "${file.file_name}"?`)) return
    try {
      const { error } = await supabase.from("library_files").delete().eq("id", file.id)
      if (error) throw error
      await loadContents(currentFolderId)
      toast.success("Arquivo excluído!", { icon: "🗑️" })
    } catch (err: any) {
      toast.error("Erro ao excluir arquivo")
    }
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in">
      {/* Header Moderno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] border-2 border-[#DDD6FE] flex items-center justify-center shrink-0 shadow-2xs font-black">
            <Folder className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#0D2329] tracking-tight">
              Biblioteca de Materiais
            </h1>
            <p className="text-xs font-semibold text-[#6B7C83] mt-0.5">
              Protocolos, atividades, documentos e recursos profissionais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="px-4 py-2.5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] hover:bg-[#F8FAFB] text-xs font-black text-[#0D2329] transition-all shadow-2xs active:scale-95 flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4 text-[#7C3AED]" />
            <span>+ Nova Pasta</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? "Enviando..." : "Enviar Arquivo"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept="*/*"
          />
        </div>
      </div>

      {/* Breadcrumb Navegação */}
      <nav className="flex items-center gap-2 flex-wrap bg-white border-2 border-[#D8E5E7] rounded-2xl px-4 py-3 shadow-2xs">
        <button
          onClick={() => navigateTo(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] hover:text-[#5B21B6] transition-colors bg-[#EDE9FE] px-2.5 py-1 rounded-xl"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Biblioteca</span>
        </button>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-[#8DA3A8]" />
            <button
              onClick={() => navigateTo(i)}
              className={`text-xs font-bold transition-colors ${
                i === breadcrumb.length - 1
                  ? "text-[#0D2329] font-black bg-[#F8FAFB] px-2.5 py-1 rounded-xl border border-[#D8E5E7] cursor-default"
                  : "text-[#7C3AED] hover:underline"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Input de Nova Pasta */}
      {creatingFolder && (
        <div className="flex items-center gap-3 bg-white border-2 border-[#7C3AED] rounded-2xl p-4 shadow-md animate-in fade-in zoom-in-95">
          <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 font-bold">
            <FolderPlus className="w-4 h-4" />
          </div>
          <input
            ref={newFolderRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder()
              if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") }
            }}
            placeholder="Nome da nova pasta (ex: Protocolos de Avaliação)..."
            className="flex-1 text-xs sm:text-sm font-bold bg-transparent border-none outline-none text-[#0D2329] placeholder:text-[#8DA3A8]"
          />
          <button
            onClick={handleCreateFolder}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Criar</span>
          </button>
          <button
            onClick={() => { setCreatingFolder(false); setNewFolderName("") }}
            className="w-8 h-8 text-[#6B7C83] hover:text-red-500 rounded-xl flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-3xl" />
          ))}
        </div>
      )}

      {/* Empty State Moderno */}
      {isEmpty && (
        <div className="p-8 sm:p-14 rounded-3xl bg-white border-2 border-dashed border-[#D8E5E7] text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#EDE9FE] border-2 border-[#DDD6FE] text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
            <FolderOpen className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-[#0D2329]">
              {currentFolderId ? "Esta pasta está vazia" : "Sua biblioteca está vazia"}
            </h3>
            <p className="text-xs font-semibold text-[#6B7C83] leading-relaxed">
              {currentFolderId
                ? "Crie subpastas ou envie arquivos para organizar seus materiais nesta categoria."
                : "Crie pastas para organizar seus protocolos, testes, atividades pedagógicas e modelos de documentos."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              className="px-4 py-2.5 rounded-2xl bg-white border-2 border-[#D8E5E7] hover:border-[#7C3AED] hover:bg-[#F8FAFB] text-xs font-black text-[#0D2329] transition-all shadow-2xs active:scale-95 flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4 text-[#7C3AED]" />
              <span>+ Nova Pasta</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Enviar Arquivo</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid: Folders first, then Files */}
      {!loading && !isEmpty && (
        <div className="space-y-6">

          {/* Pastas */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1.5">
                <span>📁</span>
                <span>Pastas ({folders.length})</span>
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group bg-white border-2 border-[#D8E5E7] rounded-3xl p-4 hover:border-[#7C3AED] hover:shadow-md transition-all cursor-pointer space-y-2 relative"
                    onDoubleClick={() => openFolder(folder)}
                    onClick={() => openFolder(folder)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 bg-[#FEF3C7] rounded-2xl flex items-center justify-center shrink-0 border border-[#FDE68A] text-[#D97706] shadow-2xs">
                          <Folder className="w-5 h-5 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {renamingId === folder.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameFolder(folder.id)
                                if (e.key === "Escape") setRenamingId(null)
                              }}
                              onBlur={() => handleRenameFolder(folder.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-xs font-black border-b-2 border-[#7C3AED] bg-transparent outline-none text-[#0D2329]"
                            />
                          ) : (
                            <div>
                              <p className="text-xs sm:text-sm font-black text-[#0D2329] truncate leading-tight group-hover:text-[#7C3AED] transition-colors">
                                {folder.name}
                              </p>
                              <p className="text-[10px] font-semibold text-[#8DA3A8] mt-0.5">Pasta de materiais</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name) }}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-[#F8FAFB] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] border border-[#D8E5E7] transition-all"
                          title="Renomear"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arquivos */}
          {files.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83] flex items-center gap-1.5">
                <span>📄</span>
                <span>Arquivos ({files.length})</span>
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {files.map((file) => {
                  const { icon: FileIcon, color, label } = getFileIcon(file.file_name)
                  return (
                    <div
                      key={file.id}
                      className="group bg-white border-2 border-[#D8E5E7] rounded-3xl p-4 hover:border-[#7C3AED] hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-2xs ${color}`}>
                          <FileIcon className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {renamingFileId === file.id ? (
                            <input
                              autoFocus
                              value={renameFileValue}
                              onChange={(e) => setRenameFileValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameFile(file.id)
                                if (e.key === "Escape") setRenamingFileId(null)
                              }}
                              onBlur={() => handleRenameFile(file.id)}
                              className="w-full text-xs font-bold border-b-2 border-[#7C3AED] bg-transparent outline-none text-[#0D2329]"
                            />
                          ) : (
                            <div>
                              <p className="text-xs font-black text-[#0D2329] line-clamp-2 leading-snug group-hover:text-[#7C3AED] transition-colors" title={file.file_name}>
                                {file.file_name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-black uppercase bg-[#F8FAFB] text-[#6B7C83] px-1.5 py-0.5 rounded-md border border-[#D8E5E7]">
                                  {label}
                                </span>
                                <span className="text-[10px] font-semibold text-[#8DA3A8]">{formatSize(file.file_size)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* File Actions */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-[#EEF5F6] justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download={file.file_name}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-[#EDE9FE] hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white transition-all border border-[#DDD6FE]"
                          title="Baixar / Visualizar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => { setRenamingFileId(file.id); setRenameFileValue(file.file_name) }}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-[#F8FAFB] hover:bg-[#EDE9FE] text-[#6B7C83] hover:text-[#7C3AED] transition-all border border-[#D8E5E7]"
                          title="Renomear"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-all border border-red-200"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
