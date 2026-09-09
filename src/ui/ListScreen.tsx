import { useRef } from 'react'
import { simulate } from '../domain/simulate'
import { validate } from '../domain/validate'
import type { SavedProposal } from '../storage/types'
import { dateText, signedYenText, yenText } from './format'

interface Props {
  proposals: SavedProposal[]
  onCreate: () => void
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onExport: () => void
  onImport: (file: File) => void
  message: string | null
}

export function ListScreen({
  proposals,
  onCreate,
  onOpen,
  onDuplicate,
  onDelete,
  onExport,
  onImport,
  message,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="list">
      <header className="toolbar">
        <h1>提案書一覧</h1>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-quiet" onClick={onExport}>
            JSONエクスポート
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => fileRef.current?.click()}
          >
            JSONインポート
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            新規作成
          </button>
        </div>
      </header>

      {message && <p className="banner">{message}</p>}

      {proposals.length === 0 ? (
        <p className="empty">
          まだ提案書がありません。「新規作成」から物件情報を入力してください。
        </p>
      ) : (
        <ul className="cards">
          {proposals.map((p) => {
            const complete = validate(p.input).length === 0
            const sim = complete ? simulate(p.input) : null
            return (
              <li key={p.id} className="card">
                <button type="button" className="card-main" onClick={() => onOpen(p.id)}>
                  <span className="card-title">
                    {p.input.propertyName || `(物件名未入力) ${dateText(p.createdAt)}`}
                  </span>
                  <span className="card-sub">
                    {p.input.customerName || `作成 ${dateText(p.createdAt)}`}
                  </span>
                  <span className="card-figures">
                    {sim ? (
                      <>
                        <span>
                          月々CF{' '}
                          <strong className={sim.monthlyCashFlow < 0 ? 'is-negative' : ''}>
                            {signedYenText(sim.monthlyCashFlow)}
                          </strong>
                        </span>
                        <span>
                          節税効果合計 <strong>{yenText(sim.totalTaxSaving)}</strong>
                        </span>
                      </>
                    ) : (
                      <span className="card-incomplete">入力が未完了です</span>
                    )}
                  </span>
                  <span className="card-date">更新 {dateText(p.updatedAt)}</span>
                </button>
                <div className="card-actions">
                  <button type="button" className="btn btn-quiet" onClick={() => onDuplicate(p.id)}>
                    複製
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => onDelete(p.id)}>
                    削除
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
