// app.js
// Router e logica dell’interfaccia per il sito Torneo Cremesi

import { loadAppState, saveAppState, exportAll, importAll, loadOC, saveOC } from './store.js';
import { TC_DATA, STATS } from './data.js';

/*
  Router
  Definisce il mapping hash→template. Quando cambia l’hash (#/avvio, etc.),
  viene cercato il template e renderizzato in #app. Alcune viste necessitano
  inizializzazioni speciali (scheda, tracker, oggetti).
*/
const appEl = document.getElementById('app');
const bodyEl = document.body;
const sidebarEl = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const navLinks = Array.from(document.querySelectorAll('.sidebar nav a'));
const mobileQuery = window.matchMedia('(max-width: 900px)');

const routes = {
  '/avvio': 'view-avvio',
  '/ambientazione': 'view-ambientazione',
  '/regole': 'view-regole',
  '/oggetti': 'view-oggetti',
  '/scheda': 'view-scheda',
  '/tracker': 'view-tracker',
};

const isMobile = () => mobileQuery.matches;

function updateSidebarToggleLabel(){
  if(!sidebarToggle) return;
  const isOpen = bodyEl.classList.contains('sidebar-open') && isMobile();
  sidebarToggle.setAttribute('aria-label', isOpen ? 'Chiudi navigazione principale' : 'Apri navigazione principale');
  const icon = sidebarToggle.querySelector('.sidebar-toggle__icon');
  const label = sidebarToggle.querySelector('.sidebar-toggle__label');
  if(icon) icon.textContent = isOpen ? '✕' : '☰';
  if(label) label.textContent = isOpen ? 'Chiudi' : 'Menu';
}

function syncSidebarState(){
  if(!sidebarEl) return;
  if(!isMobile()){
    sidebarEl.setAttribute('aria-hidden', 'false');
    sidebarToggle?.setAttribute('aria-expanded', 'false');
    bodyEl.classList.remove('sidebar-open');
    updateSidebarToggleLabel();
    return;
  }
  const isOpen = bodyEl.classList.contains('sidebar-open');
  sidebarEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  sidebarToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  updateSidebarToggleLabel();
}

function openSidebar(){
  if(!isMobile()) return;
  bodyEl.classList.add('sidebar-open');
  syncSidebarState();
  navLinks[0]?.focus();
}

function closeSidebar({ restoreFocus = true } = {}){
  if(!isMobile()) return;
  if(!bodyEl.classList.contains('sidebar-open')){
    syncSidebarState();
    return;
  }
  bodyEl.classList.remove('sidebar-open');
  syncSidebarState();
  if(restoreFocus) sidebarToggle?.focus();
}

function toggleSidebar(){
  if(!sidebarToggle || !isMobile()) return;
  if(bodyEl.classList.contains('sidebar-open')) closeSidebar({ restoreFocus: false });
  else openSidebar();
}

sidebarToggle?.addEventListener('click', toggleSidebar);
navLinks.forEach(link => link.addEventListener('click', () => {
  if(isMobile()) closeSidebar({ restoreFocus: false });
}));

document.addEventListener('click', evt => {
  if(!isMobile() || !bodyEl.classList.contains('sidebar-open')) return;
  if(sidebarEl?.contains(evt.target) || evt.target === sidebarToggle) return;
  closeSidebar();
});

document.addEventListener('keydown', evt => {
  if(evt.key === 'Escape' && bodyEl.classList.contains('sidebar-open')){
    closeSidebar();
  }
});

const handleViewportChange = () => {
  if(!isMobile()){
    bodyEl.classList.remove('sidebar-open');
  }
  syncSidebarState();
};

if(typeof mobileQuery.addEventListener === 'function'){
  mobileQuery.addEventListener('change', handleViewportChange);
} else if(typeof mobileQuery.addListener === 'function'){
  mobileQuery.addListener(handleViewportChange);
}

syncSidebarState();

