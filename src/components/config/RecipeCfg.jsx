import { useState, useMemo, useCallback, useRef } from 'react';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import GameIcon from '../GameIcon';
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext';
import './RecipeCfg.css';

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */

// gameData.Category 可能是两层嵌套: { key: { subKey: [name,...] } }
// 也可能某分支直接是数组. 统一拍平为有序数组
function buildOrderedList(categoryData) {
  const ordered = [];
  const seen = new Set();
  const push = (name) => { if (!seen.has(name)) { ordered.push(name); seen.add(name); } };
  Object.values(categoryData || {}).forEach(val => {
    if (Array.isArray(val)) {
      val.forEach(push);
    } else if (val && typeof val === 'object') {
      Object.values(val).forEach(arr => Array.isArray(arr) && arr.forEach(push));
    }
  });
  return ordered;
}

const pinyinCmp = (a, b) => a.localeCompare(b, 'zh-CN');

function recipeSortKey(recipe, mode, orderedBuildings, orderedItems, keyword) {
  const kw = keyword.trim();
  if (kw) {
    const hit = mode === 'factory'
      ? (recipe.Factory?.name || '').includes(kw)
      : mode === 'material'
        ? Object.keys(recipe.Items?.material || {}).some(k => k.replace(/\[.+?\]$/, '').includes(kw))
        : Object.keys(recipe.Items?.product  || {}).some(k => k.replace(/\[.+?\]$/, '').includes(kw));
    if (hit) return [0, -1, ''];
  }
  if (mode === 'factory') {
    const name = recipe.Factory?.name || '';
    const idx  = orderedBuildings.indexOf(name);
    return [idx === -1 ? 2 : 1, idx === -1 ? 9999 : idx, name];
  }
  const getFirst = (obj) => Object.keys(obj || {})[0]?.replace(/\[.+?\]$/, '') || '';
  const name = mode === 'material' ? getFirst(recipe.Items?.material) : getFirst(recipe.Items?.product);
  const list = mode === 'material' ? orderedItems : orderedItems;
  const idx  = list.indexOf(name);
  return [idx === -1 ? 2 : 1, idx === -1 ? 9999 : idx, name];
}

function cmpKeys([a0, a1, a2], [b0, b1, b2]) {
  if (a0 !== b0) return a0 - b0;
  if (a1 !== b1) return a1 - b1;
  return pinyinCmp(String(a2), String(b2));
}

