import type { ReactNode } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (n: number) => void
  suffix?: string
  hint?: ReactNode
  step?: number
  disabled?: boolean
  error?: string | undefined
}

export function NumberField({
  label,
  value,
  onChange,
  suffix = '円',
  hint,
  step = 1,
  disabled,
  error,
}: NumberFieldProps) {
  return (
    <label className={`field ${disabled ? 'is-disabled' : ''}`}>
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        <span className="field-suffix">{suffix}</span>
      </span>
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (s: string) => void
  placeholder?: string
  error?: string | undefined
}

export function TextField({ label, value, onChange, placeholder, error }: TextFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

interface ImageFieldProps {
  label: string
  url: string | null
  onPick: (file: File) => void
  onClear: () => void
}

export function ImageField({ label, url, onPick, onClear }: ImageFieldProps) {
  return (
    <div className="field image-field">
      <span className="field-label">{label}</span>
      {url ? (
        <div className="image-preview">
          <img src={url} alt={label} />
          <button type="button" className="btn btn-quiet" onClick={onClear}>
            削除
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPick(file)
            e.target.value = ''
          }}
        />
      )}
    </div>
  )
}
