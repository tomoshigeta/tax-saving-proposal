import type { Yen } from './units'

/**
 * 建物構造と法定耐用年数(住宅用)。
 * 出典: 国税庁「主な減価償却資産の耐用年数表」
 */
export const STRUCTURES = {
  wood: { label: '木造・合成樹脂造', usefulLife: 22, allowsFixtureSplit: false },
  woodMortar: { label: '木骨モルタル造', usefulLife: 20, allowsFixtureSplit: false },
  steel3: { label: '鉄骨造(骨格材3mm以下)', usefulLife: 19, allowsFixtureSplit: false },
  steel4: { label: '鉄骨造(3mm超4mm以下)', usefulLife: 27, allowsFixtureSplit: false },
  steelHeavy: { label: '鉄骨造(4mm超)', usefulLife: 34, allowsFixtureSplit: false },
  rc: { label: 'RC造', usefulLife: 47, allowsFixtureSplit: true },
} as const satisfies Record<string, { label: string; usefulLife: number; allowsFixtureSplit: boolean }>

export type StructureKey = keyof typeof STRUCTURES

export const STRUCTURE_KEYS = Object.keys(STRUCTURES) as StructureKey[]

/** 建物附属設備(電気設備・給排水衛生設備・ガス設備)の法定耐用年数 */
export const FIXTURES_USEFUL_LIFE = 15

export const allowsFixtureSplit = (s: StructureKey): boolean => STRUCTURES[s].allowsFixtureSplit

/** 選択中の構造で設備分離できない場合、設備価格は 0 として扱う */
export const effectiveFixturesPrice = (s: StructureKey, fixturesPrice: Yen): Yen =>
  (allowsFixtureSplit(s) ? fixturesPrice : 0) as Yen
