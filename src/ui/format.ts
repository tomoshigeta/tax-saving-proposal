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

/**
 * 印刷 / PDF出力のときのファイル名(拡張子なし)。
 *
 * ブラウザの「PDFに保存」はページのタイトルをファイル名の初期値にするので、
 * プレビュー画面にいる間だけ document.title をこの値にする。
 * 例: 「井上 様フォンテ六本木607 節税シミュレーション」 → 井上様フォンテ六本木607節税シミュレーション
 */
export const pdfFileName = (customerName: string, propertyName: string): string => {
  const customer = customerName.trim().replace(/\s+/g, '')
  const property = propertyName.trim().replace(/\s+/g, '')
  const head = `${customer ? `${customer}様` : ''}${property}`
  // ファイル名に使えない文字は落とす(OSごとの禁止文字をまとめて)
  return `${head}節税シミュレーション`.replace(/[\\/:*?"<>|]/g, '')
}
