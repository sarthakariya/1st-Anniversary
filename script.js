import { db } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { animate, stagger } from 'motion';

function transitionView(v) { 
  if (appState.view === v) return;
  if (!document.startViewTransition) {
    appState.view = v;
    render();
    return;
  }
  
  try {
    appState.isTransitioning = true;
    const transition = document.startViewTransition(() => {
      appState.view = v;
      render();
    });
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    transition.finished.catch(() => {}).finally(() => {
        appState.isTransitioning = false;
    });
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
  likedList: [],
  continueWatching: [],
  memories: null,
  profiles: null
};

window.addEventListener('storage', (e) => {
  if (e.key === 'netflix_state' || e.key === 'netflix_memories') {
    appState.memories = JSON.parse(sessionStorage.getItem('netflix_memories') || 'null');
    const newState = JSON.parse(sessionStorage.getItem('netflix_state') || '{}');
    if(newState.myList) appState.myList = newState.myList;
    if(newState.likedList) appState.likedList = newState.likedList;
    if(newState.continueWatching) appState.continueWatching = newState.continueWatching;
    if(newState.settings) appState.settings = newState.settings;
    if(newState.profiles) appState.profiles = newState.profiles;
    
    // Smooth layout reflow
    const dashboard = document.querySelector('.dashboard-container');
    if (dashboard) {
      dashboard.style.opacity = '0.5';
      setTimeout(() => {
        window.refreshRowsView();
        dashboard.style.transition = 'opacity 0.4s ease';
        dashboard.style.opacity = '1';
      }, 300);
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
const subCategories = ['Celebrations', 'Romance', 'Our Time', 'Documentaries'];

async function loadData() {
  const cachedState = sessionStorage.getItem('netflix_state');
  const cachedMemories = sessionStorage.getItem('netflix_memories');
  if (cachedState && cachedMemories) {
    const data = JSON.parse(cachedState);
    if(data.myList) appState.myList = data.myList;
    if(data.continueWatching) appState.continueWatching = data.continueWatching;
    if(data.settings) appState.settings = data.settings;
    if(data.profiles && data.profiles.length > 0) appState.profiles = data.profiles;
    appState.memories = JSON.parse(cachedMemories);
    return;
  }

  const stateDoc = await getDoc(doc(db, 'user_state', 'household'));
  if (stateDoc.exists()) {
    const data = stateDoc.data();
    if(data.myList) appState.myList = data.myList;
    if(data.continueWatching) appState.continueWatching = data.continueWatching;
    if(data.settings) appState.settings = data.settings;
    if(data.profiles && data.profiles.length > 0) appState.profiles = data.profiles;
  } else {
    appState.profiles = [...initialProfiles];
    try {
      await setDoc(doc(db, 'user_state', 'household'), {
        myList: appState.myList,
        continueWatching: appState.continueWatching,
        settings: appState.settings,
        profiles: appState.profiles
      });
    } catch(err) {
      console.warn("Could not save initial state", err);
    }
  }

  const memSnapshot = await getDocs(collection(db, 'memories'));
  appState.memories = memSnapshot.docs.map(d => d.data());
  
  sessionStorage.setItem('netflix_state', JSON.stringify({
    myList: appState.myList,
    continueWatching: appState.continueWatching,
    settings: appState.settings,
    profiles: appState.profiles
  }));
  sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));

  if (appState.currentProfile) {
    const pfData = appState.profiles.find(p => p.name === appState.currentProfile);
    if (!pfData) {
      appState.currentProfile = null;
      localStorage.removeItem('sarthak_netflix_profile');
    }
  }
}

async function saveMemoryToDB(memory) {
  if(!memory.id) memory.id = "m_" + Date.now();
  try {
    await setDoc(doc(db, 'memories', memory.id), memory);
  } catch (err) {
    console.warn("Failed to save memory to DB:", err);
  }
}

async function saveStateList(key, data) {
  appState[key] = data;
  sessionStorage.setItem('netflix_state', JSON.stringify({
    myList: appState.myList,
    continueWatching: appState.continueWatching,
    settings: appState.settings,
    profiles: appState.profiles
  }));
  try {
    await setDoc(doc(db, 'user_state', 'household'), {
      [key]: data
    }, { merge: true });
  } catch (err) {
    console.warn("Failed to save state to DB:", err);
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.upload-modal.open, .detail-overlay.open');
    openModals.forEach(m => {
      m.classList.remove('open');
      setTimeout(() => { m.remove(); if (appState.view !== 'dashboard') render(); else window.refreshRowsView(); }, 400);
    });
  }
});
document.addEventListener('click', (e) => {
  const openModals = document.querySelectorAll('.upload-modal.open, .detail-overlay.open');
  openModals.forEach(m => {
    if (e.target === m) {
      m.classList.remove('open');
      setTimeout(() => { m.remove(); if (appState.view !== 'dashboard') render(); else window.refreshRowsView(); }, 300);
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
  
  app.innerHTML = '';
  if (appState.view === 'startup') app.appendChild(createStartupScreen());
  else if (appState.view === 'profiles') {
    const profs = createProfileSelection();
    app.appendChild(profs);
    
    // Entrance Animation (Skip if view transitioning)
    if(!appState.isTransitioning) {
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
  }
  else if (appState.view === 'intro') app.appendChild(createIntroScreen());
  else if (appState.view === 'dashboard') {
    const dashboard = createDashboard();
    app.appendChild(dashboard);
    
    // Entrance Animation (Skip if view transitioning)
    if(!appState.isTransitioning) {
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

window.refreshRowsView = (rcNode, heroNode) => {
  const rc = rcNode || document.querySelector('.slider-container');
  const hero = heroNode || document.getElementById('hero-section');
  if(!rc) return;
  
  rc.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  rc.style.opacity = '0';
  rc.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
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
  
  if (['Home', 'Dates'].includes(appState.activeCategory) && appState.continueWatching.length > 0) {
    const cw = appState.memories.filter(m => appState.continueWatching.includes(m.id));
    if(cw.length) rc.appendChild(createRow('Continue Watching', cw, rowIndex++));
  }
  
  if (appState.likedList && appState.likedList.length > 0 && ['Home', 'Dates'].includes(appState.activeCategory)) {
    const liked = appState.memories.filter(m => appState.likedList.includes(m.id));
    if(liked.length) rc.appendChild(createRow('Liked Memories', liked, rowIndex++));
  }
  
  if (appState.activeCategory === 'My List') {
    rc.appendChild(createRow('My List', appState.memories.filter(m => appState.myList.includes(m.id)), rowIndex++));
  } else if (appState.activeCategory === 'Categories') {
    subCategories.forEach(cat => {
      const mems = appState.memories.filter(m => String(m.category).toLowerCase() === cat.toLowerCase());
      if (mems.length) rc.appendChild(createRow(cat, mems, rowIndex++));
    });
  } else if (appState.activeCategory === 'Moments') {
    // Show local array instantly to feel responsive, then fetch from firestore
    const fetchAndRenderGallery = async () => {
      let galleryItems = appState.memories.filter(m => String(m.category).toLowerCase() === 'moments');
      
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
      subCategories.forEach(cat => {
        const mems = appState.memories.filter(m => String(m.category).toLowerCase() === cat.toLowerCase());
        if (mems.length) rc.appendChild(createRow(cat, mems, rowIndex++));
      });
      rc.appendChild(createRow('Recent Additions', [...appState.memories].filter(m => String(m.category).toLowerCase() !== 'moments').sort((a,b) => b.dateAdded - a.dateAdded), rowIndex++));
    }
    // For Dates
    if (appState.activeCategory === 'Dates') {
      rc.appendChild(createRow('Timeline (Newest First)', [...appState.memories].filter(m => String(m.category).toLowerCase() !== 'moments').sort((a,b) => b.dateAdded - a.dateAdded), rowIndex++));
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
  }, 300);
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
  if (appState.myList.includes(id)) {
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
  
  window.refreshRowsView();
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
        vid.play().catch(() => {});
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

// Netflix style modals
window.netflixAlert = (msg) => {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'pin-overlay';
    ov.innerHTML = `
      <div class="pin-container" style="background:#141414; padding:30px; border-radius:8px; width:400px; max-width:90%;">
        <h2 style="margin-bottom:15px; font-size:24px;">Notice</h2>
        <p style="color:#aaa; margin-bottom:25px;">${msg}</p>
        <button class="btn btn-primary" id="na-ok" style="width:100%;">OK</button>
      </div>
    `;
    document.body.appendChild(ov);
    ov.querySelector('#na-ok').onclick = () => { ov.remove(); resolve(); };
  });
};

window.netflixConfirm = (msg) => {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'pin-overlay';
    ov.innerHTML = `
      <div class="pin-container" style="background:#141414; padding:30px; border-radius:8px; width:400px; max-width:90%;">
        <h2 style="margin-bottom:15px; font-size:24px;">Confirm</h2>
        <p style="color:#aaa; margin-bottom:25px;">${msg}</p>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" id="nc-cancel" style="flex:1;">Cancel</button>
          <button class="btn btn-primary" id="nc-ok" style="flex:1; background:#e50914; color:white;">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    ov.querySelector('#nc-cancel').onclick = () => { ov.remove(); resolve(false); };
    ov.querySelector('#nc-ok').onclick = () => { ov.remove(); resolve(true); };
  });
};

window.netflixPrompt = (msg, defaultVal = '') => {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'pin-overlay';
    ov.innerHTML = `
      <div class="pin-container" style="background:#141414; padding:30px; border-radius:8px; width:400px; max-width:90%;">
        <h2 style="margin-bottom:15px; font-size:24px;">Input required</h2>
        <p style="color:#aaa; margin-bottom:15px;">${msg.replace(/\n/g, '<br>')}</p>
        <input type="text" id="np-input" class="form-control" value="${defaultVal}" style="width:100%; padding:10px; background:#333; color:white; border:none; border-radius:4px; margin-bottom:20px; font-size:16px;">
        <div style="display:flex; gap:10px;">
           <button class="btn btn-secondary" id="np-cancel" style="flex:1;">Cancel</button>
           <button class="btn btn-primary" id="np-ok" style="flex:1;">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    const inp = ov.querySelector('#np-input');
    inp.focus();
    ov.querySelector('#np-cancel').onclick = () => { ov.remove(); resolve(null); };
    ov.querySelector('#np-ok').onclick = () => { ov.remove(); resolve(inp.value); };
  });
};

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
        <img id="nav-logo-img" style="height: 75px; object-fit: contain; cursor: pointer;" src="./Netflix-Logo-Streaming-Platform-765.png" alt="Netflix">
      </div>
      <ul class="nav-links" style="gap: 25px; margin-left: 40px; position:relative; font-size: 14px; font-weight: 500;">
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

        <div class="profile-dropdown" style="display:flex; align-items:center; margin-left: 20px; cursor: pointer;">
          <img src="${currAvatar}" width="32" height="32" style="border-radius:4px; object-fit: cover; display: block; margin-right: 5px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
          <div class="dropdown-menu">
            <div class="dropdown-item" onclick="openUploadModal()">🎬 Add Memory</div>
            <div class="dropdown-item" onclick="openSettingsModal()">⚙ Settings</div>
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

window.currentHeroIndex = window.currentHeroIndex || 0;
window.isShufflingHero = false;
window.shuffleHero = () => {
  if (window.isShufflingHero) return;
  const vids = appState.memories.filter(m => String(m.category).toLowerCase() !== 'moments' && m.videoUrl);
  if(vids.length > 0) window.currentHeroIndex = (window.currentHeroIndex + 1) % Math.min(5, vids.length);
  
  const currentHero = document.querySelector('.hero-billboard');
  if(currentHero) {
    const shuffleBtn = currentHero.querySelector('#hero-shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.classList.remove('spin-animation');
      void shuffleBtn.offsetWidth; // trigger reflow
      shuffleBtn.classList.add('spin-animation');
    }
    window.isShufflingHero = true;
    const newHero = createHero();
    newHero.style.position = 'absolute';
    newHero.style.top = '0';
    newHero.style.left = '0';
    newHero.style.zIndex = '11';
    newHero.style.opacity = '0';
    newHero.style.transition = 'opacity 0.8s ease';
    
    currentHero.parentNode.insertBefore(newHero, currentHero.nextSibling);
    
    // slight delay to allow video to start buffering
    setTimeout(() => {
      newHero.style.opacity = '1';
      setTimeout(() => {
        newHero.style.position = 'relative';
        newHero.style.zIndex = '';
        currentHero.remove();
        window.isShufflingHero = false;
      }, 800);
    }, 100);
  }
};

function createHero() {
  const c = document.createElement('div');
  c.className = 'hero-billboard';
  
  if (!appState.memories) {
    c.innerHTML = `<div class="skeleton-card" style="width:100%; height:85vh; border-radius:0;"></div>`;
    return c;
  }

  const vids = appState.memories.filter(m => String(m.category).toLowerCase() !== 'moments' && m.videoUrl);
  if(vids.length === 0) return c;
  const heroMem = vids[window.currentHeroIndex % vids.length] || vids[0];
  const isYouTube = heroMem && heroMem.videoUrl && !heroMem.videoUrl.includes('/') && !heroMem.videoUrl.includes('blob:');
  
  let backgroundVideoHtml = '';
  if (appState.settings.autoPlayPreviews && heroMem.videoUrl) {
    const isMuted = appState.isHeroMuted !== false; // Default to true for autoplay compatibility
    if (isYouTube) {
      backgroundVideoHtml = `<div style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;pointer-events:none;display:flex;align-items:center;justify-content:center;"><div style="position:relative;width:100vw;aspect-ratio:16/9;"><iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${heroMem.videoUrl}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${heroMem.videoUrl}&enablejsapi=1&vq=hd1080&disablekb=1" style="position:absolute;top:50%;left:50%;width:120%;height:120%;transform:translate(-50%, -50%); border:none; pointer-events: none;"></iframe></div></div>`;
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
      <div class="hero-title">${heroMem.title}</div>
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
        <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
    <div class="slider-arrow slider-left"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><polyline points="15 18 9 12 15 6"></polyline></svg></div>
    <div class="row-content" style="position:relative;"></div>
    <div class="slider-arrow slider-right"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
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
        <div class="hc-title" style="font-size:16px; font-weight:700; margin-bottom:8px; line-height:1.2; text-shadow:0 1px 2px rgba(0,0,0,0.8); opacity:0.9;">${m.title}</div>
        <div class="hc-buttons">
          <div class="hc-btn hc-play" title="Play">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </div>
          <div class="hc-btn hc-add" title="Add to My List">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <div class="hc-btn hc-like" title="Like">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <div style="flex:1;"></div>
          <div class="hc-btn hc-more" title="More Info">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
        <div class="hc-meta">
          <span class="hc-match">98% Match</span>
          <span class="hc-rating">${m.rating || 'TV-14'}</span>
          <span class="hc-badge">HD</span>
        </div>
        <div class="hc-genres">
          <span>Emotional</span><span class="hc-dot">•</span><span>Heartfelt</span><span class="hc-dot">•</span><span>Romance</span>
        </div>
      </div>
    `;
    
    card.onmouseenter = () => {
      const r = card.getBoundingClientRect();
      const ww = window.innerWidth;
      requestAnimationFrame(() => {
        if (r.left < 50) {
          card.style.transformOrigin = 'left center';
        } else if (ww - r.right < 50) {
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
            wrap.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2;border-radius:4px; opacity:0; transition:opacity 0.8s ease;';
            const v = document.createElement('iframe');
            v.src = `https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&vq=hd1080&disablekb=1`;
            v.style.cssText = 'position:absolute;top:50%;left:50%;width:150%;height:150%;border:none;pointer-events:none;transform:translate(-50%,-50%) scale(1.25);';
            wrap.appendChild(v);
            card.appendChild(wrap);
            setTimeout(() => wrap.style.opacity = '1', 1200); // Wait for YT player to load
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
            v.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;background:transparent;z-index:2;border-radius:4px; opacity:0; transition:opacity 0.4s ease;';
            card.appendChild(v);
            v.addEventListener('playing', () => v.style.opacity = '1');
            v.play().catch(e => console.log('Autoplay prevented'));
          }
        }
      }, 1000); // 1s hover delay
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
    <div class="upload-modal-content" style="display:flex; flex-direction:column; padding:0; background:#141414; border:1px solid rgba(255,255,255,0.08); box-shadow: -10px 0 40px rgba(0,0,0,0.8); border-radius:4px 0 0 4px;">
      <div style="padding: 20px 30px; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
        <h2 style="margin:0; font-size: 20px; font-weight:600; letter-spacing:0.5px;">Add New Memory</h2>
        <button class="upload-close" style="position:static; background:transparent; font-size:28px;" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);">&times;</button>
      </div>
      
      <div style="padding: 30px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:25px;">
        <div style="padding: 15px 20px; background: rgba(229, 9, 20, 0.1); backdrop-filter: blur(10px); border-radius: 4px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #ccc;">Please upload your video to YouTube Studio first.</p>
          <button style="background: transparent; border:none; color:#E5E5E5; padding: 0; font-size:14px; cursor:pointer; transition: color 0.2s;" onmouseenter="this.style.color='#e50914'" onmouseleave="this.style.color='#E5E5E5'" onclick="window.open('https://studio.youtube.com/channel/UC3b6az9clhBSOjpXJW0-mFA/videos/upload', '_blank')">
            Open YouTube Studio &nearrow;
          </button>
        </div>

        <div>
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">YouTube Video Link</label>
          <div style="display:flex; gap:10px;">
            <input type="text" id="up-yt-link" placeholder="https://www.youtube.com/watch?v=..." style="flex:1; background:#222; border:1px solid transparent; padding:12px 16px; border-radius:4px; color:white; font-family:monospace; outline:none; transition: all 0.3s;" onfocus="this.style.background='#2b2b2b'; this.style.borderColor='rgba(255,255,255,0.3)';" onblur="this.style.background='#222'; this.style.borderColor='transparent';">
            <button id="up-fetch" style="background:rgba(255,255,255,0.1); color:white; border:none; padding:0 20px; border-radius:4px; font-weight:600; cursor:pointer; transition: background 0.3s; white-space:nowrap;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'">Fetch</button>
          </div>
        </div>
        
        <div id="up-preview-container" style="position: relative; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" onmouseenter="document.getElementById('up-thumb-overlay').style.opacity='1'" onmouseleave="document.getElementById('up-thumb-overlay').style.opacity='0'">
          <img id="up-thumb-preview" src="https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&q=80" style="width: 100%; height: 200px; object-fit: cover; display: block; filter: brightness(0.6);">
          <div id="up-thumb-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease; backdrop-filter:blur(2px);">
            <label for="up-thumb-upload" style="background:rgba(229,9,20,0.9); color:white; padding:10px 20px; border-radius:4px; font-size:13px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 15px rgba(0,0,0,0.4);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Custom Thumbnail
            </label>
            <input type="file" id="up-thumb-upload" accept="image/*" style="display:none;" onchange="
              const f = this.files[0];
              if(f) {
                const r = new FileReader();
                r.onload = e => {
                   document.getElementById('up-thumb-preview').src = e.target.result;
                   window.currentThumbData = e.target.result;
                };
                r.readAsDataURL(f);
              }
            ">
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Title</label>
          <input type="text" id="up-title" style="width:100%; background:#222; border:1px solid transparent; border-radius:4px; padding:12px 16px; color:white; font-size:15px; outline:none; transition:all 0.3s;" onfocus="this.style.background='#2b2b2b'; this.style.borderColor='rgba(255,255,255,0.3)';" onblur="this.style.background='#222'; this.style.borderColor='transparent';" required>
        </div>

        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888;">Description</label>
            <button id="up-ai-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:#ccc; padding:4px 10px; font-size:11px; border-radius:4px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:4px; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff';" onmouseleave="this.style.background='transparent'; this.style.color='#ccc';" onclick="
              const btn = this;
            const t = document.getElementById('up-title').value;
            const vid = window.extractedVideoId || '';
            if(!t) return alert('Enter title first or fetch video.');
            btn.innerText = 'Analyzing...';
            btn.disabled = true;
            fetch('/api/analyze-video', {
               method: 'POST', headers:{'Content-Type':'application/json'},
               body: JSON.stringify({title: t, videoId: vid})
            }).then(r=>r.json()).then(d=>{
               if(d.description) {
                 document.getElementById('up-desc').value = d.description;
                 document.getElementById('up-desc').focus();
               }
               btn.innerText = '✨ AI Auto-Fill';
               btn.disabled = false;
            }).catch(()=>{
               btn.innerText = '✨ AI Auto-Fill';
               btn.disabled = false;
            });
          ">✨ AI Auto-Fill</button>
          </div>
          <textarea id="up-desc" rows="4" style="width:100%; background:#222; border:1px solid transparent; border-radius:4px; padding:12px 16px; color:white; font-size:15px; outline:none; resize:none; transition:all 0.3s;" onfocus="this.style.background='#2b2b2b'; this.style.borderColor='rgba(255,255,255,0.3)';" onblur="this.style.background='#222'; this.style.borderColor='transparent';" required></textarea>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom: 20px;">
          <div>
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Category</label>
            <select id="up-cat" style="width:100%; background:#222; border:1px solid transparent; padding:12px 16px; border-radius:4px; color:white; outline:none; transition: all 0.3s;" onfocus="this.style.background='#2b2b2b'" onblur="this.style.background='#222'">
              <option value="Dates" style="background:#141414;">Dates</option>
              <option value="My Fav" style="background:#141414;">My Fav</option>
              <option value="Celebrations" style="background:#141414;">Celebrations</option>
              <option value="Romance" style="background:#141414;">Romance</option>
              <option value="Our Time" style="background:#141414;">Our Time</option>
              <option value="Documentaries" style="background:#141414;">Documentaries</option>
            </select>
          </div>
          <div>
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Date / Year</label>
            <input type="date" id="up-date" style="width:100%; background:#222; border:1px solid transparent; padding:12px 16px; border-radius:4px; color:white; outline:none; transition: all 0.3s;" onfocus="this.style.background='#2b2b2b'" onblur="this.style.background='#222'" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div>
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Maturity Rating</label>
          <select id="up-rating" style="width:100%; background:#222; border:1px solid transparent; padding:12px 16px; border-radius:4px; color:white; outline:none; transition: all 0.3s;" onfocus="this.style.background='#2b2b2b'" onblur="this.style.background='#222'">
            <option value="U/A 7+" style="background:#141414;">U/A 7+</option>
            <option value="U/A 13+" style="background:#141414;">U/A 13+</option>
            <option value="U/A 16+" style="background:#141414;">U/A 16+</option>
            <option value="U/A 18+" selected style="background:#141414;">U/A 18+</option>
            <option value="A" style="background:#141414;">A</option>
          </select>
        </div>
      </div>
      
      <div style="padding: 20px 30px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); display:flex; gap:15px; justify-content:flex-end;">
        <button style="background:transparent; border:none; color:#A3A3A3; padding:12px 20px; font-size:15px; font-weight:600; cursor:pointer; height:44px; transition:color 0.2s;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#A3A3A3'" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);">Cancel</button>
        <button id="up-publish" style="background:#e50914; border:none; color:white; padding:0 30px; font-size:15px; font-weight:700; height:44px; border-radius:4px; cursor:pointer; transition:all 0.2s; position:relative;" onmouseenter="this.style.background='#b20710'; this.style.transform='translateY(-1px)';" onmouseleave="this.style.background='#e50914'; this.style.transform='translateY(0)';">Publish Memory</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
  
  let currentThumbData = '';
  let extractedVideoId = '';
  window.extractedVideoId = '';
  window.currentThumbData = '';

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
      const oembedRes = await fetch('/api/youtube-meta', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ videoId })
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) document.getElementById('up-title').value = data.title;
        // Always prefer maxresdefault for crystal clear thumbnails
        window.currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
        document.getElementById('up-thumb-preview').src = window.currentThumbData;
        document.getElementById('up-preview-container').style.display = 'block';
      } else {
         window.currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
         document.getElementById('up-thumb-preview').src = window.currentThumbData;
         document.getElementById('up-preview-container').style.display = 'block';
      }
    } catch(err) {
         window.currentThumbData = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
         document.getElementById('up-thumb-preview').src = window.currentThumbData;
         document.getElementById('up-preview-container').style.display = 'block';
    }
    window.extractedVideoId = videoId;
    extractedVideoId = videoId;
    
    document.getElementById('up-fetch').innerText = "Fetch Video Metadata";
  };

  document.getElementById('up-publish').onclick = async (e) => {
    const title = document.getElementById('up-title').value.trim();
    if(!title) return netflixAlert("Title required");
    
    let link = document.getElementById('up-yt-link').value.trim();
    if(!link && !window.extractedVideoId) return netflixAlert("Please provide a video link or ID.");

    if (!window.extractedVideoId && link) {
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = link.match(regExp);
        if (match && match[2].length === 11) {
          window.extractedVideoId = match[2];
        } else {
          window.extractedVideoId = link; // Default to the raw URL or string
        }
    }

    e.target.innerText = "Adding...";
    e.target.disabled = true;

    let finalThumbnail = window.currentThumbData || (window.extractedVideoId.length === 11 ? 'https://img.youtube.com/vi/' + window.extractedVideoId + '/maxresdefault.jpg' : '');
    
    const mem = {
      id: 'm_' + Date.now(),
      title,
      desc: document.getElementById('up-desc').value,
      category: document.getElementById('up-cat').value,
      year: document.getElementById('up-date').value || new Date().getFullYear().toString(),
      rating: document.getElementById('up-rating').value,
      thumbnail: finalThumbnail,
      videoUrl: window.extractedVideoId,
      dateAdded: Date.now(),
      uploadedBy: appState.currentProfile
    };

    try {
      await saveMemoryToDB(mem);
    } catch(err) {
      console.warn("Failed to save to DB:", err);
    }
    appState.memories.unshift(mem);
    
    // Fix: Explicitly save to session storage
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    
    window.justUploadedId = mem.id;
    const modalEl = document.getElementById('uploadModal');
    modalEl.classList.remove('open');
    setTimeout(() => {
      modalEl.remove();
      if (appState.view !== 'dashboard') render(); else window.refreshRowsView();
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
  const isLiked = (appState.likedList || []).includes(id);

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
      (isYouTube ? `
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden;">
          <iframe id="detail-yt-player" src="https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&vq=hd1080&playlist=${m.videoUrl}&loop=1" style="position:absolute; top:50%; left:50%; width:150%; height:150%; transform:translate(-50%,-50%); border:none; pointer-events:none;"></iframe>
          <img id="detail-thumb-cover" src="${m.thumbnail}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; transition:opacity 0.8s ease;">
        </div>` : 
        `
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden;">
          <video src="${m.videoUrl}" autoplay muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1; pointer-events:none;"></video>
          <img id="detail-thumb-cover" src="${m.thumbnail}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; transition:opacity 0.8s ease;" onload="setTimeout(() => this.style.opacity='0', 500)">
        </div>`
      ) : 
      `<img src="${m.thumbnail}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">`;

  modal.innerHTML = `
    <div class="detail-modal" style="transform-origin: ${originX} ${originY};">
      <div class="modal-controls">
        <button class="modal-close-btn" onclick="const dm = document.getElementById('detailModal'); const v = dm.querySelectorAll('video, iframe'); v.forEach(el => { el.src=''; if(el.load) el.load(); }); dm.classList.remove('open'); setTimeout(() => { dm.remove(); render(); }, 300);">&times;</button>
      </div>
      <div class="detail-header">
        ${mediaHtml}
        <div class="detail-gradient"></div>
        <div class="detail-title-btn">
          <div class="detail-title" id="dm-title">${m.title}</div>
          <input type="text" id="dm-title-edit" class="edit-input hidden" value="${m.title}" style="font-size:36px; font-weight:bold; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:5px; margin-bottom:10px; width:100%; border-radius:4px; font-family:inherit;">
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-left">
          <div style="display:flex; gap:10px; align-items:center; margin-bottom: 25px; margin-top: -15px;">
            <button class="btn btn-primary" id="dm-play-btn" onclick="playVideo('${m.id}')" style="padding: 10px 30px; font-size: 16px;">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polygon points="6 3 20 12 6 21 6 3"/></svg> Play
            </button>
            <button class="btn btn-secondary" id="dm-edit-btn" onclick="toggleDetailEdit()" style="padding: 10px 20px; font-size: 16px;">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit Info
            </button>
            <button class="btn btn-primary hidden" id="dm-save-btn" onclick="saveDetailEdit('${m.id}')" style="padding: 10px 30px; font-size: 16px; background:#46d369; color:black;">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg> Save
            </button>
            
            <div class="circ-play-btn" onclick="toggleMyList('${m.id}', event)" title="${inMyList ? 'Remove from List' : 'Add to My List'}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${inMyList ? 'M5 12l5 5L20 7' : 'M12 5v14M5 12h14'}"/></svg>
            </div>
            <div class="circ-play-btn" id="dm-like-btn" onclick="likeMemory('${m.id}', event)" title="${isLiked ? 'Unlike' : 'Like'}">
              <svg width="20" height="20" viewBox="0 0 24 24" ${isLiked ? 'fill="#e50914" stroke="#e50914"' : 'fill="none" stroke="currentColor"'} stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
            </div>
            <div class="circ-play-btn" onclick="downloadVideo('${m.id}')" title="Download">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </div>
            <div class="circ-play-btn" id="dm-delete-btn" onclick="deleteMemory('${m.id}')" title="Delete Memory">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
          </div>
          <div class="detail-meta">
            <span style="color: #46d369; text-shadow: 0 0 5px rgba(70,211,105,0.5); font-weight: bold;">${m.matchRate || 99}% Romantic Match</span> 
            <span class="year">${m.year}</span> 
            <span class="rating">${m.rating}</span> 
            <span class="duration">${m.duration || (Math.floor(Math.random() * 3) + 1 + 'h ' + Math.floor(Math.random() * 59) + 'm')}</span> 
            <span class="quality">4K Ultra HD</span>
          </div>
          <div class="detail-desc" id="dm-desc">${m.desc || 'A beautiful memory worth reliving.'}</div>
          <textarea id="dm-desc-edit" class="edit-input hidden" style="width:100%; height:100px; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:10px; border-radius:4px; font-family:inherit; resize:vertical; font-size:16px;">${m.desc || ''}</textarea>
          
          <div id="dm-thumb-edit" class="hidden" style="margin-top:20px; border-top:1px solid #333; padding-top:20px; display:flex; gap:15px; flex-direction:column;">
            <div>
              <div style="font-size:14px; color:#aaa; margin-bottom:10px;">Date / Year</div>
              <input type="date" id="dm-date-edit" value="${m.year || ''}" style="width:100%; background:rgba(255,255,255,0.1); border:none; padding:10px 15px; border-radius:4px; color:white; outline:none;">
            </div>
            <div>
              <div style="font-size:14px; color:#aaa; margin-bottom:10px;">Maturity Rating</div>
              <select id="dm-rating-edit" style="width:100%; background:rgba(255,255,255,0.1); border:none; padding:10px 15px; border-radius:4px; color:white; outline:none;">
                <option value="U/A 7+" ${m.rating === 'U/A 7+' ? 'selected' : ''} style="background:#141414;">U/A 7+</option>
                <option value="U/A 13+" ${m.rating === 'U/A 13+' ? 'selected' : ''} style="background:#141414;">U/A 13+</option>
                <option value="U/A 16+" ${m.rating === 'U/A 16+' ? 'selected' : ''} style="background:#141414;">U/A 16+</option>
                <option value="U/A 18+" ${m.rating === 'U/A 18+' ? 'selected' : ''} style="background:#141414;">U/A 18+</option>
                <option value="A" ${m.rating === 'A' ? 'selected' : ''} style="background:#141414;">A</option>
              </select>
            </div>
            <div>
              <div style="font-size:14px; color:#aaa; margin-bottom:10px;">Replace Thumbnail Image</div>
              <div id="dm-thumb-name" style="font-size:12px; color:#46d369; margin-bottom:5px;"></div>
              <button style="background: rgba(255,255,255,0.1); border:none; color:white; padding: 10px 15px; border-radius:4px; font-size:13px; cursor:pointer; width:100%; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.2)'" onmouseleave="this.style.background='rgba(255,255,255,0.1)'" onclick="document.getElementById('dm-thumb-input').click()">📁 Select New Image</button>
              <input type="file" id="dm-thumb-input" accept="image/*" style="display:none;" onchange="if(this.files[0]) document.getElementById('dm-thumb-name').innerText = 'Selected: ' + this.files[0].name.substring(0,25) + '...'">
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
  
  if(title.classList.contains('hidden')) {
    title.classList.remove('hidden');
    desc.classList.remove('hidden');
    playBtn.classList.remove('hidden');
    editBtn.classList.remove('hidden');
    titleEdit.classList.add('hidden');
    descEdit.classList.add('hidden');
    saveBtn.classList.add('hidden');
    thumbEdit.classList.add('hidden');
  } else {
    title.classList.add('hidden');
    desc.classList.add('hidden');
    playBtn.classList.add('hidden');
    editBtn.classList.add('hidden');
    titleEdit.classList.remove('hidden');
    descEdit.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
    thumbEdit.classList.remove('hidden');
    titleEdit.focus();
  }
};

window.saveDetailEdit = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  if (m) {
    const saveBtn = document.getElementById('dm-save-btn');
    saveBtn.innerText = "Saving...";
    
    m.title = document.getElementById('dm-title-edit').value;
    m.desc = document.getElementById('dm-desc-edit').value;
    if(document.getElementById('dm-date-edit')) m.year = document.getElementById('dm-date-edit').value;
    if(document.getElementById('dm-rating-edit')) m.rating = document.getElementById('dm-rating-edit').value;

    const fileInput = document.getElementById('dm-thumb-input');
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
    }

    try { await saveMemoryToDB(m); } catch(err) {}
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    document.getElementById('dm-title').innerText = m.title;
    document.getElementById('dm-desc').innerText = m.desc;
    
    // update thumbnail visually
    const previewImg = document.getElementById('detailModal').querySelector('.detail-header img');
    if (previewImg) previewImg.src = m.thumbnail;

    saveBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
    setTimeout(() => {
        if (appState.view !== 'dashboard') render(); else window.refreshRowsView();
        toggleDetailEdit();
        saveBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg> Save`;
    }, 1000);
  }
};

window.deleteMemory = async (id) => {
  appState.memories = appState.memories.filter(m => m.id !== id);
  appState.myList = appState.myList.filter(lId => lId !== id);
  try { await deleteDoc(doc(db, 'memories', id)); } catch(e){}
  sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
  saveStateList('myList', appState.myList);
  const detailModal = document.getElementById('detailModal');
  if (detailModal) {
    detailModal.classList.remove('open');
    setTimeout(() => { detailModal.remove(); }, 300);
  }
  if (appState.view === 'dashboard') {
    window.refreshRowsView();
  } else {
    render();
  }
};

window.likeMemory = (id, event) => {
  if (event) event.stopPropagation();
  if (appState.likedList.includes(id)) {
    appState.likedList = appState.likedList.filter(i => i !== id);
  } else {
    appState.likedList.push(id);
  }
  saveStateList('likedList', appState.likedList);
  
  if (event && event.currentTarget) {
    const btn = event.currentTarget;
    const isLiked = appState.likedList.includes(id);
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" ${isLiked ? 'fill="#e50914" stroke="#e50914"' : 'fill="none" stroke="currentColor"'} stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;
    btn.title = isLiked ? 'Unlike' : 'Like';
  }
  
  window.refreshRowsView();
};

window.downloadVideo = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  if (!m || !m.videoUrl) return await netflixAlert('Video not available to download.');
  
  if (m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:')) {
    // It's a YouTube video
    window.open(`https://www.youtube.com/watch?v=${m.videoUrl}`, '_blank');
  } else {
    // It's a native video
    const a = document.createElement('a');
    a.href = m.videoUrl;
    a.download = m.title + '.mp4';
    a.click();
  }
};

window.shareVideo = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  let link = window.location.origin + window.location.pathname + "?v=" + id;
  if(m && m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:')) {
     link = `https://www.youtube.com/watch?v=${m.videoUrl}`;
  }
  
  if(navigator.clipboard && window.isSecureContext) {
    try {
       await navigator.clipboard.writeText(link);
       await netflixAlert("Video link copied to clipboard!\n" + link);
    } catch(e) {
       await netflixPrompt("Copy this link to share:", link);
    }
  } else {
    await netflixPrompt("Copy this link to share:", link);
  }
};

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
  
  if(!document.getElementById('spin-anim-style')) {
    const s = document.createElement('style');
    s.id = 'spin-anim-style';
    s.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }
  c.insertAdjacentHTML('beforeend', `
    <div id="playback-loading" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:10000; pointer-events:none; transition:opacity 0.5s;">
      <svg width="50" height="50" viewBox="0 0 50 50" style="animation: spin 1s linear infinite;">
        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4" />
        <circle cx="25" cy="25" r="20" fill="none" stroke="#e50914" stroke-width="4" stroke-dasharray="31.4 100" stroke-linecap="round" />
      </svg>
    </div>
  `);
  const loader = document.getElementById('playback-loading');
  
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
    if (mainPlayer.tagName.toLowerCase() === 'video') {
      mainPlayer.addEventListener('playing', () => loader.style.display = 'none');
      mainPlayer.addEventListener('waiting', () => loader.style.display = 'block');
      if (mainPlayer.readyState >= 3) loader.style.display = 'none';
    } else {
      setTimeout(() => loader.style.display = 'none', 1500); // iframe heuristic
    }
    
    // Auto play when transition is done
    if (!isYouTube) {
      const pPromise = mainPlayer.play();
      if(pPromise !== undefined) pPromise.catch(e => console.error("Autoplay main video prevented", e));
    }
  };
  
  // Try autoplaying intro, else wait
  if (introPlayer) {
    const playPromise = introPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => startMainVideo());
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
      if (mainPlayer.paused) mainPlayer.play().catch(() => {});
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

  const urlParams = new URLSearchParams(window.location.search);
  const vId = urlParams.get('v');
  if (vId) {
    if(!appState.currentProfile) {
       appState.currentProfile = appState.profiles && appState.profiles.length > 0 ? appState.profiles[0].name : 'User';
       appState.screen = 'dashboard';
       render();
    }
    setTimeout(() => {
       window.openDetailModal(vId);
    }, 500);
  }
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
    
    // Add Progress Bar
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = 'width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin-bottom: 20px; overflow: hidden; position: relative;';
    const progressBar = document.createElement('div');
    progressBar.style.cssText = 'width: 0%; height: 100%; background: #e50914; transition: width 0.3s ease;';
    progressContainer.appendChild(progressBar);
    dropZone.parentNode.insertBefore(progressContainer, saveBtn.parentNode);

    const maxFiles = Array.from(input.files);
    let done = 0;
    
    for(let file of maxFiles) {
      await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const resizedData = canvas.toDataURL('image/jpeg', 0.8);

            const newMem = {
              id: 'm_' + Date.now() + Math.floor(Math.random() * 1000),
              title: file.name.split('.')[0] || 'Photo',
              desc: '',
              category: 'Moments',
              year: new Date().getFullYear().toString(),
              rating: 'PG-13',
              matchRate: 99,
              thumbnail: resizedData,
              videoUrl: '', // Just an image
              dateAdded: Date.now()
            };
            appState.memories.push(newMem);
            try { await saveMemoryToDB(newMem); } catch(err){}
            
            done++;
            progressBar.style.width = (done / maxFiles.length * 100) + '%';
            setTimeout(resolve, 10);
          };
          img.src = e.target.result;
        };
        reader.onerror = resolve;
        reader.readAsDataURL(file);
      });
    }
    
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    m.classList.remove('open');
    setTimeout(() => { m.remove(); if (appState.view !== 'dashboard') render(); else window.refreshRowsView(); }, 400);
  };
};

window.startMomentsSlideshow = async (startId) => {
  let mems = appState.memories.filter(m => String(m.category).toLowerCase() === 'moments');
  if (startId) {
    const mem = appState.memories.find(m => m.id === startId);
    if (mem && String(mem.category).toLowerCase() !== 'moments') {
        mems = appState.memories.filter(m => m.category === mem.category && !m.videoUrl);
        if (mems.length === 0) mems = [mem];
    }
  }
  
  if (mems.length === 0) return await netflixAlert('No photos available to play.');

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
    <video src="./netflix-intro.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%; z-index:9000; position:absolute; top:0; left:0; pointer-events:none;"></video>
  `;

  const imgEl = document.getElementById('ss-image');
  const duration = 4000;
  let slideshowInterval;
  
  let audio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/16/audio_f5f6bd7a1c.mp3?filename=romantic-piano-110006.mp3');
  audio.loop = true;
  
  const startSlideshowLoop = () => {
    const introP = document.getElementById('introPlayer');
    if(introP) introP.style.display = 'none';
    audio.play().catch(e => console.log('Music autoplay prevented', e));
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
    const playPromise = introPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => startSlideshowLoop());
    }
    introPlayer.onended = startSlideshowLoop;
    introPlayer.onerror = startSlideshowLoop;
  } else {
    startSlideshowLoop();
  }

  const closePlayer = () => {
     if(audio) {
       audio.pause();
       audio = null;
     }
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
