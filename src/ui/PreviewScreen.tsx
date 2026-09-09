import { useMemo, useState } from 'react'
import { simulate } from '../domain/simulate'
import type { SavedProposal } from '../storage/types'
import { ProposalSheet } from './ProposalSheet'

interface Props {
  proposal: SavedProposal
  onBack: () => void
}

export function PreviewScreen({ proposal, onBack }: Props) {
  const [showSchedule, setShowSchedule] = useState(false)
  const sim = useMemo(() => simulate(proposal.input), [proposal.input])

  return (
    <div className="preview">
      <header className="toolbar no-print">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← 編集に戻る
        </button>
        <h1>提案書プレビュー</h1>
        <div className="toolbar-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={showSchedule}
              onChange={(e) => setShowSchedule(e.target.checked)}
            />
            2枚目に年次明細を付ける
          </label>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            印刷 / PDF出力
          </button>
        </div>
      </header>

      <div className="sheets">
        <ProposalSheet proposal={proposal} sim={sim} showSchedule={showSchedule} />
      </div>
    </div>
  )
}
