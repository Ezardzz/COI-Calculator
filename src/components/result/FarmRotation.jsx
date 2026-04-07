import GameIcon from "@/components/GameIcon";
import "./FarmRotation.css";

function CropsRow({ crops }) {
  return (
    <div className="rotation-cropsRow">
      {crops.map((crop, i) => (
        <div key={i} className="rotation-cropItem">
          <div className="rotation-cropIcon">
            <GameIcon name={crop} size={20} tooltip="top" />
          </div>
          {i < crops.length - 1 && (
            <span className="rotation-arrow ">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FarmRotation({ rotationList = {}, farmCfg }) {
  const farmTier = farmCfg.farmTier
  const ftTarget = farmCfg.fertilityCfg[2]

  const rotations = Object.entries(rotationList).map(([key, count]) => ({
    crops: JSON.parse(key),
    count,
  }));

  return (
    <div className="rotation-container">
      {/* 左侧：农场类型 */}
      {farmTier && (
        <div className="farmTier-section">
          <GameIcon name={farmTier} size={80} tooltip={"top"}/>
          <span className="rotation-extra-info">目标肥力：{(ftTarget * 100).toFixed(0) + ' %'}</span>
        </div>
      )}

      {/* 右侧：轮作表 */}
      <div className="rotation-table">
        {rotations.map(({ crops, count }, i) => (
          <div key={i} className="rotation-row">
            <div className="rotation-cell">
              <CropsRow crops={crops} />
            </div>
            <div className="farmCount-cell">
              <span className="rotation-extra-info">{count}个</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
