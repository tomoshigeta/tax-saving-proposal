import { STRUCTURES } from '../domain/structures'
import type { Simulation } from '../domain/types'
import type { SavedProposal } from '../storage/types'
import { RESIDENT_TAX_PERCENT } from '../domain/types'
import { manText, percentText, signedYenText, yenText } from './format'
import { LoanBalanceChart, TaxSavingChart } from './Charts'
import { useObjectUrl } from './useObjectUrl'

interface Props {
  proposal: SavedProposal
  sim: Simulation
  showSchedule: boolean
}

export function ProposalSheet({ proposal, sim, showSchedule }: Props) {
  const { input } = proposal
  const floorPlan = useObjectUrl(proposal.floorPlan)
  const exterior = useObjectUrl(proposal.exterior)

  const years = sim.rows.map((r) => r.year)

  return (
    <>
      <section className="sheet" aria-label="提案書 1枚目">
        <div className="sheet-top">
          <div className="sheet-property">
            <h1 className="property-name">{input.propertyName || '(物件名未入力)'}</h1>
            <p className="property-address">{input.address}</p>
            <div className="property-images">
              <figure>
                {floorPlan ? (
                  <img src={floorPlan} alt="間取り図" />
                ) : (
                  <div className="image-placeholder">間取り図</div>
                )}
              </figure>
              <figure>
                {exterior ? (
                  <img src={exterior} alt="外観写真" />
                ) : (
                  <div className="image-placeholder">外観写真</div>
                )}
              </figure>
            </div>
          </div>

          <dl className="sheet-facts">
            <div>
              <dt>物件価格</dt>
              <dd>{manText(input.price)}</dd>
            </div>
            <div>
              <dt>自己資金</dt>
              <dd>{manText(input.ownFunds)}</dd>
            </div>
            <div>
              <dt>借入額</dt>
              <dd>{manText(sim.loanPrincipal)}</dd>
            </div>
            <div>
              <dt>ローン条件</dt>
              <dd>
                金利 {percentText(input.interestRate, 3)} / {input.loanTermYears}年
              </dd>
            </div>
            <div>
              <dt>適用税率</dt>
              <dd>
                {input.incomeTaxRatePercent + RESIDENT_TAX_PERCENT}%
                <span className="fact-sub">
                  (所得税 {input.incomeTaxRatePercent}% + 住民税 {RESIDENT_TAX_PERCENT}%)
                </span>
              </dd>
            </div>
            <div>
              <dt>定年までの年数</dt>
              <dd>{sim.yearsToRetirement}年</dd>
            </div>
          </dl>
        </div>

        <div className="sheet-hero">
          <div className="hero">
            <p className="hero-label">月々のキャッシュフロー</p>
            <p className={`hero-value ${sim.monthlyCashFlow < 0 ? 'is-negative' : ''}`}>
              {signedYenText(sim.monthlyCashFlow)}
            </p>
          </div>
          <div className="hero">
            <p className="hero-label">定年までの節税効果 合計</p>
            <p className="hero-value">{yenText(sim.totalTaxSaving)}</p>
          </div>
        </div>

        <div className="sheet-charts">
          <figure className="chart-figure">
            <figcaption>年間節税額の推移</figcaption>
            <div className="chart-box">
              <TaxSavingChart years={years} values={sim.rows.map((r) => r.taxSaving)} />
            </div>
          </figure>
          <figure className="chart-figure">
            <figcaption>ローン残債の推移</figcaption>
            <div className="chart-box">
              <LoanBalanceChart years={years} values={sim.rows.map((r) => r.loanBalanceEnd)} />
            </div>
          </figure>
        </div>

        <footer className="sheet-notes">
          <p>
            ※ 年間節税額 = (不動産所得の赤字 − 土地取得に対応する借入金利子) ×{' '}
            {input.incomeTaxRatePercent + RESIDENT_TAX_PERCENT}%。
            減価償却は{STRUCTURES[input.structure].label}・築{input.ageYears}年から
            耐用年数{sim.usefulLife}年
            {sim.fixturesUsefulLife !== null && `(設備 ${sim.fixturesUsefulLife}年)`}
            として定額法で算出しています。
          </p>
          <p>
            ※
            保証賃料は契約に定める期間ごとの改定対象であり、本試算は現行の保証賃料が継続する前提です。
          </p>
          <p>
            ※ 所得税率 {input.incomeTaxRatePercent}% ・ 住民税 {RESIDENT_TAX_PERCENT}%
            で試算しています。
          </p>
        </footer>
      </section>

      {showSchedule && (
        <section className="sheet sheet-schedule" aria-label="提案書 2枚目 年次明細">
          <h2>年次明細</h2>
          <table className="schedule">
            <thead>
              <tr>
                <th>年</th>
                <th>年齢</th>
                <th>賃料収入</th>
                <th>減価償却費</th>
                <th>支払利息</th>
                <th>うち土地分</th>
                <th>その他経費</th>
                <th>不動産所得</th>
                <th>通算可能な赤字</th>
                <th>年間節税額</th>
                <th>ローン残債</th>
              </tr>
            </thead>
            <tbody>
              {sim.rows.map((r) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>{r.age}</td>
                  <td>{yenText(r.rentIncome)}</td>
                  <td>{yenText(r.depreciation)}</td>
                  <td>{yenText(r.interestPaid)}</td>
                  <td>{yenText(r.landInterest)}</td>
                  <td>{yenText(r.otherExpenses)}</td>
                  <td>{signedYenText(r.realEstateIncome)}</td>
                  <td>{yenText(r.deductibleLoss)}</td>
                  <td>{yenText(r.taxSaving)}</td>
                  <td>{yenText(r.loanBalanceEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="schedule-note">
            現在年齢 {input.currentAge}歳 から定年 {input.retirementAge}歳 までの{' '}
            {sim.yearsToRetirement}年間を試算しています。
          </p>
        </section>
      )}
    </>
  )
}
