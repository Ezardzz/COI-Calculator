import { memo, useMemo, useState, useEffect } from 'react';
import './GameIcon.css';

//图标数据缓存
let iconDataCache = null;
let iconDataPromise = null;

async function loadIconData() {
  if (iconDataCache) return iconDataCache;
  if (iconDataPromise) return iconDataPromise;

  iconDataPromise = fetch('/data/icon.json')
    .then(res => res.json())
    .then(data => {
      iconDataCache = data;
      return data;
    })
    .catch(err => {
      console.error('Failed to load icon data:', err);
      return {};
    });

  return iconDataPromise;
}

function GameIcon({ name, size = 40, tooltip = '', tooltipData = '' }) {
  const [iconData, setIconData] = useState(null);

  useEffect(() => {
    loadIconData().then(setIconData);
  }, []);

  // 处理图标名称：去掉 # 和 ! ,将 - 替换为空格
  // #：代表物品的中间态，仅用于转换物品状态的配方
  // !：代表仅作展示的物品，不参与配方配平
  const processedName = useMemo(() => {
    if (!name) return '';
    return name
      .replace(/#/g, '')
      .replace(/!/g, '')
      .replace(/-/g, ' ');
  }, [name]);

  // 提前计算 iconInfo
  const iconInfo = iconData ? iconData[processedName] : null;

  const iconStyle = useMemo(() => {
    if (!iconInfo) return null;

    const { x, y, width, height, total_width, total_height, padding } = iconInfo;

    const scale = size / (height - 2 * padding);
    const tw = total_width * scale;
    const th = total_height * scale;
    const bgx = -(x + padding) * scale;
    const bgy = -(y + padding) * scale;
    const iconH = size;
    const iconW = width * scale;

    return {
      width: `${iconW}px`,
      height: `${iconH}px`,
      backgroundPosition: `${bgx}px ${bgy}px`,
      backgroundSize: `${tw}px ${th}px`,
    };
  }, [iconInfo, size]);


  if (!iconData || !name) {
    return (
      <div
        className="game-icon-placeholder"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!iconInfo || !iconStyle) {
    return (
      <div
        className="game-icon-placeholder"
        style={{ width: size, height: size }}
        title={processedName}
      />
    );
  }

  return (
    <div
      className={`game-icon ${tooltip ? `tooltip-${tooltip}` : ''}`}
      style={iconStyle}
    >
      {tooltip && (
        <span className="game-icon-tooltip">
          {tooltipData || processedName}
        </span>
      )}
    </div>
  );
}

// 防止父组件无意义重渲染
export default memo(GameIcon);