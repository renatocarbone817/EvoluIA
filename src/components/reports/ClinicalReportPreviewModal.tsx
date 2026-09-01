import { useState, useRef, useEffect } from "react"
import {
  FileText,
  Printer,
  Download,
  X,
  User,
  GraduationCap,
  School,
  Brain,
  Stethoscope,
  Lightbulb,
  Building2,
  Calendar,
  CheckCircle2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Trash2,
  Heading1,
  Heading2,
  RemoveFormatting,
  ImagePlus,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  Upload,
  PlusCircle,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import type { ReportTestResult } from "@/lib/docxReportGenerator"

export interface ClinicalReportPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onDownloadDocx?: () => void
  patientData: {
    fullName: string
    birthDate?: string
    ageFormatted?: string
    fatherName?: string
    motherName?: string
    schoolName?: string
    grade?: string
    mainComplaint?: string
    previousDiagnosis?: string
  }
  professionalData: {
    professionalName: string
    cboOrCrp?: string
    clinicName?: string
    clinicLogoUrl?: string
    logoUrl?: string
    address?: string
    phone?: string
    city?: string
    state?: string
  }
  familyQuestions: Array<{ id: string; num: number; title: string; answer: string }>
  schoolQuestions: Array<{ id: string; num: number; title: string; answer: string }>
  schoolObserver?: { name?: string; role?: string; date?: string }
  schoolTraits?: Record<string, boolean>
  selectedInstruments: string[]
  testsResults: ReportTestResult[]
  clinicalObservation: string
  sessionsCount: number
  synthesis: string
  diagnosticHypothesis: string
  dsm5Criteria: string[]
  finalConsiderations: string
  referrals: string[]
  recommendationsFamily: string[]
  recommendationsSchool: string[]
}

// Variável global para arrastar cards
let draggedCardElement: HTMLElement | null = null

