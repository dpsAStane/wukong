/* ════════════════════════════════════════
     JAVASCRIPT ENGINE
════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   DATA DEFINITIONS
───────────────────────────────────────────── */

const AVATARS = {
  wukong:   { name:'Sun Wukong',       title:'Great Sage Equaling Heaven', emoji:'🐒', img:'wukong.jpg',  color:'#c9a227' },
  monk:     { name:'Wandering Monk',   title:'Pilgrim of Fate',            emoji:'⚔️', img:'monk.jpg',    color:'#a07820' },
  fox:      { name:'Fox Spirit',       title:'Enchantress of Illusions',   emoji:'🦊', img:'fox.jpg',     color:'#6a4a6a' },
  blackbear:{ name:'Black Bear',       title:'Bear King of Black Wind',    emoji:'🐻', img:'bear.jpg',    color:'#5a5a8a' },
  tiger:    { name:'Tiger Vanguard',   title:'Guardian of the West',       emoji:'🐯', img:'tiger.jpg',   color:'#8a5a5a' },
  bajie:    { name:'Zhu Bajie',        title:'Marshal of the Canopy',      emoji:'🌸', img:'bajie.jpg',   color:'#8b3a3a' },
  redboy:   { name:'Red Boy',          title:'Holy Infant King',           emoji:'🔥', img:'red.webp',    color:'#8b2a00' },
  yaksha:   { name:'Yaksha King',      title:'Demon Strategist',           emoji:'👺', img:'yaksha.jpg',  color:'#4a6a4a' },
  cheonma:  { name:'Cheonma',          title:'Heavenly Demon',             emoji:'🎖️', img:'cheonma.jpg', color:'#2a4a6a' },
  macaque:  { name:'Macaque',          title:'Ruler of the Mountain',      emoji:'🦍', img:'macaque.jpg', color:'#4a4a6a'},
  yaoguai:  { name:'Yaoguai King',     title:'Lord of the Demons',         emoji:'👹', img:'king.jpg',    color:'#6a4a4a' },
  erlang:   { name:'Erlang Shen',      title:'True Lord of the Heavens',   emoji:'🌟', img:'shen.jpg',    color:'#2d7a22' }
};

function avatarImg(key, cls = '') {
  const av = AVATARS[key];
  if (!av.img) return `<span class="av-emoji">${av.emoji}</span>`;
  return `<img
    src="${av.img}"
    alt="${av.name}"
    class="av-img ${cls}"
    onerror="this.replaceWith(Object.assign(document.createElement('span'),
      { className:'av-emoji', textContent:'${av.emoji}' }))"
  >`;
}

const THEMES = {
  bamboo: {
    name:'Bamboo Forest',  sub:'Fog & Ancient Silence',
    ambient:'fog',
    preview:'linear-gradient(135deg,#071a0e,#0f2d18,#0a1a0a)',
    bg:'#060f08'
  },
  fiery: {
    name:'Flaming Mountain', sub:'Ash, Fury & Ember',
    ambient:'embers',
    preview:'linear-gradient(135deg,#1a0500,#3a0e00,#1a0500)',
    bg:'#0f0300'
  },
  snowy: {
    name:'Snowy Peak',     sub:'Ice, Wind & Eternity',
    ambient:'snow',
    preview:'linear-gradient(135deg,#050a14,#080f1e,#060b18)',
    bg:'#040710'
  },
  temple: {
    name:'Fallen Temple',  sub:'Stone, Memory & Dust',
    ambient:'mist',
    preview:'linear-gradient(135deg,#0d0a06,#1a1208,#120e06)',
    bg:'#080601'
  },

};

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],  // rows
  [0,3,6],[1,4,7],[2,5,8],  // cols
  [0,4,8],[2,4,6]           // diags
];

const QUOTES = {
  victory: [
    '"Even the heavens bow before the Great Sage."',
    '"Your destiny was written in the stars — victory is yours."',
    '"The staff always returns to the victor\'s hand."',
    '"Fate bends for those who dare to seize it."'
  ],
  defeat: [
    '"The lotus blooms where the warrior\'s blood was spilled."',
    '"All things return to stillness. You have found it first."',
    '"Even the mountain must yield to the tide — rise again."',
    '"The defeated is not the weak — only the untested."'
  ],
  draw: [
    '"Two immovable forces — the earth itself has cracked."',
    '"When equal spirits clash, the universe holds its breath."'
  ]
};

/* ─────────────────────────────────────────────
   GAME STATE
───────────────────────────────────────────── */
const G = {
  mode:    'pvp',
  diff:    'easy',
  board:   Array(9).fill(null),
  current: 1,
  p1hp:    3,
  p2hp:    3,
  round:   1,
  active:  false,
  animating: false,
  av1:     'wukong',
  av2:     'blackbear',
  theme:   'bamboo',
  timer:   null,
  tLeft:   10,
  vol:     { master:70, sfx:80, music:40 },
  musicOn: true,
  sfxOn:   true
};

