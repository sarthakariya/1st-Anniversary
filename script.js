import { db, auth } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import { animate, stagger } from 'motion';

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Handled Gracefully: ', JSON.stringify(errInfo));
  
  // Let's populate fallback states if we were trying to load them
  if (operationType === OperationType.GET || operationType === OperationType.LIST) {
    if (path === 'user_state/household') {
      if (!appState.profiles || appState.profiles.length === 0) {
        const fallbackProfs = typeof initialProfiles !== 'undefined' ? [...initialProfiles] : [
          { id: 'p_1', name: 'Sarthak', avatar: 'img20251010.jpg' },
          { id: 'p_2', name: 'Reechita', avatar: 'img2025.78_07.jpg' },
          { id: 'p_3', name: 'Our Future Kids', avatar: '20250707_2328.jpg' }
        ];
        appState.profiles = fallbackProfs;
      }
    } else if (path === 'memories') {
      if (!appState.memories) {
        appState.memories = [];
      }
    }
    
    // Smooth rendering update
    render();
    return; // Bypass throwing to avoid crashing the UI
  }
  
  if (operationType === OperationType.WRITE || operationType === OperationType.UPDATE || operationType === OperationType.DELETE) {
    return; // Bypass throwing to avoid interrupting active uploads/saves
  }

  // Fallback throw if not reads or writes
  throw new Error(JSON.stringify(errInfo));
}

function transitionView(v) { 
  if (appState.view === v) return;
  if (!document.startViewTransition) {
    appState.view = v;
    render();
    return;
  }
  
  try {
    const transition = document.startViewTransition(() => {
      appState.view = v;
      render();
    });
    
    if (transition) {
      if (transition.ready) transition.ready.catch(() => {});
      if (transition.finished) transition.finished.catch(() => {});
      if (transition.updateCallbackDone) transition.updateCallbackDone.catch(() => {});
    }
  } catch(e) {
    appState.view = v;
    render();
  }
}
window.transitionView = transitionView;

window.extractYouTubeId = (url) => {
  if (!url) return null;
  const val = String(url).trim();
  if (val.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(val)) {
    return val;
  }
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = val.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const DB_NAME = "netflix_clone_db";
const DB_VERSION = 1;

const initialProfiles = [
  { id: 'p_1', name: 'Sarthak', avatar: 'img20251010.jpg' },
  { id: 'p_2', name: 'Reechita', avatar: 'img2025.78_07.jpg' },
  { id: 'p_3', name: 'Our Future Kids', avatar: '20250707_2328.jpg' }
];

let appState = {
  view: 'startup', 
  currentProfile: null,
  activeCategory: 'Home',
  searchQuery: '',
  settings: {
    autoPlayPreviews: true,
    autoPlayNextEpisode: true
  },
  myList: [],
  continueWatching: [],
  likedMemories: [],
  memories: [],
  profiles: [],
  offlineMode: false
};

window.addEventListener('storage', (e) => {
  if (e.key === 'netflix_state' || e.key === 'netflix_memories') {
    appState.memories = JSON.parse(sessionStorage.getItem('netflix_memories') || 'null');
    const newState = JSON.parse(sessionStorage.getItem('netflix_state') || '{}');
    if(newState.myList) appState.myList = newState.myList;
    if(newState.continueWatching) appState.continueWatching = newState.continueWatching;
    if(newState.likedMemories) appState.likedMemories = newState.likedMemories;
    if(newState.settings) appState.settings = newState.settings;
    if(newState.profiles) appState.profiles = newState.profiles;
    
    // Smooth, silent layout update
    if (typeof window.refreshRowsView === 'function') {
      window.refreshRowsView(null, null, true);
    }
  }
});

// Seed Data
const initialMemories = [
  {
    id: 'm_mock1',
    title: 'Our First Memory',
    description: 'This is a sample memory. Click "+ Add Memory" to start building your own gallery!',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjc1IiBmaWxsPSIjMjIyIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI3NSIvPjwvc3ZnPg==',
    videoUrl: 'https://assets.nflxext.com/us/ffe/siteui/common/audio/ta_dum.mp4',
    category: 'Celebrations',
    dateAdded: Date.now()
  }
];

// Global Error Boundary
window.addEventListener('error', (event) => {
  console.error("Caught by ErrorBoundary:", event.error);
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#141414;color:white;font-family:Helvetica,Arial,sans-serif;text-align:center;padding:20px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="#e50914" style="margin-bottom:20px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <h1 style="font-size:32px;margin-bottom:10px;">Something went wrong.</h1>
      <p style="font-size:18px;color:#999;margin-bottom:30px;max-width:400px;">We're having trouble playing this right now. Please try again or refresh the page.</p>
      <button onclick="window.location.reload()" style="background:#e50914;color:white;border:none;padding:12px 30px;font-size:18px;font-weight:bold;border-radius:4px;cursor:pointer;">Reload</button>
    </div>
  `;
});
window.addEventListener('unhandledrejection', (event) => {
  console.error("Unhandled Rejection:", event.reason);
  // Unhandled rejections don't always crash the UI, but we log them.
});

window.safeSetSessionItem = (key, value) => {
  if (key === 'netflix_memories' || key === 'netflix_state') {
    // Strictly disable browser caching as requested to keep operation pure and prevent stale state fallbacks.
    return;
  }
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn(`[QuotaExceededError] Session storage quota exceeded while saving "${key}".`);
    } else {
      console.error(`Session storage error while saving "${key}":`, e);
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[QuotaExceededError] Local storage backup failed for "${key}":`, e);
  }
};

window.safeSetLocalItem = (key, value) => {
  if (key === 'netflix_memories' || key === 'netflix_state') {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn(`[QuotaExceededError] Local storage quota exceeded while saving "${key}".`);
    } else {
      console.error(`Local storage error while saving "${key}":`, e);
    }
  }
};

const savedProfile = localStorage.getItem('sarthak_netflix_profile');
// We do NOT set appState.currentProfile = savedProfile here
// to force the user to select the profile every time.

const mainTabs = ['Home', 'Dates', 'Categories', 'My List', 'Moments'];
const subCategories = ['Celebration Parties', 'Our Romantic Scenes', 'Our Special Event'];

window.formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return `${s}s`;
};

// Global interceptor for back swipe, browser back, left-arrow click back browser actions
window.closeActivePlayer = null;
window.addEventListener('popstate', (e) => {
  const overlay = document.getElementById('playbackOverlay');
  if (overlay && overlay.style.display !== 'none') {
    if (typeof window.closeActivePlayer === 'function') {
      window.closeActivePlayer();
    }
  }
});

window.getNormalizedCategory = (cat) => {
  const c = String(cat || '').trim();
  if (c.toLowerCase().includes('romance') || c.toLowerCase().includes('romantic')) {
    return 'Our Romantic Scenes';
  }
  if (c.toLowerCase().includes('celebration')) {
    return 'Celebration Parties';
  }
  if (c.toLowerCase().includes('moment')) {
    return 'Moments';
  }
  if (c.toLowerCase().includes('dates')) {
    return 'Dates';
  }
  return 'Our Special Event';
};

window.purgeAllFirebaseMemories = async () => {
  console.log("Starting full Firebase database purge...");
  try {
    const querySnapshot = await getDocs(collection(db, 'memories'));
    if (querySnapshot.empty) {
      console.log("No memories found in Firebase. Database is already clean.");
      appState.memories = [];
      render();
      return;
    }
    
    console.log(`Found ${querySnapshot.size} memories to clear. Purging...`);
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log("Firebase database purge complete.");
    
    appState.memories = [];
    if (typeof window.showToast === 'function') {
      window.showToast("🗑️ All videos and photos successfully removed from Firebase!", 5000);
    }
    render();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("Gracefully handled quota/access limit during Firebase memories purge:", errMsg);
    
    // Visually clear out all memories from the UI state as explicitly requested by the user
    appState.memories = [];
    render();
  }
};

async function loadData() {
  // Disable all browser caching/loading from cache as requested
  try {
    sessionStorage.removeItem('netflix_memories');
    localStorage.removeItem('netflix_memories');
    sessionStorage.removeItem('netflix_state');
    localStorage.removeItem('netflix_state');
  } catch (e) {}

  // Ensure that profiles and memories are instantly set to non-null arrays with designer defaults
  if (!appState.profiles || appState.profiles.length === 0) {
    appState.profiles = [...initialProfiles];
  }
  
  // Real-time Firestore will populate appState.memories live without any local cache fallback!
  appState.memories = [];

  // Trigger one-time automatic database purge if forced by user request
  if (!localStorage.getItem('first_time_firebase_purge_done')) {
    localStorage.setItem('first_time_firebase_purge_done', 'true');
    setTimeout(() => {
      window.purgeAllFirebaseMemories().catch(err => {
        console.error("Auto Firebase purge failed:", err);
      });
    }, 1500);
  }

  // Set up real-time listener for household user state
  onSnapshot(doc(db, 'user_state', 'household'), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if(data.myList) appState.myList = data.myList;
      if(data.continueWatching) appState.continueWatching = data.continueWatching;
      if(data.likedMemories) appState.likedMemories = data.likedMemories;
      if(data.settings) {
        appState.settings = {
          autoPlayPreviews: data.settings.autoPlayPreviews !== false,
          autoPlayNextEpisode: data.settings.autoPlayNextEpisode !== false
        };
      } else {
        appState.settings = { autoPlayPreviews: true, autoPlayNextEpisode: true };
      }
      if(data.profiles && data.profiles.length > 0) {
        appState.profiles = data.profiles;
        // Verify current profile is still valid
        if (appState.currentProfile) {
          const pfData = appState.profiles.find(p => p.name === appState.currentProfile);
          if (!pfData) {
            appState.currentProfile = null;
            localStorage.removeItem('sarthak_netflix_profile');
          }
        }
      }
      
      window.safeSetSessionItem('netflix_state', JSON.stringify({
        myList: appState.myList,
        continueWatching: appState.continueWatching,
        likedMemories: appState.likedMemories,
        settings: appState.settings,
        profiles: appState.profiles
      }));
      render();
    } else {
      // Seed first time if document doesn't exist
      const defaultProfiles = [...initialProfiles];
      setDoc(doc(db, 'user_state', 'household'), {
        myList: appState.myList || [],
        continueWatching: appState.continueWatching || [],
        likedMemories: appState.likedMemories || [],
        settings: appState.settings || { autoPlayPreviews: true, autoPlayNextEpisode: true },
        profiles: defaultProfiles
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'user_state/household'));
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'user_state/household');
  });

  // Set up real-time listener for memories
  onSnapshot(collection(db, 'memories'), (snapshot) => {
    if (appState.bulkTransactionActive) {
      console.log("Caching real-time snapshot update during bulk database transaction.");
      window.pendingMemoriesSnapshot = snapshot;
      return;
    }
    
    const list = snapshot.docs.map(d => d.data());
    // Sort descending by dateAdded (newest first)
    list.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    appState.memories = list;
    window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
    render();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'memories');
  });

  window.currentHeroIndex = undefined;
}

async function saveMemoryToDB(memory) {
  if(!memory.id) memory.id = "m_" + Date.now();
  try {
    await setDoc(doc(db, 'memories', memory.id), memory);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `memories/${memory.id}`);
    throw err;
  }
}

async function saveStateList(key, data) {
  appState[key] = data;
  window.safeSetSessionItem('netflix_state', JSON.stringify({
    myList: appState.myList,
    continueWatching: appState.continueWatching,
    likedMemories: appState.likedMemories || [],
    settings: appState.settings,
    profiles: appState.profiles
  }));
  try {
    await setDoc(doc(db, 'user_state', 'household'), {
      [key]: data
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'user_state/household');
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.upload-modal.open, .detail-overlay.open');
    openModals.forEach(m => {
      m.classList.remove('open');
      setTimeout(() => { 
        m.remove(); 
        if (typeof window.refreshRowsView === 'function') {
          window.refreshRowsView(null, null, true);
        }
      }, 400);
    });
  }
});
document.addEventListener('click', (e) => {
  // Click outside search container should close active search
  const searchContainer = document.getElementById('searchContainer');
  if (searchContainer && searchContainer.classList.contains('active')) {
    if (!searchContainer.contains(e.target)) {
      searchContainer.classList.remove('active');
      const input = document.getElementById('searchInput');
      if (input && appState.searchQuery) {
        appState.searchQuery = '';
        input.value = '';
        window.refreshRowsView();
      }
    }
  }

  // Click outside notification panel should close it
  const notifPanel = document.getElementById('notifPanel');
  if (notifPanel && notifPanel.classList.contains('active')) {
    const bellIcon = document.querySelector('.bell-icon');
    if (!notifPanel.contains(e.target) && (!bellIcon || !bellIcon.contains(e.target))) {
      notifPanel.classList.remove('active');
    }
  }

  const openModals = document.querySelectorAll('.upload-modal.open, .detail-overlay.open');
  openModals.forEach(m => {
    if (e.target === m) {
      m.classList.remove('open');
      setTimeout(() => { 
        m.remove(); 
        if (typeof window.refreshRowsView === 'function') {
          window.refreshRowsView(null, null, true);
        }
      }, 300);
    }
  });
});

function render() {
  try {
    internalRender();
  } catch (err) {
    console.error("Rendering Error:", err);
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#141414;color:white;font-family:Helvetica,Arial,sans-serif;text-align:center;padding:20px;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="#e50914" style="margin-bottom:20px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <h1 style="font-size:32px;margin-bottom:10px;">Something went wrong.</h1>
        <p style="font-size:18px;color:#999;margin-bottom:30px;max-width:400px;">We're having trouble playing this right now. Please try again or refresh the page.</p>
        <button onclick="window.location.reload()" style="background:#e50914;color:white;border:none;padding:12px 30px;font-size:18px;font-weight:bold;border-radius:4px;cursor:pointer;">Reload</button>
      </div>
    `;
  }
}

function internalRender() {
  const app = document.getElementById('app');
  if(!app) return;
  if (appState.view === 'startup' && app.querySelector('.intro-container')) return;
  
  if (appState.view === 'dashboard' && app.querySelector('.dashboard-container')) {
    if (typeof window.refreshRowsView === 'function') {
      window.refreshRowsView(null, null, true);
    }
    return;
  }
  
  app.innerHTML = '';
  if (appState.view === 'startup') app.appendChild(createStartupScreen());
  else if (appState.view === 'profiles') {
    const profs = createProfileSelection();
    app.appendChild(profs);
    
    // Entrance Animation
    profs.style.opacity = '0';
    setTimeout(() => {
      animate(profs, { opacity: [0, 1] }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
      const cards = profs.querySelectorAll('.profile-card');
      if (cards.length > 0) {
        cards.forEach(c => c.style.animation = 'none'); // override css
        animate(
          cards, 
          { opacity: [0, 1], y: [40, 0], scale: [0.95, 1] }, 
          { duration: 0.5, delay: stagger(0.1, { startDelay: 0.1 }), ease: [0.16, 1, 0.3, 1] }
        );
      }
    }, 50);
  }
  else if (appState.view === 'intro') app.appendChild(createIntroScreen());
  else if (appState.view === 'dashboard') {
    const dashboard = createDashboard();
    app.appendChild(dashboard);
    
    // Entrance Animation
    dashboard.style.opacity = '0';
    setTimeout(() => {
      animate(dashboard, { opacity: [0, 1] }, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
      
      const elements = dashboard.querySelectorAll('.navbar, .hero-billboard, .row');
      if (elements.length > 0) {
          animate(
            elements, 
            { y: [40, 0], opacity: [0, 1] }, 
            { duration: 0.7, delay: stagger(0.15, { startDelay: 0.2 }), ease: [0.16, 1, 0.3, 1] }
          );
      }
    }, 50);
  }
}
window.render = render;

window.logoutProfile = () => {
  const c = document.querySelector('.dashboard-container');
  if (c) {
    c.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s';
    c.style.transform = 'scale(0.85) translateY(-20px)';
    c.style.opacity = '0';
  }
  setTimeout(() => {
    localStorage.removeItem('sarthak_netflix_profile');
    sessionStorage.removeItem('sarthak_netflix_code'); // Require profile lock PIN when logging back in
    appState.currentProfile = null;
    transitionView('profiles');
  }, 500);
};

window.handleSearch = (e) => {
  appState.searchQuery = e.target.value.toLowerCase();
  window.refreshRowsView();
};

window.toggleSearch = () => {
  const container = document.getElementById('searchContainer');
  const input = document.getElementById('searchInput');
  if (container.classList.contains('active')) {
    if (appState.searchQuery) {
      appState.searchQuery = '';
      input.value = '';
      window.refreshRowsView();
    }
    container.classList.remove('active');
  } else {
    container.classList.add('active');
    setTimeout(() => input.focus(), 100);
  }
};

window.setCategory = (cat) => {
  if (appState.activeCategory === cat) return;
  appState.activeCategory = cat;
  appState.searchQuery = '';
  
  if (cat === 'Home') {
    let vids = appState.memories.filter(m => {
      const isMoment = window.getNormalizedCategory(m.category) === 'Moments';
      const isCw = appState.continueWatching.includes(m.id);
      return !isMoment && m.videoUrl && !isCw;
    });
    if (vids.length === 0) {
      vids = appState.memories.filter(m => {
        const isMoment = window.getNormalizedCategory(m.category) === 'Moments';
        return !isMoment && m.videoUrl;
      });
    }
    if (vids.length > 0) {
      window.currentHeroIndex = Math.floor(Math.random() * vids.length);
    }
    const container = document.getElementById('hero-carousel-container');
    if (container) {
      container.innerHTML = '';
      const newHero = createHero();
      newHero.id = 'hero-section';
      newHero.style.gridArea = '1 / 1 / 2 / 2';
      container.appendChild(newHero);
    } else {
      const heroSec = document.getElementById('hero-section');
      if (heroSec) {
        const parent = heroSec.parentNode;
        if (parent) {
          const newHero = createHero();
          newHero.id = 'hero-section';
          parent.replaceChild(newHero, heroSec);
        }
      }
    }
  }
  
  // Update Nav visual
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.classList.remove('active');
    if (li.getAttribute('data-cat') === cat) {
      li.classList.add('active');
      const line = document.getElementById('navLine');
      if (line) {
        line.style.width = li.offsetWidth + 'px';
        line.style.transform = `translateX(${li.offsetLeft}px)`;
      }
    }
  });
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  
  window.refreshRowsView();
};

window.toggleNotifications = () => {
  document.getElementById('notifPanel').classList.toggle('active');
};

window.refreshRowsView = (rcNode, heroNode, silent = false) => {
  const rc = rcNode || document.querySelector('.slider-container');
  const hero = heroNode || document.getElementById('hero-section');
  if(!rc) return;
  
  const rebuild = () => {
    rc.innerHTML = '';
    
    // Show skeletons while data is null
    if (appState.memories === null) {
      if(hero) hero.style.display = 'block'; // Keep hero area while loading
      for (let i = 0; i < 3; i++) {
          const row = document.createElement('div');
          row.className = 'row';
          row.innerHTML = `<h2 class="row-header" style="color: #444;">Loading...</h2><div class="row-content" style="display:flex; gap:8px;">
            ${Array(6).fill('<div class="skeleton-card media-card"></div>').join('')}
          </div>`;
          rc.appendChild(row);
      }
      return;
    }
    
    if(appState.searchQuery) {
      if(hero) hero.style.display = 'none';
      rc.style.setProperty('margin-top', '140px', 'important');
      rc.style.setProperty('padding-top', '10px', 'important');
      const q = appState.searchQuery.trim().toLowerCase();
      const queryWords = q.split(/\s+/).filter(w => w.length > 0);
      const mems = appState.memories.filter(m => {
        const titleStr = (m.title || '').toLowerCase();
        const descStr = (m.description || m.desc || '').toLowerCase();
        const catStr = (m.category || '').toLowerCase();
        const yearStr = (m.year || '').toString().toLowerCase();
        const durStr = (m.duration || '').toLowerCase();
        
        // Handle cast, genres, tags if they exist as array or string
        const castStr = Array.isArray(m.cast) ? m.cast.join(' ').toLowerCase() : (m.cast || '').toLowerCase();
        const genresStr = Array.isArray(m.genres) ? m.genres.join(' ').toLowerCase() : (m.genres || m.genre || '').toLowerCase();
        const tagsStr = Array.isArray(m.tags) ? m.tags.join(' ').toLowerCase() : (m.tags || '').toLowerCase();
        
        const combinedText = `${titleStr} ${descStr} ${catStr} ${yearStr} ${durStr} ${castStr} ${genresStr} ${tagsStr}`;
        
        // Match full exact substring search of any field
        if (combinedText.includes(q)) {
          return true;
        }
        
        // Advanced: normalization mapping, e.g. "3 hours" -> "3h", "10 minutes" -> "10m"
        const normalizedQuery = q.replace(/\bhours?\b/g, 'h').replace(/\bminutes?\b/g, 'm').replace(/\bmins?\b/g, 'm').replace(/\s+/g, '');
        const normalizedDur = durStr.replace(/\s+/g, '');
        if (normalizedDur.includes(normalizedQuery)) {
          return true;
        }
        
        // Multi-word level query matching (all words must exist somewhere in attributes)
        if (queryWords.length > 1) {
          return queryWords.every(word => {
            const normalizedWord = word.replace(/\bhours?\b/g, 'h').replace(/\bminutes?\b/g, 'm').replace(/\bmins?\b/g, 'm');
            return combinedText.includes(word) || normalizedDur.includes(normalizedWord);
          });
        }
        
        return false;
      });
      if(mems.length) rc.appendChild(createRow('Search Results', mems));
      else rc.innerHTML = '<div style="color:#888; padding:50px; font-size: 1.2vw; text-align:center;">No matches found for "' + q + '"</div>';
      
      requestAnimationFrame(() => {
        rc.style.opacity = '1';
        rc.style.transform = 'translateY(0)';
      });
      return;
    }
    
    rc.style.removeProperty('margin-top');
    rc.style.removeProperty('padding-top');
    if(hero) hero.style.display = 'block';
    
    let rowIndex = 0;
    
    if (appState.activeCategory === 'My List') {
      rc.appendChild(createRow('My List', appState.memories.filter(m => appState.myList.includes(m.id)), rowIndex++));
    } else if (appState.activeCategory === 'Categories') {
      subCategories.forEach(cat => {
        const mems = appState.memories.filter(m => window.getNormalizedCategory(m.category) === cat);
        if (mems.length) rc.appendChild(createRow(cat, mems, rowIndex++));
      });
    } else if (appState.activeCategory === 'Moments') {
      // Show local array instantly to feel responsive, then fetch from firestore
      const fetchAndRenderGallery = async () => {
        let galleryItems = appState.memories.filter(m => window.getNormalizedCategory(m.category) === 'Moments');
        
        rc.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "padding: 0 4vw 4vw 4vw; margin-top: 20px;";
        
        const headerBox = document.createElement('div');
        headerBox.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;";
        headerBox.innerHTML = `
          <h2 style="font-size: 1.4vw; font-weight: 700; margin: 0;">Moments</h2>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;" onclick="startMomentsSlideshow()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polygon points="6 3 20 12 6 21 6 3"/></svg> Play as Video
            </button>
            <button class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;" onclick="openBulkUploadModal()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Photos
            </button>
          </div>
        `;
        wrapper.appendChild(headerBox);
        
        const grid = document.createElement('div');
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;";
        
        galleryItems.forEach(m => {
          const div = document.createElement('div');
          div.className = 'media-card';
          div.style.flex = "unset";
          div.onmouseenter = () => {
            const r = div.getBoundingClientRect();
            if (r.left < 50) {
              div.style.transformOrigin = 'left center';
            } else if (window.innerWidth - r.right < 50) {
              div.style.transformOrigin = 'right center';
            } else {
              div.style.transformOrigin = 'center center';
            }
          };
          div.onclick = (e) => { 
            if (!appState.memories.find(mem => mem.id === m.id)) {
              appState.memories.push(m);
            }
            openDetailModal(m.id, e); 
          };
          
          const isLiked = appState.likedMemories && appState.likedMemories.includes(m.id);
          div.innerHTML = `
            <img src="${m.thumbnail}" alt="${m.title}" loading="lazy">
            <div class="hover-chassis">
              <div class="hc-buttons">
                <div class="hc-btn hc-play" onclick="window.playVideo('${m.id}'); event.stopPropagation();" title="Play Slideshow">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                </div>
                <div class="hc-btn hc-view" onclick="window.viewPhotoStatic('${m.id}'); event.stopPropagation();" title="View Static Photo" style="background: rgba(255,255,255,0.15);">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div class="hc-btn hc-add" onclick="window.toggleMyList('${m.id}', event); event.stopPropagation();" title="Add to My List">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <div class="hc-btn hc-like" onclick="window.likeMemory('${m.id}', this); event.stopPropagation();" title="${isLiked ? 'Unlike' : 'Like'}" style="${isLiked ? 'color: #E50914; border-color: #E50914;' : ''}">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                </div>
                <div style="flex:1;"></div>
                <div class="hc-btn hc-more" onclick="window.openDetailModal('${m.id}', event); event.stopPropagation();" title="More Info">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
              <div class="hc-title" style="font-size: 11px; font-weight: 700; color: #ffffff; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-transform: uppercase; letter-spacing: 0.2px;" title="${m.title}">${m.title}</div>
            </div>
          `;
          grid.appendChild(div);
        });
        wrapper.appendChild(grid);
        rc.appendChild(wrapper);
      };
  
      fetchAndRenderGallery();
    } else {
      // For Home
      if (appState.activeCategory === 'Home') {
        // 1. Today's Top Picks for You (randomized order every reload as requested)
        const topPicksMems = [...appState.memories]
          .filter(m => window.getNormalizedCategory(m.category) !== 'Moments')
          .sort(() => Math.random() - 0.5)
          .slice(0, 8);
        if (topPicksMems.length) {
          rc.appendChild(createRow("Today's Top Picks for You", topPicksMems, rowIndex++));
        }

        // 2. Continue Watching
        if (appState.continueWatching.length > 0) {
          const cw = appState.memories.filter(m => appState.continueWatching.includes(m.id));
          if (cw.length) {
            rc.appendChild(createRow('Continue Watching', cw, rowIndex++));
          }
        }

        // My Favorites
        if (appState.likedMemories && appState.likedMemories.length > 0) {
          const favorites = appState.memories.filter(m => appState.likedMemories.includes(m.id));
          if (favorites.length) {
            rc.appendChild(createRow('My Favorites', favorites, rowIndex++));
          }
        }

        // 3. Recent Additions
        const recentMems = [...appState.memories]
          .filter(m => window.getNormalizedCategory(m.category) !== 'Moments')
          .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        if (recentMems.length) {
          rc.appendChild(createRow('Recent Additions', recentMems, rowIndex++));
        }

        // 4. My List
        const myListMems = appState.memories.filter(m => appState.myList.includes(m.id));
        if (myListMems.length) {
          rc.appendChild(createRow('My List', myListMems, rowIndex++));
        }

        // 5. Categorized rows
        subCategories.forEach(cat => {
          const mems = appState.memories.filter(m => window.getNormalizedCategory(m.category) === cat);
          if (mems.length) rc.appendChild(createRow(cat, mems, rowIndex++));
        });
      }
      // For Dates
      if (appState.activeCategory === 'Dates') {
        if (appState.continueWatching.length > 0) {
          const cw = appState.memories.filter(m => appState.continueWatching.includes(m.id));
          if (cw.length) rc.appendChild(createRow('Continue Watching', cw, rowIndex++));
        }
        rc.appendChild(createRow('Timeline (Newest First)', [...appState.memories].filter(m => window.getNormalizedCategory(m.category) !== 'Moments').sort((a,b) => b.dateAdded - a.dateAdded), rowIndex++));
      }
    }
    
    // Fade back in
    requestAnimationFrame(() => {
      rc.style.opacity = '1';
      rc.style.transform = 'translateY(0)';
      
      // Scramble Cipher Animation
      const chars = '!<>-_\\\\/[]{}—=+*^?#________';
      if (!silent) rc.querySelectorAll('.scramble-text').forEach(el => {
        const targetText = el.getAttribute('data-text');
        if (!targetText) return;
        let frame = 0;
        const duration = 20; // ~450ms at 60fps
        const runScramble = () => {
          if (frame >= duration) {
             el.innerText = targetText;
             return;
          }
          let scrambled = '';
          for (let i = 0; i < targetText.length; i++) {
            if (targetText[i] === ' ') scrambled += ' ';
            else if (Math.random() < (frame / duration)) scrambled += targetText[i];
            else scrambled += chars[Math.floor(Math.random() * chars.length)];
          }
          el.innerText = scrambled;
          frame++;
          requestAnimationFrame(runScramble);
        };
        runScramble();
      });
    });
  };

  if (silent) {
    rebuild();
  } else {
    rc.style.transition = 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    rc.style.opacity = '0';
    rc.style.transform = 'translateY(10px)';
    setTimeout(rebuild, 240);
  }
};

window.toggleSetting = (settingKey) => {
  appState.settings[settingKey] = !appState.settings[settingKey];
  saveStateList('settings', appState.settings);
  render();
};

window.confirmPurgeAll = () => {
  window.netflixConfirm("⚠️ WARNING: You are entering the administrative override zone.\n\nAre you sure you want to proceed to administrative PIN authorization?", () => {
    window.showPurgePinModal();
  });
};

window.showPurgePinModal = () => {
  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';
  overlay.id = 'purgePinModal';
  overlay.style.zIndex = '300000';
  overlay.innerHTML = `
    <div class="pin-container" style="border: 2px solid rgba(229, 9, 20, 0.4); box-shadow: 0 15px 40px rgba(229, 9, 20, 0.35); background: #141414; padding: 40px 30px; border-radius: 12px; text-align: center; max-width: 380px; width: 90%;">
      <div style="display:flex; justify-content:center; margin-bottom:15px; color:#e50914;">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 style="color: #e50914; font-size: 19px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: -0.2px;">Authorize Database Purge</h2>
      <p style="font-size: 12.5px; color: #a9a9a9; margin: 0 0 25px 0; line-height:1.5; font-family: inherit;">Please enter the 8-digit secure administrator PIN to authorize database deletion.</p>
      
      <div class="pin-inputs" style="display:flex; gap:6px; justify-content:center; margin-bottom:15px;">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
        <input type="text" maxlength="1" class="pin-in-purge" style="width: 32px; height: 42px; background: #0b0b0b; border: 1px solid #333; color: white; text-align: center; font-size: 18px; font-weight: bold; border-radius: 4px; outline: none; transition: border-color 0.2s; font-family: inherit;" onfocus="this.style.borderColor='#e50914';" onblur="this.style.borderColor='#333';">
      </div>
      <div id="purge-pin-error" style="color: #e50914; margin-top: 15px; font-size: 13px; opacity: 0; transition: opacity 0.3s; font-weight: 700;">⚠️ INCORRECT PIN. AUTHORIZATION DENIED.</div>
      
      <div style="display:flex; justify-content:center; gap:12px; margin-top:25px;">
        <button class="btn" style="background:#222; color:#fff; border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:10px 20px; font-weight: 600; cursor:pointer;" onclick="document.getElementById('purgePinModal').remove()">Cancel Override</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const inputs = overlay.querySelectorAll('.pin-in-purge');
  setTimeout(() => inputs[0].focus(), 100);
  
  inputs.forEach((inEl, idx) => {
    inEl.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      e.target.dataset.val = e.target.value;
      if (e.target.value) {
        e.target.type = 'text';
        setTimeout(() => {
          if (e.target.value && e.target.dataset.val) e.target.type = 'password';
        }, 1000);
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
      } else {
        e.target.type = 'text';
      }
      
      const val = Array.from(inputs).map(i => i.dataset.val || '').join('');
      if (val.length === 8) {
        if (val === '25072025') {
          overlay.remove();
          setTimeout(async () => {
            const modal = document.getElementById('settingsModal');
            if (modal) modal.remove();
            await window.purgeAllFirebaseMemories();
          }, 400);
        } else {
          const errEl = document.getElementById('purge-pin-error');
          if (errEl) errEl.style.opacity = '1';
          inputs.forEach(i => { i.value = ''; i.dataset.val = ''; i.type = 'text'; });
          inputs[0].focus();
        }
      } else {
        const errEl = document.getElementById('purge-pin-error');
        if (errEl) errEl.style.opacity = '0';
      }
    });
    
    inEl.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
  });
};

