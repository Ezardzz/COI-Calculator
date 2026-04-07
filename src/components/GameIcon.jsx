import { useState, useEffect } from 'react';
import { memo } from 'react';
import './GameIcon.css';

// 图标数据缓存
let iconDataCache = null;
let iconDataPromise = null;

// 加载图标数据
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

function GameIcon({ name, size = 40, tooltip = '',tooltipData = ''}) {
  const [iconData, setIconData] = useState(null);
  const [imageFormat, setImageFormat] = useState('webp');

  // 加载图标数据
  useEffect(() => {
    loadIconData().then(setIconData);
  }, []);

  //检测浏览器是否支持WebP
  // useEffect(() => {
  //   const img = new Image();
  //   img.onload = () => setImageFormat('webp');
  //   img.onerror = () => setImageFormat('png');
  //   img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  // }, []);

  if (!iconData || !name) {
    return <div className="game-icon-placeholder" style={{ width: size, height: size }} />;
  }
  // 处理图标名称：去掉 # 和 ! ,将 - 替换为空格
  // #：代表物品的中间态，仅用于转换物品状态的配方
  // !：代表仅作展示的物品，不参与配方配平
  const processedName = name.replace(/#/g, '').replace(/!/g, '').replace(/-/g, ' ');
  
  // 查找图标数据
  const iconInfo = iconData[processedName];
  
  if (!iconInfo) {
    // console.warn(`Icon not found: ${processedName}`);
    return (
      <div 
        className="game-icon-placeholder" 
        style={{ width: size, height: size }}
        title={processedName}
      />
    );
  }

  // 计算雪碧图样式
  const { x, y, width, height, total_width, total_height, padding } = iconInfo;
  const scale = size / (height - 2 * padding);
  const tw = total_width * scale;
  const th = total_height * scale;
  const bgx = -(x + padding) * scale;
  const bgy = -(y + padding) * scale;
  const iconH = size;
  const iconW = width * scale;

  // 图标样式
  const iconStyle = {
    width: `${iconW}px`,
    height: `${iconH}px`,
    backgroundImage: `url(/data/icon.${imageFormat})`,
    backgroundPosition: `${bgx}px ${bgy}px`,
    backgroundSize: `${tw}px ${th}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'crisp-edges', // 像素风格图标保持锐利
  };

  return (
    <div 
      className={`game-icon ${tooltip ? `tooltip-${tooltip}` : ''}`}
      style={iconStyle}
    >
      {tooltip && (
        <span className="game-icon-tooltip">{tooltipData ? tooltipData : processedName}</span>
      )}
    </div>
  );
}

export default GameIcon;
