import { paperSheet, printCard, mix, shade } from './vendor/paperkit-2d.js';
import { arsenal, bestiary, random } from './campaign.js';

/*
  BRIEF: underground printing works with living folded monsters, original retro FPS.
  STOCK: kraft grounds, matte dyed cardstock, 1.8% visible cut lips and one quiet fibre.
  PALETTE: copper #a55b41, straw #edcd91, floor #aa8058, aubergine ink #442d32 plus five chapter inks.
  LIGHT: screen-left warm key, 48° high, about 30% fill, coloured contact shadows.
  LENS: eye-level first-person projection (72° horizontal), central aim kept sharp.
  FORMAT: responsive browser canvas, handheld touch controls and 16:9 desktop play.
  GROUND & LAYOUT: printed tile grids, folded panel walls, hinged card enemies, cut-paper exits and props.
  MOTION: staggered sprung fold at wake, recoil at fire, hinge collapse at defeat.
  LIFE: drifting fibres, lamp motes, scuttlers, fluttering ink moths.
  SOUND: short flaps, low noise transients and dull oscillators.
  QA: review menu, opening combat and handheld view. No gloss, halos or external artwork.
*/

const canvas = (w, h) => {
  const image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  return image;
};
const ink = '#39242b';
const cream = '#f3d898';
const card = [[0, 0], [1, 0], [1, 1], [0, 1]];
const badge = [[.10, 0], [.90, 0], [1, .20], [.86, .88], [.51, 1], [.13, .85], [0, .20]];
const silhouettes = [
  [[0,.16],[.06,.64],[.17,.70],[.13,1],[.35,.87],[.65,.87],[.87,1],[.83,.70],[.94,.63],[1,.15],[.87,0],[.65,.07],[.35,.07],[.13,0]],
  [[.43,0],[.17,.10],[0,.45],[.04,.94],[.24,1],[.5,.72],[.76,1],[.96,.94],[1,.45],[.83,.10],[.57,0]],
  [[0,.06],[.10,.54],[.25,.49],[.16,.78],[.31,.96],[.50,.80],[.69,.96],[.84,.78],[.75,.49],[.90,.54],[1,.06],[.87,0],[.70,.24],[.30,.24],[.13,0]],
  [[.14,0],[.12,.25],[0,.35],[.05,.70],[.25,.82],[.32,1],[.68,1],[.75,.82],[.95,.70],[1,.35],[.88,.25],[.86,0]],
  [[.03,.30],[0,.77],[.22,.98],[.78,.98],[1,.77],[.96,.30],[.70,.18],[.50,0],[.30,.18]],
  [[.08,0],[0,.28],[.13,.65],[.29,.92],[.53,1],[.79,.89],[.95,.54],[1,.24],[.89,0],[.66,.10],[.34,.10]],
  [[0,.04],[.05,.28],[.31,.35],[.33,.63],[.22,.79],[.36,1],[.72,1],[.87,.81],[.81,.63],[.97,.40],[1,.16],[.85,0]],
  [[0,0],[.13,.41],[.12,.70],[.27,.94],[.50,1],[.73,.94],[.88,.70],[.87,.41],[1,0],[.82,.08],[.64,0],[.46,.10],[.29,0],[.13,.10]],
  [[0,.10],[.03,.56],[.13,.88],[.27,1],[.39,.75],[.61,.75],[.73,1],[.87,.88],[.97,.56],[1,.10],[.83,0],[.66,.10],[.34,.10],[.17,0]],
  [[.08,0],[0,.39],[.10,.73],[.24,.75],[.24,1],[.44,1],[.44,.78],[.74,.78],[.74,.96],[.87,.96],[.87,.67],[1,.49],[.92,0]],
  [[.13,0],[.29,.42],[0,.51],[0,.71],[.30,.72],[.34,.81],[.14,.87],[.34,.94],[.42,1],[.65,1],[.76,.84],[.68,.72],[1,.71],[1,.51],[.70,.42],[.87,0]],
  [[.12,0],[0,.25],[.06,.65],[.19,.80],[.38,.80],[.43,1],[.68,1],[.78,.79],[.96,.66],[1,.26],[.87,0],[.61,.08],[.39,.08]],
  [[.10,0],[.02,.38],[0,.71],[.13,.95],[.34,.80],[.50,1],[.66,.80],[.87,.95],[1,.71],[.98,.38],[.90,0]],
  [[.06,0],[0,.24],[.15,.58],[.08,.88],[.22,1],[.39,.76],[.50,.91],[.61,.76],[.78,1],[.92,.88],[.85,.58],[1,.24],[.94,0],[.67,.10],[.33,.10]]
];