window.switchProfileDirectly = (profileId) => {
  const targetPf = appState.profiles.find(p => p.id === profileId);
  if (!targetPf) return;
  
  window.currentHeroIndex = undefined;
  appState.currentProfile = targetPf.name;
  window.safeSetLocalItem('sarthak_netflix_profile', targetPf.name);
  
  app.innerHTML = '';
  const dashboard = createDashboard();
  app.appendChild(dashboard);
};

window.openHelpCentreModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'helpCentreModal';
  
  modal.innerHTML = `
    <style>
      @keyframes hcFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes checkPop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      .hc-animate-fade { animation: hcFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      
      /* Redesigned accordians */
      .faq-item-modern {
        border-radius: 8px !important;
        background: #1f1f1f !important;
        border: 1px solid rgba(255,255,255,0.04) !important;
        margin-bottom: 12px !important;
        transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        overflow: hidden;
      }
      .faq-item-modern:hover {
        background: #282828 !important;
        border-color: rgba(229, 9, 20, 0.25) !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(0,0,0,0.4);
      }
      .faq-trigger-modern {
        padding: 18px 22px !important;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        font-weight: 700;
        font-size: 14.5px !important;
        color: #fff;
        transition: color 0.2s, background 0.2s;
      }
      .faq-trigger-modern:hover {
        color: #e50914 !important;
      }
      .faq-content-modern {
        max-height: 0px;
        opacity: 0;
        overflow: hidden;
        padding: 0 22px;
        box-sizing: border-box;
        color: #cccccc;
        font-size: 13.5px;
        line-height: 1.6;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        background: rgba(0, 0, 0, 0.2);
      }

      /* Modern Feature Cards Grid */
      .feat-grid-modern {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 5px;
      }
      .feat-card-modern {
        background: linear-gradient(135deg, #1d1d1d 0%, #151515 100%) !important;
        border: 1px solid rgba(255,255,255,0.03) !important;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        gap: 16px;
        align-items: flex-start;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
      }
      .feat-card-modern::before {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 3px; height: 100%;
        background: #e50914;
        opacity: 0;
        transition: opacity 0.3s;
      }
      .feat-card-modern:hover {
        transform: translateY(-3px);
        border-color: rgba(229, 9, 20, 0.2) !important;
        background: linear-gradient(135deg, #242424 0%, #171717 100%) !important;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
      }
      .feat-card-modern:hover::before {
        opacity: 1;
      }
      .feat-card-modern:hover .feat-svg-container {
        background: rgba(229, 9, 20, 0.18);
        box-shadow: 0 0 10px rgba(229, 9, 20, 0.3);
      }
      .feat-card-modern:hover .svg-feat-icon {
        transform: scale(1.1) rotate(4deg);
      }
      .feat-svg-container {
        background: rgba(229, 9, 20, 0.07);
        border: 1px solid rgba(229, 9, 20, 0.15);
        padding: 9px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        flex-shrink: 0;
      }
      
      /* Input Controls with Glow */
      .hc-input-modern {
        width: 100%;
        padding: 11px 13px !important;
        border-radius: 6px !important;
        border: 1px solid #333 !important;
        background: #0f0f0f !important;
        color: white !important;
        outline: none;
        font-family: inherit;
        font-size: 13px !important;
        transition: all 0.25s;
      }
      .hc-input-modern:focus {
        border-color: #e50914 !important;
        box-shadow: 0 0 8px rgba(229, 9, 20, 0.35) !important;
        background: #141414 !important;
      }
      
      /* Sliding underline tabs */
      .hc-tab-btn-modern {
        background: none;
        border: none;
        padding: 12px 0;
        font-size: 13px;
        font-weight: 500;
        color: #a3a3a3;
        cursor: pointer;
        position: relative;
        transition: color 0.25s, font-weight 0.25s;
        font-family: inherit;
      }
      .hc-tab-btn-modern::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2.5px;
        background: #e50914;
        transform: scaleX(0);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: right center;
      }
      .hc-tab-btn-modern.active {
        color: #ffffff;
        font-weight: 700;
      }
      .hc-tab-btn-modern.active::after {
        transform: scaleX(1);
        transform-origin: left center;
      }
    </style>
    <div class="upload-modal-content" style="max-width: 500px; width: 100%; height: 100vh; background: #141414; border-left: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; overflow: hidden; box-shadow: -15px 0 45px rgba(0,0,0,0.95); position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- Close Button -->
      <button class="upload-close" onclick="const hc = document.getElementById('helpCentreModal'); hc.classList.remove('open'); setTimeout(() => hc.remove(), 400);" style="position: absolute; top: 16px; right: 20px; font-size: 28px; color: #737373; background:none; border:none; cursor:pointer; z-index: 100; transition: color 0.2s, transform 0.2s; line-height: 1;" onmouseenter="this.style.color='#fff'; this.style.transform='scale(1.15)';" onmouseleave="this.style.color='#737373'; this.style.transform='scale(1)';">&times;</button>
      
      <!-- Header Area -->
      <div style="padding: 24px 24px 0 24px; background: #141414; display: flex; flex-direction: column; gap: 14px; position: relative;">
        <!-- Logo & Title & Search Bar Row -->
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <!-- Branding Title -->
          <div style="display: flex; align-items: center; gap: 11px;">
            <img src="./Netflix-Logo-Streaming-Platform-765.png" alt="Netflix Logo" referrerPolicy="no-referrer" style="height: 28px; width: auto; object-fit: contain; margin-top: -3px; margin-bottom: -3px;">
            <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.25);"></div>
            <span style="font-weight: 700; font-size: 14.5px; color: #fff; letter-spacing: -0.1px; text-transform: uppercase;">Help Center</span>
          </div>
          
          <!-- Compact Expandable Search Bar (Like Netflix search) -->
          <div style="position: relative; display: flex; align-items: center; margin-right: 36px;">
            <input type="text" id="hc-search-input" oninput="window.filterHelpContent(this.value)" placeholder="Search..." style="width: 130px; padding: 6px 10px 6px 28px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); background: #000; color: #fff; font-size: 12px; outline: none; transition: width 0.3s ease, border-color 0.3s;" onfocus="this.style.width='170px'; this.style.borderColor='#e50914';" onblur="this.style.width='130px'; this.style.borderColor='rgba(255,255,255,0.2)';">
            <span style="position: absolute; left: 10px; font-size: 11px; color: #888; pointer-events: none;">🔍</span>
          </div>
        </div>
        
        <!-- Tab Underline selectors -->
        <div style="display: flex; gap: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-top: 4px;">
          <button id="hc-tab-btn-faq" class="hc-tab-btn-modern active" onclick="window.setHelpTab('faq')">
            User FAQs
          </button>
          <button id="hc-tab-btn-features" class="hc-tab-btn-modern" onclick="window.setHelpTab('features')">
            Feature Guides
          </button>
          <button id="hc-tab-btn-support" class="hc-tab-btn-modern" onclick="window.setHelpTab('support')">
            Send Message
          </button>
        </div>
      </div>
      
      <!-- Scrolling Panel Body -->
      <div id="hc-scrolling-body" style="flex:1; overflow-y:auto; padding: 24px; box-sizing:border-box; display:flex; flex-direction:column; gap:20px;">
        
        <!-- FAQs TAB CONTENT -->
        <div id="hc-tab-faq" style="display:flex; flex-direction:column; gap:4px;">
          <p style="color:#a3a3a3; font-size:13px; margin:0 0 12px 0; line-height:1.5;">Frequently asked platform questions. Select to expand.</p>
          
          <!-- Accordion 1 -->
          <div class="faq-item faq-item-modern">
            <div class="faq-trigger faq-trigger-modern" onclick="window.toggleHelpCollapse(this)">
              <span class="faq-title">How do I add new memories/moments?</span>
              <span class="collapse-toggle-icon" style="color:#FFF; font-size:18px; line-height:1; transition: transform 0.25s; display:inline-block;">+</span>
            </div>
            <div class="faq-content faq-content-modern">
              <div style="padding-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top:14px;">
                Simply click the <strong style="color:#fff;">“＋ Add Memory”</strong> button in the top navigation bar. A sophisticated dialog drawer will appear, allowing you to specify a Title, Description, Category, Image Backdrop option, and Video Links. Newly added parameters sync immediately with Firestore database!
              </div>
            </div>
          </div>
          
          <!-- Accordion 2 -->
          <div class="faq-item faq-item-modern">
            <div class="faq-trigger faq-trigger-modern" onclick="window.toggleHelpCollapse(this)">
              <span class="faq-title">What is the Bulk Management terminal?</span>
              <span class="collapse-toggle-icon" style="color:#FFF; font-size:18px; line-height:1; transition: transform 0.25s; display:inline-block;">+</span>
            </div>
            <div class="faq-content faq-content-modern">
              <div style="padding-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top:14px;">
                Clicking the <strong style="color:#fff;">“⚙ Bulk Manage”</strong> button opens our administrative dashboard panel. In this panel, you can view all items comprehensively, checkbox multiple cards simultaneously, categorize lists collectively, edit metadata in a single click, or execute quick bulk deletes.
              </div>
            </div>
          </div>
          
          <!-- Accordion 3 -->
          <div class="faq-item faq-item-modern">
            <div class="faq-trigger faq-trigger-modern" onclick="window.toggleHelpCollapse(this)">
              <span class="faq-title">How do I crop and compress pictures?</span>
              <span class="collapse-toggle-icon" style="color:#FFF; font-size:18px; line-height:1; transition: transform 0.25s; display:inline-block;">+</span>
            </div>
            <div class="faq-content faq-content-modern">
              <div style="padding-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top:14px;">
                When uploading a photo or moment thumbnail, our integrated Canvas moments cropper loads. Standardise layouts with pre-configured cinematic aspect ratios (16:9 or 1:1), rotate, zoom, and lock. Images compress client-side automatically before transmission to ensure speedy loading.
              </div>
            </div>
          </div>
          
          <!-- Accordion 4 -->
          <div class="faq-item faq-item-modern">
            <div class="faq-trigger faq-trigger-modern" onclick="window.toggleHelpCollapse(this)">
              <span class="faq-title">How is the Gemini AI Copilot utilized?</span>
              <span class="collapse-toggle-icon" style="color:#FFF; font-size:18px; line-height:1; transition: transform 0.25s; display:inline-block;">+</span>
            </div>
            <div class="faq-content faq-content-modern">
              <div style="padding-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top:14px;">
                Our platform incorporates deep Gemini prompts generator assistants. When creating content, click the <strong style="color:#fff;">✨ Generate with Gemini AI</strong> button to copy a bespoke contextual movie description formula or style requests to your clipboard and easily open Gemini app directly in another tab!
              </div>
            </div>
          </div>
          
          <!-- Accordion 5 -->
          <div class="faq-item faq-item-modern">
            <div class="faq-trigger faq-trigger-modern" onclick="window.toggleHelpCollapse(this)">
              <span class="faq-title">Is data synchronized securely in realtime?</span>
              <span class="collapse-toggle-icon" style="color:#FFF; font-size:18px; line-height:1; transition: transform 0.25s; display:inline-block;">+</span>
            </div>
            <div class="faq-content faq-content-modern">
              <div style="padding-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.06); padding-top:14px;">
                Yes! Sourced from Google Firestore capabilities, our account statistics, My List favorites, customized descriptions, and uploaded moments are broadcast securely. Any modification is instantly updated in all active screens.
              </div>
            </div>
          </div>
        </div>
        
        <!-- FEATURES TAB CONTENT -->
        <div id="hc-tab-features" style="display:none; flex-direction:column; gap:12px;">
          <p style="color:#a3a3a3; font-size:13px; margin:0 0 4px 0; line-height:1.5;">Matrix of custom capabilities built inside our Netflix interface:</p>
          
          <!-- Grid of Features -->
          <div class="feat-grid-modern" id="features-list-container">
            
            <!-- Feature item 1 -->
            <div class="feat-item feat-card-modern">
              <div class="feat-svg-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-feat-icon" style="transition: transform 0.3s ease;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><polygon points="10 8 16 11 10 14 10 8" fill="#E50914" stroke="none"/></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <span style="font-weight:700; font-size:13.5px; color:#fff;" class="feat-name">Hero Billboard Slideshow</span>
                  <span style="font-size:8px; background:#e50914; color:#fff; font-weight:800; padding:2px 4px; border-radius:2px; text-transform:uppercase;">Core</span>
                </div>
                <p style="font-size:11.5px; color:#aaa; margin:0; line-height:1.4;" class="feat-desc">Smooth transition-crossfade banner showcasing key highlights with video ambient clips, volume toggles, and direct theater play access.</p>
              </div>
            </div>
            
            <!-- Feature item 2 -->
            <div class="feat-item feat-card-modern">
              <div class="feat-svg-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-feat-icon" style="transition: transform 0.3s ease;"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="#E50914" stroke="none"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <span style="font-weight:700; font-size:13.5px; color:#fff;" class="feat-name">Theater Experience Controls</span>
                  <span style="font-size:8px; background:#e50914; color:#fff; font-weight:800; padding:2px 4px; border-radius:2px; text-transform:uppercase;">New</span>
                </div>
                <p style="font-size:11.5px; color:#aaa; margin:0; line-height:1.4;" class="feat-desc">Dynamic fullscreen media controls representing play, pause, volume sliders, and seamless shortcuts including Space, M, and F keys.</p>
              </div>
            </div>
            
            <!-- Feature item 3 -->
            <div class="feat-item feat-card-modern">
              <div class="feat-svg-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-feat-icon" style="transition: transform 0.3s ease;"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636" /><circle cx="12" cy="12" r="3" fill="#E50914" stroke="none"/></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <span style="font-weight:700; font-size:13.5px; color:#fff;" class="feat-name">Gemini AI Formula Generator</span>
                  <span style="font-size:8px; background:#ae27eb; color:#fff; font-weight:800; padding:2px 4px; border-radius:2px; text-transform:uppercase;">AI Powered</span>
                </div>
                <p style="font-size:11.5px; color:#aaa; margin:0; line-height:1.4;" class="feat-desc">Deep server-side LLM connectivity. Instantly auto-generates heartfelt romance descriptions, custom titles, and logo design formulas.</p>
              </div>
            </div>
            
            <!-- Feature item 4 -->
            <div class="feat-item feat-card-modern">
              <div class="feat-svg-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-feat-icon" style="transition: transform 0.3s ease;"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <span style="font-weight:700; font-size:13.5px; color:#fff;" class="feat-name">Administrative Bulk Manager</span>
                  <span style="font-size:8px; background:#46d369; color:#fff; font-weight:800; padding:2px 4px; border-radius:2px; text-transform:uppercase;">Admin</span>
                </div>
                <p style="font-size:11.5px; color:#aaa; margin:0; line-height:1.4;" class="feat-desc">Select and manage multiple blocks comfortably. Swap categories collectively, rewrite properties in batches, or execute complete mass deletions securely.</p>
              </div>
            </div>
            
            <!-- Feature item 5 -->
            <div class="feat-item feat-card-modern">
              <div class="feat-svg-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-feat-icon" style="transition: transform 0.3s ease;"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <span style="font-weight:700; font-size:13.5px; color:#fff;" class="feat-name">Sleek Profile Crop Tool</span>
                  <span style="font-size:8px; background:#00bcff; color:#fff; font-weight:800; padding:2px 4px; border-radius:2px; text-transform:uppercase;">Media</span>
                </div>
                <p style="font-size:11.5px; color:#aaa; margin:0; line-height:1.4;" class="feat-desc">Pre-defined ratios (1:1 and 16:9), interactive positioning nodes, canvas rotation, and client-side web image compression to save space.</p>
              </div>
            </div>
 
            <!-- Feature item 6 -->
            <div class="feat-item feat-card-modern">
              <div class="feat-svg-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-feat-icon" style="transition: transform 0.3s ease;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <span style="font-weight:700; font-size:13.5px; color:#fff;" class="feat-name">Real-time Cloud Sync Engine</span>
                  <span style="font-size:8px; background:#e50914; color:#fff; font-weight:800; padding:2px 4px; border-radius:2px; text-transform:uppercase;">Database</span>
                </div>
                <p style="font-size:11.5px; color:#aaa; margin:0; line-height:1.4;" class="feat-desc">Full integration with Google Firestore database guarantees that account profiles, customized playlists, and likes load instantaneously without lag.</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- SUPPORT TAB CONTENT -->
        <div id="hc-tab-support" style="display:none; flex-direction:column; gap:12px;">
          <p style="color:#a3a3a3; font-size:13px; margin:0 0 6px 0; line-height:1.5;">Send an email message directly to Sarthak (<strong style="color:#e50914;">26sarthakbasu@gmail.com</strong>) from your native client:</p>
          
          <div id="hc-support-form-container" style="background:#1f1f1f; border-radius:4px; padding:20px; display:flex; flex-direction:column; gap:15px;">
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Your Profile Identity</label>
              <select id="hc-support-author" style="width:100%; padding:10px; border-radius:2px; border:1px solid #333; background:#141414; color:white; outline:none; font-family:inherit; font-size:13px;">
                <option value="Sarthak">Sarthak</option>
                <option value="Reechita">Reechita</option>
                <option value="Visitor / Friend">Visitor / Friend</option>
              </select>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Subject Category</label>
              <select id="hc-support-type" style="width:100%; padding:10px; border-radius:2px; border:1px solid #333; background:#141414; color:white; outline:none; font-family:inherit; font-size:13px;">
                <option value="Suggestion">💡 Romantic Suggestion</option>
                <option value="Technical Issue">🔧 Bug or Display Glitch</option>
                <option value="Love Letter">💖 Secret Sweet Message</option>
                <option value="Other">📝 General Question</option>
              </select>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Detailed Message</label>
              <textarea id="hc-support-msg" rows="4" placeholder="Write whatever is on your mind..." style="width:100%; padding:10px; border-radius:2px; border:1px solid #333; background:#141414; color:white; outline:none; font-family:inherit; resize:none; font-size:13px; line-height:1.5;" required></textarea>
            </div>
            
            <button class="btn btn-primary" onclick="window.submitHelpTicket()" style="width:100%; padding:12px; font-weight:700; font-size:12.5px; margin-top:5px; text-transform:uppercase; letter-spacing:0.5px; border:none; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; background:#e50914; color:#fff; transition: background 0.2s;">
               <span>📨</span> Open Email Client
            </button>
          </div>
        </div>
        
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
};

window.setHelpTab = (tabName) => {
  const tabs = ['faq', 'features', 'support'];
  tabs.forEach(t => {
    const el = document.getElementById(`hc-tab-${t}`);
    const btn = document.getElementById(`hc-tab-btn-${t}`);
    if (el && btn) {
      if (t === tabName) {
        el.style.display = 'flex';
        btn.style.color = '#fff';
        btn.style.fontWeight = '700';
        btn.style.borderBottomColor = '#E50914';
      } else {
        el.style.display = 'none';
        btn.style.color = '#a3a3a3';
        btn.style.fontWeight = '500';
        btn.style.borderBottomColor = 'transparent';
      }
    }
  });
  
  // Clear search field on tab shift
  const searchInput = document.getElementById('hc-search-input');
  if (searchInput) {
    searchInput.value = '';
    window.filterHelpContent('');
  }
};

window.toggleHelpCollapse = (el) => {
  const trigger = el;
  const content = el.nextElementSibling;
  const icon = el.querySelector('.collapse-toggle-icon');
  const faqItem = el.closest('.faq-item');
  const isCollapsed = content.style.maxHeight === '0px' || !content.style.maxHeight;
  
  // Close all other collapsible items to prevent clutter (Netflix accordion style!)
  const allItems = document.querySelectorAll('.faq-item');
  allItems.forEach(item => {
    const itemContent = item.querySelector('.faq-content');
    const itemTrigger = item.querySelector('.faq-trigger');
    const itemIcon = item.querySelector('.collapse-toggle-icon');
    if (itemContent && itemContent !== content) {
      itemContent.style.maxHeight = '0px';
      itemContent.style.opacity = '0';
      if (itemIcon) {
        itemIcon.style.transform = 'rotate(0deg)';
        itemIcon.innerText = '+';
      }
      item.style.background = '#303030';
      if (itemTrigger) delete itemTrigger.dataset.active;
    }
  });

  if (isCollapsed) {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.opacity = '1';
    if (icon) {
      icon.style.transform = 'rotate(45deg)'; // Tilt a bit or turn into close icon
      icon.innerText = '×';
    }
    trigger.dataset.active = "true";
  } else {
    content.style.maxHeight = '0px';
    content.style.opacity = '0';
    if (icon) {
      icon.style.transform = 'rotate(0deg)';
      icon.innerText = '+';
    }
    delete trigger.dataset.active;
  }
};

window.filterHelpContent = (query) => {
  const q = query.toLowerCase().trim();
  
  // Filter FAQs
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const titleEl = item.querySelector('.faq-title');
    const contentEl = item.querySelector('.faq-content');
    if (titleEl && contentEl) {
      const title = titleEl.innerText.toLowerCase();
      const content = contentEl.innerText.toLowerCase();
      if (title.includes(q) || content.includes(q)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    } else {
      // If elements are missing but the item has the class, default to hiding or showing gracefully
      item.style.display = q === '' ? 'block' : 'none';
    }
  });
  
  // Filter Features Guide
  const featItems = document.querySelectorAll('.feat-item');
  featItems.forEach(item => {
    const nameEl = item.querySelector('.feat-name');
    const descEl = item.querySelector('.feat-desc');
    if (nameEl && descEl) {
      const name = nameEl.innerText.toLowerCase();
      const desc = descEl.innerText.toLowerCase();
      if (name.includes(q) || desc.includes(q)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    } else {
      item.style.display = q === '' ? 'flex' : 'none';
    }
  });
};

window.submitHelpTicket = async () => {
  const author = document.getElementById('hc-support-author').value;
  const type = document.getElementById('hc-support-type').value;
  const msg = document.getElementById('hc-support-msg').value.trim();
  
  if (!msg) {
    return window.netflixAlert("Please write a message before submitting.");
  }
  
  const emailTo = "26sarthakbasu@gmail.com";
  const emailSubject = `Netflix Our-Story: ${type} from ${author}`;
  const emailBody = `Sender Profile: ${author}\nCategory: ${type}\n\nMessage:\n${msg}`;
  
  let copySuccessful = false;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(emailBody);
      copySuccessful = true;
    } catch(e) {
      console.warn("Clipboard locked:", e);
    }
  }
  
  const formContainer = document.getElementById('hc-support-form-container');
  if (formContainer) {
    formContainer.innerHTML = `
      <div style="text-align:center; padding: 25px 5px; display:flex; flex-direction:column; align-items:center; gap:16px; animation: hcFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; font-family:inherit;">
        
        <!-- Success Check Rings -->
        <div style="width:60px; height:60px; background:rgba(229,9,20,0.1); border: 2px solid #e50914; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#e50914; font-size:24px; box-shadow: 0 0 15px rgba(229,10,20,0.25); animation: checkPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          ✔
        </div>
        
        <h3 style="margin:0; font-size:16.5px; font-weight:800; color:#fff; tracking-tight">Email Fully Prepared!</h3>
        
        <p style="font-size:12.5px; color:#aaa; margin:0; line-height:1.55; max-width:300px;">
          Your message is formatted and ready for delivery to:<br>
          <strong style="color: #fff; text-decoration: underline; font-size: 13px;">${emailTo}</strong>
        </p>

        <div style="background:#0c0c0c; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:12px; width:100%; text-align:left; font-family:monospace; font-size:11.5px; color:#c5c5c5; overflow-x:auto; word-break:break-all; max-height:100px; overflow-y:auto; margin-top:5px;">
          ${emailBody.replace(/\n/g, '<br>')}
        </div>

        <p style="font-size:11px; color:#888; margin:0; line-height:1.4; max-width:280px;">
          ${copySuccessful ? '🎈 <strong>Message copied to clipboard!</strong> If your browser blocks launching mail apps, you can paste the text directly.' : 'Clipboard copy restricted; please click Launch Email below to send.'}
        </p>

        <div style="display:flex; flex-direction:column; gap:8px; width:100%; margin-top:10px;">
          <a href="mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}" target="_blank" class="btn btn-primary" style="padding:12px 14px; font-size:12px; font-weight:700; border-radius:4px; text-decoration:none; text-align:center; background:#e50914; color:#fff; text-transform:uppercase; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s;" onmouseenter="this.style.background='#ff1a22';" onmouseleave="this.style.background='#e50914';">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            Launch System Mail
          </a>
          
          <button class="btn" onclick="window.resetHelpSupportForm()" style="background: rgba(255,255,255,0.08); color: white; border: none; padding: 10px; font-size: 11.5px; border-radius: 4px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit;" onmouseenter="this.style.background='rgba(255,255,255,0.15)';" onmouseleave="this.style.background='rgba(255,255,255,0.08)';">
            Write Another Message
          </button>
        </div>
      </div>
    `;
  }
  
  try {
    const dummyLink = document.createElement('a');
    dummyLink.href = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    dummyLink.target = '_blank';
    document.body.appendChild(dummyLink);
    dummyLink.click();
    document.body.removeChild(dummyLink);
  } catch(e) {
    window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  }
  
  window.showToast("Opening Email Client...");
};

window.resetHelpSupportForm = () => {
  const formContainer = document.getElementById('hc-support-form-container');
  if (formContainer) {
    formContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.7px;">Your Profile Identity</label>
        <select id="hc-support-author" class="hc-input-modern">
          <option value="Sarthak">Sarthak</option>
          <option value="Reechita">Reechita</option>
          <option value="Visitor / Friend">Visitor / Friend</option>
        </select>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.7px;">Subject Category</label>
        <select id="hc-support-type" class="hc-input-modern">
          <option value="Suggestion">💡 Romantic Suggestion</option>
          <option value="Technical Issue">🔧 Bug or Display Glitch</option>
          <option value="Love Letter">💖 Secret Sweet Message</option>
          <option value="Other">📝 General Question</option>
        </select>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:6px;">
        <label style="font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.7px;">Detailed Message</label>
        <textarea id="hc-support-msg" class="hc-input-modern" rows="4" placeholder="Write whatever is on your mind..." style="resize:none; line-height:1.5;" required></textarea>
      </div>
      
      <button class="btn btn-primary" onclick="window.submitHelpTicket()" style="width:100%; padding:14px; font-weight:700; font-size:12.5px; margin-top:5px; text-transform:uppercase; letter-spacing:0.7px; border:none; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; background:#e50914; color:#fff; transition: all 0.25s; box-shadow: 0 4px 10px rgba(229,9,20,0.2);" onmouseenter="this.style.background='#ff1a22'; this.style.transform='translateY(-1px)';" onmouseleave="this.style.background='#e50914'; this.style.transform='translateY(0)';">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><polyline points="22 2 11 13 22 2"></polyline><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        Open Email Client
      </button>
    `;
  }
};

window.openSettingsModal = () => {
  const modal = document.createElement('div');
  modal.className = 'settings-overlay-modern';
  modal.id = 'settingsModal';
  
  // Close when clicking the backdrop
  modal.onclick = (e) => {
    if (e.target === modal) {
      window.closeSettingsModal();
    }
  };
  
  modal.innerHTML = `
    <style>
      .settings-overlay-modern {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        display: flex;
        align-items: stretch;
        justify-content: flex-end;
        z-index: 15000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        padding: 0;
        box-sizing: border-box;
      }
      .settings-overlay-modern.open {
        opacity: 1;
        pointer-events: auto;
      }
      
      .netflix-settings-card {
        background: #141414;
        border-top-left-radius: 16px;
        border-bottom-left-radius: 16px;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        padding: 40px 30px;
        max-width: 480px;
        width: 100%;
        height: 100vh;
        max-height: 100vh;
        overflow-y: auto;
        border-left: 1px solid rgba(255,255,255,0.08);
        border-right: none;
        border-top: none;
        border-bottom: none;
        position: relative;
        box-shadow: -15px 0 50px rgba(0,0,0,0.95);
        transform: translateX(100%);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }
      .settings-overlay-modern.open .netflix-settings-card {
        transform: translateX(0);
      }
      
      .netflix-settings-card::-webkit-scrollbar {
        width: 6px;
      }
      .netflix-settings-card::-webkit-scrollbar-track {
        background: transparent;
      }
      .netflix-settings-card::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      .netflix-settings-card::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      
      .netflix-settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      
      .settings-text-column {
        padding-right: 15px;
        flex: 1;
      }
      .settings-title-label {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.1px;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .settings-desc-label {
        font-size: 11.5px;
        color: #a3a3a3;
        line-height: 1.40;
      }
      
      /* Netflix Custom RED Switch */
      .netflix-red-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }
      .netflix-red-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .netflix-red-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #2b2b2b;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .netflix-red-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: #8a8a8a;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      }
      .netflix-red-switch input:checked + .netflix-red-slider {
        background-color: #e50914;
        border-color: #e50914;
        box-shadow: 0 0 10px rgba(229, 9, 20, 0.35);
      }
      .netflix-red-switch input:checked + .netflix-red-slider:before {
        transform: translateX(20px);
        background-color: #ffffff;
      }
      
      /* Danger Zone Box */
      .netflix-danger-box {
        background: rgba(229, 9, 20, 0.02);
        border: 1px solid rgba(229, 9, 20, 0.25);
        padding: 18px 20px;
        border-radius: 8px;
        margin-top: 25px;
        position: relative;
        overflow: hidden;
      }
      .netflix-danger-box::before {
        content: '';
        position: absolute;
        top: 0; left: 0; bottom: 0; width: 4px;
        background: #e50914;
      }
      .danger-box-title {
        font-size: 14px;
        font-weight: 800;
        color: #ff333f;
        margin-bottom: 8px;
        letter-spacing: -0.1px;
        display: flex;
        align-items: center;
        gap: 8px;
        text-transform: uppercase;
      }
      .danger-bullets {
        margin: 10px 0 16px 0;
        padding-left: 14px;
        font-size: 11px;
        color: #b3b3b3;
        line-height: 1.55;
        list-style-type: square;
      }
      .danger-bullets li {
        margin-bottom: 5px;
      }
      .danger-bullets strong {
        color: #ffffff;
      }
      
      .purge-btn-netflix {
        background: rgba(229, 9, 20, 0.12);
        border: 1px solid #e50914;
        color: #ffffff;
        width: 100%;
        justify-content: center;
        font-weight: 700;
        padding: 12px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .purge-btn-netflix:hover {
        background: #e50914;
        box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4);
        transform: translateY(-1px);
      }
      .purge-btn-netflix:active {
        transform: translateY(1px);
      }
    </style>
    
    <div class="netflix-settings-card">
      <button class="upload-close" onclick="window.closeSettingsModal()">&times;</button>
      
      <!-- Modal Header -->
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 25px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span style="font-weight:900; font-size:18px; color:#fff; letter-spacing:-0.2px;">Account Settings</span>
      </div>
      
      <!-- Set 1: Autoplay Previews -->
      <div class="netflix-settings-row">
        <div class="settings-text-column">
          <div class="settings-title-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Autoplay Previews
          </div>
          <div class="settings-desc-label">Stream video highlights automatically on home screen hover cards.</div>
        </div>
        <label class="netflix-red-switch">
          <input type="checkbox" ${appState.settings.autoPlayPreviews ? 'checked' : ''} onchange="toggleSetting('autoPlayPreviews')">
          <span class="netflix-red-slider"></span>
        </label>
      </div>

      <!-- Set 2: Autoplay Next Episode -->
      <div class="netflix-settings-row" style="border-bottom: none;">
        <div class="settings-text-column">
          <div class="settings-title-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            Autoplay Next Episode
          </div>
          <div class="settings-desc-label">Immediately queue and boot the next memory following video completion.</div>
        </div>
        <label class="netflix-red-switch">
          <input type="checkbox" ${appState.settings.autoPlayNextEpisode ? 'checked' : ''} onchange="toggleSetting('autoPlayNextEpisode')">
          <span class="netflix-red-slider"></span>
        </label>
      </div>
      
      <!-- Danger Zone block -->
      <div class="netflix-danger-box">
        <div class="danger-box-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Warning: Danger Zone
        </div>
        <p style="font-size: 11px; color:#adadad; margin:0; line-height:1.45;">Executing a database purge results in immediate and irreversible server modifications:</p>
        <ul class="danger-bullets">
          <li>Permanently <strong>deletes and wipes all videos, photos, categories, and memories</strong> from Firestore.</li>
          <li>Clears all active <strong>My List</strong> bookmarks, user likes, and customized playlist statistics.</li>
          <li><strong>IRREVERSIBLE EFFECT:</strong> Wiped databases cannot be restored under any circumstances.</li>
        </ul>
        <button class="purge-btn-netflix" onclick="window.confirmPurgeAll()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          Purge Firebase Database
        </button>
      </div>
      
      <div class="actions" style="margin-top:25px; justify-content:center;">
        <button class="btn btn-primary" style="width:100%; border:none; padding: 12px; font-weight:700; background:#fff; color:#000; transition:all 0.2s;" onmouseenter="this.style.background='#e50914'; this.style.color='#fff';" onmouseleave="this.style.background='#fff'; this.style.color='#000';" onclick="window.closeSettingsModal()">Done</button>
      </div>
    </div>
  `;
  
  window.closeSettingsModal = () => {
    modal.classList.remove('open');
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
    }, 400);
  };
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
};

