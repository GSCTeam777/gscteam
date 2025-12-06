// ================= CONFIGURATION =================
// V5.6: เปลี่ยนลิงก์รูปภาพ Default ตรงนี้ได้เลย
const DEFAULT_BANNER_URL = "https://placehold.co/1000x450/111/fff?text=ลงโฆษณาติดต่อ+GSCTeam";
const TWITCH_CHANNEL = "gsc2thousand"; 

const DEFAULT_URL_1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmsbwRF5DYAiFdqmHdJqG2SPmbletX-svkLeeSsJCfqxTKeQXom6qn1zk0SjdZ5OFf5pQu5_kGJ5l6/pub?output=csv";
const DEFAULT_URL_2 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSk4P1wvTbAruJMLyrsAqdlCPxEer_1nRM8ueXtQQjDJRsGi5ykHhYbq3cjL_Qq900Ayk6zljFRfHVH/pub?gid=107360258&single=true&output=csv";
const IGNORE_HEADERS = ["ประทับเวลา", "ชื่อ-นามสกุล", "สโลแกน", "สุดท้ายนี้"];
const ADMIN_DB = { "admin": "1234", "master": "2024", "editor": "5555" };
const PROXY = "https://api.codetabs.com/v1/proxy?quest=";
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

let appContent = { groups: [], persons: [], originals: [] };
let homeItems = []; 
let imageDB = [];
let socialLinks = [];
let currentMode = 'bar';
let quill;
let currentSlide = 0;
let slideInterval;

document.addEventListener('DOMContentLoaded', () => {
    initQuill();
    loadContent();
    loadHomeContent();
    loadTwitch();
    loadYTLive(); // V5.8
    loadImageDB();
    loadSocialLinks();
    loadVoteData();
    checkAdminSession();
    checkVoteStatus();
});

function initQuill() {
    quill = new Quill('#editor', {
        theme: 'snow', placeholder: 'เขียนเนื้อหา...',
        modules: { toolbar: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], ['link', 'image', 'video'], ['clean']] }
    });
}

// --- V5.8 YouTube Live Logic ---
function loadYTLive() {
    const container = document.getElementById('ytLiveSection');
    const status = localStorage.getItem('v58_yt_live_status') || 'hide';
    const liveID = localStorage.getItem('v58_yt_live_id') || '';

    if(status === 'hide' || !liveID) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        let embedUrl = "";
        // Helper to get ID if full URL pasted
        let id = liveID;
        if(liveID.includes('youtube.com') || liveID.includes('youtu.be')) {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = liveID.match(regExp);
            if (match && match[2].length === 11) id = match[2];
        }
        embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`; // Autoplay muted
        const iframe = document.getElementById('yt-live-embed');
        if(iframe.src !== embedUrl) {
            iframe.src = embedUrl;
        }
    }
}

// --- Twitch Logic ---
function loadTwitch() {
    const container = document.getElementById('twitchSection');
    const status = localStorage.getItem('v57_twitch_status') || 'show';
    if(status === 'hide') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        const hostname = window.location.hostname; 
        const channel = TWITCH_CHANNEL;
        const url = `https://player.twitch.tv/?channel=${channel}&parent=${hostname}&muted=false`;
        const iframe = document.getElementById('twitch-embed');
        if(!iframe.src || iframe.src === 'about:blank') { iframe.src = url; }
    }
}

