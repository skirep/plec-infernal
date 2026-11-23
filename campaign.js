export const chapters = [
  { name: 'La Impremta', floor: '#aa8058', wall: '#a55b41', trim: '#edcd91', ink: '#442d32',
    maps: ['Tinta fresca', 'La sala dels tipus', 'Rodes dentades', 'El passadís roig', 'La premsa viva'] },
  { name: 'L’Arxiu Ofegat', floor: '#809084', wall: '#45776e', trim: '#e0cf9a', ink: '#29383d',
    maps: ['Índex submergit', 'El pou de fitxes', 'Cambra de motlles', 'Inventari perdut', 'La reina de la cola'] },
  { name: 'La Caldereria', floor: '#a18177', wall: '#8e514e', trim: '#f4ba87', ink: '#442938',
    maps: ['Carbó de paper', 'La volta calenta', 'Xemeneies dobles', 'Les brases', 'El cor de coure'] },
  { name: 'El Bosc Tallat', floor: '#9b9c72', wall: '#64714c', trim: '#e4c398', ink: '#3a392b',
    maps: ['Sota les tisores', 'Arrels en creu', 'Clariana del fil', 'El cau de fulles', 'El guardabosc buit'] },
  { name: 'El Claustre de Cendra', floor: '#a1899b', wall: '#68546e', trim: '#e8c9b4', ink: '#352b44',
    maps: ['Marge fosc', 'Les sis voltes', 'El cor de cendra', 'Processó invertida', 'La veu del llom'] },
  { name: 'L’Últim Plec', floor: '#a68a6f', wall: '#565b61', trim: '#ecc583', ink: '#312d3e',
    maps: ['Capítol prohibit', 'Retalls sense nom', 'Darrere la coberta', 'La pàgina zero', 'El Punxó'] }
];

export const arsenal = [
  { name: 'Fulla', damage: 42, rate: .37, range: 1.65, color: '#d6be92', unlock: 0 },
  { name: 'Grapadora', damage: 32, rate: .29, range: 16, color: '#cf895a', unlock: 0, stock: 55 },
  { name: 'Retalladora', damage: 17, rate: .72, range: 9, pellets: 7, spread: .36, color: '#c4846d', unlock: 1, stock: 24 },
  { name: 'Bobina', damage: 15, rate: .09, range: 14, spread: .07, color: '#d9a654', unlock: 3, stock: 100 },
  { name: 'Llançabobines', damage: 126, rate: .85, range: 17, blast: 2.2, color: '#df805c', unlock: 6, stock: 15 },
  { name: 'Làmina freda', damage: 53, rate: .39, range: 21, pierce: true, color: '#86b7ae', unlock: 9, stock: 28 },
  { name: 'Segell final', damage: 190, rate: 1.15, range: 13, blast: 3.8, color: '#b898bb', unlock: 14, stock: 9 }
];

export const bestiary = [
  { name: 'Mossegador', form: 'jaw', color: '#b95d47', accent: '#ebad70', hp: 39, pace: 1.55, damage: 9 },
  { name: 'Arna de tinta', form: 'moth', color: '#697f83', accent: '#e1bc7f', hp: 35, pace: 1.25, damage: 8, ranged: true },
  { name: 'Grapa cega', form: 'spider', color: '#978052', accent: '#dfbd81', hp: 48, pace: 2.35, damage: 8 },
  { name: 'Baró del corrugat', form: 'knight', color: '#96604d', accent: '#e0bc88', hp: 96, pace: .83, damage: 16, armor: .72 },
  { name: 'Arxivista', form: 'mask', color: '#6c8772', accent: '#dfa770', hp: 60, pace: .95, damage: 9, ranged: true },
  { name: 'Escarabat de cola', form: 'shell', color: '#8d8550', accent: '#e0bd76', hp: 73, pace: 1.15, damage: 12, armor: .8 },
  { name: 'Cuc de llom', form: 'worm', color: '#b67666', accent: '#dfaf83', hp: 67, pace: 1.65, damage: 13 },
  { name: 'Americanat', form: 'ghost', color: '#8e789e', accent: '#edd2a8', hp: 54, pace: 1.3, damage: 10, ranged: true },
  { name: 'Llop d’estampa', form: 'wolf', color: '#a15b72', accent: '#f1bc97', hp: 90, pace: 2.2, damage: 14 },
  { name: 'Caldera', form: 'furnace', color: '#a45a50', accent: '#f2b060', hp: 120, pace: .85, damage: 14, ranged: true },
  { name: 'Espantaocells', form: 'effigy', color: '#ad8752', accent: '#efd19b', hp: 72, pace: 1.45, damage: 11, ranged: true },
  { name: 'Gòlem de cendra', form: 'golem', color: '#777082', accent: '#d6b8ce', hp: 135, pace: .68, damage: 19, armor: .65 },
  { name: 'Mandíbula reial', form: 'crown', color: '#80516a', accent: '#efb776', hp: 210, pace: 1.2, damage: 16, ranged: true },
  { name: 'El Punxó', form: 'puncture', color: '#774250', accent: '#e7a871', hp: 460, pace: 1.12, damage: 18, ranged: true }
];

