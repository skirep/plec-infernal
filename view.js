import { drawCreature } from './creatures.js?v=2';

const optics = .72;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function raycast(grid, x, y, dx, dy) {
  let mx = Math.floor(x), my = Math.floor(y);
  const ax = Math.abs(1 / dx), ay = Math.abs(1 / dy);
  const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  let ex = (dx < 0 ? x - mx : mx + 1 - x) * ax;
  let ey = (dy < 0 ? y - my : my + 1 - y) * ay;
  let side, depth, tile;
  do {
    side = ex > ey ? 1 : 0;
    if (side) {
      depth = ey;
      ey += ay;
      my += sy;
    } else {
      depth = ex;
      ex += ax;
      mx += sx;
    }
    tile = grid[my]?.[mx] ?? 1;
  } while (!tile);
  let u = side ? x + depth * dx : y + depth * dy;
  u -= Math.floor(u);
  return { depth, tile, side, u, mx, my };
}

export function makeView(canvas, art) {
  const g = canvas.getContext('2d', { alpha: false });
  const floorLayer = document.createElement('canvas');
  const fg = floorLayer.getContext('2d');
  let backdrop, buffer, depth, upperLeft;
  let w, h, stamp, themeIndex = -1;
  let textures, angle, fx, fy, focal, horizon, eye;
  const themes = new Map();
  const warmScale = 5;
  let mapRef, warmth, lightSize;

  function resize() {
    const clientW = canvas.clientWidth || innerWidth;
    const clientH = canvas.clientHeight || innerHeight;
    const hand = matchMedia('(pointer: coarse)').matches;
    const density = hand ? 1 : Math.min(devicePixelRatio,1.25);
    const ratio = Math.min(density, (hand ? 870 : 1180) / clientW, (hand ? 560 : 750) / clientH);
    w = canvas.width = Math.round(clientW * ratio);
    h = canvas.height = Math.round(clientH * ratio);
    floorLayer.width = Math.ceil(w / 2);
    floorLayer.height = Math.ceil(h / 2);
    backdrop = fg.createImageData(floorLayer.width, floorLayer.height);
    buffer = backdrop.data;
    depth = new Float32Array(w);
    upperLeft = g.createRadialGradient(w*.49,h*.46,h*.22,w*.49,h*.46,Math.max(w,h)*.66);
    upperLeft.addColorStop(0,'transparent');
    upperLeft.addColorStop(1,'rgba(29,15,35,.29)');
  }

  function bakeLight(map) {
    lightSize = map.size*warmScale;
    warmth = new Float32Array(lightSize*lightSize);
    const lamps = map.pickups.filter(p=>p.kind==='lantern');
    const points = [...lamps,{x:map.start.x+.6,y:map.start.y-.8}];
    for (let y=0;y<lightSize;y++) for (let x=0;x<lightSize;x++) {
      const px = x/warmScale, py = y/warmScale;
      const adjacent = map.grid[Math.floor(py)]?.[Math.floor(px)] ? .23 : 0;
      let light = 0;
      for (const lamp of points) {
        const dx = lamp.x-px, dy = lamp.y-py;
        const gap = dx*dx+dy*dy;
        if (gap < 14) light += (1-gap/14)**3;
      }
      warmth[y*lightSize+x] = Math.min(1.20,light)-adjacent;
    }
  }

  function sampleLight(x,y) {
    const ix = (x*warmScale)|0, iy = (y*warmScale)|0;
    return ix>=0 && ix<lightSize && iy>=0 && iy<lightSize ? warmth[iy*lightSize+ix] : 0;
  }

  function drawSheets(p) {
    const {width, height} = backdrop;
    for (let y = 0; y < height; y++) {
      const delta = y * 2 - horizon;
      const sheet = delta > 0 ? textures.floor : textures.ceiling;
      const d = Math.min(32, (delta > 0 ? eye : 1.15-eye) * focal / Math.max(1, Math.abs(delta)));
      const s = d / focal;
      const factor = (delta > 0 ? .94 : .83) / (1 + d * .067);
      const rx = -fy*s, ry = fx*s;
      let wx = p.x + d*fx - w*.5*rx;
      let wy = p.y + d*fy - w*.5*ry;
      let row = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = ((((wy * 64) | 0) & 63) * 64 + (((wx * 64) | 0) & 63)) * 4;
        const lamp = sampleLight(wx,wy)*factor;
        buffer[row++] = sheet[idx]*factor + 31*(1-factor) + lamp*23;
        buffer[row++] = sheet[idx+1]*factor + 23*(1-factor) + lamp*13;
        buffer[row++] = sheet[idx+2]*factor + 33*(1-factor) + lamp*4;
        buffer[row++] = 255;
        wx += 2*rx;
        wy += 2*ry;
      }
    }
    fg.putImageData(backdrop, 0, 0);
    g.drawImage(floorLayer, 0, 0, w, h);
  }

  function project(obj, p) {
    const dx = obj.x-p.x, dy = obj.y-p.y;
    const z = dx*fx + dy*fy;
    return { z, u: w/2 + (-dx*fy+dy*fx)*focal/z };
  }

  function billboards(state) {
    const objects = [];
    for (const e of state.enemies) {
      if (e.dead > 2.9) continue;
      const rig = art.monsters[e.type];
      objects.push({ x:e.x, y:e.y, creature:e, rig, size:rig.h, aspect:1.65, time:state.time,
        side:Math.sin(e.heading-Math.atan2(state.p.y-e.y,state.p.x-e.x)) });
    }
    const sizes = {ammo:.22,health:.22,armor:.21,seal:.35,lantern:.52,crate:.42,scrap:.21};
    for (const o of state.pickups) {
      if (!o.taken) objects.push({ ...o, image: art.items[o.kind], size: sizes[o.kind],
        lift: o.kind === 'seal' ? .13+Math.sin(state.time*4)*.038 : 0 });
    }
    objects.push({ ...state.map.exit, size: 1.08, image: textures.portal[Number(state.open)] });
    for (const b of state.bolts) objects.push({ ...b, size:.14, image:art.items.bolt, lift:.48, ember:true, time:state.time });
    for (const f of state.fragments) objects.push({ ...f, zHeight:f.z, size:.05, aspect:1.8, fragment:true });
    for (const o of objects) Object.assign(o,project(o,state.p));
    objects.sort((a,b)=>b.z-a.z);
    for (const o of objects) drawSprite(o);
  }

  function drawSprite(o) {
    if (o.z < .13 || o.z > 27) return;
    const unit = focal/o.z;
    const tall = unit*o.size;
    const wide = tall*(o.aspect ?? (o.image.width/o.image.height));
    const foot = horizon + unit*eye;
    const top = foot - tall - unit*(o.lift ?? 0);
    const left = o.u-wide/2;
    const first = Math.max(0, Math.floor(left));
    const last = Math.min(w, Math.ceil(left+wide));
    if (first >= last) return;
    const bars = [];
    for (let x = first; x < last;) {
      if (depth[x] <= o.z) { x++; continue; }
      const start = x;
      while (x < last && depth[x] > o.z) x++;
      bars.push([Math.max(left,start), Math.min(left+wide,x)]);
    }
    if (!bars.length) return;
    g.save();
    g.beginPath();
    for (const [a,b] of bars) g.rect(a,0,b-a,h);
    g.clip();
    if (o.creature) {
      const e = o.creature;
      const opacity = 1-clamp((e.dead-2.2)/.7,0,1);
      g.globalAlpha = opacity;
      const r = wide*.24;
      g.fillStyle = 'rgba(47,27,35,.27)';
      g.beginPath();
      g.ellipse(o.u+r*.19,foot,r,r*.28,-.12,0,Math.PI*2);
      g.fill();
      g.fillStyle = 'rgba(52,29,35,.22)';
      g.beginPath();
      g.ellipse(o.u,foot,r*.63,r*.12,-.12,0,Math.PI*2);
      g.fill();
      drawCreature(g,o.rig,e,o.u,foot,unit,o.time,o.side);
    } else if (o.fragment) {
      const y = foot - unit*o.zHeight;
      g.translate(o.u,y);
      g.rotate(o.angle);
      g.globalAlpha = Math.min(1,(1-o.age/o.life)*2.5);
      g.fillStyle = o.color;
      g.beginPath();
      g.moveTo(-wide*.38,0); g.lineTo(wide*.30,-tall*.24);
      g.lineTo(wide*.36,tall*.27); g.lineTo(-wide*.18,tall*.38);
      g.fill();
      g.fillStyle = '#f3c890';
      g.fillRect(-wide*.25,-tall*.05,wide*.53,Math.max(.6,tall*.10));
    } else {
      if (o.size > .2) {
        g.fillStyle = 'rgba(51,28,38,.31)';
        g.beginPath();
        g.ellipse(o.u+wide*.07,foot,wide*.46,Math.max(1,wide*.085),-.09,0,Math.PI*2);
        g.fill();
      }
      if (o.ember) {
        g.translate(o.u,top+tall/2);
        g.rotate(o.time*11);
        g.drawImage(o.image,-wide/2,-tall/2,wide,tall);
      } else g.drawImage(o.image,left,top,wide,tall);
    }
    g.restore();
  }

  function drawWeapon(state) {
    const image = art.weapons[state.weapon];
    const scale = Math.min(h*.39,w*.51);
    const sway = Math.sin(state.walk*7)*Math.min(7,h*.011);
    const x = w*.52 - scale*.42 + sway;
    const recoil = state.recoil;
    const y = h-scale+recoil*h*.042 + Math.abs(sway)*.36;
    g.save();
    g.translate(x+scale*.5,h);
    g.rotate(state.weapon === 0 ? -.37*recoil : -.045*recoil);
    g.drawImage(image,-scale*.5,y-h,scale,scale*1.08);
    g.restore();
    if (state.weapon !== 0 && recoil > .60) {
      const cx = x+scale*.56, cy = y+scale*.14;
      const r = scale*(.13 + recoil*.10);
      stamp = g.createRadialGradient(cx,cy,0,cx,cy,r*1.8);
      stamp.addColorStop(0,'rgba(249,181,88,.42)');
      stamp.addColorStop(1,'rgba(249,181,88,0)');
      g.fillStyle = stamp;
      g.fillRect(cx-r*2,cy-r*2,r*4,r*4);
      g.beginPath();
      for (let j=0;j<14;j++) {
        const a = j*Math.PI/7;
        const rr = r*(j%2?.30:1);
        g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);
      }
      g.fillStyle = '#e6ad67';
      g.fill();
    }
  }

  function render(state, weapon) {
    if (!w) resize();
    if (themeIndex !== state.map.chapterIndex) {
      themeIndex = state.map.chapterIndex;
      if (!themes.has(themeIndex)) themes.set(themeIndex,art.chapter(state.map.chapter,themeIndex));
      textures = themes.get(themeIndex);
    }
    if (mapRef!==state.map) {
      mapRef = state.map;
      bakeLight(mapRef);
    }
    angle = state.p.a;
    fx = Math.cos(angle);
    fy = Math.sin(angle);
    focal = Math.min(w / (2*optics), h * 1.12);
    horizon = h*.50 + state.p.pitch*h;
    eye = .54 + Math.sin(state.walk*7)*.010;
    drawSheets(state.p);
    for (let x = 0; x < w; x += 2) {
      const side = (x+.5-w/2)/focal;
      const ray = raycast(state.map.grid,state.p.x,state.p.y,fx-fy*side,fy+fx*side);
      const z = Math.max(.05,ray.depth);
      depth[x] = depth[x+1] = z;
      const panel = (ray.mx*41+ray.my*29+ray.side*7)%13;
      const texture = textures.walls[ray.tile===2 ? 3 : panel<2 ? 2 : panel<6 ? 1 : 0];
      const unit = focal/z;
      const y = horizon-unit*(1.15-eye);
      g.drawImage(texture, clamp(Math.floor(ray.u*texture.width),0,texture.width-1),0,1,texture.height,x,y,2,unit*1.15+.55);
      const wx = state.p.x + z*(fx-fy*side)*.97;
      const wy = state.p.y + z*(fy+fx*side)*.97;
      const lamp = sampleLight(wx,wy);
      const shadow = clamp(.055 + .11*ray.side + z*.036 - lamp*.115,.035,.73);
      g.fillStyle = 'rgba(42,21,44,'+shadow+')';
      g.fillRect(x,y,2,unit*1.15+.55);
      if (lamp>.23) {
        g.fillStyle = 'rgba(255,186,104,'+Math.min(.18,lamp*.105)+')';
        g.fillRect(x,y,2,unit*1.15+.55);
      }
    }
    billboards(state);
    for (const [px,py,turn] of art.motes) {
      const u = ((px+state.time*(.006+turn*.009))%1)*w;
      const v = ((py+Math.sin(state.time*.18+turn*10)*.035+1)%1)*h;
      g.fillStyle = turn>.7 ? 'rgba(245,202,136,.22)' : 'rgba(236,197,156,.13)';
      g.fillRect(u,v,1+turn,1+turn*.6);
    }
    g.fillStyle = upperLeft;
    g.fillRect(0,0,w,h);
    if (weapon) {
      drawWeapon(state);
      const cy = horizon - (state.p.pitch*h);
      g.strokeStyle = 'rgba(250,225,173,.73)';
      g.beginPath();
      g.moveTo(w/2-7,cy); g.lineTo(w/2-3,cy);
      g.moveTo(w/2+3,cy); g.lineTo(w/2+7,cy);
      g.moveTo(w/2,cy-7); g.lineTo(w/2,cy-3);
      g.moveTo(w/2,cy+3); g.lineTo(w/2,cy+7);
      g.stroke();
      if (state.hit > 0) {
        g.strokeStyle = '#f1b56a';
        g.beginPath();
        for (const x of [-1,1]) for (const y of [-1,1]) {
          g.moveTo(w/2+x*9,cy+y*9); g.lineTo(w/2+x*4,cy+y*4);
        }
        g.stroke();
      }
      if (state.hurt > 0) {
        g.fillStyle = 'rgba(154,44,48,'+state.hurt*.17+')';
        g.fillRect(0,0,w,h);
      }
    }
  }

  resize();
  return { render, resize };
}