export function ClinicalReportPreviewModal({
  isOpen,
  onClose,
  onDownloadDocx,
  patientData,
  professionalData,
  familyQuestions,
  schoolQuestions,
  schoolObserver,
  schoolTraits = {},
  selectedInstruments,
  testsResults: initialTestsResults,
  clinicalObservation,
  sessionsCount,
  synthesis,
  diagnosticHypothesis,
  dsm5Criteria,
  finalConsiderations,
  referrals,
  recommendationsFamily,
  recommendationsSchool,
}: ClinicalReportPreviewModalProps) {
  if (!isOpen) return null

  const reportScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const clinicLogoInputRef = useRef<HTMLInputElement>(null)
  const [selectedImgEl, setSelectedImgEl] = useState<HTMLImageElement | null>(null)
  const [lastClickedCardEl, setLastClickedCardEl] = useState<HTMLElement | null>(null)

  // Carrega logo da clínica de múltiplas fontes confiáveis (apenas logomarca da clínica, nunca a foto de perfil/rosto)
  const [headerLogo, setHeaderLogo] = useState<string>(() => {
    const fromProps = professionalData.clinicLogoUrl || ""
    if (fromProps) return fromProps
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("evoluia_clinic_logo") ||
        localStorage.getItem("clinic_logo") ||
        localStorage.getItem("clinicLogo") ||
        ""
      )
    }
    return ""
  })

  useEffect(() => {
    const fromProps = professionalData.clinicLogoUrl || ""
    if (fromProps) {
      setHeaderLogo(fromProps)
    } else if (typeof window !== "undefined") {
      const local =
        localStorage.getItem("evoluia_clinic_logo") ||
        localStorage.getItem("clinic_logo") ||
        localStorage.getItem("clinicLogo") ||
        ""
      if (local) setHeaderLogo(local)
    }
  }, [professionalData.clinicLogoUrl])

  // Suporte a Scroll pelo Scroll do Mouse (Wheel) durante o Arraste de Cards
  useEffect(() => {
    function handleWindowWheel(e: WheelEvent) {
      if (draggedCardElement && reportScrollRef.current) {
        reportScrollRef.current.scrollTop += e.deltaY
      }
    }
    window.addEventListener("wheel", handleWindowWheel, { passive: true })
    return () => {
      window.removeEventListener("wheel", handleWindowWheel)
    }
  }, [])

  const todayStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  function execCmd(command: string, value: string | null = null) {
    document.execCommand(command, false, value)
  }

  // Upload direto de Logo da Clínica
  function handleClinicLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (base64) {
        setHeaderLogo(base64)
        try {
          localStorage.setItem("evoluia_clinic_logo", base64)
          localStorage.setItem("clinic_logo", base64)
        } catch (err) {}
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Formatação garantida para Título (H2), Subtítulo (H3) e Parágrafo (P)
  function applyHeadingOrParagraph(type: "title" | "subtitle" | "paragraph") {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)

    if (!range.collapsed) {
      const span = document.createElement("span")
      if (type === "title") {
        span.style.fontSize = "16px"
        span.style.fontWeight = "900"
        span.style.color = "#005B94"
        span.style.textTransform = "uppercase"
        span.style.letterSpacing = "0.05em"
        span.style.display = "block"
        span.style.marginTop = "10px"
        span.style.marginBottom = "4px"
      } else if (type === "subtitle") {
        span.style.fontSize = "13px"
        span.style.fontWeight = "800"
        span.style.color = "#7C3AED"
        span.style.display = "block"
        span.style.marginTop = "8px"
        span.style.marginBottom = "3px"
      } else {
        span.style.fontSize = "12px"
        span.style.fontWeight = "500"
        span.style.color = "#0D2329"
        span.style.textTransform = "none"
        span.style.letterSpacing = "normal"
        span.style.display = "block"
        span.style.marginTop = "4px"
        span.style.marginBottom = "4px"
      }

      try {
        range.surroundContents(span)
      } catch {
        if (type === "title") {
          document.execCommand("fontSize", false, "5")
          document.execCommand("foreColor", false, "#005B94")
          document.execCommand("bold", false, null)
        } else if (type === "subtitle") {
          document.execCommand("fontSize", false, "4")
          document.execCommand("foreColor", false, "#7C3AED")
          document.execCommand("bold", false, null)
        } else {
          document.execCommand("fontSize", false, "3")
          document.execCommand("foreColor", false, "#0D2329")
          document.execCommand("removeFormat", false, null)
        }
      }
    } else {
      try {
        const tag = type === "title" ? "<h2>" : type === "subtitle" ? "<h3>" : "<p>"
        document.execCommand("formatBlock", false, tag)
      } catch {
        // Fallback silencioso
      }
    }
  }

  // Alinhamento Robusto
  function applyAlignment(align: "left" | "center" | "right" | "justify") {
    if (align === "left") {
      document.execCommand("justifyLeft", false, null)
    } else if (align === "center") {
      document.execCommand("justifyCenter", false, null)
    } else if (align === "right") {
      document.execCommand("justifyRight", false, null)
    } else if (align === "justify") {
      document.execCommand("justifyFull", false, null)
      const selection = window.getSelection()
      if (selection && selection.anchorNode) {
        let node: Node | null = selection.anchorNode
        while (node && node !== document.body) {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains("printable-report")) {
            break
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement
            if (["P", "DIV", "H1", "H2", "H3", "H4", "LI", "TD", "SPAN"].includes(el.tagName)) {
              el.style.textAlign = "justify"
              break
            }
          }
          node = node.parentNode
        }
      }
    }
  }

  // Listas Robustas (Marcadores e Numeração)
  function applyList(type: "unordered" | "ordered") {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = selection.toString()

    // 1. Tenta comando nativo do navegador
    const cmd = type === "unordered" ? "insertUnorderedList" : "insertOrderedList"
    const success = document.execCommand(cmd, false, null)

    // 2. Se o comando nativo não inseriu lista ou se temos texto selecionado com quebras, garante a lista perfeita
    const currentList = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : range.commonAncestorContainer.parentElement)?.closest("ul, ol")

    if (!success || (!currentList && selectedText.trim())) {
      const listTag = type === "unordered" ? "ul" : "ol"
      const list = document.createElement(listTag)
      list.style.listStyleType = type === "unordered" ? "disc" : "decimal"
      list.style.paddingLeft = "24px"
      list.style.margin = "6px 0"
      list.style.display = "block"

      if (selectedText.trim()) {
        const lines = selectedText.split(/\r?\n/).filter((l) => l.trim().length > 0)
        lines.forEach((line) => {
          const li = document.createElement("li")
          li.style.display = "list-item"
          li.style.marginBottom = "3px"
          li.textContent = line
          list.appendChild(li)
        })
      } else {
        const li = document.createElement("li")
        li.style.display = "list-item"
        li.style.marginBottom = "3px"
        li.textContent = "Novo item"
        list.appendChild(li)
      }

      try {
        range.deleteContents()
        range.insertNode(list)
      } catch (err) {
        // Fallback
      }
    }
  }

  // Inserção da Imagem no tamanho padrão elegante e centralizada
  function handleInsertImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (base64) {
        const imgHtml = `<img src="${base64}" alt="Foto do Teste" style="display: block; margin: 12px auto; width: 280px; max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); cursor: pointer;" class="report-user-image" />`
        execCmd("insertHTML", imgHtml)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Controles de Alinhamento de Imagem (Direto no elemento e com estilos forçados)
  function alignImage(align: "left" | "center" | "right") {
    if (!selectedImgEl) return
    selectedImgEl.style.display = "block"
    selectedImgEl.style.float = "none"
    if (align === "left") {
      selectedImgEl.style.marginLeft = "0px"
      selectedImgEl.style.marginRight = "auto"
      selectedImgEl.style.marginTop = "12px"
      selectedImgEl.style.marginBottom = "12px"
    } else if (align === "center") {
      selectedImgEl.style.marginLeft = "auto"
      selectedImgEl.style.marginRight = "auto"
      selectedImgEl.style.marginTop = "12px"
      selectedImgEl.style.marginBottom = "12px"
    } else if (align === "right") {
      selectedImgEl.style.marginLeft = "auto"
      selectedImgEl.style.marginRight = "0px"
      selectedImgEl.style.marginTop = "12px"
      selectedImgEl.style.marginBottom = "12px"
    }
  }

  // Controles de Tamanho de Imagem
  function resizeImage(widthVal: string | number) {
    if (!selectedImgEl) return
    if (typeof widthVal === "number") {
      selectedImgEl.style.width = `${widthVal}px`
      selectedImgEl.style.maxWidth = "100%"
    } else {
      selectedImgEl.style.width = widthVal
      selectedImgEl.style.maxWidth = "100%"
    }
    selectedImgEl.style.height = "auto"
  }

  function stepImageSize(delta: number) {
    if (!selectedImgEl) return
    const currentW = selectedImgEl.clientWidth || selectedImgEl.offsetWidth || 280
    const newW = Math.max(80, Math.min(850, currentW + delta))
    selectedImgEl.style.width = `${newW}px`
    selectedImgEl.style.maxWidth = "100%"
    selectedImgEl.style.height = "auto"
  }

  function deleteSelectedImage() {
    if (!selectedImgEl) return
    selectedImgEl.remove()
    setSelectedImgEl(null)
  }

  // Navegação de vizinhos para mover cards com precisão (pulando divisores)
  function getPreviousCard(card: HTMLElement): HTMLElement | null {
    let el = card.previousElementSibling as HTMLElement | null
    while (el) {
      if (el.classList.contains("group/card") || el.classList.contains("test-card-item")) {
        return el
      }
      el = el.previousElementSibling as HTMLElement | null
    }
    return null
  }

  function getNextCard(card: HTMLElement): HTMLElement | null {
    let el = card.nextElementSibling as HTMLElement | null
    while (el) {
      if (el.classList.contains("group/card") || el.classList.contains("test-card-item")) {
        return el
      }
      el = el.nextElementSibling as HTMLElement | null
    }
    return null
  }

  // Reordenação de Cards (Mover para Cima / Baixo)
  function moveCard(cardButton: HTMLElement, direction: "up" | "down") {
    const card = cardButton.closest(".group\\/card, .test-card-item") as HTMLElement
    if (!card || !card.parentElement) return
    const parent = card.parentElement

    if (direction === "up") {
      const prev = getPreviousCard(card)
      if (prev) {
        parent.insertBefore(card, prev)
      }
    } else {
      const next = getNextCard(card)
      if (next) {
        parent.insertBefore(card, next.nextElementSibling)
      }
    }
  }

  // Drag and Drop de Cards com Auto-Scroll
  function handleDragStartCard(e: React.DragEvent<HTMLElement>) {
    const card = (e.currentTarget as HTMLElement).closest(".group\\/card, .test-card-item") as HTMLElement
    if (card) {
      draggedCardElement = card
      e.dataTransfer.effectAllowed = "move"
      card.classList.add("opacity-50", "border-dashed", "border-[#7C3AED]")
    }
  }

  function handleDragEndCard(e: React.DragEvent<HTMLElement>) {
    const card = (e.currentTarget as HTMLElement).closest(".group\\/card, .test-card-item") as HTMLElement
    if (card) {
      card.classList.remove("opacity-50", "border-dashed", "border-[#7C3AED]")
    }
    draggedCardElement = null
  }

  function handleDragOverCard(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    // Auto-scroll do container ao arrastar perto do topo ou do rodapé
    const container = reportScrollRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      const y = e.clientY
      if (y < rect.top + 90) {
        container.scrollTop -= 18
      } else if (y > rect.bottom - 90) {
        container.scrollTop += 18
      }
    }
  }

  function handleDropCard(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    const targetCard = (e.currentTarget as HTMLElement).closest(".group\\/card, .test-card-item") as HTMLElement
    if (draggedCardElement && targetCard && draggedCardElement !== targetCard && targetCard.parentElement) {
      targetCard.parentElement.insertBefore(draggedCardElement, targetCard)
    }
    if (draggedCardElement) {
      draggedCardElement.classList.remove("opacity-50", "border-dashed", "border-[#7C3AED]")
    }
    draggedCardElement = null
  }

  // Adiciona Linha em Tabela Ativa
  function addTableRowToCard(targetButton: HTMLElement) {
    const card = targetButton.closest(".test-card-item, .group\\/card, .p-4")
    const table = card?.querySelector("table")
    if (table) {
      const tbody = table.querySelector("tbody") || table
      const headerThs = table.querySelectorAll("thead th")
      const colCount = headerThs.length > 0 ? headerThs.length : 4

      const newRow = document.createElement("tr")
      newRow.className = "border-b border-[#EEF5F6] hover:bg-[#F8FAFB]"

      let cellsHtml = ""
      for (let i = 0; i < colCount; i++) {
        const defaultText = i === 0 ? "Novo Fator / Item" : i === colCount - 1 ? "Média" : "-"
        cellsHtml += `<td class="p-2.5 font-medium text-[#0D2329]">${defaultText}</td>`
      }

      newRow.innerHTML = cellsHtml
      tbody.appendChild(newRow)
    }
  }

  function removeTableRowFromCard(targetButton: HTMLElement) {
    const card = targetButton.closest(".test-card-item, .group\\/card, .p-4")
    const tbody = card?.querySelector("table tbody")
    if (tbody && tbody.children.length > 1) {
      tbody.removeChild(tbody.lastElementChild as Node)
    }
  }

  // Cria e Insere Novo Card Formatado no Local Específico Clicado
  function insertCustomCardAt(targetSiblingCard?: HTMLElement | null) {
    const cardDiv = document.createElement("div")
    cardDiv.className = "relative group/card p-5 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] shadow-2xs space-y-3 test-card-item animate-in fade-in-50"
    cardDiv.draggable = true
    cardDiv.ondragstart = (e) => {
      draggedCardElement = cardDiv
      e.dataTransfer.effectAllowed = "move"
      cardDiv.classList.add("opacity-50", "border-dashed", "border-[#7C3AED]")
    }
    cardDiv.ondragend = () => {
      cardDiv.classList.remove("opacity-50", "border-dashed", "border-[#7C3AED]")
      draggedCardElement = null
    }
    cardDiv.ondragover = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    }
    cardDiv.ondrop = (e) => {
      e.preventDefault()
      if (draggedCardElement && cardDiv && draggedCardElement !== cardDiv && cardDiv.parentElement) {
        cardDiv.parentElement.insertBefore(draggedCardElement, cardDiv)
      }
    }

    cardDiv.innerHTML = `
      <!-- Ações do Card: Arrastar, Subir, Descer, Excluir -->
      <div contenteditable="false" class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
        <span class="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
          ⠿
        </span>
        <button type="button" class="btn-card-up p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs" title="Mover para cima">
          ⬆️
        </button>
        <button type="button" class="btn-card-down p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs" title="Mover para baixo">
          ⬇️
        </button>
        <button type="button" onclick="this.closest('.group\\\\/card, .test-card-item').remove()" class="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs" title="Excluir este card">
          🗑️ <span>Excluir</span>
        </button>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-2 pr-32">
        <h3 class="text-xs font-black uppercase text-[#0D2329] tracking-wide">
          NOVO INSTRUMENTO / TESTE AVALIATIVO
        </h3>
      </div>

      <p class="text-[11px] text-[#6B7C83] font-medium leading-relaxed">
        Objetivo da aplicação deste teste ou instrumento psicopedagógico.
      </p>

      <div class="overflow-x-auto rounded-xl border border-[#D8E5E7] bg-white">
        <table class="w-full text-[11px] text-left border-collapse">
          <thead>
            <tr class="bg-[#E0F2FE] border-b border-[#BAE6FD]">
              <th class="p-2.5 font-black text-[#005B94]">Fator / Parâmetro Avaliado</th>
              <th class="p-2.5 font-black text-[#005B94]">Pontos Brutos</th>
              <th class="p-2.5 font-black text-[#005B94]">Percentil</th>
              <th class="p-2.5 font-black text-[#005B94]">Classificação Clínica</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-[#EEF5F6] hover:bg-[#F8FAFB]">
              <td class="p-2.5 font-medium text-[#0D2329]">Item / Habilidade Avaliada 1</td>
              <td class="p-2.5 font-medium text-[#0D2329]">10</td>
              <td class="p-2.5 font-medium text-[#0D2329]">50</td>
              <td class="p-2.5 font-medium text-[#0D2329]">Médio</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Controles da Tabela -->
      <div class="flex items-center gap-2 pt-1 print:hidden" contenteditable="false">
        <button
          type="button"
          class="add-row-btn px-2.5 py-1 rounded-lg bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[11px] font-black flex items-center gap-1 border border-[#BAE6FD] cursor-pointer transition-all shadow-2xs"
          title="Adicionar uma nova linha nesta tabela"
        >
          <span>➕ Adicionar Linha</span>
        </button>
        <button
          type="button"
          class="remove-row-btn px-2 py-1 rounded-lg hover:bg-red-50 text-red-600 text-[11px] font-bold flex items-center gap-1 border border-transparent hover:border-red-200 cursor-pointer transition-all"
          title="Remover a última linha desta tabela"
        >
          <span>➖ Remover Linha</span>
        </button>
      </div>

      <p class="text-xs font-medium text-[#0D2329] leading-relaxed pl-2.5 border-l-2 border-[#7C3AED]">
        Interpretação clínica e qualitativa do desempenho do paciente neste instrumento avaliativo.
      </p>
    `

    // Conecta botões internos do card criado
    const addBtn = cardDiv.querySelector(".add-row-btn") as HTMLElement
    if (addBtn) addBtn.onclick = (e) => { e.stopPropagation(); addTableRowToCard(addBtn); }
    const remBtn = cardDiv.querySelector(".remove-row-btn") as HTMLElement
    if (remBtn) remBtn.onclick = (e) => { e.stopPropagation(); removeTableRowFromCard(remBtn); }
    const upBtn = cardDiv.querySelector(".btn-card-up") as HTMLElement
    if (upBtn) upBtn.onclick = (e) => { e.stopPropagation(); moveCard(upBtn, "up"); }
    const downBtn = cardDiv.querySelector(".btn-card-down") as HTMLElement
    if (downBtn) downBtn.onclick = (e) => { e.stopPropagation(); moveCard(downBtn, "down"); }

    const reportRoot = document.querySelector(".printable-report")
    const testsContainer = document.querySelector(".tests-container-list")

    if (targetSiblingCard && targetSiblingCard.parentElement) {
      targetSiblingCard.parentElement.insertBefore(cardDiv, targetSiblingCard.nextElementSibling)
    } else if (lastClickedCardEl && lastClickedCardEl.parentElement) {
      lastClickedCardEl.parentElement.insertBefore(cardDiv, lastClickedCardEl.nextElementSibling)
    } else if (testsContainer) {
      testsContainer.appendChild(cardDiv)
    } else if (reportRoot) {
      reportRoot.appendChild(cardDiv)
    }

    cardDiv.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  // Detecta clique em cards e imagens no relatório
  function handleReportClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    const card = target.closest(".group\\/card, .test-card-item") as HTMLElement
    if (card) {
      setLastClickedCardEl(card)
    }

    if (target && target.tagName === "IMG" && !target.closest(".modal-header-logo-box")) {
      if (selectedImgEl && selectedImgEl !== target) {
        selectedImgEl.style.outline = "none"
      }
      const img = target as HTMLImageElement
      img.style.outline = "3px solid #0078D7"
      img.style.outlineOffset = "2px"
      setSelectedImgEl(img)
    } else if (!target.closest(".floating-image-toolbar") && !target.closest("button")) {
      if (selectedImgEl) {
        selectedImgEl.style.outline = "none"
        setSelectedImgEl(null)
      }
    }
  }

  function handlePrint() {
    document.querySelectorAll(".printable-report img").forEach((img) => {
      ;(img as HTMLElement).style.outline = "none"
    })

    const reportElement = document.querySelector(".printable-report")
    if (!reportElement) {
      window.print()
      return
    }

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      window.print()
      return
    }

    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join("\n")

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Laudo Psicopedagógico - ${patientData.fullName || "Paciente"}</title>
        ${headStyles}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          html, body {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #0D2329 !important;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible !important;
          }
          * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .printable-report {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            visibility: visible !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 8px !important;
            outline: none !important;
          }
          ul {
            list-style-type: disc !important;
            padding-left: 24px !important;
            margin: 6px 0 !important;
          }
          ol {
            list-style-type: decimal !important;
            padding-left: 24px !important;
            margin: 6px 0 !important;
          }
          li {
            display: list-item !important;
            margin-bottom: 3px !important;
          }
          font[size="1"] { font-size: 10px !important; line-height: 1.4 !important; }
          font[size="2"] { font-size: 11px !important; line-height: 1.45 !important; }
          font[size="3"] { font-size: 12px !important; line-height: 1.5 !important; }
          font[size="4"] { font-size: 14px !important; line-height: 1.55 !important; font-weight: 600 !important; }
          font[size="5"] { font-size: 16px !important; line-height: 1.6 !important; font-weight: 700 !important; }
          font[size="6"] { font-size: 18px !important; line-height: 1.6 !important; font-weight: 800 !important; }
          font[size="7"] { font-size: 22px !important; line-height: 1.6 !important; font-weight: 900 !important; }
        </style>
      </head>
      <body class="p-4 space-y-6 bg-white">
        <div class="printable-report space-y-6">
          ${reportElement.innerHTML}
        </div>
      </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 2000)
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 printable-report-modal print:static print:p-0 print:bg-white print:block print:inset-auto print:z-auto print:overflow-visible print:h-auto print:max-h-none print:w-full">
      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl animate-in zoom-in-95 print:border-none print:shadow-none print:max-h-none print:h-auto print:w-full print:block print:overflow-visible print:static print:p-0 print:m-0">
        
        {/* Barra Superior de Ações */}
        <div className="p-3.5 sm:p-4 border-b border-[#EEF5F6] flex items-center justify-between bg-[#F8FAFB] rounded-t-3xl gap-3 flex-wrap print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#0D2329]">
                  Editor & Prévia do Laudo Psicopedagógico
                </h3>
                <span className="text-[10px] bg-[#EDE9FE] text-[#7C3AED] font-black px-2.5 py-0.5 rounded-full border border-[#DDD6FE]">
                  Padrão Oficial · CBO 2394-25
                </span>
              </div>
              <p className="text-xs font-semibold text-[#6B7C83]">
                Segure e arraste o card com o scroll do mouse, use ⬆️ ⬇️ ou insira blocos onde clicar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFB] text-[#0D2329] border-2 border-[#D8E5E7] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#005B94]" />
              <span>Imprimir / PDF</span>
            </button>

            {onDownloadDocx && (
              <button
                type="button"
                onClick={onDownloadDocx}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Word (.docx)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-[#F8FAFB] text-[#6B7C83] hover:text-[#0D2329] border border-[#D8E5E7] transition-all cursor-pointer"
              title="Fechar Prévia"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            MENU DE FERRAMENTAS ESTILO WORD / GOOGLE DOCS (PRINT:HIDDEN)
            ========================================================================= */}
        <div className="bg-[#F8FAFB] border-b border-[#D8E5E7] px-3 py-2 flex items-center gap-1.5 flex-wrap text-xs text-[#0D2329] print:hidden shadow-2xs select-none">
          {/* Desfazer / Refazer */}
          <div className="flex items-center gap-0.5 border-r border-[#D8E5E7] pr-2">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("undo"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("redo"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Refazer (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Formatação de Texto (B, I, U, S) */}
          <div className="flex items-center gap-0.5 border-r border-[#D8E5E7] pr-2">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("bold"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#0D2329] font-black border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Negrito (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("italic"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#0D2329] italic border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Itálico (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("underline"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#0D2329] underline border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Sublinhado (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("strikeThrough"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Tachado"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>

          {/* Tamanho da Letra */}
          <div className="flex items-center gap-1 border-r border-[#D8E5E7] pr-2">
            <span className="text-[10px] font-bold text-[#6B7C83]">Tamanho:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  execCmd("fontSize", e.target.value)
                }
              }}
              defaultValue="3"
              className="bg-white border border-[#D8E5E7] rounded-lg px-2 py-1 text-[11px] font-bold text-[#0D2329] cursor-pointer focus:outline-none focus:border-[#7C3AED]"
              title="Escolher Tamanho da Letra"
            >
              <option value="1">10px (Micro)</option>
              <option value="2">11px (Pequeno)</option>
              <option value="3">12px (Normal)</option>
              <option value="4">14px (Médio)</option>
              <option value="5">16px (Grande)</option>
              <option value="6">18px (Extra)</option>
              <option value="7">22px (Gigante)</option>
            </select>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("fontSize", "4"); }}
              className="px-1.5 py-0.5 rounded-lg hover:bg-white text-[#0D2329] font-black border border-transparent hover:border-[#D8E5E7] cursor-pointer text-xs"
              title="Aumentar Fonte (A+)"
            >
              A+
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); execCmd("fontSize", "2"); }}
              className="px-1.5 py-0.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] font-bold border border-transparent hover:border-[#D8E5E7] cursor-pointer text-[10px]"
              title="Diminuir Fonte (A-)"
            >
              A-
            </button>
          </div>

          {/* Botões Robustos de Título, Subtítulo e Parágrafo */}
          <div className="flex items-center gap-1 border-r border-[#D8E5E7] pr-2">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyHeadingOrParagraph("title"); }}
              className="px-2 py-1 rounded-lg bg-white hover:bg-sky-50 text-[11px] font-black text-[#005B94] border border-[#BAE6FD] hover:border-[#005B94] cursor-pointer flex items-center gap-1 shadow-2xs transition-all"
              title="Transformar seleção em Título Principal"
            >
              <Heading1 className="w-3.5 h-3.5 text-[#005B94]" />
              <span>Título</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyHeadingOrParagraph("subtitle"); }}
              className="px-2 py-1 rounded-lg bg-white hover:bg-purple-50 text-[11px] font-black text-[#7C3AED] border border-[#DDD6FE] hover:border-[#7C3AED] cursor-pointer flex items-center gap-1 shadow-2xs transition-all"
              title="Transformar seleção em Subtítulo"
            >
              <Heading2 className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Subtítulo</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyHeadingOrParagraph("paragraph"); }}
              className="px-2 py-1 rounded-lg hover:bg-white text-[11px] font-semibold text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Transformar em Parágrafo Normal"
            >
              Parágrafo
            </button>
          </div>

          {/* Cores Rápidas de Fonte */}
          <div className="flex items-center gap-1 border-r border-[#D8E5E7] pr-2">
            <span className="text-[10px] font-bold text-[#6B7C83] mr-0.5">Cor:</span>
            {[
              { color: "#005B94", name: "Azul Clínico" },
              { color: "#7C3AED", name: "Roxo" },
              { color: "#0D2329", name: "Preto" },
              { color: "#059669", name: "Verde" },
              { color: "#DC2626", name: "Vermelho" },
            ].map((c) => (
              <button
                key={c.color}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); execCmd("foreColor", c.color); }}
                className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition-transform cursor-pointer shadow-2xs"
                style={{ backgroundColor: c.color }}
                title={c.name}
              />
            ))}
          </div>

          {/* Alinhamento (Esquerda, Centro, Direita, Justificar) */}
          <div className="flex items-center gap-0.5 border-r border-[#D8E5E7] pr-2">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyAlignment("left"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Alinhar à Esquerda"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyAlignment("center"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Centralizar"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyAlignment("right"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Alinhar à Direita"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyAlignment("justify"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Justificar Texto"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Listas (Marcadores e Numeração) */}
          <div className="flex items-center gap-0.5 border-r border-[#D8E5E7] pr-2">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyList("unordered"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Lista com Marcadores (Bolinhas)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyList("ordered"); }}
              className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer"
              title="Lista Numerada (1, 2, 3)"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          {/* Inserir Imagem */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] font-black border border-[#C4B5FD] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all"
            title="Inserir Foto ou Desenho do Teste"
          >
            <ImagePlus className="w-4 h-4" />
            <span>+ Imagem</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInsertImage}
            accept="image/*"
            className="hidden"
          />

          {/* Botão Rápido de Inserir Novo Card onde clicou */}
          <button
            type="button"
            onClick={() => insertCustomCardAt(lastClickedCardEl)}
            className="px-2.5 py-1 rounded-lg bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] font-black border border-[#BAE6FD] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all ml-1"
            title="Inserir um novo card na posição clicada"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Card Aqui</span>
          </button>

          {/* Limpar Formatação */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd("removeFormat"); }}
            className="p-1.5 rounded-lg hover:bg-white text-[#6B7C83] hover:text-[#0D2329] border border-transparent hover:border-[#D8E5E7] cursor-pointer ml-auto"
            title="Limpar Formatação do Texto Selecionado"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            BARRA FLUTUANTE DE CONTROLE DA IMAGEM SELECIONADA
            ========================================================================= */}
        {selectedImgEl && (
          <div
            contentEditable={false}
            className="floating-image-toolbar bg-[#EFF6FF] border-b-2 border-[#93C5FD] px-4 py-2 flex items-center justify-between gap-2 flex-wrap text-xs animate-in slide-in-from-top-2 print:hidden z-20"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-[#1E40AF] flex items-center gap-1">
                <ImagePlus className="w-4 h-4" />
                <span>Foto Selecionada:</span>
              </span>

              {/* Alinhamentos da Imagem */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#BFDBFE]">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); alignImage("left"); }}
                  className="px-2 py-0.5 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Alinhar à Esquerda"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Esquerda</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); alignImage("center"); }}
                  className="px-2 py-0.5 rounded-lg bg-[#DBEAFE] text-[#1E40AF] font-black text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Centralizar Foto"
                >
                  <span>↔️ Centro</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); alignImage("right"); }}
                  className="px-2 py-0.5 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Alinhar à Direita"
                >
                  <span>Direita</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Tamanhos Pré-definidos */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#BFDBFE]">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); resizeImage(160); }}
                  className="px-2 py-0.5 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] cursor-pointer"
                  title="Tamanho Pequeno (160px)"
                >
                  Pequena
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); resizeImage(280); }}
                  className="px-2 py-0.5 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] cursor-pointer"
                  title="Tamanho Médio (280px)"
                >
                  Média
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); resizeImage(440); }}
                  className="px-2 py-0.5 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] cursor-pointer"
                  title="Tamanho Grande (440px)"
                >
                  Grande
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); resizeImage("100%"); }}
                  className="px-2 py-0.5 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-bold text-[11px] cursor-pointer"
                  title="Largura Total"
                >
                  100%
                </button>
              </div>

              {/* Ajuste Fino (+ / -) */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#BFDBFE]">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); stepImageSize(-40); }}
                  className="p-1 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-black cursor-pointer"
                  title="Diminuir Imagem"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); stepImageSize(40); }}
                  className="p-1 rounded-lg hover:bg-[#EFF6FF] text-[#1E40AF] font-black cursor-pointer"
                  title="Aumentar Imagem"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Excluir Imagem */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteSelectedImage(); }}
              className="px-3 py-1 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-black flex items-center gap-1.5 border border-red-300 transition-all cursor-pointer"
              title="Excluir esta foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Foto</span>
            </button>
          </div>
        )}

        {/* Input Oculto para Trocar / Subir Logo da Clínica */}
        <input
          type="file"
          ref={clinicLogoInputRef}
          onChange={handleClinicLogoUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Corpo do Documento Formatado (Estilo Folha A4 Clínica Editável) */}
        <div
          ref={reportScrollRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onClick={handleReportClick}
          onDragOver={handleDragOverCard}
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
          className="p-6 sm:p-10 overflow-y-auto space-y-8 text-xs font-sans bg-[#FBFDFD] printable-report print:bg-white print:p-0 print:overflow-visible print:max-h-none print:h-auto print:block print:space-y-6 focus:outline-none cursor-text select-text selection:bg-[#0078D7] selection:text-white"
        >
          
          {/* 1. Timbre e Cabeçalho da Clínica */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-6 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3 print:border-none print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-4 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {headerLogo ? (
                  <div
                    contentEditable={false}
                    className="modal-header-logo-box relative group/logo cursor-pointer shrink-0"
                    onClick={() => clinicLogoInputRef.current?.click()}
                    title="Clique para alterar a logo da clínica"
                  >
                    <img
                      src={headerLogo}
                      alt="Logo Clínica"
                      className="modal-header-logo h-14 max-h-16 w-auto max-w-[170px] object-contain rounded-xl shadow-2xs"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-[#7C3AED] text-white p-1 rounded-full text-[9px] opacity-0 group-hover/logo:opacity-100 transition-opacity print:hidden shadow-xs">
                      <Upload className="w-3 h-3" />
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    contentEditable={false}
                    onClick={() => clinicLogoInputRef.current?.click()}
                    className="modal-header-logo-box w-14 h-14 rounded-2xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] flex flex-col items-center justify-center font-bold border-2 border-dashed border-[#C4B5FD] transition-all cursor-pointer group shadow-2xs print:border-none print:shadow-none"
                    title="Clique para adicionar a logo da sua clínica"
                  >
                    <Building2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-black mt-0.5 print:hidden">+ Logo</span>
                  </button>
                )}
                <div>
                  <h1 className="text-base font-black text-[#0D2329] uppercase tracking-wide">
                    {professionalData.clinicName || "Aprender Ensinando"}
                  </h1>
                  <p className="text-[11px] font-bold text-[#6B7C83]">
                    {professionalData.address || "Atendimento Psicopedagógico Especializado"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#005B94] block">
                  LAUDO PSICOPEDAGÓGICO
                </span>
                <span className="text-[10px] font-bold text-[#6B7C83]">
                  {(professionalData.city || "São Paulo") + " - " + (professionalData.state || "SP") + " · " + todayStr}
                </span>
              </div>
            </div>

            {/* Identificação da Psicopedagoga */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-[#6B7C83] flex-wrap gap-2">
              <span>
                Profissional Responsável: <strong className="text-[#0D2329]">{professionalData.professionalName}</strong>
              </span>
              <span>
                CBO / Registro: <strong className="text-[#0D2329]">{professionalData.cboOrCrp || "2394-25"}</strong>
              </span>
            </div>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 2. Identificação do Paciente */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <User className="w-4 h-4 text-[#005B94]" />
              <span>1. Identificação do Paciente</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#6B7C83] block text-[10px] font-bold">NOME:</span>
                <strong className="text-[#0D2329] text-sm">{patientData.fullName}</strong>
              </div>
              <div>
                <span className="text-[#6B7C83] block text-[10px] font-bold">DATA DE NASCIMENTO:</span>
                <strong className="text-[#0D2329]">{patientData.birthDate || "Não informada"}</strong>
              </div>
              <div>
                <span className="text-[#6B7C83] block text-[10px] font-bold">IDADE CRONOLÓGICA:</span>
                <strong className="text-[#0D2329]">{patientData.ageFormatted || "Não informada"}</strong>
              </div>
              <div>
                <span className="text-[#6B7C83] block text-[10px] font-bold">FILIAÇÃO:</span>
                <span className="text-[#0D2329] font-medium">
                  {patientData.fatherName ? ("Pai: " + patientData.fatherName) : ""}
                  {patientData.fatherName && patientData.motherName ? " | " : ""}
                  {patientData.motherName ? ("Mãe: " + patientData.motherName) : ""}
                  {!patientData.fatherName && !patientData.motherName ? "Conforme prontuário" : ""}
                </span>
              </div>
              <div>
                <span className="text-[#6B7C83] block text-[10px] font-bold">ESCOLA / SÉRIE:</span>
                <strong className="text-[#0D2329]">
                  {(patientData.schoolName || "Escola não informada") + (patientData.grade ? (" (" + patientData.grade + ")") : "")}
                </strong>
              </div>
              <div>
                <span className="text-[#6B7C83] block text-[10px] font-bold">SESSÕES REALIZADAS:</span>
                <strong className="text-[#7C3AED]">{sessionsCount + " sessões clínicas"}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-[#EEF5F6]">
              <span className="text-[#6B7C83] block text-[10px] font-bold">QUEIXA PRINCIPAL / MOTIVO DA AVALIAÇÃO:</span>
              <p className="text-[#0D2329] font-medium mt-0.5 leading-relaxed">
                {"\"" + patientData.mainComplaint + "\""}
              </p>
            </div>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 3. Instrumentos Avaliativos Utilizados */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <Brain className="w-4 h-4 text-[#005B94]" />
              <span>{"2. Instrumentos Avaliativos Utilizados (" + selectedInstruments.length + ")"}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {selectedInstruments.map((inst, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7] text-[11px] font-bold text-[#0D2329] flex items-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-[10px] font-black flex items-center justify-center shrink-0">
                    ✓
                  </span>
                  <span>{inst}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] italic text-[#6B7C83] pt-2 border-t border-[#EEF5F6]">
              * Toda a avaliação teve como base: ciência, estatísticas, informações da família e escola, testes quantitativos e qualitativos e DSM-5-TR como instrumento norteador para a hipótese diagnóstica.
            </p>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 4. Anamnese / Entrevista Inicial com a Família */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-4 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#005B94]" />
                <span>{"3. Anamnese / Entrevista Inicial com a Família (" + familyQuestions.length + " Perguntas)"}</span>
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                Relato Familiar
              </span>
            </div>

            <div className="space-y-3">
              {familyQuestions.map((q) => (
                <div key={q.id} className="p-3 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-1">
                  <span className="text-[11px] font-black text-[#0D2329] block">
                    {q.num + ". " + q.title}
                  </span>
                  <p className="text-xs text-[#0D2329] font-medium italic leading-relaxed pl-2 border-l-2 border-[#7C3AED]">
                    {q.answer && q.answer.trim()
                      ? ("\"" + q.answer.trim() + "\"")
                      : "Informação não relatada ou não aplicável durante a entrevista."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 5. Entrevista / Visita Escolar */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-4 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                <School className="w-4 h-4 text-[#005B94]" />
                <span>{"4. Entrevista / Visita Escolar (" + schoolQuestions.length + " Perguntas)"}</span>
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                Ambiente Escolar
              </span>
            </div>

            {schoolObserver?.name && (
              <div className="p-3 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-[11px] font-bold text-[#0284C7] flex items-center justify-between flex-wrap gap-2">
                <span>Observador / Professora: <strong>{schoolObserver.name + " (" + (schoolObserver.role || "Professora") + ")"}</strong></span>
                <span>Data do Relato: <strong>{schoolObserver.date || todayStr}</strong></span>
              </div>
            )}

            <div className="space-y-3">
              {schoolQuestions.map((q) => (
                <div key={q.id} className="p-3 rounded-xl bg-[#F8FAFB] border border-[#D8E5E7] space-y-1">
                  <span className="text-[11px] font-black text-[#0D2329] block">
                    {q.num + ". " + q.title}
                  </span>
                  <p className="text-xs text-[#0D2329] font-medium italic leading-relaxed pl-2 border-l-2 border-[#0284C7]">
                    {q.answer && q.answer.trim()
                      ? ("\"" + q.answer.trim() + "\"")
                      : "Informação não observada ou não registrada pela equipe pedagógica."}
                  </p>
                </div>
              ))}
            </div>

            {/* Traços Comportamentais Marcados */}
            <div className="pt-3 border-t border-[#EEF5F6] space-y-2">
              <span className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block">
                Características Comportamentais Observadas pela Escola:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[
                  { key: "desligado", label: "Desligado" },
                  { key: "agitado", label: "Agitado" },
                  { key: "retraido", label: "Retraído" },
                  { key: "dependente", label: "Dependente" },
                  { key: "calmo", label: "Calmo" },
                  { key: "passivo", label: "Passivo" },
                  { key: "agressivo", label: "Agressivo" },
                  { key: "sem_limites", label: "Sem limites" },
                  { key: "medroso", label: "Medroso" },
                  { key: "melancolico", label: "Melancólico" },
                  { key: "depressivo", label: "Depressivo" },
                  { key: "ressentido", label: "Ressentido" },
                ].map((item) => {
                  const isChecked = Boolean(schoolTraits[item.key])
                  return (
                    <div
                      key={item.key}
                      className={"p-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 " + (
                        isChecked
                          ? "bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] font-black"
                          : "bg-white text-[#6B7C83] border-[#D8E5E7] opacity-60"
                      )}
                    >
                      <span>{isChecked ? "(X)" : "( )"}</span>
                      <span>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 6. Resultados dos Testes e Instrumentos Avaliativos */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-5 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-2 flex-wrap gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#005B94]" />
                <span>5. Resultados dos Testes e Instrumentos Avaliativos</span>
              </h2>

              {/* Botão de Adicionar Card no Bloco */}
              <button
                type="button"
                contentEditable={false}
                onClick={() => insertCustomCardAt()}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all print:hidden"
                title="Adicionar um novo card de teste ou instrumento avaliativo"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Adicionar Novo Teste</span>
              </button>
            </div>

            <div className="space-y-6 tests-container-list">
              {initialTestsResults.map((test, tIdx) => (
                <div
                  key={tIdx}
                  draggable={true}
                  onDragStart={handleDragStartCard}
                  onDragEnd={handleDragEndCard}
                  onDragOver={handleDragOverCard}
                  onDrop={handleDropCard}
                  className="relative group/card p-4 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] space-y-3 test-card-item transition-all"
                >
                  {/* Ações do Card de Teste: Arrastar, Subir, Descer, Excluir */}
                  <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
                    <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                      className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                      title="Mover teste para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                      className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                      title="Mover teste para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const card = (e.currentTarget as HTMLElement).closest(".test-card-item")
                        if (card) card.remove()
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                      title="Excluir este bloco de teste"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pr-32">
                    <h3 className="text-xs font-black uppercase text-[#0D2329] tracking-wide">
                      {test.title}
                    </h3>
                  </div>

                  {test.objective && (
                    <p className="text-[11px] text-[#6B7C83] font-medium leading-relaxed">
                      {test.objective}
                    </p>
                  )}

                  {/* Tabela do Teste */}
                  {test.tableHeaders && test.tableRows && (
                    <div className="overflow-x-auto rounded-xl border border-[#D8E5E7] bg-white">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="bg-[#E0F2FE] border-b border-[#BAE6FD]">
                            {test.tableHeaders.map((th, hIdx) => (
                              <th key={hIdx} className="p-2.5 font-black text-[#005B94]">
                                {th}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {test.tableRows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-[#EEF5F6] hover:bg-[#F8FAFB]">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 font-medium text-[#0D2329]">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Controles da Tabela: Adicionar Linha / Remover Linha */}
                  {test.tableHeaders && (
                    <div className="flex items-center gap-2 pt-1 print:hidden" contentEditable={false}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          addTableRowToCard(e.currentTarget)
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[11px] font-black flex items-center gap-1 border border-[#BAE6FD] cursor-pointer transition-all shadow-2xs"
                        title="Adicionar uma nova linha nesta tabela"
                      >
                        <span>➕ Adicionar Linha</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeTableRowFromCard(e.currentTarget)
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-red-50 text-red-600 text-[11px] font-bold flex items-center gap-1 border border-transparent hover:border-red-200 cursor-pointer transition-all"
                        title="Remover a última linha desta tabela"
                      >
                        <span>➖ Remover Linha</span>
                      </button>
                    </div>
                  )}

                  {test.scoreCutoffText && (
                    <p className="text-[11px] font-black text-[#005B94]">
                      {test.scoreCutoffText}
                    </p>
                  )}

                  {test.interpretationText && (
                    <p className="text-xs font-medium text-[#0D2329] leading-relaxed pl-2.5 border-l-2 border-[#7C3AED]">
                      {test.interpretationText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 7. Observação Clínica nas Sessões */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-2 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <Stethoscope className="w-4 h-4 text-[#005B94]" />
              <span>6. Observação Clínica nas Sessões</span>
            </h2>
            <p className="text-xs font-medium text-[#0D2329] leading-relaxed text-justify pt-1">
              {clinicalObservation}
            </p>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 8. Síntese da Avaliação Psicopedagógica */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-2 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <FileText className="w-4 h-4 text-[#005B94]" />
              <span>7. Síntese da Avaliação Psicopedagógica</span>
            </h2>
            <p className="text-xs font-medium text-[#0D2329] leading-relaxed text-justify pt-1">
              {synthesis}
            </p>
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 9. Hipótese Diagnóstica (DSM-5-TR) */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <Lightbulb className="w-4 h-4 text-[#005B94]" />
              <span>8. Hipótese Diagnóstica (DSM-5-TR)</span>
            </h2>
            <p className="text-xs font-medium text-[#0D2329] leading-relaxed text-justify">
              {diagnosticHypothesis}
            </p>

            {dsm5Criteria && dsm5Criteria.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block">
                  Critérios Identificados (DSM-5-TR):
                </span>
                <div className="space-y-1 pl-2">
                  {dsm5Criteria.map((crit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#0D2329]">
                      <strong className="text-[#7C3AED] font-black">{String.fromCharCode(97 + idx) + ")"}</strong>
                      <span className="font-medium leading-relaxed">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divisor Interativo para Inserir Card Aqui */}
          <div contentEditable={false} className="group/divbar relative flex items-center justify-center py-1 opacity-0 hover:opacity-100 transition-opacity print:hidden">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#BAE6FD]" /></div>
            <button
              type="button"
              onClick={(e) => {
                const prevCard = (e.currentTarget as HTMLElement).closest(".group\\/divbar")?.previousElementSibling as HTMLElement
                insertCustomCardAt(prevCard)
              }}
              className="relative px-3 py-1 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#005B94] text-[10px] font-black flex items-center gap-1 border border-[#BAE6FD] shadow-2xs cursor-pointer"
            >
              <span>➕ Inserir Card Aqui</span>
            </button>
          </div>

          {/* 10. Encaminhamentos & Orientações */}
          <div
            draggable={true}
            onDragStart={handleDragStartCard}
            onDragEnd={handleDragEndCard}
            onDragOver={handleDragOverCard}
            onDrop={handleDropCard}
            className="relative group/card p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-4 print:border print:shadow-none print-avoid-break transition-all"
          >
            {/* Controles do Card (Arrastar, Mover, Excluir) */}
            <div contentEditable={false} className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden z-10">
              <span className="cursor-grab p-1 rounded-lg bg-white border border-[#D8E5E7] text-[#6B7C83] hover:text-[#0D2329]" title="Segure e arraste para mudar de posição">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "up"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para cima"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); moveCard(e.currentTarget, "down"); }}
                className="p-1 rounded-lg bg-white hover:bg-[#F8FAFB] text-[#0D2329] border border-[#D8E5E7] cursor-pointer shadow-2xs"
                title="Mover card para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5 text-[#005B94]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = (e.currentTarget as HTMLElement).closest(".group\\/card")
                  if (card) card.remove()
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-red-200 transition-all cursor-pointer shadow-2xs"
                title="Excluir este bloco do laudo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>

            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <CheckCircle2 className="w-4 h-4 text-[#005B94]" />
              <span>9. Encaminhamentos & Orientações Pedagógicas</span>
            </h2>

            {/* Encaminhamentos */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block">
                Encaminhamentos Profissionais Recomendados:
              </span>
              <div className="space-y-1 pl-2">
                {referrals.map((refItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[#0D2329] font-bold">
                    <span className="text-[#0284C7] font-black">→</span>
                    <span>{refItem}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recomendações Família & Escola */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#EEF5F6]">
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block">
                  Orientações para a Família:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-xs text-[#0D2329] font-medium">
                  {recommendationsFamily.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block">
                  Orientações para a Escola:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-xs text-[#0D2329] font-medium">
                  {recommendationsSchool.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Considerações Finais */}
            <div className="pt-2 border-t border-[#EEF5F6]">
              <span className="text-[11px] font-black uppercase text-[#005B94] tracking-wider block">
                Considerações Finais:
              </span>
              <p className="text-xs font-medium text-[#0D2329] leading-relaxed text-justify mt-1">
                {finalConsiderations}
              </p>
            </div>
          </div>

          {/* Assinatura */}
          <div className="relative group/card pt-10 text-center space-y-1 border-t-2 border-[#D8E5E7] mt-8 print-avoid-break">
            <p className="font-black text-sm text-[#0D2329]">{professionalData.professionalName}</p>
            <p className="text-xs font-semibold text-[#6B7C83]">
              {"Psicopedagoga Clínica · CBO " + (professionalData.cboOrCrp || "2394-25")}
            </p>
            <p className="text-[10px] text-[#6B7C83]">
              {professionalData.clinicName || "Aprender Ensinando"}
            </p>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="p-3.5 sm:p-4 border-t border-[#EEF5F6] bg-[#F8FAFB] rounded-b-3xl flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F8FAFB] text-[#0D2329] border-2 border-[#D8E5E7] text-xs font-black transition-all cursor-pointer"
          >
            Voltar para Edição
          </button>

          {onDownloadDocx && (
            <button
              type="button"
              onClick={onDownloadDocx}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#7C3AED] hover:from-[#4F46E5] hover:to-[#6D28D9] text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Relatório Word (.docx)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
