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
  }
) {
  return new Paragraph({
    alignment: options?.align || AlignmentType.LEFT,
    spacing: { after: options?.spacingAfter ?? 140, line: 276 },
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
    spacing: { after: 120, line: 260 },
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
    spacing: { before: 280, after: 140 },
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

function createSubHeader(title: string) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 180, after: 80 },
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

export function buildClinicalDocxReport(data: CompleteReportData): Document {
  const clinicTitle = (data.professional.clinicName || "ESPAÇO MULTIDISCIPLINAR").toUpperCase()
  const profTitle = `PSICOPEDAGOGA ${data.professional.professionalName.toUpperCase()} ${
    data.professional.cboOrCrp ? `CBO ${data.professional.cboOrCrp}` : ""
  }`.trim()

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
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: clinicTitle,
                    font: "Arial",
                    size: 20,
                    bold: true,
                    color: "005B94",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: profTitle,
                    font: "Arial",
                    size: 18,
                    bold: true,
                    color: "555555",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Página ",
                    font: "Arial",
                    size: 18,
                    color: "888888",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Arial",
                    size: 18,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // 1. TÍTULO PRINCIPAL
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: "AVALIAÇÃO PSICOPEDAGÓGICA",
                font: "Arial",
                size: 28,
                bold: true,
                color: "005B94",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: clinicTitle,
                font: "Arial",
                size: 20,
                bold: true,
                color: "005B94",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: profTitle,
                font: "Arial",
                size: 18,
                bold: true,
                color: "005B94",
              }),
            ],
          }),

          // 2. QUADRO DE IDENTIFICAÇÃO DO PACIENTE
          createLabeledP("PACIENTE:", data.patient.fullName, { boldLabel: true }),
          new Paragraph({
            spacing: { after: 120, line: 260 },
            children: [
              new TextRun({ text: "DATA DE NASCIMENTO: ", font: "Arial", size: 22, bold: true, color: "004080" }),
              new TextRun({ text: `${data.patient.birthDate || "Não informada"}    `, font: "Arial", size: 22 }),
              new TextRun({ text: "IDADE: ", font: "Arial", size: 22, bold: true, color: "004080" }),
              new TextRun({ text: data.patient.ageFormatted || "Não informada", font: "Arial", size: 22 }),
            ],
          }),
          createLabeledP(
            "FILIAÇÃO:",
            `${data.patient.fatherName || ""}${
              data.patient.fatherName && data.patient.motherName ? " e " : ""
            }${data.patient.motherName || ""}`.trim() || "Não informada"
          ),
          createLabeledP(
            "ESCOLA:",
            `${data.patient.schoolName || "Não informada"} - SÉRIE: ${data.patient.grade || "Não informada"}`
          ),
          createLabeledP(
            "QUEIXA:",
            data.patient.mainComplaint || "Dificuldades de aprendizagem e atenção relatadas pela família/escola."
          ),
          createLabeledP("DIAGNÓSTICO ANTERIOR:", data.patient.previousDiagnosis || "Nenhum"),

          new Paragraph({ spacing: { after: 200 } }),

          // 3. INSTRUMENTOS DIAGNÓSTICOS UTILIZADOS
          createSectionHeader("Instrumentos diagnósticos utilizados pela Psicopedagoga:"),
          ...data.clinical.selectedInstruments.map((inst, index) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: `${index + 1}. `,
                  font: "Arial",
                  size: 22,
                  bold: true,
                  color: "005B94",
                }),
                new TextRun({
                  text: inst,
                  font: "Arial",
                  size: 22,
                  color: "222222",
                }),
              ],
            })
          ),

          new Paragraph({
            spacing: { before: 200, after: 300 },
            children: [
              new TextRun({
                text: "Toda a avaliação teve como base: ciência, estatísticas, informações da família e escola, testes, escalas e questionários quantitativos e qualitativos e DSM-5-TR como instrumento norteador para a hipótese diagnóstica.",
                font: "Arial",
                size: 20,
                italics: true,
                color: "444444",
              }),
            ],
          }),

          // 4. ANAMNESE
          createSectionHeader("Anamnese / Entrevista Inicial com a Família"),

          ...(data.clinical.familyQuestions && data.clinical.familyQuestions.length > 0
            ? data.clinical.familyQuestions.flatMap((q) => [
                createSubHeader(`${q.num}. ${q.title}`),
                createP(
                  q.answer && q.answer.trim()
                    ? `"${q.answer.trim()}"`
                    : "Informação não relatada ou não aplicável durante a entrevista.",
                  { italic: Boolean(q.answer && q.answer.trim()) }
                ),
              ])
            : [
                createSubHeader("Família"),
                createP(
                  data.clinical.anamnese?.family ||
                    "Constituição familiar e dinâmica relacional investigadas durante a entrevista inicial com os responsáveis."
                ),
                createSubHeader("Concepção e Gestação"),
                createP(
                  data.clinical.anamnese?.conceptionAndPregnancy ||
                    "Gestação, histórico pré-natal, condições de parto e primeiras semanas de vida sem intercorrências graves registradas."
                ),
                createSubHeader("Amamentação e Alimentação"),
                createP(
                  data.clinical.anamnese?.breastfeedingAndDiet ||
                    "Histórico alimentar, aleitamento materno e transição para sólidos desenvolvidos conforme esperado."
                ),
                createSubHeader("Desenvolvimento Psicomotor e Linguagem"),
                createP(
                  data.clinical.anamnese?.psychomotorAndLanguage ||
                    "Marcos motores (marcha, sustentação) e aquisição da linguagem oral relatados pela família."
                ),
                createSubHeader("Sono"),
                createP(
                  data.clinical.anamnese?.sleep ||
                    "Padrão de sono, rotina de descanso e qualidade do repouso noturno satisfatórios."
                ),
                createSubHeader("Histórico de Saúde ou Transtornos na Família"),
                createP(
                  data.clinical.anamnese?.familyHealthHistory ||
                    "Histórico de saúde geral do paciente e antecedentes familiares de transtornos do neurodesenvolvimento ou dificuldades escolares."
                ),
                createSubHeader("Escolaridade"),
                createP(
                  data.clinical.anamnese?.schooling ||
                    "Início da trajetória escolar, adaptação na educação infantil e momento em que as principais dificuldades foram percebidas."
                ),
                createSubHeader("Relacionamentos e Sociabilidade"),
                createP(
                  data.clinical.anamnese?.relationshipsAndSociability ||
                    "Comportamento social, interação com pares, afetividade e relacionamento familiar."
                ),
              ]),

          // 5. ENTREVISTA ESCOLAR
          createSectionHeader("Entrevista / Visita Escolar"),

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

          ...(data.clinical.schoolQuestions && data.clinical.schoolQuestions.length > 0
            ? data.clinical.schoolQuestions.flatMap((q) => [
                createSubHeader(`${q.num}. ${q.title}`),
                createP(
                  q.answer && q.answer.trim()
                    ? `"${q.answer.trim()}"`
                    : "Informação não observada ou não registrada pela equipe pedagógica.",
                  { italic: true }
                ),
              ])
            : [
                createSubHeader("Seu Desenvolvimento?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.development ||
                    "O aluno participa das atividades propostas com apoio e mediação pedagógica."
                  }"`,
                  { italic: true }
                ),
                createSubHeader("Quanto ao Comportamento?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.behavior ||
                    "Bom relacionamento com professores e colegas em sala de aula."
                  }"`,
                  { italic: true }
                ),
                createSubHeader("Suas Principais Dificuldades?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.mainDifficulties ||
                    "Dificuldades observadas na fixação de conteúdos, leitura e sustentação da atenção."
                  }"`,
                  { italic: true }
                ),
                createSubHeader("Quanto à Aprendizagem e Assimilação de Conteúdo?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.learningAndAssimilation ||
                    "Apresenta necessidade de repetição das instruções e mediação para conclusão de tarefas."
                  }"`,
                  { italic: true }
                ),
                createSubHeader("Realiza as Tarefas de Casa?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.homework || "Realiza com auxílio e cobrança dos responsáveis."
                  }"`,
                  { italic: true }
                ),
                createSubHeader("Apresenta Dificuldades em Organizar suas Atividades e Tarefas Pessoais?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.organization ||
                    "Necessita de lembretes e suporte para organização dos materiais escolares."
                  }"`,
                  { italic: true }
                ),
                createSubHeader("Como Reage Quando Contrariado?"),
                createP(
                  `"${
                    data.clinical.schoolInterview?.limitsAndFrustration ||
                    "Demonstra insatisfação passageira, necessitando de acolhimento e redirecionamento."
                  }"`,
                  { italic: true }
                ),
              ]),

          createSubHeader("Características Comportamentais Observadas pela Escola:"),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.aggressive ? "(X)" : "( )"} agressivo   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.passive ? "(X)" : "( )"} passivo   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.dependent ? "(X)" : "( )"} dependente   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.fearful ? "(X)" : "( )"} medroso\n`,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.withdrawn ? "(X)" : "( )"} retraído   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.melancholic ? "(X)" : "( )"} melancólico   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.calm ? "(X)" : "( )"} calmo   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.unfocused ? "(X)" : "( )"} desligado   `,
                font: "Arial",
                size: 22,
                bold: Boolean(data.clinical.schoolInterview.traits?.unfocused),
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.boundaryless ? "(X)" : "( )"} sem limites\n`,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.restless ? "(X)" : "( )"} agitado   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.depressive ? "(X)" : "( )"} depressivo   `,
                font: "Arial",
                size: 22,
              }),
              new TextRun({
                text: `${data.clinical.schoolInterview.traits?.resentful ? "(X)" : "( )"} ressentido`,
                font: "Arial",
                size: 22,
              }),
            ],
          }),

          // 6. RESULTADOS DETALHADOS DE CADA INSTRUMENTO/TESTE
          createSectionHeader("Resultados dos Testes e Instrumentos Avaliativos"),

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
            }

            if (test.scoreCutoffText) {
              elements.push(createP(test.scoreCutoffText, { bold: true, color: "005B94" }))
            }

            if (test.interpretationText) {
              elements.push(createP(test.interpretationText))
            }

            return elements
          }),

          // 7. OBSERVAÇÃO CLÍNICA
          createSectionHeader("Observação Clínica"),
          createP(
            data.clinical.clinicalObservation ||
              "Durante as sessões avaliativas, o paciente demonstrou receptividade às propostas lúdicas e vínculo positivo com a profissional. Observou-se variação no tempo de sustentação atencional conforme o nível de exigência da tarefa."
          ),

          // 8. SÍNTESE DA AVALIAÇÃO PSICOPEDAGÓGICA
          createSectionHeader("Síntese da Avaliação Psicopedagógica"),
          createP(
            data.clinical.synthesis ||
              `A presente avaliação psicopedagógica foi realizada ao longo de ${
                data.clinical.sessionsCount || 10
              } sessões, contemplando a aplicação de testes e instrumentos avaliativos, bem como entrevistas com o paciente, familiares e escola. A integração dessas informações possibilitou uma compreensão abrangente do funcionamento cognitivo, comportamental, emocional e acadêmico do paciente.`
          ),

          // 9. HIPÓTESE DIAGNÓSTICA
          createSectionHeader("Hipótese Diagnóstica (DSM-5-TR)"),
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

          // 10. CONSIDERAÇÕES FINAIS & CLÁUSULAS LEGAIS
          createSectionHeader("Considerações Finais"),
          createP(
            data.clinical.finalConsiderations ||
              "Diante dos dados obtidos, recomenda-se a continuidade do acompanhamento psicopedagógico clínico para fortalecimento das habilidades em defasagem e desenvolvimento de estratégias compensatórias de aprendizagem."
          ),

          new Paragraph({
            spacing: { before: 180, after: 140 },
            children: [
              new TextRun({
                text: "Este parecer tem a validade de 6 meses a contar com a data de hoje. Destaco também que este documento não poderá ser utilizado para fins diferentes do apontado na identificação do documento (relatório de devolutiva e encaminhamento de paciente), o mesmo possui caráter sigiloso e extrajudicial. Não me responsabilizo pelo uso de dados deste relatório por parte da pessoa, grupo ou instituição após a sua entrega em entrevista devolutiva.",
                font: "Arial",
                size: 20,
                bold: true,
                color: "444444",
              }),
            ],
          }),

          // 11. ENCAMINHAMENTOS
          createSectionHeader("Encaminhamentos:"),
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

          createSubHeader("Para a Escola:"),
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
            spacing: { before: 240, after: 300 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '"Juntos, somos uma força! A paciência, a compreensão e o apoio são as nossas ferramentas para construir um futuro brilhante."',
                font: "Arial",
                size: 22,
                italics: true,
                bold: true,
                color: "005B94",
              }),
            ],
          }),

          // 13. DATA, LOCAL E ASSINATURA
          new Paragraph({
            spacing: { before: 200, after: 300 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text:
                  data.clinical.dateCityFormatted ||
                  `${data.professional.city || "Votuporanga"}, ${new Date().toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}.`,
                font: "Arial",
                size: 22,
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 40 },
            children: [
              new TextRun({
                text: "____________________________________________________",
                font: "Arial",
                size: 22,
                color: "888888",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
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
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: data.professional.cboOrCrp
                  ? `CBO - ${data.professional.cboOrCrp}`
                  : "Psicopedagoga Clínica",
                font: "Arial",
                size: 20,
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
