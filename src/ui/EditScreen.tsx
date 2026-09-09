import { useMemo, useState } from 'react'
import { STRUCTURES, STRUCTURE_KEYS, allowsFixtureSplit } from '../domain/structures'
import { INCOME_TAX_RATES, RESIDENT_TAX_PERCENT, type ProposalInput } from '../domain/types'
import { simulate } from '../domain/simulate'
import { validate } from '../domain/validate'
import { normalizeImage } from '../storage/images'
import type { SavedProposal } from '../storage/types'
import { manText, percentText, signedYenText, yenText } from './format'
import { ImageField, NumberField, TextField } from './fields'
import { useObjectUrl } from './useObjectUrl'

interface Props {
  proposal: SavedProposal
  onChange: (next: SavedProposal) => void
  onSave: () => void
  onPreview: () => void
  onBack: () => void
  saving: boolean
}

export function EditScreen({ proposal, onChange, onSave, onPreview, onBack, saving }: Props) {
  const [imageError, setImageError] = useState<string | null>(null)
  const { input } = proposal

  const set = <K extends keyof ProposalInput>(key: K, value: ProposalInput[K]) =>
    onChange({ ...proposal, input: { ...input, [key]: value } })

  const errors = useMemo(() => validate(input), [input])
  const errorFor = (field: keyof ProposalInput) => errors.find((e) => e.field === field)?.message
  const sim = useMemo(() => (errors.length === 0 ? simulate(input) : null), [input, errors])

  const floorPlanUrl = useObjectUrl(proposal.floorPlan)
  const exteriorUrl = useObjectUrl(proposal.exterior)

  const pickImage = async (key: 'floorPlan' | 'exterior', file: File) => {
    setImageError(null)
    try {
      onChange({ ...proposal, [key]: await normalizeImage(file) })
    } catch {
      setImageError('この画像は読み込めませんでした。別のファイルを試してください。')
    }
  }

  const fixtureSplitAllowed = allowsFixtureSplit(input.structure)

  return (
    <div className="edit">
      <header className="toolbar">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← 一覧
        </button>
        <h1>物件情報の入力</h1>
        <div className="toolbar-actions">
          <button type="button" className="btn" onClick={onSave} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onPreview}
            disabled={errors.length > 0}
          >
            提案書をプレビュー
          </button>
        </div>
      </header>

      <div className="edit-body">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>物件</legend>
            <TextField
              label="物件名"
              value={input.propertyName}
              onChange={(v) => set('propertyName', v)}
              placeholder="例: グランドメゾン新宿 101"
              error={errorFor('propertyName')}
            />
            <TextField
              label="顧客名(任意)"
              value={input.customerName}
              onChange={(v) => set('customerName', v)}
            />
            <TextField
              label="住所"
              value={input.address}
              onChange={(v) => set('address', v)}
              error={errorFor('address')}
            />

            <ImageField
              label="間取り図"
              url={floorPlanUrl}
              onPick={(f) => void pickImage('floorPlan', f)}
              onClear={() => onChange({ ...proposal, floorPlan: null })}
            />
            <ImageField
              label="外観写真"
              url={exteriorUrl}
              onPick={(f) => void pickImage('exterior', f)}
              onClear={() => onChange({ ...proposal, exterior: null })}
            />
            {imageError && <p className="form-error">{imageError}</p>}

            <NumberField
              label="物件価格"
              value={input.price}
              onChange={(n) => set('price', n as ProposalInput['price'])}
              step={10_000}
              error={errorFor('price')}
            />
            <NumberField
              label="建物価格"
              value={input.buildingPrice}
              onChange={(n) => set('buildingPrice', n as ProposalInput['buildingPrice'])}
              step={10_000}
              hint={`土地価格は ${manText(Math.max(0, input.price - input.buildingPrice))}`}
              error={errorFor('buildingPrice')}
            />

            <label className="field">
              <span className="field-label">建物構造</span>
              <span className="field-input">
                <select
                  value={input.structure}
                  onChange={(e) =>
                    set('structure', e.target.value as ProposalInput['structure'])
                  }
                >
                  {STRUCTURE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {STRUCTURES[key].label}(法定{STRUCTURES[key].usefulLife}年)
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <NumberField
              label="うち設備価格"
              value={input.fixturesPrice}
              onChange={(n) => set('fixturesPrice', n as ProposalInput['fixturesPrice'])}
              step={10_000}
              disabled={!fixtureSplitAllowed}
              hint={
                fixtureSplitAllowed
                  ? '建物価格の内数。設備は15年で別に償却します'
                  : '設備の分離償却はRC造のみです'
              }
              error={errorFor('fixturesPrice')}
            />
            <NumberField
              label="築年数"
              value={input.ageYears}
              onChange={(n) => set('ageYears', n)}
              suffix="年"
              hint="0 なら新築"
              error={errorFor('ageYears')}
            />
          </fieldset>

          <fieldset>
            <legend>資金</legend>
            <NumberField
              label="自己資金"
              value={input.ownFunds}
              onChange={(n) => set('ownFunds', n as ProposalInput['ownFunds'])}
              step={10_000}
              hint={`借入額は ${manText(Math.max(0, input.price - input.ownFunds))}`}
              error={errorFor('ownFunds')}
            />
            <NumberField
              label="ローン金利"
              value={input.interestRate * 100}
              onChange={(n) => set('interestRate', (n / 100) as ProposalInput['interestRate'])}
              suffix="%"
              step={0.01}
              error={errorFor('interestRate')}
            />
            <NumberField
              label="返済期間"
              value={input.loanTermYears}
              onChange={(n) => set('loanTermYears', n)}
              suffix="年"
              error={errorFor('loanTermYears')}
            />
            <NumberField
              label="仲介手数料"
              value={input.brokerageFee}
              onChange={(n) => set('brokerageFee', n as ProposalInput['brokerageFee'])}
              step={10_000}
              hint="現金支出。税務上の経費ではなく、建物分は取得価額に算入します"
            />
            <NumberField
              label="ローン事務手数料"
              value={input.loanArrangementFee}
              onChange={(n) =>
                set('loanArrangementFee', n as ProposalInput['loanArrangementFee'])
              }
              step={10_000}
              hint="現金支出かつ初年度の必要経費"
            />
          </fieldset>

          <fieldset>
            <legend>収支</legend>
            <NumberField
              label="保証月額家賃"
              value={input.guaranteedRentMonthly}
              onChange={(n) =>
                set('guaranteedRentMonthly', n as ProposalInput['guaranteedRentMonthly'])
              }
              suffix="円/月"
              step={1_000}
              error={errorFor('guaranteedRentMonthly')}
            />
            <NumberField
              label="管理費・修繕積立金"
              value={input.managementFeeMonthly}
              onChange={(n) =>
                set('managementFeeMonthly', n as ProposalInput['managementFeeMonthly'])
              }
              suffix="円/月"
              step={1_000}
              error={errorFor('managementFeeMonthly')}
            />
            <NumberField
              label="固定資産税・都市計画税"
              value={input.propertyTaxAnnual}
              onChange={(n) => set('propertyTaxAnnual', n as ProposalInput['propertyTaxAnnual'])}
              suffix="円/年"
              step={1_000}
              hint="年額で入力してください"
              error={errorFor('propertyTaxAnnual')}
            />
          </fieldset>

          <fieldset>
            <legend>顧客</legend>
            <NumberField
              label="現在年齢"
              value={input.currentAge}
              onChange={(n) => set('currentAge', n)}
              suffix="歳"
              error={errorFor('currentAge')}
            />
            <NumberField
              label="定年年齢"
              value={input.retirementAge}
              onChange={(n) => set('retirementAge', n)}
              suffix="歳"
              error={errorFor('retirementAge')}
            />
            <label className="field">
              <span className="field-label">所得税率</span>
              <span className="field-input">
                <select
                  value={input.incomeTaxRatePercent}
                  onChange={(e) =>
                    set(
                      'incomeTaxRatePercent',
                      Number(e.target.value) as ProposalInput['incomeTaxRatePercent'],
                    )
                  }
                >
                  {INCOME_TAX_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </span>
              <span className="field-hint">
                住民税 {RESIDENT_TAX_PERCENT}% と合わせて{' '}
                {input.incomeTaxRatePercent + RESIDENT_TAX_PERCENT}% で試算します
              </span>
            </label>
          </fieldset>
        </form>

        <aside className="summary">
          <h2>試算結果</h2>
          {sim ? (
            <>
              <dl className="summary-list">
                <div className="summary-hero">
                  <dt>月々のキャッシュフロー</dt>
                  <dd className={sim.monthlyCashFlow < 0 ? 'is-negative' : ''}>
                    {signedYenText(sim.monthlyCashFlow)}
                  </dd>
                </div>
                <div className="summary-hero">
                  <dt>定年までの節税効果 合計</dt>
                  <dd>{yenText(sim.totalTaxSaving)}</dd>
                </div>
                <div>
                  <dt>借入額</dt>
                  <dd>{yenText(sim.loanPrincipal)}</dd>
                </div>
                <div>
                  <dt>月々返済額</dt>
                  <dd>{yenText(sim.monthlyPayment)}</dd>
                </div>
                <div>
                  <dt>手元初期支出</dt>
                  <dd>{yenText(sim.initialCashOutlay)}</dd>
                </div>
                <div>
                  <dt>建物の耐用年数</dt>
                  <dd>{sim.usefulLife}年</dd>
                </div>
                <div>
                  <dt>設備の耐用年数</dt>
                  <dd>{sim.fixturesUsefulLife === null ? '—' : `${sim.fixturesUsefulLife}年`}</dd>
                </div>
                <div>
                  <dt>土地対応の借入割合</dt>
                  <dd>{percentText(sim.landInterestRatio, 1)}</dd>
                </div>
                <div>
                  <dt>初年度の不動産所得</dt>
                  <dd>{signedYenText(sim.rows[0]?.realEstateIncome ?? 0)}</dd>
                </div>
                <div>
                  <dt>節税額が出る年</dt>
                  <dd>
                    {sim.rows.some((r) => r.taxSaving > 0)
                      ? `1〜${sim.rows.filter((r) => r.taxSaving > 0).at(-1)?.year}年目`
                      : 'なし'}
                  </dd>
                </div>
              </dl>
              {sim.totalTaxSaving === 0 && (
                <p className="summary-warning">
                  この条件では損益通算できる赤字が出ないため、節税効果合計が0円になります。
                </p>
              )}
            </>
          ) : (
            <ul className="summary-errors">
              {errors.map((e) => (
                <li key={`${e.field}-${e.message}`}>{e.message}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
