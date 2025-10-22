from __future__ import annotations

import json
from pathlib import Path

CODE_TO_FEATURE = {
  'cs': 'Class Skills',
  'sr': 'Skill Ranks',
  'wa': 'Weapon & Armor',
  'bf1': 'Bonus Feat (1)',
  'bf2': 'Bonus Feat (2)',
  'bf4': 'Bonus Feat (4)',
  'bf6': 'Bonus Feat (6)',
  'bf8': 'Bonus Feat (8)',
  'bf10': 'Bonus Feat (10)',
  'bf12': 'Bonus Feat (12)',
  'bf14': 'Bonus Feat (14)',
  'bf16': 'Bonus Feat (16)',
  'bf18': 'Bonus Feat (18)',
  'bf20': 'Bonus Feat (20)',
  'br1': 'Bravery (1)',
  'br2': 'Bravery (2)',
  'br3': 'Bravery (3)',
  'br4': 'Bravery (4)',
  'at1': 'Armor Training (1)',
  'at2': 'Armor Training (2)',
  'at3': 'Armor Training (3)',
  'at4': 'Armor Training (4)',
  'wt1': 'Weapon Training (1)',
  'wt2': 'Weapon Training (2)',
  'wt3': 'Weapon Training (3)',
  'wt4': 'Weapon Training (4)',
  'am': 'Armor Mastery',
  'wm': 'Weapon Mastery'
}

ROWS: list[tuple[str, str, dict[str, list[str]]]] = [
  ('Paizo', 'Archer', {'X': ['br1', 'br2', 'br3', 'br4', 'at1', 'at2', 'at3', 'at4', 'wt1', 'wt2', 'wt3', 'wt4'], 'C': ['wm']}),
  ('Paizo', 'Armiger', {'X': ['bf1', 'bf10', 'br1'], 'C': ['cs', 'sr', 'bf2', 'bf4', 'bf6', 'bf8', 'bf12', 'bf14', 'bf16', 'bf18', 'bf20']}),
  ('Paizo', 'Armor Master', {'X': ['br1', 'at1', 'at2', 'at3', 'at4', 'wt1', 'wt2', 'wt3', 'wt4', 'am', 'wm']}),
  ('Paizo', 'Aquanaut', {'X': ['br1', 'br2', 'br3', 'br4', 'at1', 'at2', 'at3', 'at4', 'wt1', 'wt2', 'wt3', 'wt4'], 'C': ['wa', 'wm']}),
  ('Paizo', 'Blackjack', {'X': ['bf2', 'bf6', 'bf10', 'bf14', 'bf18']}),
  ('Paizo', 'Border Defender', {'X': ['br1', 'br2', 'br3', 'br4']}),
  ('Paizo', 'Brawler', {'X': ['br1', 'br2', 'br3', 'br4', 'at1', 'at2', 'at3', 'at4', 'wt1', 'wt2', 'wt3', 'wt4'], 'C': ['wm']}),
  ('Paizo', 'Buckler Duelist', {'X': ['br1', 'br2', 'br3', 'br4', 'wt2'], 'C': ['wt1']}),
  ('Paizo', 'Cad', {'X': ['cs', 'bf8', 'bf10', 'bf12', 'bf14', 'bf16', 'bf18', 'bf20', 'wt4'], 'C': ['wa', 'br1']}),
  ('Paizo', 'Child of War', {'X': ['bf1', 'bf2', 'bf6', 'bf8', 'bf10', 'bf12', 'bf14', 'br1', 'br2', 'br3', 'br4'], 'C': ['cs', 'sr', 'wa', 'bf4']})
]


def slugify(name: str) -> str:
  cleaned = name.lower().replace('’', "'").replace("'", '')
  return 'fighter-' + '-'.join(cleaned.split())


def expand(codes: list[str]) -> list[str]:
  return [CODE_TO_FEATURE[code] for code in codes]


def main() -> None:
  entries: list[dict[str, object]] = []
  for source, name, markers in ROWS:
    entry: dict[str, object] = {
      'id': slugify(name),
      'name': name,
      'source': source
    }
    if markers.get('X'):
      entry['replaces'] = expand(markers['X'])
    if markers.get('C'):
      entry['modifies'] = expand(markers['C'])
    entries.append(entry)

  Path('data/fighter-archetypes.json').write_text(json.dumps({'entries': entries}, indent=2, ensure_ascii=False))
  print(f'wrote {len(entries)} entries')


if __name__ == '__main__':
  main()
