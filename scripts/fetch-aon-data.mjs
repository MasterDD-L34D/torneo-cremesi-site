import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normaliseRace,
  normaliseClass,
  normaliseTrait,
  normaliseArchetype
} from '../js/aon-utils.js';

const ENDPOINTS = {
  races: 'https://aonprd.com/Data/Races.json',
  classes: 'https://aonprd.com/Data/Classes.json',
  archetypes: 'https://aonprd.com/Data/Archetypes.json',
  traits: 'https://aonprd.com/Data/Traits.json'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

async function fetchJson(url){
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'torneo-cremesi-fetch-script/1.0 (+https://github.com/)' // polite header
    }
  });
  if(!res.ok){
    throw new Error(`Richiesta fallita (${res.status}) per ${url}`);
  }
  return res.json();
}

function unwrapEntries(raw, preferredKeys = []){
  if(Array.isArray(raw)) return raw;
  if(!raw || typeof raw !== 'object') return [];
  for(const key of preferredKeys){
    if(Array.isArray(raw[key])){
      return raw[key];
    }
  }
  return Object.values(raw).flat();
}

async function writeJson(filename, data){
  const filePath = path.join(DATA_DIR, filename);
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, `${json}\n`, 'utf8');
  return filePath;
}

async function main(){
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log('Scarico le razze...');
  const rawRaces = await fetchJson(ENDPOINTS.races);
  const raceEntries = unwrapEntries(rawRaces, ['entries', 'Races']);
  const races = raceEntries.map(normaliseRace).filter(Boolean);
  const altTraits = races.flatMap(race => (race.altTraits || []).map(trait => ({
    ...trait,
    raceId: race.id,
    raceName: race.name
  })));
  await writeJson('aon-races.json', races);
  await writeJson('aon-alt-traits.json', altTraits);

  console.log('Scarico le classi e gli archetipi...');
  const rawClasses = await fetchJson(ENDPOINTS.classes);
  const rawArchetypes = await fetchJson(ENDPOINTS.archetypes);
  const classEntries = unwrapEntries(rawClasses, ['entries', 'Classes']);
  const archetypeIndex = unwrapEntries(rawArchetypes, ['entries', 'Archetypes']);
  const classes = classEntries.map(entry => normaliseClass(entry, archetypeIndex)).filter(Boolean);
  const archetypes = archetypeIndex.map(normaliseArchetype).filter(Boolean);
  await writeJson('aon-classes.json', classes);
  await writeJson('aon-archetypes.json', archetypes);

  console.log('Scarico i tratti...');
  const rawTraits = await fetchJson(ENDPOINTS.traits);
  let traitEntries = [];
  let drawbackEntries = [];
  if(Array.isArray(rawTraits?.traits)) traitEntries = rawTraits.traits;
  else if(Array.isArray(rawTraits?.Traits)) traitEntries = rawTraits.Traits;
  else if(Array.isArray(rawTraits)) traitEntries = rawTraits;
  else if(rawTraits && typeof rawTraits === 'object'){
    const asArray = Object.values(rawTraits).flat();
    traitEntries = asArray.filter(item => (item?.type || item?.Type) !== 'Drawback');
    drawbackEntries = asArray.filter(item => (item?.type || item?.Type) === 'Drawback');
  }
  if(Array.isArray(rawTraits?.drawbacks)) drawbackEntries = rawTraits.drawbacks;
  else if(Array.isArray(rawTraits?.Drawbacks)) drawbackEntries = rawTraits.Drawbacks;

  const traits = traitEntries.map(normaliseTrait).filter(Boolean);
  const drawbacks = drawbackEntries.map(normaliseTrait).filter(Boolean);
  await writeJson('aon-traits.json', { traits, drawbacks });

  console.log('Completato. File scritti nella cartella data/.');
}

main().catch(err => {
  console.error('Errore durante il download dei dati da AON:', err);
  process.exitCode = 1;
});
