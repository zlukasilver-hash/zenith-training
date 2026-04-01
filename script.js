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

const ROOM_CODE_LENGTH = 6;
const MAX_LOG_ITEMS = 60;
const MAX_DODGES = 4;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const READY_TIMEOUT_MS = 10 * 60 * 1000;
const PAIR_COOLDOWN_DAYS = 3;
const FEED_LIMIT = 20;

const LOCAL_KEYS = {
  activeRoom: "zenith_active_room_v4",
  theme: "zenith_theme_v4",
  cardStyle: "zenith_card_style_v2"
};

const THEMES = {
  crimsonNight: { id: "crimsonNight", label: "Багровая ночь" },
  blackCherry: { id: "blackCherry", label: "Тёмная вишня" },
  amberNight: { id: "amberNight", label: "Янтарь" },
  moonlight: { id: "moonlight", label: "Лунный свет" },
  frostLake: { id: "frostLake", label: "Ледяное озеро" },
  forestDweller: { id: "forestDweller", label: "Житель леса" },
  heatherMist: { id: "heatherMist", label: "Вереск" },
  eclipse: { id: "eclipse", label: "Затмение" },
  obsidian: { id: "obsidian", label: "Обсидиан" },
  ashen: { id: "ashen", label: "Пепел" },
  mist: { id: "mist", label: "Туман" },
  parchment: { id: "parchment", label: "Пергамент" },
  autumn: { id: "autumn", label: "Осень" }
};

const CARD_STYLES = {
  smooth: { id: "smooth", label: "Гладкие" },
  antique: { id: "antique", label: "Старинные" },
  sharp: { id: "sharp", label: "Острые" },
  velvet: { id: "velvet", label: "Бархатные" }
};

const ROOM_MODES = {
  duel: { id: "duel", label: "Дуэль" },
  teams: { id: "teams", label: "Команды" },
  ffa: { id: "ffa", label: "Каждый сам за себя" }
};

const CHANCES = { sand: 50, paw: 45, trip: 40, dodge: 40 };
const DAMAGE = { paw: 5, pawNeck: 10, trip: 10 };
const DOT = { paw: 5, pawNeck: 10, trip: 10 };
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
  accuracy: { id: "accuracy", label: "Шанс попадания", increment: 10, cap: 70, maxCount: 5, unit: "%" },
  dodge: { id: "dodge", label: "Шанс уворота", increment: 10, cap: 70, maxCount: 5, unit: "%" },
  clawPower: { id: "clawPower", label: "Сила удара лапой", increment: 5, cap: 30, maxCount: 5, unit: "%" },
  bitePower: { id: "bitePower", label: "Сила подсечки", increment: 5, cap: 30, maxCount: 5, unit: "%" }
};

const FEED_TYPES = {
  CREDITED_TRAINING: "credited_training",
  UPGRADE_GAINED: "upgrade_gained",
  PROMOTION_TRANSFER: "promotion_transfer"
};

const RESULT_TYPES = {
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
  UNFINISHED: "unfinished"
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
    currentRoomBadge: byId("currentRoomBadge"),
    openProfileBtn: byId("openProfileBtn"),
    openRoomBtn: byId("openRoomBtn"),
    openAdminBtn: byId("openAdminBtn"),
    openHistoryBtn: byId("openHistoryBtn"),
    openPublicProfilesBtn: byId("openPublicProfilesBtn"),
    mainLogoutBtn: byId("mainLogoutBtn"),
    themeSelect: byId("themeSelect"),
    cardStyleSelect: byId("cardStyleSelect"),
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
    roomResultCard: byId("roomResultCard"),
    roomModeSelect: byId("roomModeSelect"),
    saveRoomSettingsBtn: byId("saveRoomSettingsBtn"),
    roomValidationBox: byId("roomValidationBox")
  },
  battle: {
    screen: byId("battleScreen"),
    info: byId("battleInfo"),
    log: byId("battleLog"),
    actions: byId("battleActions"),
    attackMenu: byId("attackMenu"),
    attackBuilderList: byId("attackBuilderList"),
    attackActionBtn: byId("attackActionBtn"),
    defendActionBtn: byId("defendActionBtn"),
    escapeActionBtn: byId("escapeActionBtn"),
    confirmAttackPlanBtn: byId("confirmAttackPlanBtn"),
    backToActionsBtn: byId("backToActionsBtn"),
    opponentChosenBadge: byId("opponentChosenBadge")
  },
  history: { list: byId("myTrainingsList") },
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
    roomsList: byId("adminRoomsList"),
    matchesList: byId("adminMatchesList")
  }
};

const state = {
  user: null,
  userProfile: null,
  characters: {},
  currentRoomCode: "",
  currentScreen: "auth",
  isAdmin: false,
  isBlocked: false,
  activeTheme: readThemeLocal(),
  activeCardStyle: readCardStyleLocal(),
  expandedCharacterCards: {},
  currentRoom: null,
  roomTimerInterval: null,
  lastRenderedLogLength: 0,
  currentSeatId: "",
  publicCharactersCache: [],
  feedCache: [],
  adminUsersCache: {},
  adminRoomsCache: {},
  adminMatchesCache: {},
  attackPlanDraft: {},
  toastContainer: null,
  modalRoot: null,
  modalResolver: null,
  modalSerializer: null,
  unsubscribeRoom: null,
  unsubscribeFeed: null,
  unsubscribePublicCharacters: null,
  unsubscribeAdminUsers: null,
  unsubscribeAdminRooms: null,
  unsubscribeAdminMatches: null
};

function now() { return Date.now(); }
function text(node, value) { if (node) node.textContent = value; }
function html(node, value) { if (node) node.innerHTML = value; }
function show(node) { if (node) node.classList.remove("hidden"); }
function hide(node) { if (node) node.classList.add("hidden"); }
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function randomRoll() { return Math.floor(Math.random() * 100) + 1; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function safeArray(value) { return Array.isArray(value) ? value : []; }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

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
  parts.forEach(part => { if (part.type !== "literal") map[part.type] = part.value; });
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

function saveThemeLocal(themeId) { localStorage.setItem(LOCAL_KEYS.theme, themeId); }
function readThemeLocal() { return localStorage.getItem(LOCAL_KEYS.theme) || THEMES.crimsonNight.id; }
function saveCardStyleLocal(styleId) { localStorage.setItem(LOCAL_KEYS.cardStyle, styleId); }
function readCardStyleLocal() { return localStorage.getItem(LOCAL_KEYS.cardStyle) || CARD_STYLES.smooth.id; }
function saveActiveRoomLocal(roomCode) { localStorage.setItem(LOCAL_KEYS.activeRoom, roomCode || ""); }
function readActiveRoomLocal() { return localStorage.getItem(LOCAL_KEYS.activeRoom) || ""; }
function clearActiveRoomLocal() { localStorage.removeItem(LOCAL_KEYS.activeRoom); }

function applyTheme(themeId) {
  state.activeTheme = THEMES[themeId] ? themeId : THEMES.crimsonNight.id;
  document.body.dataset.theme = state.activeTheme;
  if (ui.shell.themeSelect) ui.shell.themeSelect.value = state.activeTheme;
  saveThemeLocal(state.activeTheme);
}

function applyCardStyle(styleId) {
  state.activeCardStyle = CARD_STYLES[styleId] ? styleId : CARD_STYLES.smooth.id;
  document.body.dataset.cardStyle = state.activeCardStyle;
  if (ui.shell.cardStyleSelect) ui.shell.cardStyleSelect.value = state.activeCardStyle;
  saveCardStyleLocal(state.activeCardStyle);
}

function renderThemeSelector() {
  if (!ui.shell.themeSelect) return;
  ui.shell.themeSelect.innerHTML = Object.values(THEMES).map(theme => `<option value="${theme.id}">${theme.label}</option>`).join("");
  ui.shell.themeSelect.value = state.activeTheme;
}

function renderCardStyleSelector() {
  if (!ui.shell.cardStyleSelect) return;
  ui.shell.cardStyleSelect.innerHTML = Object.values(CARD_STYLES).map(style => `<option value="${style.id}">${style.label}</option>`).join("");
  ui.shell.cardStyleSelect.value = state.activeCardStyle;
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getProfilePath(uid) { return `users/${uid}/profile`; }
function getCharactersPath(uid) { return `users/${uid}/characters`; }
function getCharacterPath(uid, characterId) { return `${getCharactersPath(uid)}/${characterId}`; }
function getRoomPath(roomCode) { return `rooms/${roomCode}`; }
function getFeedPath() { return "system/trainingFeed"; }
function getPairCooldownPath(pairKey) { return `system/pairCooldowns/${pairKey}`; }
function getPublicCharactersPath() { return "publicCharacters"; }
function getCurrentUserDisplayName() { return state.userProfile?.displayName || state.user?.email?.split("@")[0] || "Зенит"; }

function requireAuth() {
  if (!state.user) { notifyError("Сначала войди в аккаунт."); return false; }
  if (state.isBlocked) { notifyError("Ваш аккаунт заблокирован."); return false; }
  return true;
}

function getTrainingStatusLabel(status) { return status === "apprentice" ? "Оруженосец" : "Воитель"; }
function getRoomStatusLabel(status) {
  if (status === "lobby") return "лобби";
  if (status === "battle") return "идёт бой";
  if (status === "finished") return "бой завершён";
  return "—";
}
function getSeatBadgeClass(teamId, occupied) {
  if (!occupied) return "seat-badge-empty";
  if (teamId === "alpha") return "seat-badge-alpha";
  if (teamId === "beta") return "seat-badge-beta";
  return "seat-badge-solo";
}
function getTeamLabel(roomMode, teamId, seatId = "") {
  if (roomMode === "duel" || roomMode === "teams") {
    if (teamId === "alpha") return "Сторона А";
    if (teamId === "beta") return "Сторона Б";
    return "Без стороны";
  }
  if (!teamId || teamId === "solo") return "Сам за себя";
  if (teamId.startsWith("solo-")) return "Сам за себя";
  return seatId ? `Сольник ${seatId.replace("seat", "#")}` : "Сам за себя";
}
function getSeatIds() { return ["seat1","seat2","seat3","seat4","seat5","seat6"]; }
function getPairKeyForCharacters(aUid, aCharId, bUid, bCharId) { return [`${aUid}__${aCharId}`, `${bUid}__${bCharId}`].sort().join("--"); }
function getSelectedCharacterId() { return ui.profile.activeCharacterSelect?.value || state.userProfile?.activeCharacterId || ""; }
function getCharacterById(characterId) { return state.characters?.[characterId] || null; }
function getSelectedCharacterPayload() {
  const characterId = getSelectedCharacterId();
  const character = getCharacterById(characterId);
  if (!characterId || !character) return null;
  return { characterId, character: normalizeCharacter(character) };
}
function findMySeatId(room) {
  if (!state.user || !room?.seats) return "";
  return getSeatIds().find(seatId => room.seats?.[seatId]?.uid === state.user.uid) || "";
}
function getOccupiedSeats(room) {
  return getSeatIds().map(seatId => ({ seatId, ...(room?.seats?.[seatId] || {}) })).filter(item => Boolean(item.uid));
}
function getIncludedSeats(room) { return getOccupiedSeats(room).filter(item => item.included !== false); }
function getLivingParticipants(battle) {
  return Object.entries(battle?.participants || {}).filter(([, item]) => item && !item.defeated && !item.escaped && item.hp > 0).map(([seatId, item]) => ({ seatId, ...item }));
}
function isParticipantAlive(p) { return p && !p.defeated && !p.escaped && p.hp > 0; }

function ensureUiChrome() {
  if (!state.toastContainer) {
    const container = document.createElement("div");
    container.className = "zenith-toast-container";
    document.body.appendChild(container);
    state.toastContainer = container;
  }
  if (!state.modalRoot) {
    const root = document.createElement("div");
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
    byId("zenithModalCancel")?.addEventListener("click", () => resolveModal({ confirmed: false, value: null }));
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
  item.innerHTML = `<div class="zenith-toast-mark">✦</div><div class="zenith-toast-text">${escapeHtml(message)}</div>`;
  state.toastContainer.appendChild(item);
  setTimeout(() => item.classList.add("zenith-toast-visible"), 10);
  setTimeout(() => { item.classList.remove("zenith-toast-visible"); setTimeout(() => item.remove(), 250); }, 2600);
  if (variant === "default") text(ui.shell.globalNotice, message);
}
function notify(message) { toast(message, "default"); }
function notifyError(message) { toast(message, "danger"); }

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
  return new Promise(resolve => { state.modalResolver = resolve; });
}

async function openConfirmModal({ title, text: bodyText, confirmLabel = "Подтвердить", cancelLabel = "Отмена" }) {
  const result = await openModal({ title, text: bodyText, confirmLabel, cancelLabel, showCancel: true, allowClose: true });
  return result.confirmed;
}

async function openChoiceModal({ title, text: bodyText = "", choices = [], confirmLabel = "Выбрать", cancelLabel = "Отмена" }) {
  const bodyHtml = choices.map((choice, index) => `
    <label class="zenith-choice-item">
      <input type="radio" name="zenithChoice" value="${escapeHtml(choice.value)}" ${index === 0 ? "checked" : ""} />
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
    serializer: root => root.querySelector("input[name='zenithChoice']:checked")?.value || null
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
          <input id="zenithModalCharName" type="text" value="${escapeHtml(current.name || "")}" class="field-input" />
        </label>
        <label class="zenith-input-label">
          <span>Племя</span>
          <input id="zenithModalCharClan" type="text" value="${escapeHtml(current.clan || "")}" class="field-input" />
        </label>
      </div>
    `,
    confirmLabel: "Сохранить",
    cancelLabel: "Отмена",
    serializer: () => ({
      name: byId("zenithModalCharName")?.value.trim() || "",
      clan: byId("zenithModalCharClan")?.value.trim() || ""
    })
  });
  return result.confirmed ? result.value : null;
}


function createDefaultCombatBase() { return { accuracy: 0, dodge: 0, clawPower: 0, bitePower: 0 }; }
function createDefaultFavoriteCounters() { return { sand: 0, paw: 0, trip: 0 }; }
function createDefaultTargetCounters() { return { face: 0, frontLeft: 0, frontRight: 0, side: 0, ears: 0, neck: 0 }; }
function createDefaultAccuracyStats() { return { totalAttacks: 0, hits: 0, misses: 0 }; }

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
    cardStyleId: readCardStyleLocal(),
    createdAt: now(),
    updatedAt: now()
  };
}

