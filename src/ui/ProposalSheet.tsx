import { STRUCTURES } from '../domain/structures'
import { RESIDENT_TAX_PERCENT, type Simulation } from '../domain/types'
import type { SavedProposal } from '../storage/types'
import { manText, signedYenText, yenText } from './format'
import { LoanBalanceChart, TaxSavingChart } from './Charts'
import { useObjectUrl } from './useObjectUrl'

interface Props {
  proposal: SavedProposal
  sim: Simulation
  showSchedule: boolean
}

export function ProposalSheet({ proposal, sim, showSchedule }: Props) {
  const { input } = proposal
  const photo = useObjectUrl(proposal.photo)
  const years = sim.rows.map((r) => r.year)
  const taxRate = input.incomeTaxRatePercent + RESIDENT_TAX_PERCENT

  return (
    <>
      <section className="sheet" aria-label="提案書 1枚目">
        <header className="sheet-head">
          <h1 className="property-name">{input.propertyName || '(物件名未入力)'}</h1>
          <p className="property-address">住所：{input.address}</p>
        </header>

        <div className="sheet-top">
          <figure className="property-photo">
            {photo ? (
              <img src={photo} alt={input.propertyName} />
            ) : (
              <div className="image-placeholder">写真</div>
            )}
          </figure>

          <div className="sheet-side">
            <section className="facts-card">
              <h2 className="card-bar">物件条件</h2>
              <dl className="facts">
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
                    金利 {(input.interestRate * 100).toFixed(3)}% / {input.loanTermYears}年
                  </dd>
                </div>
                <div>
                  <dt>月々のキャッシュフロー</dt>
                  <dd className={sim.monthlyCashFlow < 0 ? 'is-negative' : ''}>
                    {signedYenText(sim.monthlyCashFlow)}
                  </dd>
                </div>
                <div>
                  <dt>適用税率</dt>
                  <dd>
                    {taxRate}%
                    <span className="fact-sub">
                      (所得税 {input.incomeTaxRatePercent}% + 住民税 {RESIDENT_TAX_PERCENT}%)
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="saving-card">
              <h2 className="rule-title">{sim.simulationYears}年間の節税効果 合計</h2>
              <p className="saving-value">{yenText(sim.totalTaxSaving)}</p>
            </section>
          </div>
        </div>

        <div className="sheet-charts">
          <figure className="chart-card">
            <figcaption>
              <span className="rule-title">年間節税額の推移</span>
              <span className="chart-unit">(万円)</span>
            </figcaption>
            <div className="chart-box">
              <TaxSavingChart years={years} values={sim.rows.map((r) => r.taxSaving)} />
            </div>
          </figure>

          <figure className="chart-card">
            <figcaption>
              <span className="rule-title">ローン残債の推移</span>
              <span className="chart-unit">(万円)</span>
            </figcaption>
            <div className="chart-box">
              <LoanBalanceChart years={years} values={sim.rows.map((r) => r.loanBalanceEnd)} />
            </div>
          </figure>
        </div>

        <footer className="sheet-notes">
          <p>
            ※ 年間節税額 = (不動産所得の赤字 − 土地取得に対応する借入金利子) × {taxRate}%。
            減価償却は{STRUCTURES[input.structure].label}・築{input.ageYears}年から 耐用年数
            {sim.usefulLife}年
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
          <h2 className="rule-title">年次明細</h2>
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
          <p className="schedule-note">購入から {sim.simulationYears}年間 を試算しています。</p>
        </section>
      )}
    </>
  )
}