const rect = (x, y, w, h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const gem = (x, y, w, h) => [[x-w,y],[x,y-h],[x+w,y],[x,y+h]];
const plate = [[.16,.26],[.11,.59],[.30,.77],[.70,.77],[.89,.59],[.84,.26],[.64,.15],[.36,.15]];

export function makeArt() {
  const fibre = paperSheet({ size: 256, seed: 210, color: '#eee1c6', mottle: .055, grain: .055, fibres: .85 });
  function print(outline, base, paint, seed = 26, size = 150) {
    return printCard(outline, { pxPerUnit: size, sheet: fibre, seed, tooth: .50, paint(p) {
      p.gradient(base, shade(base, .72), -.39);
      paint(p);
      p.rim();
    } }).canvas;
  }
  const layer = (p, shape, color, depth = .31) => p.layer(shape, color, { depth, shadow: .76, lip: .71 });

  function monster(def, i) {
    const form = def.form;
    const face = ['moth', 'spider', 'worm'].includes(form) ? .53 : .63;
    const jaw = ['jaw', 'wolf', 'crown', 'puncture'].includes(form);
    return print(silhouettes[i], def.color, p => {
      if (form === 'moth') {
        for (const side of [-1, 1]) {
          layer(p, gem(.50 + side * .27, .59, .19, .32), shade(def.color, .66));
          layer(p, gem(.50 + side * .25, .59, .105, .20), def.accent);
          layer(p, gem(.50 + side * .25, .61, .047, .073), ink);
        }
        layer(p, gem(.5,.48,.13,.39), '#935a53');
      } else if (['worm', 'ghost', 'shell'].includes(form)) {
        for (let j = 0; j < 5; j++) {
          const x = (j % 2) * .08;
          layer(p, [[.15+x,.18+j*.08],[.82-x,.15+j*.08],[.89-x,.29+j*.08],[.22+x,.31+j*.08]],
            mix(def.color, def.accent, .22 + j * .06));
        }
      } else {
        layer(p, [[.06,.13],[.13,.52],[.49,.36],[.85,.53],[.94,.11],[.72,.16],[.52,.10],[.28,.16]], shade(def.color, .72));
        layer(p, gem(.21,.35,.13,.17), mix(def.color, def.accent, .57));
        layer(p, gem(.79,.35,.13,.17), mix(def.color, def.accent, .43));
      }
      const facePlate = form === 'moth' ? [[.37,.36],[.37,.65],[.50,.75],[.63,.65],[.62,.36],[.50,.23]] : plate;
      layer(p, facePlate, mix(def.color, def.accent, .62), .45);
      layer(p, [[.22,face],[.42,face-.055],[.5,face-.13],[.58,face-.055],[.78,face],[.72,face-.19],[.50,face-.21],[.27,face-.19]], ink);
      for (const side of [-1, 1]) {
        const x = .5 + side * (form === 'moth' ? .085 : .17);
        layer(p, gem(x,face-.084,form === 'moth' ? .043 : .071,.045), jaw ? '#f2b05f' : '#f0dba1', .16);
        layer(p, gem(x,face-.083,.020,.031), '#6b3231', .13);
      }
      if (jaw || form === 'furnace') {
        layer(p, [[.23,.34],[.77,.34],[.69,.17],[.50,.13],[.31,.17]], ink, .26);
        for (let j = 0; j < 5; j++) {
          const x = .30 + .088 * j;
          layer(p, [[x,.32],[x+.055,.32],[x+.027,.245]], cream, .14);
        }
      } else {
        layer(p, gem(.50,.325,.11,.060), def.color);
        layer(p, gem(.50,.325,.051,.033), def.accent);
      }
      if (['knight','crown','puncture','golem','effigy','furnace'].includes(form)) {
        layer(p, [[.27,.72],[.31,.87],[.50,.83],[.68,.89],[.75,.72],[.50,.68]], shade(def.color, .61));
        layer(p, gem(.50,.78,.083,.060), def.accent);
      }
    }, 228 + i * 91);
  }

  function printableWall(theme, type) {
    const base = type === 2 ? shade(theme.wall, .78) : theme.wall;
    return print(card, base, p => {
      const rail = mix(base, theme.trim, .36);
      const dark = shade(theme.ink, .9);
      layer(p, rect(.022,.055,.956,.86), shade(base, .77));
      layer(p, rect(.052,.104,.896,.745), rail);
      layer(p, rect(.074,.133,.848,.685), base);
      layer(p, rect(.089,.168,.818,.615), shade(base, .87));
      layer(p, [[.11,.19],[.88,.19],[.88,.72],[.11,.48]], shade(base, .80));
      for (const y of [.06,.865]) {
        layer(p, rect(.03,y,.94,.064), shade(theme.trim, .71));
        layer(p, rect(.06,y+.039,.88,.017), theme.trim, .16);
      }
      for (const x of [.11,.88]) {
        for (const y of [.21,.73]) layer(p, gem(x,y,.026,.031), theme.trim,.17);
      }
      if (type === 2) {
        for (let i = 0; i < 6; i++) layer(p, rect(.17+i*.12,.27,.05,.40), rail,.19);
      } else {
        layer(p, gem(.5,.47,.25,.31), dark);
        layer(p, gem(.5,.47,.208,.25), rail);
        layer(p, gem(.5,.47,.164,.20), shade(base, .72));
        layer(p, [[.39,.38],[.49,.56],[.57,.57],[.61,.62],[.61,.49],[.50,.36]], theme.trim, .25);
      }
    }, 390 + type, 192);
  }

  function surface(theme, top) {
    const base = top ? shade(theme.wall, .52) : theme.floor;
    const texture = print(card, base, p => {
      const {g} = p;
      g.fillStyle = top ? shade(base,.83) : shade(base,.72);
      g.fillRect(0,0,1,.024);
      g.fillRect(0,0,.024,1);
      g.fillStyle = mix(base, theme.trim, .24);
      g.fillRect(.030,.033,.95,.018);
      g.fillRect(.032,.034,.018,.94);
      g.fillStyle = shade(base,.9);
      for (let y = .15; y < .8; y += .24) g.fillRect(.17,y,.67,.012);
    }, 338, 64);
    return texture.getContext('2d').getImageData(0, 0, 64, 64).data;
  }

  function item(kind, colors) {
    const [base, accent] = colors;
    return print(kind === 'seal' || kind === 'lantern' || kind === 'bolt' ? badge : rect(.04,.06,.92,.81), base, p => {
      layer(p, rect(.13,.15,.73,.63), shade(base,.66));
      layer(p, rect(.19,.20,.61,.51), base);
      if (kind === 'health') {
        layer(p, rect(.39,.27,.21,.37), accent);
        layer(p, rect(.31,.36,.37,.19), accent);
      } else if (kind === 'ammo') {
        for (let i = 0; i < 3; i++) layer(p, rect(.27+i*.17,.30,.09,.32), accent);
      } else if (kind === 'lantern') {
        layer(p, gem(.5,.52,.24,.34), accent);
        layer(p, gem(.5,.55,.10,.23), cream);
      } else {
        layer(p, gem(.5,.50,.27,.27), accent);
        layer(p, gem(.5,.50,.12,.15), base);
      }
    });
  }

  function portal(theme, open) {
    const shape = [[0,0],[0,.70],[.13,.90],[.32,1],[.68,1],[.87,.90],[1,.70],[1,0]];
    return print(shape, theme.wall, p => {
      layer(p, [[.10,0],[.10,.68],[.28,.85],[.72,.85],[.90,.68],[.90,0]], theme.trim, .5);
      layer(p, [[.17,0],[.17,.63],[.34,.78],[.66,.78],[.83,.63],[.83,0]], open ? '#3b776a' : '#633a47');
      for (let i = 0; i < 4; i++) layer(p, rect(.21,.10+i*.13,.58,.038), open ? '#afd6a0' : '#8a514c');
      layer(p, gem(.5,.47,.18,.21), open ? '#dcdfae' : '#bf7658');
      layer(p, gem(.5,.47,.09,.11), open ? '#48735c' : '#713e43');
    });
  }

  function weapon(w, i) {
    const blade = [[.02,0],[.25,.17],[.46,.22],[.58,.70],[.79,1],[.87,.76],[.67,.34],[.72,.09],[.60,0]];
    const frame = [[.06,0],[.19,.30],[.27,.45],[.32,.78],[.47,.96],[.69,.98],[.83,.80],[.89,.48],[.79,.21],[.92,0]];
    return print(i === 0 ? blade : frame, i === 0 ? '#9e6c50' : w.color, p => {
      if (i === 0) {
        layer(p, [[.45,.28],[.57,.69],[.79,.97],[.80,.76],[.61,.34]], '#ecd8aa', .45);
        layer(p, [[.50,.34],[.70,.81],[.78,.91],[.70,.62],[.60,.35]], '#b6b2a0', .35);
        layer(p, [[.31,.22],[.43,.38],[.70,.26],[.71,.18],[.50,.14]], '#b86a47', .48);
      } else {
        layer(p, [[.19,.08],[.26,.44],[.40,.81],[.62,.90],[.78,.70],[.79,.27],[.91,.02]], shade(w.color,.56), .5);
        layer(p, [[.33,.22],[.34,.53],[.42,.78],[.66,.88],[.80,.64],[.75,.21],[.66,.12]], w.color, .40);
        const barrels = [0,1,2,3,1,2,4][i];
        for (let j = 0; j < barrels; j++) {
          const x = .42 + .275 * j / Math.max(1, barrels - 1);
          layer(p, [[x-.08,.40],[x-.03,.80],[x+.06,.82],[x+.06,.46]], mix(w.color, cream, .57), .38);
          layer(p, gem(x+.02,.81,.057,.057), ink, .20);
        }
        layer(p, [[.33,.32],[.37,.47],[.77,.47],[.78,.33],[.68,.24],[.43,.24]], shade(w.color,.68), .36);
        layer(p, gem(.59,.35,.063,.049), '#e3b567', .20);
      }
      layer(p, [[.07,0],[.24,.23],[.47,.28],[.60,.15],[.57,0]], '#80645b', .44);
      layer(p, [[.17,0],[.28,.11],[.53,.19],[.67,.08],[.56,0]], '#ac8770', .42);
    }, 1054+i, 240);
  }

  const props = {
    ammo: ['#af774c', cream], health: ['#ac5e52', '#f1d5a3'], armor: ['#687c7c','#b5c6a7'],
    seal: ['#a48152','#f0d19a'], lantern: ['#886048','#e3a855'], crate: ['#946b4a','#c49c63'],
    scrap: ['#7c7463','#bd9f6a'], bolt: ['#aa5945','#eda867']
  };
  const flecks = random(471);
  return {
    monsters: bestiary.map(monster),
    weapons: arsenal.map(weapon),
    items: Object.fromEntries(Object.entries(props).map(([key, color]) => [key, item(key, color)])),
    chapter: theme => ({
      walls: [printableWall(theme, 1), printableWall(theme, 2)],
      floor: surface(theme, false), ceiling: surface(theme, true),
      portal: [portal(theme,false), portal(theme,true)]
    }),
    motes: Array.from({length:28}, () => [flecks(), flecks(), flecks()])
  };
}
