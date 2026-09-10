import { useEffect, useMemo, useState } from 'react'
import { simulate } from '../domain/simulate'
import type { SavedProposal } from '../storage/types'
import { ProposalSheet } from './ProposalSheet'
import { pdfFileName } from './format'

interface Props {
  proposal: SavedProposal
  onBack: () => void
}

export function PreviewScreen({ proposal, onBack }: Props) {
  // 2枚目には年次明細と計算の根拠が載る。付け忘れより外し忘れの方がましなので既定オン
  const [showSchedule, setShowSchedule] = useState(true)
  const sim = useMemo(() => simulate(proposal.input), [proposal.input])

  // 「PDFに保存」のファイル名はページのタイトルから取られる。
  // この画面にいる間だけ「顧客名様物件名節税シミュレーション」にし、離れたら元に戻す
  const { customerName, propertyName } = proposal.input
  useEffect(() => {
    const original = document.title
    document.title = pdfFileName(customerName, propertyName)
    return () => {
      document.title = original
    }
  }, [customerName, propertyName])

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
            2枚目(年次明細・計算の根拠)を付ける
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
