// store.js
// Gestisce il salvataggio e il caricamento dello stato applicativo (scheda, tracker)
// e del catalogo degli oggetti custom dal localStorage.

// Chiavi per il localStorage
const KEY_APP = "tc_app_v2";
const KEY_OC  = "tc_oc_v2";

let appCache = null;
let ocCache = null;
let lastAppSerialized = null;
let lastOCSerialized = null;

/**
 * Carica lo stato completo della scheda/tracker dal localStorage.
 * @returns {Object}
 */
export function loadAppState(force = false){
  if(appCache && !force) return appCache;
  try {
    appCache = JSON.parse(localStorage.getItem(KEY_APP) || "{}") || {};
  } catch (e) {
    appCache = {};
  }
  lastAppSerialized = JSON.stringify(appCache);
  return appCache;
}

/**
 * Salva lo stato applicativo nel localStorage.
 * @param {Object} state
 */
export function saveAppState(state){
  const serialized = JSON.stringify(state);
  if(serialized === lastAppSerialized) return;
  lastAppSerialized = serialized;
  appCache = state;
  localStorage.setItem(KEY_APP, serialized);
}

/**
 * Carica il catalogo degli oggetti custom.
 * @returns {Array}
 */
export function loadOC(force = false){
  if(ocCache && !force) return ocCache;
  try {
    ocCache = JSON.parse(localStorage.getItem(KEY_OC) || "[]") || [];
  } catch (e) {
    ocCache = [];
  }
  lastOCSerialized = JSON.stringify(ocCache);
  return ocCache;
}

/**
 * Salva il catalogo degli oggetti custom.
 * @param {Array} list
 */
export function saveOC(list){
  const serialized = JSON.stringify(list);
  if(serialized === lastOCSerialized) return;
  lastOCSerialized = serialized;
  ocCache = list;
  localStorage.setItem(KEY_OC, serialized);
}

/**
 * Esporta l’intero database dell’applicazione (scheda, tracker, oggetti)
 * in un file JSON. L’utente può scaricarlo per backup/import.
 */
export function exportAll(){
  const blob = new Blob([
    JSON.stringify({
      app: loadAppState(),
      oc:  loadOC()
    }, null, 2)
  ], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "torneo-cremesi.backup.json";
  a.click();
}

/**
 * Importa e ripristina il database (scheda, tracker, oggetti) da un file JSON.
 * @param {File} file
 * @param {Function} cb callback chiamata con true/false a operazione conclusa
 */
export function importAll(file, cb){
  const fr = new FileReader();
  fr.onload = ()=>{
    try{
      const data = JSON.parse(fr.result);
      if (data.app){
        localStorage.setItem(KEY_APP, JSON.stringify(data.app));
        appCache = data.app;
        lastAppSerialized = JSON.stringify(data.app);
      }
      if (data.oc){
        localStorage.setItem(KEY_OC,  JSON.stringify(data.oc));
        ocCache = data.oc;
        lastOCSerialized = JSON.stringify(data.oc);
      }
      if (cb) cb(true);
    } catch (e){
      if (cb) cb(false);
    }
  };
  fr.readAsText(file);
}
