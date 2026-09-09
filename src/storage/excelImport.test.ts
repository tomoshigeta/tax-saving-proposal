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
  95_000,
  15_000,
  80_000,
  50,
  33,
]

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
  })

  it('空行は飛ばす', () => {
    const { inputs, problems } = readGrid(grid([], validRow, []) as never)
    expect(problems).toEqual([])
    expect(inputs).toHaveLength(1)
  })

  it('見出しが違えばファイルごと拒否する', () => {
    const broken = [['物件名', '違う見出し'], [], validRow]
    expect(() => readGrid(broken as never)).toThrow(ExcelFormatError)
    expect(() => readGrid(broken as never)).toThrow(/見出し行がテンプレートと違います/)
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
    row[6] = 'ＲＣ'
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(inputs).toEqual([])
    expect(problems[0]!.message).toContain('構造')
  })

  it('選べない税率は弾く', () => {
    const row = [...validRow]
    row[17] = 20
    const { problems } = readGrid(grid(row) as never)
    expect(problems[0]!.message).toContain('所得税率')
  })

  it('文字列で入った数値を読む(カンマ・円・全角)', () => {
    const row = [...validRow]
    row[3] = '30,000,000円'
    row[13] = '９５０００'
    row[9] = '2.5'
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(problems).toEqual([])
    expect(inputs[0]!.price).toBe(30_000_000)
    expect(inputs[0]!.guaranteedRentMonthly).toBe(95_000)
    expect(inputs[0]!.interestRate).toBeCloseTo(0.025, 10)
  })

  it('任意項目が空なら0として扱う', () => {
    const row = [...validRow]
    row[1] = '' // 顧客名
    row[5] = '' // 設備価格
    row[11] = '' // 仲介手数料
    const { inputs, problems } = readGrid(grid(row) as never)
    expect(problems).toEqual([])
    expect(inputs[0]!.customerName).toBe('')
    expect(inputs[0]!.fixturesPrice).toBe(0)
    expect(inputs[0]!.brokerageFee).toBe(0)
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
