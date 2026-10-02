// ── GLOBAL GOOGLE AUTH & APP VARIABLES ──
var googleAccessToken = null;
var googleTokenExpiry = null;
var tokenClient = null;
var autoLockTimer = null;
var lastActivityTime = Date.now();
var currentRxZoom = 1.0;
var externalDrugs = [];

// ── STATE ──
let state = {
  loggedIn: false,
  loginMethod: 'local', // 'google' or 'local'
  securityPin: '',      // 4-digit PIN for local lock
  autoLockMinutes: 15,  // Inactivity timeout in minutes (0 = disabled)
  theme: 'light',       // 'light' or 'dark'
  user: { name: 'Dr. Someone', email: '', initials: 'DS' },
  profile: {
    name: 'Dr. Someone',
    qualifications: 'MBBS (DU)',
    designation: 'General Practitioner / Specialist',
    hospital: 'Medical College & Hospital',
    reg: 'Regi: A-000000',
    phone: '+880 1700-000000',
    address: 'Chamber: House 12, Road 5, Dhaka',
    hours: '4:00 PM - 9:00 PM (Closed on Friday)',
    footer: 'নিয়ম মাফিক ঔষধ খাবেন। ডাক্তারের পরামর্শ ব্যতীত ঔষধ পরিবর্তন নিষেধ।',
    chamberName: 'Care Medical Chamber',
    chamberPhone: '+880 1800-000000',
    chamberAddr1: 'Dhanmondi, Dhaka',
    chamberAddr2: 'Room 302, 3rd Floor',
    chamberHours: '5 PM - 9 PM',
    chamberNote: 'Serial by phone'
  },
  padSettings: {
    align: 'center',
    leftWidth: 165,
    color: '#1a3a5c',
    showHistory: true,
    showFindings: true,
    showInvestigation: true,
    showAdvice: true,
    showFollowup: true,
    showGenericNames: false, // Default: Brand Name shown, Generic Name togglable
    useClinicalPrefix: true, // e.g. "Tab. Napa" instead of "Tablet Napa"
    margins: { top: 13, bottom: 14, left: 14, right: 14 },
    signature: null
  },
  patients: [],
  prescriptions: [],
  customDrugs: [],
  currentRx: null,
  editingPatientId: null
};

// ── CLINICAL MEDICINE TYPES / FORMS ──
const MEDICINE_FORMS = [
  { label: 'Tab. (Tablet)', value: 'Tab.', full: 'Tablet' },
  { label: 'Cap. (Capsule)', value: 'Cap.', full: 'Capsule' },
  { label: 'Syr. (Syrup)', value: 'Syr.', full: 'Syrup' },
  { label: 'Susp. (Suspension)', value: 'Susp.', full: 'Suspension' },
  { label: 'Inj. (Injection)', value: 'Inj.', full: 'Injection' },
  { label: 'Supp. (Suppository)', value: 'Supp.', full: 'Suppository' },
  { label: 'Gtt. (Eye/Ear Drops)', value: 'Gtt.', full: 'Drops' },
  { label: 'Oint. (Cream/Ointment)', value: 'Oint.', full: 'Cream/Ointment' },
  { label: 'Inh. (Inhaler/Nebulizer)', value: 'Inh.', full: 'Inhaler' },
  { label: 'Powder / Sachet', value: 'Sachet', full: 'Sachet' },
  { label: 'Sol. (Solution)', value: 'Sol.', full: 'Solution' },
  { label: 'Lotion', value: 'Lotion', full: 'Lotion' }
];

// ── BUILT-IN FALLBACK DRUG DATABASE ──
const DRUGS = [
  { name: 'Napa', generic: 'Paracetamol', dose: '500mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳1.50/tab' },
  { name: 'Napa Extra', generic: 'Paracetamol + Caffeine', dose: '500mg+65mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳2.00/tab' },
  { name: 'Napa Extend', generic: 'Paracetamol (Extended Release)', dose: '665mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳2.50/tab' },
  { name: 'Ace', generic: 'Paracetamol', dose: '500mg', form: 'Tab.', company: 'Square Pharma', price: '৳1.50/tab' },
  { name: 'Ace Plus', generic: 'Paracetamol + Caffeine', dose: '500mg+65mg', form: 'Tab.', company: 'Square Pharma', price: '৳2.00/tab' },
  { name: 'Renova', generic: 'Paracetamol', dose: '500mg', form: 'Tab.', company: 'Renata Ltd', price: '৳1.50/tab' },
  { name: 'Fast', generic: 'Paracetamol', dose: '500mg', form: 'Tab.', company: 'ACI Pharma', price: '৳1.50/tab' },
  { name: 'Seclo', generic: 'Omeprazole', dose: '20mg', form: 'Cap.', company: 'Square Pharma', price: '৳5.00/cap' },
  { name: 'Losectil', generic: 'Omeprazole', dose: '20mg', form: 'Cap.', company: 'Beximco Pharma', price: '৳5.00/cap' },
  { name: 'Sergel', generic: 'Esomeprazole', dose: '20mg', form: 'Cap.', company: 'Healthcare Pharma', price: '৳7.00/cap' },
  { name: 'Maxpro', generic: 'Esomeprazole', dose: '20mg', form: 'Cap.', company: 'Renata Ltd', price: '৳7.00/cap' },
  { name: 'Pantop', generic: 'Pantoprazole', dose: '20mg', form: 'Tab.', company: 'Square Pharma', price: '৳7.00/tab' },
  { name: 'Neopan', generic: 'Pantoprazole', dose: '40mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳7.00/tab' },
  { name: 'Rabeca', generic: 'Rabeprazole', dose: '20mg', form: 'Tab.', company: 'Square Pharma', price: '৳8.00/tab' },
  { name: 'Amoxil', generic: 'Amoxicillin', dose: '500mg', form: 'Cap.', company: 'Square Pharma', price: '৳8.00/cap' },
  { name: 'Moxacil', generic: 'Amoxicillin', dose: '500mg', form: 'Cap.', company: 'Beximco Pharma', price: '৳8.00/cap' },
  { name: 'Zithromax', generic: 'Azithromycin', dose: '500mg', form: 'Tab.', company: 'Pfizer / Square', price: '৳50.00/tab' },
  { name: 'Azithcin', generic: 'Azithromycin', dose: '500mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳48.00/tab' },
  { name: 'Zimax', generic: 'Azithromycin', dose: '500mg', form: 'Tab.', company: 'Renata Ltd', price: '৳50.00/tab' },
  { name: 'Ciprocin', generic: 'Ciprofloxacin', dose: '500mg', form: 'Tab.', company: 'Square Pharma', price: '৳14.00/tab' },
  { name: 'Neofloxin', generic: 'Ciprofloxacin', dose: '500mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳14.00/tab' },
  { name: 'Flagyl', generic: 'Metronidazole', dose: '400mg', form: 'Tab.', company: 'Sanofi / Square', price: '৳3.50/tab' },
  { name: 'Amodis', generic: 'Metronidazole', dose: '400mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳3.50/tab' },
  { name: 'Cef-3', generic: 'Cefixime', dose: '200mg', form: 'Cap.', company: 'Beximco Pharma', price: '৳35.00/cap' },
  { name: 'Cefix', generic: 'Cefixime', dose: '200mg', form: 'Cap.', company: 'Square Pharma', price: '৳35.00/cap' },
  { name: 'Zinnat', generic: 'Cefuroxime Axetil', dose: '500mg', form: 'Tab.', company: 'GSK', price: '৳85.00/tab' },
  { name: 'Kilmax', generic: 'Cefuroxime Axetil', dose: '500mg', form: 'Tab.', company: 'Square Pharma', price: '৳80.00/tab' },
  { name: 'Doxacin', generic: 'Doxycycline', dose: '100mg', form: 'Cap.', company: 'Square Pharma', price: '৳7.00/cap' },
  { name: 'Glucomin', generic: 'Metformin HCl', dose: '500mg', form: 'Tab.', company: 'Square Pharma', price: '৳3.50/tab' },
  { name: 'Comet', generic: 'Metformin HCl', dose: '500mg', form: 'Tab.', company: 'Square Pharma', price: '৳3.50/tab' },
  { name: 'Amaryl', generic: 'Glimepiride', dose: '2mg', form: 'Tab.', company: 'Sanofi-Aventis', price: '৳15.00/tab' },
  { name: 'Secrin', generic: 'Glimepiride', dose: '2mg', form: 'Tab.', company: 'Square Pharma', price: '৳12.00/tab' },
  { name: 'Amdocal', generic: 'Amlodipine', dose: '5mg', form: 'Tab.', company: 'Square Pharma', price: '৳5.00/tab' },
  { name: 'Amlong', generic: 'Amlodipine', dose: '5mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳5.00/tab' },
  { name: 'Bisoren', generic: 'Bisoprolol Fumarate', dose: '2.5mg', form: 'Tab.', company: 'Square Pharma', price: '৳8.00/tab' },
  { name: 'Losartan', generic: 'Losartan Potassium', dose: '50mg', form: 'Tab.', company: 'Square Pharma', price: '৳9.00/tab' },
  { name: 'Angilock', generic: 'Losartan Potassium', dose: '50mg', form: 'Tab.', company: 'Square Pharma', price: '৳9.00/tab' },
  { name: 'Atova', generic: 'Atorvastatin', dose: '10mg', form: 'Tab.', company: 'Square Pharma', price: '৳12.00/tab' },
  { name: 'Lipicon', generic: 'Atorvastatin', dose: '10mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳12.00/tab' },
  { name: 'Ecotrin', generic: 'Aspirin (Gastro-resistant)', dose: '75mg', form: 'Tab.', company: 'Square Pharma', price: '৳2.00/tab' },
  { name: 'Clopid', generic: 'Clopidogrel', dose: '75mg', form: 'Tab.', company: 'Square Pharma', price: '৳12.00/tab' },
  { name: 'Anlet', generic: 'Clopidogrel', dose: '75mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳12.00/tab' },
  { name: 'Calbo-D', generic: 'Calcium + Vitamin D3', dose: '500mg+200IU', form: 'Tab.', company: 'Square Pharma', price: '৳9.00/tab' },
  { name: 'Calcin-D', generic: 'Calcium + Vitamin D3', dose: '500mg+200IU', form: 'Tab.', company: 'Beximco Pharma', price: '৳9.00/tab' },
  { name: 'Fexo', generic: 'Fexofenadine HCl', dose: '120mg', form: 'Tab.', company: 'Square Pharma', price: '৳12.00/tab' },
  { name: 'Alatrol', generic: 'Cetirizine HCl', dose: '10mg', form: 'Tab.', company: 'Renata Ltd', price: '৳4.00/tab' },
  { name: 'Cetriz', generic: 'Cetirizine HCl', dose: '10mg', form: 'Tab.', company: 'Square Pharma', price: '৳4.00/tab' },
  { name: 'Monas', generic: 'Montelukast', dose: '10mg', form: 'Tab.', company: 'Acme Laboratories', price: '৳16.00/tab' },
  { name: 'Provair', generic: 'Montelukast', dose: '10mg', form: 'Tab.', company: 'Unimed Unihealth', price: '৳16.00/tab' },
  { name: 'Naprox', generic: 'Naproxen', dose: '500mg', form: 'Tab.', company: 'Square Pharma', price: '৳10.00/tab' },
  { name: 'Profen', generic: 'Ibuprofen', dose: '400mg', form: 'Tab.', company: 'Square Pharma', price: '৳4.00/tab' },
  { name: 'Clofenac', generic: 'Diclofenac Sodium', dose: '50mg', form: 'Tab.', company: 'Square Pharma', price: '৳4.00/tab' },
  { name: 'Motigut', generic: 'Domperidone', dose: '10mg', form: 'Tab.', company: 'Square Pharma', price: '৳3.50/tab' },
  { name: 'Ondem', generic: 'Ondansetron', dose: '4mg', form: 'Tab.', company: 'Beximco Pharma', price: '৳20.00/tab' },
  { name: 'Visset', generic: 'Ondansetron', dose: '4mg', form: 'Tab.', company: 'Square Pharma', price: '৳20.00/tab' },
  { name: 'Almex', generic: 'Albendazole', dose: '400mg', form: 'Tab.', company: 'Square Pharma', price: '৳15.00/tab' },
  { name: 'Salbulin Inhaler', generic: 'Salbutamol', dose: '100mcg/puff', form: 'Inh.', company: 'Square Pharma', price: '৳180.00/inhaler' },
  { name: 'Biphasic Insulin 30/70', generic: 'Insulin (Human)', dose: '100IU/ml', form: 'Inj.', company: 'Novo Nordisk', price: '৳450.00/vial' }
];

