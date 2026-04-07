import { useState, useEffect, useRef } from 'react';
import GameIcon from '../GameIcon';
import './ResultsDisplay.css';
import FarmRotation from './FarmRotation';

function ResultsDisplay({ Results }) {
  if (!Results) return (<></>)
  // 类别显示状态
  const categories = Object.keys(Results);
  console.log(categories);
  
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  // 跳转配方高光显示
  const [highlightedRecipe, setHighlightedRecipe] = useState(null);
  // 为每个配方创建ref
  const recipeRefs = useRef({});
  const recipeContentRef = useRef(null);

  // 滚动到指定配方
  const scrollToRecipe = (recipeID) => {
    const recipeElement = recipeRefs.current[recipeID];
    const containerElement = recipeContentRef.current;
    
    if (recipeElement && containerElement) {
      // 计算配方相对于容器的位置
      const elementTop = recipeElement.offsetTop;
      const containerTop = containerElement.offsetTop;
      
      // 滚动到配方位置
      containerElement.scrollTo({
        top: elementTop - containerTop,
        behavior: 'smooth'
      });
      
      // 切换高亮：如果点击的是当前高亮的，则取消高亮；否则高亮新的
      setHighlightedRecipe(recipeID);
    }
  };

// 鼠标悬停事件：悬停到任何recipe-card时，清除跳转高亮
  const handleRecipeHover = () => {
    // 清除跳转产生的高亮
    if (highlightedRecipe !== null) {
      setHighlightedRecipe(null);
    }
  };

  const handleRecipeLeave = () => {
    // 鼠标离开时不做任何操作
  };
  return (
    <div className="result-container">
      <div className="result-header">生产方案</div>
      <div className="result-content">
        {/* 类别导航 */}
        <div className="category-nav">
          {categories.map((category) => (
            <button
              key={category}
              className={`nav-button ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {/* <span className="nav-icon"><GameIcon ></GameIcon></span> */}
              <span className="nav-text">{category}</span>
            </button>
          ))}
        </div>
        {/* 按类显示内容 */}
        <div className="category-container">
          {
            !!activeCategory &&
              <>
                <div className="category-content">                 
                  <div className="stats-container">
                    <div className="stats-header">配方统计</div>
                    <div className="stats-content">
                      <div className="stats-section">
                        <div className="stats-section-header">总配方使用</div>
                        <div className="recipe-stats-grid">
                          {Results[activeCategory].recipes.map((recipe) => (
                            <button
                              key={recipe.ID}
                              className="recipe-stat-item"
                              onClick={() => scrollToRecipe(recipe.ID)}
                            >
                              <div className="recipe-stat-icons">
                                <GameIcon name={recipe.Factory.name} size={40} tooltip={'top'} tooltipData={'点击跳转到配方'}/>
                                <div className="main-product-badge">
                                  <GameIcon name={recipe.MainProduct} size={15} />
                                </div>
                              </div>
                              <div className="recipe-stat-amount">{recipe.Amount}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="stats-section">
                        <div className="stats-section-header">总输入</div>
                        <div className="items-stats-grid">
                          {Object.entries(Results[activeCategory].totalInput).map(([itemName, itemAmount]) => (
                            <div key={itemName} className="stat-item material-stat" title={itemName}>
                              <GameIcon name={itemName} size={20} tooltip={'top'}/>
                              <span className="stat-amount">{Math.round(itemAmount * 10) / 10}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="stats-section">
                        <div className="stats-section-header">总输出</div>
                        <div className="items-stats-grid">
                          {Object.entries(Results[activeCategory].totalOutput).map(([itemName, itemAmount]) => (
                          <div key={itemName} className="stat-item product-stat" title={itemName}>
                            <GameIcon name={itemName} size={20} tooltip={'top'} />
                            <span className="stat-amount">{Math.round(itemAmount * 10) / 10}</span>
                          </div>
                        ))}
                        </div>
                      </div>
                      <div className="stats-section">
                        <div className="stats-section-header">总消耗</div>
                        <div className="items-stats-grid">
                          {Object.entries(Results[activeCategory].totalConsumption).map(([itemName, itemAmount]) => (
                          <div key={itemName} className="stat-item consumption-stat" title={itemName}>
                            <GameIcon name={itemName} size={20} tooltip={'top'} />
                            <span className="stat-amount">{Math.round(itemAmount * 10) / 10}</span>
                          </div>
                        ))}
                        </div>
                      </div>     
                    </div>
                  </div>

                  <div className="recipe-container">
                    <div className="recipe-header">配方详情</div>
                    <div className="recipe-content"  ref={recipeContentRef}>
                      {Results[activeCategory].recipes.map((recipe) => (
                        <div 
                          key={recipe.ID}
                          ref={(el) => (recipeRefs.current[recipe.ID] = el)}
                          className={`recipe-card ${highlightedRecipe === recipe.ID ? 'highlighted' : ''}`}
                          onMouseEnter={() => handleRecipeHover(recipe.ID)}
                          onMouseLeave={handleRecipeLeave}
                          data-recipe-id={recipe.ID}
                        >
                          <div className="recipe-detail">
                            
                            {/* 建筑信息 */}
                            <div className="building-info">
                              <GameIcon name={recipe.Factory.name} size={60}/>
                              <div className="building-name">{recipe.Factory.name}</div>
                              <div className="buildings-needed">
                                数量: <span className="quantity-highlight">{recipe.Amount}</span> 个
                              </div>
                            </div>

                            {/* 建筑消耗 */}
                            <div className="consumption-items">
                              {Object.entries(recipe.Factory.consumption).map(([itemName, itemAmount], idx) => (
                                <div key={idx} className="consumption-item">
                                  <GameIcon name={itemName} size={12}  tooltip={'left'}/>
                                  <div className="consumption-amount">{itemAmount}</div>
                                </div>                      
                              ))}
                            </div>

                            {/* 配方内容 */}
                            <div className="recipe-items">
                                {/* 输入 */}
                                { Object.keys(recipe.Items.material).length > 0 && (
                                  <div className="material-items">
                                    {Object.entries(recipe.Items.material).map(([itemName, itemAmount], i) => (
                                      <div key={i} className="base-item material-item">
                                        <GameIcon name={itemName} size={25}  tooltip={'top'}/>
                                        <span className="item-amount">{itemAmount}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <GameIcon name="箭头" size={25}/>
                                
                                {/* 输出 */}
                                {Object.keys(recipe.Items.product).length > 0 && (
                                  <div className="product-items">
                                    {Object.entries(recipe.Items.product).map(([itemName, itemAmount], i) => (
                                      <div key={i} className="base-item product-item">
                                        <GameIcon name={itemName} size={25}  tooltip={'top'} />
                                        <span className="item-amount">{itemAmount}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>

                          {recipe.Farm && (
                            <div className='farm-detail'>
                              <FarmRotation rotationList={recipe.Farm} farmCfg={recipe.farmCfg} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
          }
        </div>
      </div>
    </div>
  );
}

export default ResultsDisplay;
