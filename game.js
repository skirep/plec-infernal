import { arsenal, bestiary, chapters, directions, distances, makeLevel, random } from './campaign.js';
import { makeArt } from './art.js';
import { makeView, raycast } from './view.js';

const $ = id => document.getElementById(id);
const world = $('world');
const coarse = matchMedia('(pointer: coarse)').matches;
const art = makeArt();
const view = makeView(world, art);
const mapCanvas = $('minimap');
const mapInk = mapCanvas.getContext('2d');
const keys = new Set();
const joystick = { x: 0, y: 0, id: null };
const aim = { id: null, x: 0, y: 0 };
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const rand = random(148);
const get = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* Play remains available in private mode. */ }
};
let checkpoint = clamp(Number(get('plec-level', 0)) || 0, 0, 29);
let campaignWon = get('plec-won', '') === 'yes';
let muted = get('plec-muted', '') === 'yes';
let scene = 'menu';
let state;
let firing = false;
let firePointer = null;
let showMap = false;
let noticeTimer = 0;
let audio, audioNoise, audioGain;
let lastFrame;
let wantsLock = false;

function audioReady() {
  if (!audio && window.AudioContext) {
    audio = new AudioContext();
    audioGain = audio.createGain();
    audioGain.gain.value = .23;
    audioGain.connect(audio.destination);
    audioNoise = audio.createBuffer(1,Math.floor(audio.sampleRate*.26),audio.sampleRate);
    const samples = audioNoise.getChannelData(0);
    const noiseRng = random(7107);
    let noise = 0;
    for (let i = 0; i < samples.length; i++) {
      noise = .71*noise + (noiseRng()-.5)*.58;
      samples[i] = noise;
    }
  }
  if (audio?.state === 'suspended') audio.resume().catch(() => {});
}

function effect(kind, weapon = 0) {
  if (!audio || muted || audio.state !== 'running') return;
  const freq = kind === 'shot' ? [100,178,86,134,62,373,73][weapon] :
    {hit:93, pickup:570, seal:714, hurt:65, exit:512, bolt:105, empty:180}[kind];
  const length = kind === 'shot' ? (weapon === 4 || weapon === 6 ? .24:.115) : .15;
  const now = audio.currentTime;
  const tone = audio.createOscillator();
  const envelope = audio.createGain();
  tone.type = kind === 'shot' ? 'triangle' : 'sine';
  tone.frequency.setValueAtTime(freq,now);
  tone.frequency.exponentialRampToValueAtTime(freq*(kind === 'pickup'||kind === 'seal' ? 1.5:.53),now+length);
  envelope.gain.setValueAtTime(.23,now);
  envelope.gain.exponentialRampToValueAtTime(.001,now+length);
  tone.connect(envelope).connect(audioGain);
  tone.start(); tone.stop(now+length);
  if (kind !== 'shot' && kind !== 'hurt') return;
  const flap = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = weapon === 5 ? 1900:800;
  flap.buffer = audioNoise;
  flap.connect(filter).connect(envelope);
  flap.start(); flap.stop(now+length);
}

function refreshSound() {
  $('sound').textContent = muted ? 'So desactivat' : 'So activat';
  $('sound').setAttribute('aria-pressed', String(!muted));
}

function reset(index, campaign) {
  const map = makeLevel(index);
  state = {
    map, index, campaign,
    p: { ...map.start,a:0,pitch:0,health:100,armor:0 },
    enemies: map.enemies.map((e,i) => ({ ...e, ...bestiary[e.type], phase:i*2.4,
      wake:i===0 ? .35 : -1, dead:0, cooldown:.30+(i%6)*.13, flash:0 })),
    pickups: map.pickups, bolts: [], ammo: arsenal.map(w => w.stock ? Math.ceil(w.stock*.62) : Infinity),
    weapon: 1, time:0, walk:0, recoil:0, shot:0, hit:0, hurt:0, navTimer:0,
    path:null, seal:false, open:false, kills:0, discovered:new Uint8Array(map.size*map.size)
  };
  noticeTimer = 0;
  $('notice').textContent = '';
  $('location').textContent = String(index+1).padStart(2,'0') + ' / 30 · ' + map.name;
  updateHud();
}

