// Раскладка групп эффектов и изоляции по индексам слоёв. Считается один раз на
// проход композита: раньше цикл фильтровал и сортировал список групп дважды на
// каждый слой каждого кадра.
export interface GroupInterval<Folder> {
  readonly f: Folder;
  readonly bottom: number;
  readonly top: number;
}

export interface GroupLayout<Folder> {
  readonly isolated: ReadonlyMap<number, GroupInterval<Folder>>;
  readonly below: ReadonlyMap<number, readonly GroupInterval<Folder>[]>;
  readonly above: ReadonlyMap<number, readonly GroupInterval<Folder>[]>;
}

export function compositeGroupLayout<Folder>(
  groups: readonly GroupInterval<Folder>[],
  isolatedGroups: readonly GroupInterval<Folder>[],
  depthOf: (folder: Folder) => number
): GroupLayout<Folder> {
  const isolated = new Map<number, GroupInterval<Folder>>();
  for (const entry of isolatedGroups) {
    if (!isolated.has(entry.bottom)) isolated.set(entry.bottom, entry);
  }
  const below = new Map<number, GroupInterval<Folder>[]>();
  const above = new Map<number, GroupInterval<Folder>[]>();
  const add = (map: Map<number, GroupInterval<Folder>[]>, key: number,
    value: GroupInterval<Folder>) => {
    const list = map.get(key); if (list) list.push(value); else map.set(key, [value]);
  };
  for (const group of groups) { add(below, group.bottom, group); add(above, group.top, group); }
  for (const list of below.values()) list.sort((a, b) => depthOf(a.f) - depthOf(b.f));
  for (const list of above.values()) list.sort((a, b) => depthOf(b.f) - depthOf(a.f));
  return { isolated, below, above };
}
