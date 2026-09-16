import { lazy, Suspense, useEffect, useState } from 'react';
import PlatformPortal from './PlatformPortal.jsx';
import './platform.css';

const DerivApp = lazy(() => import('../App.jsx'));
const CryptoWorkspaceLazy = lazy(() => import('./CryptoWorkspace.jsx'));

function currentPlatform() {
  if (window.location.search.includes('overlay=true')) return 'deriv';
  if (window.location.hash === '#/deriv') return 'deriv';
  if (window.location.hash === '#/crypto') return 'crypto';
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/deriv') return 'deriv';
  if (path === '/crypto') return 'crypto';
  return 'portal';
}

export default function PlatformRouter() {
  const [platform, setPlatform] = useState(currentPlatform);

  useEffect(() => {
    const sync = () => setPlatform(currentPlatform());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);

  const navigate = (target) => {
    const path = target === 'portal' ? '/' : `/#/${target}`;
    window.history.pushState({}, '', path);
    setPlatform(target);
    window.scrollTo(0, 0);
  };

  if (platform === 'deriv') return <Suspense fallback={<div className="platform-loading">Abrindo ASTROBOT Deriv…</div>}><DerivApp onPlatformPortal={() => navigate('portal')} /></Suspense>;
  if (platform === 'crypto') return <Suspense fallback={<div className="platform-loading">Abrindo ASTROBOT Cripto…</div>}><CryptoWorkspaceLazy onPlatformPortal={() => navigate('portal')} /></Suspense>;
  return <PlatformPortal onSelect={navigate} />;
}