function clearInput() {
  firing = false;
  firePointer = null;
  keys.clear();
  joystick.id = aim.id = null;
  joystick.x = joystick.y = 0;
  $('stick').firstElementChild.style.transform = '';
}

function pointerLock() {
  if (coarse || document.pointerLockElement === world || !world.requestPointerLock) return;
  try { world.requestPointerLock()?.catch(() => {}); } catch { /* Arrow keys remain available. */ }
}

function start(index, campaign) {
  reset(index,campaign);
  if ($('levels').open) $('levels').close();
  scene = 'play';
  audioReady();
  setScene();
  pointerLock();
}

function setScene() {
  const playing = scene === 'play';
  $('game').classList.toggle('playing',playing);
  $('menu').hidden = scene !== 'menu';
  $('interlude').hidden = playing || scene === 'menu';
  $('hud').hidden = !playing;
  $('touch').hidden = !coarse;
  clearInput();
  if (!playing && document.pointerLockElement === world) document.exitPointerLock();
  $('start').textContent = campaignWon ? 'Torna a començar' : checkpoint ? 'Continua · nivell '+(checkpoint+1) : 'Comença la campanya';
  if (!playing && scene !== 'menu') $('advance').focus();
  if (scene === 'menu' && !$('levels').open) $('start').focus({preventScroll:true});
}

function interlude(mode) {
  scene = mode;
  const options = {
    pause: ['En pausa',state.map.name, 'El nivell queda aturat.', 'Continua'],
    dead: ['Pàgina estripada','Has caigut', 'La impremta t’ha atrapat. Torna a intentar aquest nivell.', 'Torna-ho a provar'],
    clear: ['Pàgina superada',state.map.name, state.kills+' monstres abatuts de '+state.enemies.length+'.', 'Nivell següent'],
    win: ['Campanya completada','Has tancat el llibre', 'El Punxó ha caigut. La impremta torna a estar en silenci.', 'Torna al títol']
  };
  if (mode === 'clear' && !state.campaign) options.clear[3] = 'Tria un altre nivell';
  if (mode === 'win' && !state.campaign) options.win[0] = 'Nivell 30 superat';
  const [tag,title,copy,action] = options[mode];
  $('interlude-kicker').textContent = tag;
  $('interlude-title').textContent = title;
  $('interlude-copy').textContent = copy;
  $('advance').textContent = action;
  $('help').textContent = mode === 'pause'
    ? coarse ? 'Joystick per moure’t · arrossega el dit per mirar · FOC per disparar'
       : 'WASD per moure’t · ratolí o ← → per mirar · clic o espai per disparar · 1–7 armes · M mapa · Maj per córrer'
    : '';
  setScene();
}

function backHome() {
  scene = 'menu';
  reset(0,true);
  setScene();
}

function say(text) {
  $('notice').textContent = text;
  noticeTimer = 1.75;
}

function canStand(x,y,r) {
  const {grid} = state.map;
  return !grid[Math.floor(y-r)]?.[Math.floor(x-r)] &&
    !grid[Math.floor(y-r)]?.[Math.floor(x+r)] &&
    !grid[Math.floor(y+r)]?.[Math.floor(x-r)] &&
    !grid[Math.floor(y+r)]?.[Math.floor(x+r)];
}

function move(o,dx,dy,r=.19) {
  if (canStand(o.x+dx,o.y,r)) o.x += dx;
  if (canStand(o.x,o.y+dy,r)) o.y += dy;
}

function changeWeapon(index) {
  if (arsenal[index].unlock > state.index) { say('Aquesta arma encara està bloquejada'); return; }
  state.weapon = index;
  state.recoil = .25;
  state.shot = Math.max(.10,state.shot);
  updateHud();
}

function nextWeapon(direction) {
  let index = state.weapon;
  do { index = (index+direction+arsenal.length)%arsenal.length; }
  while (arsenal[index].unlock > state.index);
  changeWeapon(index);
}

function damageEnemy(enemy, damage) {
  if (enemy.dead) return;
  enemy.hp -= damage*(enemy.armor ?? 1);
  enemy.flash = .12;
  if (enemy.wake < 0) enemy.wake = .12;
  state.hit = .15;
  if (enemy.hp <= 0) {
    enemy.dead = .001;
    state.kills++;
  }
}

