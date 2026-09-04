/**
 * GERADOR DE RELATÓRIO DE REAVALIAÇÃO PSICOPEDAGÓGICA (PÓS-INTERVENÇÃO) EM WORD (.DOCX)
 * Baseado no modelo oficial de 11 páginas do Espaço Multidisciplinar Aprender Ensinando
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
  ShadingType,
  BorderStyle,
  VerticalAlign,
} from "docx"

export type RatingLevel = "bom" | "regular" | "abaixo"

export interface PredictorItem {
  item: string
  total: number
  hits: number
  rating: RatingLevel
  note?: string
}

export interface InterventionReportData {
  patient: {
    fullName: string
    birthDate?: string
    ageFormatted?: string
    motherName?: string
    fatherName?: string
    schoolName?: string
    grade?: string
    previousDiagnosis?: string
    interventionPeriod?: string // Ex: "06 MESES DE 03/2026 A 08/2026"
  }
  professional: {
    clinicName?: string
    professionalName: string
    cbo?: string
    phone?: string
    address?: string
    email?: string
    city?: string
    date?: string // Ex: "02 de setembro de 2026"
    logoUrlOrBase64?: string
  }
  clinical: {
    reassessmentReason: string
    briefHistory: string
    usedInstruments: string[]
    trilhas?: {
      rawA: string | number
      rawB: string | number
      percentilA: string | number
      percentilB: string | number
      classA: string
      classB: string
      observation: string
    }
    spanDigitos?: {
      directScore: string | number
      directPercentil: string | number
      directClass: string
      inverseScore: string | number
      inversePercentil: string | number
      inverseClass: string
      observation: string
    }
    tin?: {
      score: string | number
      percentil: string | number
      classification: string
      observation: string
    }
    phonologicalDiscrimination?: {
      score: string | number
      classification: string
      observation: string
    }
    audibilizacao?: {
      part1Score: string | number
      part1Class: string
      part2Score: string | number
      part2Class: string
      figuresScore: string | number
      figuresClass: string
      totalScore: string | number
      totalClass: string
      observation: string
    }
    popTT?: {
      cenestesica?: string
      lateralidade?: string
      proprioceptiva?: string
      imitacaoGestos?: string
      tracosAr?: string
      praxiaGlobal?: string
      praxiaFina?: string
      coordenacaoTesoura?: string
      observation: string
    }
    arithmetic?: {
      points: string | number
      score: string | number
      classification: string
      observation: string
    }
    readingWritingPredictors: {
      alphabet: PredictorItem[]
      phonologicalAwareness: PredictorItem[]
      reading: PredictorItem[]
      writing: PredictorItem[]
    }
    clinicalConclusion: string
    recommendationsSchool: string
    recommendationsFamily: string
  }
}

// ---------------------------------------------------------------------------
// Helpers de Parágrafos e Formatação
// ---------------------------------------------------------------------------

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
    lineSpacing?: number
  }
) {
  return new Paragraph({
    alignment: options?.align || AlignmentType.LEFT,
    spacing: {
      before: options?.spacingBefore ?? 0,
      after: options?.spacingAfter ?? 120,
      line: options?.lineSpacing ?? 260,
    },
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
    spacing: { after: 80, line: 240 },
    children: [
      new TextRun({
        text: label + " ",
        font: "Arial",
        size: 21,
        bold: options?.boldLabel !== false,
        color: options?.labelColor || "004080",
      }),
      new TextRun({
        text: value || "—",
        font: "Arial",
        size: 21,
        color: options?.valueColor || "222222",
      }),
    ],
  })
}

function createSectionHeader(title: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 380, after: 140 },
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
    spacing: { before: 260, after: 100 },
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

// ---------------------------------------------------------------------------
// Box de Identificação do Paciente (Página 1)
// ---------------------------------------------------------------------------

function createPatientIdTable(p: InterventionReportData["patient"]) {
  const border = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: "004080",
  }

  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
  }

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: { fill: "F8FAFC", type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [
            createLabeledP("PACIENTE:", p.fullName.toUpperCase(), { boldLabel: true }),
            new Paragraph({
              spacing: { after: 80, line: 240 },
              children: [
                new TextRun({ text: "DATA DE NASCIMENTO: ", font: "Arial", size: 21, bold: true, color: "004080" }),
                new TextRun({ text: `${p.birthDate || "—"}       `, font: "Arial", size: 21, color: "222222" }),
                new TextRun({ text: "IDADE: ", font: "Arial", size: 21, bold: true, color: "004080" }),
                new TextRun({ text: p.ageFormatted || "—", font: "Arial", size: 21, bold: true, color: "005B94" }),
              ],
            }),
            createLabeledP("FILIAÇÃO:", [p.motherName, p.fatherName].filter(Boolean).join(" / ") || "—"),
            new Paragraph({
              spacing: { after: 80, line: 240 },
              children: [
                new TextRun({ text: "ESCOLA: ", font: "Arial", size: 21, bold: true, color: "004080" }),
                new TextRun({ text: `“${p.schoolName || "—"}”       `, font: "Arial", size: 21, color: "222222" }),
                new TextRun({ text: "SÉRIE: ", font: "Arial", size: 21, bold: true, color: "004080" }),
                new TextRun({ text: p.grade || "—", font: "Arial", size: 21, color: "222222" }),
              ],
            }),
            createLabeledP("DIAGNÓSTICO ANTERIOR:", p.previousDiagnosis || "TRANSTORNO DE ATENÇÃO E HIPERATIVIDADE (TDAH)", {
              valueColor: "C0392B",
            }),
            createLabeledP("PERÍODO DE INTERVENÇÃO REALIZADO:", p.interventionPeriod || "06 MESES", {
              valueColor: "005B94",
            }),
          ],
        }),
      ],
    }),
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

// ---------------------------------------------------------------------------
// Tabela Padrão de Interpretação / Escore (Seabra / Capovilla)
// ---------------------------------------------------------------------------

function createCutoffTable() {
  const border = { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" }
  const borders = { top: border, bottom: border, left: border, right: border }

  const cutoffs = [
    { range: "Pontuação-padrão < 70", label: "Muito baixa" },
    { range: "Pontuação-padrão entre 70 e 84", label: "Baixa" },
    { range: "Pontuação-padrão entre 85 e 114", label: "Média" },
    { range: "Pontuação-padrão entre 115 e 129", label: "Alta" },
    { range: "Pontuação-padrão igual ou maior 130", label: "Muito Alta" },
  ]

  return new Table({
    width: { size: 70, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: cutoffs.map(
      (c) =>
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 60, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [createP(c.range, { size: 18, color: "444444" })],
            }),
            new TableCell({
              borders,
              width: { size: 40, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [createP(c.label, { size: 18, bold: true, color: "111827" })],
            }),
          ],
        })
    ),
  })
}

// ---------------------------------------------------------------------------
// Tabela de Trilhas A/B
// ---------------------------------------------------------------------------

function createTrilhasTable(t: NonNullable<InterventionReportData["clinical"]["trilhas"]>) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" }
  const borders = { top: border, bottom: border, left: border, right: border }

  const headerCell = (text: string) =>
    new TableCell({
      borders,
      shading: { fill: "CBD5E1", type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      verticalAlign: VerticalAlign.CENTER,
      children: [createP(text, { bold: true, size: 20, align: AlignmentType.CENTER, color: "0F172A" })],
    })

  const bodyCell = (text: string, isClass = false) =>
    new TableCell({
      borders,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        createP(String(text), {
          size: 20,
          bold: isClass,
          align: AlignmentType.CENTER,
          color: isClass ? "DC2626" : "0F172A",
        }),
      ],
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell("Partes"),
          headerCell("Escore Bruto"),
          headerCell("Percentil"),
          headerCell("Classificação"),
        ],
      }),
      new TableRow({
        children: [
          bodyCell("Parte A/B"),
          bodyCell(`A = ${t.rawA}`),
          bodyCell(String(t.percentilA)),
          bodyCell(t.classA, true),
        ],
      }),
      new TableRow({
        children: [
          bodyCell("Parte B"),
          bodyCell(`B = ${t.rawB}`),
          bodyCell(String(t.percentilB)),
          bodyCell(t.classB, true),
        ],
      }),
    ],
  })
}

// ---------------------------------------------------------------------------
// Tabela do Span de Dígitos
// ---------------------------------------------------------------------------

function createSpanTable(s: NonNullable<InterventionReportData["clinical"]["spanDigitos"]>) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" }
  const borders = { top: border, bottom: border, left: border, right: border }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 60, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              createP(`Pontuação padrão ordem direta: ${s.directScore}`, { bold: true, size: 20, color: "005B94" }),
              createP(`Percentil: ${s.directPercentil}`, { size: 19, color: "555555" }),
            ],
          }),
          new TableCell({
            borders,
            width: { size: 40, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              createP(`Classificação: ${s.directClass}`, { bold: true, size: 20, color: "005B94" }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 60, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              createP(`Pontuação padrão ordem indireta: ${s.inverseScore}`, { bold: true, size: 20, color: "005B94" }),
              createP(`Percentil: ${s.inversePercentil}`, { size: 19, color: "555555" }),
            ],
          }),
          new TableCell({
            borders,
            width: { size: 40, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              createP(`Classificação: ${s.inverseClass}`, { bold: true, size: 20, color: "005B94" }),
            ],
          }),
        ],
      }),
    ],
  })
}

// ---------------------------------------------------------------------------
// Tabela de Audibilização
// ---------------------------------------------------------------------------

function createAudibilizacaoTable(a: NonNullable<InterventionReportData["clinical"]["audibilizacao"]>) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" }
  const borders = { top: border, bottom: border, left: border, right: border }

  const headerCell = (text: string) =>
    new TableCell({
      borders,
      shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [createP(text, { bold: true, size: 20, align: AlignmentType.CENTER })],
    })

  const bodyRow = (item: string, pts: string | number, cls: string, isHighlight = false) =>
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [createP(item, { bold: isHighlight, size: 20 })],
        }),
        new TableCell({
          borders,
          width: { size: 20, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [createP(String(pts), { align: AlignmentType.CENTER, bold: isHighlight, size: 20 })],
        }),
        new TableCell({
          borders,
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: isHighlight ? { fill: "DCFCE7", type: ShadingType.CLEAR } : undefined,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            createP(cls, {
              align: AlignmentType.CENTER,
              bold: true,
              size: 20,
              color: isHighlight ? "15803D" : "005B94",
            }),
          ],
        }),
      ],
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell("Habilidade"), headerCell("Pontuação"), headerCell("Classificação")],
      }),
      bodyRow("Parte 1 - Discriminação Fonética", a.part1Score, a.part1Class, true),
      bodyRow("Parte 2 - Memória (frases, dígitos, relatos)", a.part2Score, a.part2Class),
      bodyRow("Memória - Figuras", a.figuresScore, a.figuresClass),
      bodyRow("Total Geral", a.totalScore, a.totalClass, true),
    ],
  })
}

// ---------------------------------------------------------------------------
// Tabela POP-TT (Psicomotricidade)
// ---------------------------------------------------------------------------

function createPopTtTable(p: NonNullable<InterventionReportData["clinical"]["popTT"]>) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" }
  const borders = { top: border, bottom: border, left: border, right: border }

  const items = [
    { label: "Reconhecimento do corpo (observação Cenestésica)", value: p.cenestesica || "Excelente" },
    { label: "Observação lateralidade", value: p.lateralidade || "Excelente" },
    { label: "Observação da imagem proprioceptiva", value: p.proprioceptiva || "Bom" },
    { label: "Imitação de gestos", value: p.imitacaoGestos || "Excelente" },
    { label: "Traços no ar", value: p.tracosAr || "Excelente" },
    { label: "Praxia Global", value: p.praxiaGlobal || "Excelente" },
    { label: "Praxia Fina", value: p.praxiaFina || "Excelente" },
    { label: "Coordenação e preferência manual recorte com tesoura", value: p.coordenacaoTesoura || "Excelente" },
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: items.map(
      (it) =>
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 75, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [createP(`• ${it.label}:`, { size: 20, bold: false })],
            }),
            new TableCell({
              borders,
              width: { size: 25, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                createP(it.value, {
                  size: 20,
                  bold: true,
                  align: AlignmentType.CENTER,
                  color: it.value.toLowerCase().includes("excelente") ? "16A34A" : "2563EB",
                }),
              ],
            }),
          ],
        })
    ),
  })
}

// ---------------------------------------------------------------------------
// O SEMÁFORO DE LEITURA E ESCRITA (A Tabela Mágica de 3 Cores da Priscila!)
// ---------------------------------------------------------------------------

function createPredictorsPerformanceTable(predictors: InterventionReportData["clinical"]["readingWritingPredictors"]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" }
  const borders = { top: border, bottom: border, left: border, right: border }

  const headerRow = new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 52, type: WidthType.PERCENTAGE },
        shading: { fill: "64748B", type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [createP("ITEM", { bold: true, size: 20, color: "FFFFFF" })],
      }),
      new TableCell({
        borders,
        width: { size: 12, type: WidthType.PERCENTAGE },
        shading: { fill: "64748B", type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 60, right: 60 },
        children: [createP("TOTAL", { bold: true, size: 18, color: "FFFFFF", align: AlignmentType.CENTER })],
      }),
      new TableCell({
        borders,
        width: { size: 12, type: WidthType.PERCENTAGE },
        shading: { fill: "64748B", type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 60, right: 60 },
        children: [createP("ACERTOS", { bold: true, size: 18, color: "FFFFFF", align: AlignmentType.CENTER })],
      }),
      new TableCell({
        borders,
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: "EF4444", type: ShadingType.CLEAR }, // Vermelho: ABAIXO
        margins: { top: 100, bottom: 100, left: 40, right: 40 },
        children: [createP("AB", { bold: true, size: 16, color: "FFFFFF", align: AlignmentType.CENTER })],
      }),
      new TableCell({
        borders,
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: "F59E0B", type: ShadingType.CLEAR }, // Amarelo: REGULAR
        margins: { top: 100, bottom: 100, left: 40, right: 40 },
        children: [createP("REG", { bold: true, size: 16, color: "FFFFFF", align: AlignmentType.CENTER })],
      }),
      new TableCell({
        borders,
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { fill: "10B981", type: ShadingType.CLEAR }, // Verde: BOM
        margins: { top: 100, bottom: 100, left: 40, right: 40 },
        children: [createP("BOM", { bold: true, size: 16, color: "FFFFFF", align: AlignmentType.CENTER })],
      }),
    ],
  })

  const sectionDividerRow = (title: string) =>
    new TableRow({
      children: [
        new TableCell({
          borders,
          columnSpan: 6,
          shading: { fill: "E2E8F0", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [createP(title.toUpperCase(), { bold: true, size: 20, color: "0F172A" })],
        }),
      ],
    })

  const itemRow = (it: PredictorItem) => {
    const isAbaixo = it.rating === "abaixo"
    const isRegular = it.rating === "regular"
    const isBom = it.rating === "bom"

    return new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 52, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [
            createP(`- ${it.item}`, { size: 20 }),
            ...(it.note ? [createP(`Obs: ${it.note}`, { size: 17, italic: true, color: "B45309" })] : []),
          ],
        }),
        new TableCell({
          borders,
          width: { size: 12, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [createP(String(it.total).padStart(2, "0"), { size: 19, align: AlignmentType.CENTER })],
        }),
        new TableCell({
          borders,
          width: { size: 12, type: WidthType.PERCENTAGE },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [createP(String(it.hits).padStart(2, "0"), { size: 19, bold: true, align: AlignmentType.CENTER })],
        }),
        // Célula Vermelha
        new TableCell({
          borders,
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: isAbaixo ? { fill: "EF4444", type: ShadingType.CLEAR } : undefined,
          children: [createP(isAbaixo ? "✓" : "", { align: AlignmentType.CENTER, bold: true, color: "FFFFFF" })],
        }),
        // Célula Amarela
        new TableCell({
          borders,
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: isRegular ? { fill: "F59E0B", type: ShadingType.CLEAR } : undefined,
          children: [createP(isRegular ? "✓" : "", { align: AlignmentType.CENTER, bold: true, color: "FFFFFF" })],
        }),
        // Célula Verde
        new TableCell({
          borders,
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: isBom ? { fill: "10B981", type: ShadingType.CLEAR } : undefined,
          children: [createP(isBom ? "✓" : "", { align: AlignmentType.CENTER, bold: true, color: "FFFFFF" })],
        }),
      ],
    })
  }

  const rows = [
    headerRow,
    sectionDividerRow("Conhecimento do Alfabeto"),
    ...predictors.alphabet.map(itemRow),
    sectionDividerRow("Consciência Fonológica"),
    ...predictors.phonologicalAwareness.map(itemRow),
    sectionDividerRow("Leitura"),
    ...predictors.reading.map(itemRow),
    sectionDividerRow("Escrita"),
    ...predictors.writing.map(itemRow),
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

// ---------------------------------------------------------------------------
// Construtor Principal do Documento
// ---------------------------------------------------------------------------

export async function buildInterventionDocxReport(data: InterventionReportData): Promise<Document> {
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
              top: 1200,
              bottom: 1200,
              left: 1400,
              right: 1400,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: (data.professional.clinicName || "ESPAÇO MULTIDISCIPLINAR APRENDER ENSINANDO").toUpperCase(),
                    font: "Arial",
                    size: 20,
                    bold: true,
                    color: "005B94",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `PSICOPEDAGOGA ${data.professional.professionalName.toUpperCase()} CBO ${data.professional.cbo || "2394-25"}`,
                    font: "Arial",
                    size: 18,
                    bold: true,
                    color: "334155",
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
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: `${data.professional.address || "RUA BAHIA 3600 - CENTRO"} - ${data.professional.phone ? `TEL: ${data.professional.phone}` : ""}`,
                    font: "Arial",
                    size: 16,
                    color: "64748B",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `EMAIL: ${data.professional.email || "contato@clinica.com"} | CBO ${data.professional.cbo || "2394-25"}`,
                    font: "Arial",
                    size: 16,
                    color: "64748B",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // TÍTULO DO LAUDO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 360 },
            children: [
              new TextRun({
                text: "REAVALIAÇÃO PSICOPEDAGÓGICA - PÓS INTERVENÇÃO",
                font: "Arial",
                size: 26,
                bold: true,
                color: "0F172A",
              }),
            ],
          }),

          // BOX DE IDENTIFICAÇÃO DO PACIENTE
          createPatientIdTable(data.patient),

          // SEÇÃO 1: MOTIVO DA REAVALIAÇÃO
          createSectionHeader("Motivo da Reavaliação"),
          createP(data.clinical.reassessmentReason),

          // SEÇÃO 2: HISTÓRICO BREVE / ANTECEDENTES
          createSectionHeader("Histórico Breve / Antecedentes"),
          createP(data.clinical.briefHistory),

          // SEÇÃO 3: INSTRUMENTOS E PROCEDIMENTOS
          createSectionHeader("Instrumentos e Procedimentos Utilizados na Reavaliação"),
          ...data.clinical.usedInstruments.map((inst) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: `• ${inst.toUpperCase()}`,
                  font: "Arial",
                  size: 21,
                  bold: true,
                  color: "1E293B",
                }),
              ],
            })
          ),

          // SEÇÃO 4: ANÁLISE EVOLUTIVA DOS RESULTADOS
          createSectionHeader("Análise Evolutiva dos Resultados"),
          createSubHeader("Aspectos Cognitivos e Funções Executivas"),

          // TESTE TRILHAS
          createSubHeader("Teste Trilhas A/B"),
          createP(
            "Avalia a velocidade da atenção, sequenciamento, flexibilidade mental, busca visual e função motora. O teste é dividido em partes A e B (tempo de execução, atenção sustentada e alternância cognitiva)."
          ),
          createCutoffTable(),
          createP(""),
          ...(data.clinical.trilhas ? [createTrilhasTable(data.clinical.trilhas), createP(data.clinical.trilhas.observation, { italic: true })] : []),

          // SPAN DE DÍGITOS
          createSubHeader("Tarefa Span de Dígitos (TSD)"),
          createP(
            "Avalia memória auditiva de curto prazo (ordem direta) e memória de trabalho auditiva (ordem inversa) com complexidade progressiva."
          ),
          ...(data.clinical.spanDigitos
            ? [createSpanTable(data.clinical.spanDigitos), createP(data.clinical.spanDigitos.observation, { italic: true })]
            : []),

          // TESTE INFANTIL DE NOMEAÇÃO (TIN)
          createSubHeader("TIN - Teste Infantil de Nomeação"),
          createP(
            "Avalia a habilidade de nomeação verbal diante de estímulos visuais, linguagem expressiva e acesso ao sistema de memória de longo prazo."
          ),
          ...(data.clinical.tin
            ? [
                createLabeledP("Pontuação Padrão:", String(data.clinical.tin.score)),
                createLabeledP("Percentil / Classificação:", data.clinical.tin.classification),
                createP(data.clinical.tin.observation, { italic: true }),
              ]
            : []),

          // DISCRIMINAÇÃO FONOLÓGICA
          createSubHeader("Teste de Discriminação Fonológica"),
          createP("Avalia a capacidade de distinguir auditivamente fonemas (sons da fala que diferenciam palavras)."),
          ...(data.clinical.phonologicalDiscrimination
            ? [
                createLabeledP("Pontuação Padrão:", String(data.clinical.phonologicalDiscrimination.score)),
                createLabeledP("Classificação:", data.clinical.phonologicalDiscrimination.classification),
                createP(data.clinical.phonologicalDiscrimination.observation, { italic: true }),
              ]
            : []),

          // TESTE DE AUDIBILIZAÇÃO
          createSubHeader("Teste de Audibilização"),
          createP("Sonda a capacidade de audibilização e memória auditiva em crianças em fase de aquisição da escrita."),
          ...(data.clinical.audibilizacao
            ? [
                createAudibilizacaoTable(data.clinical.audibilizacao),
                createP(data.clinical.audibilizacao.observation, { italic: true }),
              ]
            : []),

          // PROTOCOLO DE OBSERVAÇÃO PSICOMOTORA (POP-TT)
          createSubHeader("POP-TT - Protocolo de Observação Psicomotora"),
          createP(
            "Avalia relações entre aprendizagem, psicomotricidade e neurociências (esquema corporal, lateralidade, praxias)."
          ),
          ...(data.clinical.popTT ? [createPopTtTable(data.clinical.popTT), createP(data.clinical.popTT.observation, { italic: true })] : []),

          // ASPECTOS DE ARITMÉTICA
          createSubHeader("Aspectos de Aritmética (Prova de Aritmética)"),
          createP(
            "Observados: conhecimento numérico, sistema decimal, classificação, ordem, grandezas, cálculo mental, sentenças e resolução de problemas."
          ),
          ...(data.clinical.arithmetic
            ? [
                createLabeledP("Pontos / Escore:", `${data.clinical.arithmetic.points} pontos (score ${data.clinical.arithmetic.score})`),
                createLabeledP("Classificação:", data.clinical.arithmetic.classification),
                createP(data.clinical.arithmetic.observation, { italic: true }),
              ]
            : []),

          // ASPECTOS PEDAGÓGICOS: LEITURA E ESCRITA (SEMÁFORO)
          createSectionHeader("Aspectos Pedagógicos (Leitura e Escrita)"),
          createSubHeader("Instrumento Qualitativo de Avaliação de Habilidades Preditoras"),
          createP("Legenda do Desempenho: 🟢 BOM | 🟡 REGULAR | 🔴 ABAIXO", { bold: true, color: "005B94" }),
          createPredictorsPerformanceTable(data.clinical.readingWritingPredictors),

          // CONCLUSÃO CLÍNICA ATUALIZADA
          createSectionHeader("Conclusão Clínica Atualizada e Fechamento do Quadro"),
          createP(data.clinical.clinicalConclusion, { lineSpacing: 280 }),

          // RECOMENDAÇÕES PARA ESCOLA E FAMÍLIA
          createSectionHeader("Recomendações"),
          createSubHeader("Para a Escola:"),
          createP(data.clinical.recommendationsSchool),
          createP("(Vocês fazem parte desse sucesso!)", { bold: true, color: "005B94" }),

          createSubHeader("Para a Família:"),
          createP(data.clinical.recommendationsFamily),
          createP("(Vocês fazem parte desse sucesso!)", { bold: true, color: "005B94" }),

          createP("Estarei sempre à disposição!", { italic: true, spacingBefore: 200, spacingAfter: 360 }),

          // LOCAL E DATA
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200, after: 400 },
            children: [
              new TextRun({
                text: `${data.professional.city || "Votuporanga"}, ${data.professional.date || "02 de setembro de 2026"}.`,
                font: "Arial",
                size: 21,
                color: "333333",
              }),
            ],
          }),

          // ASSINATURA E CARIMBO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 40 },
            children: [
              new TextRun({
                text: data.professional.professionalName,
                font: "Arial",
                size: 22,
                bold: true,
                color: "111827",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [
              new TextRun({
                text: "___________________________________________",
                font: "Arial",
                size: 20,
                color: "94A3B8",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Psicopedagogo(a) – CBO-${data.professional.cbo || "2394-25"}`,
                font: "Arial",
                size: 20,
                bold: true,
                color: "475569",
              }),
            ],
          }),
        ],
      },
    ],
  })

  return doc
}

export async function downloadInterventionDocxReport(doc: Document, filename: string) {
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
