import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, Check, Plus, Trash2, GripVertical, Search } from 'lucide-react';
import GameIcon from '../GameIcon';
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext';
import { encodeItemName, getBaseName } from '@/calculation/itemName';
import './RecipeCfg.css';

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const UNCLASSIFIED = '####';

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */
function buildOrderedList(categoryData) {
  const ordered = [], seen = new Set();
  const push = n => { if (!seen.has(n)) { ordered.push(n); seen.add(n); } };
  Object.values(categoryData || {}).forEach(val => {
    if (Array.isArray(val)) val.forEach(push);
    else if (val && typeof val === 'object')
      Object.values(val).forEach(arr => Array.isArray(arr) && arr.forEach(push));
  });
  return ordered;
}

/* ═══════════════════════════════════════════════════
   RECIPE CARD
═══════════════════════════════════════════════════ */
function RecipeCard({
  recipe, selected, onSelect, onToggleEnable, onCopy, onDelete,
  onDragStart, onDragEnd, isParent, isClone, isDragging, isHighlighted,
  onMouseEnter,
}) {
  const mats  = recipe.Items?.material || {};
  const prods = recipe.Items?.product  || {};
  const cls = ['rc-recipe-card',
    selected       ? 'selected'      : '',
    !recipe.Enable ? 'disabled'      : '',
    isDragging     ? 'dragging'      : '',
    isParent       ? 'is-parent'     : '',
    isClone        ? 'is-clone'      : '',
    isHighlighted  ? 'jump-highlight': '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}
      onClick={e => onSelect(recipe.ID, e)}
      onMouseEnter={onMouseEnter}>
      <div className="rc-card-layout">
        <div className="rc-drag-handle" draggable
          onDragStart={onDragStart} onDragEnd={onDragEnd}
          onClick={e => e.stopPropagation()} title="拖拽移动">
          <GripVertical size={14}/>
        </div>
        <div className="rc-card-content">
          <div className="rc-card-toprow">
            <div className={`rc-card-checkbox ${selected ? 'checked' : ''}`}
              onClick={e => { e.stopPropagation(); onSelect(recipe.ID, e); }}>
              {selected && <Check size={9} color="#071018" strokeWidth={3.5}/>}
            </div>
            <div className={`rc-enable-toggle ${recipe.Enable ? 'on' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleEnable(recipe.ID); }}>
              <div className="rc-enable-toggle-thumb"/>
            </div>
            <div className="rc-card-factory">
              <GameIcon name={recipe.Factory?.name} size={18}/>
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
                    <GameIcon name={name} size={16} tooltip="top" tooltipData={name}/>
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
                    <GameIcon name={name} size={16} tooltip="top" tooltipData={name}/>
                    <span className="rc-item-qty">{qty}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SEARCH JUMP CONTROL  (replaces sort)
═══════════════════════════════════════════════════ */
function SearchControl({ side, keyword, mode, onChange, onJump, matchCount, jumpIdx }) {
  return (
    <div className="rc-sortbar-inner">
      <span className="rc-sortbar-label">{side === 'left' ? '左' : '右'}侧搜索:</span>
      {[['factory','建筑'],['material','原料'],['product','产物']].map(([m, label]) => (
        <button key={m} className={`rc-sort-btn ${mode === m ? 'active' : ''}`}
          onClick={() => onChange('mode', m)}>{label}</button>
      ))}
      <div className="rc-search-wrap">
        <Search size={12} className="rc-search-icon"/>
        <input className="rc-search-input"
          placeholder={mode === 'factory' ? '建筑名…' : mode === 'material' ? '原料名…' : '产物名…'}
          value={keyword}
          onChange={e => onChange('keyword', e.target.value)}/>
      </div>
      {keyword && (
        <button className="rc-sort-btn" onClick={onJump}
          title="跳转到下一个匹配配方">
          {matchCount > 0 ? `${jumpIdx + 1}/${matchCount} ↓` : '无匹配'}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════ */
export default function RecipeCfg() {
  const { gameData, recipeData, updateRecipeData } = useGameData();
  const { configuration, updateConfig } = useConfig();
  const isOpen = configuration.interface?.recipeCfg || false;

  /* ── sort/search references ── */
  const orderedBuildings = useMemo(() =>
    buildOrderedList(gameData?.Category?.建筑 || gameData?.Category || {}), [gameData]);
  const orderedItems = useMemo(() =>
    buildOrderedList(gameData?.Category?.物品 || {}), [gameData]);

  /* ══════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════ */
  // localMap: { catId → recipe[] }  (recipes in display/drag order)
  // catOrder: string[]
  const initState = () => {
    const map = {}, order = [], seen = new Set();
    recipeData.forEach(r => {
      const cat = (!r.Category || r.Category === '其他建筑') ? UNCLASSIFIED : r.Category;
      const recipe = {
        ...r,
        Category: cat,
        Enable: cat === UNCLASSIFIED ? true : r.Enable,
        Items: { material: { ...(r.Items?.material || {}) }, product: { ...(r.Items?.product || {}) } },
      };
      if (!map[cat]) map[cat] = [];
      map[cat].push(recipe);
      if (!seen.has(cat)) { seen.add(cat); order.push(cat); }
    });
    // Keep UNCLASSIFIED at end of order
    const uidx = order.indexOf(UNCLASSIFIED);
    if (uidx > -1 && uidx < order.length - 1) {
      order.splice(uidx, 1); order.push(UNCLASSIFIED);
    }
    return { map, order };
  };

  const [localMap, setLocalMap]         = useState(() => initState().map);
  const [catOrder, setCatOrder]         = useState(() => initState().order);
  const [activeCategory, setActiveCategory] = useState(() => {
    const { order } = initState();
    return order.find(c => c !== UNCLASSIFIED) || order[0] || '';
  });

  const flatRecipes = useMemo(() => catOrder.flatMap(c => localMap[c] || []), [localMap, catOrder]);
  const rightCats   = useMemo(() => catOrder.filter(c => c !== UNCLASSIFIED), [catOrder]);

  /* ── clone tracking ── */
  const [parentIds,      setParentIds]      = useState(() => new Set());
  const [cloneIds,       setCloneIds]       = useState(() => new Set());
  const parentToClones   = useRef({});
  const [showCloneViewer, setShowCloneViewer] = useState(false);
  useEffect(() => { if (parentIds.size === 0) setShowCloneViewer(false); }, [parentIds]);

  /* ── selection ── */
  const [selectedLeft,  setSelectedLeft]  = useState(() => new Set());
  const [selectedRight, setSelectedRight] = useState(() => new Set());
  const lastClickedLeft  = useRef(null);
  const lastClickedRight = useRef(null);

  /* ── search (replaces sort) ── */
  const [leftSearch,  setLeftSearch]  = useState({ mode: 'factory', keyword: '' });
  const [rightSearch, setRightSearch] = useState({ mode: 'factory', keyword: '' });
  // jump indices for search
  const leftJumpIdx  = useRef(0);
  const rightJumpIdx = useRef(0);
  const [leftJumpState,  setLeftJumpState]  = useState({ idx: -1, count: 0 });
  const [rightJumpState, setRightJumpState] = useState({ idx: -1, count: 0 });

  /* ── cycle items ── */
  const [cycleSelections, setCycleSelections] = useState({});
  const [jumpStates,     setJumpStates]     = useState({});
  const [activeJumpItem, setActiveJumpItem] = useState(null);

  /* ── highlight (cleared on hover, not timeout) ── */
  const [highlightedId, setHighlightedId] = useState(null);

  /* ── drag ── */
  const dragRef    = useRef({ ids: [], source: null });
  const catDragRef = useRef(null);
  const [dragOverLeft,  setDragOverLeft]  = useState(false);
  const [dragCatTarget, setDragCatTarget] = useState(null);
  const [catDropTarget, setCatDropTarget] = useState(null);
  const [dropIndex,     setDropIndex]     = useState(null); // { listId, idx }

  /* ── scroll refs ── */
  const leftListRef   = useRef(null);
  const rightListRef  = useRef(null);
  const leftCardRefs  = useRef({});
  const rightCardRefs = useRef({});

  /* ─────────────────────────────────────────────
     DERIVED LISTS  (no sort — preserve drag order)
  ───────────────────────────────────────────── */
  const unclassifiedList   = useMemo(() => localMap[UNCLASSIFIED] || [], [localMap]);
  const classifiedInActive = useMemo(() => localMap[activeCategory] || [], [localMap, activeCategory]);

  /* ── search matches ── */
  const matchesFor = useCallback((list, search) => {
    const kw = search.keyword.trim();
    if (!kw) return [];
    return list.filter(r => {
      if (search.mode === 'factory') return (r.Factory?.name || '').includes(kw);
      if (search.mode === 'material') return Object.keys(r.Items?.material || {}).some(k => getBaseName(k).includes(kw));
      return Object.keys(r.Items?.product || {}).some(k => getBaseName(k).includes(kw));
    });
  }, []);

  const leftMatches  = useMemo(() => matchesFor(unclassifiedList,   leftSearch),  [matchesFor, unclassifiedList,   leftSearch]);
  const rightMatches = useMemo(() => matchesFor(classifiedInActive, rightSearch), [matchesFor, classifiedInActive, rightSearch]);

  // Reset jump index when keyword changes
  useEffect(() => { leftJumpIdx.current = 0; setLeftJumpState({ idx: -1, count: leftMatches.length }); }, [leftSearch.keyword, leftSearch.mode, leftMatches.length]);
  useEffect(() => { rightJumpIdx.current = 0; setRightJumpState({ idx: -1, count: rightMatches.length }); }, [rightSearch.keyword, rightSearch.mode, rightMatches.length]);

  /* ── cycle items detection ── */
  const cycleItems = useMemo(() => {
    const producers = new Set(), consumers = new Set();
    classifiedInActive.forEach(r => {
      Object.keys(r.Items?.product  || {}).forEach(k => producers.add(getBaseName(k)));
      Object.keys(r.Items?.material || {}).forEach(k => consumers.add(getBaseName(k)));
    });
    const result = new Set();
    producers.forEach(item => { if (consumers.has(item)) result.add(item); });
    return result;
  }, [classifiedInActive]);

  const cycleSelected = useMemo(() => cycleSelections[activeCategory] || new Set(), [cycleSelections, activeCategory]);

  /* ─────────────────────────────────────────────
     SEARCH JUMP
  ───────────────────────────────────────────── */
  const scrollToCard = (id, listRef, cardRefs) => {
    const el = cardRefs.current[id];
    const container = listRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top + container.scrollTop;
    container.scrollTo({ top: relativeTop - 8, behavior: 'smooth' });
  };

  const handleLeftJump = () => {
    if (!leftMatches.length) return;
    const idx = leftJumpIdx.current % leftMatches.length;
    leftJumpIdx.current = idx + 1;
    const target = leftMatches[idx];
    setHighlightedId(target.ID);
    setLeftJumpState({ idx, count: leftMatches.length });
    scrollToCard(target.ID, leftListRef, leftCardRefs);
  };

  const handleRightJump = () => {
    if (!rightMatches.length) return;
    const idx = rightJumpIdx.current % rightMatches.length;
    rightJumpIdx.current = idx + 1;
    const target = rightMatches[idx];
    setHighlightedId(target.ID);
    setRightJumpState({ idx, count: rightMatches.length });
    scrollToCard(target.ID, rightListRef, rightCardRefs);
  };

  /* ─────────────────────────────────────────────
     MAP HELPERS
  ───────────────────────────────────────────── */
  const updateCatList = useCallback((catId, updater) => {
    setLocalMap(prev => ({ ...prev, [catId]: updater(prev[catId] || []) }));
  }, []);

  const mapAllRecipes = useCallback(fn => {
    setLocalMap(prev => {
      const next = {};
      Object.entries(prev).forEach(([cat, list]) => { next[cat] = list.map(fn); });
      return next;
    });
  }, []);

  const removeRecipes = useCallback(idSet => {
    setLocalMap(prev => {
      const next = {};
      Object.entries(prev).forEach(([cat, list]) => { next[cat] = list.filter(r => !idSet.has(r.ID)); });
      return next;
    });
  }, []);

  /* ─────────────────────────────────────────────
     ITEM RENAMING
  ───────────────────────────────────────────── */
  const applyItemRename = (recipe, baseName, catId, toRenamed) => {
    const encoded = encodeItemName(baseName, catId);
    const remap = obj => {
      const next = {};
      Object.entries(obj).forEach(([k, v]) => {
        const base = getBaseName(k);
        next[base === baseName ? (toRenamed ? encoded : baseName) : k] = v;
      });
      return next;
    };
    return { ...recipe, Items: { material: remap(recipe.Items?.material || {}), product: remap(recipe.Items?.product || {}) } };
  };

  const revertAllCycleNames = (recipe, catId) => {
    const checked = cycleSelections[catId] || new Set();
    let r = recipe;
    checked.forEach(item => { r = applyItemRename(r, item, catId, false); });
    return r;
  };

  const applyAllCycleNames = (recipe, catId) => {
    const checked = cycleSelections[catId] || new Set();
    let r = recipe;
    checked.forEach(item => { r = applyItemRename(r, item, catId, true); });
    return r;
  };

  const toggleCycleItem = (baseName) => {
    const catId = activeCategory;
    const prevSet = cycleSelections[catId] || new Set();
    const isOn = prevSet.has(baseName);
    const nextSet = new Set(prevSet);
    if (isOn) {
      nextSet.delete(baseName);
      updateCatList(catId, list => list.map(r => applyItemRename(r, baseName, catId, false)));
    } else {
      nextSet.add(baseName);
      updateCatList(catId, list => list.map(r => applyItemRename(r, baseName, catId, true)));
    }
    setCycleSelections(prev => ({ ...prev, [catId]: nextSet }));
  };

  const revalidateCycleAfterMove = (catId, remaining) => {
    const checked = cycleSelections[catId];
    if (!checked || checked.size === 0) return;
    const producers = new Set(), consumers = new Set();
    remaining.forEach(r => {
      Object.keys(r.Items?.product  || {}).forEach(k => producers.add(getBaseName(k)));
      Object.keys(r.Items?.material || {}).forEach(k => consumers.add(getBaseName(k)));
    });
    const toRemove = [...checked].filter(item => !(producers.has(item) && consumers.has(item)));
    if (!toRemove.length) return;
    updateCatList(catId, list => list.map(r => {
      let u = r; toRemove.forEach(item => { u = applyItemRename(u, item, catId, false); }); return u;
    }));
    setCycleSelections(prev => {
      const next = new Set(prev[catId]);
      toRemove.forEach(item => next.delete(item));
      return { ...prev, [catId]: next };
    });
  };

  /* ─────────────────────────────────────────────
     MOVE HELPERS
     All moves operate directly on localMap arrays (no sort layer).
  ───────────────────────────────────────────── */

  // Move idSet from wherever they are to targetCat, inserting at insertIdx
  // insertIdx = -1 means append to end
  const doMoveToCategory = useCallback((idSet, targetCat, insertIdx = -1) => {
    setLocalMap(prev => {
      const next = { ...prev };
      const movingRecipes = [];
      // Iterate ALL keys in prev (not catOrder closure which may be stale)
      Object.keys(next).forEach(cat => {
        const list = next[cat] || [];
        const moving = list.filter(r => idSet.has(r.ID));
        if (moving.length === 0) return;
        moving.forEach(r => {
          let u = revertAllCycleNames(r, r.Category);
          u = applyAllCycleNames(u, targetCat);
          movingRecipes.push({ ...u, Category: targetCat });
        });
        next[cat] = list.filter(r => !idSet.has(r.ID));
      });
      // Also remove from targetCat if already there (re-insert at new pos)
      next[targetCat] = (next[targetCat] || []).filter(r => !idSet.has(r.ID));
      // Insert
      const arr = [...(next[targetCat] || [])];
      const idx = insertIdx < 0 ? arr.length : Math.min(insertIdx, arr.length);
      arr.splice(idx, 0, ...movingRecipes);
      next[targetCat] = arr;
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleSelections]);

  // Reorder within same category
  const doReorderInCategory = useCallback((catId, idSet, insertIdx) => {
    setLocalMap(prev => {
      const n = { ...prev };
      const arr = [...(n[catId] || [])];
      const moving = arr.filter(r => idSet.has(r.ID));
      const rest   = arr.filter(r => !idSet.has(r.ID));
      // Compute how many movers appear before insertIdx in original arr
      let moversBeforeIdx = 0;
      for (let i = 0; i < Math.min(insertIdx, arr.length); i++) {
        if (idSet.has(arr[i].ID)) moversBeforeIdx++;
      }
      const restIdx = Math.min(Math.max(0, insertIdx - moversBeforeIdx), rest.length);
      rest.splice(restIdx, 0, ...moving);
      n[catId] = rest;
      return n;
    });
  }, []);

  /* ─────────────────────────────────────────────
     CYCLE JUMP
  ───────────────────────────────────────────── */
  const handleCycleJumpClick = (baseName) => {
    const matches = classifiedInActive.filter(r =>
      Object.keys(r.Items?.product  || {}).some(k => getBaseName(k) === baseName) ||
      Object.keys(r.Items?.material || {}).some(k => getBaseName(k) === baseName)
    );
    if (!matches.length) return;
    const total = matches.length;

    setJumpStates(prev => {
      const switching = activeJumpItem !== baseName;
      const prevCur = switching ? -1 : (prev[baseName]?.cur ?? -1);
      const next = (prevCur + 1) % total;
      // Clear old highlight immediately
      setHighlightedId(null);
      if (switching) setActiveJumpItem(baseName);
      const targetId = matches[next].ID;
      // Scroll
      scrollToCard(targetId, rightListRef, rightCardRefs);
      setTimeout(() => setHighlightedId(targetId), 50); // slight delay to ensure scroll completes
      return { ...prev, [baseName]: { cur: next, total } };
    });
  };

  /* ─────────────────────────────────────────────
     SELECTION
  ───────────────────────────────────────────── */
  const buildSelectHandler = (list, selected, setSelected, lastClicked, setOtherSet) =>
    (id, e) => {
      setOtherSet(new Set());
      const isCtrl = e.ctrlKey || e.metaKey, isShift = e.shiftKey;
      if (isShift && lastClicked.current !== null) {
        const ids = list.map(r => r.ID);
        const fromIdx = ids.indexOf(lastClicked.current), toIdx = ids.indexOf(id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
          setSelected(prev => { const n = new Set(prev); ids.slice(lo, hi + 1).forEach(rid => n.add(rid)); return n; });
        }
        return;
      }
      if (isCtrl) {
        setSelected(prev => { const n = new Set(prev); prev.has(id) ? n.delete(id) : n.add(id); return n; });
      } else {
        setSelected(prev => prev.size === 1 && prev.has(id) ? new Set() : new Set([id]));
      }
      lastClicked.current = id;
    };

  const handleSelectLeft  = useMemo(() =>
    buildSelectHandler(unclassifiedList,   selectedLeft,  setSelectedLeft,  lastClickedLeft,  setSelectedRight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unclassifiedList, selectedLeft]);

  const handleSelectRight = useMemo(() =>
    buildSelectHandler(classifiedInActive, selectedRight, setSelectedRight, lastClickedRight, setSelectedLeft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classifiedInActive, selectedRight]);

  /* ─────────────────────────────────────────────
     ENABLE TOGGLE
  ───────────────────────────────────────────── */
  const toggleEnable = id =>
    mapAllRecipes(r => r.ID === id ? { ...r, Enable: !r.Enable } : r);

  /* ─────────────────────────────────────────────
     COPY / DELETE
  ───────────────────────────────────────────── */
  const handleCopy = (id) => {
    const source = flatRecipes.find(r => r.ID === id);
    if (!source) return;
    const newId = Math.max(0, ...flatRecipes.map(r => r.ID)) + 1;
    const clone = {
      ...source, ID: newId,
      Items: { material: { ...source.Items?.material }, product: { ...source.Items?.product } },
    };
    const realParent = cloneIds.has(id)
      ? flatRecipes.find(r => parentIds.has(r.ID) && r.Factory?.name === source.Factory?.name)?.ID || id
      : id;
    // Insert clone immediately after parent in its category list
    updateCatList(source.Category, list => {
      const idx = list.findIndex(r => r.ID === id);
      const arr = [...list];
      arr.splice(idx + 1, 0, clone); // insert right after parent
      return arr;
    });
    setParentIds(prev => new Set([...prev, realParent]));
    setCloneIds(prev => new Set([...prev, newId]));
    parentToClones.current[realParent] = [...(parentToClones.current[realParent] || []), newId];
  };

  const handleDelete = (id) => {
    removeRecipes(new Set([id]));
    setCloneIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    Object.keys(parentToClones.current).forEach(pid => {
      parentToClones.current[pid] = parentToClones.current[pid].filter(cid => cid !== id);
    });
    setParentIds(prev => {
      const n = new Set(prev);
      n.forEach(pid => {
        if ((parentToClones.current[pid] || []).length === 0) {
          n.delete(pid); delete parentToClones.current[pid];
        }
      });
      return n;
    });
  };

  /* ─────────────────────────────────────────────
     CATEGORY MANAGEMENT
  ───────────────────────────────────────────── */
  const addCategory = () => {
    const newId = `cat_${Date.now()}`;
    setCatOrder(prev => {
      // Insert before UNCLASSIFIED
      const arr = [...prev];
      const uidx = arr.indexOf(UNCLASSIFIED);
      uidx > -1 ? arr.splice(uidx, 0, newId) : arr.push(newId);
      return arr;
    });
    setLocalMap(prev => ({ ...prev, [newId]: [] }));
    setActiveCategory(newId);
  };

  const renameCategory = (catId, newName) => {
    if (!newName.trim() || newName === catId) return;
    setCatOrder(prev => prev.map(c => c === catId ? newName : c));
    setLocalMap(prev => {
      const n = { ...prev };
      n[newName] = (n[catId] || []).map(r => ({ ...r, Category: newName }));
      delete n[catId];
      return n;
    });
    setCycleSelections(prev => {
      if (!(catId in prev)) return prev;
      const n = { ...prev }; n[newName] = n[catId]; delete n[catId]; return n;
    });
    if (activeCategory === catId) setActiveCategory(newName);
  };

  const deleteCategory = (catId) => {
    const movingRecipes = (localMap[catId] || []).map(r => {
      let u = revertAllCycleNames(r, catId);
      return { ...u, Category: UNCLASSIFIED, Enable: true };
    });
    setLocalMap(prev => {
      const n = { ...prev };
      n[UNCLASSIFIED] = [...(n[UNCLASSIFIED] || []), ...movingRecipes];
      delete n[catId];
      return n;
    });
    setCatOrder(prev => prev.filter(c => c !== catId));
    setCycleSelections(prev => { const n = { ...prev }; delete n[catId]; return n; });
    if (activeCategory === catId) {
      const remaining = catOrder.filter(c => c !== catId && c !== UNCLASSIFIED);
      setActiveCategory(remaining[0] || '');
    }
  };

  /* ─────────────────────────────────────────────
     DRAG HANDLERS
  ───────────────────────────────────────────── */
  const handleCatDragStart = (e, catId) => {
    catDragRef.current = catId;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const handleCatDragEnd = () => { catDragRef.current = null; setCatDropTarget(null); setDropIndex(null); };

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

  // ── Drop on left ──
  const handleDropLeft = (e) => {
    e.preventDefault(); setDragOverLeft(false);
    const { ids, source } = dragRef.current;
    const idSet = new Set(ids);
    const capturedIdx = dropIndex?.listId === 'left' ? dropIndex.idx : -1;

    if (source === 'right') {
      doMoveToCategory(idSet, UNCLASSIFIED, capturedIdx);
      // revalidate sources
      const sourceCats = {};
      ids.forEach(id => {
        const r = flatRecipes.find(r => r.ID === id);
        if (r && r.Category !== UNCLASSIFIED) sourceCats[r.Category] = true;
      });
      Object.keys(sourceCats).forEach(catId => {
        revalidateCycleAfterMove(catId, (localMap[catId] || []).filter(r => !idSet.has(r.ID)));
      });
    } else {
      // left→left reorder
      doReorderInCategory(UNCLASSIFIED, idSet, capturedIdx >= 0 ? capturedIdx : unclassifiedList.length);
    }
    handleDragEnd();
  };

  const handleDropOnCatBtn = (e, catId) => {
    e.preventDefault(); e.stopPropagation(); setDragCatTarget(null);
    const { ids } = dragRef.current;
    if (!ids.length) return;
    doMoveToCategory(new Set(ids), catId, -1);
    handleDragEnd();
  };

  // ── Drop on right ──
  const handleDropRight = (e, fallbackIdx) => {
    e.preventDefault();
    const { ids, source } = dragRef.current;
    const idSet = new Set(ids);
    const capturedIdx = dropIndex?.listId === 'right' ? dropIndex.idx : fallbackIdx;

    if (source === 'left') {
      doMoveToCategory(idSet, activeCategory, capturedIdx);
      // revalidate UNCLASSIFIED if applicable (not needed — UNCLASSIFIED has no cycle)
    } else {
      // right→right reorder
      doReorderInCategory(activeCategory, idSet, capturedIdx);
    }
    handleDragEnd();
  };

  /* ─────────────────────────────────────────────
     CONFIRM
  ───────────────────────────────────────────── */
  const handleClose   = () => updateConfig('interface.recipeCfg', false);
  const handleConfirm = () => {
    const result = catOrder.flatMap(cat => {
      const list = localMap[cat] || [];
      if (cat === UNCLASSIFIED)
        return list.map(r => ({ ...r, Enable: false, Category: '其他建筑' }));
      return list;
    });
    updateRecipeData(result);
    handleClose();
  };

  if (!isOpen) return null;

  /* ─────────────────────────────────────────────
     RENDER HELPERS
  ───────────────────────────────────────────── */
  const midPoint = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  };

  const renderDropLine = (listId, idx) =>
    dropIndex?.listId === listId && dropIndex?.idx === idx && dragRef.current.source
      ? <div className="rc-drop-indicator"/> : null;

  const renderCatDropLine = (catIdx) =>
    dropIndex?.listId === 'cat' && dropIndex?.idx === catIdx && catDragRef.current
      ? <div className="rc-cat-drop-indicator"/> : null;

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="rc-overlay" onClick={handleClose}>
      <div className="rc-shell" onClick={e => e.stopPropagation()}>

        {/* TOP BAR */}
        <div className="rc-topbar">
          <span className="rc-title">配方配置</span>
          <button className="rc-topbar-btn" onClick={() => mapAllRecipes(r => ({ ...r, Enable: r.Category === UNCLASSIFIED ? true : true }))}>全部启用</button>
          <button className="rc-topbar-btn" onClick={() => mapAllRecipes(r => ({ ...r, Enable: r.Category === UNCLASSIFIED ? true : false }))}>全部禁用</button>
          {parentIds.size > 0 && (
            <button className="rc-topbar-btn" style={{ borderColor: 'rgba(124,58,237,.5)', color: '#a78bfa' }}
              onClick={() => setShowCloneViewer(v => !v)}>
              副本查看 ({parentIds.size})
            </button>
          )}
          <button className="rc-close-btn" onClick={handleClose}><X size={18}/></button>
        </div>

        {/* SEARCH BAR */}
        <div className="rc-sortbar">
          <SearchControl side="left"
            keyword={leftSearch.keyword} mode={leftSearch.mode}
            onChange={(f, v) => setLeftSearch(p => ({ ...p, [f]: v }))}
            onJump={handleLeftJump}
            matchCount={leftMatches.length}
            jumpIdx={leftJumpState.idx}/>
          <div className="rc-sortbar-sep"/>
          <SearchControl side="right"
            keyword={rightSearch.keyword} mode={rightSearch.mode}
            onChange={(f, v) => setRightSearch(p => ({ ...p, [f]: v }))}
            onJump={handleRightJump}
            matchCount={rightMatches.length}
            jumpIdx={rightJumpState.idx}/>
          <div className="rc-sortbar-sep"/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.62rem', color: '#334155' }}>
            点击=选中 · Ctrl+点击=多选 · Shift+点击=范围 · 拖把手=移动
          </span>
        </div>

        {/* BODY */}
        <div className="rc-body">

          {/* ════ LEFT ════ */}
          <div className="rc-left">
            <div className="rc-panel-header">
              <span className="rc-panel-title">未分类配方</span>
              <span className="rc-count-badge">{unclassifiedList.length}</span>
              <button className="rc-select-all-btn" onClick={() =>
                setSelectedLeft(selectedLeft.size === unclassifiedList.length && unclassifiedList.length > 0
                  ? new Set() : new Set(unclassifiedList.map(r => r.ID)))}>
                {selectedLeft.size > 0 && selectedLeft.size === unclassifiedList.length ? '取消全选' : '全选'}
              </button>
              {selectedLeft.size > 0 && activeCategory && activeCategory !== UNCLASSIFIED && (
                <button className="rc-select-all-btn" style={{ color: '#00d9ff', borderColor: 'rgba(0,217,255,.4)' }}
                  onClick={() => { doMoveToCategory(selectedLeft, activeCategory, -1); setSelectedLeft(new Set()); }}>
                  → {activeCategory}
                </button>
              )}
            </div>
            <div ref={leftListRef}
              className={`rc-recipe-list ${dragOverLeft ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverLeft(true); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverLeft(false); }}
              onDrop={handleDropLeft}>
              {unclassifiedList.map((recipe, idx) => (
                <div key={recipe.ID}
                  ref={el => { leftCardRefs.current[recipe.ID] = el; }}
                  onDragOver={e => {
                    e.preventDefault(); e.stopPropagation();
                    setDropIndex({ listId: 'left', idx: midPoint(e) ? idx : idx + 1 });
                  }}
                  onDrop={e => { e.stopPropagation(); handleDropLeft(e); }}>
                  {renderDropLine('left', idx)}
                  <RecipeCard recipe={recipe}
                    selected={selectedLeft.has(recipe.ID)}
                    onSelect={handleSelectLeft}
                    onToggleEnable={toggleEnable}
                    onCopy={handleCopy}
                    onDelete={cloneIds.has(recipe.ID) ? handleDelete : null}
                    isDragging={dragRef.current.ids?.includes(recipe.ID)}
                    onDragStart={e => handleDragStart(e, recipe.ID, 'left')}
                    onDragEnd={handleDragEnd}
                    isParent={parentIds.has(recipe.ID)}
                    isClone={cloneIds.has(recipe.ID)}
                    isHighlighted={highlightedId === recipe.ID}
                    onMouseEnter={() => { if (highlightedId === recipe.ID) setHighlightedId(null); }}/>
                </div>
              ))}
              {renderDropLine('left', unclassifiedList.length)}
              {unclassifiedList.length === 0 && (
                <div style={{ color: '#2a4a5a', fontFamily: 'JetBrains Mono', fontSize: '.8rem', padding: '2rem', textAlign: 'center' }}>
                  所有配方已分类
                </div>
              )}
            </div>
          </div>

          {/* ════ RIGHT ════ */}
          <div className="rc-right">

            {/* category sidebar */}
            <div className="rc-cat-sidebar"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                // Handle cat reorder drop on the sidebar container (covers indicator lines too)
                if (catDragRef.current && dropIndex?.listId === 'cat') {
                  const srcId = catDragRef.current;
                  const toIdx = dropIndex.idx; // index within rightCats (no UNCLASSIFIED)
                  setCatOrder(prev => {
                    // Work only on rightCats portion, keep UNCLASSIFIED at end
                    const rc = prev.filter(c => c !== UNCLASSIFIED);
                    const fromIdx = rc.indexOf(srcId);
                    if (fromIdx === -1) return prev;
                    rc.splice(fromIdx, 1);
                    // toIdx was computed on original rightCats; adjust for removal
                    const adjustedIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
                    const safeIdx = Math.min(Math.max(0, adjustedIdx), rc.length);
                    rc.splice(safeIdx, 0, srcId);
                    return prev.includes(UNCLASSIFIED) ? [...rc, UNCLASSIFIED] : rc;
                  });
                  catDragRef.current = null; setCatDropTarget(null); setDropIndex(null);
                }
              }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setDragCatTarget(null); setCatDropTarget(null);
                }
              }}>
              {rightCats.map((catId, catIdx) => (
                <div key={catId}>
                  {renderCatDropLine(catIdx)}
                  <div className={['rc-cat-btn',
                    activeCategory === catId ? 'active' : '',
                    dragCatTarget === catId ? 'drag-target' : '',
                    catDropTarget === catId ? 'cat-reorder-target' : '',
                  ].join(' ')}
                    onClick={() => setActiveCategory(catId)}
                    onDragOver={e => {
                      e.preventDefault();
                      // No stopPropagation — parent sidebar needs to see this for cat reorder drop
                      if (catDragRef.current) {
                        const insertIdx = midPoint(e) ? catIdx : catIdx + 1;
                        setDropIndex({ listId: 'cat', idx: insertIdx });
                        setCatDropTarget(catId);
                      } else {
                        setDragCatTarget(catId);
                      }
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      if (!catDragRef.current) {
                        // Recipe drop: handle here and stop bubbling
                        e.stopPropagation();
                        handleDropOnCatBtn(e, catId);
                      }
                      // Cat reorder: no stopPropagation — bubble to sidebar onDrop
                    }}
                    title={catId}>
                    <div className="rc-cat-drag-handle" draggable
                      onDragStart={e => handleCatDragStart(e, catId)}
                      onDragEnd={handleCatDragEnd}
                      onClick={e => e.stopPropagation()}>
                      <GripVertical size={11}/>
                    </div>
                    <div className="rc-cat-btn-body">
                      <span className="rc-cat-btn-text">{catId}</span>
                      <span className="rc-cat-count">{(localMap[catId] || []).length}</span>
                    </div>
                  </div>
                </div>
              ))}
              {renderCatDropLine(rightCats.length)}
              <button className="rc-add-cat-btn" onClick={addCategory} title="新建类别">
                <Plus size={14}/>
              </button>
            </div>

            {/* right content */}
            <div className="rc-right-content">
              {activeCategory && activeCategory !== UNCLASSIFIED && (
                <div className="rc-cat-toolbar">
                  <input className="rc-cat-name-input" value={activeCategory}
                    onChange={e => renameCategory(activeCategory, e.target.value)}/>
                  <span className="rc-count-badge">{classifiedInActive.length} 个配方</span>
                  {selectedRight.size > 0 && (
                    <button className="rc-select-all-btn"
                      style={{ color: '#ef9a9a', borderColor: 'rgba(239,68,68,.3)' }}
                      onClick={() => { doMoveToCategory(selectedRight, UNCLASSIFIED, -1); setSelectedRight(new Set()); }}>
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
                    <Trash2 size={11}/> 删除此类
                  </button>
                </div>
              )}

              <div ref={rightListRef} className="rc-recipe-list" style={{ flex: 1, minHeight: 0 }}
                onDragOver={e => { e.preventDefault(); setDropIndex({ listId: 'right', idx: classifiedInActive.length }); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null); }}
                onDrop={e => handleDropRight(e, classifiedInActive.length)}>
                {classifiedInActive.map((recipe, idx) => (
                  <div key={recipe.ID}
                    ref={el => { rightCardRefs.current[recipe.ID] = el; }}
                    onDragOver={e => {
                      e.preventDefault(); e.stopPropagation();
                      setDropIndex({ listId: 'right', idx: midPoint(e) ? idx : idx + 1 });
                    }}
                    onDrop={e => { e.stopPropagation(); handleDropRight(e, dropIndex?.idx ?? idx); }}>
                    {renderDropLine('right', idx)}
                    <RecipeCard recipe={recipe}
                      selected={selectedRight.has(recipe.ID)}
                      onSelect={handleSelectRight}
                      onToggleEnable={toggleEnable}
                      onCopy={handleCopy}
                      onDelete={cloneIds.has(recipe.ID) ? handleDelete : null}
                      isDragging={dragRef.current.ids?.includes(recipe.ID)}
                      onDragStart={e => handleDragStart(e, recipe.ID, 'right')}
                      onDragEnd={handleDragEnd}
                      isParent={parentIds.has(recipe.ID)}
                      isClone={cloneIds.has(recipe.ID)}
                      isHighlighted={highlightedId === recipe.ID}
                      onMouseEnter={() => { if (highlightedId === recipe.ID) setHighlightedId(null); }}/>
                  </div>
                ))}
                {renderDropLine('right', classifiedInActive.length)}
                {classifiedInActive.length === 0 && activeCategory && activeCategory !== UNCLASSIFIED && (
                  <div style={{ color: '#2a4a5a', fontFamily: 'JetBrains Mono', fontSize: '.8rem', padding: '2rem', textAlign: 'center' }}>
                    拖入配方或从左侧选择后点击移入
                  </div>
                )}
              </div>
            </div>

            {/* CYCLE ITEMS PANEL */}
            <div className="rc-cycle-panel">
              <div className="rc-cycle-header">组内循环</div>
              <div className="rc-cycle-list">
                {[...cycleItems].map(baseName => {
                  const js = jumpStates[baseName];
                  const showBadge = activeJumpItem === baseName && js;
                  return (
                    <div key={baseName}
                      className={`rc-cycle-item ${cycleSelected.has(baseName) ? 'checked' : ''}`}>
                      <div className="rc-cycle-icon" onClick={() => handleCycleJumpClick(baseName)}
                        title={`点击跳转含"${baseName}"的配方`}>
                        <div className="rc-cycle-icon-wrap">
                          <GameIcon name={encodeItemName(baseName, activeCategory)} size={28} tooltip="top"/>
                          {showBadge && (
                            <div className="rc-cycle-jump-badge">{js.cur + 1}/{js.total}</div>
                          )}
                        </div>
                      </div>
                      <div className="rc-cycle-check" onClick={() => toggleCycleItem(baseName)}
                        title={cycleSelected.has(baseName)
                          ? `取消：恢复为"${baseName}"`
                          : `勾选：组内改名`}>
                        {cycleSelected.has(baseName) && <Check size={9} color="#071018" strokeWidth={3.5}/>}
                      </div>
                      <span className="rc-cycle-name">{baseName}</span>
                    </div>
                  );
                })}
                {cycleItems.size === 0 && (
                  <div style={{ color: '#1a3a4a', fontFamily: 'JetBrains Mono', fontSize: '.58rem',
                    padding: '.5rem', textAlign: 'center', lineHeight: 1.5, gridColumn: '1/-1' }}>
                    无循环<br/>物品
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* CLONE VIEWER */}
        {showCloneViewer && (
          <div className="rc-clone-viewer">
            <div className="rc-clone-viewer-title">副本关系一览</div>
            <div className="rc-clone-viewer-list">
              {[...parentIds].map(pid => {
                const parent = flatRecipes.find(r => r.ID === pid);
                if (!parent) return null;
                const cloneList = (parentToClones.current[pid] || [])
                  .map(cid => flatRecipes.find(r => r.ID === cid)).filter(Boolean);
                const getCatName = r => r.Category === UNCLASSIFIED ? UNCLASSIFIED : r.Category;
                return (
                  <div key={pid} className="rc-clone-group">
                    <div className="rc-clone-parent">
                      <GameIcon name={parent.Factory?.name} size={20}/>
                      <span className="rc-clone-factory">{parent.Factory?.name}</span>
                      <span className="rc-clone-cat-badge">{getCatName(parent)}</span>
                      <span className="rc-clone-label parent-label">母本</span>
                    </div>
                    {cloneList.map(clone => (
                      <div key={clone.ID} className="rc-clone-row">
                        <span className="rc-clone-indent">└</span>
                        <GameIcon name={clone.Factory?.name} size={16}/>
                        <span className="rc-clone-factory" style={{ color: '#a78bfa' }}>{clone.Factory?.name}</span>
                        <span className="rc-clone-cat-badge clone-badge">{getCatName(clone)}</span>
                        <span className="rc-clone-label clone-label">副本</span>
                        <button className="rc-card-btn del-btn" style={{ marginLeft: 'auto' }}
                          onClick={() => handleDelete(clone.ID)}>✕ 删除</button>
                      </div>
                    ))}
                    {cloneList.length === 0 && (
                      <div className="rc-clone-row" style={{ color: '#334155', fontStyle: 'italic' }}>
                        <span className="rc-clone-indent">└</span> 副本已全部删除
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONFIRM BAR */}
        <div className="rc-confirm-bar">
          <span className="rc-confirm-hint">
            {selectedLeft.size > 0  && `已选左侧 ${selectedLeft.size} 个 · `}
            {selectedRight.size > 0 && `已选右侧 ${selectedRight.size} 个 · `}
            蓝边=普通 · 深紫边=有副本 · 淡紫虚线=副本（可删）
          </span>
          <button className="rc-confirm-btn" onClick={handleConfirm}>
            <Check size={15}/> 确认
          </button>
        </div>

      </div>
    </div>
  );
}
