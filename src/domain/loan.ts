/**
 * 元利均等返済。
 *
 * 月次で償却表を回し、年ごとの支払利息合計と年末残債を返す。年利から直接年次で
 * 近似すると残債が数十万円ずれるため、必ず月次で回す。
 */

export interface LoanYear {
  /** 1始まり */
  year: number
  /** その年の支払利息合計 */
  interest: number
  /** その年の元本返済合計 */
  principal: number
  /** 年末残債 */
  balanceEnd: number
}

export interface LoanSchedule {
  monthlyPayment: number
  years: LoanYear[]
}

/**
 * @param principal 借入額
 * @param annualRate 年利(0.02 = 2%)
 * @param termYears 返済期間(年)
 * @param horizonYears 返済表を返す年数。返済期間より長ければ完済後は 0 埋め
 */
export function amortize(
  principal: number,
  annualRate: number,
  termYears: number,
  horizonYears: number,
): LoanSchedule {
  const months = Math.round(termYears * 12)
  if (principal <= 0 || months <= 0) {
    return {
      monthlyPayment: 0,
      years: Array.from({ length: horizonYears }, (_, i) => ({
        year: i + 1,
        interest: 0,
        principal: 0,
        balanceEnd: 0,
      })),
    }
  }

  const i = annualRate / 12
  const monthlyPayment =
    i === 0 ? principal / months : (principal * i * (1 + i) ** months) / ((1 + i) ** months - 1)

  let balance = principal
  const years: LoanYear[] = []

  for (let year = 1; year <= horizonYears; year++) {
    let interest = 0
    let repaid = 0

    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break
      const monthInterest = balance * i
      // 最終回は残債で打ち切る
      const monthPrincipal = Math.min(monthlyPayment - monthInterest, balance)
      interest += monthInterest
      repaid += monthPrincipal
      balance -= monthPrincipal
    }

    years.push({ year, interest, principal: repaid, balanceEnd: Math.max(0, balance) })
  }

  return { monthlyPayment, years }
}

/**
 * 土地に対応する借入金の割合。
 *
 * 措置法施行令26条の6第2項の建物優先充当による。借入金はまず建物の取得の対価に
 * 充てられ、次に土地に充てられたものとして計算する(納税者有利の取扱い)。
 * ここでの建物価格は契約上の対価であり、仲介手数料を加算しない。
 */
export function landInterestRatio(loanPrincipal: number, buildingPrice: number): number {
  if (loanPrincipal <= 0) return 0
  return Math.max(0, loanPrincipal - buildingPrice) / loanPrincipal
}