// --- Home Page Logic ---
function loadHomeContent() { homeItems = JSON.parse(localStorage.getItem('v54_home_content') || '[]'); renderHome(); }
function renderHome() {
    const sliderContainer = document.getElementById('homeSlider');
    const track = document.getElementById('sliderTrack');
    const dotsContainer = document.getElementById('sliderDots');
    const youtubeContainer = document.getElementById('homeYoutube');
    
    track.innerHTML = ''; dotsContainer.innerHTML = ''; youtubeContainer.innerHTML = '';
    const banners = homeItems.filter(i => i.type === 'banner');
    const videos = homeItems.filter(i => i.type === 'youtube');
    
    // Banner Logic
    let displayBanners = banners.length === 0 ? [{ type: 'banner', value: DEFAULT_BANNER_URL, isDefault: true }] : banners;
    sliderContainer.style.display = 'block';
    
    displayBanners.forEach((item, index) => {
        const realIndex = item.isDefault ? -1 : homeItems.findIndex(x => x === item);
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        
        // V5.8: Delete Button (Secure: Has admin-controls class)
        let deleteBtnHTML = !item.isDefault ? `<button class="slide-delete-btn admin-controls" onclick="deleteHomeItem(${realIndex})"><i class="fa-solid fa-trash"></i> ลบภาพนี้</button>` : '';
        
        slide.innerHTML = `<img src="${item.value}">${deleteBtnHTML}`;
        track.appendChild(slide);
        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => moveToSlide(index);
        dotsContainer.appendChild(dot);
    });
    
    const controls = sliderContainer.querySelectorAll('.carousel-btn');
    controls.forEach(btn => btn.style.display = displayBanners.length > 1 ? 'block' : 'none');
    initSlider(displayBanners.length);

    // YouTube List Logic
    videos.forEach((item) => {
        const realIndex = homeItems.findIndex(x => x === item);
        const div = document.createElement('div');
        div.className = 'youtube-item';
        div.innerHTML = `<iframe src="${item.value}" allowfullscreen></iframe><button class="youtube-delete-btn admin-controls" onclick="deleteHomeItem(${realIndex})"><i class="fa-solid fa-trash"></i> ลบ</button>`;
        youtubeContainer.appendChild(div);
    });
    
    // V5.8: Re-check admin session to show/hide delete buttons
    checkAdminSession();
}

// Slider Functions
function initSlider(total) {
    if(slideInterval) clearInterval(slideInterval);
    currentSlide = 0; updateSliderPosition();
    if(total > 1) { slideInterval = setInterval(() => moveSlide(1), 5000); }
}
function moveSlide(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    if(slides.length === 0) return;
    currentSlide = (currentSlide + direction + slides.length) % slides.length;
    updateSliderPosition();
}
function moveToSlide(index) { currentSlide = index; updateSliderPosition(); }
function updateSliderPosition() {
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('.dot');
    if(dots.length === 0) return;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, idx) => { dot.className = `dot ${idx === currentSlide ? 'active' : ''}`; });
}