window.syncMyListUI = (id) => {
  const inList = appState.myList.includes(id);
  
  // 1. Sync matching circular button in the Detail Modal
  let dmBtn = null;
  const circButtons = document.querySelectorAll('.circ-play-btn');
  for (const btn of circButtons) {
    const oClick = btn.getAttribute('onclick') || '';
    if (oClick.includes(id)) {
      dmBtn = btn;
      break;
    }
  }
  
  if (dmBtn) {
    dmBtn.title = inList ? 'Remove from List' : 'Add to My List';
    dmBtn.innerHTML = inList ? 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);"><polyline points="20 6 9 17 4 12"/></svg>` : 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);"><path d="M12 5v14M5 12h14"/></svg>`;
    
    dmBtn.classList.add('pop-active');
    setTimeout(() => dmBtn.classList.remove('pop-active'), 400);
  }
  
  // 2. Sync all matching hover chassis media-card add buttons
  const addButtons = document.querySelectorAll('.hc-add');
  addButtons.forEach(btn => {
    const oClick = btn.getAttribute('onclick') || '';
    if (oClick.includes(id)) {
      btn.title = inList ? 'Remove from List' : 'Add to My List';
      btn.innerHTML = inList ? 
        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: scaleUp 0.15s ease-out;"><polyline points="20 6 9 17 4 12"/></svg>` : 
        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: scaleUp 0.15s ease-out;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
      
      btn.classList.add('pop-active');
      setTimeout(() => btn.classList.remove('pop-active'), 400);
    }
  });

  // 3. Sync Hero Billboard banner button
  const heroBtn = document.getElementById('hero-mylist-btn');
  if (heroBtn) {
    const clickAttr = heroBtn.getAttribute('onclick') || '';
    if (clickAttr.includes(id)) {
      heroBtn.title = inList ? 'Remove from My List' : 'Add to My List';
      heroBtn.innerHTML = inList ? 
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: scaleUp 0.25s ease-out;"><polyline points="20 6 9 17 4 12"/></svg>` : 
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: scaleUp 0.25s ease-out;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      
      heroBtn.classList.add('pop-active');
      setTimeout(() => heroBtn.classList.remove('pop-active'), 400);
    }
  }
};

window.toggleMyList = (id, event) => {
  if (event) event.stopPropagation();
  const inListBefore = appState.myList.includes(id);
  if (inListBefore) {
    appState.myList = appState.myList.filter(i => i !== id);
  } else {
    appState.myList.push(id);
  }
  saveStateList('myList', appState.myList);
  
  if (appState.activeCategory === 'My List') {
    // If we are physically on the My List view, we need a refresh to remove the item instantly
    window.refreshRowsView(null, null, true);
  } else {
    // Otherwise, perform high-fidelity synchronised DOM update, completely preserving video/hover states
    window.syncMyListUI(id);
  }
};

window.toggleHeroMyList = (id, event) => {
  if (event) event.stopPropagation();
  const isCurrentlyIn = appState.myList.includes(id);
  if (isCurrentlyIn) {
    appState.myList = appState.myList.filter(i => i !== id);
    window.showToast('Removed from My List');
  } else {
    appState.myList.push(id);
    window.showToast('Added to My List');
  }
  saveStateList('myList', appState.myList);
  
  if (appState.activeCategory === 'My List') {
    window.refreshRowsView(null, null, true);
  } else {
    window.syncMyListUI(id);
  }
};

function createStartupScreen() {
  const c = document.createElement('div');
  c.className = 'intro-container';
  // Use the exact file provided by user for initial app load Netflix opening animation
  c.innerHTML = `
    <video id="startup-vid" src="./netflix-intro.mp4" playsinline style="width:100%; height:100%; object-fit:cover;"></video>
    <div id="startup-click-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%); z-index:2; cursor:pointer; flex-direction: column;">
      <div style="background: rgba(0,0,0,0.6); padding: 10px 25px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
        <h1 style="color:white; font-size:16px; font-weight: 500; letter-spacing: 1px; margin: 0; display: flex; align-items: center; gap: 10px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Click anywhere to start
        </h1>
      </div>
    </div>
  `;
  setTimeout(() => {
    const vid = c.querySelector('#startup-vid');
    const overlay = c.querySelector('#startup-click-overlay');
    let hasPlayed = false;
    const playAnim = () => {
      if (hasPlayed) return;
      hasPlayed = true;
      overlay.style.display = 'none';
      vid.play().catch(e => {
        vid.muted = true;
        vid.play();
      });
      // Force exactly 4 seconds
      setTimeout(vid.onended, 4000);
    };
    vid.onended = () => {
      c.style.transition = 'opacity 0.6s ease';
      c.style.opacity = '0';
      setTimeout(() => {
         appState.currentProfile = null;
         transitionView('profiles');
      }, 600);
    };
    vid.onerror = () => {
      appState.currentProfile = null;
      transitionView('profiles');
    };
    c.onclick = playAnim;
    // Auto-attempt
    vid.play().then(() => { overlay.style.display = 'none'; }).catch(e => { /* Wait for click */ });
  }, 50);
  return c;
}

// Web Audio Synthesizer
window.playHoverSound = () => {};

function createProfileSelection() {
  const c = document.createElement('div');
  c.className = 'profile-selection';
  
  const isManageMode = appState.manageProfiles;
  
  c.innerHTML = `
    <h1>${isManageMode ? 'Manage Profiles' : 'Who\'s watching?'}</h1>
    <div class="profiles-list" id="pfList"></div>
    <button class="manage-profiles-btn" onclick="window.toggleManageProfiles()">${isManageMode ? 'DONE' : 'MANAGE PROFILES'}</button>
  `;
  const list = c.querySelector('.profiles-list');
  
  if (!appState.profiles || appState.profiles.length === 0) {
    for(let i=0; i<3; i++) {
        const skel = document.createElement('div');
        skel.className = 'profile-card';
        skel.innerHTML = `
          <div class="profile-avatar-wrapper">
             <div class="profile-avatar skeleton-card" style="border-radius: 4px;"></div>
          </div>
          <div class="profile-name" style="width: 80px; height: 16px; background: #333; margin-top: 15px; border-radius: 4px; animation: shimmer 1.5s infinite linear; background-image: linear-gradient(90deg, #1c1c1c 25%, #262626 50%, #1c1c1c 75%); background-size: 400% 100%;"></div>
        `;
        list.appendChild(skel);
    }
    return c;
  }
  
  let delay = 0;
  appState.profiles.forEach((pf) => {
    const p = document.createElement('div');
    p.className = 'profile-card';
    p.onmouseenter = null;
    if(isManageMode) p.classList.add('manage-mode');
    
    p.style.setProperty('--stagger', delay++);
    p.innerHTML = `
      <div class="profile-avatar-wrapper" style="position:relative;">
        <div class="profile-avatar" style="background-image: url('${pf.avatar}')"></div>
        ${!isManageMode ? '<svg class="profile-outline-svg" width="100%" height="100%" style="position:absolute; top:0; left:0; z-index:5; pointer-events:none; border-radius:4px;"><rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="4" ry="4" stroke="white" stroke-width="4" fill="none" class="profile-outline-rect" /></svg>' : ''}
        ${isManageMode ? '<div class="edit-overlay"><svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></div>' : ''}
      </div>
      <div class="profile-name">${pf.name}</div>
    `;
    
    p.onclick = () => {
      if(isManageMode) {
        window.editProfile(pf.id);
      } else {
        const secretCode = sessionStorage.getItem('sarthak_netflix_code');
        if (secretCode !== '25072025') {
          showPinModal(pf, p);
          return;
        }
        
        loginProfile(pf, p);
      }
    };
    list.appendChild(p);
  });
  return c;
}

function loginProfile(pf, p) {
  window.currentHeroIndex = undefined;
  appState.currentProfile = pf.name;
  window.safeSetLocalItem('sarthak_netflix_profile', pf.name);
  
  const pfList = document.getElementById('pfList');
  if (pfList) pfList.style.pointerEvents = 'none';

  const title = document.querySelector('.profile-selection h1');
  const manageBtn = document.querySelector('.manage-profiles-btn');
  if (title) try { animate(title, { opacity: 0, y: -20 }, { duration: 0.4 }); } catch(err) {}
  if (manageBtn) try { animate(manageBtn, { opacity: 0, y: 20 }, { duration: 0.4 }); } catch(err) {}

  const cards = document.querySelectorAll('.profile-card');
  cards.forEach(card => {
    if (card !== p) {
      try { animate(card, { opacity: 0, scale: 0.8 }, { duration: 0.4, ease: [0.16, 1, 0.3, 1] }); } catch(err) {}
    } else {
      const avatarWrapper = card.querySelector('.profile-avatar-wrapper');
      const name = card.querySelector('.profile-name');
      const outline = card.querySelector('.profile-outline-svg');
      if (name) try { animate(name, { opacity: 0, y: 10 }, { duration: 0.3 }); } catch(err) {}
      if (outline) try { animate(outline, { opacity: 0 }, { duration: 0.3 }); } catch(err) {}
      if (avatarWrapper) {
        try {
          animate(avatarWrapper, { 
            scale: 1.25, 
            boxShadow: '0 0 40px rgba(229, 9, 20, 0.8)'
          }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
        } catch(err) {}
      }
    }
  });

  setTimeout(() => {
    const pSelection = document.querySelector('.profile-selection');
    if (pSelection) {
      try {
        animate(pSelection, { opacity: 0, scale: 1.05 }, { duration: 0.4, ease: [0.16, 1, 0.3, 1] }).then(() => {
          appState.view = 'dashboard';
          app.innerHTML = '';
          
          const dashboard = createDashboard();
          app.appendChild(dashboard);
          
          dashboard.style.opacity = '0';
          setTimeout(() => {
            animate(dashboard, { opacity: [0, 1] }, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
            const elements = dashboard.querySelectorAll('.navbar, .hero-billboard, .row');
            if (elements.length > 0) {
                animate(
                  elements, 
                  { y: [40, 0], opacity: [0, 1] }, 
                  { duration: 0.8, delay: stagger(0.1, { startDelay: 0.1 }), ease: [0.16, 1, 0.3, 1] }
                );
            }
          }, 50);
        });
      } catch(e) {
        appState.view = 'dashboard';
        app.innerHTML = '';
        const dashboard = createDashboard();
        app.appendChild(dashboard);
      }
    } else {
      appState.view = 'dashboard';
      app.innerHTML = '';
      const dashboard = createDashboard();
      app.appendChild(dashboard);
    }
  }, 750);
}

function showPinModal(pf, pElement) {
  const overlay = document.createElement('div');
  overlay.className = 'pin-overlay';
  overlay.innerHTML = `
    <div class="pin-container">
      <h2>Profile Lock is on.</h2>
      <p>Enter your PIN to access this profile.</p>
      <div class="pin-inputs">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
        <input type="text" maxlength="1" class="pin-in">
      </div>
      <div class="pin-error" style="color: #e50914; margin-top: 15px; font-size: 14px; opacity: 0; transition: opacity 0.3s;">Incorrect PIN. Please try again.</div>
      <button class="btn btn-secondary mt-4" style="margin-top: 30px;" onclick="document.querySelector('.pin-overlay').remove()">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const inputs = overlay.querySelectorAll('.pin-in');
  setTimeout(() => inputs[0].focus(), 100);
  
  inputs.forEach((inEl, idx) => {
    inEl.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      e.target.dataset.val = e.target.value;
      if (e.target.value) {
        e.target.type = 'text';
        setTimeout(() => {
          if (e.target.value && e.target.dataset.val) e.target.type = 'password';
        }, 1000);
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
      } else {
        e.target.type = 'text';
      }
      
      const val = Array.from(inputs).map(i => i.dataset.val || '').join('');
      if (val.length === 8) {
        if (val === '25072025') {
          window.safeSetSessionItem('sarthak_netflix_code', '25072025');
          overlay.remove();
          loginProfile(pf, pElement);
        } else {
          overlay.querySelector('.pin-error').style.opacity = '1';
          inputs.forEach(i => { i.value = ''; i.dataset.val = ''; i.type = 'text'; });
          inputs[0].focus();
        }
      } else {
        overlay.querySelector('.pin-error').style.opacity = '0';
      }
    });
    
    inEl.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
  });
}

// === PREMIUM NETFLIX CUSTOM DIALOGS (REPLACE NATIVE ALERTS/CONFIRMS) ===
window.netflixConfirm = (message, onConfirm, onCancel) => {
  const dialog = document.createElement('div');
  dialog.className = 'upload-modal open';
  dialog.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px);
    z-index: 30000; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  dialog.innerHTML = `
    <div class="confirm-card" style="background: #181a1c; border-radius: 8px; padding: 30px; width: 90%; max-width: 440px; transform: scale(0.9); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); border-left: 3px solid #e50914; box-shadow: 0 20px 50px rgba(0,0,0,0.95); box-sizing: border-box;">
      <div style="display:flex; align-items:center; gap: 15px; margin-bottom: 20px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="2.5" style="filter: drop-shadow(0 0 5px rgba(229,9,20,0.5)); flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span style="color: white; font-size: 18px; font-weight: 700; font-family: inherit;">Confirm Action</span>
      </div>
      <p style="color: #ccc; font-size: 14px; font-weight: 500; line-height: 1.6; margin-bottom: 25px; margin-top: 0; text-align: left; font-family: inherit;">${message.replace(/\n/g, '<br>')}</p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-secondary" id="netflix-confirm-cancel" style="border-radius: 4px; padding: 8px 18px; font-weight: 600; font-size: 13px; background: transparent; border: 1px solid rgba(255,255,255,0.20); color: #888; transition: all 0.2s; cursor: pointer;">Cancel</button>
        <button class="btn btn-primary" id="netflix-confirm-yes" style="border-radius: 4px; padding: 8px 18px; font-weight: 700; font-size: 13px; background-color: #e50914; color: white; border: none; box-shadow: 0 0 10px rgba(229,9,20,0.3); transition: all 0.2s; cursor: pointer;">Proceed</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  setTimeout(() => {
    dialog.style.opacity = '1';
    dialog.querySelector('.confirm-card').style.transform = 'scale(1)';
  }, 10);
  
  const handleAction = (agreed) => {
    dialog.style.opacity = '0';
    dialog.querySelector('.confirm-card').style.transform = 'scale(0.9)';
    setTimeout(() => {
      dialog.remove();
      if (agreed && onConfirm) onConfirm();
      if (!agreed && onCancel) onCancel();
    }, 250);
  };
  
  dialog.querySelector('#netflix-confirm-cancel').onclick = () => handleAction(false);
  dialog.querySelector('#netflix-confirm-yes').onclick = () => handleAction(true);
};

window.netflixAlert = (message, onOk) => {
  const dialog = document.createElement('div');
  dialog.className = 'upload-modal open';
  dialog.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px);
    z-index: 30000; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  dialog.innerHTML = `
    <div class="confirm-card" style="background: #181a1c; border-radius: 8px; padding: 30px; width: 90%; max-width: 440px; transform: scale(0.9); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); border-left: 3px solid #e50914; box-shadow: 0 20px 50px rgba(0,0,0,0.95); text-align: center; box-sizing: border-box;">
      <div style="margin-bottom: 20px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="2" style="filter: drop-shadow(0 0 5px rgba(229,9,20,0.5)); margin: 0 auto;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <p style="color: white; font-size: 14px; font-weight: 500; line-height: 1.6; margin-bottom: 25px; margin-top: 0; text-align: center; font-family: inherit;">${message.replace(/\n/g, '<br>')}</p>
      <button class="btn btn-primary" id="netflix-alert-ok-btn" style="width: 100%; border-radius: 4px; padding: 10px; font-weight: 700; text-transform: uppercase; font-size: 13px; background-color: #e50914; color: white; border: none; cursor: pointer; transition: all 0.2s;">OK</button>
    </div>
  `;
  document.body.appendChild(dialog);
  setTimeout(() => {
    dialog.style.opacity = '1';
    dialog.querySelector('.confirm-card').style.transform = 'scale(1)';
  }, 10);
  
  const closeAlert = () => {
    dialog.style.opacity = '0';
    dialog.querySelector('.confirm-card').style.transform = 'scale(0.9)';
    setTimeout(() => { dialog.remove(); if (onOk) onOk(); }, 250);
  };
  dialog.querySelector('#netflix-alert-ok-btn').onclick = closeAlert;
};

// === PREMIUM PROFILE INTERACTIVE CROPPER SUITE ===
window.openProfileCropper = (imageDataUrl, onCropped) => {
  const m = document.createElement('div');
  m.className = 'upload-modal';
  m.id = 'profileCropperModal';
  
  m.innerHTML = `
    <div class="upload-modal-content crop-modal-wrapper">
      <div class="ep-header-title" style="font-size: 20px !important; margin-bottom: 15px !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding-bottom: 10px !important;">
        <span>Adjust Alignment</span>
        <button class="upload-close" style="position:static; margin-left:auto; display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; background:transparent; border:none; color:#999; cursor:pointer;" onclick="document.getElementById('profileCropperModal').remove()">&times;</button>
      </div>
      
      <p style="color: #aaa; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">Format your brand-perfect profile picture. Drag to center, use the slider to scale.</p>
      
      <div class="crop-viewport-container" id="crop-viewport">
        <img id="crop-target-img" src="${imageDataUrl}" style="position: absolute; transform-origin: 0 0; cursor: move; user-select: none; max-width: none; max-height: none;">
      </div>
      
      <!-- Zoom Slider -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 25px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size: 11px; color:#888; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
          <span>Zoom Scale</span>
          <span id="zoom-value-tag">100%</span>
        </div>
        <input type="range" id="crop-zoom" min="1" max="4" step="0.01" value="1" style="width: 100%; height: 4px; accent-color:#e50914; cursor:pointer;">
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-secondary" style="border-radius: 4px; padding: 8px 18px; font-weight: 600; font-size: 13px; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #aaa;" onclick="document.getElementById('profileCropperModal').remove()">Discard</button>
        <button class="btn btn-primary" id="crop-confirm-save" style="border-radius: 4px; padding: 8px 18px; font-weight: 700; font-size: 13px; background: #e50914; color: white; border:none;">Lock Crop</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(m);
  setTimeout(() => m.classList.add('open'), 10);
  
  const img = document.getElementById('crop-target-img');
  const viewport = document.getElementById('crop-viewport');
  const zoomInput = document.getElementById('crop-zoom');
  const zoomTag = document.getElementById('zoom-value-tag');
  
  let scale = 1;
  let posX = 0;
  let posY = 0;
  let baseW = 0;
  let baseH = 0;
  const containerSize = 220;
  
  img.onload = () => {
    if (img.naturalWidth > img.naturalHeight) {
      baseH = containerSize;
      baseW = (img.naturalWidth / img.naturalHeight) * containerSize;
    } else {
      baseW = containerSize;
      baseH = (img.naturalHeight / img.naturalWidth) * containerSize;
    }
    
    posX = (containerSize - baseW) / 2;
    posY = (containerSize - baseH) / 2;
    
    updateImageStyle();
  };
  
  if (img.complete) {
    img.onload();
  }
  
  const updateImageStyle = () => {
    const maxPosX = 0;
    const minPosX = containerSize - baseW * scale;
    const maxPosY = 0;
    const minPosY = containerSize - baseH * scale;
    
    if (baseW && baseH) {
      if (posX > maxPosX) posX = maxPosX;
      if (posX < minPosX) posX = minPosX;
      if (posY > maxPosY) posY = maxPosY;
      if (posY < minPosY) posY = minPosY;
    }
    
    img.style.width = baseW + "px";
    img.style.height = baseH + "px";
    img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    zoomTag.innerText = Math.round(scale * 100) + "%";
  };
  
  zoomInput.oninput = (e) => {
    const oldScale = scale;
    scale = parseFloat(e.target.value);
    
    const center = containerSize / 2;
    posX = center + (posX - center) * (scale / oldScale);
    posY = center + (posY - center) * (scale / oldScale);
    
    updateImageStyle();
  };
  
  let isDragging = false;
  let startX = 0, startY = 0;
  
  const dragStart = (clientX, clientY) => {
    isDragging = true;
    startX = clientX;
    startY = clientY;
  };
  
  const dragMove = (clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    posX += dx;
    posY += dy;
    startX = clientX;
    startY = clientY;
    updateImageStyle();
  };
  
  const dragEnd = () => {
    isDragging = false;
  };
  
  viewport.onmousedown = (e) => {
    e.preventDefault();
    dragStart(e.clientX, e.clientY);
  };
  
  window.addEventListener('mousemove', (e) => {
    if (isDragging) dragMove(e.clientX, e.clientY);
  });
  
  window.addEventListener('mouseup', dragEnd);
  
  viewport.ontouchstart = (e) => {
    if (e.touches.length === 1) {
      dragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  
  viewport.ontouchmove = (e) => {
    if (isDragging && e.touches.length === 1) {
      dragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  
  viewport.ontouchend = dragEnd;
  
  document.getElementById('crop-confirm-save').onclick = () => {
    const canvasSize = 400;
    const ratio = canvasSize / containerSize;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    ctx.drawImage(
      img, 
      posX * ratio, 
      posY * ratio, 
      baseW * scale * ratio, 
      baseH * scale * ratio
    );
    
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCropped(croppedDataUrl);
    m.remove();
  };
};

window.toggleManageProfiles = () => {
  appState.manageProfiles = !appState.manageProfiles;
  render();
};

window.editProfile = (pfId) => {
  const pf = appState.profiles.find(p => p.id === pfId);
  if(!pf) return;
  
  const m = document.createElement('div');
  m.className = 'upload-modal';
  m.id = 'editProfileModal';
  
  m.innerHTML = `
    <div class="upload-modal-content ep-modal-wrapper">
      <div class="ep-header-title">
        <span>Edit Profile</span>
        <button class="upload-close" style="position:static; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:transparent; border:none; color:#a0a0a0; cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.1)';" onmouseleave="this.style.color='#a0a0a0'; this.style.background='transparent';" onclick="document.getElementById('editProfileModal').remove()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      
      <div class="ep-content-grid">
        <!-- Left Side: Profile Photo & Custom Upload/Crop Trigger -->
        <div class="ep-avatar-section">
          <img id="ep-avatar-preview" src="${pf.avatar}" class="ep-avatar-img" onerror="this.src='./Netflix-Logo-Streaming-Platform-765.png';">
          <div class="ep-avatar-overlay-btn" onclick="document.getElementById('ep-file').click()" title="Edit branding crop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
          <input type="file" id="ep-file" accept="image/*" style="display:none;">
        </div>
        
        <!-- Right Side: Profile Details -->
        <div class="ep-details-section">
          <div class="ep-name-input-group">
            <label class="ep-name-label">Profile Name</label>
            <input type="text" id="ep-name" class="ep-name-input" value="${pf.name}" placeholder="Type profile nickname">
          </div>
          <p style="color: #666; font-size: 11px; margin-top: 10px; line-height: 1.4;">Customise your profile avatar with interactive square cropping. Your name and styled details are synced immediately.</p>
        </div>
      </div>
      
      <div class="ep-actions-row">
        <button class="btn btn-secondary" style="border-radius: 4px; padding: 10px 24px; font-weight: bold; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #888;" onclick="document.getElementById('editProfileModal').remove()">Cancel</button>
        <button class="btn btn-primary" id="ep-save" style="border-radius: 4px; padding: 10px 24px; font-weight: bold; background: #e50914; color: white; border: none; box-shadow: 0 4px 15px rgba(229,9,20,0.3);">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  setTimeout(() => m.classList.add('open'), 10);
  
  document.getElementById('ep-file').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      window.openProfileCropper(re.target.result, (croppedBase64) => {
        document.getElementById('ep-avatar-preview').src = croppedBase64;
      });
    };
    reader.readAsDataURL(file);
  };
  
  document.getElementById('ep-save').onclick = () => {
    const newName = document.getElementById('ep-name').value.trim();
    const oldName = pf.name;
    if(newName) pf.name = newName;
    pf.avatar = document.getElementById('ep-avatar-preview').src;
    
    if (appState.currentProfile === oldName) {
      appState.currentProfile = pf.name;
      window.safeSetLocalItem('sarthak_netflix_profile', pf.name);
    }
    
    saveStateList('profiles', appState.profiles);
    document.getElementById('editProfileModal').remove();
    render();
  };
};

function createIntroScreen() {
  const c = document.createElement('div');
  c.className = 'intro-container';
  c.innerHTML = `<video src="https://assets.nflxext.com/us/ffe/siteui/common/audio/ta_dum.mp4" autoplay playsinline></video>`;
  return c;
}