function render(route){
  const tplId = routes[route] || routes['/avvio'];
  const tpl = document.getElementById(tplId);
  if(!tpl || !appEl) return;
  appEl.innerHTML = tpl.innerHTML;
  afterRender(route);
  highlightActive(route);
  focusMainHeading();
  closeSidebar({ restoreFocus: false });
  syncSidebarState();
}

function highlightActive(route){
  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${route}`);
  });
}

function focusMainHeading(){
  if(!appEl) return;
  const heading = appEl.querySelector('h1');
  if(heading){
    heading.setAttribute('tabindex', '-1');
    heading.focus();
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  } else {
    appEl.focus();
  }
}

function afterRender(route){
  switch(route){
    case '/scheda': initScheda(); break;
    case '/tracker': initTracker(); break;
    case '/oggetti': initOggetti(); break;
    default: break;
  }
}

// Eventi di navigazione: cambio hash
window.addEventListener('hashchange', ()=>{
  const route = location.hash.replace('#','');
  render(route);
});

// Pulsanti globali (sidebar)
document.getElementById('btnExportJSON').onclick = exportAll;
document.getElementById('btnImportJSON').onclick = () => {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json';
  inp.onchange = () => importAll(inp.files[0], ok => location.reload());
  inp.click();
};
document.getElementById('btnPrint').onclick = () => window.print();

// Carica la vista iniziale
if(!location.hash) location.hash = '#/avvio';
render(location.hash.replace('#',''));

/*
  Gestione Scheda (parte B)
  Salva/Carica dati, costruisci tabelle e selettori TC, oggetti custom.
*/
let state = loadAppState();
const COIN_KEYS = ['pp','gp','sp','cp'];

function initScheda(){
  const container = document.getElementById('app');
  const autoFields = container ? Array.from(container.querySelectorAll('[data-field]')) : [];
  const handledKeys = new Set();

  const bindField = (el, key) => {
    if(!el || !key) return;
    handledKeys.add(key);
    const baseValue = el.defaultValue ?? el.value ?? '';
    if(state[key] != null){
      el.value = state[key];
    } else if(baseValue !== ''){
      el.value = baseValue;
    }
    const persist = debounce(() => {
      state[key] = el.value;
      saveAppState(state);
    }, 250);
    el.addEventListener('input', persist);
    if(el.tagName === 'SELECT'){
      el.addEventListener('change', persist);
    }
  };

  autoFields.forEach(el => {
    const key = el.dataset.field || el.id;
    bindField(el, key);
  });

  const legacyIds = [
    'nome','razzaClassi','livello','allineamento','taglia','altezza',
    'palette','motto','imgUrl','descrizione',
    'talenti','tratti','difetti','pf','ca','ts','bab','cmbcmd','iniziativa','velocita',
    'skills','loadout','altro','budget','pp','gp','sp','cp',
    'customTema','customCosto','customTrigger','customSinergie',
    'profArmiSemplici','profArmiSempliciFonte','profArmiMarziali','profArmiMarzialiFonte','profArmiEsotiche','profArmiEsoticheFonte',
    'profArmatureLeggere','profArmatureLeggereFonte','profArmatureMedie','profArmatureMedieFonte','profArmaturePesanti','profArmaturePesantiFonte',
    'profScudi','profScudiFonte','profScudiPesanti','profScudiPesantiFonte','profScudiTorre','profScudiTorreFonte','profCategorieExtra',
    'riassRazza','riassClassi','riassMovimento','riassSensi','riassRD','riassCapacita',
    'background'
  ];
  legacyIds
    .filter(key => !handledKeys.has(key))
    .forEach(key => bindField(document.getElementById(key), key));

  migrateLegacyValute();
  // Stats
  buildStats();
  // Tabelle
  buildAtkTable();
  buildSpellTable();
  const btnAddAtkRow = document.getElementById('btnAddAtkRow');
  if(btnAddAtkRow){
    btnAddAtkRow.addEventListener('click', () => {
      addRow('atkTable');
      saveTables();
    });
  }
  // TC selector e auto-fill
  buildTCSelect();
  // Oggetti custom picker
  buildOCPicker();
}

function migrateLegacyValute(){
  if(!state.valute) return;
  const hasNewValues = COIN_KEYS.some(key => state[key] != null && state[key] !== '');
  if(hasNewValues) return;
  const parsed = parseLegacyValute(state.valute);
  let touched = false;
  const container = document.getElementById('app');
  COIN_KEYS.forEach(key => {
    const val = parsed[key];
    if(val == null) return;
    const el = document.getElementById(key) || container?.querySelector(`[data-field="${key}"]`);
    if(el && !el.value){
      el.value = val;
    }
    state[key] = val;
    touched = true;
  });
  if(touched) saveAppState(state);
}

function parseLegacyValute(str){
  const out = {};
  if(typeof str !== 'string') return out;
  COIN_KEYS.forEach(key => {
    const match = str.match(new RegExp(`${key.toUpperCase()}\s*([0-9.,+-]+)`, 'i'));
    if(match) out[key] = match[1].trim();
  });
  return out;
}

function buildStats(){
  const tb = document.getElementById('statsBody');
  tb.innerHTML = '';
  STATS.forEach(stat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${stat}</b></td><td><input id="stat_${stat}_val"></td><td><input id="stat_${stat}_mod"></td>`;
    tb.appendChild(tr);
    // recupera e salva
    const valEl = document.getElementById(`stat_${stat}_val`);
    const modEl = document.getElementById(`stat_${stat}_mod`);
    valEl.value = state[`stat_${stat}_val`] ?? '';
    modEl.value = state[`stat_${stat}_mod`] ?? '';
    [valEl, modEl].forEach(el => {
      el.addEventListener('input', debounce(() => {
        state[el.id] = el.value;
        saveAppState(state);
      }, 250));
    });
  });
}

