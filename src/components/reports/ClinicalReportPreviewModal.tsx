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
  testsResults,
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

  const todayStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  function handlePrint() {
    const reportElement = document.querySelector(".printable-report")
    if (!reportElement) {
      window.print()
      return
    }

    // Cria iframe isolado no DOM para garantir quebra de páginas multi-folha A4 perfeita sem interferência de modais
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

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Laudo Psicopedagógico - ${patientData.fullName || "Paciente"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #0D2329 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
        </style>
      </head>
      <body class="p-2 space-y-6">
        ${reportElement.innerHTML}
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
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 printable-report-modal print:static print:p-0 print:bg-white print:block print:inset-auto print:z-auto print:overflow-visible print:h-auto print:max-h-none print:w-full">
      <div className="bg-white rounded-3xl border-2 border-[#D8E5E7] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 print:border-none print:shadow-none print:max-h-none print:h-auto print:w-full print:block print:overflow-visible print:static print:p-0 print:m-0">
        
        {/* Barra Superior de Ações */}
        <div className="p-4 sm:p-5 border-b border-[#EEF5F6] flex items-center justify-between bg-[#F8FAFB] rounded-t-3xl gap-3 flex-wrap print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#0D2329]">
                  Prévia do Laudo Psicopedagógico
                </h3>
                <span className="text-[10px] bg-[#EDE9FE] text-[#7C3AED] font-black px-2.5 py-0.5 rounded-full border border-[#DDD6FE]">
                  Padrão Oficial · CBO 2394-25
                </span>
              </div>
              <p className="text-xs font-semibold text-[#6B7C83]">
                Visualização formatada antes de baixar o arquivo Word (.docx)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFB] text-[#0D2329] border-2 border-[#D8E5E7] text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#6B7C83]" />
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

        {/* Corpo do Documento Formatado (Estilo Folha A4 Clínica) */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 text-xs font-sans bg-[#FBFDFD] printable-report print:bg-white print:p-0 print:overflow-visible print:max-h-none print:h-auto print:block print:space-y-6">
          
          {/* 1. Timbre e Cabeçalho da Clínica */}
          <div className="p-6 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EEF5F6] pb-4 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {professionalData.clinicLogoUrl ? (
                  <img
                    src={professionalData.clinicLogoUrl}
                    alt="Logo Clínica"
                    className="h-14 w-auto object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h1 className="text-base font-black text-[#0D2329] uppercase tracking-wide">
                    {professionalData.clinicName || "EvoluIA — Clínica de Psicopedagogia"}
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

          {/* 2. Identificação do Paciente */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3">
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

          {/* 3. Instrumentos Avaliativos Utilizados */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3">
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

          {/* 4. Anamnese / Entrevista Inicial com a Família */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-4">
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

          {/* 5. Entrevista / Visita Escolar */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-4">
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

          {/* 6. Resultados dos Testes e Instrumentos Avaliativos */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <Brain className="w-4 h-4 text-[#005B94]" />
              <span>{"5. Resultados dos Testes e Instrumentos Avaliativos (" + testsResults.length + ")"}</span>
            </h2>

            <div className="space-y-6">
              {testsResults.map((test, tIdx) => (
                <div key={tIdx} className="p-4 rounded-2xl bg-[#F8FAFB] border-2 border-[#D8E5E7] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
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

          {/* 7. Observação Clínica nas Sessões */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <Stethoscope className="w-4 h-4 text-[#005B94]" />
              <span>6. Observação Clínica nas Sessões</span>
            </h2>
            <p className="text-xs font-medium text-[#0D2329] leading-relaxed text-justify pt-1">
              {clinicalObservation}
            </p>
          </div>

          {/* 8. Síntese da Avaliação Psicopedagógica */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#005B94] flex items-center gap-2 border-b border-[#EEF5F6] pb-2">
              <FileText className="w-4 h-4 text-[#005B94]" />
              <span>7. Síntese da Avaliação Psicopedagógica</span>
            </h2>
            <p className="text-xs font-medium text-[#0D2329] leading-relaxed text-justify pt-1">
              {synthesis}
            </p>
          </div>

          {/* 9. Hipótese Diagnóstica (DSM-5-TR) */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-3">
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

          {/* 10. Encaminhamentos & Orientações */}
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E5E7] shadow-2xs space-y-4">
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
          <div className="pt-10 text-center space-y-1 border-t-2 border-[#D8E5E7] mt-8">
            <p className="font-black text-sm text-[#0D2329]">{professionalData.professionalName}</p>
            <p className="text-xs font-semibold text-[#6B7C83]">
              {"Psicopedagoga Clínica · CBO " + (professionalData.cboOrCrp || "2394-25")}
            </p>
            <p className="text-[10px] text-[#6B7C83]">
              {professionalData.clinicName || "EvoluIA — Gestão Psicopedagógica"}
            </p>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="p-4 border-t border-[#EEF5F6] bg-[#F8FAFB] rounded-b-3xl flex items-center justify-between gap-3 print:hidden">
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
