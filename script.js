import { db, auth } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
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
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
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
  memories: null,
  profiles: null
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
const savedProfile = localStorage.getItem('sarthak_netflix_profile');
// We do NOT set appState.currentProfile = savedProfile here
// to force the user to select the profile every time.

const mainTabs = ['Home', 'Dates', 'Categories', 'My List', 'Moments'];
const subCategories = ['Celebration Parties', 'Our Romantic Scenes', 'Our Special Event'];

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

async function loadData() {
  // Pre-load from sessionStorage for instant visual layout (no flickering on reload)
  try {
    const cachedState = sessionStorage.getItem('netflix_state');
    const cachedMemories = sessionStorage.getItem('netflix_memories');
    if (cachedState) {
      const data = JSON.parse(cachedState);
      if(data.myList) appState.myList = data.myList;
      if(data.continueWatching) appState.continueWatching = data.continueWatching;
      if(data.likedMemories) appState.likedMemories = data.likedMemories;
      if(data.settings) appState.settings = data.settings;
      if(data.profiles && data.profiles.length > 0) appState.profiles = data.profiles;
    }
    if (cachedMemories) {
      appState.memories = JSON.parse(cachedMemories);
    }
  } catch (e) {
    console.error("Error loading cached data", e);
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
      
      sessionStorage.setItem('netflix_state', JSON.stringify({
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
    const list = snapshot.docs.map(d => d.data());
    // Sort descending by dateAdded (newest first)
    list.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    appState.memories = list;
    
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
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
  }
}

async function saveStateList(key, data) {
  appState[key] = data;
  sessionStorage.setItem('netflix_state', JSON.stringify({
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
      animate(profs, { opacity: [0, 1] }, { duration: 0.6, ease: "easeOut" });
      const cards = profs.querySelectorAll('.profile-card');
      if (cards.length > 0) {
        cards.forEach(c => c.style.animation = 'none'); // override css
        animate(
          cards, 
          { opacity: [0, 1], y: [40, 0], scale: [0.95, 1] }, 
          { duration: 0.5, delay: stagger(0.1, { startDelay: 0.1 }), ease: "easeOut" }
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
      animate(dashboard, { opacity: [0, 1] }, { duration: 0.8, ease: "easeOut" });
      
      const elements = dashboard.querySelectorAll('.navbar, .hero-billboard, .row');
      if (elements.length > 0) {
          animate(
            elements, 
            { y: [40, 0], opacity: [0, 1] }, 
            { duration: 0.7, delay: stagger(0.15, { startDelay: 0.2 }), ease: "easeOut" }
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
    const heroSec = document.getElementById('hero-section');
    if (heroSec) {
      heroSec.innerHTML = '';
      heroSec.appendChild(createHero());
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
      const q = appState.searchQuery;
      const mems = appState.memories.filter(m => 
        m.title.toLowerCase().includes(q) || 
        (m.desc && m.desc.toLowerCase().includes(q)) || 
        (m.year && m.year.toString().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
      if(mems.length) rc.appendChild(createRow('Search Results', mems));
      else rc.innerHTML = '<div style="color:#888; padding:50px; font-size: 1.2vw; text-align:center;">No matches found for "' + q + '"</div>';
      
      requestAnimationFrame(() => {
        rc.style.opacity = '1';
        rc.style.transform = 'translateY(0)';
      });
      return;
    }
    
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
          div.onclick = () => { 
            if (!appState.memories.find(mem => mem.id === m.id)) {
              appState.memories.push(m);
            }
            openDetailModal(m.id); 
          };
          div.innerHTML = `<img src="${m.thumbnail}" alt="${m.title}" loading="lazy">`;
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
      rc.querySelectorAll('.scramble-text').forEach(el => {
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
      
      <div class="actions" style="margin-top:30px; justify-content:center;">
        <button class="btn btn-primary" style="width:100%;" onclick="document.getElementById('settingsModal').remove()">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
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
  
  if (event && event.currentTarget) {
    const btn = event.currentTarget;
    btn.innerHTML = appState.myList.includes(id) ? '✓' : '＋';
    btn.title = appState.myList.includes(id) ? 'Remove from List' : 'Add to My List';
  }
  
  // Also synchronize the hero mylist button state if the same ID is being toggled and visible on screen
  const heroBtn = document.getElementById('hero-mylist-btn');
  if (heroBtn) {
    const inListAfter = appState.myList.includes(id);
    heroBtn.title = inListAfter ? 'Remove from My List' : 'Add to My List';
    heroBtn.innerHTML = inListAfter ? 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }
  
  window.refreshRowsView(null, null, true);
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
  
  const heroBtn = document.getElementById('hero-mylist-btn');
  if (heroBtn) {
    const inListAfter = appState.myList.includes(id);
    heroBtn.title = inListAfter ? 'Remove from My List' : 'Add to My List';
    heroBtn.innerHTML = inListAfter ? 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }
  
  window.refreshRowsView(null, null, true);
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
  
  if (appState.profiles === null) {
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
  localStorage.setItem('sarthak_netflix_profile', pf.name);
  appState.view = 'dashboard';
  app.innerHTML = '';
  
  const dashboard = createDashboard();
  app.appendChild(dashboard);
  
  // Dashboard emerges from shadows
  dashboard.style.opacity = '0';
  setTimeout(() => {
    animate(dashboard, { opacity: [0, 1] }, { duration: 0.8, ease: "easeOut" });
    const elements = dashboard.querySelectorAll('.navbar, .hero-billboard, .row');
    if (elements.length > 0) {
        animate(
          elements, 
          { y: [40, 0], opacity: [0, 1] }, 
          { duration: 0.8, delay: stagger(0.1, { startDelay: 0.1 }), ease: "easeOut" }
        );
    }
  }, 50);
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
          sessionStorage.setItem('sarthak_netflix_code', '25072025');
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
      localStorage.setItem('sarthak_netflix_profile', pf.name);
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

  const heroContent = createHero();
  heroContent.id = 'hero-section';
  c.appendChild(heroContent);
  
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
  
  const currentHero = document.querySelector('.hero-billboard');
  if (currentHero) {
    const newHero = createHero();
    newHero.id = 'hero-section';
    newHero.style.position = 'absolute';
    newHero.style.top = '0';
    newHero.style.left = '0';
    newHero.style.width = '100%';
    newHero.style.height = currentHero.offsetHeight + 'px';
    newHero.style.zIndex = '12';
    newHero.style.opacity = '0';
    newHero.style.transition = 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    
    // Ensure parent has position: relative during animation
    const parent = currentHero.parentNode;
    if (parent) {
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      parent.insertBefore(newHero, currentHero);
      
      // Force reflow
      newHero.offsetHeight;
      
      newHero.style.opacity = '1';
      
      setTimeout(() => {
        // Instantly hide currentHero so it doesn't take space in the flow before layout recalculation
        currentHero.style.display = 'none';
        
        newHero.style.position = '';
        newHero.style.top = '';
        newHero.style.left = '';
        newHero.style.width = '';
        newHero.style.height = '';
        newHero.style.zIndex = '';
        newHero.style.transition = '';
        
        currentHero.remove();
        
        window.isShufflingHero = false;
      }, 600);
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
      backgroundVideoHtml = `<div style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;pointer-events:none;"><iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${heroMem.videoUrl}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${heroMem.videoUrl}&enablejsapi=1&vq=hd1080&disablekb=1" style="position:absolute;top:50%;left:50%;width:100vw;height:56.25vw;min-height:100vh;min-width:177.77vh;transform:translate(-50%, -50%);border:none;"></iframe></div>`;
    } else {
      backgroundVideoHtml = `<video id="hero-native-video" class="hero-video media-card-hover-video" src="${heroMem.videoUrl}" ${isMuted ? 'muted' : ''} autoplay loop playsinline fetchpriority="high" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:2;"></video>`;
    }
  }

  c.innerHTML = `
    <div class="hero-video-wrapper" style="background: black;">
      <img id="hero-img-overlay" class="hero-video" src="${heroMem.thumbnail}" alt="Hero" fetchpriority="high" style="width: 100%; height: 100%; object-fit: cover; position: absolute; z-index: 3; transition: opacity 1s cubic-bezier(0.25, 0.1, 0.25, 1);">
      ${backgroundVideoHtml}
      <div id="hero-curtain-mask" style="position:absolute; top:0; left:0; width:100%; height:100%; background:black; z-index:4; transform: translateX(0%); animation: curtainReveal 0.8s cubic-bezier(0.85, 0, 0.15, 1) forwards;"></div>
    </div>
    <div class="hero-overlay" style="z-index: 5;"></div>
    <div class="hero-overlay-bottom" style="z-index: 5;"></div>
    <div class="hero-info" style="z-index: 5;">
      <div class="${titleClass}">${heroMem.title}</div>
      <div style="display: inline-flex; align-items: center; margin: 8px 0 15px 0; font-weight: 800; color: white;">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e50914; color: white; font-weight: 950; padding: 3px 6px; border-radius: 2px; line-height: 1; margin-right: 10px; font-family: system-ui, -apple-system, sans-serif;">
          <span style="font-size: 7px; letter-spacing: 0.5px; margin-bottom: 1px;">TOP</span>
          <span style="font-size: 13px; font-weight: 950;">10</span>
        </div>
        <span style="font-size: clamp(13px, 1.1vw, 18px); font-weight: 700; letter-spacing: -0.2px; text-shadow: 1.5px 1.5px 4px rgba(0,0,0,0.9);">#1 in Memories Today</span>
      </div>
      <div class="hero-desc">${heroMem.desc}</div>
      <div class="hero-buttons">
        <button class="btn btn-primary" onclick="playVideo('${heroMem.id}')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg> Play
        </button>
        <button class="btn btn-secondary" onclick="openDetailModal('${heroMem.id}', event)">
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
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` :
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`}
      </div>
      <div class="maturity-rating" style="animation: slideInRight 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${heroMem.rating}</div>
    </div>
  `;

  let idleTimer;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    const imgOverlay = c.querySelector('#hero-img-overlay');
    if (imgOverlay) imgOverlay.style.opacity = '1';
    idleTimer = setTimeout(() => {
      if (imgOverlay) imgOverlay.style.opacity = '0';
    }, 4000);
  };
  
  if (backgroundVideoHtml) {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    resetIdleTimer();
    
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
    card.innerHTML = `
      <img data-src="${displayThumb}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${m.title}" decoding="async" loading="lazy" fetchpriority="low">
      <div class="hover-chassis">
        <div class="hc-buttons">
          <div class="hc-btn hc-play" title="Play">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </div>
          <div class="hc-btn hc-add" title="Add to My List">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="hc-btn hc-like" title="Like">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <div style="flex:1;"></div>
          <div class="hc-btn hc-more" title="More Info">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
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

      card.hoverTimeout = setTimeout(() => {
        if(m.videoUrl && appState.settings.autoPlayPreviews) {
          const isYouTube = m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:');
          if (isYouTube) {
            const wrap = document.createElement('div');
            wrap.className = 'media-card-hover-video';
            wrap.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;border-radius:4px;';
            const v = document.createElement('iframe');
            v.src = `https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&vq=hd1080&disablekb=1`;
            v.style.cssText = 'position:absolute;top:50%;left:50%;width:150%;height:150%;border:none;pointer-events:none;transform:translate(-50%,-50%) scale(1.25);';
            wrap.appendChild(v);
            card.appendChild(wrap);
          } else {
            const v = document.createElement('video');
            let srcUrl = m.videoUrl;
            if (m.videoFile && !srcUrl.startsWith('blob:')) {
              srcUrl = URL.createObjectURL(m.videoFile);
              m.videoUrl = srcUrl;
            }
            v.src = srcUrl;
            v.muted = true;
            v.autoplay = true;
            v.loop = true;
            v.className = 'media-card-hover-video';
            v.setAttribute('fetchpriority', 'high');
            v.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:2;border-radius:4px;';
            card.appendChild(v);
            v.play().catch(e => console.log('Autoplay prevented'));
          }
        }
      }, 500); // Shorter delay of 500ms for hover videos
    };

    card.onmouseleave = () => {
      clearTimeout(card.hoverTimeout);
      const v = card.querySelector('.media-card-hover-video');
      if(v) {
        if(v.tagName === 'VIDEO') {
           v.src = ''; 
           if(typeof v.load === 'function') v.load();
        }
        v.remove();
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

// === UPLOAD FEATURE ===
window.openUploadModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'uploadModal';
  
  modal.innerHTML = `
    <div class="upload-modal-content" style="display:flex; flex-direction:column; padding:0;">
      <div style="padding: 20px 30px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
        <h2 style="margin:0; font-size: 20px; font-weight:600; letter-spacing:0.5px;">Add New Memory</h2>
        <button class="upload-close" style="position:static; background:transparent; font-size:28px;" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);">&times;</button>
      </div>
      
      <div style="padding: 30px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:25px;">
        <div style="padding: 15px 20px; background: rgba(229, 9, 20, 0.15); border-left: 3px solid #e50914; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #ccc;">Please upload your video to YouTube Studio first.</p>
          <button style="background: rgba(255,255,255,0.1); border:none; color:white; padding: 8px 15px; border-radius:4px; font-size:13px; cursor:pointer; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'" onclick="window.open('https://studio.youtube.com/channel/UC3b6az9clhBSOjpXJW0-mFA/videos/upload', '_blank')">
            🡥 Open YouTube Studio
          </button>
        </div>

        <div>
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">YouTube Video Link</label>
          <div style="display:flex; gap:10px;">
            <input type="text" id="up-yt-link" placeholder="https://www.youtube.com/watch?v=..." style="flex:1; background:rgba(255,255,255,0.1); border:none; padding:12px 16px; border-radius:8px; color:white; font-family:monospace; outline:none; transition: background 0.3s;" onfocus="this.style.background='rgba(255,255,255,0.2)'" onblur="this.style.background='rgba(255,255,255,0.1)'">
            <button id="up-fetch" style="background:#fff; color:#000; border:none; padding:0 20px; border-radius:8px; font-weight:600; cursor:pointer; transition: background 0.2s;" onmouseenter="this.style.background='#ddd'" onmouseleave="this.style.background='#fff'">Fetch</button>
          </div>
        </div>

        <div>
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Thumbnail Image URL (Optional)</label>
          <input type="text" id="up-thumb-custom" placeholder="Paste custom image URL here (or keep blank to use fetched youtube thumbnail)" style="width:100%; background:rgba(255,255,255,0.1); border:none; padding:12px 16px; border-radius:8px; color:white; outline:none; transition: background 0.3s;" oninput="document.getElementById('up-thumb-preview').src = this.value || currentThumbData; document.getElementById('up-preview-container').style.display = 'block';">
          <div style="text-align:center; margin-top:12px; margin-bottom:12px; font-size:12px; color:#555; text-transform:uppercase; letter-spacing:1px;">- OR -</div>
          <button style="background: rgba(255,255,255,0.1); border:none; color:white; padding: 12px 16px; border-radius:8px; font-size:13px; cursor:pointer; width:100%; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'" onclick="document.getElementById('up-thumb-file').click()">📁 Select Image File</button>
          <input type="file" id="up-thumb-file" accept="image/*" style="display:none;">
        </div>
        
        <div id="up-preview-container" style="display: none; text-align:center;">
          <img id="up-thumb-preview" src="" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        </div>

        <div class="floating-input-group">
          <input type="text" id="up-title" required>
          <label for="up-title">Title</label>
        </div>

        <div class="floating-input-group">
          <textarea id="up-desc" rows="3" required></textarea>
          <label for="up-desc">Description</label>
        </div>

        <div style="margin-top:-10px; margin-bottom:5px;">
          <button type="button" class="btn" style="width:100%; justify-content:center; background:linear-gradient(90deg, #e50914, #ff5252); border:none; color:white; display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.3s;" onmouseenter="this.style.boxShadow='0 0 15px rgba(229,9,20,0.6)'; this.style.transform='scale(1.02)';" onmouseleave="this.style.boxShadow='none'; this.style.transform='scale(1)';" onclick="window.generateDescriptionWithAI()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Generate Description with AI
          </button>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
          <div>
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Category</label>
            <select id="up-cat" style="width:100%; background:rgba(255,255,255,0.1); border:none; padding:12px 16px; border-radius:8px; color:white; outline:none; transition: background 0.3s;" onfocus="this.style.background='rgba(255,255,255,0.2)'" onblur="this.style.background='rgba(255,255,255,0.1)'">
              <option value="Celebration Parties" style="background:#141414;">Celebration Parties</option>
              <option value="Our Romantic Scenes" style="background:#141414;">Our Romantic Scenes</option>
              <option value="Our Special Event" style="background:#141414;">Our Special Event</option>
            </select>
          </div>
          <div>
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Date / Year</label>
            <input type="date" id="up-date" style="width:100%; background:rgba(255,255,255,0.1); border:none; padding:12px 16px; border-radius:8px; color:white; outline:none; transition: background 0.3s;" onfocus="this.style.background='rgba(255,255,255,0.2)'" onblur="this.style.background='rgba(255,255,255,0.1)'" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div>
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Maturity Rating</label>
          <select id="up-rating" style="width:100%; background:rgba(255,255,255,0.1); border:none; padding:12px 16px; border-radius:8px; color:white; outline:none; transition: background 0.3s;" onfocus="this.style.background='rgba(255,255,255,0.2)'" onblur="this.style.background='rgba(255,255,255,0.1)'">
            <option value="U/A 7+" style="background:#141414;">U/A 7+</option>
            <option value="U/A 13+" style="background:#141414;">U/A 13+</option>
            <option value="U/A 16+" style="background:#141414;">U/A 16+</option>
            <option value="U/A 18+" selected style="background:#141414;">U/A 18+</option>
            <option value="A" style="background:#141414;">A</option>
          </select>
        </div>
      </div>
      
      <div style="padding: 20px 30px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); display:flex; gap:15px; justify-content:flex-end;">
        <button style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:white; padding:10px 20px; border-radius:8px; cursor:pointer;" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);">Cancel</button>
        <button id="up-publish" style="background:#e50914; border:none; color:white; padding:10px 30px; font-weight:bold; border-radius:8px; cursor:pointer; box-shadow: 0 4px 15px rgba(229,9,20,0.4);">Publish Memory</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
  
  let currentThumbData = '';
  let extractedVideoId = '';
  let localThumbBase64 = '';

  document.getElementById('up-thumb-file').onchange = function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        localThumbBase64 = e.target.result;
        document.getElementById('up-thumb-preview').src = localThumbBase64;
        document.getElementById('up-preview-container').style.display = 'block';
        document.getElementById('up-thumb-custom').value = 'Local File Selected: ' + file.name;
      };
      reader.readAsDataURL(file);
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

    const mem = {
      id: 'm_' + Date.now(),
      title,
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
      (isYouTube ? `<iframe id="modalYtPlayer" src="https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&vq=hd1080" style="width:100%;height:100%;pointer-events:none;border:none;transform:scale(1.35);"></iframe>` : `<div style="position:relative; width:100%; height:100%; overflow:hidden;"><video src="${m.videoUrl}" autoplay muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(40px) brightness(30%); transform:scale(1.2); z-index:1; pointer-events:none;"></video><video src="${m.videoUrl}" autoplay muted loop playsinline style="position:relative; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;"></video></div>`) : 
      `<img src="${m.thumbnail}" style="width:100%;height:100%;object-fit:cover;">`;

  modal.innerHTML = `
    <div class="detail-modal" style="transform-origin: ${originX} ${originY};">
      <div class="modal-controls">
        <button class="modal-close-btn" onclick="const dm = document.getElementById('detailModal'); const v = dm.querySelectorAll('video, iframe'); v.forEach(el => { el.src=''; if(el.load) el.load(); }); dm.classList.remove('open'); setTimeout(() => { dm.remove(); }, 300);">&times;</button>
      </div>
      <div class="detail-header">
        ${mediaHtml}
        <div class="detail-gradient"></div>
        <div class="detail-title-btn">
          <div class="detail-title" id="dm-title">${m.title}</div>
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
            <button style="background: rgba(255,255,255,0.1); border:none; color:white; padding: 10px 15px; border-radius:4px; font-size:13px; cursor:pointer; width:100%; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'" onclick="document.getElementById('dm-thumb-input').click()">📁 Select Image File</button>
            <input type="file" id="dm-thumb-input" accept="image/*" style="display:none;" onchange="if(this.files && this.files[0]) { document.getElementById('dm-thumb-url-input').value = 'Local File Selected: ' + this.files[0].name; }">
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
    if(catEdit) catEdit.classList.remove('hidden');
    titleEdit.focus();
  }
};

window.saveDetailEdit = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  if (m) {
    m.title = document.getElementById('dm-title-edit').value;
    m.desc = document.getElementById('dm-desc-edit').value;

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

    try { await saveMemoryToDB(m); } catch(err) {}
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    document.getElementById('dm-title').innerText = m.title;
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
    try { await deleteDoc(doc(db, 'memories', id)); } catch(e){}
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    saveStateList('myList', appState.myList);
    document.getElementById('detailModal').remove();
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
  
  const targetBtn = btn || document.getElementById('dm-like-btn');
  if (targetBtn) {
    const isNowLiked = appState.likedMemories.includes(id);
    targetBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${isNowLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
      </svg>
    `;
    targetBtn.style.color = isNowLiked ? '#E50914' : '';
    targetBtn.style.borderColor = isNowLiked ? '#E50914' : '';
    targetBtn.title = isNowLiked ? 'Unlike' : 'Like';
    
    // Ripple ring effect
    const ripple = document.createElement('div');
    ripple.className = 'ripple-ring';
    targetBtn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
    
    // springy pop animation
    targetBtn.classList.add('pop-active');
    setTimeout(() => {
      targetBtn.classList.remove('pop-active');
    }, 450);
  }
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
  c.style.transform = 'translateY(0)';
  c.style.opacity = '1';
  
  // Play Netflix initial animation before playing video
  const isYouTube = url && !url.includes('/') && !url.includes('blob:');
  
  // Setup main player later to prevent YouTube autoplaying before intro ends
  let playerHtml = '';
  if (isYouTube) {
    playerHtml = `<iframe id="fsyPlayer" style="display:none; width:100%; height:100%; background:black; border:none; pointer-events:auto;" src="" allowfullscreen="true" allow="autoplay; encrypted-media;"></iframe>`;
  } else {
    playerHtml = `
      <div id="video-container" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:black; contain: content; overflow: hidden;">
        <video id="fsyBgPlayer" src="${url}" autoplay muted loop playsinline style="position:absolute; top:50%; left:50%; width:100%; height:100%; object-fit:cover; filter:blur(40px) brightness(30%); transform:translate(-50%,-50%) scale(1.2); z-index:0; pointer-events:none;"></video>
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
    <div class="playback-back close-btn" id="playback-back-btn" style="z-index: 10002; position:absolute; top: 30px; left: 30px; cursor: pointer; color: white;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
    introPlayer.style.display = 'none';
    if (isYouTube) {
      mainPlayer.src = `https://www.youtube.com/embed/${url}?autoplay=1&controls=1&rel=0&modestbranding=1&iv_load_policy=3&vq=hd1080&enablejsapi=1`;
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
    if(introPlayer.play() !== undefined) {
      introPlayer.play().catch(() => startMainVideo());
    }
    introPlayer.onended = startMainVideo;
    introPlayer.onerror = startMainVideo;
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
          mainPlayer.currentTime += 5;
          showControls();
        } else if (e.code === 'ArrowLeft') {
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
  const closePlayer = () => {
     document.body.style.overflow = '';
     if (mainPlayer) {
       mainPlayer.src = "";
       if (typeof mainPlayer.load === 'function') mainPlayer.load();
     }
     if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));
     c.style.transition = 'transform 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.4s ease';
     c.style.transform = 'translateY(100%)';
     c.style.opacity = '0';
     setTimeout(() => {
       if (mainPlayer) {
         mainPlayer.src = ""; // cleanup
         if (typeof mainPlayer.load === 'function') mainPlayer.load();
       }
       c.innerHTML = ''; // fully unmount internal elements
       c.style.display = 'none';
     }, 400);
  };
  
  document.getElementById('playback-back-btn').onclick = closePlayer;
  
  // Click background to close
  c.onclick = (e) => {
    if (e.target.id === 'playbackOverlay' || e.target.id === 'video-container') {
      closePlayer();
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
  const title = document.getElementById('up-title').value.trim();
  
  const prompt = `Please write an extremely catchy, engaging, emotional, and dramatic Netflix-like caption/description for our romantic streaming catalogue memory.

Here are the details:
- Video Title: "${title || 'My Precious Couple Memory'}"
- YouTube Video Link: ${link || '(Not provided)'}

Requirements:
- Keep it under 2 lines of text (about 30-40 words total).
- Make it sound cinematic, nostalgic, romantic, and highly engaging like a professional movie/show blurb.
- Do not use markdown like bolding or brackets. Keep it as pure, natural narrative text.`;

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
    c.className = 'playback-overlay';
    c.id = 'playbackOverlay';
    document.body.appendChild(c);
  }
  
  c.style.display = 'block';
  c.style.transform = 'translateY(0)';
  c.style.opacity = '1';
  
  c.innerHTML = `
    <div class="playback-back close-btn" id="photo-close-btn" style="z-index: 10002; position:absolute; top: 30px; left: 30px; cursor: pointer; color: white;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    <div style="width:100%; height:100%; background:black; display:flex; align-items:center; justify-content:center;">
       <img src="${m.thumbnail}" style="width:100%; height:100%; object-fit:contain; border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
    </div>
    <video src="./netflix-intro.mp4" playsinline autoplay muted id="introPlayer" style="object-fit:cover; width:100%; height:100%; z-index:9000; position:absolute; top:0; left:0; pointer-events:none;"></video>
  `;
  
  const introPlayer = document.getElementById('introPlayer');
  if (introPlayer) {
    introPlayer.onended = () => introPlayer.remove();
    introPlayer.onerror = () => introPlayer.remove();
  }

  const closePlayer = () => {
     if (document.fullscreenElement) document.exitFullscreen().catch(e => {});
     c.style.transition = 'transform 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.4s';
     c.style.transform = 'translateY(100%)';
     c.style.opacity = '0';
     setTimeout(() => {
       c.innerHTML = '';
       c.style.display = 'none';
       document.body.style.overflow = '';
     }, 400);
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
    const total = toUpload.length;
    
    for(let file of toUpload) {
      progressText.innerText = `Compressing & Uploading: ${file.name} (${done + 1}/${total})`;
      
      const compressedDataUrl = await compressPhotoFile(file);
      if (!compressedDataUrl) {
        done++;
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
      try { 
        await saveMemoryToDB(newMem); 
      } catch(err) {
        console.error("Error saving photo inside bulk upload:", err);
      }
      
      done++;
      const percent = Math.round((done / total) * 100);
      progressBarFill.style.width = percent + '%';
      progressPercent.innerText = percent + '%';
      
      // Let painter update for flawless framerate rendering
      await new Promise(r => setTimeout(r, 40));
    }
    
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    
    let endMsg = `Successfully uploaded ${total} photos.`;
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
        mems = appState.memories.filter(m => m.category === mem.category && !m.videoUrl);
        if (mems.length === 0) mems = [mem];
    }
  }
  
  if (mems.length === 0) return alert('No photos available to play.');

  let c = document.getElementById('playbackOverlay');
  if (!c) {
    c = document.createElement('div');
    c.className = 'playback-overlay';
    c.id = 'playbackOverlay';
    document.body.appendChild(c);
  }
  
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
    <div style="width:100%; height:100%; background:black; display:flex; align-items:center; justify-content:center;">
       <img id="ss-image" src="${mems[currentIndex].thumbnail}" style="width:100%; height:100%; object-fit:contain; transition: opacity 1.5s ease-in-out;">
    </div>
    <video src="./netflix-intro.mp4" playsinline autoplay muted id="introPlayer" style="object-fit:cover; width:100%; height:100%; z-index:9000; position:absolute; top:0; left:0; pointer-events:none;"></video>
  `;

  const imgEl = document.getElementById('ss-image');
  const duration = 4000;
  let slideshowInterval;
  
  const startSlideshowLoop = () => {
    const introP = document.getElementById('introPlayer');
    if(introP) introP.style.display = 'none';
    slideshowInterval = setInterval(() => {
      imgEl.style.opacity = '0';
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % mems.length;
        imgEl.src = mems[currentIndex].thumbnail;
        imgEl.style.opacity = '1';
      }, 1500); // Wait for fade out to complete
    }, duration);
  };

  const introPlayer = document.getElementById('introPlayer');
  if (introPlayer) {
    if(introPlayer.play() !== undefined) {
      introPlayer.play().catch(() => startSlideshowLoop());
    }
    introPlayer.onended = startSlideshowLoop;
    introPlayer.onerror = startSlideshowLoop;
  } else {
    startSlideshowLoop();
  }

  const closePlayer = () => {
     clearInterval(slideshowInterval);
     if (document.fullscreenElement) document.exitFullscreen().catch(e => {});
     c.style.transition = 'transform 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.4s ease';
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
  
  const catVal = document.getElementById('bulk-category-select').value;
  const yearVal = document.getElementById('bulk-year-input').value;
  const ratingVal = document.getElementById('bulk-rating-select').value;
  const thumbVal = document.getElementById('bulk-thumbnail-input').value.trim();
  
  if (!catVal && !yearVal && !ratingVal && !thumbVal) {
    window.showToast('Please specify at least one metadata change field.');
    return;
  }
  
  let updatedCount = 0;
  
  for (const id of window.selectedBulkIds) {
    const m = appState.memories.find(item => item.id === id);
    if (m) {
      if (catVal) m.category = catVal;
      if (yearVal) m.year = parseInt(yearVal, 10) || m.year;
      if (ratingVal) m.rating = ratingVal;
      if (thumbVal) m.thumbnail = thumbVal;
      
      try {
        await saveMemoryToDB(m);
        updatedCount++;
      } catch (err) {
        console.error('Error saving in bulk:', err);
      }
    }
  }
  
  sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
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
  for (const id of window.selectedBulkIds) {
    const mIndex = appState.memories.findIndex(item => item.id === id);
    if (mIndex !== -1) {
      appState.memories.splice(mIndex, 1);
      try {
        await deleteDoc(doc(db, 'memories', id));
        deletedCount++;
      } catch (err) {
        console.error('Error deleting from db:', err);
      }
    }
    
    appState.myList = appState.myList.filter(item => item !== id);
    appState.continueWatching = appState.continueWatching.filter(item => item !== id);
    if (appState.likedMemories) {
      appState.likedMemories = appState.likedMemories.filter(item => item !== id);
    }
  }
  
  await saveStateList('myList', appState.myList);
  await saveStateList('continueWatching', appState.continueWatching);
  await saveStateList('likedMemories', appState.likedMemories);
  sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
  
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
