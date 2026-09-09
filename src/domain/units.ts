/**
 * 単位付きの金額。
 *
 * v1ドラフトの月々CF計算式には月額と年額が混在していた。同じ `number` である限り
 * 同種のバグは何度でも入るので、単位を型で分ける。変換は必ず annualize / monthlyOf を通す。
 */

declare const brand: unique symbol

type Branded<T extends string> = number & { readonly [brand]: T }

/** 金額(円)。ストック値。物件価格、残債など */
export type Yen = Branded<'Yen'>
/** 月額(円/月) */
export type YenPerMonth = Branded<'YenPerMonth'>
/** 年額(円/年) */
export type YenPerYear = Branded<'YenPerYear'>
/** 率。0.33 = 33%。パーセント値をそのまま入れないこと */
export type Rate = Branded<'Rate'>

export const yen = (n: number): Yen => n as Yen
export const perMonth = (n: number): YenPerMonth => n as YenPerMonth
export const perYear = (n: number): YenPerYear => n as YenPerYear
export const rate = (n: number): Rate => n as Rate

/** パーセント表記(33)から率(0.33)へ */
export const rateFromPercent = (percent: number): Rate => rate(percent / 100)

export const annualize = (m: YenPerMonth): YenPerYear => perYear(m * 12)
export const monthlyOf = (y: YenPerYear): YenPerMonth => perMonth(y / 12)

/** 円未満切り捨て。負値はゼロ方向に切る */
export const floorYen = (n: number): number => Math.trunc(n)