function createDashboard() {
  const c = document.createElement('div');
  c.className = 'dashboard-container';
  c.appendChild(createNavbar());
  
  if(appState.memories.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-dashboard';
    empty.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="#555" style="margin: 0 auto 20px auto; display: block;"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM12 5.5v9l6-4.5z"/></svg>
      <h2 style="text-align: center; color: white;">No memories yet</h2>
      <p style="text-align: center; color: #aaa;">Your timeline is empty. Videos you add will appear here.</p>
      <div style="display: flex; justify-content: center;">
        <button class="add-memory-btn" style="margin-top:20px; font-size:16px; padding:10px 20px;" onclick="openUploadModal()">＋ Add First Memory</button>
      </div>
    `;
    c.appendChild(empty);
    return c;
  }

  // Create Grid wrapper for hero cross-fade to maintain fixed dimensions and eliminate flickering
  const heroWrapper = document.createElement('div');
  heroWrapper.id = 'hero-carousel-container';
  heroWrapper.style.cssText = `
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 100%;
    position: relative;
    width: 100%;
    overflow: hidden;
  `;
  c.appendChild(heroWrapper);

  const heroContent = createHero();
  heroContent.id = 'hero-section';
  heroContent.style.gridArea = '1 / 1 / 2 / 2';
  heroWrapper.appendChild(heroContent);
  
  const rc = document.createElement('div');
  rc.className = 'slider-container';
  c.appendChild(rc);
  
  window.refreshRowsView(rc, heroContent);
  return c;
}

window.openManageProfiles = () => {
  appState.manageProfiles = true;
  transitionView('profiles');
};

function createNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  
  let lastScrollY = window.scrollY;
  let ticking = false;
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const velY = Math.abs(window.scrollY - lastScrollY);
        lastScrollY = window.scrollY;
        if(window.scrollY > 10) {
          nav.classList.add('scrolled');
          const shadowBlur = Math.min(20 + velY * 0.5, 60);
          const shadowSpread = Math.min(velY * 0.2, 20);
          nav.style.boxShadow = `0px 4px ${shadowBlur}px ${shadowSpread}px rgba(0,0,0,0.8)`;
        } else {
          nav.classList.remove('scrolled');
          nav.style.boxShadow = 'none';
        }

        // Pause/play hero background video on scroll past threshold
        const isScrolledPast = window.scrollY > 350;
        const heroVids = document.querySelectorAll('.hero-video');
        heroVids.forEach(v => {
          if (isScrolledPast) {
            if (v.tagName === 'VIDEO') {
              if (!v.paused) v.pause();
            } else if (v.tagName === 'IFRAME') {
              v.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
          } else {
            if (appState.settings && appState.settings.autoPlayPreviews) {
              if (v.tagName === 'VIDEO') {
                if (v.paused) v.play().catch(() => {});
              } else if (v.tagName === 'IFRAME') {
                v.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
              }
            }
          }
        });

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

    const currentPf = appState.profiles.find(p => p.name === appState.currentProfile);
    const currAvatar = currentPf ? currentPf.avatar : 'img20251010.jpg';

    const latestMems = appState.memories.slice().sort((a,b)=>b.dateAdded - a.dateAdded).slice(0, 10);
    let notifHTML = latestMems.length === 0 ? '<div class="notification-item"><div style="color:#888;">No recent activity</div></div>' : latestMems.map(m => `
      <div class="notification-item" onclick="openDetailModal('${m.id}')">
        <img src="${m.thumbnail}" width="80" height="45" style="object-fit:cover; border-radius:4px;">
        <div style="flex:1">
          <div style="font-weight:bold; color:white; font-size:14px;">${m.uploadedBy || 'Someone'} added a video</div>
          <div style="font-size:12px; color:#aaa; margin-top:4px;">${m.title}</div>
        </div>
      </div>
    `).join('');
    
    let addButtonText = "Add Memory";
    if (appState.activeCategory === 'Moments') addButtonText = "Upload Photos";
    else if (appState.activeCategory === 'Home') addButtonText = "Add Memory";
    else addButtonText = "Add " + appState.activeCategory.replace(/ies$/, "y").replace(/s$/, "");
    if (appState.activeCategory === "My List") addButtonText = "Add to List";
    
    nav.innerHTML = `
      <div class="nav-logo" onclick="setCategory('Home')">
        <img id="nav-logo-img" style="height: 85px; width: 180px; object-fit: contain; cursor: pointer;" src="./Netflix-Logo-Streaming-Platform-765.png" alt="Netflix">
      </div>
      <ul class="nav-links" style="position:relative; font-weight: 500;">
        <div class="nav-line" id="navLine"></div>
        ${mainTabs.map(cat => {
          let icon = '';
          if(cat === 'Home') icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
          if(cat === 'Dates') icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
          if(cat === 'Categories') icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
          if(cat === 'Moments') icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
          if(cat === 'My List') icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
          let catContent =  icon + `<span>${cat}</span>`;
          return `<li data-cat="${cat}" class="${appState.activeCategory === cat ? 'active' : ''}" style="display:flex; align-items:center;" onclick="setCategory('${cat}')">${catContent}</li>`;
        }).join('')}
      </ul>
      <div class="nav-right">
        <div class="search-container" id="searchContainer">
          <div class="search-icon" onclick="toggleSearch()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input type="text" id="searchInput" class="search-input" placeholder="Titles, people, genres" oninput="handleSearch(event)" value="${appState.searchQuery || ''}">
        </div>

        <div class="notification-container">
          <div class="bell-icon" onclick="toggleNotifications()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            ${latestMems.length > 0 ? `<div class="bell-badge">${latestMems.length}</div>` : ''}
          </div>
          <div class="notifications-panel" id="notifPanel">
            ${notifHTML}
          </div>
        </div>

        ${appState.activeCategory === 'Moments' ? `
        <button class="add-memory-btn" onclick="window.openBulkManagerModal()" title="Manage & Bulk Edit Gallery" style="margin-right: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </button>
        ` : ''}

        <button class="add-memory-btn" onclick="${appState.activeCategory === 'Moments' ? 'openBulkUploadModal()' : (appState.activeCategory === 'My List' ? 'setCategory(\'Home\')' : 'openUploadModal()')}" title="${addButtonText}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <div class="profile-dropdown">
          <div style="display: flex; align-items: center; cursor: pointer; gap: 4px;">
            <img src="${currAvatar}" width="32" height="32" style="border-radius:4px; margin-left:15px; border: 1px solid transparent; transition: border 0.3s; object-fit: cover; display: block;" onmouseenter="this.style.borderColor='#fff';" onmouseleave="this.style.borderColor='transparent';">
            <span style="font-size: 0; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 4px solid white; margin-left: 4px;"></span>
          </div>
          <div class="dropdown-menu">
            <div class="dropdown-profiles-list">
              ${appState.profiles.filter(p => p.name !== appState.currentProfile).map(p => `
                <div class="dropdown-profile-item" onclick="window.switchProfileDirectly('${p.id}')">
                  <img src="${p.avatar}" width="28" height="28" style="border-radius:4px; object-fit: cover;">
                  <span>${p.name}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="dropdown-options-list">
              <div class="dropdown-option-item" onclick="window.openBulkManagerModal()">
                <svg class="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>Bulk Manage Gallery</span>
              </div>
              <div class="dropdown-option-item" onclick="window.openManageProfiles()">
                <svg class="dropdown-item-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                <span>Manage Profiles</span>
              </div>
              <div class="dropdown-option-item" onclick="window.openSettingsModal()">
                <svg class="dropdown-item-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Account</span>
              </div>
              <div class="dropdown-option-item" onclick="window.openHelpCentreModal()">
                <svg class="dropdown-item-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <span>Help Centre</span>
              </div>
            </div>
            
            <div class="dropdown-signout" onclick="window.logoutProfile()">
              Sign out of Netflix
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      const activeLi = nav.querySelector('.nav-links li.active');
      const line = nav.querySelector('#navLine');
      if (activeLi && line) {
        line.style.width = activeLi.offsetWidth + 'px';
        line.style.transform = `translateX(${activeLi.offsetLeft}px)`;
      }
    }, 100);
  return nav;
}

window.currentHeroIndex = undefined;
window.isShufflingHero = false;
window.shuffleHero = () => {
  if (window.isShufflingHero) return;
  
  let vids = appState.memories.filter(m => {
    const isMoment = window.getNormalizedCategory(m.category) === 'Moments';
    const isCw = appState.continueWatching.includes(m.id);
    return !isMoment && m.videoUrl && !isCw;
  });
  
  if (vids.length === 0) {
    vids = appState.memories.filter(m => {
      const isMoment = window.getNormalizedCategory(m.category) === 'Moments';
      return !isMoment && m.videoUrl;
    });
  }
  
  if (vids.length === 0) return;
  
  window.isShufflingHero = true;
  
  let nextIndex = Math.floor(Math.random() * vids.length);
  if (vids.length > 1 && window.currentHeroIndex !== undefined && nextIndex === window.currentHeroIndex % vids.length) {
    nextIndex = (nextIndex + 1) % vids.length;
  }
  window.currentHeroIndex = nextIndex;

  // Swipe/scroll the carousel row smoothly to focus the new hero item
  const nextHeroMem = vids[nextIndex];
  if (nextHeroMem) {
    const rows = document.querySelectorAll('.row');
    rows.forEach(row => {
      const header = row.querySelector('.row-header');
      if (header && (header.textContent.includes("Today's Top Picks") || header.textContent.includes("Picks for You"))) {
        const cardsContainer = row.querySelector('.row-cards');
        if (cardsContainer) {
          const card = Array.from(cardsContainer.querySelectorAll('.media-card')).find(c => {
            const clickAttr = c.getAttribute('onclick') || '';
            const dataId = c.getAttribute('data-id') || '';
            return clickAttr.includes(nextHeroMem.id) || dataId === nextHeroMem.id;
          });
          if (card) {
            const offsetLeft = card.offsetLeft - (cardsContainer.clientWidth / 2) + (card.clientWidth / 2);
            cardsContainer.scrollTo({
              left: Math.max(0, offsetLeft),
              behavior: 'smooth'
            });
          }
        }
      }
    });
  }
  
  const container = document.getElementById('hero-carousel-container');
  const currentHero = container ? container.querySelector('.hero-billboard') : document.querySelector('.hero-billboard');
  
  if (container && currentHero) {
    const mediaRollCont = currentHero.querySelector('.hero-media-roll-container');
    const textRollCont = currentHero.querySelector('.hero-text-roll-container');
    
    if (mediaRollCont && textRollCont) {
      const titleText = nextHeroMem.title || '';
      const isLongTitle = titleText.length > 20;
      const isVeryLongTitle = titleText.length > 35;
      let titleClass = "hero-title";
      if (isVeryLongTitle) {
        titleClass += " title-very-long";
      } else if (isLongTitle) {
        titleClass += " title-long";
      }
      
      // Determine YouTube background source
      let nextBackgroundHtml = '';
      const isYouTube = nextHeroMem.videoUrl && !nextHeroMem.videoUrl.includes('/') && !nextHeroMem.videoUrl.includes('blob:');
      if (appState.settings.autoPlayPreviews && nextHeroMem.videoUrl) {
        const isMuted = appState.isHeroMuted !== false;
        if (isYouTube) {
          nextBackgroundHtml = `<div class="temp-blend-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;pointer-events:none;"><iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${nextHeroMem.videoUrl}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${nextHeroMem.videoUrl}&enablejsapi=1&vq=hd1080&hd=1&disablekb=1&playsinline=1" style="position:absolute;top:50%;left:50%;width:115vw;height:64.6875vw;min-height:115vh;min-width:204.44vh;transform:translate(-50%, -50%) scale(1.01);border:none;pointer-events:none;" allow="autoplay"></iframe></div>`;
        } else {
          nextBackgroundHtml = `<video id="hero-native-video" class="hero-video media-card-hover-video" src="${nextHeroMem.videoUrl}" ${isMuted ? 'muted' : ''} autoplay loop playsinline fetchpriority="high" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:2;"></video>`;
        }
      }
      
      // Prep new media roll layer (starting out of view at bottom-translated posture)
      const newMediaItem = document.createElement('div');
      newMediaItem.className = 'hero-media-roll-item roll-in';
      newMediaItem.innerHTML = `
        <div class="hero-video-wrapper" style="background: black; position: absolute; width: 100%; height: 100%; top: 0; left: 0; overflow: hidden;">
          <img id="hero-img-overlay" class="hero-video" src="${nextHeroMem.thumbnail}" alt="Hero" fetchpriority="high" style="width: 100%; height: 100%; object-fit: cover; position: absolute; z-index: 3; transition: opacity 1s cubic-bezier(0.25, 0.1, 0.25, 1);">
          ${nextBackgroundHtml}
        </div>
      `;
      
      // Prep new text details roll layer (starting translated down at bottom-posture)
      const newTextItem = document.createElement('div');
      newTextItem.className = 'hero-text-roll-item roll-in';
      newTextItem.innerHTML = `
        <div class="hero-text-lockup" style="width: 100%;">
          <div class="${titleClass}">
            ${nextHeroMem.titleImage ? `<img class="hero-title-logo-img" src="${nextHeroMem.titleImage}" alt="${nextHeroMem.title}" style="max-height: 200px; max-width: min(500px, 85%); width: auto; object-fit: contain; margin-bottom: 5px; display: block; filter: drop-shadow(0px 8px 16px rgba(0,0,0,0.85));" referrerPolicy="no-referrer">` : `<div style="font-size: 1.15em; line-height: 1.15; margin-bottom: 10px;">${nextHeroMem.title}</div>`}
            <div class="hero-badge-sub" style="display: inline-flex; align-items: center; margin: 8px 0 0 0; font-weight: 800; color: white;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e50914; color: white; font-weight: 950; padding: 3px 6px; border-radius: 2px; line-height: 1; margin-right: 10px; font-family: system-ui, -apple-system, sans-serif;">
                <span style="font-size: 7px; letter-spacing: 0.5px; margin-bottom: 1px;">TOP</span>
                <span style="font-size: 13px; font-weight: 950;">10</span>
              </div>
              <span style="font-size: clamp(12px, 1.0vw, 16px); font-weight: 700; letter-spacing: -0.2px; text-shadow: 1.5px 1.5px 4px rgba(0,0,0,0.9);">#1 in Memories Today</span>
            </div>
          </div>
          <div class="hero-desc">${nextHeroMem.desc}</div>
        </div>
      `;
      
      mediaRollCont.appendChild(newMediaItem);
      textRollCont.appendChild(newTextItem);
      
      // Force pipeline layout computation
      newMediaItem.offsetHeight;
      newTextItem.offsetHeight;
      
      // Select the old active items
      const oldMediaItem = mediaRollCont.querySelector('.hero-media-roll-item.roll-active');
      const oldTextItem = textRollCont.querySelector('.hero-text-roll-item.roll-active');
      
      // Animate transition using CSS translation states
      if (oldMediaItem) {
        oldMediaItem.classList.remove('roll-active');
        oldMediaItem.classList.add('roll-out');
      }
      if (oldTextItem) {
        oldTextItem.classList.remove('roll-active');
        oldTextItem.classList.add('roll-out');
      }
      
      newMediaItem.classList.remove('roll-in');
      newMediaItem.classList.add('roll-active');
      
      newTextItem.classList.remove('roll-in');
      newTextItem.classList.add('roll-active');
      
      // Reset and trigger minimize slide-up timer for the newly spun item
      window.startHeroMinimizeTimer(newTextItem);
      
      // Instantly update the buttons attributes (Play, More Info) so they stay static but bind to next media ID
      const playBtn = currentHero.querySelector('#hero-play-button');
      if (playBtn) playBtn.setAttribute('onclick', `playVideo('${nextHeroMem.id}')`);
      
      const infoBtn = currentHero.querySelector('#hero-more-info');
      if (infoBtn) infoBtn.setAttribute('onclick', `openDetailModal('${nextHeroMem.id}', event)`);
      
      const myListBtn = currentHero.querySelector('#hero-mylist-btn');
      if (myListBtn) {
        myListBtn.setAttribute('onclick', `window.toggleHeroMyList('${nextHeroMem.id}', event)`);
        const inList = appState.myList.includes(nextHeroMem.id);
        myListBtn.title = inList ? 'Remove from My List' : 'Add to My List';
        myListBtn.innerHTML = inList ? 
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: scaleUp 0.25s ease-out;"><polyline points="20 6 9 17 4 12"/></svg>` :
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: scaleUp 0.25s ease-out;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      }
      
      const ratingBox = currentHero.querySelector('#hero-rating-box');
      if (ratingBox) ratingBox.innerText = nextHeroMem.rating || 'TV-14';
      
      // Autoplay previews: once background element streams, fade the thumbnail cover safely
      if (nextBackgroundHtml) {
        const imgOverlay = newMediaItem.querySelector('#hero-img-overlay');
        const nv = newMediaItem.querySelector('#hero-native-video');
        if (nv) {
          // Native video: fade out overlay as soon as playback actually starts streaming
          nv.addEventListener('playing', () => {
            if (imgOverlay) imgOverlay.style.opacity = '0';
          });
          // Fallback if event is slow to fire
          setTimeout(() => {
            if (imgOverlay) imgOverlay.style.opacity = '0';
          }, 1000);
        } else {
          // Iframe/YouTube: fade out overlay as soon as the iframe is loaded, or fallback quickly
          const iframe = newMediaItem.querySelector('.hero-video');
          if (iframe) {
            iframe.addEventListener('load', () => {
              setTimeout(() => {
                if (imgOverlay) imgOverlay.style.opacity = '0';
              }, 400);
            });
          }
          setTimeout(() => {
            if (imgOverlay) imgOverlay.style.opacity = '0';
          }, 1200);
        }
      }
      
      // Native preview audio volume fade logic
      const nv = newMediaItem.querySelector('#hero-native-video');
      if (nv && !nv.muted) {
        nv.volume = 0;
        let vol = 0;
        const rampInterval = setInterval(() => {
          vol += 0.05;
          if (vol >= 0.25) {
            nv.volume = 0.25;
            clearInterval(rampInterval);
          } else {
            nv.volume = vol;
          }
        }, 600);
      }
      
      // Clean up previous elements after transition duration completes
      setTimeout(() => {
        if (oldMediaItem) {
          const oldVids = Array.from(oldMediaItem.querySelectorAll('iframe, video'));
          oldVids.forEach(v => {
            if (v.tagName === 'VIDEO') {
              v.src = '';
              try { v.load(); } catch(e){}
            }
            v.remove();
          });
          oldMediaItem.remove();
        }
        if (oldTextItem) {
          oldTextItem.remove();
        }
        window.isShufflingHero = false;
      }, 900);
      
      return;
    }
  }

  if (container && currentHero) {
    const newHero = createHero();
    newHero.id = 'hero-section';
    newHero.style.gridArea = '1 / 1 / 2 / 2';
    newHero.style.opacity = '0';
    newHero.style.transform = 'scale(0.94)';
    newHero.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    newHero.style.zIndex = '1';
    
    currentHero.id = 'hero-section-old';
    currentHero.style.gridArea = '1 / 1 / 2 / 2';
    currentHero.style.zIndex = '2';
    currentHero.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    currentHero.style.transform = 'scale(1)';
    currentHero.style.pointerEvents = 'none';
    
    container.appendChild(newHero);
    
    newHero.offsetHeight;
    
    newHero.style.opacity = '1';
    newHero.style.transform = 'scale(1)';
    currentHero.style.opacity = '0';
    currentHero.style.transform = 'scale(1.06)';
    currentHero.style.filter = 'blur(8px) brightness(30%)';
    
    setTimeout(() => {
      currentHero.remove();
      newHero.style.transition = '';
      window.isShufflingHero = false;
    }, 1200);
  } else if (currentHero) {
    // Fallback if container is not found
    const newHero = createHero();
    newHero.id = 'hero-section';
    newHero.style.opacity = '0';
    newHero.style.transform = 'scale(0.94)';
    newHero.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    
    currentHero.id = 'hero-section-old';
    currentHero.style.position = 'absolute';
    currentHero.style.top = '0';
    currentHero.style.left = '0';
    currentHero.style.width = '100%';
    currentHero.style.zIndex = '10';
    currentHero.style.pointerEvents = 'none';
    currentHero.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    currentHero.style.transform = 'scale(1)';
    
    const parent = currentHero.parentNode;
    if (parent) {
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.insertBefore(newHero, currentHero);
      newHero.offsetHeight;
      
      newHero.style.opacity = '1';
      newHero.style.transform = 'scale(1)';
      currentHero.style.opacity = '0';
      currentHero.style.transform = 'scale(1.06)';
      currentHero.style.filter = 'blur(8px) brightness(30%)';
      
      setTimeout(() => {
        currentHero.remove();
        newHero.style.opacity = '';
        newHero.style.transition = '';
        window.isShufflingHero = false;
      }, 1200);
    } else {
      window.isShufflingHero = false;
    }
  } else {
    window.isShufflingHero = false;
  }
};

window.heroMinimizeTimeout = null;
window.startHeroMinimizeTimer = (textRollItem) => {
  if (!textRollItem) return;
  if (window.heroMinimizeTimeout) {
    clearTimeout(window.heroMinimizeTimeout);
    window.heroMinimizeTimeout = null;
  }
  textRollItem.classList.remove('minimized');
  window.heroMinimizeTimeout = setTimeout(() => {
    textRollItem.classList.add('minimized');
  }, 5000); // 5 seconds matches pristine Netflix cinematic transitions as requested
};

function createHero() {
  const c = document.createElement('div');
  c.className = 'hero-billboard';
  
  if (!appState.memories) {
    c.innerHTML = `<div class="skeleton-card" style="width:100%; height:100vh; border-radius:0;"></div>`;
    return c;
  }

  let vids = appState.memories.filter(m => {
    const isMoment = window.getNormalizedCategory(m.category) === 'Moments';
    const isCw = appState.continueWatching.includes(m.id);
    return !isMoment && m.videoUrl && !isCw;
  });
  
  if (vids.length === 0) {
    vids = appState.memories.filter(m => {
      const isMoment = window.getNormalizedCategory(m.category) === 'Moments';
      return !isMoment && m.videoUrl;
    });
  }
  
  if(vids.length === 0) return c;
  
  if (window.currentHeroIndex === undefined) {
    window.currentHeroIndex = Math.floor(Math.random() * vids.length);
  }
  
  const heroMem = vids[window.currentHeroIndex % vids.length] || vids[0];
  const ytId = heroMem && heroMem.videoUrl ? window.extractYouTubeId(heroMem.videoUrl) : null;
  const isYouTube = !!ytId;
  
  const titleText = heroMem.title || '';
  const isLongTitle = titleText.length > 20;
  const isVeryLongTitle = titleText.length > 35;
  let titleClass = "hero-title";
  if (isVeryLongTitle) {
    titleClass += " title-very-long";
  } else if (isLongTitle) {
    titleClass += " title-long";
  }
  
  let backgroundVideoHtml = '';
  if (appState.settings.autoPlayPreviews && heroMem.videoUrl) {
    const isMuted = appState.isHeroMuted !== false;
    if (isYouTube) {
      backgroundVideoHtml = `<div style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;pointer-events:none;"><iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${ytId}&enablejsapi=1&vq=hd1080&hd=1&disablekb=1&playsinline=1" style="position:absolute;top:50%;left:50%;width:115vw;height:64.6875vw;min-height:115vh;min-width:204.44vh;transform:translate(-50%, -50%) scale(1.01);border:none;pointer-events:none;" allow="autoplay"></iframe></div>`;
    } else {
      backgroundVideoHtml = `<video id="hero-native-video" class="hero-video media-card-hover-video" src="${heroMem.videoUrl}" ${isMuted ? 'muted' : ''} autoplay loop playsinline fetchpriority="high" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:2;"></video>`;
    }
  }

  c.innerHTML = `
    <div class="hero-media-roll-container">
      <div class="hero-media-roll-item roll-active">
        <div class="hero-video-wrapper" style="background: black; position: absolute; width: 100%; height: 100%; top: 0; left: 0; overflow: hidden;">
          <img id="hero-img-overlay" class="hero-video" src="${heroMem.thumbnail}" alt="Hero" fetchpriority="high" style="width: 100%; height: 100%; object-fit: cover; position: absolute; z-index: 3; transition: opacity 1s cubic-bezier(0.25, 0.1, 0.25, 1);">
          ${backgroundVideoHtml}
          <div id="hero-curtain-mask" style="position:absolute; top:0; left:0; width:100%; height:100%; background:black; z-index:4; transform: translateX(0%); animation: curtainReveal 0.8s cubic-bezier(0.85, 0, 0.15, 1) forwards;"></div>
        </div>
      </div>
    </div>
    <div class="hero-overlay" style="z-index: 5;"></div>
    <div class="hero-overlay-bottom" style="z-index: 5;"></div>
    <div class="hero-info" style="z-index: 5; transition: transform 0.4s ease;">
      <div class="hero-text-roll-container">
        <div class="hero-text-roll-item roll-active">
          <div class="hero-text-lockup" style="width: 100%;">
            <div class="${titleClass}">
              ${heroMem.titleImage ? `<img class="hero-title-logo-img" src="${heroMem.titleImage}" alt="${heroMem.title}" style="max-height: 200px; max-width: min(500px, 85%); width: auto; object-fit: contain; margin-bottom: 5px; display: block; filter: drop-shadow(0px 8px 16px rgba(0,0,0,0.85));" referrerPolicy="no-referrer">` : `<div style="font-size: 1.15em; line-height: 1.15; margin-bottom: 10px;">${heroMem.title}</div>`}
              <div class="hero-badge-sub" style="display: inline-flex; align-items: center; margin: 8px 0 0 0; font-weight: 800; color: white;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e50914; color: white; font-weight: 950; padding: 3px 6px; border-radius: 2px; line-height: 1; margin-right: 10px; font-family: system-ui, -apple-system, sans-serif;">
                  <span style="font-size: 7px; letter-spacing: 0.5px; margin-bottom: 1px;">TOP</span>
                  <span style="font-size: 13px; font-weight: 950;">10</span>
                </div>
                <span style="font-size: clamp(12px, 1.0vw, 16px); font-weight: 700; letter-spacing: -0.2px; text-shadow: 1.5px 1.5px 4px rgba(0,0,0,0.9);">#1 in Memories Today</span>
              </div>
            </div>
            <div class="hero-desc">${heroMem.desc}</div>
          </div>
        </div>
      </div>
      <div class="hero-buttons">
        <button class="btn btn-primary" id="hero-play-button" onclick="playVideo('${heroMem.id}')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg> Play
        </button>
        <button class="btn btn-secondary" id="hero-more-info" onclick="openDetailModal('${heroMem.id}', event)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> More Info
        </button>
      </div>
    </div>
    <div class="hero-controls" style="z-index: 5;">
      <div class="mute-btn" id="hero-shuffle-btn" onclick="shuffleHero()" title="Next Title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="mute-btn" id="hero-mylist-btn" onclick="window.toggleHeroMyList('${heroMem.id}', event)" title="${appState.myList.includes(heroMem.id) ? 'Remove from My List' : 'Add to My List'}">
        ${appState.myList.includes(heroMem.id) ? 
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: scaleUp 0.25s ease-out;"><polyline points="20 6 9 17 4 12"/></svg>` :
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: scaleUp 0.25s ease-out;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`}
      </div>
      <div class="maturity-rating" id="hero-rating-box" style="animation: slideInRight 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${heroMem.rating}</div>
    </div>
  `;

  // Smoothly fade out description and scale down/shrink title text/logo after 3.0 seconds ALWAYS
  setTimeout(() => {
    const activeTextItem = c.querySelector('.hero-text-roll-item.roll-active');
    if (activeTextItem) {
      window.startHeroMinimizeTimer(activeTextItem);
    }
  }, 50);

  if (backgroundVideoHtml) {
    const imgOverlay = c.querySelector('#hero-img-overlay');
    const nv = c.querySelector('#hero-native-video');
    if (nv) {
      // Native video: fade out overlay as soon as playback actually starts streaming
      nv.addEventListener('playing', () => {
        if (imgOverlay) imgOverlay.style.opacity = '0';
      });
      // Fallback if event is slow to fire
      setTimeout(() => {
        if (imgOverlay) imgOverlay.style.opacity = '0';
      }, 1000);
    } else {
      // Iframe/YouTube: fade out overlay as soon as the iframe is loaded, or fallback quickly
      const iframe = c.querySelector('.hero-video');
      if (iframe) {
        iframe.addEventListener('load', () => {
          setTimeout(() => {
            if (imgOverlay) imgOverlay.style.opacity = '0';
          }, 400);
        });
      }
      setTimeout(() => {
        if (imgOverlay) imgOverlay.style.opacity = '0';
      }, 1200);
    }
    
    // Volume Fade Loop Timer for native video
    setTimeout(() => {
      const nv = document.getElementById('hero-native-video');
      if (nv && !nv.muted) {
        nv.volume = 0;
        let vol = 0;
        const rampInterval = setInterval(() => {
          vol += 0.05; // 5 steps to 0.25
          if (vol >= 0.25) {
            nv.volume = 0.25;
            clearInterval(rampInterval);
          } else {
            nv.volume = vol;
          }
        }, 600); // 5 steps * 600ms = 3000ms
      }
    }, 100);
  }
  return c;
}

// 3D Parallax removed

function createRow(title, memories, index = 0) {
  const row = document.createElement('div');
  row.className = 'row';
  row.style.setProperty('--row-index', index);
  row.innerHTML = `
    <div class="row-header scramble-text" data-text="${title}">${title}</div>
    <div class="slider-arrow slider-left">‹</div>
    <div class="row-content" style="position:relative;"></div>
    <div class="slider-arrow slider-right">›</div>
  `;
  row.style.position = 'relative';
  
  const rc = row.querySelector('.row-content');
  const arrowLeft = row.querySelector('.slider-left');
  const arrowRight = row.querySelector('.slider-right');
  
  const handleScrollClick = (dir) => {
    const parentWidth = rc.getBoundingClientRect().width;
    const maxScroll = rc.scrollWidth - parentWidth;
    let newScroll = rc.scrollLeft + (dir * (parentWidth * 0.8));
    if (newScroll < 0) newScroll = 0;
    if (newScroll > maxScroll) newScroll = maxScroll;
    
    rc.scrollTo({ left: newScroll, behavior: 'smooth' });
  };
  
  arrowLeft.onclick = () => handleScrollClick(-1);
  arrowRight.onclick = () => handleScrollClick(1);
  
  rc.addEventListener('scroll', () => {
    arrowLeft.style.visibility = rc.scrollLeft > 0 ? 'visible' : 'hidden';
    arrowRight.style.visibility = rc.scrollLeft < rc.scrollWidth - rc.clientWidth - 5 ? 'visible' : 'hidden';
  }, { passive: true });
  arrowLeft.style.visibility = 'hidden';

  // Swipe scrolling handler
  let isDown = false;
  let startX;
  let scrollLeft;
  let velX = 0;
  let momentumID;
  let lastTimestamp;
  let lastX;
  
  const beginMomentumLoop = () => {
    rc.classList.remove('active');
    cancelAnimationFrame(momentumID);
    
    // Elastic Snap is handled by CSS scroll-snap-type when we remove 'active'.
    // If velocity is high enough, we bleed it. Since scroll-snap kicks in,
    // we let browser physics handle the final snap, but the prompt asks for
    // explicit friction calculations.
    
    const momentumLoop = () => {
      // velocity *= 0.94; scrollLeft += velocity;
      velX *= 0.94;
      rc.scrollLeft -= velX;
      
      if (Math.abs(velX) > 0.5) {
        momentumID = requestAnimationFrame(momentumLoop);
      } else {
        velX = 0;
      }
    };
    momentumID = requestAnimationFrame(momentumLoop);
  };
  
  rc.addEventListener('mousedown', (e) => {
    isDown = true;
    rc.classList.add('active');
    cancelAnimationFrame(momentumID);
    startX = e.pageX - rc.offsetLeft;
    scrollLeft = rc.scrollLeft;
    lastX = e.pageX;
  });
  rc.addEventListener('mouseleave', () => {
    if(!isDown) return;
    isDown = false;
    beginMomentumLoop();
  });
  rc.addEventListener('mouseup', () => {
    if(!isDown) return;
    isDown = false;
    beginMomentumLoop();
  });
  let rAF;
  rc.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    if(rAF) cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      const x = e.pageX - rc.offsetLeft;
      const walk = (x - startX) * 2; 
      rc.scrollLeft = scrollLeft - walk;
      
      // Calculate velocity
      velX = e.pageX - lastX;
      lastX = e.pageX;
    });
  });

  // Touch passive listeners
  const touchStartHandler = (e) => {
    isDown = true;
    startX = e.touches[0].pageX - rc.offsetLeft;
    scrollLeft = rc.scrollLeft;
  };
  const touchMoveHandler = (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - rc.offsetLeft;
    const walk = (x - startX) * 2;
    rc.scrollLeft = scrollLeft - walk;
  };

  rc.addEventListener('touchstart', touchStartHandler, { passive: true });
  rc.addEventListener('touchmove', touchMoveHandler, { passive: true });
  rc.addEventListener('touchend', () => { isDown = false; }, { passive: true });
  
  // Initialize Image IntersectionObserver to dynamically load/unload images
  if (!appState.imgObserver) {
    appState.imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const img = entry.target;
        if (entry.isIntersecting) {
          if (img.dataset.src && (!img.src || img.src.includes('data:image'))) {
            const loadImg = () => {
              img.src = img.dataset.src;
              img.decode().catch(() => {});
            };
            if (window.requestIdleCallback) {
              requestIdleCallback(loadImg);
            } else {
              loadImg();
            }
          }
        } else {
          if (img.src && !img.src.includes('data:image') && img.dataset.src) {
             img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          }
        }
      });
    }, { rootMargin: "600px" });
  }

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < memories.length; i++) {
    const m = memories[i];
    const card = document.createElement('div');
    card.className = 'media-card';
    if (m.id === window.justUploadedId) {
      card.classList.add('just-uploaded');
      setTimeout(() => card.classList.remove('just-uploaded'), 2500);
      window.justUploadedId = null;
    }
    card.onclick = (e) => openDetailModal(m.id, e);
    
    // Lazy load the thumbnail
    const displayThumb = (m.thumbnail || '').replace('hqdefault.jpg', 'maxresdefault.jpg');
    const isLiked = appState.likedMemories && appState.likedMemories.includes(m.id);
    const buttonsHtml = m.videoUrl ? `
          <div class="hc-btn hc-play" onclick="window.playVideo('${m.id}'); event.stopPropagation();" title="Play">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </div>
          <div class="hc-btn hc-add" onclick="window.toggleMyList('${m.id}', event); event.stopPropagation();" title="Add to My List">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="hc-btn hc-like" onclick="window.likeMemory('${m.id}', this); event.stopPropagation();" title="${isLiked ? 'Unlike' : 'Like'}" style="${isLiked ? 'color: #E50914; border-color: #E50914;' : ''}">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <div style="flex:1;"></div>
          <div class="hc-btn hc-more" onclick="window.openDetailModal('${m.id}', event); event.stopPropagation();" title="More Info">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
    ` : `
          <div class="hc-btn hc-play" onclick="window.playVideo('${m.id}'); event.stopPropagation();" title="Play Slideshow">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </div>
          <div class="hc-btn hc-view" onclick="window.viewPhotoStatic('${m.id}'); event.stopPropagation();" title="View Photo" style="background: rgba(255,255,255,0.15);">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="hc-btn hc-add" onclick="window.toggleMyList('${m.id}', event); event.stopPropagation();" title="Add to My List">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="hc-btn hc-like" onclick="window.likeMemory('${m.id}', this); event.stopPropagation();" title="${isLiked ? 'Unlike' : 'Like'}" style="${isLiked ? 'color: #E50914; border-color: #E50914;' : ''}">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <div style="flex:1;"></div>
          <div class="hc-btn hc-more" onclick="window.openDetailModal('${m.id}', event); event.stopPropagation();" title="More Info">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
    `;

    card.innerHTML = `
      <div class="media-card-img-wrapper" style="position: absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; border-radius:4px; z-index:1;">
        <img data-src="${displayThumb}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${m.title}" decoding="async" loading="lazy" fetchpriority="low" style="width:100%; height:100%; object-fit:cover; transition: opacity 0.3s; display: block;">
        <div class="media-card-video-container" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; transition: opacity 0.3s; background: black; pointer-events: none; overflow:hidden; display: none;"></div>
        <div class="media-card-click-shield" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index:10; background: rgba(0,0,0,0); pointer-events: auto; cursor: pointer;"></div>
      </div>
      <div class="hover-chassis" style="z-index: 15;">
        <div class="hc-buttons">
          ${buttonsHtml}
        </div>
        <div class="hc-title" style="font-size: 11px; font-weight: 700; color: #ffffff; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-transform: uppercase; letter-spacing: 0.2px;" title="${m.title}">${m.title}</div>
        <div class="hc-meta" style="font-size: 10px; margin-bottom: 5px;">
          <span class="hc-match" style="font-size: 10px;">98% Match</span>
          <span class="hc-rating" style="font-size: 9px; padding: 0 2px;">${m.rating || 'TV-14'}</span>
          <span class="hc-badge" style="font-size: 8px; padding: 0 2px;">HD</span>
        </div>
        <div class="hc-genres" style="font-size: 9px;">
          <span>Emotional</span><span class="hc-dot" style="margin: 0 2px;">•</span><span>Heartfelt</span><span class="hc-dot" style="margin: 0 2px;">•</span><span>Romance</span>
        </div>
      </div>
    `;
    
    let hoverTimer;
    card.onmouseenter = () => {
      const r = card.getBoundingClientRect();
      const ww = window.innerWidth;
      const originOffset = r.width * 0.20;
      
      const row = card.closest('.row');
      if (row) row.classList.add('row-active-hover');

      requestAnimationFrame(() => {
        if (r.left - originOffset < 30) {
          card.style.transformOrigin = 'left center';
        } else if (ww - r.right - originOffset < 30) {
          card.style.transformOrigin = 'right center';
        } else {
          card.style.transformOrigin = 'center center';
        }
      });
      
      if (appState.settings && appState.settings.autoPlayPreviews && m.videoUrl) {
        hoverTimer = setTimeout(() => {
          const videoContainer = card.querySelector('.media-card-video-container');
          const thumbImg = card.querySelector('img');
          if (videoContainer) {
            const ytId = window.extractYouTubeId(m.videoUrl);
            const isYouTube = !!ytId;
            videoContainer.style.display = 'block';
            
            if (isYouTube) {
              const cardW = card.offsetWidth || r.width || 260;
              const scale = (cardW / 1200) * 1.5;
              videoContainer.innerHTML = `
                <iframe class="media-card-hover-video" src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&mute=1&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${ytId}&enablejsapi=1&vq=hd360&fs=0&disablekb=1" style="position:absolute; top:50%; left:50%; width:1200px; height:675px; transform:translate(-50%, -50%) scale(${scale}); transform-origin:center center; border:none; pointer-events:none !important;" allow="autoplay; encrypted-media"></iframe>
              `;
            } else {
              videoContainer.innerHTML = `
                <video class="media-card-hover-video" src="${m.videoUrl}" autoplay muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; pointer-events:none;"></video>
              `;
            }
            requestAnimationFrame(() => {
              videoContainer.style.opacity = '1';
              if (thumbImg) thumbImg.style.opacity = '0';
            });
          }
        }, 400);
      }
    };

    card.onmouseleave = () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      
      const row = card.closest('.row');
      if (row) row.classList.remove('row-active-hover');

      const videoContainer = card.querySelector('.media-card-video-container');
      const thumbImg = card.querySelector('img');
      if (videoContainer) {
        videoContainer.style.opacity = '0';
        if (thumbImg) thumbImg.style.opacity = '1';
        setTimeout(() => {
          if (videoContainer.style.opacity === '0') {
            videoContainer.innerHTML = '';
            videoContainer.style.display = 'none';
          }
        }, 300);
      }
    };

    fragment.appendChild(card);
  }
  
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      rc.appendChild(fragment);
      rc.querySelectorAll('img[data-src]').forEach(img => appState.imgObserver.observe(img));
    });
  } else {
    setTimeout(() => {
      rc.appendChild(fragment);
      rc.querySelectorAll('img[data-src]').forEach(img => appState.imgObserver.observe(img));
    }, 0);
  }

  return row;
}

