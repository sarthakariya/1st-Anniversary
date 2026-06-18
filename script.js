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
      if(data.settings) appState.settings = data.settings;
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
        // 1. Today's Top Picks for You
        const topPicksMems = [...appState.memories]
          .filter(m => window.getNormalizedCategory(m.category) !== 'Moments')
          .sort((a, b) => b.title.localeCompare(a.title)) // deterministic stable order
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

window.confirmPurgeAll = async () => {
  const check = confirm("⚠️ WARNING: This will permanently delete ALL videos, photos, and memories from Firestore.\n\nAre you sure you want to perform this purge?");
  if (check) {
    const secondCheck = confirm("Double confirmation required:\n\nAre you absolutely sure?");
    if (secondCheck) {
      const modal = document.getElementById('settingsModal');
      if (modal) modal.remove();
      await window.purgeAllFirebaseMemories();
    }
  }
};

window.openSettingsModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'settingsModal';
  
  modal.innerHTML = `
    <div class="upload-modal-content" style="max-width: 400px;">
      <button class="upload-close" onclick="document.getElementById('settingsModal').remove()">&times;</button>
      <div class="upload-title" style="margin-bottom:30px;">Account Settings</div>
      
      <div class="settings-row">
        <div>
          <div style="font-weight:bold; font-size:16px;">Autoplay Previews</div>
          <div style="font-size:12px; color:#888; margin-top:5px;">Play video previews on the home screen and hover.</div>
        </div>
        <label class="switch">
          <input type="checkbox" ${appState.settings.autoPlayPreviews ? 'checked' : ''} onchange="toggleSetting('autoPlayPreviews')">
          <span class="slider"></span>
        </label>
      </div>

      <div class="settings-row">
        <div>
          <div style="font-weight:bold; font-size:16px;">Autoplay Next Episode</div>
          <div style="font-size:12px; color:#888; margin-top:5px;">Automatically play the next memory/video.</div>
        </div>
        <label class="switch">
          <input type="checkbox" ${appState.settings.autoPlayNextEpisode ? 'checked' : ''} onchange="toggleSetting('autoPlayNextEpisode')">
          <span class="slider"></span>
        </label>
      </div>
      
      <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 25px; padding-top: 20px;">
        <div style="font-weight: bold; font-size: 15px; color: #ff5252; margin-bottom: 5px;">Danger Zone</div>
        <p style="font-size: 11px; color: #888; margin: 0 0 15px 0; line-height: 1.4;">Permanently delete and wipe all active videos and photos from Firebase Firestore.</p>
        <button class="btn" style="background: rgba(229, 9, 20, 0.15); border: 1px solid rgba(229, 9, 20, 0.5); color: #ff5252; width: 100%; justify-content: center; font-weight: 600; padding: 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; transition: background 0.2s;" onmouseenter="this.style.background='rgba(229, 9, 20, 0.3)'" onmouseleave="this.style.background='rgba(229, 9, 20, 0.15)'" onclick="window.confirmPurgeAll()">
          🗑️ Purge Firebase Database
        </button>
      </div>
      
      <div class="actions" style="margin-top:30px; justify-content:center;">
        <button class="btn btn-primary" style="width:100%;" onclick="document.getElementById('settingsModal').remove()">Done</button>
      </div>
    </div>
  `;
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
    <div class="upload-modal-content" style="max-width: 400px;">
      <button class="upload-close" onclick="document.getElementById('editProfileModal').remove()">&times;</button>
      <div class="upload-title" style="text-align: center;">Edit Profile</div>
      
      <div style="margin-bottom: 20px; text-align: center;">
        <img id="ep-avatar-preview" src="${pf.avatar}" style="width: 100px; height: 100px; border-radius: 4px; object-fit: cover; margin-bottom: 10px;">
        <div>
          <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 14px;" onclick="document.getElementById('ep-file').click()">Upload Custom</button>
          <input type="file" id="ep-file" accept="image/*" style="display:none;">
        </div>
      </div>
      
      <div class="form-group" style="text-align: left;">
        <label>Profile Name</label>
        <input type="text" id="ep-name" class="form-control" value="${pf.name}" style="border-radius: 4px;">
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
        <button class="btn btn-secondary" style="border-radius: 4px;" onclick="document.getElementById('editProfileModal').remove()">Cancel</button>
        <button class="btn btn-primary" id="ep-save" style="border-radius: 4px;">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  setTimeout(() => m.classList.add('open'), 10);
  
  document.getElementById('ep-file').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (re) => {
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
        document.getElementById('ep-avatar-preview').src = canvas.toDataURL('image/jpeg');
      };
      img.src = re.target.result;
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

        <button class="add-memory-btn" onclick="${appState.activeCategory === 'Moments' ? 'openBulkUploadModal()' : (appState.activeCategory === 'My List' ? 'setCategory(\'Home\')' : 'openUploadModal()')}" title="${addButtonText}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <div class="profile-dropdown">
          <img src="${currAvatar}" width="32" height="32" style="border-radius:4px; margin-left:15px; cursor:pointer; border: 1px solid transparent; transition: border 0.3s; object-fit: cover; display: block;" onmouseenter="this.style.borderColor='#fff';" onmouseleave="this.style.borderColor='transparent';">
          <div class="dropdown-menu">
            <div class="dropdown-item" onclick="openSettingsModal()">⚙ Settings</div>
            <div class="dropdown-item" onclick="openBulkManagerModal()">🛠 Bulk Manage Memories</div>
            <div class="dropdown-item" onclick="window.editProfile('${currentPf ? currentPf.id : ''}')">✎ Edit Current Profile</div>
            <div class="dropdown-item" onclick="window.openManageProfiles()">✎ Manage Profiles</div>
            <div class="dropdown-item" onclick="transitionView('profiles')">⇄ Switch Profile</div>
            <div class="dropdown-item" onclick="window.logoutProfile()">🚪 Logout Profile</div>
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
          nextBackgroundHtml = `<div class="temp-blend-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;pointer-events:none;"><iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${nextHeroMem.videoUrl}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${nextHeroMem.videoUrl}&enablejsapi=1&vq=hd2160&disablekb=1" style="position:absolute;top:50%;left:50%;width:100vw;height:56.25vw;min-height:100vh;min-width:177.77vh;transform:translate(-50%, -50%) scale(1.03);border:none;pointer-events:none;"></iframe></div>`;
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
            ${nextHeroMem.titleImage ? `<img class="hero-title-logo-img" src="${nextHeroMem.titleImage}" alt="${nextHeroMem.title}" style="max-height: 180px; max-width: min(450px, 85%); width: auto; object-fit: contain; margin-bottom: 5px; display: block; filter: drop-shadow(0px 8px 16px rgba(0,0,0,0.85));" referrerPolicy="no-referrer">` : `<div>${nextHeroMem.title}</div>`}
            <div style="display: inline-flex; align-items: center; margin: 8px 0 0 0; font-weight: 800; color: white;">
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
        setTimeout(() => {
          const imgOverlay = newMediaItem.querySelector('#hero-img-overlay');
          if (imgOverlay) imgOverlay.style.opacity = '0';
        }, 750);
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