function shoot() {
  const s = state;
  const {p,weapon} = s;
  const w = arsenal[weapon];
  if (s.ammo[weapon] <= 0) {
    effect('empty');
    s.shot = .38;
    say('Sense munició · canvia d’arma');
    return;
  }
  s.ammo[weapon]--;
  s.shot = w.rate;
  s.recoil = 1;
  effect('shot',weapon);
  const count = w.pellets ?? 1;
  for (let i = 0; i < count; i++) {
    const a = p.a + (i === 0 ? (count === 1 ? (rand()-.5)*(w.spread ?? 0) : 0) : (rand()-.5)*w.spread);
    const dx = Math.cos(a), dy = Math.sin(a);
    const distance = Math.min(w.range,raycast(s.map.grid,p.x,p.y,dx,dy).depth);
    const matches = [];
    for (const e of s.enemies) {
      if (e.dead) continue;
      const ex = e.x-p.x, ey = e.y-p.y;
      const along = ex*dx+ey*dy;
      const radius = e.type>=12 ? .46 : .33;
      const aimHeight = .54+p.pitch*along*Math.max(world.height*1.44/world.width,1/1.12);
      if (along>0 && along<=distance+radius*.12 && Math.abs(ex*dy-ey*dx)<radius &&
        (weapon === 0 || (aimHeight >= -.035 && aimHeight <= (e.type>=12 ? 1.15 : .77)))) {
        matches.push({ e, along });
      }
    }
    matches.sort((a,b)=>a.along-b.along);
    if (w.blast) {
      const impact = Math.min(distance, matches[0]?.along ?? distance);
      const x = p.x+dx*Math.max(.1,impact-.10);
      const y = p.y+dy*Math.max(.1,impact-.10);
      for (const e of s.enemies) {
        const gap = Math.hypot(e.x-x,e.y-y);
        if (gap < w.blast && (gap < .10 || raycast(s.map.grid,x,y,(e.x-x)/gap,(e.y-y)/gap).depth >= gap)) {
          damageEnemy(e, w.damage*(1-.66*gap/w.blast));
        }
      }
      const back = Math.hypot(x-p.x,y-p.y);
      if (back < w.blast*.60) hurtPlayer(13*(1-back/w.blast));
    } else if (w.pierce) {
      matches.forEach(({e}) => damageEnemy(e,w.damage));
    } else if (matches.length) damageEnemy(matches[0].e, w.damage);
  }
}

function hurtPlayer(damage) {
  const p = state.p;
  const absorbed = Math.min(p.armor, Math.ceil(damage*.65));
  p.armor -= absorbed;
  p.health = Math.max(0,p.health-Math.ceil(damage-absorbed));
  state.hurt = .84;
  effect('hurt');
}

function trackEnemy(e,dt) {
  const {p,map,path} = state;
  const dx = p.x-e.x, dy = p.y-e.y;
  const gap = Math.hypot(dx,dy);
  const clear = gap > .02 && raycast(map.grid,e.x,e.y,dx/gap,dy/gap).depth >= gap-.04;
  if (e.wake < 0 && ((clear && gap < 8.5) || gap < 2.4)) e.wake = 0;
  if (e.wake < 0) return;
  e.wake += dt;
  e.cooldown -= dt;
  if (e.wake < .24) return;
  if (e.cooldown <= 0 && clear && gap < (e.ranged ? 6.8 : .74)) {
    e.cooldown = e.ranged ? 1.23+(e.phase%1)*.55 : .80;
    if (e.ranged && gap > .78) {
      const a = Math.atan2(dy,dx);
      const spread = e.type === 13 ? [-.16,0,.16] : e.type === 12 ? [-.075,.075] : [0];
      for (const v of spread) state.bolts.push({ x:e.x, y:e.y, vx:Math.cos(a+v)*3.3, vy:Math.sin(a+v)*3.3, damage:e.damage, life:3.3 });
      if (gap < 4) effect('bolt');
    } else {
      hurtPlayer(e.damage);
    }
  }
  if (clear && gap < (e.ranged ? 3.2 : .57)) return;
  let mx = dx, my = dy;
  if (!clear) {
    const x = Math.floor(e.x), y = Math.floor(e.y), here = path[y*map.size+x];
    const next = directions.find(([ox,oy])=>{
      const cost = path[(y+oy)*map.size+x+ox];
      return cost >= 0 && cost < here;
    });
    if (!next) return;
    mx = x+next[0]+.5-e.x;
    my = y+next[1]+.5-e.y;
  }
  const length = Math.max(.01,Math.hypot(mx,my));
  const pace = e.pace*(1+state.index*.008);
  const ox = e.x, oy = e.y;
  move(e,mx/length*pace*dt,my/length*pace*dt,.18);
  if (Math.hypot(e.x-ox,e.y-oy) < .002 && !clear) move(e, (Math.floor(e.x)+.5-e.x)*dt*3, (Math.floor(e.y)+.5-e.y)*dt*3,.18);
  for (const other of state.enemies) {
    if (other === e || other.dead) continue;
    const x = e.x-other.x, y = e.y-other.y;
    const d = Math.hypot(x,y);
    if (d>.001 && d<.44) move(e,x/d*dt*.8,y/d*dt*.8,.15);
  }
}

