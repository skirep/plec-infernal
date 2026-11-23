import { mix, shade } from './vendor/paperkit-2d.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = t => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const diamond = (x,y,w,h) => [[x-w,y],[x,y-h],[x+w,y],[x,y+h]];
const shard = [[.24,0],[.06,.29],[.13,.82],[.37,1],[.86,.93],[.98,.62],[.79,.15],[.63,0]];
const shield = [[.21,0],[.06,.23],[0,.73],[.21,.93],[.52,1],[.86,.91],[1,.69],[.91,.26],[.73,0]];
const fin = [[0,.20],[.12,.70],[.51,.91],[.95,1],[1,.80],[.77,.28],[.41,0],[.23,.18]];
const talon = [[.04,.40],[.17,.71],[.61,1],[.99,.90],[.94,.51],[.66,.33],[.61,0],[.39,.14],[.23,.03],[0,.16]];
const banner = [[.14,0],[0,.18],[.16,.43],[.04,.73],[.23,1],[.89,.94],[1,.66],[.83,.28],[.90,.02],[.59,.15],[.35,.05]];
const rib = [[.09,.02],[0,.50],[.16,.86],[.54,1],[.95,.81],[1,.24],[.74,0],[.34,.09]];
const silhouettes = { shard, shield, fin, talon, banner, rib };

// Face, stature and joint proportions are in body-height units.
const profiles = {
  jaw:      {mode:'walk', h:.77, chest:.43, face:.61, leg:.29, arm:.30, reach:.40, part:'talon', stride:.33},
  moth:     {mode:'wing', h:.55, chest:.25, face:.45, wing:.62, reach:.26, part:'fin', stride:.26, float:.20},
  spider:   {mode:'crawl',h:.51, chest:.48, face:.54, leg:.30, reach:.47, part:'shard', stride:.28},
  knight:   {mode:'walk', h:.90, chest:.51, face:.50, leg:.30, arm:.36, reach:.48, part:'shield', stride:.37},
  mask:     {mode:'walk', h:.82, chest:.36, face:.58, leg:.28, arm:.38, reach:.42, part:'banner', stride:.33},
  shell:    {mode:'crawl',h:.57, chest:.66, face:.52, leg:.26, reach:.54, part:'shield', stride:.35},
  worm:     {mode:'coil', h:.68, chest:.49, face:.54, leg:.25, reach:.39, part:'rib', stride:.31},
  ghost:    {mode:'drift',h:.63, chest:.46, face:.50, wing:.34, reach:.48, part:'banner', stride:.26, float:.17},
  wolf:     {mode:'run',  h:.70, chest:.48, face:.53, leg:.33, arm:.32, reach:.49, part:'talon', stride:.40},
  furnace:  {mode:'walk', h:.81, chest:.56, face:.57, leg:.24, arm:.39, reach:.50, part:'shield', stride:.35},
  effigy:   {mode:'walk', h:.88, chest:.29, face:.51, leg:.34, arm:.44, reach:.49, part:'banner', stride:.39},
  golem:    {mode:'walk', h:.95, chest:.59, face:.50, leg:.33, arm:.40, reach:.55, part:'rib', stride:.44},
  crown:    {mode:'walk', h:1.10, chest:.61, face:.61, leg:.27, arm:.41, reach:.52, part:'shield', stride:.41},
  puncture: {mode:'walk', h:1.13, chest:.54, face:.58, leg:.31, arm:.49, reach:.63, part:'talon', stride:.44}
};

