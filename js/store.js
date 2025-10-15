// store.js
// Gestisce il salvataggio e il caricamento dello stato applicativo (scheda, tracker)
// e del catalogo degli oggetti custom dal localStorage.

// Chiavi per il localStorage
const KEY_APP = "tc_app_v2";
const KEY_OC  = "tc_oc_v2";

/**
 * Carica lo stato completo della scheda/tracker dal localStorage.
 * @returns {Object}
 */
export function loadAppState(){
  try {
    return JSON.parse(localStorage.getItem(KEY_APP) || "{}");
  } catch (e) {
    return {};
  }
}

/**
 * Salva lo stato applicativo nel localStorage.
 * @param {Object} state
 */
export function saveAppState(state){
  localStorage.setItem(KEY_APP, JSON.stringify(state));
}

/**
 * Carica il catalogo degli oggetti custom.
 * @returns {Array}
 */
export function loadOC(){
  try {
    return JSON.parse(localStorage.getItem(KEY_OC) || "[]");
  } catch (e) {
    return [];
  }
}

/**
 * Salva il catalogo degli oggetti custom.
 * @param {Array} list
 */
export function saveOC(list){
  localStorage.setItem(KEY_OC, JSON.stringify(list));
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
      if (data.app) localStorage.setItem(KEY_APP, JSON.stringify(data.app));
      if (data.oc)  localStorage.setItem(KEY_OC,  JSON.stringify(data.oc));
      if (cb) cb(true);
    } catch (e){
      if (cb) cb(false);
    }
  };
  fr.readAsText(file);
}
