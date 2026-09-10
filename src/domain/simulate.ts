import { amortize, landInterestRatio } from './loan'
import { annualDepreciation, depreciationBases, usefulLifeFor } from './depreciation'
import { FIXTURES_USEFUL_LIFE, STRUCTURES, effectiveFixturesPrice } from './structures'
import {
  MAX_SIMULATION_YEARS,
  MIN_SIMULATION_YEARS,
  RESIDENT_TAX_PERCENT,
  type ProposalInput,
  type Simulation,
  type YearRow,
} from './types'
import {
  annualize,
  floorYen,
  perMonth,
  perYear,
  rate,
  rateFromPercent,
  yen,
  type Rate,
  type Yen,
  type YenPerYear,
} from './units'

const y = (n: number): Yen => yen(floorYen(n))
const py = (n: number): YenPerYear => perYear(floorYen(n))

/** 試算期間を範囲内の整数に丸める。範囲外は validate が弾くが、計算側でも壊れないようにする */
export function clampSimulationYears(n: number): number {
  if (!Number.isFinite(n)) return MIN_SIMULATION_YEARS
  return Math.min(MAX_SIMULATION_YEARS, Math.max(MIN_SIMULATION_YEARS, Math.trunc(n)))
}

/**
 * 提案書の全数値を1回で算出する。
 *
 * 空室率・家賃下落は考慮しない(家賃保証前提)。初年度の減価償却は月割せず満1年分を計上する。
 * 償却終了後に不動産所得が黒字へ転じた年の節税額は 0 とし、増税としては表示しない。
 */
export function simulate(input: ProposalInput): Simulation {
  const fixturesPrice = effectiveFixturesPrice(input.structure, input.fixturesPrice)
  const landPrice = y(input.price - input.buildingPrice)
  const loanPrincipal = y(Math.max(0, input.price - input.ownFunds))

  // 試算期間は物件ごとの入力。顧客が「あと何年働くか」に合わせて決める(D10d)。
  const simulationYears = clampSimulationYears(input.simulationYears)

  // --- 耐用年数 ---
  const statutory = STRUCTURES[input.structure].usefulLife
  const usefulLife = usefulLifeFor(statutory, input.ageYears)
  const fixturesUsefulLife =
    fixturesPrice > 0 ? usefulLifeFor(FIXTURES_USEFUL_LIFE, input.ageYears) : null

  // --- 償却基礎 ---
  const bases = depreciationBases({
    price: input.price,
    buildingPrice: input.buildingPrice,
    fixturesPrice,
    brokerageFee: input.brokerageFee,
  })

  // --- ローン ---
  // 返済表は試算期間と返済期間の長い方まで回す。年次明細は試算期間で打ち切り、
  // 残債グラフは返済期間の全年(完済まで)を使う
  const loanTermYears = Math.max(0, Math.trunc(input.loanTermYears))
  // 年次は試算期間と返済期間の長い方まで計算し、用途ごとに切り出す
  const horizonYears = Math.max(simulationYears, loanTermYears)
  const schedule = amortize(loanPrincipal, input.interestRate, input.loanTermYears, horizonYears)
  const loanBalanceSeries = schedule.years
    .slice(0, loanTermYears)
    .map((ly) => ({ year: ly.year, balanceEnd: y(ly.balanceEnd) }))
  const landRatio = landInterestRatio(loanPrincipal, input.buildingPrice)

  // --- 月々CF (全期間一定) ---
  const monthlyCashFlow = perMonth(
    floorYen(
      input.guaranteedRentMonthly -
        input.managementFeeMonthly -
        schedule.monthlyPayment -
        input.propertyTaxAnnual / 12,
    ),
  )

  // --- 税率 ---
  const combinedTaxRate = rateFromPercent(input.incomeTaxRatePercent + RESIDENT_TAX_PERCENT)

  // --- 年次 ---
  const rentIncome = py(annualize(input.guaranteedRentMonthly))
  const allRows: YearRow[] = []
  let totalTaxSaving = 0

  for (let year = 1; year <= horizonYears; year++) {
    const loanYear = schedule.years[year - 1]
    const interestPaid = loanYear ? loanYear.interest : 0
    const balanceEnd = loanYear ? loanYear.balanceEnd : 0

    const depreciation =
      annualDepreciation(bases.shell, usefulLife, year) +
      (fixturesUsefulLife === null
        ? 0
        : annualDepreciation(bases.fixtures, fixturesUsefulLife, year))

    // ローン事務手数料と登記費用(登録免許税・司法書士報酬)は初年度の必要経費
    const otherExpenses =
      annualize(input.managementFeeMonthly) +
      input.propertyTaxAnnual +
      (year === 1 ? input.loanArrangementFee + input.registrationFee : 0)

    const realEstateIncome = rentIncome - depreciation - interestPaid - otherExpenses
    const landInterest = interestPaid * landRatio

    // 赤字のうち土地取得に対応する負債利子の部分は損益通算できない(措法41条の4)
    const deductibleLoss = Math.max(0, -realEstateIncome - landInterest)
    const taxSaving = deductibleLoss * combinedTaxRate

    // 節税効果合計は試算期間の分だけ
    if (year <= simulationYears) totalTaxSaving += floorYen(taxSaving)

    allRows.push({
      year,
      age: input.currentAge + year,
      rentIncome,
      depreciation: py(depreciation),
      interestPaid: py(interestPaid),
      landInterest: py(landInterest),
      otherExpenses: py(otherExpenses),
      realEstateIncome: py(realEstateIncome),
      deductibleLoss: py(deductibleLoss),
      taxSaving: py(taxSaving),
      loanBalanceEnd: y(balanceEnd),
    })
  }

  const initialCosts = y(input.brokerageFee + input.loanArrangementFee + input.registrationFee)

  return {
    monthlyCashFlow,
    monthlyPayment: perMonth(floorYen(schedule.monthlyPayment)),
    loanPrincipal,
    landPrice,
    initialCosts,
    initialCashOutlay: y(input.ownFunds + initialCosts),
    monthlyPropertyTax: perMonth(floorYen(input.propertyTaxAnnual / 12)),
    usefulLife,
    fixturesUsefulLife,
    shellBasis: y(bases.shell),
    fixturesBasis: y(bases.fixtures),
    landInterestRatio: rate(landRatio) as Rate,
    combinedTaxRate,
    simulationYears,
    totalTaxSaving: y(totalTaxSaving),
    rows: allRows.slice(0, simulationYears),
    scheduleRows: allRows.slice(0, loanTermYears),
    loanBalanceSeries,
  }
}