function buildAtkTable(){
  const tb = document.getElementById('atkTable');
  tb.innerHTML = '';
  const rows = state.attacchi || [];
  if(!rows.length) addRow('atkTable'); else rows.forEach(r => addRow('atkTable', r));
  tb.addEventListener('input', debounce(saveTables, 250));
}

function buildSpellTable(){
  const rows = document.getElementById('spellTable').rows;
  (state.spells || []).forEach((row,i) => {
    if(rows[i]){
      rows[i].cells[1].innerText = row[1] || '';
      rows[i].cells[2].innerText = row[2] || '';
      rows[i].cells[3].innerText = row[3] || '';
    }
  });
  document.getElementById('spellTable').addEventListener('input', debounce(saveTables, 250));
}

function saveTables(){
  const atkTable = document.getElementById('atkTable');
  const spellTable = document.getElementById('spellTable');
  if(!atkTable || !spellTable) return;
  // Attacchi
  const atkRows = [...atkTable.rows].map(r=>[...r.cells].map(c=>c.innerText));
  state.attacchi = atkRows;
  // Spells
  const spellRows = [...spellTable.rows].map(r=>[...r.cells].map(c=>c.innerText));
  state.spells = spellRows;
  saveAppState(state);
}

export function addRow(tableId, data){
  const tb = document.getElementById(tableId);
  const tr = document.createElement('tr');
  if(tableId === 'partyTable'){
    tr.innerHTML = `<td contenteditable>${data?.[0]||''}</td><td contenteditable>${data?.[1]||''}</td><td contenteditable>${data?.[2]||''}</td><td contenteditable>${data?.[3]||''}</td><td contenteditable>${data?.[4]||''}</td>`;
  } else if(tableId === 'atkTable'){
    tr.innerHTML = `<td contenteditable>${data?.[0]||''}</td><td contenteditable>${data?.[1]||''}</td><td contenteditable>${data?.[2]||''}</td><td contenteditable>${data?.[3]||''}</td><td contenteditable>${data?.[4]||''}</td><td contenteditable>${data?.[5]||''}</td>`;
  }
  tb.appendChild(tr);
}

