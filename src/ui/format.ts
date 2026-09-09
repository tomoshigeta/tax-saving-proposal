const nf = new Intl.NumberFormat('ja-JP')

export const yenText = (n: number): string => `${nf.format(Math.trunc(n))}円`

/** 万円単位。提案書のヒーロー数値や右上の要約に使う */
export const manText = (n: number): string => {
  const man = Math.trunc(n / 10_000)
  return `${nf.format(man)}万円`
}

export const signedYenText = (n: number): string =>
  `${n < 0 ? '△' : ''}${nf.format(Math.abs(Math.trunc(n)))}円`

export const percentText = (r: number, digits = 2): string => `${(r * 100).toFixed(digits)}%`

export const dateText = (ms: number): string =>
  new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