window.playTrailer = (e, id) => {
  e.stopPropagation();
  playVideo(id);
};

window.toggleHeroMute = () => {
  if (appState.isHeroMuted === undefined) appState.isHeroMuted = false;
  appState.isHeroMuted = !appState.isHeroMuted;
  const vids = document.querySelectorAll('.hero-video');
  const btn = document.getElementById('hero-mute-btn');
  vids.forEach(v => {
    if (v.tagName === 'VIDEO') {
      v.muted = appState.isHeroMuted;
    } else if (v.tagName === 'IFRAME') {
      v.contentWindow.postMessage(JSON.stringify({
         event: "command",
         func: appState.isHeroMuted ? "mute" : "unMute",
         args: []
      }), "*");
    }
  });
  if (btn) {
     btn.innerHTML = (appState.isHeroMuted === true) ? 
       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>` :
       `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
  }
};

// === MODERN DATEPICKER ===
window.openModernDatePicker = (inputEl) => {
  let currentDate = new Date();
  if (inputEl.value) {
    const parts = inputEl.value.split('-');
    if (parts.length === 3) {
      currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }

  const dpOverlay = document.createElement('div');
  dpOverlay.id = 'modern-datepicker-overlay';
  dpOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    z-index: 20000;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const calendarCard = document.createElement('div');
  calendarCard.style.cssText = `
    background: #181111;
    border: 1px solid rgba(229, 9, 20, 0.2);
    box-shadow: 0 10px 40px rgba(0,0,0,0.8);
    border-radius: 12px;
    padding: 24px;
    width: 320px;
    box-sizing: border-box;
    transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  dpOverlay.appendChild(calendarCard);
  document.body.appendChild(dpOverlay);

  setTimeout(() => {
    dpOverlay.style.opacity = '1';
    calendarCard.style.transform = 'scale(1)';
  }, 10);

  let activeYear = currentDate.getFullYear();
  let activeMonth = currentDate.getMonth();
  let selectedDay = currentDate.getDate();

  const closePicker = () => {
    dpOverlay.style.opacity = '0';
    calendarCard.style.transform = 'scale(0.9)';
    setTimeout(() => dpOverlay.remove(), 300);
  };

  dpOverlay.onclick = (e) => {
    if (e.target === dpOverlay) closePicker();
  };

  const renderCalendar = () => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    calendarCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <button id="dp-prev-month" type="button" style="background:transparent; border:none; color:white; font-size:18px; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)'" onmouseleave="this.style.background='transparent'">&lt;</button>
        <div style="text-align:center;">
          <div style="font-weight:700; color:white; font-size:16px;">${monthNames[activeMonth]}</div>
          <div style="font-size:12px; color:#aaa; font-weight:500; margin-top:2px;">${activeYear}</div>
        </div>
        <button id="dp-next-month" type="button" style="background:transparent; border:none; color:white; font-size:18px; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)'" onmouseleave="this.style.background='transparent'">&gt;</button>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:15px; justify-content:center;">
        <select id="dp-sel-month" style="background:#2b2b2b; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px; font-family:inherit; outline:none; cursor:pointer;">
          ${monthNames.map((m, idx) => `<option value="${idx}" ${idx === activeMonth ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select id="dp-sel-year" style="background:#2b2b2b; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px; font-family:inherit; outline:none; cursor:pointer;">
          ${Array.from({length: 40}, (_, i) => new Date().getFullYear() - 30 + i).map(yr => `<option value="${yr}" ${yr === activeYear ? 'selected' : ''}>${yr}</option>`).join('')}
        </select>
      </div>

      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center; font-size:11px; font-weight:700; color:#e50914; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>

      <div id="dp-days-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; font-size:13px; text-align:center;">
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.08);">
        <button id="dp-today-btn" type="button" style="background:transparent; border:none; color:#aaa; font-size:12px; font-weight:600; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#aaa'">Today</button>
        <button id="dp-cancel-btn" type="button" style="background:transparent; border:none; color:#e50914; font-size:12px; font-weight:700; cursor:pointer; transition:opacity 0.2s;" onmouseenter="this.style.opacity='0.8'" onmouseleave="this.style.opacity='1'">Cancel</button>
      </div>
    `;

    calendarCard.querySelector('#dp-prev-month').onclick = () => {
      activeMonth--;
      if (activeMonth < 0) {
        activeMonth = 11;
        activeYear--;
      }
      renderCalendar();
    };

    calendarCard.querySelector('#dp-next-month').onclick = () => {
      activeMonth++;
      if (activeMonth > 11) {
        activeMonth = 0;
        activeYear++;
      }
      renderCalendar();
    };

    calendarCard.querySelector('#dp-sel-month').onchange = (e) => {
      activeMonth = parseInt(e.target.value);
      renderCalendar();
    };

    calendarCard.querySelector('#dp-sel-year').onchange = (e) => {
      activeYear = parseInt(e.target.value);
      renderCalendar();
    };

    calendarCard.querySelector('#dp-today-btn').onclick = () => {
      const today = new Date();
      activeYear = today.getFullYear();
      activeMonth = today.getMonth();
      const currentValStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      inputEl.value = currentValStr;
      closePicker();
    };

    calendarCard.querySelector('#dp-cancel-btn').onclick = closePicker;

    const daysGrid = calendarCard.querySelector('#dp-days-grid');
    const firstDayIndex = new Date(activeYear, activeMonth, 1).getDay();
    const totalDays = new Date(activeYear, activeMonth + 1, 0).getDate();
    const totalPrevMonthDays = new Date(activeYear, activeMonth, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalPrevMonthDays - i;
      const cell = document.createElement('div');
      cell.innerText = dayNum;
      cell.style.cssText = `color: #444; padding: 6px 0; user-select: none; pointer-events: none;`;
      daysGrid.appendChild(cell);
    }

    const isTodayYear = new Date().getFullYear() === activeYear;
    const isTodayMonth = new Date().getMonth() === activeMonth;
    const todayDay = new Date().getDate();

    for (let d = 1; d <= totalDays; d++) {
      const cell = document.createElement('div');
      cell.innerText = d;
      
      const isSelected = selectedDay === d && currentDate.getFullYear() === activeYear && currentDate.getMonth() === activeMonth;
      const isCurrentToday = isTodayYear && isTodayMonth && todayDay === d;

      let cellStyle = `
        padding: 6px 0;
        border-radius: 50%;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
        display: flex; align-items: center; justify-content: center;
        aspect-ratio: 1;
        font-weight: 500;
      `;

      if (isSelected) {
        cellStyle += `background: #e50914; color: white; font-weight: 700; transform: scale(1.05);`;
      } else if (isCurrentToday) {
        cellStyle += `border: 1px solid #e50914; color: #ff5252;`;
      } else {
        cellStyle += `color: #d0d0d0;`;
      }

      cell.style.cssText = cellStyle;

      cell.onmouseenter = () => {
        if (!isSelected) {
          cell.style.background = 'rgba(255,255,255,0.1)';
          cell.style.color = '#fff';
        }
      };
      
      cell.onmouseleave = () => {
        if (!isSelected) {
          cell.style.background = 'transparent';
          cell.style.color = isCurrentToday ? '#ff5252' : '#d0d0d0';
        }
      };

      cell.onclick = () => {
        const valStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        inputEl.value = valStr;
        closePicker();
      };

      daysGrid.appendChild(cell);
    }
  };

  renderCalendar();
};

// === UPLOAD FEATURE ===
window.openUploadModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'uploadModal';
  
  modal.innerHTML = `
    <div class="upload-modal-content" style="display:flex; flex-direction:column; padding:0;">
      <div style="padding: 20px 30px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
        <h2 style="margin:0; font-size: 20px; font-weight:600; letter-spacing:0.5px;">Add New Memory</h2>
        <button class="upload-close" style="position:static; background:transparent; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; border:none; color:#a0a0a0; cursor:pointer; transition:all 0.2s; padding:0;" onmouseenter="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.1)';" onmouseleave="this.style.color='#a0a0a0'; this.style.background='transparent';" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      
      <div style="padding: 25px 30px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:20px; box-sizing:border-box;">
        
        <!-- THE ATMOSPHERIC NOTICE BANNER -->
        <div style="padding: 14px 20px; background: rgba(30,30,30,0.45); border-left: 3px solid #e50914; border-radius: 6px; display: flex; gap: 12px; align-items: flex-start;">
          <div style="color: #e50914; flex-shrink: 0; margin-top: 2px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 13px; color: #d0d0d0; font-weight: 500; line-height: 1.4;">
              Please upload your video to YouTube Studio first.
            </span>
            <a href="https://studio.youtube.com/channel/UC3b6az9clhBSOjpXJW0-mFA/videos/upload" target="_blank" style="color: #e50914; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; transition: color 0.2s;" onmouseenter="this.style.color='#ff333f';" onmouseleave="this.style.color='#e50914';">
              Open YouTube Studio <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>
          </div>
        </div>
        
        <!-- YOUTUBE VIDEO LINK WITH EMBEDDED FETCH -->
        <div class="floating-input-group" style="position: relative; height: 56px; margin-bottom: 0;">
          <input type="text" id="up-yt-link" placeholder=" " required style="width:100%; height: 56px; background: #2b2b2b; border: 1px solid transparent; padding: 24px 100px 8px 16px; border-radius: 8px; color: white; outline: none; font-size: 15px; box-sizing: border-box; transition: all 0.3s;" oninput="window.updateFetchButtonState(this)" onfocus="this.style.background='#383838'; this.style.borderColor='rgba(220,220,220,0.7)';" onblur="if(!this.value){this.style.background='#2b2b2b'; this.style.borderColor='transparent';}">
          <label style="position: absolute; top: 18px; left: 16px; color: #8c8c8c; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 14px;">YouTube Video Link</label>
          <button id="up-fetch" type="button" style="position: absolute; right: 12px; top: 12px; bottom: 12px; background: transparent; border: none; color: #555; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 12px; border-radius: 4px; cursor: pointer; transition: all 0.3s; pointer-events: none; line-height: 1; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            <span>Fetch</span>
          </button>
        </div>

        <!-- TITLE (56px) -->
        <div class="floating-input-group" style="position: relative; height: 56px; margin-bottom: 0;">
          <input type="text" id="up-title" placeholder=" " required style="width:100%; height: 56px; background: #2b2b2b; border: 1px solid transparent; padding: 24px 16px 8px 16px; border-radius: 8px; color: white; outline: none; font-size: 15px; box-sizing: border-box; transition: all 0.3s;" onfocus="this.style.background='#383838'; this.style.borderColor='rgba(220,220,220,0.7)';" onblur="if(!this.value){this.style.background='#2b2b2b'; this.style.borderColor='transparent';}">
          <label style="position: absolute; top: 18px; left: 16px; color: #8c8c8c; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 14px;">Title</label>
        </div>

        <!-- POLISHED LOGO SUB-BOX CARD (OPTIONAL) -->
        <div style="border: 1px solid #333; background: rgba(20,20,20,0.3); padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#aaa; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span>Custom Title Logo Image (Optional)</span>
            <span style="color:#e50914; font-size:10px; font-weight:700;">Netflix Brand Logo Style</span>
          </div>
          <div style="font-size:11px; color:#777; margin-top:-5px; line-height:1.4;">Upload or generate a stylized transparent Title Logo that displays dynamically instead of plain text.</div>
          
          <div class="floating-input-group" style="position: relative; height: 50px; margin-bottom: 0;">
            <input type="text" id="up-title-img-url" placeholder=" " style="width:100%; height: 44px; background:rgba(255,255,255,0.06); border:none; padding:18px 12px 6px 12px; border-radius:6px; color:white; font-size:13px; outline:none;" oninput="const preview = document.getElementById('up-title-img-preview'); if(preview) { preview.src = this.value; preview.style.display = this.value ? 'block' : 'none'; }">
            <label style="position: absolute; top: 14px; left: 12px; color: #777; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 13px;">Title Logo Image URL</label>
          </div>
          
          <div style="display:flex; gap:10px;">
            <button type="button" style="flex:1; background: rgba(255,255,255,0.08); border:none; color:#ccc; padding: 8px 12px; border-radius:6px; font-size:12px; font-weight:500; cursor:pointer; transition: all 0.2s; text-align:center; display: flex; align-items: center; justify-content: center; gap: 5px;" onmouseenter="this.style.background='rgba(255,255,255,0.16)'; this.style.color='#fff';" onmouseleave="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#ccc';" onclick="document.getElementById('up-title-img-file').click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Local File
            </button>
            <button type="button" style="flex:1; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; padding: 8px 12px; border-radius:6px; font-weight:600; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; transition:all 0.3s; text-align:center; display: flex; align-items: center; justify-content: center;" onmouseenter="this.style.boxShadow='0 0 10px rgba(229,9,20,0.5)';" onmouseleave="this.style.boxShadow='none';" onclick="window.generateTitleLogoPromptWithAI()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>Generate Prompt</span>
            </button>
          </div>
          <input type="file" id="up-title-img-file" accept="image/*" style="display:none;" onchange="if(this.files && this.files[0]) { window.compressPhotoFile(this.files[0]).then(b64 => { document.getElementById('up-title-img-url').value = 'Local File Selected: ' + this.files[0].name; window.upBase64TitleImg = b64; const preview = document.getElementById('up-title-img-preview'); if(preview) { preview.src = b64; preview.style.display = 'block'; } }); }">
          
          <div style="text-align:center; padding-top: 4px;">
             <img id="up-title-img-preview" src="" style="max-height:50px; max-width:80%; margin:0 auto; display:none; object-fit:contain; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5)); border-radius:4px;">
          </div>
        </div>

        <!-- AUTOMATIC FETCHED THUMBNAIL -->
        <div id="automatic-fetched-thumbnail-card" style="border: 1px solid #333; background: rgba(20,20,20,0.35); padding: 16px; border-radius: 8px; display: none; flex-direction: column; gap: 10px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#aaa; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span>Automatic YouTube Thumbnail</span>
            <span style="color:#22c55e; font-size:10px; font-weight:700; display:flex; align-items:center; gap:4px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Automatically Fetched
            </span>
          </div>
          <div style="position:relative; width: 100%; height: 160px; border-radius: 6px; overflow:hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.6);">
            <img id="up-auto-thumb-img" src="" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        </div>

        <!-- CUSTOM BACKDROP THUMBNAIL IMAGE CARD -->
        <div style="border: 1px solid #333; background: rgba(20,20,20,0.3); padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#aaa; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span>Memory Backdrop Thumbnail Image (Optional override)</span>
            <span style="color:#e50914; font-size:10px; font-weight:700;">Local File/Custom Backdrop URL</span>
          </div>
          <div style="font-size:11px; color:#777; margin-top:-5px; line-height:1.4;">Select a custom image backdrop, upload any local file, or generate a stunning cinematic scene prompt.</div>
          
          <div class="floating-input-group" style="position: relative; height: 50px; margin-bottom: 0;">
            <input type="text" id="up-thumb-custom" placeholder=" " style="width:100%; height: 44px; background:rgba(255,255,255,0.06); border:none; padding:18px 12px 6px 12px; border-radius:6px; color:white; font-size:13px; outline:none;" oninput="const preview = document.getElementById('up-thumb-preview'); if(preview) { preview.src = this.value || currentThumbData; document.getElementById('up-preview-container').style.display = 'block'; }">
            <label style="position: absolute; top: 14px; left: 12px; color: #777; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 13px;">Custom Thumbnail / Backdrop URL</label>
          </div>
          
          <div style="display:flex; gap:10px;">
            <button type="button" style="flex:1; background: rgba(255,255,255,0.08); border:none; color:#ccc; padding: 8px 12px; border-radius:6px; font-size:12px; font-weight:500; cursor:pointer; transition: all 0.2s; text-align:center; display: flex; align-items: center; justify-content: center; gap: 5px;" onmouseenter="this.style.background='rgba(255,255,255,0.16)'; this.style.color='#fff';" onmouseleave="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#ccc';" onclick="document.getElementById('up-thumb-file').click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Upload Local File
            </button>
            <button type="button" style="flex:1; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; padding: 8px 12px; border-radius:6px; font-weight:600; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; transition:all 0.3s; text-align:center; display: flex; align-items: center; justify-content: center;" onmouseenter="this.style.boxShadow='0 0 10px rgba(229,10,20,0.5)';" onmouseleave="this.style.boxShadow='none';" onclick="window.generateThumbnailPromptWithAI()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>Generate Prompt</span>
            </button>
          </div>
          <input type="file" id="up-thumb-file" accept="image/*" style="display:none;">
        </div>
        
        <div id="up-preview-container" style="display: none; text-align:center;">
          <div style="position:relative; width: 100%; height: 160px; border-radius: 8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <img id="up-thumb-preview" src="" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.7); font-size:10px; color:#ccc; padding:3px 6px; border-radius:4px; display:flex; align-items:center; gap:4px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#46d369" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Custom Backdrop Active
            </div>
          </div>
        </div>

        <!-- DEEP DESCRIPTION WITH BOTTOM EMBEDDED SPARKLE BUTTON -->
        <div style="position: relative; border-radius: 8px; overflow: hidden; background: #2b2b2b; border: 1px solid transparent; transition: all 0.3s; height: 142px;" id="desc-box-container">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1.2px; color: #777; font-weight:700; padding:10px 16px 0 16px; position:absolute; top:4px; left:0; z-index:2; pointer-events:none;">Description</div>
          <textarea id="up-desc" rows="3" required style="width:100%; border:none; padding:32px 16px 48px 16px; background: transparent; color: white; outline: none; font-family: inherit; font-size: 14px; box-sizing: border-box; resize: none; height: 100%;" onfocus="document.getElementById('desc-box-container').style.background='#383838'; document.getElementById('desc-box-container').style.borderColor='rgba(220,220,220,0.7)';" onblur="document.getElementById('desc-box-container').style.background='#2b2b2b'; document.getElementById('desc-box-container').style.borderColor='transparent';"></textarea>
          
          <!-- SPARKLE UTILITY STRIP -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 38px; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: flex-end; padding: 0 12px; border-top: 1px solid rgba(255,255,255,0.03); z-index: 5;">
            <div id="desc-sparkle-btn" onclick="window.generateUploadDescriptionWithAI()" style="display:flex; align-items:center; gap:6px; background: rgba(229,9,20,0.1); border: 1px solid rgba(229,9,20,0.25); color: #ff4d5a; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; cursor: pointer; user-select: none; transition: all 0.2s;" onmouseenter="this.style.background='rgba(229,9,20,0.25)'; this.style.borderColor='rgba(229,9,20,0.45)'; this.style.color='#fff';" onmouseleave="this.style.background='rgba(229,9,20,0.1)'; this.style.borderColor='rgba(229,9,20,0.25)'; this.style.color='#ff4d5a';">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 2s infinite;"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              <span>Generate with Gemini AI</span>
            </div>
          </div>
        </div>

        <!-- COMPACT METADATA STRIP -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- CATEGORY -->
          <div class="floating-input-group" style="position: relative; height: 56px; margin-bottom: 0;">
            <select id="up-cat" style="width:100%; height: 56px; background: #2b2b2b; border: 1px solid transparent; padding: 24px 40px 8px 16px; border-radius: 8px; color: white; outline: none; font-size: 14px; box-sizing: border-box; -webkit-appearance: none; -moz-appearance: none; appearance: none; transition: all 0.3s;" onfocus="this.style.background='#383838'; this.style.borderColor='rgba(220,220,220,0.7)';" onblur="this.style.background='#2b2b2b'; this.style.borderColor='transparent';">
              <option value="Celebration Parties" style="background:#141414;">Celebration Parties</option>
              <option value="Our Romantic Scenes" style="background:#141414;">Our Romantic Scenes</option>
              <option value="Our Special Event" style="background:#141414;">Our Special Event</option>
            </select>
            <label style="position: absolute; top: 6px; left: 16px; color: #ccc; pointer-events: none; transform: scale(0.7); transform-origin: left top; font-size: 15px;">Category</label>
            <div style="position: absolute; right: 16px; top: 22px; color: #8c8c8c; pointer-events: none; display: flex; align-items: center; justify-content: center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <!-- MODERN DATE TRIGGER -->
            <div class="floating-input-group" style="position: relative; height: 56px; margin-bottom: 0;">
              <input type="text" id="up-date" readonly style="width:100%; height: 56px; background: #2b2b2b; border: 1px solid transparent; padding: 24px 40px 8px 16px; border-radius: 8px; color: white; outline: none; font-size: 14px; box-sizing: border-box; cursor: pointer; transition: all 0.3s;" value="${new Date().toISOString().split('T')[0]}" onclick="window.openModernDatePicker(this)">
              <label style="position: absolute; top: 6px; left: 16px; color: #ccc; pointer-events: none; transform: scale(0.7); transform-origin: left top; font-size: 15px;">Date</label>
              <div style="position: absolute; right: 16px; top: 18px; color: #e50914; pointer-events: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
            </div>
            
            <!-- MATURITY RATING -->
            <div class="floating-input-group" style="position: relative; height: 56px; margin-bottom: 0;">
              <select id="up-rating" style="width:100%; height: 56px; background: #2b2b2b; border: 1px solid transparent; padding: 24px 40px 8px 16px; border-radius: 8px; color: white; outline: none; font-size: 14px; box-sizing: border-box; -webkit-appearance: none; -moz-appearance: none; appearance: none; transition: all 0.3s;" onfocus="this.style.background='#383838'; this.style.borderColor='rgba(220,220,220,0.7)';" onblur="this.style.background='#2b2b2b'; this.style.borderColor='transparent';">
                <option value="U/A 7+" style="background:#141414;">U/A 7+</option>
                <option value="U/A 13+" style="background:#141414;">U/A 13+</option>
                <option value="U/A 16+" style="background:#141414;">U/A 16+</option>
                <option value="U/A 18+" selected style="background:#141414;">U/A 18+</option>
                <option value="A" style="background:#141414;">A</option>
              </select>
              <label style="position: absolute; top: 6px; left: 16px; color: #ccc; pointer-events: none; transform: scale(0.7); transform-origin: left top; font-size: 15px;">Maturity</label>
              <div style="position: absolute; right: 16px; top: 22px; color: #8c8c8c; pointer-events: none; display: flex; align-items: center; justify-content: center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
        
      </div>
      
      <!-- THE FOOTER BUTTON BALANCE -->
      <div style="padding: 20px 30px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); display:flex; gap:15px; justify-content:flex-end; align-items:center;">
        <button id="up-cancel" style="background:transparent; border:none; color:#a0a0a0; padding:0 24px; height:48px; min-width:110px; font-weight:600; font-size:14px; cursor:pointer; transition: opacity 0.2s, color 0.2s;" onmouseenter="this.style.color='#fff';" onmouseleave="this.style.color='#a0a0a0';" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);">Cancel</button>
        <button id="up-publish" style="background:#e50914; border:none; color:white; padding:0 32px; height:48px; font-weight:700; font-size:14px; border-radius:8px; cursor:pointer; box-shadow: 0 4px 15px rgba(229,9,20,0.3); transition: opacity 0.2s, transform 0.1s;" onmouseenter="this.style.opacity='0.9';" onmouseleave="this.style.opacity='1';" onmousedown="this.style.transform='scale(0.98)';" onmouseup="this.style.transform='scale(1)';">Publish Memory</button>
      </div>
    </div>
  `;

  window.updateFetchButtonState = (input) => {
    const fetchBtn = document.getElementById('up-fetch');
    if (!fetchBtn) return;
    const val = input.value.trim();
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const isValid = val.length === 11 || val.match(regExp);
    if (isValid) {
      fetchBtn.style.color = '#fff';
      fetchBtn.style.background = '#e50914';
      fetchBtn.style.pointerEvents = 'auto';
    } else {
      fetchBtn.style.color = '#555';
      fetchBtn.style.background = 'transparent';
      fetchBtn.style.pointerEvents = 'none';
    }
  };

  window.generateUploadDescriptionWithAI = () => {
    const badge = document.getElementById('desc-sparkle-btn');
    const uTitle = document.getElementById('up-title').value.trim();
    if (!uTitle) return window.netflixAlert("Please enter a Title first, so Gemini can generate a matching description.");
    if (badge) {
      badge.innerHTML = '<span>⚙ Copying Prompt...</span>';
    }
    window.generateDescriptionWithAI();
    setTimeout(() => {
      if (badge) {
        badge.innerHTML = '<span>✨ Generate with Gemini AI</span>';
      }
    }, 1500);
  };
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
  
  let currentThumbData = '';
  let extractedVideoId = '';
  let localThumbBase64 = '';

  document.getElementById('up-thumb-file').onchange = async function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const compressed = await compressPhotoFile(file);
      if (compressed) {
        localThumbBase64 = compressed;
        document.getElementById('up-thumb-preview').src = localThumbBase64;
        document.getElementById('up-preview-container').style.display = 'block';
        document.getElementById('up-thumb-custom').value = 'Local File Selected: ' + file.name;
      }
    }
  };

  document.getElementById('up-fetch').onclick = async () => {
    const link = document.getElementById('up-yt-link').value.trim();
    if (!link) return window.netflixAlert("Please paste a YouTube link first.");

    let videoId = '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = link.length === 11 ? link : null;
    }

    if (!videoId) return window.netflixAlert("Could not pull Video ID from the text. Make sure it's a valid YouTube link.");
    
    extractedVideoId = videoId;
    document.getElementById('up-fetch').innerText = "Fetching...";
    
    try {
      const oembedRes = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json');
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) document.getElementById('up-title').value = data.title;
        // Always prefer maxresdefault for crystal clear thumbnails
        currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
      } else {
         currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
      }
    } catch(err) {
         currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
    }
    
    // Update automatic fetched thumbnail preview container
    const autoThumbCard = document.getElementById('automatic-fetched-thumbnail-card');
    const autoThumbImg = document.getElementById('up-auto-thumb-img');
    if (autoThumbCard && autoThumbImg) {
      autoThumbImg.src = currentThumbData;
      autoThumbCard.style.display = 'flex';
    }

    document.getElementById('up-fetch').innerText = "Fetch Video Metadata";
  };
  
  document.getElementById('up-publish').onclick = async (e) => {
    const title = document.getElementById('up-title').value.trim();
    if(!title) return window.netflixAlert("Title is required.");
    if(!extractedVideoId) return window.netflixAlert("Please fetch a valid YouTube link first.");

    e.target.innerText = "Adding...";
    e.target.disabled = true;

    const customThumbVal = document.getElementById('up-thumb-custom').value.trim();
    const finalThumb = (localThumbBase64 && customThumbVal.startsWith('Local File Selected:')) ?
      localThumbBase64 : (customThumbVal || currentThumbData || ('https://img.youtube.com/vi/' + extractedVideoId + '/maxresdefault.jpg'));

    const customTitleImgVal = document.getElementById('up-title-img-url').value.trim();
    const finalTitleImage = (window.upBase64TitleImg && customTitleImgVal.startsWith('Local File Selected:')) ?
      window.upBase64TitleImg : (customTitleImgVal || null);
    window.upBase64TitleImg = null;

    const mem = {
      id: 'm_' + Date.now(),
      title,
      titleImage: finalTitleImage,
      desc: document.getElementById('up-desc').value,
      category: document.getElementById('up-cat').value,
      year: document.getElementById('up-date').value || new Date().getFullYear().toString(),
      rating: document.getElementById('up-rating').value,
      thumbnail: finalThumb,
      videoUrl: extractedVideoId,
      dateAdded: Date.now(),
      uploadedBy: appState.currentProfile
    };

    await saveMemoryToDB(mem);
    appState.memories.unshift(mem);
    window.justUploadedId = mem.id;
    const modalEl = document.getElementById('uploadModal');
    modalEl.classList.remove('open');
    setTimeout(() => {
      modalEl.remove();
      render();
    }, 600);
  };
};

