// Upload Module
window.openUploadModal = () => {
  const modal = document.createElement('div');
  modal.className = 'upload-overlay';
  modal.id = 'uploadModal';
  modal.innerHTML = `
    <div class="upload-modal">
      <div class="modal-controls">
        <button class="modal-close-btn" onclick="const um = document.getElementById('uploadModal'); um.classList.remove('open'); setTimeout(() => um.remove(), 300);">&times;</button>
      </div>
      <h2 style="margin-top:0; color:white; font-size: 24px; margin-bottom: 25px;">Add New Memory</h2>
      
      <div class="upload-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px;">Title</label>
          <input type="text" id="up-title" class="up-input" placeholder="e.g. Our Trip to Paris">
          
          <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px; margin-top:20px;">Description</label>
          <textarea id="up-desc" class="up-input" style="height: 80px; resize:vertical; font-family:inherit;" placeholder="Add a short description..."></textarea>
          
          <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px; margin-top:20px;">Category / Tag</label>
          <select id="up-cat" class="up-input">
            ${['Memories','Home Videos','Our Time','Celebrations','Random'].map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          
          <div style="display:flex; gap: 15px;">
            <div style="flex:1;">
              <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px; margin-top:20px;">Year</label>
              <input type="text" id="up-year" class="up-input" placeholder="2024">
            </div>
            <div style="flex:1;">
              <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px; margin-top:20px;">Rating (Maturity)</label>
              <select id="up-rating" class="up-input">
                 <option>U/A 7+</option>
                 <option>U/A 13+</option>
                 <option>U/A 16+</option>
                 <option>A</option>
              </select>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <label style="display:flex; justify-content:space-between; color:#aaa; margin-bottom:5px; font-size:14px;">
              <span>Match Intensity</span>
              <span id="up-match-val" style="color: #46d369; font-weight: bold;">99% Romantic Match</span>
            </label>
            <input type="range" id="up-match" min="1" max="100" value="99" style="width:100%;" oninput="document.getElementById('up-match-val').innerText = this.value + '% Romantic Match';">
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap: 20px;">
          <div>
            <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px;">Video File or YouTube URL</label>
            <input type="file" id="up-video" accept="video/mp4,video/x-m4v,video/*,video/quicktime" class="up-input file-input" style="padding: 6px;">
            <div style="color:#666; font-size:12px; margin: 5px 0; text-align:center;">--- OR ---</div>
            <input type="text" id="up-yt" class="up-input" placeholder="https://youtube.com/watch?v=...">
          </div>
          
          <div>
            <label style="display:block; color:#aaa; margin-bottom:5px; font-size:14px;">Thumbnail Image (Optional)</label>
            <input type="file" id="up-thumb" accept="image/*" class="up-input file-input" style="padding: 6px;">
          </div>
          
          <button class="btn btn-primary" id="up-save" style="margin-top:auto; padding: 15px; font-size: 16px; width: 100%; border-radius: 4px;">Upload Memory</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
  
  document.getElementById('up-save').onclick = async () => {
    const title = document.getElementById('up-title').value.trim();
    const desc = document.getElementById('up-desc').value.trim();
    const cat = document.getElementById('up-cat').value;
    const year = document.getElementById('up-year').value.trim() || new Date().getFullYear().toString();
    const rating = document.getElementById('up-rating').value;
    const matchRate = document.getElementById('up-match').value || 99;
    
    // File/URL handling logic mapped from original
    const videoFile = document.getElementById('up-video').files[0];
    const ytUrl = document.getElementById('up-yt').value.trim();
    const thumbFile = document.getElementById('up-thumb').files[0];
    
    if(!title) return alert("Title is required!");
    if(!videoFile && !ytUrl) return alert("Please provide a video file or YouTube URL!");
    
    document.getElementById('up-save').innerText = 'Processing...';
    document.getElementById('up-save').disabled = true;
    
    const readDataUrl = (file) => new Promise(res => {
       const r = new FileReader();
       r.onload = e => res(e.target.result);
       r.readAsDataURL(file);
    });
    
    let videoData = null;
    let thumbData = null;
    let extractedVideoId = null;
    
    if (ytUrl) {
      const match = ytUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
      extractedVideoId = (match && match[1]) ? match[1] : ytUrl;
      thumbData = `https://img.youtube.com/vi/${extractedVideoId}/hqdefault.jpg`;
    } else if (videoFile) {
      if (videoFile.size > 10 * 1024 * 1024) {
         // Create local URL for large files instead of loading all in memory
         extractedVideoId = URL.createObjectURL(videoFile);
      } else {
         extractedVideoId = await readDataUrl(videoFile);
      }
    }
    
    if (thumbFile) thumbData = await readDataUrl(thumbFile);
    if (!thumbData && videoFile) {
       // Generic fallback thumbnail for local videos if no poster given
       thumbData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; 
    }
    
    const mem = {
      id: 'm_' + Date.now(),
      title,
      desc,
      category: cat,
      year,
      rating,
      matchRate,
      thumbnail: thumbData,
      videoUrl: extractedVideoId,
      dateAdded: Date.now(),
      uploadedBy: typeof appState !== 'undefined' ? appState.currentProfile : 'Sarthak'
    };

    await saveMemoryToDB(mem);
    appState.memories.unshift(mem);
    
    // Update sessionStorage if using cache
    if (sessionStorage) {
      sessionStorage.setItem('netflix_memories', JSON.stringify(appState.memories));
    }
    
    const modalEl = document.getElementById('uploadModal');
    modalEl.classList.remove('open');
    setTimeout(() => {
      // GC
      document.getElementById('up-save').onclick = null;
      modalEl.remove();
      render();
    }, 600);
  };
};
