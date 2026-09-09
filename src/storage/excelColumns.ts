import spec from './excelColumns.json'
import { STRUCTURES, STRUCTURE_KEYS, type StructureKey } from '../domain/structures'

/**
 * Excel入力テンプレートの列定義。
 *
 * 実体は excelColumns.json に置いてある。テンプレートを生成する
 * scripts/make_template.py が同じファイルを読むため、Python と TypeScript で
 * 定義が二重にならない。JSON と domain 側の突き合わせは excelImport.test.ts が見張る。
 */
export type ColumnKind = 'text' | 'yen' | 'years' | 'percent' | 'structure' | 'taxRate'

export interface ExcelColumn {
  header: string
  required: boolean
  kind: ColumnKind
  example: string | number
  width: number
}

export const EXCEL_COLUMNS = spec.columns as readonly ExcelColumn[]
export const EXCEL_HEADERS: readonly string[] = EXCEL_COLUMNS.map((c) => c.header)
export const STRUCTURE_LABELS: readonly string[] = spec.structureLabels
export const TAX_RATE_OPTIONS: readonly number[] = spec.taxRates
export const SHEET_NAME = spec.sheetName
/** 1行目が見出し、2行目が記入例。データは3行目から */
export const FIRST_DATA_ROW = spec.firstDataRow

/** 構造名から内部キーへ。テンプレートの表記と完全一致した場合のみ通す */
export function structureKeyFromLabel(label: string): StructureKey | null {
  const trimmed = label.trim()
  return STRUCTURE_KEYS.find((k) => STRUCTURES[k].label === trimmed) ?? null
}
