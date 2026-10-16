import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { hydrateStorageFromSupabase } from './services/storage';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Supabase is the source of truth once a session exists; the app renders from
// localStorage immediately and refreshes when the authoritative rows arrive.
void hydrateStorageFromSupabase();