export function makeCreatureRigs(bestiary, masks, print, layer) {
  return bestiary.map((species, i) => {
    const profile = profiles[species.form];
    const { color, accent } = species;
    const torso = print(shield, shade(color,.83), p => {
      layer(p,[[.13,.20],[.18,.73],[.48,.91],[.79,.76],[.87,.32],[.64,.14],[.40,.11]],color);
      layer(p,[[.22,.51],[.33,.74],[.54,.82],[.75,.64],[.67,.31],[.50,.24],[.36,.29]],mix(color,accent,.38));
      for (let j=0;j<3;j++) layer(p,[[.22+j*.16,.40],[.29+j*.16,.47],[.38+j*.16,.28],[.30+j*.16,.22]],shade(color,.70),.20);
      layer(p,diamond(.52,.56,.12,.095),accent,.26);
    }, 740+i, 112);
    const limb = print(silhouettes[profile.part], shade(color,.79), p => {
      layer(p,[[.20,.22],[.18,.69],[.41,.89],[.76,.82],[.81,.56],[.65,.26],[.44,.18]],mix(color,accent,.25));
      layer(p,[[.25,.70],[.66,.72],[.73,.56],[.36,.51]],accent,.22);
      layer(p,diamond(.52,.34,.10,.073),shade(color,.56),.18);
    }, 831+i, 106);
    const foot = print(talon, color, p => {
      layer(p,[[.10,.40],[.23,.70],[.57,.88],[.87,.81],[.78,.51],[.57,.29],[.35,.23]],mix(color,accent,.47));
      layer(p,[[.18,.39],[.46,.44],[.65,.60],[.61,.48],[.46,.25],[.23,.18]],accent,.20);
    }, 932+i, 80);
    return { ...profile, torso, limb, foot, mask:masks[i], color, accent, ranged:species.ranged };
  });
}

const foldTime = .88;
export function monsterPose(e, rig, time, side) {
  const phase = e.travel * Math.PI / rig.stride + e.phase;
  const stride = e.gait;
  const flinch = e.flash > 0 ? Math.sin(Math.PI*clamp(1-e.flash/.22)) : 0;
  const charge = e.attack?.timer ?? 0;
  const elapsed = e.attack?.sent ? charge-e.attack.windup : 0;
  const release = smooth(elapsed/.085);
  const prep = e.attack ? (e.attack.sent ? 1-release : smooth(charge/e.attack.windup)) : 0;
  const snap = release*(1-smooth((elapsed-.085)/.21));
  const rise = e.wake < 0 ? .56 : 1-Math.exp(-5.7*e.wake)*Math.cos(e.wake*11)*.44;
  const collapse = smooth(e.dead/foldTime);
  const fold = rise*(1-collapse) + collapse*.065;
  const hover = (rig.float ?? 0)*Math.min(1,fold)*(1-collapse)
    * (1 + .21*Math.sin(time*(rig.mode==='wing' ? 5.2 : 2.7)+e.phase));
  const breathe = Math.sin(time*2.9+e.phase);
  const gaitRoll = Math.sin(phase)*stride*(rig.mode==='run' ? .15 : .07);
  const tilt = (side*.095+gaitRoll + breathe*.027 - prep*.14 + snap*.26 + flinch*.24)*(1-collapse)
    + collapse*(side < -.1 ? -.39 : .39);
  const bend = prep*.14 - snap*.115 + flinch*.065;
  return { phase,stride,flinch,prep,snap,collapse,fold,hover,breathe,tilt,bend };
}

function segment(g,image,x,y,angle,length,width,depth=0) {
  g.save();
  g.translate(x,y);
  g.rotate(angle);
  if (depth) {
    g.drawImage(image,-width*.47+depth,-length*.16+depth,width,length);
  }
  g.drawImage(image,-width*.52,-length*.18,width,length);
  g.restore();
}

function step(phase, stride, amount) {
  const tick = (((phase / Math.PI) % 2) + 2) % 2;
  if (tick >= 1) return [stride*amount*(3-2*tick),0];
  return [stride*amount*(2*smooth(tick)-1),stride*Math.sin(Math.PI*tick)];
}