export function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function distances(grid, px, py) {
  const size = grid.length;
  const scores = new Int16Array(size * size).fill(-1);
  const queue = [py * size + px];
  scores[queue[0]] = 0;
  for (let i = 0; i < queue.length; i++) {
    const idx = queue[i];
    const x = idx % size;
    const y = Math.floor(idx / size);
    for (const [dx, dy] of directions) {
      const next = (y + dy) * size + x + dx;
      if (grid[y + dy]?.[x + dx] === 0 && scores[next] === -1) {
        scores[next] = scores[idx] + 1;
        queue.push(next);
      }
    }
  }
  return scores;
}

// Every page connects nine rooms. Chapter routes and seeded room folds change the traversable plan.
const routes = [
  [0, 1, 2, 5, 4, 3, 6, 7, 8],
  [0, 3, 6, 7, 4, 1, 2, 5, 8],
  [0, 1, 4, 3, 6, 7, 8, 5, 2],
  [0, 3, 4, 1, 2, 5, 8, 7, 6],
  [0, 1, 2, 5, 8, 7, 6, 3, 4],
  [0, 3, 6, 7, 8, 5, 2, 1, 4]
];

export function makeLevel(index) {
  const chapterIndex = Math.floor(index / 5);
  const page = index % 5;
  const chapter = chapters[chapterIndex];
  const rnd = random(46921 + index * 17127);
  const size = 25;
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const midpoint = room => [4 + 8 * (room % 3), 4 + 8 * Math.floor(room / 3)];
  const dig = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) grid[y][x] = 0;
    }
  };

  for (let i = 0; i < 9; i++) {
    const [x, y] = midpoint(i);
    dig(x - 2 - (rnd() < .65), y - 2 - (rnd() < .65), x + 2 + (rnd() < .65), y + 2 + (rnd() < .65));
    if (i !== 0) {
      const px = x + (rnd() < .5 ? -1 : 1);
      const py = y + (rnd() < .5 ? -1 : 1);
      grid[py][px] = 2;
      if ((page + i) % 3 === 0) grid[py][px - Math.sign(px - x)] = 2;
    }
  }

  function link(a, b, wide) {
    const [x0, y0] = midpoint(a);
    const [x1, y1] = midpoint(b);
    dig(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1) + (wide && x0 === x1), Math.max(y0, y1) + (wide && y0 === y1));
  }

  const route = routes[chapterIndex];
  route.slice(1).forEach((room, i) => link(route[i], room, (i + page) % 3 === 0));
  const shortcuts = [[0, 1], [0, 3], [1, 4], [2, 5], [3, 4], [3, 6], [4, 5], [4, 7], [5, 8], [6, 7], [7, 8], [1, 2]]
    .filter(([a, b]) => Math.abs(route.indexOf(a) - route.indexOf(b)) > 1);
  for (let i = 0; i < (page + 1) % 4; i++) {
    const [a, b] = shortcuts.splice(Math.floor(rnd() * shortcuts.length), 1)[0];
    link(a, b, false);
  }

  const point = room => {
    const [x, y] = midpoint(room);
    return { x: x + .5, y: y + .5 };
  };
  const available = grid.flatMap((row, y) => row.flatMap((cell, x) => cell === 0 ? [{ x: x + .5, y: y + .5 }] : []));
  const start = point(0);
  const last = route.at(-1);
  const exit = point(last);
  const enemies = [];
  const pickups = [];
  const boss = page === 4;
  const goal = boss ? 'Cap' : ['Segell', 'Neteja', 'Segell', 'Neteja'][page];
  const seal = goal === 'Segell' ? point(route[4 + chapterIndex % 3]) : null;
  const reserved = [start, exit, ...(seal ? [seal] : [])];
  const spawn = (x, y, type) => {
    enemies.push({ x, y, type });
    reserved.push({ x, y });
  };

  spawn(6.35, 4.47, index === 0 ? 0 : Math.min(index, 11));
  if (boss) spawn(exit.x - 1.2, exit.y, index === 29 ? 13 : 12);
  if (boss && grid[Math.floor(exit.y)][Math.floor(exit.x - 1.2)] !== 0) {
    enemies.at(-1).x = exit.x;
    enemies.at(-1).y = exit.y;
    reserved.at(-1).x = exit.x;
  }

  const candidates = available.filter(p => Math.hypot(p.x - start.x, p.y - start.y) > 3.4);
  const place = (pool = candidates) => {
    let p;
    do {
      p = pool[Math.floor(rnd() * pool.length)];
    } while (reserved.some(other => Math.hypot(p.x - other.x, p.y - other.y) < 1));
    reserved.push(p);
    return p;
  };

  const count = 9 + Math.floor(index * .52);
  while (enemies.length < count) {
    const p = place();
    spawn(p.x, p.y, Math.floor(rnd() * Math.min(12, 2 + index)));
  }
  for (let i = 0; i < 15; i++) {
    pickups.push({ ...place(i < 3 ? available.filter(p => Math.hypot(p.x - start.x, p.y - start.y) < 4) : candidates),
      kind: ['ammo', 'health', 'armor'][i % 3] });
  }
  if (seal) pickups.push({ ...seal, kind: 'seal' });
  for (let i = 0; i < 13; i++) pickups.push({ ...place(), kind: ['lantern', 'crate', 'scrap'][i % 3] });
  return { grid, size, chapter, chapterIndex, name: chapter.maps[page], start, exit, enemies, pickups, goal };
}
