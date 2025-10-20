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
  return {
    id,
    name: entry.name || entry.Name || id,
    summary: entry.summary || entry.Summary || entry.description || entry.Description || ''
  };
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
  return { id, name, source, archetypes };
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