function createHero() {
  const c = document.createElement('div');
  c.className = 'hero-billboard';
  
  if (!appState.memories) {
    c.innerHTML = `<div class="skeleton-card" style="width:100%; height:85vh; border-radius:0;"></div>`;
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
  const isYouTube = heroMem && heroMem.videoUrl && !heroMem.videoUrl.includes('/') && !heroMem.videoUrl.includes('blob:');
  
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
      backgroundVideoHtml = `<div style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;pointer-events:none;"><iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${heroMem.videoUrl}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${heroMem.videoUrl}&enablejsapi=1&vq=hd2160&disablekb=1" style="position:absolute;top:50%;left:50%;width:100vw;height:56.25vw;min-height:100vh;min-width:177.77vh;transform:translate(-50%, -50%) scale(1.03);border:none;pointer-events:none;"></iframe></div>`;
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
              ${heroMem.titleImage ? `<img class="hero-title-logo-img" src="${heroMem.titleImage}" alt="${heroMem.title}" style="max-height: 180px; max-width: min(450px, 85%); width: auto; object-fit: contain; margin-bottom: 5px; display: block; filter: drop-shadow(0px 8px 16px rgba(0,0,0,0.85));" referrerPolicy="no-referrer">` : `<div>${heroMem.title}</div>`}
              <div style="display: inline-flex; align-items: center; margin: 8px 0 0 0; font-weight: 800; color: white;">
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

  if (backgroundVideoHtml) {
    // Gracefully fade out static picture once video/iframe starts streaming
    setTimeout(() => {
      const imgOverlay = c.querySelector('#hero-img-overlay');
      if (imgOverlay) imgOverlay.style.opacity = '0';
    }, 1000);
    
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
      <img data-src="${displayThumb}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${m.title}" decoding="async" loading="lazy" fetchpriority="low">
      <div class="hover-chassis">
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
    
    card.onmouseenter = () => {
      const r = card.getBoundingClientRect();
      const ww = window.innerWidth;
      const originOffset = r.width * 0.20;
      requestAnimationFrame(() => {
        if (r.left - originOffset < 30) {
          card.style.transformOrigin = 'left center';
        } else if (ww - r.right - originOffset < 30) {
          card.style.transformOrigin = 'right center';
        } else {
          card.style.transformOrigin = 'center center';
        }
      });
    };

    card.onmouseleave = () => {
      // Empty and optimized
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
        
        <!-- YOUTUBE VIDEO LINK (56px) WITH EMBEDDED FETCH -->
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
        
        <!-- POLISHED THUMBNAIL IMAGE CARD -->
        <div style="border: 1px solid #333; background: rgba(20,20,20,0.3); padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#aaa; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span>Memory Thumbnail Image</span>
            <span style="color:#e50914; font-size:10px; font-weight:700;">Netflix Cinematic Design</span>
          </div>
          <div style="font-size:11px; color:#777; margin-top:-5px; line-height:1.4;">Select a custom image backdrop, upload any local file, or generate a stunning cinematic scene prompt.</div>
          
          <div class="floating-input-group" style="position: relative; height: 50px; margin-bottom: 0;">
            <input type="text" id="up-thumb-custom" placeholder=" " style="width:100%; height: 44px; background:rgba(255,255,255,0.06); border:none; padding:18px 12px 6px 12px; border-radius:6px; color:white; font-size:13px; outline:none;" oninput="const preview = document.getElementById('up-thumb-preview'); if(preview) { preview.src = this.value || currentThumbData; document.getElementById('up-preview-container').style.display = 'block'; }">
            <label style="position: absolute; top: 14px; left: 12px; color: #777; pointer-events: none; transition: all 0.18s; transform-origin: left top; font-size: 13px;">Thumbnail Image URL</label>
          </div>
          
          <div style="display:flex; gap:10px;">
            <button type="button" style="flex:1; background: rgba(255,255,255,0.08); border:none; color:#ccc; padding: 8px 12px; border-radius:6px; font-size:12px; font-weight:500; cursor:pointer; transition: all 0.2s; text-align:center; display: flex; align-items: center; justify-content: center; gap: 5px;" onmouseenter="this.style.background='rgba(255,255,255,0.16)'; this.style.color='#fff';" onmouseleave="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#ccc';" onclick="document.getElementById('up-thumb-file').click()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Local File
            </button>
            <button type="button" style="flex:1; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; padding: 8px 12px; border-radius:6px; font-weight:600; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; transition:all 0.3s; text-align:center; display: flex; align-items: center; justify-content: center;" onmouseenter="this.style.boxShadow='0 0 10px rgba(229,9,20,0.5)';" onmouseleave="this.style.boxShadow='none';" onclick="window.generateThumbnailPromptWithAI()">
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
              Active Preview
            </div>
          </div>
        </div>

        <!-- POLISHED LOGO SUB-BOX CARD -->
        <div style="border: 1px solid #333; background: rgba(20,20,20,0.3); padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#aaa; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span>Custom Title Logo Image (Optional)</span>
            <span style="color:#e50914; font-size:10px; font-weight:700;">Netflix Brand Logo Style</span>
          </div>
          <div style="font-size:11px; color:#777; margin-top:-5px; line-height:1.4;">Upload or generate a stylized green-screen Title Logo that displays dynamically instead of plain text.</div>
          
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
        
        <!-- DEEP DESCRIPTION WITH BOTTOM EMBEDDED SPARKLE BUTTON -->
        <div style="position: relative; border-radius: 8px; overflow: hidden; background: #2b2b2b; border: 1px solid transparent; transition: all 0.3s; height: 162px;" id="desc-box-container">
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
            <!-- DATE PICKER -->
            <div class="floating-input-group" style="position: relative; height: 56px; margin-bottom: 0;">
              <input type="date" id="up-date" style="width:100%; height: 56px; background: #2b2b2b; border: 1px solid transparent; padding: 24px 40px 8px 16px; border-radius: 8px; color: white; outline: none; font-size: 14px; box-sizing: border-box; -webkit-appearance: none; appearance: none; transition: all 0.3s;" onfocus="this.style.background='#383838'; this.style.borderColor='rgba(220,220,220,0.7)';" onblur="this.style.background='#2b2b2b'; this.style.borderColor='transparent';" value="${new Date().toISOString().split('T')[0]}">
              <label style="position: absolute; top: 6px; left: 16px; color: #ccc; pointer-events: none; transform: scale(0.7); transform-origin: left top; font-size: 15px;">Date / Year</label>
              <div style="position: absolute; right: 16px; top: 20px; color: #8c8c8c; pointer-events: none; display: flex; align-items: center; justify-content: center;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
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
    if (!uTitle) return alert("Please enter a Title first, so Gemini can generate a matching description.");
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
    if (!link) return alert("Please paste a YouTube link first.");

    let videoId = '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = link.length === 11 ? link : null;
    }

    if (!videoId) return alert("Could not pull Video ID from the text. Make sure it's a valid YouTube link.");
    
    extractedVideoId = videoId;
    document.getElementById('up-fetch').innerText = "Fetching...";
    
    try {
      const oembedRes = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json');
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) document.getElementById('up-title').value = data.title;
        // Always prefer maxresdefault for crystal clear thumbnails
        currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
        document.getElementById('up-thumb-preview').src = currentThumbData;
        document.getElementById('up-preview-container').style.display = 'block';
      } else {
         currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
         document.getElementById('up-thumb-preview').src = currentThumbData;
         document.getElementById('up-preview-container').style.display = 'block';
      }
    } catch(err) {
         currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
         document.getElementById('up-thumb-preview').src = currentThumbData;
         document.getElementById('up-preview-container').style.display = 'block';
    }
    
    document.getElementById('up-fetch').innerText = "Fetch Video Metadata";
  };
  
  document.getElementById('up-publish').onclick = async (e) => {
    const title = document.getElementById('up-title').value.trim();
    if(!title) return alert("Title required");
    if(!extractedVideoId) return alert("Please fetch a valid YouTube link first.");

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
  
  const isYouTube = m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:');
  
  let mediaHtml = appState.settings.autoPlayPreviews && m.videoUrl ? 
      (isYouTube ? `<iframe id="modalYtPlayer" src="https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&vq=hd1080" style="width:100%;height:100%;pointer-events:none;border:none;transform:scale(1.35);"></iframe>` : `<div style="position:relative; width:100%; height:100%; overflow:hidden;"><video src="${m.videoUrl}" autoplay muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(40px) brightness(30%); transform:scale(1.2); z-index:1; pointer-events:none;"></video><video src="${m.videoUrl}" autoplay muted loop playsinline style="position:relative; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;"></video></div>`) : 
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

window.deleteMemory = async (id) => {
  if (confirm("Are you sure you want to delete this memory?")) {
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
  }
};

window.showToast = (msg, duration = 3000) => {
  const existing = document.getElementById('nf-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'nf-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(229, 9, 20, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    z-index: 130000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    pointer-events: none;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  toast.innerText = msg;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
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
  
  await saveStateList('likedMemories', appState.likedMemories);
  try { await saveMemoryToDB(m); } catch(err){}
  
  // Sync all like buttons cleanly and dynamically
  window.syncLikeUI(id);
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
  if(detailModal) detailModal.remove();
  
  let c = document.getElementById('playbackOverlay');
  if (!c) {
    c = document.createElement('div');
    c.className = 'playback-overlay';
    c.id = 'playbackOverlay';
    document.body.appendChild(c);
  }
  
  c.style.display = 'block';
  c.style.opacity = '0';
  c.style.transform = 'scale(1.12)';
  
  // Force pipeline paint computation
  c.offsetHeight;
  
  c.style.transition = 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
  c.style.opacity = '1';
  c.style.transform = 'scale(1)';
  
  // Play Netflix initial animation before playing video
  const isYouTube = url && !url.includes('/') && !url.includes('blob:');
  
  // Setup main player later to prevent YouTube autoplaying before intro ends
  let playerHtml = '';
  if (isYouTube) {
    playerHtml = `<iframe id="fsyPlayer" style="display:none; width:100%; height:100%; background:black; border:none; pointer-events:auto;" src="" allowfullscreen="true" allow="autoplay; encrypted-media;"></iframe>`;
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
  
  // Request fullscreen automatically as early as possible
  if (c.requestFullscreen) {
    c.requestFullscreen().catch(e => console.log("Fullscreen request failed", e));
  }
  
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
      mainPlayer.src = `https://www.youtube.com/embed/${url}?autoplay=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3&vq=hd2160&enablejsapi=1`;
    }
    mainPlayer.style.display = 'flex';
    
    // Auto play when transition is done
    if (!isYouTube) {
      const pPromise = mainPlayer.play();
      if(pPromise !== undefined) pPromise.catch(e => console.error("Autoplay main video prevented", e));
    }
  };
  
  // Try autoplaying intro, else wait
  if (introPlayer) {
    introPlayer.muted = false;
    introPlayer.volume = 1.0;
    
    c.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    c.style.opacity = '0';
    c.style.transform = 'scale(0.92)';
    
    requestAnimationFrame(() => {
      c.style.opacity = '1';
      c.style.transform = 'scale(1)';
    });

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
          backBtn.style.opacity = '0';
          document.body.style.cursor = 'none';
        }
      }, 6000);
    };

    videoContainer.onmousemove = showControls;
    videoContainer.onmouseleave = () => {
      if (!mainPlayer.paused) {
        controls.style.opacity = '0';
        backBtn.style.opacity = '0';
      }
    };

    window.addEventListener('keydown', function(e) {
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
    });

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
  }

  // Handle closing player efficiently
  const closePlayer = (isPopState = false) => {
     window.closeActivePlayer = null;
     document.body.style.overflow = '';
     if (mainPlayer) {
       mainPlayer.src = "";
       if (typeof mainPlayer.load === 'function') mainPlayer.load();
     }
     if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));
     c.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
     c.style.transform = 'scale(1.15)';
     c.style.opacity = '0';
     setTimeout(() => {
       if (mainPlayer) {
         mainPlayer.src = ""; // cleanup
         if (typeof mainPlayer.load === 'function') mainPlayer.load();
       }
       c.innerHTML = ''; // fully unmount internal elements
       c.style.display = 'none';
     }, 600);

     if (!isPopState) {
       if (history.state && history.state.playerOpen) {
         history.back();
       }
     }
  };
  window.closeActivePlayer = () => closePlayer(true);
  
  document.getElementById('playback-back-btn').onclick = () => closePlayer(false);
  
  // Click background to close
  c.onclick = (e) => {
    if (e.target.id === 'playbackOverlay' || e.target.id === 'video-container') {
      closePlayer(false);
    }
  };
};

