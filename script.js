import { db, storage } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { animate, stagger } from 'motion';

function transitionView(v) { appState.view = v; render(); }
window.transitionView = transitionView;
window.uploadFileToStorage = async (file, path) => {
  const fileRef = ref(storage, path + '_' + Date.now());
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
};

const DB_NAME = "netflix_clone_db";
const DB_VERSION = 1;

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
  memories: [],
  profiles: []
};

const initialProfiles = [
  { id: 'p_1', name: 'Sarthak', avatar: 'img20251010.jpg' },
  { id: 'p_2', name: 'Reechita', avatar: 'img2025.78_07.jpg' },
  { id: 'p_3', name: 'Our Future Kids', avatar: '20250707_2328.jpg' }
];

// Seed Data
const initialMemories = [];

const mainTabs = ['Home', 'Dates', 'Categories', 'My List'];
const subCategories = ['Celebrations', 'Romance', 'Our Time', 'Documentaries'];

async function loadData() {
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
}

async function saveMemoryToDB(memory) {
  if(!memory.id) memory.id = "m_" + Date.now();
  await setDoc(doc(db, 'memories', memory.id), memory);
}

async function saveStateList(key, data) {
  appState[key] = data;
  await setDoc(doc(db, 'user_state', 'household'), {
    [key]: data
  }, { merge: true });
};

