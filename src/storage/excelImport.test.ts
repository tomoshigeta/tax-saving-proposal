import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { STRUCTURES, STRUCTURE_KEYS } from '../domain/structures'
import { INCOME_TAX_RATES } from '../domain/types'
import { ExcelFormatError, readGrid } from './excelImport'
import {
  EXCEL_HEADERS,
  FIRST_DATA_ROW,
  SHEET_NAME,
  STRUCTURE_LABELS,
  TAX_RATE_OPTIONS,
} from './excelColumns'

const TEMPLATE = 'public/rent-assessment-template.xlsx'

/** 見出し行 + 記入例行 + 渡された行 */
const grid = (...rows: unknown[][]) => [[...EXCEL_HEADERS], [], ...rows]

const validRow = [
  'グランドメゾン新宿 101',
  '山田 太郎',
  '東京都新宿区西新宿1-1-1',
  30_000_000,
  12_000_000,
  2_400_000,
  'RC造',
  20,
  0,
  2,
  35,
  990_000,
  110_000,
  250_000, // 登記費用
  95_000,
  15_000,
  80_000,
  50,
  15, // 試算期間(年)
  33,
]

/** 列名で場所を引く。列を足したときにテストの添字が総崩れしないように */
const col = (header: string) => {
  const i = EXCEL_HEADERS.indexOf(header)
  if (i < 0) throw new Error(`no column ${header}`)
  return i
}

/** 登記費用・試算期間が無かった頃のテンプレート(見出し18列) */
const OLD_HEADERS = EXCEL_HEADERS.filter((h) => h !== '登記費用' && h !== '試算期間(年)')
const oldRow = validRow.filter((_, i) => i !== col('登記費用') && i !== col('試算期間(年)'))

describe('列定義とドメインの整合', () => {
  it('JSONの構造名は structures.ts と一致する', () => {
    expect(STRUCTURE_LABELS).toEqual(STRUCTURE_KEYS.map((k) => STRUCTURES[k].label))
  })

  it('JSONの税率は types.ts と一致する', () => {
    expect(TAX_RATE_OPTIONS).toEqual([...INCOME_TAX_RATES])
  })
})

describe('配布テンプレート', () => {
  const book = XLSX.read(readFileSync(TEMPLATE), { type: 'buffer' })
  const sheet = book.Sheets[SHEET_NAME]!
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true })

  it('想定したシート名を持つ', () => {
    expect(book.SheetNames).toContain(SHEET_NAME)
    expect(book.SheetNames).toContain('使い方')
  })

  it('見出し行が列定義と一致する', () => {
    expect(rows[0]).toEqual([...EXCEL_HEADERS])
  })

  it('記入例の行はそのまま取り込める', () => {
    // 2行目の記入例をデータ行として渡すと、問題なく1件になる
    const example = rows[1] as unknown[]
    const { inputs, problems } = readGrid(grid(example) as never)
    expect(problems).toEqual([])
    expect(inputs).toHaveLength(1)
  })
})

