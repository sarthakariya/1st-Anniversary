const profilesData = [
  { id: '1', name: '1 month', avatar: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop', savedPin: '' },
  { id: '2', name: '3 months', avatar: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop', savedPin: '' },
  { id: '3', name: '5 months', avatar: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=800&auto=format&fit=crop', savedPin: '' },
  { id: '4', name: '6 months', avatar: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop', savedPin: '' },
];

const mainFeatureData = {
  title: "Life of Sia and Aman",
  description: "A beautiful journey of two souls intertwining. Witness the incredible moments, the laughs, the tears, and the love that grows stronger every passing day.",
  coverUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1920&auto=format&fit=crop",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
};

const categoriesData = [
  {
    id: 'popular',
    title: 'Popular on Netflix',
    memories: [
      { id: 'm1', title: 'Our First Date', desc: 'The day my life changed forever. We went to that little cafe and talked for hours.', thumb: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop', match: 99, year: '2023', duration: '2h 15m', rating: '13+', cast: 'Sia, Aman', tags: 'Romantic, Core Memory', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
      { id: 'm2', title: 'Beach Day', desc: 'Watching the sunset together and eating too much ice cream.', thumb: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop', match: 98, year: '2023', duration: '1h 30m', rating: 'PG', cast: 'Sia, Aman', tags: 'Fun, Summer', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
      { id: 'm3', title: 'Late Night Drives', desc: 'Listening to our favorite playlist with no destination in mind.', thumb: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=800&auto=format&fit=crop', match: 100, year: '2023', duration: '45m', rating: '16+', cast: 'Sia, Aman', tags: 'Cozy, Music', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'm4', title: 'Movie Night', desc: 'Falling asleep halfway through the movie we promised we would finish.', thumb: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop', match: 95, year: '2024', duration: '3h', rating: 'PG', cast: 'Sia, Aman', tags: 'Sleepy, Home', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ]
  },
  {
    id: 'recent',
    title: 'Recently Watched',
    memories: [
      { id: 'm5', title: 'Winter Trip', desc: 'Playing in the snow and drinking hot chocolate by the fire.', thumb: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop', match: 97, year: '2024', duration: '3 Days', rating: '13+', cast: 'Sia, Aman', tags: 'Travel, Cold', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'm6', title: 'Anniversary Dinner', desc: 'Getting dressed up and celebrating us.', thumb: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop', match: 100, year: '2024', duration: '2h 30m', rating: '18+', cast: 'Sia, Aman', tags: 'Fancy, Romantic', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
      { id: 'm7', title: 'Random Tuesday', desc: 'Doing absolutely nothing together and loving every second of it.', thumb: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=800&auto=format&fit=crop', match: 96, year: '2024', duration: 'All Day', rating: 'G', cast: 'Sia, Aman', tags: 'Lazy, Comfort', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ]
  }
];

let appState = {
  view: 'intro',
  activeProfile: null,
  myList: []
};

document.addEventListener('DOMContentLoaded', () => {
    // Attempt to load purely client state from localStorage
    try {
      const savedProfiles = localStorage.getItem('netflix_profiles');
      if (savedProfiles) {
          const parsed = JSON.parse(savedProfiles);
          parsed.forEach((p, idx) => profilesData[idx].savedPin = p.savedPin);
      }
      const savedList = localStorage.getItem('netflix_mylist');
      if (savedList) {
          appState.myList = JSON.parse(savedList);
      }
    } catch(e) {}
    
    render();
});

function saveState() {
    localStorage.setItem('netflix_profiles', JSON.stringify(profilesData));
    localStorage.setItem('netflix_mylist', JSON.stringify(appState.myList));
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    if (appState.view === 'intro') {
        app.appendChild(createIntroScreen());
        setTimeout(() => {
            appState.view = 'profiles';
            render();
        }, 3600);
    } else if (appState.view === 'profiles') {
        app.appendChild(createProfilesScreen());
    } else if (appState.view === 'pinSetup' || appState.view === 'pinVerify') {
        app.appendChild(createPinScreen());
    } else if (appState.view === 'browse') {
        app.appendChild(createBrowseScreen());
    }
}

function createIntroScreen() {
    const container = document.createElement('div');
    container.className = 'intro-screen';
    
    const n = document.createElement('div');
    n.className = 'intro-n';
    n.innerText = 'N';
    
    container.appendChild(n);
    return container;
}

function createProfilesScreen() {
    const container = document.createElement('div');
    container.className = 'profiles-screen';
    
    const title = document.createElement('h1');
    title.className = 'profiles-title';
    title.innerText = "Who's watching?";
    container.appendChild(title);
    
    const list = document.createElement('div');
    list.className = 'profiles-list';
    
    profilesData.forEach(profile => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.onclick = () => {
            appState.activeProfile = profile;
            if (!profile.savedPin) {
                appState.view = 'pinSetup';
            } else {
                appState.view = 'pinVerify';
            }
            render();
        };
        
        const avatar = document.createElement('img');
        avatar.className = 'profile-avatar';
        avatar.src = profile.avatar;
        
        const name = document.createElement('div');
        name.className = 'profile-name';
        name.innerText = profile.name;
        
        card.appendChild(avatar);
        card.appendChild(name);
        list.appendChild(card);
    });
    
    container.appendChild(list);
    
    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn btn-secondary';
    manageBtn.style.marginTop = '40px';
    manageBtn.innerText = 'Manage Profiles';
    manageBtn.style.background = 'transparent';
    manageBtn.style.border = '1px solid gray';
    container.appendChild(manageBtn);
    
    return container;
}

function createPinScreen() {
    const isSetup = appState.view === 'pinSetup';
    const container = document.createElement('div');
    container.className = 'pin-screen';
    
    const title = document.createElement('h2');
    title.className = 'pin-title';
    title.innerText = isSetup ? 'Set 3-Digit PIN' : 'Enter Profile PIN';
    container.appendChild(title);

    const sub = document.createElement('p');
    sub.className = 'pin-subtitle';
    sub.innerText = isSetup ? 'Setup your secure PIN to protect this profile.' : 'Enter your 3-digit PIN to access this profile.';
    container.appendChild(sub);

    const inputs = document.createElement('div');
    inputs.className = 'pin-inputs';
    
    let pinStr = '';
    
    for(let i=0; i<3; i++) {
        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'pin-input';
        input.maxLength = 1;
        input.dataset.index = i;
        
        input.addEventListener('input', (e) => {
            // Restrict to 1 char cleanly
            if(e.target.value.length > 1) {
                e.target.value = e.target.value.slice(-1);
            }
            
            pinStr = Array.from(inputs.querySelectorAll('input')).map(inp => inp.value).join('');
            
            if (e.target.value && i < 2) {
                inputs.children[i+1].focus();
            }
            
            if (pinStr.length === 3) {
               if (isSetup) {
                   appState.activeProfile.savedPin = pinStr;
                   saveState();
                   appState.view = 'browse';
                   render();
               } else {
                   if (pinStr === appState.activeProfile.savedPin) {
                       appState.view = 'browse';
                       render();
                   } else {
                       alert('Incorrect PIN!');
                       inputs.querySelectorAll('input').forEach(inp => inp.value = '');
                       inputs.children[0].focus();
                   }
               }
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && i > 0) {
                 inputs.children[i-1].focus();
            }
        });
        
        inputs.appendChild(input);
    }
    
    container.appendChild(inputs);
    
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.style.marginTop = '20px';
    backBtn.style.background = 'transparent';
    backBtn.innerText = 'Back to Profiles';
    backBtn.onclick = () => { appState.view = 'profiles'; render(); };
    container.appendChild(backBtn);
    
    // Auto focus first item on mount
    setTimeout(() => {
        if(inputs.children[0]) inputs.children[0].focus();
    }, 100);
    
    return container;
}

function createBrowseScreen() {
    const container = document.createElement('div');
    container.className = 'browse-screen animation-fade';
    
    // Navbar
    const nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.innerHTML = `
        <div class="nav-left">
            <div class="logo">NETFLIX</div>
            <div class="nav-links">
                <a class="active">Home</a>
                <a>TV Shows</a>
                <a>Movies</a>
                <a>New & Popular</a>
                <a>My List</a>
            </div>
        </div>
        <div class="nav-right">
            <img class="nav-avatar" src="${appState.activeProfile.avatar}" alt="User" onclick="logout()" title="Click to logout">
        </div>
    `;
    
    window.logout = () => {
        appState.view = 'profiles';
        appState.activeProfile = null;
        render();
    };

    window.onscroll = () => {
        if (window.scrollY > 20) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    };
    
    container.appendChild(nav);
    
    // Hero Section
    const hero = document.createElement('div');
    hero.className = 'hero';
    hero.innerHTML = `
        <img class="hero-bg" src="${mainFeatureData.coverUrl}">
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-title">${mainFeatureData.title}</div>
            <div class="hero-desc">${mainFeatureData.description}</div>
            <div class="btn-row">
                <button class="btn btn-primary" onclick="alert('Playing Full Movie...')">▶ Play</button>
                <button class="btn btn-secondary">ⓘ More Info</button>
            </div>
        </div>
    `;
    container.appendChild(hero);
    
    // Rows
    const rowsWrapper = document.createElement('div');
    rowsWrapper.id = 'rows-container';
    rowsWrapper.className = 'rows-container';
    container.appendChild(rowsWrapper);
    
    // Render the grid lists slightly asynchronously to ensure parent connection 
    setTimeout(() => {
        renderBrowseRows();
    }, 0);
    
    return container;
}

function renderBrowseRows() {
    const rowsContainer = document.getElementById('rows-container');
    if (!rowsContainer) return;
    
    rowsContainer.innerHTML = '';
    
    // Deep clone static data memory 
    const allCategories = JSON.parse(JSON.stringify(categoriesData));
    
    // Inject Dynamic 'My List' segment if populated 
    if (appState.myList.length > 0) {
        allCategories.unshift({
            id: 'mylist',
            title: 'My List',
            memories: appState.myList
        });
    }

    allCategories.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'feature-row';
        
        const title = document.createElement('div');
        title.className = 'row-title';
        title.innerText = cat.title;
        row.appendChild(title);
        
        const items = document.createElement('div');
        items.className = 'row-items';
        
        cat.memories.forEach(mem => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => openModal(mem);
            
            const img = document.createElement('img');
            img.src = mem.thumb;
            img.className = 'movie-img';
            img.loading = 'lazy';
            
            card.appendChild(img);
            items.appendChild(card);
        });
        
        row.appendChild(items);
        rowsContainer.appendChild(row);
    });
}

function toggleMyList(memory) {
    const idx = appState.myList.findIndex(m => m.id === memory.id);
    let inList = false;
    
    // Manage dynamic presence
    if (idx > -1) {
        appState.myList.splice(idx, 1);
        inList = false;
    } else {
        appState.myList.push(memory);
        inList = true;
    }
    
    // Persist & redraw local lists
    saveState();
    renderBrowseRows();
    return inList;
}

function openModal(memory) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Dismissal bounds
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    };

    const inMyList = appState.myList.find(m => m.id === memory.id);
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-video-container">
                    <!-- Dynamic trailer playback trigger on Modal open -->
                    <video class="modal-video" src="${memory.video}" autoplay loop muted></video>
                </div>
                <div class="modal-header-overlay"></div>
                <button class="close-btn">&times;</button>
                <div class="modal-title-wrapper">
                    <div class="modal-title">${memory.title}</div>
                    <div class="btn-row">
                        <button class="btn btn-primary" onclick="alert('Playing full movie...')">
                            ▶ Play
                        </button>
                        <button class="add-to-list-btn" id="modal-list-btn" title="Add to My List">
                            ${inMyList ? '✓' : '+'}
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-body">
                <div class="modal-left">
                    <div class="modal-meta">
                        <span>${memory.match}% Match</span>
                        <span class="year">${memory.year}</span>
                        <span class="rating">${memory.rating}</span>
                        <span>${memory.duration}</span>
                    </div>
                    <div class="modal-desc">${memory.desc}</div>
                </div>
                <div class="modal-tags">
                    <div><span>Cast:</span> <span>${memory.cast}</span></div>
                    <div><span>Genres:</span> <span>${memory.tags}</span></div>
                    <div><span>This movie is:</span> <span>Intimate, Romantic Focus</span></div>
                </div>
            </div>
        </div>
    `;

    modalOverlay.querySelector('.close-btn').onclick = () => modalOverlay.remove();
    
    // Handle Add To List Toggle
    modalOverlay.querySelector('#modal-list-btn').onclick = (e) => {
        const isNowInList = toggleMyList(memory);
        e.currentTarget.innerText = isNowInList ? '✓' : '+';
    };

    document.getElementById('app').appendChild(modalOverlay);
}