function render() {
  const app = document.getElementById('app');
  if(!app) return;
  app.innerHTML = '';
  if (appState.view === 'startup') app.appendChild(createStartupScreen());
  else if (appState.view === 'profiles') app.appendChild(createProfileSelection());
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

window.handleSearch = (e) => {
  appState.searchQuery = e.target.value.toLowerCase();
  window.refreshRowsView();
};

window.toggleNotifications = () => {
  document.getElementById('notifPanel').classList.toggle('active');
};

window.refreshRowsView = (rcNode, heroNode) => {
  const rc = rcNode || document.querySelector('.slider-container');
  const hero = heroNode || document.getElementById('hero-section');
  if(!rc) return;
  rc.innerHTML = '';
  
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
    return;
  }
  
  if(hero) hero.style.display = 'block';
  
  if (['Home', 'Dates'].includes(appState.activeCategory) && appState.continueWatching.length > 0) {
    const cw = appState.memories.filter(m => appState.continueWatching.includes(m.id));
    if(cw.length) rc.appendChild(createRow('Continue Watching', cw));
  }
  
  if (appState.activeCategory === 'My List') {
    rc.appendChild(createRow('My List', appState.memories.filter(m => appState.myList.includes(m.id))));
  } else if (appState.activeCategory === 'Categories') {
    subCategories.forEach(cat => {
      const mems = appState.memories.filter(m => String(m.category).toLowerCase() === cat.toLowerCase());
      if (mems.length) rc.appendChild(createRow(cat, mems));
    });
  } else {
    // For Home
    if (appState.activeCategory === 'Home') {
      subCategories.forEach(cat => {
        const mems = appState.memories.filter(m => String(m.category).toLowerCase() === cat.toLowerCase());
        if (mems.length) rc.appendChild(createRow(cat, mems));
      });
      rc.appendChild(createRow('Recent Additions', [...appState.memories].sort((a,b) => b.dateAdded - a.dateAdded)));
    }
    // For Dates
    if (appState.activeCategory === 'Dates') {
      rc.appendChild(createRow('Timeline (Newest First)', [...appState.memories].sort((a,b) => b.dateAdded - a.dateAdded)));
    }
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
};

window.toggleMyList = (id, event) => {
  if (event) event.stopPropagation();
  if (appState.myList.includes(id)) {
    appState.myList = appState.myList.filter(i => i !== id);
  } else {
    appState.myList.push(id);
  }
  saveStateList('myList', appState.myList);
  render();
};

function createStartupScreen() {
  const c = document.createElement('div');
  c.className = 'intro-container';
  // Use the exact file provided by user for initial app load Netflix opening animation
  c.innerHTML = `
    <video id="startup-vid" src="./netflix-intro.mp4" playsinline style="width:100%; height:100%; object-fit:cover;"></video>
    <div id="startup-click-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); z-index:2; cursor:pointer;">
      <h1 style="color:white; font-size:24px; font-family:inherit;">Click anywhere to start</h1>
    </div>
  `;
  setTimeout(() => {
    const vid = c.querySelector('#startup-vid');
    const overlay = c.querySelector('#startup-click-overlay');
    const playAnim = () => {
      overlay.style.display = 'none';
      vid.play().catch(e => console.log("Autoplay blocked, needs click"));
    };
    vid.onended = () => {
      transitionView('profiles');
    };
    vid.onerror = () => {
      console.log("Startup video failed to load, skipping to profiles.");
      transitionView('profiles');
    };
    c.onclick = playAnim;
    // Auto-attempt
    vid.play().then(() => { overlay.style.display = 'none'; }).catch(e => { /* Wait for click */ });
  }, 50);
  return c;
}

function createProfileSelection() {
  const c = document.createElement('div');
  c.className = 'profile-selection';
  
  const isManageMode = appState.manageProfiles;
  
  c.innerHTML = `
    <h1>${isManageMode ? 'Manage Profiles' : 'Who\'s watching?'}</h1>
    <div class="profiles-list" id="pfList"></div>
    <button class="manage-profiles-btn" onclick="toggleManageProfiles()">${isManageMode ? 'DONE' : 'MANAGE PROFILES'}</button>
  `;
  const list = c.querySelector('.profiles-list');
  
  let delay = 0;
  appState.profiles.forEach((pf) => {
    const p = document.createElement('div');
    p.className = 'profile-card';
    if(isManageMode) p.classList.add('manage-mode');
    
    p.style.setProperty('--stagger', delay++);
    p.innerHTML = `
      <div class="profile-avatar-wrapper">
        <div class="profile-avatar" style="background-image: url('${pf.avatar}')"></div>
        ${isManageMode ? '<div class="edit-overlay"><svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></div>' : ''}
      </div>
      <div class="profile-name">${pf.name}</div>
    `;
    
    p.onclick = () => {
      if(isManageMode) {
        editProfile(pf.id);
      } else {
        const secretCode = localStorage.getItem('sarthak_netflix_code');
        if (secretCode !== '0707') {
          const input = prompt("Please enter the secret code (Hint: special date):");
          if (input === '0707' || input === 'loveyou') {
            localStorage.setItem('sarthak_netflix_code', '0707');
          } else {
            alert("Incorrect secret code. Access denied.");
            return;
          }
        }
        
        // Simulate Netflix style loading wait
        p.innerHTML = `<div class="profile-avatar-wrapper"><div class="loading-spinner"></div></div><div class="profile-name">${pf.name}</div>`;
        setTimeout(() => {
          appState.currentProfile = pf.name;
          transitionView('intro');
          setTimeout(() => { transitionView('dashboard'); }, 1200);
        }, 1000);
      }
    };
    list.appendChild(p);
  });
  return c;
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
  
  const defaultAvatars = [
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%23e50914"/><circle cx="50" cy="50" r="30" fill="%23fff"/></svg>',
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%230275d8"/><rect x="30" y="30" width="40" height="40" fill="%23fff"/></svg>',
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%235cb85c"/><polygon points="50,20 80,80 20,80" fill="%23fff"/></svg>',
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%23f0ad4e"/><circle cx="35" cy="40" r="10" fill="%23fff"/><circle cx="65" cy="40" r="10" fill="%23fff"/><path d="M30,70 Q50,90 70,70" stroke="%23fff" stroke-width="5" fill="none"/></svg>'
  ].map(s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s));
  
  m.innerHTML = `
    <div class="upload-modal-content" style="max-width: 400px; text-align: center;">
      <button class="upload-close" onclick="document.getElementById('editProfileModal').remove()">&times;</button>
      <div class="upload-title">Edit Profile</div>
      
      <div style="margin-bottom: 20px;">
        <img id="ep-avatar-preview" src="${pf.avatar}" style="width: 100px; height: 100px; border-radius: 4px; object-fit: cover; margin-bottom: 10px;">
        <div>
          <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 14px;" onclick="document.getElementById('ep-file').click()">Upload Custom</button>
          <input type="file" id="ep-file" accept="image/*" style="display:none;">
        </div>
      </div>
      
      <div style="margin-bottom: 20px; text-align: left;">
        <label style="display:block; margin-bottom:5px; color:#808080;">Select an avatar:</label>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          ${defaultAvatars.map(av => `<img src="${av}" class="default-avatar-btn" style="width: 50px; height: 50px; border-radius: 4px; cursor: pointer; border: 2px solid transparent; transition: border-color 0.2s;" onclick="document.getElementById('ep-avatar-preview').src = '${av}'"> `).join('')}
        </div>
      </div>
      
      <div class="form-group" style="text-align: left;">
        <label>Profile Name</label>
        <input type="text" id="ep-name" class="form-control" value="${pf.name}">
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
        <button class="btn btn-secondary" onclick="document.getElementById('editProfileModal').remove()">Cancel</button>
        <button class="btn btn-primary" id="ep-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  
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
    if(newName) pf.name = newName;
    pf.avatar = document.getElementById('ep-avatar-preview').src;
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
      <svg width="64" height="64" viewBox="0 0 24 24" fill="#555"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM12 5.5v9l6-4.5z"/></svg>
      <h2>No videos</h2>
      <p>Your timeline is empty. Videos you add will appear here.</p>
      <button class="add-memory-btn" style="margin-top:20px; font-size:16px; padding:10px 20px;" onclick="openUploadModal()">＋ Add First Memory</button>
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
        <img id="nav-logo-img" width="111" style="cursor: pointer; position: relative; top: -5px;" src="">
      </div>
      <ul class="nav-links">
        ${mainTabs.map(cat => `<li class="${appState.activeCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</li>`).join('')}
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
            <div class="dropdown-item" onclick="transitionView('profiles')">⇄ Switch Profile</div>
          </div>
        </div>
      </div>
    `;
  return nav;
}

function createHero() {
  const c = document.createElement('div');
  c.className = 'hero-billboard';
  
  const heroMem = appState.memories[0] || initialMemories[0];
  
  if (appState.settings.autoPlayPreviews && heroMem.videoUrl) {
    c.innerHTML = `
      <div class="hero-video-wrapper">
        <video class="hero-video" src="${heroMem.videoUrl}" autoplay muted loop playsinline></video>
      </div>
    `;
  } else {
    c.innerHTML = `
      <div class="hero-video-wrapper">
        <img class="hero-video" src="${heroMem.thumbnail}" alt="Hero">
      </div>
    `;
  }
  
  c.innerHTML += `
    <div class="hero-overlay"></div>
    <div class="hero-overlay-bottom"></div>
    <div class="hero-info">
      <div class="hero-original">
        <div class="n-series">N</div>
        <div class="series-tag">S E R I E S</div>
      </div>
      <div class="hero-title">${heroMem.title}</div>
      <div class="hero-desc">${heroMem.desc}</div>
      <div class="hero-buttons">
        <button class="btn btn-primary" onclick="playVideo('${heroMem.id}')">▶ Play</button>
        <button class="btn btn-secondary" onclick="openDetailModal('${heroMem.id}')">ⓘ More Info</button>
      </div>
    </div>
    <div class="hero-controls">
      <div class="mute-btn" onclick="toggleSetting('autoPlayPreviews')" title="Toggle Autoplay Previews">
        ${appState.settings.autoPlayPreviews ? 
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z"/></svg>` : 
         `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`}
      </div>
      <div class="maturity-rating">${heroMem.rating}</div>
    </div>
  `;
  return c;
}

function createRow(title, memories) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<div class="row-header">${title}</div><div class="row-content"></div>`;
  
  const rc = row.querySelector('.row-content');
  memories.forEach(m => {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.onclick = () => openDetailModal(m.id);
    
    // Fallback if videoUrl exists and autoPlay is on
    card.innerHTML = `<img src="${m.thumbnail}" alt="${m.title}">`;
    
    // Hover Video Preview Support
    card.onmouseenter = () => {
      card.hoverTimeout = setTimeout(() => {
        if(m.videoUrl && appState.settings.autoPlayPreviews) {
          const v = document.createElement('video');
          // Support blob or http urls
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
          
          card.appendChild(v);
          v.play().catch(e => console.log('Autoplay prevented'));
        }
      }, 600);
    };

    card.onmouseleave = () => {
      clearTimeout(card.hoverTimeout);
      const v = card.querySelector('.media-card-hover-video');
      if(v) v.remove();
    };

    card.innerHTML += `
      <div class="card-info">
        <div class="card-title" style="display:flex; justify-content:space-between; align-items:center;">
          ${m.title}
          <div class="circ-play-btn" onclick="playTrailer(event, '${m.id}')" style="background:white; color:black; width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; font-size:10px; padding-left:2px;" title="Play Trailer">▶</div>
        </div>
        <div class="card-meta">98% Match &nbsp;&nbsp; <span style="color:#fff">${m.year}</span></div>
      </div>
    `;
    rc.appendChild(card);
  });
  return row;
}

