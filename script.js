import { db } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { animate, stagger } from 'motion';

function transitionView(v) { appState.view = v; render(); }
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
  memories: null,
  profiles: null
};

window.addEventListener('storage', (e) => {
  if (e.key === 'netflix_state' || e.key === 'netflix_memories') {
    appState.memories = JSON.parse(sessionStorage.getItem('netflix_memories') || 'null');
    const newState = JSON.parse(sessionStorage.getItem('netflix_state') || '{}');
    if(newState.myList) appState.myList = newState.myList;
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

const mainTabs = ['Home', 'Dates', 'Categories', 'My List', 'Anniversary Gallery'];
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
    await setDoc(doc(db, 'user_state', 'household'), {
      myList: appState.myList,
      continueWatching: appState.continueWatching,
      settings: appState.settings,
      profiles: appState.profiles
    });
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
  await setDoc(doc(db, 'memories', memory.id), memory);
}

async function saveStateList(key, data) {
  appState[key] = data;
  sessionStorage.setItem('netflix_state', JSON.stringify({
    myList: appState.myList,
    continueWatching: appState.continueWatching,
    settings: appState.settings,
    profiles: appState.profiles
  }));
  await setDoc(doc(db, 'user_state', 'household'), {
    [key]: data
  }, { merge: true });
};

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
    
    // Entrance Animation
    profs.style.opacity = '0';
    setTimeout(() => {
      animate(profs, { opacity: [0, 1] }, { duration: 0.8, ease: "easeOut" });
      const cards = profs.querySelectorAll('.profile-card');
      if (cards.length > 0) {
        animate(
          cards, 
          { y: [-150, 0], opacity: [0, 1], scale: [0.95, 1] }, 
          { duration: 0.6, delay: stagger(0.15, { startDelay: 0.1 }), ease: [0.34, 1.56, 0.64, 1] }
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
        row.className = 'row-container';
        row.innerHTML = `<h2 class="row-title" style="color: #444;">Loading...</h2><div class="row-slider" style="display:flex; gap:8px;">
          ${Array(6).fill('<div class="skeleton-card"></div>').join('')}
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
  
  if (appState.activeCategory === 'My List') {
    rc.appendChild(createRow('My List', appState.memories.filter(m => appState.myList.includes(m.id)), rowIndex++));
  } else if (appState.activeCategory === 'Categories') {
    subCategories.forEach(cat => {
      const mems = appState.memories.filter(m => String(m.category).toLowerCase() === cat.toLowerCase());
      if (mems.length) rc.appendChild(createRow(cat, mems, rowIndex++));
    });
  } else if (appState.activeCategory === 'Anniversary Gallery') {
    // Show local array instantly to feel responsive, then fetch from firestore
    const fetchAndRenderGallery = async () => {
      let galleryItems = [];
      try {
        const querySnapshot = await getDocs(collection(db, 'memories'));
        querySnapshot.forEach(doc => {
          galleryItems.push({ id: doc.id, ...doc.data() });
        });
      } catch(err) {
        console.error("Error fetching memories", err);
      }
      
      if(galleryItems.length === 0) {
        galleryItems = [
          { id: 'g_1', title: 'Our First Sunset', year: '2023', thumbnail: 'https://images.unsplash.com/photo-1516589177380-50528f117c0a?w=800&auto=format&fit=crop', desc: 'A beautiful evening by the beach.', category: 'Romance' },
          { id: 'g_2', title: 'Paris Getaway', year: '2024', thumbnail: 'https://images.unsplash.com/photo-1502602898657-3e907a5ea071?w=800&auto=format&fit=crop', desc: 'Candlelight dinner with the Eiffel Tower glowing in the background.', category: 'Romance' },
          { id: 'g_3', title: 'Snowy Retreat', year: '2024', thumbnail: 'https://images.unsplash.com/photo-1518556488771-b0db37b34baf?w=800&auto=format&fit=crop', desc: 'Our first Christmas in the snow cabin.', category: 'Celebrations' }
        ];
        // optional: save to db
        for(let g of galleryItems) {
           try { await setDoc(doc(db, 'memories', g.id), g); } catch(er){}
        }
      }

      rc.innerHTML = '';
      
      const wrapper = document.createElement('div');
      wrapper.style.cssText = "padding: 0 4vw 4vw 4vw; margin-top: 20px;";
      wrapper.innerHTML = `<h2 style="font-size: 1.4vw; font-weight: 700; margin-bottom: 20px;">Anniversary Selection (Firestore)</h2>`;
      
      const grid = document.createElement('div');
      grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;";
      
      galleryItems.forEach(m => {
        const div = document.createElement('div');
        div.className = 'media-card';
        div.style.flex = "unset";
        div.onclick = () => { 
          if (!appState.memories.find(mem => mem.id === m.id)) {
            appState.memories.push(m);
          }
          openDetailModal(m.id); 
        };
        div.innerHTML = `<img src="${m.thumbnail}" alt="${m.title}" loading="lazy">
        <div class="card-info">
          <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
            <div>${m.title}</div>
            <div class="circ-play-btn" style="background:white; color:black; width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; font-size:10px; padding-left:2px;" title="Play Trailer">▶</div>
          </div>
          <div class="card-meta"><span class="match-rate">100% Match</span> <span style="color:#fff">${m.year || '2024'}</span></div>
        </div>`;
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
      rc.appendChild(createRow('Recent Additions', [...appState.memories].sort((a,b) => b.dateAdded - a.dateAdded), rowIndex++));
    }
    // For Dates
    if (appState.activeCategory === 'Dates') {
      rc.appendChild(createRow('Timeline (Newest First)', [...appState.memories].sort((a,b) => b.dateAdded - a.dateAdded), rowIndex++));
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
    <div id="bleed-logo-container" style="position:absolute; top:0; left:0; width:100%; height:100%; display:none; align-items:center; justify-content:center; background:black; z-index:9000;">
      <h1 id="bleed-text" style="font-family: 'Bebas Neue', sans-serif; font-size: 10vw; color: #E50914; letter-spacing: 2px; transition: transform 1s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.3s; transform: scale(1);">NETFLIX</h1>
    </div>
    <video id="startup-vid" src="./netflix-intro.mp4" playsinline style="width:100%; height:100%; object-fit:cover;"></video>
    <div id="startup-click-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%); z-index:2; cursor:pointer; flex-direction: column;">
      <img src="./Netflix-Logo-Streaming-Platform-765.png" alt="Netflix" style="width: 200px; margin-bottom: 30px;">
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
    const bleedOverlay = c.querySelector('#bleed-logo-container');
    const bleedText = c.querySelector('#bleed-text');
    let hasPlayed = false;
    const playAnim = () => {
      if (hasPlayed) return;
      hasPlayed = true;
      overlay.style.display = 'none';
      vid.play().catch(e => {
        console.log("Autoplay blocked");
        vid.muted = true;
        vid.play();
      });
      // Force exactly 4 seconds
      setTimeout(vid.onended, 4000);
    };
    vid.onended = () => {
      vid.remove();
      bleedOverlay.style.display = 'flex';
      setTimeout(() => {
        bleedText.style.transform = 'scale(60)';
        bleedText.style.opacity = '0';
      }, 50);
      
      setTimeout(() => {
         appState.currentProfile = null;
         transitionView('profiles');
      }, 900);
    };
    vid.onerror = () => {
      console.log("Startup video failed to load, skipping to profiles mode.");
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
let audioCtx;
window.playHoverSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (err) {
    console.log("Audio not supported or allowed yet");
  }
};

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
    p.onmouseenter = window.playHoverSound;
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
  // Sound ripple
  window.playHoverSound();
  const rect = p.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.style.position = 'fixed';
  ripple.style.top = (rect.top + rect.height/2) + 'px';
  ripple.style.left = (rect.left + rect.width/2) + 'px';
  ripple.style.width = '10px';
  ripple.style.height = '10px';
  ripple.style.background = 'transparent';
  ripple.style.border = '2px solid rgba(229, 9, 20, 0.8)';
  ripple.style.borderRadius = '50%';
  ripple.style.transform = 'translate(-50%, -50%)';
  ripple.style.pointerEvents = 'none';
  ripple.style.zIndex = '9999';
  ripple.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
  document.body.appendChild(ripple);
  
  setTimeout(() => {
    ripple.style.width = '200vw';
    ripple.style.height = '200vw';
    ripple.style.opacity = '0';
  }, 10);
  
  setTimeout(() => { ripple.remove(); }, 800);  // Simple Pulse Effect
  const wrapper = p.querySelector('.profile-avatar-wrapper');
  if(wrapper) {
    wrapper.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    wrapper.style.transform = 'scale(1.15)';
    wrapper.style.boxShadow = '0 0 20px rgba(229, 9, 20, 0.6)';
    wrapper.style.border = '2px solid #e50914';
  }
  
  setTimeout(() => {
    p.style.transition = 'transform 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.5s';
    p.style.transform = 'scale(2) translateZ(100px)';
    p.style.opacity = '0';
  }, 600);
  
  setTimeout(() => {
    appState.currentProfile = pf.name;
    localStorage.setItem('sarthak_netflix_profile', pf.name);
    transitionView('intro');
    setTimeout(() => { transitionView('dashboard'); }, 1200);
  }, 1000);
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
  setTimeout(() => {
    const icon = document.querySelector('link[rel="icon"]');
    const img = document.getElementById('nav-logo-img');
    if(icon && img) img.src = icon.href;
  }, 50);
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
  window.addEventListener('scroll', () => {
    if(window.scrollY > 10) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

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
    
    nav.innerHTML = `
      <div class="nav-logo" onclick="setCategory('Home')">
        <img id="nav-logo-img" style="height: 30px; object-fit: contain; cursor: pointer;" src="./Netflix-Logo-Streaming-Platform-765.png" alt="Netflix">
      </div>
      <ul class="nav-links" style="gap: 25px; margin-left: 20px; position:relative;">
        <div class="nav-line" id="navLine"></div>
        ${mainTabs.map(cat => `<li data-cat="${cat}" class="${appState.activeCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">${cat.split('').map((char, i) => `<span style="transition-delay: ${i*0.02}s">${char === ' ' ? '&nbsp;' : char}</span>`).join('')}</li>`).join('')}
      </ul>
      <div class="nav-right">
        <div class="search-container" id="searchContainer">
          <div class="search-icon" onclick="toggleSearch()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
          <input type="text" id="searchInput" class="search-input" placeholder="Titles, descriptions, dates" oninput="handleSearch(event)" value="${appState.searchQuery || ''}">
        </div>

        <div class="notification-container">
          <div class="bell-icon" onclick="toggleNotifications()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            ${latestMems.length > 0 ? `<div class="bell-badge">${latestMems.length}</div>` : ''}
          </div>
          <div class="notifications-panel" id="notifPanel">
            ${notifHTML}
          </div>
        </div>

        <button class="add-memory-btn" onclick="openUploadModal()">＋ Add Memory</button>
        <div class="profile-dropdown">
          <img src="${currAvatar}" width="32" height="32" style="border-radius:4px; margin-left:15px; cursor:pointer; border: 1px solid transparent; transition: border 0.3s; object-fit: cover;" onmouseenter="this.style.borderColor='#fff'" onmouseleave="this.style.borderColor='transparent'">
          <div class="dropdown-menu">
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
window.shuffleHero = () => {
  window.currentHeroIndex = (window.currentHeroIndex + 1) % Math.min(5, appState.memories.length);
  render();
};

function createHero() {
  const c = document.createElement('div');
  c.className = 'hero-billboard';
  
  if(appState.memories.length === 0) return c;
  const heroMem = appState.memories[window.currentHeroIndex] || appState.memories[0];
  const isYouTube = heroMem && heroMem.videoUrl && !heroMem.videoUrl.includes('/') && !heroMem.videoUrl.includes('blob:');
  
  let backgroundVideoHtml = '';
  if (appState.settings.autoPlayPreviews && heroMem.videoUrl) {
    const isMuted = appState.isHeroMuted !== false;
    if (isYouTube) {
      backgroundVideoHtml = `<iframe class="hero-video media-card-hover-video" src="https://www.youtube.com/embed/${heroMem.videoUrl}?autoplay=1&controls=0&mute=${isMuted ? '1' : '0'}&modestbranding=1&rel=0&iv_load_policy=3&loop=1&playlist=${heroMem.videoUrl}&enablejsapi=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;pointer-events:none;z-index:2; transform: scale(1.35);"></iframe>`;
    } else {
      backgroundVideoHtml = `<video class="hero-video media-card-hover-video" src="${heroMem.videoUrl}" ${isMuted ? 'muted' : ''} autoplay loop playsinline fetchpriority="high" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:2;"></video>`;
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
      <div class="hero-original">
        <div class="n-series">N</div>
        <div class="series-tag">S E R I E S</div>
      </div>
      <div class="hero-title">${heroMem.title}</div>
      <div class="hero-desc">${heroMem.desc}</div>
      <div class="hero-buttons">
        <button class="btn btn-primary" onclick="playVideo('${heroMem.id}')">▶ Play</button>
        <button class="btn btn-secondary" onclick="openDetailModal('${heroMem.id}', event)">ⓘ More Info</button>
      </div>
    </div>
    <div class="hero-controls" style="z-index: 5;">
      <div class="mute-btn" id="hero-shuffle-btn" onclick="shuffleHero()" title="Next Title">
        <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
      </div>
      <div class="mute-btn" id="hero-mute-btn" onclick="toggleHeroMute()" title="Toggle Mute">
        ${(appState.isHeroMuted !== false) ? 
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>` :
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z"/></svg>`}
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
    <div class="slider-arrow slider-left" style="display:none; position:absolute; left:0; top:50%; transform:translateY(-50%); z-index:100; font-size:3vw; background:rgba(0,0,0,0.5); border:none; color:white; cursor:pointer; height:100%; width:4vw; align-items:center; justify-content:center;">‹</div>
    <div class="row-content" style="position:relative;"></div>
    <div class="slider-arrow slider-right" style="position:absolute; right:0; top:50%; transform:translateY(-50%); z-index:100; font-size:3vw; background:rgba(0,0,0,0.5); border:none; color:white; cursor:pointer; height:100%; width:4vw; align-items:center; justify-content:center; display: flex;">›</div>
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
    arrowLeft.style.display = rc.scrollLeft > 0 ? 'flex' : 'none';
    arrowRight.style.display = rc.scrollLeft < rc.scrollWidth - rc.clientWidth - 5 ? 'flex' : 'none';
  });

  // Swipe scrolling handler
  let isDown = false;
  let startX;
  let scrollLeft;
  
  rc.addEventListener('mousedown', (e) => {
    isDown = true;
    rc.classList.add('active');
    startX = e.pageX - rc.offsetLeft;
    scrollLeft = rc.scrollLeft;
  });
  rc.addEventListener('mouseleave', () => {
    isDown = false;
    rc.classList.remove('active');
  });
  rc.addEventListener('mouseup', () => {
    isDown = false;
    rc.classList.remove('active');
  });
  rc.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - rc.offsetLeft;
    const walk = (x - startX) * 2; // scroll-fast
    rc.scrollLeft = scrollLeft - walk;
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
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
        }
      });
    }, { rootMargin: "200px" });
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
    card.innerHTML = `<img data-src="${m.thumbnail}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${m.title}">`;
    
    card.onmouseenter = () => {
      card.hoverTimeout = setTimeout(() => {
        if(m.videoUrl && appState.settings.autoPlayPreviews) {
          const isYouTube = m.videoUrl && !m.videoUrl.includes('/') && !m.videoUrl.includes('blob:');
          if (isYouTube) {
            const v = document.createElement('iframe');
            v.src = `https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1`;
            v.className = 'media-card-hover-video';
            v.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;pointer-events:none;z-index:2; border-radius:4px;';
            card.appendChild(v);
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
            v.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:2;border-radius:4px;';
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

    const matchScore = m.title ? Math.max(85, 100 - (m.title.length % 15)) : 98;
    card.innerHTML += `
      <div class="card-info">
        <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
          ${m.title}
          <div class="circ-play-btn" onclick="playTrailer(event, '${m.id}')" style="background:white; color:black; width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; font-size:10px; padding-left:2px;" title="Play Trailer">▶</div>
        </div>
        <div class="card-meta"><span class="match-rate">${matchScore}% Match</span> <span style="color:#fff">${m.year || '2025'}</span></div>
      </div>
    `;
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
  if (appState.isHeroMuted === undefined) appState.isHeroMuted = true;
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
     btn.innerHTML = (appState.isHeroMuted !== false) ? 
       `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>` :
       `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z"/></svg>`;
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
            <input type="text" id="up-yt-link" placeholder="Paste the YouTube URL here..." style="flex:1; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:4px; color:white; font-family:monospace; outline:none; transition: border 0.3s;" onfocus="this.style.border='1px solid #fff'" onblur="this.style.border='1px solid rgba(255,255,255,0.1)'">
            <button id="up-fetch" style="background:#fff; color:#000; border:none; padding:0 20px; border-radius:4px; font-weight:600; cursor:pointer; transition: background 0.2s;" onmouseenter="this.style.background='#ddd'" onmouseleave="this.style.background='#fff'">Fetch</button>
          </div>
        </div>
        
        <div id="up-preview-container" style="display: none; text-align:center;">
          <img id="up-thumb-preview" src="" style="width: 100%; height: 200px; object-fit: cover; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        </div>

        <div class="floating-input-group">
          <input type="text" id="up-title" required>
          <label for="up-title">Title</label>
        </div>

        <div class="floating-input-group">
          <textarea id="up-desc" rows="3" required></textarea>
          <label for="up-desc">Description</label>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
          <div>
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Category</label>
            <select id="up-cat" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:4px; color:white; outline:none;">
              <option value="Dates">Dates</option>
              <option value="My Fav">My Fav</option>
              <option value="Celebrations">Celebrations</option>
              <option value="Romance">Romance</option>
              <option value="Our Time">Our Time</option>
              <option value="Documentaries">Documentaries</option>
            </select>
          </div>
          <div>
            <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Date / Year</label>
            <input type="date" id="up-date" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); padding:11px; border-radius:4px; color:white; outline:none;" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div>
          <label style="display:block; text-transform:uppercase; font-size:11px; letter-spacing:1px; color:#888; margin-bottom:8px;">Maturity Rating</label>
          <select id="up-rating" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:4px; color:white; outline:none;">
            <option value="U/A 7+">U/A 7+</option>
            <option value="U/A 13+">U/A 13+</option>
            <option value="U/A 16+">U/A 16+</option>
            <option value="U/A 18+" selected>U/A 18+</option>
            <option value="A">A</option>
          </select>
        </div>
      </div>
      
      <div style="padding: 20px 30px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); display:flex; gap:15px; justify-content:flex-end;">
        <button style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:white; padding:10px 20px; border-radius:4px; cursor:pointer;" onclick="const p = document.getElementById('uploadModal'); p.classList.remove('open'); setTimeout(() => p.remove(), 600);">Cancel</button>
        <button id="up-publish" style="background:#e50914; border:none; color:white; padding:10px 30px; font-weight:bold; border-radius:4px; cursor:pointer; box-shadow: 0 4px 15px rgba(229,9,20,0.4);">Publish Memory</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
  
  let currentThumbData = '';
  let extractedVideoId = '';

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
        if (data.thumbnail_url) {
          currentThumbData = data.thumbnail_url;
          document.getElementById('up-thumb-preview').src = currentThumbData;
          document.getElementById('up-preview-container').style.display = 'block';
        }
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

    const mem = {
      id: 'm_' + Date.now(),
      title,
      desc: document.getElementById('up-desc').value,
      category: document.getElementById('up-cat').value,
      year: document.getElementById('up-date').value || new Date().getFullYear().toString(),
      rating: document.getElementById('up-rating').value,
      thumbnail: currentThumbData || ('https://img.youtube.com/vi/' + extractedVideoId + '/maxresdefault.jpg'),
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
      (isYouTube ? `<iframe src="https://www.youtube.com/embed/${m.videoUrl}?autoplay=1&controls=0&mute=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1" style="width:100%;height:100%;pointer-events:none;border:none;transform:scale(1.35);"></iframe>` : `<video src="${m.videoUrl}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`) : 
      `<img src="${m.thumbnail}" style="width:100%;height:100%;object-fit:cover;">`;

  modal.innerHTML = `
    <div class="detail-modal" style="transform-origin: ${originX} ${originY};">
      <div class="modal-controls">
        <button class="modal-close-btn" onclick="const dm = document.getElementById('detailModal'); dm.classList.remove('open'); setTimeout(() => { dm.remove(); render(); }, 300);">&times;</button>
      </div>
      <div class="detail-header">
        ${mediaHtml}
        <div class="detail-gradient"></div>
        <div class="detail-title-btn">
          <div class="detail-title" id="dm-title">${m.title}</div>
          <input type="text" id="dm-title-edit" class="edit-input hidden" value="${m.title}" style="font-size:36px; font-weight:bold; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:5px; margin-bottom:10px; width:100%; border-radius:4px; font-family:inherit;">
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="btn btn-primary" id="dm-play-btn" onclick="playVideo('${m.id}')" style="padding: 10px 30px; font-size: 16px;">▶ Play</button>
            <button class="btn btn-secondary" id="dm-edit-btn" onclick="toggleDetailEdit()" style="padding: 10px 20px; font-size: 16px;">✎ Edit Info</button>
            <button class="btn btn-primary hidden" id="dm-save-btn" onclick="saveDetailEdit('${m.id}')" style="padding: 10px 30px; font-size: 16px; background:#46d369; color:black;">✓ Save</button>
            
            <div class="circ-play-btn" onclick="toggleMyList('${m.id}', event)" title="${inMyList ? 'Remove from List' : 'Add to My List'}">
              ${inMyList ? '✓' : '＋'}
            </div>
            <div class="circ-play-btn" onclick="downloadVideo('${m.id}')" title="Download for Offline Viewing">
              ⬇
            </div>
            <div class="circ-play-btn" onclick="shareVideo('${m.id}')" title="Share">
              🔗
            </div>
          </div>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-left">
          <div class="detail-meta">
            99% Match <span class="year">${m.year}</span> <span class="rating">${m.rating}</span> <span class="quality">4K Ultra HD</span>
          </div>
          <div class="detail-desc" id="dm-desc">${m.desc || 'A beautiful memory worth reliving.'}</div>
          <textarea id="dm-desc-edit" class="edit-input hidden" style="width:100%; height:100px; background:rgba(0,0,0,0.6); color:white; border:1px solid #333; padding:10px; border-radius:4px; font-family:inherit; resize:vertical; font-size:16px;">${m.desc || ''}</textarea>
        </div>
        <div class="detail-right">
          <div><span class="white">Cast:</span> Sarthak, Reechita</div>
          <div style="margin-top:10px;"><span class="white">Genres:</span> ${m.category}, Emotional</div>
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
  
  if(title.classList.contains('hidden')) {
    // Cancel or just simple toggle backward
    title.classList.remove('hidden');
    desc.classList.remove('hidden');
    playBtn.classList.remove('hidden');
    editBtn.classList.remove('hidden');
    titleEdit.classList.add('hidden');
    descEdit.classList.add('hidden');
    saveBtn.classList.add('hidden');
  } else {
    title.classList.add('hidden');
    desc.classList.add('hidden');
    playBtn.classList.add('hidden');
    editBtn.classList.add('hidden');
    titleEdit.classList.remove('hidden');
    descEdit.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
    titleEdit.focus();
  }
};

window.saveDetailEdit = async (id) => {
  const m = appState.memories.find(i => i.id === id);
  if (m) {
    m.title = document.getElementById('dm-title-edit').value;
    m.desc = document.getElementById('dm-desc-edit').value;
    await saveMemoryToDB(m);
    sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    document.getElementById('dm-title').innerText = m.title;
    document.getElementById('dm-desc').innerText = m.desc;
    render();
  }
  toggleDetailEdit();
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
  if(!m || !m.videoUrl) return alert("Video file not available for playback.");
  
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
  
  const c = document.createElement('div');
  c.className = 'playback-overlay';
  c.id = 'playbackOverlay';
  
  // Play Netflix initial animation before playing video
  const isYouTube = url && !url.includes('/') && !url.includes('blob:');
  
  // Setup main player later to prevent YouTube autoplaying before intro ends
  let playerHtml = '';
  if (isYouTube) {
    playerHtml = `<iframe id="fsyPlayer" style="display:none; width:100%; height:100%; background:black; border:none;" src="" allow="autoplay; fullscreen"></iframe>`;
  } else {
    playerHtml = `
      <div id="video-container" style="position:relative; width:100%; height:100%; display:none; background:black; contain: content;">
        <video src="${url}" id="fsyPlayer" fetchpriority="high" preload="metadata" style="width:100%; height:100%; cursor:pointer; object-fit:cover; will-change: transform;"></video>
        <div id="video-controls" style="position:absolute; bottom:0; left:0; padding:20px 4%; width:100%; display:flex; flex-direction:column; gap:10px; background:linear-gradient(transparent, rgba(0,0,0,0.9)); opacity:0; transition:opacity 0.3s; z-index: 10001;">
          <div style="display:flex; align-items:center; gap:15px; width: 100%;">
            <span id="time-current" style="color:white; font-size:15px; font-variant-numeric:tabular-nums; font-weight: 500;">0:00</span>
            <input type="range" id="seek-bar" value="0" step="0.1" style="flex:1; cursor:pointer; accent-color: var(--netflix-red, #e50914); height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px;">
            <span id="time-remaining" style="color:white; font-size:15px; font-variant-numeric:tabular-nums; font-weight: 500;">0:00</span>
          </div>
          <div style="display:flex; align-items:center; gap:25px; margin-top: 10px;">
            <button id="play-pause-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Play/Pause (Space)">
              <svg id="icon-play" width="36" height="36" viewBox="0 0 24 24" fill="white" style="display:none;"><path d="M8 5v14l11-7z"/></svg>
              <svg id="icon-pause" width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button id="mute-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Mute/Unmute (M)">
              <svg id="icon-vol-up" width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
              <svg id="icon-vol-off" width="32" height="32" viewBox="0 0 24 24" fill="white" style="display:none;"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            </button>
            <div style="flex:1;"></div>
            <button id="fullscreen-btn" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Fullscreen (F)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  c.innerHTML = `
    <div class="playback-back close-btn" id="playback-back-btn" style="z-index: 10002; position:absolute; top: 30px; left: 30px; cursor: pointer; color: white;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </div>
    <video src="./netflix-intro.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%; z-index:9000; position:absolute; top:0; left:0;"></video>
    ${playerHtml}
  `;
  document.body.appendChild(c);
  
  const introPlayer = document.getElementById('introPlayer');
  const mainPlayer = document.getElementById('fsyPlayer');
  
  const startMainVideo = () => {
    introPlayer.style.display = 'none';
    if (isYouTube) {
      mainPlayer.src = `https://www.youtube.com/embed/${url}?autoplay=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1&playsinline=1&vq=hd1080`;
    }
    mainPlayer.style.display = 'block';
    
    // Request fullscreen automatically on playback start
    if (c.requestFullscreen) {
      c.requestFullscreen().catch(e => console.log("Fullscreen request failed", e));
    }
    
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
      }, 3000);
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
          if (!document.getElementById('next-ep-queue')) {
            const nextMem = appState.memories[idx + 1];
            const qBox = document.createElement('div');
            qBox.id = 'next-ep-queue';
            qBox.style.cssText = 'position:absolute; bottom:12%; right:4vw; background:rgba(0,0,0,0.8); padding:15px; display:flex; align-items:center; gap:20px; border-radius:4px; z-index:20005; cursor:pointer; color:white;';
            qBox.innerHTML = `
              <div>
                <div style="font-size:14px; color:#ccc; margin-bottom:5px;">Playing Next</div>
                <div style="font-size:16px; font-weight:bold;">${nextMem.title}</div>
              </div>
              <div style="position:relative; width:40px; height:40px; display:flex; justify-content:center; align-items:center;">
                <svg width="40" height="40" style="position:absolute; top:0; left:0; transform:rotate(-90deg);">
                  <circle cx="20" cy="20" r="18" stroke="#333" stroke-width="4" fill="none" />
                  <circle id="next-ep-timer-circle" cx="20" cy="20" r="18" stroke="#e50914" stroke-width="4" fill="none" stroke-dasharray="113" stroke-dashoffset="0" style="transition: stroke-dashoffset 0.1s linear;" />
                </svg>
                ▶
              </div>
            `;
            qBox.onclick = () => {
               document.getElementById('playbackOverlay').remove();
               playVideo(nextMem.id);
            };
            c.appendChild(qBox);
          }
          
          const circle = document.getElementById('next-ep-timer-circle');
          const remains = mainPlayer.duration - mainPlayer.currentTime;
          if(circle) {
            const offset = 113 - ((remains / 5) * 113);
            circle.style.strokeDashoffset = offset + '';
          }
        }
      }
    };
  
    mainPlayer.onended = () => {
      if(appState.settings.autoPlayNextEpisode) {
        const idx = appState.memories.findIndex(i => i.id === id);
        if(idx >= 0 && idx < appState.memories.length - 1) {
          document.getElementById('playbackOverlay').remove();
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
       if (document.getElementById('playbackOverlay')) {
         document.getElementById('playbackOverlay').remove();
         // we don't necessarily need to render() again since dashboard is already behind it.
       }
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
  }, 150);
});

// Init VH value
document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
