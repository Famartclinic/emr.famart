import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { hydrateStorageFromSupabase } from './services/storage';
import { initPwa } from './services/pwa';
import './index.css';

// Registered before render so the browser's install prompt is captured early.
initPwa();

createRoot(document.getElementById('root')!).render(<App />);

// Supabase is the source of truth once a session exists; the app renders from
// localStorage immediately and refreshes when the authoritative rows arrive.
void hydrateStorageFromSupabase();