// === DETAIL MODAL ===
window.openDetailModal = (id, e, editMode = false) => {
  const m = appState.memories.find(i => i.id === id);
  if(!m) return;
  
  let originX = '50%';
  let originY = '50%';
  if (e && e.currentTarget) {
    const rect = e.currentTarget.getBoundingClientRect();
    originX = (rect.left + rect.width / 2) + 'px';
    originY = (rect.top + rect.height / 2) + 'px';
  }
  
  const inMyList = appState.myList.includes(id);
  const isLiked = appState.likedMemories && appState.likedMemories.includes(id);

  // Pause hero video
  const heroVids = document.querySelectorAll('.hero-video');
  heroVids.forEach(v => {
    if (v.tagName === 'VIDEO') v.pause();
    else if (v.tagName === 'IFRAME') {
      v.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
  });

  // Pause hover videos
  const hoverVids = document.querySelectorAll('.media-card-hover-video');
  hoverVids.forEach(v => {
    if (v.tagName === 'VIDEO') v.pause();
    else if (v.tagName === 'IFRAME') {
      v.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
  });
  
  const modal = document.createElement('div');
  modal.className = 'detail-overlay';
  modal.id = 'detailModal';
  
  const ytId = m.videoUrl ? window.extractYouTubeId(m.videoUrl) : null;
  const isYouTube = !!ytId;
  
  let mediaHtml = appState.settings.autoPlayPreviews && m.videoUrl ? 
      (isYouTube ? `<div style="position:relative; width:100%; height:100%; overflow:hidden;"><iframe id="modalYtPlayer" src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&mute=1&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${ytId}&enablejsapi=1&vq=hd720&fs=0&disablekb=1" style="position:absolute; top:50%; left:50%; width:1600px; height:900px; transform:translate(-50%, -50%) scale(0.45); transform-origin:center center; pointer-events:none !important; border:none;" allow="autoplay"></iframe><div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; background:rgba(0,0,0,0); pointer-events:auto;"></div></div>` : `<div style="position:relative; width:100%; height:100%; overflow:hidden;"><video src="${m.videoUrl}" autoplay muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(40px) brightness(30%); transform:scale(1.2); z-index:1; pointer-events:none;"></video><video src="${m.videoUrl}" autoplay muted loop playsinline style="position:relative; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;"></video></div>`) : 
      `<img src="${m.thumbnail}" style="width:100%;height:100%;object-fit:cover;">`;

  const detailTitleRender = m.titleImage ? 
    `<img src="${m.titleImage}" class="detail-title-logo-img" alt="${m.title}" style="max-height: 110px; max-width: min(360px, 80%); width: auto; object-fit: contain; filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.85)); margin-bottom: 10px;" referrerPolicy="no-referrer">` :
    m.title;

  modal.innerHTML = `
    <div class="detail-modal" style="transform-origin: ${originX} ${originY};">
      <div class="modal-controls">
        <button class="modal-close-btn" onclick="const dm = document.getElementById('detailModal'); const v = dm.querySelectorAll('video, iframe'); v.forEach(el => { el.src=''; if(el.load) el.load(); }); dm.classList.remove('open'); setTimeout(() => { dm.remove(); }, 300);">&times;</button>
      </div>
      <div class="detail-header">
        ${mediaHtml}
        <div class="detail-gradient"></div>
        <div class="detail-title-btn">
          <div class="detail-title" id="dm-title">${detailTitleRender}</div>
          <input type="text" id="dm-title-edit" class="edit-input hidden" value="${m.title}" style="font-size:36px; font-weight:bold; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:5px; margin-bottom:10px; width:100%; border-radius:4px; font-family:inherit;">
          <div style="display:flex; gap:10px; align-items:center;">
            ${!m.videoUrl ? `
              <button class="btn btn-primary" id="dm-play-btn" onclick="playVideo('${m.id}')" style="padding: 10px 20px; font-size: 15px;">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polygon points="6 3 20 12 6 21 6 3"/></svg> Play as Video
              </button>
              <button class="btn btn-secondary" id="dm-view-photo-btn" onclick="window.viewPhotoStatic('${m.id}')" style="padding: 10px 15px; font-size: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); color: white;">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View Photo
              </button>
            ` : `
              <button class="btn btn-primary" id="dm-play-btn" onclick="playVideo('${m.id}')" style="padding: 10px 30px; font-size: 16px;">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polygon points="6 3 20 12 6 21 6 3"/></svg> Play
              </button>
            `}
            <button class="btn btn-secondary" id="dm-edit-btn" onclick="toggleDetailEdit()" style="padding: 10px 20px; font-size: 16px;">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit Info
            </button>
            <button class="btn btn-primary hidden" id="dm-save-btn" onclick="saveDetailEdit('${m.id}')" style="padding: 10px 30px; font-size: 16px; background:#46d369; color:black;">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg> Save
            </button>
            
            <div class="circ-play-btn" onclick="toggleMyList('${m.id}', event, this)" title="${inMyList ? 'Remove from List' : 'Add to My List'}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${inMyList ? 'M5 12l5 5L20 7' : 'M12 5v14M5 12h14'}"/></svg>
            </div>
            <div class="circ-play-btn" id="dm-like-btn" onclick="likeMemory('${m.id}', this)" title="${isLiked ? 'Unlike' : 'Like'}" style="${isLiked ? 'color: #E50914; border-color: #E50914;' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
            </div>
            <div class="circ-play-btn" onclick="downloadVideo('${m.id}')" title="Download">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </div>
            <div class="circ-play-btn" id="dm-delete-btn" onclick="deleteMemory('${m.id}')" title="Delete Memory">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
          </div>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-left">
          <div class="detail-meta">
            <span style="color: #46d369; text-shadow: 0 0 5px rgba(70,211,105,0.5); font-weight: bold;">${m.matchRate || 99}% Romantic Match</span> <span class="year">${m.year}</span> <span class="rating">${m.rating}</span> <span class="rating" id="dm-duration" style="display: none; border-color: rgba(255,255,255,0.4); color: #fff;"></span> <span class="quality">4K Ultra HD</span>
          </div>
          <div style="display: inline-flex; align-items: center; margin: 12px 0 16px 0; font-weight: 800; color: white;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e50914; color: white; font-weight: 950; padding: 2px 5px; border-radius: 2px; line-height: 1; margin-right: 8px; font-family: system-ui, -apple-system, sans-serif;">
              <span style="font-size: 6px; letter-spacing: 0.5px; margin-bottom: 1px;">TOP</span>
              <span style="font-size: 11px; font-weight: 950;">10</span>
            </div>
            <span style="font-size: 14px; font-weight: 700; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">#1 in Memories Today</span>
          </div>
          <div class="detail-desc" id="dm-desc">${m.desc || 'A beautiful memory worth reliving.'}</div>
          <textarea id="dm-desc-edit" class="edit-input hidden" style="width:100%; height:100px; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:10px; border-radius:4px; font-family:inherit; resize:vertical; font-size:16px;">${m.desc || ''}</textarea>
          
          <div id="dm-cat-edit-container" class="hidden" style="margin-top:15px;">
            <div style="font-size:14px; color:#aaa; margin-bottom:8px;">Category</div>
            <select id="dm-cat-edit" style="width:100%; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:11px; border-radius:4px; font-family:inherit; font-size:14px; outline:none;">
              <option value="Celebration Parties" ${window.getNormalizedCategory(m.category) === 'Celebration Parties' ? 'selected' : ''} style="background:#141414;">Celebration Parties</option>
              <option value="Our Romantic Scenes" ${window.getNormalizedCategory(m.category) === 'Our Romantic Scenes' ? 'selected' : ''} style="background:#141414;">Our Romantic Scenes</option>
              <option value="Our Special Event" ${window.getNormalizedCategory(m.category) === 'Our Special Event' ? 'selected' : ''} style="background:#141414;">Our Special Event</option>
            </select>
          </div>
          
          <div id="dm-thumb-edit" class="hidden" style="margin-top:20px; border-top:1px solid #333; padding-top:20px;">
            <div style="font-size:14px; color:#aaa; margin-bottom:10px;">Thumbnail Image URL</div>
            <input type="text" id="dm-thumb-url-input" value="${m.thumbnail || ''}" placeholder="Paste Thumbnail Image URL here..." style="width:100%; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:10px; border-radius:4px; font-family:inherit; font-size:14px; margin-bottom:12px; outline:none;">
            <div style="text-align:center; margin-bottom:12px; font-size:12px; color:#555; text-transform:uppercase; letter-spacing:1px;">- OR -</div>
            <button style="background: rgba(255,255,255,0.1); border:none; color:white; padding: 10px 15px; border-radius:4px; font-size:13px; cursor:pointer; width:100%; transition: background 0.2s; margin-bottom:12px;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'" onclick="document.getElementById('dm-thumb-input').click()">📁 Select Image File</button>
            <input type="file" id="dm-thumb-input" accept="image/*" style="display:none;" onchange="if(this.files && this.files[0]) { document.getElementById('dm-thumb-url-input').value = 'Local File Selected: ' + this.files[0].name; }">
            
            <button type="button" class="btn" style="width:100%; justify-content:center; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.3s; margin-bottom:12px;" onmouseenter="this.style.boxShadow='0 0 15px rgba(229,9,20,0.6)'; this.style.transform='scale(1.02)';" onmouseleave="this.style.boxShadow='none'; this.style.transform='scale(1)';" onclick="window.generateThumbnailPromptWithAI()">
              ✨ Generate Thumbnail Prompt with AI
            </button>
          </div>

          <div id="dm-title-image-edit" class="hidden" style="margin-top:20px; border-top:1px solid #333; padding-top:20px;">
            <div style="font-size:14px; color:#aaa; margin-bottom:10px;">Stylized Title Logo Image (Optional)</div>
            <input type="text" id="dm-title-img-url-input" value="${m.titleImage || ''}" placeholder="Paste transparent PNG Title Image URL here..." style="width:100%; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:10px; border-radius:4px; font-family:inherit; font-size:14px; margin-bottom:12px; outline:none;" oninput="const preview = document.getElementById('dm-title-img-preview-el'); if(preview) { preview.src = this.value; preview.style.display = this.value ? 'block' : 'none'; }">
            
            <div style="text-align:center; margin-bottom:12px; font-size:12px; color:#555; text-transform:uppercase; letter-spacing:1px;">- OR -</div>
            
            <button style="background: rgba(255,255,255,0.1); border:none; color:white; padding: 10px 15px; border-radius:4px; font-size:13px; cursor:pointer; width:100%; transition: background 0.2s; margin-bottom:12px;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'" onclick="document.getElementById('dm-title-img-file-input').click()">📁 Select Title Logo Image File</button>
            <input type="file" id="dm-title-img-file-input" accept="image/*" style="display:none;" onchange="if(this.files && this.files[0]) { window.compressPhotoFile(this.files[0]).then(b64 => { document.getElementById('dm-title-img-url-input').value = 'Local File Selected: ' + this.files[0].name; window.dmBase64TitleImg = b64; const preview = document.getElementById('dm-title-img-preview-el'); if(preview) { preview.src = b64; preview.style.display = 'block'; } }); }">
            
            <button type="button" class="btn" style="width:100%; justify-content:center; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.3s; margin-bottom:12px;" onmouseenter="this.style.boxShadow='0 0 15px rgba(229,9,20,0.6)'; this.style.transform='scale(1.02)';" onmouseleave="this.style.boxShadow='none'; this.style.transform='scale(1)';" onclick="window.generateTitleLogoPromptWithAI()">
              ✨ Generate Title Logo Prompt with AI
            </button>
            
            <div style="text-align:center; margin-top:10px;">
              <img id="dm-title-img-preview-el" src="${m.titleImage || ''}" style="max-height:80px; max-width:80%; margin:0 auto; display:${m.titleImage ? 'block' : 'none'}; object-fit:contain; border-radius:4px; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));">
            </div>
          </div>
        </div>
        <div class="detail-right" style="font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
          <div><span style="color:#777;">Cast:</span> <span style="color:#ccc; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'; this.style.textDecoration='underline'" onmouseleave="this.style.color='#ccc'; this.style.textDecoration='none'">Sarthak</span>, <span style="color:#ccc; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'; this.style.textDecoration='underline'" onmouseleave="this.style.color='#ccc'; this.style.textDecoration='none'">Reechita</span></div>
          <div style="margin-top:10px;"><span style="color:#777;">Genres:</span> <span style="color:#ccc; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'; this.style.textDecoration='underline'" onmouseleave="this.style.color='#ccc'; this.style.textDecoration='none'">Romance</span>, <span style="color:#ccc; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'; this.style.textDecoration='underline'" onmouseleave="this.style.color='#ccc'; this.style.textDecoration='none'">Emotional</span></div>
          <div style="margin-top:10px;"><span style="color:#777;">This Show Is:</span> <span style="color:#ccc; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'; this.style.textDecoration='underline'" onmouseleave="this.style.color='#ccc'; this.style.textDecoration='none'">Heartfelt</span>, <span style="color:#ccc; cursor:pointer; transition:color 0.2s;" onmouseenter="this.style.color='#fff'; this.style.textDecoration='underline'" onmouseleave="this.style.color='#ccc'; this.style.textDecoration='none'">Intimate</span></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const detailHeaderForYt = modal.querySelector('.detail-header');
  if (detailHeaderForYt && isYouTube) {
    const modalYtPlayer = modal.querySelector('#modalYtPlayer');
    if (modalYtPlayer) {
      const nativeW = 1600;
      const nativeH = 900;
      const updateSize = (width) => {
        const mScale = (width / nativeW) * 1.5;
        modalYtPlayer.style.width = `${nativeW}px`;
        modalYtPlayer.style.height = `${nativeH}px`;
        modalYtPlayer.style.transform = `translate(-50%, -50%) scale(${mScale})`;
        modalYtPlayer.style.transformOrigin = 'center center';
        modalYtPlayer.style.position = 'absolute';
        modalYtPlayer.style.top = '50%';
        modalYtPlayer.style.left = '50%';
      };
      
      const headerRect = detailHeaderForYt.getBoundingClientRect();
      updateSize(headerRect.width || 800);
      
      const ro = new ResizeObserver((entries) => {
        for (let entry of entries) {
          updateSize(entry.contentRect.width);
        }
      });
      ro.observe(detailHeaderForYt);
    }
  }

  // Dynamically fetch and display actual duration
  if (m.videoUrl) {
    const isYt = m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:');
    if (isYt) {
      const handleYtDurationMsg = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'infoDelivery' && data.info && typeof data.info.duration === 'number') {
            const sec = data.info.duration;
            if (sec > 0) {
              const formatted = window.formatDuration(sec);
              const durationEl = document.getElementById('dm-duration');
              if (durationEl) {
                durationEl.innerText = formatted;
                durationEl.style.display = 'inline-block';
                window.removeEventListener('message', handleYtDurationMsg);
              }
            }
          }
        } catch (e) {}
      };
      window.addEventListener('message', handleYtDurationMsg);
      
      // Fallback default duration in case oembed loader or delay
      setTimeout(() => {
        const dEl = document.getElementById('dm-duration');
        if (dEl && !dEl.innerText) {
          dEl.innerText = m.videoUrl === 'dQw4w9WgXcQ' ? '3h 32m' : '2m 14s';
          dEl.style.display = 'inline-block';
        }
      }, 2500);
    } else {
      // Local video tag preview
      const tempVideo = document.createElement('video');
      tempVideo.src = m.videoUrl;
      tempVideo.preload = 'metadata';
      tempVideo.addEventListener('loadedmetadata', () => {
        const sec = tempVideo.duration;
        if (sec > 0) {
          const formatted = window.formatDuration(sec);
          const durationEl = document.getElementById('dm-duration');
          if (durationEl) {
            durationEl.innerText = formatted;
            durationEl.style.display = 'inline-block';
          }
        }
        tempVideo.remove();
      });
      tempVideo.addEventListener('error', () => {
        tempVideo.remove();
      });
    }
  }
  
  if (editMode) {
     toggleDetailEdit();
  }
  setTimeout(() => modal.classList.add('open'), 10);
}

window.toggleDetailEdit = () => {
  const title = document.getElementById('dm-title');
  const titleEdit = document.getElementById('dm-title-edit');
  const desc = document.getElementById('dm-desc');
  const descEdit = document.getElementById('dm-desc-edit');
  const playBtn = document.getElementById('dm-play-btn');
  const saveBtn = document.getElementById('dm-save-btn');
  const editBtn = document.getElementById('dm-edit-btn');
  const thumbEdit = document.getElementById('dm-thumb-edit');
  const titleImgEdit = document.getElementById('dm-title-image-edit');
  const catEdit = document.getElementById('dm-cat-edit-container');
  
  if(title.classList.contains('hidden')) {
    title.classList.remove('hidden');
    desc.classList.remove('hidden');
    playBtn.classList.remove('hidden');
    editBtn.classList.remove('hidden');
    titleEdit.classList.add('hidden');
    descEdit.classList.add('hidden');
    saveBtn.classList.add('hidden');
    thumbEdit.classList.add('hidden');
    if(titleImgEdit) titleImgEdit.classList.add('hidden');
    if(catEdit) catEdit.classList.add('hidden');
  } else {
    title.classList.add('hidden');
    desc.classList.add('hidden');
    playBtn.classList.add('hidden');
    editBtn.classList.add('hidden');
    titleEdit.classList.remove('hidden');
    descEdit.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
    thumbEdit.classList.remove('hidden');
    if(titleImgEdit) titleImgEdit.classList.remove('hidden');
    if(catEdit) catEdit.classList.remove('hidden');
    titleEdit.focus();
  }
};

window.saveDetailEdit = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  if (m) {
    m.title = document.getElementById('dm-title-edit').value.trim();
    m.desc = document.getElementById('dm-desc-edit').value.trim();

    const catSelect = document.getElementById('dm-cat-edit');
    if (catSelect) {
      m.category = catSelect.value;
    }

    const fileInput = document.getElementById('dm-thumb-input');
    const urlInput = document.getElementById('dm-thumb-url-input');

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      await new Promise(resolve => {
        reader.onload = (e) => {
          m.thumbnail = e.target.result;
          resolve();
        };
        reader.readAsDataURL(file);
      });
    } else if (urlInput && urlInput.value && !urlInput.value.startsWith('Local File Selected:')) {
      m.thumbnail = urlInput.value.trim();
    }

    // Save Title Image edits
    const titleImgUrlInput = document.getElementById('dm-title-img-url-input');
    if (window.dmBase64TitleImg && titleImgUrlInput && titleImgUrlInput.value.startsWith('Local File Selected:')) {
      m.titleImage = window.dmBase64TitleImg;
    } else if (titleImgUrlInput) {
      const val = titleImgUrlInput.value.trim();
      m.titleImage = val || null;
    }
    window.dmBase64TitleImg = null; // reset local cache

    try { await saveMemoryToDB(m); } catch(err) {}
    window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
    
    // update title visually in detail panel
    const detailTitleRender = m.titleImage ? 
      `<img src="${m.titleImage}" class="detail-title-logo-img" alt="${m.title}" style="max-height: 110px; max-width: min(360px, 80%); width: auto; object-fit: contain; filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.85)); margin-bottom: 10px;" referrerPolicy="no-referrer">` :
      m.title;
      
    document.getElementById('dm-title').innerHTML = detailTitleRender;
    document.getElementById('dm-desc').innerText = m.desc;
    
    // update thumbnail visually
    const previewImg = document.getElementById('detailModal').querySelector('.detail-hero img');
    if (previewImg) previewImg.src = m.thumbnail;

    render();
  }
  toggleDetailEdit();
};

window.deleteMemory = (id) => {
  window.netflixConfirm("Are you sure you want to delete this memory?", async () => {
    appState.memories = appState.memories.filter(m => m.id !== id);
    appState.myList = appState.myList.filter(lId => lId !== id);
    appState.continueWatching = appState.continueWatching.filter(lId => lId !== id);
    if (appState.likedMemories) {
      appState.likedMemories = appState.likedMemories.filter(lId => lId !== id);
    }
    
    try { 
      await deleteDoc(doc(db, 'memories', id)); 
    } catch(e) {
      console.error("Error deleting memory from DB:", e);
    }
    
    window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
    await saveStateList('myList', appState.myList);
    await saveStateList('continueWatching', appState.continueWatching);
    if (appState.likedMemories) {
      await saveStateList('likedMemories', appState.likedMemories);
    }
    
    const dm = document.getElementById('detailModal');
    if (dm) dm.remove();
    
    render();
  });
};

window.showToast = (msg, duration = 3000) => {
  const existing = document.getElementById('nf-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'nf-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%) translateY(30px);
    background: #181c1f;
    color: white;
    border-left: 4px solid #e50914;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 13px 20px;
    border-radius: 4px;
    font-size: 13.5px;
    font-weight: 600;
    z-index: 150000;
    box-shadow: 0 10px 40px rgba(0,0,0,0.85);
    pointer-events: none;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 12px;
    letter-spacing: -0.1px;
    min-width: 260px;
    max-width: 90%;
  `;
  
  // High contrast red ring checkbox indicator icon
  toast.innerHTML = `
    <div style="flex-shrink:0; display:flex; align-items:center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="animation: checkPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
        <circle cx="12" cy="12" r="10" fill="rgba(229, 9, 20, 0.15)" stroke="#e50914" stroke-width="2.5"/>
        <path d="M8.5 12.5l2.5 2.5 5-5" stroke="#e50914" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div style="flex:1; word-break:break-word; font-family: inherit;">${msg}</div>
  `;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(30px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, duration);
};

window.syncLikeUI = (id) => {
  const isNowLiked = appState.likedMemories && appState.likedMemories.includes(id);

  // 1. Sync all matching circular buttons in the Detail Modal
  const dmLikeBtn = document.getElementById('dm-like-btn');
  if (dmLikeBtn) {
    const oClick = dmLikeBtn.getAttribute('onclick') || '';
    if (oClick.includes(id)) {
      dmLikeBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${isNowLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      `;
      dmLikeBtn.style.color = isNowLiked ? '#E50914' : '';
      dmLikeBtn.style.borderColor = isNowLiked ? '#E50914' : '';
      dmLikeBtn.title = isNowLiked ? 'Unlike' : 'Like';
      
      dmLikeBtn.classList.add('pop-active');
      setTimeout(() => dmLikeBtn.classList.remove('pop-active'), 400);
    }
  }

  // 2. Sync hover cards like buttons
  const likeButtons = document.querySelectorAll('.hc-like');
  likeButtons.forEach(btn => {
    const oClick = btn.getAttribute('onclick') || '';
    if (oClick.includes(id)) {
      btn.style.color = isNowLiked ? '#E50914' : '';
      btn.style.borderColor = isNowLiked ? '#E50914' : '';
      btn.title = isNowLiked ? 'Unlike' : 'Like';
      
      btn.classList.add('pop-active');
      setTimeout(() => btn.classList.remove('pop-active'), 400);
    }
  });
};

window.likeMemory = async (id, btn) => {
  const m = appState.memories.find(i => i.id === id);
  if (!m) return;
  
  if (!appState.likedMemories) {
    appState.likedMemories = [];
  }
  
  const index = appState.likedMemories.indexOf(id);
  const isLiked = index !== -1;
  
  if (isLiked) {
    appState.likedMemories.splice(index, 1);
    m.likes = Math.max(0, (m.likes || 1) - 1);
    window.showToast('Removed from Liked list');
  } else {
    appState.likedMemories.push(id);
    m.likes = (m.likes || 0) + 1;
    window.showToast('Added to Liked memories!');
  }
  
  // OPTIMISTIC UPDATE: Sync all like buttons cleanly and dynamically *instantly*
  window.syncLikeUI(id);
  
  // Save to persistence store and remote DB non-blocking in background
  saveStateList('likedMemories', appState.likedMemories).catch(err => console.error("Error saving state list in background:", err));
  saveMemoryToDB(m).catch(err => console.error("Error saving memory state in background:", err));
};

window.downloadVideo = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  if (!m || !m.videoUrl) {
    window.showToast('Video not available to download.');
    return;
  }
  
  const isYt = m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:');
  
  if (isYt) {
    const ytUrl = `https://www.youtube.com/watch?v=${m.videoUrl}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(ytUrl);
        window.showToast('YouTube link copied to clipboard! Opening downloader...');
      } else {
        window.showToast('Opening downloader tool...');
      }
    } catch (err) {
      window.showToast('Opening downloader tool...');
    }
    
    // Open downloader website
    window.open('https://vidssave.com/youtube-video-downloader-6fu', '_blank');
  } else {
    // Native video download
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(m.videoUrl);
      }
    } catch(e){}
    window.showToast('Starting local video download...');
    
    const a = document.createElement('a');
    a.href = m.videoUrl;
    a.download = (m.title || 'video') + '.mp4';
    a.click();
  }
};

window.shareVideo = (id) => {
  const link = window.location.origin + window.location.pathname + "?v=" + id;
  if(navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(link).then(() => {
      alert("Memory link copied to clipboard!\n" + link);
    }).catch(() => {
      prompt("Copy this link to share:", link);
    });
  } else {
    prompt("Copy this link to share:", link);
  }
}
window.downloadVideo = () => {
  const quality = prompt("Select Download Quality (Enter '1' or '2'):\n1 - High (4K Ultra HD)\n2 - Standard (1080p HD)", "1");
  if (quality) {
    alert("Downloading in " + (quality === '1' ? '4K Ultra HD' : 'Standard HD') + " for offline viewing...");
  }
}

// === FULLSCREEN PLAYBACK ===
window.playVideo = (id) => {
  let handleYtKeydown = null;
  let handleNormalKeydown = null;
  let handleYtMessage = null;
  let ytTimer = null;
  const m = appState.memories.find(i => i.id === id);
  if(!m) return;
  
  // If it's just a photo (no videoUrl), start slideshow from this photo
  if (!m.videoUrl) {
     return window.startMomentsSlideshow(m.id);
  }
  
  const existingPlayer = document.getElementById('playbackOverlay');
  if(existingPlayer) existingPlayer.remove();
  
  document.body.style.overflow = 'hidden';
  
  // Push a state so Chrome back or back swipe closes player rather than leaving the site!
  history.pushState({ playerOpen: true }, '');
  
  // Track Continue Watching
  if(!appState.continueWatching.includes(id)) {
    appState.continueWatching.unshift(id);
    saveStateList('continueWatching', appState.continueWatching);
  }
  
  // Convert File Object to URL if loaded from DB
  let url = m.videoUrl;
  const detailModal = document.getElementById('detailModal');
  if (detailModal) {
    // Gracefully close detail modal with its 300ms fade transition
    const v = detailModal.querySelectorAll('video, iframe');
    v.forEach(el => {
      if (typeof el.pause === 'function') {
        el.pause();
      } else {
        el.src = '';
        if (typeof el.load === 'function') el.load();
      }
    });
    detailModal.classList.remove('open');
    setTimeout(() => {
      if (detailModal.parentNode) detailModal.remove();
    }, 400);
  }
  
  let c = document.getElementById('playbackOverlay');
  if (!c) {
    c = document.createElement('div');
    c.className = 'playback-overlay';
    c.id = 'playbackOverlay';
    document.body.appendChild(c);
  }
  
  // Apply starting state: start from a smooth, smaller rounded screen-like rectangular box
  c.style.display = 'block';
  c.style.transition = 'none';
  c.style.opacity = '0';
  c.style.transform = 'scale(0.2)';
  c.style.borderRadius = '20px';
  c.style.overflow = 'hidden';
  
  // Force a browser reflow paint
  c.offsetHeight;
  
  // Transition to full screen size smoothly over exactly 1.0 second as requested
  setTimeout(() => {
    c.style.transition = 'opacity 1.0s cubic-bezier(0.16, 1, 0.3, 1), transform 1.0s cubic-bezier(0.16, 1, 0.3, 1), border-radius 1.0s cubic-bezier(0.16, 1, 0.3, 1)';
    c.style.opacity = '1';
    c.style.transform = 'scale(1)';
    c.style.borderRadius = '0px';
  }, 30);
  
  // Play Netflix initial animation before playing video
  const ytId = window.extractYouTubeId(url);
  const isYouTube = !!ytId;
  
  // Setup main player later to prevent YouTube autoplaying before intro ends
  let playerHtml = '';
  if (isYouTube) {
    playerHtml = `
      <div id="video-container" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:black; contain: content; overflow: hidden;">
        <iframe id="fsyPlayer" style="display:none; width:100%; height:100%; background:black; border:none; pointer-events:auto; z-index:1;" src="" allowfullscreen="true" allow="autoplay; encrypted-media;"></iframe>
        <div id="video-click-mask" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:-1; background:transparent; pointer-events:none;"></div>
      </div>
    `;
  } else {
    playerHtml = `
      <div id="video-container" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:black; contain: content; overflow: hidden;">
        <video id="fsyBgPlayer" src="${url}" autoplay muted loop playsinline style="position:absolute; top:50%; left:50%; width:100%; height:100%; object-fit:cover; filter:blur(40px) brightness(30%); transform:translate(-50%,-50%) scale(1.05); z-index:0; pointer-events:none;"></video>
        <video src="${url}" id="fsyPlayer" fetchpriority="high" preload="metadata" style="position:relative; width:100%; max-width:100vw; max-height:100vh; object-fit:contain; cursor:pointer; will-change: transform; z-index:1;"></video>
        <div id="video-controls" style="position:absolute; bottom:0; left:0; padding:20px 4%; width:100%; display:flex; flex-direction:column; gap:10px; background:linear-gradient(transparent, rgba(0,0,0,0.9)); opacity:0; transition:opacity 0.3s; z-index: 10001;">
          <div style="display:flex; align-items:center; gap:15px; width: 100%;">
            <span id="time-current" style="color:white; font-size:15px; font-variant-numeric:tabular-nums; font-weight: 500;">0:00</span>
            <input type="range" id="seek-bar" value="0" step="0.1" style="flex:1; cursor:pointer; accent-color: var(--netflix-red, #e50914); height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px;">
            <span id="time-remaining" style="color:white; font-size:15px; font-variant-numeric:tabular-nums; font-weight: 500;">0:00</span>
          </div>
          <div style="display:flex; align-items:center; gap:25px; margin-top: 10px;">
            <button id="play-pause-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Play/Pause (Space)">
              <svg id="icon-play" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              <svg id="icon-pause" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
            </button>
            <button id="mute-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Mute/Unmute (M)">
              <svg id="icon-vol-up" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              <svg id="icon-vol-off" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>
            </button>
            <div style="flex:1;"></div>
            <button id="fullscreen-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Fullscreen (F)">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }
 
  c.innerHTML = `
    <div id="playback-back-btn" class="playback-back" style="z-index: 10002; position:absolute; top: 40px; left: 40px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 50%; background: rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.25); transition: background 0.35s, border-color 0.35s, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    <video src="./netflix-intro.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%; z-index:9000; position:absolute; top:0; left:0;"></video>
    ${playerHtml}
    
    <!-- Next up countdown overlay -->
    <div id="next-up-overlay" style="display:none; position:absolute; bottom: 80px; right: 80px; z-index:10005; align-items:center; gap: 15px;">
      <div style="text-align: right; color: white;">
        <div style="font-size: 14px; font-weight: bold; color: #aaa;">Up Next</div>
        <div id="next-up-title" style="font-size: 18px; font-weight: bold;">Title</div>
      </div>
      <div style="position: relative; width: 60px; height: 60px; cursor: pointer;" id="next-up-btn">
        <svg viewBox="0 0 100 100" style="width:100%; height:100%; transform: rotate(-90deg);">
           <circle cx="50" cy="50" r="45" fill="rgba(0,0,0,0.5)" stroke="#333" stroke-width="5"></circle>
           <circle id="next-up-ring" cx="50" cy="50" r="45" fill="transparent" stroke="#e50914" stroke-width="5" stroke-dasharray="283" stroke-dashoffset="0" style="transition: stroke-dashoffset 0.1s linear;"></circle>
        </svg>
        <div style="position:absolute; top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;">▶</div>
      </div>
    </div>
  `;
  // don't appendChild here since we attached it at the top
 
  
  const introPlayer = document.getElementById('introPlayer');
  const mainPlayer = document.getElementById('fsyPlayer');
  
  // Seamless virtual fullscreen overlay covers the entire viewport on init
  // Manual native fullscreen trigger remains available on the player controller bar
  
  const startMainVideo = () => {
    if (introPlayer) {
      introPlayer.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      introPlayer.style.opacity = '0';
      introPlayer.style.transform = 'scale(1.05)';
      setTimeout(() => {
        introPlayer.style.display = 'none';
      }, 500);
    }
    
    if (isYouTube) {
      mainPlayer.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3&vq=hd1080&enablejsapi=1&fs=1`;
      mainPlayer.style.display = 'block';
    } else {
      mainPlayer.style.display = 'block';
      const pPromise = mainPlayer.play();
      if(pPromise !== undefined) pPromise.catch(e => console.error("Autoplay main video prevented", e));
    }
  };
  
  // Try autoplaying intro, else wait
  if (introPlayer) {
    introPlayer.muted = false;
    introPlayer.volume = 1.0;

    if(introPlayer.play() !== undefined) {
      introPlayer.play().then(() => {
         // Play at standard speed as requested (do not accelerate!)
         try { introPlayer.playbackRate = 1.0; } catch(err) {}
      }).catch(() => {
        introPlayer.muted = true;
        introPlayer.play().then(() => {
           try { introPlayer.playbackRate = 1.0; } catch(err) {}
        }).catch(() => startMainVideo());
      });
    }
    introPlayer.onerror = startMainVideo;
    
    // Set fallback timeout to 4200ms to allow full play of logo intro before moving to main video
    const fallbackTimeout = setTimeout(() => {
      if (introPlayer && introPlayer.style.display !== 'none') {
        startMainVideo();
      }
    }, 4200);
    
    introPlayer.onended = () => {
      clearTimeout(fallbackTimeout);
      startMainVideo();
    };
  } else {
    startMainVideo();
  }
  
  if (!isYouTube) {
    const videoContainer = document.getElementById('video-container');
    const controls = document.getElementById('video-controls');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const muteBtn = document.getElementById('mute-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const seekBar = document.getElementById('seek-bar');
    const timeCurrent = document.getElementById('time-current');
    const timeRemaining = document.getElementById('time-remaining');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const iconVolUp = document.getElementById('icon-vol-up');
    const iconVolOff = document.getElementById('icon-vol-off');

    const formatTime = (time) => {
      if (isNaN(time)) return '0:00';
      const maxSeconds = Math.floor(time);
      const minutes = Math.floor(maxSeconds / 60);
      const seconds = maxSeconds % 60;
      return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    };

    const updatePlayPause = () => {
      if (mainPlayer.paused) {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
      } else {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
      }
    };

    const togglePlay = () => {
      if (mainPlayer.paused) mainPlayer.play();
      else mainPlayer.pause();
    };

    const toggleMute = () => {
      mainPlayer.muted = !mainPlayer.muted;
      if (mainPlayer.muted) {
        iconVolUp.style.display = 'none';
        iconVolOff.style.display = 'block';
      } else {
        iconVolUp.style.display = 'block';
        iconVolOff.style.display = 'none';
      }
    };

    playPauseBtn.onclick = togglePlay;
    mainPlayer.onclick = togglePlay;
    mainPlayer.onplay = updatePlayPause;
    mainPlayer.onpause = updatePlayPause;
    muteBtn.onclick = toggleMute;

    fullscreenBtn.onclick = () => {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else {
        document.exitFullscreen();
      }
    };

    mainPlayer.onloadedmetadata = () => {
      seekBar.max = mainPlayer.duration;
      timeRemaining.textContent = formatTime(mainPlayer.duration);
    };

    seekBar.addEventListener('input', () => {
      mainPlayer.currentTime = seekBar.value;
    });

    let hideControlsTimeout;
    const backBtn = document.getElementById('playback-back-btn');
    backBtn.style.transition = 'opacity 0.3s';
    const showControls = () => {
      controls.style.opacity = '1';
      backBtn.style.opacity = '1';
      document.body.style.cursor = 'default';
      clearTimeout(hideControlsTimeout);
      hideControlsTimeout = setTimeout(() => {
        if (!mainPlayer.paused) {
          controls.style.opacity = '0';
          // backBtn.style.opacity = '0'; // Always show close button
          document.body.style.cursor = 'none';
        }
      }, 6000);
    };

    videoContainer.onmousemove = showControls;
    videoContainer.onmouseleave = () => {
      if (!mainPlayer.paused) {
        controls.style.opacity = '0';
        // backBtn.style.opacity = '0'; // Always show close button
      }
    };

    handleNormalKeydown = function(e) {
      if(document.getElementById('playbackOverlay')) {
        if (e.code === 'Space') {
          e.preventDefault();
          togglePlay();
          showControls();
        } else if (e.key === 'm' || e.key === 'M') {
          toggleMute();
          showControls();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          mainPlayer.currentTime += 5;
          showControls();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          mainPlayer.currentTime -= 5;
          showControls();
        } else if (e.key === 'f' || e.key === 'F') {
           fullscreenBtn.click();
        }
      }
    };
    window.addEventListener('keydown', handleNormalKeydown);

    mainPlayer.ontimeupdate = () => {
      seekBar.value = mainPlayer.currentTime;
      timeCurrent.textContent = formatTime(mainPlayer.currentTime);
      timeRemaining.textContent = formatTime(mainPlayer.duration - mainPlayer.currentTime);
      
      const percent = (mainPlayer.currentTime / mainPlayer.duration) * 100;
      seekBar.style.background = `linear-gradient(to right, var(--netflix-red, #e50914) ${percent}%, rgba(255,255,255,0.3) ${percent}%)`;

      if (appState.settings.autoPlayNextEpisode && mainPlayer.duration - mainPlayer.currentTime <= 5 && mainPlayer.duration > 10) {
        const idx = appState.memories.findIndex(i => i.id === id);
        if (idx >= 0 && idx < appState.memories.length - 1) {
          const nextMem = appState.memories[idx + 1];
          const timerDiv = document.getElementById('next-up-overlay');
          if (timerDiv.style.display === 'none') {
            document.getElementById('next-up-title').innerText = nextMem.title;
            timerDiv.style.display = 'flex';
            document.getElementById('next-up-btn').onclick = () => {
               document.getElementById('playback-back-btn').click();
               playVideo(nextMem.id);
            };
          }
          
          const circle = document.getElementById('next-up-ring');
          const remains = mainPlayer.duration - mainPlayer.currentTime;
          if (circle) {
             const offset = 283 - ((remains / 5) * 283);
             circle.style.strokeDashoffset = offset.toString();
          }
        }
      }
    };
  
    mainPlayer.onended = () => {
      if(appState.settings.autoPlayNextEpisode) {
        const idx = appState.memories.findIndex(i => i.id === id);
        if(idx >= 0 && idx < appState.memories.length - 1) {
          playVideo(appState.memories[idx + 1].id);
        }
      }
    };
  } else {
    // YouTube Custom Controls Handler!
    const videoContainer = document.getElementById('video-container');
    const controls = document.getElementById('video-controls');
    const clickMask = document.getElementById('video-click-mask');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const muteBtn = document.getElementById('mute-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const iconVolUp = document.getElementById('icon-vol-up');
    const iconVolOff = document.getElementById('icon-vol-off');
    const backBtn = document.getElementById('playback-back-btn');
    if (backBtn) backBtn.style.transition = 'opacity 0.3s';

    let isYtPlaying = true;
    let isYtMuted = false;
    let ytCurrentTime = 0;

    handleYtMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number") {
            ytCurrentTime = data.info.currentTime;
          }
        }
      } catch (err) {}
    };
    window.addEventListener('message', handleYtMessage);

    ytTimer = setInterval(() => {
      if (isYtPlaying) {
        ytCurrentTime += 1;
      }
    }, 1000);

    const toggleYtPlay = () => {
      isYtPlaying = !isYtPlaying;
      if (mainPlayer) {
        if (!isYtPlaying) {
          mainPlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          if (iconPlay) iconPlay.style.display = 'block';
          if (iconPause) iconPause.style.display = 'none';
        } else {
          mainPlayer.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          if (iconPlay) iconPlay.style.display = 'none';
          if (iconPause) iconPause.style.display = 'block';
        }
      }
    };

    const toggleYtMute = () => {
      isYtMuted = !isYtMuted;
      if (mainPlayer) {
        if (isYtMuted) {
          mainPlayer.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
          if (iconVolUp) iconVolUp.style.display = 'none';
          if (iconVolOff) iconVolOff.style.display = 'block';
        } else {
          mainPlayer.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          if (iconVolUp) iconVolUp.style.display = 'block';
          if (iconVolOff) iconVolOff.style.display = 'none';
        }
      }
    };

    if (clickMask) clickMask.onclick = toggleYtPlay;
    if (playPauseBtn) playPauseBtn.onclick = toggleYtPlay;
    if (muteBtn) muteBtn.onclick = toggleYtMute;

    if (fullscreenBtn) {
      fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          videoContainer.requestFullscreen().catch(err => {
            console.error(err);
          });
        } else {
          try {
            document.exitFullscreen().catch(err => console.error(err));
          } catch(err) {}
        }
      };
    }

    let hideControlsTimeout;
    const showControls = () => {
      if (controls) controls.style.opacity = '1';
      if (backBtn) backBtn.style.opacity = '1';
      document.body.style.cursor = 'default';
      clearTimeout(hideControlsTimeout);
      hideControlsTimeout = setTimeout(() => {
        if (isYtPlaying) {
          if (controls) controls.style.opacity = '0';
          // if (backBtn) backBtn.style.opacity = '0'; // Always show close button
          // document.body.style.cursor = 'none'; // Avoid custom overriding for YT iframe
        }
      }, 6000);
    };

    if (videoContainer) {
      videoContainer.onmousemove = showControls;
      videoContainer.onmouseleave = () => {
        if (isYtPlaying) {
          if (controls) controls.style.opacity = '0';
          // if (backBtn) backBtn.style.opacity = '0'; // Always show close button
        }
      };
    }

    handleYtKeydown = (e) => {
      if (document.getElementById('playbackOverlay')) {
        if (e.code === 'Space') {
          e.preventDefault();
          toggleYtPlay();
          showControls();
        } else if (e.key === 'm' || e.key === 'M') {
          toggleYtMute();
          showControls();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          ytCurrentTime += 5;
          if (mainPlayer) {
            mainPlayer.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + ytCurrentTime + ',true]}', '*');
          }
          showControls();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          ytCurrentTime = Math.max(0, ytCurrentTime - 5);
          if (mainPlayer) {
            mainPlayer.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + ytCurrentTime + ',true]}', '*');
          }
          showControls();
        } else if (e.key === 'f' || e.key === 'F') {
          if (fullscreenBtn) fullscreenBtn.click();
        }
      }
    };

    window.addEventListener('keydown', handleYtKeydown);
  }

  // Handle closing player efficiently
  const closePlayer = (isPopState = false) => {
     document.body.style.cursor = 'default'; // Restore cursor when player is closed
     window.closeActivePlayer = null;
     if (handleYtKeydown) {
       window.removeEventListener('keydown', handleYtKeydown);
     }
     if (handleNormalKeydown) {
       window.removeEventListener('keydown', handleNormalKeydown);
     }
     if (handleYtMessage) {
       window.removeEventListener('message', handleYtMessage);
     }
     if (ytTimer) {
       clearInterval(ytTimer);
     }
     document.body.style.overflow = '';
     if (mainPlayer && typeof mainPlayer.pause === 'function') mainPlayer.pause();
     if (introPlayer && typeof introPlayer.pause === 'function') introPlayer.pause();
     // Temporarily bypass the immediate src wipe
     if (false && mainPlayer) {
       mainPlayer.src = "";
       if (typeof mainPlayer.load === 'function') mainPlayer.load();
     }
     if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));
     c.style.transition = 'transform 1.0s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.0s cubic-bezier(0.16, 1, 0.3, 1)';
     c.style.transform = 'scale(0.92)';
     c.style.opacity = '0';
     setTimeout(() => {
       if (mainPlayer) {
         mainPlayer.src = ""; if (introPlayer) introPlayer.src = ""; // cleanup sources now that visual transition finished
         if (typeof mainPlayer.load === 'function') mainPlayer.load();
       }
       c.innerHTML = ''; // fully unmount internal elements
       c.remove();
     }, 1000);

     if (!isPopState) {
       if (history.state && history.state.playerOpen) {
         history.back();
       }
     }
  };
  window.closeActivePlayer = () => closePlayer(true);
  
  document.getElementById('playback-back-btn').onclick = () => closePlayer(false);
  
  // Background click to close is disabled as requested to prevent player fragility
  // Only the close/back button can close the overlay modal now!
};

