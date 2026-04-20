import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'
import { decodeItemName, getBaseName } from '@/calculation/itemName';
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

// Portal tooltip: rendered at document.body to escape any overflow:hidden ancestor
function PortalTooltip({ anchorRef, tooltip, text }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const GAP = 6;
    if (tooltip === 'top') {
      setPos({
        left: rect.left + rect.width / 2,
        top: rect.top - GAP,
        transform: 'translate(-50%, -100%)',
      });
    } else if (tooltip === 'left') {
      setPos({
        left: rect.left - GAP,
        top: rect.top + rect.height / 2,
        transform: 'translate(-100%, -50%)',
      });
    }
  }, [anchorRef, tooltip]);

  if (!pos) return null;

  return createPortal(
    <span
      className={`game-icon-tooltip game-icon-tooltip-portal tooltip-${tooltip}`}
      style={{ position: 'fixed', left: pos.left, top: pos.top, transform: pos.transform, opacity: 1 }}
    >
      {text}
    </span>,
    document.body
  );
}

function GameIcon({ name, size = 40, tooltip = '', tooltipData = '', onClick }) {
  const [iconData, setIconData] = useState(null);
  const [hovered, setHovered]   = useState(false);
  const iconRef = useRef(null);

  useEffect(() => {
    loadIconData().then(setIconData);
  }, []);

  // 处理图标名称：去掉 '#','!'  将 '-' 替换为空格
  // #：代表物品的中间态，仅用于转换物品状态的配方
  // !：代表仅作展示的物品，不参与配方配平
  const processedName = useMemo(() => {
    if (!name) return '';
    return getBaseName(name
      .replace(/#/g, '')
      .replace(/!/g, '')
      .replace(/-/g, ' '));
  }, [name]);

  const iconInfo = iconData ? iconData[processedName] : null;

  const iconStyle = useMemo(() => {
    if (!iconInfo) return null;
    const { x, y, width, height, total_width, total_height, padding } = iconInfo;
    const scale = size / (height - 2 * padding);
    const tw  = total_width  * scale;
    const th  = total_height * scale;
    const bgx = -(x + padding) * scale;
    const bgy = -(y + padding) * scale;
    return {
      width:  `${width * scale}px`,
      height: `${size}px`,
      backgroundPosition: `${bgx}px ${bgy}px`,
      backgroundSize: `${tw}px ${th}px`,
      ...(onClick && { cursor: 'pointer' }),
    };
  }, [iconInfo, size, onClick]);

  const tooltipText = decodeItemName(tooltipData) || processedName;

  const handlers = tooltip ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  if (!iconData || !name) {
    return (
      <div
        className="game-icon-placeholder"
        style={{ width: size, height: size, ...(onClick && { cursor: 'pointer' }) }}
        onClick={onClick}
      />
    );
  }

  if (!iconInfo || !iconStyle) {
    return (
      <div
        className="game-icon-placeholder"
        style={{ width: size, height: size, ...(onClick && { cursor: 'pointer' }) }}
        title={processedName}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      ref={iconRef}
      className="game-icon"
      style={iconStyle}
      onClick={onClick}
      {...handlers}
    >
      {tooltip && hovered && (
        <PortalTooltip anchorRef={iconRef} tooltip={tooltip} text={tooltipText} />
      )}
    </div>
  );
}

// 防止父组件无意义重渲染
export default memo(GameIcon);