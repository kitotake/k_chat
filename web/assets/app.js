/* ============================================================
   chat.js — FiveM Chat UI
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  activeTab:    'global',
  playerCount:  [0, 0],
  staffCount:   0,
  me: {
    name:  'MegaVince',
    role:  'Fondateur',
    color: '#4ade80',
    initials: 'MV',
  },
  pmContacts:   [],       // [{ id, name, color, initials, msgs: [], unread: 0 }]
  activePmId:   null,
  notifs: { global: 0, staff: 0, pm: 0 },
};

// Player name → color map (populated dynamically, seeded for demo)
const colorPool = [
  '#38bdf8','#fb923c','#a78bfa','#34d399',
  '#f472b6','#facc15','#60a5fa','#4ade80',
  '#e879f9','#f87171','#94a3b8','#fbbf24',
];
const playerColors = new Map();
let colorIdx = 0;
function colorFor(name) {
  if (!playerColors.has(name)) {
    playerColors.set(name, colorPool[colorIdx++ % colorPool.length]);
  }
  return playerColors.get(name);
}

// ── Emoji set ──────────────────────────────────────────────────────────────
const EMOJIS = [
  '😂','😎','🔥','❤️','👋','🙏','💯','✅',
  '😅','👀','🎉','💀','🤡','😤','💪','🚀',
  '👑','⚡','🐉','🎮','🏆','💸','🔫','🚗',
];

// ── DOM helpers ────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const ts = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(tab) {
  ['global','staff','pm'].forEach(t => {
    $(`tab-${t}`)?.classList.remove('active');
    const v = $(`view-${t}`);
    if (v) v.style.display = 'none';
  });
  $(`tab-${tab}`)?.classList.add('active');
  const view = $(`view-${tab}`);
  if (view) view.style.display = 'flex';

  // Clear notification for this tab
  state.notifs[tab] = 0;
  const badge = $(`notif-${tab}`);
  if (badge) badge.style.display = 'none';

  state.activeTab = tab;

  // Focus input
  const inp = $(`inp-${tab}`);
  if (inp) inp.focus();

  scrollBottom(tab);
}

// ── Scroll to bottom ───────────────────────────────────────────────────────
function scrollBottom(tab) {
  if (tab === 'pm') {
    const el = $('pm-conv-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  } else {
    const el = $(`msgs-${tab}`);
    if (el) el.scrollTop = el.scrollHeight;
  }
}

// ── Bump notification badge ────────────────────────────────────────────────
function bumpNotif(tab) {
  if (state.activeTab === tab) return;
  state.notifs[tab]++;
  const badge = $(`notif-${tab}`);
  if (!badge) return;
  badge.textContent = state.notifs[tab] > 99 ? '99+' : state.notifs[tab];
  badge.style.display = 'inline-flex';
  // Re-trigger animation
  badge.style.animation = 'none';
  void badge.offsetWidth;
  badge.style.animation = '';
}

// ── Character counter ──────────────────────────────────────────────────────
function setupCounter(tab) {
  const inp  = $(`inp-${tab}`);
  const cc   = $(`cc-${tab}`);
  if (!inp || !cc) return;
  inp.addEventListener('input', () => {
    const len = inp.value.length;
    cc.textContent = `${len}/150`;
    cc.classList.toggle('warn', len >= 100 && len < 140);
    cc.classList.toggle('full', len >= 140);
  });
}

// ── Append a chat message ──────────────────────────────────────────────────
function appendMsg(tab, author, text, isNew = false) {
  const wrap = $(`msgs-${tab}`);
  if (!wrap) return;

  const color = colorFor(author);
  const row   = document.createElement('div');
  row.className = 'msg' + (isNew ? ' new' : '');
  if (tab === 'staff') row.classList.add('staff-msg');

  row.innerHTML = `
    <span class="msg-time">${ts()}</span>
    <span class="msg-author" style="color:${color}">${escHtml(author)}</span>
    <span class="msg-text">${formatMsg(text)}</span>
  `;
  wrap.appendChild(row);

  // Keep DOM lean (max 200 messages)
  while (wrap.children.length > 200) wrap.removeChild(wrap.firstChild);

  scrollBottom(tab);
}

// ── Format message (basic emoji + escape) ──────────────────────────────────
function formatMsg(raw) {
  return escHtml(raw);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Send ───────────────────────────────────────────────────────────────────
function send(tab) {
  const inp  = $(`inp-${tab}`);
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  inp.value = '';
  const cc = $(`cc-${tab}`);
  if (cc) { cc.textContent = '0/150'; cc.className = 'cc'; }

  // Close emoji panel
  const ep = $(`ep-${tab}`);
  if (ep) ep.classList.remove('open');
  const etb = $(`etb-${tab}`);
  if (etb) etb.classList.remove('active');

  // Post to NUI or FiveM
  fetch(`https://${GetParentResourceName()}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ channel: tab, message: text }),
  }).catch(() => {});

  // Optimistic local display
  appendMsg(tab, state.me.name, text);
}

function sendPm() {
  if (!state.activePmId) return;
  const inp  = $('inp-pm');
  const text = inp?.value.trim();
  if (!text) return;
  inp.value = '';

  const ep = $('ep-pm');
  if (ep) ep.classList.remove('open');
  const etb = $('etb-pm');
  if (etb) etb.classList.remove('active');

  fetch(`https://${GetParentResourceName()}/sendPm`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ targetId: state.activePmId, message: text }),
  }).catch(() => {});

  // Local bubble
  appendPmBubble(state.activePmId, state.me.name, text, true);
}

// ── PM bubbles ─────────────────────────────────────────────────────────────
function appendPmBubble(contactId, author, text, isMine) {
  const contact = state.pmContacts.find(c => c.id === contactId);
  if (!contact) return;
  contact.msgs.push({ author, text, time: ts(), mine: isMine });
  if (!contact.lastPreview) contact.lastPreview = text;
  contact.lastPreview = text;

  if (state.activePmId === contactId) {
    renderPmBubbles(contact);
  } else if (!isMine) {
    contact.unread = (contact.unread || 0) + 1;
    renderContacts();
    bumpNotif('pm');
  }
}

function renderPmBubbles(contact) {
  const wrap = $('pm-conv-msgs');
  if (!wrap) return;
  wrap.innerHTML = '';
  contact.msgs.forEach(m => {
    const b = document.createElement('div');
    b.className = 'pm-bubble ' + (m.mine ? 'mine' : 'theirs');
    b.innerHTML = `
      <div class="pm-bubble-txt">${escHtml(m.text)}</div>
      <span class="pm-bubble-meta">${m.mine ? 'Vous' : escHtml(m.author)} · ${m.time}</span>
    `;
    wrap.appendChild(b);
  });
  scrollBottom('pm');
}

// ── PM Contacts ────────────────────────────────────────────────────────────
function renderContacts() {
  const wrap = $('pm-contacts');
  if (!wrap) return;
  wrap.innerHTML = '';

  state.pmContacts.forEach(c => {
    const el = document.createElement('div');
    el.className = 'pm-contact' + (c.id === state.activePmId ? ' active' : '');
    el.dataset.id = c.id;
    el.innerHTML = `
      <div class="pm-contact-av" style="color:${c.color};border:1.5px solid ${c.color}22;background:${c.color}15">
        ${escHtml(c.initials)}
      </div>
      <div class="pm-contact-info">
        <div class="pm-contact-name" style="color:${c.color}">${escHtml(c.name)}</div>
        <div class="pm-contact-preview">${c.lastPreview ? escHtml(c.lastPreview.slice(0,24)) : '—'}</div>
      </div>
      ${c.unread ? `<div class="pm-contact-badge">${c.unread}</div>` : ''}
    `;
    el.addEventListener('click', () => openConversation(c.id));
    wrap.appendChild(el);
  });
}

function openConversation(id) {
  state.activePmId = id;
  const contact = state.pmContacts.find(c => c.id === id);
  if (!contact) return;

  contact.unread = 0;
  renderContacts();

  $('pm-empty').style.display  = 'none';
  $('pm-conv').style.display   = 'flex';
  $('pm-hdr-av').textContent   = contact.initials;
  $('pm-hdr-name').textContent = contact.name;

  renderPmBubbles(contact);
  $('inp-pm')?.focus();
}

function addOrUpdateContact(id, name) {
  let c = state.pmContacts.find(c => c.id === id);
  if (!c) {
    const col = colorFor(name);
    c = {
      id, name,
      color:    col,
      initials: initials(name),
      msgs:     [],
      unread:   0,
      lastPreview: null,
    };
    state.pmContacts.unshift(c);
  }
  renderContacts();
  return c;
}

function initials(name) {
  return name.slice(0,2).toUpperCase();
}

// ── Emoji panel ────────────────────────────────────────────────────────────
function buildEmojiPanels() {
  ['global','staff','pm'].forEach(tab => {
    const ep = $(`ep-${tab}`);
    if (!ep) return;
    EMOJIS.forEach(em => {
      const s = document.createElement('span');
      s.textContent = em;
      s.title = em;
      s.addEventListener('click', () => insertEmoji(tab, em));
      ep.appendChild(s);
    });
  });
}

function toggleEmoji(tab) {
  const ep  = $(`ep-${tab}`);
  const etb = $(`etb-${tab}`);
  if (!ep) return;
  const isOpen = ep.classList.toggle('open');
  etb?.classList.toggle('active', isOpen);
}

function insertEmoji(tab, em) {
  const inp = tab === 'pm' ? $('inp-pm') : $(`inp-${tab}`);
  if (!inp) return;
  const start = inp.selectionStart;
  const end   = inp.selectionEnd;
  const val   = inp.value;
  if (val.length + em.length > 150) return;
  inp.value = val.slice(0, start) + em + val.slice(end);
  inp.selectionStart = inp.selectionEnd = start + em.length;
  inp.dispatchEvent(new Event('input'));
  inp.focus();
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      fetch(`https://${GetParentResourceName()}/closeChat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }).catch(() => {});
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const tabs  = ['global','staff','pm'];
      const idx   = tabs.indexOf(state.activeTab);
      const next  = tabs[(idx + 1) % tabs.length];
      switchTab(next);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.activeTab === 'pm') sendPm();
      else send(state.activeTab);
    }
  });

  // Per-input Enter
  ['global','staff'].forEach(tab => {
    const inp = $(`inp-${tab}`);
    if (!inp) return;
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(tab); }
    });
  });
  const pmInp = $('inp-pm');
  if (pmInp) pmInp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); sendPm(); }
  });
}

// ── NUI / FiveM message handler ───────────────────────────────────────────
function handleNuiMessage(event) {
  const { action, data } = event.data || {};
  if (!action) return;

  switch (action) {
    case 'openChat': {
      document.getElementById('chatRoot').style.display = 'flex';
      const inp = $(`inp-${state.activeTab}`);
      if (inp) setTimeout(() => inp.focus(), 30);
      break;
    }
    case 'closeChat': {
      document.getElementById('chatRoot').style.display = 'none';
      break;
    }
    case 'receiveMessage': {
      // data: { channel, author, message }
      const ch = data.channel || 'global';
      appendMsg(ch, data.author, data.message, true);
      bumpNotif(ch);
      break;
    }
    case 'receivePm': {
      // data: { fromId, fromName, message }
      addOrUpdateContact(data.fromId, data.fromName);
      appendPmBubble(data.fromId, data.fromName, data.message, false);
      break;
    }
    case 'setPlayerInfo': {
      // data: { name, role, color, initials }
      Object.assign(state.me, data);
      const dot  = $('meAvatar');
      const name = $('meName');
      if (dot)  { dot.textContent = state.me.initials; dot.style.color = state.me.color; dot.style.borderColor = state.me.color; }
      if (name) name.textContent = `${state.me.name} · ${state.me.role}`;
      break;
    }
    case 'updatePlayerCount': {
      // data: { current, max }
      state.playerCount = [data.current, data.max];
      const el = $('playerCount');
      if (el) el.textContent = `${data.current} / ${data.max} joueurs`;
      break;
    }
    case 'updateStaffCount': {
      state.staffCount = data.count;
      const el = $('staffCount');
      if (el) el.textContent = `Staff en ligne : ${data.count}`;
      break;
    }
    case 'addPmContact': {
      // data: { id, name }
      addOrUpdateContact(data.id, data.name);
      break;
    }
    case 'updatePmContacts': {
      // data: [{ id, name }, ...]
      (data || []).forEach(c => addOrUpdateContact(c.id, c.name));
      break;
    }
  }
}

// ── Stub for non-FiveM env (browser preview) ──────────────────────────────
function GetParentResourceName() {
  if (typeof window.GetParentResourceName === 'function') {
    return window.GetParentResourceName();
  }
  return 'my_chat';
}

// ── Demo data (removed automatically by FiveM; safe to keep) ──────────────
function loadDemo() {
  const players = [
    { name: 'Flex_77',   msgs: ['Quelqu\'un zone port ? 🎮'] },
    { name: 'Rico_S',    msgs: ['GG le run ! 🔥'] },
    { name: 'MissViper', msgs: ['Event ce soir ?'] },
    { name: 'AceDrift',  msgs: ['LSPD force secteur sud 👀'] },
  ];

  const times = ['01:16','01:16','01:16','01:16','01:17','01:17','01:17','01:17','01:17','01:17','01:17','01:18','01:18','01:18'];
  const seq   = [0,1,2,3,0,1,2,3,0,1,2,3,0,1];

  const wrap = $('msgs-global');
  if (!wrap) return;

  seq.forEach((pi, i) => {
    const p    = players[pi];
    const color = colorFor(p.name);
    const row  = document.createElement('div');
    row.className = 'msg';
    row.innerHTML = `
      <span class="msg-time">${times[i]}</span>
      <span class="msg-author" style="color:${color}">${escHtml(p.name)}</span>
      <span class="msg-text">${escHtml(p.msgs[0])}</span>
    `;
    wrap.appendChild(row);
  });

  scrollBottom('global');
  $('playerCount').textContent = '47 / 64 joueurs';

  // Demo PM contacts
  addOrUpdateContact('p1', 'Flex_77');
  addOrUpdateContact('p2', 'Rico_S');
  state.notifs.staff = 354;
  const sb = $('notif-staff');
  if (sb) { sb.textContent = '354'; sb.style.display = 'inline-flex'; }
  state.notifs.pm = 5;
  const pb = $('notif-pm');
  if (pb) { pb.textContent = '5'; pb.style.display = 'inline-flex'; }
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildEmojiPanels();
  setupKeyboard();
  ['global','staff'].forEach(setupCounter);

  window.addEventListener('message', handleNuiMessage);

  // Expose globals for inline onclick handlers in HTML
  window.switchTab   = switchTab;
  window.send        = send;
  window.sendPm      = sendPm;
  window.toggleEmoji = toggleEmoji;

  loadDemo();
});