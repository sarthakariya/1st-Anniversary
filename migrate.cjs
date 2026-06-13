const fs = require('fs');

let content = fs.readFileSync('script.js', 'utf8');

// 1. Hook up Firebase at the top
const firebaseImports = `import { db, auth, storage, provider, signInWithPopup, onAuthStateChanged } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

window.transitionView = transitionView; // Expose as it was removed from global scope
window.uploadFileToStorage = async (file, path) => {
  const fileRef = ref(storage, path + '_' + Date.now());
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
};
`;

content = firebaseImports + '\n' + content;

// 2. Replace initDB, loadData, saveMemoryToDB, saveStateList
const dbRegex = /function initDB\(\) \{[\s\S]*?function saveStateList\(key, data\) \{[\s\S]*?\}\n\}/;

const firebaseDBRepl = `async function initDB() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    });
  });
}

async function loadData() {
  let user = await initDB();
  if (!user) {
    try {
      const result = await signInWithPopup(auth, provider);
      user = result.user;
    } catch(e) {
      alert("Sign in required to access household profiles.");
      return;
    }
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
}`;

content = content.replace(dbRegex, firebaseDBRepl);

// 3. Update publish button logic to use Firebase Storage
const publishRegex = /document\.getElementById\('up-publish'\)\.onclick = async \(\) => \{[\s\S]*?render\(\);\n  \};/;

const newPublish = `document.getElementById('up-publish').onclick = async (e) => {
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
  };`;

content = content.replace(publishRegex, newPublish);

// 4. Update playVideo to ignore blob checks and just use URL natively
const playVideoRegex = /let url = m\.videoUrl;\s*if\(m\.videoFile[^}]*\}\s*/;
content = content.replace(playVideoRegex, "let url = m.videoUrl;\n  ");

// 5. Shorten profile selection Netflix initial animation time and add logo fix
content = content.replace(/setTimeout\(\(\) => \{ transitionView\('dashboard'\); \}, 3500\);/, "setTimeout(() => { transitionView('dashboard'); }, 1200);");

// Logo parsing removed

// Write back
fs.writeFileSync('script.js', content);
console.log("Migration complete.");