// ── FAST DRUG DATABASE CACHING (0ms INSTANT LOAD) ──
async function loadExternalDrugDatabase() {
  // Step 1: Load from local memory cache for instant (0ms) startup
  const cached = localStorage.getItem('prescribepro_cached_drugs');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        externalDrugs = parsed;
        console.log(`⚡ Instant loaded ${externalDrugs.length} medicines from local memory cache`);
      }
    } catch(e) {
      console.warn('Failed to parse local drug cache:', e);
    }
  }

  // Step 2: Background fetch data/drugs.json to update cache
  try {
    const res = await fetch('data/drugs.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        externalDrugs = data;
        localStorage.setItem('prescribepro_cached_drugs', JSON.stringify(data));
        console.log(`Updated local cache with ${externalDrugs.length} medicines from data/drugs.json`);
      }
    }
  } catch (e) {
    console.warn('Could not fetch data/drugs.json, using cached or built-in drug catalog:', e);
  }
}

// ── REAL-TIME PRESCRIPTION DRAFT AUTO-SAVE & RECOVERY ──
function saveRxDraft() {
  const modalRx = document.getElementById('modal-rx');
  if (!modalRx || modalRx.classList.contains('hidden')) return;

  const rx = collectRxData();
  if (rx.complaints || rx.diagnosis || rx.history || rx.findings || rx.investigation || rx.advice || (rx.drugs && rx.drugs.length > 0 && rx.drugs[0].name)) {
    localStorage.setItem('prescribepro_rx_draft', JSON.stringify(rx));
  }
}

function clearRxDraft() {
  localStorage.removeItem('prescribepro_rx_draft');
}

function restoreRxDraft() {
  const savedDraft = localStorage.getItem('prescribepro_rx_draft');
  if (!savedDraft) return false;

  try {
    const draft = JSON.parse(savedDraft);
    if (!draft) return false;

    const sel = document.getElementById('rx-patient-select');
    if (sel && draft.patientId) sel.value = draft.patientId;

    setV('rx-date', draft.date || new Date().toISOString().split('T')[0]);
    setV('rx-visit', draft.visitType || 'New Visit');
    setV('rx-complaints', draft.complaints || '');
    setV('rx-diagnosis', draft.diagnosis || '');
    setV('rx-history', draft.history || '');
    setV('rx-findings', draft.findings || '');
    setV('rx-investigation', draft.investigation || '');
    setV('rx-advice', draft.advice || '');
    setV('rx-notes', draft.notes || '');
    setV('rx-followup-days', draft.followupDays || '');
    setV('rx-followup-unit', draft.followupUnit || 'days');

    if (draft.drugs && draft.drugs.length > 0) {
      document.getElementById('drug-rows').innerHTML = '';
      draft.drugs.forEach(drug => {
        addDrugRow();
        const id = drugRowId;
        setV(`dname-${id}`, drug.name || '');
        setV(`dgeneric-${id}`, drug.generic || '');
        setV(`dform-${id}`, drug.form || 'Tab.');
        setV(`ddose-${id}`, drug.dose || '');
        setV(`dfreq-${id}`, drug.freq || '');
        setV(`ddur-${id}`, drug.duration || '');
        setV(`dnotes-${id}`, drug.drugNotes || '');
        const tSel = document.getElementById(`dtiming-sel-${id}`);
        const customInp = document.getElementById(`dtiming-custom-${id}`);
        const stdOptions = ['After meal', 'Before meal', 'With meal', 'Empty stomach', 'At bedtime', 'None'];

        if (tSel) {
          if (!drug.timing) {
            tSel.value = 'None';
            if (customInp) customInp.classList.add('hidden');
          } else if (stdOptions.includes(drug.timing)) {
            tSel.value = drug.timing;
            if (customInp) customInp.classList.add('hidden');
          } else {
            tSel.value = 'Custom';
            if (customInp) {
              customInp.classList.remove('hidden');
              customInp.value = drug.timing;
            }
          }
        }
      });
    }
    toast('📝 Unsaved prescription draft restored');
    return true;
  } catch(e) {
    console.error('Error restoring draft:', e);
    return false;
  }
}

// ── THEME MANAGEMENT ──
function applyTheme(t, skipSave = false) {
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
  if (!skipSave && state.loggedIn) {
    saveState();
  }
}

function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  toast(newTheme === 'dark' ? '🌙 Dark Mode Enabled' : '☀️ Light Mode Enabled');
}

// ── PERSISTENCE & SESSION LOCK ──
function getStorageKey() {
  const email = (state.user && state.user.email) ? state.user.email : 'local_doctor';
  return 'prescribepro_state_' + email;
}

function saveState() {
  if (state.loggedIn) {
    localStorage.setItem('prescribepro_session_active', 'true');
    localStorage.setItem('prescribepro_session_method', state.loginMethod || 'local');
    if (state.user && state.user.email) {
      localStorage.setItem('prescribepro_last_email', state.user.email);
    }
  }
  localStorage.setItem(getStorageKey(), JSON.stringify(state));
}

