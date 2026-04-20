import { useState, useMemo } from 'react';
import { X, Check, Search } from 'lucide-react';
import GameIcon from '../GameIcon';
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext';
import './ItemSelector.css';

export default function ItemCfg() {
  const { recipeData } = useGameData();
  const { configuration, updateConfig } = useConfig();

  const isOpen = configuration.interface?.itemCfg || false;

  const itemCategories = useGameData().gameData?.Category?.物品 || {};

  // 反向索引: 物品名 → 类别名
  const itemCategoryMap = useMemo(() => {
    const map = {};
    Object.entries(itemCategories).forEach(([cat, items]) =>
      items.forEach(item => { map[item] = cat; })
    );
    return map;
  }, [itemCategories]);

  // draft: { 物品名: 数量 }
  const [draft, setDraft] = useState(
    () => ({ ...(configuration.facility?.demand?.items || {}) })
  );

  const [searchText, setSearchText] = useState('');
  const [activeItemCat, setActiveItemCat] = useState(null);

  // 可用物品：来自已启用配方的product/material
  const availableItems = useMemo(() => {
    const set = new Set();
    recipeData.forEach(r => {
      if (r.Enable) {
        Object.keys(r.Items?.product  || {}).forEach(item => set.add(item));
        Object.keys(r.Items?.material || {}).forEach(item => set.add(item));
      }
    });
    // 按 gameData.Category.物品 顺序排列
    const ordered = [];
    Object.values(itemCategories).forEach(catItems => {
      catItems.forEach(item => { if (set.has(item)) ordered.push(item); });
    });
    set.forEach(item => { if (!ordered.includes(item)) ordered.push(item); });
    return ordered;
  }, [recipeData, itemCategories]);

  const filteredItems = useMemo(() => {
    return availableItems.filter(i => {
      const matchSearch = i.toLowerCase().includes(searchText.toLowerCase());
      const matchCat    = activeItemCat === null || itemCategoryMap[i] === activeItemCat;
      return matchSearch && matchCat;
    });
  }, [availableItems, searchText, activeItemCat, itemCategoryMap]);

  const handleItemClick = (item) => {
    setDraft(prev => {
      const next = { ...prev };
      if (next[item] !== undefined) { delete next[item]; }
      else { next[item] = 100; }
      return next;
    });
  };

  const handleQuantityChange = (item, val) => {
    setDraft(prev => ({ ...prev, [item]: parseInt(val) || 0 }));
  };

  const handleClose   = () => updateConfig('interface.itemCfg', false);
  const handleConfirm = () => {
    const final = Object.fromEntries(
      Object.entries(draft).filter(([, qty]) => qty > 0)
    );
    updateConfig('facility.demand.items', final);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="is-overlay" onClick={handleClose}>
      <div className="is-shell" onClick={e => e.stopPropagation()}>

        {/* top bar */}
        <div className="is-topbar">
          <span className="is-title">选择物品</span>
          <button className="is-close-btn" onClick={handleClose}><X size={18} /></button>
        </div>

        {/* body */}
        <div className="is-item-panel">

          {/* left: search + grid */}
          <div className="is-items-section">
            <div className="is-search-wrap">
              <div className="is-search-inner">
                <Search size={18} className="is-search-icon" />
                <input
                  type="text"
                  className="is-search-input"
                  placeholder="搜索物品名称..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* category tabs */}
            <div className="is-item-cat-tabs">
              <button
                className={`is-item-cat-tab ${activeItemCat === null ? 'active' : ''}`}
                onClick={() => setActiveItemCat(null)}
              >
                全部
              </button>
              {Object.keys(itemCategories).map(cat => (
                <button
                  key={cat}
                  className={`is-item-cat-tab ${activeItemCat === cat ? 'active' : ''}`}
                  onClick={() => setActiveItemCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="is-grid-wrap">
              <div className="is-items-grid">
                {filteredItems.map(item => (
                  <div
                    key={item}
                    className={`is-item-card ${draft[item] !== undefined ? 'selected' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    {draft[item] !== undefined && (
                      <div className="is-item-badge">
                        <Check size={11} color="#071018" strokeWidth={3.5} />
                      </div>
                    )}
                    <GameIcon name={item} size={40} tooltip="top" />
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="is-grid-empty">无匹配物品</div>
                )}
              </div>
            </div>
          </div>

          {/* right: selected list */}
          <div className="is-selected-section">
            <div className="is-selected-head">
              <h3>已选择 ({Object.keys(draft).length})</h3>
            </div>
            <div className="is-selected-list">
              {Object.keys(draft).length === 0 ? (
                <div className="is-empty">
                  <div className="is-empty-icon">📦</div>
                  点击左侧物品进行选择
                </div>
              ) : (
                Object.entries(draft).map(([name, qty]) => (
                  <div key={name} className="is-sel-item">
                    <GameIcon name={name} size={44} />
                    <div className="is-sel-info">
                      <div className="is-sel-name">{name}</div>
                      <div className="is-qty-row">
                        <span className="is-qty-label">需求量:</span>
                        <input
                          type="number"
                          className="is-qty-input"
                          value={qty}
                          min="0"
                          onChange={e => handleQuantityChange(name, e.target.value)}
                        />
                      </div>
                    </div>
                    <button className="is-rm-btn" onClick={() => handleItemClick(name)}>
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* confirm bar */}
        <div className="is-confirm-bar">
          <span className="is-confirm-hint">仅显示已启用配方的物品</span>
          <button className="is-confirm-btn" onClick={handleConfirm}>
            <Check size={16} /> 确认
          </button>
        </div>

      </div>
    </div>
  );
}
