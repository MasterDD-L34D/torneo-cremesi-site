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

function slugify(str){
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normaliseRace(entry){
  if(!entry) return null;
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name);
  if(!id) return null;
  const name = entry.name || entry.Name || id;
  const source = entry.source || entry.Source || entry.book || '';
  const size = entry.size || entry.Size || null;
  const height = entry.height || entry.Height || null;
  const weight = entry.weight || entry.Weight || null;
  const altTraitsRaw = entry.altTraits || entry.alternateTraits || entry.AltTraits || entry.AlternateTraits || [];
  const altTraits = Array.isArray(altTraitsRaw)
    ? altTraitsRaw.map(t => normaliseAltTrait(t)).filter(Boolean)
    : [];
  return {
    id,
    name,
    source,
    size,
    height: normaliseRange(height, 'cm'),
    weight: normaliseRange(weight, 'kg'),
    altTraits
  };
}

function normaliseAltTrait(entry){
  if(!entry) return null;
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name);
  if(!id) return null;
  return {
    id,
    name: entry.name || entry.Name || id,
    summary: entry.summary || entry.Summary || entry.description || entry.Description || '',
    sizeOverride: entry.sizeOverride || entry.SizeOverride || entry.size || entry.Size || null
  };
}

function normaliseRange(range, defaultUnit){
  if(!range) return null;
  if(typeof range === 'number'){
    return { min: range, max: range, unit: defaultUnit };
  }
  if(typeof range === 'string'){
    const numbers = range.match(/[0-9]+/g);
    if(numbers){
      const values = numbers.map(Number);
      return { min: Math.min(...values), max: Math.max(...values), unit: defaultUnit };
    }
    return { text: range };
  }
  const out = {
    min: Number(range.min ?? range.Min ?? range.low ?? range.Low ?? NaN),
    max: Number(range.max ?? range.Max ?? range.high ?? range.High ?? NaN),
    unit: range.unit || range.Unit || defaultUnit || ''
  };
  if(Number.isNaN(out.min)) delete out.min;
  if(Number.isNaN(out.max)) delete out.max;
  return out;
}

function normaliseClass(entry, archetypeIndex){
  if(!entry) return null;
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name);
  if(!id) return null;
  const name = entry.name || entry.Name || id;
  const source = entry.source || entry.Source || '';
  let archetypes = [];
  if(Array.isArray(entry.archetypes || entry.Archetypes)){
    archetypes = (entry.archetypes || entry.Archetypes).map(a => normaliseArchetype(a)).filter(Boolean);
  } else if(archetypeIndex && Array.isArray(archetypeIndex)){
    const match = archetypeIndex.filter(a => {
      const classes = Array.isArray(a.classes || a.Classes) ? (a.classes || a.Classes) : (a.class ? [a.class] : []);
      return classes.some(cls => (cls.id || cls.slug || slugify(cls.name || cls.Name)) === id || cls === name || cls === id);
    });
    archetypes = match.map(a => normaliseArchetype(a)).filter(Boolean);
  }
  return { id, name, source, archetypes };
}

function normaliseArchetype(entry){
  if(!entry) return null;
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name);
  if(!id) return null;
  return {
    id,
    name: entry.name || entry.Name || id,
    summary: entry.summary || entry.Summary || entry.description || entry.Description || ''
  };
}

function normaliseTrait(entry){
  if(!entry) return null;
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name);
  if(!id) return null;
  return {
    id,
    name: entry.name || entry.Name || id,
    summary: entry.summary || entry.Summary || entry.description || entry.Description || '',
    category: entry.category || entry.Category || entry.type || entry.Type || ''
  };
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
    fetchWithFallback(ENDPOINTS.archetypes, STUBS.classes)
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
