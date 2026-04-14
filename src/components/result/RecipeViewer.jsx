import { useState } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import GameIcon from '../GameIcon';
import './RecipeViewer.css';

function RecipeViewer({ Results, itemRecord, setItemRecord }) {
  const { updateConfig } = useConfig();
  const [sortMode, setSortMode] = useState('type'); // 'type' | 'usage'

  const currentItem = itemRecord.length > 0 ? itemRecord[itemRecord.length - 1] : null;

  const handleClose = () => {
    updateConfig('interface.recipeViewer', false);
    setItemRecord([]);
  };

  const handleIconClick = (itemName) => {
    setItemRecord(prev => [...prev, itemName]);
  };

  const handleBack = () => {
    setItemRecord(prev => prev.slice(0, -1));
  };

  // 获取所有配方（展开所有category）
  const getAllRecipes = () => {
    if (!Results) return [];
    const all = [];
    Object.entries(Results).forEach(([category, data]) => {
      data.recipes.forEach(recipe => {
        all.push({ ...recipe, Category: category });
      });
    });
    return all;
  };

  const getRelatedRecipes = (itemName) => {
    return getAllRecipes().filter(recipe =>
      itemName in (recipe.Items.material || {}) || itemName in (recipe.Items.product || {})
    );
  };

  const getItemUsage = (recipe, itemName) => {
    if (itemName in (recipe.Items.product || {})) {
      return { type: 'produce', amount: recipe.Items.product[itemName] * recipe.Amount };
    }
    if (itemName in (recipe.Items.material || {})) {
      return { type: 'consume', amount: recipe.Items.material[itemName] * recipe.Amount };
    }
    return null;
  };

  const toSig = (num, digits = 4) => {
    if (num === 0) return 0;
    const mag = Math.floor(Math.log10(Math.abs(num)));
    const factor = Math.pow(10, Math.max(digits, mag + 1) - mag - 1);
    return Math.round(num * factor) / factor;
  };

  const sortByUsage = (recipes, itemName) => {
    const producers = recipes.filter(r => itemName in (r.Items.product || {}));
    const consumers = recipes.filter(r => !(itemName in (r.Items.product || {})));
    return [...producers, ...consumers];
  };

  const groupByType = (recipes, itemName) => {
    const byCategory = {};
    recipes.forEach(r => {
      if (!byCategory[r.Category]) byCategory[r.Category] = { producers: [], consumers: [] };
      if (itemName in (r.Items.product || {})) byCategory[r.Category].producers.push(r);
      else byCategory[r.Category].consumers.push(r);
    });
    const result = {};
    Object.entries(byCategory).forEach(([cat, { producers, consumers }]) => {
      result[cat] = [...producers, ...consumers];
    });
    return result;
  };

  const relatedRecipes = currentItem ? getRelatedRecipes(currentItem) : [];
  const sortedByUsage = sortByUsage(relatedRecipes, currentItem);
  const groupedByType = groupByType(relatedRecipes, currentItem);

  const renderRecipeCard = (recipe) => {
    const usage = getItemUsage(recipe, currentItem);
    if (!usage) return null;

    return (
      <div key={recipe.ID} className="rv-recipe-card">
        <div className="rv-recipe-detail">

          {/* 左侧：物品类型 + 使用情况 */}
          <div className="rv-item-usage">
            <div className="rv-item-type-label">{recipe.Category}</div>
            <div className={`rv-usage-amount ${usage.type === 'produce' ? 'rv-produce' : 'rv-consume'}`}>
              <GameIcon name={currentItem} size={28} />
              <div className="rv-usage-row">
                <span className="rv-usage-sign">{usage.type === 'produce' ? '+' : '-'}</span>
                <span className="rv-usage-number">{toSig(usage.amount)}</span>
              </div>
            </div>
          </div>

          {/* 建筑信息 */}
          <div className="building-info">
            <GameIcon name={recipe.Factory.name} size={60} />
            <div className="building-name">{recipe.Factory.name}</div>
            <div className="buildings-needed">
              数量: <span className="quantity-highlight">{recipe.Amount}</span> 个
            </div>
          </div>

          {/* 建筑消耗 */}
          {Object.keys(recipe.Factory.consumption || {}).length > 0 && (
            <div className="consumption-items">
              {Object.entries(recipe.Factory.consumption).map(([name, amount], idx) => (
                <div key={idx} className="consumption-item">
                  <GameIcon name={name} size={12} tooltip={'left'} />
                  <div className="consumption-amount">{amount}</div>
                </div>
              ))}
            </div>
          )}

          {/* 配方内容 */}
          <div className="recipe-items">
            {Object.keys(recipe.Items.material || {}).length > 0 && (
              <div className="material-items">
                {Object.entries(recipe.Items.material).map(([name, amount], i) => (
                  <div key={i} className="base-item material-item rv-clickable-item" onClick={() => handleIconClick(name)} style={{ cursor: 'pointer' }}>
                    <GameIcon name={name} size={25} tooltip={'top'} />
                    <span className="item-amount">{amount}</span>
                  </div>
                ))}
              </div>
            )}

            <GameIcon name="箭头" size={25} />

            {Object.keys(recipe.Items.product || {}).length > 0 && (
              <div className="product-items">
                {Object.entries(recipe.Items.product).map(([name, amount], i) => (
                  <div key={i} className="base-item product-item rv-clickable-item" onClick={() => handleIconClick(name)} style={{ cursor: 'pointer' }}>
                    <GameIcon name={name} size={25} tooltip={'top'} />
                    <span className="item-amount">{amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rv-overlay">
      <div className="rv-panel">

        {/* 顶部标题栏 */}
        <div className="rv-header">
          <div className="rv-title-area">
            <span className="rv-title">配方查看器</span>
            {currentItem && (
              <div className="rv-breadcrumb">
                {itemRecord.map((item, idx) => (
                  <span key={idx} className="rv-breadcrumb-item" onClick={() => setItemRecord(prev => prev.slice(0, idx + 1))}>
                    <GameIcon name={item} size={16} style={{ cursor: 'pointer' }} />
                    <span className="rv-breadcrumb-name">{item}</span>
                    {idx < itemRecord.length - 1 && <span className="rv-breadcrumb-sep">›</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rv-sort-toggle">
            <button className={`rv-sort-btn ${sortMode === 'type' ? 'active' : ''}`} onClick={() => setSortMode('type')}>按类型</button>
            <button className={`rv-sort-btn ${sortMode === 'usage' ? 'active' : ''}`} onClick={() => setSortMode('usage')}>按用途</button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="rv-content">
          {!currentItem ? (
            <div className="rv-empty"><div className="rv-empty-text">请点击物品图标查看相关配方</div></div>
          ) : relatedRecipes.length === 0 ? (
            <div className="rv-empty">
              <GameIcon name={currentItem} size={48} />
              <div className="rv-empty-text">未找到与「{currentItem}」相关的配方</div>
            </div>
          ) : sortMode === 'type' ? (
            Object.entries(groupedByType).map(([category, recipes]) => {
              const catData = Results[category];
              const produced = catData?.totalOutput?.[currentItem];
              const consumed = catData?.totalInput?.[currentItem];
              return (
                <div key={category} className="rv-category-group">
                  <div className="rv-category-label">
                    <span>{category}</span>
                    <span className="rv-category-summary">
                      {produced != null && (
                        <span className="rv-cat-produce">
                          <GameIcon name={currentItem} size={14} />
                          +{Math.round(produced * 10) / 10}
                        </span>
                      )}
                      {consumed != null && (
                        <span className="rv-cat-consume">
                          <GameIcon name={currentItem} size={14} />
                          -{Math.round(consumed * 10) / 10}
                        </span>
                      )}
                    </span>
                  </div>
                  {recipes.map(recipe => renderRecipeCard(recipe))}
                </div>
              );
            })
          ) : (
            sortedByUsage.map(recipe => renderRecipeCard(recipe))
          )}
        </div>

        {/* 底部按钮 */}
        <div className="rv-footer">
          <button className="rv-back-btn" onClick={handleBack} disabled={itemRecord.length <= 1}>← 回退</button>
          <button className="rv-close-btn" onClick={handleClose}>✓ 退出</button>
        </div>
      </div>
    </div>
  );
}

export default RecipeViewer;
