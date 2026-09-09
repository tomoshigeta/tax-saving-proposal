import { amortize, landInterestRatio } from './loan'
import { annualDepreciation, depreciationBases, usefulLifeFor } from './depreciation'
import { FIXTURES_USEFUL_LIFE, STRUCTURES, effectiveFixturesPrice } from './structures'
import {
  RESIDENT_TAX_PERCENT,
  SIMULATION_YEARS,
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

  // 試算期間は SIMULATION_YEARS 固定。顧客の定年時期には依存させない。
  const simulationYears = SIMULATION_YEARS

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
  const schedule = amortize(loanPrincipal, input.interestRate, input.loanTermYears, simulationYears)
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
  const rows: YearRow[] = []
  let totalTaxSaving = 0

  for (let year = 1; year <= simulationYears; year++) {
    const loanYear = schedule.years[year - 1]
    const interestPaid = loanYear ? loanYear.interest : 0
    const balanceEnd = loanYear ? loanYear.balanceEnd : 0

    const depreciation =
      annualDepreciation(bases.shell, usefulLife, year) +
      (fixturesUsefulLife === null
        ? 0
        : annualDepreciation(bases.fixtures, fixturesUsefulLife, year))

    const otherExpenses =
      annualize(input.managementFeeMonthly) +
      input.propertyTaxAnnual +
      (year === 1 ? input.loanArrangementFee : 0)

    const realEstateIncome = rentIncome - depreciation - interestPaid - otherExpenses
    const landInterest = interestPaid * landRatio

    // 赤字のうち土地取得に対応する負債利子の部分は損益通算できない(措法41条の4)
    const deductibleLoss = Math.max(0, -realEstateIncome - landInterest)
    const taxSaving = deductibleLoss * combinedTaxRate

    totalTaxSaving += floorYen(taxSaving)

    rows.push({
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

  return {
    monthlyCashFlow,
    monthlyPayment: perMonth(floorYen(schedule.monthlyPayment)),
    loanPrincipal,
    landPrice,
    initialCashOutlay: y(input.ownFunds + input.brokerageFee + input.loanArrangementFee),
    usefulLife,
    fixturesUsefulLife,
    shellBasis: y(bases.shell),
    fixturesBasis: y(bases.fixtures),
    landInterestRatio: rate(landRatio) as Rate,
    combinedTaxRate,
    simulationYears,
    totalTaxSaving: y(totalTaxSaving),
    rows,
  }
}