function loadState() {
  const sessionActive = localStorage.getItem('prescribepro_session_active') === 'true';
  const lastEmail = localStorage.getItem('prescribepro_last_email') || 'local_doctor';
  const key = 'prescribepro_state_' + lastEmail;
  const s = localStorage.getItem(key) || localStorage.getItem('prescribepro_state') || localStorage.getItem('prescribepro_state_local_doctor');

  if (s) {
    try {
      const loaded = JSON.parse(s);
      Object.assign(state, loaded);
    } catch(e) {
      console.error('Failed to parse local state:', e);
    }
  }

  if (sessionActive) {
    state.loggedIn = true;
    state.loginMethod = localStorage.getItem('prescribepro_session_method') || state.loginMethod || 'local';
  }

  if (state.theme) applyTheme(state.theme, true);

  const cachedToken = localStorage.getItem('google_access_token');
  const cachedExpiry = localStorage.getItem('google_token_expiry');
  if (cachedToken && cachedExpiry && parseInt(cachedExpiry) > Date.now()) {
    googleAccessToken = cachedToken;
    googleTokenExpiry = parseInt(cachedExpiry);
  }
}

// Activity monitor for Auto-Lock Screen
function resetActivityTimer() {
  lastActivityTime = Date.now();
}

function startAutoLockMonitor() {
  ['mousemove', 'keydown', 'touchstart', 'click'].forEach(evt => {
    window.addEventListener(evt, resetActivityTimer, { passive: true });
  });

  if (autoLockTimer) clearInterval(autoLockTimer);
  autoLockTimer = setInterval(() => {
    if (!state.loggedIn) return;
    if (state.autoLockMinutes && state.autoLockMinutes > 0) {
      const elapsedMinutes = (Date.now() - lastActivityTime) / (1000 * 60);
      if (elapsedMinutes >= state.autoLockMinutes) {
        lockDesk();
      }
    }
  }, 15000);
}

function lockDesk() {
  if (!state.loggedIn) return;
  const lockOverlay = document.getElementById('lock-overlay');
  if (lockOverlay) lockOverlay.classList.remove('hidden');
}

function unlockDesk() {
  const pinInput = document.getElementById('unlock-pin');
  const entered = pinInput ? pinInput.value.trim() : '';
  if (state.securityPin && entered !== state.securityPin) {
    toast('❌ Incorrect Security PIN');
    if (pinInput) pinInput.value = '';
    return;
  }
  const lockOverlay = document.getElementById('lock-overlay');
  if (lockOverlay) lockOverlay.classList.add('hidden');
  if (pinInput) pinInput.value = '';
  resetActivityTimer();
  toast('🔓 Desk unlocked');
}

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initUI();
  loadExternalDrugDatabase();
  startAutoLockMonitor();

  const sessionActive = localStorage.getItem('prescribepro_session_active') === 'true';

  if (state.loggedIn || sessionActive) {
    state.loggedIn = true;
    saveState();
    showApp();
    if (state.loginMethod === 'google') {
      syncWithGoogleCloud();
      setInterval(() => {
        if (state.loggedIn && state.loginMethod === 'google') {
          refreshGoogleTokenSilently();
        }
      }, 40 * 60 * 1000);
    } else {
      updateDriveStatus('offline');
    }
  } else {
    showSection('login');
  }
});

function initUI() {
  ['pad-align','pad-left-width','pad-color','show-history','show-findings','show-investigation','show-advice','show-followup','show-generic','use-clinical-prefix']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', updatePadPreview);
    });

  const rxModalEl = document.getElementById('modal-rx');
  if (rxModalEl) {
    rxModalEl.addEventListener('input', saveRxDraft);
    rxModalEl.addEventListener('change', saveRxDraft);
  }

  if (document.getElementById('drug-rows')) {
    addDrugRow();
  }
}

// ── AUTH TAB & LOGIN METHODS ──
function switchAuthTab(mode) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  
  if (mode === 'google') {
    document.getElementById('tab-btn-google')?.classList.add('active');
    document.getElementById('panel-auth-google')?.classList.add('active');
  } else {
    document.getElementById('tab-btn-local')?.classList.add('active');
    document.getElementById('panel-auth-local')?.classList.add('active');
  }
}

function startLocalLogin() {
  const docName = v('local-doc-name').trim();
  const bmdcReg = v('local-bmdc-reg').trim();
  const pin = v('local-doc-pin').trim();

  if (!docName) {
    toast('⚠️ Please enter Doctor Name');
    return;
  }

  state.loggedIn = true;
  state.loginMethod = 'local';
  state.user = { name: docName, email: 'local@doctor', initials: getInitials(docName) };
  if (!state.profile.name || state.profile.name === 'Dr. Someone') {
    state.profile.name = docName;
  }
  if (bmdcReg) state.profile.reg = bmdcReg;
  if (pin) state.securityPin = pin;

  saveState();
  showApp();
  toast('✅ Welcome, ' + docName);
}

function getInitials(name) {
  const parts = name.replace(/^Dr\.\s*/i, '').split(' ');
  return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'DR';
}

function logout() {
  if (confirm('Log out from current session?')) {
    state.loggedIn = false;
    googleAccessToken = null;
    googleTokenExpiry = null;
    localStorage.setItem('prescribepro_session_active', 'false');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    saveState();
    location.reload();
  }
}

// ── GOOGLE AUTH ──
const GOOGLE_CLIENT_ID = '744204331957-vnium3sdih08go5iuv0rlpctvgqhjara.apps.googleusercontent.com';
const GOOGLE_SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.appdata';

function initGoogleAuth() {
  if (typeof google === 'undefined' || !google.accounts) return;
  if (tokenClient) return;
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: onTokenReceived,
      error_callback: onTokenError,
    });
  } catch(e) {
    console.error('Failed to initialize Google GSI Client:', e);
  }
}

let isRefreshingToken = false;

function refreshGoogleTokenSilently() {
  if (typeof google === 'undefined' || !google.accounts) return Promise.resolve(false);
  initGoogleAuth();
  if (!tokenClient) return Promise.resolve(false);
  if (isRefreshingToken) return Promise.resolve(false);

  isRefreshingToken = true;

  return new Promise((resolve) => {
    const originalCallback = tokenClient.callback;
    const timeoutTimer = setTimeout(() => {
      tokenClient.callback = originalCallback;
      isRefreshingToken = false;
      resolve(false);
    }, 10000);

    tokenClient.callback = (tokenResponse) => {
      clearTimeout(timeoutTimer);
      tokenClient.callback = originalCallback;
      isRefreshingToken = false;

      if (tokenResponse && !tokenResponse.error && tokenResponse.access_token) {
        googleAccessToken = tokenResponse.access_token;
        googleTokenExpiry = Date.now() + ((tokenResponse.expires_in || 3600) * 1000);
        localStorage.setItem('google_access_token', googleAccessToken);
        localStorage.setItem('google_token_expiry', googleTokenExpiry.toString());
        updateDriveStatus('synced');
        console.log('⚡ Google Cloud token silently renewed!');
        resolve(true);
      } else {
        console.warn('Silent Google token refresh returned error:', tokenResponse?.error);
        resolve(false);
      }
    };

    try {
      tokenClient.requestAccessToken({ prompt: '' });
    } catch(e) {
      clearTimeout(timeoutTimer);
      tokenClient.callback = originalCallback;
      isRefreshingToken = false;
      resolve(false);
    }
  });
}

function startGoogleLogin() {
  if (typeof google === 'undefined' || !google.accounts) {
    toast('❌ Google sign-in script not loaded. You can use Quick Local Mode offline!');
    switchAuthTab('local');
    return;
  }
  initGoogleAuth();
  if (!tokenClient) {
    toast('❌ Initializing Google auth, please retry in a second.');
    return;
  }
  setLoginLoading(true, 'Opening Google sign-in…');
  try {
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (e) {
    setLoginLoading(false);
    toast('❌ Google Sign-In Error: ' + e.message);
  }
}

function onTokenReceived(tokenResponse) {
  if (tokenResponse.error) {
    setLoginLoading(false);
    toast('❌ Google Auth cancelled or failed: ' + tokenResponse.error);
    return;
  }
  googleAccessToken = tokenResponse.access_token;
  googleTokenExpiry = Date.now() + ((tokenResponse.expires_in || 3600) * 1000);
  localStorage.setItem('google_access_token', googleAccessToken);
  localStorage.setItem('google_token_expiry', googleTokenExpiry.toString());

  fetchUserInfoAndLogin();
}

function onTokenError(err) {
  setLoginLoading(false);
  toast('❌ Auth Error: ' + (err.message || 'Unknown error'));
}

async function fetchUserInfoAndLogin() {
  setLoginLoading(true, 'Fetching doctor account info…');
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    if (res.ok) {
      const userInfo = await res.json();
      state.user = {
        name: userInfo.name || 'Doctor',
        email: userInfo.email || 'doctor@gmail.com',
        initials: getInitials(userInfo.name || 'Doctor')
      };
      if (!state.profile.name || state.profile.name === 'Dr. Someone') {
        state.profile.name = 'Dr. ' + (userInfo.name || '');
      }
    }
  } catch (e) {
    console.warn('Could not fetch Google user profile info:', e);
  }

  state.loggedIn = true;
  state.loginMethod = 'google';
  localStorage.setItem('prescribepro_session_active', 'true');
  saveState();

  setLoginLoading(false);
  showApp();
  toast('✅ Signed in with Google');
  setTimeout(() => { syncWithGoogleCloud(true); }, 500);
}