export function drawCreature(g, rig, e, x, foot, unit, time, side) {
  const pose = monsterPose(e,rig,time,side);
  const scale = unit * rig.h;
  const { phase, stride,prep,snap,collapse,fold,hover,breathe,bend,flinch } = pose;
  const winged = rig.mode==='wing' || rig.mode==='drift';
  const crawling = rig.mode==='crawl';
  const running = rig.mode==='run';
  const coils = rig.mode==='coil';
  const edge = (1-Math.abs(side)*.22);
  const hop = Math.abs(Math.sin(phase))*stride*(running ? .10 : .053);
  const torsoY = -(winged ? .36 : crawling ? .26 : .39)-hop+bend;
  const faceY = -(winged || crawling ? .84 : .91) + bend - hop - snap*.07;
  const faceX = side*.12 - flinch*.047;
  const direction = side < 0 ? -1 : 1;
  const sides = [-direction,direction];

  g.save();
  g.translate(x,foot-unit*hover);
  g.scale(scale*edge,scale*fold);
  g.rotate(pose.tilt);

  if (winged) {
    for (const s of sides) {
      const speed = rig.mode==='wing' ? 14.4 : 5.5;
      const flutter = Math.sin(time*speed+e.phase+s*.64);
      const span = rig.wing*(.66+.33*Math.cos(flutter+prep*.60));
      segment(g,rig.limb,s*.095,torsoY-.14,s*(-1.24+flutter*.41+snap*.24),span,rig.wing*.59);
      segment(g,rig.foot,s*.16,torsoY+.045,s*(-.56+flutter*.19),.30,.22);
    }
  } else if (coils) {
    for (let i=4;i>=0;i--) {
      const wave = Math.sin(phase-i*.76+time*1.14);
      const wide = .49-i*.051;
      segment(g,rig.limb,-side*i*.036+wave*(.02+i*.011),torsoY-i*.107,
        wave*.21+prep*.10,.36,wide);
    }
  } else {
    const pairs = crawling ? 3 : running ? 2 : 1;
    for (let i=pairs-1;i>=0;i--) for (const s of sides) {
      const [strideAngle,lift] = step(phase+(s<0?Math.PI:0)+i*1.6,stride,.63);
      const hipX = s*(rig.chest*.24+i*.046);
      const hipY = -1.11*rig.leg-i*.046-hop+bend*.17;
      const knee = -s*((crawling ? .74:.24)+strideAngle*.53+collapse*.15);
      segment(g,rig.limb,hipX,hipY-lift*.065,knee,rig.leg*.77,rig.leg*.58);
      const toeX = hipX-Math.sin(knee)*rig.leg*.51;
      segment(g,rig.foot,toeX,hipY+rig.leg*.64-lift*.13,-s*(.43+strideAngle*.43),rig.leg*.60,rig.leg*.66);
    }
    if (rig.arm) for (const s of sides) {
      const swing = Math.cos(phase+(s<0?Math.PI:0))*stride*.32;
      const angle = s*(-.50+swing-prep*.85+snap*1.12);
      const shoulder = s*rig.chest*.37;
      segment(g,rig.limb,shoulder,torsoY-.18,angle,rig.arm,rig.reach*.49,.013);
      segment(g,rig.foot,shoulder-Math.sin(angle)*rig.arm*.67,
        torsoY-.18+Math.cos(angle)*rig.arm*.67,angle+s*.35,rig.arm*.62,rig.reach*.48);
    }
  }

  const chestHeight = crawling ? .48 : .44;
  g.drawImage(rig.torso,-rig.chest/2,torsoY-.27,rig.chest,chestHeight);
  const faceHeight = winged ? .49 : crawling ? .63 : .65;
  g.save();
  g.translate(faceX,faceY+faceHeight*.70);
  g.rotate(breathe*.045+flinch*.23-snap*.13);
  g.drawImage(rig.mask,-rig.face/2,-faceHeight*.7,rig.face,faceHeight);
  g.restore();

  if ((prep>0 && rig.ranged) || flinch>.1) {
    g.globalAlpha *= Math.max(prep*.76,flinch*.51);
    g.fillStyle = flinch>prep ? '#f4d0a0' : rig.accent;
    const markY = faceY+faceHeight*.68;
    g.beginPath();
    g.moveTo(faceX,markY-.08); g.lineTo(faceX+.075,markY);
    g.lineTo(faceX,markY+.051); g.lineTo(faceX-.075,markY);
    g.fill();
  }
  g.restore();
}
