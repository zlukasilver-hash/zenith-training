import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  push,
  onValue,
  runTransaction,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/*
  ZENITH RP — TRAINING SYSTEM
  script.js — ЧАСТЬ 1 ИЗ 3

  В этой части:
  — firebase, константы, ui, state
  — утилиты
  — кастомные уведомления и модалки
  — игровые правила для плашки комнаты
  — модели данных
  — нормализация данных
  — логика улучшений
  — профиль и персонажи
  — базовые auth-хелперы

  Дальше будут:
  — комнаты, готовность, бой, зачёт, история
  — рендеры, админка, бинды, init
*/

const firebaseConfig = {
  apiKey: "AIzaSyDPXjtn1FMRBGrHQhMKPlsczQn0OXgVWvg",
  authDomain: "zenit-a314c.firebaseapp.com",
  databaseURL: "https://zenit-a314c-default-rtdb.firebaseio.com",
  projectId: "zenit-a314c",
  storageBucket: "zenit-a314c.firebasestorage.app",
  messagingSenderId: "431806562237",
  appId: "1:431806562237:web:bdff275ef5bcaccce95cd4",
  measurementId: "G-3TYXCHS8FG"
};

const ADMIN_EMAIL = "zluka.silver@bk.ru";
const MOSCOW_TIMEZONE = "Europe/Moscow";
const ROOM_RULES_VERSION = "room_rules_v2_2026_03_31";

const ROOM_CODE_LENGTH = 6;
const MAX_LOG_ITEMS = 36;
const MAX_DODGES = 4;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const READY_TIMEOUT_MS = 10 * 60 * 1000;
const PAIR_COOLDOWN_DAYS = 3;
const FEED_LIMIT = 20;

const LOCAL_KEYS = {
  activeRoom: "zenith_active_room_v3",
  theme: "zenith_theme_v3",
  readRules: "zenith_read_rules_v3"
};

const THEMES = {
  crimsonNight: { id: "crimsonNight", label: "багровая ночь" },
  moonlight: { id: "moonlight", label: "лунный свет" },
  forestDweller: { id: "forestDweller", label: "житель леса" }
};

const CHANCES = {
  sand: 50,
  paw: 45,
  trip: 40,
  dodge: 40
};

const DAMAGE = {
  paw: 5,
  pawNeck: 10,
  trip: 10
};

const DOT = {
  paw: 5,
  pawNeck: 10,
  trip: 10
};

const SAND_ACCURACY_PENALTY = 10;
const SAND_PENALTY_TURNS = 2;

const BODY_TARGETS = {
  face: { label: "морду", chanceModifier: 0, directDamage: DAMAGE.paw, dotDamage: DOT.paw },
  frontLeft: { label: "переднюю левую лапу", chanceModifier: 0, directDamage: DAMAGE.paw, dotDamage: DOT.paw },
  frontRight: { label: "переднюю правую лапу", chanceModifier: 0, directDamage: DAMAGE.paw, dotDamage: DOT.paw },
  side: { label: "бок", chanceModifier: 0, directDamage: DAMAGE.paw, dotDamage: DOT.paw },
  ears: { label: "уши", chanceModifier: 0, directDamage: DAMAGE.paw, dotDamage: DOT.paw },
  neck: { label: "шею", chanceModifier: -10, directDamage: DAMAGE.pawNeck, dotDamage: DOT.pawNeck }
};

const TRAINING_THRESHOLDS = {
  warrior: { wins: 3, losses: 5 },
  apprentice: { wins: 5, losses: 7 }
};

const UPGRADE_DEFINITIONS = {
  accuracy: {
    id: "accuracy",
    label: "Шанс попадания",
    increment: 10,
    cap: 70,
    maxCount: 5,
    unit: "%"
  },
  dodge: {
    id: "dodge",
    label: "Шанс уворота",
    increment: 10,
    cap: 70,
    maxCount: 5,
    unit: "%"
  },
  clawPower: {
    id: "clawPower",
    label: "Сила удара: удар когтями",
    increment: 5,
    cap: 30,
    maxCount: 5,
    unit: "%"
  },
  bitePower: {
    id: "bitePower",
    label: "Сила удара: укус",
    increment: 5,
    cap: 30,
    maxCount: 5,
    unit: "%"
  }
};

const RESULT_TYPES = {
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
  UNFINISHED: "unfinished"
};

const FEED_TYPES = {
  CREDITED_TRAINING: "credited_training",
  UPGRADE_GAINED: "upgrade_gained",
  PROMOTION_TRANSFER: "promotion_transfer"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const byId = id => document.getElementById(id);

const ui = {
  screens: {
    auth: byId("authScreen"),
    profile: byId("profileScreen"),
    room: byId("roomScreen"),
    battle: byId("battleScreen"),
    admin: byId("adminScreen"),
    history: byId("historyScreen"),
    publicProfiles: byId("publicProfilesScreen")
  },

  shell: {
    currentUserBadge: byId("currentUserBadge"),
    globalNotice: byId("globalNotice"),
    openProfileBtn: byId("openProfileBtn"),
    openRoomBtn: byId("openRoomBtn"),
    openAdminBtn: byId("openAdminBtn"),
    openHistoryBtn: byId("openHistoryBtn"),
    openPublicProfilesBtn: byId("openPublicProfilesBtn"),
    mainLogoutBtn: byId("mainLogoutBtn"),
    themeSelect: byId("themeSelect"),
    feedTicker: byId("feedTicker")
  },

  auth: {
    accountName: byId("accountName"),
    email: byId("emailInput"),
    password: byId("passwordInput"),
    registerBtn: byId("registerBtn"),
    loginBtn: byId("loginBtn"),
    logoutBtn: byId("logoutBtn"),
    status: byId("authStatus")
  },

  profile: {
    name: byId("profileName"),
    statusText: byId("profileStatusText"),
    statusInput: byId("profileStatusInput"),
    saveProfileBtn: byId("saveProfileBtn"),
    symbolSelect: byId("profileSymbolSelect"),
    portraitInitials: byId("profilePortraitInitials"),
    savePortraitSymbolBtn: byId("savePortraitSymbolBtn"),
    activeCharacterSelect: byId("activeCharacterSelect"),
    charactersList: byId("charactersList"),
    addCharacterBtn: byId("addCharacterBtn"),
    charNameInput: byId("charNameInput"),
    charClanInput: byId("charClanInput"),
    charTrainingStatusSelect: byId("charTrainingStatusSelect"),
    characterSearchInput: byId("characterSearchInput"),
    ownerNoteInput: byId("ownerNoteInput"),
    saveOwnerNoteBtn: byId("saveOwnerNoteBtn")
  },

  room: {
    playerNameMirror: byId("playerNameMirror"),
    activeCharacterMirror: byId("activeCharacterMirror"),
    roomCodeInput: byId("roomCodeInput"),
    createRoomBtn: byId("createRoomBtn"),
    joinRoomBtn: byId("joinRoomBtn"),
    leaveRoomBtn: byId("leaveRoomBtn"),
    copyRoomCodeBtn: byId("copyRoomCodeBtn"),
    startBattleBtn: byId("startBattleBtn"),
    readyToggleBtn: byId("readyToggleBtn"),
    statusLog: byId("statusLog"),
    roomPlayers: byId("roomPlayers"),
    roomMeta: byId("roomMeta"),
    creditBadge: byId("trainingCreditBadge"),
    creditReasonBox: byId("trainingCreditReasonBox"),
    waitingStateBox: byId("waitingStateBox"),
    roomTimer: byId("roomTimer"),
    roomResultCard: byId("roomResultCard")
  },

  battle: {
    screen: byId("battleScreen"),
    info: byId("battleInfo"),
    log: byId("battleLog"),
    actions: byId("battleActions"),
    attackMenu: byId("attackMenu"),
    targetMenu: byId("targetMenu"),
    attackActionBtn: byId("attackActionBtn"),
    defendActionBtn: byId("defendActionBtn"),
    escapeActionBtn: byId("escapeActionBtn"),
    sandAttackBtn: byId("sandAttackBtn"),
    pawAttackBtn: byId("pawAttackBtn"),
    tripAttackBtn: byId("tripAttackBtn"),
    backToActionsBtn: byId("backToActionsBtn"),
    backToAttackMenuBtn: byId("backToAttackMenuBtn"),
    faceTargetBtn: byId("faceTargetBtn"),
    frontLeftTargetBtn: byId("frontLeftTargetBtn"),
    frontRightTargetBtn: byId("frontRightTargetBtn"),
    sideTargetBtn: byId("sideTargetBtn"),
    earsTargetBtn: byId("earsTargetBtn"),
    neckTargetBtn: byId("neckTargetBtn"),
    opponentChosenBadge: byId("opponentChosenBadge")
  },

  history: {
    list: byId("myTrainingsList")
  },

  publicProfiles: {
    searchInput: byId("publicProfileSearchInput"),
    searchBtn: byId("publicProfileSearchBtn"),
    list: byId("publicProfilesList"),
    details: byId("publicProfileDetails")
  },

  admin: {
    panel: byId("adminScreen"),
    summary: byId("adminSummary"),
    playersList: byId("adminPlayersList"),
    charactersList: byId("adminCharactersList"),
    roomsList: byId("adminRoomsList"),
    matchesList: byId("adminMatchesList"),
    playerHistoryList: byId("adminPlayerHistoryList"),
    searchInput: byId("adminCharacterSearchInput"),
    searchBtn: byId("adminCharacterSearchBtn"),
    refreshBtn: byId("adminRefreshBtn")
  }
};

const state = {
  user: null,
  userProfile: null,
  characters: {},
  currentRoomCode: "",
  currentPlayerRole: null,
  currentBattleTurnNumber: null,
  currentScreen: "auth",
  isAdmin: false,
  isBlocked: false,
  activeTheme: THEMES.crimsonNight.id,
  expandedCharacterCards: {},

  adminUsersCache: {},
  adminRoomsCache: {},
  adminMatchesCache: {},
  publicCharactersCache: [],
  feedCache: [],

  toastContainer: null,
  modalRoot: null,
  modalResolver: null,
  modalSerializer: null,

  roomTimerInterval: null,
  lastRenderedLogLength: 0,
  syncingForcedRound: false,
  isApplyingAutoJoin: false,

  unsubscribeRoom: null,
  unsubscribeUsers: null,
  unsubscribeRooms: null,
  unsubscribeMatches: null,
  unsubscribeFeed: null,

  adminSelectedUserId: "",
  shownRulesByRoom: {}
};

/* ==========================================================================
   УТИЛИТЫ
   ========================================================================== */

function now() {
  return Date.now();
}

function text(node, value) {
  if (node) node.textContent = value;
}

function html(node, value) {
  if (node) node.innerHTML = value;
}

function show(node) {
  if (node) node.classList.remove("hidden");
}

function hide(node) {
  if (node) node.classList.add("hidden");
}

function disable(node, value = true) {
  if (node) node.disabled = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function randomRoll() {
  return Math.floor(Math.random() * 100) + 1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: MOSCOW_TIMEZONE
  }).format(new Date(timestamp));
}

function formatOnlyDate(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeZone: MOSCOW_TIMEZONE
  }).format(new Date(timestamp));
}

function getMoscowDateKey(timestamp = now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: MOSCOW_TIMEZONE
  }).formatToParts(new Date(timestamp));

  const map = {};
  parts.forEach(part => {
    if (part.type !== "literal") map[part.type] = part.value;
  });

  return `${map.year}-${map.month}-${map.day}`;
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function compareDateKeys(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

function getInitials(name) {
  const clean = String(name || "").trim();
  if (!clean) return "✦";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() || "").join("") || "✦";
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function saveActiveRoomLocal(roomCode, role) {
  localStorage.setItem(LOCAL_KEYS.activeRoom, JSON.stringify({ roomCode, role }));
}

function clearActiveRoomLocal() {
  localStorage.removeItem(LOCAL_KEYS.activeRoom);
}

function readActiveRoomLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.activeRoom);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveThemeLocal(themeId) {
  localStorage.setItem(LOCAL_KEYS.theme, themeId);
}

function readThemeLocal() {
  return localStorage.getItem(LOCAL_KEYS.theme) || THEMES.crimsonNight.id;
}

function readRulesLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.readRules);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRulesLocal(value) {
  localStorage.setItem(LOCAL_KEYS.readRules, JSON.stringify(value || {}));
}

function markRulesReadForRoom(roomCode) {
  if (!roomCode) return;
  state.shownRulesByRoom[roomCode] = true;
  const map = readRulesLocal();
  map[roomCode] = ROOM_RULES_VERSION;
  saveRulesLocal(map);
}

function hasReadRulesForRoom(roomCode) {
  if (!roomCode) return false;
  if (state.shownRulesByRoom[roomCode]) return true;
  const map = readRulesLocal();
  return map[roomCode] === ROOM_RULES_VERSION;
}

function applyTheme(themeId) {
  state.activeTheme = THEMES[themeId] ? themeId : THEMES.crimsonNight.id;
  document.body.dataset.theme = state.activeTheme;
  if (ui.shell.themeSelect) ui.shell.themeSelect.value = state.activeTheme;
  saveThemeLocal(state.activeTheme);
}

function requireAuth() {
  if (!state.user) {
    notifyError("Сначала войди в аккаунт.");
    return false;
  }
  if (state.isBlocked) {
    notifyError("Ваш аккаунт заблокирован.");
    return false;
  }
  return true;
}

function getProfilePath(uid) {
  return `users/${uid}/profile`;
}

function getCharactersPath(uid) {
  return `users/${uid}/characters`;
}

function getCharacterPath(uid, characterId) {
  return `${getCharactersPath(uid)}/${characterId}`;
}

function getRoomPath(roomCode) {
  return `rooms/${roomCode}`;
}

function getFeedPath() {
  return "system/trainingFeed";
}

function getPairCooldownPath(pairKey) {
  return `system/pairCooldowns/${pairKey}`;
}

function getSelectedCharacterId() {
  return ui.profile.activeCharacterSelect?.value || state.userProfile?.activeCharacterId || "";
}

function getCharacterById(characterId) {
  return state.characters?.[characterId] || null;
}

function getCharacterGlobalId(uid, characterId) {
  return `${uid}__${characterId}`;
}

function getPairKey(hostUid, hostCharacterId, guestUid, guestCharacterId) {
  const items = [
    getCharacterGlobalId(hostUid, hostCharacterId),
    getCharacterGlobalId(guestUid, guestCharacterId)
  ].sort();

  return items.join("--");
}

function getOtherRole(role) {
  return role === "host" ? "guest" : "host";
}

function getTrainingStatusLabel(status) {
  return status === "apprentice" ? "Оруженосец" : "Воитель";
}

function getRoomStatusLabel(status) {
  if (status === "waiting") return "ожидание второго игрока";
  if (status === "ready") return "ожидание готовности";
  if (status === "battle") return "идёт тренировка";
  if (status === "finished") return "тренировка завершена";
  return "—";
}

/* ==========================================================================
   TOAST + МОДАЛКИ
   ========================================================================== */

