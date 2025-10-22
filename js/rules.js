const RULE_SOURCES = {
  eitr: new URL('../data/rules_eitr.json', import.meta.url),
  abp: new URL('../data/rules_abp.json', import.meta.url)
};

const cache = {};
const pending = {};

async function loadVariant(id){
  if(cache[id]) return cache[id];
  if(pending[id]) return pending[id];
  const source = RULE_SOURCES[id];
  if(!source) throw new Error(`Regola variante sconosciuta: ${id}`);
  const promise = fetch(source)
    .then(response => {
      if(!response.ok) throw new Error(`Impossibile caricare il dataset ${id}: ${response.status}`);
      return response.json();
    })
    .then(data => {
      cache[id] = data;
      delete pending[id];
      return data;
    })
    .catch(err => {
      delete pending[id];
      throw err;
    });
  pending[id] = promise;
  return promise;
}

export function ensureRuleVariant(id){
  return loadVariant(id);
}

export function ensureAllRuleVariants(){
  return Promise.all(Object.keys(RULE_SOURCES).map(loadVariant));
}

export function getRuleVariant(id){
  return cache[id] || null;
}

export function listRuleVariants(){
  return Object.keys(RULE_SOURCES);
}

export function getAbpBonusesAtLevel(level){
  const data = getRuleVariant('abp');
  if(!data || !Array.isArray(data.progression)) return {};
  const targetLevel = parseInt(level, 10);
  if(!targetLevel) return {};
  const totals = {};
  data.progression.forEach(row => {
    if(!row || typeof row.level !== 'number') return;
    if(row.level > targetLevel) return;
    Object.entries(row.bonuses || {}).forEach(([id, value]) => {
      totals[id] = value;
    });
  });
  return totals;
}

export function formatAbpSummary(level){
  const data = getRuleVariant('abp');
  if(!data) return '';
  const totals = getAbpBonusesAtLevel(level);
  const order = data.order || Object.keys(totals);
  return order
    .filter(id => totals[id] != null)
    .map(id => {
      const label = data.labels?.[id] || id;
      const value = totals[id];
      return `${label} +${value}`;
    })
    .join(', ');
}
