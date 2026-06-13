const defaultProfiles = [
  { id: '1', name: 'Sarthak', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop', savedPin: '143' },
  { id: '2', name: 'Reechita', avatar: 'https://images.unsplash.com/photo-1610030469668-93535c17b6b3?q=80&w=400&auto=format&fit=crop', savedPin: '143' },
  { id: '3', name: 'Our Future Kids', avatar: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?q=80&w=400&auto=format&fit=crop', savedPin: '143', isKids: true }
];

let profilesData = [];

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
      { id: 'm1', title: 'Our First Date', desc: 'The day my life changed forever. We went to that little cafe and talked for hours.', thumb: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop', match: 99, year: '2023', duration: '2h 15m', rating: '13+', cast: 'Sia, Aman', tags: 'Romantic, Core Memory', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', type: 'Movies' },
      { id: 'm2', title: 'Beach Day', desc: 'Watching the sunset together and eating too much ice cream.', thumb: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop', match: 98, year: '2023', duration: '1h 30m', rating: 'PG', cast: 'Sia, Aman', tags: 'Fun, Summer', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', type: 'Movies' },
      { id: 'm3', title: 'Late Night Drives', desc: 'Listening to our favorite playlist with no destination in mind.', thumb: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=800&auto=format&fit=crop', match: 100, year: '2023', duration: '45m', rating: '16+', cast: 'Sia, Aman', tags: 'Cozy, Music', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'TV Shows' },
      { id: 'm4', title: 'Movie Night', desc: 'Falling asleep halfway through the movie we promised we would finish.', thumb: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop', match: 95, year: '2024', duration: '3h', rating: 'PG', cast: 'Sia, Aman', tags: 'Sleepy, Home', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', type: 'Movies' }
    ]
  },
  {
    id: 'recent',
    title: 'Recently Watched',
    memories: [
      { id: 'm5', title: 'Winter Trip', desc: 'Playing in the snow and drinking hot chocolate by the fire.', thumb: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop', match: 97, year: '2024', duration: '3 Days', rating: '13+', cast: 'Sia, Aman', tags: 'Travel, Cold', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'TV Shows' },
      { id: 'm6', title: 'Anniversary Dinner', desc: 'Getting dressed up and celebrating us.', thumb: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop', match: 100, year: '2024', duration: '2h 30m', rating: '18+', cast: 'Sia, Aman', tags: 'Fancy, Romantic', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', type: 'Documentaries' },
      { id: 'm7', title: 'Random Tuesday', desc: 'Doing absolutely nothing together and loving every second of it.', thumb: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=800&auto=format&fit=crop', match: 96, year: '2024', duration: 'All Day', rating: 'G', cast: 'Sia, Aman', tags: 'Lazy, Comfort', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', type: 'Documentaries' }
    ]
  },
  {
    id: 'trending',
    title: 'Trending Chronicles',
    memories: [
      { id: 'm8', title: 'Cafe Outing', desc: 'Discovering the mini pastries that became our weekly craving.', thumb: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop', match: 94, year: '2024', duration: '1h', rating: 'G', cast: 'Sia, Aman', tags: 'Foodie, Coffee', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'Documentaries' },
      { id: 'm9', title: 'City Park Picnic', desc: 'Sia trying to paint while Aman is busy feeding birds.', thumb: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=800&auto=format&fit=crop', match: 99, year: '2025', duration: '4h', rating: 'PG', cast: 'Sia, Aman', tags: 'Art, Sunshine', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', type: 'TV Shows' },
      { id: 'm10', title: 'Midnight Culinary Fail', desc: 'The historic attempt at baking deep-dish pizza at 2:00 AM.', thumb: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop', match: 91, year: '2025', duration: '1h 15m', rating: '13+', cast: 'Sia, Aman', tags: 'Hilarious, Kitchen', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', type: 'Movies' }
    ]
  }
];

const upcomingData = [
  { id: 'u1', title: 'Cozy Snow Cabin Escape', desc: 'Planning our cozy cabin stay in mountains.', thumb: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop', match: 99, year: 'Upcoming', duration: 'TBA', rating: 'G', cast: 'Sia, Aman', tags: 'Cozy, Escape', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', releaseDate: 'Dec 15, 2026' },
  { id: 'u2', title: 'Our Second Anniversary', desc: 'A major milestone of memory building and growth.', thumb: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=800&auto=format&fit=crop', match: 100, year: 'Upcoming', duration: 'All Night', rating: 'PG', cast: 'Sia, Aman', tags: 'Milestone, Romance', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', releaseDate: 'May 12, 2027' },
  { id: 'u3', title: 'The Coastal Roadtrip', desc: 'Hand in hand to meet the golden sands and blue waves.', thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop', match: 98, year: 'Upcoming', duration: '7 Days', rating: 'PG', cast: 'Sia, Aman', tags: 'Adventure, Ocean', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', releaseDate: 'Aug 1, 2027' }
];

const availableAvatars = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1610030469668-93535c17b6b3?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=400&auto=format&fit=crop'
];

let appState = {
  view: 'intro',
  activeProfile: null,
  myList: [],
  currentCategoryFilter: 'Home',
  searchQuery: '',
  isManaging: false
};

document.addEventListener('DOMContentLoaded', () => {
    applyTimeBasedTheme();
    try {
      const savedProfiles = localStorage.getItem('netflix_profiles_v4');
      if (savedProfiles) {
          profilesData = JSON.parse(savedProfiles);
      } else {
          profilesData = JSON.parse(JSON.stringify(defaultProfiles));
          saveState();
      }
      const savedList = localStorage.getItem('netflix_mylist');
      if (savedList) {
          appState.myList = JSON.parse(savedList);
      }
    } catch(e) {
      profilesData = JSON.parse(JSON.stringify(defaultProfiles));
    }
    
    render();
});

function applyTimeBasedTheme() {
    const body = document.body;
    body.classList.remove('is-morning');
}

function updateThemeButtonLabel() {
    // Theme switch button is deprecated, keeping empty stub for compatibility
}

function saveState() {
    localStorage.setItem('netflix_profiles_v4', JSON.stringify(profilesData));
    localStorage.setItem('netflix_mylist', JSON.stringify(appState.myList));
}

function render() {
    applyTimeBasedTheme();
    const app = document.getElementById('app');
    app.innerHTML = '';
    
    if (appState.view === 'intro') {
        app.appendChild(createIntroScreen());
        setTimeout(() => {
            appState.view = 'profiles';
            render();
        }, 4800);
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
    container.className = 'intro-screen intro-screen-fade-out';
    
    const audio = document.createElement('audio');
    audio.src = 'https://assets.nflxext.com/us/ffe/siteui/common/audio/ta_dum.mp4';
    audio.autoplay = true;
    audio.volume = 0.5;
    container.appendChild(audio);
    
    const brush = document.createElement('div');
    brush.className = 'effect-brush';
    container.appendChild(brush);
    
    const n = document.createElement('div');
    n.className = 'sa-container';
    n.innerText = 'N';
    n.style.fontFamily = '"Bebas Neue", "Helvetica Neue", sans-serif';
    n.style.fontSize = '30vw';
    n.style.fontWeight = 'bold';
    
    container.appendChild(n);
    return container;
}

function createProfilesScreen() {
    const container = document.createElement('div');
    container.className = 'profiles-screen' + (appState.isManaging ? ' is-managing' : '');
    
    const title = document.createElement('h1');
    title.className = 'profiles-title';
    title.innerText = appState.isManaging ? "Manage Profiles:" : "Who's watching?";
    container.appendChild(title);
    
    const list = document.createElement('div');
    list.className = 'profiles-list';
    
    profilesData.forEach(profile => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.onclick = () => {
            if (appState.isManaging) {
                openProfileEditModal(profile);
            } else {
                appState.activeProfile = profile;
                if (!profile.savedPin) {
                    appState.view = 'pinSetup';
                } else {
                    appState.view = 'pinVerify';
                }
                render();
            }
        };
        
        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'profile-avatar-wrapper';
        
        const avatar = document.createElement('img');
        avatar.className = 'profile-avatar';
        avatar.src = profile.avatar;
        avatarWrapper.appendChild(avatar);
        
        if (profile.isKids) {
            const kidBadge = document.createElement('div');
            kidBadge.className = 'kids-badge';
            kidBadge.innerText = 'KIDS';
            avatarWrapper.appendChild(kidBadge);
        }
        
        // Dark edit overlay holding pencil
        const editOverlay = document.createElement('div');
        editOverlay.className = 'profile-edit-overlay';
        const editIcon = document.createElement('div');
        editIcon.className = 'profile-edit-icon';
        editIcon.innerText = '✏️';
        editOverlay.appendChild(editIcon);
        avatarWrapper.appendChild(editOverlay);
        
        const name = document.createElement('div');
        name.className = 'profile-name';
        name.innerText = profile.name;
        
        card.appendChild(avatarWrapper);
        card.appendChild(name);
        list.appendChild(card);
    });
    
    // Add profile card
    const addCard = document.createElement('div');
    addCard.className = 'profile-card';
    addCard.onclick = () => {
        openProfileAddModal();
    };
    
    const plusWrapper = document.createElement('div');
    plusWrapper.className = 'profile-avatar-wrapper';
    const plusCircle = document.createElement('div');
    plusCircle.className = 'profile-add-circle';
    plusCircle.innerText = '+';
    plusWrapper.appendChild(plusCircle);
    
    const plusName = document.createElement('div');
    plusName.className = 'profile-name';
    plusName.innerText = 'Add Profile';
    
    addCard.appendChild(plusWrapper);
    addCard.appendChild(plusName);
    list.appendChild(addCard);
    
    container.appendChild(list);
    
    const manageBtn = document.createElement('button');
    manageBtn.className = 'manage-profiles-btn';
    manageBtn.innerText = appState.isManaging ? 'Done' : 'Manage Profiles';
    manageBtn.onclick = () => {
        appState.isManaging = !appState.isManaging;
        render();
    };
    container.appendChild(manageBtn);
    
    return container;
}

function openProfileAddModal() {
    const overlay = document.createElement('div');
    overlay.className = 'profile-modal-overlay';
    
    let selectedAvatar = availableAvatars[0];
    
    overlay.innerHTML = `
        <div class="profile-modal-box">
            <h2 class="profile-modal-title">Create Profile</h2>
            <div class="profile-modal-field">
                <label>Profile Name</label>
                <input type="text" class="profile-modal-input" id="new-profile-name" placeholder="Enter name" maxlength="15">
            </div>
            <div class="profile-modal-field">
                <label>Choose Avatar Icon</label>
                <div class="avatar-selection-grid" id="add-avatar-grid"></div>
            </div>
            <div class="profile-modal-field" style="flex-direction: row; align-items: center; gap: 10px; margin-top: 15px;">
                <input type="checkbox" id="new-profile-kids" style="transform: scale(1.3); cursor: pointer;">
                <label for="new-profile-kids" style="cursor: pointer; font-size: 14px; user-select: none; color: #ccc;">This profile is modeled for Kids edition</label>
            </div>
            <div class="profile-modal-field" style="margin-top: 15px;">
                <label>3-Digit Access Lock PIN (Optional)</label>
                <input type="text" class="profile-modal-input" id="new-profile-pin" placeholder="None" maxlength="3" style="width: 100px; text-align: center;">
            </div>
            <div class="profile-modal-actions">
                <button class="profile-btn-cancel" id="add-profile-cancel">Cancel</button>
                <button class="profile-btn-save" id="add-profile-save">Save Profile</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const grid = overlay.querySelector('#add-avatar-grid');
    availableAvatars.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'avatar-option' + (index === 0 ? ' selected' : '');
        item.dataset.url = url;
        item.innerHTML = `<img src="${url}">`;
        item.onclick = () => {
            overlay.querySelectorAll('.avatar-option').forEach(n => n.classList.remove('selected'));
            item.classList.add('selected');
            selectedAvatar = url;
        };
        grid.appendChild(item);
    });
    
    overlay.querySelector('#new-profile-name').focus();
    
    overlay.querySelector('#add-profile-cancel').onclick = () => {
        overlay.remove();
    };
    
    overlay.querySelector('#add-profile-save').onclick = () => {
        const nameVal = overlay.querySelector('#new-profile-name').value.trim();
        if (!nameVal) {
            alert('A profile must have a valid name!');
            return;
        }
        
        const pinVal = overlay.querySelector('#new-profile-pin').value.trim();
        if (pinVal && (pinVal.length !== 3 || isNaN(pinVal))) {
            alert('PIN locker must be exact 3 numerical digits!');
            return;
        }
        
        const isKids = overlay.querySelector('#new-profile-kids').checked;
        
        const newProf = {
            id: Date.now().toString(),
            name: nameVal,
            avatar: selectedAvatar,
            savedPin: pinVal,
            isKids: isKids
        };
        
        profilesData.push(newProf);
        saveState();
        overlay.remove();
        render();
    };
}

function openProfileEditModal(profile) {
    const overlay = document.createElement('div');
    overlay.className = 'profile-modal-overlay';
    
    let selectedAvatar = profile.avatar;
    
    overlay.innerHTML = `
        <div class="profile-modal-box">
            <h2 class="profile-modal-title">Edit Profile Details</h2>
            <div class="profile-modal-field">
                <label>Profile Name</label>
                <input type="text" class="profile-modal-input" id="edit-profile-name" value="${profile.name}" maxlength="15">
            </div>
            <div class="profile-modal-field">
                <label>Change Avatar Icon</label>
                <div class="avatar-selection-grid" id="edit-avatar-grid"></div>
            </div>
            <div class="profile-modal-field" style="flex-direction: row; align-items: center; gap: 10px; margin-top: 15px;">
                <input type="checkbox" id="edit-profile-kids" ${profile.isKids ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;">
                <label for="edit-profile-kids" style="cursor: pointer; font-size: 14px; user-select: none; color: #ccc;">This profile is modeled for Kids edition</label>
            </div>
            <div class="profile-modal-field" style="margin-top: 15px;">
                <label>3-Digit Access Lock PIN (Optional)</label>
                <input type="text" class="profile-modal-input" id="edit-profile-pin" value="${profile.savedPin || ''}" placeholder="None" maxlength="3" style="width: 100px; text-align: center;">
            </div>
            <div class="profile-modal-actions">
                ${profilesData.length > 1 ? '<button class="profile-btn-delete" id="edit-profile-delete">Delete</button>' : ''}
                <button class="profile-btn-cancel" id="edit-profile-cancel">Cancel</button>
                <button class="profile-btn-save" id="edit-profile-save">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const grid = overlay.querySelector('#edit-avatar-grid');
    availableAvatars.forEach((url) => {
        const item = document.createElement('div');
        item.className = 'avatar-option' + (selectedAvatar === url ? ' selected' : '');
        item.dataset.url = url;
        item.innerHTML = `<img src="${url}">`;
        item.onclick = () => {
            overlay.querySelectorAll('.avatar-option').forEach(n => n.classList.remove('selected'));
            item.classList.add('selected');
            selectedAvatar = url;
        };
        grid.appendChild(item);
    });
    
    overlay.querySelector('#edit-profile-cancel').onclick = () => {
        overlay.remove();
    };
    
    const delBtn = overlay.querySelector('#edit-profile-delete');
    if (delBtn) {
        delBtn.onclick = () => {
            if (confirm(`Are you completely sure you want to delete profile "${profile.name}"?`)) {
                profilesData = profilesData.filter(p => p.id !== profile.id);
                saveState();
                overlay.remove();
                render();
            }
        };
    }
    
    overlay.querySelector('#edit-profile-save').onclick = () => {
        const nameVal = overlay.querySelector('#edit-profile-name').value.trim();
        if (!nameVal) {
            alert('Profile must contain a non-empty name!');
            return;
        }
        
        const pinVal = overlay.querySelector('#edit-profile-pin').value.trim();
        if (pinVal && (pinVal.length !== 3 || isNaN(pinVal))) {
            alert('PIN lock must be exactly 3 numerical digits!');
            return;
        }
        
        const isKids = overlay.querySelector('#edit-profile-kids').checked;
        
        const matched = profilesData.find(p => p.id === profile.id);
        if (matched) {
            matched.name = nameVal;
            matched.avatar = selectedAvatar;
            matched.savedPin = pinVal;
            matched.isKids = isKids;
        }
        
        saveState();
        overlay.remove();
        render();
    };
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
    sub.innerText = isSetup ? 'Setup your secure PIN to protect this profile.' : 'Enter your 3-digit PIN to access this profile. (Hint: The PIN is 143)';
    container.appendChild(sub);

    const inputs = document.createElement('div');
    inputs.className = 'pin-inputs';
    
    let pinStr = '';
    
    for(let i=0; i<3; i++) {
        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'pin-input';
        // HTML ID Attribute for automation
        input.id = `pin-digit-${i}`;
        input.maxLength = 1;
        input.dataset.index = i;
        
        input.addEventListener('input', (e) => {
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
                       alert('Incorrect PIN! Please try again.');
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
    
    const actionWrapper = document.createElement('div');
    actionWrapper.className = 'profile-manage-actions';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.style.background = 'transparent';
    backBtn.innerText = 'Back to Profiles';
    backBtn.onclick = () => { appState.view = 'profiles'; render(); };
    actionWrapper.appendChild(backBtn);
    
    container.appendChild(actionWrapper);

    if (!isSetup) {
        const resetLink = document.createElement('div');
        resetLink.className = 'pin-reset-link';
        resetLink.innerText = 'Forgot PIN? Resecure Slot';
        resetLink.onclick = () => {
            if(confirm('Reset this slot PIN specifically and proceed to set a new one?')) {
                appState.activeProfile.savedPin = '';
                saveState();
                appState.view = 'pinSetup';
                render();
            }
        };
        container.appendChild(resetLink);
    }
    
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
    nav.id = 'netflix-navbar';
    nav.innerHTML = `
        <div class="nav-left">
            <div class="logo" onclick="setFilter('Home')" style="cursor: pointer; display: flex; align-items: center;">
                <svg viewBox="0 0 110 30" width="110" height="30" fill="#e50914" xmlns="http://www.w3.org/2000/svg" style="display: block; width: 110px; height: 30px;">
                    <path d="M0 0h4.3v15L11.2 0h4.8v30h-4.3V15L4.8 30H0V0z"/>
                    <path d="M20 0h11v4.5h-6.7v8h5.8v4.5h-5.8V25.5H31V30H20V0z"/>
                    <path d="M35 0h12v4.5H41V30h-4.5V4.5H35V0z"/>
                    <path d="M51 0h11v4.5h-6.5V13h5.5v4.5h-5.5V30h-4.5V0z"/>
                    <path d="M66 0h4.5v25.5h6.5V30H66V0z"/>
                    <path d="M80 0h4.5v30H80V0z"/>
                    <path d="M89 0h4.8l4.2 11.5L102.2 0h4.8l-6.8 15 6.8 15h-4.8l-4.2-11.5L93.8 30H89l6.8-15-6.8-15z"/>
                </svg>
            </div>
            <div class="nav-links">
                <a class="${appState.currentCategoryFilter === 'Home' ? 'active' : ''}" onclick="setFilter('Home')">Home</a>
                <a class="${appState.currentCategoryFilter === 'TV Shows' ? 'active' : ''}" onclick="setFilter('TV Shows')">TV Shows</a>
                <a class="${appState.currentCategoryFilter === 'Movies' ? 'active' : ''}" onclick="setFilter('Movies')">Movies</a>
                <a class="${appState.currentCategoryFilter === 'Documentaries' ? 'active' : ''}" onclick="setFilter('Documentaries')">Documentaries</a>
                <a class="${appState.currentCategoryFilter === 'My List' ? 'active' : ''}" onclick="setFilter('My List')">My List</a>
            </div>
        </div>
        <div class="nav-right">
            <div class="search-container">
                <span class="search-icon">🔍</span>
                <input type="text" class="search-input" id="search-bar" placeholder="Search memories..." value="${appState.searchQuery}" oninput="handleSearch(this.value)">
                <span class="search-clear" id="search-clear-btn" onclick="clearSearch()" style="${appState.searchQuery ? 'display: inline;' : 'display: none;'}">&times;</span>
            </div>
            <img class="nav-avatar" src="${appState.activeProfile.avatar}" alt="User" onclick="logout()" title="Click to logout">
        </div>
    `;
    
    window.setFilter = (filterName) => {
        appState.currentCategoryFilter = filterName;
        // Keep search preserved or reset on filter change as fits standard expectation
        render();
    };

    window.logout = () => {
        appState.view = 'profiles';
        appState.activeProfile = null;
        appState.searchQuery = '';
        render();
    };

    window.handleSearch = (val) => {
        appState.searchQuery = val;
        const clrBtn = document.getElementById('search-clear-btn');
        if (clrBtn) {
            clrBtn.style.display = val ? 'inline' : 'none';
        }
        renderBrowseRows();
    };

    window.clearSearch = () => {
        appState.searchQuery = '';
        const searchInput = document.getElementById('search-bar');
        if (searchInput) {
            searchInput.value = '';
        }
        const clrBtn = document.getElementById('search-clear-btn');
        if (clrBtn) {
            clrBtn.style.display = 'none';
        }
        renderBrowseRows();
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
        <div class="hero-bg-wrapper">
            <video class="hero-bg hero-video" id="hero-bg-video" src="${mainFeatureData.videoUrl}" autoplay loop muted playsinline></video>
        </div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-title">${mainFeatureData.title}</div>
            <!-- Custom playwrite english joined tag subtitle for premium aesthetic -->
            <div class="meta-subtitle">Our 1st Anniversary Commemorative Chronicle</div>
            <div class="hero-desc">${mainFeatureData.description}</div>
            <div class="btn-row">
                <button class="btn btn-primary" onclick="playFeatureTrailer()">▶ Play Trailer</button>
                <button class="btn btn-secondary" onclick="openFeaturedMeta()">ⓘ More Info</button>
            </div>
        </div>
        <div class="hero-controls">
            <button class="hero-audio-btn" id="hero-audio-toggle" onclick="toggleHeroVolume()" title="Mute/Unmute Feature Video">🔇</button>
            <div class="hero-divider"></div>
            <div class="hero-rating-badge">U/A 17+</div>
        </div>
    `;
    
    window.toggleHeroVolume = () => {
        const vid = document.getElementById('hero-bg-video');
        const btn = document.getElementById('hero-audio-toggle');
        if (vid && btn) {
            vid.muted = !vid.muted;
            btn.innerText = vid.muted ? '🔇' : '🔊';
        }
    };

    window.playFeatureTrailer = () => {
        openModal({
            title: mainFeatureData.title,
            desc: mainFeatureData.description,
            thumb: mainFeatureData.coverUrl,
            match: 100,
            year: '2026',
            duration: 'Full Special',
            rating: '17+',
            cast: 'Sia, Aman',
            tags: 'Romantic, Anniversary Special',
            video: mainFeatureData.videoUrl
        });
    };

    window.openFeaturedMeta = () => {
        playFeatureTrailer();
    };

    container.appendChild(hero);
    
    // Rows
    const rowsWrapper = document.createElement('div');
    rowsWrapper.id = 'rows-container';
    rowsWrapper.className = 'rows-container';
    container.appendChild(rowsWrapper);
    
    setTimeout(() => {
        renderBrowseRows();
    }, 0);
    
    return container;
}

function renderBrowseRows() {
    const rowsContainer = document.getElementById('rows-container');
    if (!rowsContainer) return;
    
    rowsContainer.innerHTML = '';
    
    // Deep clone static categories 
    const allCategories = JSON.parse(JSON.stringify(categoriesData));
    
    let filteredCategories = [];
    
    if (appState.currentCategoryFilter === 'Home') {
        filteredCategories = allCategories;
        // Prepend My List segment to Home if populated 
        if (appState.myList.length > 0) {
            filteredCategories = [{
                id: 'mylist',
                title: 'My Saved Memories',
                memories: appState.myList
            }, ...filteredCategories];
        }
    } else if (appState.currentCategoryFilter === 'My List') {
        filteredCategories = [{
            id: 'mylist',
            title: 'My Saved Memories',
            memories: appState.myList
        }];
    } else {
        // Filter memories inside each category by the selected type
        allCategories.forEach(cat => {
            const matchingMemories = cat.memories.filter(m => m.type === appState.currentCategoryFilter);
            if (matchingMemories.length > 0) {
                filteredCategories.push({
                    id: cat.id,
                    title: `${cat.title} - ${appState.currentCategoryFilter}`,
                    memories: matchingMemories
                });
            }
        });
    }

    // Apply real-time search query filtering if active
    const query = (appState.searchQuery || '').trim().toLowerCase();
    if (query) {
        const searched = [];
        filteredCategories.forEach(cat => {
            const matches = cat.memories.filter(m => {
                return (m.title || '').toLowerCase().includes(query) || 
                       (m.desc || '').toLowerCase().includes(query) ||
                       (m.tags || '').toLowerCase().includes(query) ||
                       (m.cast || '').toLowerCase().includes(query);
            });
            if (matches.length > 0) {
                searched.push({
                    id: cat.id,
                    title: cat.title,
                    memories: matches
                });
            }
        });
        filteredCategories = searched;
    }

    // Render filtered rows
    filteredCategories.forEach((cat, rIdx) => {
        const row = document.createElement('div');
        row.className = 'feature-row';
        row.id = `row-category-${cat.id}`;
        
        const title = document.createElement('div');
        title.className = 'row-title';
        title.innerText = cat.title;
        row.appendChild(title);
        
        const items = document.createElement('div');
        items.className = 'row-items';
        
        cat.memories.forEach(mem => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.id = `card-movie-${mem.id}`;
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

    // Append standard Netflix-style 'Coming Soon' row at the bottom of Home View 
    let upcomingVisible = false;
    if (appState.currentCategoryFilter === 'Home' || appState.currentCategoryFilter === 'Movies') {
        let upcomingItems = upcomingData;
        if (query) {
            upcomingItems = upcomingData.filter(item => {
                return (item.title || '').toLowerCase().includes(query) || 
                       (item.desc || '').toLowerCase().includes(query) ||
                       (item.tags || '').toLowerCase().includes(query);
            });
        }

        if (upcomingItems.length > 0) {
            upcomingVisible = true;
            const row = document.createElement('div');
            row.className = 'feature-row';
            row.id = 'row-category-upcoming';
            
            const title = document.createElement('div');
            title.className = 'row-title';
            title.innerText = 'Coming Soon (Upcoming Special Releases)';
            row.appendChild(title);
            
            const items = document.createElement('div');
            items.className = 'row-items';
            
            upcomingItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.id = `card-upcoming-${item.id}`;
                card.style.position = 'relative';
                card.onclick = () => openModal(item);
                
                const badge = document.createElement('div');
                badge.className = 'upcoming-badge';
                badge.innerText = item.releaseDate;
                card.appendChild(badge);
                
                const img = document.createElement('img');
                img.src = item.thumb;
                img.className = 'movie-img';
                img.loading = 'lazy';
                card.appendChild(img);
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'upcoming-date';
                infoDiv.innerText = `${item.releaseDate}`;
                card.appendChild(infoDiv);
                
                items.appendChild(card);
            });
            
            row.appendChild(items);
            rowsContainer.appendChild(row);
        }
    }

    // Show stylish empty state if absolutely nothing matches
    if (filteredCategories.length === 0 && !upcomingVisible) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'search-empty-state';
        emptyDiv.innerHTML = `
            <div class="search-empty-title">No matching memories found for "${appState.searchQuery}"</div>
            <div class="search-empty-subtitle">Sia and Aman have countless beautiful moments together. Try typing "date", "trip", "romantic", or "Tuesday"!</div>
        `;
        rowsContainer.appendChild(emptyDiv);
    }
    
    // Trigger intersection scroll animation in rows
    setTimeout(() => {
        initScrollAnimation();
    }, 100);
}

function initScrollAnimation() {
    const rows = document.querySelectorAll('.feature-row');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, {
        threshold: 0.1
    });
    
    rows.forEach(row => {
        observer.observe(row);
    });
}

function toggleMyList(memory) {
    const idx = appState.myList.findIndex(m => m.id === memory.id);
    let inList = false;
    
    if (idx > -1) {
        appState.myList.splice(idx, 1);
        inList = false;
    } else {
        appState.myList.push(memory);
        inList = true;
    }
    
    saveState();
    renderBrowseRows();
    return inList;
}

function openModal(memory) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'movie-modal';
    
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    };

    const inMyList = appState.myList.find(m => m.id === memory.id);
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-video-container">
                    <!-- Dynamic trailer playback with speaker mute controls -->
                    <video class="modal-video" src="${memory.video}" autoplay loop muted></video>
                </div>
                <div class="modal-header-overlay"></div>
                <button class="close-btn" id="modal-close-x" title="Close details">&times;</button>
                <div class="modal-title-wrapper">
                    <div class="modal-title">${memory.title}</div>
                    <div class="btn-row">
                        <button class="btn btn-primary" onclick="alert('Enjoying this beautiful memory clip of Sia and Aman!')">
                            ▶ Play Clip
                        </button>
                        <button class="add-to-list-btn" id="modal-list-btn" title="Add to Saved List">
                            ${inMyList ? '✓' : '+'}
                        </button>
                        <button class="mute-btn" id="modal-mute-btn" title="Mute/Unmute Audio">🔇</button>
                    </div>
                </div>
            </div>
            <div class="modal-body">
                <div class="modal-left">
                    <div class="modal-meta">
                        <span>${memory.match}% Love Match</span>
                        <span class="year">${memory.year}</span>
                        <span class="rating">${memory.rating}</span>
                        <span>${memory.duration}</span>
                    </div>
                    <div class="modal-desc">${memory.desc}</div>
                </div>
                <div class="modal-tags">
                    <div><span>Cast:</span> <span>${memory.cast}</span></div>
                    <div><span>Genres:</span> <span>${memory.tags}</span></div>
                    <div><span>This memory is:</span> <span>Intimate, Wholesome & True</span></div>
                </div>
            </div>
        </div>
    `;

    modalOverlay.querySelector('#modal-close-x').onclick = () => modalOverlay.remove();
    
    modalOverlay.querySelector('#modal-list-btn').onclick = (e) => {
        const isNowInList = toggleMyList(memory);
        e.currentTarget.innerText = isNowInList ? '✓' : '+';
    };

    const videoElement = modalOverlay.querySelector('.modal-video');
    const muteBtn = modalOverlay.querySelector('#modal-mute-btn');
    if (videoElement && muteBtn) {
        muteBtn.onclick = () => {
            videoElement.muted = !videoElement.muted;
            muteBtn.innerText = videoElement.muted ? '🔇' : '🔊';
        };
    }

    document.getElementById('app').appendChild(modalOverlay);
}
