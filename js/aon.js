import {
  normaliseRace,
  normaliseClass,
  normaliseTrait
} from './aon-utils.js';

const ENDPOINTS = {
  races: 'https://aonprd.com/Data/Races.json',
  classes: 'https://aonprd.com/Data/Classes.json',
  archetypes: 'https://aonprd.com/Data/Archetypes.json',
  traits: 'https://aonprd.com/Data/Traits.json',
  drawbacks: 'https://aonprd.com/Data/Drawbacks.json'
};

const STUBS = {
  races: 'data/aon-races.stub.json',
  classes: 'data/aon-classes.stub.json',
  archetypes: 'data/aon-archetypes.stub.json',
  traits: 'data/aon-traits.stub.json'
};

let raceCache = null;
let classCache = null;
let traitCache = null;

async function fetchWithFallback(url, stubPath){
  if(!url){
    return fetchStub(stubPath);
  }
  try {
    const res = await fetch(url, { credentials: 'omit', mode: 'cors' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[AON] Impossibile contattare ${url}, uso fallback locale (${stubPath}).`, err);
    return fetchStub(stubPath);
  }
}

async function fetchStub(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error(`Impossibile caricare stub ${path}`);
  return await res.json();
}

export async function getRaces(){
  if(raceCache) return raceCache;
  const raw = await fetchWithFallback(ENDPOINTS.races, STUBS.races);
  let entries = [];
  if(Array.isArray(raw)) entries = raw;
  else if(Array.isArray(raw?.entries)) entries = raw.entries;
  else if(Array.isArray(raw?.Races)) entries = raw.Races;
  else if(raw && typeof raw === 'object') entries = Object.values(raw);
  raceCache = entries.map(e => normaliseRace(e)).filter(Boolean);
  return raceCache;
}

export async function getClasses(){
  if(classCache) return classCache;
  const [rawClasses, rawArchetypes] = await Promise.all([
    fetchWithFallback(ENDPOINTS.classes, STUBS.classes),
    fetchWithFallback(ENDPOINTS.archetypes, STUBS.archetypes)
  ]);
  let classEntries = [];
  if(Array.isArray(rawClasses)) classEntries = rawClasses;
  else if(Array.isArray(rawClasses?.entries)) classEntries = rawClasses.entries;
  else if(Array.isArray(rawClasses?.Classes)) classEntries = rawClasses.Classes;
  else if(rawClasses && typeof rawClasses === 'object') classEntries = Object.values(rawClasses);

  let archetypeIndex = [];
  if(Array.isArray(rawArchetypes?.entries)) archetypeIndex = rawArchetypes.entries;
  else if(Array.isArray(rawArchetypes?.Archetypes)) archetypeIndex = rawArchetypes.Archetypes;
  else if(Array.isArray(rawArchetypes)) archetypeIndex = rawArchetypes;
  else if(rawArchetypes && typeof rawArchetypes === 'object') archetypeIndex = Object.values(rawArchetypes);

  classCache = classEntries.map(c => normaliseClass(c, archetypeIndex)).filter(Boolean);
  return classCache;
}

export async function getTraitsAndDrawbacks(){
  if(traitCache) return traitCache;
  const raw = await fetchWithFallback(ENDPOINTS.traits, STUBS.traits);
  let traits = [];
  let drawbacks = [];
  if(Array.isArray(raw?.traits)) traits = raw.traits;
  else if(Array.isArray(raw?.Traits)) traits = raw.Traits;
  else if(Array.isArray(raw)) traits = raw;
  else if(raw && typeof raw === 'object') traits = Object.values(raw).flat().filter(item => item?.type !== 'Drawback');

  if(Array.isArray(raw?.drawbacks)) drawbacks = raw.drawbacks;
  else if(Array.isArray(raw?.Drawbacks)) drawbacks = raw.Drawbacks;
  else if(raw && typeof raw === 'object' && raw.drawbacks == null && raw.Drawbacks == null){
    const asArray = Object.values(raw).flat();
    drawbacks = asArray.filter(item => (item?.type || item?.Type) === 'Drawback');
  }

  traitCache = {
    traits: traits.map(t => normaliseTrait(t)).filter(Boolean),
    drawbacks: drawbacks.map(t => normaliseTrait(t)).filter(Boolean)
  };
  return traitCache;
}