/* ─────────────────────────────────────────────
   AUDIO ENGINE (Web Audio API — no files)
───────────────────────────────────────────── */
let audioCtx = null;
let musicScheduler = null;
let musicActive = false;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, dur, type = 'sine', vol = 0.2, delay = 0) {
  if (!G.sfxOn) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain= ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const v = vol * (G.vol.master / 100) * (G.vol.sfx / 100);
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.02);
  } catch(e) {}
}

function playChord(freqs, dur, type = 'sine', vol = 0.18, delay = 0) {
  freqs.forEach((f, i) => playTone(f, dur, type, vol, delay + i * 0.01));
}

const SFX = {
  click()   { playTone(420, .1, 'sine', .12); },
  place1()  { playTone(660, .07, 'triangle', .25); playTone(880, .12, 'sine', .16, .05); },
  place2()  { playTone(440, .07, 'triangle', .25); playTone(550, .12, 'sine', .16, .05); },
  win()     { [440,554,659,880,1100].forEach((f,i) => playTone(f,.38,'triangle',.28,i*.09)); },
  crystal() { playTone(180,.18,'sawtooth',.42); playTone(130,.4,'sine',.22,.1); },
  clash()   {
    [180,220,260,300,260,220,180].forEach((f,i) => playTone(f,.15,'sawtooth',.3,i*.055));
    playTone(90,.8,'sine',.3,.1);
  },
  ultimate() {
    for (let i = 0; i < 14; i++) playTone(60 + Math.random()*280, .4, 'sawtooth', .4, i*.065);
    playTone(60, 2.2, 'sine', .55, .3);
    playTone(80, 1.8, 'sine', .4, .5);
  },
  tick()    { playTone(380,.07,'square',.1); },
  victory() { [523,659,784,1047,1319].forEach((f,i) => playTone(f,.65,'triangle',.28,i*.18)); },
  projectile() {
    playTone(800,.05,'sawtooth',.18);
    playTone(600,.3,'sine',.15,.04);
    playTone(400,.5,'sine',.08,.12);
  }
};

// Procedural ambient music — pentatonic notes
function startMusic() {
  if (!G.musicOn || musicActive) return;
  musicActive = true;
  const pentatonic = [
    [261.63, 293.66, 329.63, 392.00, 440.00],  // C4 pentatonic
    [130.81, 146.83, 164.81, 196.00, 220.00]   // C3 pentatonic
  ];
  function scheduleNote() {
    if (!G.musicOn || !musicActive) { musicActive = false; return; }
    try {
      const ctx = getCtx();
      const scale = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const freq  = scale[Math.floor(Math.random() * scale.length)];
      const oct   = Math.random() < 0.2 ? 2 : 1;
      const dur   = 0.8 + Math.random() * 2.0;
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      const rev   = ctx.createGain(); // fake reverb via gain decay
      osc.connect(gain); gain.connect(rev); rev.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq * oct;
      const v = (G.vol.master / 100) * (G.vol.music / 100) * 0.06;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      rev.gain.setValueAtTime(0.85, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + dur + 0.1);
    } catch(e) {}
    musicScheduler = setTimeout(scheduleNote, 300 + Math.random() * 1100);
  }
  scheduleNote();
}

function stopMusic() {
  musicActive = false;
  if (musicScheduler) clearTimeout(musicScheduler);
  musicScheduler = null;
}

function setVol(type, val) {
  G.vol[type] = parseInt(val);
  const map = { master:'master', sfx:'sfx', music:'music' };
  const el = document.getElementById(`disp-${map[type]}`);
  if (el) el.textContent = val;
}

function toggleMusic() {
  G.musicOn = !G.musicOn;
  const btn = $('music-toggle');
  btn.textContent = G.musicOn ? '♪ Music ON' : '♪ Music OFF';
  btn.classList.toggle('active', G.musicOn);
  G.musicOn ? startMusic() : stopMusic();
  SFX.click();
}

function toggleSFX() {
  G.sfxOn = !G.sfxOn;
  const btn = $('sfx-toggle');
  btn.textContent = G.sfxOn ? '⚔ SFX ON' : '⚔ SFX OFF';
  btn.classList.toggle('active', G.sfxOn);
}

/* ─────────────────────────────────────────────
   AMBIENT PARTICLES
───────────────────────────────────────────── */
let ambientInterval = null;

