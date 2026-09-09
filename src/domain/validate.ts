import { STRUCTURES } from './structures'
import type { ProposalInput } from './types'

export interface FieldError {
  field: keyof ProposalInput
  message: string
}

/**
 * 入力の整合性チェック。1つでも返ればプレビューを生成しない。
 */
export function validate(input: ProposalInput): FieldError[] {
  const errors: FieldError[] = []
  const require = (field: keyof ProposalInput, ok: boolean, message: string) => {
    if (!ok) errors.push({ field, message })
  }

  require('propertyName', input.propertyName.trim().length > 0, '物件名は必須です')
  require('address', input.address.trim().length > 0, '住所は必須です')
  require('price', input.price > 0, '物件価格を入力してください')
  require('buildingPrice', input.buildingPrice > 0, '建物価格を入力してください')
  require(
    'buildingPrice',
    input.buildingPrice <= input.price,
    '建物価格が物件価格を超えています',
  )
  if (STRUCTURES[input.structure].allowsFixtureSplit) {
    require(
      'fixturesPrice',
      input.fixturesPrice <= input.buildingPrice,
      '設備価格が建物価格を超えています',
    )
  }
  require('ageYears', input.ageYears >= 0, '築年数は0以上で入力してください')
  require('ownFunds', input.ownFunds >= 0, '自己資金は0以上で入力してください')
  require('ownFunds', input.ownFunds <= input.price, '自己資金が物件価格を超えています')
  require('interestRate', input.interestRate >= 0, '金利は0以上で入力してください')
  require('loanTermYears', input.loanTermYears > 0, '返済期間を入力してください')
  require('guaranteedRentMonthly', input.guaranteedRentMonthly > 0, '保証月額家賃を入力してください')
  require('managementFeeMonthly', input.managementFeeMonthly >= 0, '管理費は0以上で入力してください')
  require('propertyTaxAnnual', input.propertyTaxAnnual >= 0, '固都税は0以上で入力してください')
  require('currentAge', input.currentAge > 0, '現在年齢を入力してください')
  require(
    'retirementAge',
    input.retirementAge > input.currentAge,
    '定年年齢は現在年齢より大きい必要があります',
  )

  return errors
}
