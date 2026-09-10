import { FIXTURES_USEFUL_LIFE, STRUCTURES, effectiveFixturesPrice } from '../domain/structures'
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
  // 残債グラフは試算期間ではなく返済期間の全年。必ず0に着地させる
  const loanYears = sim.loanBalanceSeries.map((b) => b.year)
  const taxRate = input.incomeTaxRatePercent + RESIDENT_TAX_PERCENT

  return (
    <>
      <section className="sheet" aria-label="提案書 1枚目">
        <header className="sheet-head">
          <h1 className="property-name">{input.propertyName || '(物件名未入力)'}</h1>
          {/* 右カラムに置き、「物件条件」カードの左端に揃える。縦は物件名の下端に合わせる */}
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
                  <dt>初期費用</dt>
                  <dd>{manText(sim.initialCosts)}</dd>
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
              <span className="chart-unit">(万円 ・ 返済期間 {input.loanTermYears}年)</span>
            </figcaption>
            <div className="chart-box">
              <LoanBalanceChart
                years={loanYears}
                values={sim.loanBalanceSeries.map((b) => b.balanceEnd)}
              />
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

          <CalculationBasis input={input} sim={sim} />
        </section>
      )}
    </>
  )
}

/**
 * 2枚目の下段「計算の根拠」。
 *
 * 左: 月々のキャッシュフローの内訳(縦の内訳表)
 * 右: 価格の内訳(土地 / 建物 / 建物本体・設備の按分)と耐用年数の導出
 *
 * 1枚目の数字が「何から出てきたか」を、明細表のすぐ下で辿れるようにする。
 */
function CalculationBasis({ input, sim }: { input: SavedProposal['input']; sim: Simulation }) {
  const structure = STRUCTURES[input.structure]
  const fixturesPrice = effectiveFixturesPrice(input.structure, input.fixturesPrice)
  const shellPrice = input.buildingPrice - fixturesPrice
  const hasFixtures = sim.fixturesUsefulLife !== null && fixturesPrice > 0
  const fixturesPercent =
    input.buildingPrice > 0 ? Math.round((fixturesPrice / input.buildingPrice) * 100) : 0
  const shellPercent = 100 - fixturesPercent

  // 月々CFはエンジン側で「賃料 − 管理費 − 返済額(端数あり) − 固都税/12(端数あり)」を
  // 最後に切り捨てている。各行を切り捨てて並べると合計が1〜2円ずれるので、
  // 固都税の行を差額で出して、内訳の足し算が答えと必ず一致するようにする。
  const propertyTaxLine =
    input.guaranteedRentMonthly -
    sim.monthlyPayment -
    input.managementFeeMonthly -
    sim.monthlyCashFlow

  const lifeText = (statutory: number) =>
    input.ageYears > 0
      ? `法定${statutory}年 ・ 築${input.ageYears}年 → 簡便法`
      : `法定${statutory}年(新築)`

  return (
    <section className="basis" aria-label="計算の根拠">
      <h2 className="rule-title">計算の根拠</h2>
      <div className="basis-grid">
        <div className="basis-card">
          <h3 className="card-bar">月々のキャッシュフローの内訳</h3>
          <table className="ledger">
            <tbody>
              <tr>
                <th>保証賃料</th>
                <td>{yenText(input.guaranteedRentMonthly)}</td>
              </tr>
              <tr>
                <th>ローン返済額(元利均等)</th>
                <td>{signedYenText(-sim.monthlyPayment)}</td>
              </tr>
              <tr>
                <th>管理費・修繕積立金</th>
                <td>{signedYenText(-input.managementFeeMonthly)}</td>
              </tr>
              <tr>
                <th>固定資産税・都市計画税(年額 ÷ 12)</th>
                <td>{signedYenText(-propertyTaxLine)}</td>
              </tr>
              <tr className="ledger-total">
                <th>月々のキャッシュフロー</th>
                <td className={sim.monthlyCashFlow < 0 ? 'is-negative' : ''}>
                  {signedYenText(sim.monthlyCashFlow)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="basis-note">
            ローン返済額は 借入額 {manText(sim.loanPrincipal)}・金利{' '}
            {(input.interestRate * 100).toFixed(3)}%・{input.loanTermYears}年 の元利均等返済。
            固定資産税・都市計画税は年額 {yenText(input.propertyTaxAnnual)} を12で割った額です。
          </p>
        </div>

        <div className="basis-card">
          <h3 className="card-bar">価格の内訳と耐用年数</h3>
          <table className="ledger">
            <tbody>
              <tr className="ledger-total">
                <th>物件価格</th>
                <td>{manText(input.price)}</td>
              </tr>
              <tr>
                <th className="indent-1">土地</th>
                <td>{manText(sim.landPrice)}</td>
              </tr>
              <tr>
                <th className="indent-1">建物</th>
                <td>{manText(input.buildingPrice)}</td>
              </tr>
              {hasFixtures && (
                <>
                  <tr>
                    <th className="indent-2">建物本体</th>
                    <td>
                      {manText(shellPrice)}
                      <span className="ledger-sub">{shellPercent}%</span>
                    </td>
                  </tr>
                  <tr>
                    <th className="indent-2">設備</th>
                    <td>
                      {manText(fixturesPrice)}
                      <span className="ledger-sub">{fixturesPercent}%</span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          <table className="ledger ledger-life">
            <tbody>
              <tr className="ledger-total">
                <th>耐用年数</th>
                <td />
              </tr>
              <tr>
                <th className="indent-1">{hasFixtures ? '建物本体' : '建物'}({structure.label})</th>
                <td>
                  <span className="ledger-derivation">{lifeText(structure.usefulLife)}</span>
                  <strong>{sim.usefulLife}年</strong>
                </td>
              </tr>
              {hasFixtures && (
                <tr>
                  <th className="indent-1">設備</th>
                  <td>
                    <span className="ledger-derivation">{lifeText(FIXTURES_USEFUL_LIFE)}</span>
                    <strong>{sim.fixturesUsefulLife}年</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="basis-note">
            {hasFixtures
              ? '建物価格のうち設備(建物附属設備)の割合で按分しています。'
              : `${structure.label}では設備を分けず、建物一本で償却します。`}
            中古の耐用年数は簡便法(経過年数が法定を超える場合は法定×20%、
            超えない場合は(法定−経過)＋経過×20%、年未満切り捨て)によります。
          </p>
        </div>
      </div>
    </section>
  )
}
