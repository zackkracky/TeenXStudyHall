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
  { name:'Indian Red Cross Blood Bank', area:'Himayatnagar',   address:'Himayatnagar, Hyderabad',   stock:'High',   eta:'12 min', phone:'040-2345-6789' },
  { name:'Lifeline Blood Bank',         area:'Secunderabad',   address:'Secunderabad, Hyderabad',   stock:'Medium', eta:'18 min', phone:'040-2345-9876' },
  { name:'Hope Blood Bank',             area:'Mehdipatnam',    address:'Mehdipatnam, Hyderabad',    stock:'Low',    eta:'20 min', phone:'040-2346-1111' },
  { name:'Global Hospital Blood Bank',  area:'Banjara Hills',  address:'Banjara Hills, Hyderabad',  stock:'Medium', eta:'24 min', phone:'040-2347-2222' },
  { name:'Osmania General Hospital Blood Bank', area:'Afzal Gunj', address:'Afzal Gunj, Hyderabad', stock:'High',   eta:'15 min', phone:'040-2460-0123' },
  { name:'NIMS Blood Bank',             area:'Punjagutta',     address:'Punjagutta, Hyderabad',     stock:'Medium', eta:'22 min', phone:'040-2348-3333' },
  { name:'Gandhi Hospital Blood Bank',  area:'Musheerabad',    address:'Musheerabad, Hyderabad',    stock:'Low',    eta:'25 min', phone:'040-2750-5555' },
  { name:'Kamineni Blood Bank',         area:'LB Nagar',       address:'LB Nagar, Hyderabad',       stock:'High',   eta:'28 min', phone:'040-2402-4444' }
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

