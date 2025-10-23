#!/usr/bin/env node
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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    only: null,
    outDir: path.join(ROOT_DIR, 'data'),
    noWrite: false,
    attempts: 4,
    timeoutMs: 15000,
  };
  for (const arg of args) {
    if (arg.startsWith('--only=')) {
      opts.only = arg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--out-dir=')) {
      opts.outDir = path.resolve(arg.split('=')[1]);
    } else if (arg === '--no-write') {
      opts.noWrite = true;
    } else if (arg.startsWith('--attempts=')) {
      opts.attempts = Number(arg.split('=')[1]) || opts.attempts;
    } else if (arg.startsWith('--timeout=')) {
      opts.timeoutMs = Number(arg.split('=')[1]) || opts.timeoutMs;
    }
  }
  return opts;
}

const opts = parseArgs();

async function fetchJson(url, { attempts = 4, timeoutMs = 15000 } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt < attempts) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'torneo-cremesi-fetch-script/1.0 (+https://github.com/)',
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status}) for ${url}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt >= attempts) break;
      const backoff = Math.pow(2, attempt - 1) * 500;
      console.warn(`Fetch attempt ${attempt} failed for ${url}: ${err.message}. Retrying in ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastErr || new Error(`Failed to fetch ${url}`);
}

function unwrapEntries(raw, preferredKeys = []) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  for (const key of preferredKeys) {
    if (Array.isArray(raw[key])) {
      return raw[key];
    }
  }
  return Object.values(raw).flat();
}

async function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${json}\n`, 'utf8');
  return filePath;
}

function validateArray(arr, requiredKeys = []) {
  if (!Array.isArray(arr)) return false;
  for (const item of arr) {
    if (!item || typeof item !== 'object') return false;
    for (const k of requiredKeys) {
      if (!(k in item)) return false;
    }
  }
  return true;
}

async function main() {
  await fs.mkdir(opts.outDir, { recursive: true });

  const doRaces = !opts.only || opts.only.includes('races');
  const doClasses = !opts.only || opts.only.includes('classes');
  const doTraits = !opts.only || opts.only.includes('traits');

  if (doRaces) {
    console.log('Downloading races...');
    const rawRaces = await fetchJson(ENDPOINTS.races, { attempts: opts.attempts, timeoutMs: opts.timeoutMs });
    const raceEntries = unwrapEntries(rawRaces, ['entries', 'Races']);
    const races = raceEntries.map(normaliseRace).filter(Boolean);
    const altTraits = races.flatMap(race => (race.altTraits || []).map(trait => ({
      ...trait,
      raceId: race.id,
      raceName: race.name
    })));
    if (!validateArray(races, ['id', 'name'])) {
      throw new Error('Validation failed for races: expected array of objects with id and name');
    }
    console.log(`Races: ${races.length}, altTraits: ${altTraits.length}`);
    const racesPath = path.join(opts.outDir, 'aon-races.json');
    const altPath = path.join(opts.outDir, 'aon-alt-traits.json');
    if (!opts.noWrite) {
      await writeJson(racesPath, races);
      await writeJson(altPath, altTraits);
      console.log(`Wrote ${racesPath} and ${altPath}`);
    } else {
      console.log('--no-write specified, skipping write for races');
    }
  }

  if (doClasses) {
    console.log('Downloading classes and archetypes...');
    const rawClasses = await fetchJson(ENDPOINTS.classes, { attempts: opts.attempts, timeoutMs: opts.timeoutMs });
    const rawArchetypes = await fetchJson(ENDPOINTS.archetypes, { attempts: opts.attempts, timeoutMs: opts.timeoutMs });
    const classEntries = unwrapEntries(rawClasses, ['entries', 'Classes']);
    const archetypeIndex = unwrapEntries(rawArchetypes, ['entries', 'Archetypes']);
    const classes = classEntries.map(entry => normaliseClass(entry, archetypeIndex)).filter(Boolean);
    const archetypes = archetypeIndex.map(normaliseArchetype).filter(Boolean);
    if (!validateArray(classes, ['id', 'name'])) {
      throw new Error('Validation failed for classes: expected array of objects with id and name');
    }
    if (!validateArray(archetypes, ['id', 'name'])) {
      throw new Error('Validation failed for archetypes: expected array of objects with id and name');
    }
    console.log(`Classes: ${classes.length}, Archetypes: ${archetypes.length}`);
    const classesPath = path.join(opts.outDir, 'aon-classes.json');
    const archetypesPath = path.join(opts.outDir, 'aon-archetypes.json');
    if (!opts.noWrite) {
      await writeJson(classesPath, classes);
      await writeJson(archetypesPath, archetypes);
      console.log(`Wrote ${classesPath} and ${archetypesPath}`);
    } else {
      console.log('--no-write specified, skipping write for classes/archetypes');
    }
  }

  if (doTraits) {
    console.log('Downloading traits...');
    const rawTraits = await fetchJson(ENDPOINTS.traits, { attempts: opts.attempts, timeoutMs: opts.timeoutMs });
    let traitEntries = [];
    let drawbackEntries = [];
    if (Array.isArray(rawTraits?.traits)) traitEntries = rawTraits.traits;
    else if (Array.isArray(rawTraits?.Traits)) traitEntries = rawTraits.Traits;
    else if (Array.isArray(rawTraits)) traitEntries = rawTraits;
    else if (rawTraits && typeof rawTraits === 'object') {
      const asArray = Object.values(rawTraits).flat();
      traitEntries = asArray.filter(item => (item?.type || item?.Type) !== 'Drawback');
      drawbackEntries = asArray.filter(item => (item?.type || item?.Type) === 'Drawback');
    }
    if (Array.isArray(rawTraits?.drawbacks)) drawbackEntries = rawTraits.drawbacks;
    else if (Array.isArray(rawTraits?.Drawbacks)) drawbackEntries = rawTraits.Drawbacks;

    const traits = traitEntries.map(normaliseTrait).filter(Boolean);
    const drawbacks = drawbackEntries.map(normaliseTrait).filter(Boolean);

    if (!validateArray(traits, ['id', 'name'])) {
      throw new Error('Validation failed for traits: expected array of objects with id and name');
    }
    console.log(`Traits: ${traits.length}, Drawbacks: ${drawbacks.length}`);
    const traitsPath = path.join(opts.outDir, 'aon-traits.json');
    if (!opts.noWrite) {
      await writeJson(traitsPath, { traits, drawbacks });
      console.log(`Wrote ${traitsPath}`);
    } else {
      console.log('--no-write specified, skipping write for traits');
    }
  }

  console.log('Completed.');
}

main().catch(err => {
  console.error('Error while fetching AON data:', err);
  process.exitCode = 1;
});
