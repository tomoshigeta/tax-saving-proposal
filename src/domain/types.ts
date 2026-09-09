import type { Rate, Yen, YenPerMonth, YenPerYear } from './units'
import type { StructureKey } from './structures'

/** 選択可能な所得税率。この帯以外の顧客はこのアプリの想定対象外 */
export const INCOME_TAX_RATES = [33, 40, 45] as const
export type IncomeTaxRatePercent = (typeof INCOME_TAX_RATES)[number]

/** 住民税は一律10%。復興特別所得税は考慮しない */
export const RESIDENT_TAX_PERCENT = 10

export interface ProposalInput {
  // --- 物件 ---
  propertyName: string
  customerName: string
  address: string
  /** 物件価格 P */
  price: Yen
  /** 建物価格 B (P の内数)。土地価格は P - B */
  buildingPrice: Yen
  /** うち設備価格 E (B の内数)。RC造のときのみ有効 */
  fixturesPrice: Yen
  structure: StructureKey
  /** 築年数 A。0 なら新築 */
  ageYears: number

  // --- 資金 ---
  /** 自己資金 D。借入額は P - D */
  ownFunds: Yen
  /** ローン年利。0.02 = 2% */
  interestRate: Rate
  loanTermYears: number
  /** 仲介手数料 F。現金支出だが税務上の経費ではない */
  brokerageFee: Yen
  /** ローン事務手数料 G。現金支出かつ初年度の必要経費 */
  loanArrangementFee: Yen

  // --- 収支 ---
  /** 保証月額家賃 Rm */
  guaranteedRentMonthly: YenPerMonth
  /** 月額管理費・修繕積立金 Mm */
  managementFeeMonthly: YenPerMonth
  /** 固定資産税・都市計画税 T (年額) */
  propertyTaxAnnual: YenPerYear

  // --- 顧客 ---
  currentAge: number
  retirementAge: number
  incomeTaxRatePercent: IncomeTaxRatePercent
}

export interface YearRow {
  /** 1始まり */
  year: number
  /** その年の顧客の年齢 */
  age: number
  rentIncome: YenPerYear
  depreciation: YenPerYear
  interestPaid: YenPerYear
  /** 支払利息のうち土地取得に対応する部分。損益通算できない */
  landInterest: YenPerYear
  /** 管理費・固都税・初年度のローン事務手数料 */
  otherExpenses: YenPerYear
  /** 賃料収入 - 経費。マイナスなら赤字 */
  realEstateIncome: YenPerYear
  /** 赤字のうち損益通算できる部分 */
  deductibleLoss: YenPerYear
  /** 通算可能な赤字 x 合計税率。黒字年は 0 */
  taxSaving: YenPerYear
  loanBalanceEnd: Yen
  /** 定年までの期間に含まれるか(節税効果合計の集計対象) */
  countsTowardTotal: boolean
}

export interface Simulation {
  /** 全期間一定 */
  monthlyCashFlow: YenPerMonth
  monthlyPayment: YenPerMonth
  loanPrincipal: Yen
  landPrice: Yen
  /** 自己資金 + 仲介手数料 + ローン事務手数料 */
  initialCashOutlay: Yen
  /** 建物本体の耐用年数 */
  usefulLife: number
  /** 設備の耐用年数。設備分離しない構造では null */
  fixturesUsefulLife: number | null
  shellBasis: Yen
  fixturesBasis: Yen
  landInterestRatio: Rate
  combinedTaxRate: Rate
  yearsToRetirement: number
  /** グラフ横軸の年数。max(定年まで, 返済期間) */
  horizonYears: number
  /** 定年までの節税額合計 */
  totalTaxSaving: Yen
  rows: YearRow[]
}
