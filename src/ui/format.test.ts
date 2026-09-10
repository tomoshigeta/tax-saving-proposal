import { describe, expect, it } from 'vitest'
import { pdfFileName } from './format'

describe('pdfFileName', () => {
  it('顧客名 + 様 + 物件名 + 節税シミュレーション', () => {
    expect(pdfFileName('井上', 'フォンテ六本木607')).toBe('井上様フォンテ六本木607節税シミュレーション')
  })

  it('顧客名が空なら「様」を付けない', () => {
    expect(pdfFileName('', 'フォンテ六本木607')).toBe('フォンテ六本木607節税シミュレーション')
  })

  it('空白は詰め、ファイル名に使えない文字は落とす', () => {
    expect(pdfFileName(' 井上 太郎 ', 'グランドメゾン新宿 101')).toBe(
      '井上太郎様グランドメゾン新宿101節税シミュレーション',
    )
    expect(pdfFileName('山田', 'A/B:C?')).toBe('山田様ABC節税シミュレーション')
  })
})