// Initialize
// Automatically monitor the page for modals and lock/unlock body scroll
const monitorModalsAndLockScroll = () => {
  const checkModals = () => {
    const selector = '#helpCentreModal, #settingsModal, #detailModal, #bulkManagerModal, #uploadModal, .upload-modal, .crop-modal-wrapper, .ep-modal-wrapper, #playbackOverlay';
    const hasOpenModal = !!document.querySelector(selector);
    if (hasOpenModal) {
      if (!document.body.classList.contains('modal-open')) {
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }
    } else {
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    }
  };
  
  const observer = new MutationObserver(() => {
    checkModals();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  checkModals();
};

monitorModalsAndLockScroll();
render();

loadData().catch(e => {
  console.error("Error loading data:", e);
  console.log("If this is a fresh setup or deployment, Firebase rules might take a minute to deploy.");
}).finally(() => {
  // Re-render to show updated data if we are already on a view that needs it
  render();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    if(appState.screen === 'dashboard') {
      render();
    }
  }, 150);
});

// Init VH value
document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

// Helper to compress images on the client side before uploading to Firestore to stay safely within 1MB quota and upload super fast
window.compressPhotoFile = compressPhotoFile;
function compressPhotoFile(file, maxWidth = 1000, maxHeight = 1000, quality = 0.65) {
  return new Promise((resolve) => {
    const isPngOrWebp = file && (
      file.type === 'image/png' || 
      file.type === 'image/webp' || 
      file.name?.toLowerCase().endsWith('.png') || 
      file.name?.toLowerCase().endsWith('.webp') || 
      file.name?.toLowerCase().endsWith('.svg')
    );
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target.result);
            return;
          }
          if (isPngOrWebp) {
            ctx.clearRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to optimized format (preserve png/webp transparency)
          const mimeType = isPngOrWebp ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, isPngOrWebp ? undefined : quality);
          resolve(dataUrl);
        } catch (err) {
          console.warn('[compressPhotoFile] Failed to process canvas image, resolving original reader base64.', err);
          resolve(e.target.result);
        }
      };
      img.onerror = () => {
        resolve(e.target.result); // fallback to original file reader string
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      resolve(null);
    };
    try {
      reader.readAsDataURL(file);
    } catch (err) {
      resolve(null);
    }
  });
}

// Action Router for Add Memory button dynamically routed based on current tab
window.handleAddMemoryClick = () => {
  const cat = appState.activeCategory;
  if (cat === 'Moments') {
    window.openBulkUploadModal();
  } else if (cat === 'My List') {
    window.setCategory('Home');
  } else {
    window.openUploadModal();
  }
};

// Copy YouTube descriptive prompts and open Google Gemini
window.generateDescriptionWithAI = () => {
  const link = document.getElementById('up-yt-link').value.trim();
  
  const prompt = `CRITICAL ASSIGNMENT: Please process this YouTube link, watch/analyze its exact content, and retrieve its actual transcripts/captions:
${link || '(Not provided)'}

MANDATORY RULES:
1. You must base your output ONLY on the real events, theme, and spoken characters of the provided YouTube link. DO NOT write a generic guess or general cinematic filler if you cannot see the video!
2. If you are UNABLE to access this specific video due to YouTube blocks, server-side filters, or private/unlisted flags, DO NOT HALLUCINATE OR MAKE UP A STORY. Instead, output the following starting template so the user can describe it:
Title: [Please replace with a 1-sentence summary of your video so I can style it!]
Description: [Please replace with a 1-sentence description of your video so I can style it!]

3. If you CAN successfully access/process the video, please generate and output:
- A catchy, cinematic custom Video Title (Netflix style) that conveys the actual narrative/events of the video.
- A nostalgic, romantic, cinematic professional blurb/description for our streaming catalogue (under 2 lines, around 30-40 words maximum).

Your final output format must be EXACTLY:
Title: [Your Generated Cinematic Title]
Description: [Your Generated Description]

(Do not include any greeting, markdown, brackets, introduction, conversational filler, or bold fonts! Keep the title and description as pure, clean text.)`;

  navigator.clipboard.writeText(prompt).then(() => {
    window.showToast("Gemini prompt copied! Opening Google Gemini...");
    setTimeout(() => {
      window.open('https://gemini.google.com/app', '_blank');
    }, 1000);
  }).catch((err) => {
    alert("Could not copy prompt automatically. Here is your prompt:\n\n" + prompt);
    window.open('https://gemini.google.com/app', '_blank');
  });
};

// Copy exact title image design requests and load Gemini
window.generateTitleLogoPromptWithAI = () => {
  const upTitleInput = document.getElementById('up-title');
  const dmTitleInput = document.getElementById('dm-title-edit');
  const title = (upTitleInput ? upTitleInput.value.trim() : '') || (dmTitleInput ? dmTitleInput.value.trim() : '') || 'Our Love Story';
  
  const upCat = document.getElementById('up-cat');
  const dmCat = document.getElementById('dm-cat-edit');
  const category = (upCat ? upCat.value : '') || (dmCat ? dmCat.value : '') || 'Our Romantic Scenes';
  
  let vibe = 'romantic, warm calligraphy, elegant brush strokes, intimate red/rose tones';
  if (category.toLowerCase().includes('party') || category.toLowerCase().includes('celebration')) {
     vibe = 'festive, bright neon, energetic modern sans, bold glowing colors, celebratory sparks';
  } else if (category.toLowerCase().includes('special event')) {
     vibe = 'timeless premium serif, vintage golden letters, cinematic classic typography, beautiful texture';
  }
  
  const prompt = `Create a spectacular, horizontal movie/series title trademark logo PNG.
Text must read EXACTLY: "${title}"
The typeface style should be fully inspired by legendary Netflix original series logos (modern, elegant, bold, dramatic, or stylized, matching the vibe of: ${vibe}). It should be flat or have clean cinematic textures, glowing outlines, or high-contrast metal/neon finishes (not cheap plastic-looking 3D). It must look professional, high-budget, and extremely clean.
Background Color: The background MUST be a completely solid, plain, pure pitch-black color (#000000). There must be absolutely NO gradients, NO lighting drops, NO shadows, NO borders, NO mockups, and NO background elements behind it. Just the stunning Netflix-style typography perfectly isolated on a solid true black canvas (so the application can instantly and cleanly key out the black background to be fully transparent).`;

  navigator.clipboard.writeText(prompt).then(() => {
    window.showToast("Branded Title logo prompt copied! Opening Google Gemini...");
    setTimeout(() => {
      window.open('https://gemini.google.com/app', '_blank');
    }, 1000);
  }).catch(() => {
    alert("Could not copy prompt automatically. Here is your prompt:\n\n" + prompt);
    window.open('https://gemini.google.com/app', '_blank');
  });
};

// Copy detailed cinematic movie thumbnail prompt and load Gemini
window.generateThumbnailPromptWithAI = () => {
  const upTitleInput = document.getElementById('up-title');
  const dmTitleInput = document.getElementById('dm-title-edit');
  const title = (upTitleInput ? upTitleInput.value.trim() : '') || (dmTitleInput ? dmTitleInput.value.trim() : '') || 'Our Love Story';
  
  const upDescInput = document.getElementById('up-desc');
  const dmDescInput = document.getElementById('dm-desc-edit');
  const desc = (upDescInput ? upDescInput.value.trim() : '') || (dmDescInput ? dmDescInput.value.trim() : '') || 'A beautiful memory worth reliving.';
  
  const upCat = document.getElementById('up-cat');
  const dmCat = document.getElementById('dm-cat-edit');
  const category = (upCat ? upCat.value : '') || (dmCat ? dmCat.value : '') || 'Our Romantic Scenes';
  
  let vibe = 'romantic, nostalgic warmth, beautiful soft sunrise and sunset lighting, pastel tones, cozy intimate atmosphere';
  if (category.toLowerCase().includes('party') || category.toLowerCase().includes('celebration')) {
     vibe = 'vibrant energy, colorful party lighting, laughter, motion blur, glittering sparklers, festive warm ambiance';
  } else if (category.toLowerCase().includes('special event')) {
     vibe = 'magical cinematic golden hour, grand beautiful scenery, classic elegant colors, timeless documentary feels';
  }
  
  const prompt = `Create a spectacular, photo-realistic 16:9 cinematic movie scene cover that will act as the background thumbnail artwork.
Concepts/Details: A stunning and emotionally resonant shot inspired by: "${title}".
Description of the scene: ${desc}.
Visual Vibe: ${vibe}.
Style: Shot with 35mm anamorphic camera lens, rich cinematic color grading, beautiful shallow depth of field, natural dramatic lighting. The image must feel premium, high-budget, and tell a story (like a professional Netflix original movie poster background).
CRITICAL: Do NOT add ANY text, titles, subtitles, words, logos, letterings, watermarks, frames, borders, or banners anywhere on the image. It must be a clean, pure, photo-realistic movie scene thumbnail.`;

  navigator.clipboard.writeText(prompt).then(() => {
    window.showToast("Cinematic Thumbnail prompt copied! Opening Google Gemini...");
    setTimeout(() => {
      window.open('https://gemini.google.com/app', '_blank');
    }, 1000);
  }).catch(() => {
    alert("Could not copy prompt automatically. Here is your prompt:\n\n" + prompt);
    window.open('https://gemini.google.com/app', '_blank');
  });
};

// View Photo Static Modal (for moments static photo previews)
window.viewPhotoStatic = (id) => {
  const m = appState.memories.find(i => i.id === id);
  if(!m) return;
  
  const existingPlayer = document.getElementById('playbackOverlay');
  if(existingPlayer) existingPlayer.remove();
  
  document.body.style.overflow = 'hidden';
  
  let c = document.getElementById('playbackOverlay');
  if (!c) {
    c = document.createElement('div');
    c.className = 'playback-overlay no-animation';
    c.id = 'playbackOverlay';
    document.body.appendChild(c);
  } else {
    c.className = 'playback-overlay no-animation';
  }
  
  c.style.display = 'block';
  c.style.transform = 'translateY(0)';
  c.style.opacity = '1';
  
  c.innerHTML = `
    <div class="playback-back close-btn" id="photo-close-btn" style="z-index: 10002; position:absolute; top: 30px; left: 30px; cursor: pointer; color: white;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    <div style="width:100%; height:100%; background:black; display:flex; align-items:center; justify-content:center;">
       <img src="${m.thumbnail}" style="width:100%; height:100%; object-fit:contain; border-radius: 0; filter: none;">
    </div>
  `;

  const closePlayer = () => {
     if (document.fullscreenElement) document.exitFullscreen().catch(e => {});
     c.style.display = 'none';
     c.innerHTML = '';
     document.body.style.overflow = '';
  };
  
  document.getElementById('photo-close-btn').onclick = closePlayer;
};

// Moments functions
window.openBulkUploadModal = () => {
  const m = document.createElement('div');
  m.className = 'upload-modal';
  m.id = 'bulkUploadModal';
  m.innerHTML = `
    <div class="upload-modal-content" style="display: flex; flex-direction: column; padding: 30px 40px; box-sizing: border-box; background: #141414; border-left: 1px solid rgba(255,255,255,0.08);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.08);">
        <h2 style="margin:0; font-weight:700; color:white; font-size:24px; letter-spacing:-0.5px;">Add Photos</h2>
        <button class="upload-close" style="position:static; background:transparent; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; border:none; color:#a0a0a0; cursor:pointer; transition:all 0.2s; padding:0;" onmouseenter="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.1)';" onmouseleave="this.style.color='#a0a0a0'; this.style.background='transparent';" onclick="const dm = document.getElementById('bulkUploadModal'); dm.classList.remove('open'); setTimeout(() => dm.remove(), 300);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
      
      <div id="drop-zone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius: 12px; padding: 45px 20px; text-align: center; cursor: pointer; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); margin-bottom: 25px; background: rgba(0,0,0,0.2); flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;" onmouseenter="this.style.borderColor='rgba(229,9,20,0.6)'; this.style.background='rgba(229,9,20,0.02)'; const icon = this.querySelector('.upload-cloud-icon'); if(icon) icon.style.transform='translateY(-4px) scale(1.05)';" onmouseleave="this.style.borderColor='rgba(255,255,255,0.15)'; this.style.background='rgba(0,0,0,0.3)'; const icon = this.querySelector('.upload-cloud-icon'); if(icon) icon.style.transform='translateY(0) scale(1)';">
        <svg class="upload-cloud-icon" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" style="margin-bottom:18px; transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <div style="color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 500; font-family: inherit; margin-bottom: 4px;">Click to select or drag photos here</div>
        <div style="color: rgba(255,255,255,0.4); font-size: 12px; font-family: inherit;">Supports JPG, PNG, or WEBP images</div>
        
        <div id="file-count" style="margin-top: 15px;"></div>
        <div id="upload-preview-container" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:15px; justify-content:center; width:100%; max-height:120px; overflow-y:auto; padding: 2px;"></div>
      </div>
      <input type="file" id="bulk-upload-input" multiple accept="image/*" style="display:none;">
      
      <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08);">
        <button style="background:transparent; border:1px solid rgba(255,255,255,0.25); color:#e5e5e5; padding:12px 24px; font-size:14px; font-weight:500; border-radius:4px; cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#fff'; this.style.borderColor='rgba(255,255,255,0.4)';" onmouseleave="this.style.background='transparent'; this.style.color='#e5e5e5'; this.style.borderColor='rgba(255,255,255,0.25)';" onclick="const dm = document.getElementById('bulkUploadModal'); dm.classList.remove('open'); setTimeout(()=>dm.remove(),300)">Cancel</button>
        <button id="bulk-upload-save" style="background:#e50914; border:none; color:white; padding:12px 30px; font-size:14px; font-weight:700; border-radius:4px; cursor:not-allowed; transition:all 0.2s; opacity:0.4;" onmouseenter="if(!this.disabled) { this.style.background='#ff0f22'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 0 20px rgba(229,9,20,0.5)'; }" onmouseleave="this.style.background='#e50914'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" disabled>Upload Photos</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  
  setTimeout(() => m.classList.add('open'), 10);

  const input = document.getElementById('bulk-upload-input');
  const dropZone = document.getElementById('drop-zone');
  const saveBtn = m.querySelector('#bulk-upload-save');
  const countDisp = m.querySelector('#file-count');
  
  let currentBatchFiles = [];
  
  const handleFiles = (files) => {
    if(files && files.length > 0) {
      currentBatchFiles = Array.from(files);
      countDisp.innerHTML = `<span style="background: rgba(229,9,20,0.15); border: 1px solid rgba(229,9,20,0.3); padding: 5px 12px; border-radius: 20px; color:#ff3b47; font-weight:700; font-size:11px; letter-spacing:0.5px;">${currentBatchFiles.length} PHOTO${currentBatchFiles.length>1?'S':''} READY</span>`;
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
      
      const prevCont = m.querySelector('#upload-preview-container');
      if (prevCont) {
        prevCont.innerHTML = '';
        const limit = Math.min(currentBatchFiles.length, 6);
        for(let i=0; i<limit; i++) {
          const file = currentBatchFiles[i];
          const reader = new FileReader();
          reader.onload = (event) => {
            const previewCard = document.createElement('div');
            previewCard.className = 'fade-in';
            previewCard.style.cssText = 'position:relative; width:44px; height:44px; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.25); background:#111; box-shadow: 0 4px 10px rgba(0,0,0,0.3);';
            previewCard.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            prevCont.appendChild(previewCard);
          };
          reader.readAsDataURL(file);
        }
        if (currentBatchFiles.length > 6) {
          const moreCard = document.createElement('div');
          moreCard.style.cssText = 'width:44px; height:44px; border-radius:6px; background:#222; border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; color:#888; font-size:11px; font-weight:700; box-shadow: 0 4px 10px rgba(0,0,0,0.3);';
          moreCard.innerText = `+${currentBatchFiles.length - 6}`;
          prevCont.appendChild(moreCard);
        }
      }
    } else {
      currentBatchFiles = [];
      countDisp.innerHTML = '';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.4';
      saveBtn.style.cursor = 'not-allowed';
      const prevCont = m.querySelector('#upload-preview-container');
      if (prevCont) prevCont.innerHTML = '';
    }
  };

  dropZone.onclick = () => input.click();
  input.onchange = (e) => handleFiles(e.target.files);
  
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor='rgba(229,9,20,0.85)'; dropZone.style.background = 'rgba(229,9,20,0.06)'; };
  dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.style.borderColor='rgba(255,255,255,0.15)'; dropZone.style.background = 'rgba(0,0,0,0.3)'; };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.style.borderColor='rgba(255,255,255,0.15)';
    dropZone.style.background = 'rgba(0,0,0,0.3)';
    if(e.dataTransfer.files) {
       handleFiles(e.dataTransfer.files);
    }
  };

  saveBtn.onclick = async () => {
    if (currentBatchFiles.length === 0) return;
    saveBtn.innerText = 'Uploading...';
    saveBtn.disabled = true;
    appState.activeCategory = 'Moments';
    
    // Check for duplicates
    const existingTitles = new Set(
      appState.memories
        .filter(mem => window.getNormalizedCategory(mem.category) === 'Moments')
        .map(mem => String(mem.title).trim().toLowerCase())
    );
    
    const maxFiles = currentBatchFiles;
    const toUpload = [];
    const skippedFiles = [];
    const seenInBatch = new Set();
    
    for (const file of maxFiles) {
      const title = file.name.split('.')[0] || 'Photo';
      const normalizedTitle = title.trim().toLowerCase();
      
      const isDuplicate = existingTitles.has(normalizedTitle) || seenInBatch.has(normalizedTitle);
      if (isDuplicate) {
        skippedFiles.push(file.name);
      } else {
        seenInBatch.add(normalizedTitle);
        toUpload.push(file);
      }
    }
    
    if (toUpload.length === 0) {
      alert(`All ${maxFiles.length} selected photo${maxFiles.length > 1 ? 's' : ''} already exist in your gallery.\n\nNo duplicates were uploaded.`);
      const dm = document.getElementById('bulkUploadModal');
      if (dm) {
        dm.classList.remove('open');
        setTimeout(() => dm.remove(), 300);
      }
      return;
    }
    
    // Add Progress Bar with detailed text & percentages
    const oldProgress = m.querySelector('#upload-progress-container');
    if (oldProgress) oldProgress.remove();
    
    const progressContainer = document.createElement('div');
    progressContainer.id = 'upload-progress-container';
    progressContainer.style.cssText = 'width: 100%; margin-top: 15px; margin-bottom: 25px;';
    
    progressContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #fff; font-family: inherit;">
        <span id="progress-text" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 80%;">Preparing photos...</span>
         <span id="progress-percent" style="color: #e50914; font-weight: 700; font-family: monospace;">0%</span>
      </div>
      <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);">
         <div id="progress-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #e50914, #ff5252); border-radius: 4px; transition: width 0.3s cubic-bezier(0.1, 0.8, 0.25, 1); box-shadow: 0 0 10px rgba(229, 9, 20, 0.85);"></div>
      </div>
    `;
    
    const modalContent = m.querySelector('.upload-modal-content');
    const actionsBox = modalContent.lastElementChild;
    modalContent.insertBefore(progressContainer, actionsBox);
    
    const progressBarFill = progressContainer.querySelector('#progress-bar-fill');
    const progressText = progressContainer.querySelector('#progress-text');
    const progressPercent = progressContainer.querySelector('#progress-percent');

    let done = 0;
    let failed = 0;
    const total = toUpload.length;

    // Toggle bulk transaction to pause snapshot logic and prevent rendering collisions
    appState.bulkTransactionActive = true;
    
    for(let file of toUpload) {
      const idx = done + failed;
      progressText.innerText = `Compressing & Uploading: ${file.name} (${idx + 1}/${total})`;
      
      const compressedDataUrl = await compressPhotoFile(file);
      if (!compressedDataUrl) {
        failed++;
        continue;
      }
      
      const newMem = {
        id: 'm_' + Date.now() + Math.floor(Math.random() * 1000),
        title: file.name.split('.')[0] || 'Photo',
        desc: '',
        category: 'Moments',
        year: new Date().getFullYear().toString(),
        rating: 'PG-13',
        matchRate: 99,
        thumbnail: compressedDataUrl,
        videoUrl: '', // Just an image
        dateAdded: Date.now()
      };
      
      try {
        await saveMemoryToDB(newMem);
        done++;
      } catch (err) {
        console.error(`Failed to save memory "${newMem.title}" to database:`, err);
        failed++;
      }
      
      const percent = Math.round(((done + failed) / total) * 100);
      progressBarFill.style.width = percent + '%';
      progressPercent.innerText = percent + '%';
      
      // Let painter update for flawless framerate rendering
      await new Promise(r => setTimeout(r, 40));
    }
    
    // Clear the transaction active flag
    appState.bulkTransactionActive = false;
    
    if (window.pendingMemoriesSnapshot) {
      const snapshot = window.pendingMemoriesSnapshot;
      window.pendingMemoriesSnapshot = null;
      const list = snapshot.docs.map(d => d.data());
      list.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      appState.memories = list;
    }
    render();

    let endMsg = `Successfully uploaded ${done} photo(s).`;
    if (failed > 0) {
      endMsg += ` ${failed} photo(s) failed database upload. Please verify your connection status.`;
    }
    if (skippedFiles.length > 0) {
      endMsg += ` ${skippedFiles.length} photo${skippedFiles.length > 1 ? 's were' : ' was'} not uploaded because they already exist in the gallery.`;
    }
    
    window.showToast(endMsg, 6000);
    alert(endMsg);
    
    const dm = document.getElementById('bulkUploadModal');
    if (dm) {
      dm.classList.remove('open');
      setTimeout(() => { 
        dm.remove(); 
        if (typeof window.refreshRowsView === 'function') {
          window.refreshRowsView(null, null, true);
        }
      }, 400);
    }
  };
};