function initAmbient(type) {
  const layer = $('ambient-layer');
  layer.innerHTML = '';
  if (ambientInterval) clearInterval(ambientInterval);

  const count = type === 'fog' || type === 'mist' ? 5 : 24;
  const interval = type === 'fog' ? 2500 : type === 'mist' ? 2000 : type === 'embers' ? 260 : 350;

  // Seed initial particles
  for (let i = 0; i < count; i++) {
    setTimeout(() => spawnParticle(type), Math.random() * 5000);
  }
  ambientInterval = setInterval(() => spawnParticle(type), interval);
}

function spawnParticle(type) {
  const layer = $('ambient-layer');
  const p = document.createElement('div');
  p.style.position = 'absolute';
  p.style.pointerEvents = 'none';

  if (type === 'fog' || type === 'mist') {
    const dur   = 18 + Math.random() * 22;
    const w     = 160 + Math.random() * 280;
    const h     = 55  + Math.random() * 100;
    const alpha = type === 'fog' ? .045 : .035;
    const col   = type === 'fog' ? '195,215,195' : '215,200,170';
    const dy1   = `${(Math.random() - .5) * 70}px`;
    const dy2   = `${(Math.random() - .5) * 40}px`;
    p.style.cssText += `
      left:-480px; top:${Math.random()*100}%;
      width:${w}px; height:${h}px; border-radius:50%;
      background: radial-gradient(ellipse, rgba(${col},${alpha}) 0%, transparent 70%);
      animation: fogDrift ${dur}s linear forwards;
      --fy:${dy1}; --fy2:${dy2}; --fo:${alpha};
    `;
    layer.appendChild(p);
    setTimeout(() => p.remove(), (dur + 1) * 1000);

  } else if (type === 'embers') {
    const dur = 2.5 + Math.random() * 5;
    const sz  = 2 + Math.random() * 3.5;
    const hue = 10 + Math.random() * 35;
    const lt  = 50 + Math.random() * 30;
    p.style.cssText += `
      left:${Math.random()*100}%; bottom:0;
      width:${sz}px; height:${sz}px; border-radius:50%;
      background: hsl(${hue},100%,${lt}%);
      box-shadow: 0 0 5px 2px hsla(${hue},100%,60%,.55);
      animation: emberRise ${dur}s ease-in forwards;
      --ex:${(Math.random()-.5)*80}px; --ex2:${(Math.random()-.5)*120}px;
    `;
    layer.appendChild(p);
    setTimeout(() => p.remove(), (dur + .5) * 1000);

  } else if (type === 'snow') {
    const dur = 6 + Math.random() * 10;
    const sz  = 2 + Math.random() * 4.5;
    const op  = .4 + Math.random() * .6;
    p.style.cssText += `
      left:${Math.random()*100}%; top:-16px;
      width:${sz}px; height:${sz}px; border-radius:50%;
      background: rgba(210,228,255,${op});
      animation: snowFall ${dur}s linear forwards;
      --sdx:${(Math.random()-.5)*60}px; --sop:${op};
    `;
    layer.appendChild(p);
    setTimeout(() => p.remove(), (dur + .5) * 1000);

  } else if (type === 'mist') {
    const dur = 14 + Math.random() * 16;
    const w   = 100 + Math.random() * 200;
    const h   = 40 + Math.random() * 80;
    p.style.cssText += `
      left:-380px; top:${20 + Math.random()*60}%;
      width:${w}px; height:${h}px; border-radius:50%;
      background: radial-gradient(ellipse, rgba(215,200,170,.038) 0%, transparent 70%);
      animation: fogDrift ${dur}s linear forwards;
      --fy:${(Math.random()-.5)*50}px; --fy2:0px; --fo:.038;
    `;
    layer.appendChild(p);
    setTimeout(() => p.remove(), (dur + 1) * 1000);
  }
}

function applyTheme(key) {
  const t = THEMES[key];
  document.body.style.background = t.bg;
  initAmbient(t.ambient);
}

/* ─────────────────────────────────────────────
   SCREEN MANAGEMENT
───────────────────────────────────────────── */
function showScreen(id) {
  SFX.click();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id)?.classList.add('active');
}

function openSettings() {
  buildSettingsUI();
  showScreen('screen-settings');
}

function openHistory() {
  buildHistoryUI();
  showScreen('screen-hist');
}