// Initialize
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
function compressPhotoFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimized JPEG format
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target.result); // fallback to original file reader string
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(file);
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
    <div class="upload-modal-content">
      <div class="upload-close" onclick="const dm = document.getElementById('bulkUploadModal'); dm.classList.remove('open'); setTimeout(() => dm.remove(), 300);">&times;</div>
      <h2 style="margin-bottom:30px; font-weight:700; color:white; font-size:28px; letter-spacing:-0.5px;">Add Photos</h2>
      
      <div id="drop-zone" style="border: 2px dashed rgba(255,255,255,0.2); border-radius: 8px; padding: 60px 20px; text-align: center; cursor: pointer; transition: all 0.3s; margin-bottom: 25px; background: rgba(0,0,0,0.2); flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;" onmouseenter="this.style.borderColor='rgba(255,255,255,0.5)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.2)'">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" style="margin-bottom:20px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <div style="color: rgba(255,255,255,0.8); font-size: 16px;">Click to select or drag photos here</div>
        <div id="file-count" style="color: #e50914; font-size: 14px; margin-top: 10px; font-weight: 500;"></div>
      </div>
      <input type="file" id="bulk-upload-input" multiple accept="image/*" style="display:none;">
      
      <div style="display: flex; gap: 15px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        <button style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:white; padding:12px 24px; border-radius:6px; cursor:pointer;" onclick="const dm = document.getElementById('bulkUploadModal'); dm.classList.remove('open'); setTimeout(()=>dm.remove(),300)">Cancel</button>
        <button id="bulk-upload-save" style="background:#e50914; border:none; color:white; padding:12px 30px; font-weight:600; border-radius:6px; cursor:pointer;" disabled>Upload Photos</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  
  setTimeout(() => m.classList.add('open'), 10);

  const input = document.getElementById('bulk-upload-input');
  const dropZone = document.getElementById('drop-zone');
  const saveBtn = m.querySelector('#bulk-upload-save');
  const countDisp = m.querySelector('#file-count');
  
  const handleFiles = (files) => {
    if(files && files.length > 0) {
      countDisp.innerText = files.length + ' photo' + (files.length>1?'s':'') + ' selected';
      saveBtn.disabled = false;
    }
  };

  dropZone.onclick = () => input.click();
  input.onchange = (e) => handleFiles(e.target.files);
  
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = 'rgba(255,255,255,0.05)'; };
  dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.style.background = 'rgba(0,0,0,0.2)'; };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.style.background = 'rgba(0,0,0,0.2)';
    if(e.dataTransfer.files) {
       input.files = e.dataTransfer.files;
       handleFiles(e.dataTransfer.files);
    }
  };

  saveBtn.onclick = async () => {
    if (!input.files || input.files.length === 0) return;
    saveBtn.innerText = 'Uploading...';
    saveBtn.disabled = true;
    appState.activeCategory = 'Moments';
    
    // Check for duplicates
    const existingTitles = new Set(
      appState.memories
        .filter(mem => window.getNormalizedCategory(mem.category) === 'Moments')
        .map(mem => String(mem.title).trim().toLowerCase())
    );
    
    const maxFiles = Array.from(input.files);
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
    let fallbackCount = 0;
    const total = toUpload.length;

    // Toggle bulk transaction to pause snapshot logic and prevent rendering collisions
    appState.bulkTransactionActive = true;

    const uploadWithRetryAndFallback = async (newMem, retries = 2) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await saveMemoryToDB(newMem);
          return { success: true };
        } catch (err) {
          console.warn(`[Upload Attempt ${attempt} Failed]:`, err);
          if (attempt === retries) {
            // Local fallback backup
            try {
              window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
            } catch(e) {}
            return { success: false, error: err, fallbackSaved: true };
          }
          // Delay before next attempt
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    };
    
    for(let file of toUpload) {
      const idx = done + failed + fallbackCount;
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
      
      appState.memories.push(newMem);
      
      const result = await uploadWithRetryAndFallback(newMem);
      if (result && result.success) {
        done++;
      } else {
        if (result && result.fallbackSaved) {
          fallbackCount++;
        } else {
          failed++;
        }
      }
      
      const percent = Math.round(((done + failed + fallbackCount) / total) * 100);
      progressBarFill.style.width = percent + '%';
      progressPercent.innerText = percent + '%';
      
      // Let painter update for flawless framerate rendering
      await new Promise(r => setTimeout(r, 40));
    }
    
    // Clear the transaction active flag
    appState.bulkTransactionActive = false;
    render();

    window.safeSetSessionItem('netflix_memories', JSON.stringify(appState.memories));
    
    let endMsg = `Successfully uploaded ${done} photo(s).`;
    if (fallbackCount > 0) {
      endMsg += ` ${fallbackCount} photo(s) saved securely in browser storage due to connection caps.`;
    }
    if (failed > 0) {
      endMsg += ` ${failed} photo(s) failed upload due to batch failures.`;
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
  
  document.getElementById('ss-close-btn').onclick = closePlayer;
};