window.playTrailer = (e, id) => {
  e.stopPropagation();
  playVideo(id);
};

// === UPLOAD FEATURE ===
window.openUploadModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'uploadModal';
  
  modal.innerHTML = `
    <div class="upload-modal-content">
      <button class="upload-close" onclick="document.getElementById('uploadModal').remove()">&times;</button>
      <div class="upload-title">Add New Memory</div>
      
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="up-title" placeholder="A Beautiful Memory">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="up-desc" rows="3" placeholder="Write about the memory..."></textarea>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="up-cat">
          <option value="Dates">Dates</option>
          <option value="My Fav">My Fav</option>
          <option value="Celebrations">Celebrations</option>
          <option value="Romance">Romance</option>
          <option value="Our Time">Our Time</option>
          <option value="Documentaries">Documentaries</option>
        </select>
      </div>
      <div class="form-group">
        <label>Video File (From Device)</label>
        <div class="file-upload-box" onclick="document.getElementById('up-vid-file').click()">
          Click to Select 4K Video File
        </div>
        <input type="file" id="up-vid-file" class="file-input" accept="video/*">
      </div>
      <div class="form-group">
        <label>Auto-Extracted Thumbnail (Or tap to upload custom)</label>
        <div class="thumbnail-preview" id="up-thumb-preview" onclick="document.getElementById('up-img-file').click()">
          <span style="color:#666">No Thumbnail yet</span>
        </div>
        <input type="file" id="up-img-file" class="file-input" accept="image/*">
      </div>
      
      <div style="display:flex; gap:15px">
        <div class="form-group" style="flex:1">
          <label>Date / Year</label>
          <input type="date" id="up-date">
        </div>
        <div class="form-group" style="flex:1">
          <label>Maturity Rating</label>
          <input type="text" id="up-rating" value="U/A 13+">
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" onclick="document.getElementById('uploadModal').remove()">Cancel</button>
        <button class="btn btn-primary" id="up-publish">Publish Memory</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let currentVideoUrl = '';
  let currentThumbData = '';
  
  // Video Selection
  document.getElementById('up-vid-file').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    document.querySelector('.file-upload-box').innerText = file.name;
    currentVideoUrl = URL.createObjectURL(file);
    
    // Auto-extract thumbnail
    const video = document.createElement('video');
    video.src = currentVideoUrl;
    video.currentTime = 1; // Seek to 1s
    video.onloadeddata = () => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        currentThumbData = canvas.toDataURL('image/jpeg');
        document.getElementById('up-thumb-preview').innerHTML = `<img src="${currentThumbData}">`;
      }, 500); // give time to seek
    };
  };
  
  // Custom thumb override
  document.getElementById('up-img-file').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentThumbData = e.target.result;
      document.getElementById('up-thumb-preview').innerHTML = `<img src="${currentThumbData}">`;
    };
    reader.readAsDataURL(file);
  };
  
  // Publish
  document.getElementById('up-publish').onclick = async (e) => {
    e.target.innerText = "Uploading... please wait";
    e.target.disabled = true;

    const title = document.getElementById('up-title').value.trim();
    if(!title) {
       e.target.innerText = "Publish Memory";
       e.target.disabled = false;
       return alert("Title required");
    }
    
    let videoUrl = currentVideoUrl;
    const fileObj = document.getElementById('up-vid-file').files[0];
    
    if (fileObj) {
      try {
        videoUrl = await window.uploadFileToStorage(fileObj, 'videos/' + fileObj.name);
      } catch(err) {
        console.error("Upload error:", err);
        alert("Failed to upload video.");
        e.target.innerText = "Publish Memory";
        e.target.disabled = false;
        return;
      }
    }
    
    const mem = {
      id: 'm_' + Date.now(),
      title,
      desc: document.getElementById('up-desc').value,
      category: document.getElementById('up-cat').value,
      year: document.getElementById('up-date').value || new Date().getFullYear().toString(),
      rating: document.getElementById('up-rating').value,
      thumbnail: currentThumbData,
      videoUrl: videoUrl,
      dateAdded: Date.now(),
      uploadedBy: appState.currentProfile
    };
    
    await saveMemoryToDB(mem);
    appState.memories.unshift(mem);
    document.getElementById('uploadModal').remove();
    render();
  };
};

// === DETAIL MODAL ===
window.openDetailModal = (id) => {
  const m = appState.memories.find(i => i.id === id);
  if(!m) return;
  
  const inMyList = appState.myList.includes(id);
  
  const modal = document.createElement('div');
  modal.className = 'upload-modal';
  modal.id = 'detailModal';
  
  let mediaHtml = appState.settings.autoPlayPreviews && m.videoUrl ? 
      `<video src="${m.videoUrl}" autoplay muted loop playsinline></video>` : 
      `<img src="${m.thumbnail}">`;

  modal.innerHTML = `
    <div class="detail-modal">
      <div class="modal-controls">
        <button class="modal-close-btn" onclick="document.getElementById('detailModal').remove()">&times;</button>
      </div>
      <div class="detail-header">
        ${mediaHtml}
        <div class="detail-gradient"></div>
        <div class="detail-title-btn">
          <div class="detail-title">${m.title}</div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary" onclick="playVideo('${m.id}')">▶ Play</button>
            <button class="btn btn-secondary" onclick="toggleMyList('${m.id}', event)">
              ${inMyList ? '✓ Remove from List' : '＋ Add to My List'}
            </button>
            <button class="btn btn-secondary" onclick="downloadVideo('${m.id}')" title="Download for Offline Viewing">⬇</button>
            <button class="btn btn-secondary" onclick="shareVideo('${m.id}')">🔗 Share</button>
          </div>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-left">
          <div class="detail-meta">
            99% Match <span class="year">${m.year}</span> <span class="rating">${m.rating}</span> <span class="quality">4K Ultra HD</span>
          </div>
          <div class="detail-desc">${m.desc || 'A beautiful memory worth reliving.'}</div>
        </div>
        <div class="detail-right">
          <div><span class="white">Cast:</span> Sarthak, Reechita</div>
          <div style="margin-top:10px;"><span class="white">Genres:</span> ${m.category}, Emotional</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

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
  c.innerHTML = `
    <div class="playback-back" onclick="document.getElementById('playbackOverlay').remove(); render();">🡠</div>
    <video src="./netflix-intro.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%;"></video>
    <video src="${url}" controls id="fsyPlayer" style="display:none; width:100%; height:100%; background:black;"></video>
  `;
  document.body.appendChild(c);
  
  const introPlayer = document.getElementById('introPlayer');
  const mainPlayer = document.getElementById('fsyPlayer');
  
  const startMainVideo = () => {
    introPlayer.style.display = 'none';
    mainPlayer.style.display = 'block';
    
    // Request fullscreen automatically on playback start
    if (c.requestFullscreen) {
      c.requestFullscreen().catch(e => console.log("Fullscreen request failed", e));
    } else if (c.webkitRequestFullscreen) { /* Safari */
      c.webkitRequestFullscreen();
    } else if (c.msRequestFullscreen) { /* IE11 */
      c.msRequestFullscreen();
    }
    
    // Auto play when transition is done
    const pPromise = mainPlayer.play();
    if(pPromise !== undefined) pPromise.catch(e => console.error("Autoplay main video prevented", e));
  };
  
  // Try autoplaying intro, else wait
  if(introPlayer.play() !== undefined) {
    introPlayer.play().catch(() => startMainVideo());
  }
  
  introPlayer.onended = startMainVideo;
  introPlayer.onerror = startMainVideo;
  
  mainPlayer.onended = () => {
    if(appState.settings.autoPlayNextEpisode) {
      // Find next memory
      const idx = appState.memories.findIndex(i => i.id === id);
      if(idx >= 0 && idx < appState.memories.length - 1) {
        document.getElementById('playbackOverlay').remove();
        playVideo(appState.memories[idx + 1].id);
      }
    }
  };
};

// Initialize
window.onload = () => {
  loadData().catch(e => {
    console.error("Error loading data:", e);
    alert("Connection to the database failed. Some features may not work.");
  }).finally(() => {
    render();
  });
};
