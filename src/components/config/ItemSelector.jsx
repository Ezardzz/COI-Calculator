// components/ItemSelector.jsx
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Check, Search, Layers, Package, Zap, RotateCcw } from 'lucide-react';
import GameIcon from '../GameIcon';
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext';
import './ItemSelector.css';

/* ─────────────────────────────────────────────
   Helper: recipe arrow notation
   e.g.  18铁 + 18木材 → 24结构件
───────────────────────────────────────────── */
function RecipeFormula({ items }) {
  const mats  = items.material || {};
  const prods = items.product  || {};
  return (
    <div className="is-recipe-row">
      {Object.entries(prods).map(([name, qty], i) => (
        <span key={i} className="is-recipe-prod">
          {i > 0 && <span className="is-recipe-plus"></span>}
          <GameIcon name={name} size={20} tooltip="top" />
          <span className="is-recipe-qty">{qty}</span>
        </span>
      ))}
      <span className="is-recipe-arrow">←</span>
      {Object.entries(mats).map(([name, qty], i) => (
        <span key={i} className="is-recipe-mat">
          {i > 0 && <span className="is-recipe-plus"></span>}
          <GameIcon name={name} size={20} tooltip="top" />
          <span className="is-recipe-qty">{qty}</span>
        </span>
      ))}

    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function ItemSelector() {
  const { gameData, recipeDataFactory, updateRecipesEnable } = useGameData();
  const { configuration, updateConfig } = useConfig();

  delete recipeDataFactory["其他"];
  delete recipeDataFactory["其他建筑"];

  const isOpen = configuration.interface?.itemSelector || false;
  const itemCategories = gameData?.Category?.物品 || {};
  // 反向索引: 物品名 → 类别名
  const itemCategoryMap = useMemo(() => {
    const map = {};
    Object.entries(itemCategories).forEach(([cat, items]) =>
      items.forEach(item => { map[item] = cat; })
    );
    return map;
  }, [itemCategories]);
  // draft: { itemName: quantity }
  const [draft, setDraft] = useState(
    () => ({ ...(configuration.facility?.demand?.items || {}) })
  );

  // active view tab
  const [view, setView] = useState('recipe');

  // category / building selection
  const categories = useMemo(() => Object.keys(recipeDataFactory || {}), [recipeDataFactory]);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeBuilding, setActiveBuilding] = useState('');

  // item search text
  const [searchText, setSearchText] = useState('');
  // item category filter: null = 全部
  const [activeItemCat, setActiveItemCat] = useState(null);
  // local enable overrides: { recipeId: bool }
  const [enableOverrides, setEnableOverrides] = useState(() => {
    const map = {};
    Object.values(recipeDataFactory).forEach(buildings =>
      Object.values(buildings).forEach(recipes =>
        recipes.forEach(r => { map[r.ID] = r.Enable; })
      )
    );
    return map;
  });

  /* ── initialise category when data first loads ── */
  useEffect(() => {
    if (categories.length && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  // 仅在 activeCategory 切换时重置建筑选择，
  // 不依赖 recipeDataFactory 避免 Enable 变化时误重置
  const prevCategoryRef = useRef('');
  useEffect(() => {
    if (activeCategory && activeCategory !== prevCategoryRef.current) {
      prevCategoryRef.current = activeCategory;
      const buildings = Object.keys(recipeDataFactory[activeCategory] || {});
      if (buildings.length) setActiveBuilding(buildings[0]);
    }
  }, [activeCategory]);

  /* ── sync overrides when recipeDataFactory changes externally ── */
  useEffect(() => {
    setEnableOverrides(prev => {
      const map = { ...prev };
      Object.values(recipeDataFactory).forEach(buildings =>
        Object.values(buildings).forEach(recipes =>
          recipes.forEach(r => { if (!(r.ID in map)) map[r.ID] = r.Enable; })
        )
      );
      return map;
    });
  }, [recipeDataFactory]);

  /* ── toggle single recipe enable ── */
  const toggleRecipe = useCallback((id) => {
    setEnableOverrides(prev => {
      const next = { ...prev, [id]: !prev[id] };
      updateRecipesEnable([id], !prev[id]);
      return next;
    });
  }, [updateRecipesEnable]);

  /* ── batch enable/disable all recipes for a building ── */
  const setBuildingEnable = useCallback((category, buildingName, enabled) => {
    const recipes = recipeDataFactory[category]?.[buildingName] || [];
    const ids = recipes.map(r => r.ID);
    setEnableOverrides(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = enabled; });
      return next;
    });
    updateRecipesEnable(ids, enabled);
  }, [recipeDataFactory, updateRecipesEnable]);

  /* ── sidebar click: normal = switch building, ctrl = batch toggle ── */
  const handleBuildingClick = useCallback((e, cat, bld) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const recipes    = recipeDataFactory[cat]?.[bld] || [];
      const allEnabled = recipes.every(r => enableOverrides[r.ID] !== false);
      setBuildingEnable(cat, bld, !allEnabled);
    } else {
      setActiveBuilding(bld);
    }
  }, [recipeDataFactory, enableOverrides, setBuildingEnable]);

  /* ── available items: from recipeDataFactory, only enabled recipes ── */
  const availableItems = useMemo(() => {
    const set = new Set();
    Object.values(recipeDataFactory).forEach(buildings => {
      Object.values(buildings).forEach(recipes => {
        recipes.forEach(r => {
          const enabled = enableOverrides[r.ID] !== undefined ? enableOverrides[r.ID] : r.Enable;
          if (enabled) {
            Object.keys(r.Items?.product || {}).forEach(item => set.add(item));
            Object.keys(r.Items?.material || {}).forEach(item => set.add(item));
          }
        });
      });
    });

    // 按照 gameData.Category.物品 定义顺序排列，不在分类中的物品附加到末尾
    const ordered = [];
    Object.values(itemCategories).forEach(catItems => {
      catItems.forEach(item => { if (set.has(item)) ordered.push(item); });
    });
    set.forEach(item => { if (!ordered.includes(item)) ordered.push(item); });
    return ordered;
  }, [recipeDataFactory, enableOverrides, itemCategories]);

  const filteredItems = useMemo(() => {
    return availableItems.filter(i => {
      const matchSearch = i.toLowerCase().includes(searchText.toLowerCase());
      const matchCat    = activeItemCat === null || itemCategoryMap[i] === activeItemCat;
      return matchSearch && matchCat;
    });
  }, [availableItems, searchText, activeItemCat, itemCategoryMap]);

  /* ── item select / deselect ── */
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

  /* ── confirm / close ── */
  const handleClose   = () => updateConfig('interface.itemSelector', false);
  const handleConfirm = () => {
    const final = Object.fromEntries(
      Object.entries(draft).filter(([, qty]) => qty > 0)
    );
    updateConfig('facility.demand.items', final);
    handleClose();
  };

  if (!isOpen) return null;

  /* ── building enable state: 'all' | 'partial' | 'none' ── */
  const getBuildingState = (cat, bld) => {
    const recipes = recipeDataFactory[cat]?.[bld] || [];
    if (!recipes.length) return 'none';
    const enabledCount = recipes.filter(r => enableOverrides[r.ID] !== false).length;
    if (enabledCount === 0)              return 'none';
    if (enabledCount === recipes.length) return 'all';
    return 'partial';
  };

  // 'bld-all' = 全部启用, 'bld-partial' = 部分启用, '' = 全禁用
  const bldStateClass = (cat, bld) => {
    const state = getBuildingState(cat, bld);
    if (state === 'all')     return 'bld-all';
    if (state === 'partial') return 'bld-partial';
    return '';
  };

  const buildings     = activeCategory ? Object.keys(recipeDataFactory[activeCategory] || {}) : [];
  const activeRecipes = (activeCategory && activeBuilding)
    ? recipeDataFactory[activeCategory]?.[activeBuilding] || []
    : [];

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="is-overlay" onClick={handleClose}>
      <div className="is-shell" onClick={e => e.stopPropagation()}>

        {/* ── top bar ── */}
        <div className="is-topbar">
          <span className="is-title">配置需求</span>

          <nav className="is-nav">
            <button
              className={`is-nav-btn ${view === 'recipe' ? 'active' : ''}`}
              onClick={() => setView('recipe')}
            >
              <Layers size={14} />
              筛选配方
            </button>
            <button
              className={`is-nav-btn ${view === 'items' ? 'active' : ''}`}
              onClick={() => setView('items')}
            >
              <Package size={14} />
              选择物品
              {Object.keys(draft).length > 0 && (
                <span className="is-nav-badge">{Object.keys(draft).length}</span>
              )}
            </button>
          </nav>

          <button className="is-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* ════ RECIPE VIEW ════ */}
        {view === 'recipe' && (
          <div className="is-recipe-panel">

            {/* category tabs */}
            <div className="is-cat-tabs">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`is-cat-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="is-recipe-body">

              {/* building sidebar */}
              <div className="is-bld-sidebar">
                {buildings.map(bld => (
                  <button
                    key={bld}
                    className={[
                      'is-bld-btn',
                      bldStateClass(activeCategory, bld),
                      activeBuilding === bld ? 'active' : '',
                    ].join(' ')}
                    onClick={e => handleBuildingClick(e, activeCategory, bld)}
                    title={`${bld}\nCtrl+点击: 全选/全清除`}
                  >
                    <GameIcon name={bld} size={50}/>
                  </button>
                ))}
              </div>

              {/* recipe content */}
              <div className="is-recipe-content">
                {activeBuilding && (() => {
                  const factory = activeRecipes[0]?.Factory;
                  return (
                    <div className="is-bld-block">

                      {/* building header */}
                      <div className="is-bld-header">
                        <div className="is-bld-info">
                          <GameIcon name={activeBuilding} size={80}/>
                          <div>
                            <div className="is-bld-name">{activeBuilding}</div>
                            {factory?.consumption && (
                              <div className="is-consumption">
                                {Object.entries(factory.consumption).map(([res, val], i) => (
                                  <span key={i} className="is-cons-tag">
                                    <GameIcon name={res} size={15} tooltip="top" />
                                    ×{val}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="is-bld-actions">
                          <button
                            className="is-action-btn all"
                            onClick={() => setBuildingEnable(activeCategory, activeBuilding, true)}
                          >
                            <Zap size={10} />全选
                          </button>
                          <button
                            className="is-action-btn none"
                            onClick={() => setBuildingEnable(activeCategory, activeBuilding, false)}
                          >
                            <RotateCcw size={10} />全清
                          </button>
                        </div>
                      </div>

                      {/* recipe grid: 3 columns */}
                      <div className="is-recipe-grid">
                        {activeRecipes.map(recipe => {
                          const enabled = enableOverrides[recipe.ID] !== undefined
                            ? enableOverrides[recipe.ID]
                            : recipe.Enable;
                          return (
                            <div
                              key={recipe.ID}
                              className={`is-recipe-card ${enabled ? 'enabled' : 'disabled'}`}
                              onClick={() => toggleRecipe(recipe.ID)}
                            >
                              {/* {enabled && (
                                <div className="is-recipe-check">
                                  <Check size={10} color="#071018" strokeWidth={3.5} />
                                </div>
                              )} */}
                              <RecipeFormula items={recipe.Items} />
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}

        {/* ════ ITEMS VIEW ════ */}
        {view === 'items' && (
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
        )}

        {/* ── confirm bar ── */}
        <div className="is-confirm-bar">
          <span className="is-confirm-hint">
            {view === 'recipe'
              ? 'Ctrl+点击建筑名可快速全选/全清 · 点击配方卡片切换启用'
              : '仅显示已启用配方的物品'
            }
          </span>
          <button className="is-confirm-btn" onClick={handleConfirm}>
            <Check size={16} /> 确认
          </button>
        </div>

      </div>
    </div>
  );
}