function buildTCSelect(){
  const sel = document.getElementById('tcSelect');
  if(!sel) return;
  sel.innerHTML = `<option value="">— seleziona TC —</option>` + Object.entries(TC_DATA).map(([code,info])=>`<option value="${code}">${code} — ${info.title}</option>`).join('');
  if(state.tc) sel.value = state.tc;
  applyTC(sel.value);
  sel.onchange = () => {
    state.tc = sel.value;
    saveAppState(state);
    applyTC(sel.value);
  };
}

function applyTC(code){
  const info = TC_DATA[code] || null;
  const codeEl = document.getElementById('tcCode');
  const titleEl = document.getElementById('tcTitle');
  const narrEl = document.getElementById('tcNarr');
  const rawList = document.getElementById('tcRaw');
  if(!codeEl) return; // non in questa vista
  codeEl.value = code || '';
  titleEl.value = info?.title || '';
  narrEl.value = info?.narr || '';
  rawList.innerHTML = '';
  (info?.raw || []).forEach(r => {
    const li = document.createElement('li'); li.textContent = r; rawList.appendChild(li);
  });
}

function buildOCPicker(){
  const picker = document.getElementById('ocPicker');
  if(!picker) return;
  const list = loadOC();
  picker.innerHTML = `<option value="">— nessuno —</option>` + list.map((o,i)=>`<option value="${i}">${o.nome}</option>`).join('');
  if(state.ocIndex != null && list[state.ocIndex]) picker.value = state.ocIndex;
  else {
    picker.value = '';
    if(state.ocIndex != null){
      state.ocIndex = null;
      saveAppState(state);
    }
  }
  picker.onchange = () => {
    if(picker.value === ''){
      state.ocIndex = null;
      saveAppState(state);
      return;
    }
    const idx = parseInt(picker.value,10);
    const oc = loadOC()[idx];
    if(!oc) return;
    document.getElementById('customTrigger').value = oc.azioni || '';
    document.getElementById('customCosto').value   = oc.prezzo ?? '';
    document.getElementById('customTema').value    = `${oc.slot || '—'} • LI ${oc.li || '—'} • ${oc.rarita || '—'}`;
    state.customTrigger = oc.azioni || '';
    state.customCosto   = oc.prezzo ?? '';
    state.customTema    = document.getElementById('customTema').value;
    state.ocIndex = idx;
    saveAppState(state);
  };
  if(picker.value !== '') picker.dispatchEvent(new Event('change'));
}

/*
  Tracker: inizializza i campi e tabelle
*/
function initTracker(){
  const fields = ['pa','paNow','registro','cicFis','cicPsy','malusCorr'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    el.value = state[id] ?? el.value ?? '';
    el.addEventListener('input', debounce(()=>{
      state[id] = el.value;
      saveAppState(state);
    }, 200));
  });
  // Mini tracker party
  const tb = document.getElementById('partyTable');
  tb.innerHTML = '';
  (state.party || []).forEach(row => addRow('partyTable', row));
  const syncParty = () => {
    state.party = [...tb.rows].map(r=>[...r.cells].map(c=>c.innerText));
    saveAppState(state);
  };
  const debouncedSyncParty = debounce(syncParty, 250);
  tb.addEventListener('input', debouncedSyncParty);
  const btnAddPartyRow = document.getElementById('btnAddPartyRow');
  if(btnAddPartyRow){
    btnAddPartyRow.addEventListener('click', () => {
      addRow('partyTable',['',' ',' / ','','']);
      syncParty();
    });
  }
}

/*
  Oggetti custom: gestione catalogo
*/
let ocSelectionIndex = null;

function initOggetti(){
  document.getElementById('btnNewOC').onclick = () => { ocSelectionIndex = null; fillOCForm({}); };
  document.getElementById('btnSeedOC').onclick = loadOCSeed;
  document.getElementById('btnSaveOC').onclick = saveCurrentOC;
  document.getElementById('btnDeleteOC').onclick = deleteCurrentOC;
  document.getElementById('ocSearch').addEventListener('input', debounce(renderOCTable, 200));
  renderOCTable();
}

