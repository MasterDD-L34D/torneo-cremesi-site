// app.js
// Router e logica dell’interfaccia per il sito Torneo Cremesi

import { loadAppState, saveAppState, exportAll, importAll, loadOC, saveOC } from './store.js';
import { TC_DATA, STATS, ALIGNMENTS, AGE_STAGES } from './data.js';
import { ensureAllRuleVariants, getRuleVariant, formatAbpSummary } from './rules.js';
import { getRaces, getClasses, getTraitsAndDrawbacks } from './aon.js';

/*
  Stato applicativo condiviso
  Queste variabili devono essere inizializzate prima di render() perché il
  routing può subito portare alla scheda (es. caricando #/scheda direttamente).
*/
let state = loadAppState();
const COIN_KEYS = ['pp','gp','sp','cp'];
let fieldBindings = new Map();
let raceCatalog = [];
let classCatalog = [];
let traitCatalog = { traits: [], drawbacks: [] };
let raceCatalogLoaded = false;
let classCatalogLoaded = false;
let traitCatalogLoaded = false;
let raceCatalogPromise = null;
let classCatalogPromise = null;
let traitCatalogPromise = null;
let schedaMenusPromise = null;
const SIZE_ORDER = ['Minuscola','Piccola','Media','Grande','Enorme','Mastodontica'];
const ARRAY_FIELD = 'array';
const ABP_FALLBACK_ORDER = ['potency','resilience','resistance','deflection','ability'];
const ruleDataReady = ensureAllRuleVariants()
  .catch(err => {
    console.error('[Regole] Impossibile caricare i dataset EITR/ABP.', err);
    return null;
  })
  .then(() => {
    try {
      updateRuleSummary();
    } catch (err) {
      console.error('[Scheda] Impossibile aggiornare il riepilogo regole dopo il caricamento.', err);
    }
  });

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
    const isActive = a.getAttribute('href') === `#${route}`;
    a.classList.toggle('active', isActive);
    if(isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
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

function initSharedMenus(){
  buildTCSelect();
  setupAlignmentSelect();
  setupAgeStageSelect();
  buildOCPicker();
  if(hasSchedaMenus()){
    hydrateSchedaMenus().catch(err => console.error('[Scheda] Impossibile popolare i menù dinamici.', err));
  }
}

function afterRender(route){
  initSharedMenus();
  switch(route){
    case '/scheda': initScheda(); break;
    case '/tracker': initTracker(); break;
    case '/oggetti': initOggetti(); break;
    case '/regole': renderRulesPage(); break;
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

function toArray(value){
  if(Array.isArray(value)) return value;
  if(value == null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function registerBinding(key, el){
  if(!fieldBindings.has(key)) fieldBindings.set(key, new Set());
  fieldBindings.get(key).add(el);
}

function setElementValue(el, value){
  if(!el) return;
  if(el.dataset.fieldType === ARRAY_FIELD){
    const values = toArray(value);
    Array.from(el.options || []).forEach(opt => {
      opt.selected = values.includes(opt.value);
    });
    return;
  }
  if(el.type === 'checkbox'){
    el.checked = value === true || value === 'true';
    return;
  }
  if(value == null){
    el.value = '';
    return;
  }
  el.value = value;
}

function getElementValue(el){
  if(el.dataset.fieldType === ARRAY_FIELD){
    return Array.from(el.selectedOptions || []).map(opt => opt.value);
  }
  if(el.type === 'checkbox'){
    return !!el.checked;
  }
  return el.value;
}

function restoreFieldValue(key){
  const els = fieldBindings.get(key);
  if(!els) return;
  const value = state[key];
  els.forEach(el => setElementValue(el, value));
}

function syncBoundFields(key, origin){
  const els = fieldBindings.get(key);
  if(!els) return;
  const value = getElementValue(origin);
  els.forEach(el => {
    if(el === origin) return;
    setElementValue(el, value);
  });
}

function updateComputedField(key, value){
  if(state[key] === value) return;
  state[key] = value;
  restoreFieldValue(key);
}

const getStateValue = key => state[key];

function initScheda(){
  fieldBindings = new Map();
  const container = document.getElementById('app');
  const autoFields = container ? Array.from(container.querySelectorAll('[data-field]')) : [];
  const handledKeys = new Set();

  state.toggleEitr = state.toggleEitr ?? true;
  state.toggleAbp = state.toggleAbp ?? true;
  state.raceAltTraits = toArray(state.raceAltTraits ?? []);
  state.archetypes = toArray(state.archetypes ?? []);
  state.traitsList = toArray(state.traitsList ?? []);
  state.drawbackList = toArray(state.drawbackList ?? []);
  state.tagliaManual = state.tagliaManual ?? false;

  const bindField = (el, key) => {
    if(!el || !key) return;
    handledKeys.add(key);
    registerBinding(key, el);
    if(state[key] != null){
      setElementValue(el, state[key]);
    } else if(el.dataset.fieldType === ARRAY_FIELD){
      state[key] = [];
      setElementValue(el, []);
    } else if(el.type === 'checkbox'){
      state[key] = el.checked;
    } else {
      const baseValue = el.defaultValue ?? el.value ?? '';
      if(baseValue !== ''){
        state[key] = baseValue;
      }
    }
    const persist = debounce(() => {
      const value = getElementValue(el);
      state[key] = value;
      syncBoundFields(key, el);
      handleFieldUpdate(key, value, el);
      saveAppState(state);
    }, 250);
    el.addEventListener('input', persist);
    if(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio'){
      el.addEventListener('change', persist);
    }
  };

  autoFields.forEach(el => {
    const key = el.dataset.field || el.id;
    bindField(el, key);
  });

  const legacyIds = [
    'nome','razzaClassiSynth','livello','allineamentoSynth','tagliaSintesi','misureSintesi',
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
  setupSchedaTabs();
  initSchedaGenerali();
  updateAlignmentSummary();
  updateRuleSummary();
  updateAnagraficaSummary();
  updateMisureSummary();
  updateRazzaClassiSummary();
  updateTraitNotes();
  updateDrawbackNotes();

  buildStats();
  buildAtkTable();
  buildSpellTable();
  const btnAddAtkRow = document.getElementById('btnAddAtkRow');
  if(btnAddAtkRow){
    btnAddAtkRow.addEventListener('click', () => {
      addRow('atkTable');
      saveTables();
    });
  }
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
  const selects = Array.from(document.querySelectorAll('select[data-tc-select]'));
  if(!selects.length) return;
  const options = `<option value="">— seleziona TC —</option>` + Object.entries(TC_DATA).map(([code, info]) => `<option value="${code}">${code} — ${info.title}</option>`).join('');
  selects.forEach(sel => {
    sel.innerHTML = options;
    if(state.tc) sel.value = state.tc;
    sel.onchange = () => {
      const value = sel.value;
      state.tc = value;
      selects.forEach(other => { if(other !== sel) other.value = value; });
      applyTC(value);
      saveAppState(state);
    };
  });
  applyTC(state.tc || selects[0].value || '');
}

function applyTC(code){
  const info = TC_DATA[code] || null;
  document.querySelectorAll('[data-tc-code]').forEach(el => {
    if('value' in el) el.value = code || '';
    else el.textContent = code || '';
  });
  document.querySelectorAll('[data-tc-title]').forEach(el => {
    if('value' in el) el.value = info?.title || '';
    else el.textContent = info?.title || '';
  });
  document.querySelectorAll('[data-tc-narr]').forEach(el => {
    if('value' in el) el.value = info?.narr || '';
    else el.textContent = info?.narr || '';
  });
  document.querySelectorAll('[data-tc-raw]').forEach(el => {
    el.innerHTML = '';
    (info?.raw || []).forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      el.appendChild(li);
    });
  });
  document.querySelectorAll('select[data-tc-select]').forEach(sel => {
    if(sel.value !== code) sel.value = code || '';
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

function renderRulesPage(){
  ruleDataReady.then(() => {
    renderEitrRules();
    renderAbpSection();
  });
}

function renderEitrRules(){
  const data = getRuleVariant('eitr');
  const loading = !data;
  const summaryEl = document.querySelector('[data-eitr-summary]');
  if(summaryEl){
    if(loading){
      summaryEl.innerHTML = '<li>Dati EITR in caricamento…</li>';
    } else {
      summaryEl.innerHTML = (data.summary || []).map(line => `<li>${line}</li>`).join('');
    }
  }
  const freeEl = document.querySelector('[data-eitr-free]');
  if(freeEl){
    if(loading){
      freeEl.innerHTML = '<li>Dati EITR in caricamento…</li>';
    } else {
      freeEl.innerHTML = (data.freeFeats || []).map(item => `<li><b>${item.name}</b>: ${item.detail}</li>`).join('');
    }
  }
  const adjustedEl = document.querySelector('[data-eitr-adjusted]');
  if(adjustedEl){
    if(loading){
      adjustedEl.innerHTML = '<li>Dati EITR in caricamento…</li>';
    } else {
      adjustedEl.innerHTML = (data.adjustedFeats || []).map(item => `<li><b>${item.name}</b>: ${item.detail}</li>`).join('');
    }
  }
  const classEl = document.querySelector('[data-eitr-classes]');
  if(classEl){
    if(loading){
      classEl.innerHTML = '<li>Dati EITR in caricamento…</li>';
    } else {
      const classes = (data.classAdjustments || []).map(entry => {
        const changes = (entry.changes || []).map(change => `<li>${change}</li>`).join('');
        return `<li><b>${entry.target}</b><ul>${changes}</ul></li>`;
      }).join('');
      classEl.innerHTML = classes || '<li>Nessun adattamento di classe registrato.</li>';
    }
  }
  const otherEl = document.querySelector('[data-eitr-other]');
  if(otherEl){
    if(loading){
      otherEl.innerHTML = '<li>Dati EITR in caricamento…</li>';
    } else {
      const other = (data.otherRules || []).map(item => `<li>${item}</li>`).join('');
      otherEl.innerHTML = other || '<li>Nessuna regola aggiuntiva nel dataset.</li>';
    }
  }
  const notesEl = document.querySelector('[data-eitr-notes]');
  if(notesEl){
    notesEl.innerHTML = loading ? 'Dati EITR in caricamento…' : (data.notes || []).map(note => `<span>${note}</span>`).join('<br>');
  }
  const sourceEl = document.querySelector('[data-eitr-sources]');
  if(sourceEl){
    if(loading){
      sourceEl.textContent = 'In caricamento…';
    } else {
      const sources = (data.sources || []).join(' • ');
      sourceEl.textContent = sources || '—';
    }
  }
}

function renderAbpSection(){
  const data = getRuleVariant('abp');
  const loading = !data;
  const summaryEl = document.querySelector('[data-abp-summary]');
  if(summaryEl){
    summaryEl.innerHTML = loading ? '<li>Dati ABP in caricamento…</li>' : (data.summary || []).map(line => `<li>${line}</li>`).join('');
  }
  const noteEl = document.querySelector('[data-abp-note]');
  if(noteEl){
    if(loading){
      noteEl.textContent = 'Dati ABP in caricamento…';
    } else {
      const note = data.notes?.[0] || data.note || '';
      noteEl.textContent = note;
    }
  }
  const table = document.querySelector('[data-abp-table]');
  if(!table) return;
  const tbody = table.querySelector('tbody');
  if(!tbody) return;
  const currentLevel = parseInt(state.livello || 7, 10) || 0;
  const order = data?.order || ABP_FALLBACK_ORDER;
  const rows = (data?.progression || []).map(row => {
    const active = currentLevel >= row.level ? ' class="is-active"' : '';
    const rowBonuses = row.bonuses || {};
    const bonuses = order.filter(id => rowBonuses[id] != null)
      .map(id => {
        const value = rowBonuses[id];
        const label = (data?.labels && data.labels[id]) || id;
        const detail = (data?.details && data.details[id]) || '';
        const valueText = id === 'ability' ? `+${value} (caratteristica a scelta)` : `+${value}`;
        const detailHtml = detail ? `<small class="muted">${detail}</small>` : '';
        return `<div class="abp-table__item"><span><b>${label}</b>: ${valueText}</span>${detailHtml}</div>`;
      }).join('');
    const note = row.note ? `<div class="abp-table__note">${row.note}</div>` : '';
    return `<tr${active}><td>${row.level}</td><td class="abp-table__cell">${bonuses}${note}</td></tr>`;
  }).join('');
  tbody.innerHTML = rows || (loading ? '<tr><td colspan="2">Dati ABP in caricamento…</td></tr>' : '<tr><td colspan="2">Nessun dato di progressione disponibile.</td></tr>');
  const conversionPotency = document.querySelector('[data-abp-conversion="potency"]');
  if(conversionPotency){
    if(loading){
      conversionPotency.innerHTML = '<li>Dati ABP in caricamento…</li>';
    } else {
      conversionPotency.innerHTML = (data.conversion?.potency || []).map(entry => {
        const options = (entry.options || []).join(', ');
        const note = entry.note ? `<small class="muted">${entry.note}</small>` : '';
        return `<li><b>Spendi +${entry.cost}</b>: ${options}${note ? `<br>${note}` : ''}</li>`;
      }).join('') || '<li>Nessuna opzione di conversione disponibile.</li>';
    }
  }
  const conversionResilience = document.querySelector('[data-abp-conversion="resilience"]');
  if(conversionResilience){
    if(loading){
      conversionResilience.innerHTML = '<li>Dati ABP in caricamento…</li>';
    } else {
      conversionResilience.innerHTML = (data.conversion?.resilience || []).map(entry => {
        const options = (entry.options || []).join(', ');
        const note = entry.note ? `<small class="muted">${entry.note}</small>` : '';
        return `<li><b>Spendi +${entry.cost}</b>: ${options}${note ? `<br>${note}` : ''}</li>`;
      }).join('') || '<li>Nessuna opzione di conversione disponibile.</li>';
    }
  }
  const lootEl = document.querySelector('[data-abp-loot]');
  if(lootEl){
    if(loading){
      lootEl.innerHTML = '<li>Dati ABP in caricamento…</li>';
    } else {
      const loot = (data.lootGuidelines || []).map(item => `<li>${item}</li>`).join('');
      lootEl.innerHTML = loot || '<li>Nessuna linea guida aggiuntiva nel dataset.</li>';
    }
  }
  const extraNotes = document.querySelector('[data-abp-notes]');
  if(extraNotes){
    if(loading){
      extraNotes.innerHTML = '<li>Dati ABP in caricamento…</li>';
    } else {
      const listNotes = Array.isArray(data.notes) ? data.notes.slice(1) : [];
      extraNotes.innerHTML = listNotes.length ? listNotes.map(note => `<li>${note}</li>`).join('') : '<li>Nessuna nota supplementare.</li>';
    }
  }
}

function handleFieldUpdate(key, value){
  switch(key){
    case 'alignment':
    case 'divinita':
      updateAlignmentSummary();
      break;
    case 'razzaId':
    case 'raceAltTraits':
      if(applyRaceDetails(state.razzaId)) updateAnagraficaSummary();
      updateRazzaClassiSummary();
      break;
    case 'classeId':
    case 'archetypes':
      applyClassDetails(state.classeId);
      updateRazzaClassiSummary();
      break;
    case 'livello':
      updateRazzaClassiSummary();
      updateRuleSummary();
      break;
    case 'taglia':
      state.tagliaManual = !!value;
      if(!state.tagliaManual) applyRaceDetails(state.razzaId);
      updateAnagraficaSummary();
      break;
    case 'eta':
    case 'etaStage':
    case 'genere':
      updateAnagraficaSummary();
      break;
    case 'altezzaVal':
    case 'pesoVal':
      updateMisureSummary();
      break;
    case 'traitsList':
      updateTraitNotes();
      break;
    case 'drawbackList':
      updateDrawbackNotes();
      break;
    case 'toggleEitr':
    case 'toggleAbp':
      updateRuleSummary();
      break;
    default:
      break;
  }
}

function setupSchedaTabs(){
  const buttons = Array.from(document.querySelectorAll('.scheda-tabs__btn'));
  const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));
  if(!buttons.length || !panels.length) return;

  const ensurePanelMetadata = () => {
    buttons.forEach(btn => {
      const target = btn.dataset.tabTarget;
      if(!target) return;
      if(!btn.hasAttribute('role')) btn.setAttribute('role', 'tab');
      if(!btn.id) btn.id = `tab-${target}`;
      const panelId = `panel-${target}`;
      btn.setAttribute('aria-controls', panelId);
      if(!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '-1');
      const panel = panels.find(p => p.dataset.tabPanel === target);
      if(panel){
        if(!panel.id) panel.id = panelId;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', btn.id);
      }
    });
  };

  ensurePanelMetadata();

  const setActive = (id, persist = false, focusTab = false) => {
    if(!id) return;
    buttons.forEach(btn => {
      const active = btn.dataset.tabTarget === id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
      if(active && focusTab) btn.focus();
    });
    panels.forEach(panel => {
      const match = panel.getAttribute('data-tab-panel') === id;
      if(match){
        panel.removeAttribute('hidden');
        panel.setAttribute('aria-hidden', 'false');
        panel.setAttribute('tabindex', '0');
      } else {
        panel.setAttribute('hidden', '');
        panel.setAttribute('aria-hidden', 'true');
        panel.setAttribute('tabindex', '-1');
      }
    });
    if(persist){
      state.lastSchedaTab = id;
      saveAppState(state);
    }
  };

  const focusTabByIndex = (index) => {
    const btn = buttons[(index + buttons.length) % buttons.length];
    if(!btn) return;
    setActive(btn.dataset.tabTarget, true, true);
  };

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => setActive(btn.dataset.tabTarget, true));
    btn.addEventListener('keydown', evt => {
      let targetIndex = null;
      switch(evt.key){
        case 'ArrowRight':
        case 'ArrowDown':
          targetIndex = index + 1;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          targetIndex = index - 1;
          break;
        case 'Home':
          targetIndex = 0;
          break;
        case 'End':
          targetIndex = buttons.length - 1;
          break;
        default:
          return;
      }
      evt.preventDefault();
      focusTabByIndex(targetIndex);
    });
  });

  const availableTargets = new Set(buttons.map(btn => btn.dataset.tabTarget));
  let preferred = state.lastSchedaTab;
  if(!preferred || !availableTargets.has(preferred)){
    preferred = buttons.find(btn => btn.hasAttribute('data-tab-default'))?.dataset.tabTarget || buttons[0].dataset.tabTarget;
  }
  setActive(preferred, false);
}

function hasSchedaMenus(){
  return !!document.querySelector('#dgRazza, #dgClasse, #dgTrattiGenerali, #dgDifetti, #dgTrattiRazza, #dgArchetipi');
}

async function ensureRaceCatalog(){
  if(raceCatalogLoaded) return raceCatalog;
  if(!raceCatalogPromise){
    raceCatalogPromise = getRaces()
      .catch(err => {
        console.warn('[AON] Impossibile ottenere la lista razze, uso fallback.', err);
        return [];
      })
      .then(list => Array.isArray(list) ? list : [])
      .then(list => {
        raceCatalog = list;
        raceCatalogLoaded = true;
        return raceCatalog;
      })
      .finally(() => {
        raceCatalogPromise = null;
      });
  }
  return raceCatalogPromise;
}

async function ensureClassCatalog(){
  if(classCatalogLoaded) return classCatalog;
  if(!classCatalogPromise){
    classCatalogPromise = getClasses()
      .catch(err => {
        console.warn('[AON] Impossibile ottenere la lista classi, uso fallback.', err);
        return [];
      })
      .then(list => Array.isArray(list) ? list : [])
      .then(list => {
        classCatalog = list;
        classCatalogLoaded = true;
        return classCatalog;
      })
      .finally(() => {
        classCatalogPromise = null;
      });
  }
  return classCatalogPromise;
}

async function ensureTraitCatalog(){
  if(traitCatalogLoaded) return traitCatalog;
  if(!traitCatalogPromise){
    traitCatalogPromise = getTraitsAndDrawbacks()
      .catch(err => {
        console.warn('[AON] Impossibile ottenere tratti/difetti, uso fallback.', err);
        return { traits: [], drawbacks: [] };
      })
      .then(data => ({
        traits: Array.isArray(data?.traits) ? data.traits : [],
        drawbacks: Array.isArray(data?.drawbacks) ? data.drawbacks : [],
      }))
      .then(result => {
        traitCatalog = result;
        traitCatalogLoaded = true;
        return traitCatalog;
      })
      .finally(() => {
        traitCatalogPromise = null;
      });
  }
  return traitCatalogPromise;
}

async function hydrateSchedaMenus(){
  if(!hasSchedaMenus()) return { sizeAdjusted: false, traitAdjusted: false };
  if(schedaMenusPromise) return schedaMenusPromise;
  schedaMenusPromise = (async () => {
    await Promise.all([ensureRaceCatalog(), ensureClassCatalog(), ensureTraitCatalog()]);
    renderRaceSelect();
    renderClassSelect();
    const traitAdjusted = renderTraitsSelect();
    const sizeAdjusted = applyRaceDetails(state.razzaId);
    applyClassDetails(state.classeId);
    return { sizeAdjusted, traitAdjusted };
  })();
  try {
    return await schedaMenusPromise;
  } finally {
    schedaMenusPromise = null;
  }
}

async function initSchedaGenerali(){
  let sizeAdjusted = false;
  let traitAdjusted = false;
  try {
    ({ sizeAdjusted, traitAdjusted } = await hydrateSchedaMenus());
  } catch (err) {
    console.error('[Scheda] Errore durante il popolamento dei menù dinamici.', err);
  }
  updateAlignmentSummary();
  updateAnagraficaSummary();
  updateMisureSummary();
  updateRuleSummary();
  updateTraitNotes();
  updateDrawbackNotes();
  updateRazzaClassiSummary();
  if(sizeAdjusted || traitAdjusted) saveAppState(state);
}

function setupAlignmentSelect(){
  const selects = Array.from(document.querySelectorAll('select[data-align-select]'));
  if(!selects.length) return;
  const options = `<option value="">— seleziona —</option>` + ALIGNMENTS.map(a => `<option value="${a.id}">${a.id} — ${a.label}</option>`).join('');
  selects.forEach(select => {
    select.innerHTML = options;
    const value = state.alignment ?? '';
    if(value && !ALIGNMENTS.some(a => a.id === value)){
      const custom = document.createElement('option');
      custom.value = value;
      custom.textContent = `${value} — personalizzato`;
      select.appendChild(custom);
    }
    select.value = value || '';
  });
  restoreFieldValue('alignment');
}

function setupAgeStageSelect(){
  const selects = Array.from(document.querySelectorAll('select[data-age-stage-select], #dgEtaStage'));
  if(!selects.length) return;
  const options = `<option value="">—</option>` + AGE_STAGES.map(stage => `<option value="${stage.id}">${stage.label}</option>`).join('');
  selects.forEach(select => {
    select.innerHTML = options;
    const value = state.etaStage ?? '';
    if(value && !AGE_STAGES.some(stage => stage.id === value)){
      const custom = document.createElement('option');
      custom.value = value;
      custom.textContent = `${value} — personalizzato`;
      select.appendChild(custom);
    }
    select.value = value || '';
  });
  restoreFieldValue('etaStage');
}

function renderRaceSelect(){
  const select = document.getElementById('dgRazza');
  if(!select) return;
  select.innerHTML = `<option value="">— seleziona —</option>` + raceCatalog.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  restoreFieldValue('razzaId');
}

function renderClassSelect(){
  const select = document.getElementById('dgClasse');
  if(!select) return;
  select.innerHTML = `<option value="">— seleziona —</option>` + classCatalog.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  restoreFieldValue('classeId');
}

function renderTraitsSelect(){
  let changed = false;
  const traitSelect = document.getElementById('dgTrattiGenerali');
  if(traitSelect){
    if(traitCatalog.traits.length){
      const grouped = traitCatalog.traits.reduce((acc, trait) => {
        const cat = trait.category || 'Generico';
        if(!acc[cat]) acc[cat] = [];
        acc[cat].push(trait);
        return acc;
      }, {});
      traitSelect.innerHTML = Object.entries(grouped).map(([cat, list]) => {
        return `<optgroup label="${cat}">${list.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</optgroup>`;
      }).join('');
      traitSelect.disabled = false;
      const allowed = new Set(traitCatalog.traits.map(t => t.id));
      const filtered = toArray(state.traitsList).filter(id => allowed.has(id));
      if(filtered.length !== toArray(state.traitsList).length){
        state.traitsList = filtered;
        changed = true;
      }
    } else {
      traitSelect.innerHTML = '';
      traitSelect.disabled = true;
      if(state.traitsList.length){
        state.traitsList = [];
        changed = true;
      }
    }
    restoreFieldValue('traitsList');
  }
  const drawbackSelect = document.getElementById('dgDifetti');
  if(drawbackSelect){
    if(traitCatalog.drawbacks.length){
      drawbackSelect.innerHTML = traitCatalog.drawbacks.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      drawbackSelect.disabled = false;
      const allowed = new Set(traitCatalog.drawbacks.map(t => t.id));
      const filtered = toArray(state.drawbackList).filter(id => allowed.has(id));
      if(filtered.length !== toArray(state.drawbackList).length){
        state.drawbackList = filtered;
        changed = true;
      }
    } else {
      drawbackSelect.innerHTML = '';
      drawbackSelect.disabled = true;
      if(state.drawbackList.length){
        state.drawbackList = [];
        changed = true;
      }
    }
    restoreFieldValue('drawbackList');
  }
  return changed;
}

function applyRaceDetails(raceId){
  const race = raceCatalog.find(r => r.id === raceId) || null;
  const fonteEl = document.getElementById('dgRazzaFonte');
  const traitsSelect = document.getElementById('dgTrattiRazza');
  const traitNote = document.getElementById('dgTrattiRazzaNote');
  const tagliaSelect = document.getElementById('dgTaglia');
  const tagliaNote = document.getElementById('dgTagliaNote');
  const altezzaNote = document.getElementById('dgAltezzaRange');
  const pesoNote = document.getElementById('dgPesoRange');
  let sizeChanged = false;

  if(race){
    if(fonteEl) fonteEl.textContent = race.source ? `Fonte: ${race.source}` : '';
    const altTraits = race.altTraits || [];
    if(traitsSelect){
      if(altTraits.length){
        traitsSelect.innerHTML = altTraits.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        traitsSelect.disabled = false;
      } else {
        traitsSelect.innerHTML = '';
        traitsSelect.disabled = true;
        if(state.raceAltTraits.length) state.raceAltTraits = [];
      }
      restoreFieldValue('raceAltTraits');
    }
    const selectedIds = toArray(state.raceAltTraits).filter(id => altTraits.some(t => t.id === id));
    if(selectedIds.length !== state.raceAltTraits.length){
      state.raceAltTraits = selectedIds;
    }
    const summaries = selectedIds.map(id => {
      const trait = altTraits.find(t => t.id === id);
      return trait ? `${trait.name}: ${trait.summary || '—'}` : null;
    }).filter(Boolean);
    if(traitNote){
      if(altTraits.length){
        traitNote.textContent = summaries.length ? summaries.join(' • ') : 'Nessun tratto alternativo selezionato.';
      } else {
        traitNote.textContent = 'La razza selezionata non offre tratti alternativi nel dataset corrente.';
      }
    }
    const computedSize = computeRaceSize(race, selectedIds);
    renderSizeOptions(tagliaSelect, computedSize);
    if(!state.tagliaManual && computedSize && state.taglia !== computedSize){
      updateComputedField('taglia', computedSize);
      sizeChanged = true;
    }
    if(tagliaNote){
      const overrides = selectedIds.map(id => {
        const trait = altTraits.find(t => t.id === id);
        return trait?.sizeOverride ? `${trait.name} ⇒ ${trait.sizeOverride}` : null;
      }).filter(Boolean);
      const baseText = race.size ? `Taglia base: ${race.size}` : '';
      tagliaNote.textContent = overrides.length ? `${baseText}. Override: ${overrides.join(' • ')}` : baseText;
    }
    if(altezzaNote) altezzaNote.textContent = formatRangeNote(race.height, 'cm');
    if(pesoNote) pesoNote.textContent = formatRangeNote(race.weight, 'kg');
  } else {
    if(fonteEl) fonteEl.textContent = '';
    if(traitsSelect){
      traitsSelect.innerHTML = '';
      traitsSelect.disabled = true;
    }
    if(traitNote) traitNote.textContent = 'Seleziona una razza per visualizzare i tratti alternativi.';
    renderSizeOptions(tagliaSelect, null);
    if(tagliaNote) tagliaNote.textContent = '';
    if(altezzaNote) altezzaNote.textContent = '';
    if(pesoNote) pesoNote.textContent = '';
  }
  return sizeChanged;
}

function applyClassDetails(classId){
  const cls = classCatalog.find(c => c.id === classId) || null;
  const fonteEl = document.getElementById('dgClasseFonte');
  const archSelect = document.getElementById('dgArchetipi');
  const archNote = document.getElementById('dgArchetipiNote');
  if(cls){
    if(fonteEl) fonteEl.textContent = cls.source ? `Fonte: ${cls.source}` : '';
    const archetypes = cls.archetypes || [];
    if(archSelect){
      if(archetypes.length){
        archSelect.innerHTML = archetypes.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        archSelect.disabled = false;
      } else {
        archSelect.innerHTML = '';
        archSelect.disabled = true;
      }
      restoreFieldValue('archetypes');
    }
    if(archNote){
      if(archetypes.length){
        const details = toArray(state.archetypes).map(id => {
          const archetype = archetypes.find(a => a.id === id);
          return archetype ? `${archetype.name}: ${archetype.summary || '—'}` : null;
        }).filter(Boolean);
        archNote.textContent = details.length ? details.join(' • ') : 'Nessun archetipo selezionato.';
      } else {
        archNote.textContent = 'La classe selezionata non ha archetipi collegati nel dataset corrente.';
      }
    }
  } else {
    if(fonteEl) fonteEl.textContent = '';
    if(archSelect){
      archSelect.innerHTML = '';
      archSelect.disabled = true;
    }
    if(archNote) archNote.textContent = 'Seleziona una classe per visualizzare gli archetipi.';
  }
}

function renderSizeOptions(select, recommended){
  if(!select) return;
  const options = ['<option value="">— seleziona —</option>'];
  SIZE_ORDER.forEach(size => {
    const label = size === recommended ? `${size} (consigliata)` : size;
    options.push(`<option value="${size}">${label}</option>`);
  });
  select.innerHTML = options.join('');
  restoreFieldValue('taglia');
}

function computeRaceSize(race, altTraitIds){
  if(!race) return '';
  let size = race.size || '';
  const altTraits = race.altTraits || [];
  altTraitIds.forEach(id => {
    const trait = altTraits.find(t => t.id === id);
    if(trait?.sizeOverride) size = trait.sizeOverride;
  });
  return size;
}

function formatRangeNote(range, defaultUnit){
  if(!range) return '';
  if(range.text) return range.text;
  const unit = range.unit || defaultUnit || '';
  if(range.min != null && range.max != null){
    return `${range.min}–${range.max} ${unit}`.trim();
  }
  if(range.min != null) return `${range.min} ${unit}`.trim();
  if(range.max != null) return `${range.max} ${unit}`.trim();
  return '';
}

function updateAlignmentSummary(){
  const alignment = ALIGNMENTS.find(a => a.id === state.alignment);
  const note = document.getElementById('dgAllineamentoNote');
  if(note){
    note.textContent = alignment ? alignment.description : 'Seleziona un allineamento per mostrare la descrizione.';
  }
  const parts = [];
  if(alignment) parts.push(`${alignment.id} ${alignment.label}`);
  if(state.divinita) parts.push(state.divinita);
  updateComputedField('allineamentoSynth', parts.join(' / '));
}

function updateAnagraficaSummary(){
  const size = state.taglia || '';
  const eta = state.eta || '';
  const stage = AGE_STAGES.find(s => s.id === state.etaStage);
  const genere = state.genere || '';
  const parts = [];
  if(size) parts.push(size);
  if(eta) parts.push(stage ? `${eta} anni (${stage.label})` : `${eta} anni`);
  else if(stage) parts.push(stage.label);
  if(genere) parts.push(genere);
  updateComputedField('tagliaSintesi', parts.join(' / '));
  const ageNote = document.getElementById('dgEtaBonus');
  if(ageNote){
    ageNote.textContent = stage ? stage.summary : 'Seleziona una fascia d’età per applicare modificatori opzionali.';
  }
}

function updateMisureSummary(){
  const height = state.altezzaVal ? `${state.altezzaVal} cm` : '';
  const weight = state.pesoVal ? `${state.pesoVal} kg` : '';
  updateComputedField('misureSintesi', [height, weight].filter(Boolean).join(' / '));
}

function updateRazzaClassiSummary(){
  const raceName = raceCatalog.find(r => r.id === state.razzaId)?.name || '';
  const className = classCatalog.find(c => c.id === state.classeId)?.name || '';
  const archetypeNames = toArray(state.archetypes).map(id => {
    const cls = classCatalog.find(c => c.id === state.classeId);
    return cls?.archetypes?.find(a => a.id === id)?.name || null;
  }).filter(Boolean);
  const level = state.livello ? `Lv ${state.livello}` : '';
  const parts = [];
  if(raceName) parts.push(raceName);
  const classParts = [];
  if(className) classParts.push(className);
  if(archetypeNames.length) classParts.push(archetypeNames.join(', '));
  if(level) classParts.push(level);
  if(classParts.length) parts.push(classParts.join(' • '));
  updateComputedField('razzaClassiSynth', parts.join(' / '));
}

function updateRuleSummary(){
  const note = document.getElementById('dgRuleSummary');
  if(!note) return;
  const eitr = state.toggleEitr !== false;
  const abp = state.toggleAbp !== false;
  const level = state.livello || 7;
  const eitrText = eitr ? 'EITR attivo' : 'EITR disattivato';
  let abpText = abp ? 'ABP attivo' : 'ABP disattivato';
  if(abp){
    const summary = formatAbpSummary(level);
    if(summary) abpText = `ABP attivo — ${summary}`;
  }
  note.textContent = `${eitrText} • ${abpText}`;
  renderAbpSection();
}

function updateTraitNotes(){
  const note = document.getElementById('dgTrattiNote');
  if(!note) return;
  const selections = toArray(state.traitsList);
  if(!selections.length){
    note.textContent = traitCatalog.traits.length ? 'Seleziona fino a due tratti da applicare oltre al Tratto di Campagna.' : 'Tratti non disponibili: controlla la connessione ad AON.';
    return;
  }
  const lines = selections.map(id => {
    const trait = traitCatalog.traits.find(t => t.id === id);
    return trait ? `${trait.name}: ${trait.summary || '—'}` : null;
  }).filter(Boolean);
  note.textContent = lines.join(' • ');
}

function updateDrawbackNotes(){
  const note = document.getElementById('dgDifettiNote');
  if(!note) return;
  const selections = toArray(state.drawbackList);
  if(!selections.length){
    note.textContent = traitCatalog.drawbacks.length ? 'Puoi selezionare un difetto opzionale per ottenere un tratto extra.' : 'Nessun difetto disponibile nel dataset caricato.';
    return;
  }
  const lines = selections.map(id => {
    const item = traitCatalog.drawbacks.find(t => t.id === id);
    return item ? `${item.name}: ${item.summary || '—'}` : null;
  }).filter(Boolean);
  note.textContent = lines.join(' • ');
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
  if(!filtered.length){
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" class="muted">Nessun oggetto trovato.</td>';
    tbody.appendChild(tr);
  } else {
    filtered.forEach(o => {
      const tr = document.createElement('tr');
      const li = o.li ?? '—';
      const prezzo = o.prezzo ?? '—';
      tr.innerHTML = `<td>${o.nome||''}</td><td>${o.slot||'—'}</td><td>${li}</td><td>${prezzo}</td><td>${o.rarita||'—'}</td><td><button class="btn" data-idx="${o.idx}">Modifica</button></td>`;
      tbody.appendChild(tr);
    });
  }
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
  document.getElementById('ocNome').value     = o.nome ?? '';
  document.getElementById('ocSlot').value     = o.slot ?? '';
  document.getElementById('ocLI').value       = o.li ?? '';
  document.getElementById('ocPrezzo').value   = o.prezzo ?? '';
  document.getElementById('ocRarita').value   = o.rarita ?? 'Comune';
  document.getElementById('ocHR').value       = o.hr ? 'Sì' : 'No';
  document.getElementById('ocAzioni').value   = o.azioni ?? '';
  document.getElementById('ocTS').value       = o.ts ?? '';
  document.getElementById('ocEffetto').value  = o.effetto ?? '';
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
  const liValue = document.getElementById('ocLI').value;
  const prezzoValue = document.getElementById('ocPrezzo').value;
  const li = liValue === '' ? null : parseInt(liValue,10);
  const prezzo = prezzoValue === '' ? null : parseInt(prezzoValue,10);
  const item = {
    nome: document.getElementById('ocNome').value.trim(),
    slot: document.getElementById('ocSlot').value.trim(),
    li: Number.isFinite(li) ? li : null,
    prezzo: Number.isFinite(prezzo) ? prezzo : null,
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