function normalizeCharacter(raw) {
  const c = raw || {};
  return {
    name: c.name || "Без имени",
    clan: c.clan || "",
    trainingStatus: c.trainingStatus || "warrior",
    ownerNote: c.ownerNote || "",
    combatBase: {
      accuracy: c.combatBase?.accuracy ?? 0,
      dodge: c.combatBase?.dodge ?? 0,
      clawPower: c.combatBase?.clawPower ?? 0,
      bitePower: c.combatBase?.bitePower ?? 0
    },
    profileStats: {
      wins: c.profileStats?.wins ?? 0,
      losses: c.profileStats?.losses ?? 0,
      draws: c.profileStats?.draws ?? 0,
      lastBattleAt: c.profileStats?.lastBattleAt ?? 0,
      lastOpponentName: c.profileStats?.lastOpponentName ?? ""
    },
    training: {
      progress: {
        ...createDefaultTrainingProgress(),
        ...(c.training?.progress || {})
      },
      warriorUpgrades: safeArray(c.training?.warriorUpgrades),
      apprenticeUpgrades: safeArray(c.training?.apprenticeUpgrades),
      upgradeHistory: safeArray(c.training?.upgradeHistory),
      analytics: {
        favoriteMoveCounters: {
          ...createDefaultFavoriteCounters(),
          ...(c.training?.analytics?.favoriteMoveCounters || {})
        },
        accuracy: {
          ...createDefaultAccuracyStats(),
          ...(c.training?.analytics?.accuracy || {})
        },
        targets: {
          ...createDefaultTargetCounters(),
          ...(c.training?.analytics?.targets || {})
        }
      },
      promotion: {
        canTransferNow: Boolean(c.training?.promotion?.canTransferNow),
        transferredAt: c.training?.promotion?.transferredAt ?? 0,
        transferredCount: c.training?.promotion?.transferredCount ?? 0,
        lastTransferSummary: c.training?.promotion?.lastTransferSummary ?? ""
      }
    },
    createdAt: c.createdAt ?? now(),
    updatedAt: c.updatedAt ?? now()
  };
}

function createEmptySeat(seatId) {
  return {
    seatId,
    uid: "",
    profileName: "",
    characterId: "",
    characterName: "",
    clan: "",
    trainingStatus: "",
    included: false,
    ready: false,
    readyAt: 0,
    teamId: "alpha",
    joinedAt: 0
  };
}

function createDefaultSeats() {
  return Object.fromEntries(getSeatIds().map(seatId => [seatId, createEmptySeat(seatId)]));
}

function normalizeSeat(raw, seatId) {
  return {
    ...createEmptySeat(seatId),
    ...(raw || {}),
    seatId
  };
}

function createDefaultRoom(mode = "duel", creatorPayload = null, roomCode = "") {
  const seats = createDefaultSeats();
  if (creatorPayload) {
    seats.seat1 = {
      seatId: "seat1",
      uid: creatorPayload.uid,
      profileName: creatorPayload.profileName,
      characterId: creatorPayload.characterId,
      characterName: creatorPayload.characterName,
      clan: creatorPayload.clan,
      trainingStatus: creatorPayload.trainingStatus,
      included: true,
      ready: false,
      readyAt: 0,
      teamId: mode === "ffa" ? "solo-seat1" : "alpha",
      joinedAt: now()
    };
  }
  return {
    code: roomCode,
    createdAt: now(),
    createdBy: creatorPayload?.uid || "",
    settings: { mode, roomName: "", allowUpToSix: true },
    status: "lobby",
    seats,
    battle: null,
    result: null
  };
}

function normalizeRoom(raw, code = "") {
  const room = raw || {};
  const mode = room.settings?.mode || "duel";
  const seats = createDefaultSeats();
  getSeatIds().forEach(seatId => {
    seats[seatId] = normalizeSeat(room.seats?.[seatId], seatId);
  });

  return {
    code: room.code || code,
    createdAt: room.createdAt || 0,
    createdBy: room.createdBy || "",
    settings: {
      mode,
      roomName: room.settings?.roomName || "",
      allowUpToSix: room.settings?.allowUpToSix !== false
    },
    status: room.status || "lobby",
    seats,
    battle: room.battle ? normalizeBattle(room.battle, mode) : null,
    result: room.result || null
  };
}

function createDefaultEffects() {
  return {
    stunTurns: 0,
    accuracyPenaltyTurns: 0,
    dotDamage: 0,
    pendingDotDamage: 0,
    dodgesLeft: MAX_DODGES
  };
}

function createBattleParticipantFromSeat(seat) {
  return {
    uid: seat.uid,
    profileName: seat.profileName,
    characterId: seat.characterId,
    name: seat.characterName,
    clan: seat.clan,
    trainingStatus: seat.trainingStatus,
    teamId: seat.teamId,
    hp: 100,
    defeated: false,
    escaped: false,
    effects: createDefaultEffects(),
    analytics: {
      favoriteMoveCounters: createDefaultFavoriteCounters(),
      accuracy: createDefaultAccuracyStats(),
      targets: createDefaultTargetCounters()
    }
  };
}

function createBattleState(room) {
  const included = getIncludedSeats(room);
  const participants = {};
  included.forEach(seat => { participants[seat.seatId] = createBattleParticipantFromSeat(seat); });

  return {
    roomMode: room.settings.mode,
    round: 1,
    participants,
    submissions: {},
    lastMessage: "Схватка началась. Выберите действия на первый ход.",
    log: [{ id: `start_${now()}`, round: 0, text: "Схватка началась.", kind: "system", createdAt: now() }],
    startedAt: now(),
    updatedAt: now(),
    timeoutAt: now() + INACTIVITY_TIMEOUT_MS,
    winnerTeamId: "",
    winnerSeatId: "",
    finished: false
  };
}

function normalizeBattle(battle, roomMode = "duel") {
  const participants = {};
  Object.entries(battle?.participants || {}).forEach(([seatId, item]) => {
    participants[seatId] = {
      uid: item.uid || "",
      profileName: item.profileName || "",
      characterId: item.characterId || "",
      name: item.name || "Без имени",
      clan: item.clan || "",
      trainingStatus: item.trainingStatus || "warrior",
      teamId: item.teamId || (roomMode === "ffa" ? `solo-${seatId}` : "alpha"),
      hp: item.hp ?? 100,
      defeated: Boolean(item.defeated),
      escaped: Boolean(item.escaped),
      effects: { ...createDefaultEffects(), ...(item.effects || {}) },
      analytics: {
        favoriteMoveCounters: { ...createDefaultFavoriteCounters(), ...(item.analytics?.favoriteMoveCounters || {}) },
        accuracy: { ...createDefaultAccuracyStats(), ...(item.analytics?.accuracy || {}) },
        targets: { ...createDefaultTargetCounters(), ...(item.analytics?.targets || {}) }
      }
    };
  });

  return {
    roomMode,
    round: battle?.round ?? 1,
    participants,
    submissions: battle?.submissions || {},
    lastMessage: battle?.lastMessage || "Схватка идёт.",
    log: safeArray(battle?.log),
    startedAt: battle?.startedAt ?? now(),
    updatedAt: battle?.updatedAt ?? now(),
    timeoutAt: battle?.timeoutAt ?? (now() + INACTIVITY_TIMEOUT_MS),
    winnerTeamId: battle?.winnerTeamId || "",
    winnerSeatId: battle?.winnerSeatId || "",
    finished: Boolean(battle?.finished)
  };
}

function getThresholdsForStatus(status) {
  return status === "apprentice" ? TRAINING_THRESHOLDS.apprentice : TRAINING_THRESHOLDS.warrior;
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
  return safeArray(normalized.training[getBranchKeyForCharacter(normalized)]);
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
  const bonus = getUpgradeDistributionFromPool(getCurrentUpgradePool(normalized));
  return {
    accuracy: normalized.combatBase.accuracy + bonus.accuracy,
    dodge: normalized.combatBase.dodge + bonus.dodge,
    clawPower: normalized.combatBase.clawPower + bonus.clawPower,
    bitePower: normalized.combatBase.bitePower + bonus.bitePower
  };
}
function getRemainingUpgradeSlotsByType(character, type) {
  const definition = UPGRADE_DEFINITIONS[type];
  if (!definition) return 0;
  const count = getUpgradeCountByType(getCurrentUpgradePool(character), type);
  return Math.max(0, definition.maxCount - count);
}
function getRemainingUpgradeSlotsTotal(character) {
  return Object.keys(UPGRADE_DEFINITIONS).reduce((sum, type) => sum + getRemainingUpgradeSlotsByType(character, type), 0);
}
function canEarnAnyMoreUpgrades(character) { return getRemainingUpgradeSlotsTotal(character) > 0; }
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
  return { id: `${type}_${Math.random().toString(36).slice(2, 9)}`, type, label: definition.label, value: definition.increment, sourceStatus, matchId, createdAt: now() };
}
function getPendingChoiceCount(character) { return normalizeCharacter(character).training.progress.pendingUpgradePoints || 0; }
function addPendingUpgradePoints(character, count = 1) {
  const next = deepClone(normalizeCharacter(character));
  const allowed = Math.min(count, getRemainingUpgradeSlotsTotal(next));
  next.training.progress.pendingUpgradePoints += allowed;
  next.updatedAt = now();
  return next;
}
function consumePendingUpgradePoint(character) {
  const next = deepClone(normalizeCharacter(character));
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
  next.training.upgradeHistory.unshift({ id: `history_${Math.random().toString(36).slice(2, 9)}`, action: "earned_upgrade", label: record.label, type, createdAt: now(), matchId });
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
  return "Подсечка";
}
function getAccuracyPercent(character) {
  const stats = normalizeCharacter(character).training.analytics.accuracy;
  if (!stats.totalAttacks) return 0;
  return Math.round((stats.hits / stats.totalAttacks) * 100);
}

async function loadUserProfile(uid) {
  const snapshot = await get(ref(db, getProfilePath(uid)));
  return snapshot.exists() ? snapshot.val() : null;
}
async function ensureOwnProfile(user, fallbackName = "") {
  const profileRef = ref(db, getProfilePath(user.uid));
  const snapshot = await get(profileRef);
  if (snapshot.exists()) return snapshot.val();
  const baseName = fallbackName || user.email?.split("@")[0] || "Зенит";
  const profile = createDefaultProfile(baseName);
  await set(profileRef, profile);
  return profile;
}
async function loadOwnCharacters() {
  if (!state.user) return {};
  const snapshot = await get(ref(db, getCharactersPath(state.user.uid)));
  const value = snapshot.exists() ? snapshot.val() : {};
  state.characters = Object.fromEntries(Object.entries(value).map(([id, character]) => [id, normalizeCharacter(character)]));
  return state.characters;
}
function getSortedCharacters(source = state.characters) {
  return Object.entries(source || {}).map(([id, value]) => ({ id, ...normalizeCharacter(value) })).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
}
async function pushFeedEntry(payload) {
  const feedRef = push(ref(db, getFeedPath()));
  await set(feedRef, payload);
}
function cleanupRoomWatcher() {
  if (typeof state.unsubscribeRoom === "function") {
    state.unsubscribeRoom();
    state.unsubscribeRoom = null;
  }
}
function cleanupExternalWatchers() {
  if (typeof state.unsubscribeFeed === "function") { state.unsubscribeFeed(); state.unsubscribeFeed = null; }
  if (typeof state.unsubscribePublicCharacters === "function") { state.unsubscribePublicCharacters(); state.unsubscribePublicCharacters = null; }
  if (typeof state.unsubscribeAdminUsers === "function") { state.unsubscribeAdminUsers(); state.unsubscribeAdminUsers = null; }
  if (typeof state.unsubscribeAdminRooms === "function") { state.unsubscribeAdminRooms(); state.unsubscribeAdminRooms = null; }
  if (typeof state.unsubscribeAdminMatches === "function") { state.unsubscribeAdminMatches(); state.unsubscribeAdminMatches = null; }
}

async function syncPublicCharacter(uid, characterId) {
  const character = getCharacterById(characterId);
  if (!character) return;
  await update(ref(db, `${getPublicCharactersPath()}/${uid}__${characterId}`), {
    uid,
    characterId,
    ownerName: getCurrentUserDisplayName(),
    name: character.name,
    clan: character.clan,
    trainingStatus: character.trainingStatus,
    updatedAt: now(),
    ownerNote: character.ownerNote,
    profileStats: character.profileStats,
    training: character.training
  });
}
async function removePublicCharacter(uid, characterId) { await remove(ref(db, `${getPublicCharactersPath()}/${uid}__${characterId}`)); }

async function saveProfileStatus() {
  if (!requireAuth()) return;
  const statusValue = ui.profile.statusInput?.value.trim() || "";
  await update(ref(db, getProfilePath(state.user.uid)), {
    displayName: state.userProfile?.displayName || getCurrentUserDisplayName(),
    status: statusValue || "✦ Наблюдает за бабочками",
    updatedAt: now()
  });
  state.userProfile = await loadUserProfile(state.user.uid);
  notify("Профиль обновлён.");
  renderAll();
}

async function savePortraitSymbol() {
  if (!requireAuth()) return;
  const symbol = ui.profile.symbolSelect?.value || "✦";
  await update(ref(db, getProfilePath(state.user.uid)), { portraitSymbol: symbol, updatedAt: now() });
  state.userProfile = await loadUserProfile(state.user.uid);
  notify("Знак профиля обновлён.");
  renderAll();
}

async function saveActiveCharacter(characterId) {
  if (!requireAuth()) return;
  await update(ref(db, getProfilePath(state.user.uid)), { activeCharacterId: characterId || "", updatedAt: now() });
  state.userProfile = await loadUserProfile(state.user.uid);
  renderAll();
}

async function saveOwnerNote(characterId, noteText) {
  if (!requireAuth() || !characterId) return;
  await update(ref(db, getCharacterPath(state.user.uid, characterId)), { ownerNote: noteText || "", updatedAt: now() });
  await loadOwnCharacters();
  await syncPublicCharacter(state.user.uid, characterId);
  notify("Заметка сохранена.");
  renderAll();
}

async function addCharacter() {
  if (!requireAuth()) return;
  const name = ui.profile.charNameInput?.value.trim() || "";
  const clan = ui.profile.charClanInput?.value.trim() || "";
  const trainingStatus = ui.profile.charTrainingStatusSelect?.value || "warrior";
  if (!name) { notifyError("Впиши имя персонажа."); return; }

  const charRef = push(ref(db, getCharactersPath(state.user.uid)));
  const newCharacter = createDefaultCharacter(name, clan, trainingStatus);
  await set(charRef, newCharacter);

  if (!state.userProfile?.activeCharacterId) {
    await update(ref(db, getProfilePath(state.user.uid)), { activeCharacterId: charRef.key, updatedAt: now() });
    state.userProfile = await loadUserProfile(state.user.uid);
  }

  ui.profile.charNameInput.value = "";
  ui.profile.charClanInput.value = "";
  ui.profile.charTrainingStatusSelect.value = "warrior";

  await loadOwnCharacters();
  await syncPublicCharacter(state.user.uid, charRef.key);
  notify("Новый персонаж добавлен.");
  renderAll();
}