function updateBolts(dt) {
  state.bolts = state.bolts.filter(b => {
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    if (b.life <=0 || !canStand(b.x,b.y,.04)) return false;
    if (Math.hypot(b.x-state.p.x,b.y-state.p.y)<.28) {
      hurtPlayer(b.damage);
      return false;
    }
    return true;
  });
}

function collect() {
  for (const o of state.pickups) {
    if (o.taken || Math.hypot(o.x-state.p.x,o.y-state.p.y)>.52) continue;
    if (o.kind === 'health' && state.p.health < 100) {
      state.p.health = Math.min(100,state.p.health+32);
      say('Vida recuperada');
    } else if (o.kind === 'armor' && state.p.armor < 100) {
      state.p.armor = Math.min(100,state.p.armor+36);
      say('Armadura recuperada');
    } else if (o.kind === 'ammo') {
      arsenal.forEach((w,i) => {
        if (w.stock && w.unlock <= state.index) state.ammo[i] = Math.min(w.stock,state.ammo[i]+Math.ceil(w.stock*.32));
      });
      say('Munició recollida');
    } else if (o.kind === 'seal') {
      state.seal = true;
      say('Segell recuperat');
    } else continue;
    o.taken = true;
    effect(o.kind === 'seal' ? 'seal' : 'pickup');
  }
}

function checkExit() {
  const s = state;
  const next = s.map.goal === 'Cap' ? s.enemies.every(e=>e.type<12 || e.dead)
    : s.map.goal === 'Segell' ? s.seal : s.kills === s.enemies.length;
  if (next && !s.open) {
    s.open = true;
    say('Sortida oberta');
    effect('exit');
  }
  if (!s.open || Math.hypot(s.p.x-s.map.exit.x,s.p.y-s.map.exit.y) > .55) return;
  if (s.campaign) {
    checkpoint = Math.max(checkpoint,Math.min(29,s.index+1));
    save('plec-level',checkpoint);
    if (s.index === 29) {
      campaignWon = true;
      save('plec-won','yes');
    }
  }
  interlude(s.index === 29 ? 'win' : 'clear');
}

function updateHud() {
  const s = state;
  const w = arsenal[s.weapon];
  const heading = s.open ? 'Arriba a la sortida' : s.map.goal === 'Cap' ? 'Derrota el cap del capítol'
    : s.map.goal === 'Segell' ? 'Recupera el segell' : 'Monstres que queden · '+(s.enemies.length-s.kills);
  $('objective').textContent = heading;
  $('health').textContent = s.p.health;
  $('armor').textContent = s.p.armor;
  $('weapon-name').textContent = w.name;
  $('ammo').textContent = w.stock ? s.ammo[s.weapon] : '∞';
}

