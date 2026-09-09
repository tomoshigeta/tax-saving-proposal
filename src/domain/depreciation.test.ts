import { describe, expect, it } from 'vitest'
import { annualDepreciation, depreciationBases, usefulLifeFor } from './depreciation'

describe('usefulLifeFor', () => {
  it('新築は法定耐用年数をそのまま使う', () => {
    expect(usefulLifeFor(47, 0)).toBe(47)
    expect(usefulLifeFor(22, 0)).toBe(22)
  })

  it('法定耐用年数の一部を経過: (法定 - 経過) + 経過 x 20%', () => {
    // 木造22年 築7年 -> (22-7) + 7*0.2 = 16.4 -> 16年
    expect(usefulLifeFor(22, 7)).toBe(16)
    // RC47年 築20年 -> (47-20) + 20*0.2 = 31年
    expect(usefulLifeFor(47, 20)).toBe(31)
  })

  it('法定耐用年数を全部経過: 法定 x 20%', () => {
    // 木造22年 築25年 -> 22*0.2 = 4.4 -> 4年
    expect(usefulLifeFor(22, 25)).toBe(4)
    // 設備15年 築20年 -> 15*0.2 = 3年
    expect(usefulLifeFor(15, 20)).toBe(3)
    // 経過年数がちょうど法定耐用年数
    expect(usefulLifeFor(22, 22)).toBe(4)
  })

  it('年未満は切り捨てる', () => {
    // RC47年 築1年 -> (47-1) + 0.2 = 46.2 -> 46年
    expect(usefulLifeFor(47, 1)).toBe(46)
  })

  it('下限は2年', () => {
    expect(usefulLifeFor(5, 100)).toBe(2)
  })
})

describe('depreciationBases', () => {
  const args = {
    price: 30_000_000,
    buildingPrice: 12_000_000,
    fixturesPrice: 2_400_000,
    brokerageFee: 990_000,
  }

  it('仲介手数料の建物対応分を取得価額に加算し、本体と設備に按分する', () => {
    // 建物分の仲介手数料 = 990,000 * 12,000,000/30,000,000 = 396,000
    // 本体 = 9,600,000 + 396,000 * 0.8 = 9,916,800
    // 設備 = 2,400,000 + 396,000 * 0.2 = 2,479,200
    const { shell, fixtures } = depreciationBases(args)
    expect(shell).toBeCloseTo(9_916_800, 0)
    expect(fixtures).toBeCloseTo(2_479_200, 0)
    // 合計は 建物価格 + 建物分の仲介手数料
    expect(shell + fixtures).toBeCloseTo(12_396_000, 0)
  })

  it('土地対応分の仲介手数料は償却基礎に入らない', () => {
    const { shell, fixtures } = depreciationBases(args)
    expect(shell + fixtures).toBeLessThan(args.buildingPrice + args.brokerageFee)
  })

  it('設備を分けない場合は全額が本体', () => {
    const { shell, fixtures } = depreciationBases({ ...args, fixturesPrice: 0 })
    expect(shell).toBeCloseTo(12_396_000, 0)
    expect(fixtures).toBe(0)
  })

  it('建物価格が0なら償却基礎も0', () => {
    expect(depreciationBases({ ...args, buildingPrice: 0, fixturesPrice: 0 })).toEqual({
      shell: 0,
      fixtures: 0,
    })
  })
})

describe('annualDepreciation', () => {
  it('耐用年数の間は定額', () => {
    expect(annualDepreciation(9_916_800, 31, 1)).toBeCloseTo(319_896.77, 2)
    expect(annualDepreciation(9_916_800, 31, 31)).toBeCloseTo(319_896.77, 2)
  })

  it('耐用年数を過ぎた年は0', () => {
    expect(annualDepreciation(9_916_800, 31, 32)).toBe(0)
    expect(annualDepreciation(2_479_200, 3, 4)).toBe(0)
  })
})