async function editCharacter(characterId) {
  if (!requireAuth()) return;
  const character = getCharacterById(characterId);
  if (!character) return;
  const formValue = await openCharacterEditModal(character);
  if (!formValue) return;
  const nextName = formValue.name || character.name || "Без имени";
  const nextClan = formValue.clan || "";
  await update(ref(db, getCharacterPath(state.user.uid, characterId)), { name: nextName, clan: nextClan, updatedAt: now() });
  await loadOwnCharacters();
  await syncPublicCharacter(state.user.uid, characterId);
  notify("Персонаж обновлён.");
  renderAll();
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
    await update(ref(db, getProfilePath(state.user.uid)), { activeCharacterId: "", updatedAt: now() });
    state.userProfile = await loadUserProfile(state.user.uid);
  }
  await removePublicCharacter(state.user.uid, characterId);
  await loadOwnCharacters();
  notify("Персонаж удалён.");
  renderAll();
}

async function chooseUpgradeForCharacter(characterId, matchId = "") {
  if (!requireAuth()) return false;
  const character = getCharacterById(characterId);
  if (!character) return false;
  const normalized = normalizeCharacter(character);
  const pending = getPendingChoiceCount(normalized);
  if (pending <= 0) { notifyError("У персонажа нет доступных улучшений."); return false; }

  const choice = await openChoiceModal({
    title: "Выбор улучшения",
    text: `${normalized.name} может получить улучшение. Доступно к выбору: ${pending}.`,
    choices: [
      { value: "accuracy", label: "Повысить шанс попадания" },
      { value: "dodge", label: "Повысить шанс уворота" },
      { value: "power", label: "Повысить силу удара" }
    ]
  });
  if (!choice) return false;

  let finalType = choice;
  if (choice === "power") {
    const powerChoice = await openChoiceModal({
      title: "Сила удара",
      text: "Какой именно приём нужно усилить?",
      choices: [
        { value: "clawPower", label: "Удар лапой" },
        { value: "bitePower", label: "Подсечка" }
      ]
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
  await syncPublicCharacter(state.user.uid, characterId);
  await pushFeedEntry({
    type: FEED_TYPES.UPGRADE_GAINED,
    createdAt: now(),
    text: `Персонаж ${updatedCharacter.name} получает улучшение «${UPGRADE_DEFINITIONS[finalType].label}».`
  });
  notify(`Улучшение «${UPGRADE_DEFINITIONS[finalType].label}» получено.`);
  renderAll();
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
    text: transferLimit > 0 ? `${normalized.name} может перенести ${transferLimit} улучшение(й).` : `${normalized.name} будет посвящён в воители без переноса улучшений.`,
    confirmLabel: "Продолжить"
  });
  if (!ok) return false;

  const selectedIds = [];
  if (transferLimit > 0) {
    for (let i = 0; i < transferLimit; i += 1) {
      const remaining = apprenticeUpgrades.filter(item => !selectedIds.includes(item.id));
      if (!remaining.length) break;
      const selected = await openChoiceModal({
        title: `Перенос улучшения ${i + 1} из ${transferLimit}`,
        text: "Выберите улучшение, которое нужно сохранить.",
        choices: remaining.map(item => ({ value: item.id, label: item.label })),
        cancelLabel: "Пропустить"
      });
      if (!selected) break;
      if (!selectedIds.includes(selected)) selectedIds.push(selected);
    }
  }

  const transferred = apprenticeUpgrades.filter(item => selectedIds.includes(item.id));
  const updatedCharacter = deepClone(normalized);
  updatedCharacter.trainingStatus = "warrior";
  updatedCharacter.training.warriorUpgrades = [...updatedCharacter.training.warriorUpgrades, ...transferred.map(item => ({ ...item, sourceStatus: "apprentice" }))];
  updatedCharacter.training.apprenticeUpgrades = [];
  updatedCharacter.training.promotion.canTransferNow = false;
  updatedCharacter.training.promotion.transferredAt = now();
  updatedCharacter.training.promotion.transferredCount = transferred.length;
  updatedCharacter.training.promotion.lastTransferSummary = transferred.length ? transferred.map(item => item.label).join(", ") : "без переноса";
  updatedCharacter.training.upgradeHistory.unshift({
    id: `promotion_${Math.random().toString(36).slice(2, 9)}`,
    action: "promotion_transfer",
    label: updatedCharacter.training.promotion.lastTransferSummary,
    createdAt: now()
  });

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    trainingStatus: "warrior",
    training: updatedCharacter.training,
    updatedAt: now()
  });
  await loadOwnCharacters();
  await syncPublicCharacter(state.user.uid, characterId);
  await pushFeedEntry({ type: FEED_TYPES.PROMOTION_TRANSFER, createdAt: now(), text: `Персонаж ${updatedCharacter.name} посвящается в воители.` });
  notify(`${updatedCharacter.name} посвящён в воители.`);
  renderAll();
  return true;
}

function getEnemiesForSeat(room, seatId, participantMap = null) {
  const mode = room?.settings?.mode || room?.battle?.roomMode || "duel";
  const source = participantMap || room?.seats || {};
  const self = source[seatId];
  if (!self) return [];

  const aliveCheck = participantMap ? entry => !entry.defeated && !entry.escaped && entry.hp > 0 : entry => entry.uid && entry.included !== false;
  return Object.entries(source)
    .filter(([otherSeatId, entry]) => {
      if (otherSeatId === seatId) return false;
      if (!entry) return false;
      if (!aliveCheck(entry)) return false;
      if (mode === "ffa") return true;
      return entry.teamId !== self.teamId;
    })
    .map(([otherSeatId, entry]) => ({ seatId: otherSeatId, ...entry }));
}

function validateRoomComposition(room) {
  const normalized = normalizeRoom(room, room?.code);
  const included = getIncludedSeats(normalized);
  const mode = normalized.settings.mode;
  if (!included.length) return { valid: false, title: "Нет участников", reason: "В комнате ещё нет активных персонажей." };

  if (mode === "duel") {
    if (included.length !== 2) return { valid: false, title: "Дуэль", reason: "Для дуэли нужны ровно 2 активных персонажа." };
    const teams = new Set(included.map(item => item.teamId).filter(Boolean));
    if (teams.size !== 2) return { valid: false, title: "Дуэль", reason: "В дуэли бойцы должны быть на разных сторонах." };
    return { valid: true, title: "Дуэль", reason: "Состав подходит для боя 1 × 1." };
  }

  if (mode === "ffa") {
    if (included.length !== 3) return { valid: false, title: "FFA", reason: "В режиме «каждый сам за себя» должно быть ровно 3 активных персонажа." };
    return { valid: true, title: "FFA", reason: "Состав подходит для тройной схватки каждый сам за себя." };
  }

  const alpha = included.filter(item => item.teamId === "alpha");
  const beta = included.filter(item => item.teamId === "beta");
  if (!alpha.length || !beta.length) return { valid: false, title: "Команды", reason: "Для командной схватки нужны обе стороны." };
  if (alpha.length > 3 || beta.length > 3) return { valid: false, title: "Команды", reason: "На одной стороне не может быть больше трёх бойцов." };
  if (included.length > 6) return { valid: false, title: "Команды", reason: "Максимум — 6 бойцов в комнате." };
  return { valid: true, title: "Команды", reason: `Состав подходит: ${alpha.length} × ${beta.length}.` };
}

function getReadyCountdownLeft(room) {
  const readyTimes = getIncludedSeats(room).map(item => item.readyAt || 0).filter(Boolean);
  if (!readyTimes.length) return 0;
  const earliest = Math.min(...readyTimes);
  return Math.max(0, earliest + READY_TIMEOUT_MS - now());
}

function getBattleCountdownLeft(room) {
  const battle = room?.battle ? normalizeBattle(room.battle, room.settings?.mode) : null;
  if (!battle?.timeoutAt) return 0;
  return Math.max(0, battle.timeoutAt - now());
}

function getRoomCreditPreview(room) {
  const validation = validateRoomComposition(room);
  if (!validation.valid) return { badge: "Зачёта не будет", reason: validation.reason };
  if (room?.status === "finished") return { badge: "Итог сохранён", reason: "Бой уже завершён." };
  return { badge: "Зачёт возможен", reason: "При корректном завершении бойцы смогут получить зачёт с учётом дневного лимита и откатов по соперникам." };
}