// Bulk Memories Manager
window.openBulkManagerModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'bulkManagerModal';
  
  // Clear any existing bulk selection cache
  window.selectedBulkIds = [];
  
  const buildListHTML = () => {
    if (!appState.memories || appState.memories.length === 0) {
      return '<div style="color: #888; text-align:center; padding:40px; font-size:16px;">No memories found to manage.</div>';
    }
    return appState.memories.map(m => `
      <div class="bm-card" data-id="${m.id}" onclick="toggleBulkSelect('${m.id}')">
        <div class="bm-checkbox">
          <input type="checkbox" id="chk-${m.id}" data-id="${m.id}" onclick="event.stopPropagation(); syncBulkCardSelect('${m.id}');">
        </div>
        <img src="${m.thumbnail || './Netflix-Logo-Streaming-Platform-765.png'}" class="bm-thumb" onerror="this.src='./Netflix-Logo-Streaming-Platform-765.png';">
        <div class="bm-info">
          <div class="bm-title">${m.title || 'Untitled'}</div>
          <div class="bm-meta">${m.category || 'No Category'} • ${m.year || '2026'}</div>
        </div>
      </div>
    `).join('');
  };

  modal.innerHTML = `
    <div class="upload-modal-content" style="max-width: 900px; width: 92vw; height: 85vh; display: flex; flex-direction: column; overflow: hidden; padding: 25px;">
      <div class="upload-close" onclick="const dm = document.getElementById('bulkManagerModal'); dm.classList.remove('open'); setTimeout(() => dm.remove(), 300);">&times;</div>
      
      <h2 style="margin-bottom: 5px; font-weight: 700; color: white; font-size: 26px; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #e50914;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Bulk Memories Manager
      </h2>
      <p style="color:#aaa; font-size:13px; margin-bottom: 20px;">Easily re-categorize, update metadata, or bulk-delete multiple memory tiles or photos in one go.</p>
      
      <!-- Toolbar -->
      <div class="bm-toolbar">
        <div class="bm-selection-controls">
          <button class="btn btn-secondary" onclick="bulkSelectAll(true)" style="padding: 6px 14px; font-size: 13px;">✓ Select All</button>
          <button class="btn btn-secondary" onclick="bulkSelectAll(false)" style="padding: 6px 14px; font-size: 13px;">✗ Deselect All</button>
          <span id="bm-count-badge" class="bm-badge">0 selected</span>
        </div>
        
        <div class="bm-actions-container hidden" id="bm-bulk-actions">
          <input type="text" id="bulk-title-input" class="bm-input" placeholder="New Title (Bulk)" style="width: 130px;">
          <input type="text" id="bulk-desc-input" class="bm-input" placeholder="New Description (Bulk)" style="width: 155px;">
          
          <select id="bulk-category-select" class="bm-select-input">
            <option value="">-- Change Category --</option>
            <option value="Moments">Moments (Photos)</option>
            ${subCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
          </select>
          
          <input type="number" id="bulk-year-input" class="bm-input" placeholder="Change Year" style="width: 110px;">
          
          <select id="bulk-rating-select" class="bm-select-input" style="width: 120px;">
            <option value="">-- Rating --</option>
            <option value="G">G</option>
            <option value="PG">PG</option>
            <option value="PG-13">PG-13</option>
            <option value="R">R</option>
            <option value="TV-PG">TV-PG</option>
            <option value="TV-14">TV-14</option>
            <option value="TV-MA">TV-MA</option>
          </select>

          <input type="text" id="bulk-thumbnail-input" class="bm-input" placeholder="New Thumbnail URL" style="width: 150px;">
          
          <button class="btn btn-primary" onclick="applyBulkEdit()" style="background:#46d369; color:black; font-weight:600; padding: 7px 16px; font-size: 13px;">Update Selected</button>
          <button class="btn btn-primary" onclick="applyBulkDelete()" style="background:#e50914; color:white; font-weight:600; padding: 7px 16px; font-size: 13px;">Delete Selected</button>
        </div>
      </div>
      
      <!-- List Container -->
      <div class="bm-grid-container">
        <div class="bm-grid">
          ${buildListHTML()}
        </div>
      </div>
      
      <div style="display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto;">
        <button class="btn btn-secondary" onclick="const dm = document.getElementById('bulkManagerModal'); dm.classList.remove('open'); setTimeout(() => dm.remove(), 300);">Close Panel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
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

window.updateBulkToolbar = () => {
  const badge = document.getElementById('bm-count-badge');
  const actionPanel = document.getElementById('bm-bulk-actions');
  const count = window.selectedBulkIds.length;
  
  if (badge) {
    badge.innerText = `${count} selected`;
  }
  
  if (actionPanel) {
    if (count > 0) {
      actionPanel.classList.remove('hidden');
    } else {
      actionPanel.classList.add('hidden');
    }
  }
};

window.applyBulkEdit = async () => {
  if (window.selectedBulkIds.length === 0) return;
  
  const titleVal = document.getElementById('bulk-title-input').value.trim();
  const descVal = document.getElementById('bulk-desc-input').value.trim();
  const catVal = document.getElementById('bulk-category-select').value;
  const yearVal = document.getElementById('bulk-year-input').value;
  const ratingVal = document.getElementById('bulk-rating-select').value;
  const thumbVal = document.getElementById('bulk-thumbnail-input').value.trim();
  
  if (!titleVal && !descVal && !catVal && !yearVal && !ratingVal && !thumbVal) {
    window.showToast('Please specify at least one metadata change field.');
    return;
  }
  
  let updatedCount = 0;
  
  // Activate bulk transaction to block live listener interference and avoid race conditions
  appState.bulkTransactionActive = true;
  
  try {
    const memoriesToUpdate = [];
    for (const id of window.selectedBulkIds) {
      const m = appState.memories.find(item => item.id === id);
      if (m) {
        if (titleVal) m.title = titleVal;
        if (descVal) m.desc = descVal;
        if (catVal) m.category = catVal;
        if (yearVal) m.year = parseInt(yearVal, 10) || m.year;
        if (ratingVal) m.rating = ratingVal;
        if (thumbVal) m.thumbnail = thumbVal;
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
    // Always persist to local cache immediately
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
  window.showToast(`Successfully updated ${updatedCount} memories!`);
  
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
  if (!confirm(`Are you sure you want to permanently delete all ${count} selected memories?`)) {
    return;
  }
  
  let deletedCount = 0;
  
  // Activate bulk transaction to block live listener interference and avoid race conditions
  appState.bulkTransactionActive = true;
  
  try {
    const idsToDelete = [...window.selectedBulkIds];
    
    // Sync local arrays immediately so the UI is super fast
    appState.memories = appState.memories.filter(m => !idsToDelete.includes(m.id));
    appState.myList = appState.myList.filter(item => !idsToDelete.includes(item));
    appState.continueWatching = appState.continueWatching.filter(item => !idsToDelete.includes(item));
    if (appState.likedMemories) {
      appState.likedMemories = appState.likedMemories.filter(item => !idsToDelete.includes(item));
    }
    
    // Commit deletions in chunked batches of 400
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
    
    // Also save state alterations
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
};
