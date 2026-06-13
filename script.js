const DB_NAME = "netflix_clone_db";
const DB_VERSION = 1;

let appState = {
  view: 'startup', 
  currentProfile: null,
  activeCategory: 'Home',
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
const initialMemories = [
  {
    id: '1', title: 'Our First Date', desc: 'The day everything started at the coffee shop.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800',
    category: 'Dates', year: '2023', rating: 'U/A 13+', type: 'Movie', dateAdded: Date.now() - 100000
  },
  {
    id: '2', title: 'First Anniversary', desc: 'Celebration at the beach house.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800',
    category: 'Celebrations', year: '2024', rating: 'U/A 16+', type: 'Series', dateAdded: Date.now() - 50000
  }
];

const mainTabs = ['Home', 'Dates', 'Categories', 'My List'];
const subCategories = ['Celebrations', 'Romance', 'Our Time', 'Documentaries'];

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('user_state')) {
        db.createObjectStore('user_state', { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function loadData() {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(['memories', 'user_state'], 'readonly');
    const memStore = tx.objectStore('memories');
    const stateStore = tx.objectStore('user_state');
    
    let dbMemories = [];
    memStore.getAll().onsuccess = (e) => { dbMemories = e.target.result; };
    stateStore.get('myList').onsuccess = (e) => { if (e.target.result) appState.myList = e.target.result.data; };
    stateStore.get('continueWatching').onsuccess = (e) => { if (e.target.result) appState.continueWatching = e.target.result.data; };
    stateStore.get('settings').onsuccess = (e) => { if (e.target.result) appState.settings = e.target.result.data; };
    stateStore.get('profiles').onsuccess = (e) => { 
      if (e.target.result) {
        appState.profiles = e.target.result.data.map(pf => {
          if(pf.avatar.includes('unsplash.com')) {
            if(pf.name === 'Sarthak') pf.avatar = 'img20251010.jpg';
            if(pf.name === 'Reechita') pf.avatar = 'img2025.78_07.jpg';
            if(pf.name === 'Our Future Kids') pf.avatar = '20250707_2328.jpg';
          }
          return pf;
        });
      }
    };
    
    tx.oncomplete = async () => {
      if (appState.profiles.length === 0) {
        appState.profiles = [...initialProfiles];
        await saveStateList('profiles', appState.profiles);
      }
      
      if (dbMemories.length === 0) {
        for(const m of initialMemories) await saveMemoryToDB(m);
        appState.memories = [...initialMemories];
      } else {
        appState.memories = dbMemories;
      }
      resolve();
    };
  });
}

function saveMemoryToDB(memory) {
  return initDB().then(db => {
    return new Promise((resolve) => {
      const tx = db.transaction('memories', 'readwrite');
      tx.objectStore('memories').put(memory);
      tx.oncomplete = () => resolve();
    });
  });
}

function saveStateList(key, data) {
  return initDB().then(db => {
    const tx = db.transaction('user_state', 'readwrite');
    tx.objectStore('user_state').put({ key, data });
  });
}

function transitionView(newView) {
  const app = document.getElementById('app');
  app.classList.add('fade-out');
  setTimeout(() => {
    appState.view = newView;
    render();
    app.classList.remove('fade-out');
  }, 400);
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (appState.view === 'startup') app.appendChild(createStartupScreen());
  else if (appState.view === 'profiles') app.appendChild(createProfileSelection());
  else if (appState.view === 'intro') app.appendChild(createIntroScreen());
  else if (appState.view === 'dashboard') app.appendChild(createDashboard());
}

window.setCategory = (cat) => {
  appState.activeCategory = cat;
  render();
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
    <video id="startup-vid" src="src/components/vidssave.com%20Netflix%20New%20Logo%20Animation%202019%201080p.mp4" playsinline style="width:100%; height:100%; object-fit:cover;"></video>
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
        editProfileImage(pf.id);
      } else {
        // Simulate Netflix style loading wait
        p.innerHTML = `<div class="profile-avatar-wrapper"><div class="loading-spinner"></div></div><div class="profile-name">${pf.name}</div>`;
        setTimeout(() => {
          appState.currentProfile = pf.name;
          transitionView('intro');
          setTimeout(() => { transitionView('dashboard'); }, 3500);
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

window.editProfileImage = (pfId) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    // Very simple square cropping canvas
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
        
        const newAvatar = canvas.toDataURL('image/jpeg');
        const pf = appState.profiles.find(p => p.id === pfId);
        if(pf) pf.avatar = newAvatar;
        saveStateList('profiles', appState.profiles);
        render();
      };
      img.src = re.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
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
  c.appendChild(createHero());
  
  const rc = document.createElement('div');
  rc.className = 'slider-container';
  
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
  
  c.appendChild(rc);
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
    
    nav.innerHTML = `
      <div class="nav-logo" onclick="setCategory('Home')">
        <div class="nav-logo-text">OUR STORY</div>
      </div>
      <ul class="nav-links">
        ${mainTabs.map(cat => `<li class="${appState.activeCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</li>`).join('')}
      </ul>
      <div class="nav-right">
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
        <div class="card-title">${m.title}</div>
        <div class="card-meta">98% Match &nbsp;&nbsp; <span style="color:#fff">${m.year}</span></div>
      </div>
    `;
    rc.appendChild(card);
  });
  return row;
}

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
  document.getElementById('up-publish').onclick = async () => {
    const title = document.getElementById('up-title').value.trim();
    if(!title) return alert("Title required");
    
    // Store video Blob via IndexedDB for persistence
    const fileObj = document.getElementById('up-vid-file').files[0];
    
    const mem = {
      id: 'm_' + Date.now(),
      title,
      desc: document.getElementById('up-desc').value,
      category: document.getElementById('up-cat').value,
      year: document.getElementById('up-date').value || new Date().getFullYear().toString(),
      rating: document.getElementById('up-rating').value,
      thumbnail: currentThumbData,
      videoUrl: currentVideoUrl,
      videoFile: fileObj, // File persists in IndexedDB directly
      dateAdded: Date.now()
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
  alert("Memory link copied to clipboard!\nYou can share this with Sarthak & Reechita.");
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
  if(m.videoFile && !url.startsWith('blob:')) {
    url = URL.createObjectURL(m.videoFile);
    m.videoUrl = url;
  }
  
  const detailModal = document.getElementById('detailModal');
  if(detailModal) detailModal.remove();
  
  const c = document.createElement('div');
  c.className = 'playback-overlay';
  c.id = 'playbackOverlay';
  
  // Play Netflix initial animation before playing video
  c.innerHTML = `
    <div class="playback-back" onclick="document.getElementById('playbackOverlay').remove(); render();">🡠</div>
    <video src="src/components/vidssave.com%20Netflix%20New%20Logo%20Animation%202019%201080p.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%;"></video>
    <video src="${url}" controls id="fsyPlayer" style="display:none; width:100%; height:100%; background:black;"></video>
  `;
  document.body.appendChild(c);
  
  const introPlayer = document.getElementById('introPlayer');
  const mainPlayer = document.getElementById('fsyPlayer');
  
  const startMainVideo = () => {
    introPlayer.style.display = 'none';
    mainPlayer.style.display = 'block';
    
    // Auto play when transition is done
    const pPromise = mainPlayer.play();
    if(pPromise !== undefined) pPromise.catch(e => console.error("Autoplay main video prevented", e));
  };
  
  // Try autoplaying intro, else wait
  if(introPlayer.play() !== undefined) {
    introPlayer.play().catch(() => startMainVideo());
  }
  
  introPlayer.onended = startMainVideo;
  
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
  loadData().then(render);
};