const HYDERABAD_AREAS = [
  'Abids', 'Adarsh Nagar', 'Aghapura', 'Ameerpet', 'Aminpur', 'Anand Nagar', 'Asif Nagar', 'Attapur', 'Azamabad',
  'Bachupally', 'Bagh Amberpet', 'Bagh Lingampally', 'Bahadurpura', 'Bala Nagar', 'Balapur', 'Bandlaguda', 'Banjara Hills',
  'Barkatpura', 'Basheerbagh', 'Begum Bazaar', 'Begumpet', 'Bharat Nagar', 'BHEL', 'Bholakpur', 'Bolarum', 'Borabanda',
  'Bowenpally', 'Chaderghat', 'Chaitanyapuri', 'Chandrayangutta', 'Charminar', 'Chikkadpally', 'Chintal', 'Dabeerpura',
  'Dabirpura', 'Dammaiguda', 'Dilsukhnagar', 'Domalguda', 'ECIL', 'Erragadda', 'Falaknuma', 'Fateh Nagar', 'Film Nagar',
  'Gachibowli', 'Gandipet', 'Golconda', 'Goshamahal', 'Gulzar Houz', 'Habsiguda', 'Hafeezpet', 'Hasthinapuram', 'Hayathnagar',
  'Himayatnagar', 'HITEC City', 'Hussain Sagar', 'Hyderguda', 'Ibrahimpatnam', 'Jambagh', 'Jangammet', 'Jeedimetla',
  'Jubilee Hills', 'Kachiguda', 'Karkhana', 'Karwan', 'Kavadiguda', 'Khairatabad', 'Kokapet', 'Kompally', 'Kondapur',
  'Kothapet', 'Koti', 'KPHB', 'Kukatpally', 'LB Nagar', 'Lakdi-ka-pul', 'Lal Darwaza', 'Langar Houz', 'Lingampally', 'Madinaguda',
  'Madhapur', 'Mahankali', 'Maheshwaram', 'Malakpet', 'Mallapur', 'Manikonda', 'Marredpally', 'Masab Tank', 'Medchal',
  'Mehdipatnam', 'Mettuguda', 'Miyapur', 'Moghalpura', 'Moosapet', 'Moosarambagh', 'Moti Nagar', 'Moula Ali', 'Musheerabad',
  'Nacharam', 'Nagole', 'Nallakunta', 'Nampally', 'Nanakramguda', 'Narayanguda', 'Neredmet', 'Nizampet', 'Old City',
  'Osmania University', 'Padmarao Nagar', 'Panjagutta', 'Paradise', 'Patancheru', 'Patny', 'Pernambut', 'Picket',
  'Pragathi Nagar', 'Punjagutta', 'Qutbullapur', 'Rajendra Nagar', 'Ramachandrapuram', 'Ramanthapur', 'Ramgopalpet',
  'Ramnagar', 'Rasoolpura', 'Red Hills', 'Rethibowli', 'RTC X Roads', 'Safilguda', 'Saidabad', 'Sainikpuri',
  'Salar Jung Museum', 'Sanath Nagar', 'Sangareddy', 'Sanjeeva Reddy Nagar', 'Santosh Nagar', 'Saroor Nagar', 'Secunderabad',
  'Serilingampally', 'Shadnagar', 'Shamshabad', 'Shankarpally', 'Shapurnagar', 'Shivarampally', 'Siddipet', 'Sindhi Colony',
  'Sitaphalmandi', 'Somajiguda', 'Srinagar Colony', 'Sultan Bazaar', 'Tarnaka', 'Tilak Nagar', 'Toli Chowki', 'Trimulgherry',
  'Uppal', 'Vanasthalipuram', 'Venkatapuram', 'Vidyanagar', 'Vijay Nagar Colony', 'Vikrampuri', 'Warangal', 'West Marredpally',
  'Yakutpura', 'Yousufguda', 'Alwal', 'Amberpet', 'Ashok Nagar', 'Balanagar', 'Chintalakunta', 'Dullapally', 'Gajularamaram',
  'Jawaharlal Nehru Technological University', 'Keesara', 'Kollur', 'Malkajgiri', 'Medipally', 'Peerzadiguda', 'Rajendranagar',
  'Shamirpet', 'Turkayamjal', 'Uppuguda', 'Vattinagulapally', 'Yerragunta', 'A.C. Guards', 'Afzal Gunj', 'Aliabad', 'Amber Nagar',
  'Anantagiri', 'Anantaram', 'Appa Junction', 'Badangpet', 'Beeramguda', 'Bhanur', 'Bibinagar', 'Boduppal', 'Bowrampet',
  'Chandanagar', 'Cherlapally', 'Chilakalguda', 'Chintapally', 'Dargah Hussain Shah Wali', 'Dhoolpet', 'Dundigal', 'Gandimaisamma',
  'Ghatkesar', 'Gurramguda', 'Hakimpet', 'Hitech City', 'Hyderabad Central University', 'IDA Bollaram', 'Isnapur', 'Jaggamguda',
  'Jawahar Nagar', 'Kadthal', 'Kandukur', 'Kapra', 'Karmanghat', 'Keshavagiri', 'Kismatpur', 'Kollapuri', 'Korremula',
  'Kothur', 'Kowkur', 'Kuntloor', 'Lothkunta', 'Macha Bollaram', 'Malkaram', 'Manchal', 'Mangalpally', 'Manneguda',
  'Maripeda', 'Meerpet', 'Moinabad', 'Mudchintanapalli', 'Munganoor', 'Nagaram', 'Nandigama', 'Narapally', 'Narsingi',
  'Neelbatur', 'Nizampet', 'Osman Nagar', 'Pargi', 'Parvathapur', 'Pedda Amberpet', 'Pedda Golkonda', 'Pochampally',
  'Pudur', 'Puppalaguda', 'Rajapet', 'Rallaguda', 'Rampally', 'Rangareddy', 'Ravulapally', 'Rayadurg', 'Sadasivpet',
  'Safilguda', 'Saidabad', 'Sajjad Nagar', 'Saroornagar', 'Satamrai', 'Satyam Nagar', 'Serilingampally', 'Shabad',
  'Shahabad', 'Shaikpet', 'Shankarpally', 'Shivampet', 'Siddipet', 'Srisailam Highway', 'Suchitra', 'Sultanpur', 'Tandur',
  'Tellapur', 'Thimmapur', 'Thumkunta', 'Tukkuguda', 'Turkayamzal', 'Umdanagar', 'Venkatadri Township', 'Vijayapuri',
  'Wanaparthy', 'Yacharam', 'Yadagirigutta', 'Yellareddyguda', 'Yenegal Khurd', 'Zahirabad'
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
  initLocationDropdown();
  initSearchLocationDropdown();
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
  const prefixMap = {
    home: 'htab-',
    search: 'stab-',
    donors: 'dtab-',
    banks: 'btab-',
    hosps: 'hstab-'
  };
  const prefix = prefixMap[pageKey] || pageKey + 'tab-';
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
      <div class="info-row"><span>📡</span><div><b>${u==='critical'?'CRITICAL':'Priority'} Strategy</b><br><small class="text-muted">${u==='critical'?'Simultaneously notify top 3 donors + alert nearest blood bank. Do not wait for single confirmation.':u==='priority'?'Notify top 2 donors. Keep Indian Red Cross on standby.':'Standard outreach — notify sequentially, monitor responses.'}</small></div></div>
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
      `[${now}] 🏦 Bank alert: Indian Red Cross Blood Bank contacted`,
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
  renderDonorGrid('availGrid', all.filter(d => d.available === true || d.available === 'true'));
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
  renderDonorGrid('availGrid', filt.filter(d => d.available === true || d.available === 'true'));
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
    {bank:'Indian Red Cross', a:'High', b:'High', o:'Medium', ab:'Low'},
    {bank:'Lifeline Blood Bank',  a:'Medium', b:'Low', o:'High', ab:'Medium'},
    {bank:'Hope Blood Bank',    a:'Low', b:'Medium', o:'Low',  ab:'High'},
    {bank:'Global Hospital',  a:'Medium', b:'High', o:'Medium', ab:'Medium'}
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
// ── COMPATIBILITY ─────────────────────────────────────────────────────────────
function renderCompatTable() {
  // Clickable rows + bold type badge
  document.getElementById('compatBody').innerHTML = Object.entries(COMPAT).map(([t, {r,d}]) => `
    <tr class="compat-row" onclick="selectCompatBG('${t}')" title="Click to check ${t}">
      <td><strong class="compat-type-badge">${t}</strong></td>
      <td>${r.map(g=>`<span class="cp">${g}</span>`).join('')}</td>
      <td>${d.map(g=>`<span class="cp">${g}</span>`).join('')}</td>
    </tr>
  `).join('');

  // 8 blood group picker buttons
  const picker = document.getElementById('compatBgPicker');
  if (picker) {
    picker.innerHTML = Object.keys(COMPAT).map(g => {
      const safeId = g.replace('+','p').replace('-','m');
      return `<button class="compat-bg-btn" id="cbtn-${safeId}" onclick="selectCompatBG('${g}')">${g}</button>`;
    }).join('');
  }
}

function selectCompatBG(bg) {
  // Highlight selected button
  document.querySelectorAll('.compat-bg-btn').forEach(b => b.classList.remove('active'));
  const safeId = 'cbtn-' + bg.replace('+','p').replace('-','m');
  const btn = document.getElementById(safeId);
  if (btn) btn.classList.add('active');

  // Highlight selected table row
  document.querySelectorAll('.compat-row').forEach(r => r.classList.remove('compat-row-active'));
  document.querySelectorAll('.compat-row').forEach(r => {
    if (r.querySelector('.compat-type-badge')?.textContent === bg)
      r.classList.add('compat-row-active');
  });

  runChecker(bg);
}

function runChecker(bg) {
  if (!bg || !COMPAT[bg]) return;
  const {r, d} = COMPAT[bg];

  document.getElementById('checkerResult').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
      <div class="compat-result-row">
        <span class="compat-result-icon">💉</span>
        <div>
          <div style="font-weight:700;margin-bottom:6px">${bg} patients can receive from:</div>
          <div>${r.map(g=>`<span class="cp">${g}</span>`).join(' ')}</div>
        </div>
      </div>
      <div class="compat-result-row">
        <span class="compat-result-icon">🩸</span>
        <div>
          <div style="font-weight:700;margin-bottom:6px">${bg} donors can give to:</div>
          <div>${d.map(g=>`<span class="cp">${g}</span>`).join(' ')}</div>
        </div>
      </div>
      ${bg==='O-' ? `<div class="compat-special">⭑ <b>Universal Donor</b> — O- can donate to all 8 blood types. Always in critical demand.</div>` : ''}
      ${bg==='AB+' ? `<div class="compat-special">⭑ <b>Universal Recipient</b> — AB+ can receive from all 8 blood types.</div>` : ''}
      ${bg==='O+' ? `<div class="compat-special">ℹ️ <b>Most Common</b> — ~37% of population. High demand, good donor pool.</div>` : ''}
    </div>
  `;

  // Show network availability using YOUR blood bank data
  renderCompatNetwork(bg);

  // Show WREN AI medical explanation
  loadCompatAI(bg);
}

function renderCompatNetwork(bg) {
  const card = document.getElementById('compatNetCard');
  const body = document.getElementById('compatNetBody');
  if (!card || !body) return;
  card.style.display = 'block';

  const mainType = bg.replace('+','').replace('-','');

  // Use YOUR BLOOD_BANKS array
  const bankRows = BLOOD_BANKS.map(b => {
    const col = b.stock==='High' ? 'var(--teal)' : b.stock==='Medium' ? 'var(--amber)' : 'var(--red)';
    const bg2 = b.stock==='High' ? 'var(--teal-soft)' : b.stock==='Medium' ? 'var(--amber-soft)' : 'var(--red-soft)';
    return `<div class="compat-net-row">
      <span>🏦 <b>${b.name}</b> <small style="color:var(--muted)">${b.area}</small></span>
      <span style="background:${bg2};color:${col};padding:3px 10px;border-radius:99px;font-size:.7rem;font-weight:800">${b.stock}</span>
    </div>`;
  }).join('');

  // Use YOUR HOSPITALS array
  const hospRows = HOSPITALS.filter(h => h.stock === 'high').slice(0,3).map(h =>
    `<div class="compat-net-row">
      <span>🏥 <b>${h.name}</b> <small style="color:var(--muted)">${h.area}</small></span>
      <span style="background:var(--teal-soft);color:var(--teal);padding:3px 10px;border-radius:99px;font-size:.7rem;font-weight:800">High Stock</span>
    </div>`
  ).join('');

  body.innerHTML = `
    <p class="text-muted" style="margin-bottom:12px;font-size:.8rem">Where to find <b>${bg}</b>-compatible blood right now:</p>
    ${bankRows}
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
      <div style="font-size:.72rem;color:var(--muted);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Hospitals with High Stock</div>
      ${hospRows || '<div class="text-muted">No hospitals with high stock currently.</div>'}
    </div>
  `;
}

async function loadCompatAI(bg) {
  const card  = document.getElementById('compatAiCard');
  const body  = document.getElementById('compatAiBody');
  const badge = document.getElementById('compatAiBadge');
  if (!card || !body) return;

  card.style.display = 'block';
  badge.textContent  = 'Loading…';
  body.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
    <div class="typing-dots"><span></span><span></span><span></span></div>
    <span class="text-muted">WREN is explaining the medical science…</span>
  </div>`;

  try {
    const apiKey = sessionStorage.getItem('wlr_claude_key');
    if (!apiKey) {
      body.innerHTML = `<span class="text-muted">Enter your API key in the AI Assistant page first, then come back here.</span>`;
      badge.textContent = '⚠️';
      return;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-allow-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role:'user', content:
          `You are WREN, a medical AI on a blood logistics platform for Hyderabad hospitals.

The user selected blood type ${bg}. In 3-4 short sentences explain:
1. WHY ${bg} has these compatibility rules (ABO antigens, Rh factor biology)
2. One practical emergency tip specific to ${bg}
3. How common ${bg} is in the Indian population (give a percentage)

Use **bold** for key terms. Be concise and medically accurate. Under 90 words.`
        }]
      })
    });

    const data  = await res.json();
    const reply = data.content?.[0]?.text || 'No response.';

    // Use your existing formatAIReply if available, else basic formatting
    const formatted = typeof formatAIReply === 'function'
      ? formatAIReply(reply)
      : reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');

    body.innerHTML  = `<div style="font-size:.84rem;line-height:1.65">${formatted}</div>`;
    badge.textContent = '✅ WREN';
  } catch(err) {
    body.innerHTML  = `<span class="text-muted">AI explanation unavailable: ${err.message}</span>`;
    badge.textContent = '⚠️';
  }
}

