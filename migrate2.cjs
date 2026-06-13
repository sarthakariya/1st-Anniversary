const fs = require('fs');

let content = fs.readFileSync('script.js', 'utf8');

// Replace "OUR STORY" with the netflix logo SVG found in the HTML link
const logoFixRegex = /<div class="nav-logo" onclick="setCategory\\('Home'\\)">\\s*<div class="nav-logo-text">OUR STORY<\\/div>\\s*<\\/div>/;
content = content.replace(logoFixRegex, \`<div class="nav-logo" onclick="setCategory('Home')">
        <img id="nav-logo-img" src="" width="111" style="cursor: pointer; position: relative; top: -5px;">
      </div>\`);
      
// Make sure createDashboard sets the src
const dashboardRegex = /function createDashboard\\(\\)\\s*\\{/;
content = content.replace(dashboardRegex, \`function createDashboard() {
  setTimeout(() => {
    const icon = document.querySelector('link[rel="icon"]');
    if(icon) {
      const img = document.getElementById('nav-logo-img');
      if(img) img.src = icon.href;
    }
  }, 0);\`);

// Fix playVideo wait Netflix animation. 
// "implement full-screen video player component that triggers after the initial Netflix animation finishes"
// Actually it's already there with id="fsyPlayer" and id="introPlayer" running. Let's make it look better.
const playbackOverlayStr = /<div class="playback-back" onclick="document.getElementById\\('playbackOverlay'\\).remove\\(\\); render\\(\\);"><\\/div>\\s*<video src="src\\/components\\/vidssave.com%20Netflix%20New%20Logo%20Animation%202019%201080p.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%;"><\\/video>\\s*<video src="\\$\\{url\\}" controls id="fsyPlayer" style="display:none; width:100%; height:100%; background:black;"><\\/video>/;

content = content.replace(playbackOverlayStr, \`<div class="playback-back" onclick="document.getElementById('playbackOverlay').remove(); render();">🡠</div>
    <video src="src/components/vidssave.com%20Netflix%20New%20Logo%20Animation%202019%201080p.mp4" playsinline autoplay id="introPlayer" style="object-fit:cover; width:100%; height:100%;"></video>
    <video src="\${url}" controls autoplay id="fsyPlayer" style="display:none; width:100%; height:100%; background:black;"></video>\`);

// Write back
fs.writeFileSync('script.js', content);

// Update CSS
let css = fs.readFileSync('style.css', 'utf8');

// "also on the profile page who is watching page add some red gradients"
// The profile page has class .profile-selection
css += \`
.profile-selection {
  background: radial-gradient(circle at center, rgba(229, 9, 20, 0.2) 0%, rgba(0,0,0,1) 70%);
}
\`;

// "You know that border is very bad looking"
// Replace the 4px solid transparent with just an outline on hover or simple scale to prevent layout shift
css = css.replace(/border: 4px solid transparent;/g, '');
css = css.replace(/border-color: #e5e5e5;/g, 'outline: 4px solid #e5e5e5; outline-offset: 4px;');

fs.writeFileSync('style.css', css);
console.log("Migrate 2 done.");