async function bootstrapAdmin(user) {
  if (!user?.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
async function checkAdmin(user) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

async function handleRegister() {
  const accountName = ui.auth.accountName?.value.trim() || "";
  const email = ui.auth.email?.value.trim() || "";
  const password = ui.auth.password?.value.trim() || "";
  if (!accountName || !email || !password) { notifyError("Заполни имя профиля, почту и пароль."); return; }
  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(db, getProfilePath(credentials.user.uid)), createDefaultProfile(accountName));
  text(ui.auth.status, `Вы вошли как ${accountName}.`);
}

async function handleLogin() {
  const email = ui.auth.email?.value.trim() || "";
  const password = ui.auth.password?.value.trim() || "";
  if (!email || !password) { notifyError("Впиши почту и пароль."); return; }
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureOwnProfile(credentials.user);
  text(ui.auth.status, `Вы вошли как ${profile.displayName || "Зенит"}.`);
}

async function handleLogout() {
  await signOut(auth);
  state.currentRoomCode = "";
  state.currentSeatId = "";
  clearActiveRoomLocal();
  text(ui.auth.status, "Вы не вошли в аккаунт.");
  notify("Вы вышли из аккаунта.");
}

async function loadRecentFeedEntries() {
  const feedQuery = query(ref(db, getFeedPath()), orderByChild("createdAt"), limitToLast(FEED_LIMIT));
  const snapshot = await get(feedQuery);
  if (!snapshot.exists()) { state.feedCache = []; return []; }
  state.feedCache = Object.values(snapshot.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return state.feedCache;
}

function renderFeedTicker() {
  if (!ui.shell.feedTicker) return;
  if (!state.feedCache.length) {
    ui.shell.feedTicker.innerHTML = `<span class="feed-empty">✦ Лента пока пустует.</span>`;
    return;
  }
  ui.shell.feedTicker.innerHTML = state.feedCache.slice(0, 10).map(item => `<span class="feed-item">✦ ${escapeHtml(item.text || "Событие")}</span>`).join("");
}

async function startGlobalWatchers() {
  cleanupExternalWatchers();
  const feedQuery = query(ref(db, getFeedPath()), orderByChild("createdAt"), limitToLast(FEED_LIMIT));
  state.unsubscribeFeed = onValue(feedQuery, snapshot => {
    state.feedCache = snapshot.exists() ? Object.values(snapshot.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];
    renderFeedTicker();
  });

  state.unsubscribePublicCharacters = onValue(ref(db, getPublicCharactersPath()), snapshot => {
    state.publicCharactersCache = snapshot.exists() ? Object.values(snapshot.val()).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru")) : [];
    renderPublicProfiles();
  });

  state.unsubscribeAdminMatches = onValue(ref(db, "matches"), snapshot => {
    state.adminMatchesCache = snapshot.exists() ? snapshot.val() : {};
    renderHistory();
    if (state.isAdmin) renderAdmin();
  });

  if (state.isAdmin) {
    state.unsubscribeAdminUsers = onValue(ref(db, "users"), snapshot => {
      state.adminUsersCache = snapshot.exists() ? snapshot.val() : {};
      renderAdmin();
    });
    state.unsubscribeAdminRooms = onValue(ref(db, "rooms"), snapshot => {
      state.adminRoomsCache = snapshot.exists() ? snapshot.val() : {};
      renderAdmin();
    });
  }
}

async function handleSignedInUser(user) {
  state.user = user;
  await bootstrapAdmin(user);
  state.isAdmin = await checkAdmin(user);

  state.userProfile = await loadUserProfile(user.uid);
  if (!state.userProfile) state.userProfile = await ensureOwnProfile(user, "Зенит");

  state.isBlocked = Boolean(state.userProfile?.blocked);
  applyTheme(state.userProfile?.themeId || readThemeLocal());
  applyCardStyle(state.userProfile?.cardStyleId || readCardStyleLocal());
  await loadOwnCharacters();
  text(ui.auth.status, `Вы вошли как ${state.userProfile?.displayName || "Зенит"}.`);
  await startGlobalWatchers();
  await tryAutoJoinSavedRoom();
  renderAll();
}

function handleSignedOutUser() {
  state.user = null;
  state.userProfile = null;
  state.characters = {};
  state.currentRoomCode = "";
  state.currentSeatId = "";
  state.currentRoom = null;
  state.isAdmin = false;
  state.isBlocked = false;
  state.publicCharactersCache = [];
  state.feedCache = [];
  state.adminUsersCache = {};
  state.adminRoomsCache = {};
  state.adminMatchesCache = {};
  state.attackPlanDraft = {};
  cleanupRoomWatcher();
  cleanupExternalWatchers();
  stopRoomTimer();
  applyTheme(readThemeLocal());
  applyCardStyle(readCardStyleLocal());
  text(ui.auth.status, "Вы не вошли в аккаунт.");
  renderAll();
}


async function createRoom() {
  if (!requireAuth()) return;
  const selected = getSelectedCharacterPayload();
  if (!selected) { notifyError("Сначала выбери персонажа в профиле."); return; }

  let roomCode = generateRoomCode();
  let tries = 0;
  while (tries < 10) {
    const snapshot = await get(ref(db, getRoomPath(roomCode)));
    if (!snapshot.exists()) break;
    roomCode = generateRoomCode();
    tries += 1;
  }

  const room = createDefaultRoom("duel", {
    uid: state.user.uid,
    profileName: getCurrentUserDisplayName(),
    characterId: selected.characterId,
    characterName: selected.character.name,
    clan: selected.character.clan || "",
    trainingStatus: selected.character.trainingStatus || "warrior"
  }, roomCode);

  await set(ref(db, getRoomPath(roomCode)), room);
  state.currentRoomCode = roomCode;
  saveActiveRoomLocal(roomCode);
  watchCurrentRoom(roomCode);
  notify(`Комната ${roomCode} создана.`);
}

async function tryAutoJoinSavedRoom() {
  if (!state.user) return;
  const roomCode = readActiveRoomLocal();
  if (!roomCode) return;
  const snapshot = await get(ref(db, getRoomPath(roomCode)));
  if (!snapshot.exists()) {
    clearActiveRoomLocal();
    return;
  }
  state.currentRoomCode = roomCode;
  watchCurrentRoom(roomCode);
}

function getFirstEmptySeatId(room) {
  return getSeatIds().find(seatId => !room.seats?.[seatId]?.uid) || "";
}

async function joinRoom() {
  if (!requireAuth()) return;
  const roomCode = (ui.room.roomCodeInput?.value || "").trim().toUpperCase();
  const selected = getSelectedCharacterPayload();

  if (!roomCode) { notifyError("Впиши код комнаты."); return; }
  if (!selected) { notifyError("Сначала выбери персонажа в профиле."); return; }

  const roomRef = ref(db, getRoomPath(roomCode));
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) { notifyError("Комната не найдена."); return; }

  const room = normalizeRoom(snapshot.val(), roomCode);
  const existingSeatId = findMySeatId(room);
  if (existingSeatId) {
    state.currentRoomCode = roomCode;
    saveActiveRoomLocal(roomCode);
    watchCurrentRoom(roomCode);
    notify(`Вы вернулись в комнату ${roomCode}.`);
    return;
  }

  const emptySeatId = getFirstEmptySeatId(room);
  if (!emptySeatId) { notifyError("В комнате уже шесть игроков."); return; }

  const teamId = room.settings.mode === "ffa"
    ? `solo-${emptySeatId}`
    : room.settings.mode === "duel"
      ? (getOccupiedSeats(room).some(item => item.teamId === "alpha") ? "beta" : "alpha")
      : "alpha";

  await update(roomRef, {
    [`seats/${emptySeatId}`]: {
      seatId: emptySeatId,
      uid: state.user.uid,
      profileName: getCurrentUserDisplayName(),
      characterId: selected.characterId,
      characterName: selected.character.name,
      clan: selected.character.clan || "",
      trainingStatus: selected.character.trainingStatus || "warrior",
      included: true,
      ready: false,
      readyAt: 0,
      teamId,
      joinedAt: now()
    },
    status: "lobby",
    result: null,
    battle: null
  });

  state.currentRoomCode = roomCode;
  saveActiveRoomLocal(roomCode);
  watchCurrentRoom(roomCode);
  notify(`Вы вошли в комнату ${roomCode}.`);
}

async function leaveRoom() {
  if (!requireAuth()) return;
  if (!state.currentRoomCode || !state.currentRoom) { notifyError("Вы сейчас не в комнате."); return; }

  const room = normalizeRoom(state.currentRoom, state.currentRoomCode);
  const mySeatId = findMySeatId(room);
  if (!mySeatId) {
    state.currentRoomCode = "";
    state.currentSeatId = "";
    state.currentRoom = null;
    clearActiveRoomLocal();
    cleanupRoomWatcher();
    renderAll();
    return;
  }

  if (room.status === "battle") {
    notifyError("Во время боя нужно использовать действие «Убежать», а не обычный выход.");
    return;
  }

  const occupiedAfter = getOccupiedSeats(room).filter(item => item.seatId !== mySeatId);
  if (!occupiedAfter.length) {
    await remove(ref(db, getRoomPath(room.code)));
  } else {
    const patch = {
      [`seats/${mySeatId}`]: createEmptySeat(mySeatId),
      status: "lobby",
      battle: null,
      result: null
    };
    if (room.createdBy === state.user.uid) patch.createdBy = occupiedAfter[0].uid;
    await update(ref(db, getRoomPath(room.code)), patch);
  }

  state.currentRoomCode = "";
  state.currentSeatId = "";
  state.currentRoom = null;
  clearActiveRoomLocal();
  cleanupRoomWatcher();
  stopRoomTimer();
  notify("Вы покинули комнату.");
  renderAll();
}

async function saveRoomSettings() {
  if (!requireAuth()) return;
  if (!state.currentRoomCode || !state.currentRoom) { notifyError("Сначала войди в комнату."); return; }

  const room = normalizeRoom(state.currentRoom, state.currentRoomCode);
  if (room.createdBy !== state.user.uid) { notifyError("Режим комнаты может менять только создатель."); return; }
  if (room.status === "battle") { notifyError("Нельзя менять режим во время боя."); return; }

  const mode = ui.room.roomModeSelect?.value || "duel";
  const patch = {
    "settings/mode": mode,
    status: "lobby",
    result: null,
    battle: null
  };

  const occupied = getOccupiedSeats(room);
  occupied.forEach((seat, index) => {
    let teamId = seat.teamId || "alpha";
    if (mode === "ffa") teamId = `solo-${seat.seatId}`;
    if (mode === "duel") teamId = index === 0 ? "alpha" : index === 1 ? "beta" : "alpha";
    patch[`seats/${seat.seatId}/teamId`] = teamId;
    patch[`seats/${seat.seatId}/included`] = mode === "duel" ? index < 2 : mode === "ffa" ? index < 3 : true;
    patch[`seats/${seat.seatId}/ready`] = false;
    patch[`seats/${seat.seatId}/readyAt`] = 0;
  });

  await update(ref(db, getRoomPath(room.code)), patch);
  notify("Режим комнаты обновлён.");
}

async function updateSeatConfig(seatId, { teamId, included, characterId }) {
  if (!requireAuth()) return;
  if (!state.currentRoomCode || !state.currentRoom) return;

  const room = normalizeRoom(state.currentRoom, state.currentRoomCode);
  if (room.status === "battle") {
    notifyError("Нельзя менять место во время боя.");
    return;
  }
  const seat = room.seats?.[seatId];
  if (!seat || seat.uid !== state.user.uid) {
    notifyError("Можно настраивать только своё место.");
    return;
  }

  const patch = {};
  if (typeof included === "boolean") patch[`seats/${seatId}/included`] = included;
  if (teamId) patch[`seats/${seatId}/teamId`] = teamId;
  patch[`seats/${seatId}/ready`] = false;
  patch[`seats/${seatId}/readyAt`] = 0;

  if (characterId && characterId !== seat.characterId) {
    const character = getCharacterById(characterId);
    if (character) {
      patch[`seats/${seatId}/characterId`] = characterId;
      patch[`seats/${seatId}/characterName`] = character.name;
      patch[`seats/${seatId}/clan`] = character.clan || "";
      patch[`seats/${seatId}/trainingStatus`] = character.trainingStatus || "warrior";
    }
  }

  await update(ref(db, getRoomPath(room.code)), patch);
  notify("Место в комнате обновлено.");
}

async function toggleReady() {
  if (!requireAuth()) return;
  if (!state.currentRoomCode || !state.currentRoom) { notifyError("Сначала войди в комнату."); return; }

  const room = normalizeRoom(state.currentRoom, state.currentRoomCode);
  const mySeatId = findMySeatId(room);
  if (!mySeatId) { notifyError("Вы не занимаете место в этой комнате."); return; }
  if (room.status !== "lobby") { notifyError("Готовность меняется только в лобби."); return; }

  const seat = room.seats[mySeatId];
  if (!seat.included) { notifyError("Сначала включи своего персонажа в состав."); return; }

  await update(ref(db, getRoomPath(room.code)), {
    [`seats/${mySeatId}/ready`]: !seat.ready,
    [`seats/${mySeatId}/readyAt`]: !seat.ready ? now() : 0
  });
  notify(!seat.ready ? "Готовность подтверждена." : "Готовность снята.");
}

function areIncludedSeatsReady(room) {
  const included = getIncludedSeats(room);
  return Boolean(included.length) && included.every(item => item.ready === true);
}

function applyAutoStunSubmissions(battle) {
  Object.entries(battle.participants).forEach(([seatId, participant]) => {
    if (participant.effects.stunTurns > 0 && !battle.submissions[seatId] && isParticipantAlive(participant)) {
      battle.submissions[seatId] = { type: "stunned", attacks: [], submittedAt: now() };
    }
  });
}

async function startBattle() {
  if (!requireAuth()) return;
  if (!state.currentRoomCode || !state.currentRoom) { notifyError("Сначала войди в комнату."); return; }

  const room = normalizeRoom(state.currentRoom, state.currentRoomCode);
  if (room.createdBy !== state.user.uid) { notifyError("Бой запускает только создатель комнаты."); return; }
  if (room.status === "battle") { notifyError("Бой уже идёт."); return; }

  const validation = validateRoomComposition(room);
  if (!validation.valid) { notifyError(validation.reason); return; }
  if (!areIncludedSeatsReady(room)) { notifyError("Сначала все активные бойцы должны нажать готовность."); return; }

  const battle = createBattleState(room);
  applyAutoStunSubmissions(battle);
  await update(ref(db, getRoomPath(room.code)), { status: "battle", battle, result: null });
  notify("Бой начался.");
}

async function watchCurrentRoom(roomCode) {
  cleanupRoomWatcher();
  if (!roomCode) return;

  state.unsubscribeRoom = onValue(ref(db, getRoomPath(roomCode)), async snapshot => {
    if (!snapshot.exists()) {
      state.currentRoom = null;
      state.currentSeatId = "";
      state.currentRoomCode = "";
      clearActiveRoomLocal();
      stopRoomTimer();
      renderAll();
      return;
    }

    const room = normalizeRoom(snapshot.val(), roomCode);
    state.currentRoom = room;
    state.currentRoomCode = roomCode;
    state.currentSeatId = findMySeatId(room);
    renderAll();

    const countdownDeadline = room.status === "battle" ? room.battle?.timeoutAt : (getReadyCountdownLeft(room) ? now() + getReadyCountdownLeft(room) : 0);
    startRoomTimer(countdownDeadline, async () => {
      if (room.status === "battle") await finishBattleAsUnfinished(room.code, "Бой завершён из-за бездействия.");
    });

    if (room.status === "finished") await saveFinishedMatchIfNeeded(room.code, room);
  });
}

async function finishBattleAsUnfinished(roomCode, reasonText = "Бой завершён из-за бездействия.") {
  const roomRef = ref(db, getRoomPath(roomCode));
  await runTransaction(roomRef, raw => {
    if (!raw) return raw;
    const room = normalizeRoom(raw, roomCode);
    if (room.status !== "battle") return raw;

    room.status = "finished";
    room.result = { type: RESULT_TYPES.UNFINISHED, reason: reasonText, finishedAt: now(), summary: reasonText };
    room.battle.finished = true;
    room.battle.lastMessage = reasonText;
    room.battle.updatedAt = now();
    room.battle.log.push({ id: `timeout_${now()}`, round: room.battle.round, text: reasonText, kind: "system", createdAt: now() });
    return room;
  });
}

function isBattleRoundReady(battle) {
  const activeSeatIds = Object.entries(battle.participants).filter(([, p]) => isParticipantAlive(p)).map(([seatId]) => seatId);
  applyAutoStunSubmissions(battle);
  return activeSeatIds.every(seatId => Boolean(battle.submissions[seatId]));
}

function getIncomingAttackCountMap(submissions) {
  const map = {};
  Object.values(submissions || {}).forEach(submission => {
    if (submission?.type !== "attack") return;
    safeArray(submission.attacks).forEach(attack => {
      if (!attack?.targetSeatId) return;
      map[attack.targetSeatId] = (map[attack.targetSeatId] || 0) + 1;
    });
  });
  return map;
}

function createAttackSubmission(attacks) { return { type: "attack", attacks, submittedAt: now() }; }
function createDefendSubmission() { return { type: "defend", attacks: [], submittedAt: now() }; }
function createEscapeSubmission() { return { type: "escape", attacks: [], submittedAt: now() }; }

function getSeatCombatTotals(characterId) {
  const character = getCharacterById(characterId);
  return character ? getCombatViewTotals(character) : createDefaultCombatBase();
}

function isAttackType(type) { return type === "sand" || type === "paw" || type === "trip"; }
function attackTypeLabel(type, bodyTarget = "") {
  if (type === "sand") return "Песок в глаза";
  if (type === "trip") return "Подсечка";
  if (type === "paw") {
    const target = BODY_TARGETS[bodyTarget];
    return target ? `Удар лапой в ${target.label}` : "Удар лапой";
  }
  return "Атака";
}

function recordAnalyticsForAttack(participant, attack, hit) {
  if (!participant || !attack || !isAttackType(attack.type)) return;
  participant.analytics.favoriteMoveCounters[attack.type] += 1;
  participant.analytics.accuracy.totalAttacks += 1;
  if (hit) participant.analytics.accuracy.hits += 1;
  else participant.analytics.accuracy.misses += 1;
  if (attack.type === "paw" && attack.bodyTarget && participant.analytics.targets[attack.bodyTarget] !== undefined) {
    participant.analytics.targets[attack.bodyTarget] += 1;
  }
}

function resolveOneAttack({ battle, attackerSeatId, attack, roundEntries, startAliveSet }) {
  const attacker = battle.participants[attackerSeatId];
  const defender = battle.participants[attack.targetSeatId];
  if (!attacker || !defender) return;
  if (!startAliveSet.has(attackerSeatId)) return;
  if (!isParticipantAlive(defender)) return;
  if (!isAttackType(attack.type)) return;

  const attackerTotals = getSeatCombatTotals(attacker.characterId);
  const defenderTotals = getSeatCombatTotals(defender.characterId);
  const attackerName = attacker.name;
  const defenderName = defender.name;
  const defenderSubmission = battle.submissions[attack.targetSeatId];

  let chance = 0;
  let actionLabel = attackTypeLabel(attack.type, attack.bodyTarget);
  let directDamage = 0;
  let dotDamage = 0;

  if (attack.type === "sand") {
    chance = CHANCES.sand + attackerTotals.accuracy - (attacker.effects.accuracyPenaltyTurns > 0 ? SAND_ACCURACY_PENALTY : 0);
  } else if (attack.type === "trip") {
    chance = CHANCES.trip + attackerTotals.accuracy - (attacker.effects.accuracyPenaltyTurns > 0 ? SAND_ACCURACY_PENALTY : 0);
    directDamage = Math.round(DAMAGE.trip * (1 + attackerTotals.bitePower / 100));
    dotDamage = Math.round(DOT.trip * (1 + attackerTotals.bitePower / 100));
  } else if (attack.type === "paw") {
    const target = BODY_TARGETS[attack.bodyTarget] || BODY_TARGETS.face;
    chance = CHANCES.paw + target.chanceModifier + attackerTotals.accuracy - (attacker.effects.accuracyPenaltyTurns > 0 ? SAND_ACCURACY_PENALTY : 0);
    directDamage = Math.round(target.directDamage * (1 + attackerTotals.clawPower / 100));
    dotDamage = Math.round(target.dotDamage * (1 + attackerTotals.clawPower / 100));
  }

  chance = Math.max(0, chance);

  if (defenderSubmission?.type === "defend" && defender.effects.dodgesLeft > 0) {
    const dodgeChance = CHANCES.dodge + defenderTotals.dodge;
    const dodgeRoll = randomRoll();
    if (dodgeRoll <= dodgeChance) {
      roundEntries.push(`${defenderName} успевает увернуться от приёма «${actionLabel}». Бросок уворота: ${dodgeRoll} из ${dodgeChance}.`);
      recordAnalyticsForAttack(attacker, attack, false);
      return;
    }
    roundEntries.push(`${defenderName} пытается увернуться от приёма «${actionLabel}», но не успевает. Бросок уворота: ${dodgeRoll} из ${dodgeChance}.`);
  }

  const attackRoll = randomRoll();
  if (attackRoll > chance) {
    roundEntries.push(`${attackerName} использует «${actionLabel}», но промахивается. Бросок: ${attackRoll} из ${chance}.`);
    if (attack.type === "trip") {
      attacker.effects.stunTurns += 1;
      roundEntries.push(`${attackerName} теряет равновесие и сам оглушается на следующий ход.`);
    }
    recordAnalyticsForAttack(attacker, attack, false);
    return;
  }

  recordAnalyticsForAttack(attacker, attack, true);

  if (attack.type === "sand") {
    defender.effects.stunTurns += 1;
    defender.effects.accuracyPenaltyTurns += SAND_PENALTY_TURNS;
    roundEntries.push(`${attackerName} бросает песок в глаза ${defenderName}. Попадание. Бросок: ${attackRoll} из ${chance}.`);
    roundEntries.push(`${defenderName} будет оглушён на следующий ход, а шанс его попадания снизится на 10% на 2 хода.`);
    return;
  }

  defender.hp = Math.max(0, defender.hp - directDamage);
  defender.effects.pendingDotDamage += dotDamage;

  if (attack.type === "paw") {
    const target = BODY_TARGETS[attack.bodyTarget] || BODY_TARGETS.face;
    roundEntries.push(`${attackerName} попадает лапой в ${target.label}. Бросок: ${attackRoll} из ${chance}.`);
    roundEntries.push(`${defenderName} теряет ${directDamage}% очков спарринга и получит кровотечение ${dotDamage}% со следующего хода.`);
  } else if (attack.type === "trip") {
    defender.effects.stunTurns += 1;
    roundEntries.push(`${attackerName} проводит подсечку. Попадание. Бросок: ${attackRoll} из ${chance}.`);
    roundEntries.push(`${defenderName} теряет ${directDamage}% очков спарринга, будет оглушён на следующий ход и получит кровотечение ${dotDamage}% со следующего хода.`);
  }

  if (defender.hp <= 0) {
    defender.defeated = true;
    roundEntries.push(`${defenderName} падает до 0% очков спарринга.`);
  }
}

function applyBleedAtRoundStart(battle, roundEntries) {
  Object.values(battle.participants).forEach(participant => {
    if (!isParticipantAlive(participant)) return;
    if (participant.effects.dotDamage <= 0) return;
    participant.hp = Math.max(0, participant.hp - participant.effects.dotDamage);
    roundEntries.push(`${participant.name} теряет ${participant.effects.dotDamage}% очков спарринга из-за накопленного ранения.`);
    if (participant.hp <= 0) {
      participant.defeated = true;
      roundEntries.push(`${participant.name} больше не может продолжать бой.`);
    }
  });
}

function prepareRoundForDefenders(battle) {
  Object.entries(battle.submissions).forEach(([seatId, submission]) => {
    const participant = battle.participants[seatId];
    if (!participant || !isParticipantAlive(participant)) return;
    if (submission?.type === "defend") participant.effects.dodgesLeft = Math.max(0, participant.effects.dodgesLeft - 1);
  });
}

function decrementRoundStartEffects(battle, startedEffects) {
  Object.entries(startedEffects).forEach(([seatId, started]) => {
    const participant = battle.participants[seatId];
    if (!participant) return;
    if ((started.stunTurns || 0) > 0) participant.effects.stunTurns = Math.max(0, participant.effects.stunTurns - 1);
    if ((started.accuracyPenaltyTurns || 0) > 0) participant.effects.accuracyPenaltyTurns = Math.max(0, participant.effects.accuracyPenaltyTurns - 1);
  });
  Object.values(battle.participants).forEach(participant => {
    participant.effects.dotDamage += participant.effects.pendingDotDamage;
    participant.effects.pendingDotDamage = 0;
  });
}

function getBattleOutcome(battle) {
  const living = getLivingParticipants(battle);

  if (battle.roomMode === "ffa") {
    if (living.length === 1) return { finished: true, winnerSeatId: living[0].seatId, winnerTeamId: "", resultText: `${living[0].name} остаётся последним на лапах и побеждает.` };
    if (!living.length) return { finished: true, winnerSeatId: "", winnerTeamId: "", resultText: "Все участники выбывают. Итог — ничья." };
    return { finished: false, winnerSeatId: "", winnerTeamId: "", resultText: "" };
  }

  const groups = {};
  living.forEach(participant => {
    groups[participant.teamId] = groups[participant.teamId] || [];
    groups[participant.teamId].push(participant);
  });
  const activeTeams = Object.keys(groups);
  if (activeTeams.length === 1) {
    const winnerTeamId = activeTeams[0];
    const label = getTeamLabel("teams", winnerTeamId);
    return { finished: true, winnerSeatId: "", winnerTeamId, resultText: `${label} остаётся в строю и побеждает.` };
  }
  if (!activeTeams.length) return { finished: true, winnerSeatId: "", winnerTeamId: "", resultText: "Обе стороны выбывают одновременно. Итог — ничья." };
  return { finished: false, winnerSeatId: "", winnerTeamId: "", resultText: "" };
}

function resolveBattleRound(battle) {
  const roundEntries = [`Ход ${battle.round}`];
  const startedEffects = Object.fromEntries(Object.entries(battle.participants).map(([seatId, participant]) => [seatId, { stunTurns: participant.effects.stunTurns, accuracyPenaltyTurns: participant.effects.accuracyPenaltyTurns }]));

  applyBleedAtRoundStart(battle, roundEntries);
  prepareRoundForDefenders(battle);

  const startAliveSet = new Set(Object.entries(battle.participants).filter(([, p]) => isParticipantAlive(p)).map(([seatId]) => seatId));

  Object.entries(battle.submissions).forEach(([seatId, submission]) => {
    const participant = battle.participants[seatId];
    if (!participant) return;

    if (submission?.type === "stunned") {
      roundEntries.push(`${participant.name} оглушён и пропускает ход.`);
      return;
    }
    if (!startAliveSet.has(seatId)) return;

    if (submission?.type === "escape") {
      participant.escaped = true;
      roundEntries.push(`${participant.name} выходит из боя.`);
      return;
    }

    if (submission?.type === "defend") {
      roundEntries.push(`${participant.name} уходит в защиту.`);
      return;
    }

    if (submission?.type === "attack") {
      safeArray(submission.attacks).forEach(attack => resolveOneAttack({ battle, attackerSeatId: seatId, attack, roundEntries, startAliveSet }));
    }
  });

  decrementRoundStartEffects(battle, startedEffects);

  const outcome = getBattleOutcome(battle);
  battle.updatedAt = now();
  battle.timeoutAt = now() + INACTIVITY_TIMEOUT_MS;
  battle.lastMessage = outcome.finished ? outcome.resultText : (roundEntries[roundEntries.length - 1] || "Ход завершён.");

  roundEntries.forEach((entry, index) => {
    battle.log.push({ id: `log_${battle.round}_${index}_${Math.random().toString(36).slice(2, 7)}`, round: battle.round, text: entry, kind: "round", createdAt: now() });
  });

  if (outcome.finished) {
    battle.finished = true;
    battle.winnerSeatId = outcome.winnerSeatId;
    battle.winnerTeamId = outcome.winnerTeamId;
    battle.log.push({ id: `result_${now()}`, round: battle.round, text: outcome.resultText, kind: "result", createdAt: now() });
  } else {
    battle.round += 1;
    battle.submissions = {};
    applyAutoStunSubmissions(battle);
  }

  battle.log = battle.log.slice(-MAX_LOG_ITEMS);
  return battle;
}

function validateAttackPlanForSeat(room, battle, seatId, attacks) {
  const participantMap = battle.participants;
  const self = participantMap[seatId];
  if (!self || !isParticipantAlive(self)) return { valid: false, reason: "Этот боец уже не может действовать." };

  const enemies = getEnemiesForSeat({ settings: { mode: battle.roomMode } }, seatId, participantMap);
  if (!enemies.length) return { valid: false, reason: "У этого бойца нет противников." };
  if (!safeArray(attacks).length) return { valid: false, reason: "Нужно выбрать хотя бы одну цель." };

  const uniqueTargets = new Set();
  for (const attack of attacks) {
    if (!attack?.targetSeatId) return { valid: false, reason: "У атаки не выбрана цель." };
    if (!enemies.some(enemy => enemy.seatId === attack.targetSeatId)) return { valid: false, reason: "Нельзя бить союзников или выбывших бойцов." };
    if (uniqueTargets.has(attack.targetSeatId)) return { valid: false, reason: "Нельзя назначить два удара в одного и того же противника в одном ходу." };
    uniqueTargets.add(attack.targetSeatId);
    if (!isAttackType(attack.type)) return { valid: false, reason: "У каждой цели должен быть выбран корректный приём." };
    if (attack.type === "paw" && !BODY_TARGETS[attack.bodyTarget]) return { valid: false, reason: "Для удара лапой нужно выбрать часть тела." };
  }

  const projected = deepClone(battle.submissions || {});
  projected[seatId] = createAttackSubmission(attacks);
  const incomingMap = getIncomingAttackCountMap(projected);
  const brokenTarget = Object.entries(incomingMap).find(([, count]) => count > 2);
  if (brokenTarget) return { valid: false, reason: "Нельзя, чтобы трое и больше атаковали одну цель в одном ходу." };

  return { valid: true, reason: "" };
}

async function submitBattleAction(submission) {
  if (!state.currentRoomCode || !state.currentRoom) { notifyError("Сначала войди в комнату."); return; }

  const roomRef = ref(db, getRoomPath(state.currentRoomCode));
  const expectedSeatId = state.currentSeatId;

  await runTransaction(roomRef, raw => {
    if (!raw) return raw;
    const room = normalizeRoom(raw, state.currentRoomCode);
    if (room.status !== "battle" || !room.battle) return raw;

    const mySeatId = expectedSeatId || findMySeatId(room);
    if (!mySeatId) return raw;

    const participant = room.battle.participants[mySeatId];
    if (!participant || !isParticipantAlive(participant)) return raw;
    if (room.battle.submissions[mySeatId]) return raw;

    if (submission.type === "defend" && participant.effects.dodgesLeft <= 0) return raw;
    if (submission.type === "attack") {
      const validation = validateAttackPlanForSeat(room, room.battle, mySeatId, submission.attacks);
      if (!validation.valid) return raw;
    }

    room.battle.submissions[mySeatId] = { ...submission, submittedAt: now() };
    applyAutoStunSubmissions(room.battle);

    if (isBattleRoundReady(room.battle)) {
      room.battle = resolveBattleRound(room.battle);
      if (room.battle.finished) {
        room.status = "finished";
        room.result = {
          type: room.battle.winnerSeatId || room.battle.winnerTeamId ? "finished" : RESULT_TYPES.DRAW,
          reason: room.battle.lastMessage,
          finishedAt: now(),
          summary: room.battle.lastMessage
        };
      } else {
        room.status = "battle";
      }
    }

    return room;
  });
}

async function submitAttackPlanFromBuilder() {
  const room = state.currentRoom;
  if (!room?.battle || !state.currentSeatId) { notifyError("Сейчас нет активного хода."); return; }

  const cards = Array.from(ui.battle.attackBuilderList?.querySelectorAll(".attack-target-card") || []);
  const attacks = [];

  for (const card of cards) {
    const targetSeatId = card.dataset.targetSeatId || "";
    const attackType = card.querySelector("[data-role='attackType']")?.value || "";
    const bodyTarget = card.querySelector("[data-role='bodyTarget']")?.value || "face";
    if (!attackType) continue;
    attacks.push({ targetSeatId, type: attackType, bodyTarget });
  }

  const validation = validateAttackPlanForSeat(room, room.battle, state.currentSeatId, attacks);
  if (!validation.valid) { notifyError(validation.reason); return; }

  await submitBattleAction(createAttackSubmission(attacks));
  hide(ui.battle.attackMenu);
  show(ui.battle.actions);
  state.attackPlanDraft = {};
  notify("Удары отправлены.");
}

async function submitDefend() {
  await submitBattleAction(createDefendSubmission());
  notify("Вы выбрали защиту.");
}

async function submitEscape() {
  await submitBattleAction(createEscapeSubmission());
  notify("Вы выбрали побег.");
}


function getBattleResultBySeat(room, seatId) {
  const battle = room?.battle;
  if (!battle) return RESULT_TYPES.UNFINISHED;
  if (battle.roomMode === "ffa") {
    if (!battle.winnerSeatId) return RESULT_TYPES.DRAW;
    return battle.winnerSeatId === seatId ? RESULT_TYPES.WIN : RESULT_TYPES.LOSS;
  }
  const participant = battle.participants?.[seatId];
  if (!participant) return RESULT_TYPES.UNFINISHED;
  if (!battle.winnerTeamId) return RESULT_TYPES.DRAW;
  return participant.teamId === battle.winnerTeamId ? RESULT_TYPES.WIN : RESULT_TYPES.LOSS;
}

function applyBattleOutcomeToCharacter({ character, resultType, opponentName, finishedAt, creditGranted, creditReason, analyticsDelta }) {
  const next = deepClone(normalizeCharacter(character));
  const thresholds = getThresholdsForStatus(next.trainingStatus);

  if (resultType === RESULT_TYPES.WIN) next.profileStats.wins += 1;
  if (resultType === RESULT_TYPES.LOSS) next.profileStats.losses += 1;
  if (resultType === RESULT_TYPES.DRAW) next.profileStats.draws += 1;

  next.profileStats.lastBattleAt = finishedAt;
  next.profileStats.lastOpponentName = opponentName || "";

  if (analyticsDelta) {
    Object.entries(analyticsDelta.favoriteMoveCounters || {}).forEach(([key, value]) => { next.training.analytics.favoriteMoveCounters[key] += value || 0; });
    next.training.analytics.accuracy.totalAttacks += analyticsDelta.accuracy?.totalAttacks || 0;
    next.training.analytics.accuracy.hits += analyticsDelta.accuracy?.hits || 0;
    next.training.analytics.accuracy.misses += analyticsDelta.accuracy?.misses || 0;
    Object.entries(analyticsDelta.targets || {}).forEach(([key, value]) => { next.training.analytics.targets[key] += value || 0; });
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

async function canCharacterReceiveCreditForBattle(room, seatId, character) {
  const finishedAt = room?.result?.finishedAt || now();
  const todayKey = getMoscowDateKey(finishedAt);
  const progress = normalizeCharacter(character).training.progress;
  if (progress.lastCreditedDateKey === todayKey) {
    return { allowed: false, reason: `${character.name} уже получил зачёт сегодня.` };
  }

  const participant = room.battle?.participants?.[seatId];
  if (!participant) return { allowed: false, reason: "Персонаж не найден в итогах боя." };

  const enemies = Object.entries(room.battle?.participants || {})
    .filter(([otherSeatId, other]) => otherSeatId !== seatId && other.uid && other.characterId && (room.battle.roomMode === "ffa" ? true : other.teamId !== participant.teamId))
    .map(([, other]) => other);

  for (const enemy of enemies) {
    const pairKey = getPairKeyForCharacters(participant.uid, participant.characterId, enemy.uid, enemy.characterId);
    const pairSnapshot = await get(ref(db, getPairCooldownPath(pairKey)));
    if (pairSnapshot.exists()) {
      const cooldown = pairSnapshot.val();
      if (compareDateKeys(todayKey, cooldown.availableFromDateKey || "") < 0) {
        return { allowed: false, reason: `Откат с соперником ${enemy.name} ещё не закончился.` };
      }
    }
  }

  return { allowed: true, reason: "Зачёт возможен." };
}

async function saveFinishedMatchIfNeeded(roomCode, roomRaw) {
  const room = normalizeRoom(roomRaw, roomCode);
  if (!room || room.status !== "finished" || !room.battle) return;
  if (room.result?.savedAt) return;

  const roomRef = ref(db, getRoomPath(roomCode));
  const lockRef = ref(db, `${getRoomPath(roomCode)}/result/savedAt`);
  const lockResult = await runTransaction(lockRef, current => {
    if (current) return;
    return now();
  });
  if (!lockResult.committed) return;

  const finishedAt = room.result?.finishedAt || now();
  const battle = room.battle;
  const includedSeats = Object.entries(battle.participants).map(([seatId, item]) => ({ seatId, ...item }));

  const matchRef = push(ref(db, "matches"));
  await set(matchRef, {
    roomCode,
    finishedAt,
    mode: battle.roomMode,
    winnerSeatId: battle.winnerSeatId || "",
    winnerTeamId: battle.winnerTeamId || "",
    summary: room.result?.summary || battle.lastMessage || "",
    log: battle.log,
    participants: includedSeats.map(item => ({
      seatId: item.seatId,
      uid: item.uid,
      characterId: item.characterId,
      characterName: item.name,
      profileName: item.profileName,
      teamId: item.teamId,
      hp: item.hp,
      escaped: item.escaped,
      defeated: item.defeated
    }))
  });

  const creditedNames = [];

  for (const participant of includedSeats) {
    const characterSnap = await get(ref(db, getCharacterPath(participant.uid, participant.characterId)));
    if (!characterSnap.exists()) continue;

    const character = normalizeCharacter(characterSnap.val());
    const resultType = getBattleResultBySeat(room, participant.seatId);
    const enemies = Object.entries(battle.participants)
      .filter(([otherSeatId, other]) => otherSeatId !== participant.seatId && (battle.roomMode === "ffa" ? true : other.teamId !== participant.teamId))
      .map(([, other]) => other.name)
      .join(", ");

    const creditCheck = resultType === RESULT_TYPES.UNFINISHED ? { allowed: false, reason: "Бой не завершён корректно." } : await canCharacterReceiveCreditForBattle(room, participant.seatId, character);

    const nextCharacter = applyBattleOutcomeToCharacter({
      character,
      resultType,
      opponentName: enemies,
      finishedAt,
      creditGranted: creditCheck.allowed,
      creditReason: creditCheck.reason,
      analyticsDelta: participant.analytics
    });

    await set(ref(db, getCharacterPath(participant.uid, participant.characterId)), nextCharacter);

    if (participant.uid === state.user?.uid) {
      state.characters[participant.characterId] = nextCharacter;
    }

    await update(ref(db, `${getPublicCharactersPath()}/${participant.uid}__${participant.characterId}`), {
      uid: participant.uid,
      characterId: participant.characterId,
      ownerName: participant.profileName,
      name: nextCharacter.name,
      clan: nextCharacter.clan,
      trainingStatus: nextCharacter.trainingStatus,
      updatedAt: now(),
      ownerNote: nextCharacter.ownerNote,
      profileStats: nextCharacter.profileStats,
      training: nextCharacter.training
    });

    if (creditCheck.allowed) {
      creditedNames.push(nextCharacter.name);
      const enemyParticipants = Object.entries(battle.participants)
        .filter(([otherSeatId, other]) => otherSeatId !== participant.seatId && (battle.roomMode === "ffa" ? true : other.teamId !== participant.teamId))
        .map(([, other]) => other);

      const todayKey = getMoscowDateKey(finishedAt);
      const cooldownUntil = addDaysToDateKey(todayKey, PAIR_COOLDOWN_DAYS);

      for (const enemy of enemyParticipants) {
        const pairKey = getPairKeyForCharacters(participant.uid, participant.characterId, enemy.uid, enemy.characterId);
        await set(ref(db, getPairCooldownPath(pairKey)), {
          pairKey,
          lastCompletedDateKey: todayKey,
          availableFromDateKey: cooldownUntil,
          updatedAt: finishedAt,
          roomCode
        });
      }
    }
  }

  await update(roomRef, { "result/matchId": matchRef.key });

  if (creditedNames.length) {
    await pushFeedEntry({
      type: FEED_TYPES.CREDITED_TRAINING,
      createdAt: finishedAt,
      text: `Засчитанная тренировка: ${creditedNames.join(", ")}.`
    });
  }

  if (state.user) {
    await loadOwnCharacters();
    renderAll();
  }
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
    if (state.isAdmin) show(ui.shell.openAdminBtn); else hide(ui.shell.openAdminBtn);
    show(ui.shell.openHistoryBtn);
    show(ui.shell.openPublicProfilesBtn);
  } else {
    show(ui.screens.auth);
    hide(ui.screens.profile);
    hide(ui.screens.room);
    hide(ui.screens.admin);
    hide(ui.screens.history);
    hide(ui.screens.publicProfiles);
    hide(ui.shell.openAdminBtn);
    hide(ui.shell.openHistoryBtn);
    hide(ui.shell.openPublicProfilesBtn);
  }
}

function setScreen(screenKey) {
  hide(ui.screens.auth);
  hide(ui.screens.profile);
  hide(ui.screens.room);
  hide(ui.screens.admin);
  hide(ui.screens.history);
  hide(ui.screens.publicProfiles);

  if (!state.user && screenKey !== "auth") {
    show(ui.screens.auth);
    state.currentScreen = "auth";
    return;
  }

  if (screenKey === "auth") show(ui.screens.auth);
  if (screenKey === "profile") show(ui.screens.profile);
  if (screenKey === "room") show(ui.screens.room);
  if (screenKey === "history") show(ui.screens.history);
  if (screenKey === "publicProfiles") show(ui.screens.publicProfiles);
  if (screenKey === "admin" && state.isAdmin) show(ui.screens.admin);

  state.currentScreen = screenKey;
}

function renderUserBadge() {
  const name = state.userProfile?.displayName || state.user?.email || "Гость";
  text(ui.shell.currentUserBadge, `✦ ${name} ✦`);
}

function renderRoomBadge(roomCode = "", roomStatus = "") {
  if (!ui.shell.currentRoomBadge) return;
  const hasRoom = Boolean(roomCode);
  ui.shell.currentRoomBadge.classList.toggle("hidden", !hasRoom);
  if (!hasRoom) {
    text(ui.shell.currentRoomBadge, "✦ Комната: —");
    return;
  }
  const statusText = roomStatus ? ` · ${getRoomStatusLabel(roomStatus)}` : "";
  text(ui.shell.currentRoomBadge, `✦ Комната ${roomCode}${statusText}`);
}

function renderCharacterSelect() {
  if (!ui.profile.activeCharacterSelect) return;
  const characters = getSortedCharacters();
  const activeId = state.userProfile?.activeCharacterId || "";

  if (!characters.length) {
    ui.profile.activeCharacterSelect.innerHTML = `<option value="">✦ Сначала добавь персонажа ✦</option>`;
    text(ui.room.activeCharacterMirror, "—");
    return;
  }

  ui.profile.activeCharacterSelect.innerHTML = characters.map(character => {
    const selected = character.id === activeId ? "selected" : "";
    return `<option value="${escapeHtml(character.id)}" ${selected}>${escapeHtml(character.name)}</option>`;
  }).join("");

  const selectedCharacter = getCharacterById(ui.profile.activeCharacterSelect.value);
  text(ui.room.activeCharacterMirror, selectedCharacter ? `✦ ${selectedCharacter.name}` : "✦ персонаж не выбран");
}

function buildUpgradeChips(upgrades) {
  const list = safeArray(upgrades);
  if (!list.length) return `<div class="empty-inline">✦ Пока нет улучшений</div>`;
  return list.map(item => `<span class="upgrade-chip">${escapeHtml(item.label)}</span>`).join("");
}

function buildCharacterStatsHtml(character) {
  const normalized = normalizeCharacter(character);
  const combat = getCombatViewTotals(normalized);
  const progress = normalized.training.progress;
  const thresholds = getThresholdsForStatus(normalized.trainingStatus);
  const favoriteMove = getFavoriteMoveLabel(normalized);
  const accuracyPercent = getAccuracyPercent(normalized);
  const currentPool = getCurrentUpgradePool(normalized);

  return `
    <div class="character-detail-grid">
      <div class="character-detail-block">
        <div class="character-detail-title">Боевой профиль</div>
        <div class="character-detail-row"><span>Шанс попадания</span><strong>${combat.accuracy}%</strong></div>
        <div class="character-detail-row"><span>Шанс уворота</span><strong>${combat.dodge}%</strong></div>
        <div class="character-detail-row"><span>Удар лапой</span><strong>${combat.clawPower}%</strong></div>
        <div class="character-detail-row"><span>Подсечка</span><strong>${combat.bitePower}%</strong></div>
      </div>

      <div class="character-detail-block">
        <div class="character-detail-title">Прогресс</div>
        <div class="character-detail-row"><span>Победы до улучшения</span><strong>${progress.winsTowardUpgrade} / ${thresholds.wins}</strong></div>
        <div class="character-detail-row"><span>Поражения до улучшения</span><strong>${progress.lossesTowardUpgrade} / ${thresholds.losses}</strong></div>
        <div class="character-detail-row"><span>Доступно улучшений</span><strong>${getPendingChoiceCount(normalized)}</strong></div>
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

    <div class="character-upgrades-wrap">
      <div class="character-upgrades-block">
        <div class="character-detail-title">Активные улучшения</div>
        <div class="upgrade-chip-list">${buildUpgradeChips(currentPool)}</div>
      </div>
      <div class="character-upgrades-block">
        <div class="character-detail-title">Все ветки</div>
        <div class="character-detail-row"><span>Попадание</span><strong>${getUpgradeCountByType(currentPool, "accuracy")} / 5</strong></div>
        <div class="character-detail-row"><span>Уворот</span><strong>${getUpgradeCountByType(currentPool, "dodge")} / 5</strong></div>
        <div class="character-detail-row"><span>Лапа</span><strong>${getUpgradeCountByType(currentPool, "clawPower")} / 5</strong></div>
        <div class="character-detail-row"><span>Подсечка</span><strong>${getUpgradeCountByType(currentPool, "bitePower")} / 5</strong></div>
      </div>
    </div>
  `;
}

function renderProfile() {
  const profile = state.userProfile || createDefaultProfile("Зенит");
  text(ui.profile.name, profile.displayName || "Зенит");
  text(ui.profile.statusText, profile.status || "✦ Наблюдает за бабочками");
  if (ui.profile.statusInput) ui.profile.statusInput.value = profile.status || "";
  if (ui.profile.symbolSelect) ui.profile.symbolSelect.value = profile.portraitSymbol || "✦";
  text(ui.profile.portraitInitials, profile.portraitSymbol || getInitials(profile.displayName));
  text(ui.room.playerNameMirror, profile.displayName || "—");
  if (ui.profile.ownerNoteInput) {
    const selected = getCharacterById(getSelectedCharacterId());
    ui.profile.ownerNoteInput.value = selected?.ownerNote || "";
  }

  renderCharacterSelect();

  const queryText = (ui.profile.characterSearchInput?.value || "").trim().toLowerCase();
  const characters = getSortedCharacters().filter(character => !queryText || character.name.toLowerCase().includes(queryText));

  if (!characters.length) {
    ui.profile.charactersList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Добавь первого персонажа.</div></div>`;
    return;
  }

  ui.profile.charactersList.innerHTML = characters.map(character => {
    const isExpanded = Boolean(state.expandedCharacterCards[character.id]);
    const badge = getTrainingStatusLabel(character.trainingStatus);
    const ownerNote = character.ownerNote ? `<div class="character-owner-note-box">${escapeHtml(character.ownerNote)}</div>` : "";
    const promoteButton = character.trainingStatus === "apprentice" ? `<button type="button" class="promote-character-btn" data-action="promote-character" data-character-id="${escapeHtml(character.id)}">Посвятить в воители</button>` : "";
    const upgradeButton = getPendingChoiceCount(character) > 0 ? `<button type="button" class="choose-upgrade-btn" data-action="choose-upgrade" data-character-id="${escapeHtml(character.id)}">Выбрать улучшение (${getPendingChoiceCount(character)})</button>` : "";

    return `
      <article class="character-card ${character.trainingStatus === "apprentice" ? "character-card-apprentice" : "character-card-warrior"}">
        <div class="character-card-top">
          <div>
            <div class="character-card-name">${escapeHtml(character.name)}</div>
            <div class="character-card-meta">${escapeHtml(character.clan || "Без племени")} · ${escapeHtml(badge)}</div>
          </div>
          <div class="character-card-badge">${escapeHtml(badge)}</div>
        </div>

        <div class="fancy-stats-grid">
          <div class="fancy-stat"><span>Победы</span><strong>${character.profileStats.wins}</strong></div>
          <div class="fancy-stat"><span>Поражения</span><strong>${character.profileStats.losses}</strong></div>
          <div class="fancy-stat"><span>Ничьи</span><strong>${character.profileStats.draws}</strong></div>
          <div class="fancy-stat"><span>Зачётных тренировок</span><strong>${character.training.progress.creditedTrainings}</strong></div>
        </div>

        ${ownerNote}

        <div class="character-actions-extra">
          <button type="button" class="ghost-btn" data-action="toggle-character" data-character-id="${escapeHtml(character.id)}">${isExpanded ? "Свернуть" : "Развернуть"}</button>
          <button type="button" class="secondary-btn" data-action="set-active-character" data-character-id="${escapeHtml(character.id)}">Сделать активным</button>
          <button type="button" class="ghost-btn" data-action="edit-character" data-character-id="${escapeHtml(character.id)}">Редактировать</button>
          <button type="button" class="ghost-btn ghost-btn-danger" data-action="delete-character" data-character-id="${escapeHtml(character.id)}">Удалить</button>
          ${upgradeButton}
          ${promoteButton}
        </div>

        ${isExpanded ? buildCharacterStatsHtml(character) : ""}
      </article>
    `;
  }).join("");
}

function renderRoomMeta(room) {
  if (!room) {
    html(ui.room.roomMeta, `<div class="room-meta-line">◈ Статус: ожидание</div><div class="room-meta-line">◈ Комната: —</div>`);
    text(ui.room.creditBadge, "Зачёта не будет");
    text(ui.room.creditReasonBox, "Сначала создай комнату или войди в неё.");
    text(ui.room.roomValidationBox, "Пока нет проверки состава.");
    return;
  }

  const validation = validateRoomComposition(room);
  const creditPreview = getRoomCreditPreview(room);

  html(ui.room.roomMeta, `
    <div class="room-meta-line">◈ Статус: ${escapeHtml(getRoomStatusLabel(room.status))}</div>
    <div class="room-meta-line">◈ Комната: ${escapeHtml(room.code)}</div>
    <div class="room-meta-line">◈ Режим: ${escapeHtml(ROOM_MODES[room.settings.mode]?.label || "—")}</div>
  `);

  text(ui.room.creditBadge, creditPreview.badge);
  text(ui.room.creditReasonBox, creditPreview.reason);
  text(ui.room.roomValidationBox, validation.reason);
  if (ui.room.roomModeSelect) ui.room.roomModeSelect.value = room.settings.mode;
}

function getSeatConfigOptions(room, seat) {
  const mode = room.settings.mode;
  let teamOptions = "";
  if (mode === "ffa") {
    teamOptions = `<option value="solo-${seat.seatId}">Сам за себя</option>`;
  } else {
    teamOptions = `
      <option value="alpha" ${seat.teamId === "alpha" ? "selected" : ""}>Сторона А</option>
      <option value="beta" ${seat.teamId === "beta" ? "selected" : ""}>Сторона Б</option>
    `;
  }

  const characterOptions = getSortedCharacters().map(character => `<option value="${escapeHtml(character.id)}" ${character.id === seat.characterId ? "selected" : ""}>${escapeHtml(character.name)}</option>`).join("");
  return { teamOptions, characterOptions };
}

function renderRoomSeats(room) {
  if (!room) {
    ui.room.roomPlayers.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Пока вы не подключены ни к одной комнате.</div></div>`;
    return;
  }

  const mySeatId = findMySeatId(room);

  ui.room.roomPlayers.innerHTML = `
    <div class="room-seats-grid">
      ${getSeatIds().map(seatId => {
        const seat = normalizeSeat(room.seats?.[seatId], seatId);
        const occupied = Boolean(seat.uid);
        const isMine = occupied && seat.uid === state.user?.uid;
        const teamClass = getSeatBadgeClass(seat.teamId, occupied);
        const teamLabel = occupied ? getTeamLabel(room.settings.mode, seat.teamId, seatId) : "Свободно";
        const { teamOptions, characterOptions } = isMine ? getSeatConfigOptions(room, seat) : { teamOptions: "", characterOptions: "" };

        return `
          <article class="room-seat-card">
            <div class="room-seat-top">
              <div>
                <div class="room-seat-name">${escapeHtml(occupied ? seat.profileName : `Место ${seatId.replace("seat", "#")}`)}</div>
                <div class="battle-fighter-meta">${escapeHtml(occupied ? `${seat.characterName || "Без персонажа"} · ${seat.clan || "Без племени"}` : "Можно занять это место")}</div>
              </div>
              <div class="seat-badge ${teamClass}">${escapeHtml(teamLabel)}</div>
            </div>

            <div class="seat-meta">
              <div>Статус: ${escapeHtml(occupied ? getTrainingStatusLabel(seat.trainingStatus) : "—")}</div>
              <div>Участие в бою: ${occupied ? (seat.included ? "в составе" : "вне состава") : "—"}</div>
            </div>

            <div class="seat-ready-line">
              <span>${occupied ? "Готовность" : "Место свободно"}</span>
              <span class="seat-ready-dot ${seat.ready ? "is-ready" : occupied ? "" : "is-inactive"}"></span>
            </div>

            ${isMine ? `
              <div class="seat-controls">
                <label class="field-block">
                  <span class="field-label">Персонаж</span>
                  <select class="field-select" data-role="seat-character">${characterOptions}</select>
                </label>

                <label class="field-block">
                  <span class="field-label">Сторона</span>
                  <select class="field-select" data-role="seat-team">${teamOptions}</select>
                </label>

                <label class="field-block">
                  <span class="field-label">Участие</span>
                  <select class="field-select" data-role="seat-included">
                    <option value="true" ${seat.included ? "selected" : ""}>В составе</option>
                    <option value="false" ${!seat.included ? "selected" : ""}>Не участвует</option>
                  </select>
                </label>

                <button type="button" class="seat-config-btn" data-action="save-seat-config" data-seat-id="${escapeHtml(seatId)}">Сохранить настройки места</button>
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;

  state.currentSeatId = mySeatId;
}

function renderWaitingState(room) {
  if (!room) { html(ui.room.waitingStateBox, ""); return; }
  if (room.status === "lobby") {
    const included = getIncludedSeats(room);
    const readyCount = included.filter(item => item.ready).length;
    ui.room.waitingStateBox.innerHTML = `
      <div class="waiting-pretty-card">
        <div class="waiting-pretty-title">Лобби комнаты</div>
        <div class="waiting-pretty-text">Активных бойцов: ${included.length}. Готовы: ${readyCount}.</div>
        <div class="waiting-pretty-text">Как только все активные участники нажмут готовность, создатель комнаты сможет запустить бой.</div>
      </div>
    `;
  } else {
    html(ui.room.waitingStateBox, "");
  }
}

function getSubmissionLabel(submission) {
  if (!submission) return "—";
  if (submission.type === "defend") return "Защита";
  if (submission.type === "escape") return "Побег";
  if (submission.type === "stunned") return "Пропуск хода";
  if (submission.type === "attack") {
    const names = safeArray(submission.attacks).map(attack => attackTypeLabel(attack.type, attack.bodyTarget));
    return names.join(", ") || "Атака";
  }
  return "—";
}

function canCurrentSeatAct(room) {
  const battle = room?.battle;
  if (!battle || battle.finished) return false;
  if (!state.currentSeatId) return false;
  const participant = battle.participants?.[state.currentSeatId];
  if (!participant || !isParticipantAlive(participant)) return false;
  if (battle.submissions?.[state.currentSeatId]) return false;
  return true;
}

function renderAttackBuilder(room) {
  const battle = room?.battle;
  if (!battle || !state.currentSeatId || !ui.battle.attackBuilderList) return;

  const enemies = getEnemiesForSeat({ settings: { mode: battle.roomMode } }, state.currentSeatId, battle.participants);
  if (!enemies.length) {
    ui.battle.attackBuilderList.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Противников не осталось.</div></div>`;
    return;
  }

  ui.battle.attackBuilderList.innerHTML = enemies.map(enemy => {
    const draft = state.attackPlanDraft[enemy.seatId] || { type: "", bodyTarget: "face" };
    return `
      <div class="attack-target-card" data-target-seat-id="${escapeHtml(enemy.seatId)}">
        <div class="attack-target-title">
          <div>
            <div class="attack-target-name">${escapeHtml(enemy.name)}</div>
            <div class="attack-target-meta">${escapeHtml(getTeamLabel(battle.roomMode, enemy.teamId, enemy.seatId))}</div>
          </div>
          <div class="seat-badge ${getSeatBadgeClass(enemy.teamId, true)}">${enemy.hp}%</div>
        </div>

        <div class="attack-target-grid">
          <label class="field-block">
            <span class="field-label">Приём</span>
            <select class="field-select" data-role="attackType" data-target="${escapeHtml(enemy.seatId)}">
              <option value="">Не бить</option>
              <option value="sand" ${draft.type === "sand" ? "selected" : ""}>Песок в глаза</option>
              <option value="paw" ${draft.type === "paw" ? "selected" : ""}>Удар лапой</option>
              <option value="trip" ${draft.type === "trip" ? "selected" : ""}>Подсечка</option>
            </select>
          </label>

          <label class="field-block">
            <span class="field-label">Часть тела</span>
            <select class="field-select" data-role="bodyTarget" data-target="${escapeHtml(enemy.seatId)}">
              ${Object.entries(BODY_TARGETS).map(([key, body]) => `<option value="${escapeHtml(key)}" ${draft.bodyTarget === key ? "selected" : ""}>${escapeHtml(body.label)}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>
    `;
  }).join("");
}

function renderActionPanel(room) {
  const battle = room?.battle;
  if (!battle) return;

  const canAct = canCurrentSeatAct(room);
  if (!canAct) {
    ui.battle.attackActionBtn.disabled = true;
    ui.battle.defendActionBtn.disabled = true;
    ui.battle.escapeActionBtn.disabled = true;
    if (!state.currentSeatId) text(ui.battle.opponentChosenBadge, "Вы наблюдаете за боем");
    else if (battle.submissions?.[state.currentSeatId]) text(ui.battle.opponentChosenBadge, "Ваш ход уже отправлен");
    else text(ui.battle.opponentChosenBadge, "Вы не можете действовать");
    return;
  }

  ui.battle.attackActionBtn.disabled = false;
  ui.battle.defendActionBtn.disabled = false;
  ui.battle.escapeActionBtn.disabled = false;
  text(ui.battle.opponentChosenBadge, "Выберите действие");
  renderAttackBuilder(room);
}

function renderBattleInfo(room) {
  const battle = room?.battle;
  if (!battle) {
    html(ui.battle.info, "");
    hide(ui.battle.screen);
    return;
  }

  show(ui.battle.screen);
  const mySeatId = state.currentSeatId;
  const activeParticipants = Object.entries(battle.participants).map(([seatId, item]) => ({ seatId, ...item }));
  const statusChips = [
    `<span class="battle-chip battle-chip-active">Ход ${battle.round}</span>`,
    `<span class="battle-chip">${escapeHtml(ROOM_MODES[battle.roomMode]?.label || "Бой")}</span>`
  ];

  const fighterCards = activeParticipants.map(participant => {
    const effects = participant.effects || createDefaultEffects();
    const turnClass = mySeatId === participant.seatId ? "is-turn" : "";
    const defeatedClass = participant.defeated ? "is-defeated" : "";
    const escapedClass = participant.escaped ? "is-escaped" : "";
    const effectChips = [];
    if (effects.stunTurns > 0) effectChips.push(`<span class="battle-effect-chip">Оглушение: ${effects.stunTurns}</span>`);
    if (effects.accuracyPenaltyTurns > 0) effectChips.push(`<span class="battle-effect-chip">Штраф меткости: ${effects.accuracyPenaltyTurns}</span>`);
    if (effects.dotDamage > 0) effectChips.push(`<span class="battle-effect-chip">Кровотечение: ${effects.dotDamage}%</span>`);
    if (!effectChips.length) effectChips.push(`<span class="battle-effect-chip">Эффектов нет</span>`);

    const submissionLabel = participant.defeated
      ? "Выбит"
      : participant.escaped
        ? "Ушёл"
        : battle.submissions?.[participant.seatId]
          ? getSubmissionLabel(battle.submissions[participant.seatId])
          : "Действие не выбрано";

    return `
      <div class="battle-fighter-card ${turnClass} ${defeatedClass} ${escapedClass}">
        <div class="battle-fighter-card-head">
          <div>
            <div class="battle-fighter-name">${escapeHtml(participant.name)}</div>
            <div class="battle-fighter-meta">${escapeHtml(participant.profileName)} · ${escapeHtml(getTeamLabel(battle.roomMode, participant.teamId, participant.seatId))}</div>
          </div>
          <div class="seat-badge ${getSeatBadgeClass(participant.teamId, true)}">${escapeHtml(getTrainingStatusLabel(participant.trainingStatus))}</div>
        </div>

        <div class="battle-bar-card">
          <div class="battle-bar-top">
            <span>Очки спарринга</span>
            <strong>${participant.hp}%</strong>
          </div>
          <div class="battle-bar-track">
            <div class="battle-bar-fill" style="width:${clamp(participant.hp, 0, 100)}%"></div>
          </div>
        </div>

        <div class="battle-fighter-meta">Действие: ${escapeHtml(submissionLabel)}</div>

        <div class="battle-effect-list">${effectChips.join("")}</div>

        <div class="battle-dodge-pips">
          ${Array.from({ length: MAX_DODGES }).map((_, index) => `<div class="battle-dodge-pip ${index < effects.dodgesLeft ? "is-active" : ""}">✦</div>`).join("")}
        </div>
      </div>
    `;
  }).join("");

  ui.battle.info.innerHTML = `
    <div class="battle-status-shell">
      <div class="battle-status-top">${statusChips.join("")}</div>
      <div class="battle-message">
        <div class="battle-message-title">Последнее сообщение</div>
        <div class="battle-message-text">${escapeHtml(battle.lastMessage || "Бой идёт.")}</div>
      </div>
      <div class="battle-roster-grid">${fighterCards}</div>
    </div>
  `;

  renderActionPanel(room);
}

function renderBattleLog(room) {
  const battle = room?.battle;
  if (!battle || !battle.log.length) {
    ui.battle.log.innerHTML = `<div class="battle-log-empty"><span class="battle-log-empty-mark">✦</span><span>Пока нет записей.</span></div>`;
    return;
  }

  ui.battle.log.innerHTML = battle.log.map((entry, index) => `
    <div class="battle-log-entry ${index >= state.lastRenderedLogLength ? "battle-log-entry-new" : ""}">
      <div class="battle-log-mark">✦</div>
      <div class="battle-log-text">${escapeHtml(entry.text)}</div>
    </div>
  `).join("");

  state.lastRenderedLogLength = battle.log.length;
}

function renderResultCard(room) {
  if (!room || room.status !== "finished" || !room.result) {
    html(ui.room.roomResultCard, "");
    return;
  }

  const battle = room.battle;
  const summary = room.result.summary || battle?.lastMessage || "Бой завершён.";
  const winners = battle?.roomMode === "ffa"
    ? (battle.winnerSeatId ? [battle.participants[battle.winnerSeatId]?.name].filter(Boolean) : [])
    : Object.entries(battle?.participants || {}).filter(([, p]) => p.teamId === battle.winnerTeamId).map(([, p]) => p.name);

  ui.room.roomResultCard.innerHTML = `
    <div class="result-pretty-card">
      <div class="result-pretty-title">Итог боя</div>
      <div class="result-simple-box">${escapeHtml(summary)}</div>
      <div class="result-pretty-grid">
        <div class="result-pretty-item"><span>Режим</span><strong>${escapeHtml(ROOM_MODES[battle?.roomMode || room.settings.mode]?.label || "—")}</strong></div>
        <div class="result-pretty-item"><span>Победитель</span><strong>${escapeHtml(winners.length ? winners.join(", ") : "Ничья")}</strong></div>
        <div class="result-pretty-item"><span>Дата</span><strong>${escapeHtml(formatDate(room.result.finishedAt))}</strong></div>
      </div>
    </div>
  `;
}

function renderRoom() {
  if (ui.room.roomCodeInput) ui.room.roomCodeInput.value = state.currentRoomCode || ui.room.roomCodeInput.value || "";
  if (!state.currentRoom) {
    text(ui.room.statusLog, "Пока ничего не происходит.");
  } else if (state.currentRoom.status === "battle" && state.currentRoom.battle) {
    text(ui.room.statusLog, state.currentRoom.battle.lastMessage || "Бой идёт.");
  } else if (state.currentRoom.status === "finished") {
    text(ui.room.statusLog, state.currentRoom.result?.summary || "Бой завершён.");
  } else {
    const included = getIncludedSeats(state.currentRoom);
    const readyCount = included.filter(item => item.ready).length;
    text(ui.room.statusLog, `Комната ${state.currentRoom.code}. Активных бойцов: ${included.length}. Готовы: ${readyCount}.`);
  }

  renderRoomMeta(state.currentRoom);
  renderRoomSeats(state.currentRoom);
  renderWaitingState(state.currentRoom);
  renderBattleInfo(state.currentRoom);
  renderBattleLog(state.currentRoom);
  renderResultCard(state.currentRoom);
  renderRoomBadge(state.currentRoomCode, state.currentRoom?.status || "");
}

function renderHistory() {
  if (!state.user) {
    ui.history.list.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Сначала войди в аккаунт.</div></div>`;
    return;
  }

  const matches = Object.entries(state.adminMatchesCache || {})
    .map(([id, value]) => ({ id, ...value }))
    .filter(match => safeArray(match.participants).some(item => item.uid === state.user.uid))
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  if (!matches.length) {
    ui.history.list.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">История тренировок пока пуста.</div></div>`;
    return;
  }

  ui.history.list.innerHTML = matches.map(match => {
    const myParticipants = safeArray(match.participants).filter(item => item.uid === state.user.uid);
    return `
      <article class="history-item-card">
        <div class="card-title-row">
          <span class="card-title-mark">✦</span>
          <h3 class="card-title-text">${escapeHtml(match.summary || "Бой")}</h3>
        </div>
        <div class="history-item-date">${escapeHtml(formatDate(match.finishedAt))}</div>
        <div class="history-item-meta">Режим: ${escapeHtml(ROOM_MODES[match.mode]?.label || "—")} · Ваши персонажи: ${escapeHtml(myParticipants.map(item => item.characterName).join(", "))}</div>
      </article>
    `;
  }).join("");
}

function renderPublicProfiles() {
  const queryText = (ui.publicProfiles.searchInput?.value || "").trim().toLowerCase();
  const list = state.publicCharactersCache.filter(item => !queryText || (item.name || "").toLowerCase().includes(queryText)).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));

  if (!list.length) {
    ui.publicProfiles.list.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Персонажи не найдены.</div></div>`;
    return;
  }

  ui.publicProfiles.list.innerHTML = list.map(item => `
    <article class="public-character-card" data-action="show-public-character" data-public-key="${escapeHtml(item.uid)}__${escapeHtml(item.characterId)}">
      <div class="public-character-name">${escapeHtml(item.name || "Без имени")}</div>
      <div class="public-character-meta">${escapeHtml(item.clan || "Без племени")} · ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>
      <div class="public-character-owner">Владелец: ${escapeHtml(item.ownerName || "—")}</div>
    </article>
  `).join("");
}

function renderSelectedPublicProfile(publicKey = "") {
  const item = state.publicCharactersCache.find(entry => `${entry.uid}__${entry.characterId}` === publicKey);
  if (!item) {
    ui.publicProfiles.details.innerHTML = `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Выберите персонажа слева.</div></div>`;
    return;
  }

  const character = normalizeCharacter({
    name: item.name,
    clan: item.clan,
    trainingStatus: item.trainingStatus,
    ownerNote: item.ownerNote,
    profileStats: item.profileStats,
    training: item.training,
    combatBase: createDefaultCombatBase()
  });

  ui.publicProfiles.details.innerHTML = `
    <div class="public-profile-card">
      <div class="card-title-row">
        <span class="card-title-mark">✦</span>
        <h3 class="card-title-text">${escapeHtml(item.name)}</h3>
      </div>
      <div class="public-profile-owner">Владелец: ${escapeHtml(item.ownerName || "—")}</div>
      <div class="public-profile-meta">${escapeHtml(item.clan || "Без племени")} · ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>
      ${buildCharacterStatsHtml(character)}
    </div>
  `;
}

function renderAdmin() {
  if (!state.isAdmin) return;

  const users = Object.entries(state.adminUsersCache || {}).map(([uid, value]) => ({ uid, profile: value.profile || null, characters: value.characters || {} }));
  const rooms = Object.entries(state.adminRoomsCache || {}).map(([code, value]) => normalizeRoom(value, code)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const matches = Object.entries(state.adminMatchesCache || {}).map(([id, value]) => ({ id, ...value })).sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  ui.admin.summary.innerHTML = `
    <div class="admin-summary-grid">
      <div class="admin-summary-card"><span>Игроков</span><strong>${users.length}</strong></div>
      <div class="admin-summary-card"><span>Комнат</span><strong>${rooms.length}</strong></div>
      <div class="admin-summary-card"><span>Сохранённых боёв</span><strong>${matches.length}</strong></div>
    </div>
  `;

  ui.admin.playersList.innerHTML = users.length ? users.map(user => `
    <div class="admin-user-card">
      <div class="admin-room-name">${escapeHtml(user.profile?.displayName || user.uid)}</div>
      <div class="admin-meta-row">
        <span>${escapeHtml(user.uid)}</span>
        <span>Персонажей: ${Object.keys(user.characters || {}).length}</span>
      </div>
    </div>
  `).join("") : `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Игроков пока нет.</div></div>`;

  ui.admin.roomsList.innerHTML = rooms.length ? rooms.map(room => `
    <div class="admin-room-card">
      <div class="admin-room-name">${escapeHtml(room.code)}</div>
      <div class="admin-room-meta">Статус: ${escapeHtml(getRoomStatusLabel(room.status))} · Режим: ${escapeHtml(ROOM_MODES[room.settings.mode]?.label || "—")}</div>
      <div class="admin-meta-row">
        <span>Игроков: ${getOccupiedSeats(room).length}</span>
        <span>Активных: ${getIncludedSeats(room).length}</span>
      </div>
    </div>
  `).join("") : `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">Комнат пока нет.</div></div>`;

  ui.admin.matchesList.innerHTML = matches.length ? matches.map(match => `
    <div class="admin-match-card">
      <div class="admin-match-title">${escapeHtml(match.summary || "Бой")}</div>
      <div class="admin-match-meta">${escapeHtml(formatDate(match.finishedAt))} · ${escapeHtml(ROOM_MODES[match.mode]?.label || "—")}</div>
      <div class="admin-meta-row">${safeArray(match.participants).map(item => `<span>${escapeHtml(item.characterName)}</span>`).join("")}</div>
    </div>
  `).join("") : `<div class="empty-state-card"><div class="empty-state-mark">✦</div><div class="empty-state-text">История пока пуста.</div></div>`;
}

function renderAll() {
  renderAuthState();
  renderUserBadge();
  renderProfile();
  renderRoom();
  renderFeedTicker();
  renderHistory();
  renderPublicProfiles();
  renderAdmin();
}

function bindProfileCardActions() {
  ui.profile.charactersList?.addEventListener("click", async event => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const characterId = actionEl.dataset.characterId || "";
    const action = actionEl.dataset.action || "";

    if (action === "toggle-character") {
      state.expandedCharacterCards[characterId] = !state.expandedCharacterCards[characterId];
      renderProfile();
      return;
    }
    if (action === "set-active-character") { await saveActiveCharacter(characterId); notify("Активный персонаж обновлён."); return; }
    if (action === "edit-character") { await editCharacter(characterId); return; }
    if (action === "delete-character") { await deleteCharacter(characterId); return; }
    if (action === "choose-upgrade") { await chooseUpgradeForCharacter(characterId); return; }
    if (action === "promote-character") { await promoteApprenticeToWarrior(characterId); }
  });
}

function bindRoomActions() {
  ui.room.roomPlayers?.addEventListener("click", async event => {
    const actionEl = event.target.closest("[data-action='save-seat-config']");
    if (!actionEl) return;

    const seatId = actionEl.dataset.seatId || "";
    const card = actionEl.closest(".room-seat-card");
    if (!card || !seatId) return;

    const teamId = card.querySelector("[data-role='seat-team']")?.value || "alpha";
    const includedValue = card.querySelector("[data-role='seat-included']")?.value || "true";
    const characterId = card.querySelector("[data-role='seat-character']")?.value || "";

    await updateSeatConfig(seatId, { teamId, included: includedValue === "true", characterId });
  });

  ui.battle.attackBuilderList?.addEventListener("change", event => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    const targetSeatId = select.dataset.target || "";
    if (!targetSeatId) return;
    state.attackPlanDraft[targetSeatId] = state.attackPlanDraft[targetSeatId] || { type: "", bodyTarget: "face" };
    if (select.dataset.role === "attackType") state.attackPlanDraft[targetSeatId].type = select.value;
    if (select.dataset.role === "bodyTarget") state.attackPlanDraft[targetSeatId].bodyTarget = select.value;
  });

  ui.publicProfiles.list?.addEventListener("click", event => {
    const card = event.target.closest("[data-action='show-public-character']");
    if (!card) return;
    renderSelectedPublicProfile(card.dataset.publicKey || "");
  });
}

