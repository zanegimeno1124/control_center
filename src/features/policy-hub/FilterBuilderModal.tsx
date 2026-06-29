import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FilterField, FilterOp, FilterRow } from '../../shared/types/billing'
import { BOOL_OPS, TEXT_OPS } from '../../shared/types/billing'

interface DropdownOption { value: string; label: string }

function FbDropdown({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value: string
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className={`fbd-wrap${disabled ? ' fbd-disabled' : ''}`}>
      <button
        type="button"
        className="fbd-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? 'fbd-label' : 'fbd-placeholder'}>
          {selected ? selected.label : (placeholder ?? 'Select…')}
        </span>
        <span className="fbd-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="fbd-menu">
          {placeholder && (
            <div
              className={`fbd-option fbd-option-placeholder${!value ? ' fbd-option-active' : ''}`}
              onMouseDown={() => { onChange(''); setOpen(false) }}
            >
              {placeholder}
            </div>
          )}
          {options.map((o) => (
            <div
              key={o.value}
              className={`fbd-option${o.value === value ? ' fbd-option-active' : ''}`}
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
            >
              {o.value === value && <span className="fbd-check">✓</span>}
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function makeRow(): FilterRow {
  return { id: crypto.randomUUID(), field: '', op: '==', value: '' }
}

interface Props {
  isOpen: boolean
  appliedRows: FilterRow[]
  fields: FilterField[]
  onClose: () => void
  onApply: (rows: FilterRow[]) => void
}

export function FilterBuilderModal({ isOpen, appliedRows, fields, onClose, onApply }: Props) {
  const [rows, setRows] = useState<FilterRow[]>(() => (appliedRows.length ? appliedRows : [makeRow()]))

  useEffect(() => {
    if (isOpen) {
      setRows(appliedRows.length ? [...appliedRows] : [makeRow()])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  function handleFieldChange(id: string, field: string) {
    const fieldDef = fields.find((f) => f.field === field)
    setRows((current) =>
      current.map((r) =>
        r.id === id ? { ...r, field, op: '==', value: fieldDef?.type === 'bool' ? 'true' : '' } : r,
      ),
    )
  }

  function handleOpChange(id: string, op: FilterOp) {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, op } : r)))
  }

  function handleValueChange(id: string, value: string) {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, value } : r)))
  }

  function handleAddRow() {
    setRows((current) => [...current, makeRow()])
  }

  function handleRemoveRow(id: string) {
    setRows((current) => {
      const next = current.filter((r) => r.id !== id)
      return next.length ? next : [makeRow()]
    })
  }

  function handleClear() {
    onApply([])
    onClose()
  }

  function handleApply() {
    onApply(rows.filter((r) => r.field && r.value.trim()))
    onClose()
  }

  return createPortal(
    <>
      <div className="fb-backdrop" onClick={onClose} />
      <div className="fb-drawer" role="dialog" aria-modal="true" aria-label="Filter builder">
        <div className="fb-drawer-header">
          <h3>Filter</h3>
          <button className="fb-close-btn" onClick={onClose} aria-label="Close filter">
            ✕
          </button>
        </div>

        <div className="fb-drawer-body">
          <p className="fb-hint">All conditions are joined with AND.</p>

          <div className="fb-rows">
            {rows.map((row, index) => {
              const fieldDef = fields.find((f) => f.field === row.field)
              const ops = fieldDef?.type === 'bool' ? BOOL_OPS : TEXT_OPS

              return (
                <div key={row.id} className="fb-row">
                  {index > 0 && <div className="fb-and-badge">AND</div>}
                  <div className="fb-row-controls">
                    <FbDropdown
                      value={row.field}
                      options={fields.map((f) => ({ value: f.field, label: f.label }))}
                      placeholder="Select field…"
                      onChange={(v) => handleFieldChange(row.id, v)}
                    />

                    <FbDropdown
                      value={row.op}
                      options={ops.map((o) => ({ value: o.op, label: o.label }))}
                      disabled={!row.field}
                      onChange={(v) => handleOpChange(row.id, v as FilterOp)}
                    />

                    {fieldDef?.type === 'bool' ? (
                      <FbDropdown
                        value={row.value}
                        options={[{ value: 'true', label: 'true' }, { value: 'false', label: 'false' }]}
                        disabled={!row.field}
                        onChange={(v) => handleValueChange(row.id, v)}
                      />
                    ) : (
                      <input
                        type="text"
                        className="fb-input"
                        placeholder="Value…"
                        value={row.value}
                        disabled={!row.field}
                        onChange={(e) => handleValueChange(row.id, e.target.value)}
                      />
                    )}

                    <button
                      className="fb-remove-btn"
                      onClick={() => handleRemoveRow(row.id)}
                      aria-label="Remove condition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button className="fb-add-btn" onClick={handleAddRow}>
            + Add condition
          </button>
        </div>

        <div className="fb-drawer-footer">
          <button className="fb-btn fb-btn-ghost" onClick={handleClear}>
            Clear all
          </button>
          <div className="fb-footer-right">
            <button className="fb-btn fb-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="fb-btn fb-btn-primary" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