function updateMap() {
  const s = state, {size,grid} = s.map, p = s.p;
  const tile = mapCanvas.width/size;
  const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
  for (let y = Math.max(0,y0-3); y <= Math.min(size-1,y0+3); y++) {
    for (let x = Math.max(0,x0-3); x <= Math.min(size-1,x0+3); x++) {
      if (Math.hypot(x-x0,y-y0)<3.9) s.discovered[y*size+x] = 1;
    }
  }
  if (!showMap) return;
  mapInk.fillStyle = '#281e2a';
  mapInk.fillRect(0,0,mapCanvas.width,mapCanvas.height);
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    if (!s.discovered[y*size+x]) continue;
    mapInk.fillStyle = grid[y][x] ? '#4c3947' : '#91634d';
    mapInk.fillRect(x*tile,y*tile,tile,tile);
  }
  if (s.open) {
    mapInk.fillStyle = '#7ca78a';
    mapInk.fillRect((s.map.exit.x-.4)*tile,(s.map.exit.y-.4)*tile,tile*.8,tile*.8);
  }
  mapInk.save();
  mapInk.translate(p.x*tile,p.y*tile);
  mapInk.rotate(p.a);
  mapInk.fillStyle = '#f4d490';
  mapInk.beginPath();
  mapInk.moveTo(5,0); mapInk.lineTo(-3,3); mapInk.lineTo(-3,-3);
  mapInk.fill();
  mapInk.restore();
}

const down = (...names) => names.some(k=>keys.has(k));

function update(dt) {
  const s = state, {p,map} = s;
  s.time += dt;
  s.recoil = Math.max(0,s.recoil-dt*5.6);
  s.shot -= dt;
  s.hit = Math.max(0,s.hit-dt);
  s.hurt = Math.max(0,s.hurt-dt*2.4);
  p.a += (Number(down('ArrowRight'))-Number(down('ArrowLeft')))*dt*2.1;
  const forward = Number(down('KeyW','ArrowUp'))-Number(down('KeyS','ArrowDown'))-joystick.y;
  const strafe = Number(down('KeyD'))-Number(down('KeyA'))+joystick.x;
  const magnitude = Math.max(1,Math.hypot(forward,strafe));
  const speed = (down('ShiftLeft','ShiftRight')?4.8:3.12)*dt/magnitude;
  if (forward || strafe) {
    const oldX=p.x, oldY=p.y;
    move(p,(Math.cos(p.a)*forward-Math.sin(p.a)*strafe)*speed,(Math.sin(p.a)*forward+Math.cos(p.a)*strafe)*speed);
    s.walk += Math.hypot(p.x-oldX,p.y-oldY);
  }
  s.navTimer -= dt;
  if (s.navTimer <= 0) {
    s.navTimer = .20;
    s.path = distances(map.grid,Math.floor(p.x),Math.floor(p.y));
  }
  if ((firing || down('Space')) && s.shot<=0) shoot();
  for (const e of s.enemies) {
    e.flash = Math.max(0,e.flash-dt);
    if (e.dead) e.dead += dt;
    else trackEnemy(e,dt);
  }
  updateBolts(dt);
  if (noticeTimer > 0 && (noticeTimer -= dt) <= 0) $('notice').textContent = '';
  if (p.health <= 0) { interlude('dead'); return; }
  collect();
  checkExit();
  updateHud();
  updateMap();
}

function animate(now) {
  const dt = Math.min(.045,lastFrame === undefined ? 0 : (now-lastFrame)/1000);
  lastFrame = now;
  if (scene === 'play') update(dt);
  if (scene === 'menu') {
    state.time += dt*.7;
    state.p.a = -.38+Math.sin(state.time*.68)*.045;
  }
  view.render(state,scene === 'play'||scene === 'pause');
  requestAnimationFrame(animate);
}

function toggleMap() {
  showMap = !showMap;
  mapCanvas.hidden = !showMap;
  $('map-toggle').setAttribute('aria-pressed',String(showMap));
}

$('sound').onclick = () => { muted = !muted; save('plec-muted',muted?'yes':'no'); refreshSound(); };
$('start').onclick = () => {
  if (campaignWon) {
    campaignWon = false; checkpoint = 0;
    save('plec-level',0); save('plec-won','no');
  }
  start(checkpoint,true);
};
$('browse').onclick = () => $('levels').showModal();
$('close-levels').onclick = () => $('levels').close();
$('pause').onclick = () => interlude('pause');
$('map-toggle').onclick = toggleMap;
$('home').onclick = backHome;
$('advance').onclick = () => {
  if (scene === 'pause') { scene='play'; setScene(); pointerLock(); return; }
  if (scene === 'dead') { start(state.index,state.campaign); return; }
  if (scene === 'clear' && state.campaign) { start(state.index+1,true); return; }
  const browse = scene === 'clear';
  backHome();
  if (browse) $('levels').showModal();
};

