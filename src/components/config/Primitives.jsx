import { useState } from 'react'
import GameIcon from '../GameIcon';
import './Primitives.css'

export const Chip = ({ label, selected, onClick, style }) => (
  <div className="chip-wrap">
    <span
      className={`chip${selected ? ' selected' : ''}`}
      onClick={onClick}
      style={style}
    >
      <GameIcon name={label} size={30} tooltip="top" />
    </span>
  </div>

)

export const RadioChip = ({ label, selected, onClick }) => (
  <div className="chip-wrap">
    <span
      className={`chip radio${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      <GameIcon name={label} size={30} tooltip="top" />
    </span>
  </div>
)
// 单选按钮组：必须选一个，点击已选项不会取消
export const RadioChipGroup = ({ options, value, onChange }) => (
  <div className="chip-group">
    {options.map(opt => (
      <RadioChip
        key={opt}
        label={opt}
        selected={value === opt}
        onClick={() => { if (value !== opt) onChange(opt) }}
      />
    ))}
  </div>
)

export const ChipWithQty = ({ label, selected, qty, onToggle, onQty }) => (
  <div className="chip-wrap">
    <span
      className={`chip${selected ? ' selected' : ''}`}
      onClick={onToggle}
    >
      <GameIcon name={label} size={30} tooltip="top" />
    </span>
    {selected && (
      <input
        className="qty-input"
        type="number"
        min={1}
        value={qty || 1}
        onChange={e => onQty(parseInt(e.target.value) || 1)}
        onClick={e => e.stopPropagation()}
      />
    )}
  </div>
)

export const SectionCard = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(o => !o)}>
        <span className="section-title">{title}</span>
        <span className={`section-arrow${open ? ' open' : ''}`}>▼</span>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}

export const SubLabel = ({ children }) => (
  <div className="sub-label">{children}</div>
)
