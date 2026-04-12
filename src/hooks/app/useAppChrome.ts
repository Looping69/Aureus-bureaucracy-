import React from 'react';

export const useAppChrome = () => {
  const [showMinePicker, setShowMinePicker] = React.useState(false);
  const [showMarket, setShowMarket] = React.useState(false);
  const [showActionLog, setShowActionLog] = React.useState(false);
  const [showDebugPanel, setShowDebugPanel] = React.useState(false);
  const [showUtilityDrawer, setShowUtilityDrawer] = React.useState(false);
  const [showNavigationPanel, setShowNavigationPanel] = React.useState(false);

  const resetChrome = React.useCallback(() => {
    setShowMinePicker(false);
    setShowMarket(false);
    setShowActionLog(false);
    setShowDebugPanel(false);
    setShowUtilityDrawer(false);
    setShowNavigationPanel(false);
  }, []);

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
