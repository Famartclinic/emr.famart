/**
 * Progressive Web App plumbing for the Famart EMR: service worker
 * registration plus the "install this app" prompt lifecycle.
 *
 * The install prompt can fire before React mounts, so `initPwa()` must be
 * called from the entry module and the UI reads the captured state through
 * `usePwaInstall()`.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'other';

export interface PwaInstallState {
  /** A native install prompt is captured and can be triggered. */
  canInstall: boolean;
  /** The app is already running as an installed app. */
  installed: boolean;
  /** Browser exposes a service worker and can install PWAs at all. */
  supported: boolean;
  platform: InstallPlatform;
}

const initialState: PwaInstallState = {
  canInstall: false,
  installed: false,
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  platform: 'other',
};

let state: PwaInstallState = initialState;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

const listeners = new Set<() => void>();

function emit(next: Partial<PwaInstallState>) {
  const merged = { ...state, ...next };
  if (
    merged.canInstall === state.canInstall &&
    merged.installed === state.installed &&
    merged.supported === state.supported &&
    merged.platform === state.platform
  ) {
    return;
  }
  state = merged;
  listeners.forEach((listener) => listener());
}

export function subscribeToPwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaSnapshot(): PwaInstallState {
  return state;
}

/** True when the page runs as an installed/standalone app rather than a browser tab. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOs) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'desktop';
  return 'other';
}

/** iOS installs manually through the Share sheet — no `beforeinstallprompt` on WebKit. */
export function needsManualInstallInstructions(): boolean {
  return state.platform === 'ios' && !state.installed;
}

/**
 * Registers the service worker and captures the browser install prompt.
 * Safe to call once per page load; repeat calls are ignored.
 */
export function initPwa(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  emit({ platform: detectPlatform(), installed: isStandaloneDisplay() });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit({ canInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit({ canInstall: false, installed: true });
  });

  window
    .matchMedia('(display-mode: standalone)')
    .addEventListener('change', (event) => emit({ installed: event.matches }));

  if (!state.supported) return;

  // The dev server has no bundled build to precache, so the worker runs in
  // pass-through mode there while still keeping the app installable.
  const url = import.meta.env.PROD ? '/sw.js' : '/sw.js?dev=1';

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(url, { scope: '/' })
      .then((registration) => {
        // A worker waiting behind an old one can take over immediately: this
        // page load already fetched the current HTML and asset manifest.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // Registration failures only cost offline support, never app usage.
      });
  });
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/** Triggers the native install prompt, if the browser offered one. */
export async function promptInstall(): Promise<InstallOutcome> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return 'unavailable';

  deferredPrompt = null;
  emit({ canInstall: false });

  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      emit({ installed: true });
      return 'accepted';
    }
    return 'dismissed';
  } catch {
    return 'unavailable';
  }
}
