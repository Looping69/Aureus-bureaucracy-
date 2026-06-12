import { useUiChromeStore } from '../../stores/uiStore';

export const useAppChrome = () => {
  const showMinePicker = useUiChromeStore((state) => state.showMinePicker);
  const setShowMinePicker = useUiChromeStore((state) => state.setShowMinePicker);
  const showMarket = useUiChromeStore((state) => state.showMarket);
  const setShowMarket = useUiChromeStore((state) => state.setShowMarket);
  const showActionLog = useUiChromeStore((state) => state.showActionLog);
  const setShowActionLog = useUiChromeStore((state) => state.setShowActionLog);
  const showDebugPanel = useUiChromeStore((state) => state.showDebugPanel);
  const setShowDebugPanel = useUiChromeStore((state) => state.setShowDebugPanel);
  const showUtilityDrawer = useUiChromeStore((state) => state.showUtilityDrawer);
  const setShowUtilityDrawer = useUiChromeStore((state) => state.setShowUtilityDrawer);
  const showNavigationPanel = useUiChromeStore((state) => state.showNavigationPanel);
  const setShowNavigationPanel = useUiChromeStore((state) => state.setShowNavigationPanel);
  const resetChrome = useUiChromeStore((state) => state.resetChrome);

  return {
    showMinePicker,
    setShowMinePicker,
    showMarket,
    setShowMarket,
    showActionLog,
    setShowActionLog,
    showDebugPanel,
    setShowDebugPanel,
    showUtilityDrawer,
    setShowUtilityDrawer,
    showNavigationPanel,
    setShowNavigationPanel,
    resetChrome,
  };
};
