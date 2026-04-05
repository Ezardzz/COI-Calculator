import { useState } from 'react'
import { useConfig } from '@/contexts/ConfigContext'
import { useGameData } from '@/contexts/GameDataContext'
import './ContractSelector.css'
import GameIcon from '../GameIcon';

function sortByPortOrder(draft, contractData) {
  const ordered = {}
  for (const item of Object.keys(contractData)) {
    if (draft[item] && draft[item].length > 0) {
      ordered[item] = [...draft[item]].sort((a, b) => a - b)
    }
  }
  return ordered
}

export default function ContractSelector() {
  const { configuration, updateConfig } = useConfig()
  const { contractData, loading }       = useGameData()
  const cargoDepot = configuration.facility.mineral.ocean.ship.cargoDepot
  // console.log(contractData);
  const itemKeys   = Object.keys(contractData)

  //只在首次挂载时读取 trade 列表
  const [draft, setDraft]           = useState(
    () => ({ ...(configuration.facility.mineral.ocean.trade || {}) })
  )
  const [activeItem, setActiveItem] = useState(null)

  const handleClose = () => updateConfig('interface.contractSelector', false)

  const isSelected = (item, idx) =>
    (draft[item] || []).includes(idx)

  const toggleContract = (item, idx) => {
    setDraft(d => {
      const list = d[item] || []
      const next = { ...d }
      if (list.includes(idx)) {
        const filtered = list.filter(i => i !== idx)
        if (filtered.length === 0) delete next[item]
        else next[item] = filtered
      } else {
        next[item] = [...list, idx]
      }
      return next
    })
  }

  const removeIdx = (item, idx) => {
    setDraft(d => {
      const next  = { ...d }
      const filtered = (next[item] || []).filter(i => i !== idx)
      if (filtered.length === 0) delete next[item]
      else next[item] = filtered
      return next
    })
  }

  const handleConfirm = () => {
    updateConfig('facility.mineral.ocean.trade', sortByPortOrder(draft, contractData))
    handleClose()
  }
  const totalSelected = Object.values(draft).reduce((acc, idxs) => acc + idxs.length, 0)

  if (loading) {
    return (
      <div className="panel-overlay" onClick={handleClose}>
        <div className="panel" onClick={e => e.stopPropagation()}>
          <div className="panel-header">
            <span className="panel-title">配置合同</span>
            <button className="panel-close" onClick={handleClose}>✕</button>
          </div>
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>加载数据中…</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="panel-overlay" onClick={handleClose}>
      <div className="panel contract-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <span className="panel-title">配置合同 · {cargoDepot}</span>
          <button className="panel-close" onClick={handleClose}>✕</button>
        </div>

        <div className="panel-body" >
          {/* Item filter chips */}
          <div className="sub-label">选择进口物品</div>
          <div className="chip-group" style={{ marginBottom: 14 }}>
            {itemKeys.map(item => {
              const hasSel = (draft[item] || []).length > 0
              const isActive = activeItem === item
              return (
                <span
                  key={item}
                  className={`chip${hasSel ? ' selected' : ''}${isActive ? ' contract-active' : ''}`}
                  onClick={() => setActiveItem(isActive ? null : item)}
                >
                  <GameIcon name={item} size={20} tooltip="top" />
                </span>
              )
            })}
          </div>

          {/* Contract entries for active item */}
          {activeItem && contractData[activeItem] && (
            <>
              <div className="sep" />
              <div style={{ marginTop: 12 }}>
                <div className="sub-label">{activeItem} — 可用合同</div>
                <div className="contract-list">
                  {contractData[activeItem].map((c, idx) => {
                    const sel = isSelected(activeItem, idx)
                    return (
                      <div
                        key={idx}
                        className={`contract-row${sel ? ' contract-row--selected' : ''}`}
                        onClick={() => toggleContract(activeItem, idx)}
                      >
                        <span className="contract-diamond">{sel ? '◆' : '◇'}</span>
                        <div className="contract-item">
                            <GameIcon name={c['出口']['物品']} size={20} tooltip="top" />{c['出口']['数量']}
                            <span className="contract-muted"> ({c['出口']['模块数']}模块)</span>
                        </div>
                          <span className="contract-arrow">→</span>
                        <div className="contract-item">
                            <GameIcon name={c['进口']['物品']} size={20} tooltip="top" />{c['进口']['数量']}
                            <span className="contract-muted"> ({c['进口']['模块数']}模块)</span>
                        </div>
                        <div className="contract-item-right">
                          <GameIcon name={"凝聚力每月"} size={15} tooltip="top" />
                          <span className="contract-muted">{c['凝聚力/月']}</span>
                          <GameIcon name={"凝聚力每船"} size={15} tooltip="top" />
                          <span className="contract-muted">{c['凝聚力/船']}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Selected summary — 按 contractData 顺序展示 */}
          {totalSelected > 0 && (
            <>
              <div className="sep" style={{ marginTop: 14 }} />
              <div style={{ marginTop: 12 }}>
                <div className="sub-label">已选合同 ({totalSelected})</div>
                <div className="selected-list">
                  {itemKeys.map(item => {
                    const idxList = draft[item]
                    if (!idxList || idxList.length === 0) return null
                    return [...idxList].sort((a, b) => a - b).map(idx => {
                      const c = contractData[item]?.[idx]
                      if (!c) return null
                      return (
                        <div key={`${item}-${idx}`} className="selected-contract">
                          <GameIcon name={c['出口']['物品']} size={20} tooltip="top" />{c['出口']['数量']}
                          <span className="contract-arrow">→</span>
                          <GameIcon name={c['进口']['物品']} size={20} tooltip="top" />{c['进口']['数量']}
                          <button className="item-remove" onClick={() => removeIdx(item, idx)}>✕</button>
                        </div>
                      )
                    })
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="panel-footer">
          <button className="action-btn" onClick={handleClose}>取消</button>
          <button className="btn-confirm" onClick={handleConfirm}>确认</button>
        </div>
      </div>
    </div>
  )
}
