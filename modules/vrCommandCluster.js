// Use bundled three.js so the browser can load the module without a build
// step. Node-based unit tests still resolve the package name "three" via
// node_modules, but GitHub Pages lacks that folder, so we keep a copy in
// /vendor for direct loading.
import * as THREE from '../vendor/three.module.js';
import { powers } from './powers.js';

const PANEL_DEFS = [
  {id:'score',  w:1.0, h:0.35, label:'SCORE'},
  {id:'off',    w:0.70, h:0.70, label:'OFF'},
  {id:'core',   w:0.60, h:0.60, label:'CORE'},
  {id:'def',    w:0.70, h:0.70, label:'DEF'},
  {id:'health', w:1.2, h:0.20, label:'HP'},
];

export function build(deck){
  const R = 1.15;
  const ARC = Math.PI * 1.2; // 216° sweep
  deck.innerHTML = '';

  PANEL_DEFS.forEach((cfg,i)=>{
    const theta = (-ARC/2) + (i*(ARC/(PANEL_DEFS.length-1)));
    const x =  R * Math.sin(theta);
    const z = -R * Math.cos(theta);

    const plane = document.createElement('a-plane');
    plane.setAttribute('id', `vr-${cfg.id}-panel`);
    plane.setAttribute('width',  cfg.w);
    plane.setAttribute('height', cfg.h);
    plane.setAttribute('material',
      'color:#111; opacity:0.75; side:double; transparent:true');
    plane.setAttribute('position', `${x} 1.2 ${z}`);
    plane.setAttribute('rotation', `0 ${THREE.MathUtils.radToDeg(theta)} 0`);

    const header = document.createElement('a-text');
    header.setAttribute('value', cfg.label);
    header.setAttribute('align', 'center');
    header.setAttribute('width', cfg.w*1.4);
    header.setAttribute('color', '#eaf2ff');
    header.setAttribute('position', `0 ${(cfg.h/2)-0.08} 0.01`);
    plane.appendChild(header);

    const dyn = document.createElement('a-text');
    dyn.setAttribute('id', `vr-${cfg.id}-value`);
    dyn.setAttribute('align', 'center');
    dyn.setAttribute('width', cfg.w*1.2);
    dyn.setAttribute('position', `0 -0.05 0.01`);
    plane.appendChild(dyn);

    deck.appendChild(plane);
  });
}

export function updateHud(s){
  document.querySelector('#vr-score-value')?.setAttribute('value', s.score);
  document.querySelector('#vr-health-value')?.setAttribute(
      'value', `${Math.round(s.hp)}/${s.maxHp}`);
  document.querySelector('#vr-health-panel')
          ?.setAttribute('material', `color:${hpColor(s.hp/s.maxHp)}`);

  document.querySelector('#vr-off-value')
          ?.setAttribute('value', s.off ? powers[s.off].emoji : '–');
  document.querySelector('#vr-def-value')
          ?.setAttribute('value', s.def ? powers[s.def].emoji : '–');
  document.querySelector('#vr-core-value')
          ?.setAttribute('value', s.core ?? '◎');
}

function hpColor(pct){
  if (pct > 0.6) return '#3498db';
  if (pct > 0.3) return '#f1c40f';
  return '#e74c3c';
}
