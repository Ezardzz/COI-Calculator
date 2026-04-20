// ── 名称编码（用于内部存储）──
export const encodeItemName = (base, cat) => `${base}_L_${cat}_R_`

// ── 名称解码（用于显示）──
export const decodeItemName = (name) => {
  const match = name.match(/^(.+?)_L_(.+?)_R_$/)
  if (!match) return name
  return `${match[1]}[${match[2]}]`
}

// ── 取基础名称（用于逻辑判断）──
export const getBaseName = (name) => {
  const match = name.match(/^(.+?)_L_(.+?)_R_$/)
  return match ? match[1] : name
}