// ── LOCATION DROPDOWN ──────────────────────────────────────────────────────────
function initLocationDropdown() {
  const input = document.getElementById('rLoc');
  const dropdown = document.getElementById('locationDropdown');

  // Show dropdown on click
  input.addEventListener('click', () => {
    const query = input.value.toLowerCase().trim();
    if (query.length >= 1) {
      const matches = HYDERABAD_AREAS.filter(area =>
        area.toLowerCase().startsWith(query)
      ).slice(0, 8);
      if (matches.length > 0) {
        dropdown.innerHTML = matches.map(area =>
          `<div class="dropdown-item" onclick="selectLocation('${area}')">${area}</div>`
        ).join('');
        dropdown.style.display = 'block';
      }
    } else {
      // Show all locations when clicked and empty
      const allMatches = HYDERABAD_AREAS.slice(0, 8);
      dropdown.innerHTML = allMatches.map(area =>
        `<div class="dropdown-item" onclick="selectLocation('${area}')">${area}</div>`
      ).join('');
      dropdown.style.display = 'block';
    }
  });

  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 1) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = HYDERABAD_AREAS.filter(area =>
      area.toLowerCase().startsWith(query)
    ).slice(0, 8); // Limit to 8 results

    if (matches.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = matches.map(area =>
      `<div class="dropdown-item" onclick="selectLocation('${area}')">${area}</div>`
    ).join('');
    dropdown.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    // Delay hiding to allow click on dropdown items
    setTimeout(() => {
      dropdown.style.display = 'none';
    }, 150);
  });

  input.addEventListener('focus', () => {
    const query = input.value.toLowerCase().trim();
    if (query.length >= 1) {
      const matches = HYDERABAD_AREAS.filter(area =>
        area.toLowerCase().startsWith(query)
      ).slice(0, 8);
      if (matches.length > 0) {
        dropdown.innerHTML = matches.map(area =>
          `<div class="dropdown-item" onclick="selectLocation('${area}')">${area}</div>`
        ).join('');
        dropdown.style.display = 'block';
      }
    } else {
      // Show all locations when input is focused but empty
      const allMatches = HYDERABAD_AREAS.slice(0, 8);
      dropdown.innerHTML = allMatches.map(area =>
        `<div class="dropdown-item" onclick="selectLocation('${area}')">${area}</div>`
      ).join('');
      dropdown.style.display = 'block';
    }
  });
}

