// FacilityConfig.jsx
import { useEffect, useState } from 'react'
import { useConfig } from '@/contexts/ConfigContext'
import { useGameData } from '@/contexts/GameDataContext'
import { Chip, RadioChip, ChipWithQty, RadioChipGroup,SectionCard, SubLabel } from './Primitives'
import {
  VEHICLE_DATA, FACILITY_OPTIONS, RESEARCH_OPTIONS,
  HOUSING_OPTIONS, FOOD_OPTIONS, MEDICINE_OPTIONS, SERVICE_OPTIONS,FARM_OPTIONS,
  TRUCK_FUELS, TRAIN_TIERS,
  MINER_FUELS, SHIP_FUELS, CARGO_DEPOTS, MAP_MINES, OCEAN_MINES,
} from '@/data/facilityData'
import './FacilityConfig.css'
import GameIcon from '../GameIcon';
// 当 spaceResearch=true 时，同步更新 factory.空间站 的等级
// spaceResearchPointNeed = amount * 48
// 若空间站已选：spaceGrade 至少要满足 spaceResearchPointNeed/48 + 2
// 若空间站未选：直接写入所需等级
function syncSpaceStation(factory, amount, spaceResearch) {
  const next = { ...factory }
  if (!spaceResearch || !amount) {
    return next
  }
  const need = amount * 48
  const requiredGrade = need / 48 + 2
  if (next['空间站']) {
    const currentGrade = next['空间站']
    const provide = 48 * (currentGrade - 2)
    // if (provide < need) {
    //   next['空间站'] = requiredGrade
    // }
    next['空间站'] = requiredGrade
  } else {
    next['空间站'] = requiredGrade
  }
  return next
}
// ── Demand ────────────────────────────────────────────────────────────────────
function DemandSection() {
  const { configuration, updateConfig } = useConfig()
  const demand = configuration.facility.demand
  const research = demand.research || { amount: 0, research: null, spaceResearch: false }
  const popEnabled = demand.population !== null && demand.population !== undefined

  const factoryQty    = name => (demand.factory || {})[name] || 0
  const toggleFactory = name => {
    const f = { ...(demand.factory || {}) }
    if (f[name]) delete f[name]; else f[name] = 1
    updateConfig('facility.demand.factory', f)
  }
  const setFactoryQty = (name, v) =>
    updateConfig('facility.demand.factory', { ...(demand.factory || {}), [name]: v })

  const removeItem = key => {
    const n = { ...(demand.items || {}) }
    delete n[key]
    updateConfig('facility.demand.items', n)
  }

  // 更新 research 并联动 factory.空间站
  const setResearch = patch => {
    const next = { ...research, ...patch }
    // 切换研究类型时，若非实验室IV则清除spaceResearch
    if (next.research !== '研究实验室 IV') next.spaceResearch = false
    updateConfig('facility.demand.research', next)
    // 联动空间站
    const newFactory = syncSpaceStation(
      demand.factory || {},
      next.amount,
      next.spaceResearch
    )
    updateConfig('facility.demand.factory', newFactory)
  }

  return (
    <div className="facility-tab-content">
      <div  className="section-container" style={{ '--col1': '30%', '--col2': '70%' }}>
        <div className="facility-section-header">人口需求</div>
        <div className="sub-section">
          <div className="pop-row">
            <Chip
              label="人口" selected={popEnabled}
              onClick={() => updateConfig('facility.demand.population', popEnabled ? null : 10000)}
            />
            {popEnabled && (
              <input className="qty-input" type="number" min={1} value={demand.population} style={{ width: 80 }}
                onChange={e => updateConfig('facility.demand.population', parseInt(e.target.value) || 10000)} />
            )}
          </div>
        </div>

        <div className="facility-section-header">设施等级/数量需求</div>
        <div className="sub-section">
          <div className="chip-group">
            {FACILITY_OPTIONS.map(f => (
              <ChipWithQty key={f} label={f}
                selected={!!factoryQty(f)} qty={factoryQty(f)}
                onToggle={() => toggleFactory(f)} onQty={v => setFactoryQty(f, v)} />
            ))}
            {/* <Chip
              label="船长之墓"
              selected={!!factoryQty("船长之墓")}
              onClick={() => toggleFactory("船长之墓")}
            /> */}
          </div>
        </div>
      </div>

      <div className="sub-section">
        <div className="facility-section-header">实验室</div>
        <div className="research-row">
          {/* 数量 */}
          <div className="research-amount">
            <span className="label-header">数量</span>
            <input
              className="qty-input"
              type="number" min={0}
              value={research.amount}
              style={{ width: 64 }}
              onChange={e => setResearch({ amount: parseInt(e.target.value) || 0 })}
            />
          </div>
          {/* 实验室类型单选 */}
          <div className="chip-group">
            {RESEARCH_OPTIONS.map(r => (
              <RadioChip key={r} label={r}
                selected={research.research === r}
                onClick={() => setResearch({ research: research.research === r ? null : r })}
              />
            ))}
            {/* 太空研究点数：仅研究实验室 IV 时显示 */}
            {research.research === '研究实验室 IV' && (
              <Chip
                label="太空研究点数"
                selected={research.spaceResearch}
                onClick={() => setResearch({ spaceResearch: !research.spaceResearch })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="facility-section-header">物品需求</div>
      <div className="sub-section">
        <div className="trigger-row">
          <button className="action-btn" onClick={() => updateConfig('interface.itemSelector', true)}>
            ＋ 配置物品
          </button>
          {Object.keys(demand.items || {}).length > 0 && (
            <div className="chip-group">
              {Object.entries(demand.items).map(([k, v]) => (
                <span key={k} className="chip selected chip-removable">
                  <GameIcon name={k} size={30} tooltip="top" />{v}
                  <span className="chip-x" onClick={() => removeItem(k)}>✕</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="sub-section">
        <div className="facility-section-header">维护冗余</div>
        <div className="redundancy-grid">
          {Object.entries(demand.redundancy || {}).map(([key, val]) => (
            <div key={key} className="redundancy-item">
              <span className="redundancy-label">
                <GameIcon name={key} size={30} tooltip="top" />
              </span>
              <input
                className="qty-input redundancy-input"
                type="number"
                step="0.01"
                value={val}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  updateConfig('facility.demand.redundancy', {
                    ...(demand.redundancy || {}),
                    [key]: isNaN(v) ? 1 : Math.max(1, v),
                  })
                }}
                onBlur={e => {
                  const v = parseFloat(e.target.value)
                  if (isNaN(v) || v < 1) {
                    updateConfig('facility.demand.redundancy', {
                      ...(demand.redundancy || {}),
                      [key]: 1,
                    })
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Settlement ────────────────────────────────────────────────────────────────
function SettlementSection() {
  const { configuration, updateConfig } = useConfig()
  const s = configuration.facility.settlement

  const toggleFood = f => {
    const cur = s.food || []
    updateConfig('facility.settlement.food', cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f])
  }
  const toggleService = sv => {
    const cur = s.commodity || []
    updateConfig('facility.settlement.commodity', cur.includes(sv) ? cur.filter(x => x !== sv) : [...cur, sv])
  }

  return (
    <div className="facility-tab-content">
      <div className="facility-section-header">住房</div>
      <div className="sub-section">
        <div className="chip-group">
          {HOUSING_OPTIONS.map(h => (
            <RadioChip key={h} label={h} selected={s.housing === h}
              onClick={() => updateConfig('facility.settlement.housing', h)} />
          ))}
        </div>
      </div>

      <div className="facility-section-header">食品</div>
      <div className="sub-section">
        <div className="chip-group">
          {FOOD_OPTIONS.map(f => (
            <Chip key={f} label={f} selected={(s.food || []).includes(f)} onClick={() => toggleFood(f)} />
          ))}
        </div>
      </div>

      <div className="facility-section-header">医疗</div>
      <div className="sub-section">
        <div className="chip-group">
          {MEDICINE_OPTIONS.map(m => (
            <RadioChip key={m} label={m} selected={s.medicine === m}
              onClick={() => updateConfig('facility.settlement.medicine', s.medicine === m ? null : m)} />
          ))}
        </div>
      </div>

      <div className="facility-section-header">商品</div>
      <div className="sub-section">
        <div className="chip-group">
          {SERVICE_OPTIONS.map(sv => (
            <Chip key={sv} label={sv} selected={(s.commodity || []).includes(sv)} onClick={() => toggleService(sv)} />
          ))}
        </div>
      </div>

      <div className="facility-section-header">农场</div>
      <div className="sub-section">
        <div className="chip-group">
          {FARM_OPTIONS.map(fm => (
            <RadioChip key={fm} label={fm} selected={s.farm === fm}
              onClick={() => updateConfig('facility.settlement.farm', s.farm === fm ? null : fm)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Logistics ─────────────────────────────────────────────────────────────────
function LogisticsSection() {
  const { configuration, updateConfig } = useConfig()
  const { trunk, train ,rocket} = configuration.facility.logistics

  const truckFuel     = trunk.fuel || '柴油'
  const truckVehicles = VEHICLE_DATA['卡车'][truckFuel] || []
  const trunkMap      = trunk.trunk || {}
  const toggleTruck   = name => {
    const m = { ...trunkMap }; if (m[name]) delete m[name]; else m[name] = 1
    updateConfig('facility.logistics.trunk.trunk', m)
  }
  const setTruckQty = (name, v) => updateConfig('facility.logistics.trunk.trunk', { ...trunkMap, [name]: v })

  const trainTier    = train.tier || '1级'
  const trainVehicles = VEHICLE_DATA['火车'][trainTier] || []
  const trainMap      = train.train || {}
  const toggleTrain   = name => {
    const m = { ...trainMap }; if (m[name]) delete m[name]; else m[name] = 1
    updateConfig('facility.logistics.train.train', m)
  }
  const setTrainQty = (name, v) => updateConfig('facility.logistics.train.train', { ...trainMap, [name]: v })

  return (
    <div className="facility-tab-content">
      <div className="facility-section-header">卡车</div>
      <div className="sub-section">
        <div className="chip-group">
          {TRUCK_FUELS.map(f => (
            <RadioChip key={f} label={f} selected={truckFuel === f}
              onClick={() => { updateConfig('facility.logistics.trunk.fuel', f); updateConfig('facility.logistics.trunk.trunk', {}) }} />
          ))}
        </div>
        <div className="chip-group">
          {truckVehicles.map(v => (
            <ChipWithQty key={v} label={v} selected={!!trunkMap[v]} qty={trunkMap[v]}
              onToggle={() => toggleTruck(v)} onQty={n => setTruckQty(v, n)} />
          ))}
        </div>
      </div>

      <div className="facility-section-header">火车</div>
      <div className="sub-section">
        <div className="chip-group">
          {TRAIN_TIERS.map(g => (
            <RadioChip key={g} label={g} selected={trainTier === g}
              onClick={() => { updateConfig('facility.logistics.train.tier', g); updateConfig('facility.logistics.train.train', {}) }} />
          ))}
        </div>
        <div className="chip-group">
          {trainVehicles.map(v => (
            <ChipWithQty key={v} label={v} selected={!!trainMap[v]} qty={trainMap[v]}
              onToggle={() => toggleTrain(v)} onQty={n => setTrainQty(v, n)} />
          ))}
        </div>
      </div>
      <div className="facility-section-header">火箭</div>
      <div className="sub-section">
          <div className="chip-group">
            {VEHICLE_DATA["火箭"].map(v => (
              <RadioChip key={v} label={v} selected={rocket === v} onClick={() => updateConfig('facility.logistics.rocket', v)} />
            ))}
          </div>
      </div>
    </div>
  )
}

// ── Mineral ───────────────────────────────────────────────────────────────────
function MineralSection() {
  const { configuration, updateConfig } = useConfig()
  const { contractData } = useGameData()
  const mineral = configuration.facility.mineral
  const { miner, mine: mapMine } = mineral.map
  const { ship, mine: oceanMine } = mineral.ocean

  const minerFuel        = miner.fuel || '柴油'
  const excavatorList       = VEHICLE_DATA['开采'][minerFuel]['挖掘机']
  const loggerList         = VEHICLE_DATA['开采'][minerFuel]['伐木机']
  const excavator      = miner.excavator
  const logger         = miner.logger


  const toggleMapMine = m => {
    const cur = mapMine || []
    updateConfig('facility.mineral.map.mine', cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m])
  }

  const shipFuel = ship.fuel || '柴油'
  const toggleOceanMine = m => {
    const cur = oceanMine || []
    updateConfig('facility.mineral.ocean.mine', cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m])
  }

  // trade 结构：{ [item]: [合同对象, ...] }，直接存储合同内容
  // const trade         = (mineral.ocean.trade && !Array.isArray(mineral.ocean.trade))
  //   ? mineral.ocean.trade
  //   : {}
  // const tradeItemKeys = Object.keys(trade).filter(item => trade[item]?.length > 0)
  // trade 结构：{ [item]: [idx, ...] }，存储合同索引
  const trade         = mineral.ocean.trade || {}
  // 从 contractData 中查找合同内容用于展示（contractData 已按当前港口处理）
  const tradeItemKeys = Object.keys(trade).filter(item => (trade[item] || []).length > 0)
  return (
    <div className="facility-tab-content">
      <div>
        <div className="section-container" style={{ '--col1': '35%', '--col2': '65%' }}>
          <div className="facility-section-header">地图矿机</div>
          <div className="sub-section">
            <div className="chip-group">
              {/* {MINER_FUELS.map(f => (
                <RadioChip key={f} label={f} selected={minerFuel === f}
                  onClick={() => { updateConfig('facility.mineral.map.miner.fuel', f); updateConfig('facility.mineral.map.miner.miner', []) }} />
              ))} */}
              {MINER_FUELS.map(f => (
                <RadioChip
                  key={f}
                  label={f}
                  selected={minerFuel === f}
                  onClick={() => { if (minerFuel !== f){
                    updateConfig('facility.mineral.map.miner.fuel', f); 
                    updateConfig('facility.mineral.map.miner.excavator', null)
                    updateConfig('facility.mineral.map.miner.logger', null)
                  }}}
                />
              ))}
            </div>
            {excavatorList.length > 0 && (
              <div className="chip-group">
                {excavatorList.map(v => (
                  <RadioChip
                    key={v}
                    label={v}
                    selected={excavator == v}
                    onClick={() => { if (excavator !== v) updateConfig('facility.mineral.map.miner.excavator', excavator == v ? null : v)}}
                  />
                ))}
              </div>
            )}
            {loggerList.length > 0 && (
              <div className="chip-group">
                {loggerList.map(v => (
                  <RadioChip 
                    key={v} 
                    label={v} 
                    selected={logger == v} 
                    onClick={() => {if (logger !== v) updateConfig('facility.mineral.map.miner.logger', logger == v ? null : v)}} 
                  />
                ))}
              </div>
            )}
          </div>
          <div className="facility-section-header">地图开采矿物</div>
          <div className="sub-section">
            <div className="chip-group">
              {MAP_MINES.map(m => (
                <Chip key={m} label={m} selected={(mapMine || []).includes(m)} onClick={() => toggleMapMine(m)} />
              ))}
            </div>
          </div>
        </div>
        <div className="section-container" style={{ '--col1': '35%', '--col2': '65%' }}>
          <div className="facility-section-header">海外船只</div>
          <div className="sub-section">
            <div className="chip-group">
              {SHIP_FUELS.map(f => (
                <RadioChip 
                  key={f} 
                  label={f} 
                  selected={shipFuel === f}
                  onClick={() => {if (shipFuel !== f) updateConfig('facility.mineral.ocean.ship.fuel', f)}}
                />
              ))}
            </div>
            <div className="chip-group">
              {CARGO_DEPOTS.map(d => (
                <RadioChip 
                  key={d} 
                  label={d} 
                  selected={ship.cargoDepot === d}
                  onClick={() => {if (ship.cargoDepot !== d) updateConfig('facility.mineral.ocean.ship.cargoDepot', ship.cargoDepot === d ? null : d)}} 
                />
              ))}
            </div>
          </div>
          <div className="facility-section-header">海外矿井</div>
          <div className="sub-section">
            <div className="chip-group">
              {OCEAN_MINES.map(m => (
                <Chip key={m} label={m} selected={(oceanMine || []).includes(m)} onClick={() => toggleOceanMine(m)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="facility-section-header">贸易合同</div>
      <div className="sub-section">
        <div className="trigger-row">
          {!ship.cargoDepot
            ? <span className="hint-text">请先选择货运港</span>
            : <button className="action-btn" onClick={() => updateConfig('interface.contractSelector', true)}>＋ 配置合同</button>
          }
          {tradeItemKeys.length > 0 && (
            <div className="chip-group">
              {tradeItemKeys.flatMap(item =>
                [...(trade[item] || [])].sort((a, b) => a - b).map(idx => {
                  const c = contractData[item]?.[idx]
                  if (!c) return null
                  return (
                    <span key={`${item}-${idx}`} className="chip selected chip-removable">
                      <GameIcon name={c['出口']['物品']} size={20} tooltip="top" />{c['出口']['数量']}
                      <span className="contract-arrow">→</span>
                      <GameIcon name={c['进口']['物品']} size={20} tooltip="top" />{c['进口']['数量']}
                      <span className="chip-x" onClick={() => {
                        const next  = { ...trade }
                        next[item]  = (next[item] || []).filter(i => i !== idx)
                        if (next[item].length === 0) delete next[item]
                        updateConfig('facility.mineral.ocean.trade', next)
                      }}>✕</span>
                    </span>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Config Preview ────────────────────────────────────────────────────────────
function ConfigPreview() {
  const { configuration, updateConfig } = useConfig()
  const { gameData, recipeData, updateRecipesEnable, resetAllRecipes } = useGameData()
  const [open, setOpen] = useState(false)
  const importRef = useState(() => {
    if (typeof document !== 'undefined') {
      const el = document.createElement('input')
      el.type = 'file'
      el.accept = '.json'
      return el
    }
    return null
  })[0]
const handleExport = () => {
  const payload = {
    version: gameData?.Version ?? 'unknown',
    configuration,
    disabledRecipes: recipeData.filter(r => !r.Enable).map(r => ({ Items: r.Items })),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `facility-config-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleImport = () => {
  if (!importRef) return
  importRef.onchange = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const payload = JSON.parse(evt.target.result)

        // 版本比对
        const currentVersion = gameData?.Version ?? 'unknown'
        if (payload.version && payload.version !== currentVersion) {
          const ok = window.confirm(
            `版本不匹配：\n文件版本：${payload.version}\n当前版本：${currentVersion}\n\n仍要导入吗？`
          )
          if (!ok) { importRef.value = ''; return }
        }

        // 还原 configuration
        if (payload.configuration) {
          Object.keys(payload.configuration).forEach(key => {
            updateConfig(key, payload.configuration[key])
          })
        }

        // 还原 recipeData：先全部启用，再把存储的禁用配方按完整对象匹配禁用
        if (Array.isArray(payload.disabledRecipes)) {
          resetAllRecipes()
          // 用 JSON.stringify(recipe.Items) 作为唯一指纹
          const disabledKeys = new Set(
            payload.disabledRecipes.map(r => JSON.stringify(r.Items))
          )
          const toDisable = recipeData
            .filter(r => disabledKeys.has(JSON.stringify(r.Items)))
            .map(r => r.ID)
          if (toDisable.length > 0) updateRecipesEnable(toDisable, false)
        }
      } catch (err) {
        alert('配置文件解析失败：' + err.message)
      }
      importRef.value = ''
    }
    reader.readAsText(file)
  }
  importRef.click()
}

  return (
    <div className="config-panel">
      <div className="config-panel-header">
        <div className="config-panel-title" onClick={() => setOpen(o => !o)}>
          当前配置数据 {open ? '▲' : '▼'}
        </div>
        <div className="config-panel-actions">
          <button className="action-btn" onClick={handleExport}>↓ 导出配置</button>
          <button className="action-btn" onClick={handleImport}>↑ 导入配置</button>
        </div>
      </div>
      {open && <pre>{JSON.stringify(configuration, null, 2)}</pre>}
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function FacilityConfig() {
  const [activeFacilityTab, setActiveFacilityTab] = useState('demand')
  // const { configuration, updateConfig } = useConfig()
  // const iface = configuration.interface

  return (
    <div className="facility-container">
      <div className="facility-header">设施配置</div>
      <div className="facility-content">
        <div className="facility-nav">
          <button
            className={`facility-nav-button ${activeFacilityTab === 'demand' ? 'active' : ''}`}
            onClick={() => setActiveFacilityTab('demand')}
          >
            需求
          </button>
          <button
            className={`facility-nav-button ${activeFacilityTab === 'settlement' ? 'active' : ''}`}
            onClick={() => setActiveFacilityTab('settlement')}
          >
            居民
          </button>
          <button
            className={`facility-nav-button ${activeFacilityTab === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveFacilityTab('logistics')}
          >
            物流
          </button>
          <button
            className={`facility-nav-button ${activeFacilityTab === 'mineral' ? 'active' : ''}`}
            onClick={() => setActiveFacilityTab('mineral')}
          >
            原矿
          </button>
        </div>
        {activeFacilityTab === 'demand' && <DemandSection />}
        {activeFacilityTab === 'settlement' && <SettlementSection />}
        {activeFacilityTab === 'logistics' && <LogisticsSection />}
        {activeFacilityTab === 'mineral' && <MineralSection />}
      </div>
      <ConfigPreview />
    </div>
  )
}


