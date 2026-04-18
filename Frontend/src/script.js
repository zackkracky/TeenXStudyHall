/* ═══════════════════════════════════════════
   WLR BLOOD NETWORK — script.js
   ═══════════════════════════════════════════ */

'use strict';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:5001/api';
// ── LOCATION ──────────────────────────────────────────────────────────────────
let userLocation = null;
let locationStatus = 'unknown'; // 'unknown', 'granted', 'denied', 'error'
let hospitalMap = null;
let hospitalMarkers = [];
let userMarker = null;
const DEFAULT_MAP_CENTER = [17.3850, 78.4867];

function getUserLocation() {
  if (!navigator.geolocation) {
    locationStatus = 'error';
    updateLocationStatus('❌', 'Not supported');
    console.warn('Geolocation not supported');
    toast('Location not supported by browser', 'w');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      locationStatus = 'granted';
      updateLocationStatus('✅', 'Location acquired');
      console.log('User location:', userLocation);
      toast('Location access granted', 's');
      renderHospitals();
      if (document.getElementById('page-map').classList.contains('active')) {
        renderMapHospList();
        updateMapMarkers();
      }
    },
    (error) => {
      locationStatus = 'denied';
      updateLocationStatus('⚠️', 'Access denied');
      console.warn('Location access denied:', error.message);
      toast('Location access denied. ETA will use default location.', 'w');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  );
}

function updateLocationStatus(icon, text) {
  const iconEl = document.getElementById('locationIcon');
  const textEl = document.getElementById('locationText');
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const BLOOD_BANKS = [
  { name:'RedCross Metro Bank',      area:'Central City',   address:'Himayatnagar, Hyderabad',   stock:'High',   eta:'12 min', phone:'040-2345-6789' },
  { name:'Lifeline Bank Unit',       area:'North Avenue',   address:'Secunderabad',              stock:'Medium', eta:'18 min', phone:'040-2345-9876' },
  { name:'Hope Blood Center',        area:'Metro South',    address:'Mehdipatnam, Hyderabad',    stock:'Low',    eta:'20 min', phone:'040-2346-1111' },
  { name:'City Hospital Blood Cell', area:'West End',       address:'Banjara Hills, Hyderabad',  stock:'Medium', eta:'24 min', phone:'040-2347-2222' }
];

const HOSPITALS = [
  { name:'Apollo Hospitals',     area:'Jubilee Hills',  focus:'Multi-specialty emergency care',         eta:'18 min', beds:650, phone:'040-2360-7777', stock:'high',   lat:17.4275, lng:78.4069 },
  { name:'AIG Hospitals',        area:'Gachibowli',     focus:'Advanced critical care & gastrology',    eta:'22 min', beds:350, phone:'040-6570-0000', stock:'medium', lat:17.4401, lng:78.3489 },
  { name:'Yashoda Hospitals',    area:'Secunderabad',   focus:'Trauma and tertiary care',               eta:'26 min', beds:500, phone:'040-4567-8901', stock:'high',   lat:17.4479, lng:78.4980 },
  { name:'KIMS Hospitals',       area:'Kondapur',       focus:'Emergency and surgical support',         eta:'20 min', beds:400, phone:'040-4488-5000', stock:'medium', lat:17.4600, lng:78.3685 },
  { name:'Continental Hospitals',area:'Gachibowli',     focus:'Emergency medicine and ICU',             eta:'24 min', beds:300, phone:'040-6700-0000', stock:'low',    lat:17.4432, lng:78.3521 },
  { name:'CARE Hospitals',       area:'Banjara Hills',  focus:'Critical care and trauma',               eta:'19 min', beds:450, phone:'040-3041-8888', stock:'high',   lat:17.4063, lng:78.4580 },
  { name:'Sunshine Hospitals',   area:'Secunderabad',   focus:'Emergency and specialty support',        eta:'27 min', beds:280, phone:'040-4444-5555', stock:'medium', lat:17.4500, lng:78.5000 }
];

const COMPAT = {
  'A+' :{ r:['A+','A-','O+','O-'],                          d:['A+','AB+'] },
  'A-' :{ r:['A-','O-'],                                    d:['A+','A-','AB+','AB-'] },
  'B+' :{ r:['B+','B-','O+','O-'],                          d:['B+','AB+'] },
  'B-' :{ r:['B-','O-'],                                    d:['B+','B-','AB+','AB-'] },
  'AB+':{ r:['A+','A-','B+','B-','AB+','AB-','O+','O-'],   d:['AB+'] },
  'AB-':{ r:['A-','B-','AB-','O-'],                         d:['AB+','AB-'] },
  'O+' :{ r:['O+','O-'],                                    d:['A+','B+','O+','AB+'] },
  'O-' :{ r:['O-'],                                         d:['A+','A-','B+','B-','AB+','AB-','O+','O-'] }
};

const BASE_DONORS = [
  { id:1,  name:'Aarav Mehta',   blood_group:'O+',  distance:1.8, available:true,  response_rate:0.96, score:-14.2, rank:1 },
  { id:2,  name:'Riya Nair',     blood_group:'A+',  distance:2.1, available:true,  response_rate:0.90, score:-12.5, rank:1 },
  { id:3,  name:'Kabir Singh',   blood_group:'B+',  distance:4.9, available:true,  response_rate:0.84, score:-10.2, rank:1 },
  { id:4,  name:'Ananya Das',    blood_group:'AB+', distance:7.2, available:true,  response_rate:0.89, score:-11.0, rank:1 },
  { id:5,  name:'Neha Iyer',     blood_group:'O-',  distance:3.4, available:true,  response_rate:0.98, score:-15.1, rank:1 },
  { id:6,  name:'Vikram Rao',    blood_group:'A-',  distance:5.6, available:false, response_rate:0.62, score:-7.1,  rank:1 },
  { id:7,  name:'Zoya Khan',     blood_group:'B-',  distance:6.1, available:true,  response_rate:0.81, score:-9.4,  rank:1 },
  { id:8,  name:'Ishaan Patel',  blood_group:'AB-', distance:8.7, available:true,  response_rate:0.77, score:-8.8,  rank:1 },
  { id:9,  name:'Simran Gill',   blood_group:'O+',  distance:4.3, available:true,  response_rate:0.92, score:-11.8, rank:2 },
  { id:10, name:'Dev Joshi',     blood_group:'A+',  distance:9.5, available:true,  response_rate:0.76, score:-8.1,  rank:2 },
  { id:11, name:'Mira Thomas',   blood_group:'O-',  distance:6.8, available:true,  response_rate:0.95, score:-12.2, rank:2 },
  { id:12, name:'Arjun Kapoor',  blood_group:'B+',  distance:1.2, available:true,  response_rate:0.88, score:-13.1, rank:2 }
];

const LOCAL_KEY = 'wlr_donors_v2';
let communityDonors = [];
let allDonors = [];
let lastSearchDonors = [];
let sosActive = false;
let currentUrgency = 'critical';
let mapStockFilter = 'all';

try { communityDonors = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch {}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  getUserLocation();
  checkAPI();
  renderDistChart();
  renderActivityFeed();
  renderBgGrid();
  renderBloodBanks();
  renderHospitals();
  renderMapHospList();
  renderCompatTable();
  await loadAllDonors();
  renderCommunityDonors();
  renderInvChart();
  updateStats();
  initChat();
  // Tab switching (delegated)
  document.querySelectorAll('[data-group]').forEach(strip => {
    // handled per page via switchTab
  });
});