function renderOCTable(){
  const searchField = document.getElementById('ocSearch');
  const q = (searchField?.value || '').toLowerCase();
  const table = document.getElementById('ocTable');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  const ocList = loadOC();
  const list = ocList.map((o,idx) => ({...o, idx}));
  const filtered = list.filter(o => {
    return [o.nome,o.slot,o.rarita,o.effetto].filter(Boolean).some(s => (s+"").toLowerCase().includes(q));
  });
  tbody.innerHTML = '';
  filtered.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${o.nome||''}</td><td>${o.slot||'—'}</td><td>${o.li||'—'}</td><td>${o.prezzo||'—'}</td><td>${o.rarita||'—'}</td><td><button class="btn" data-idx="${o.idx}">Modifica</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-idx]').forEach(btn => {
    btn.onclick = () => {
      ocSelectionIndex = parseInt(btn.getAttribute('data-idx'),10);
      const item = loadOC()[ocSelectionIndex];
      item ? fillOCForm(item) : fillOCForm({});
    };
  });
  if(ocSelectionIndex != null){
    const current = ocList[ocSelectionIndex];
    if(current) fillOCForm(current);
    else ocSelectionIndex = null;
  }
}

function fillOCForm(o){
  document.getElementById('ocNome').value     = o.nome||'';
  document.getElementById('ocSlot').value     = o.slot||'';
  document.getElementById('ocLI').value       = o.li||'';
  document.getElementById('ocPrezzo').value   = o.prezzo||'';
  document.getElementById('ocRarita').value   = o.rarita||'Comune';
  document.getElementById('ocHR').value       = o.hr?'Sì':'No';
  document.getElementById('ocAzioni').value   = o.azioni||'';
  document.getElementById('ocTS').value       = o.ts||'';
  document.getElementById('ocEffetto').value  = o.effetto||'';
  document.getElementById('ocDettagli').value = (o.dettagli||[]).map(x=>'- '+x).join('\n');
  document.getElementById('ocStatus').textContent = ocSelectionIndex == null ? 'Nuovo oggetto…' : `Modifica #${ocSelectionIndex+1}`;
}

async function loadOCSeed(){
  try {
    const res = await fetch('data/oggetti_custom.seed.json');
    const defaults = await res.json();
    const cur = loadOC();
    saveOC([...cur, ...defaults]);
    renderOCTable();
    document.getElementById('ocStatus').textContent = `Aggiunti ${defaults.length} esempi.`;
  } catch(e) {
    console.error('Errore nel caricamento degli esempi', e);
  }
}

function saveCurrentOC(){
  const list = loadOC();
  const item = {
    nome: document.getElementById('ocNome').value.trim(),
    slot: document.getElementById('ocSlot').value.trim(),
    li: parseInt(document.getElementById('ocLI').value || '0',10) || null,
    prezzo: parseInt(document.getElementById('ocPrezzo').value || '0',10) || null,
    rarita: document.getElementById('ocRarita').value,
    hr: document.getElementById('ocHR').value === 'Sì',
    azioni: document.getElementById('ocAzioni').value.trim(),
    ts: document.getElementById('ocTS').value.trim(),
    effetto: document.getElementById('ocEffetto').value.trim(),
    dettagli: document.getElementById('ocDettagli').value.split('\n').map(s=>s.replace(/^\-\s?/,'').trim()).filter(Boolean)
  };
  if(!item.nome){ document.getElementById('ocStatus').textContent = 'Inserisci un nome.'; return; }
  if(ocSelectionIndex == null) list.push(item); else list[ocSelectionIndex] = item;
  saveOC(list);
  document.getElementById('ocStatus').textContent = 'Salvato.';
  renderOCTable();
}

function deleteCurrentOC(){
  if(ocSelectionIndex == null){ fillOCForm({}); document.getElementById('ocStatus').textContent = ''; return; }
  const list = loadOC();
  list.splice(ocSelectionIndex,1);
  saveOC(list);
  ocSelectionIndex = null;
  fillOCForm({});
  renderOCTable();
}

// Utility: debounce
function debounce(fn, ms){ let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); }; }
