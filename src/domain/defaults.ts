import type { ProposalInput } from './types'
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
  guaranteedRentMonthly: perMonth(0),
  managementFeeMonthly: perMonth(0),
  propertyTaxAnnual: perYear(0),
  currentAge: 40,
  retirementAge: 65,
  incomeTaxRatePercent: 33,
})
