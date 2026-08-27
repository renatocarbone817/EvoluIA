import { useState, useEffect, useRef } from "react"
import {
  Folder, FolderOpen, FolderPlus, Upload, Download, Trash2,
  ChevronRight, Home, FileText, Image, Video, Table2,
  File, X, Pencil, Check, Loader2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/Button"
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
  if (["pdf"].includes(ext)) return { icon: FileText, color: "text-red-500 bg-red-50", label: "PDF" }
  if (["doc", "docx"].includes(ext)) return { icon: FileText, color: "text-blue-500 bg-blue-50", label: "Word" }
  if (["xls", "xlsx"].includes(ext)) return { icon: Table2, color: "text-green-600 bg-green-50", label: "Excel" }
  if (["ppt", "pptx"].includes(ext)) return { icon: FileText, color: "text-orange-500 bg-orange-50", label: "PPT" }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return { icon: Image, color: "text-purple-500 bg-purple-50", label: "Imagem" }
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return { icon: Video, color: "text-pink-500 bg-pink-50", label: "Vídeo" }
  if (["txt"].includes(ext)) return { icon: FileText, color: "text-gray-500 bg-gray-50", label: "TXT" }
  return { icon: File, color: "text-[#245C6B] bg-[#EEF5F6]", label: ext.toUpperCase() || "Arquivo" }
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
      const [foldersRes, filesRes] = await Promise.all([
        supabase
          .from("library_folders")
          .select("*")
          .eq("professional_id", profId)
          .is(folderId ? "parent_id" : "parent_id", folderId)
          .order("name"),
        supabase
          .from("library_files")
          .select("*")
          .eq("professional_id", profId)
          .is("folder_id", folderId)
          .order("file_name"),
      ])
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
      // Go to root
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
      toast.success(`Pasta "${name}" criada!`)
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
      toast.success("Pasta excluída!")
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
        toast.success(`${uploaded} arquivo${uploaded > 1 ? "s" : ""} enviado${uploaded > 1 ? "s" : ""}!`)
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
      toast.success("Arquivo excluído!")
    } catch (err: any) {
      toast.error("Erro ao excluir arquivo")
    }
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#19323A] tracking-tight flex items-center gap-2">
            <Folder className="w-7 h-7 text-[#245C6B]" />
            Biblioteca de Materiais
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7C83] mt-1">
            Protocolos, atividades, documentos e recursos profissionais
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatingFolder(true)}
            className="gap-2 font-bold border-2"
          >
            <FolderPlus className="w-4 h-4" />
            Nova Pasta
          </Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 font-bold shadow-[0_4px_0_0_#143741]"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Enviando..." : "Enviar Arquivo"}
          </Button>
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

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 flex-wrap bg-white border-2 border-[#D8E5E7] rounded-2xl px-4 py-3 shadow-sm">
        <button
          onClick={() => navigateTo(-1)}
          className="flex items-center gap-1.5 text-sm font-bold text-[#245C6B] hover:text-[#19323A] transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Biblioteca</span>
        </button>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1.5">
            <ChevronRight className="w-4 h-4 text-[#8DA3A8]" />
            <button
              onClick={() => navigateTo(i)}
              className={`text-sm font-bold transition-colors ${
                i === breadcrumb.length - 1
                  ? "text-[#19323A] cursor-default"
                  : "text-[#245C6B] hover:text-[#19323A]"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* New Folder Input */}
      {creatingFolder && (
        <div className="flex items-center gap-2 bg-white border-2 border-[#245C6B] rounded-2xl p-4 shadow-md">
          <FolderPlus className="w-5 h-5 text-[#245C6B] shrink-0" />
          <input
            ref={newFolderRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder()
              if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") }
            }}
            placeholder="Nome da nova pasta..."
            className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-[#19323A] placeholder:text-[#8DA3A8]"
          />
          <button
            onClick={handleCreateFolder}
            className="w-8 h-8 bg-[#245C6B] text-white rounded-lg flex items-center justify-center hover:bg-[#19323A] transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCreatingFolder(false); setNewFolderName("") }}
            className="w-8 h-8 text-[#6B7C83] hover:text-[#D96C6C] rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white border-2 border-[#D8E5E7] animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-20 bg-white border-2 border-dashed border-[#D8E5E7] rounded-3xl">
          <FolderOpen className="w-16 h-16 text-[#D8E5E7] mx-auto mb-4" />
          <p className="text-lg font-black text-[#19323A]">
            {currentFolderId ? "Pasta vazia" : "Sua biblioteca está vazia"}
          </p>
          <p className="text-sm text-[#6B7C83] mt-1 mb-6">
            {currentFolderId
              ? "Crie subpastas ou envie arquivos para organizar seus materiais."
              : "Crie pastas para organizar seus protocolos, atividades e materiais profissionais."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setCreatingFolder(true)} className="gap-2 border-2 font-bold">
              <FolderPlus className="w-4 h-4" />
              Nova Pasta
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2 font-bold">
              <Upload className="w-4 h-4" />
              Enviar Arquivo
            </Button>
          </div>
        </div>
      )}

      {/* Grid: Folders first, then Files */}
      {!loading && !isEmpty && (
        <div className="space-y-4">

          {/* Folders */}
          {folders.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83] mb-3">
                📁 Pastas ({folders.length})
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group bg-white border-2 border-[#D8E5E7] rounded-2xl p-4 hover:border-[#245C6B] hover:shadow-md transition-all cursor-pointer"
                    onDoubleClick={() => openFolder(folder)}
                    onClick={() => openFolder(folder)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-200">
                          <Folder className="w-5 h-5 text-amber-500" />
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
                              className="w-full text-sm font-bold border-b-2 border-[#245C6B] bg-transparent outline-none text-[#19323A]"
                            />
                          ) : (
                            <p className="text-sm font-bold text-[#19323A] truncate leading-tight">{folder.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name) }}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#EEF5F6] text-[#6B7C83] hover:text-[#245C6B] transition-colors"
                          title="Renomear"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#6B7C83] hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#6B7C83] mb-3">
                📄 Arquivos ({files.length})
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {files.map((file) => {
                  const { icon: FileIcon, color } = getFileIcon(file.file_name)
                  return (
                    <div
                      key={file.id}
                      className="group bg-white border-2 border-[#D8E5E7] rounded-2xl p-4 hover:border-[#245C6B] hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${color}`}>
                          <FileIcon className="w-5 h-5" />
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
                              className="w-full text-xs font-bold border-b-2 border-[#245C6B] bg-transparent outline-none text-[#19323A]"
                            />
                          ) : (
                            <p className="text-xs font-bold text-[#19323A] line-clamp-2 leading-snug">{file.file_name}</p>
                          )}
                          <p className="text-[10px] text-[#8DA3A8] mt-0.5">{formatSize(file.file_size)}</p>
                        </div>
                      </div>

                      {/* File Actions */}
                      <div className="flex items-center gap-1 mt-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download={file.file_name}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#EEF5F6] hover:bg-[#245C6B] text-[#245C6B] hover:text-white transition-colors"
                          title="Baixar / Visualizar"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => { setRenamingFileId(file.id); setRenameFileValue(file.file_name) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#EEF5F6] hover:bg-[#245C6B] text-[#245C6B] hover:text-white transition-colors"
                          title="Renomear"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 text-red-400 hover:text-white transition-colors"
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