/* ─────────────────────────────────────────────
   SETTINGS UI
───────────────────────────────────────────── */
function buildSettingsUI() {
  // Avatar grids
  ['1', '2'].forEach(p => {
    const grid = $(`av${p}-grid`);
    grid.innerHTML = '';
   Object.entries(AVATARS).forEach(([key, av]) => {
      const otherPlayer = p === '1' ? '2' : '1';
      const isTaken = G[`av${otherPlayer}`] === key;

      const card = document.createElement('div');
      card.className = 'av-card' 
        + (G[`av${p}`] === key ? ' selected' : '') 
        + (isTaken ? ' taken' : '');

      card.innerHTML = `
        <div class="av-card-em">${avatarImg(key, 'picker-avatar')}</div>
        <div class="av-card-name">${av.name}</div>
        <div class="av-card-title">${av.title.split(' ').slice(0,5).join(' ')}</div>
      `;

      if (!isTaken) {
        card.onclick = () => {
          G[`av${p}`] = key;
          buildSettingsUI();
          SFX.click();
          saveConfig();
        };
      }

      grid.appendChild(card);
    });
  });

  // Theme grid
  const tgrid = $('theme-grid');
  tgrid.innerHTML = '';
  Object.entries(THEMES).forEach(([key, th]) => {
    const card = document.createElement('div');
    card.className = 'theme-card' + (G.theme === key ? ' selected' : '');
    card.innerHTML = `
      <div class="theme-prev" style="background:${th.preview}"></div>
      <div>
        <div class="theme-name">${th.name}</div>
        <div class="theme-sub">${th.sub}</div>
      </div>
    `;
    card.onclick = () => {
      G.theme = key;
      applyTheme(key);
      buildSettingsUI();
      SFX.click();
      saveConfig();
    };
    tgrid.appendChild(card);
  });

  // Volume sliders sync
  const vols = { master:'master', sfx:'sfx', music:'music' };
  Object.keys(vols).forEach(k => {
    const sl = document.getElementById(`vol-${k}`);
    const dp = document.getElementById(`disp-${k}`);
    if (sl) sl.value = G.vol[k];
    if (dp) dp.textContent = G.vol[k];
  });

  // Toggle buttons
  const mt = $('music-toggle');
  const st = $('sfx-toggle');
  if (mt) { mt.textContent = G.musicOn ? '♪ Music ON' : '♪ Music OFF'; mt.classList.toggle('active', G.musicOn); }
  if (st) { st.textContent = G.sfxOn   ? '⚔ SFX ON'  : '⚔ SFX OFF';  st.classList.toggle('active', G.sfxOn); }
}

