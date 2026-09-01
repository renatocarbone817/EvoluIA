/**
 * GERADOR DE LAUDO / RELATÓRIO PSICOPEDAGÓGICO EM WORD (.DOCX)
 * Baseado no modelo clínico oficial de 20 páginas do Espaço Multidisciplinar Aprender Ensinando
 * Psicopedagoga Priscila Carbone (CBO 2394-25)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  BorderStyle,
  VerticalAlign,
  ImageRun,
} from "docx"

export interface ReportPatientData {
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

export interface ReportProfessionalData {
  clinicName?: string
  clinicLogoUrl?: string
  logoUrl?: string
  professionalName: string
  cboOrCrp?: string
  address?: string
  phone?: string
  city?: string
  state?: string
}

export interface ReportAnamneseData {
  family?: string
  conceptionAndPregnancy?: string
  breastfeedingAndDiet?: string
  psychomotorAndLanguage?: string
  sleep?: string
  familyHealthHistory?: string
  schooling?: string
  relationshipsAndSociability?: string
}

export interface ReportSchoolInterviewData {
  development?: string
  behavior?: string
  mainDifficulties?: string
  learningAndAssimilation?: string
  homework?: string
  organization?: string
  limitsAndFrustration?: string
  traits?: {
    aggressive?: boolean
    passive?: boolean
    dependent?: boolean
    fearful?: boolean
    withdrawn?: boolean
    melancholic?: boolean
    calm?: boolean
    unfocused?: boolean
    boundaryless?: boolean
    restless?: boolean
    depressive?: boolean
    resentful?: boolean
  }
  additionalNotes?: string
}

export interface ReportTestResult {
  id: string
  title: string
  objective?: string
  tableHeaders?: string[]
  tableRows?: string[][]
  scoreCutoffText?: string
  interpretationText?: string
}

export interface ReportQuestionAnswer {
  id: string
  num: number
  title: string
  answer: string
}

export interface ReportClinicalData {
  selectedInstruments: string[]
  familyQuestions?: ReportQuestionAnswer[]
  schoolQuestions?: ReportQuestionAnswer[]
  schoolObserver?: {
    name?: string
    role?: string
    date?: string
  }
  schoolTraits?: Record<string, boolean>
  anamnese?: ReportAnamneseData
  schoolInterview?: ReportSchoolInterviewData
  tests: ReportTestResult[]
  clinicalObservation: string
  sessionsCount?: number
  synthesis: string
  diagnosticHypothesis: string
  dsm5Criteria?: string[]
  finalConsiderations: string
  referrals: string[]
  recommendationsFamily: string[]
  recommendationsSchool: string[]
  dateCityFormatted?: string
}

export interface CompleteReportData {
  patient: ReportPatientData
  professional: ReportProfessionalData
  clinical: ReportClinicalData
}

function createP(
  text: string,
  options?: {
    bold?: boolean
    italic?: boolean
    size?: number
    color?: string
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    spacingAfter?: number
    spacingBefore?: number
  }
) {
  return new Paragraph({
    alignment: options?.align || AlignmentType.LEFT,
    spacing: { before: options?.spacingBefore ?? 0, after: options?.spacingAfter ?? 120, line: 260 },
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: options?.size || 22,
        bold: options?.bold || false,
        italics: options?.italic || false,
        color: options?.color || "222222",
      }),
    ],
  })
}

function createLabeledP(
  label: string,
  value: string,
  options?: { labelColor?: string; valueColor?: string; boldLabel?: boolean }
) {
  return new Paragraph({
    spacing: { after: 100, line: 240 },
    children: [
      new TextRun({
        text: label + " ",
        font: "Arial",
        size: 22,
        bold: options?.boldLabel !== false,
        color: options?.labelColor || "004080",
      }),
      new TextRun({
        text: value,
        font: "Arial",
        size: 22,
        color: options?.valueColor || "222222",
      }),
    ],
  })
}

function createSectionHeader(title: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 460, after: 140 },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        font: "Arial",
        size: 24,
        bold: true,
        color: "005B94",
      }),
    ],
  })
}

function createSubHeader(title: string, options?: { extraBefore?: boolean }) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: options?.extraBefore ? 360 : 260, after: 90 },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        font: "Arial",
        size: 22,
        bold: true,
        color: "111827",
      }),
    ],
  })
}

async function getLogoBuffer(logoUrlOrBase64?: string): Promise<Uint8Array | null> {
  let source = logoUrlOrBase64
  if (!source && typeof window !== "undefined") {
    source =
      localStorage.getItem("evoluia_clinic_logo") ||
      localStorage.getItem("clinic_logo") ||
      localStorage.getItem("clinicLogo") ||
      ""
  }
  if (!source) return null

  try {
    if (source.startsWith("data:")) {
      const base64Data = source.split(",")[1]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    } else if (source.startsWith("http") || source.startsWith("/")) {
      const response = await fetch(source)
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    }
  } catch (err) {
    console.warn("Não foi possível carregar o buffer da logo para o Word:", err)
  }
  return null
}

export async function buildClinicalDocxReport(data: CompleteReportData): Promise<Document> {
  const clinicTitle = (data.professional.clinicName || "ESPAÇO MULTIDISCIPLINAR APRENDER ENSINANDO").toUpperCase()
  const profTitle = `PSICOPEDAGOGA ${data.professional.professionalName.toUpperCase()} ${
    data.professional.cboOrCrp ? `CBO ${data.professional.cboOrCrp}` : "CBO 2394-25"
  }`.trim()

  const logoBuffer = await getLogoBuffer(data.professional.clinicLogoUrl)

  // 1. Tabela do Cabeçalho Estilizado (Faixa Azul com Logo e Dados da Clínica)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      // Linha Principal Azul com a Logo e o Texto da Clínica
      new TableRow({
        children: [
          // Coluna da Logo (Esquerda)
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "005B94" },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: logoBuffer
                  ? [
                      new ImageRun({
                        data: logoBuffer,
                        transformation: { width: 56, height: 56 },
                        type: "png",
                      }),
                    ]
                  : [
                      new TextRun({
                        text: "🏢",
                        font: "Arial",
                        size: 24,
                        color: "FFFFFF",
                      }),
                    ],
              }),
            ],
          }),
          // Coluna dos Textos da Clínica e Profissional (Direita)
          new TableCell({
            width: { size: 80, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "005B94" },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 30 },
                children: [
                  new TextRun({
                    text: clinicTitle,
                    font: "Arial",
                    size: 21,
                    bold: true,
                    color: "FFFFFF",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({
                    text: profTitle,
                    font: "Arial",
                    size: 18,
                    bold: true,
                    color: "E0F2FE",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Faixa Decorativa Azul Clara Inferior
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.CLEAR, fill: "BAE6FD" },
            children: [
              new Paragraph({
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: "", font: "Arial", size: 4 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
            color: "222222",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              headerTable,
              new Paragraph({ spacing: { after: 140 } }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 40 },
                children: [
                  new TextRun({
                    text: `${data.professional.clinicName || "Aprender Ensinando"} · ${data.professional.address || "Atendimento Psicopedagógico Especializado"} · ${data.professional.phone || ""}`.trim(),
                    font: "Arial",
                    size: 16,
                    color: "6B7C83",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Página ",
                    font: "Arial",
                    size: 16,
                    color: "888888",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Arial",
                    size: 16,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // 1. TÍTULO PRINCIPAL E CABEÇALHO DO LAUDO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: "LAUDO DE AVALIAÇÃO PSICOPEDAGÓGICA",
                font: "Arial",
                size: 26,
                bold: true,
                color: "005B94",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "Documento Clínico Oficial · Padrão CBO 2394-25 · Diagnóstico e Intervenção",
                font: "Arial",
                size: 18,
                italics: true,
                color: "6B7C83",
              }),
            ],
          }),

          // 2. QUADRO DE IDENTIFICAÇÃO DO PACIENTE (TABELA FORMATADA)
          createSectionHeader("1. Identificação do Paciente"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "A0BDC6" },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "A0BDC6" },
              left: { style: BorderStyle.SINGLE, size: 6, color: "A0BDC6" },
              right: { style: BorderStyle.SINGLE, size: 6, color: "A0BDC6" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F8FAFB" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({ text: "NOME DO PACIENTE: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({ text: data.patient.fullName, font: "Arial", size: 22, bold: true, color: "111827" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({ text: "DATA DE NASCIMENTO: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({ text: `${data.patient.birthDate || "Não informada"}     `, font: "Arial", size: 20 }),
                          new TextRun({ text: "IDADE CRONOLÓGICA: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({ text: data.patient.ageFormatted || "Não informada", font: "Arial", size: 20, bold: true, color: "111827" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F8FAFB" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({ text: "FILIAÇÃO: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({
                            text: `Pai: ${data.patient.fatherName || "Não informado"} | Mãe: ${data.patient.motherName || "Não informada"}`,
                            font: "Arial",
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 40 },
                        children: [
                          new TextRun({ text: "ESCOLA: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({ text: `${data.patient.schoolName || "Não informada"}`, font: "Arial", size: 20, bold: true }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 60 },
                        children: [
                          new TextRun({ text: "SÉRIE: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({ text: `${data.patient.grade || "Não informada"}          `, font: "Arial", size: 20 }),
                          new TextRun({ text: "SESSÕES REALIZADAS: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({ text: `${data.clinical.sessionsCount || 1} sessões clínicas`, font: "Arial", size: 20, bold: true, color: "7C3AED" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F8FAFB" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({ text: "QUEIXA PRINCIPAL / MOTIVO: ", font: "Arial", size: 20, bold: true, color: "005B94" }),
                          new TextRun({
                            text: `"${data.patient.mainComplaint || "Dificuldades de aprendizagem e atenção relatadas pela família/escola."}"`,
                            font: "Arial",
                            size: 20,
                            italics: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 160 } }),

          // 2. INSTRUMENTOS DIAGNÓSTICOS UTILIZADOS
          createSectionHeader("2. Instrumentos Avaliativos Utilizados"),
          ...data.clinical.selectedInstruments.map((inst) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: "✓ ",
                  font: "Arial",
                  size: 22,
                  bold: true,
                  color: "005B94",
                }),
                new TextRun({
                  text: inst,
                  font: "Arial",
                  size: 20,
                  bold: true,
                  color: "1F2937",
                }),
              ],
            })
          ),

          new Paragraph({
            spacing: { before: 120, after: 200 },
            children: [
              new TextRun({
                text: "* Toda a avaliação teve como base: ciência, estatísticas, informações da família e escola, testes, escalas e questionários quantitativos e qualitativos e DSM-5-TR como instrumento norteador para a hipótese diagnóstica.",
                font: "Arial",
                size: 18,
                italics: true,
                color: "6B7C83",
              }),
            ],
          }),

          // 3. ANAMNESE (8 EIXOS CLÍNICOS NOBRES)
          createSectionHeader("3. Anamnese"),

          ...(() => {
            const axes = [
              { title: "Família & Dinâmica Familiar", text: data.clinical.anamnese?.family },
              { title: "Concepção, Gestação e Parto", text: data.clinical.anamnese?.conceptionAndPregnancy },
              { title: "Amamentação e Alimentação", text: data.clinical.anamnese?.breastfeedingAndDiet },
              { title: "Desenvolvimento Psicomotor e Linguagem", text: data.clinical.anamnese?.psychomotorAndLanguage },
              { title: "Padrão de Sono", text: data.clinical.anamnese?.sleep },
              { title: "Histórico de Saúde ou Transtornos na Família", text: data.clinical.anamnese?.familyHealthHistory },
              { title: "Escolaridade & Histórico Escolar", text: data.clinical.anamnese?.schooling },
              { title: "Sociabilidade & Relações Interpessoais", text: data.clinical.anamnese?.relationshipsAndSociability },
            ].filter((ax) => ax.text && ax.text.trim().length > 0)

            if (axes.length > 0) {
              return axes.flatMap((ax) => [
                createSubHeader(ax.title),
                createP(ax.text!.trim()),
              ])
            }

            // Se nenhum dos 8 eixos temáticos foi preenchido, verifica se há perguntas da família respondidas
            const filledQuestions = data.clinical.familyQuestions?.filter((q) => q.answer && q.answer.trim().length > 0) || []
            if (filledQuestions.length > 0) {
              return filledQuestions.flatMap((q) => [
                createSubHeader(`${q.num}. ${q.title}`),
                createP(`"${q.answer.trim()}"`, { italic: true }),
              ])
            }

            return [
              createP("Informações de anamnese não registradas ou a serem complementadas pela profissional.", { italic: true }),
            ]
          })(),

          // 4. ENTREVISTA ESCOLAR
          createSectionHeader("4. Entrevista / Visita Escolar"),

          ...(data.clinical.schoolObserver?.name
            ? [
                createLabeledP(
                  "PROFISSIONAL / OBSERVADOR:",
                  `${data.clinical.schoolObserver.name} (${data.clinical.schoolObserver.role || "Professora"})`
                ),
                createLabeledP("DATA DO RELATO ESCOLAR:", data.clinical.schoolObserver.date || "Conforme registro"),
                new Paragraph({ spacing: { after: 120 } }),
              ]
            : []),

          ...(() => {
            const filledSchoolQuestions = data.clinical.schoolQuestions?.filter((q) => q.answer && q.answer.trim().length > 0) || []
            if (filledSchoolQuestions.length > 0) {
              return filledSchoolQuestions.flatMap((q) => [
                createSubHeader(`${q.num}. ${q.title}`),
                createP(`"${q.answer.trim()}"`, { italic: true }),
              ])
            }

            return [
              createP("Informações de relato escolar não registradas ou a serem complementadas pela equipe pedagógica.", { italic: true }),
            ]
          })(),

          createSubHeader("Características Comportamentais Observadas pela Escola:"),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              { key: "agressivo", label: "agressivo", nl: false },
              { key: "passivo", label: "passivo", nl: false },
              { key: "dependente", label: "dependente", nl: false },
              { key: "medroso", label: "medroso", nl: true },
              { key: "retraido", label: "retraído", nl: false },
              { key: "melancolico", label: "melancólico", nl: false },
              { key: "calmo", label: "calmo", nl: false },
              { key: "desligado", label: "desligado", nl: false },
              { key: "sem_limites", label: "sem limites", nl: true },
              { key: "agitado", label: "agitado", nl: false },
              { key: "depressivo", label: "depressivo", nl: false },
              { key: "ressentido", label: "ressentido", nl: false },
            ].map((t) => {
              const isChecked = Boolean(
                data.clinical.schoolTraits?.[t.key] ||
                (data.clinical.schoolInterview?.traits as any)?.[t.key]
              )
              return new TextRun({
                text: `${isChecked ? "(X)" : "( )"} ${t.label}${t.nl ? "\n" : "   "}`,
                font: "Arial",
                size: 22,
                bold: isChecked,
                color: isChecked ? "005B94" : "555555",
              })
            }),
          }),

          // 6. RESULTADOS DETALHADOS DE CADA INSTRUMENTO/TESTE
          createSectionHeader("5. Resultados dos Testes e Instrumentos Avaliativos"),

          ...data.clinical.tests.flatMap((test) => {
            const elements: (Paragraph | Table)[] = [
              createSubHeader(test.title),
              createP(test.objective || "Instrumento padronizado aplicado para sondagem das habilidades e funções cognitivas."),
            ]

            if (test.tableHeaders && test.tableRows && test.tableRows.length > 0) {
              const tableHeaderRow = new TableRow({
                children: test.tableHeaders.map(
                  (th) =>
                    new TableCell({
                      width: { size: Math.floor(100 / test.tableHeaders!.length), type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.CLEAR, fill: "E6F0FA" },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: th, font: "Arial", size: 20, bold: true, color: "005B94" })],
                        }),
                      ],
                    })
                ),
              })

              const tableBodyRows = test.tableRows.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (cellVal) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.LEFT,
                              children: [new TextRun({ text: cellVal, font: "Arial", size: 20 })],
                            }),
                          ],
                        })
                    ),
                  })
              )

              elements.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [tableHeaderRow, ...tableBodyRows],
                })
              )
              elements.push(new Paragraph({ spacing: { after: 100 } }))
            }

            if (test.scoreCutoffText) {
              elements.push(createP(test.scoreCutoffText, { bold: true, color: "005B94", spacingAfter: 120 }))
            }

            if (test.interpretationText) {
              elements.push(createP(test.interpretationText, { spacingAfter: 240 }))
            }

            return elements
          }),

          // 7. OBSERVAÇÃO CLÍNICA
          createSectionHeader("6. Observação Clínica nas Sessões"),
          createP(
            data.clinical.clinicalObservation ||
              "Durante as sessões avaliativas, o paciente demonstrou receptividade às propostas lúdicas e vínculo positivo com a profissional. Observou-se variação no tempo de sustentação atencional conforme o nível de exigência da tarefa."
          ),

          // 8. SÍNTESE DA AVALIAÇÃO PSICOPEDAGÓGICA
          createSectionHeader("7. Síntese da Avaliação Psicopedagógica"),
          createP(
            data.clinical.synthesis ||
              `A presente avaliação psicopedagógica foi realizada ao longo de ${
                data.clinical.sessionsCount || 10
              } sessões, contemplando a aplicação de testes e instrumentos avaliativos, bem como entrevistas com o paciente, familiares e escola. A integração dessas informações possibilitou uma compreensão abrangente do funcionamento cognitivo, comportamental, emocional e acadêmico do paciente.`
          ),

          // 9. HIPÓTESE DIAGNÓSTICA
          createSectionHeader("8. Hipótese Diagnóstica (DSM-5-TR)"),
          createP(
            data.clinical.diagnosticHypothesis ||
              "Os dados obtidos ao longo da avaliação psicopedagógica apontam para um perfil cognitivo compatível com dificuldades nas funções executivas e sustentação atencional, necessitando de acompanhamento contínuo e intervenção estruturada."
          ),

          ...(data.clinical.dsm5Criteria && data.clinical.dsm5Criteria.length > 0
            ? [
                createSubHeader("Critérios Identificados (DSM-5-TR):"),
                ...data.clinical.dsm5Criteria.map((crit, idx) =>
                  new Paragraph({
                    spacing: { after: 80 },
                    children: [
                      new TextRun({
                        text: `${String.fromCharCode(97 + idx)}) `,
                        font: "Arial",
                        size: 22,
                        bold: true,
                        color: "005B94",
                      }),
                      new TextRun({ text: crit, font: "Arial", size: 22 }),
                    ],
                  })
                ),
              ]
            : []),

          // 10. ENCAMINHAMENTOS E ORIENTAÇÕES
          createSectionHeader("9. Encaminhamentos & Orientações Pedagógicas"),

          createSubHeader("Encaminhamentos Profissionais Recomendados:"),
          ...data.clinical.referrals.map((ref) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: "✓ ", font: "Arial", size: 22, bold: true, color: "005B94" }),
                new TextRun({ text: ref, font: "Arial", size: 22 }),
              ],
            })
          ),

          // 12. RECOMENDAÇÕES PARA FAMÍLIA E ESCOLA
          createSectionHeader("Recomendações para Família e Escola"),

          createSubHeader("Para os Pais:"),
          ...data.clinical.recommendationsFamily.map((rec) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: "• ", font: "Arial", size: 22, bold: true, color: "005B94" }),
                new TextRun({ text: rec, font: "Arial", size: 22 }),
              ],
            })
          ),

          createSubHeader("Para a Escola:", { extraBefore: true }),
          ...data.clinical.recommendationsSchool.map((rec) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: "• ", font: "Arial", size: 22, bold: true, color: "005B94" }),
                new TextRun({ text: rec, font: "Arial", size: 22 }),
              ],
            })
          ),

          new Paragraph({
            spacing: { before: 200, after: 160 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '"Juntos, somos uma força! A paciência, a compreensão e o apoio são as nossas ferramentas para construir um futuro brilhante."',
                font: "Arial",
                size: 20,
                italics: true,
                bold: true,
                color: "005B94",
              }),
            ],
          }),

          // 13. DATA, LOCAL E ASSINATURA
          new Paragraph({
            spacing: { before: 100, after: 160 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text:
                  data.clinical.dateCityFormatted ||
                  `${data.professional.city || "Votuporanga"} - ${data.professional.state || "SP"}, ${new Date().toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}.`,
                font: "Arial",
                size: 20,
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 20 },
            children: [
              new TextRun({
                text: "____________________________________________________",
                font: "Arial",
                size: 20,
                color: "888888",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [
              new TextRun({
                text: `Psicopedagoga ${data.professional.professionalName}`,
                font: "Arial",
                size: 22,
                bold: true,
                color: "111827",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: data.professional.cboOrCrp
                  ? `CBO - ${data.professional.cboOrCrp}`
                  : "Psicopedagoga Clínica",
                font: "Arial",
                size: 18,
                bold: true,
                color: "555555",
              }),
            ],
          }),
        ],
      },
    ],
  })

  return doc
}

export async function downloadDocxReport(doc: Document, filename: string) {
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".docx") ? filename : `${filename}.docx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
