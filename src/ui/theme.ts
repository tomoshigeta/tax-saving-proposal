/**
 * 提案書は白い紙に印刷される前提のため、ライト固定で作る(ダークモードは持たない)。
 *
 * グラフは「年間節税額」「ローン残債」とも単一系列で、それぞれ見出しを持つ独立した図。
 * 識別を色に頼らないので、2枚とも同じ青を使う。
 * 白地に対するコントラストは 5.47:1(系列)、8.66:1(見出しの濃紺)。
 */
export const VIZ = {
  surface: '#ffffff',
  navy: '#1f4e79',
  textPrimary: '#1a1a1a',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  grid: '#e5e9ef',
  axis: '#c9d2dd',
  /** 棒・折れ線の系列色 */
  series: '#2e6da4',
  /** 折れ線の下の塗り */
  seriesFill: '#dce9f6',
} as const