function bindUi() {
  ensureUiChrome();
  renderThemeSelector();
  renderCardStyleSelector();

  ui.auth.registerBtn?.addEventListener("click", () => handleRegister().catch(handleError));
  ui.auth.loginBtn?.addEventListener("click", () => handleLogin().catch(handleError));
  ui.auth.logoutBtn?.addEventListener("click", () => handleLogout().catch(handleError));
  ui.shell.mainLogoutBtn?.addEventListener("click", () => handleLogout().catch(handleError));

  ui.shell.openProfileBtn?.addEventListener("click", () => setScreen("profile"));
  ui.shell.openRoomBtn?.addEventListener("click", () => setScreen("room"));
  ui.shell.openHistoryBtn?.addEventListener("click", () => setScreen("history"));
  ui.shell.openPublicProfilesBtn?.addEventListener("click", () => setScreen("publicProfiles"));
  ui.shell.openAdminBtn?.addEventListener("click", () => setScreen("admin"));

  ui.shell.themeSelect?.addEventListener("change", event => applyTheme(event.target.value));
  ui.shell.cardStyleSelect?.addEventListener("change", event => applyCardStyle(event.target.value));

  ui.profile.saveProfileBtn?.addEventListener("click", () => saveProfileStatus().catch(handleError));
  ui.profile.savePortraitSymbolBtn?.addEventListener("click", () => savePortraitSymbol().catch(handleError));
  ui.profile.addCharacterBtn?.addEventListener("click", () => addCharacter().catch(handleError));
  ui.profile.saveOwnerNoteBtn?.addEventListener("click", () => {
    const id = getSelectedCharacterId();
    saveOwnerNote(id, ui.profile.ownerNoteInput?.value.trim() || "").catch(handleError);
  });
  ui.profile.activeCharacterSelect?.addEventListener("change", event => saveActiveCharacter(event.target.value).catch(handleError));
  ui.profile.characterSearchInput?.addEventListener("input", () => renderProfile());

  ui.room.createRoomBtn?.addEventListener("click", () => createRoom().catch(handleError));
  ui.room.joinRoomBtn?.addEventListener("click", () => joinRoom().catch(handleError));
  ui.room.leaveRoomBtn?.addEventListener("click", () => leaveRoom().catch(handleError));
  ui.room.copyRoomCodeBtn?.addEventListener("click", async () => {
    if (!state.currentRoomCode) { notifyError("Сначала войди в комнату."); return; }
    await navigator.clipboard.writeText(state.currentRoomCode);
    notify("Код комнаты скопирован.");
  });
  ui.room.readyToggleBtn?.addEventListener("click", () => toggleReady().catch(handleError));
  ui.room.startBattleBtn?.addEventListener("click", () => startBattle().catch(handleError));
  ui.room.saveRoomSettingsBtn?.addEventListener("click", () => saveRoomSettings().catch(handleError));

  ui.battle.attackActionBtn?.addEventListener("click", () => {
    if (!state.currentRoom?.battle) return;
    show(ui.battle.attackMenu);
    hide(ui.battle.actions);
    renderAttackBuilder(state.currentRoom);
  });
  ui.battle.backToActionsBtn?.addEventListener("click", () => {
    hide(ui.battle.attackMenu);
    show(ui.battle.actions);
  });
  ui.battle.confirmAttackPlanBtn?.addEventListener("click", () => submitAttackPlanFromBuilder().catch(handleError));
  ui.battle.defendActionBtn?.addEventListener("click", () => submitDefend().catch(handleError));
  ui.battle.escapeActionBtn?.addEventListener("click", () => submitEscape().catch(handleError));

  ui.publicProfiles.searchInput?.addEventListener("input", () => renderPublicProfiles());
  ui.publicProfiles.searchBtn?.addEventListener("click", () => renderPublicProfiles());

  bindProfileCardActions();
  bindRoomActions();

  onAuthStateChanged(auth, user => {
    if (user) handleSignedInUser(user).catch(handleError);
    else handleSignedOutUser();
  });
}

function handleError(error) {
  console.error(error);
  notifyError(error?.message || "Что-то пошло не так.");
}

function stopRoomTimer() {
  if (state.roomTimerInterval) {
    clearInterval(state.roomTimerInterval);
    state.roomTimerInterval = null;
  }
}

function startRoomTimer(deadline, onExpire) {
  stopRoomTimer();
  if (!deadline) {
    text(ui.room.roomTimer, "00:00");
    return;
  }

  state.roomTimerInterval = setInterval(() => {
    const left = Math.max(0, deadline - now());
    const minutes = String(Math.floor(left / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    text(ui.room.roomTimer, `${minutes}:${seconds}`);
    if (left <= 0) {
      stopRoomTimer();
      if (typeof onExpire === "function") onExpire();
    }
  }, 1000);
}

bindUi();
loadRecentFeedEntries().then(renderFeedTicker).catch(console.error);
