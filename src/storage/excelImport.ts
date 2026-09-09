import { emptyInput } from '../domain/defaults'
import { INCOME_TAX_RATES, type IncomeTaxRatePercent, type ProposalInput } from '../domain/types'
import { perMonth, perYear, rate, yen } from '../domain/units'
import {
  EXCEL_HEADERS,
  FIRST_DATA_ROW,
  SHEET_NAME,
  structureKeyFromLabel,
  type ExcelColumn,
} from './excelColumns'
import { EXCEL_COLUMNS } from './excelColumns'

export interface RowProblem {
  /** Excel上の行番号(1始まり)。ユーザーがそのまま探せる値 */
  row: number
  message: string
}

export interface ImportResult {
  inputs: ProposalInput[]
  /** 取り込めなかった行。取り込めた行があっても返す */
  problems: RowProblem[]
}

/** ヘッダー行や、シートそのものが違うときに投げる */
export class ExcelFormatError extends Error {}

type Cell = string | number | boolean | null | undefined
type Grid = Cell[][]

const text = (v: Cell): string => (v === null || v === undefined ? '' : String(v).trim())

/** 全角数字・カンマ・円記号・空白を落として数値にする。Excelから文字列で来ることがある */
function num(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const raw = text(v)
  if (raw === '') return null
  const normalized = raw
    .replace(/[０-９．－]/g, (c) => '0123456789.-'['０１２３４５６７８９．－'.indexOf(c)] ?? c)
    .replace(/[,¥￥\s円%％年歳]/g, '')
  if (normalized === '' || normalized === '-') return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function readRow(row: Cell[], excelRow: number): ProposalInput | RowProblem {
  const at = (header: string): Cell => row[EXCEL_HEADERS.indexOf(header)]
  const fail = (message: string): RowProblem => ({ row: excelRow, message })

  const missing = EXCEL_COLUMNS.filter(
    (c: ExcelColumn) => c.required && text(at(c.header)) === '',
  ).map((c) => c.header)
  if (missing.length > 0) return fail(`必須項目が空です: ${missing.join(' / ')}`)

  const structure = structureKeyFromLabel(text(at('構造')))
  if (!structure) {
    return fail(`構造「${text(at('構造'))}」は認識できません。テンプレートのプルダウンから選んでください`)
  }

  const taxRate = num(at('所得税率(%)'))
  if (taxRate === null || !INCOME_TAX_RATES.includes(taxRate as IncomeTaxRatePercent)) {
    return fail(`所得税率は ${INCOME_TAX_RATES.join(' / ')} のいずれかにしてください`)
  }

  const numeric: Record<string, number> = {}
  for (const col of EXCEL_COLUMNS) {
    if (col.kind === 'text' || col.kind === 'structure' || col.kind === 'taxRate') continue
    const value = num(at(col.header))
    if (value === null) {
      if (col.required) return fail(`「${col.header}」を数値で入力してください`)
      numeric[col.header] = 0
    } else {
      numeric[col.header] = value
    }
  }
  const n = (header: string): number => numeric[header] ?? 0

  return {
    ...emptyInput(),
    propertyName: text(at('物件名')),
    customerName: text(at('顧客名')),
    address: text(at('住所')),
    price: yen(n('物件価格')),
    buildingPrice: yen(n('建物価格')),
    fixturesPrice: yen(n('うち設備価格')),
    structure,
    ageYears: n('築年数'),
    ownFunds: yen(n('自己資金')),
    // テンプレートは 2.5% を 2.5 で受ける
    interestRate: rate(n('ローン金利(%)') / 100),
    loanTermYears: n('返済期間(年)'),
    brokerageFee: yen(n('仲介手数料')),
    loanArrangementFee: yen(n('ローン事務手数料')),
    guaranteedRentMonthly: perMonth(n('保証月額家賃')),
    managementFeeMonthly: perMonth(n('管理費・修繕積立金(月額)')),
    propertyTaxAnnual: perYear(n('固定資産税・都市計画税(年額)')),
    currentAge: n('現在年齢'),
    incomeTaxRatePercent: taxRate as IncomeTaxRatePercent,
  }
}

/** 2次元配列を物件データに変換する。ファイルの読み込みとは分けてあり、テストから直接呼べる */
export function readGrid(grid: Grid): ImportResult {
  const header = (grid[0] ?? []).map(text)
  const expected = [...EXCEL_HEADERS]
  if (header.length < expected.length || expected.some((h, i) => header[i] !== h)) {
    const firstDiff = expected.findIndex((h, i) => header[i] !== h)
    throw new ExcelFormatError(
      `見出し行がテンプレートと違います(${firstDiff + 1}列目: 「${expected[firstDiff]}」のはずが「${header[firstDiff] ?? '空欄'}」)。` +
        'テンプレートをダウンロードし直してください。',
    )
  }

  const inputs: ProposalInput[] = []
  const problems: RowProblem[] = []

  for (let i = FIRST_DATA_ROW - 1; i < grid.length; i++) {
    const row = grid[i] ?? []
    if (row.every((cell) => text(cell) === '')) continue
    const result = readRow(row, i + 1)
    if ('row' in result) problems.push(result)
    else inputs.push(result)
  }

  return { inputs, problems }
}

/** Excelファイルを読む。SheetJS はここで初めて読み込む(初回表示を重くしないため) */
export async function readExcelFile(file: File): Promise<ImportResult> {
  const XLSX = await import('xlsx')
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = book.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : book.SheetNames[0]
  const sheet = sheetName ? book.Sheets[sheetName] : undefined
  if (!sheet) throw new ExcelFormatError('シートが見つかりませんでした')

  const grid = XLSX.utils.sheet_to_json<Cell[]>(sheet, {
    header: 1,
    blankrows: true,
    defval: null,
    raw: true,
  })
  return readGrid(grid)
}
