/**
 * 耐用年数と減価償却。償却方法は定額法(建物・建物附属設備とも法令上これ以外の選択肢がない)。
 */

/**
 * 中古資産の簡便法による耐用年数。
 *
 *   経過年数 >= 法定耐用年数  ->  法定耐用年数 x 20%
 *   経過年数 <  法定耐用年数  ->  (法定耐用年数 - 経過年数) + 経過年数 x 20%
 *
 * 月数で計算して年未満を切り捨て、下限2年。新築(経過年数0)は法定耐用年数をそのまま使う。
 * 出典: 国税庁 No.5404 中古資産の耐用年数
 */
export function usefulLifeFor(statutoryYears: number, ageYears: number): number {
  if (ageYears <= 0) return statutoryYears

  const statutoryMonths = statutoryYears * 12
  const ageMonths = ageYears * 12

  const months =
    ageMonths >= statutoryMonths
      ? statutoryMonths * 0.2
      : statutoryMonths - ageMonths + ageMonths * 0.2

  return Math.max(2, Math.floor(months / 12))
}

/**
 * 償却基礎。仲介手数料の建物対応分を建物の取得価額に加算したうえで、
 * 建物本体と設備に按分する。
 *
 * 仲介手数料は必要経費にならず、土地分は土地の取得価額、建物分は建物の取得価額に
 * 算入される(国税庁 質疑応答事例)。
 */
export function depreciationBases(args: {
  price: number
  buildingPrice: number
  fixturesPrice: number
  brokerageFee: number
}): { shell: number; fixtures: number } {
  const { price, buildingPrice, fixturesPrice, brokerageFee } = args
  if (buildingPrice <= 0) return { shell: 0, fixtures: 0 }

  const brokerageOnBuilding = price > 0 ? (brokerageFee * buildingPrice) / price : 0
  const shellPrice = buildingPrice - fixturesPrice

  return {
    shell: shellPrice + (brokerageOnBuilding * shellPrice) / buildingPrice,
    fixtures: fixturesPrice + (brokerageOnBuilding * fixturesPrice) / buildingPrice,
  }
}

/** 定額法。耐用年数を過ぎた年は 0 */
export function annualDepreciation(basis: number, usefulLife: number, year: number): number {
  if (usefulLife <= 0 || year > usefulLife) return 0
  return basis / usefulLife
}