// Add/Delete Home Content
function openAddHomeModal() { document.getElementById('addHomeModal').style.display = 'flex'; toggleHomeInput(); }
function toggleHomeInput() {
    const type = document.getElementById('homeContentType').value;
    const hint = document.getElementById('homeHint');
    const input = document.getElementById('homeContentValue');
    if(type === 'banner') { hint.innerText = "ใส่ URL ของรูปภาพ (JPG/PNG)"; input.placeholder = "URL รูปภาพ"; } 
    else { hint.innerText = "ใส่ลิงก์ YouTube (คลิป หรือ Playlist)"; input.placeholder = "https://www.youtube.com/watch?v=..."; }
}
function addHomeContent() {
    const type = document.getElementById('homeContentType').value;
    let value = document.getElementById('homeContentValue').value.trim();
    if(!value) return alert("กรุณาใส่ข้อมูล");
    if(type === 'youtube') {
        let embedUrl = "";
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const listRegExp = /[?&]list=([^#&?]+)/;
        const match = value.match(regExp); const listMatch = value.match(listRegExp);
        if (listMatch) embedUrl = `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}&origin=${window.location.origin}`;
        else if (match && match[2].length === 11) embedUrl = `https://www.youtube.com/embed/${match[2]}?origin=${window.location.origin}`;
        else if (value.includes('/shorts/')) embedUrl = `https://www.youtube.com/embed/${value.split('/shorts/')[1].split('?')[0]}?origin=${window.location.origin}`;
        else return alert("ลิงก์ YouTube ไม่ถูกต้อง");
        value = embedUrl;
    }
    homeItems.push({ type, value });
    localStorage.setItem('v54_home_content', JSON.stringify(homeItems));
    renderHome();
    document.getElementById('addHomeModal').style.display = 'none'; document.getElementById('homeContentValue').value = '';
}
function deleteHomeItem(index) { if(confirm("ลบเนื้อหานี้?")) { homeItems.splice(index, 1); localStorage.setItem('v54_home_content', JSON.stringify(homeItems)); renderHome(); } }

// --- Vote & Data Logic ---
function checkVoteStatus() {
    const status = localStorage.getItem('v52_vote_status') || 'open';
    const reason = localStorage.getItem('v52_vote_reason') || 'ปิดปรับปรุงชั่วคราว';
    const area = document.getElementById('voteContentArea');
    const banner = document.getElementById('closedBanner');
    if (status === 'closed') { area.style.display = 'none'; banner.style.display = 'block'; document.getElementById('closedReasonDisplay').innerText = reason; } 
    else { area.style.display = 'block'; banner.style.display = 'none'; }
}
async function loadVoteData() {
    const url1 = localStorage.getItem('v49_url1') || DEFAULT_URL_1;
    const url2 = localStorage.getItem('v49_url2') || DEFAULT_URL_2;
    try { const [d1, d2] = await Promise.all([fetchCSV(url1), fetchCSV(url2)]); const allData = [...d1, ...d2]; if(allData.length === 0) throw new Error("ไม่พบข้อมูล CSV"); processData(allData); document.getElementById('loader').style.display = 'none'; document.getElementById('totalCount').style.display = 'inline-block'; } 
    catch (err) { document.getElementById('loader').style.display = 'none'; document.getElementById('errorDisplay').style.display = 'block'; document.getElementById('errorMsg').innerText = err.message; }
}
async function fetchCSV(url) { if(!url) return []; let target = url.trim().replace('/pubhtml', '/pub?output=csv'); try { const res = await fetch(target); if(res.ok) return parseCSV(await res.text()); } catch(e) {} try { const res = await fetch(PROXY + encodeURIComponent(target)); if(res.ok) return parseCSV(await res.text()); } catch(e) {} return []; }
function parseCSV(txt) { if(!txt || txt.trim().startsWith('<')) return []; return Papa.parse(txt, { header: true, skipEmptyLines: true }).data; }
function processData(data) {
    const summary = {};
    data.forEach(row => {
        Object.keys(row).forEach(header => {
            const h = header.trim();
            if(IGNORE_HEADERS.some(ign => h.includes(ign))) return;
            if(row[header]) { if(!summary[h]) summary[h] = {}; row[header].split(',').forEach(val => { const name = val.trim().replace(/\s+/g, ' '); if(name) summary[h][name] = (summary[h][name] || 0) + 1; }); }
        });
    });
    renderVoteResults(summary, data.length);
}
function renderVoteResults(summary, total) {
    const box = document.getElementById('resultContent'); box.innerHTML = ''; document.getElementById('totalCount').innerText = total.toLocaleString(); document.getElementById('timestamp').innerText = `อัปเดต: ${new Date().toLocaleTimeString('th-TH')}`;
    Object.keys(summary).forEach((cat, idx) => {
        const sorted = Object.entries(summary[cat]).sort((a,b) => b[1] - a[1]);
        let rank1HTML = '';
        if (sorted.length > 0) {
            const winnerName = sorted[0][0];
            let imgUrl = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
            const dbMatch = imageDB.find(x => x.key === winnerName) || imageDB.find(x => x.key === cat);
            if(dbMatch) imgUrl = dbMatch.val;
            else { const contentMatch = [...appContent.groups, ...appContent.persons, ...appContent.originals].find(x => x.name === winnerName); if(contentMatch) imgUrl = contentMatch.img; }
            rank1HTML = `<div class="rank-1-container"><img src="${imgUrl}" class="winner-avatar"><div class="winner-info"><h4><i class="fa-solid fa-crown" style="color:var(--gold)"></i> อันดับ 1: ${winnerName}</h4><p>${sorted[0][1]} โหวต (${((sorted[0][1]/total)*100).toFixed(1)}%)</p></div></div>`;
        }
        const section = document.createElement('div'); section.className = 'card vote-category';
        section.innerHTML = `<h3>${cat}</h3>${rank1HTML}<div id="bar-${idx}" class="view-bar" style="display:block">${sorted.map(([n, s]) => {const p = ((s/total)*100).toFixed(1);const c = s===sorted[0][1] ? 'var(--success)' : (p>50?'var(--primary)':'#555');return `<div class="bar-row"><div class="bar-info"><span>${n}</span><span style="color:${c}; font-weight:bold;">${s} (${p}%)</span></div><div class="progress-bg"><div class="progress-bar" style="width:${p}%; background:${c};"></div></div></div>`;}).join('')}</div><div id="pie-${idx}" class="view-pie" style="display:none; height:300px;"><canvas id="canvas-${idx}"></canvas></div>`;
        box.appendChild(section); setTimeout(() => buildPie(`canvas-${idx}`, sorted, total), 100);
    });
    updateView();
}
function buildPie(id, data, total) { const ctx = document.getElementById(id); if(!ctx) return; let final = data.length > 6 ? [...data.slice(0,5), ["อื่นๆ", data.slice(5).reduce((a,b)=>a+b[1],0)]] : data; new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: final.map(x=>x[0]), datasets: [{ data: final.map(x=>x[1]), backgroundColor: COLORS, borderColor: '#1c1f26' }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'right', labels:{color:'#ccc'}}, datalabels:{color:'#fff', formatter:(v)=>((v/total)*100).toFixed(1)>2?((v/total)*100).toFixed(1)+'%':''} } } }); }

