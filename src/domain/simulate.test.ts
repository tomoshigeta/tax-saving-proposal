import { describe, expect, it } from 'vitest'
import { simulate } from './simulate'
import { SIMULATION_YEARS, type ProposalInput } from './types'
import { perMonth, perYear, rate, yen } from './units'

/**
 * 築20年のRC区分マンションをフルローンで購入するケース。
 * 各値は手計算で検証したもの。
 */
const baseInput: ProposalInput = {
  propertyName: 'テストレジデンス101',
  customerName: '',
  address: '東京都新宿区1-1-1',
  price: yen(30_000_000),
  buildingPrice: yen(12_000_000),
  fixturesPrice: yen(2_400_000),
  structure: 'rc',
  ageYears: 20,
  ownFunds: yen(0),
  interestRate: rate(0.02),
  loanTermYears: 35,
  brokerageFee: yen(990_000),
  loanArrangementFee: yen(110_000),
  guaranteedRentMonthly: perMonth(95_000),
  managementFeeMonthly: perMonth(15_000),
  propertyTaxAnnual: perYear(80_000),
  currentAge: 50,
  incomeTaxRatePercent: 33,
}

describe('simulate', () => {
  it('耐用年数を構造・築年数から決める(建物と設備は独立)', () => {
    const s = simulate(baseInput)
    // RC47年 築20年 -> (47-20) + 20*0.2 = 31年
    expect(s.usefulLife).toBe(31)
    // 設備15年 築20年 -> 全部経過 -> 15*0.2 = 3年
    expect(s.fixturesUsefulLife).toBe(3)
  })

  it('月々CFは 保証家賃 - 管理費 - 月々返済額 - 固都税/12', () => {
    const s = simulate(baseInput)
    // 95,000 - 15,000 - 99,378.5 - 6,666.67 = -26,045.17
    expect(s.monthlyPayment).toBe(99_378)
    expect(s.monthlyCashFlow).toBe(-26_045)
  })

  it('試算期間は15年固定。返済期間が長くても15年で打ち切る', () => {
    const s = simulate(baseInput)
    expect(s.simulationYears).toBe(SIMULATION_YEARS)
    expect(s.rows).toHaveLength(15)
    expect(s.rows.at(-1)!.year).toBe(15)
  })

  it('顧客の年齢が変わっても試算期間は変わらない', () => {
    const young = simulate({ ...baseInput, currentAge: 30 })
    const old = simulate({ ...baseInput, currentAge: 58 })
    expect(young.rows).toHaveLength(15)
    expect(old.rows).toHaveLength(15)
    expect(young.totalTaxSaving).toBe(old.totalTaxSaving)
    // 年齢欄だけが動く
    expect(young.rows[0]!.age).toBe(31)
    expect(old.rows[0]!.age).toBe(59)
  })

  it('返済期間が15年より短ければ、完済後の年は残債0で続く', () => {
    const s = simulate({ ...baseInput, loanTermYears: 10 })
    expect(s.rows).toHaveLength(15)
    expect(s.rows[9]!.loanBalanceEnd).toBe(0)
    expect(s.rows[12]!.interestPaid).toBe(0)
    expect(s.rows[12]!.loanBalanceEnd).toBe(0)
  })

  it('15年後のローン残債が最終行に出る', () => {
    const s = simulate(baseInput)
    // 3,000万 / 2% / 35年 を15年返済した時点の残債
    expect(s.rows.at(-1)!.loanBalanceEnd).toBeCloseTo(19_644_614, -2)
  })

  it('土地対応の借入割合を建物優先充当で出す', () => {
    const s = simulate(baseInput)
    // 借入3,000万 / 建物1,200万 -> 0.6
    expect(s.landInterestRatio).toBeCloseTo(0.6, 10)
  })

  it('自己資金が土地価格以上なら土地対応利子はゼロになる', () => {
    // 自己資金1,800万 = 土地価格 -> 借入1,200万 = 建物価格 -> 土地対応ゼロ
    const s = simulate({ ...baseInput, ownFunds: yen(18_000_000) })
    expect(s.landInterestRatio).toBe(0)
    expect(s.rows[0]!.landInterest).toBe(0)
  })

  it('初年度の内訳が手計算と一致する', () => {
    const s = simulate(baseInput)
    const y1 = s.rows[0]!

    expect(y1.rentIncome).toBe(1_140_000) // 95,000 x 12
    // 本体 9,916,800/31 + 設備 2,479,200/3 = 319,896.77 + 826,400
    expect(y1.depreciation).toBe(1_146_296)
    expect(y1.interestPaid).toBeCloseTo(594_568, -2)
    // 管理費 180,000 + 固都税 80,000 + ローン事務手数料 110,000
    expect(y1.otherExpenses).toBe(370_000)
    expect(y1.realEstateIncome).toBeCloseTo(-970_864, -2)
    expect(y1.landInterest).toBeCloseTo(356_740, -2)
    // 赤字 970,864 - 土地利子 356,740 = 614,124
    expect(y1.deductibleLoss).toBeCloseTo(614_124, -2)
    // 614,124 x 43%
    expect(y1.taxSaving).toBeCloseTo(264_073, -2)
  })

  it('ローン事務手数料は初年度だけ経費に入る', () => {
    const s = simulate(baseInput)
    expect(s.rows[0]!.otherExpenses).toBe(370_000)
    expect(s.rows[1]!.otherExpenses).toBe(260_000) // 180,000 + 80,000
  })

  it('仲介手数料は経費に入らず、現金支出にだけ現れる', () => {
    const withFee = simulate(baseInput)
    const noFee = simulate({ ...baseInput, brokerageFee: yen(0) })

    // 経費(その他)は仲介手数料の有無で変わらない
    expect(withFee.rows[0]!.otherExpenses).toBe(noFee.rows[0]!.otherExpenses)
    // 現金支出には効く
    expect(withFee.initialCashOutlay - noFee.initialCashOutlay).toBe(990_000)
    // 償却基礎(建物分)には加算される
    expect(withFee.shellBasis).toBeGreaterThan(noFee.shellBasis)
  })

  it('設備の償却が終わると減価償却費が落ちる', () => {
    const s = simulate(baseInput)
    expect(s.rows[2]!.depreciation).toBe(1_146_296) // 3年目まで設備あり
    expect(s.rows[3]!.depreciation).toBe(319_896) // 4年目は本体のみ
  })

  it('黒字化した年の節税額は0(増税として表示しない)', () => {
    const s = simulate(baseInput)
    const blackYear = s.rows[5]! // 設備償却が3年で終わり、4年目以降は黒字
    expect(blackYear.realEstateIncome).toBeGreaterThan(0)
    expect(blackYear.taxSaving).toBe(0)
    expect(blackYear.deductibleLoss).toBe(0)
  })

  it('節税効果合計は試算期間の全年を集計する', () => {
    const s = simulate(baseInput)
    const summed = s.rows.reduce((sum, r) => sum + Math.trunc(r.taxSaving), 0)
    expect(s.totalTaxSaving).toBe(Math.trunc(summed))
  })

  it('赤字が消える年より後は節税額が0で並ぶ', () => {
    // このケースでは4年目に不動産所得が黒字化する
    const s = simulate(baseInput)
    const lastSavingYear = s.rows.filter((r) => r.taxSaving > 0).at(-1)!.year
    expect(lastSavingYear).toBe(3)
    expect(s.rows.slice(3).every((r) => r.taxSaving === 0)).toBe(true)
  })

  it('税率の選択が節税額に比例して効く', () => {
    const at33 = simulate(baseInput)
    const at45 = simulate({ ...baseInput, incomeTaxRatePercent: 45 })
    // 43% -> 55%
    expect(at45.rows[0]!.taxSaving / at33.rows[0]!.taxSaving).toBeCloseTo(55 / 43, 3)
  })

  it('RC造以外では設備価格を無視する', () => {
    const rc = simulate(baseInput)
    const wood = simulate({ ...baseInput, structure: 'wood' })

    expect(rc.fixturesUsefulLife).toBe(3)
    expect(wood.fixturesUsefulLife).toBeNull()
    expect(wood.fixturesBasis).toBe(0)
    // 木造22年 築20年 -> (22-20) + 20*0.2 = 6年
    expect(wood.usefulLife).toBe(6)
  })

  it('手元初期支出は 自己資金 + 仲介手数料 + ローン事務手数料', () => {
    const s = simulate({ ...baseInput, ownFunds: yen(3_000_000) })
    expect(s.initialCashOutlay).toBe(3_000_000 + 990_000 + 110_000)
    expect(s.loanPrincipal).toBe(27_000_000)
  })

  it('自己資金が物件価格を超えても借入額はマイナスにならない', () => {
    const s = simulate({ ...baseInput, ownFunds: yen(40_000_000) })
    expect(s.loanPrincipal).toBe(0)
    expect(s.monthlyPayment).toBe(0)
    expect(s.rows[0]!.interestPaid).toBe(0)
  })

  it('全期間の月々CFは一定(家賃保証前提で変動させない)', () => {
    const s = simulate(baseInput)
    expect(s.rows.every((r) => r.rentIncome === s.rows[0]!.rentIncome)).toBe(true)
  })
})