describe('readGrid', () => {
  it('1行を ProposalInput に変換する', () => {
    const { inputs, problems } = readGrid(grid(validRow) as never)
    expect(problems).toEqual([])
    expect(inputs).toHaveLength(1)

    const input = inputs[0]!
    expect(input.propertyName).toBe('グランドメゾン新宿 101')
    expect(input.price).toBe(30_000_000)
    expect(input.structure).toBe('rc')
    // テンプレートは 2 と書いて 2% の意味
    expect(input.interestRate).toBeCloseTo(0.02, 10)
    expect(input.incomeTaxRatePercent).toBe(33)
    expect(input.registrationFee).toBe(250_000)
    expect(input.simulationYears).toBe(15)
  })

  it('登記費用と試算期間の列が無い古いテンプレートも読める(既定は 0 / 15年)', () => {
    expect(OLD_HEADERS).toHaveLength(EXCEL_HEADERS.length - 2)
    const { inputs, problems } = readGrid([[...OLD_HEADERS], [], oldRow] as never)
    expect(problems).toEqual([])
    expect(inputs).toHaveLength(1)
    expect(inputs[0]!.registrationFee).toBe(0)
    expect(inputs[0]!.simulationYears).toBe(15)
    // 列がずれて隣の値を拾っていないこと
    expect(inputs[0]!.guaranteedRentMonthly).toBe(95_000)
    expect(inputs[0]!.incomeTaxRatePercent).toBe(33)
  })

  it('列の順番が入れ替わっていても見出し名で読む', () => {
    const shuffled = [...EXCEL_HEADERS].reverse()
    const row = [...validRow].reverse()
    const { inputs, problems } = readGrid([shuffled, [], row] as never)
    expect(problems).toEqual([])
    expect(inputs[0]!.propertyName).toBe('グランドメゾン新宿 101')
    expect(inputs[0]!.price).toBe(30_000_000)
  })

  it('試算期間が範囲外の行は弾く', () => {
    const row = [...validRow]
    row[col('試算期間(年)')] = 40
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(inputs).toEqual([])
    expect(problems[0]!.message).toContain('試算期間')
  })

  it('試算期間が空なら既定の15年', () => {
    const row = [...validRow]
    row[col('試算期間(年)')] = ''
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(problems).toEqual([])
    expect(inputs[0]!.simulationYears).toBe(15)
  })

  it('空行は飛ばす', () => {
    const { inputs, problems } = readGrid(grid([], validRow, []) as never)
    expect(problems).toEqual([])
    expect(inputs).toHaveLength(1)
  })

  it('必須の見出しが無ければファイルごと拒否する', () => {
    const broken = [['物件名', '違う見出し'], [], validRow]
    expect(() => readGrid(broken as never)).toThrow(ExcelFormatError)
    expect(() => readGrid(broken as never)).toThrow(/見出し行がテンプレートと違います/)
    expect(() => readGrid(broken as never)).toThrow(/物件価格/)
  })

  it('必須項目が空の行は、Excel上の行番号つきで報告する', () => {
    const row = [...validRow]
    row[0] = '' // 物件名
    row[3] = '' // 物件価格
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(inputs).toEqual([])
    expect(problems).toHaveLength(1)
    expect(problems[0]!.row).toBe(FIRST_DATA_ROW)
    expect(problems[0]!.message).toContain('物件名')
    expect(problems[0]!.message).toContain('物件価格')
  })

  it('構造の表記ゆれは弾く', () => {
    const row = [...validRow]
    row[col('構造')] = 'ＲＣ'
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(inputs).toEqual([])
    expect(problems[0]!.message).toContain('構造')
  })

  it('選べない税率は弾く', () => {
    const row = [...validRow]
    row[col('所得税率(%)')] = 20
    const { problems } = readGrid(grid(row) as never)
    expect(problems[0]!.message).toContain('所得税率')
  })

  it('文字列で入った数値を読む(カンマ・円・全角)', () => {
    const row = [...validRow]
    row[col('物件価格')] = '30,000,000円'
    row[col('保証月額家賃')] = '９５０００'
    row[col('ローン金利(%)')] = '2.5'
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(problems).toEqual([])
    expect(inputs[0]!.price).toBe(30_000_000)
    expect(inputs[0]!.guaranteedRentMonthly).toBe(95_000)
    expect(inputs[0]!.interestRate).toBeCloseTo(0.025, 10)
  })

  it('任意項目が空なら0として扱う', () => {
    const row = [...validRow]
    row[col('顧客名')] = ''
    row[col('うち設備価格')] = ''
    row[col('仲介手数料')] = ''
    row[col('登記費用')] = ''
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(problems).toEqual([])
    expect(inputs[0]!.customerName).toBe('')
    expect(inputs[0]!.fixturesPrice).toBe(0)
    expect(inputs[0]!.brokerageFee).toBe(0)
    expect(inputs[0]!.registrationFee).toBe(0)
  })

  it('取り込める行と問題のある行が混ざっても、取り込める行は返す', () => {
    const bad = [...validRow]
    bad[0] = ''
    const { inputs, problems } = readGrid(grid(validRow, bad, validRow) as never)
    expect(inputs).toHaveLength(2)
    expect(problems).toHaveLength(1)
    expect(problems[0]!.row).toBe(FIRST_DATA_ROW + 1)
  })
})
