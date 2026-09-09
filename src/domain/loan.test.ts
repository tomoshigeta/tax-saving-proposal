import { describe, expect, it } from 'vitest'
import { amortize, landInterestRatio } from './loan'

describe('amortize', () => {
  it('元利均等の月々返済額', () => {
    // 3,000万円 / 年利2% / 35年 -> 約99,378円
    const { monthlyPayment } = amortize(30_000_000, 0.02, 35, 35)
    expect(monthlyPayment).toBeCloseTo(99_378.5, 0)
  })

  it('初年度の支払利息と年末残債', () => {
    const { years } = amortize(30_000_000, 0.02, 35, 35)
    const first = years[0]!
    expect(first.interest).toBeCloseTo(594_568, -2)
    expect(first.balanceEnd).toBeCloseTo(29_402_026, -2)
  })

  it('返済期間の末尾で完済する', () => {
    const { years } = amortize(30_000_000, 0.02, 35, 35)
    expect(years.at(-1)!.balanceEnd).toBeCloseTo(0, 4)
  })

  it('元本返済の合計は借入額に一致する', () => {
    const { years } = amortize(30_000_000, 0.02, 35, 35)
    const repaid = years.reduce((sum, y) => sum + y.principal, 0)
    expect(repaid).toBeCloseTo(30_000_000, 4)
  })

  it('返済期間より長い期間を要求されたら完済後は0埋め', () => {
    const { years } = amortize(30_000_000, 0.02, 20, 30)
    expect(years).toHaveLength(30)
    expect(years[19]!.balanceEnd).toBeCloseTo(0, 4)
    expect(years[25]!.interest).toBe(0)
    expect(years[25]!.balanceEnd).toBe(0)
  })

  it('金利0%でも割り算が壊れない', () => {
    const { monthlyPayment, years } = amortize(12_000_000, 0, 10, 10)
    expect(monthlyPayment).toBeCloseTo(100_000, 4)
    expect(years[0]!.interest).toBe(0)
    expect(years.at(-1)!.balanceEnd).toBeCloseTo(0, 4)
  })

  it('借入なしなら全期間ゼロ', () => {
    const { monthlyPayment, years } = amortize(0, 0.02, 35, 10)
    expect(monthlyPayment).toBe(0)
    expect(years).toHaveLength(10)
    expect(years.every((y) => y.interest === 0 && y.balanceEnd === 0)).toBe(true)
  })
})

describe('landInterestRatio (建物優先充当)', () => {
  it('借入額が建物価格以下なら土地対応分はゼロ', () => {
    // 措令26条の6第2項: 負債はまず建物の対価に充てられたものとする
    expect(landInterestRatio(10_000_000, 12_000_000)).toBe(0)
    expect(landInterestRatio(12_000_000, 12_000_000)).toBe(0)
  })

  it('建物価格を超えた分だけが土地対応', () => {
    // 借入3,000万 / 建物1,200万 -> (3000-1200)/3000 = 0.6
    expect(landInterestRatio(30_000_000, 12_000_000)).toBeCloseTo(0.6, 10)
  })

  it('価格比按分より必ず有利(小さい)になる', () => {
    const price = 30_000_000
    const building = 12_000_000
    const loan = 20_000_000
    const proportional = (price - building) / price // 0.6
    expect(landInterestRatio(loan, building)).toBeLessThan(proportional)
  })

  it('借入なしならゼロ', () => {
    expect(landInterestRatio(0, 12_000_000)).toBe(0)
  })
})