function selectLocation(area) {
  document.getElementById('rLoc').value = area;
  document.getElementById('locationDropdown').style.display = 'none';
}

function initSearchLocationDropdown() {
  const input = document.getElementById('searchLoc');
  const dropdown = document.getElementById('searchLocationDropdown');

  // Show dropdown on click
  input.addEventListener('click', () => {
    const query = input.value.toLowerCase().trim();
    if (query.length >= 1) {
      const matches = HYDERABAD_AREAS.filter(area =>
        area.toLowerCase().startsWith(query)
      ).slice(0, 8);
      if (matches.length > 0) {
        dropdown.innerHTML = matches.map(area =>
          `<div class="dropdown-item" onclick="selectSearchLocation('${area}')">${area}</div>`
        ).join('');
        dropdown.style.display = 'block';
      }
    } else {
      // Show all locations when clicked and empty
      const allMatches = HYDERABAD_AREAS.slice(0, 8);
      dropdown.innerHTML = allMatches.map(area =>
        `<div class="dropdown-item" onclick="selectSearchLocation('${area}')">${area}</div>`
      ).join('');
      dropdown.style.display = 'block';
    }
  });

  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 1) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = HYDERABAD_AREAS.filter(area =>
      area.toLowerCase().startsWith(query)
    ).slice(0, 8); // Limit to 8 results

    if (matches.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = matches.map(area =>
      `<div class="dropdown-item" onclick="selectSearchLocation('${area}')">${area}</div>`
    ).join('');
    dropdown.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    // Delay hiding to allow click on dropdown items
    setTimeout(() => {
      dropdown.style.display = 'none';
    }, 150);
  });

  input.addEventListener('focus', () => {
    const query = input.value.toLowerCase().trim();
    if (query.length >= 1) {
      const matches = HYDERABAD_AREAS.filter(area =>
        area.toLowerCase().startsWith(query)
      ).slice(0, 8);
      if (matches.length > 0) {
        dropdown.innerHTML = matches.map(area =>
          `<div class="dropdown-item" onclick="selectSearchLocation('${area}')">${area}</div>`
        ).join('');
        dropdown.style.display = 'block';
      }
    } else {
      // Show all locations when input is focused but empty
      const allMatches = HYDERABAD_AREAS.slice(0, 8);
      dropdown.innerHTML = allMatches.map(area =>
        `<div class="dropdown-item" onclick="selectSearchLocation('${area}')">${area}</div>`
      ).join('');
      dropdown.style.display = 'block';
    }
  });
}