// ================= CMS & DB =================
function loadContent() { const stored = localStorage.getItem('v50_content'); appContent = stored ? JSON.parse(stored) : { groups:[], persons:[], originals:[] }; renderGrid('groups', 'container-groups'); renderGrid('persons', 'container-persons'); renderGrid('originals', 'container-originals'); }
function renderGrid(type, id) {
    const div = document.getElementById(id); div.innerHTML = '';
    const items = appContent[type];
    items.forEach(item => {
        if (type === 'groups') {
            const article = document.createElement('div'); article.className = 'article-card';
            article.innerHTML = `<div class="article-edit-btn admin-controls"><button class="btn-icon btn-edit" onclick="openEditModal('${type}', ${item.id})"><i class="fa-solid fa-pen"></i></button><button class="btn-icon btn-delete" onclick="deleteItem('${type}', ${item.id})"><i class="fa-solid fa-trash"></i></button></div><div class="article-header"><img src="${item.img || 'https://via.placeholder.com/800x400'}" onerror="this.src='https://via.placeholder.com/800x400'"><div class="article-header-overlay"><h2 class="article-title-large">${item.name}</h2></div></div><div class="article-body">${item.desc}</div>`;
            div.appendChild(article);
        } else {
            const tempDiv = document.createElement("div"); tempDiv.innerHTML = item.desc; const plainText = tempDiv.textContent || tempDiv.innerText || "";
            const card = document.createElement('div'); card.className = 'profile-card'; card.setAttribute('onclick', `openReader('${type}', ${item.id})`);
            card.innerHTML = `<div class="edit-overlay admin-controls" onclick="event.stopPropagation()"><button class="btn-icon btn-edit" onclick="openEditModal('${type}', ${item.id})"><i class="fa-solid fa-pen"></i></button><button class="btn-icon btn-delete" onclick="deleteItem('${type}', ${item.id})"><i class="fa-solid fa-trash"></i></button></div><img src="${item.img}" class="profile-img" onerror="this.src='https://via.placeholder.com/300'"><div class="profile-content"><div class="profile-title">${item.name}</div><div class="profile-desc-preview">${plainText}</div><span style="color:var(--primary); font-size:0.8rem; margin-top:auto;">อ่านเพิ่มเติม <i class="fa-solid fa-arrow-right"></i></span></div>`;
            div.appendChild(card);
        }
    });
    checkAdminSession();
}