function ensureUiChrome() {
  if (!state.toastContainer) {
    const container = document.createElement("div");
    container.id = "zenithToastContainer";
    container.className = "zenith-toast-container";
    document.body.appendChild(container);
    state.toastContainer = container;
  }

  if (!state.modalRoot) {
    const root = document.createElement("div");
    root.id = "zenithModalRoot";
    root.className = "zenith-modal-root hidden";
    root.innerHTML = `
      <div class="zenith-modal-backdrop"></div>
      <div class="zenith-modal-card">
        <div class="zenith-modal-top">
          <div id="zenithModalTitle" class="zenith-modal-title">Окно</div>
          <button type="button" id="zenithModalClose" class="zenith-modal-close">✦</button>
        </div>
        <div id="zenithModalText" class="zenith-modal-text"></div>
        <div id="zenithModalBody" class="zenith-modal-body"></div>
        <div class="zenith-modal-actions">
          <button type="button" id="zenithModalCancel">Отмена</button>
          <button type="button" id="zenithModalConfirm">Подтвердить</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    state.modalRoot = root;

    const resolveModal = payload => {
      if (!state.modalResolver) return;
      const resolver = state.modalResolver;
      state.modalResolver = null;
      state.modalSerializer = null;
      hide(root);
      html(byId("zenithModalBody"), "");
      resolver(payload);
    };

    byId("zenithModalClose")?.addEventListener("click", () => {
      if (root.dataset.allowClose === "false") return;
      resolveModal({ confirmed: false, value: null });
    });

    root.querySelector(".zenith-modal-backdrop")?.addEventListener("click", () => {
      if (root.dataset.allowClose === "false") return;
      resolveModal({ confirmed: false, value: null });
    });

    byId("zenithModalCancel")?.addEventListener("click", () => {
      resolveModal({ confirmed: false, value: null });
    });

    byId("zenithModalConfirm")?.addEventListener("click", () => {
      const serializer = state.modalSerializer;
      const value = typeof serializer === "function" ? serializer(root) : true;
      resolveModal({ confirmed: true, value });
    });
  }
}

function toast(message, variant = "default") {
  ensureUiChrome();

  const item = document.createElement("div");
  item.className = `zenith-toast zenith-toast-${variant}`;
  item.innerHTML = `
    <div class="zenith-toast-mark">✦</div>
    <div class="zenith-toast-text">${escapeHtml(message)}</div>
  `;

  state.toastContainer.appendChild(item);
  setTimeout(() => item.classList.add("zenith-toast-visible"), 10);

  setTimeout(() => {
    item.classList.remove("zenith-toast-visible");
    setTimeout(() => item.remove(), 250);
  }, 2600);

  if (variant === "default") {
    text(ui.shell.globalNotice, message);
  }
}

function notify(message) {
  toast(message, "default");
}

function notifyError(message) {
  toast(message, "danger");
}

async function openModal({
  title = "Окно",
  text: bodyText = "",
  bodyHtml = "",
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  showCancel = true,
  allowClose = true,
  serializer = null
}) {
  ensureUiChrome();

  text(byId("zenithModalTitle"), title);
  text(byId("zenithModalText"), bodyText);
  html(byId("zenithModalBody"), bodyHtml);
  text(byId("zenithModalConfirm"), confirmLabel);
  text(byId("zenithModalCancel"), cancelLabel);

  byId("zenithModalCancel").style.display = showCancel ? "" : "none";
  byId("zenithModalClose").style.display = allowClose ? "" : "none";
  state.modalRoot.dataset.allowClose = allowClose ? "true" : "false";

  state.modalSerializer = serializer;
  show(state.modalRoot);

  return new Promise(resolve => {
    state.modalResolver = resolve;
  });
}

async function openConfirmModal({
  title,
  text: bodyText,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена"
}) {
  const result = await openModal({
    title,
    text: bodyText,
    confirmLabel,
    cancelLabel,
    showCancel: true,
    allowClose: true
  });

  return result.confirmed;
}

async function openInfoModal({
  title,
  text: bodyText = "",
  bodyHtml = "",
  confirmLabel = "Я понял",
  allowClose = false
}) {
  const result = await openModal({
    title,
    text: bodyText,
    bodyHtml,
    confirmLabel,
    cancelLabel: "",
    showCancel: false,
    allowClose
  });

  return result.confirmed;
}

async function openChoiceModal({
  title,
  text: bodyText = "",
  choices = [],
  confirmLabel = "Выбрать",
  cancelLabel = "Отмена"
}) {
  const bodyHtml = choices.map((choice, index) => `
    <label class="zenith-choice-item">
      <input type="radio" name="zenithModalChoice" value="${escapeHtml(choice.value)}" ${index === 0 ? "checked" : ""} />
      <span>${escapeHtml(choice.label)}</span>
    </label>
  `).join("");

  const result = await openModal({
    title,
    text: bodyText,
    bodyHtml,
    confirmLabel,
    cancelLabel,
    showCancel: true,
    allowClose: true,
    serializer: root => root.querySelector("input[name='zenithModalChoice']:checked")?.value || null
  });

  return result.confirmed ? result.value : null;
}

async function openCharacterEditModal(character) {
  const current = normalizeCharacter(character);

  const result = await openModal({
    title: "Редактирование персонажа",
    text: "Измени имя и племя персонажа.",
    bodyHtml: `
      <div class="zenith-input-stack">
        <label class="zenith-input-label">
          <span>Имя</span>
          <input id="zenithModalCharName" type="text" value="${escapeHtml(current.name || "")}" />
        </label>
        <label class="zenith-input-label">
          <span>Племя</span>
          <input id="zenithModalCharClan" type="text" value="${escapeHtml(current.clan || "")}" />
        </label>
      </div>
    `,
    confirmLabel: "Сохранить",
    cancelLabel: "Отмена",
    showCancel: true,
    allowClose: true,
    serializer: () => ({
      name: byId("zenithModalCharName")?.value.trim() || "",
      clan: byId("zenithModalCharClan")?.value.trim() || ""
    })
  });

  return result.confirmed ? result.value : null;
}

/* ==========================================================================
   ТЕКСТ ПРАВИЛ ДЛЯ КОМНАТЫ
   ========================================================================== */

function getRoomRulesHtml() {
  return `
    <div class="room-rules-sheet">
      <div class="room-rules-section">
        <div class="room-rules-title">Зачёт получат оба, если:</div>
        <ul>
          <li>в тренировке участвуют два воителя;</li>
          <li>в тренировке участвуют два оруженосца;</li>
          <li>тренировка завершена корректно;</li>
          <li>у персонажей нет ограничений на зачёт.</li>
        </ul>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Зачёт получит только оруженосец, если:</div>
        <ul>
          <li>в тренировке участвуют воитель и оруженосец;</li>
          <li>тренировка завершена корректно;</li>
          <li>у оруженосца нет ограничений на зачёт.</li>
        </ul>
        <div class="room-rules-note">Воитель в такой тренировке зачёт не получает.</div>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Зачёта не будет, если:</div>
        <ul>
          <li>персонаж уже получил зачёт сегодня;</li>
          <li>эта же пара персонажей уже недавно получала зачёт;</li>
          <li>тренировка не была завершена.</li>
        </ul>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Откат пары</div>
        <div class="room-rules-note">
          После завершённой тренировки эта же пара персонажей уходит на откат на 3 дня.
          До конца отката они могут снова тренироваться друг с другом, но без зачёта.
        </div>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Пороги улучшений для воителей</div>
        <ul>
          <li>3 засчитанные победы дают 1 улучшение;</li>
          <li>5 засчитанных поражений дают 1 улучшение.</li>
        </ul>
        <div class="room-rules-note">Лишний прогресс не сгорает и сохраняется дальше.</div>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Пороги улучшений для оруженосцев</div>
        <ul>
          <li>5 засчитанных побед дают 1 улучшение;</li>
          <li>7 засчитанных поражений дают 1 улучшение.</li>
        </ul>
        <div class="room-rules-note">Лишний прогресс не сгорает и сохраняется дальше.</div>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Персонаж может получить такие усиления:</div>
        <ul>
          <li>шанс попадания +10%;</li>
          <li>шанс уворота +10%;</li>
          <li>сила удара когтями +5%;</li>
          <li>сила укуса +5%.</li>
        </ul>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Лимиты улучшений</div>
        <ul>
          <li>шанс попадания можно улучшить до 5 раз;</li>
          <li>шанс уворота можно улучшить до 5 раз;</li>
          <li>силу удара когтями можно улучшить до 5 раз;</li>
          <li>силу укуса можно улучшить до 5 раз.</li>
        </ul>
      </div>

      <div class="room-rules-section">
        <div class="room-rules-title">Посвящение оруженосца</div>
        <div class="room-rules-note">
          После посвящения в воители можно перенести только часть ученических улучшений:
        </div>
        <ul>
          <li>если у оруженосца 1–2 улучшения, переносится 1;</li>
          <li>если у оруженосца 3–4 улучшения, переносится 2;</li>
          <li>если у оруженосца 5 и больше улучшений, переносится 3.</li>
        </ul>
        <div class="room-rules-note">Какие именно улучшения сохранить, выбирает владелец персонажа.</div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   МОДЕЛИ ДАННЫХ
   ========================================================================== */

function createDefaultEffects() {
  return {
    stunTurns: 0,
    accuracyPenaltyTurns: 0,
    dotDamage: 0,
    pendingDotDamage: 0,
    dodgesLeft: MAX_DODGES
  };
}

function createEmptySelections() {
  return { host: null, guest: null };
}

function createEmptyReadyState() {
  return {
    host: false,
    guest: false,
    hostAt: 0,
    guestAt: 0
  };
}

function createDefaultCombatBase() {
  return {
    accuracy: 0,
    dodge: 0,
    clawPower: 0,
    bitePower: 0
  };
}

function createDefaultFavoriteCounters() {
  return {
    sand: 0,
    paw: 0,
    trip: 0
  };
}

function createDefaultTargetCounters() {
  return {
    face: 0,
    frontLeft: 0,
    frontRight: 0,
    side: 0,
    ears: 0,
    neck: 0
  };
}

function createDefaultAccuracyStats() {
  return {
    totalAttacks: 0,
    hits: 0,
    misses: 0
  };
}

function createDefaultTrainingProgress() {
  return {
    winsTowardUpgrade: 0,
    lossesTowardUpgrade: 0,
    pendingUpgradePoints: 0,
    lastCreditedAt: 0,
    lastCreditedDateKey: "",
    lastCreditedOpponentName: "",
    lastCreditedReason: "",
    creditedTrainings: 0,
    creditedWins: 0,
    creditedLosses: 0,
    creditedDraws: 0,
    unfinishedTrainings: 0,
    deniedTrainings: 0
  };
}

function createDefaultTrainingProfile() {
  return {
    progress: createDefaultTrainingProgress(),
    warriorUpgrades: [],
    apprenticeUpgrades: [],
    upgradeHistory: [],
    analytics: {
      favoriteMoveCounters: createDefaultFavoriteCounters(),
      accuracy: createDefaultAccuracyStats(),
      targets: createDefaultTargetCounters()
    },
    promotion: {
      canTransferNow: false,
      transferredAt: 0,
      transferredCount: 0,
      lastTransferSummary: ""
    }
  };
}

function createDefaultCharacter(name = "", clan = "", trainingStatus = "warrior") {
  return {
    name,
    clan,
    trainingStatus,
    ownerNote: "",
    combatBase: createDefaultCombatBase(),
    profileStats: {
      wins: 0,
      losses: 0,
      draws: 0,
      lastBattleAt: 0,
      lastOpponentName: ""
    },
    training: createDefaultTrainingProfile(),
    createdAt: now(),
    updatedAt: now()
  };
}

function createDefaultProfile(displayName = "Зенит") {
  return {
    displayName,
    status: "✦ Наблюдает за бабочками",
    portraitSymbol: "✦",
    activeCharacterId: "",
    blocked: false,
    themeId: readThemeLocal(),
    createdAt: now(),
    updatedAt: now()
  };
}

/* ==========================================================================
   НОРМАЛИЗАЦИЯ
   ========================================================================== */

function normalizeEffects(raw) {
  return {
    stunTurns: raw?.stunTurns ?? 0,
    accuracyPenaltyTurns: raw?.accuracyPenaltyTurns ?? 0,
    dotDamage: raw?.dotDamage ?? 0,
    pendingDotDamage: raw?.pendingDotDamage ?? 0,
    dodgesLeft: raw?.dodgesLeft ?? MAX_DODGES
  };
}

function normalizeSelection(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    type: raw.type || null,
    targetKey: raw.targetKey || null,
    attackRoll: raw.attackRoll ?? null,
    dodgeRoll: raw.dodgeRoll ?? null
  };
}

function normalizeReadyState(raw) {
  return {
    host: Boolean(raw?.host),
    guest: Boolean(raw?.guest),
    hostAt: raw?.hostAt ?? 0,
    guestAt: raw?.guestAt ?? 0
  };
}

function normalizeCombatBase(raw) {
  const base = createDefaultCombatBase();
  return {
    accuracy: raw?.accuracy ?? base.accuracy,
    dodge: raw?.dodge ?? base.dodge,
    clawPower: raw?.clawPower ?? base.clawPower,
    bitePower: raw?.bitePower ?? base.bitePower
  };
}

function normalizeTrainingProgress(raw) {
  const base = createDefaultTrainingProgress();
  return {
    winsTowardUpgrade: raw?.winsTowardUpgrade ?? base.winsTowardUpgrade,
    lossesTowardUpgrade: raw?.lossesTowardUpgrade ?? base.lossesTowardUpgrade,
    pendingUpgradePoints: raw?.pendingUpgradePoints ?? base.pendingUpgradePoints,
    lastCreditedAt: raw?.lastCreditedAt ?? base.lastCreditedAt,
    lastCreditedDateKey: raw?.lastCreditedDateKey ?? base.lastCreditedDateKey,
    lastCreditedOpponentName: raw?.lastCreditedOpponentName ?? base.lastCreditedOpponentName,
    lastCreditedReason: raw?.lastCreditedReason ?? base.lastCreditedReason,
    creditedTrainings: raw?.creditedTrainings ?? base.creditedTrainings,
    creditedWins: raw?.creditedWins ?? base.creditedWins,
    creditedLosses: raw?.creditedLosses ?? base.creditedLosses,
    creditedDraws: raw?.creditedDraws ?? base.creditedDraws,
    unfinishedTrainings: raw?.unfinishedTrainings ?? base.unfinishedTrainings,
    deniedTrainings: raw?.deniedTrainings ?? base.deniedTrainings
  };
}

function normalizeTrainingProfile(raw) {
  const base = createDefaultTrainingProfile();
  return {
    progress: normalizeTrainingProgress(raw?.progress),
    warriorUpgrades: safeArray(raw?.warriorUpgrades),
    apprenticeUpgrades: safeArray(raw?.apprenticeUpgrades),
    upgradeHistory: safeArray(raw?.upgradeHistory),
    analytics: {
      favoriteMoveCounters: {
        ...createDefaultFavoriteCounters(),
        ...(raw?.analytics?.favoriteMoveCounters || {})
      },
      accuracy: {
        ...createDefaultAccuracyStats(),
        ...(raw?.analytics?.accuracy || {})
      },
      targets: {
        ...createDefaultTargetCounters(),
        ...(raw?.analytics?.targets || {})
      }
    },
    promotion: {
      canTransferNow: Boolean(raw?.promotion?.canTransferNow),
      transferredAt: raw?.promotion?.transferredAt ?? base.promotion.transferredAt,
      transferredCount: raw?.promotion?.transferredCount ?? base.promotion.transferredCount,
      lastTransferSummary: raw?.promotion?.lastTransferSummary ?? base.promotion.lastTransferSummary
    }
  };
}

function normalizeCharacter(raw) {
  const character = raw || {};
  return {
    name: character.name || "Без имени",
    clan: character.clan || "",
    trainingStatus: character.trainingStatus || "warrior",
    ownerNote: character.ownerNote || "",
    combatBase: normalizeCombatBase(character.combatBase),
    profileStats: {
      wins: character.profileStats?.wins ?? 0,
      losses: character.profileStats?.losses ?? 0,
      draws: character.profileStats?.draws ?? 0,
      lastBattleAt: character.profileStats?.lastBattleAt ?? 0,
      lastOpponentName: character.profileStats?.lastOpponentName ?? ""
    },
    training: normalizeTrainingProfile(character.training),
    createdAt: character.createdAt ?? now(),
    updatedAt: character.updatedAt ?? now()
  };
}

/* ==========================================================================
   ЛОГИКА УЛУЧШЕНИЙ
   ========================================================================== */

function getThresholdsForStatus(status) {
  return status === "apprentice"
    ? TRAINING_THRESHOLDS.apprentice
    : TRAINING_THRESHOLDS.warrior;
}

function getPromotionTransferLimit(upgradeCount) {
  if (upgradeCount <= 0) return 0;
  if (upgradeCount <= 2) return 1;
  if (upgradeCount <= 4) return 2;
  return 3;
}

function getBranchKeyForCharacter(character) {
  const normalized = normalizeCharacter(character);
  return normalized.trainingStatus === "apprentice" ? "apprenticeUpgrades" : "warriorUpgrades";
}

function getCurrentUpgradePool(character) {
  const normalized = normalizeCharacter(character);
  const key = getBranchKeyForCharacter(normalized);
  return safeArray(normalized.training[key]);
}

function getUpgradeCountByType(upgrades, type) {
  return safeArray(upgrades).filter(item => item.type === type).length;
}

function getUpgradeDistributionFromPool(upgrades) {
  return {
    accuracy: getUpgradeCountByType(upgrades, "accuracy") * UPGRADE_DEFINITIONS.accuracy.increment,
    dodge: getUpgradeCountByType(upgrades, "dodge") * UPGRADE_DEFINITIONS.dodge.increment,
    clawPower: getUpgradeCountByType(upgrades, "clawPower") * UPGRADE_DEFINITIONS.clawPower.increment,
    bitePower: getUpgradeCountByType(upgrades, "bitePower") * UPGRADE_DEFINITIONS.bitePower.increment
  };
}

function getCombatViewTotals(character) {
  const normalized = normalizeCharacter(character);
  const pool = getCurrentUpgradePool(normalized);
  const bonus = getUpgradeDistributionFromPool(pool);

  return {
    accuracy: normalized.combatBase.accuracy + bonus.accuracy,
    dodge: normalized.combatBase.dodge + bonus.dodge,
    clawPower: normalized.combatBase.clawPower + bonus.clawPower,
    bitePower: normalized.combatBase.bitePower + bonus.bitePower,
    bonus
  };
}

function getRemainingUpgradeSlotsByType(character, type) {
  const definition = UPGRADE_DEFINITIONS[type];
  if (!definition) return 0;

  const pool = getCurrentUpgradePool(character);
  const count = getUpgradeCountByType(pool, type);
  return Math.max(0, definition.maxCount - count);
}

function getRemainingUpgradeSlotsTotal(character) {
  return Object.keys(UPGRADE_DEFINITIONS)
    .reduce((sum, type) => sum + getRemainingUpgradeSlotsByType(character, type), 0);
}

function canEarnAnyMoreUpgrades(character) {
  return getRemainingUpgradeSlotsTotal(character) > 0;
}

function canAddUpgradeOfType(character, type) {
  const definition = UPGRADE_DEFINITIONS[type];
  if (!definition) return false;

  const normalized = normalizeCharacter(character);
  const pool = getCurrentUpgradePool(normalized);
  const currentCount = getUpgradeCountByType(pool, type);
  if (currentCount >= definition.maxCount) return false;

  const totals = getCombatViewTotals(normalized);
  const nextValue = totals[type] + definition.increment;
  return nextValue <= definition.cap;
}

function createUpgradeRecord(type, sourceStatus, matchId = "") {
  const definition = UPGRADE_DEFINITIONS[type];
  return {
    id: `${type}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    label: definition.label,
    value: definition.increment,
    sourceStatus,
    matchId,
    createdAt: now()
  };
}

function getPendingChoiceCount(character) {
  return normalizeCharacter(character).training.progress.pendingUpgradePoints || 0;
}

function addPendingUpgradePoints(character, count = 1) {
  const normalized = normalizeCharacter(character);
  const next = deepClone(normalized);
  const allowed = Math.min(count, getRemainingUpgradeSlotsTotal(next));

  next.training.progress.pendingUpgradePoints += allowed;
  next.updatedAt = now();
  return next;
}

function consumePendingUpgradePoint(character) {
  const normalized = normalizeCharacter(character);
  const next = deepClone(normalized);
  next.training.progress.pendingUpgradePoints = Math.max(0, next.training.progress.pendingUpgradePoints - 1);
  next.updatedAt = now();
  return next;
}

function addUpgradeToCurrentPool(character, type, matchId = "") {
  const normalized = normalizeCharacter(character);
  const next = consumePendingUpgradePoint(normalized);
  const key = getBranchKeyForCharacter(next);
  const record = createUpgradeRecord(type, next.trainingStatus, matchId);

  next.training[key].push(record);
  next.training.upgradeHistory.unshift({
    id: `upgrade_history_${Math.random().toString(36).slice(2, 9)}`,
    action: "earned_upgrade",
    label: record.label,
    type,
    createdAt: now(),
    matchId
  });

  next.updatedAt = now();
  return next;
}

function getFavoriteMoveLabel(character) {
  const counters = normalizeCharacter(character).training.analytics.favoriteMoveCounters;
  const sorted = Object.entries(counters).sort((a, b) => b[1] - a[1]);
  const [topKey, topValue] = sorted[0] || [];
  if (!topKey || topValue <= 0) return "—";
  if (topKey === "sand") return "Песок в глаза";
  if (topKey === "paw") return "Удар лапой";
  if (topKey === "trip") return "Подсечка";
  return "—";
}

function getAccuracyPercent(character) {
  const stats = normalizeCharacter(character).training.analytics.accuracy;
  if (!stats.totalAttacks) return 0;
  return Math.round((stats.hits / stats.totalAttacks) * 100);
}

/* ==========================================================================
   ПРОФИЛЬ И ПЕРСОНАЖИ
   ========================================================================== */

async function pushFeedEntry(payload) {
  const feedRef = push(ref(db, getFeedPath()));
  await set(feedRef, payload);
}

async function loadUserProfile(uid) {
  const snapshot = await get(ref(db, getProfilePath(uid)));
  return snapshot.exists() ? snapshot.val() : null;
}

async function ensureOwnProfile(user, fallbackName = "") {
  const profileRef = ref(db, getProfilePath(user.uid));
  const snapshot = await get(profileRef);

  if (snapshot.exists()) {
    return snapshot.val();
  }

  const baseName = fallbackName || user.email?.split("@")[0] || "Зенит";
  const profile = createDefaultProfile(baseName);
  await set(profileRef, profile);
  return profile;
}

async function loadOwnCharacters() {
  if (!state.user) return {};

  const snapshot = await get(ref(db, getCharactersPath(state.user.uid)));
  const value = snapshot.exists() ? snapshot.val() : {};

  state.characters = Object.fromEntries(
    Object.entries(value).map(([id, character]) => [id, normalizeCharacter(character)])
  );

  return state.characters;
}

function getSortedCharacters(source = state.characters) {
  return Object.entries(source || {})
    .map(([id, value]) => ({ id, ...normalizeCharacter(value) }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
}

async function saveProfileStatus() {
  if (!requireAuth()) return;

  const current = state.userProfile || {};
  const displayName = current.displayName || state.user.email?.split("@")[0] || "Зенит";
  const statusValue = ui.profile.statusInput?.value.trim() || "";

  await update(ref(db, getProfilePath(state.user.uid)), {
    displayName,
    status: statusValue || "✦ Наблюдает за бабочками",
    updatedAt: now()
  });

  state.userProfile = await loadUserProfile(state.user.uid);
  notify("Профиль обновлён.");
}

async function savePortraitSymbol() {
  if (!requireAuth()) return;

  const symbol = ui.profile.symbolSelect?.value || "✦";

  await update(ref(db, getProfilePath(state.user.uid)), {
    portraitSymbol: symbol,
    updatedAt: now()
  });

  state.userProfile = await loadUserProfile(state.user.uid);
  notify("Знак профиля обновлён.");
}

async function saveActiveCharacter(characterId) {
  if (!requireAuth()) return;

  await update(ref(db, getProfilePath(state.user.uid)), {
    activeCharacterId: characterId || "",
    updatedAt: now()
  });

  state.userProfile = await loadUserProfile(state.user.uid);
}

async function saveOwnerNote(characterId, noteText) {
  if (!requireAuth() || !characterId) return;

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    ownerNote: noteText || "",
    updatedAt: now()
  });

  await loadOwnCharacters();
  notify("Заметка сохранена.");
}

async function addCharacter() {
  if (!requireAuth()) return;

  const name = ui.profile.charNameInput?.value.trim() || "";
  const clan = ui.profile.charClanInput?.value.trim() || "";
  const trainingStatus = ui.profile.charTrainingStatusSelect?.value || "warrior";

  if (!name) {
    notifyError("Впиши имя персонажа.");
    return;
  }

  const charRef = push(ref(db, getCharactersPath(state.user.uid)));
  const newCharacter = createDefaultCharacter(name, clan, trainingStatus);

  await set(charRef, newCharacter);

  if (!state.userProfile?.activeCharacterId) {
    await update(ref(db, getProfilePath(state.user.uid)), {
      activeCharacterId: charRef.key,
      updatedAt: now()
    });
    state.userProfile = await loadUserProfile(state.user.uid);
  }

  if (ui.profile.charNameInput) ui.profile.charNameInput.value = "";
  if (ui.profile.charClanInput) ui.profile.charClanInput.value = "";
  if (ui.profile.charTrainingStatusSelect) ui.profile.charTrainingStatusSelect.value = "warrior";

  await loadOwnCharacters();
  notify("Новый персонаж добавлен.");
}

async function editCharacter(characterId) {
  if (!requireAuth()) return;

  const character = getCharacterById(characterId);
  if (!character) return;

  const formValue = await openCharacterEditModal(character);
  if (!formValue) return;

  const nextName = formValue.name || character.name || "Без имени";
  const nextClan = formValue.clan || "";

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    name: nextName,
    clan: nextClan,
    updatedAt: now()
  });

  await loadOwnCharacters();
  notify("Персонаж обновлён.");
}

async function deleteCharacter(characterId) {
  if (!requireAuth()) return;

  const character = getCharacterById(characterId);
  if (!character) return;

  const ok = await openConfirmModal({
    title: "Удаление персонажа",
    text: `Удалить персонажа «${character.name}»?`,
    confirmLabel: "Удалить",
    cancelLabel: "Отмена"
  });

  if (!ok) return;

  await remove(ref(db, getCharacterPath(state.user.uid, characterId)));

  if (state.userProfile?.activeCharacterId === characterId) {
    await update(ref(db, getProfilePath(state.user.uid)), {
      activeCharacterId: "",
      updatedAt: now()
    });
    state.userProfile = await loadUserProfile(state.user.uid);
  }

  await loadOwnCharacters();
  notify("Персонаж удалён.");
}

async function chooseUpgradeForCharacter(characterId, matchId = "") {
  if (!requireAuth()) return false;

  const character = getCharacterById(characterId);
  if (!character) return false;

  const normalized = normalizeCharacter(character);
  const pending = getPendingChoiceCount(normalized);

  if (pending <= 0) {
    notifyError("У персонажа нет доступных улучшений.");
    return false;
  }

  const branchChoices = [
    { value: "accuracy", label: "Повысить шанс попадания" },
    { value: "dodge", label: "Повысить шанс уворота" },
    { value: "power", label: "Повысить силу удара" }
  ];

  const choice = await openChoiceModal({
    title: "Выбор улучшения",
    text: `${normalized.name} может получить улучшение. Доступно к выбору: ${pending}.`,
    choices: branchChoices,
    confirmLabel: "Выбрать"
  });

  if (!choice) return false;

  let finalType = choice;

  if (choice === "power") {
    const powerChoice = await openChoiceModal({
      title: "Сила удара",
      text: "Какой именно удар нужно усилить?",
      choices: [
        { value: "clawPower", label: "Удар когтями" },
        { value: "bitePower", label: "Укус" }
      ],
      confirmLabel: "Подтвердить"
    });

    if (!powerChoice) return false;
    finalType = powerChoice;
  }

  if (!canAddUpgradeOfType(normalized, finalType)) {
    notifyError("Это направление уже улучшено до максимума.");
    return false;
  }

  const updatedCharacter = addUpgradeToCurrentPool(normalized, finalType, matchId);

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    training: updatedCharacter.training,
    updatedAt: now()
  });

  await loadOwnCharacters();

  await pushFeedEntry({
    type: FEED_TYPES.UPGRADE_GAINED,
    createdAt: now(),
    text: `Персонаж ${updatedCharacter.name} получает улучшение «${UPGRADE_DEFINITIONS[finalType].label}».`,
    characterName: updatedCharacter.name,
    upgradeLabel: UPGRADE_DEFINITIONS[finalType].label
  });

  notify(`Улучшение «${UPGRADE_DEFINITIONS[finalType].label}» получено.`);
  return true;
}

async function promoteApprenticeToWarrior(characterId) {
  if (!requireAuth()) return false;

  const character = getCharacterById(characterId);
  if (!character) return false;

  const normalized = normalizeCharacter(character);
  if (normalized.trainingStatus !== "apprentice") {
    notifyError("Этот персонаж уже воитель.");
    return false;
  }

  const apprenticeUpgrades = safeArray(normalized.training.apprenticeUpgrades);
  const transferLimit = getPromotionTransferLimit(apprenticeUpgrades.length);

  const ok = await openConfirmModal({
    title: "Посвящение в воители",
    text: transferLimit > 0
      ? `${normalized.name} может перенести ${transferLimit} улучшение(й). Остальные ученические улучшения исчезнут.`
      : `${normalized.name} будет посвящён в воители без переноса улучшений.`,
    confirmLabel: "Продолжить",
    cancelLabel: "Отмена"
  });

  if (!ok) return false;

  const selectedIds = [];

  if (transferLimit > 0) {
    const available = apprenticeUpgrades.map(item => ({
      value: item.id,
      label: item.label
    }));

    for (let i = 0; i < transferLimit; i += 1) {
      const remaining = available.filter(item => !selectedIds.includes(item.value));
      if (!remaining.length) break;

      const selected = await openChoiceModal({
        title: `Перенос улучшения ${i + 1} из ${transferLimit}`,
        text: "Выберите улучшение, которое нужно сохранить.",
        choices: remaining,
        confirmLabel: "Сохранить",
        cancelLabel: "Пропустить"
      });

      if (!selected) break;
      if (!selectedIds.includes(selected)) selectedIds.push(selected);
    }
  }

  const transferred = apprenticeUpgrades.filter(item => selectedIds.includes(item.id));
  const updatedCharacter = deepClone(normalized);

  updatedCharacter.trainingStatus = "warrior";
  updatedCharacter.training.warriorUpgrades = [
    ...updatedCharacter.training.warriorUpgrades,
    ...transferred.map(item => ({ ...item, sourceStatus: "apprentice" }))
  ];
  updatedCharacter.training.apprenticeUpgrades = [];
  updatedCharacter.training.promotion.canTransferNow = false;
  updatedCharacter.training.promotion.transferredAt = now();
  updatedCharacter.training.promotion.transferredCount = transferred.length;
  updatedCharacter.training.promotion.lastTransferSummary = transferred.length
    ? transferred.map(item => item.label).join(", ")
    : "без переноса";
  updatedCharacter.training.upgradeHistory.unshift({
    id: `promotion_${Math.random().toString(36).slice(2, 9)}`,
    action: "promotion_transfer",
    label: updatedCharacter.training.promotion.lastTransferSummary,
    createdAt: now()
  });
  updatedCharacter.updatedAt = now();

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    trainingStatus: "warrior",
    training: updatedCharacter.training,
    updatedAt: now()
  });

  await loadOwnCharacters();

  await pushFeedEntry({
    type: FEED_TYPES.PROMOTION_TRANSFER,
    createdAt: now(),
    text: `Персонаж ${updatedCharacter.name} посвящается в воители и переносит прогресс: ${updatedCharacter.training.promotion.lastTransferSummary}.`,
    characterName: updatedCharacter.name,
    transferSummary: updatedCharacter.training.promotion.lastTransferSummary
  });

  notify(`${updatedCharacter.name} посвящён в воители.`);
  return true;
}

/* ==========================================================================
   AUTH И БАЗОВОЕ СОСТОЯНИЕ
   ========================================================================== */

async function bootstrapAdmin(user) {
  if (!user?.email) return false;
  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return false;

  const adminRef = ref(db, `system/admins/${user.uid}`);
  const snapshot = await get(adminRef);

  if (!snapshot.exists()) {
    await set(adminRef, {
      uid: user.uid,
      email: user.email,
      createdAt: now()
    });
  }

  return true;
}

async function checkAdmin(user) {
  if (!user) return false;

  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  const snapshot = await get(ref(db, `system/admins/${user.uid}`));
  return snapshot.exists();
}

async function handleRegister() {
  const accountName = ui.auth.accountName?.value.trim() || "";
  const email = ui.auth.email?.value.trim() || "";
  const password = ui.auth.password?.value.trim() || "";

  if (!accountName || !email || !password) {
    notifyError("Заполни имя профиля, почту и пароль.");
    return;
  }

  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(db, getProfilePath(credentials.user.uid)), createDefaultProfile(accountName));
  text(ui.auth.status, `Вы вошли как ${accountName}.`);
}

async function handleLogin() {
  const email = ui.auth.email?.value.trim() || "";
  const password = ui.auth.password?.value.trim() || "";

  if (!email || !password) {
    notifyError("Впиши почту и пароль.");
    return;
  }

  const credentials = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureOwnProfile(credentials.user);
  text(ui.auth.status, `Вы вошли как ${profile.displayName || "Зенит"}.`);
}

async function handleLogout() {
  await signOut(auth);
  state.currentRoomCode = "";
  state.currentPlayerRole = null;
  state.currentBattleTurnNumber = null;
  clearActiveRoomLocal();
  text(ui.auth.status, "Вы не вошли в аккаунт.");
  notify("Вы вышли из аккаунта.");
}

async function handleSignedInUser(user) {
  state.user = user;
  await bootstrapAdmin(user);
  state.isAdmin = await checkAdmin(user);

  state.userProfile = await loadUserProfile(user.uid);
  if (!state.userProfile) {
    state.userProfile = await ensureOwnProfile(user, "Зенит");
  }

  state.isBlocked = Boolean(state.userProfile?.blocked);
  applyTheme(state.userProfile?.themeId || readThemeLocal());
  await loadOwnCharacters();

  text(ui.auth.status, `Вы вошли как ${state.userProfile?.displayName || "Зенит"}.`);
}

function handleSignedOutUser() {
  state.user = null;
  state.userProfile = null;
  state.characters = {};
  state.currentRoomCode = "";
  state.currentPlayerRole = null;
  state.currentBattleTurnNumber = null;
  state.isAdmin = false;
  state.isBlocked = false;

  state.adminUsersCache = {};
  state.adminRoomsCache = {};
  state.adminMatchesCache = {};
  state.publicCharactersCache = [];
  state.feedCache = [];
  state.adminSelectedUserId = "";
  state.shownRulesByRoom = {};

  text(ui.auth.status, "Вы не вошли в аккаунт.");
}

function createDefaultBattleAnalytics() {
  return {
    host: {
      favoriteMoveCounters: createDefaultFavoriteCounters(),
      accuracy: createDefaultAccuracyStats(),
      targets: createDefaultTargetCounters()
    },
    guest: {
      favoriteMoveCounters: createDefaultFavoriteCounters(),
      accuracy: createDefaultAccuracyStats(),
      targets: createDefaultTargetCounters()
    }
  };
}

function normalizeBattleAnalytics(raw) {
  const base = createDefaultBattleAnalytics();
  return {
    host: {
      favoriteMoveCounters: {
        ...base.host.favoriteMoveCounters,
        ...(raw?.host?.favoriteMoveCounters || {})
      },
      accuracy: {
        ...base.host.accuracy,
        ...(raw?.host?.accuracy || {})
      },
      targets: {
        ...base.host.targets,
        ...(raw?.host?.targets || {})
      }
    },
    guest: {
      favoriteMoveCounters: {
        ...base.guest.favoriteMoveCounters,
        ...(raw?.guest?.favoriteMoveCounters || {})
      },
      accuracy: {
        ...base.guest.accuracy,
        ...(raw?.guest?.accuracy || {})
      },
      targets: {
        ...base.guest.targets,
        ...(raw?.guest?.targets || {})
      }
    }
  };
}

function normalizeBattle(raw) {
  return {
    hostHp: raw?.hostHp ?? 100,
    guestHp: raw?.guestHp ?? 100,
    turnNumber: raw?.turnNumber ?? 1,
    winner: raw?.winner ?? null,
    finishReason: raw?.finishReason ?? "",
    matchSaved: raw?.matchSaved ?? false,
    completedAt: raw?.completedAt ?? 0,
    startedAt: raw?.startedAt ?? 0,
    lastActionAt: raw?.lastActionAt ?? 0,
    inactivityDeadlineAt: raw?.inactivityDeadlineAt ?? 0,
    lastMessage: raw?.lastMessage ?? "Тренировка началась.",
    log: safeArray(raw?.log),
    analytics: normalizeBattleAnalytics(raw?.analytics),
    playerNames: {
      host: raw?.playerNames?.host || "Игрок 1",
      guest: raw?.playerNames?.guest || "Игрок 2"
    },
    playerCharacterIds: {
      host: raw?.playerCharacterIds?.host || "",
      guest: raw?.playerCharacterIds?.guest || ""
    },
    effects: {
      host: normalizeEffects(raw?.effects?.host),
      guest: normalizeEffects(raw?.effects?.guest)
    },
    selections: {
      host: normalizeSelection(raw?.selections?.host),
      guest: normalizeSelection(raw?.selections?.guest)
    }
  };
}

/* ==========================================================================
   КОМНАТЫ И ПРЕВЬЮ ЗАЧЁТА
   ========================================================================== */

function getTrainingCreditMatrix(hostStatus, guestStatus) {
  const hostIsApprentice = hostStatus === "apprentice";
  const guestIsApprentice = guestStatus === "apprentice";

  if (!hostIsApprentice && !guestIsApprentice) {
    return {
      hostGetsCredit: true,
      guestGetsCredit: true,
      badge: "Зачёт получат оба",
      reason: "Оба персонажа — воители."
    };
  }

  if (hostIsApprentice && guestIsApprentice) {
    return {
      hostGetsCredit: true,
      guestGetsCredit: true,
      badge: "Зачёт получат оба",
      reason: "Оба персонажа — оруженосцы."
    };
  }

  if (hostIsApprentice && !guestIsApprentice) {
    return {
      hostGetsCredit: true,
      guestGetsCredit: false,
      badge: "Зачёт получит только оруженосец",
      reason: "В паре воитель + оруженосец зачёт идёт только оруженосцу."
    };
  }

  return {
    hostGetsCredit: false,
    guestGetsCredit: true,
    badge: "Зачёт получит только оруженосец",
    reason: "В паре воитель + оруженосец зачёт идёт только оруженосцу."
  };
}

async function evaluateTrainingCreditForRoom(room) {
  const host = room?.players?.host;
  const guest = room?.players?.guest;

  if (!host || !guest) {
    return {
      hostGetsCredit: false,
      guestGetsCredit: false,
      badge: "Зачёта не будет",
      reason: "В комнате ещё нет двух персонажей."
    };
  }

  const base = getTrainingCreditMatrix(host.trainingStatus, guest.trainingStatus);
  const todayKey = getMoscowDateKey();
  const pairKey = getPairKey(host.uid, host.characterId, guest.uid, guest.characterId);

  let hostBlockedByDay = false;
  let guestBlockedByDay = false;
  let hostReason = "";
  let guestReason = "";

  if (base.hostGetsCredit) {
    const hostSnap = await get(ref(db, getCharacterPath(host.uid, host.characterId)));
    if (hostSnap.exists()) {
      const hostCharacter = normalizeCharacter(hostSnap.val());
      if (hostCharacter.training.progress.lastCreditedDateKey === todayKey) {
        hostBlockedByDay = true;
        hostReason = `${host.characterName} уже получил зачёт сегодня.`;
      }
    }
  }

  if (base.guestGetsCredit) {
    const guestSnap = await get(ref(db, getCharacterPath(guest.uid, guest.characterId)));
    if (guestSnap.exists()) {
      const guestCharacter = normalizeCharacter(guestSnap.val());
      if (guestCharacter.training.progress.lastCreditedDateKey === todayKey) {
        guestBlockedByDay = true;
        guestReason = `${guest.characterName} уже получил зачёт сегодня.`;
      }
    }
  }

  let pairBlocked = false;
  let pairReason = "";
  const pairSnap = await get(ref(db, getPairCooldownPath(pairKey)));

  if (pairSnap.exists()) {
    const cooldown = pairSnap.val();
    if (compareDateKeys(todayKey, cooldown.availableFromDateKey || "") < 0) {
      pairBlocked = true;
      pairReason = `Эта пара ещё на откате до ${cooldown.availableFromDateKey}.`;
    }
  }

  const hostGetsCredit = base.hostGetsCredit && !hostBlockedByDay && !pairBlocked;
  const guestGetsCredit = base.guestGetsCredit && !guestBlockedByDay && !pairBlocked;

  let badge = "Зачёта не будет";
  if (hostGetsCredit && guestGetsCredit) badge = "Зачёт получат оба";
  else if (hostGetsCredit || guestGetsCredit) badge = "Зачёт получит только оруженосец";

  const reasons = [base.reason];
  if (hostReason) reasons.push(hostReason);
  if (guestReason) reasons.push(guestReason);
  if (pairReason) reasons.push(pairReason);

  return {
    hostGetsCredit,
    guestGetsCredit,
    badge,
    reason: reasons.filter(Boolean).join(" ")
  };
}

function createBattlePayload(room) {
  return {
    hostHp: 100,
    guestHp: 100,
    turnNumber: 1,
    winner: null,
    finishReason: "",
    matchSaved: false,
    completedAt: 0,
    startedAt: now(),
    lastActionAt: now(),
    inactivityDeadlineAt: now() + INACTIVITY_TIMEOUT_MS,
    lastMessage: "Тренировка началась. Выберите действия на ход 1.",
    log: ["Тренировка началась."],
    analytics: createDefaultBattleAnalytics(),
    playerNames: {
      host: room.players.host.characterName,
      guest: room.players.guest.characterName
    },
    playerCharacterIds: {
      host: room.players.host.characterId,
      guest: room.players.guest.characterId
    },
    effects: {
      host: createDefaultEffects(),
      guest: createDefaultEffects()
    },
    selections: createEmptySelections()
  };
}

function getSelectedCharacterPayload() {
  const characterId = getSelectedCharacterId();
  const character = getCharacterById(characterId);

  if (!characterId || !character) return null;
  return {
    characterId,
    character: normalizeCharacter(character)
  };
}

async function createRoom() {
  if (!requireAuth()) return;

  const selected = getSelectedCharacterPayload();
  if (!selected) {
    notifyError("Сначала выбери персонажа в профиле.");
    return;
  }

  let roomCode = generateRoomCode();
  let tries = 0;

  while (tries < 10) {
    const snapshot = await get(ref(db, getRoomPath(roomCode)));
    if (!snapshot.exists()) break;
    roomCode = generateRoomCode();
    tries += 1;
  }

  const profileName = state.userProfile?.displayName || "Зенит";

  await set(ref(db, getRoomPath(roomCode)), {
    code: roomCode,
    status: "waiting",
    createdAt: now(),
    createdBy: state.user.uid,
    hostUid: state.user.uid,
    guestUid: "",
    readyState: createEmptyReadyState(),
    creditPreview: {
      hostGetsCredit: false,
      guestGetsCredit: false,
      badge: "Зачёта не будет",
      reason: "Ожидание второго игрока."
    },
    players: {
      host: {
        uid: state.user.uid,
        profileName,
        characterId: selected.characterId,
        characterName: selected.character.name,
        clan: selected.character.clan || "",
        trainingStatus: selected.character.trainingStatus || "warrior"
      },
      guest: null
    },
    battle: null,
    finishInfo: null,
    matchId: ""
  });

  state.currentRoomCode = roomCode;
  state.currentPlayerRole = "host";
  saveActiveRoomLocal(roomCode, "host");
  notify(`Комната ${roomCode} создана.`);
}

async function joinRoom() {
  if (!requireAuth()) return;

  const roomCode = (ui.room.roomCodeInput?.value || "").trim().toUpperCase();
  const selected = getSelectedCharacterPayload();

  if (!roomCode) {
    notifyError("Впиши код комнаты.");
    return;
  }

  if (!selected) {
    notifyError("Сначала выбери персонажа в профиле.");
    return;
  }

  const roomRef = ref(db, getRoomPath(roomCode));
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    notifyError("Комната не найдена.");
    return;
  }

  const room = snapshot.val();

  if (room.hostUid === state.user.uid) {
    state.currentRoomCode = roomCode;
    state.currentPlayerRole = "host";
    saveActiveRoomLocal(roomCode, "host");
    notify(`Вы вернулись в комнату ${roomCode}.`);
    return;
  }

  if (room.guestUid === state.user.uid) {
    state.currentRoomCode = roomCode;
    state.currentPlayerRole = "guest";
    saveActiveRoomLocal(roomCode, "guest");
    notify(`Вы вернулись в комнату ${roomCode}.`);
    return;
  }

  if (room.players?.guest) {
    notifyError("В комнате уже есть второй игрок.");
    return;
  }

  await update(roomRef, {
    guestUid: state.user.uid,
    status: "ready",
    readyState: createEmptyReadyState(),
    finishInfo: null,
    battle: null,
    "players/guest": {
      uid: state.user.uid,
      profileName: state.userProfile?.displayName || "Зенит",
      characterId: selected.characterId,
      characterName: selected.character.name,
      clan: selected.character.clan || "",
      trainingStatus: selected.character.trainingStatus || "warrior"
    }
  });

  const freshSnapshot = await get(roomRef);
  const freshRoom = freshSnapshot.val();
  const preview = await evaluateTrainingCreditForRoom(freshRoom);

  await update(roomRef, {
    creditPreview: preview
  });

  state.currentRoomCode = roomCode;
  state.currentPlayerRole = "guest";
  saveActiveRoomLocal(roomCode, "guest");
  notify(`Вы вошли в комнату ${roomCode}.`);
}

async function tryAutoJoinSavedRoom() {
  if (!state.user || state.isApplyingAutoJoin) return;

  const saved = readActiveRoomLocal();
  if (!saved?.roomCode) return;

  state.isApplyingAutoJoin = true;

  try {
    const snapshot = await get(ref(db, getRoomPath(saved.roomCode)));

    if (!snapshot.exists()) {
      clearActiveRoomLocal();
      return;
    }

    const room = snapshot.val();

    if (room.hostUid === state.user.uid) {
      state.currentRoomCode = saved.roomCode;
      state.currentPlayerRole = "host";
      return;
    }

    if (room.guestUid === state.user.uid) {
      state.currentRoomCode = saved.roomCode;
      state.currentPlayerRole = "guest";
      return;
    }

    clearActiveRoomLocal();
  } finally {
    state.isApplyingAutoJoin = false;
  }
}

async function leaveRoom() {
  if (!requireAuth()) return;

  if (!state.currentRoomCode) {
    notifyError("Вы сейчас не в комнате.");
    return;
  }

  const roomRef = ref(db, getRoomPath(state.currentRoomCode));
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    state.currentRoomCode = "";
    state.currentPlayerRole = null;
    clearActiveRoomLocal();
    return;
  }

  const room = snapshot.val();

  if (room.status === "battle") {
    notifyError("Во время тренировки нужно использовать действие «Убежать», а не обычный выход.");
    return;
  }

  if (state.currentPlayerRole === "host") {
    await remove(roomRef);
    notify("Комната закрыта создателем.");
  } else if (state.currentPlayerRole === "guest") {
    await update(roomRef, {
      guestUid: "",
      status: "waiting",
      readyState: createEmptyReadyState(),
      creditPreview: {
        hostGetsCredit: false,
        guestGetsCredit: false,
        badge: "Зачёта не будет",
        reason: "Ожидание второго игрока."
      },
      finishInfo: null,
      battle: null,
      "players/guest": null
    });
    notify("Вы покинули комнату.");
  }

  state.currentRoomCode = "";
  state.currentPlayerRole = null;
  clearActiveRoomLocal();
}

async function toggleReady() {
  if (!requireAuth()) return;

  if (!state.currentRoomCode || !state.currentPlayerRole) {
    notifyError("Сначала войди в комнату.");
    return;
  }

  const roomRef = ref(db, getRoomPath(state.currentRoomCode));
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    notifyError("Комната больше не существует.");
    return;
  }

  const room = snapshot.val();
  if (room.status !== "ready") {
    notifyError("Готовность можно менять только до начала тренировки.");
    return;
  }

  const ready = normalizeReadyState(room.readyState);
  const role = state.currentPlayerRole;
  const field = role === "host" ? "host" : "guest";
  const timeField = role === "host" ? "hostAt" : "guestAt";
  const nextValue = !ready[field];

  await update(roomRef, {
    [`readyState/${field}`]: nextValue,
    [`readyState/${timeField}`]: nextValue ? now() : 0
  });

  const freshSnapshot = await get(roomRef);
  const freshRoom = freshSnapshot.val();
  const freshReady = normalizeReadyState(freshRoom.readyState);

  if (freshReady.host && freshReady.guest) {
    await update(roomRef, {
      status: "battle",
      battle: createBattlePayload(freshRoom),
      finishInfo: null
    });
    notify("Оба игрока готовы. Тренировка начинается.");
  } else {
    notify(nextValue ? "Готовность подтверждена." : "Готовность снята.");
  }
}

async function finishBattleAsUnfinished(roomCode, reasonText = "Тренировка завершена из-за бездействия.") {
  const roomRef = ref(db, getRoomPath(roomCode));

  await runTransaction(roomRef, room => {
    if (!room) return room;
    if (room.status !== "battle" && room.status !== "ready") return room;

    if (room.status === "ready") {
      room.status = "finished";
      room.readyState = createEmptyReadyState();
      room.finishInfo = {
        type: RESULT_TYPES.UNFINISHED,
        reason: reasonText,
        completedAt: now()
      };
      room.battle = null;
      return room;
    }

    const battle = normalizeBattle(room.battle);
    battle.winner = null;
    battle.finishReason = "timeout_unfinished";
    battle.lastMessage = reasonText;
    battle.completedAt = now();
    battle.log = appendRoundEntries(battle.log, [reasonText]);

    room.battle = battle;
    room.status = "finished";
    room.finishInfo = {
      type: RESULT_TYPES.UNFINISHED,
      reason: reasonText,
      completedAt: battle.completedAt
    };
    return room;
  });
}

/* ==========================================================================
   БОЕВАЯ МЕХАНИКА
   ========================================================================== */

function createSelection(actionType, targetKey = null) {
  if (actionType === "defend") return { type: "defend", dodgeRoll: randomRoll() };
  if (actionType === "escape") return { type: "escape" };
  if (actionType === "sand") return { type: "sand", attackRoll: randomRoll() };
  if (actionType === "paw") return { type: "paw", targetKey, attackRoll: randomRoll() };
  if (actionType === "trip") return { type: "trip", attackRoll: randomRoll() };
  return null;
}

function getSelectionLabel(selection) {
  if (!selection?.type) return "—";
  if (selection.type === "sand") return "Песок в глаза";
  if (selection.type === "paw") {
    const target = BODY_TARGETS[selection.targetKey];
    return target ? `Удар лапой в ${target.label}` : "Удар лапой";
  }
  if (selection.type === "trip") return "Подсечка";
  if (selection.type === "defend") return "Защита";
  if (selection.type === "escape") return "Побег";
  if (selection.type === "stunned") return "Пропуск хода";
  return "—";
}

function appendRoundEntries(logItems, entries) {
  return [...safeArray(logItems), ...safeArray(entries)].slice(-MAX_LOG_ITEMS);
}

function buildRoundSummary(entries) {
  const clean = safeArray(entries).filter(Boolean);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  const [title, ...rest] = clean;
  return `${title}: ${rest.join(" ")}`;
}

function getHp(battle, role) {
  return role === "host" ? battle.hostHp : battle.guestHp;
}

function setHp(battle, role, value) {
  if (role === "host") battle.hostHp = Math.max(0, value);
  else battle.guestHp = Math.max(0, value);
}

function isAttackType(type) {
  return type === "sand" || type === "paw" || type === "trip";
}

function applyForcedSelectionsForRound(battle) {
  let changed = false;

  if (!battle.selections.host && battle.effects.host.stunTurns > 0) {
    battle.selections.host = { type: "stunned" };
    changed = true;
  }

  if (!battle.selections.guest && battle.effects.guest.stunTurns > 0) {
    battle.selections.guest = { type: "stunned" };
    changed = true;
  }

  return changed;
}

function isRoundReady(battle) {
  return Boolean(battle.selections.host && battle.selections.guest);
}

function applyBleedAtRoundStart(battle, roundEntries) {
  ["host", "guest"].forEach(role => {
    const effect = battle.effects[role];
    if (effect.dotDamage <= 0) return;

    const before = getHp(battle, role);
    const after = Math.max(0, before - effect.dotDamage);
    setHp(battle, role, after);

    roundEntries.push(`${battle.playerNames[role]} теряет ${effect.dotDamage}% очков спарринга из-за накопленного ранения.`);
  });
}

function getHpOutcome(battle) {
  if (battle.hostHp <= 0 && battle.guestHp <= 0) {
    return {
      winner: null,
      message: "Оба бойца падают до 0%. Тренировка завершается ничьей.",
      finishReason: "double_ko"
    };
  }

  if (battle.hostHp <= 0) {
    return {
      winner: "guest",
      message: `${battle.playerNames.host} падает до 0%. Побеждает ${battle.playerNames.guest}.`,
      finishReason: "hp_zero"
    };
  }

  if (battle.guestHp <= 0) {
    return {
      winner: "host",
      message: `${battle.playerNames.guest} падает до 0%. Побеждает ${battle.playerNames.host}.`,
      finishReason: "hp_zero"
    };
  }

  return null;
}

function resolveEscapeOutcome(battle, escapedRole) {
  const otherRole = getOtherRole(escapedRole);
  const escapedHp = getHp(battle, escapedRole);
  const otherHp = getHp(battle, otherRole);

  if (escapedHp > otherHp) {
    return {
      winner: escapedRole,
      message: `${battle.playerNames[escapedRole]} покидает тренировку, сохранив преимущество по очкам. Победа остаётся за ним.`,
      finishReason: "escape_with_lead"
    };
  }

  if (escapedHp < otherHp) {
    return {
      winner: otherRole,
      message: `${battle.playerNames[escapedRole]} покидает тренировку с меньшим количеством очков. Побеждает ${battle.playerNames[otherRole]}.`,
      finishReason: "escape_loss"
    };
  }

  return {
    winner: null,
    message: `${battle.playerNames[escapedRole]} покидает тренировку при равных очках. Итог — ничья.`,
    finishReason: "escape_draw"
  };
}

function resolveDoubleEscapeOutcome(battle) {
  if (battle.hostHp > battle.guestHp) {
    return {
      winner: "host",
      message: `${battle.playerNames.host} и ${battle.playerNames.guest} одновременно покидают тренировку, но преимущество остаётся у ${battle.playerNames.host}.`,
      finishReason: "double_escape_host"
    };
  }

  if (battle.guestHp > battle.hostHp) {
    return {
      winner: "guest",
      message: `${battle.playerNames.host} и ${battle.playerNames.guest} одновременно покидают тренировку, но преимущество остаётся у ${battle.playerNames.guest}.`,
      finishReason: "double_escape_guest"
    };
  }

  return {
    winner: null,
    message: "Оба бойца одновременно покидают тренировку при равных очках. Итог — ничья.",
    finishReason: "double_escape_draw"
  };
}

function recordAnalyticsForSelection(analytics, selection, hit) {
  if (!selection?.type) return;

  if (selection.type === "sand" || selection.type === "paw" || selection.type === "trip") {
    analytics.favoriteMoveCounters[selection.type] += 1;
    analytics.accuracy.totalAttacks += 1;

    if (hit) analytics.accuracy.hits += 1;
    else analytics.accuracy.misses += 1;
  }

  if (selection.type === "paw" && selection.targetKey && analytics.targets[selection.targetKey] !== undefined) {
    analytics.targets[selection.targetKey] += 1;
  }
}

function resolveDodge(defenderName, defenderAction, actionLabel, roundEntries) {
  const dodgeRoll = defenderAction?.dodgeRoll ?? randomRoll();
  const dodgeSuccess = dodgeRoll <= CHANCES.dodge;

  if (dodgeSuccess) {
    roundEntries.push(`${defenderName} успевает увернуться от приёма «${actionLabel}». Бросок уворота: ${dodgeRoll} из ${CHANCES.dodge}.`);
    return true;
  }

  roundEntries.push(`${defenderName} пытается увернуться от приёма «${actionLabel}», но не успевает. Бросок уворота: ${dodgeRoll} из ${CHANCES.dodge}.`);
  return false;
}

function resolveSingleAttack({
  attackerRole,
  defenderRole,
  attackerAction,
  defenderAction,
  battle,
  hadAccuracyPenalty,
  roundEntries
}) {
  if (!isAttackType(attackerAction?.type)) return { resolved: false, hit: false };

  const attackerName = battle.playerNames[attackerRole];
  const defenderName = battle.playerNames[defenderRole];
  const attackerEffects = battle.effects[attackerRole];
  const defenderEffects = battle.effects[defenderRole];
  const attackerAnalytics = battle.analytics[attackerRole];

  let chance = 0;
  let actionLabel = "";
  let target = null;

  if (attackerAction.type === "sand") {
    chance = CHANCES.sand;
    actionLabel = "Песок в глаза";
  }

  if (attackerAction.type === "paw") {
    target = BODY_TARGETS[attackerAction.targetKey];
    if (!target) {
      roundEntries.push(`${attackerName} пытается ударить лапой, но цель выбрана неверно.`);
      recordAnalyticsForSelection(attackerAnalytics, attackerAction, false);
      return { resolved: false, hit: false };
    }
    chance = CHANCES.paw + target.chanceModifier;
    actionLabel = `Удар лапой в ${target.label}`;
  }

  if (attackerAction.type === "trip") {
    chance = CHANCES.trip;
    actionLabel = "Подсечка";
  }

  if (hadAccuracyPenalty) chance -= SAND_ACCURACY_PENALTY;
  chance = Math.max(0, chance);

  if (defenderAction?.type === "defend") {
    const dodged = resolveDodge(defenderName, defenderAction, actionLabel, roundEntries);
    if (dodged) {
      recordAnalyticsForSelection(attackerAnalytics, attackerAction, false);
      return { resolved: true, hit: false };
    }
  }

  const attackRoll = attackerAction.attackRoll ?? randomRoll();
  const hit = attackRoll <= chance;
  recordAnalyticsForSelection(attackerAnalytics, attackerAction, hit);

  if (!hit) {
    roundEntries.push(`${attackerName} использует «${actionLabel}», но промахивается. Бросок: ${attackRoll} из ${chance}.`);

    if (attackerAction.type === "trip") {
      attackerEffects.stunTurns += 1;
      roundEntries.push(`${attackerName} теряет равновесие и сам оглушается на следующий ход.`);
    }

    return { resolved: true, hit: false };
  }

  if (attackerAction.type === "sand") {
    defenderEffects.stunTurns += 1;
    defenderEffects.accuracyPenaltyTurns += SAND_PENALTY_TURNS;

    roundEntries.push(`${attackerName} бросает песок в глаза. Попадание. Бросок: ${attackRoll} из ${chance}.`);
    roundEntries.push(`${defenderName} будет оглушён на следующий ход, а шанс его попадания снизится на 10% на 2 хода.`);

    return { resolved: true, hit: true };
  }

  if (attackerAction.type === "paw") {
    const beforeHp = getHp(battle, defenderRole);
    const afterHp = Math.max(0, beforeHp - target.directDamage);
    setHp(battle, defenderRole, afterHp);
    defenderEffects.pendingDotDamage += target.dotDamage;

    roundEntries.push(`${attackerName} попадает лапой в ${target.label}. Бросок: ${attackRoll} из ${chance}.`);
    roundEntries.push(`${defenderName} теряет ${target.directDamage}% очков спарринга и получит кровотечение ${target.dotDamage}% за ход, начиная со следующего хода.`);

    return { resolved: true, hit: true };
  }

  if (attackerAction.type === "trip") {
    const beforeHp = getHp(battle, defenderRole);
    const afterHp = Math.max(0, beforeHp - DAMAGE.trip);
    setHp(battle, defenderRole, afterHp);
    defenderEffects.pendingDotDamage += DOT.trip;
    defenderEffects.stunTurns += 1;

    roundEntries.push(`${attackerName} проводит подсечку. Попадание. Бросок: ${attackRoll} из ${chance}.`);
    roundEntries.push(`${defenderName} теряет ${DAMAGE.trip}% очков спарринга, будет оглушён на следующий ход и получит кровотечение ${DOT.trip}% за ход, начиная со следующего хода.`);

    return { resolved: true, hit: true };
  }

  return { resolved: false, hit: false };
}

function resolveRound(battle) {
  const roundEntries = [`Ход ${battle.turnNumber}`];

  const hostStarting = {
    stunTurns: battle.effects.host.stunTurns,
    accuracyPenaltyTurns: battle.effects.host.accuracyPenaltyTurns
  };

  const guestStarting = {
    stunTurns: battle.effects.guest.stunTurns,
    accuracyPenaltyTurns: battle.effects.guest.accuracyPenaltyTurns
  };

  applyBleedAtRoundStart(battle, roundEntries);

  const bleedOutcome = getHpOutcome(battle);
  if (bleedOutcome) {
    const summary = buildRoundSummary([...roundEntries, bleedOutcome.message]);
    battle.winner = bleedOutcome.winner;
    battle.lastMessage = summary;
    battle.finishReason = bleedOutcome.finishReason;
    battle.log = appendRoundEntries(battle.log, [summary]);
    battle.selections = createEmptySelections();
    battle.completedAt = now();
    return { status: "finished", battle };
  }

  const hostAction = battle.selections.host;
  const guestAction = battle.selections.guest;

  if (hostAction?.type === "stunned") {
    roundEntries.push(`${battle.playerNames.host} оглушён и пропускает ход.`);
  }

  if (guestAction?.type === "stunned") {
    roundEntries.push(`${battle.playerNames.guest} оглушён и пропускает ход.`);
  }

  if (hostAction?.type === "escape" && guestAction?.type === "escape") {
    const outcome = resolveDoubleEscapeOutcome(battle);
    const summary = buildRoundSummary([...roundEntries, outcome.message]);

    battle.winner = outcome.winner;
    battle.lastMessage = summary;
    battle.finishReason = outcome.finishReason;
    battle.log = appendRoundEntries(battle.log, [summary]);
    battle.selections = createEmptySelections();
    battle.completedAt = now();

    return { status: "finished", battle };
  }

  if (hostAction?.type === "escape") {
    const outcome = resolveEscapeOutcome(battle, "host");
    const summary = buildRoundSummary([...roundEntries, outcome.message]);

    battle.winner = outcome.winner;
    battle.lastMessage = summary;
    battle.finishReason = outcome.finishReason;
    battle.log = appendRoundEntries(battle.log, [summary]);
    battle.selections = createEmptySelections();
    battle.completedAt = now();

    return { status: "finished", battle };
  }

  if (guestAction?.type === "escape") {
    const outcome = resolveEscapeOutcome(battle, "guest");
    const summary = buildRoundSummary([...roundEntries, outcome.message]);

    battle.winner = outcome.winner;
    battle.lastMessage = summary;
    battle.finishReason = outcome.finishReason;
    battle.log = appendRoundEntries(battle.log, [summary]);
    battle.selections = createEmptySelections();
    battle.completedAt = now();

    return { status: "finished", battle };
  }

  if (hostAction?.type === "defend") {
    battle.effects.host.dodgesLeft = Math.max(0, battle.effects.host.dodgesLeft - 1);
  }

  if (guestAction?.type === "defend") {
    battle.effects.guest.dodgesLeft = Math.max(0, battle.effects.guest.dodgesLeft - 1);
  }

  const hostResult = resolveSingleAttack({
    attackerRole: "host",
    defenderRole: "guest",
    attackerAction: hostAction,
    defenderAction: guestAction,
    battle,
    hadAccuracyPenalty: hostStarting.accuracyPenaltyTurns > 0,
    roundEntries
  });

  const guestResult = resolveSingleAttack({
    attackerRole: "guest",
    defenderRole: "host",
    attackerAction: guestAction,
    defenderAction: hostAction,
    battle,
    hadAccuracyPenalty: guestStarting.accuracyPenaltyTurns > 0,
    roundEntries
  });

  if (hostAction?.type === "defend" && !isAttackType(guestAction?.type)) {
    roundEntries.push(`${battle.playerNames.host} уходит в защиту, но атаки в его сторону не следует.`);
  }

  if (guestAction?.type === "defend" && !isAttackType(hostAction?.type)) {
    roundEntries.push(`${battle.playerNames.guest} уходит в защиту, но атаки в его сторону не следует.`);
  }

  if (!hostResult.resolved && !guestResult.resolved && roundEntries.length === 1) {
    roundEntries.push("Оба бойца выжидают и не наносят ударов.");
  }

  const hpOutcome = getHpOutcome(battle);

  if (hostStarting.stunTurns > 0) {
    battle.effects.host.stunTurns = Math.max(0, battle.effects.host.stunTurns - 1);
  }

  if (guestStarting.stunTurns > 0) {
    battle.effects.guest.stunTurns = Math.max(0, battle.effects.guest.stunTurns - 1);
  }

  if (hostStarting.accuracyPenaltyTurns > 0) {
    battle.effects.host.accuracyPenaltyTurns = Math.max(0, battle.effects.host.accuracyPenaltyTurns - 1);
  }

  if (guestStarting.accuracyPenaltyTurns > 0) {
    battle.effects.guest.accuracyPenaltyTurns = Math.max(0, battle.effects.guest.accuracyPenaltyTurns - 1);
  }

  battle.effects.host.dotDamage += battle.effects.host.pendingDotDamage;
  battle.effects.host.pendingDotDamage = 0;

  battle.effects.guest.dotDamage += battle.effects.guest.pendingDotDamage;
  battle.effects.guest.pendingDotDamage = 0;

  battle.selections = createEmptySelections();

  if (hpOutcome) {
    const summary = buildRoundSummary([...roundEntries, hpOutcome.message]);

    battle.winner = hpOutcome.winner;
    battle.lastMessage = summary;
    battle.finishReason = hpOutcome.finishReason;
    battle.log = appendRoundEntries(battle.log, [summary]);
    battle.completedAt = now();

    return { status: "finished", battle };
  }

  const roundSummary = buildRoundSummary(roundEntries);
  battle.turnNumber += 1;
  battle.lastMessage = roundSummary || `Ход ${battle.turnNumber - 1} завершён.`;
  battle.log = appendRoundEntries(battle.log, [battle.lastMessage]);
  battle.lastActionAt = now();
  battle.inactivityDeadlineAt = now() + INACTIVITY_TIMEOUT_MS;

  return { status: "battle", battle };
}

async function submitSelection(selection) {
  if (!state.currentRoomCode) {
    notifyError("Сначала войди в комнату.");
    return;
  }

  if (!state.currentPlayerRole) {
    notifyError("Наблюдатель не может выбирать действия.");
    return;
  }

  if (!state.currentBattleTurnNumber) {
    notifyError("Тренировка ещё не готова к действиям.");
    return;
  }

  const expectedTurnNumber = state.currentBattleTurnNumber;
  const roomRef = ref(db, getRoomPath(state.currentRoomCode));

  await runTransaction(roomRef, room => {
    if (!room || room.status !== "battle") return room;

    const battle = normalizeBattle(room.battle);

    if (battle.turnNumber !== expectedTurnNumber) return room;
    if (battle.winner) return room;
    if (battle.selections[state.currentPlayerRole]) return room;
    if (battle.effects[state.currentPlayerRole].stunTurns > 0) return room;
    if (selection.type === "defend" && battle.effects[state.currentPlayerRole].dodgesLeft <= 0) return room;

    battle.selections[state.currentPlayerRole] = selection;
    battle.lastActionAt = now();
    battle.inactivityDeadlineAt = now() + INACTIVITY_TIMEOUT_MS;

    applyForcedSelectionsForRound(battle);

    if (isRoundReady(battle)) {
      const resolved = resolveRound(battle);
      room.battle = resolved.battle;
      room.status = resolved.status;

      if (resolved.status === "finished") {
        room.finishInfo = {
          type: resolved.battle.winner ? "finished" : RESULT_TYPES.DRAW,
          reason: resolved.battle.finishReason || "",
          completedAt: resolved.battle.completedAt || now()
        };
      }

      return room;
    }

    room.battle = battle;
    return room;
  });

  notify(`Выбрано действие: ${getSelectionLabel(selection)}.`);
}

async function performTurn(actionType, targetKey = null) {
  const selection = createSelection(actionType, targetKey);
  if (!selection) return;
  await submitSelection(selection);
}

/* ==========================================================================
   СОХРАНЕНИЕ ИСТОРИИ И ИТОГОВ
   ========================================================================== */

async function createTrainingHistoryEntry(payload) {
  const historyRef = push(ref(db, "trainingHistory"));
  await set(historyRef, payload);
  return historyRef.key;
}

function applyBattleOutcomeToCharacter({
  character,
  resultType,
  opponentName,
  finishedAt,
  creditGranted,
  creditReason,
  analyticsDelta
}) {
  const next = deepClone(normalizeCharacter(character));
  const thresholds = getThresholdsForStatus(next.trainingStatus);

  if (resultType === RESULT_TYPES.WIN) next.profileStats.wins += 1;
  if (resultType === RESULT_TYPES.LOSS) next.profileStats.losses += 1;
  if (resultType === RESULT_TYPES.DRAW) next.profileStats.draws += 1;

  next.profileStats.lastBattleAt = finishedAt;
  next.profileStats.lastOpponentName = opponentName || "";

  if (analyticsDelta) {
    Object.entries(analyticsDelta.favoriteMoveCounters || {}).forEach(([key, value]) => {
      next.training.analytics.favoriteMoveCounters[key] += value || 0;
    });

    next.training.analytics.accuracy.totalAttacks += analyticsDelta.accuracy?.totalAttacks || 0;
    next.training.analytics.accuracy.hits += analyticsDelta.accuracy?.hits || 0;
    next.training.analytics.accuracy.misses += analyticsDelta.accuracy?.misses || 0;

    Object.entries(analyticsDelta.targets || {}).forEach(([key, value]) => {
      next.training.analytics.targets[key] += value || 0;
    });
  }

  if (resultType === RESULT_TYPES.UNFINISHED) {
    next.training.progress.unfinishedTrainings += 1;
    next.updatedAt = finishedAt;
    return next;
  }

  if (!creditGranted) {
    next.training.progress.deniedTrainings += 1;
    next.updatedAt = finishedAt;
    return next;
  }

  next.training.progress.creditedTrainings += 1;
  next.training.progress.lastCreditedAt = finishedAt;
  next.training.progress.lastCreditedDateKey = getMoscowDateKey(finishedAt);
  next.training.progress.lastCreditedOpponentName = opponentName || "";
  next.training.progress.lastCreditedReason = creditReason || "";

  if (resultType === RESULT_TYPES.WIN) {
    next.training.progress.creditedWins += 1;
    next.training.progress.winsTowardUpgrade += 1;
  } else if (resultType === RESULT_TYPES.LOSS) {
    next.training.progress.creditedLosses += 1;
    next.training.progress.lossesTowardUpgrade += 1;
  } else if (resultType === RESULT_TYPES.DRAW) {
    next.training.progress.creditedDraws += 1;
  }

  if (canEarnAnyMoreUpgrades(next)) {
    const earnedByWins = Math.floor(next.training.progress.winsTowardUpgrade / thresholds.wins);
    const earnedByLosses = Math.floor(next.training.progress.lossesTowardUpgrade / thresholds.losses);
    const earnedNow = earnedByWins + earnedByLosses;

    if (earnedNow > 0) {
      next.training.progress.winsTowardUpgrade -= earnedByWins * thresholds.wins;
      next.training.progress.lossesTowardUpgrade -= earnedByLosses * thresholds.losses;
      const updated = addPendingUpgradePoints(next, earnedNow);
      next.training = updated.training;
    }
  }

  next.updatedAt = finishedAt;
  return next;
}

async function saveFinishedMatchIfNeeded(roomCode, room) {
  if (!room || room.status !== "finished") return;

  const battle = room.battle ? normalizeBattle(room.battle) : null;

  if (battle?.matchSaved === true) return;

  const host = room.players?.host;
  const guest = room.players?.guest;
  if (!host || !guest) return;

  const lockPath = room.battle
    ? `${getRoomPath(roomCode)}/battle/matchSaved`
    : `${getRoomPath(roomCode)}/finishInfo/matchSaved`;

  const lockRef = ref(db, lockPath);
  const lockResult = await runTransaction(lockRef, current => {
    if (current === true) return;
    return true;
  });

  if (!lockResult.committed) return;

  const finishedAt = battle?.completedAt || room.finishInfo?.completedAt || now();

  let resultTypeForHost = RESULT_TYPES.UNFINISHED;
  let resultTypeForGuest = RESULT_TYPES.UNFINISHED;

  if (battle) {
    if (battle.finishReason === "timeout_unfinished") {
      resultTypeForHost = RESULT_TYPES.UNFINISHED;
      resultTypeForGuest = RESULT_TYPES.UNFINISHED;
    } else if (battle.winner === "host") {
      resultTypeForHost = RESULT_TYPES.WIN;
      resultTypeForGuest = RESULT_TYPES.LOSS;
    } else if (battle.winner === "guest") {
      resultTypeForHost = RESULT_TYPES.LOSS;
      resultTypeForGuest = RESULT_TYPES.WIN;
    } else {
      resultTypeForHost = RESULT_TYPES.DRAW;
      resultTypeForGuest = RESULT_TYPES.DRAW;
    }
  }

  const preview = room.creditPreview || await evaluateTrainingCreditForRoom(room);
  const pairKey = getPairKey(host.uid, host.characterId, guest.uid, guest.characterId);
  const todayKey = getMoscowDateKey(finishedAt);
  const cooldownUntil = addDaysToDateKey(todayKey, PAIR_COOLDOWN_DAYS);

  const matchRef = push(ref(db, "matches"));
  await set(matchRef, {
    roomCode,
    hostUid: host.uid,
    guestUid: guest.uid,
    hostProfileName: host.profileName || "",
    guestProfileName: guest.profileName || "",
    hostCharacterId: host.characterId || "",
    guestCharacterId: guest.characterId || "",
    hostCharacterName: host.characterName || "",
    guestCharacterName: guest.characterName || "",
    winnerUid: battle?.winner === "host" ? host.uid : battle?.winner === "guest" ? guest.uid : "",
    winnerRole: battle?.winner || "",
    resultType: battle?.finishReason || room.finishInfo?.type || "",
    finishedAt,
    hostHp: battle?.hostHp ?? 100,
    guestHp: battle?.guestHp ?? 100,
    hostResult: resultTypeForHost,
    guestResult: resultTypeForGuest,
    creditPreview: preview,
    lastMessage: battle?.lastMessage || room.finishInfo?.reason || "",
    battleLog: safeArray(battle?.log)
  });

  await update(ref(db, getRoomPath(roomCode)), {
    matchId: matchRef.key,
    finishedAt
  });

  const hostSnap = await get(ref(db, getCharacterPath(host.uid, host.characterId)));
  const guestSnap = await get(ref(db, getCharacterPath(guest.uid, guest.characterId)));

  if (!hostSnap.exists() || !guestSnap.exists()) return;

  const hostCharacter = normalizeCharacter(hostSnap.val());
  const guestCharacter = normalizeCharacter(guestSnap.val());

  const hostAnalytics = battle?.analytics?.host || createDefaultBattleAnalytics().host;
  const guestAnalytics = battle?.analytics?.guest || createDefaultBattleAnalytics().guest;

  const nextHost = applyBattleOutcomeToCharacter({
    character: hostCharacter,
    resultType: resultTypeForHost,
    opponentName: guest.characterName,
    finishedAt,
    creditGranted: preview.hostGetsCredit,
    creditReason: preview.reason,
    analyticsDelta: hostAnalytics
  });

  const nextGuest = applyBattleOutcomeToCharacter({
    character: guestCharacter,
    resultType: resultTypeForGuest,
    opponentName: host.characterName,
    finishedAt,
    creditGranted: preview.guestGetsCredit,
    creditReason: preview.reason,
    analyticsDelta: guestAnalytics
  });

  await set(ref(db, getCharacterPath(host.uid, host.characterId)), nextHost);
  await set(ref(db, getCharacterPath(guest.uid, guest.characterId)), nextGuest);

  if (resultTypeForHost !== RESULT_TYPES.UNFINISHED || resultTypeForGuest !== RESULT_TYPES.UNFINISHED) {
    await set(ref(db, getPairCooldownPath(pairKey)), {
      pairKey,
      hostCharacterName: host.characterName,
      guestCharacterName: guest.characterName,
      lastCompletedDateKey: todayKey,
      availableFromDateKey: cooldownUntil,
      updatedAt: finishedAt
    });
  }

  await createTrainingHistoryEntry({
    matchId: matchRef.key,
    roomCode,
    finishedAt,
    pairKey,
    hostUid: host.uid,
    guestUid: guest.uid,
    hostCharacterId: host.characterId,
    guestCharacterId: guest.characterId,
    hostCharacterName: host.characterName,
    guestCharacterName: guest.characterName,
    hostResult: resultTypeForHost,
    guestResult: resultTypeForGuest,
    hostGetsCredit: preview.hostGetsCredit,
    guestGetsCredit: preview.guestGetsCredit,
    creditReason: preview.reason,
    finishReason: battle?.finishReason || room.finishInfo?.reason || "",
    lastMessage: battle?.lastMessage || room.finishInfo?.reason || "",
    battleLog: safeArray(battle?.log)
  });

  if (resultTypeForHost !== RESULT_TYPES.UNFINISHED && (preview.hostGetsCredit || preview.guestGetsCredit)) {
    await pushFeedEntry({
      type: FEED_TYPES.CREDITED_TRAINING,
      createdAt: finishedAt,
      text: `Последняя засчитанная тренировка: ${host.characterName} и ${guest.characterName}.`,
      hostCharacterName: host.characterName,
      guestCharacterName: guest.characterName
    });
  }

  if (state.user?.uid === host.uid || state.user?.uid === guest.uid) {
    await loadOwnCharacters();
  }
}

/* ==========================================================================
   ТАЙМЕРЫ И ВСПОМОГАТЕЛЬНОЕ
   ========================================================================== */

function getReadyCountdownLeft(room) {
  const ready = normalizeReadyState(room?.readyState);
  const points = [ready.hostAt, ready.guestAt].filter(Boolean);
  if (!points.length) return 0;

  const earliest = Math.min(...points);
  return Math.max(0, earliest + READY_TIMEOUT_MS - now());
}

function getBattleCountdownLeft(room) {
  const battle = room?.battle ? normalizeBattle(room.battle) : null;
  if (!battle?.inactivityDeadlineAt) return 0;
  return Math.max(0, battle.inactivityDeadlineAt - now());
}

async function ensurePromotionAvailability(characterId) {
  if (!requireAuth()) return;

  const character = getCharacterById(characterId);
  if (!character) return;

  const normalized = normalizeCharacter(character);
  if (normalized.trainingStatus !== "apprentice") return;

  const limit = getPromotionTransferLimit(normalized.training.apprenticeUpgrades.length);
  if (limit <= 0) return;

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    "training/promotion/canTransferNow": true,
    updatedAt: now()
  });

  await loadOwnCharacters();
}

function cleanupRoomWatcher() {
  if (typeof state.unsubscribeRoom === "function") {
    state.unsubscribeRoom();
    state.unsubscribeRoom = null;
  }
}

function cleanupAdminWatchers() {
  if (typeof state.unsubscribeUsers === "function") {
    state.unsubscribeUsers();
    state.unsubscribeUsers = null;
  }
  if (typeof state.unsubscribeRooms === "function") {
    state.unsubscribeRooms();
    state.unsubscribeRooms = null;
  }
  if (typeof state.unsubscribeMatches === "function") {
    state.unsubscribeMatches();
    state.unsubscribeMatches = null;
  }
  if (typeof state.unsubscribeFeed === "function") {
    state.unsubscribeFeed();
    state.unsubscribeFeed = null;
  }
}

function stopRoomTimer() {
  if (state.roomTimerInterval) {
    clearInterval(state.roomTimerInterval);
    state.roomTimerInterval = null;
  }
}

function startRoomTimer(deadline, onExpire) {
  stopRoomTimer();
  if (!deadline) return;

  state.roomTimerInterval = setInterval(() => {
    const left = Math.max(0, deadline - now());

    if (ui.room.roomTimer) {
      const minutes = String(Math.floor(left / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
      text(ui.room.roomTimer, `${minutes}:${seconds}`);
    }

    if (left <= 0) {
      stopRoomTimer();
      if (typeof onExpire === "function") onExpire();
    }
  }, 1000);
}

function renderAuthState() {
  const signedIn = Boolean(state.user);

  if (signedIn) {
    hide(ui.screens.auth);
    show(ui.screens.profile);
    hide(ui.screens.room);
    hide(ui.screens.admin);
    hide(ui.screens.history);
    hide(ui.screens.publicProfiles);
    hide(ui.battle.screen);

    if (state.isAdmin) show(ui.shell.openAdminBtn);
    else hide(ui.shell.openAdminBtn);

    if (ui.shell.openHistoryBtn) show(ui.shell.openHistoryBtn);
    if (ui.shell.openPublicProfilesBtn) show(ui.shell.openPublicProfilesBtn);
  } else {
    show(ui.screens.auth);
    hide(ui.screens.profile);
    hide(ui.screens.room);
    hide(ui.screens.admin);
    hide(ui.screens.history);
    hide(ui.screens.publicProfiles);
    hide(ui.battle.screen);

    hide(ui.shell.openAdminBtn);
    if (ui.shell.openHistoryBtn) hide(ui.shell.openHistoryBtn);
    if (ui.shell.openPublicProfilesBtn) hide(ui.shell.openPublicProfilesBtn);
  }

  if (state.isBlocked) {
    notifyError("Ваш аккаунт заблокирован администратором.");
  }
}

function setScreen(screenKey) {
  hide(ui.screens.auth);
  hide(ui.screens.profile);
  hide(ui.screens.room);
  hide(ui.screens.admin);
  hide(ui.screens.history);
  hide(ui.screens.publicProfiles);
  hide(ui.battle.screen);

  if (!state.user && screenKey !== "auth") {
    show(ui.screens.auth);
    state.currentScreen = "auth";
    return;
  }

  if (screenKey === "auth") show(ui.screens.auth);
  if (screenKey === "profile") show(ui.screens.profile);
  if (screenKey === "room") show(ui.screens.room);
  if (screenKey === "admin" && state.isAdmin) show(ui.screens.admin);
  if (screenKey === "history") show(ui.screens.history);
  if (screenKey === "publicProfiles") show(ui.screens.publicProfiles);

  state.currentScreen = screenKey;
}

function renderUserBadge() {
  const name = state.userProfile?.displayName || state.user?.email || "Гость";
  text(ui.shell.currentUserBadge, `✦ ${name} ✦`);
}

function renderThemeSelector() {
  if (!ui.shell.themeSelect) return;

  ui.shell.themeSelect.innerHTML = `
    <option value="${THEMES.crimsonNight.id}">${THEMES.crimsonNight.label}</option>
    <option value="${THEMES.moonlight.id}">${THEMES.moonlight.label}</option>
    <option value="${THEMES.forestDweller.id}">${THEMES.forestDweller.label}</option>
  `;
  ui.shell.themeSelect.value = state.activeTheme;
}

async function loadRecentFeedEntries() {
  const feedQuery = query(ref(db, getFeedPath()), orderByChild("createdAt"), limitToLast(FEED_LIMIT));
  const snapshot = await get(feedQuery);

  if (!snapshot.exists()) {
    state.feedCache = [];
    return [];
  }

  state.feedCache = Object.values(snapshot.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return state.feedCache;
}

function renderFeedTicker() {
  if (!ui.shell.feedTicker) return;

  if (!state.feedCache.length) {
    ui.shell.feedTicker.innerHTML = `<span class="feed-empty">✦ Лента пока пустует.</span>`;
    return;
  }

  ui.shell.feedTicker.innerHTML = state.feedCache
    .slice(0, 10)
    .map(item => `<span class="feed-item">✦ ${escapeHtml(item.text || "Событие")}</span>`)
    .join("");
}

function renderCharacterSelect() {
  if (!ui.profile.activeCharacterSelect) return;

  const characters = getSortedCharacters();
  const activeId = state.userProfile?.activeCharacterId || "";

  if (!characters.length) {
    ui.profile.activeCharacterSelect.innerHTML = `<option value="">✦ Сначала добавь персонажа ✦</option>`;
    return;
  }

  ui.profile.activeCharacterSelect.innerHTML = characters
    .map(character => {
      const selected = character.id === activeId ? "selected" : "";
      return `<option value="${escapeHtml(character.id)}" ${selected}>${escapeHtml(character.name)}</option>`;
    })
    .join("");

  const selectedCharacter = getCharacterById(ui.profile.activeCharacterSelect.value);
  text(ui.room.activeCharacterMirror, selectedCharacter ? `✦ ${selectedCharacter.name}` : "✦ персонаж не выбран");
}

function buildUpgradeChips(upgrades) {
  const list = safeArray(upgrades);
  if (!list.length) {
    return `<div class="empty-inline">✦ Пока нет улучшений</div>`;
  }

  return list
    .map(item => `<span class="upgrade-chip">${escapeHtml(item.label)}</span>`)
    .join("");
}

function buildCharacterStatsHtml(character) {
  const normalized = normalizeCharacter(character);
  const combat = getCombatViewTotals(normalized);
  const progress = normalized.training.progress;
  const thresholds = getThresholdsForStatus(normalized.trainingStatus);
  const favoriteMove = getFavoriteMoveLabel(normalized);
  const accuracyPercent = getAccuracyPercent(normalized);

  const warriorUpgrades = buildUpgradeChips(normalized.training.warriorUpgrades);
  const apprenticeUpgrades = buildUpgradeChips(normalized.training.apprenticeUpgrades);
  const pending = getPendingChoiceCount(normalized);
  const canPromote = normalized.trainingStatus === "apprentice";

  const currentPool = getCurrentUpgradePool(normalized);
  const accCount = getUpgradeCountByType(currentPool, "accuracy");
  const dodgeCount = getUpgradeCountByType(currentPool, "dodge");
  const clawCount = getUpgradeCountByType(currentPool, "clawPower");
  const biteCount = getUpgradeCountByType(currentPool, "bitePower");

  return `
    <div class="character-detail-grid">
      <div class="character-detail-block">
        <div class="character-detail-title">Боевой профиль</div>
        <div class="character-detail-row"><span>Шанс попадания</span><strong>${combat.accuracy}%</strong></div>
        <div class="character-detail-row"><span>Шанс уворота</span><strong>${combat.dodge}%</strong></div>
        <div class="character-detail-row"><span>Удар когтями</span><strong>${combat.clawPower}%</strong></div>
        <div class="character-detail-row"><span>Укус</span><strong>${combat.bitePower}%</strong></div>
      </div>

      <div class="character-detail-block">
        <div class="character-detail-title">Тренировочный прогресс</div>
        <div class="character-detail-row"><span>Победы до улучшения</span><strong>${progress.winsTowardUpgrade} / ${thresholds.wins}</strong></div>
        <div class="character-detail-row"><span>Поражения до улучшения</span><strong>${progress.lossesTowardUpgrade} / ${thresholds.losses}</strong></div>
        <div class="character-detail-row"><span>Доступно выбрать</span><strong>${pending}</strong></div>
        <div class="character-detail-row"><span>Последний зачёт</span><strong>${escapeHtml(formatDate(progress.lastCreditedAt))}</strong></div>
      </div>

      <div class="character-detail-block">
        <div class="character-detail-title">Интересное</div>
        <div class="character-detail-row"><span>Любимый приём</span><strong>${escapeHtml(favoriteMove)}</strong></div>
        <div class="character-detail-row"><span>Точность</span><strong>${accuracyPercent}%</strong></div>
        <div class="character-detail-row"><span>Последний соперник</span><strong>${escapeHtml(progress.lastCreditedOpponentName || "—")}</strong></div>
        <div class="character-detail-row"><span>Зачётных тренировок</span><strong>${progress.creditedTrainings}</strong></div>
      </div>
    </div>

    <div class="character-detail-grid">
      <div class="character-detail-block">
        <div class="character-detail-title">Ветки усилений</div>
        <div class="character-detail-row"><span>Попадание</span><strong>${accCount} / 5</strong></div>
        <div class="character-detail-row"><span>Уворот</span><strong>${dodgeCount} / 5</strong></div>
        <div class="character-detail-row"><span>Когти</span><strong>${clawCount} / 5</strong></div>
        <div class="character-detail-row"><span>Укус</span><strong>${biteCount} / 5</strong></div>
      </div>

      <div class="character-detail-block">
        <div class="character-detail-title">История улучшений</div>
        ${
          safeArray(normalized.training.upgradeHistory).length
            ? safeArray(normalized.training.upgradeHistory).slice(0, 5).map(item => `
              <div class="character-detail-row">
                <span>${escapeHtml(item.label || "—")}</span>
                <strong>${escapeHtml(formatDate(item.createdAt))}</strong>
              </div>
            `).join("")
            : `<div class="empty-inline">✦ Пока нет записей</div>`
        }
      </div>
    </div>

    <div class="character-upgrades-wrap">
      <div class="character-upgrades-block">
        <div class="character-detail-title">Улучшения воителя</div>
        <div class="upgrade-chip-list">${warriorUpgrades}</div>
      </div>

      <div class="character-upgrades-block">
        <div class="character-detail-title">Улучшения оруженосца</div>
        <div class="upgrade-chip-list">${apprenticeUpgrades}</div>
      </div>
    </div>

    <div class="character-owner-note-box">
      <div class="character-detail-title">Личная заметка владельца</div>
      <div class="character-owner-note-text">${escapeHtml(normalized.ownerNote || "Пока пусто.")}</div>
    </div>

    <div class="character-actions-extra">
      ${pending > 0 ? `<button type="button" class="choose-upgrade-btn" data-character-id="${escapeHtml(character.id)}">Выбрать улучшение (${pending})</button>` : ""}
      ${canPromote ? `<button type="button" class="promote-character-btn" data-character-id="${escapeHtml(character.id)}">Меня посвятили в воители</button>` : ""}
    </div>
  `;
}

function isCharacterCardExpanded(characterId) {
  return Boolean(state.expandedCharacterCards?.[characterId]);
}

function toggleCharacterCardExpanded(characterId) {
  state.expandedCharacterCards[characterId] = !state.expandedCharacterCards[characterId];
}

function renderCharactersList() {
  if (!ui.profile.charactersList) return;

  const searchValue = (ui.profile.characterSearchInput?.value || "").trim().toLowerCase();
  const characters = getSortedCharacters().filter(character =>
    !searchValue || String(character.name || "").toLowerCase().includes(searchValue)
  );

  if (!characters.length) {
    ui.profile.charactersList.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">Персонажи не найдены.</div>
      </div>
    `;
    return;
  }

  const activeId = state.userProfile?.activeCharacterId || "";

  ui.profile.charactersList.innerHTML = characters
    .map(character => {
      const isActive = character.id === activeId;
      const isApprentice = character.trainingStatus === "apprentice";
      const progress = character.training.progress;
      const pending = getPendingChoiceCount(character);
      const expanded = isCharacterCardExpanded(character.id);

      return `
  <article class="character-card ${isApprentice ? "character-card-apprentice" : "character-card-warrior"} ${expanded ? "character-card-expanded" : "character-card-collapsed"}" data-character-id="${escapeHtml(character.id)}">
    <div class="character-card-top">
      <div class="character-card-main">
        <div class="character-card-name">${escapeHtml(character.name || "Без имени")}</div>
        <div class="character-card-meta">
          ${escapeHtml(character.clan || "Без племени")} ◈ ${escapeHtml(getTrainingStatusLabel(character.trainingStatus))}
        </div>
      </div>
      <div class="character-card-badge">${isActive ? "✦ выбран" : "◈ доступен"}</div>
    </div>

    <div class="character-card-summary">
      До улучшения: ${progress.winsTowardUpgrade}/${getThresholdsForStatus(character.trainingStatus).wins} побед · ${progress.lossesTowardUpgrade}/${getThresholdsForStatus(character.trainingStatus).losses} поражений
    </div>

    <div class="character-card-toggle-row">
      <button type="button" class="character-toggle-btn" data-character-id="${escapeHtml(character.id)}">
        ${expanded ? "Свернуть" : "Развернуть"}
      </button>
    </div>

    <div class="character-card-collapsible ${expanded ? "is-open" : ""}">
      <div class="fancy-stats-grid">
        <div class="fancy-stat">
          <span>Победы</span>
          <strong>${character.profileStats.wins}</strong>
        </div>
        <div class="fancy-stat">
          <span>Поражения</span>
          <strong>${character.profileStats.losses}</strong>
        </div>
        <div class="fancy-stat">
          <span>Ничьи</span>
          <strong>${character.profileStats.draws}</strong>
        </div>
        <div class="fancy-stat">
          <span>Улучшения</span>
          <strong>${pending}</strong>
        </div>
      </div>

      ${buildCharacterStatsHtml(character)}

      <div class="character-card-actions">
        <button type="button" class="set-active-character-btn" data-character-id="${escapeHtml(character.id)}">Сделать активным</button>
        <button type="button" class="edit-character-btn" data-character-id="${escapeHtml(character.id)}">Редактировать</button>
        <button type="button" class="delete-character-btn" data-character-id="${escapeHtml(character.id)}">Удалить</button>
      </div>
    </div>
  </article>
`;
    })
    .join("");
}

function renderProfile() {
  if (!state.userProfile) return;

  text(ui.profile.name, state.userProfile.displayName || "Зенит");
  text(ui.profile.statusText, state.userProfile.status || "✦ Наблюдает за бабочками");
  text(ui.profile.portraitInitials, state.userProfile.portraitSymbol || "✦");

  if (ui.profile.statusInput) ui.profile.statusInput.value = state.userProfile.status || "";
  if (ui.profile.symbolSelect) ui.profile.symbolSelect.value = state.userProfile.portraitSymbol || "✦";

  renderUserBadge();
  renderCharacterSelect();
  renderCharactersList();

  const activeCharacter = getCharacterById(getSelectedCharacterId());
  if (ui.profile.ownerNoteInput) {
    ui.profile.ownerNoteInput.value = activeCharacter?.ownerNote || "";
  }
}

function setRoomStatus(value) {
  text(ui.room.statusLog, value);
}

function renderRoomIdleState() {
  text(ui.room.playerNameMirror, state.userProfile?.displayName || "—");

  const activeCharacter = getCharacterById(getSelectedCharacterId());
  text(ui.room.activeCharacterMirror, activeCharacter ? `✦ ${activeCharacter.name}` : "✦ персонаж не выбран");

  html(ui.room.roomPlayers, `
    <div class="empty-state-card">
      <div class="empty-state-mark">✦</div>
      <div class="empty-state-text">Пока вы не подключены ни к одной комнате.</div>
    </div>
  `);

  html(ui.room.roomMeta, `
    <div class="room-meta-line">◈ Статус: ожидание</div>
    <div class="room-meta-line">◈ Комната: —</div>
  `);

  text(ui.room.creditBadge, "Зачёт ещё не рассчитан");
text(ui.room.creditReasonBox, "Создай комнату или войди в уже существующую, чтобы увидеть условия зачёта.");
  html(ui.room.waitingStateBox, "");
  html(ui.room.roomResultCard, "");
  if (ui.room.roomTimer) text(ui.room.roomTimer, "00:00");

  setRoomStatus("Пока ничего не происходит.");
  hide(ui.battle.screen);
  stopRoomTimer();
}

function showBattleMainActions() {
  show(ui.battle.actions);
  hide(ui.battle.attackMenu);
  hide(ui.battle.targetMenu);
}

function showBattleAttackMenu() {
  hide(ui.battle.actions);
  show(ui.battle.attackMenu);
  hide(ui.battle.targetMenu);
}

function showBattleTargetMenu() {
  hide(ui.battle.actions);
  hide(ui.battle.attackMenu);
  show(ui.battle.targetMenu);
}

function setBattleButtonsDisabled(disabled, canDefend = false) {
  disable(ui.battle.attackActionBtn, disabled);
  disable(ui.battle.defendActionBtn, disabled || !canDefend);
  disable(ui.battle.escapeActionBtn, disabled);

  disable(ui.battle.sandAttackBtn, disabled);
  disable(ui.battle.pawAttackBtn, disabled);
  disable(ui.battle.tripAttackBtn, disabled);
  disable(ui.battle.backToActionsBtn, disabled);

  disable(ui.battle.faceTargetBtn, disabled);
  disable(ui.battle.frontLeftTargetBtn, disabled);
  disable(ui.battle.frontRightTargetBtn, disabled);
  disable(ui.battle.sideTargetBtn, disabled);
  disable(ui.battle.earsTargetBtn, disabled);
  disable(ui.battle.neckTargetBtn, disabled);
  disable(ui.battle.backToAttackMenuBtn, disabled);
}

function createBarHtml(label, value, visible = true) {
  const width = clamp(Number(value || 0), 0, 100);
  return `
    <div class="battle-bar-card">
      <div class="battle-bar-top">
        <span>${escapeHtml(label)}</span>
        <strong>${visible ? `${width}%` : "скрыто"}</strong>
      </div>
      <div class="battle-bar-track">
        <div class="battle-bar-fill" style="width:${visible ? width : 100}%"></div>
      </div>
    </div>
  `;
}

function setBattleLog(logItems) {
  if (!ui.battle.log) return;

  const list = safeArray(logItems);

  if (!list.length) {
    ui.battle.log.innerHTML = `
      <div class="battle-log-empty">
        <span class="battle-log-empty-mark">✦</span>
        <span>Пока нет записей.</span>
      </div>
    `;
    state.lastRenderedLogLength = 0;
    return;
  }

  const oldLength = state.lastRenderedLogLength;
  ui.battle.log.innerHTML = list.map((item, index) => {
    const isNew = index >= oldLength;
    const mark = index === list.length - 1 ? "✦" : "•";
    return `
      <div class="battle-log-entry ${isNew ? "battle-log-entry-new" : ""}">
        <div class="battle-log-mark">${mark}</div>
        <div class="battle-log-text">${escapeHtml(String(item))}</div>
      </div>
    `;
  }).join("");

  state.lastRenderedLogLength = list.length;
}

function renderRoomPlayers(room) {
  const host = room.players?.host;
  const guest = room.players?.guest;
  const ready = normalizeReadyState(room.readyState);

  ui.room.roomPlayers.innerHTML = `
    <div class="room-players-grid">
      <div class="room-player-card">
        <div class="room-player-label">✦ Игрок 1</div>
        <div class="room-player-name">${escapeHtml(host?.profileName || "—")}</div>
        <div class="room-player-character">${escapeHtml(host?.characterName || "—")}</div>
        <div class="room-player-ready">${ready.host ? "Готов" : "Не готов"}</div>
      </div>

      <div class="room-player-card">
        <div class="room-player-label">✦ Игрок 2</div>
        <div class="room-player-name">${escapeHtml(guest?.profileName || "—")}</div>
        <div class="room-player-character">${escapeHtml(guest?.characterName || "Ожидание второго игрока")}</div>
        <div class="room-player-ready">${ready.guest ? "Готов" : "Не готов"}</div>
      </div>
    </div>
  `;

  ui.room.roomMeta.innerHTML = `
    <div class="room-meta-line">◈ Комната: ${escapeHtml(room.code || state.currentRoomCode || "—")}</div>
    <div class="room-meta-line">◈ Статус: ${escapeHtml(getRoomStatusLabel(room.status))}</div>
  `;
}

function renderCreditPreview(room) {
  const preview = room.creditPreview || {
    badge: "Зачёта не будет",
    reason: "Недостаточно данных."
  };

  text(ui.room.creditBadge, preview.badge || "Зачёта не будет");
  text(ui.room.creditReasonBox, preview.reason || "—");
}

function renderWaitingState(room) {
  const ready = normalizeReadyState(room.readyState);
  let timerText = "";

  if (room.status === "ready" && (ready.host || ready.guest)) {
    const left = getReadyCountdownLeft(room);
    const minutes = String(Math.floor(left / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    timerText = `⌛ Сброс готовности через ${minutes}:${seconds}`;
  }

  if (room.status === "waiting") {
    ui.room.waitingStateBox.innerHTML = `
      <div class="waiting-pretty-card">
        <div class="waiting-pretty-title">✦ Комната открыта</div>
        <div class="waiting-pretty-text">Тренировка ещё не может начаться. Нужен второй игрок.</div>
      </div>
    `;
    return;
  }

  if (room.status === "ready") {
    ui.room.waitingStateBox.innerHTML = `
      <div class="waiting-pretty-card">
        <div class="waiting-pretty-title">✦ Подтверждение готовности</div>
        <div class="waiting-pretty-text">Как только оба игрока отметятся готовыми, тренировка стартует автоматически.</div>
        <div class="waiting-pretty-timer">${escapeHtml(timerText || "⌛ Ожидание готовности")}</div>
      </div>
    `;
    return;
  }

  ui.room.waitingStateBox.innerHTML = "";
}

function renderRoomResultCard(room) {
  if (room.status !== "finished") {
    ui.room.roomResultCard.innerHTML = "";
    return;
  }

  const preview = room.creditPreview || {};
  const battle = room.battle ? normalizeBattle(room.battle) : null;
  const finishInfo = room.finishInfo || {};

  let winnerName = "Ничья";
  if (battle?.winner) {
    winnerName = battle.playerNames[battle.winner] || "—";
  } else if (finishInfo.type === RESULT_TYPES.UNFINISHED) {
    winnerName = "Не определён";
  }

  const myRole = state.currentPlayerRole;
  let myCreditText = "—";

  if (myRole === "host") {
    myCreditText = preview.hostGetsCredit ? "Зачёт выдан" : "Зачёт не выдан";
  } else if (myRole === "guest") {
    myCreditText = preview.guestGetsCredit ? "Зачёт выдан" : "Зачёт не выдан";
  }

  ui.room.roomResultCard.innerHTML = `
    <div class="result-pretty-card">
      <div class="result-pretty-title">✦ Итог тренировки</div>
      <div class="result-pretty-grid">
        <div class="result-pretty-item"><span>Победитель</span><strong>${escapeHtml(winnerName)}</strong></div>
        <div class="result-pretty-item"><span>Ваш зачёт</span><strong>${escapeHtml(myCreditText)}</strong></div>
        <div class="result-pretty-item"><span>Причина</span><strong>${escapeHtml(preview.reason || battle?.lastMessage || finishInfo.reason || "—")}</strong></div>
        <div class="result-pretty-item"><span>Завершено</span><strong>${escapeHtml(formatDate(battle?.completedAt || finishInfo.completedAt || room.finishedAt || 0))}</strong></div>
      </div>

      ${
        battle
          ? `<div class="result-pretty-bars">
              ${createBarHtml(battle.playerNames.host, battle.hostHp, true)}
              ${createBarHtml(battle.playerNames.guest, battle.guestHp, true)}
            </div>`
          : ""
      }
    </div>
  `;
}

function renderBattleForPlayer(room, battle) {
  const myRole = state.currentPlayerRole;
  const enemyRole = myRole ? getOtherRole(myRole) : null;
  const myEffects = myRole ? battle.effects[myRole] : createDefaultEffects();
  const mySelection = myRole ? battle.selections[myRole] : null;
  const enemySelection = enemyRole ? battle.selections[enemyRole] : null;
  const canChoose = room.status === "battle" && myRole && !mySelection && myEffects.stunTurns <= 0;
  const canDefend = canChoose && myEffects.dodgesLeft > 0;

  let visibleMessage = battle.lastMessage || "Тренировка началась.";

  if (room.status === "battle") {
    if (mySelection?.type === "stunned") {
      visibleMessage = `${battle.lastMessage || "Предыдущий ход завершён."}\n\nВы оглушены и автоматически пропускаете этот ход.`;
    } else if (mySelection) {
      visibleMessage = `${battle.lastMessage || "Предыдущий ход завершён."}\n\nВаше действие выбрано: ${getSelectionLabel(mySelection)}. Ожидание соперника.`;
    } else {
      visibleMessage = `${battle.lastMessage || "Тренировка началась."}\n\nВыберите действие на ход ${battle.turnNumber}.`;
    }
  }

  let effectsHtml = "";

  if (myEffects.accuracyPenaltyTurns > 0) {
    effectsHtml += `
      <div class="battle-effect">
        <div class="battle-effect-title">Штраф к попаданию</div>
        <div class="battle-effect-text">−10% ещё на ${myEffects.accuracyPenaltyTurns} ход(а)</div>
      </div>
    `;
  }

  if (myEffects.stunTurns > 0) {
    effectsHtml += `
      <div class="battle-effect">
        <div class="battle-effect-title">Оглушение</div>
        <div class="battle-effect-text">Этот ход будет пропущен</div>
      </div>
    `;
  }

  ui.battle.info.innerHTML = `
    <div class="battle-status-shell">
      <div class="battle-status-top">
        <div class="battle-chip battle-chip-active">✦ Ход ${battle.turnNumber}</div>
        <div class="battle-chip">◈ Ваш персонаж: ${escapeHtml(battle.playerNames[myRole] || "—")}</div>
        <div class="battle-chip">◈ Соперник: ${escapeHtml(battle.playerNames[enemyRole] || "—")}</div>
      </div>

      <div class="battle-bars-wrap">
        ${createBarHtml("Ваши очки спарринга", myRole ? getHp(battle, myRole) : 0, true)}
        ${room.status === "finished"
          ? createBarHtml("Очки соперника", enemyRole ? getHp(battle, enemyRole) : 0, true)
          : createBarHtml("Очки соперника", 100, false)}
      </div>

      <div class="battle-stats-grid">
        <div class="battle-stat">
          <div class="battle-stat-label">Кровотечение</div>
          <div class="battle-stat-value">−${myEffects.dotDamage}% за ход</div>
        </div>
        <div class="battle-stat">
          <div class="battle-stat-label">Уворотов осталось</div>
          <div class="battle-stat-value">${myEffects.dodgesLeft}</div>
        </div>
      </div>

      ${effectsHtml ? `<div class="battle-effects-grid">${effectsHtml}</div>` : ""}

      <div class="battle-message">
        <div class="battle-message-title">✦ Состояние хода</div>
        <div class="battle-message-text">${escapeHtml(visibleMessage).replace(/\n/g, "<br>")}</div>
      </div>
    </div>
  `;

  if (ui.battle.opponentChosenBadge) {
    text(ui.battle.opponentChosenBadge, enemySelection ? "Соперник уже выбрал действие" : "Соперник ещё думает");
  }

  setBattleLog(battle.log);
  setBattleButtonsDisabled(!canChoose, canDefend);
  showBattleMainActions();
}

function renderBattleForAdmin(room, battle) {
  ui.battle.info.innerHTML = `
    <div class="battle-status-shell">
      <div class="battle-status-top">
        <div class="battle-chip battle-chip-active">✦ Ход ${battle.turnNumber}</div>
        <div class="battle-chip">◈ Наблюдение администратора</div>
      </div>

      <div class="battle-bars-wrap">
        ${createBarHtml(battle.playerNames.host, battle.hostHp, true)}
        ${createBarHtml(battle.playerNames.guest, battle.guestHp, true)}
      </div>

      <div class="battle-message">
        <div class="battle-message-title">✦ Текущее состояние</div>
        <div class="battle-message-text">${escapeHtml(battle.lastMessage || "—")}</div>
      </div>
    </div>
  `;

  setBattleLog(battle.log);
  setBattleButtonsDisabled(true, false);
  showBattleMainActions();
}

async function maybeShowRoomRules(roomCode) {
  if (!roomCode || !state.currentPlayerRole) return;
  if (hasReadRulesForRoom(roomCode)) return;
  if (state.modalResolver) return;

  const accepted = await openInfoModal({
    title: "Правила тренировки",
    bodyHtml: getRoomRulesHtml(),
    confirmLabel: "Я понял",
    allowClose: false
  });

  if (accepted) {
    markRulesReadForRoom(roomCode);
  }
}

async function ensureForcedRoundState(roomCode) {
  if (!roomCode || state.syncingForcedRound) return;
  state.syncingForcedRound = true;

  try {
    const roomRef = ref(db, getRoomPath(roomCode));

    await runTransaction(roomRef, room => {
      if (!room || room.status !== "battle") return room;

      const battle = normalizeBattle(room.battle);
      const changed = applyForcedSelectionsForRound(battle);
      if (!changed) return room;

      if (isRoundReady(battle)) {
        const resolved = resolveRound(battle);
        room.battle = resolved.battle;
        room.status = resolved.status;

        if (resolved.status === "finished") {
          room.finishInfo = {
            type: resolved.battle.winner ? "finished" : RESULT_TYPES.DRAW,
            reason: resolved.battle.finishReason || "",
            completedAt: resolved.battle.completedAt || now()
          };
        }

        return room;
      }

      room.battle = battle;
      return room;
    });
  } finally {
    state.syncingForcedRound = false;
  }
}

async function ensureRoomTimeouts(roomCode, room) {
  if (!roomCode || !room) return;

  if (room.status === "ready") {
    const ready = normalizeReadyState(room.readyState);
    const hasReady = ready.host || ready.guest;

    if (hasReady && getReadyCountdownLeft(room) <= 0) {
      await update(ref(db, getRoomPath(roomCode)), {
        readyState: createEmptyReadyState()
      });
      notify("Готовность сброшена из-за бездействия.");
    }
  }

  if (room.status === "battle") {
    if (getBattleCountdownLeft(room) <= 0) {
      await finishBattleAsUnfinished(roomCode, "Тренировка завершена из-за 10 минут бездействия.");
      notify("Тренировка мягко завершена из-за бездействия.");
    }
  }
}

function renderRoom(roomCode, room) {
  if (!room) {
    renderRoomIdleState();
    return;
  }

  state.currentRoomCode = roomCode;
  renderRoomPlayers(room);
  renderCreditPreview(room);
  renderWaitingState(room);
  renderRoomResultCard(room);

  const lines = [
    `Код комнаты: ${roomCode}`,
    `Статус: ${getRoomStatusLabel(room.status)}`,
    `Игрок 1: ${room.players?.host?.characterName || "—"}`,
    `Игрок 2: ${room.players?.guest?.characterName || "—"}`
  ];

  if (room.status === "waiting") {
    lines.push("Ожидание второго игрока...");
    setRoomStatus(lines.join("\n"));
    hide(ui.battle.screen);
    state.currentBattleTurnNumber = null;
    stopRoomTimer();
    if (ui.room.roomTimer) text(ui.room.roomTimer, "00:00");
    return;
  }

  if (room.status === "ready") {
    lines.push("Оба игрока в комнате. Нужна готовность.");
    setRoomStatus(lines.join("\n"));
    hide(ui.battle.screen);
    state.currentBattleTurnNumber = null;

    const left = getReadyCountdownLeft(room);
    if (left > 0) startRoomTimer(now() + left, () => {});
    else {
      stopRoomTimer();
      if (ui.room.roomTimer) text(ui.room.roomTimer, "00:00");
    }
    return;
  }

  const battle = room.battle ? normalizeBattle(room.battle) : null;
  state.currentBattleTurnNumber = battle?.turnNumber || null;

  if (battle) {
    show(ui.battle.screen);
  } else {
    hide(ui.battle.screen);
  }

  if (room.status === "battle" && battle) {
    ensureForcedRoundState(roomCode);
    lines.push("Тренировка идёт.");
    const left = getBattleCountdownLeft(room);
    if (left > 0) startRoomTimer(now() + left, () => {});
    else stopRoomTimer();
  }

  if (room.status === "finished") {
    lines.push("Тренировка завершена.");
    stopRoomTimer();
    if (ui.room.roomTimer) text(ui.room.roomTimer, "00:00");
  }

  if (battle) {
    const amISpectator = !state.currentPlayerRole || !["host", "guest"].includes(state.currentPlayerRole);
    if (amISpectator && state.isAdmin) renderBattleForAdmin(room, battle);
    else renderBattleForPlayer(room, battle);
  }

  setRoomStatus(lines.join("\n"));
}

async function renderMyTrainingHistory() {
  if (!ui.history.list || !state.user) return;

  const snapshot = await get(ref(db, "trainingHistory"));

  if (!snapshot.exists()) {
    ui.history.list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">История тренировок пока пуста.</div>
      </div>
    `;
    return;
  }

  const all = Object.entries(snapshot.val())
    .map(([id, value]) => ({ id, ...value }))
    .filter(item => item.hostUid === state.user.uid || item.guestUid === state.user.uid)
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  if (!all.length) {
    ui.history.list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">У вас пока нет завершённых тренировок.</div>
      </div>
    `;
    return;
  }

  const groups = {};
  all.forEach(item => {
    const ownRole = item.hostUid === state.user.uid ? "host" : "guest";
    const groupKey = ownRole === "host"
      ? `${item.hostCharacterId}_${item.hostCharacterName}`
      : `${item.guestCharacterId}_${item.guestCharacterName}`;

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  });

  ui.history.list.innerHTML = Object.entries(groups)
    .map(([groupKey, entries]) => {
      const [, characterName] = groupKey.split("_");
      return `
        <section class="history-character-section">
          <h3>${escapeHtml(characterName)}</h3>
          <div class="history-character-list">
            ${entries.map(entry => `
              <article class="history-item-card">
                <div class="history-item-top">
                  <div class="history-item-title">${escapeHtml(entry.hostCharacterName)} ⟡ ${escapeHtml(entry.guestCharacterName)}</div>
                  <div class="history-item-date">${escapeHtml(formatDate(entry.finishedAt))}</div>
                </div>
                <div class="history-item-meta">${escapeHtml(entry.creditReason || "—")}</div>
                <div class="history-item-result">${escapeHtml(entry.lastMessage || "—")}</div>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

async function loadAllPublicCharacters() {
  const snapshot = await get(ref(db, "users"));

  if (!snapshot.exists()) {
    state.publicCharactersCache = [];
    return [];
  }

  const users = snapshot.val();
  const result = [];

  Object.entries(users).forEach(([uid, payload]) => {
    const profile = payload?.profile || {};
    const characters = payload?.characters || {};

    Object.entries(characters).forEach(([characterId, character]) => {
      result.push({
        uid,
        profileName: profile.displayName || "Без имени",
        characterId,
        ...normalizeCharacter(character)
      });
    });
  });

  state.publicCharactersCache = result.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
  return state.publicCharactersCache;
}

function renderPublicProfilesList() {
  if (!ui.publicProfiles.list) return;

  const searchValue = (ui.publicProfiles.searchInput?.value || "").trim().toLowerCase();
  const items = state.publicCharactersCache.filter(item =>
    !searchValue || String(item.name || "").toLowerCase().includes(searchValue)
  );

  if (!items.length) {
    ui.publicProfiles.list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">Персонажи не найдены.</div>
      </div>
    `;
    return;
  }

  ui.publicProfiles.list.innerHTML = items.map(item => `
    <article class="public-character-card" data-public-uid="${escapeHtml(item.uid)}" data-public-character-id="${escapeHtml(item.characterId)}">
      <div class="public-character-name">${escapeHtml(item.name)}</div>
      <div class="public-character-meta">${escapeHtml(item.clan || "Без племени")} ◈ ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>
      <div class="public-character-owner">Игрок: ${escapeHtml(item.profileName || "—")}</div>
    </article>
  `).join("");
}

function renderPublicProfileDetails(uid, characterId) {
  if (!ui.publicProfiles.details) return;

  const character = state.publicCharactersCache.find(item => item.uid === uid && item.characterId === characterId);

  if (!character) {
    ui.publicProfiles.details.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">Выберите персонажа слева.</div>
      </div>
    `;
    return;
  }

  const combat = getCombatViewTotals(character);
  const progress = character.training.progress;

  ui.publicProfiles.details.innerHTML = `
    <div class="public-profile-card">
      <div class="public-profile-name">${escapeHtml(character.name)}</div>
      <div class="public-profile-meta">${escapeHtml(character.clan || "Без племени")} ◈ ${escapeHtml(getTrainingStatusLabel(character.trainingStatus))}</div>
      <div class="public-profile-owner">Игрок: ${escapeHtml(character.profileName || "—")}</div>

      <div class="public-profile-grid">
        <div class="public-profile-stat"><span>Шанс попадания</span><strong>${combat.accuracy}%</strong></div>
        <div class="public-profile-stat"><span>Шанс уворота</span><strong>${combat.dodge}%</strong></div>
        <div class="public-profile-stat"><span>Удар когтями</span><strong>${combat.clawPower}%</strong></div>
        <div class="public-profile-stat"><span>Укус</span><strong>${combat.bitePower}%</strong></div>
        <div class="public-profile-stat"><span>Любимый приём</span><strong>${escapeHtml(getFavoriteMoveLabel(character))}</strong></div>
        <div class="public-profile-stat"><span>Точность</span><strong>${getAccuracyPercent(character)}%</strong></div>
        <div class="public-profile-stat"><span>Последний зачёт</span><strong>${escapeHtml(formatDate(progress.lastCreditedAt))}</strong></div>
        <div class="public-profile-stat"><span>Последний соперник</span><strong>${escapeHtml(progress.lastCreditedOpponentName || "—")}</strong></div>
      </div>

      <div class="public-profile-upgrades">
        <div class="public-profile-block-title">Улучшения</div>
        <div class="upgrade-chip-list">${buildUpgradeChips(character.trainingStatus === "apprentice" ? character.training.apprenticeUpgrades : character.training.warriorUpgrades)}</div>
      </div>
    </div>
  `;
}

function flattenUsersCharacters() {
  return Object.entries(state.adminUsersCache || {}).flatMap(([uid, payload]) => {
    const profile = payload?.profile || {};
    const characters = payload?.characters || {};

    return Object.entries(characters).map(([characterId, character]) => ({
      uid,
      profileName: profile.displayName || "—",
      characterId,
      ...normalizeCharacter(character)
    }));
  });
}

async function openAdminProfileEditModal(profile) {
  const current = profile || {};

  const result = await openModal({
    title: "Редактирование профиля",
    text: "Измени имя и статус игрока.",
    bodyHtml: `
      <div class="zenith-input-stack">
        <label class="zenith-input-label">
          <span>Имя профиля</span>
          <input id="zenithModalProfileName" type="text" value="${escapeHtml(current.displayName || "")}" />
        </label>
        <label class="zenith-input-label">
          <span>Статус</span>
          <input id="zenithModalProfileStatus" type="text" value="${escapeHtml(current.status || "")}" />
        </label>
      </div>
    `,
    confirmLabel: "Сохранить",
    cancelLabel: "Отмена",
    showCancel: true,
    allowClose: true,
    serializer: () => ({
      displayName: byId("zenithModalProfileName")?.value.trim() || "",
      status: byId("zenithModalProfileStatus")?.value.trim() || ""
    })
  });

  return result.confirmed ? result.value : null;
}

function renderAdminSummary() {
  if (!ui.admin.summary) return;

  const usersCount = Object.keys(state.adminUsersCache || {}).length;
  const roomsCount = Object.keys(state.adminRoomsCache || {}).length;
  const matchesCount = Object.keys(state.adminMatchesCache || {}).length;
  const charactersCount = flattenUsersCharacters().length;

  ui.admin.summary.innerHTML = `
    <div class="admin-summary-grid">
      <div class="admin-summary-card"><span>✦ Игроков</span><strong>${usersCount}</strong></div>
      <div class="admin-summary-card"><span>✦ Персонажей</span><strong>${charactersCount}</strong></div>
      <div class="admin-summary-card"><span>✦ Комнат</span><strong>${roomsCount}</strong></div>
      <div class="admin-summary-card"><span>✦ Завершённых тренировок</span><strong>${matchesCount}</strong></div>
    </div>
  `;
}

function renderAdminPlayers() {
  if (!ui.admin.playersList) return;

  const users = Object.entries(state.adminUsersCache || {});
  if (!users.length) {
    ui.admin.playersList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Игроков пока нет.</div></div>`;
    return;
  }

  ui.admin.playersList.innerHTML = users.map(([uid, payload]) => {
    const profile = payload?.profile || {};
    const charactersCount = Object.keys(payload?.characters || {}).length;

    return `
      <article class="admin-user-card" data-user-id="${escapeHtml(uid)}">
        <div class="admin-user-top">
          <div>
            <div class="admin-user-name">${escapeHtml(profile.displayName || "Без имени")}</div>
            <div class="admin-user-meta">${escapeHtml(profile.status || "Без статуса")}</div>
          </div>
          <div class="admin-user-badge">${profile.blocked ? "⛶ заблокирован" : "✦ активен"}</div>
        </div>

        <div class="admin-user-stats">
          <span>UID: ${escapeHtml(uid)}</span>
          <span>Персонажей: ${charactersCount}</span>
          <span>Создан: ${escapeHtml(formatDate(profile.createdAt))}</span>
        </div>

        <div class="admin-user-actions">
          <button type="button" class="admin-edit-profile-btn" data-user-id="${escapeHtml(uid)}">Редактировать профиль</button>
          <button type="button" class="admin-toggle-block-btn" data-user-id="${escapeHtml(uid)}">${profile.blocked ? "Разблокировать" : "Заблокировать"}</button>
          <button type="button" class="admin-view-history-btn" data-user-id="${escapeHtml(uid)}">История</button>
          <button type="button" class="admin-delete-profile-btn" data-user-id="${escapeHtml(uid)}">Удалить данные</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderAdminCharacters() {
  if (!ui.admin.charactersList) return;

  const searchValue = (ui.admin.searchInput?.value || "").trim().toLowerCase();
  let items = flattenUsersCharacters();

  if (searchValue) {
    items = items.filter(item => String(item.name || "").toLowerCase().includes(searchValue));
  }

  if (!items.length) {
    ui.admin.charactersList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Персонажи не найдены.</div></div>`;
    return;
  }

  ui.admin.charactersList.innerHTML = items.map(item => `
    <article class="admin-character-card">
      <div class="admin-character-name">${escapeHtml(item.name || "Без имени")}</div>
      <div class="admin-character-meta">Игрок: ${escapeHtml(item.profileName || "—")} ◈ ${escapeHtml(item.clan || "Без племени")} ◈ ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>
      <div class="admin-character-stats">
        <span>Победы: ${item.profileStats.wins}</span>
        <span>Поражения: ${item.profileStats.losses}</span>
        <span>Ничьи: ${item.profileStats.draws}</span>
        <span>Последний зачёт: ${escapeHtml(formatOnlyDate(item.training.progress.lastCreditedAt))}</span>
      </div>
      <div class="admin-room-actions">
        <button type="button" class="admin-toggle-char-status-btn" data-user-id="${escapeHtml(item.uid)}" data-character-id="${escapeHtml(item.characterId)}">Сменить статус</button>
      </div>
    </article>
  `).join("");
}

function renderAdminRooms() {
  if (!ui.admin.roomsList) return;

  const rooms = Object.entries(state.adminRoomsCache || {}).sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));
  if (!rooms.length) {
    ui.admin.roomsList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Активных комнат нет.</div></div>`;
    return;
  }

  ui.admin.roomsList.innerHTML = rooms.map(([roomCode, room]) => `
    <article class="admin-room-card">
      <div class="admin-room-top">
        <div class="admin-room-name">Комната ${escapeHtml(roomCode)}</div>
        <div class="admin-room-badge">${escapeHtml(getRoomStatusLabel(room.status))}</div>
      </div>
      <div class="admin-room-meta">
        <span>Игрок 1: ${escapeHtml(room.players?.host?.characterName || "—")}</span>
        <span>Игрок 2: ${escapeHtml(room.players?.guest?.characterName || "—")}</span>
      </div>
      <div class="admin-match-result">${escapeHtml(room.creditPreview?.reason || "—")}</div>
      <div class="admin-room-actions">
        <button type="button" class="admin-watch-room-btn" data-room-code="${escapeHtml(roomCode)}">Открыть</button>
        <button type="button" class="admin-delete-room-btn" data-room-code="${escapeHtml(roomCode)}">Удалить</button>
        <button type="button" class="admin-finish-room-btn" data-room-code="${escapeHtml(roomCode)}">Завершить зависшую</button>
      </div>
    </article>
  `).join("");
}

function renderAdminMatches() {
  if (!ui.admin.matchesList) return;

  const matches = Object.entries(state.adminMatchesCache || {}).sort((a, b) => (b[1]?.finishedAt || 0) - (a[1]?.finishedAt || 0));
  if (!matches.length) {
    ui.admin.matchesList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Завершённых тренировок пока нет.</div></div>`;
    return;
  }

  ui.admin.matchesList.innerHTML = matches.map(([matchId, match]) => `
    <article class="admin-match-card">
      <div class="admin-match-title">${escapeHtml(match.hostCharacterName || "—")} ⟡ ${escapeHtml(match.guestCharacterName || "—")}</div>
      <div class="admin-match-meta">${escapeHtml(formatDate(match.finishedAt))}</div>
      <div class="admin-match-result">${escapeHtml(match.creditPreview?.reason || match.lastMessage || "—")}</div>
    </article>
  `).join("");
}

function renderAdminPlayerHistory() {
  if (!ui.admin.playerHistoryList) return;

  const targetUid = state.adminSelectedUserId;
  if (!targetUid) {
    ui.admin.playerHistoryList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Выбери игрока, чтобы увидеть историю.</div></div>`;
    return;
  }

  const matches = Object.entries(state.adminMatchesCache || {})
    .map(([matchId, match]) => ({ matchId, ...match }))
    .filter(match => match.hostUid === targetUid || match.guestUid === targetUid)
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  if (!matches.length) {
    ui.admin.playerHistoryList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">У игрока пока нет завершённых тренировок.</div></div>`;
    return;
  }

  ui.admin.playerHistoryList.innerHTML = matches.map(match => `
    <article class="admin-history-card">
      <div class="admin-history-title">${escapeHtml(match.hostCharacterName || "—")} ⟡ ${escapeHtml(match.guestCharacterName || "—")}</div>
      <div class="admin-history-meta">${escapeHtml(formatDate(match.finishedAt))}</div>
      <div class="admin-history-text">${escapeHtml(match.creditPreview?.reason || match.lastMessage || "—")}</div>
    </article>
  `).join("");
}

function renderAdmin() {
  if (!state.isAdmin) return;
  renderAdminSummary();
  renderAdminPlayers();
  renderAdminCharacters();
  renderAdminRooms();
  renderAdminMatches();
  renderAdminPlayerHistory();
}

async function adminEditProfile(userId) {
  const profile = state.adminUsersCache?.[userId]?.profile;
  if (!profile) return;

  const values = await openAdminProfileEditModal(profile);
  if (!values) return;

  await update(ref(db, getProfilePath(userId)), {
    displayName: values.displayName || profile.displayName || "Зенит",
    status: values.status || "",
    updatedAt: now()
  });

  notify("Профиль обновлён администратором.");
}

async function adminToggleBlock(userId) {
  const profile = state.adminUsersCache?.[userId]?.profile;
  if (!profile) return;

  await update(ref(db, getProfilePath(userId)), {
    blocked: !profile.blocked,
    updatedAt: now()
  });

  notify(profile.blocked ? "Игрок разблокирован." : "Игрок заблокирован.");
}

async function adminDeleteRoom(roomCode) {
  const ok = await openConfirmModal({
    title: "Удаление комнаты",
    text: `Удалить комнату ${roomCode}?`,
    confirmLabel: "Удалить"
  });

  if (!ok) return;

  await remove(ref(db, getRoomPath(roomCode)));
  notify(`Комната ${roomCode} удалена.`);

  if (state.currentRoomCode === roomCode) {
    state.currentRoomCode = "";
    state.currentPlayerRole = null;
    clearActiveRoomLocal();
    renderRoomIdleState();
  }
}

async function adminDeleteProfileData(userId) {
  const ok = await openConfirmModal({
    title: "Удаление данных профиля",
    text: "Будут удалены профиль игрока и все его персонажи. Аккаунт авторизации останется.",
    confirmLabel: "Удалить"
  });

  if (!ok) return;

  await remove(ref(db, `users/${userId}`));
  notify("Данные профиля удалены.");
}

async function adminToggleCharacterStatus(userId, characterId) {
  const snapshot = await get(ref(db, getCharacterPath(userId, characterId)));
  if (!snapshot.exists()) return;

  const character = normalizeCharacter(snapshot.val());
  const nextStatus = character.trainingStatus === "apprentice" ? "warrior" : "apprentice";

  await update(ref(db, getCharacterPath(userId, characterId)), {
    trainingStatus: nextStatus,
    updatedAt: now()
  });

  notify(`Статус персонажа сменён на «${getTrainingStatusLabel(nextStatus)}».`);
}

async function adminFinishRoom(roomCode) {
  await finishBattleAsUnfinished(roomCode, "Тренировка завершена администратором как зависшая.");
  notify(`Комната ${roomCode} завершена администратором.`);
}

function adminOpenRoom(roomCode) {
  state.currentRoomCode = roomCode;

  const room = state.adminRoomsCache?.[roomCode];
  if (!room) return;

  if (room.hostUid === state.user?.uid) state.currentPlayerRole = "host";
  else if (room.guestUid === state.user?.uid) state.currentPlayerRole = "guest";
  else state.currentPlayerRole = null;

  saveActiveRoomLocal(roomCode, state.currentPlayerRole || "spectator");
  setScreen("room");
  notify(`Открыт режим наблюдения за комнатой ${roomCode}.`);
}

function watchRoom(roomCode) {
  cleanupRoomWatcher();
  const roomRef = ref(db, getRoomPath(roomCode));

  state.unsubscribeRoom = onValue(roomRef, snapshot => {
    if (!snapshot.exists()) {
      setRoomStatus("Комната не найдена или была удалена.");
      renderRoomIdleState();
      clearActiveRoomLocal();
      return;
    }

    const room = snapshot.val();
    renderRoom(roomCode, room);

    ensureRoomTimeouts(roomCode, room).catch(console.error);

    if (room.status === "finished") {
  saveFinishedMatchIfNeeded(roomCode, room).catch(error => {
    console.error(error);
    notifyError(`Не удалось сохранить итог тренировки: ${error.message}`);
  });
}

    maybeShowRoomRules(roomCode).catch(console.error);
  });
}

function watchAdminData() {
  if (!state.isAdmin) return;

  if (!state.unsubscribeUsers) {
    state.unsubscribeUsers = onValue(ref(db, "users"), snapshot => {
      state.adminUsersCache = snapshot.exists() ? snapshot.val() : {};
      renderAdmin();
    });
  }

  if (!state.unsubscribeRooms) {
    state.unsubscribeRooms = onValue(ref(db, "rooms"), snapshot => {
      state.adminRoomsCache = snapshot.exists() ? snapshot.val() : {};
      renderAdmin();
    });
  }

  if (!state.unsubscribeMatches) {
    state.unsubscribeMatches = onValue(ref(db, "matches"), snapshot => {
      state.adminMatchesCache = snapshot.exists() ? snapshot.val() : {};
      renderAdmin();
    });
  }
}

function watchFeed() {
  if (state.unsubscribeFeed) return;

  const feedQuery = query(ref(db, getFeedPath()), orderByChild("createdAt"), limitToLast(FEED_LIMIT));
  state.unsubscribeFeed = onValue(feedQuery, snapshot => {
    if (!snapshot.exists()) {
      state.feedCache = [];
      renderFeedTicker();
      return;
    }

    state.feedCache = Object.values(snapshot.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderFeedTicker();
  });
}

function bindAuthEvents() {
  ui.auth.registerBtn?.addEventListener("click", () => handleRegister().catch(error => notifyError(error.message)));
  ui.auth.loginBtn?.addEventListener("click", () => handleLogin().catch(error => notifyError(error.message)));
  ui.auth.logoutBtn?.addEventListener("click", () => handleLogout().catch(error => notifyError(error.message)));
}

function bindShellEvents() {
  ui.shell.mainLogoutBtn?.addEventListener("click", () => {
    handleLogout().catch(error => notifyError(error.message));
  });

  ui.shell.openProfileBtn?.addEventListener("click", () => {
    setScreen("profile");
    renderProfile();
  });

  ui.shell.openRoomBtn?.addEventListener("click", () => {
    setScreen("room");
    if (!state.currentRoomCode) renderRoomIdleState();
  });

  ui.shell.openAdminBtn?.addEventListener("click", () => {
  if (!state.isAdmin) return;
  watchAdminData();
  setScreen("admin");
  renderAdmin();
});

  ui.shell.openHistoryBtn?.addEventListener("click", () => {
    setScreen("history");
    renderMyTrainingHistory().catch(error => notifyError(error.message));
  });

  ui.shell.openPublicProfilesBtn?.addEventListener("click", () => {
    setScreen("publicProfiles");
    loadAllPublicCharacters()
      .then(() => {
        renderPublicProfilesList();
        renderPublicProfileDetails("", "");
      })
      .catch(error => notifyError(error.message));
  });

  ui.shell.themeSelect?.addEventListener("change", async event => {
    const themeId = event.target.value;
    applyTheme(themeId);

    if (state.user) {
      await update(ref(db, getProfilePath(state.user.uid)), {
        themeId,
        updatedAt: now()
      });
      state.userProfile = await loadUserProfile(state.user.uid);
    }
  });
}

function bindProfileEvents() {
  ui.profile.saveProfileBtn?.addEventListener("click", () => {
    saveProfileStatus()
      .then(() => renderProfile())
      .catch(error => notifyError(error.message));
  });

  ui.profile.savePortraitSymbolBtn?.addEventListener("click", () => {
    savePortraitSymbol()
      .then(() => renderProfile())
      .catch(error => notifyError(error.message));
  });

  ui.profile.addCharacterBtn?.addEventListener("click", () => {
    addCharacter()
      .then(() => renderProfile())
      .catch(error => notifyError(error.message));
  });

  ui.profile.activeCharacterSelect?.addEventListener("change", event => {
    const characterId = event.target.value;
    saveActiveCharacter(characterId)
      .then(async () => {
        state.userProfile = await loadUserProfile(state.user.uid);
        renderProfile();
      })
      .catch(error => notifyError(error.message));
  });

  ui.profile.characterSearchInput?.addEventListener("input", renderCharactersList);

  ui.profile.saveOwnerNoteBtn?.addEventListener("click", () => {
    const activeId = getSelectedCharacterId();
    const note = ui.profile.ownerNoteInput?.value || "";
    saveOwnerNote(activeId, note)
      .then(() => renderProfile())
      .catch(error => notifyError(error.message));
  });

 ui.profile.charactersList?.addEventListener("click", event => {
  const target = event.target;
  const characterId = target?.dataset?.characterId;

  if (target.classList.contains("character-toggle-btn")) {
    toggleCharacterCardExpanded(characterId);
    renderCharactersList();
    return;
  }

  if (!characterId) return;

    if (target.classList.contains("set-active-character-btn")) {
      saveActiveCharacter(characterId)
        .then(async () => {
          state.userProfile = await loadUserProfile(state.user.uid);
          renderProfile();
        })
        .catch(error => notifyError(error.message));
    }

    if (target.classList.contains("edit-character-btn")) {
      editCharacter(characterId)
        .then(() => renderProfile())
        .catch(error => notifyError(error.message));
    }

    if (target.classList.contains("delete-character-btn")) {
      deleteCharacter(characterId)
        .then(() => renderProfile())
        .catch(error => notifyError(error.message));
    }

    if (target.classList.contains("choose-upgrade-btn")) {
      chooseUpgradeForCharacter(characterId)
        .then(() => renderProfile())
        .catch(error => notifyError(error.message));
    }

    if (target.classList.contains("promote-character-btn")) {
      promoteApprenticeToWarrior(characterId)
        .then(() => renderProfile())
        .catch(error => notifyError(error.message));
    }
  });
}

function bindRoomEvents() {
  ui.room.createRoomBtn?.addEventListener("click", () => {
    createRoom()
      .then(() => {
        setScreen("room");
        if (state.currentRoomCode) watchRoom(state.currentRoomCode);
      })
      .catch(error => notifyError(error.message));
  });

  ui.room.joinRoomBtn?.addEventListener("click", () => {
    joinRoom()
      .then(() => {
        setScreen("room");
        if (state.currentRoomCode) watchRoom(state.currentRoomCode);
      })
      .catch(error => notifyError(error.message));
  });

  ui.room.leaveRoomBtn?.addEventListener("click", () => {
    leaveRoom()
      .then(() => {
        renderRoomIdleState();
      })
      .catch(error => notifyError(error.message));
  });

  ui.room.copyRoomCodeBtn?.addEventListener("click", async () => {
    const code = state.currentRoomCode || ui.room.roomCodeInput?.value || "";
    if (!code) {
      notifyError("Нет кода комнаты для копирования.");
      return;
    }

    await navigator.clipboard.writeText(code);
    notify("Код комнаты скопирован.");
  });

  ui.room.readyToggleBtn?.addEventListener("click", () => {
    toggleReady().catch(error => notifyError(error.message));
  });

  ui.room.startBattleBtn?.addEventListener("click", () => {
    notify("Тренировка стартует автоматически после двух подтверждений готовности.");
  });
}

function bindBattleEvents() {
  ui.battle.attackActionBtn?.addEventListener("click", () => {
    if (ui.battle.attackActionBtn.disabled) return;
    showBattleAttackMenu();
  });

  ui.battle.backToActionsBtn?.addEventListener("click", () => {
    if (ui.battle.backToActionsBtn.disabled) return;
    showBattleMainActions();
  });

  ui.battle.pawAttackBtn?.addEventListener("click", () => {
    if (ui.battle.pawAttackBtn.disabled) return;
    showBattleTargetMenu();
  });

  ui.battle.backToAttackMenuBtn?.addEventListener("click", () => {
    if (ui.battle.backToAttackMenuBtn.disabled) return;
    showBattleAttackMenu();
  });

  ui.battle.sandAttackBtn?.addEventListener("click", () => performTurn("sand").catch(error => notifyError(error.message)));
  ui.battle.tripAttackBtn?.addEventListener("click", () => performTurn("trip").catch(error => notifyError(error.message)));
  ui.battle.defendActionBtn?.addEventListener("click", () => performTurn("defend").catch(error => notifyError(error.message)));
  ui.battle.escapeActionBtn?.addEventListener("click", () => performTurn("escape").catch(error => notifyError(error.message)));

  ui.battle.faceTargetBtn?.addEventListener("click", () => performTurn("paw", "face").catch(error => notifyError(error.message)));
  ui.battle.frontLeftTargetBtn?.addEventListener("click", () => performTurn("paw", "frontLeft").catch(error => notifyError(error.message)));
  ui.battle.frontRightTargetBtn?.addEventListener("click", () => performTurn("paw", "frontRight").catch(error => notifyError(error.message)));
  ui.battle.sideTargetBtn?.addEventListener("click", () => performTurn("paw", "side").catch(error => notifyError(error.message)));
  ui.battle.earsTargetBtn?.addEventListener("click", () => performTurn("paw", "ears").catch(error => notifyError(error.message)));
  ui.battle.neckTargetBtn?.addEventListener("click", () => performTurn("paw", "neck").catch(error => notifyError(error.message)));
}

function bindPublicProfilesEvents() {
  ui.publicProfiles.searchBtn?.addEventListener("click", () => {
    renderPublicProfilesList();
  });

  ui.publicProfiles.searchInput?.addEventListener("input", () => {
    renderPublicProfilesList();
  });

  ui.publicProfiles.list?.addEventListener("click", event => {
    const target = event.target.closest("[data-public-uid][data-public-character-id]");
    if (!target) return;

    const uid = target.dataset.publicUid;
    const characterId = target.dataset.publicCharacterId;
    renderPublicProfileDetails(uid, characterId);
  });
}

function bindAdminEvents() {
  ui.admin.searchBtn?.addEventListener("click", renderAdminCharacters);
  ui.admin.refreshBtn?.addEventListener("click", renderAdmin);
  ui.admin.searchInput?.addEventListener("input", renderAdminCharacters);

  ui.admin.playersList?.addEventListener("click", event => {
    const target = event.target;
    const userId = target?.dataset?.userId;
    if (!userId) return;

    if (target.classList.contains("admin-edit-profile-btn")) {
      adminEditProfile(userId).catch(error => notifyError(error.message));
    }

    if (target.classList.contains("admin-toggle-block-btn")) {
      adminToggleBlock(userId).catch(error => notifyError(error.message));
    }

    if (target.classList.contains("admin-view-history-btn")) {
      state.adminSelectedUserId = userId;
      renderAdminPlayerHistory();
    }

    if (target.classList.contains("admin-delete-profile-btn")) {
      adminDeleteProfileData(userId).catch(error => notifyError(error.message));
    }
  });

  ui.admin.roomsList?.addEventListener("click", event => {
    const target = event.target;
    const roomCode = target?.dataset?.roomCode;
    if (!roomCode) return;

    if (target.classList.contains("admin-watch-room-btn")) {
      adminOpenRoom(roomCode);
      watchRoom(roomCode);
    }

    if (target.classList.contains("admin-delete-room-btn")) {
      adminDeleteRoom(roomCode).catch(error => notifyError(error.message));
    }

    if (target.classList.contains("admin-finish-room-btn")) {
      adminFinishRoom(roomCode).catch(error => notifyError(error.message));
    }
  });

  ui.admin.charactersList?.addEventListener("click", event => {
    const target = event.target;
    const userId = target?.dataset?.userId;
    const characterId = target?.dataset?.characterId;
    if (!userId || !characterId) return;

    if (target.classList.contains("admin-toggle-char-status-btn")) {
      adminToggleCharacterStatus(userId, characterId).catch(error => notifyError(error.message));
    }
  });
}

async function restoreRoomWatcherIfNeeded() {
  if (!state.currentRoomCode) {
    renderRoomIdleState();
    return;
  }

  watchRoom(state.currentRoomCode);
}

function resetSignedOutUi() {
  cleanupRoomWatcher();
  cleanupAdminWatchers();
  stopRoomTimer();
  state.currentRoomCode = "";
  state.currentPlayerRole = null;
  state.currentBattleTurnNumber = null;
  clearActiveRoomLocal();
  renderRoomIdleState();
}

function init() {
  ensureUiChrome();
  applyTheme(readThemeLocal());
  renderThemeSelector();
  renderFeedTicker();
  bindAuthEvents();
  bindShellEvents();
  bindProfileEvents();
  bindRoomEvents();
  bindBattleEvents();
  bindPublicProfilesEvents();
  bindAdminEvents();

  showBattleMainActions();
  setBattleButtonsDisabled(true, false);
  setBattleLog([]);
  renderRoomIdleState();

  onAuthStateChanged(auth, user => {
    if (user) {
      handleSignedInUser(user)
        .then(async () => {
          renderAuthState();
          renderProfile();
          await loadRecentFeedEntries();
          renderFeedTicker();
          watchFeed();
          if (state.isAdmin) watchAdminData();
          await tryAutoJoinSavedRoom();
          await restoreRoomWatcherIfNeeded();
          setScreen(state.currentRoomCode ? "room" : "profile");
        })
        .catch(error => {
          console.error(error);
          notifyError(error.message);
        });
    } else {
      handleSignedOutUser();
      resetSignedOutUi();
      renderAuthState();
      setScreen("auth");
      notify("Войдите в аккаунт, чтобы продолжить.");
    }
  });
}

init();