function setLoginLoading(show, text) {
  const btn = document.getElementById('btn-google-signin');
  const loading = document.getElementById('login-loading');
  const txt = document.getElementById('login-loading-text');
  if (btn) btn.style.display = show ? 'none' : 'flex';
  if (loading) loading.style.display = show ? 'flex' : 'none';
  if (txt && text) txt.textContent = text;
}

// ── NAVIGATION & VIEWS ──
function showApp() {
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('topnav').classList.remove('hidden');
  document.getElementById('main-layout').classList.remove('hidden');

  const avatar = document.getElementById('user-avatar');
  if (avatar) avatar.textContent = state.user.initials || 'DR';

  showSection('dashboard');
}

function showSection(sec) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`section-${sec}`);
  const sbtn = document.getElementById(`sb-${sec}`);
  const mbtn = document.getElementById(`mnob-${sec}`);

  if (target) target.classList.remove('hidden');
  if (sbtn) sbtn.classList.add('active');
  if (mbtn) mbtn.classList.add('active');

  if (sec === 'dashboard') renderDashboard();
  if (sec === 'patients') renderPatients();
  if (sec === 'prescriptions') renderAllRx();
  if (sec === 'profile') populateProfileForm();
  if (sec === 'paddesign') initPadDesignSection();
}

