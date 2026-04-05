import GameIcon from "@/components/GameIcon";
import styles from "./FarmRotation.module.css";

function CropsRow({ crops }) {
  return (
    <div className={styles.cropsRow}>
      {crops.map((crop, i) => (
        <div key={i} className={styles.cropItem}>
          <div className={styles.cropIcon}>
            <GameIcon name={crop} size={20} tooltip="top" />
          </div>
          {i < crops.length - 1 && (
            <span className={styles.arrow}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * FarmRotation 农场轮作系统组件
 *
 * @param {Object} props
 * @param {Object.<string, number>} props.rotationList  轮作数据
 * @param {Object}  props.farmCfg                       农场配置，含 farmTier 字段
 */
export default function FarmRotation({ rotationList = {}, farmCfg }) {
  const farmTier = farmCfg.farmTier
  const ftTarget = farmCfg.fertilityCfg[2]
  const {kWater,kYield} = farmCfg

  const rotations = Object.entries(rotationList).map(([key, count]) => ({
    crops: JSON.parse(key),
    count,
  }));

  return (
    <div className={styles.container}>
      {/* 左侧：农场类型 */}
      {farmTier && (
        <div className={styles.farmTier}>
          <GameIcon name={farmTier} size={80} tooltip={"top"}/>
          <span className={styles.countBadge}>目标肥力：{ftTarget * 100 + ' %'}</span>
        </div>
      )}

      {/* 右侧：轮作表 */}
      <div className={styles.table}>
        {rotations.map(({ crops, count }, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.cropsCell}>
              <CropsRow crops={crops} />
            </div>
            <div className={styles.countCell}>
              <span className={styles.countBadge}>{count} 个农场</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