function selectSearchLocation(area) {
  document.getElementById('searchLoc').value = area;
  document.getElementById('searchLocationDropdown').style.display = 'none';
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
    { ico:'🔴', title:'SOS resolved — B- request via Indian Red Cross Blood Bank', sub:'18 min ago' },
    { ico:'✅', title:'New Donor: Priya Sharma (O-) · Kondapur', sub:'34 min ago' },
    { ico:'📊', title:'Stock balancing: 2 O- units transferred to Lifeline Blood Bank', sub:'1 hr ago · AI-triggered' },
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
  addBubble('bot', "👋 <b>Welcome to WLR Blood Network!</b><br><br>I'm your intelligent AI assistant for emergency blood logistics in Hyderabad. I can help you navigate the platform, understand blood compatibility, activate SOS alerts, and find donors quickly.");
  addBubble('bot', "💡 <b>Getting Started:</b><br>• <b>Match Donors</b> - Find compatible donors via live API<br>• <b>SOS Alert</b> - Emergency broadcast system<br>• <b>All Donors</b> - Browse available donors<br>• <b>Hospital Map</b> - Live Google Maps integration<br><br>What would you like to explore?");
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });

  // Initialize character with default state
  updateCharacterState('waving');

  // Add random blinking for more lifelike behavior
  setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance every 3-8 seconds
      updateCharacterState('blinking');
    }
  }, 3000 + Math.random() * 5000);
}