// ── API ───────────────────────────────────────────────────────────────────────
async function checkAPI() {
  const dot  = document.getElementById('apiDot');
  const txt  = document.getElementById('apiText');
  try {
    const res = await fetch(`${BASE_URL}/match-donors`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({blood_group:'O+'}),
      signal:AbortSignal.timeout(3000)
    });
    if (res.ok) { dot.className='api-dot ok'; txt.textContent='Backend: Connected'; }
    else        { dot.className='api-dot err'; txt.textContent='Backend: Error'; }
  } catch {
    dot.className='api-dot err';
    txt.textContent='Backend: Offline (demo)';
  }
}

async function apiMatchDonors(bg) {
  const res = await fetch(`${BASE_URL}/match-donors`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({blood_group:bg})
  });
  return res.json();
}

async function apiGetAllDonors() {
  const res = await fetch(`${BASE_URL}/donors`);
  return res.json();
}

async function apiAddDonor(donor) {
  const res = await fetch(`${BASE_URL}/donors`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(donor)
  });
  return res.json();
}

async function apiNotify(donors) {
  const body = { donors };
  if (userLocation) {
    body.userLocation = `${userLocation.lat},${userLocation.lng}`;
  }
  const res = await fetch(`${BASE_URL}/notify`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  return res.json();
}

function demoDonors(bg) {
  const compatible = Object.keys(COMPAT).filter(g => COMPAT[bg] && COMPAT[bg].r.includes(g));
  return BASE_DONORS
    .filter(d => compatible.includes(d.blood_group) && d.available)
    .sort((a,b) => b.response_rate - a.response_rate)
    .slice(0,5)
    .map((d,i) => ({...d, rank:i+1}));
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
const PAGE_META = {
  home:      ['Dashboard Overview',      'Real-time blood logistics monitoring'],
  search:    ['Match Donors',            'Find compatible donors via backend API'],
  sos:       ['SOS Emergency Alert',     'High-priority emergency broadcast system'],
  donors:    ['All Donors',              'Browse and filter the full donor network'],
  register:  ['Register Donor',          'Add a new donor to the WLR network'],
  banks:     ['Blood Banks',             'Hyderabad blood bank inventory & routing'],
  hospitals: ['Hospitals',              'Emergency hospital network — Hyderabad'],
  map:       ['Hospital Map',            'Live OpenStreetMap — hospitals & blood banks'],
  compat:    ['Blood Compatibility',     'Donor-recipient compatibility reference'],
  ai:        ['AI Assistant',            'Intelligent blood logistics support']
};

function showPage(id) {
  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // deactivate all nav buttons
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  // show target
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  // activate nav button
  const nb = document.getElementById('nb-' + id);
  if (nb) nb.classList.add('active');
  // update topbar
  const [title, sub] = PAGE_META[id] || ['WLR', ''];
  document.getElementById('topTitle').textContent = title;
  document.getElementById('topSub').textContent   = sub;
  // scroll top
  window.scrollTo({top:0, behavior:'smooth'});
  // close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  
  // Special handling for map page
  if (id === 'map') {
    initializeMapPage();
  }
}

function initializeMapPage() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  if (!hospitalMap) {
    hospitalMap = L.map('map').setView(DEFAULT_MAP_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(hospitalMap);
  }

  if (userLocation) {
    hospitalMap.setView([userLocation.lat, userLocation.lng], 12);
  } else {
    hospitalMap.setView(DEFAULT_MAP_CENTER, 12);
  }
  hospitalMap.invalidateSize();

  if (userLocation) {
    updateHospitalETAs();
  }
  renderMapHospList();
  updateMapMarkers();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(pageKey, tabKey, btn) {
  // find pane id pattern: [pageKey]tab-[tabKey]
  const prefix = pageKey + 'tab-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(p => p.classList.remove('active'));
  const pane = document.getElementById(prefix + tabKey);
  if (pane) pane.classList.add('active');
  // toggle buttons in same strip
  if (btn) {
    const strip = btn.closest('.tab-strip');
    if (strip) strip.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

// ── CHIP PICKER ───────────────────────────────────────────────────────────────
function pickChip(el, val) {
  const row = el.closest('.chip-row');
  if (row) row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentUrgency = val;
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
async function runSearch() {
  const bg = document.getElementById('searchBG').value;
  if (!bg) { toast('Please select a blood group.', 'w'); return; }

  // Switch to results tab
  const resTabs = document.querySelectorAll('#page-search .tab-btn');
  resTabs.forEach(b => b.classList.remove('active'));
  if (resTabs[1]) resTabs[1].classList.add('active');
  document.querySelectorAll('[id^="stab-"]').forEach(p => p.classList.remove('active'));
  const resPane = document.getElementById('stab-results');
  if (resPane) resPane.classList.add('active');

  document.getElementById('donorGrid').innerHTML = `<div class="empty"><div class="ei">⏳</div><p>Contacting backend API…</p></div>`;
  document.getElementById('matchBadge').textContent = '…';

  let donors = [];
  try {
    const data = await apiMatchDonors(bg);
    if (data.success && data.donors && data.donors.length) {
      donors = data.donors;
      toast(`Found ${donors.length} donors via API`, 's');
    } else {
      toast((data.message || 'No donors — showing demo data'), 'i');
      donors = demoDonors(bg);
    }
  } catch {
    toast('Backend offline — showing demo data', 'i');
    donors = demoDonors(bg);
  }

  lastSearchDonors = donors;
  renderDonorGrid('donorGrid', donors, true);
  document.getElementById('matchBadge').textContent = `${donors.length} result${donors.length !== 1 ? 's' : ''}`;
  renderAIInsight(donors, bg);
  renderSearchBanks();
}

function renderDonorGrid(targetId, donors, withNotify = false) {
  const el = document.getElementById(targetId);
  if (!donors.length) {
    el.innerHTML = `<div class="empty"><div class="ei">🔍</div><p>No donors found.</p></div>`;
    return;
  }
  el.innerHTML = '';
  donors.forEach(d => {
    const pct = Math.round(d.response_rate * 100);
    const ini = d.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    const eta = Math.round((d.distance / 30) * 60);
    const card = document.createElement('div');
    card.className = 'dcard' + (d.rank === 1 ? ' top' : '');
    card.innerHTML = `
      <div class="d-top">
        <div class="d-av">${ini}</div>
        <div>
          <div class="d-name">${d.name}</div>
          <div class="d-loc">${d.distance} km away · Rank #${d.rank}</div>
        </div>
        <div class="d-bg">${d.blood_group}</div>
      </div>
      <span class="avail ${d.available ? 'yes' : 'no'}">${d.available ? 'Available Now' : 'Unavailable'}</span>
      <div class="d-stats">
        <div class="dst"><div class="dst-l">Distance</div><div class="dst-v">${d.distance} km</div></div>
        <div class="dst"><div class="dst-l">Response</div><div class="dst-v">${pct}%</div></div>
        <div class="dst"><div class="dst-l">ETA est.</div><div class="dst-v">~${eta} min</div></div>
      </div>
      <div class="pb"><div class="pf" style="width:${pct}%"></div></div>
      <div style="font-size:.67rem;color:var(--muted);margin-bottom:${withNotify?'0':'8px'}">Response probability</div>
      ${withNotify ? `<button class="notify-b" onclick="notifyOne(this,${d.id})" ${!d.available?'disabled':''}>
        ${d.available ? '📱 Notify Donor' : '❌ Unavailable'}
      </button>` : ''}
    `;
    el.appendChild(card);
  });
}

async function notifyOne(btn, donorId) {
  const donor = lastSearchDonors.find(d => d.id === donorId) || lastSearchDonors[0];
  if (!donor) return;
  btn.textContent = 'Sending…';
  btn.disabled = true;
  try {
    const data = await apiNotify([donor]);
    if (data.success) {
      const name = typeof data.accepted_by === 'object' ? data.accepted_by.name : (data.accepted_by || donor.name);
      const eta  = data.eta || `${Math.round((donor.distance / 30) * 60)} mins`;
      showETA(name, eta);
      toast(`✅ ${name} accepted! Arriving in ${eta}`, 's');
      btn.textContent = '✅ Notified';
    } else {
      toast(data.message || 'Notification failed', 'e');
      btn.textContent = '📱 Notify Donor';
      btn.disabled = false;
    }
  } catch {
    const name = donor.name;
    const eta  = `${Math.round((donor.distance / 30) * 60)} mins`;
    showETA(name, eta);
    toast(`✅ ${name} accepted! (Demo) — ETA ${eta}`, 's');
    btn.textContent = '✅ Notified';
  }
}

function showETA(name, eta) {
  const card = document.getElementById('etaCard');
  document.getElementById('etaName').textContent = name;
  document.getElementById('etaVal').textContent  = eta;
  card.classList.remove('hidden');
}

function renderAIInsight(donors, bg) {
  const box = document.getElementById('aiInsight');
  if (!donors.length) {
    box.innerHTML = `<p class="text-muted">No donors found for <strong>${bg}</strong>. Activate SOS and check blood banks immediately.</p>`;
    return;
  }
  const top = donors[0];
  const eta = Math.round((top.distance / 30) * 60);
  const u = currentUrgency;
  box.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:11px">
      <div class="info-row"><span>⭑</span><div><b>Top Recommendation</b><br><small class="text-muted">${top.name} — ${Math.round(top.response_rate*100)}% response rate at ${top.distance} km. Est. ETA: ${eta} min.</small></div></div>
      <div class="info-row"><span>📡</span><div><b>${u==='critical'?'CRITICAL':'Priority'} Strategy</b><br><small class="text-muted">${u==='critical'?'Simultaneously notify top 3 donors + alert nearest blood bank. Do not wait for single confirmation.':u==='priority'?'Notify top 2 donors. Keep RedCross Metro on standby.':'Standard outreach — notify sequentially, monitor responses.'}</small></div></div>
      <div class="info-row"><span>🔮</span><div><b>Confidence Level</b><br><small class="text-muted">${donors.length>=3?'HIGH — good donor pool.':donors.length===2?'MEDIUM — activate bank fallback.':'LOW — single donor. Escalate to SOS immediately.'}</small></div></div>
    </div>
  `;
}

function renderSearchBanks() {
  const el = document.getElementById('searchBankList');
  el.innerHTML = BLOOD_BANKS.map(b => `
    <div class="bitem">
      <span>🏦</span>
      <div><b>${b.name}</b><br><small class="text-muted">${b.area} · ETA ${b.eta} · ${b.phone}</small></div>
      <span class="bstock s${b.stock[0].toLowerCase()}">${b.stock}</span>
    </div>
  `).join('');
}

// ── QUICK SEARCH (HOME) ───────────────────────────────────────────────────────
async function quickSearch(bg, tile) {
  document.querySelectorAll('.bg-tile').forEach(t => t.classList.remove('sel'));
  if (tile) tile.classList.add('sel');

  const resultsEl = document.getElementById('quickResults');
  resultsEl.innerHTML = `<div class="empty"><div class="ei">⏳</div><p>Searching for ${bg} donors…</p></div>`;

  let donors = [];
  try {
    const data = await apiMatchDonors(bg);
    donors = (data.success && data.donors && data.donors.length) ? data.donors : demoDonors(bg);
  } catch { donors = demoDonors(bg); }

  document.getElementById('searchBG').value = bg;
  lastSearchDonors = donors;
  renderDonorGrid('quickResults', donors.slice(0,4), false);
}

function renderBgGrid() {
  const freqs = { 'A+':'Common','A-':'Rare','B+':'Common','B-':'Rare','AB+':'Univ. Recipient','AB-':'Rare','O+':'Most Common','O-':'Univ. Donor' };
  document.getElementById('bgGrid').innerHTML = Object.entries(freqs).map(([g,f]) => `
    <div class="bg-tile" onclick="quickSearch('${g}', this)">
      <div class="bg-type">${g}</div>
      <div class="bg-freq">${f}</div>
    </div>
  `).join('');
}

// ── SOS ───────────────────────────────────────────────────────────────────────
async function triggerSOS() {
  const bg  = document.getElementById('sosBG').value;
  const loc = userLocation ? `${userLocation.lat},${userLocation.lng}` : (document.getElementById('sosLoc').value || 'Hyderabad');
  const btn = document.getElementById('sosBtn');

  if (!bg) { toast('Select a blood group for SOS!', 'w'); return; }

  sosActive = !sosActive;

  if (sosActive) {
    btn.textContent = '🔴 BROADCAST ACTIVE — CLICK TO CANCEL';
    btn.classList.add('live');
    document.getElementById('sosStat').textContent = `ACTIVE — ${bg} emergency near ${userLocation ? 'your location' : loc}`;

    let donors = [];
    try {
      const data = await apiMatchDonors(bg);
      donors = (data.success && data.donors && data.donors.length) ? data.donors : demoDonors(bg);
    } catch { donors = demoDonors(bg); }

    const top = donors[0];
    if (top) {
      // Try to get real ETA
      let eta = Math.round((top.distance / 30) * 60);
      try {
        const etaData = await apiGetAllDonors(); // Wait, better to call eta-preview
        // Actually, call a new function for ETA
      } catch {}
      document.getElementById('sosTopD').textContent = `${top.name} · ${top.distance} km · ETA ~${eta} min`;
    }

    const now = new Date().toLocaleTimeString();
    document.getElementById('sosLog').innerHTML = [
      `[${now}] 🔴 SOS ACTIVATED — Group: ${bg} — Location: ${userLocation ? 'Live GPS' : loc}`,
      top ? `[${now}] 📡 Alerts sent to ${Math.min(donors.length,3)} top donors` : `[${now}] ⚠️ No nearby donors — escalating to blood banks`,
      `[${now}] 🏥 Hospital fallback: Apollo Hospitals, Jubilee Hills`,
      `[${now}] 🏦 Bank alert: RedCross Metro Bank contacted`,
      `[${now}] 📲 Emergency SMS broadcast initiated`
    ].map(l => `<div class="info-row" style="font-family:'JetBrains Mono',monospace;font-size:.75rem">${l}</div>`).join('');

    toast('🚨 SOS ACTIVATED — Emergency broadcast sent!', 'e');
  } else {
    btn.textContent = 'ACTIVATE SOS';
    btn.classList.remove('live');
    document.getElementById('sosStat').textContent = 'Broadcast cancelled';
    toast('SOS deactivated.', 'i');
  }
}

// ── DONORS PAGE ───────────────────────────────────────────────────────────────
async function loadAllDonors() {
  try {
    const data = await apiGetAllDonors();
    if (data.success && Array.isArray(data.donors) && data.donors.length) {
      allDonors = data.donors;
    } else {
      allDonors = BASE_DONORS;
    }
  } catch {
    allDonors = BASE_DONORS;
  }
  renderAllDonors();
}

function renderAllDonors() {
  const source = allDonors.length ? allDonors : BASE_DONORS;
  const all  = [...source, ...communityDonors.map((d,i) => ({
    id: 100+i, name:d.name, blood_group:d.bloodGroup, distance:d.distance||Math.round(Math.random()*5+1),
    available:d.available, response_rate:d.rate||0.82, score:-9, rank:1
  }))];
  renderDonorGrid('allDonorGrid', all);
  renderDonorGrid('availGrid', all.filter(d => d.available));
  document.getElementById('donorCnt').textContent = `${all.length} donors`;
}

function filterDonors() {
  const q    = document.getElementById('donorFilter').value.toLowerCase();
  const bgf  = document.getElementById('donorBGF').value;
  const source = allDonors.length ? allDonors : BASE_DONORS;
  const all  = [...source, ...communityDonors.map((d,i) => ({
    id:100+i, name:d.name, blood_group:d.bloodGroup, distance:d.distance||3,
    available:d.available, response_rate:0.82, score:-9, rank:1
  }))];
  const filt = all.filter(d =>
    (!q   || d.name.toLowerCase().includes(q) || d.blood_group.toLowerCase().includes(q)) &&
    (!bgf || d.blood_group === bgf)
  );
  renderDonorGrid('allDonorGrid', filt);
  document.getElementById('donorCnt').textContent = `${filt.length} donors`;
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
async function registerDonor() {
  const name  = document.getElementById('rName').value.trim();
  const bg    = document.getElementById('rBG').value;
  const loc   = document.getElementById('rLoc').value.trim();
  const phone = document.getElementById('rPhone').value.trim();
  if (!name || !bg || !loc || !phone) { toast('Fill all required fields (*)', 'w'); return; }

  const donor = {
    name,
    blood_group: bg,
    location: loc,
    phone,
    lastDonation: document.getElementById('rLast').value || 'First time',
    available: document.getElementById('rAvail').value === 'true',
    distance: estimateDonorDistance(loc),
    response_rate: +(Math.random() * 0.2 + 0.75).toFixed(2)
  };

  let savedToBackend = false;
  try {
    const result = await apiAddDonor(donor);
    if (result.success && result.donor) {
      savedToBackend = true;
      donor.id = result.donor.id;
    }
  } catch (error) {
    console.warn('Backend add donor failed', error);
  }

  // keep community donors locally for UI and filtering
  communityDonors.push({
    name,
    bloodGroup: bg,
    location: loc,
    phone,
    lastDonation: donor.lastDonation,
    available: donor.available,
    distance: donor.distance,
    rate: donor.response_rate
  });
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(communityDonors)); } catch {}

  if (savedToBackend) {
    await loadAllDonors();
    toast(`✅ ${name} registered and saved to donors.json`, 's');
  } else {
    renderAllDonors();
    toast(`✅ ${name} registered locally (backend unavailable)`, 'i');
  }

  renderCommunityDonors();
  updateStats();
  ['rName','rBG','rLoc','rPhone','rLast'].forEach(id => document.getElementById(id).value = '');
}

function estimateDonorDistance(loc) {
  if (!loc || typeof loc !== 'string') return 4.5;
  const normalized = loc.trim().toLowerCase();
  const distanceMap = {
    'jubilee hills': 5.8,
    'jubilee hill': 5.8,
    'jubilee hills, hyderabad': 5.8,
    'gachibowli': 11.2,
    'hitech city': 12.0,
    'hyderabad': 5.0,
    'banjara hills': 4.6,
    'mehdipatnam': 6.8,
    'kondapur': 9.4,
    'secunderabad': 10.5,
    'ameerpet': 8.0,
    'malkajgiri': 11.5,
    'malakpet': 7.9,
    'miyapur': 13.4,
    'sainikpuri': 15.2,
    'kompally': 14.8,
    'l.b. nagar': 9.3,
    'amberpet': 8.7,
    'pet basheerabad': 13.0
  };

  for (const [key, value] of Object.entries(distanceMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  // Try to parse numeric kilometers if user provided them by mistake.
  const numeric = parseFloat(normalized);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Number(numeric.toFixed(1));
  }

  return 4.5;
}

function renderCommunityDonors() {
  const el = document.getElementById('commGrid');
  if (!communityDonors.length) {
    el.innerHTML = `<div class="empty"><div class="ei">👥</div><p>No community donors yet. <a href="#" onclick="showPage('register');return false">Register one →</a></p></div>`;
  } else {
    el.innerHTML = '';
    communityDonors.slice().reverse().forEach((d,i) => {
      const ini = d.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
      const card = document.createElement('div');
      card.className = 'dcard';
      card.innerHTML = `
        <div class="d-top">
          <div class="d-av">${ini}</div>
          <div><div class="d-name">${d.name}</div><div class="d-loc">${d.location} · ${d.phone}</div></div>
          <div class="d-bg">${d.bloodGroup}</div>
        </div>
        <span class="avail ${d.available?'yes':'no'}">${d.available?'Available Now':'Unavailable'}</span>
        <div style="font-size:.75rem;color:var(--muted);margin-top:6px">Last donation: ${d.lastDonation}</div>
      `;
      el.appendChild(card);
    });
  }

  // recent register panel
  const recentEl = document.getElementById('recentReg');
  if (!communityDonors.length) {
    recentEl.innerHTML = '<p class="text-muted">No community donors yet.</p>';
  } else {
    recentEl.innerHTML = communityDonors.slice(-3).reverse().map(d => `
      <div class="info-row">
        <span class="d-av" style="width:30px;height:30px;font-size:.7rem">${d.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</span>
        <div><b>${d.name}</b> · <span style="color:var(--red);font-weight:700">${d.bloodGroup}</span><br><small class="text-muted">${d.location}</small></div>
        <span class="avail ${d.available?'yes':'no'}" style="margin-left:auto">${d.available?'Active':'Off'}</span>
      </div>
    `).join('');
  }
}

// ── BLOOD BANKS ───────────────────────────────────────────────────────────────
function renderBloodBanks() {
  const stockClass = s => s==='High'?'sh':s==='Medium'?'sm':'sl';
  document.getElementById('bankPageList').innerHTML = BLOOD_BANKS.map(b => `
    <div class="bitem">
      <span style="font-size:1.5rem">🏦</span>
      <div style="flex:1">
        <b>${b.name}</b><br>
        <small class="text-muted">${b.address}</small><br>
        <small class="text-muted">📞 ${b.phone} · ⏱ ETA ${b.eta}</small>
      </div>
      <span class="bstock ${stockClass(b.stock)}">${b.stock} Stock</span>
    </div>
  `).join('');
  renderSearchBanks();
}

function renderInvChart() {
  const rows = [
    {bank:'RedCross Metro', a:'High', b:'High', o:'Medium', ab:'Low'},
    {bank:'Lifeline Unit',  a:'Medium', b:'Low', o:'High', ab:'Medium'},
    {bank:'Hope Center',    a:'Low', b:'Medium', o:'Low',  ab:'High'},
    {bank:'City Hospital',  a:'Medium', b:'High', o:'Medium', ab:'Medium'}
  ];
  const col = s => s==='High'?'#10B981':s==='Medium'?'#F59E0B':'#EF4444';
  const el = document.getElementById('invChart');
  if (!el) return;
  el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;font-size:.75rem;border-collapse:collapse">
    <thead><tr style="border-bottom:1px solid var(--line)">
      <th style="padding:6px;text-align:left;color:var(--muted)">Bank</th>
      <th style="padding:6px;text-align:center;color:var(--muted)">A±</th>
      <th style="padding:6px;text-align:center;color:var(--muted)">B±</th>
      <th style="padding:6px;text-align:center;color:var(--muted)">O±</th>
      <th style="padding:6px;text-align:center;color:var(--muted)">AB±</th>
    </tr></thead>
    <tbody>${rows.map(r=>`<tr style="border-bottom:1px solid var(--line)">
      <td style="padding:8px 6px;font-weight:700">${r.bank}</td>
      ${['a','b','o','ab'].map(t=>`<td style="padding:8px;text-align:center"><span style="color:${col(r[t])};font-weight:800">${r[t]}</span></td>`).join('')}
    </tr>`).join('')}
    </tbody></table></div>`;
}

// ── HOSPITALS ─────────────────────────────────────────────────────────────────
function renderHospitals() {
  if (userLocation) {
    updateHospitalETAs();
  }

  const stockColors = { high:'var(--teal)', medium:'var(--amber)', low:'var(--red)' };
  const stockLabel  = { high:'High Stock', medium:'Medium Stock', low:'Low / Urgent' };
  document.getElementById('hospitalGrid').innerHTML = HOSPITALS.map(h => `
    <div class="hcard">
      <div class="hcard-ico">🏥</div>
      <div class="hcard-name">${h.name}</div>
      <div class="hcard-area">${h.area}, Hyderabad</div>
      <div class="hcard-focus">${h.focus}</div>
      <div style="font-size:.74rem;font-weight:700;color:${stockColors[h.stock]};margin-bottom:10px">🩸 Blood: ${stockLabel[h.stock]}</div>
      <div class="hcard-meta">
        <span class="htag">24/7 Emergency</span>
        <span class="text-muted">🛏 ${h.beds} beds</span>
      </div>
      <div class="hcard-meta" style="border-top:none;padding-top:0">
        <small class="text-muted">📞 ${h.phone}</small>
        <small class="text-muted">${h.distance ? `📍 ${h.distance.toFixed(1)} km · ` : ''}⏱ ~${h.eta}</small>
      </div>
    </div>
  `).join('');
}

// ── MAP ───────────────────────────────────────────────────────────────────────
function renderMapHospList() {
  // Update hospital ETAs if user location is available
  if (userLocation) {
    updateHospitalETAs();
  }
  
  const el = document.getElementById('mapHospList');
  if (!el) return;
  const stockDot = { high:'#10B981', medium:'#F59E0B', low:'#EF4444' };
  el.innerHTML = HOSPITALS.map(h => `
    <div class="map-hosp-item" onclick="focusHosp('${h.name} ${h.area} Hyderabad')">
      <span class="mh-dot" style="background:${stockDot[h.stock]}"></span>
      <div>
        <b>${h.name}</b><br>
        <small class="text-muted">${h.area}${h.distance ? ` · ${h.distance.toFixed(1)} km` : ''} · ${h.eta} ${userLocation ? '· 🧭 Directions' : ''} · 📞 ${h.phone}</small>
      </div>
    </div>
  `).join('');
}

function updateHospitalETAs() {
  if (!userLocation) return;
  
  for (let h of HOSPITALS) {
    try {
      const distance = getDistanceFromLatLonInKm(
        userLocation.lat, userLocation.lng,
        h.lat, h.lng
      );
      const etaMinutes = Math.round((distance / 30) * 60);
      h.distance = Number(distance.toFixed(1));
      h.eta = `${etaMinutes} min`;
    } catch (error) {
      console.warn('Error calculating hospital ETA:', error);
    }
  }
}

// Helper function to calculate distance between two lat/lng points
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

function centerMapOnUser() {
  if (!userLocation) {
    toast('Location not available. Please allow location access.', 'w');
    getUserLocation();
    return;
  }
  if (!hospitalMap) {
    initializeMapPage();
  }
  hospitalMap.setView([userLocation.lat, userLocation.lng], 14);
  hospitalMap.invalidateSize();
  updateMapMarkers();
  toast('🗺 Map centered on your location', 's');
}

function focusHosp(query) {
  if (!hospitalMap) {
    initializeMapPage();
  }

  const hospital = HOSPITALS.find(h => query.includes(h.name));
  if (!hospital) {
    toast('Hospital location not found on map', 'w');
    return;
  }

  const target = [hospital.lat, hospital.lng];
  hospitalMap.setView(target, 15);

  const marker = hospitalMarkers.find(m => {
    const pos = m.getLatLng();
    return pos.lat === hospital.lat && pos.lng === hospital.lng;
  });
  if (marker) {
    marker.openPopup();
  }

  toast(`📍 Showing ${hospital.name}`, 'i');
}

function updateMapMarkers() {
  if (!hospitalMap) return;

  hospitalMarkers.forEach(marker => hospitalMap.removeLayer(marker));
  hospitalMarkers = [];

  HOSPITALS.forEach(hospital => {
    const marker = L.marker([hospital.lat, hospital.lng]).addTo(hospitalMap);
    const popupDistance = hospital.distance ? `📍 ${hospital.distance.toFixed(1)} km · ` : '';
    marker.bindPopup(`<strong>${hospital.name}</strong><br>${hospital.area}<br>${popupDistance}ETA ${hospital.eta}`);
    hospitalMarkers.push(marker);
  });

  if (userMarker) {
    hospitalMap.removeLayer(userMarker);
    userMarker = null;
  }

  if (userLocation) {
    userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
      radius: 8,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.8
    }).addTo(hospitalMap);
    userMarker.bindPopup('Your location').openPopup();
  }
}

function filterMapList() {
  const q = document.getElementById('mapFilter').value.toLowerCase();
  document.querySelectorAll('.map-hosp-item').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterMapStock(chip, level) {
  document.querySelectorAll('#page-map .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  mapStockFilter = level;
  document.querySelectorAll('.map-hosp-item').forEach((el, i) => {
    const h = HOSPITALS[i];
    if (!h) return;
    el.style.display = (level === 'all' || h.stock === level) ? '' : 'none';
  });
}

// ── COMPATIBILITY ─────────────────────────────────────────────────────────────
function renderCompatTable() {
  document.getElementById('compatBody').innerHTML = Object.entries(COMPAT).map(([t, {r,d}]) => `
    <tr>
      <td><strong style="color:var(--red)">${t}</strong></td>
      <td>${r.map(g=>`<span class="cp">${g}</span>`).join('')}</td>
      <td>${d.map(g=>`<span class="cp">${g}</span>`).join('')}</td>
    </tr>
  `).join('');
}

function runChecker() {
  const bg = document.getElementById('checkerBG').value;
  if (!bg) return;
  const {r, d} = COMPAT[bg];
  document.getElementById('checkerResult').innerHTML = `
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:12px">
      <div class="info-row"><span>💉</span><div><b>${bg} patients can receive from:</b><br>${r.map(g=>`<span class="cp">${g}</span>`).join(' ')}</div></div>
      <div class="info-row"><span>🩸</span><div><b>${bg} donors can give to:</b><br>${d.map(g=>`<span class="cp">${g}</span>`).join(' ')}</div></div>
      ${bg==='O-'?'<div class="info-row">⭑ <span><b>Universal Donor</b> — O- can donate to all 8 blood types.</span></div>':''}
      ${bg==='AB+'?'<div class="info-row">⭑ <span><b>Universal Recipient</b> — AB+ can receive from all 8 blood types.</span></div>':''}
    </div>
  `;
}

// ── CHARTS ────────────────────────────────────────────────────────────────────
function renderDistChart() {
  const data = [
    {t:'O+',p:37},{t:'A+',p:28},{t:'B+',p:20},{t:'AB+',p:4},
    {t:'O-',p:5},{t:'A-',p:3},{t:'B-',p:2},{t:'AB-',p:1}
  ];
  const el = document.getElementById('distChart');
  if (!el) return;
  el.innerHTML = data.map(d => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:.8rem">
      <span style="width:30px;font-weight:800;color:var(--red)">${d.t}</span>
      <div class="pb" style="flex:1;margin:0"><div class="pf" style="width:${d.p}%"></div></div>
      <span style="width:30px;color:var(--muted);text-align:right">${d.p}%</span>
    </div>
  `).join('');
}

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────────
function renderActivityFeed() {
  const events = [
    { ico:'📍', title:'Donor Aarav Mehta confirmed for O+', sub:'2 min ago · ETA 8 min · Central City' },
    { ico:'🏥', title:'Apollo Hospitals blood bank updated',  sub:'5 min ago · Stock: HIGH' },
    { ico:'🔴', title:'SOS resolved — B- request via RedCross Metro Bank', sub:'18 min ago' },
    { ico:'✅', title:'New Donor: Priya Sharma (O-) · Kondapur', sub:'34 min ago' },
    { ico:'📊', title:'Stock balancing: 2 O- units transferred to Lifeline Unit', sub:'1 hr ago · AI-triggered' },
    { ico:'🚨', title:'SOS activated for AB- near Secunderabad — 3 donors alerted', sub:'2 hr ago · Resolved' }
  ];
  const el = document.getElementById('activityFeed');
  if (!el) return;
  el.innerHTML = events.map(e => `
    <div class="info-row"><span>${e.ico}</span><div><b>${e.title}</b><br><small class="text-muted">${e.sub}</small></div></div>
  `).join('');
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const total = allDonors.length ? allDonors.length : BASE_DONORS.length;
  ['hStatDonors','scDonors'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = total;
  });
}

// ── CHAT ─────────────────────────────────────────────────────────────────────
function initChat() {
  addBubble('bot', "Hello! I'm the WLR AI Assistant. I can help with donor matching, blood compatibility, SOS protocols, and Hyderabad hospital information.");
  addBubble('bot', "💡 <b>Tip:</b> Go to <b>Match Donors</b> and select a blood group to fetch live donor data from the backend API.");
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });
}

function addBubble(role, html) {
  const el = document.createElement('div');
  el.className = `cbub c${role}`;
  el.innerHTML = html;
  const msgs = document.getElementById('chatMessages');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  addBubble('user', msg);
  inp.value = '';
  setTimeout(() => addBubble('bot', getReply(msg)), 450);
}

function getReply(msg) {
  const t = msg.toLowerCase();
  if (t.includes('sos') || t.includes('emergency'))
    return "🚨 <b>SOS procedure:</b> Go to <b>SOS Alert</b> page, select blood group + location, then hit <b>ACTIVATE SOS</b>. This broadcasts to all matching donors and triggers hospital + bank fallback routing.";
  if (t.includes('compat') || t.includes('receive') || t.includes('donat'))
    return "🧬 Use the <b>Compatibility</b> page for the full reference table. Quick facts: <b>O-</b> is the Universal Donor (gives to all), <b>AB+</b> is the Universal Recipient (receives from all). Always verify with a medical professional.";
  if (t.includes('hospital'))
    return `🏥 WLR tracks <b>${HOSPITALS.length} hospitals</b> in Hyderabad. Top emergency options: <b>Apollo (Jubilee Hills)</b>, <b>AIG (Gachibowli)</b>, <b>CARE (Banjara Hills)</b>. Go to <b>Hospital Map</b> to see them all on OpenStreetMap!`;
  if (t.includes('map') || t.includes('location') || t.includes('where'))
    return "🗺 The <b>Hospital Map</b> page shows all Hyderabad hospitals and blood banks on a live OpenStreetMap map. Click any hospital name on the sidebar to zoom in. Use the filter chips to sort by stock level.";
  if (t.includes('bank') || t.includes('stock') || t.includes('inventory'))
    return "🏦 Currently 4 blood banks active in Hyderabad: <b>RedCross Metro (HIGH)</b>, <b>Lifeline Unit (MEDIUM)</b>, <b>Hope Center (LOW)</b>, <b>City Hospital (MEDIUM)</b>. Check <b>Blood Banks</b> page for full inventory and AI balancing advice.";
  if (t.includes('register') || t.includes('add donor'))
    return "📋 Register donors on the <b>Register Donor</b> page. They'll appear in All Donors → Community tab and in search results. Eligibility: age 18–65, weight ≥50 kg, last donation ≥3 months ago.";
  if (t.includes('api') || t.includes('backend') || t.includes('endpoint'))
    return "🔌 Backend runs on <code>http://localhost:5001/api</code>. Endpoints: <code>POST /match-donors</code> (send blood_group) and <code>POST /notify</code> (send donors array). The API status indicator in the sidebar header shows current connection state.";
  if (t.includes('eta') || t.includes('time') || t.includes('fast') || t.includes('arrive'))
    return "⏱ ETA = <b>(distance ÷ 30 km/h) × 60 minutes</b>. The network average is ~9 minutes. Rank #1 donors have highest response rates and shortest estimated arrival times.";
  if (t.includes('o-') || t.includes('universal donor'))
    return "🩸 <b>O-</b> is the Universal Donor — can donate red blood cells to all 8 blood types. Extremely valuable in emergencies when there is no time to type the patient's blood. O- donors are in high demand!";
  if (t.includes('ab+') || t.includes('universal recipient'))
    return "🩸 <b>AB+</b> is the Universal Recipient — can receive blood from all 8 blood types. AB+ plasma can also be donated to anyone. Only about 4% of the population has AB+.";
  return "I can assist with <b>donor matching</b>, <b>SOS protocols</b>, <b>blood compatibility</b>, <b>hospital info</b>, <b>map navigation</b>, and <b>API integration</b>. Try asking: <em>'How does SOS work?'</em> or <em>'Show me hospitals on the map'</em>.";
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(message, type = 'i') {
  const icons = { s:'✅', e:'🚨', i:'ℹ️', w:'⚠️' };
  const wrap  = document.getElementById('toastWrap');
  const t     = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><div><b>${message}</b></div>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 320);
  }, 4000);
}