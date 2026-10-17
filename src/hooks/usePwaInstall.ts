import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  getPwaSnapshot,
  promptInstall,
  subscribeToPwa,
  type InstallOutcome,
  type InstallPlatform,
  type PwaInstallState,
} from '../services/pwa';

export interface UsePwaInstallResult {
  /** A native install prompt is available and can be triggered. */
  canInstall: boolean;
  /** The app is already running installed (standalone). */
  installed: boolean;
  /** The browser supports installable web apps. */
  supported: boolean;
  platform: InstallPlatform;
  /** iOS WebKit installs manually via "Add to Home Screen". */
  manualInstructions: boolean;
  /** Whether install UI is worth showing for the current state and platform. */
  canShowInstallUi: boolean;
  isPrompting: boolean;
  install: () => Promise<InstallOutcome>;
}

const getServerSnapshot = (): PwaInstallState => getPwaSnapshot();

export function usePwaInstall(): UsePwaInstallResult {
  const state = useSyncExternalStore(subscribeToPwa, getPwaSnapshot, getServerSnapshot);
  const [isPrompting, setIsPrompting] = useState(false);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    setIsPrompting(true);
    try {
      return await promptInstall();
    } finally {
      setIsPrompting(false);
    }
  }, []);

  const manualInstructions = state.platform === 'ios' && !state.installed;

  return {
    canInstall: state.canInstall,
    installed: state.installed,
    supported: state.supported,
    platform: state.platform,
    manualInstructions,
    canShowInstallUi: state.supported && !state.installed && (state.canInstall || manualInstructions),
    isPrompting,
    install,
  };
}