function addBubble(role, html) {
  const el = document.createElement('div');
  el.className = `cbub c${role}`;
  el.innerHTML = html;
  const msgs = document.getElementById('chatMessages');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;

  // Character reactions based on message type
  if (role === 'bot') {
    updateCharacterState('talking');
    setTimeout(() => updateCharacterState('happy'), 1000);
  }
}

function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  addBubble('user', msg);
  inp.value = '';

  // Character reacts to user input
  updateCharacterState('thinking');

  setTimeout(() => {
    const reply = getReply(msg);
    addBubble('bot', reply);
    updateCharacterState('talking');
  }, 800 + Math.random() * 400); // Random delay for more natural feel
}

function updateCharacterState(state) {
  const character = document.getElementById('aiCharacter');
  if (!character) return;

  // Remove all previous states
  character.classList.remove('character-thinking', 'character-happy', 'character-talking', 'character-waving', 'character-blinking');

  // Add new state
  if (state) {
    character.classList.add(`character-${state}`);
  }

  // Auto-remove temporary states after animation
  if (state === 'talking' || state === 'thinking') {
    setTimeout(() => {
      character.classList.remove(`character-${state}`);
    }, 2000);
  }

  if (state === 'happy') {
    setTimeout(() => {
      character.classList.remove(`character-${state}`);
    }, 1000);
  }
}