/* ─────────────────────────────────────────────
   HISTORY UI
───────────────────────────────────────────── */
function buildHistoryUI() {
  const list = $('hist-list');
  const entries = loadHistory();

  if (!entries.length) {
    list.innerHTML = '<div class="hist-empty">No battles recorded yet.<br><br><em>Your legend has yet to be written,<br>Destined One.</em></div>';
    return;
  }

  list.innerHTML = entries.map((e, i) => {
    const av1 = AVATARS[e.av1] || AVATARS.wukong;
    const av2 = AVATARS[e.av2] || AVATARS.blackbear;
    const resultText = e.winner === 0 ? 'STALEMATE'
      : e.winner === 1 ? `${av1.name} Victorious` : `${av2.name} Victorious`;
    const badgeCls = e.winner === 0 ? 'draw' : e.winner === 1 ? 'p1' : 'p2';
    const modeText = e.mode === 'pvai' ? `vs AI (${e.diff})` : 'Player vs Player';
    return `
      <div class="hist-entry" style="animation-delay:${i * 0.04}s">
        <div class="hist-avatars">
          ${avatarImg(e.av1, 'hist-avatar')}
          <span class="hist-vs">VS</span>
          ${avatarImg(e.av2, 'hist-avatar')}
        </div>
        <div style="flex:1">
          <div class="hist-result">${resultText}</div>
          <div class="hist-detail">${modeText} · Round ${e.round}</div>
          <span class="hist-win-badge ${badgeCls}">${e.winner === 0 ? 'DRAW' : e.winner === 1 ? 'VICTORY' : 'DEFEAT'}</span>
        </div>
        <div class="hist-date">${e.date}<br>${e.time}</div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  localStorage.removeItem('wukong_history');
  buildHistoryUI();
  SFX.click();
}

/* ─────────────────────────────────────────────
   LOCAL STORAGE
───────────────────────────────────────────── */
function loadHistory()  { try { return JSON.parse(localStorage.getItem('wukong_history') || '[]'); } catch(e) { return []; } }
function loadConfig()   { try { return JSON.parse(localStorage.getItem('wukong_config')  || '{}'); } catch(e) { return {}; } }

function saveHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  if (h.length > 80) h.pop();
  localStorage.setItem('wukong_history', JSON.stringify(h));
}

function saveConfig() {
  localStorage.setItem('wukong_config', JSON.stringify({
    av1: G.av1, av2: G.av2, theme: G.theme, vol: G.vol,
    musicOn: G.musicOn, sfxOn: G.sfxOn
  }));
}

function loadSavedConfig() {
  const cfg = loadConfig();
  if (cfg.av1)     G.av1     = cfg.av1;
  if (cfg.av2)     G.av2     = cfg.av2;
  if (cfg.theme)   G.theme   = cfg.theme;
  if (cfg.vol)     G.vol     = cfg.vol;
  if (cfg.musicOn !== undefined) G.musicOn = cfg.musicOn;
  if (cfg.sfxOn   !== undefined) G.sfxOn   = cfg.sfxOn;
}

/* ─────────────────────────────────────────────
   GAME INIT
───────────────────────────────────────────── */
function startPvP() {
  G.mode = 'pvp';
  startGame();
}

function startPvAI(diff) {
  G.mode = 'pvai';
  G.diff = diff;
  startGame();
}

function startGame() {
  // Reset state
  G.board     = Array(9).fill(null);
  G.current   = 1;
  G.p1hp      = 3;
  G.p2hp      = 3;
  G.round     = 1;
  G.active    = true;
  G.animating = false;

  // Apply avatars
  const av1 = AVATARS[G.av1];

  // Override P2 avatar based on AI difficulty
  if (G.mode === 'pvai') {
    const diffAvatars = {
      easy:   'macaque',
      medium: 'yaoguai',
      hard:   'erlang'
    };
    G.av2 = diffAvatars[G.diff];
  }

  const av2 = AVATARS[G.av2];
  $('p1-emoji').innerHTML = avatarImg(G.av1, 'panel-avatar');
  $('p1-name').textContent  = av1.name.toUpperCase();
  $('p1-title').textContent = av1.title;
  $('p1-frame').style.borderColor = av1.color;

  $('p2-emoji').innerHTML = avatarImg(G.av2, 'panel-avatar');
  $('p2-name').textContent  = (G.mode === 'pvai' ? '' : '') + av2.name.toUpperCase();
  $('p2-title').textContent = av2.title;
  $('p2-frame').style.borderColor = av2.color;

  // CSS hit direction hints
  $('p1-panel').style.setProperty('--hit-dir', '-16px');
  $('p1-panel').style.setProperty('--atk-dir',  '28px');
  $('p2-panel').style.setProperty('--hit-dir',  '16px');
  $('p2-panel').style.setProperty('--atk-dir', '-28px');

  // Remove dead state
  $('p1-panel').classList.remove('is-dead');
  $('p2-panel').classList.remove('is-dead');

  updateCrystals();
  buildBoard();
  setRound(1);
  showScreen('screen-game');
  applyTheme(G.theme);
  if (G.musicOn) { stopMusic(); setTimeout(startMusic, 400); }

  startTurn();
}

function buildBoard() {
  const board = $('board');
  // Clear cells (keep win-line SVG)
  board.querySelectorAll('.cell').forEach(c => c.remove());
  $('win-line').innerHTML = '';
  board.classList.remove('is-shaking');

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.innerHTML = '<div class="marker"></div>';
    cell.addEventListener('click', () => onCellClick(i));
    board.appendChild(cell);
  }
}

/* ─────────────────────────────────────────────
   TURN MANAGEMENT
───────────────────────────────────────────── */
function startTurn() {
  if (!G.active || G.animating) return;
  clearTimer();
  G.tLeft = 10;
  syncTimer(10);

  const av = AVATARS[G[`av${G.current}`]];
  setStatus(G.mode === 'pvai' && G.current === 2
    ? 'The celestial mind contemplates...'
    : `${av.name}'s move...`);

  $('p1-panel').classList.toggle('active-turn', G.current === 1);
  $('p2-panel').classList.toggle('active-turn', G.current === 2);

  if (G.mode === 'pvai' && G.current === 2) {
    const delay = { easy:600, medium:850, hard:1100 }[G.diff];
    setTimeout(doAIMove, delay);
    return;
  }

  G.timer = setInterval(() => {
    if (!G.active || G.animating) { clearTimer(); return; }
    G.tLeft--;
    syncTimer(G.tLeft);
    if (G.tLeft <= 3) {
      SFX.tick();
      $('timer-fill').classList.add('danger');
    }
    if (G.tLeft <= 0) { clearTimer(); onTimeout(); }
  }, 1000);
}

function clearTimer() {
  if (G.timer) { clearInterval(G.timer); G.timer = null; }
  $('timer-fill').classList.remove('danger');
}

function syncTimer(t) {
  $('timer-fill').style.width = `${t * 10}%`;
  $('timer-count').textContent = t;
}

function onTimeout() {
  if (!G.active) return;
  setStatus('Fate intervenes!');
  const empty = G.board.reduce((a, v, i) => v === null ? [...a, i] : a, []);
  if (empty.length) placeMarker(empty[Math.floor(Math.random() * empty.length)]);
}

/* ─────────────────────────────────────────────
   CORE GAME LOGIC
───────────────────────────────────────────── */
function onCellClick(i) {
  if (!G.active || G.animating)          return;
  if (G.mode === 'pvai' && G.current === 2) return;
  if (G.board[i] !== null)               return;
  clearTimer();
  placeMarker(i);
}

function placeMarker(i) {
  if (G.board[i] !== null) return;
  G.board[i] = G.current;

  const cell = document.querySelector(`[data-index="${i}"]`);
  cell.classList.add('taken', `p${G.current}`);
  SFX[`place${G.current}`]();

  const winLine = getWinLine(G.board);
  if (winLine) { roundWin(winLine); return; }
  if (G.board.every(v => v !== null)) { roundDraw(); return; }

  G.current = G.current === 1 ? 2 : 1;
  startTurn();
}

function getWinLine(b) {
  for (const line of WIN_LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[c] === b[d]) return line;
  }
  return null;
}

function getWinner(b) {
  for (const [a, c, d] of WIN_LINES) {
    if (b[a] && b[a] === b[c] && b[c] === b[d]) return b[a];
  }
  return null;
}

/* ─────────────────────────────────────────────
   ROUND WIN
───────────────────────────────────────────── */
function roundWin(winLine) {
  G.animating = true;
  clearTimer();
  const winner = G.current;
  const loser  = winner === 1 ? 2 : 1;

  // Highlight winning cells
  winLine.forEach(i => document.querySelector(`[data-index="${i}"]`).classList.add('win-cell'));
  drawWinLine(winLine);

  SFX.win();

  // Round win text
  const rwt = $('round-win-text');
  rwt.textContent = winner === 1 ? '⚔ Triumph! ⚔' : '✿ Victory! ✿';
  rwt.classList.add('show');
  setStatus(`${AVATARS[G[`av${winner}`]].name} wins the round!`, true);

  // Attack animation
  $(`p${winner}-panel`).classList.add('is-attacking');

  setTimeout(() => {
    SFX.projectile();
    fireProjectile(winner, loser, () => {
      // Impact
      $(`p${loser}-panel`).classList.add('is-hit');
      $('board').classList.add('is-shaking');
      SFX.crystal();

      setTimeout(() => {
        $(`p${loser}-panel`).classList.remove('is-hit');
        $(`p${winner}-panel`).classList.remove('is-attacking');
        $('board').classList.remove('is-shaking');
        rwt.classList.remove('show');

        G[`p${loser}hp`]--;
        updateCrystals();

        setTimeout(() => {
          if (G[`p${loser}hp`] <= 0) matchOver(winner);
          else startNextRound();
        }, 480);
      }, 680);
    });
  }, 380);
}

/* ─────────────────────────────────────────────
   DRAW / CLASH
───────────────────────────────────────────── */
function roundDraw() {
  G.animating = true;
  clearTimer();
  SFX.clash();
  setStatus('⚔ CLASH! Both warriors are spent! ⚔', true);

  $('clash-overlay').classList.add('show');
  $('p1-panel').classList.add('is-attacking');
  $('p2-panel').classList.add('is-attacking');
  $('board').classList.add('is-shaking');

  setTimeout(() => {
    $('p1-panel').classList.remove('is-attacking');
    $('p2-panel').classList.remove('is-attacking');
    $('p1-panel').classList.add('is-hit');
    $('p2-panel').classList.add('is-hit');
    SFX.crystal();

    setTimeout(() => {
      $('clash-overlay').classList.remove('show');
      $('p1-panel').classList.remove('is-hit');
      $('p2-panel').classList.remove('is-hit');
      $('board').classList.remove('is-shaking');

      G.p1hp = Math.max(0, G.p1hp - 1);
      G.p2hp = Math.max(0, G.p2hp - 1);
      updateCrystals();

      setTimeout(() => {
        if (G.p1hp <= 0 && G.p2hp <= 0) endDraw();
        else if (G.p1hp <= 0) matchOver(2);
        else if (G.p2hp <= 0) matchOver(1);
        else startNextRound();
      }, 500);
    }, 750);
  }, 950);
}

function endDraw() {
  G.active = false;
  addHistoryEntry(0);
  setTimeout(() => {
    $('vic-stars').textContent = '☯';
    $('vic-title').textContent = 'STALEMATE';
    $('vic-title').className = 'vic-title';
    $('vic-winner-name').textContent = 'THE FORCES ARE PERFECTLY EQUAL';
    $('vic-p1hp').textContent = G.p1hp;
    $('vic-p2hp').textContent = G.p2hp;
    const q = QUOTES.draw;
    $('vic-quote').textContent = q[Math.floor(Math.random() * q.length)];
    $('screen-victory').classList.add('show');
    SFX.victory();
  }, 900);
}

/* ─────────────────────────────────────────────
   NEXT ROUND
───────────────────────────────────────────── */
function startNextRound() {
  G.board     = Array(9).fill(null);
  G.current   = 1;
  G.round++;
  G.animating = false;
  buildBoard();
  setRound(G.round);
  startTurn();
}

/* ─────────────────────────────────────────────
   MATCH OVER — ULTIMATE ATTACK
───────────────────────────────────────────── */
function matchOver(winner) {
  G.active = false;
  clearTimer();
  const loser = winner === 1 ? 2 : 1;
  setStatus(`${AVATARS[G[`av${winner}`]].name} unleashes the Ultimate Strike!`, true);

  // Pick dramatic emoji for ultimate
  const winnerAv = AVATARS[G[`av${winner}`]];
  $('ultimate-strike').innerHTML = `<img src="${winnerAv.img}" alt="${winnerAv.name}">`;
  $('ultimate-overlay').classList.add('show');
  SFX.ultimate();

  setTimeout(() => {
    $('ultimate-overlay').classList.remove('show');
    $(`p${loser}-panel`).classList.add('is-dead');
    addHistoryEntry(winner);
    setTimeout(() => showVictory(winner), 900);
  }, 2300);
}

function showVictory(winner) {
  const av = AVATARS[G[`av${winner}`]];
  const isP1Win = winner === 1;

  $('vic-stars').innerHTML = `<img src="${av.img}" alt="${av.name}">`;
  $('vic-title').textContent   = 'VICTORY';
  $('vic-title').className     = 'vic-title';
  $('vic-winner-name').textContent = av.name.toUpperCase() + ' TRIUMPHS';
  $('vic-p1hp').textContent    = G.p1hp;
  $('vic-p2hp').textContent    = G.p2hp;

  const pool = isP1Win ? QUOTES.victory : QUOTES.defeat;
  $('vic-quote').textContent = pool[Math.floor(Math.random() * pool.length)];

  $('screen-victory').classList.add('show');
  SFX.victory();
}

/* ─────────────────────────────────────────────
   AI ENGINE
───────────────────────────────────────────── */
function doAIMove() {
  if (!G.active || G.current !== 2) return;
  let idx;
  switch (G.diff) {
    case 'easy':   idx = aiRandom();  break;
    case 'medium': idx = aiMedium();  break;
    case 'hard':   idx = aiBestMove(); break;
  }
  if (idx !== null && idx !== undefined) placeMarker(idx);
}

function aiRandom() {
  const empty = G.board.reduce((a, v, i) => v === null ? [...a, i] : a, []);
  return empty[Math.floor(Math.random() * empty.length)];
}

function aiMedium() {
  // 65% chance to play smart
  if (Math.random() < 0.65) {
    // Win if possible
    for (let i = 0; i < 9; i++) {
      if (G.board[i] === null) {
        G.board[i] = 2;
        const w = getWinner(G.board);
        G.board[i] = null;
        if (w === 2) return i;
      }
    }
    // Block player 1 win
    for (let i = 0; i < 9; i++) {
      if (G.board[i] === null) {
        G.board[i] = 1;
        const w = getWinner(G.board);
        G.board[i] = null;
        if (w === 1) return i;
      }
    }
    // Take center
    if (G.board[4] === null) return 4;
    // Take corner
    const corners = [0,2,6,8].filter(c => G.board[c] === null);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  }
  return aiRandom();
}

function aiBestMove() {
  let bestScore = -Infinity, bestIdx = null;
  for (let i = 0; i < 9; i++) {
    if (G.board[i] === null) {
      G.board[i] = 2;
      const score = minimax(G.board, 0, false, -Infinity, Infinity);
      G.board[i] = null;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
  }
  return bestIdx;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
  const winner = getWinner(board);
  if (winner === 2) return 10 - depth;
  if (winner === 1) return depth - 10;
  if (board.every(v => v !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 2;
        best = Math.max(best, minimax(board, depth + 1, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 1;
        best = Math.min(best, minimax(board, depth + 1, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

/* ─────────────────────────────────────────────
   PROJECTILE ANIMATION
───────────────────────────────────────────── */
function fireProjectile(fromPlayer, toPlayer, callback) {
  const fromEl = $(`p${fromPlayer}-frame`).getBoundingClientRect();
  const toEl   = $(`p${toPlayer}-frame`).getBoundingClientRect();

  const sx = fromEl.left + fromEl.width  / 2;
  const sy = fromEl.top  + fromEl.height / 2;
  const ex = toEl.left   + toEl.width    / 2;
  const ey = toEl.top    + toEl.height   / 2;

  const proj = $('projectile');
  proj.className = toPlayer === 2 ? 'jade-proj' : '';
  proj.style.display = 'block';
  proj.style.left = sx + 'px';
  proj.style.top  = sy + 'px';
  proj.style.opacity = '1';

  const duration = 500;
  const startTime = performance.now();

  function frame(now) {
    const t    = Math.min((now - startTime) / duration, 1);
    const ease = t < .5 ? 2*t*t : -1 + (4 - 2*t)*t; // ease-in-out
    const cx   = sx + (ex - sx) * ease;
    const cy   = sy + (ey - sy) * ease;
    const scale = 1 + Math.sin(t * Math.PI) * 0.7;
    const opacity = t > 0.85 ? (1 - t) * (1 / 0.15) : 1;

    proj.style.left      = cx + 'px';
    proj.style.top       = cy + 'px';
    proj.style.transform = `translate(-50%,-50%) scale(${scale})`;
    proj.style.opacity   = opacity;

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      proj.style.display = 'none';
      if (callback) callback();
    }
  }
  requestAnimationFrame(frame);
}

/* ─────────────────────────────────────────────
   WIN LINE DRAWING
───────────────────────────────────────────── */
function drawWinLine(line) {
  const svg = $('win-line');
  svg.innerHTML = '';

  const cells = $('board').querySelectorAll('.cell');
  const boardRect = $('board').getBoundingClientRect();

  function cellCenter(i) {
    const r = cells[i].getBoundingClientRect();
    return {
      x: ((r.left + r.width  / 2 - boardRect.left) / boardRect.width)  * 100,
      y: ((r.top  + r.height / 2 - boardRect.top)  / boardRect.height) * 100
    };
  }

  const start = cellCenter(line[0]);
  const end   = cellCenter(line[2]);

  const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  lineEl.setAttribute('x1', start.x); lineEl.setAttribute('y1', start.y);
  lineEl.setAttribute('x2', end.x);   lineEl.setAttribute('y2', end.y);
  lineEl.setAttribute('stroke', 'rgba(201,162,39,0.75)');
  lineEl.setAttribute('stroke-width', '2.5');
  lineEl.setAttribute('stroke-linecap', 'round');
  lineEl.style.filter = 'drop-shadow(0 0 4px rgba(201,162,39,0.9))';

  const len = Math.hypot(end.x - start.x, end.y - start.y);
  lineEl.setAttribute('stroke-dasharray', len);
  lineEl.setAttribute('stroke-dashoffset', len);
  lineEl.style.animation = 'drawLine .45s var(--ease-out) .1s forwards';

  const style = document.createElement('style');
  style.textContent = '@keyframes drawLine { to { stroke-dashoffset: 0; } }';
  document.head.appendChild(style);

  svg.appendChild(lineEl);
}

/* ─────────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────────── */
function updateCrystals() {
  [1, 2].forEach(p => {
    const hp = G[`p${p}hp`];
    [1, 2, 3].forEach(c => {
      $(`p${p}-c${c}`).classList.toggle('broken', c > hp);
    });
  });
}

function setStatus(msg, flash = false) {
  const el = $('status-text');
  el.textContent = msg;
  if (flash) {
    el.classList.remove('flash');
    void el.offsetWidth; // reflow
    el.classList.add('flash');
  }
}

function setRound(n) {
  const el = $('round-num');
  el.textContent = n;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

/* ─────────────────────────────────────────────
   HISTORY ENTRY
───────────────────────────────────────────── */
function addHistoryEntry(winner) {
  saveHistory({
    winner,
    av1:   G.av1, av2:  G.av2,
    mode:  G.mode, diff: G.diff,
    round: G.round,
    date:  new Date().toLocaleDateString(),
    time:  new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
  });
}

/* ─────────────────────────────────────────────
   GAME CONTROLS
───────────────────────────────────────────── */
function rematch() {
  $('screen-victory').classList.remove('show');
  startGame();
}

function quitGame() {
  clearTimer();
  G.active    = false;
  G.animating = false;
  $('screen-victory').classList.remove('show');
  $('clash-overlay').classList.remove('show');
  $('ultimate-overlay').classList.remove('show');
  $('round-win-text').classList.remove('show');
  $('projectile').style.display = 'none';
  showScreen('screen-menu');
}
function toMode(){
  $('screen-victory').classList.remove('show');
  showScreen('screen-mode');
}

/* ─────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

/* ─────────────────────────────────────────────
   INITIALISE
───────────────────────────────────────────── */
(function init() {
  loadSavedConfig();
  applyTheme(G.theme);

  // Unlock audio on first user gesture
  document.addEventListener('click', () => {
    try { getCtx(); } catch(e) {}
    if (G.musicOn && !musicActive) startMusic();
  }, { once: true });

  // Save config on unload
  window.addEventListener('beforeunload', saveConfig);
})();