function scrollToRxSec(secId) {
  const el = document.getElementById(secId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── DRUG ROWS & PRESCRIPTION WRITING ──
let drugRowId = 0;

function addDrugRow() {
  const id = ++drugRowId;
  const card = document.createElement('div');
  card.className = 'drug-card';
  card.id = `dr-${id}`;

  const formOptions = MEDICINE_FORMS.map(f => `<option value="${f.value}">${f.label}</option>`).join('');

  card.innerHTML = `
    <button class="del-btn drug-card-del" onclick="removeDrugRow(${id})" title="Remove Medication">✕</button>

    <div class="drug-grid-main">
      <div>
        <div class="drug-field-label">Type / Form</div>
        <select id="dform-${id}">
          ${formOptions}
        </select>
      </div>

      <div class="drug-name-wrap">
        <div class="drug-field-label">Brand Name</div>
        <input type="text" id="dname-${id}" placeholder="e.g. Napa, Seclo, Sergel..." oninput="drugSearch(this, ${id})" autocomplete="off" style="font-weight:700; color:var(--rx-blue)">
        <div class="drug-autocomplete hidden" id="dac-${id}"></div>
      </div>

      <div>
        <div class="drug-field-label">Generic Name (Molecule)</div>
        <input type="text" id="dgeneric-${id}" placeholder="e.g. Paracetamol, Omeprazole..." style="font-style:italic">
      </div>

      <div>
        <div class="drug-field-label">Dose / Strength</div>
        <input type="text" id="ddose-${id}" placeholder="e.g. 500mg, 20mg">
      </div>
    </div>

    <div class="drug-grid-secondary">
      <div>
        <div class="drug-field-label">Frequency (সময়)</div>
        <input type="text" id="dfreq-${id}" placeholder="e.g. ১+০+১ or 1-0-1">
      </div>

      <div>
        <div class="drug-field-label">Duration</div>
        <input type="text" id="ddur-${id}" placeholder="e.g. 5 days">
      </div>

      <div>
        <div class="drug-field-label">Timing (খাওয়ার সময়)</div>
        <select id="dtiming-sel-${id}" onchange="toggleCustomTiming(${id})">
          <option value="After meal" selected>After meal (খাবার পরে)</option>
          <option value="Before meal">Before meal (খাবার আগে)</option>
          <option value="With meal">With meal (খাবারের সাথে)</option>
          <option value="Empty stomach">Empty stomach (খালি পেটে)</option>
          <option value="At bedtime">At bedtime (রাতে ঘুমানোর আগে)</option>
          <option value="None">None (No timing text)</option>
          <option value="Custom">✏️ Custom instruction...</option>
        </select>
        <input type="text" id="dtiming-custom-${id}" class="hidden" placeholder="Type custom timing instruction..." style="margin-top:4px">
      </div>

      <div>
        <div class="drug-field-label">Special Advice / Notes</div>
        <input type="text" id="dnotes-${id}" placeholder="e.g. Take with plenty of water...">
      </div>
    </div>
  `;

  document.getElementById('drug-rows').appendChild(card);
}

function toggleCustomTiming(id) {
  const sel = document.getElementById(`dtiming-sel-${id}`);
  const customInp = document.getElementById(`dtiming-custom-${id}`);
  if (sel && customInp) {
    if (sel.value === 'Custom') {
      customInp.classList.remove('hidden');
      customInp.focus();
    } else {
      customInp.classList.add('hidden');
    }
  }
}

function removeDrugRow(id) {
  const el = document.getElementById(`dr-${id}`);
  if (el) el.remove();
  saveRxDraft();
}

function getActiveDrugs() {
  const baseList = externalDrugs.length > 0 ? externalDrugs : DRUGS;
  if (state.customDrugs && state.customDrugs.length > 0) {
    return [...state.customDrugs, ...baseList.filter(d => !state.customDrugs.some(c => (c.name || '').toLowerCase() === (d.name || '').toLowerCase()))];
  }
  return baseList;
}

function drugSearch(input, id) {
  const q = input.value.toLowerCase().trim();
  const ac = document.getElementById(`dac-${id}`);
  if (!q || q.length < 1) { ac.classList.add('hidden'); return; }

  const matches = getActiveDrugs().filter(d =>
    (d.name || '').toLowerCase().includes(q) ||
    (d.generic || '').toLowerCase().includes(q)
  ).slice(0, 12);

  if (matches.length === 0) { ac.classList.add('hidden'); return; }

  ac.innerHTML = matches.map(d => `
    <div class="drug-ac-item" onclick="selectDrug(${id}, '${escapeQuote(d.name)}', '${escapeQuote(d.generic||'')}', '${escapeQuote(d.form||'Tab.')}', '${escapeQuote(d.dose||'')}')">
      <div class="drug-ac-icon">💊</div>
      <div class="drug-ac-body">
        <div class="ac-brand">${d.name} <span class="ac-dose-badge">${d.dose||''}</span> <span class="ac-form-badge">${d.form||''}</span></div>
        <div class="ac-generic">${d.generic ? 'Generic: ' + d.generic : ''}</div>
        <div class="ac-meta">${d.company || 'Standard'} ${d.price ? '· ' + d.price : ''}</div>
      </div>
    </div>
  `).join('');

  ac.classList.remove('hidden');
}

function escapeQuote(str) {
  return (str || '').replace(/'/g, "\\'");
}

function selectDrug(id, name, generic, form, dose) {
  setV(`dname-${id}`, name);
  setV(`dgeneric-${id}`, generic);
  setV(`dform-${id}`, form || 'Tab.');
  if (dose) setV(`ddose-${id}`, dose);

  const ac = document.getElementById(`dac-${id}`);
  if (ac) ac.classList.add('hidden');
  saveRxDraft();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.drug-name-wrap')) {
    document.querySelectorAll('.drug-autocomplete').forEach(el => el.classList.add('hidden'));
  }
});

// ── COLLECT & SAVE RX ──
function collectRxData() {
  const drugs = [];
  document.querySelectorAll('#drug-rows .drug-card').forEach(card => {
    const id = card.id.replace('dr-', '');
    const name = v(`dname-${id}`).trim();
    if (!name) return;

    let timingVal = 'After meal';
    const sel = document.getElementById(`dtiming-sel-${id}`);
    if (sel) {
      const selected = sel.value;
      if (selected === 'Custom') {
        timingVal = v(`dtiming-custom-${id}`).trim() || 'Custom';
      } else if (selected === 'None') {
        timingVal = '';
      } else {
        timingVal = selected;
      }
    }

    drugs.push({
      name,
      generic: v(`dgeneric-${id}`).trim(),
      form: v(`dform-${id}`) || 'Tab.',
      dose: v(`ddose-${id}`).trim(),
      freq: v(`dfreq-${id}`).trim(),
      timing: timingVal,
      duration: v(`ddur-${id}`).trim(),
      drugNotes: v(`dnotes-${id}`).trim()
    });
  });

  const pid = v('rx-patient-select');
  const patient = state.patients.find(p => p.id === pid);
  const now = Date.now();

  return {
    id: state.currentRx ? state.currentRx.id : uid(),
    createdAt: state.currentRx ? (state.currentRx.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: now,
    date: v('rx-date') || new Date().toISOString().split('T')[0],
    visitType: v('rx-visit') || 'New Visit',
    patientId: pid,
    patientName: patient ? patient.name : 'Unassigned Patient',
    complaints: v('rx-complaints'),
    diagnosis: v('rx-diagnosis'),
    history: v('rx-history'),
    findings: v('rx-findings'),
    investigation: v('rx-investigation'),
    advice: v('rx-advice'),
    notes: v('rx-notes'),
    followupDays: v('rx-followup-days'),
    followupUnit: v('rx-followup-unit') || 'days',
    drugs
  };
}

function saveRx() {
  const rx = collectRxData();
  if (!rx.patientId) { toast('⚠️ Please select a patient'); return; }
  if (rx.drugs.length === 0) { toast('⚠️ Add at least one medication'); return; }

  const idx = state.prescriptions.findIndex(r => r.id === rx.id);
  if (idx >= 0) state.prescriptions[idx] = rx;
  else state.prescriptions.unshift(rx);

  saveState();
  clearRxDraft();
  closeModal('modal-rx');
  renderDashboard();
  renderAllRx();
  scheduleCloudSync(true);
  toast('✅ Prescription saved');

  viewRx(rx.id);
}

// ── EDIT EXISTING PRESCRIPTION ──
function editCurrentRx() {
  if (!state.currentRx) return;
  closeModal('modal-rx-preview');
  const rx = state.currentRx;

  openModal('modal-rx');
  const sel = document.getElementById('rx-patient-select');
  if (sel) {
    sel.innerHTML = state.patients.map(p => `<option value="${p.id}" ${p.id === rx.patientId ? 'selected' : ''}>${p.name} (${p.age||''})</option>`).join('');
  }

  setV('rx-date', rx.date || new Date().toISOString().split('T')[0]);
  setV('rx-visit', rx.visitType || 'New Visit');
  setV('rx-complaints', rx.complaints || '');
  setV('rx-diagnosis', rx.diagnosis || '');
  setV('rx-history', rx.history || '');
  setV('rx-findings', rx.findings || '');
  setV('rx-investigation', rx.investigation || '');
  setV('rx-advice', rx.advice || '');
  setV('rx-notes', rx.notes || '');
  setV('rx-followup-days', rx.followupDays || '');
  setV('rx-followup-unit', rx.followupUnit || 'days');

  document.getElementById('drug-rows').innerHTML = '';
  (rx.drugs || []).forEach(drug => {
    addDrugRow();
    const id = drugRowId;
    setV(`dname-${id}`, drug.name || '');
    setV(`dgeneric-${id}`, drug.generic || '');
    setV(`dform-${id}`, drug.form || 'Tab.');
    setV(`ddose-${id}`, drug.dose || '');
    setV(`dfreq-${id}`, drug.freq || '');
    setV(`ddur-${id}`, drug.duration || '');
    setV(`dnotes-${id}`, drug.drugNotes || '');

    const tSel = document.getElementById(`dtiming-sel-${id}`);
    const customInp = document.getElementById(`dtiming-custom-${id}`);
    const stdOptions = ['After meal', 'Before meal', 'With meal', 'Empty stomach', 'At bedtime', 'None'];

    if (tSel) {
      if (!drug.timing) {
        tSel.value = 'None';
        if (customInp) customInp.classList.add('hidden');
      } else if (stdOptions.includes(drug.timing)) {
        tSel.value = drug.timing;
        if (customInp) customInp.classList.add('hidden');
      } else {
        tSel.value = 'Custom';
        if (customInp) {
          customInp.classList.remove('hidden');
          customInp.value = drug.timing;
        }
      }
    }
  });
  if (!(rx.drugs && rx.drugs.length)) addDrugRow();
}

// ── DOWNLOAD CRISP HD A4 IMAGE OF PRESCRIPTION ──
function downloadRxImage() {
  if (!state.currentRx) return;
  const el = document.getElementById('rx-a4');
  if (!el) return;

  toast('📷 Generating Crisp HD A4 Image...');

  if (typeof html2canvas === 'undefined') {
    toast('❌ html2canvas library not loaded');
    return;
  }

  const savedTransform = el.style.transform;
  const savedTransformOrigin = el.style.transformOrigin;

  el.style.transform = 'none';
  el.style.transformOrigin = 'initial';

  html2canvas(el, {
    scale: 3, // High DPI 300 DPI capture
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 794,
    height: Math.max(1123, el.offsetHeight)
  }).then(canvas => {
    el.style.transform = savedTransform;
    el.style.transformOrigin = savedTransformOrigin;

    const pName = (state.currentRx.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
    const date = state.currentRx.date || 'rx';
    const link = document.createElement('a');
    link.download = `Prescription_A4_${pName}_${date}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast('✅ HD A4 PNG Image Downloaded');
  }).catch(err => {
    el.style.transform = savedTransform;
    el.style.transformOrigin = savedTransformOrigin;
    console.error('Image render error:', err);
    toast('❌ Error rendering HD image');
  });
}

// ── A4 PREVIEW ZOOM SCALER FOR SMARTPHONES & DESKTOPS ──
function zoomRxPreview(delta) {
  const scaler = document.getElementById('rx-a4-scaler');
  const viewport = document.getElementById('rx-a4-viewport');
  const wrap = document.getElementById('rx-preview-wrap');
  if (!scaler || !viewport) return;

  const wrapW = wrap && wrap.clientWidth > 50 ? wrap.clientWidth : (window.innerWidth - 24);
  const modalBody = wrap ? wrap.closest('.modal-body') : null;
  const availH = modalBody && modalBody.clientHeight > 100 
    ? (modalBody.clientHeight - 60) 
    : Math.max(340, window.innerHeight - 220);

  const containerW = Math.max(260, wrapW - 24);

  if (delta === 0) {
    const scaleW = containerW / 794;
    const scaleH = availH / 1123;
    currentRxZoom = Math.min(scaleW, scaleH);
    currentRxZoom = Math.min(Math.max(0.25, currentRxZoom), 1.5);
  } else {
    currentRxZoom = Math.min(Math.max(0.2, currentRxZoom + delta), 2.5);
  }

  scaler.style.transform = `scale(${currentRxZoom})`;
  scaler.style.transformOrigin = 'top center';

  const scaledH = Math.round(1123 * currentRxZoom);
  const scaledW = Math.round(794 * currentRxZoom);

  viewport.style.height = `${scaledH + 10}px`;
  viewport.style.minWidth = currentRxZoom > (containerW / 794) ? `${scaledW}px` : '100%';
}

window.addEventListener('resize', () => {
  const modalPreview = document.getElementById('modal-rx-preview');
  if (modalPreview && !modalPreview.classList.contains('hidden')) {
    zoomRxPreview(0.0);
  }
});

// ── RENDER PRESCRIPTION (STRICT A4 FORMAT) ──
function renderRxHTML(rx) {
  const p = state.profile;
  const ps = state.padSettings;
  const patient = state.patients.find(x => x.id === rx.patientId) || {};
  const col = ps.color || '#1a3a5c';

  const headerAlign = ps.align || 'center';
  const leftW = ps.leftWidth || 165;
  const showGeneric = ps.showGenericNames;

  const headerHTML = `
    <div class="rx-header" style="text-align:${headerAlign}">
      <div class="rx-doc-name" style="color:${col}">${p.name || 'Doctor Name'}</div>
      <div class="rx-doc-quals">${p.qualifications || ''}</div>
      ${p.designation ? `<div class="rx-doc-quals">${p.designation}</div>` : ''}
      ${p.hospital ? `<div class="rx-doc-quals">${p.hospital}</div>` : ''}
      ${p.reg ? `<div class="rx-doc-quals" style="font-weight:800; color:${col}; margin-top:3px;">${p.reg}</div>` : ''}
    </div>
  `;

  const patientRowHTML = `
    <div class="rx-patient-row">
      <div class="rx-pfield"><strong>Name:</strong> ${patient.name || rx.patientName || '—'}</div>
      <div class="rx-pfield"><strong>Age:</strong> ${patient.age || '—'}</div>
      <div class="rx-pfield"><strong>Sex:</strong> ${patient.gender || '—'}</div>
      <div class="rx-pfield"><strong>Date:</strong> ${rx.date || '—'}</div>
    </div>
  `;

  const leftSections = `
    ${rx.complaints ? `<div><div class="rx-section-label" style="color:${col}">COMPLAINTS</div><div class="rx-section-content">${rx.complaints}</div></div>` : ''}
    ${rx.diagnosis ? `<div><div class="rx-section-label" style="color:${col}">DIAGNOSIS</div><div class="rx-section-content">${rx.diagnosis}</div></div>` : ''}
    ${(rx.history && ps.showHistory) ? `<div><div class="rx-section-label" style="color:${col}">HISTORY</div><div class="rx-section-content">${rx.history}</div></div>` : ''}
    ${(rx.findings && ps.showFindings) ? `<div><div class="rx-section-label" style="color:${col}">FINDINGS</div><div class="rx-section-content">${rx.findings}</div></div>` : ''}
    ${(rx.investigation && ps.showInvestigation) ? `<div><div class="rx-section-label" style="color:${col}">INVESTIGATION</div><div class="rx-section-content">${rx.investigation}</div></div>` : ''}
  `;

  // Prepend automatically the selected Medicine Type / Form (e.g. Tab., Cap., Syr., Inj., Supp.)
  const drugsHTML = (rx.drugs || []).map((d, i) => {
    let rawForm = (d.form || 'Tab.').trim();
    if (!rawForm.endsWith('.')) rawForm += '.';
    return `
      <div class="rx-drug-item">
        <div class="rx-drug-name">${i+1}. ${rawForm} ${d.name} ${d.dose ? '— ' + d.dose : ''}</div>
        ${(showGeneric && d.generic) ? `<div class="rx-drug-generic">(${d.generic})</div>` : ''}
        <div class="rx-drug-sig">${[d.freq, d.timing, d.duration].filter(Boolean).join(' · ')}</div>
        ${d.drugNotes ? `<div style="font-size:11.5px; color:#555; font-family:'DM Sans',sans-serif; margin-top:2px; font-style:italic;">📝 ${d.drugNotes}</div>` : ''}
      </div>
    `;
  }).join('');

  const followupHTML = (rx.followupDays && ps.showFollowup) ? `<div class="rx-followup" style="margin-top:16px; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700; color:${col};"><strong>Follow-up:</strong> After ${rx.followupDays} ${rx.followupUnit || 'days'}</div>` : '';
  const adviceHTML = (rx.advice && ps.showAdvice) ? `<div class="rx-advice-section" style="margin-top:16px;"><div class="rx-section-label" style="color:${col}">ADVICE / নির্দেশনা</div><div class="rx-section-content" style="font-size:13px; font-family:'DM Sans',sans-serif; color:#2d3748; line-height:1.55; white-space:pre-wrap; margin-top:4px;">${rx.advice}</div></div>` : '';
  const footerText = (p.footer || ps.footer || 'নিয়ম মাফিক ঔষধ খাবেন। ডাক্তারের পরামর্শ ব্যতীত ঔষধ পরিবর্তন নিষেধ।').trim();
  const footerHTML = footerText ? `<div class="rx-footer-container" style="border-top-color:${col};"><div class="rx-footer-note">${footerText}</div></div>` : '';

  const rxSymbolSVG = `
    <svg class="rx-symbol-svg" viewBox="14 15 34 38" width="28" height="32" fill="${col}" aria-label="Rx" role="img">
      <path d="M14.15,39V15.2H26.39a17.73,17.73,0,0,1,5.2.59A5.57,5.57,0,0,1,34.49,18a6.59,6.59,0,0,1,1.1,3.87,6.66,6.66,0,0,1-.84,3.41,6.29,6.29,0,0,1-4.6,3.17l4.74,7.87L39,29h8L39.59,40.47l8.09,12.26H39.41l-4.66-7.64-4.7,7.64h-8.2L30,40.34c-1-1.63-5.18-9.82-6.07-10.45a3.09,3.09,0,0,0-1.81-.54h-.64V39Zm7.37-14.11h3.1a11.79,11.79,0,0,0,1.95-.32,2,2,0,0,0,1.19-.75,2.42,2.42,0,0,0-.27-3.15A4.36,4.36,0,0,0,24.75,20H21.52v4.84Z"/>
    </svg>
  `;

  return `
    <div style="padding:24px 28px;">
      ${headerHTML}
      <hr class="rx-divider" style="border-top-color:${col}">
      ${patientRowHTML}
      <div class="rx-body" style="margin-top:12px">
        <div class="rx-left" style="width:${leftW}px">
          ${leftSections}
        </div>
        <div class="rx-right">
          <div class="rx-rx-title" style="color:${col}">${rxSymbolSVG}</div>
          ${drugsHTML}
          ${adviceHTML}
          ${followupHTML}
        </div>
      </div>
      ${footerHTML}
    </div>
  `;
}

function viewRx(id) {
  const rx = state.prescriptions.find(r => r.id === id);
  if (!rx) {
    toast('⚠️ Prescription details not found');
    return;
  }
  state.currentRx = rx;
  renderRxPreview(rx);
  openModal('modal-rx-preview');
  zoomRxPreview(0.0);
  setTimeout(() => zoomRxPreview(0.0), 50);
  setTimeout(() => zoomRxPreview(0.0), 200);
}

function renderRxPreview(rx) {
  const container = document.getElementById('rx-a4');
  if (container) container.innerHTML = renderRxHTML(rx);
}

function printPrescription() {
  if (!state.currentRx) return;
  const rxHTML = renderRxHTML(state.currentRx);
  const w = window.open('', '_blank');
  w.document.write(`
    <!DOCTYPE html><html><head><title>Prescription Print</title>
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <style>@page { size: A4; margin: 0; }</style>
    </head><body><div id="rx-a4">${rxHTML}</div></body></html>
  `);
  w.document.close();
  w.onload = () => { w.print(); };
}

// ── PATIENT MANAGEMENT ──
function renderPatients() {
  const grid = document.getElementById('patient-grid');
  if (!grid) return;
  if (state.patients.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="ico">👥</div><h3>No patients added yet</h3><p>Click "+ New Patient" to create your first patient profile.</p></div>';
    return;
  }

  grid.innerHTML = state.patients.map(p => `
    <div class="patient-card" onclick="openPatientHistory('${p.id}')">
      <div class="patient-card-top">
        <div class="patient-avatar ${p.gender === 'Female' ? 'female' : ''}">${p.name[0]}</div>
        <div class="patient-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="openRxModalForPatient('${p.id}')" title="New Prescription">➕ New Rx</button>
          <button class="btn btn-secondary btn-sm" onclick="editPatient('${p.id}')" title="Edit Profile">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePatient('${p.id}')" title="Delete Profile">🗑️ Delete</button>
        </div>
      </div>
      <div class="patient-name">${p.name}</div>
      <div class="patient-meta">
        <span class="patient-badge ${p.gender === 'Female' ? 'badge-f' : 'badge-m'}">${p.gender || '—'}</span>
        <span>Age: ${p.age || '—'}</span>
        ${p.bloodGroup ? `<span>🩸 ${p.bloodGroup}</span>` : ''}
      </div>
      ${p.phone ? `<div style="font-size:12px; color:var(--text-3); margin-top:4px">📞 ${p.phone}</div>` : ''}
    </div>
  `).join('');
}

function openPatientHistory(pid) {
  const p = state.patients.find(x => x.id === pid);
  if (!p) return;

  document.getElementById('phist-patient-name').textContent = p.name;
  document.getElementById('phist-patient-meta').textContent = `${p.gender || ''} · Age: ${p.age || '—'} ${p.phone ? '· 📞 ' + p.phone : ''}`;

  const addBtn = document.getElementById('phist-add-rx-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      closeModal('modal-patient-history');
      openRxModalForPatient(p.id);
    };
  }

  const patientRxList = state.prescriptions
    .filter(r => r.patientId === pid)
    .sort((a,b) => new Date(b.createdAt||b.date) - new Date(a.createdAt||a.date));

  const timelineContainer = document.getElementById('phist-rx-timeline');
  if (!timelineContainer) return;

  if (patientRxList.length === 0) {
    timelineContainer.innerHTML = '<div class="empty-state"><div class="ico">📋</div><h3>No prescriptions written yet</h3><p>Click "+ New Prescription" above to write the first prescription for this patient.</p></div>';
  } else {
    timelineContainer.innerHTML = patientRxList.map(rx => {
      const d = new Date(rx.date + 'T00:00');
      return `
        <div class="rx-history-item" onclick="viewRx('${rx.id}')">
          <div class="rx-date-badge">
            <div class="day">${d.getDate()}</div>
            <div class="mon">${d.toLocaleString('en',{month:'short'})}</div>
          </div>
          <div style="flex:1">
            <div style="font-weight:700; font-size:15px; color:var(--rx-blue)">${rx.date} — ${rx.visitType||'Visit'}</div>
            <div style="font-size:13px; color:var(--text); margin-top:2px">${rx.diagnosis ? '<strong>Diagnosis:</strong> ' + rx.diagnosis : ''}</div>
            <div class="text-muted">${rx.complaints ? 'Complaints: ' + rx.complaints.substring(0,60) + '...' : ''}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center" onclick="event.stopPropagation()">
            <button class="btn btn-secondary btn-sm" onclick="viewRx('${rx.id}')" title="View Prescription">👁️ View</button>
            <button class="btn btn-secondary btn-sm" onclick="editRxFromList('${rx.id}')" title="Edit Prescription">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRx('${rx.id}')" title="Delete Prescription">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  openModal('modal-patient-history');
}

function editPatient(pid) {
  const p = state.patients.find(x => x.id === pid);
  if (!p) return;
  state.editingPatientId = pid;
  setV('pname', p.name || '');
  setV('page', p.age || '');
  setV('pgender', p.gender || 'Male');
  setV('pblood', p.bloodGroup || '');
  setV('pphone', p.phone || '');
  setV('pallergies', p.allergies || '');
  openModal('modal-patient');
}

function deletePatient(pid) {
  const p = state.patients.find(x => x.id === pid);
  if (!p) return;

  const rxCount = state.prescriptions.filter(r => r.patientId === pid).length;
  const warningMsg = `⚠️ Are you sure you want to delete the profile for "${p.name}"?\n\nWarning: All ${rxCount} prescription(s) associated with this patient will also be permanently deleted!`;

  if (confirm(warningMsg)) {
    state.patients = state.patients.filter(x => x.id !== pid);
    state.prescriptions = state.prescriptions.filter(r => r.patientId !== pid);
    saveState();
    renderPatients();
    renderDashboard();
    renderAllRx();
    closeModal('modal-patient-history');
    scheduleCloudSync(true);
    toast('🗑️ Patient profile deleted');
  }
}

let isOpeningPatientFromRx = false;

function populateRxPatientSelect(selectedId = '') {
  const sel = document.getElementById('rx-patient-select');
  if (!sel) return;

  let optionsHTML = '';
  if (!selectedId) {
    optionsHTML += '<option value="" selected>-- Select Patient --</option>';
  }

  if (state.patients.length === 0) {
    optionsHTML += '<option value="">-- No Patients Registered --</option>';
  } else {
    optionsHTML += state.patients.map(p => 
      `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name} (${p.age || 'Age N/A'}) ${p.phone ? '· ' + p.phone : ''}</option>`
    ).join('');
  }

  optionsHTML += `<option value="__NEW_PATIENT__">➕ Add New Patient Profile...</option>`;
  sel.innerHTML = optionsHTML;
}

function checkRxPatientSelect(selectEl) {
  if (selectEl.value === '__NEW_PATIENT__') {
    openPatientModalFromRx();
  }
}

function openPatientModalFromRx() {
  isOpeningPatientFromRx = true;
  closeModal('modal-rx');
  openPatientModal();
}

function openPatientModal() {
  state.editingPatientId = null;
  ['pname','page','pgender','pblood','pphone','pallergies'].forEach(id => setV(id, ''));
  openModal('modal-patient');
}

function savePatient() {
  const name = v('pname').trim();
  if (!name) { toast('⚠️ Patient name is required'); return; }

  const now = Date.now();
  const existingPatient = state.editingPatientId ? state.patients.find(p => p.id === state.editingPatientId) : null;
  const patientData = {
    id: state.editingPatientId || uid(),
    name,
    age: v('page'),
    gender: v('pgender'),
    bloodGroup: v('pblood'),
    phone: v('pphone'),
    allergies: v('pallergies'),
    createdAt: existingPatient ? (existingPatient.createdAt || now) : now,
    updatedAt: now
  };

  if (state.editingPatientId) {
    const idx = state.patients.findIndex(p => p.id === state.editingPatientId);
    if (idx >= 0) state.patients[idx] = patientData;
  } else {
    state.patients.unshift(patientData);
  }

  saveState();
  closeModal('modal-patient');
  renderPatients();
  renderDashboard();
  scheduleCloudSync(true);
  toast('✅ Patient saved');

  if (isOpeningPatientFromRx) {
    isOpeningPatientFromRx = false;
    openModal('modal-rx');
    populateRxPatientSelect(patientData.id);
    saveRxDraft();
  }
}

function openRxModalForPatient(pid) {
  state.currentRx = null;
  openModal('modal-rx');
  populateRxPatientSelect(pid);

  const restored = restoreRxDraft();
  if (!restored) {
    clearRxForm();
  }
}

function clearRxForm() {
  ['rx-complaints','rx-diagnosis','rx-history','rx-findings','rx-investigation','rx-advice','rx-notes'].forEach(id => setV(id, ''));
  setV('rx-date', new Date().toISOString().split('T')[0]);
  setV('rx-visit', 'New Visit');
  document.getElementById('drug-rows').innerHTML = '';
  addDrugRow();
}

// ── DASHBOARD & STATS ──
function renderDashboard() {
  document.getElementById('stat-patients').textContent = state.patients.length;
  document.getElementById('stat-rx').textContent = state.prescriptions.length;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('stat-today').textContent = state.prescriptions.filter(r => r.date === today).length;
  const thisMonth = today.substring(0, 7);
  document.getElementById('stat-month').textContent = state.prescriptions.filter(r => r.date && r.date.startsWith(thisMonth)).length;

  const recent = [...state.prescriptions].sort((a,b) => new Date(b.createdAt||b.date) - new Date(a.createdAt||a.date)).slice(0, 5);
  const container = document.getElementById('recent-rx-list');
  if (!container) return;

  if (!recent.length) {
    container.innerHTML = '<p class="text-muted">No prescriptions yet. Click "+ New Prescription" to write one.</p>';
    return;
  }

  container.innerHTML = recent.map(rx => {
    const d = new Date(rx.date + 'T00:00');
    return `
      <div class="rx-history-item" onclick="viewRx('${rx.id}')">
        <div class="rx-date-badge">
          <div class="day">${d.getDate()}</div>
          <div class="mon">${d.toLocaleString('en',{month:'short'})}</div>
        </div>
        <div style="flex:1">
          <div style="font-weight:600; font-size:14.5px">${rx.patientName} — ${rx.visitType||'Visit'}</div>
          <div class="text-muted">${rx.complaints ? rx.complaints.substring(0,50) + '...' : ''}</div>
        </div>
        <div style="display:flex; gap:6px; align-items:center" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="viewRx('${rx.id}')" title="View Prescription">👁️ View</button>
          <button class="btn btn-secondary btn-sm" onclick="editRxFromList('${rx.id}')" title="Edit Prescription">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRx('${rx.id}')" title="Delete Prescription">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAllRx() {
  const list = document.getElementById('all-rx-list');
  if (!list) return;
  if (!state.prescriptions.length) {
    list.innerHTML = '<div class="empty-state"><div class="ico">📋</div><h3>No prescriptions saved</h3></div>';
    return;
  }

  const sorted = [...state.prescriptions].sort((a,b) => new Date(b.createdAt||b.date) - new Date(a.createdAt||a.date));

  list.innerHTML = sorted.map(rx => `
    <div class="rx-history-item" onclick="viewRx('${rx.id}')">
      <div style="flex:1">
        <div style="font-weight:700; font-size:15px">${rx.patientName}</div>
        <div class="text-muted">${rx.date} · ${rx.visitType||''}</div>
      </div>
      <div style="display:flex; gap:6px; align-items:center" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-sm" onclick="viewRx('${rx.id}')" title="View Prescription">👁️ View</button>
        <button class="btn btn-secondary btn-sm" onclick="editRxFromList('${rx.id}')" title="Edit Prescription">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRx('${rx.id}')" title="Delete Prescription">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

function editRxFromList(id) {
  const rx = state.prescriptions.find(r => r.id === id);
  if (!rx) return;
  state.currentRx = rx;
  closeModal('modal-patient-history');
  editCurrentRx();
}

function deleteRx(id) {
  if (confirm('Delete this prescription permanently?')) {
    state.prescriptions = state.prescriptions.filter(r => r.id !== id);
    saveState();
    renderAllRx();
    renderDashboard();
    scheduleCloudSync(true);
    toast('🗑️ Prescription deleted');
  }
}

// ── PROFILE & PAD DESIGN ──
function populateProfileForm() {
  const p = state.profile;
  setV('prof-name', p.name || '');
  setV('prof-quals', p.qualifications || '');
  setV('prof-desig', p.designation || '');
  setV('prof-hosp', p.hospital || '');
  setV('prof-reg', p.reg || '');
  setV('prof-phone', p.phone || '');
  setV('prof-hours', p.hours || '');
  setV('prof-address', p.address || '');
  setV('prof-footer', p.footer || 'নিয়ম মাফিক ঔষধ খাবেন। ডাক্তারের পরামর্শ ব্যতীত ঔষধ পরিবর্তন নিষেধ।');
}

function saveProfile() {
  state.profile.name = v('prof-name');
  state.profile.qualifications = v('prof-quals');
  state.profile.designation = v('prof-desig');
  state.profile.hospital = v('prof-hosp');
  state.profile.reg = v('prof-reg');
  state.profile.phone = v('prof-phone');
  state.profile.hours = v('prof-hours');
  state.profile.address = v('prof-address');
  state.profile.footer = v('prof-footer');
  state.padSettings.footer = v('prof-footer');
  state.profile.updatedAt = Date.now();

  saveState();
  scheduleCloudSync(true);
  toast('✅ Profile saved');
}

function initPadDesignSection() {
  const ps = state.padSettings;
  setV('pad-align', ps.align || 'center');
  setV('pad-left-width', ps.leftWidth || 165);
  setV('pad-color', ps.color || '#1a3a5c');
  setV('pad-footer', state.profile.footer || ps.footer || 'নিয়ম মাফিক ঔষধ খাবেন। ডাক্তারের পরামর্শ ব্যতীত ঔষধ পরিবর্তন নিষেধ।');
  const showGenEl = document.getElementById('show-generic');
  if (showGenEl) showGenEl.checked = !!ps.showGenericNames;

  updatePadPreview();
}

function updatePadPreview() {
  state.padSettings.align = v('pad-align');
  state.padSettings.leftWidth = parseInt(v('pad-left-width')) || 165;
  state.padSettings.color = v('pad-color');
  state.padSettings.footer = v('pad-footer');
  state.profile.footer = v('pad-footer');
  const showGenEl = document.getElementById('show-generic');
  if (showGenEl) state.padSettings.showGenericNames = showGenEl.checked;
  state.padSettings.updatedAt = Date.now();

  saveState();
  scheduleCloudSync(false);
}

// ── OFFLINE LOCAL BACKUP EXPORT & IMPORT ──
function exportBackupData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `prescribepro_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  toast('📥 Local backup file downloaded');
}

function importBackupData(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported && (imported.patients || imported.prescriptions)) {
        Object.assign(state, imported);
        saveState();
        scheduleCloudSync(true);
        location.reload();
      } else {
        toast('❌ Invalid backup JSON file structure');
      }
    } catch(err) {
      toast('❌ Error reading JSON backup file');
    }
  };
  reader.readAsText(file);
}

// ── HYBRID LOCAL-FIRST & GOOGLE CLOUD REAL-TIME SYNC ENGINE ──
let isSyncingCloud = false;
let cloudSyncDebounceTimer = null;

function updateDriveStatus(status, labelText) {
  const statusEl = document.getElementById('drive-status');
  if (!statusEl) return;
  if (status === 'synced' || status === true) {
    statusEl.innerHTML = `<div class="drive-dot" style="background:var(--success)"></div><span style="color:var(--success)">${labelText || 'Cloud Synced'}</span>`;
  } else if (status === 'syncing') {
    statusEl.innerHTML = `<div class="drive-dot" style="background:var(--accent)"></div><span style="color:var(--accent)">${labelText || 'Syncing…'}</span>`;
  } else if (status === 'error') {
    statusEl.innerHTML = `<div class="drive-dot" style="background:var(--danger)"></div><span style="color:var(--danger)">${labelText || 'Sync Error'}</span>`;
  } else {
    statusEl.innerHTML = `<div class="drive-dot" style="background:var(--warn)"></div><span style="color:var(--text-3)">${labelText || 'Cloud Offline'}</span>`;
  }
}

function scheduleCloudSync(immediate = false) {
  if (!googleAccessToken) return;

  if (immediate) {
    if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
    syncWithGoogleCloud();
    return;
  }

  if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
  cloudSyncDebounceTimer = setTimeout(() => {
    syncWithGoogleCloud();
  }, 1500);
}

function mergeState(local, cloud) {
  if (!cloud) return local;

  const merged = { ...local };

  // Merge Doctor Profile
  if (cloud.profile) {
    if (!merged.profile || (cloud.profile.updatedAt || 0) > (merged.profile.updatedAt || 0)) {
      merged.profile = { ...cloud.profile };
    }
  }

  // Merge Pad Settings
  if (cloud.padSettings) {
    if (!merged.padSettings || (cloud.padSettings.updatedAt || 0) > (merged.padSettings.updatedAt || 0)) {
      merged.padSettings = { ...cloud.padSettings };
    }
  }

  // Merge Patient Profiles (by ID)
  const patientMap = new Map();
  (merged.patients || []).forEach(p => patientMap.set(p.id, p));
  (cloud.patients || []).forEach(p => {
    const existing = patientMap.get(p.id);
    if (!existing || (p.updatedAt || 0) > (existing.updatedAt || 0)) {
      patientMap.set(p.id, p);
    }
  });
  merged.patients = Array.from(patientMap.values());

  // Merge Prescriptions (by ID)
  const rxMap = new Map();
  (merged.prescriptions || []).forEach(r => rxMap.set(r.id, r));
  (cloud.prescriptions || []).forEach(r => {
    const existing = rxMap.get(r.id);
    if (!existing || (r.updatedAt || 0) > (existing.updatedAt || 0)) {
      rxMap.set(r.id, r);
    }
  });
  merged.prescriptions = Array.from(rxMap.values());

  return merged;
}

async function syncWithGoogleCloud(showToast = false) {
  if (state.loginMethod !== 'google' && !googleAccessToken) {
    updateDriveStatus('offline');
    if (showToast) toast('⚠️ Sign in with Google to enable Cloud Sync');
    return;
  }

  // Auto-refresh Google access token silently if expired or expiring within 5 minutes
  if (!googleAccessToken || (googleTokenExpiry && Date.now() > googleTokenExpiry - 300000)) {
    updateDriveStatus('syncing', 'Refreshing Token…');
    const refreshed = await refreshGoogleTokenSilently();
    if (!refreshed && !googleAccessToken) {
      updateDriveStatus('offline', 'Drive Offline');
      if (showToast) toast('⚠️ Cloud sync offline. Click ☁️ to re-authorize.');
      return;
    }
  }

  if (isSyncingCloud) return;
  isSyncingCloud = true;
  updateDriveStatus('syncing');

  try {
    // 1. Search Google Drive AppData folder for prescribepro_cloud_db.json
    const searchUrl = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='prescribepro_cloud_db.json'&fields=files(id,name,modifiedTime)";
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });

    if (!searchRes.ok) {
      throw new Error(`Drive search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

    let cloudData = null;

    if (existingFile) {
      // Download current Cloud data
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
      const dlRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      if (dlRes.ok) {
        try { cloudData = await dlRes.json(); } catch(e) { console.warn('Cloud parse error:', e); }
      }
    }

    // 2. Perform Smart State Merge
    if (cloudData) {
      const merged = mergeState(state, cloudData);
      Object.assign(state, merged);
      saveState();
    }

    // 3. Prepare payload for Cloud Upload
    state.lastSyncedTimestamp = Date.now();
    const payload = {
      version: '2.0',
      updatedAt: Date.now(),
      user: state.user,
      profile: state.profile,
      padSettings: state.padSettings,
      patients: state.patients,
      prescriptions: state.prescriptions
    };

    const payloadStr = JSON.stringify(payload, null, 2);

    if (existingFile) {
      // Patch existing file
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const upRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: payloadStr
      });
      if (!upRes.ok) throw new Error(`Cloud update failed: ${upRes.statusText}`);
    } else {
      // Create new file in appDataFolder
      const metadata = {
        name: 'prescribepro_cloud_db.json',
        parents: ['appDataFolder']
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([payloadStr], { type: 'application/json' }));

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${googleAccessToken}` },
        body: form
      });
      if (!createRes.ok) throw new Error(`Cloud create failed: ${createRes.statusText}`);
    }

    // 4. Refresh UI displays
    renderDashboard();
    renderPatients();
    renderAllRx();
    populateProfileForm();

    updateDriveStatus('synced');
    if (showToast) toast('☁️ Google Cloud sync complete!');
  } catch (err) {
    console.error('Cloud Sync error:', err);
    updateDriveStatus('error');
    if (showToast) toast('❌ Cloud Sync failed: ' + err.message);
  } finally {
    isSyncingCloud = false;
  }
}

// ── HELPERS ──
function v(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setV(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 6); }
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
  if (id === 'modal-patient' && isOpeningPatientFromRx) {
    isOpeningPatientFromRx = false;
    openModal('modal-rx');
    populateRxPatientSelect(v('rx-patient-select'));
  }
}

function toast(msg, dur = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}