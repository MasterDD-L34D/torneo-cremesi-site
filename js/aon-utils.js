export function slugify(str){
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normaliseRange(range, defaultUnit){
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

export function normaliseAltTrait(entry){
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

function parseStringList(value){
  if(value == null) return [];
  if(Array.isArray(value)){
    return value.flatMap(item => parseStringList(item));
  }
  if(typeof value === 'object'){
    return Object.values(value).flatMap(item => parseStringList(item));
  }
  if(typeof value === 'string'){
    return value
      .split(/[,;/]|\band\b|\be\b/gi)
      .map(str => str.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

export function normaliseRace(entry){
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

export function normaliseArchetype(entry){
  if(!entry) return null;
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name);
  if(!id) return null;
  const replaces = parseStringList(entry.replaces || entry.Replaces || entry.replace || entry.Replace || entry.replaced || entry.Replaced);
  const modifies = parseStringList(entry.modifies || entry.Modifies || entry.alters || entry.Alters || entry.modify || entry.Modify);
  const conflictsRaw = parseStringList(entry.conflicts || entry.Conflicts || entry.conflictsWith || entry.ConflictsWith || entry.incompatible || entry.Incompatible);
  return {
    id,
    name: entry.name || entry.Name || id,
    summary: entry.summary || entry.Summary || entry.description || entry.Description || '',
    replaces,
    modifies,
    conflictsWith: conflictsRaw.map(val => slugify(val)).filter(Boolean)
  };
}

function toUniqueStringList(value){
  const items = parseStringList(value);
  const seen = new Set();
  return items.filter(item => {
    const normalised = item.toLowerCase();
    if(seen.has(normalised)) return false;
    seen.add(normalised);
    return true;
  });
}

function normaliseClassFeature(entry){
  if(!entry) return null;
  if(typeof entry === 'string'){
    const id = slugify(entry);
    return { id, name: entry, summary: '', level: null, type: '' };
  }
  const id = entry.id || entry.slug || slugify(entry.name || entry.Name || entry.title || entry.Title);
  const name = entry.name || entry.Name || entry.title || entry.Title || id;
  if(!name) return null;
  const levelRaw = entry.level ?? entry.Level ?? entry.levelGained ?? entry.LevelGained ?? entry.levelRequired ?? entry.LevelRequired;
  const level = Number.isFinite(Number(levelRaw)) ? Number(levelRaw) : null;
  const summary = entry.summary || entry.Summary || entry.description || entry.Description || entry.text || '';
  const type = entry.type || entry.Type || entry.category || entry.Category || '';
  return { id: id || slugify(name), name, summary, level, type };
}

function normaliseFocusOption(entry){
  if(!entry) return null;
  if(typeof entry === 'string'){
    return { label: entry, options: [], count: null, summary: '' };
  }
  const label = entry.label || entry.name || entry.Name || entry.type || entry.Type || '';
  const summary = entry.summary || entry.Summary || entry.description || entry.Description || '';
  const rawCount = entry.count ?? entry.Count ?? entry.quantity ?? entry.Quantity ?? entry.selections ?? entry.Selections ?? entry.pick ?? entry.Pick ?? null;
  let count = null;
  if(Number.isFinite(Number(rawCount))) count = Number(rawCount);
  else if(typeof rawCount === 'string' && rawCount.trim()) count = rawCount.trim();
  const options = [];
  if(entry.options != null) options.push(...toUniqueStringList(entry.options));
  if(entry.choices != null) options.push(...toUniqueStringList(entry.choices));
  if(entry.values != null) options.push(...toUniqueStringList(entry.values));
  if(entry.list != null) options.push(...toUniqueStringList(entry.list));
  if(!label && !options.length && !summary) return null;
  return { label: label || 'Selezione', options: Array.from(new Set(options)), count, summary };
}

function normaliseClassProficiencies(entry){
  if(!entry || typeof entry !== 'object') return null;
  const result = {
    weapons: [],
    armor: { light: [], medium: [], heavy: [] },
    shields: [],
    other: []
  };
  const weaponKeys = ['weapons','weapon','weaponProficiencies','WeaponProficiencies','weaponsProficiencies','Weapon'];
  weaponKeys.forEach(key => {
    if(entry[key] != null) result.weapons.push(...toUniqueStringList(entry[key]));
  });
  const armorSource = entry.armor || entry.Armor || entry.armors || entry.Armors || {};
  const lightKeys = ['light','lightArmor','lightArmors','Light','LightArmor','LightArmors','lightarmor'];
  const mediumKeys = ['medium','mediumArmor','mediumArmors','Medium','MediumArmor','MediumArmors','mediumarmor'];
  const heavyKeys = ['heavy','heavyArmor','heavyArmors','Heavy','HeavyArmor','HeavyArmors','heavyarmor'];
  const shieldKeys = ['shields','shield','Shield','Shields','shieldProficiencies','ShieldProficiencies'];
  const otherKeys = ['other','notes','additional','extra','Other','Notes','Additional','Extra'];
  const collect = (obj, keys) => {
    const values = [];
    keys.forEach(key => {
      if(obj && obj[key] != null) values.push(...toUniqueStringList(obj[key]));
      if(entry[key] != null) values.push(...toUniqueStringList(entry[key]));
    });
    return values;
  };
  result.armor.light.push(...collect(armorSource, lightKeys));
  result.armor.medium.push(...collect(armorSource, mediumKeys));
  result.armor.heavy.push(...collect(armorSource, heavyKeys));
  result.shields.push(...collect(armorSource, shieldKeys));
  result.other.push(...collect(armorSource, otherKeys));
  otherKeys.forEach(key => {
    if(entry[key] != null) result.other.push(...toUniqueStringList(entry[key]));
  });
  result.weapons = Array.from(new Set(result.weapons));
  result.armor.light = Array.from(new Set(result.armor.light));
  result.armor.medium = Array.from(new Set(result.armor.medium));
  result.armor.heavy = Array.from(new Set(result.armor.heavy));
  result.shields = Array.from(new Set(result.shields));
  result.other = Array.from(new Set(result.other));
  if(
    !result.weapons.length &&
    !result.armor.light.length &&
    !result.armor.medium.length &&
    !result.armor.heavy.length &&
    !result.shields.length &&
    !result.other.length
  ){
    return null;
  }
  return result;
}

export function normaliseClass(entry, archetypeIndex){
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
  const capabilities = entry.capabilities || entry.Capabilities || {};
  const rawFeatures = capabilities.features || capabilities.Features || entry.features || entry.Features || entry.classFeatures || entry.ClassFeatures || [];
  const rawFocus = capabilities.focusOptions || capabilities.FocusOptions || capabilities.selections || capabilities.Selections || [];
  const rawBonus = capabilities.bonusFeats || capabilities.BonusFeats || entry.bonusFeats || entry.BonusFeats || [];
  const rawProfs = capabilities.proficiencies || capabilities.Proficiencies || entry.proficiencies || entry.Proficiencies || null;
  const features = Array.isArray(rawFeatures) ? rawFeatures.map(normaliseClassFeature).filter(Boolean) : [];
  const focusOptions = Array.isArray(rawFocus) ? rawFocus.map(normaliseFocusOption).filter(Boolean) : [];
  const bonusFeats = toUniqueStringList(rawBonus);
  const proficiencies = normaliseClassProficiencies(rawProfs);
  return { id, name, source, archetypes, features, focusOptions, bonusFeats, proficiencies };
}

export function normaliseTrait(entry){
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