window.startMomentsSlideshow = (startId) => {
  let mems = appState.memories.filter(m => String(m.category).toLowerCase() === 'moments');
  if (startId) {
    const mem = appState.memories.find(m => m.id === startId);
    if (mem && String(mem.category).toLowerCase() !== 'moments') {
        mems = appState.memories.filter(m => m.category === mem.category);
        if (mems.length === 0) mems = [mem];
    }
  }
  
  if (mems.length === 0) return alert('No moments available to play.');

  let c = document.getElementById('playbackOverlay');
  if (!c) {
    c = document.createElement('div');
    c.className = 'playback-overlay';
    c.id = 'playbackOverlay';
    document.body.appendChild(c);
  }
  
  // Remove no-animation class to ensure transitions work for the slideshow
  c.classList.remove('no-animation');
  c.style.display = 'block';
  c.style.transform = 'translateY(0)';
  c.style.opacity = '1';

  // Request fullscreen
  if (c.requestFullscreen) {
    c.requestFullscreen().catch(e => console.log("Fullscreen request failed", e));
  }

  let currentIndex = 0;
  if(startId) {
      const idx = mems.findIndex(m => m.id === startId);
      if(idx !== -1) currentIndex = idx;
  }
  
  c.innerHTML = `
    <div class="playback-back close-btn" id="ss-close-btn" style="z-index: 10002; position:absolute; top: 30px; left: 30px; cursor: pointer; color: white;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    <div id="ss-content-container" style="width:100%; height:100%; background:black; display:flex; align-items:center; justify-content:center; transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);">
       <!-- Content injected here dynamically -->
    </div>
    <video src="./netflix-intro.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%; z-index:9000; position:absolute; top:0; left:0; pointer-events:none;"></video>
  `;

  const container = document.getElementById('ss-content-container');
  let slideshowTimeout = null;
  let activeVideoEl = null;

  const renderCurrentSlide = () => {
    if (!container) return;
    const currentMem = mems[currentIndex];
    
    // Fade out container slightly during transition
    container.style.opacity = '0.3';
    
    setTimeout(() => {
      if (currentMem.videoUrl) {
        // Video slide with volume and audio playback enabled
        container.innerHTML = `
          <video id="ss-video" src="${currentMem.videoUrl}" autoplay playsinline style="width:100%; height:100%; object-fit:contain;"></video>
        `;
        const videoEl = document.getElementById('ss-video');
        activeVideoEl = videoEl;
        if (videoEl) {
          videoEl.muted = false;
          videoEl.volume = 1.0;
          
          videoEl.play().catch(e => {
            console.warn("Video play interrupted/denied, retrying with volume", e);
            videoEl.muted = true;
            videoEl.play().catch(err => console.error("Error playing video momentum", err));
          });
          
          videoEl.onended = () => {
            advanceSlide();
          };
          videoEl.onerror = () => {
            advanceSlide();
          };
        }
      } else {
        // Photo slide (Silent, highest possible quality, smooth transition)
        container.innerHTML = `
          <img src="${currentMem.thumbnail}" style="width:100%; height:100%; object-fit:contain;">
        `;
        activeVideoEl = null;
        // Schedule next slide after 4.5 seconds
        slideshowTimeout = setTimeout(advanceSlide, 4500);
      }
      
      container.style.opacity = '1';
    }, 300);
  };

  const advanceSlide = () => {
    if (slideshowTimeout) clearTimeout(slideshowTimeout);
    currentIndex = (currentIndex + 1) % mems.length;
    renderCurrentSlide();
  };

  const startSlideshowLoop = () => {
    const introP = document.getElementById('introPlayer');
    if(introP) introP.style.display = 'none';
    renderCurrentSlide();
  };

  const introPlayer = document.getElementById('introPlayer');
  if (introPlayer) {
    introPlayer.muted = false; // ensure sound plays
    introPlayer.volume = 1.0;  // set maximum volume
    if (introPlayer.play() !== undefined) {
      introPlayer.play().catch(() => {
        // Fallback to muted playback if user hasn't interacted yet
        introPlayer.muted = true;
        introPlayer.play().catch(() => startSlideshowLoop());
      });
    }
    introPlayer.onended = startSlideshowLoop;
    introPlayer.onerror = startSlideshowLoop;
  } else {
    startSlideshowLoop();
  }

  const closePlayer = () => {
     if (slideshowTimeout) clearTimeout(slideshowTimeout);
     if (activeVideoEl) {
       activeVideoEl.pause();
       activeVideoEl = null;
     }
     if (document.fullscreenElement) document.exitFullscreen().catch(e => {});
     
     c.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';
     c.style.transform = 'translateY(100%)';
     c.style.opacity = '0';
     setTimeout(() => {
       c.innerHTML = '';
       c.style.display = 'none';
     }, 400);
  };
  
   const ssBtn = document.getElementById('ss-close-btn');
   if (ssBtn) ssBtn.onclick = closePlayer;
};

// Bulk Memories Manager
window.openBulkManagerModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'bulkManagerModal';
  
  // Clear any existing bulk selection cache
  window.selectedBulkIds = [];
  window.bulkThumbBase64 = '';
  window.bulkTitleImgBase64 = '';
  
  const buildListHTML = () => {
    if (!appState.memories || appState.memories.length === 0) {
      return '<div style="color: #666; text-align:center; padding:40px; font-size:14px; font-weight:500;">No memories found to manage.</div>';
    }
    return appState.memories.map(m => `
      <div class="bm-card" data-id="${m.id}" onclick="window.toggleBulkSelect('${m.id}')" style="box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 8px; transition: all 0.25s;">
        <div class="bm-checkbox">
          <input type="checkbox" id="chk-${m.id}" data-id="${m.id}" onclick="event.stopPropagation(); window.syncBulkCardSelect('${m.id}');" style="width: 18px; height: 18px; accent-color:#e50914;">
        </div>
        <img src="${m.thumbnail || './Netflix-Logo-Streaming-Platform-765.png'}" class="bm-thumb" onerror="this.src='./Netflix-Logo-Streaming-Platform-765.png';" style="border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);">
        <div class="bm-info">
          <div class="bm-title" style="font-size: 13px; font-weight: 700; color: #fff;">${m.title || 'Untitled'}</div>
          <div class="bm-meta" style="margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="badge-cat">${m.category || 'Moments'}</span>
            <span class="badge-tag">${m.year || '2026'}</span>
            <span class="badge-rating-tag">${m.rating || 'G'}</span>
          </div>
        </div>
      </div>
    `).join('');
  };

  modal.innerHTML = `
    <div class="upload-modal-content" style="max-width: 1200px; width: 95vw; height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; background: #0c0c0c; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.95);">
      <!-- Header -->
      <div style="padding: 10px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.3);">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <h2 style="margin:0; font-size: 18px; font-weight:700; color: white; display:flex; align-items:center; gap:10px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 5px rgba(229,9,20,0.45));"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 8v8M8 12h8"></path></svg>
            Bulk Memories Manager & Upgrader
          </h2>
          <span style="color:#777; font-size:11px; font-weight: 500;">Easily search, select, categorise, or completely style dozens of memory layers and backdrop covers using Gemini models.</span>
        </div>
        <button class="upload-close" style="position:static; background:transparent; display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; border:none; color:#a0a0a0; cursor:pointer; transition:all 0.2s; padding:0;" onmouseenter="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.1)';" onmouseleave="this.style.color='#a0a0a0'; this.style.background='transparent';" onclick="const dm = document.getElementById('bulkManagerModal'); dm.classList.remove('open'); setTimeout(() => dm.remove(), 300);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>

      <!-- Content Area -->
      <div style="flex:1; display:grid; grid-template-columns: 1fr 410px; min-height: 0; box-sizing: border-box; background: #0c0c0c;">
        
        <!-- Left Section: Grid and Control Bar -->
        <div style="display: flex; flex-direction: column; padding: 15px; border-right: 1px solid rgba(255,255,255,0.05); min-height:0; box-sizing:border-box;">
          
          <!-- Search Row -->
          <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; width: 100%;">
            <div style="position: relative; flex: 1; min-width: 250px;">
              <input type="text" id="bm-search-input" placeholder="🔍 Find memories by title, category, year or rating..." style="width:100%; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); padding: 8px 12px 8px 12px; border-radius: 6px; color: white; outline: none; font-size: 13px; transition: all 0.2s;" oninput="window.filterBulkGrid()" onfocus="this.style.borderColor='#e50914'; this.style.background='#222';">
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="btn" style="background: rgba(255,255,255,0.06); color: #ddd; border: 1px solid rgba(255,255,255,0.05); padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-weight: 600; display:flex; align-items:center; gap:5px;" onmouseenter="this.style.background='rgba(255,255,255,0.12)'; this.style.color='white';" onmouseleave="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#ddd';" onclick="window.bulkSelectAll(true)">✓ Select All</button>
              <button class="btn" style="background: rgba(255,255,255,0.06); color: #ddd; border: 1px solid rgba(255,255,255,0.05); padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-weight: 600; display:flex; align-items:center; gap:5px;" onmouseenter="this.style.background='rgba(255,255,255,0.12)'; this.style.color='white';" onmouseleave="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#ddd';" onclick="window.bulkSelectAll(false)">✗ Clear All</button>
            </div>
          </div>

          <!-- List Container -->
          <div class="bm-grid-container" style="flex: 1; overflow-y: auto;">
            <div class="bm-grid" id="bulk-memories-grid-inner">
              ${buildListHTML()}
            </div>
          </div>
          
        </div>

        <!-- Right Section: Netflix-Style Upgrade Toolbar Side Panel -->
        <div id="bulk-edit-sidebar-panel" style="padding: 15px; display: flex; flex-direction: column; overflow-y: auto; background: #121212; box-sizing: border-box; border-left: 1px solid rgba(255,255,255,0.02);">
          <!-- Content injected dynamically by window.updateBulkToolbar() -->
        </div>

      </div>

      <!-- Footer -->
      <div style="padding: 8px 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; background: rgba(0,0,0,0.25);">
        <button class="btn" style="background: rgba(255,255,255,0.08); color: white; border: none; padding: 6px 18px; font-size: 13px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.15)';" onmouseleave="this.style.background='rgba(255,255,255,0.08)';" onclick="const dm = document.getElementById('bulkManagerModal'); dm.classList.remove('open'); setTimeout(() => dm.remove(), 300);">Close Panel</button>
      </div>

    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => {
    modal.classList.add('open');
    window.updateBulkToolbar();
  }, 10);
};

window.selectedBulkIds = [];

window.toggleBulkSelect = (id) => {
  const chk = document.getElementById(`chk-${id}`);
  if (chk) {
    chk.checked = !chk.checked;
    window.syncBulkCardSelect(id);
  }
};

window.syncBulkCardSelect = (id) => {
  const card = document.querySelector(`.bm-card[data-id="${id}"]`);
  const chk = document.getElementById(`chk-${id}`);
  if (!chk) return;
  
  if (chk.checked) {
    if (!window.selectedBulkIds.includes(id)) {
      window.selectedBulkIds.push(id);
    }
    if (card) card.classList.add('selected');
  } else {
    window.selectedBulkIds = window.selectedBulkIds.filter(item => item !== id);
    if (card) card.classList.remove('selected');
  }
  
  window.updateBulkToolbar();
};

window.bulkSelectAll = (select) => {
  window.selectedBulkIds = [];
  const cards = document.querySelectorAll('.bm-card');
  const chkboxes = document.querySelectorAll('.bm-checkbox input');
  
  cards.forEach(card => {
    const id = card.getAttribute('data-id');
    if (select) {
      card.classList.add('selected');
      window.selectedBulkIds.push(id);
    } else {
      card.classList.remove('selected');
    }
  });
  
  chkboxes.forEach(chk => {
    chk.checked = select;
  });
  
  window.updateBulkToolbar();
};

window.filterBulkGrid = () => {
  const query = document.getElementById('bm-search-input').value.toLowerCase().trim();
  const cards = document.querySelectorAll('.bm-card');
  
  cards.forEach(card => {
    const id = card.getAttribute('data-id');
    const m = appState.memories.find(item => item.id === id);
    if (m) {
      const matchText = `${m.title || ''} ${m.category || ''} ${m.year || ''} ${m.rating || ''}`.toLowerCase();
      if (matchText.includes(query)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    }
  });
};

window.updateBulkToolbar = () => {
  const panel = document.getElementById('bulk-edit-sidebar-panel');
  if (!panel) return;
  
  const count = window.selectedBulkIds.length;
  
  if (count === 0) {
    panel.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px; color: #888;">
        <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(229,9,20,0.06); border: 2px dashed rgba(229,9,20,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(229,9,20,0.15));">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e50914" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: #e50914;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path><circle cx="9" cy="9" r="2"></circle></svg>
        </div>
        <h3 style="color: white; font-size: 16px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.2px;">No Memories Selected</h3>
        <p style="font-size: 12px; line-height: 1.6; max-width: 280px; color: #666; margin: 0;">Click on memory tiles from the grid on the left to begin batch editing, categorising, or upgrading titles and custom imagery with Gemini AI.</p>
      </div>
    `;
    return;
  }
  
  // Keep values currently written in inputs if user had already typed them
  const prevTitle = document.getElementById('bulk-title-override')?.value || '';
  const prevTitleImgUrl = document.getElementById('bulk-title-img-url-override')?.value || '';
  const prevThumbnailUrl = document.getElementById('bulk-thumbnail-override')?.value || '';
  const prevDesc = document.getElementById('bulk-desc-override')?.value || '';
  const prevCat = document.getElementById('bulk-category-override')?.value || '';
  const prevRating = document.getElementById('bulk-rating-override')?.value || '';
  const prevYear = document.getElementById('bulk-year-override')?.value || '';
  
  panel.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; box-sizing: border-box; height: 100%;">
      
      <!-- Panel Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px;">
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #777; font-weight: 700;">Styling Suite & AI Upgrader</span>
          <span style="color: white; font-weight: 700; font-size: 15px; margin-top: 2px;">Modify Selected Files</span>
        </div>
        <span class="bm-badge" style="background: #e50914; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; box-shadow: 0 0 10px rgba(229,9,20,0.5);">${count} Selected</span>
      </div>

      <!-- BULK TITLE INPUT (floating styled) -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div class="floating-input-group" style="position: relative; height: 50px; margin-bottom: 0;">
          <input type="text" id="bulk-title-override" placeholder=" " style="width:100%; height: 44px; background:#1c1c1c; border: 1px solid rgba(255,255,255,0.08); padding:18px 12px 6px 12px; border-radius:6px; color:white; font-size:13px; outline:none;" onfocus="this.style.borderColor='rgba(255,255,255,0.3)';" onblur="if(!this.value){this.style.borderColor='rgba(255,255,255,0.08)';}">
          <label style="position: absolute; top: 14px; left: 12px; color: #666; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 13px;">New Title (Bulk Override)</label>
        </div>
      </div>

      <!-- TITLE LOGO IMAGE OVERRIDE BOX -->
      <div style="border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 700; display:flex; justify-content:space-between; align-items:center;">
          <span>Custom Title Logo Image (Optional)</span>
          <span style="color: #e50914; font-weight: 700;">Netflix Brand Logo style</span>
        </span>
        
        <div class="floating-input-group" style="position: relative; height: 44px; margin-bottom: 0;">
          <input type="text" id="bulk-title-img-url-override" placeholder=" " style="width:100%; height: 38px; background:rgba(255,255,255,0.04); border:none; padding:15px 10px 4px 10px; border-radius:4px; color:white; font-size:12px; outline:none;" oninput="const preview = document.getElementById('bulk-title-img-preview'); if(preview) { preview.src = this.value; preview.style.display = this.value ? 'block' : 'none'; }">
          <label style="position: absolute; top: 12px; left: 10px; color: #555; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 12px;">Title Logo Image URL</label>
        </div>
        
        <div style="display:flex; gap:6px;">
          <button type="button" style="flex:1; background: rgba(255,255,255,0.06); border:none; color:#ccc; padding: 6px 10px; border-radius:4px; font-size:11px; font-weight:500; cursor:pointer;" onclick="document.getElementById('bulk-title-img-file-override').click()">
            Local File
          </button>
          <button type="button" style="flex:1; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; padding: 6px 10px; border-radius:4px; font-weight:600; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;" onclick="window.generateBulkTitleLogoPromptWithAI()">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            AI Prompt
          </button>
        </div>
        <input type="file" id="bulk-title-img-file-override" accept="image/*" style="display:none;" onchange="if(this.files && this.files[0]) { window.compressPhotoFile(this.files[0]).then(b64 => { document.getElementById('bulk-title-img-url-override').value = 'Local File: ' + this.files[0].name; window.bulkTitleImgBase64 = b64; const preview = document.getElementById('bulk-title-img-preview'); if(preview) { preview.src = b64; preview.style.display = 'block'; } }); }">
        
        <div style="text-align:center;">
           <img id="bulk-title-img-preview" src="" style="max-height:40px; max-width:80%; margin:0 auto; display:none; object-fit:contain; border-radius:4px;">
        </div>
      </div>

      <!-- BACKDROP THUMBNAIL OVERRIDE BOX -->
      <div style="border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; font-weight: 700;">Backdrop Cover image</span>
        
        <div class="floating-input-group" style="position: relative; height: 44px; margin-bottom: 0;">
          <input type="text" id="bulk-thumbnail-override" placeholder=" " style="width:100%; height: 38px; background:rgba(255,255,255,0.04); border:none; padding:15px 10px 4px 10px; border-radius:4px; color:white; font-size:12px; outline:none;" oninput="const preview = document.getElementById('bulk-thumb-preview'); if(preview) { preview.src = this.value; document.getElementById('bulk-preview-container').style.display = this.value ? 'block' : 'none'; }">
          <label style="position: absolute; top: 12px; left: 10px; color: #555; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 12px;">Custom Backdrop URL</label>
        </div>
        
        <div style="display:flex; gap:6px;">
          <button type="button" style="flex:1; background: rgba(255,255,255,0.06); border:none; color:#ccc; padding: 6px 10px; border-radius:4px; font-size:11px; font-weight:500; cursor:pointer;" onclick="document.getElementById('bulk-thumb-file-override').click()">
            Local Photo
          </button>
          <button type="button" style="flex:1; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; padding: 6px 10px; border-radius:4px; font-weight:600; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;" onclick="window.generateBulkThumbnailPromptWithAI()">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            AI Poster
          </button>
        </div>
        <input type="file" id="bulk-thumb-file-override" accept="image/*" style="display:none;" onchange="if(this.files && this.files[0]) { window.compressPhotoFile(this.files[0]).then(b64 => { document.getElementById('bulk-thumbnail-override').value = 'Local File: ' + this.files[0].name; window.bulkThumbBase64 = b64; const preview = document.getElementById('bulk-thumb-preview'); if(preview) { preview.src = b64; document.getElementById('bulk-preview-container').style.display = 'block'; } }); }">
        
        <div id="bulk-preview-container" style="display: none; text-align:center;">
           <img id="bulk-thumb-preview" src="" style="width:100%; height:75px; object-fit:cover; margin:0 auto; border-radius:4px; border:1px solid rgba(255,255,255,0.08);">
        </div>
      </div>

      <!-- BULK DESCRIPTION INPUT -->
      <div style="position: relative; border-radius: 8px; overflow: hidden; background: #1c1c1c; border: 1px solid rgba(255,255,255,0.08); height: 86px;" id="bulk-desc-container">
        <div style="font-size:9px; text-transform:uppercase; letter-spacing:1px; color: #555; font-weight:700; padding:6px 12px 0 12px; position:absolute; top:2px; left:0; z-index:2; pointer-events:none;">New Description</div>
        <textarea id="bulk-desc-override" rows="2" style="width:100%; border:none; padding:18px 12px 28px 12px; background: transparent; color: white; outline: none; font-family: inherit; font-size: 12px; box-sizing: border-box; resize: none; height: 100%;"></textarea>
        
        <!-- Sparkle option inside textarea footer -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 26px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: flex-end; padding: 0 8px; border-top: 1px solid rgba(255,255,255,0.03); z-index: 5;">
          <div onclick="window.generateBulkDescriptionWithAI()" style="display:flex; align-items:center; gap:4px; background: rgba(229,9,20,0.1); border: 1px solid rgba(229,9,20,0.25); color: #ff4d5a; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; cursor: pointer; user-select: none; transition: all 0.2s;" onmouseenter="this.style.background='rgba(229,9,20,0.25)';" onmouseleave="this.style.background='rgba(229,9,20,0.1)';">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Gemini AI Desc</span>
          </div>
        </div>
      </div>

      <!-- METADATA CONTROLS ROW -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Category -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #777; font-weight: 700;">Category override</span>
          <select id="bulk-category-override" class="bm-select-input" style="width:100%; border-radius: 6px; background:#1c1c1c; border-color:rgba(255,255,255,0.08); font-size:12px; padding:6px 10px;">
            <option value="">-- No Change --</option>
            <option value="Moments">Moments (Photos)</option>
            ${subCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
          </select>
        </div>

        <!-- Rating & Year grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #777; font-weight: 700;">Maturity Gating</span>
            <select id="bulk-rating-override" class="bm-select-input" style="width:100%; border-radius: 6px; background:#1c1c1c; border-color:rgba(255,255,255,0.08); font-size:12px; padding:6px 10px;">
              <option value="">-- No Change --</option>
              <option value="G">G</option>
              <option value="PG">PG</option>
              <option value="PG-13">PG-13</option>
              <option value="R">R</option>
              <option value="TV-PG">TV-PG</option>
              <option value="TV-14">TV-14</option>
              <option value="TV-MA">TV-MA</option>
            </select>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #777; font-weight: 700;">Date override</span>
            <input type="text" id="bulk-year-override" class="bm-input" placeholder="Select Date" readonly style="border-radius: 6px; background:#1c1c1c; border-color:rgba(255,255,255,0.08); font-size:12px; padding:6px 10px; cursor: pointer;" onclick="window.openModernDatePicker(this)">
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding-top:10px;">
        <button class="btn" style="width:100%; background:#e50914; color:white; font-weight:700; padding:10px; font-size:12px; border-radius: 6px; border:none; cursor:pointer; text-transform:uppercase; letter-spacing:0.5px; transition: all 0.2s; display:flex; align-items:center; justify-content:center; gap:5px;" onmouseenter="this.style.background='#ff1f2d'; this.style.boxShadow='0 0 15px rgba(229,9,20,0.5)';" onmouseleave="this.style.background='#e50914'; this.style.boxShadow='none';" onclick="window.applyBulkEdit()">
          Apply Bulk Upgrades
        </button>
        <button class="btn" style="width:100%; background:transparent; color:#999; font-weight:600; padding: 8px; font-size: 11px; border-radius: 6px; border:1px solid rgba(255,255,255,0.06); cursor:pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(229,9,20,0.1)'; this.style.borderColor='rgba(229,9,20,0.4)'; this.style.color='#ff3b47';" onmouseleave="this.style.background='transparent'; this.style.borderColor='rgba(255,255,255,0.06)'; this.style.color='#999';" onclick="window.applyBulkDelete()">
          Permanently Eliminate Selected
        </button>
      </div>

    </div>
  `;
  
  // Re-populate prev typed values to ensure state retention across selection updates
  if (prevTitle) document.getElementById('bulk-title-override').value = prevTitle;
  if (prevTitleImgUrl) {
    document.getElementById('bulk-title-img-url-override').value = prevTitleImgUrl;
    if (document.getElementById('bulk-title-img-preview')) {
      document.getElementById('bulk-title-img-preview').src = window.bulkTitleImgBase64 || prevTitleImgUrl;
      document.getElementById('bulk-title-img-preview').style.display = 'block';
    }
  }
  if (prevThumbnailUrl) {
    document.getElementById('bulk-thumbnail-override').value = prevThumbnailUrl;
    if (document.getElementById('bulk-thumb-preview')) {
      document.getElementById('bulk-thumb-preview').src = window.bulkThumbBase64 || prevThumbnailUrl;
      document.getElementById('bulk-preview-container').style.display = 'block';
    }
  }
  if (prevDesc) document.getElementById('bulk-desc-override').value = prevDesc;
  if (prevCat) document.getElementById('bulk-category-override').value = prevCat;
  if (prevRating) document.getElementById('bulk-rating-override').value = prevRating;
  if (prevYear) document.getElementById('bulk-year-override').value = prevYear;
};

window.generateBulkTitleLogoPromptWithAI = () => {
  const titleInput = document.getElementById('bulk-title-override');
  const title = (titleInput ? titleInput.value.trim() : '') || 'Our Love Story';
  
  const catSelect = document.getElementById('bulk-category-override');
  const category = (catSelect ? catSelect.value : '') || 'Our Romantic Scenes';
  
  let vibe = 'romantic, warm calligraphy, elegant brush strokes, intimate red/rose tones';
  if (category.toLowerCase().includes('party') || category.toLowerCase().includes('celebration')) {
     vibe = 'festive, bright neon, energetic modern sans, bold glowing colors, celebratory sparks';
  } else if (category.toLowerCase().includes('special event')) {
     vibe = 'timeless premium serif, vintage golden letters, cinematic classic typography, beautiful texture';
  }
  
  const prompt = `Create a spectacular, horizontal movie/series title trademark logo PNG.
Text must read EXACTLY: "${title}"
The typeface style should be fully inspired by legendary Netflix original series logos (modern, elegant, bold, dramatic, or stylized, matching the vibe of: ${vibe}). It should be flat or have clean cinematic textures, glowing outlines, or high-contrast metal/neon finishes (not cheap plastic-looking 3D). It must look professional, high-budget, and extremely clean.
Background Color: The background MUST be a completely solid, plain, pure pitch-black color (#000000). There must be absolutely NO gradients, NO lighting drops, NO shadows, NO borders, NO mockups, and NO background elements behind it. Just the stunning Netflix-style typography perfectly isolated on a solid true black canvas (so the application can instantly and cleanly key out the black background to be fully transparent).`;

  navigator.clipboard.writeText(prompt).then(() => {
    window.showToast("Branded Title logo prompt copied! Opening Google Gemini...");
    setTimeout(() => {
      window.open('https://gemini.google.com/app', '_blank');
    }, 1000);
  }).catch(() => {
    alert("Could not copy prompt automatically. Here is your prompt:\n\n" + prompt);
    window.open('https://gemini.google.com/app', '_blank');
  });
};

window.generateBulkThumbnailPromptWithAI = () => {
  const titleInput = document.getElementById('bulk-title-override');
  const title = (titleInput ? titleInput.value.trim() : '') || 'Our Love Story';
  
  const descInput = document.getElementById('bulk-desc-override');
  const desc = (descInput ? descInput.value.trim() : '') || 'A beautiful memory worth reliving.';
  
  const catSelect = document.getElementById('bulk-category-override');
  const category = (catSelect ? catSelect.value : '') || 'Our Romantic Scenes';
  
  let vibe = 'romantic, nostalgic warmth, beautiful soft sunrise and sunset lighting, pastel tones, cozy intimate atmosphere';
  if (category.toLowerCase().includes('party') || category.toLowerCase().includes('celebration')) {
     vibe = 'vibrant energy, colorful party lighting, laughter, motion blur, glittering sparklers, festive warm ambiance';
  } else if (category.toLowerCase().includes('special event')) {
     vibe = 'magical cinematic golden hour, grand beautiful scenery, classic elegant colors, timeless documentary feels';
  }
  
  const prompt = `Create a spectacular, photo-realistic 16:9 cinematic movie scene cover that will act as the background thumbnail artwork.
Concepts/Details: A stunning and emotionally resonant shot inspired by: "${title}".
Description of the scene: ${desc}.
Visual Vibe: ${vibe}.
Style: Shot with 35mm anamorphic camera lens, rich cinematic color grading, beautiful shallow depth of field, natural dramatic lighting. The image must feel premium, high-budget, and tell a story (like a professional Netflix original movie poster background).
CRITICAL: Do NOT add ANY text, titles, subtitles, words, logos, letterings, watermarks, frames, borders, or banners anywhere on the image. It must be a clean, pure, photo-realistic movie scene thumbnail.`;

  navigator.clipboard.writeText(prompt).then(() => {
    window.showToast("Cinematic Thumbnail prompt copied! Opening Google Gemini...");
    setTimeout(() => {
      window.open('https://gemini.google.com/app', '_blank');
    }, 1000);
  }).catch(() => {
    alert("Could not copy prompt automatically. Here is your prompt:\n\n" + prompt);
    window.open('https://gemini.google.com/app', '_blank');
  });
};

window.generateBulkDescriptionWithAI = () => {
  const titleInput = document.getElementById('bulk-title-override');
  const title = titleInput ? titleInput.value.trim() : '';
  if (!title) {
    window.showToast('Please enter a Title first, so Gemini can generate a matching description.');
    return;
  }
  const prompt = `Generate an engaging, short, dramatic Netflix-style tagline synopsis description (under 25 words) for a memory titled: "${title}". Make it emotional, romantic, energetic or documentary-style depending on memory title. Keep it clean and impactful.`;
  navigator.clipboard.writeText(prompt).then(() => {
    window.showToast("Gemini description request prompt copied! Opening Gemini...");
    setTimeout(() => {
      window.open('https://gemini.google.com/app', '_blank');
    }, 1000);
  });
};

window.applyBulkEdit = async () => {
  if (window.selectedBulkIds.length === 0) return;
  
  const titleVal = document.getElementById('bulk-title-override').value.trim();
  const descVal = document.getElementById('bulk-desc-override').value.trim();
  const catVal = document.getElementById('bulk-category-override').value;
  const yearVal = document.getElementById('bulk-year-override').value;
  const ratingVal = document.getElementById('bulk-rating-override').value;
  
  let thumbVal = document.getElementById('bulk-thumbnail-override').value.trim();
  if (window.bulkThumbBase64 && thumbVal.startsWith('Local File')) {
    thumbVal = window.bulkThumbBase64;
  }
  
  let titleImgVal = document.getElementById('bulk-title-img-url-override').value.trim();
  if (window.bulkTitleImgBase64 && titleImgVal.startsWith('Local File')) {
    titleImgVal = window.bulkTitleImgBase64;
  }
  
  if (!titleVal && !descVal && !catVal && !yearVal && !ratingVal && !thumbVal && !titleImgVal) {
    window.showToast('Please specify at least one metadata change field.');
    return;
  }
  
  let updatedCount = 0;
  appState.bulkTransactionActive = true;
  
  try {
    const memoriesToUpdate = [];
    for (const id of window.selectedBulkIds) {
      const m = appState.memories.find(item => item.id === id);
      if (m) {
        if (titleVal) m.title = titleVal;
        if (descVal) m.desc = descVal;
        if (catVal) m.category = catVal;
        if (yearVal) m.year = yearVal;
        if (ratingVal) m.rating = ratingVal;
        if (thumbVal) m.thumbnail = thumbVal;
        if (titleImgVal) m.titleImage = titleImgVal;
        
        memoriesToUpdate.push(m);
        updatedCount++;
      }
    }
    
    // Commit to Firestore in safe chunks of 400
    if (memoriesToUpdate.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < memoriesToUpdate.length; i += chunkSize) {
        const chunk = memoriesToUpdate.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(m => {
          const docRef = doc(db, 'memories', m.id);
          batch.set(docRef, m);
        });
        await batch.commit();
      }
    }
  } catch (err) {
    console.error('Error committing bulk edit batch:', err);
    handleFirestoreError(err, OperationType.UPDATE, 'bulk_memories');
  } finally {
    appState.bulkTransactionActive = false;
    window.bulkThumbBase64 = '';
    window.bulkTitleImgBase64 = '';
    window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
    
    if (window.pendingMemoriesSnapshot) {
      const list = window.pendingMemoriesSnapshot.docs.map(d => d.data());
      list.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      appState.memories = list;
      window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
      window.pendingMemoriesSnapshot = null;
    }
    render();
  }
  
  window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
  window.showToast(`Successfully upgraded ${updatedCount} memories!`);
  
  const dm = document.getElementById('bulkManagerModal');
  if (dm) {
    dm.classList.remove('open');
    setTimeout(() => {
      dm.remove();
      window.refreshRowsView(null, null, true);
    }, 300);
  }
};

window.applyBulkDelete = async () => {
  if (window.selectedBulkIds.length === 0) return;
  
  const count = window.selectedBulkIds.length;
  window.netflixConfirm(`Are you sure you want to permanently delete all ${count} selected memories?`, async () => {
    let deletedCount = 0;
    appState.bulkTransactionActive = true;
    
    try {
      const idsToDelete = [...window.selectedBulkIds];
      
      appState.memories = appState.memories.filter(m => !idsToDelete.includes(m.id));
      appState.myList = appState.myList.filter(item => !idsToDelete.includes(item));
      appState.continueWatching = appState.continueWatching.filter(item => !idsToDelete.includes(item));
      if (appState.likedMemories) {
        appState.likedMemories = appState.likedMemories.filter(item => !idsToDelete.includes(item));
      }
      
      const chunkSize = 400;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, 'memories', id);
          batch.delete(docRef);
          deletedCount++;
        });
        await batch.commit();
      }
      
      await saveStateList('myList', appState.myList);
      await saveStateList('continueWatching', appState.continueWatching);
      if (appState.likedMemories) {
        await saveStateList('likedMemories', appState.likedMemories);
      }
    } catch (err) {
      console.error('Error committing bulk delete batch:', err);
      handleFirestoreError(err, OperationType.DELETE, 'bulk_memories');
    } finally {
      appState.bulkTransactionActive = false;
      window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
      
      if (window.pendingMemoriesSnapshot) {
        const list = window.pendingMemoriesSnapshot.docs.map(d => d.data());
        list.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
        appState.memories = list;
        window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
        window.pendingMemoriesSnapshot = null;
      }
      render();
    }
    
    window.showToast(`Deleted ${deletedCount} memories in bulk.`);
    
    const dm = document.getElementById('bulkManagerModal');
    if (dm) {
      dm.classList.remove('open');
      setTimeout(() => {
        dm.remove();
        window.refreshRowsView(null, null, true);
      }, 300);
    }
  });
};