function loadImageDB() { imageDB = JSON.parse(localStorage.getItem('v49_img_db') || '[]'); renderDbTable(); }
function renderDbTable() { document.getElementById('dbTableBody').innerHTML = imageDB.map((item, i) => `<tr><td>${item.key}</td><td><a href="${item.val}" target="_blank" style="color:var(--primary);">ลิงก์</a></td><td><button onclick="editDbImage(${i})" style="color:var(--gold); border:none; background:none; cursor:pointer;"><i class="fa-solid fa-pen"></i></button><button onclick="removeDbImage(${i})" style="color:var(--danger); border:none; background:none; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); }
function saveDbImage() { const key = document.getElementById('dbKey').value.trim(); const val = document.getElementById('dbVal').value.trim(); const idx = parseInt(document.getElementById('dbEditIdx').value); if(key && val) { if(idx >= 0) imageDB[idx] = { key, val }; else imageDB.push({ key, val }); localStorage.setItem('v49_img_db', JSON.stringify(imageDB)); renderDbTable(); cancelDbEdit(); } }
function editDbImage(i) { const item = imageDB[i]; document.getElementById('dbKey').value = item.key; document.getElementById('dbVal').value = item.val; document.getElementById('dbEditIdx').value = i; document.getElementById('btnSaveDb').innerText = '💾 บันทึก'; document.getElementById('btnCancelDb').style.display = 'inline-block'; }
function cancelDbEdit() { document.getElementById('dbKey').value=''; document.getElementById('dbVal').value=''; document.getElementById('dbEditIdx').value='-1'; document.getElementById('btnSaveDb').innerText='➕ เพิ่ม/บันทึก'; document.getElementById('btnCancelDb').style.display='none'; }
function removeDbImage(i) { if(confirm("ลบ?")) { imageDB.splice(i, 1); localStorage.setItem('v49_img_db', JSON.stringify(imageDB)); renderDbTable(); } }

function loadSocialLinks() { socialLinks = JSON.parse(localStorage.getItem('v53_social_links') || '[]'); renderSocialLinks(); }
function renderSocialLinks() { document.getElementById('socialLinksContainer').innerHTML = socialLinks.map(l => `<a href="${l.url}" target="_blank" class="social-btn"><i class="fa-solid fa-link"></i> ${l.label}</a>`).join(''); document.getElementById('socialAdminList').innerHTML = socialLinks.map((l, i) => `<div style="background:#222; padding:5px 10px; border-radius:5px; border:1px solid #444; font-size:0.85rem;"><i class="fa-solid fa-link"></i> ${l.label} <i class="fa-solid fa-times" style="color:var(--danger); cursor:pointer;" onclick="deleteSocialLink(${i})"></i></div>`).join(''); }
function addSocialLink() { const label = document.getElementById('socialLabel').value.trim(); const url = document.getElementById('socialUrl').value.trim(); if(label && url) { socialLinks.push({ label, url }); localStorage.setItem('v53_social_links', JSON.stringify(socialLinks)); renderSocialLinks(); document.getElementById('socialLabel').value=''; document.getElementById('socialUrl').value=''; } }
function deleteSocialLink(i) { if(confirm('ลบลิงก์นี้?')) { socialLinks.splice(i, 1); localStorage.setItem('v53_social_links', JSON.stringify(socialLinks)); renderSocialLinks(); } }

function openReader(type, id) { const item = appContent[type].find(x => x.id === id); if(!item) return; document.getElementById('readerTitle').innerText = item.name; document.getElementById('readerImg').src = item.img; document.getElementById('readerImg').style.display = item.img?'block':'none'; document.getElementById('readerBody').innerHTML = item.desc; document.getElementById('readerModal').style.display = 'flex'; }
function closeReader() { document.getElementById('readerModal').style.display = 'none'; }
function openEditModal(type, id=null) { document.getElementById('editModal').style.display='flex'; document.getElementById('editType').value = type; if(id) { const item = appContent[type].find(x=>x.id===id); document.getElementById('editId').value=item.id; document.getElementById('inputName').value=item.name; document.getElementById('inputImg').value=item.img; quill.root.innerHTML=item.desc; } else { document.getElementById('editId').value=''; document.getElementById('inputName').value=''; document.getElementById('inputImg').value=''; quill.root.innerHTML=''; } }
function saveEditItem() { const type = document.getElementById('editType').value; const id = document.getElementById('editId').value; const name = document.getElementById('inputName').value; const img = document.getElementById('inputImg').value; const desc = quill.root.innerHTML; if(!name) return alert("ใส่หัวข้อ"); if(id) { const idx = appContent[type].findIndex(x=>x.id==id); if(idx!==-1) appContent[type][idx]={...appContent[type][idx], name, desc, img}; } else { appContent[type].push({id:Date.now(), name, desc, img}); } localStorage.setItem('v50_content', JSON.stringify(appContent)); renderGrid(type, 'container-'+type); document.getElementById('editModal').style.display='none'; }
function deleteItem(type, id) { if(confirm("ลบ?")) { appContent[type]=appContent[type].filter(x=>x.id!=id); localStorage.setItem('v50_content', JSON.stringify(appContent)); renderGrid(type, 'container-'+type); } }

function openLogin() { document.getElementById('loginModal').style.display='flex'; }
function closeLogin() { document.getElementById('loginModal').style.display='none'; }
function checkLogin() { const u = document.getElementById('username').value; const p = document.getElementById('password').value; if(ADMIN_DB[u] && ADMIN_DB[u] === p) { localStorage.setItem('v49_admin', u); checkAdminSession(); closeLogin(); } else { alert("รหัสผ่านผิด!"); } }
function checkAdminSession() {
    const u = localStorage.getItem('v49_admin'); const panel = document.getElementById('adminPanel');
    if(u) { 
        panel.style.display='block'; 
        document.getElementById('adminNameDisplay').innerText = u; 
        document.querySelectorAll('.admin-controls').forEach(e=>e.classList.add('show')); 
        
        // Populate Configs
        document.getElementById('adminUrl1').value = localStorage.getItem('v49_url1') || DEFAULT_URL_1; 
        document.getElementById('adminUrl2').value = localStorage.getItem('v49_url2') || DEFAULT_URL_2; 
        document.getElementById('adminVoteStatus').value = localStorage.getItem('v52_vote_status') || 'open'; 
        document.getElementById('adminVoteReason').value = localStorage.getItem('v52_vote_reason') || ''; 
        document.getElementById('adminTwitchStatus').value = localStorage.getItem('v57_twitch_status') || 'show';
        document.getElementById('adminYTLiveStatus').value = localStorage.getItem('v58_yt_live_status') || 'hide'; // V5.8
        document.getElementById('adminYTLiveID').value = localStorage.getItem('v58_yt_live_id') || ''; // V5.8
    } 
    else { 
        panel.style.display='none'; 
        document.querySelectorAll('.admin-controls').forEach(e=>e.classList.remove('show')); 
    }
}
function saveAdminConfig() { 
    localStorage.setItem('v49_url1', document.getElementById('adminUrl1').value.trim()); 
    localStorage.setItem('v49_url2', document.getElementById('adminUrl2').value.trim()); 
    localStorage.setItem('v52_vote_status', document.getElementById('adminVoteStatus').value); 
    localStorage.setItem('v52_vote_reason', document.getElementById('adminVoteReason').value.trim());
    localStorage.setItem('v57_twitch_status', document.getElementById('adminTwitchStatus').value);
    // V5.8 Save YT Live
    localStorage.setItem('v58_yt_live_status', document.getElementById('adminYTLiveStatus').value);
    localStorage.setItem('v58_yt_live_id', document.getElementById('adminYTLiveID').value.trim());
    alert("บันทึกแล้ว"); location.reload(); 
}
function adminLogout() { localStorage.removeItem('v49_admin'); checkAdminSession(); }

function navTo(page) {
    document.querySelectorAll('.page-section').forEach(e=>e.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const map = { 'landing':0, 'home':1, 'group':2, 'person':3, 'original':4, 'about':5 };
    if(map[page] !== undefined) document.querySelectorAll('.nav-btn')[map[page]].classList.add('active');
    document.getElementById('btnToggleChart').style.display = page==='home' ? 'flex' : 'none';
}
function toggleView() { currentMode = currentMode === 'bar' ? 'pie' : 'bar'; updateView(); }
function updateView() { document.querySelectorAll('.view-bar').forEach(e=>e.style.display = currentMode==='bar'?'block':'none'); document.querySelectorAll('.view-pie').forEach(e=>e.style.display = currentMode==='pie'?'block':'none'); document.getElementById('btnToggleChart').innerHTML = currentMode==='bar'?'<i class="fa-solid fa-chart-pie"></i>':'<i class="fa-solid fa-chart-bar"></i>'; }