import { DEFAULT_SIMULATION_YEARS, type ProposalInput } from './types'
import { perMonth, perYear, rate, yen } from './units'

export const emptyInput = (): ProposalInput => ({
  propertyName: '',
  customerName: '',
  address: '',
  price: yen(0),
  buildingPrice: yen(0),
  fixturesPrice: yen(0),
  structure: 'rc',
  ageYears: 0,
  ownFunds: yen(0),
  interestRate: rate(0.02),
  loanTermYears: 35,
  brokerageFee: yen(0),
  loanArrangementFee: yen(0),
  registrationFee: yen(0),
  guaranteedRentMonthly: perMonth(0),
  managementFeeMonthly: perMonth(0),
  propertyTaxAnnual: perYear(0),
  currentAge: 50,
  incomeTaxRatePercent: 33,
  simulationYears: DEFAULT_SIMULATION_YEARS,
})

/**
 * 古い保存データやバックアップを読むときに、後から増えた項目を既定値で埋める。
 *
 * 登記費用 0・試算期間 15 で埋めれば、項目が増える前に作った提案書の数字は1円も変わらない。
 */
export const withDefaults = (raw: Partial<ProposalInput>): ProposalInput => ({
  ...emptyInput(),
  ...raw,
})