function getReply(msg) {
  const t = msg.toLowerCase();

  if (t.includes('hello') || t.includes('hi') || t.includes('hey') || t.includes('start'))
    return "👋 <b>Welcome to WLR Blood Network!</b> I'm your AI assistant for intelligent blood logistics in Hyderabad. I can help you with donor matching, emergency protocols, compatibility questions, and navigating our platform. What would you like to know?";

  if (t.includes('sos') || t.includes('emergency') || t.includes('urgent')) {
    updateCharacterState('waving');
    return "🚨 <b>SOS Emergency Protocol:</b><br><br>• Go to <b>SOS Alert</b> tab in the sidebar<br>• Select the required blood group and location<br>• Click <b>ACTIVATE SOS</b> to broadcast to all compatible donors<br>• System automatically alerts hospitals and blood banks as fallback<br>• Real-time tracking shows donor responses and ETAs<br><br><b>Pro tip:</b> SOS notifications go to donors within 10km first, then expand outward.";
  }

  if (t.includes('donor') && (t.includes('find') || t.includes('search') || t.includes('match'))) {
    updateCharacterState('happy');
    return "🔍 <b>Finding Donors:</b><br><br>• Use <b>Match Donors</b> page for API-powered search<br>• Enter blood group to find compatible donors<br>• Results show distance, response rate, and ETA<br>• <b>Available Now</b> tab shows only currently available donors<br>• Click <b>📱 Notify Donor</b> to contact them directly<br><br><b>AI Insight:</b> Top-ranked donors have highest response rates and shortest arrival times.";
  }

  if (t.includes('register') || t.includes('add') || t.includes('new donor')) {
    updateCharacterState('waving');
    return "📋 <b>Registering a Donor:</b><br><br>• Go to <b>Register Donor</b> tab<br>• Fill in: Name, Blood Group, Location, Phone<br>• Location dropdown shows 200+ Hyderabad areas<br>• Set availability status and last donation date<br>• Registered donors appear in community list and search results<br><br><b>Requirements:</b> Age 18-65, weight ≥50kg, 3+ months since last donation.";
  }

  if (t.includes('compat') || t.includes('compatibility') || t.includes('receive') || t.includes('donate') || t.includes('blood type'))
    return "🧬 <b>Blood Compatibility Guide:</b><br><br>• Visit <b>Compatibility</b> page for full reference table<br>• <b>O- (Universal Donor):</b> Can donate to ALL blood types<br>• <b>AB+ (Universal Recipient):</b> Can receive from ALL blood types<br>• Interactive checker shows who can receive from/donate to specific types<br><br><b>Critical:</b> Always verify compatibility with medical professionals. This is for informational purposes only.";

  if (t.includes('hospital') || t.includes('clinic') || t.includes('medical'))
    return `🏥 <b>Hyderabad Hospital Network:</b><br><br>• <b>${HOSPITALS.length} hospitals</b> tracked in real-time<br>• <b>Top Emergency Centers:</b><br>&nbsp;&nbsp;• Apollo Hospitals (Jubilee Hills) - Multi-specialty<br>&nbsp;&nbsp;• AIG Hospitals (Gachibowli) - Critical care<br>&nbsp;&nbsp;• CARE Hospitals (Banjara Hills) - Trauma<br>&nbsp;&nbsp;• Yashoda Hospitals (Secunderabad) - Tertiary care<br><br>• <b>Hospital Map</b> page shows live locations with stock levels<br>• Filter by stock status (High/Medium/Low)`;

  if (t.includes('map') || t.includes('location') || t.includes('where') || t.includes('find hospital'))
    return "🗺 <b>Hospital Map Features:</b><br><br>• Interactive maps with all Hyderabad hospitals<br>• Sidebar shows hospital list with stock levels<br>• Click hospital names to zoom and center on location<br>• Filter chips: All, High Stock (🟢), Medium (🟡), Low (🔴)<br>• Quick-focus buttons for major hospitals<br>• Stock indicators: Green=High, Yellow=Medium, Red=Low/Critical<br><br><b>Navigation:</b> Use the map to plan routes and check real-time availability.";

  if (t.includes('bank') || t.includes('stock') || t.includes('inventory') || t.includes('supply'))
    return "🏦 <b>Blood Bank Network:</b><br><br>• <b>8 active blood banks</b> in Hyderabad:<br>&nbsp;&nbsp;• <b>Indian Red Cross Blood Bank</b> (Himayatnagar) - HIGH stock<br>&nbsp;&nbsp;• <b>Lifeline Blood Bank</b> (Secunderabad) - MEDIUM stock<br>&nbsp;&nbsp;• <b>Hope Blood Bank</b> (Mehdipatnam) - LOW stock<br>&nbsp;&nbsp;• <b>Global Hospital Blood Bank</b> (Banjara Hills) - MEDIUM stock<br>&nbsp;&nbsp;• <b>Osmania General Hospital Blood Bank</b> (Afzal Gunj) - HIGH stock<br>&nbsp;&nbsp;• <b>NIMS Blood Bank</b> (Punjagutta) - MEDIUM stock<br>&nbsp;&nbsp;• <b>Gandhi Hospital Blood Bank</b> (Musheerabad) - LOW stock<br>&nbsp;&nbsp;• <b>Kamineni Blood Bank</b> (LB Nagar) - HIGH stock<br><br>• <b>AI Balancing</b> tab shows transfer recommendations<br>• Real-time stock monitoring prevents shortages<br>• Emergency routing falls back to banks when donors unavailable";

  if (t.includes('eta') || t.includes('time') || t.includes('arrive') || t.includes('fast'))
    return "⏱ <b>ETA & Response Times:</b><br><br>• <b>Calculation:</b> (Distance ÷ 30 km/h) × 60 minutes<br>• <b>Network Average:</b> ~9 minutes response time<br>• <b>Rank #1 Donors:</b> Highest response rates (85%+)<br>• <b>Factors:</b> Traffic, donor availability, response rate<br>• <b>Real-time:</b> ETAs update as donors confirm/decline<br><br><b>AI Optimization:</b> System prioritizes closest, most reliable donors.";

  if (t.includes('api') || t.includes('backend') || t.includes('endpoint') || t.includes('technical'))
    return "🔌 <b>Technical Architecture:</b><br><br>• <b>Backend:</b> Node.js + Express on port 5001<br>• <b>API Endpoints:</b><br>&nbsp;&nbsp;• <code>POST /api/match-donors</code> - Find compatible donors<br>&nbsp;&nbsp;• <code>POST /api/notify</code> - Send notifications<br>&nbsp;&nbsp;• <code>GET /api/donors</code> - Get all donors<br>• <b>Data:</b> JSON file storage with real-time updates<br>• <b>Status:</b> Check sidebar indicator for connection<br><br><b>Demo Mode:</b> Works offline with sample data.";

  if (t.includes('available') || t.includes('now') || t.includes('current'))
    return "✅ <b>Available Donors:</b><br><br>• <b>All Donors → Available Now</b> tab shows only active donors<br>• Availability status set during registration<br>• Real-time updates as donors change status<br>• SOS alerts only go to available donors<br>• Community donors show registration status<br><br><b>Tip:</b> Check this tab for immediate blood needs.";

  if (t.includes('o-') || t.includes('universal donor') || t.includes('rare'))
    return "🩸 <b>O- (Universal Donor):</b><br><br>• Can donate red blood cells to <b>ALL 8 blood types</b><br>• Only 5% of population has O- blood<br>• <b>Extremely valuable</b> in emergencies<br>• No time to type patient's blood = use O-<br>• High demand, low supply situation<br>• O- donors are medical heroes!";

  if (t.includes('ab+') || t.includes('universal recipient'))
    return "🩸 <b>AB+ (Universal Recipient):</b><br><br>• Can receive blood from <b>ALL 8 blood types</b><br>• Only 4% of population has AB+ blood<br>• AB+ plasma can be donated to anyone<br>• Most flexible for transfusions<br>• Rare but can accept any blood type<br>• AB+ patients have more donor options.";

  if (t.includes('how') && (t.includes('work') || t.includes('system') || t.includes('platform')))
    return "⚙️ <b>How WLR Blood Network Works:</b><br><br>1. <b>Registration:</b> Donors join with blood type & location<br>2. <b>Matching:</b> AI finds compatible donors by distance/response rate<br>3. <b>Notification:</b> SMS/email alerts to donors with ETA<br>4. <b>Tracking:</b> Real-time updates on donor responses<br>5. <b>Fallback:</b> Automatic routing to hospitals/blood banks<br>6. <b>AI Insights:</b> Smart recommendations for optimal routing<br><br><b>Goal:</b> Get blood from donor to patient in under 30 minutes.";

  if (t.includes('help') || t.includes('what') || t.includes('can you') || t.includes('assist')) {
    updateCharacterState('waving'); // Waving to offer help
    return "🤖 <b>I can help you with:</b><br><br>• <b>🚨 Emergency SOS:</b> How to activate emergency alerts<br>• <b>🔍 Donor Search:</b> Finding and contacting donors<br>• <b>📋 Registration:</b> Adding new donors to the network<br>• <b>🧬 Compatibility:</b> Blood type matching rules<br>• <b>🏥 Hospitals:</b> Finding medical facilities<br>• <b>🗺 Maps:</b> Navigating Hyderabad healthcare<br>• <b>🏦 Blood Banks:</b> Stock levels and transfers<br>• <b>⏱ ETAs:</b> Understanding response times<br>• <b>🔌 Technical:</b> API and backend details<br><br><b>Try asking:</b> 'How does SOS work?' or 'Show me available donors'";
  }

  // Default response with suggestions
  return "🤔 <b>I understand you're asking about:</b> '" + msg + "'<br><br>I specialize in WLR Blood Network operations. Try asking about:<br>• <em>'How does SOS work?'</em><br>• <em>'Find donors for O+ blood'</em><br>• <em>'Show me hospitals on the map'</em><br>• <em>'What is blood compatibility?'</em><br>• <em>'How to register a donor'</em><br><br>Or visit the relevant page in the sidebar for hands-on experience!";
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