/* ═══════════════════════════════════════════════════
   RECIPE CARD
═══════════════════════════════════════════════════ */
function RecipeCard({ recipe, selected, onSelect, onToggleEnable, onCopy, onDelete,
  draggable, onDragStart, onDragEnd, isParent, isClone, isDragging }) {

  const mats  = recipe.Items?.material || {};
  const prods = recipe.Items?.product  || {};

  const cls = ['rc-recipe-card',
    selected   ? 'selected'  : '',
    !recipe.Enable ? 'disabled' : '',
    isDragging ? 'dragging'  : '',
    isParent   ? 'is-parent' : '',
    isClone    ? 'is-clone'  : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={e => onSelect(recipe.ID, e.shiftKey || e.ctrlKey)}
    >
      <div className="rc-card-toprow">
        <div className={`rc-card-checkbox ${selected ? 'checked' : ''}`}
          onClick={e => { e.stopPropagation(); onSelect(recipe.ID, e.shiftKey || e.ctrlKey); }}>
          {selected && <Check size={9} color="#071018" strokeWidth={3.5} />}
        </div>
        <div className={`rc-enable-toggle ${recipe.Enable ? 'on' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleEnable(recipe.ID); }}>
          <div className="rc-enable-toggle-thumb" />
        </div>
        <div className="rc-card-factory">
          <GameIcon name={recipe.Factory?.name} size={18} />
          <span className="rc-card-factory-name">{recipe.Factory?.name}</span>
        </div>
        <div className="rc-card-actions">
          <button className="rc-card-btn copy-btn" title="创建副本"
            onClick={e => { e.stopPropagation(); onCopy(recipe.ID); }}>副本</button>
          {onDelete && (
            <button className="rc-card-btn del-btn" title="删除副本"
              onClick={e => { e.stopPropagation(); onDelete(recipe.ID); }}>✕</button>
          )}
        </div>
      </div>

      <div className="rc-card-detail">
        {Object.keys(mats).length > 0 && (
          <div className="rc-items-box material">
            {Object.entries(mats).map(([name, qty], i) => (
              <span key={i} className="rc-item-entry">
                <GameIcon name={name.replace(/\[.+?\]$/, '')} size={16} tooltip="top" />
                <span className="rc-item-qty">{qty}</span>
              </span>
            ))}
          </div>
        )}
        <span className="rc-arrow">→</span>
        {Object.keys(prods).length > 0 && (
          <div className="rc-items-box product">
            {Object.entries(prods).map(([name, qty], i) => (
              <span key={i} className="rc-item-entry">
                <GameIcon name={name.replace(/\[.+?\]$/, '')} size={16} tooltip="top" />
                <span className="rc-item-qty">{qty}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════ */
export default function RecipeCfg() {
  const { gameData, recipeData, updateRecipesEnable } = useGameData();
  const { configuration, updateConfig } = useConfig();
  const isOpen = configuration.interface?.recipeCfg || false;

  /* ── sort references ── */
  const orderedBuildings = useMemo(() => buildOrderedList(gameData?.Category?.建筑 || gameData?.Category || {}), [gameData]);
  const orderedItems     = useMemo(() => buildOrderedList(gameData?.Category?.物品  || {}), [gameData]);

  /* ── local state ── */
  const [localRecipes, setLocalRecipes] = useState(() =>
    recipeData.map(r => ({
      ...r,
      Items: { material: { ...(r.Items?.material || {}) }, product: { ...(r.Items?.product || {}) } }
    }))
  );

  // categories: [{ id: string, name: string }]
  const initCats = () => {
    const seen = new Set(); const result = [];
    recipeData.forEach(r => {
      const cat = r.Category;
      if (cat && cat !== '其他建筑' && !seen.has(cat)) { seen.add(cat); result.push({ id: cat, name: cat }); }
    });
    return result;
  };
  const [categories, setCategories] = useState(initCats);
  const [activeCategory, setActiveCategory] = useState(() => initCats()[0]?.id || '');

  // clone tracking
  const [parentIds, setParentIds] = useState(() => new Set());
  const [cloneIds,  setCloneIds]  = useState(() => new Set());

  // selection
  const [selectedLeft,  setSelectedLeft]  = useState(() => new Set());
  const [selectedRight, setSelectedRight] = useState(() => new Set());

  // sort
  const [sortMode,    setSortMode]    = useState('factory');
  const [sortKeyword, setSortKeyword] = useState('');

  // cycle items selection per category  { catId → Set<itemBaseName> }
  const [cycleSelections, setCycleSelections] = useState({});

  // drag
  const dragRef = useRef({ ids: [], source: null });
  const [dragOverLeft,  setDragOverLeft]  = useState(false);
  const [dragCatTarget, setDragCatTarget] = useState(null);
  const [dropIndex,     setDropIndex]     = useState(null);

  /* ── derived ── */
  const catIdSet = useMemo(() => new Set(categories.map(c => c.id)), [categories]);

  const unclassified = useMemo(() =>
    localRecipes.filter(r => !r.Category || !catIdSet.has(r.Category)),
    [localRecipes, catIdSet]);

  const classifiedInActive = useMemo(() =>
    localRecipes.filter(r => r.Category === activeCategory),
    [localRecipes, activeCategory]);

  const doSort = useCallback((list) =>
    [...list].sort((a, b) =>
      cmpKeys(
        recipeSortKey(a, sortMode, orderedBuildings, orderedItems, sortKeyword),
        recipeSortKey(b, sortMode, orderedBuildings, orderedItems, sortKeyword)
      )
    ), [sortMode, sortKeyword, orderedBuildings, orderedItems]);

  const sortedLeft  = useMemo(() => doSort(unclassified),       [doSort, unclassified]);
  const sortedRight = useMemo(() => doSort(classifiedInActive), [doSort, classifiedInActive]);

  /* ── cycle items for active category ── */
  const cycleItems = useMemo(() => {
    const producers = new Set();
    const consumers = new Set();
    classifiedInActive.forEach(r => {
      Object.keys(r.Items?.product  || {}).forEach(k => producers.add(k.replace(/\[.+?\]$/, '')));
      Object.keys(r.Items?.material || {}).forEach(k => consumers.add(k.replace(/\[.+?\]$/, '')));
    });
    const result = new Set();
    producers.forEach(item => { if (consumers.has(item)) result.add(item); });
    return result;
  }, [classifiedInActive]);

  const cycleSelected = useMemo(() => cycleSelections[activeCategory] || new Set(), [cycleSelections, activeCategory]);

  /* ── item renaming ── */
  const applyItemRename = (recipe, itemName, catId, toRenamed) => {
    const suffix  = `[${catId}]`;
    const renamed = `${itemName}${suffix}`;
    const remap = (obj) => {
      const next = {};
      Object.entries(obj).forEach(([k, v]) => {
        const base = k.replace(/\[.+?\]$/, '');
        next[base === itemName ? (toRenamed ? renamed : itemName) : k] = v;
      });
      return next;
    };
    return { ...recipe, Items: { material: remap(recipe.Items?.material || {}), product: remap(recipe.Items?.product || {}) } };
  };

  const revertAllCycleNames = (recipe, catId) => {
    const checked = cycleSelections[catId] || new Set();
    let r = recipe;
    checked.forEach(itemName => { r = applyItemRename(r, itemName, catId, false); });
    return r;
  };

  const applyAllCycleNames = (recipe, catId) => {
    const checked = cycleSelections[catId] || new Set();
    let r = recipe;
    checked.forEach(itemName => { r = applyItemRename(r, itemName, catId, true); });
    return r;
  };

  const toggleCycleItem = (itemName) => {
    const catId    = activeCategory;
    const prevSet  = cycleSelections[catId] || new Set();
    const isOn     = prevSet.has(itemName);
    const nextSet  = new Set(prevSet);
    if (isOn) {
      nextSet.delete(itemName);
      setLocalRecipes(rs => rs.map(r => r.Category === catId ? applyItemRename(r, itemName, catId, false) : r));
    } else {
      nextSet.add(itemName);
      setLocalRecipes(rs => rs.map(r => r.Category === catId ? applyItemRename(r, itemName, catId, true) : r));
    }
    setCycleSelections(prev => ({ ...prev, [catId]: nextSet }));
  };

  // after recipes leave a category, recheck if cycle items are still valid
  const revalidateCycleAfterMove = useCallback((catId, remainingAfterMove) => {
    const checked = cycleSelections[catId];
    if (!checked || checked.size === 0) return;
    const producers = new Set();
    const consumers = new Set();
    remainingAfterMove.forEach(r => {
      Object.keys(r.Items?.product  || {}).forEach(k => producers.add(k.replace(/\[.+?\]$/, '')));
      Object.keys(r.Items?.material || {}).forEach(k => consumers.add(k.replace(/\[.+?\]$/, '')));
    });
    const toRemove = [...checked].filter(item => !(producers.has(item) && consumers.has(item)));
    if (toRemove.length === 0) return;
    // revert names in remaining recipes
    setLocalRecipes(rs => rs.map(r => {
      if (r.Category !== catId) return r;
      let updated = r;
      toRemove.forEach(item => { updated = applyItemRename(updated, item, catId, false); });
      return updated;
    }));
    setCycleSelections(prev => {
      const next = new Set(prev[catId]);
      toRemove.forEach(item => next.delete(item));
      return { ...prev, [catId]: next };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleSelections]);

  /* ── move helpers ── */
  const moveToCategory = useCallback((idSet, targetCat) => {
    // group by source cat for revalidation
    const sourceCatMap = {};
    localRecipes.forEach(r => {
      if (idSet.has(r.ID) && r.Category && r.Category !== targetCat) {
        if (!sourceCatMap[r.Category]) sourceCatMap[r.Category] = [];
        sourceCatMap[r.Category].push(r.ID);
      }
    });

    setLocalRecipes(rs => rs.map(r => {
      if (!idSet.has(r.ID)) return r;
      let updated = revertAllCycleNames(r, r.Category);
      updated = applyAllCycleNames(updated, targetCat);
      return { ...updated, Category: targetCat };
    }));

    // revalidate sources
    Object.entries(sourceCatMap).forEach(([catId, movedIds]) => {
      const movedSet = new Set(movedIds);
      const remaining = localRecipes.filter(r => r.Category === catId && !movedSet.has(r.ID));
      revalidateCycleAfterMove(catId, remaining);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRecipes, cycleSelections, revalidateCycleAfterMove]);

  const moveToUnclassified = useCallback((idSet) => {
    const sourceCatMap = {};
    localRecipes.forEach(r => {
      if (idSet.has(r.ID) && r.Category) {
        if (!sourceCatMap[r.Category]) sourceCatMap[r.Category] = [];
        sourceCatMap[r.Category].push(r.ID);
      }
    });

    setLocalRecipes(rs => rs.map(r => {
      if (!idSet.has(r.ID)) return r;
      const updated = revertAllCycleNames(r, r.Category);
      return { ...updated, Category: '' };
    }));

    Object.entries(sourceCatMap).forEach(([catId, movedIds]) => {
      const movedSet = new Set(movedIds);
      const remaining = localRecipes.filter(r => r.Category === catId && !movedSet.has(r.ID));
      revalidateCycleAfterMove(catId, remaining);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRecipes, cycleSelections, revalidateCycleAfterMove]);

  /* ── selection ── */
  const handleSelectLeft  = (id, multi) => {
    setSelectedRight(new Set());
    setSelectedLeft(prev => {
      const next = multi ? new Set(prev) : new Set();
      if (prev.has(id) && !multi) return new Set(); // deselect
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleSelectRight = (id, multi) => {
    setSelectedLeft(new Set());
    setSelectedRight(prev => {
      const next = multi ? new Set(prev) : new Set();
      if (prev.has(id) && !multi) return new Set();
      prev.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── enable toggle ── */
  const toggleEnable = (id) =>
    setLocalRecipes(rs => rs.map(r => r.ID === id ? { ...r, Enable: !r.Enable } : r));

  /* ── copy / delete ── */
  const handleCopy = (id) => {
    const source = localRecipes.find(r => r.ID === id);
    if (!source) return;
    const newId = Math.max(0, ...localRecipes.map(r => r.ID)) + 1;
    const clone = {
      ...source, ID: newId,
      Items: { material: { ...source.Items?.material }, product: { ...source.Items?.product } }
    };
    setLocalRecipes(rs => [...rs, clone]);
    const realParent = cloneIds.has(id)
      ? localRecipes.find(r => parentIds.has(r.ID) && r.Factory?.name === source.Factory?.name)?.ID || id
      : id;
    setParentIds(prev => new Set([...prev, realParent]));
    setCloneIds(prev => new Set([...prev, newId]));
  };

  const handleDelete = (id) => {
    setLocalRecipes(rs => rs.filter(r => r.ID !== id));
    setCloneIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    // if no more clones exist for a parent, un-mark parent
    setParentIds(prev => {
      const remainingClones = [...cloneIds].filter(cid => cid !== id);
      const n = new Set(prev);
      n.forEach(pid => {
        const pRecipe = localRecipes.find(r => r.ID === pid);
        const hasClone = remainingClones.some(cid => {
          const cr = localRecipes.find(r => r.ID === cid);
          return cr && pRecipe && cr.Factory?.name === pRecipe.Factory?.name;
        });
        if (!hasClone) n.delete(pid);
      });
      return n;
    });
  };

  /* ── category management ── */
  const addCategory = () => {
    const newId = `cat_${Date.now()}`;
    setCategories(prev => [...prev, { id: newId, name: '新类别' }]);
    setActiveCategory(newId);
  };

  const renameCategory = (catId, newName) => {
    if (!newName.trim()) return;
    setCategories(prev => prev.map(c => c.id === catId ? { id: newName, name: newName } : c));
    setLocalRecipes(rs => rs.map(r => r.Category === catId ? { ...r, Category: newName } : r));
    setCycleSelections(prev => {
      if (!(catId in prev)) return prev;
      const n = { ...prev }; n[newName] = n[catId]; delete n[catId]; return n;
    });
    if (activeCategory === catId) setActiveCategory(newName);
  };

  const deleteCategory = (catId) => {
    const toMove = new Set(localRecipes.filter(r => r.Category === catId).map(r => r.ID));
    moveToUnclassified(toMove);
    setCategories(prev => prev.filter(c => c.id !== catId));
    setCycleSelections(prev => { const n = { ...prev }; delete n[catId]; return n; });
    if (activeCategory === catId) {
      const remaining = categories.filter(c => c.id !== catId);
      setActiveCategory(remaining[0]?.id || '');
    }
  };

  /* ── drag ── */
  const handleDragStart = (e, id, source) => {
    const pool = source === 'left'
      ? (selectedLeft.has(id)  ? selectedLeft  : new Set([id]))
      : (selectedRight.has(id) ? selectedRight : new Set([id]));
    dragRef.current = { ids: [...pool], source };
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd = () => {
    setDragOverLeft(false); setDragCatTarget(null); setDropIndex(null);
    dragRef.current = { ids: [], source: null };
  };

  const handleDropLeft = (e) => {
    e.preventDefault(); setDragOverLeft(false);
    const { ids, source } = dragRef.current;
    if (source === 'right') moveToUnclassified(new Set(ids));
    handleDragEnd();
  };

  const handleDropCat = (e, catId) => {
    e.preventDefault(); e.stopPropagation(); setDragCatTarget(null);
    const { ids } = dragRef.current;
    moveToCategory(new Set(ids), catId);
    handleDragEnd();
  };

  const handleDropRight = (e, insertIdx) => {
    e.preventDefault(); setDropIndex(null);
    const { ids, source } = dragRef.current;
    if (source === 'left') {
      moveToCategory(new Set(ids), activeCategory);
    } else {
      // reorder within right panel
      setLocalRecipes(rs => {
        const inGroup  = rs.filter(r => r.Category === activeCategory);
        const outGroup = rs.filter(r => r.Category !== activeCategory);
        const idSet = new Set(ids);
        const moving = inGroup.filter(r => idSet.has(r.ID));
        const rest   = inGroup.filter(r => !idSet.has(r.ID));
        rest.splice(Math.min(insertIdx, rest.length), 0, ...moving);
        return [...outGroup, ...rest];
      });
    }
    handleDragEnd();
  };

  /* ── confirm ── */
  const handleClose   = () => updateConfig('interface.recipeCfg', false);
  const handleConfirm = () => {
    const toEnable  = localRecipes.filter(r =>  r.Enable).map(r => r.ID);
    const toDisable = localRecipes.filter(r => !r.Enable).map(r => r.ID);
    if (toEnable.length)  updateRecipesEnable(toEnable,  true);
    if (toDisable.length) updateRecipesEnable(toDisable, false);
    handleClose();
  };

  if (!isOpen) return null;

  /* ── render ── */
  const activeCat = categories.find(c => c.id === activeCategory);

  return (
    <div className="rc-overlay" onClick={handleClose}>
      <div className="rc-shell" onClick={e => e.stopPropagation()}>

        {/* TOP BAR */}
        <div className="rc-topbar">
          <span className="rc-title">配方配置</span>
          <button className="rc-topbar-btn" onClick={() =>
            setLocalRecipes(rs => { updateRecipesEnable(rs.map(r => r.ID), true); return rs.map(r => ({ ...r, Enable: true })); })
          }>全部启用</button>
          <button className="rc-topbar-btn" onClick={() =>
            setLocalRecipes(rs => { updateRecipesEnable(rs.map(r => r.ID), false); return rs.map(r => ({ ...r, Enable: false })); })
          }>全部禁用</button>
          <button className="rc-close-btn" onClick={handleClose}><X size={18} /></button>
        </div>

        {/* SORT BAR */}
        <div className="rc-sortbar">
          <span className="rc-sortbar-label">排序:</span>
          {[['factory','建筑'],['material','原料'],['product','产物']].map(([m, label]) => (
            <button key={m} className={`rc-sort-btn ${sortMode === m ? 'active' : ''}`}
              onClick={() => setSortMode(m)}>{label}</button>
          ))}
          <div className="rc-sortbar-sep" />
          <span className="rc-sortbar-label">关键词:</span>
          <input className="rc-search-input"
            placeholder={sortMode === 'factory' ? '建筑名…' : sortMode === 'material' ? '原料名…' : '产物名…'}
            value={sortKeyword} onChange={e => setSortKeyword(e.target.value)} />
          <div className="rc-sortbar-sep" />
          <span className="rc-sortbar-label" style={{ color: '#334155' }}>
            点击=选中 · Ctrl/Shift+点击=多选 · 拖拽=移动
          </span>
        </div>

        {/* BODY */}
        <div className="rc-body">

          {/* ══ LEFT ══ */}
          <div className="rc-left">
            <div className="rc-panel-header">
              <span className="rc-panel-title">未分类配方</span>
              <span className="rc-count-badge">{unclassified.length}</span>
              <button className="rc-select-all-btn" onClick={() =>
                setSelectedLeft(selectedLeft.size === unclassified.length && unclassified.length > 0
                  ? new Set() : new Set(unclassified.map(r => r.ID)))}>
                {selectedLeft.size > 0 && selectedLeft.size === unclassified.length ? '取消全选' : '全选'}
              </button>
              {selectedLeft.size > 0 && activeCat && (
                <button className="rc-select-all-btn"
                  style={{ color: '#00d9ff', borderColor: 'rgba(0,217,255,.4)' }}
                  onClick={() => { moveToCategory(selectedLeft, activeCategory); setSelectedLeft(new Set()); }}>
                  → {activeCat.name}
                </button>
              )}
            </div>
            <div className={`rc-recipe-list ${dragOverLeft ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverLeft(true); }}
              onDragLeave={() => setDragOverLeft(false)}
              onDrop={handleDropLeft}>
              {sortedLeft.map(recipe => (
                <RecipeCard key={recipe.ID} recipe={recipe}
                  selected={selectedLeft.has(recipe.ID)}
                  onSelect={handleSelectLeft}
                  onToggleEnable={toggleEnable}
                  onCopy={handleCopy}
                  onDelete={cloneIds.has(recipe.ID) ? handleDelete : null}
                  isDragging={dragRef.current.ids?.includes(recipe.ID)}
                  draggable onDragStart={e => handleDragStart(e, recipe.ID, 'left')} onDragEnd={handleDragEnd}
                  isParent={parentIds.has(recipe.ID)} isClone={cloneIds.has(recipe.ID)} />
              ))}
              {sortedLeft.length === 0 && (
                <div style={{ color:'#2a4a5a', fontFamily:'JetBrains Mono', fontSize:'.8rem', padding:'2rem', textAlign:'center' }}>
                  所有配方已分类
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT ══ */}
          <div className="rc-right">

            {/* category sidebar */}
            <div className="rc-cat-sidebar">
              {categories.map(cat => (
                <button key={cat.id}
                  className={['rc-cat-btn', activeCategory === cat.id ? 'active' : '', dragCatTarget === cat.id ? 'drag-target' : ''].join(' ')}
                  onClick={() => setActiveCategory(cat.id)}
                  onDragOver={e => { e.preventDefault(); setDragCatTarget(cat.id); }}
                  onDragLeave={() => setDragCatTarget(null)}
                  onDrop={e => handleDropCat(e, cat.id)}
                  title={cat.name}>
                  <span className="rc-cat-btn-text">{cat.name}</span>
                  <span className="rc-cat-count">{localRecipes.filter(r => r.Category === cat.id).length}</span>
                </button>
              ))}
              <button className="rc-add-cat-btn" onClick={addCategory} title="新建类别">
                <Plus size={14} />
              </button>
            </div>

            {/* right content */}
            <div className="rc-right-content">
              {activeCat && (
                <div className="rc-cat-toolbar">
                  <input className="rc-cat-name-input" value={activeCat.name}
                    onChange={e => renameCategory(activeCat.id, e.target.value)} />
                  <span className="rc-count-badge">{classifiedInActive.length} 个配方</span>
                  {selectedRight.size > 0 && (
                    <button className="rc-select-all-btn"
                      style={{ color:'#ef9a9a', borderColor:'rgba(239,68,68,.3)' }}
                      onClick={() => { moveToUnclassified(selectedRight); setSelectedRight(new Set()); }}>
                      ← 移出
                    </button>
                  )}
                  <button className="rc-select-all-btn" style={{ marginLeft: 'auto' }}
                    onClick={() => setSelectedRight(
                      selectedRight.size === classifiedInActive.length && classifiedInActive.length > 0
                        ? new Set() : new Set(classifiedInActive.map(r => r.ID)))}>
                    {selectedRight.size === classifiedInActive.length && classifiedInActive.length > 0 ? '取消全选' : '全选'}
                  </button>
                  <button className="rc-cat-toolbar-btn" onClick={() => deleteCategory(activeCategory)}>
                    <Trash2 size={11} /> 删除此类
                  </button>
                </div>
              )}

              <div className="rc-recipe-list" style={{ flex:1, minHeight:0 }}
                onDragOver={e => { e.preventDefault(); setDropIndex(sortedRight.length); }}
                onDragLeave={() => setDropIndex(null)}
                onDrop={e => handleDropRight(e, sortedRight.length)}>
                {sortedRight.map((recipe, idx) => (
                  <div key={recipe.ID}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropIndex(idx); }}
                    onDrop={e => { e.stopPropagation(); handleDropRight(e, idx); }}>
                    {dropIndex === idx && dragRef.current.source && <div className="rc-drop-indicator" />}
                    <RecipeCard recipe={recipe}
                      selected={selectedRight.has(recipe.ID)}
                      onSelect={handleSelectRight}
                      onToggleEnable={toggleEnable}
                      onCopy={handleCopy}
                      onDelete={cloneIds.has(recipe.ID) ? handleDelete : null}
                      isDragging={dragRef.current.ids?.includes(recipe.ID)}
                      draggable onDragStart={e => handleDragStart(e, recipe.ID, 'right')} onDragEnd={handleDragEnd}
                      isParent={parentIds.has(recipe.ID)} isClone={cloneIds.has(recipe.ID)} />
                  </div>
                ))}
                {sortedRight.length === 0 && activeCat && (
                  <div style={{ color:'#2a4a5a', fontFamily:'JetBrains Mono', fontSize:'.8rem', padding:'2rem', textAlign:'center' }}>
                    拖入配方或从左侧选择后点击移入
                  </div>
                )}
              </div>
            </div>

            {/* CYCLE ITEMS PANEL */}
            <div className="rc-cycle-panel">
              <div className="rc-cycle-header">组内循环物品</div>
              <div className="rc-cycle-list">
                {[...cycleItems].map(itemName => (
                  <div key={itemName}
                    className={`rc-cycle-item ${cycleSelected.has(itemName) ? 'checked' : ''}`}
                    onClick={() => toggleCycleItem(itemName)}
                    title={cycleSelected.has(itemName)
                      ? `取消：组内"${itemName}[${activeCategory}]"恢复为"${itemName}"`
                      : `勾选：组内"${itemName}"改名为"${itemName}[${activeCategory}]"`}>
                    <GameIcon name={itemName} size={24} tooltip="top" />
                    <div className="rc-cycle-check">
                      {cycleSelected.has(itemName) && <Check size={9} color="#071018" strokeWidth={3.5} />}
                    </div>
                    <span className="rc-cycle-name">{itemName}</span>
                  </div>
                ))}
                {cycleItems.size === 0 && (
                  <div style={{ color:'#1a3a4a', fontFamily:'JetBrains Mono', fontSize:'.58rem', padding:'.5rem', textAlign:'center', lineHeight:1.5 }}>
                    无循环<br/>物品
                  </div>
                )}
              </div>
            </div>

          </div>{/* rc-right */}
        </div>{/* rc-body */}

        {/* CONFIRM BAR */}
        <div className="rc-confirm-bar">
          <span className="rc-confirm-hint">
            {selectedLeft.size > 0 && `已选左侧 ${selectedLeft.size} 个 · `}
            {selectedRight.size > 0 && `已选右侧 ${selectedRight.size} 个 · `}
            蓝色=普通 · 深紫=有副本 · 淡紫虚线=副本（可删除）
          </span>
          <button className="rc-confirm-btn" onClick={handleConfirm}>
            <Check size={15} /> 确认
          </button>
        </div>

      </div>
    </div>
  );
}
