import { createContext, useContext, useEffect, useRef, useState } from "react";
import initHighs from "highs";

const HighsContext = createContext(null);

export function HighsProvider({ children }) {
  const [loading, setLoading] = useState(true);

  // 用 ref 保证始终是最新实例
  const highsRef = useRef(null);

  // 防止重复初始化
  const loadingRef = useRef(false);

  /* =========================
   * 初始化 / 重建 HiGHS（返回实例）
   * ========================= */
  const loadHighs = async () => {
    if (loadingRef.current) return highsRef.current;

    loadingRef.current = true;
    setLoading(true);

    try {
      const module = await initHighs({
        locateFile: (file) =>
          file.endsWith(".wasm") ? "/highs.wasm" : file
      });

      console.log("[HiGHS] solver ready");

      // 直接写入 ref（同步）
      highsRef.current = module;

      return module;
    } catch (err) {
      console.error("[HiGHS] init failed:", err);
      highsRef.current = null;
      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  /* =========================
   * 首次加载
   * ========================= */
  useEffect(() => {
    loadHighs();
  }, []);

  /* =========================
   * 获取当前 solver
   * ========================= */
  const getHighs = async () => {
    if (highsRef.current) return highsRef.current;
    return await loadHighs();
  };

  /* =========================
   * 安全求解，崩溃时间自动重建
   * ========================= */
  const lpSolve = async (lp) => {
    let solver = await getHighs();

    try {
      return solver.solve(lp);
    } catch (err) {
      console.warn("[HiGHS] solve crashed, reloading...", err);

      // 清掉旧实例
      highsRef.current = null;
      // 强制重建
      solver = await loadHighs();
      if (!solver) {
        throw new Error("HiGHS reload failed");
      }
      try {
        return solver.solve(lp);
      } catch (err2) {
        console.error("[HiGHS] solve failed after reload:", err2);
        throw err2;
      }
    }
  };

  return (
    <HighsContext.Provider
      value={{
        lpSolve,
        reloadHighs: loadHighs,
        loading
      }}
    >
      {children}
    </HighsContext.Provider>
  );
}

export const useHighs = () => useContext(HighsContext);