for (const [i,chapter] of chapters.entries()) {
  const section = document.createElement('section');
  section.className = 'chapter';
  const h = section.appendChild(document.createElement('h3'));
  h.textContent = chapter.name;
  const row = section.appendChild(document.createElement('div'));
  for (const [j,name] of chapter.maps.entries()) {
    const index = i*5+j;
    const button = row.appendChild(document.createElement('button'));
    button.appendChild(document.createElement('span')).textContent = String(index+1).padStart(2,'0');
    button.append(document.createTextNode(name));
    button.onclick = () => start(index,false);
  }
  $('level-list').append(section);
}

document.addEventListener('keydown',e=>{
  if (scene === 'pause' && e.code === 'Escape' && !e.repeat) { scene='play'; setScene(); pointerLock(); return; }
  if (scene !== 'play') return;
  if (e.code === 'Escape') { interlude('pause'); return; }
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'KeyQ') nextWeapon(-1);
  if (e.code === 'KeyE') nextWeapon(1);
  if (/^Digit[1-7]$/.test(e.code)) changeWeapon(Number(e.code.at(-1))-1);
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('pointerlockchange',()=>{
  const locked = document.pointerLockElement === world;
  if (!locked && wantsLock && scene === 'play') interlude('pause');
  wantsLock = locked;
});
document.addEventListener('visibilitychange',()=>{
  if (document.hidden && scene === 'play') interlude('pause');
});
window.addEventListener('blur',clearInput);
window.addEventListener('resize',view.resize);
document.addEventListener('pointerup',e=>{ if (e.pointerType === 'mouse') firing = false; });
document.addEventListener('mousemove',e=>{
  if (scene !== 'play' || document.pointerLockElement !== world) return;
  state.p.a += e.movementX*.00265;
  state.p.pitch = clamp(state.p.pitch-e.movementY*.0013,-.22,.22);
});
world.addEventListener('wheel',e=>{
  if (scene !== 'play' || !e.deltaY) return;
  e.preventDefault();
  nextWeapon(Math.sign(e.deltaY));
},{passive:false});
world.onpointerdown = e => {
  if (scene !== 'play') return;
  if (e.pointerType === 'mouse') {
    if (e.button !== 0) return;
    pointerLock();
    firing = true;
    if (state.shot <= 0) shoot();
    return;
  }
  if (aim.id !== null) return;
  aim.id=e.pointerId; aim.x=e.clientX; aim.y=e.clientY;
  world.setPointerCapture(e.pointerId);
};
world.onpointermove = e => {
  if (aim.id !== e.pointerId || scene !== 'play') return;
  state.p.a += (e.clientX-aim.x)*.009;
  state.p.pitch = clamp(state.p.pitch-(e.clientY-aim.y)*.004,-.22,.22);
  aim.x=e.clientX; aim.y=e.clientY;
};
world.onlostpointercapture = e => { if (aim.id === e.pointerId) aim.id=null; };

const stick = $('stick');
function moveStick(e) {
  if (e.pointerId !== joystick.id) return;
  const box = stick.getBoundingClientRect();
  const r = box.width*.35;
  const x = (e.clientX-box.left-box.width/2)/r, y=(e.clientY-box.top-box.height/2)/r;
  const l = Math.max(1,Math.hypot(x,y));
  joystick.x=x/l; joystick.y=y/l;
  stick.firstElementChild.style.transform = 'translate('+joystick.x*r+'px,'+joystick.y*r+'px)';
}
stick.onpointerdown = e => {
  if (joystick.id !== null) return;
  joystick.id=e.pointerId;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
};
stick.onpointermove = moveStick;
stick.onlostpointercapture = e => {
  if (joystick.id !== e.pointerId) return;
  joystick.id=null; joystick.x=joystick.y=0;
  stick.firstElementChild.style.transform='';
};
$('fire').onpointerdown = e => {
  if (firePointer !== null) return;
  firePointer = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  firing=true;
  if (state.shot<=0) shoot();
};
$('fire').onlostpointercapture = e => { if (firePointer === e.pointerId) { firePointer=null; firing=false; } };
$('switch').onclick = () => nextWeapon(1);

refreshSound();
reset(0,true);
setScene();
$('start').disabled = $('browse').disabled = false;
requestAnimationFrame(animate);
