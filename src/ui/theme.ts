/**
 * 提案書は白い紙に印刷される前提のため、ライト固定で作る(ダークモードは持たない)。
 * 系列色は dataviz の検証済みパレットのスロット1(青)・スロット2(橙)。
 * 2色の組でバリデータの全チェックを通している。
 */
export const VIZ = {
  surface: '#fcfcfb',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#84837d',
  grid: '#e6e5e1',
  /** 年間節税額 */
  series1: '#2a78d6',
  /** ローン残債 */
  series2: '#eb6834',
} as const
