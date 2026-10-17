import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, MoreVertical, Monitor, Share, Smartphone, X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import type { InstallPlatform } from '../services/pwa';

type InstallButtonVariant = 'topbar' | 'sidebar' | 'inline';

interface InstallAppButtonProps {
  variant?: InstallButtonVariant;
  className?: string;
  /**
   * Render the button even when the browser offers no native prompt, opening
   * the manual "Add to Home Screen" instructions instead.
   */
  alwaysVisible?: boolean;
}

const VARIANT_CLASSES: Record<InstallButtonVariant, string> = {
  topbar:
    'inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 cursor-pointer',
  sidebar:
    'w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 cursor-pointer',
  inline:
    'inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-700 cursor-pointer',
};

const PLATFORM_STEPS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: {
    title: 'On iPhone or iPad',
    steps: [
      'Open this page in Safari, then tap the Share button.',
      'Scroll down and choose “Add to Home Screen”.',
      'Tap “Add” — Famart EMR gets its own icon and opens full screen.',
    ],
  },
  android: {
    title: 'On Android',
    steps: [
      'Open the browser menu (the ⋮ button).',
      'Choose “Install app” or “Add to Home screen”.',
      'Confirm — the EMR launches full screen from your home screen.',
    ],
  },
  desktop: {
    title: 'On desktop',
    steps: [
      'Click the install icon at the right of the address bar.',
      'Or open the browser menu and choose “Install Famart Clinic EMR”.',
      'Confirm to add it to your desktop and Start menu.',
    ],
  },
  other: {
    title: 'On this device',
    steps: [
      'Open your browser menu and choose “Install app” or “Add to Home screen”.',
      'Confirm the installation prompt.',
      'Launch Famart EMR from your home screen or app list.',
    ],
  },
};

const InstallHelpModal: React.FC<{ platform: InstallPlatform; onClose: () => void }> = ({
  platform,
  onClose,
}) => {
  const { canInstall, isPrompting, install } = usePwaInstall();
  const { title, steps } = PLATFORM_STEPS[platform];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleInstallClick = async () => {
    const outcome = await install();
    if (outcome === 'accepted') onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-app-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col"
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/famart-logo.png" alt="" className="w-8 h-8 object-contain shrink-0" />
            <div className="min-w-0">
              <h2 id="install-app-title" className="text-sm font-bold">
                Install Famart EMR
              </h2>
              <p className="text-[11px] text-slate-400">Works offline and opens full screen.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close install instructions"
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            {platform === 'desktop' ? (
              <Monitor className="w-4 h-4 text-blue-600" />
            ) : (
              <Smartphone className="w-4 h-4 text-blue-600" />
            )}
            {title}
          </div>

          <ol className="space-y-2.5">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-2.5 text-slate-600 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-px">
                  {index + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>

          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed">
            Already installed? Launch Famart EMR from your home screen, Start menu, or app list — the
            app keeps the same secure sign-in.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {canInstall && (
              <button
                onClick={handleInstallClick}
                disabled={isPrompting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isPrompting ? 'Opening prompt…' : 'Install now'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  variant = 'topbar',
  className = '',
  alwaysVisible = false,
}) => {
  const { canInstall, installed, supported, platform, canShowInstallUi, isPrompting, install } =
    usePwaInstall();
  const [showHelp, setShowHelp] = useState(false);

  const handleClick = useCallback(async () => {
    if (canInstall) {
      const outcome = await install();
      if (outcome === 'unavailable') setShowHelp(true);
      return;
    }
    setShowHelp(true);
  }, [canInstall, install]);

  if (installed || !supported) return null;
  if (!canShowInstallUi && !alwaysVisible) return null;

  const label = canInstall
    ? 'Install app'
    : platform === 'ios'
    ? 'Add to Home Screen'
    : 'Install app';
  const isCompact = variant === 'topbar';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPrompting}
        title="Install Famart EMR on this device"
        aria-label="Install Famart EMR on this device"
        className={`${VARIANT_CLASSES[variant]} disabled:opacity-60 ${className}`}
      >
        {platform === 'ios' && !canInstall ? (
          <Share className="w-4 h-4 shrink-0" />
        ) : platform === 'android' && !canInstall ? (
          <MoreVertical className="w-4 h-4 shrink-0" />
        ) : (
          <Download className={`${isCompact ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0`} />
        )}
        <span className={isCompact ? 'hidden sm:inline' : ''}>{label}</span>
      </button>

      {showHelp && <InstallHelpModal platform={platform} onClose={() => setShowHelp(false)} />}
    </>
  );
};
