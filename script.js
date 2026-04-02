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
const ROOM_RULES_VERSION = "room_rules_v4_group_2026_04_01";

const ROOM_CODE_LENGTH = 6;
const MAX_LOG_ITEMS = 80;
const MAX_DODGES = 4;
const ROOM_SOFT_LIMIT = 6;
const READY_TIMEOUT_MS = 10 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const PAIR_COOLDOWN_DAYS = 3;
const FEED_LIMIT = 20;

const LOCAL_KEYS = {
  activeRoom: "zenith_active_room_v4",
  theme: "zenith_theme_v3",
  cardStyle: "zenith_card_style_v1",
  readRules: "zenith_read_rules_v4"
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
  autumn: { id: "autumn", label: "Осень" },
  waterfall: { id: "waterfall", label: "Водопад" },
  garnet: { id: "garnet", label: "Гранат" },
  greenery: { id: "greenery", label: "Зелень" },
  raspberry: { id: "raspberry", label: "Малина" },
  sea: { id: "sea", label: "Море" }
};

const CARD_STYLES = {
  smooth: { id: "smooth", label: "Гладкие" },
  antique: { id: "antique", label: "Старинные" },
  sharp: { id: "sharp", label: "Острые" },
  velvet: { id: "velvet", label: "Бархатные" }
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
    label: "Сила удара: удар лапой",
    increment: 5,
    cap: 30,
    maxCount: 5,
    unit: "%"
  },
  bitePower: {
    id: "bitePower",
    label: "Сила удара: подсечка",
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

const GROUP_MODES = {
  duel: {
    id: "duel",
    label: "1 на 1",
    type: "team",
    sideOptions: ["A", "B"],
    exactSides: { A: 1, B: 1 },
    maxPlayers: 2,
    description: "Обычная дуэль. По одному персонажу на сторону."
  },
  team_2v1: {
    id: "team_2v1",
    label: "2 на 1",
    type: "team",
    sideOptions: ["A", "B"],
    exactSides: { A: 2, B: 1 },
    mirrored: true,
    maxPlayers: 3,
    description: "Двое против одного. Больше двух на одного здесь не бывает."
  },
  team_2v2: {
    id: "team_2v2",
    label: "2 на 2",
    type: "team",
    sideOptions: ["A", "B"],
    exactSides: { A: 2, B: 2 },
    maxPlayers: 4,
    description: "Две команды по два персонажа."
  },
  team_3v2: {
    id: "team_3v2",
    label: "3 на 2",
    type: "team",
    sideOptions: ["A", "B"],
    exactSides: { A: 3, B: 2 },
    mirrored: true,
    maxPlayers: 5,
    description: "Максимум трое на стороне и максимум двое против них."
  },
  team_3v3: {
    id: "team_3v3",
    label: "3 на 3",
    type: "team",
    sideOptions: ["A", "B"],
    exactSides: { A: 3, B: 3 },
    maxPlayers: 6,
    description: "Полный групповой формат."
  },
  ffa3: {
    id: "ffa3",
    label: "Каждый сам за себя (3)",
    type: "ffa",
    sideOptions: ["solo"],
    exactSolo: 3,
    maxPlayers: 3,
    description: "Три персонажа дерутся каждый сам за себя."
  }
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
  currentParticipantKey: "",
  currentScreen: "auth",
  isAdmin: false,
  isBlocked: false,
  activeTheme: THEMES.crimsonNight.id,
  activeCardStyle: CARD_STYLES.smooth.id,
  feedCache: [],
  publicCharactersCache: [],
  adminUsersCache: {},
  adminRoomsCache: {},
  adminMatchesCache: {},
  roomTimerInterval: null,
  modalResolver: null,
  modalSerializer: null,
  modalRoot: null,
  toastContainer: null,
  unsubscribeRoom: null,
  unsubscribeFeed: null,
  unsubscribeUsers: null,
  unsubscribeRooms: null,
  unsubscribeMatches: null,
  shownRulesByRoom: {},
  planningAttack: null,
  currentRoomSnapshot: null
};

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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomRoll() {
  return Math.floor(Math.random() * 100) + 1;
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
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
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
  return parts.map(item => item[0]?.toUpperCase() || "").join("") || "✦";
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function saveActiveRoomLocal(roomCode) {
  localStorage.setItem(LOCAL_KEYS.activeRoom, JSON.stringify({ roomCode }));
}

function readActiveRoomLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS.activeRoom);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearActiveRoomLocal() {
  localStorage.removeItem(LOCAL_KEYS.activeRoom);
}

function saveThemeLocal(themeId) {
  localStorage.setItem(LOCAL_KEYS.theme, themeId);
}

function readThemeLocal() {
  return localStorage.getItem(LOCAL_KEYS.theme) || THEMES.crimsonNight.id;
}

function saveCardStyleLocal(styleId) {
  localStorage.setItem(LOCAL_KEYS.cardStyle, styleId);
}

function readCardStyleLocal() {
  return localStorage.getItem(LOCAL_KEYS.cardStyle) || CARD_STYLES.smooth.id;
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

function applyCardStyle(styleId) {
  state.activeCardStyle = CARD_STYLES[styleId] ? styleId : CARD_STYLES.smooth.id;
  document.body.dataset.cardStyle = state.activeCardStyle;
  if (ui.shell.cardStyleSelect) ui.shell.cardStyleSelect.value = state.activeCardStyle;
  saveCardStyleLocal(state.activeCardStyle);
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

function getPairKey(uidA, charA, uidB, charB) {
  return [getCharacterGlobalId(uidA, charA), getCharacterGlobalId(uidB, charB)].sort().join("--");
}

function getTrainingStatusLabel(status) {
  return status === "apprentice" ? "Оруженосец" : "Воитель";
}

function getModeLabel(modeId) {
  return GROUP_MODES[modeId]?.label || "—";
}

function getRoomStatusLabel(status) {
  if (status === "waiting") return "набор комнаты";
  if (status === "ready") return "ожидание готовности";
  if (status === "battle") return "идёт тренировка";
  if (status === "finished") return "тренировка завершена";
  return "—";
}

function getSideLabel(side, modeId) {
  if (GROUP_MODES[modeId]?.type === "ffa") return "Сам за себя";
  if (side === "A") return "Сторона A";
  if (side === "B") return "Сторона B";
  return "—";
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
  return { sand: 0, paw: 0, trip: 0 };
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
  return { totalAttacks: 0, hits: 0, misses: 0 };
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
    cardStyleId: readCardStyleLocal(),
    createdAt: now(),
    updatedAt: now()
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
      favoriteMoveCounters: { ...base.analytics.favoriteMoveCounters, ...(raw?.analytics?.favoriteMoveCounters || {}) },
      accuracy: { ...base.analytics.accuracy, ...(raw?.analytics?.accuracy || {}) },
      targets: { ...base.analytics.targets, ...(raw?.analytics?.targets || {}) }
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
  const value = raw || {};
  return {
    name: value.name || "Без имени",
    clan: value.clan || "",
    trainingStatus: value.trainingStatus || "warrior",
    ownerNote: value.ownerNote || "",
    combatBase: normalizeCombatBase(value.combatBase),
    profileStats: {
      wins: value.profileStats?.wins ?? 0,
      losses: value.profileStats?.losses ?? 0,
      draws: value.profileStats?.draws ?? 0,
      lastBattleAt: value.profileStats?.lastBattleAt ?? 0,
      lastOpponentName: value.profileStats?.lastOpponentName ?? ""
    },
    training: normalizeTrainingProfile(value.training),
    createdAt: value.createdAt ?? now(),
    updatedAt: value.updatedAt ?? now()
  };
}

function createDefaultEffects() {
  return {
    stunTurns: 0,
    accuracyPenaltyTurns: 0,
    dotDamage: 0,
    pendingDotDamage: 0,
    dodgesLeft: MAX_DODGES,
    guardCharges: 0
  };
}

function createBattleAnalyticsBlock() {
  return {
    favoriteMoveCounters: createDefaultFavoriteCounters(),
    accuracy: createDefaultAccuracyStats(),
    targets: createDefaultTargetCounters()
  };
}

function normalizeEffects(raw) {
  const base = createDefaultEffects();
  return {
    stunTurns: raw?.stunTurns ?? base.stunTurns,
    accuracyPenaltyTurns: raw?.accuracyPenaltyTurns ?? base.accuracyPenaltyTurns,
    dotDamage: raw?.dotDamage ?? base.dotDamage,
    pendingDotDamage: raw?.pendingDotDamage ?? base.pendingDotDamage,
    dodgesLeft: raw?.dodgesLeft ?? base.dodgesLeft,
    guardCharges: raw?.guardCharges ?? base.guardCharges
  };
}

function normalizeBattleFighter(raw) {
  return {
    uid: raw?.uid || "",
    profileName: raw?.profileName || "",
    characterId: raw?.characterId || "",
    characterName: raw?.characterName || "",
    clan: raw?.clan || "",
    trainingStatus: raw?.trainingStatus || "warrior",
    side: raw?.side || "A",
    combat: normalizeCombatBase(raw?.combat),
    hp: raw?.hp ?? 100,
    alive: raw?.alive !== false,
    escaped: Boolean(raw?.escaped),
    effects: normalizeEffects(raw?.effects),
    analytics: {
      favoriteMoveCounters: { ...createDefaultFavoriteCounters(), ...(raw?.analytics?.favoriteMoveCounters || {}) },
      accuracy: { ...createDefaultAccuracyStats(), ...(raw?.analytics?.accuracy || {}) },
      targets: { ...createDefaultTargetCounters(), ...(raw?.analytics?.targets || {}) }
    }
  };
}

function normalizeBattle(raw) {
  const fighters = Object.fromEntries(
    Object.entries(raw?.fighters || {}).map(([key, value]) => [key, normalizeBattleFighter(value)])
  );
  return {
    modeId: raw?.modeId || "duel",
    startedAt: raw?.startedAt ?? 0,
    completedAt: raw?.completedAt ?? 0,
    lastActionAt: raw?.lastActionAt ?? 0,
    inactivityDeadlineAt: raw?.inactivityDeadlineAt ?? 0,
    turnQueue: safeArray(raw?.turnQueue),
    turnIndex: raw?.turnIndex ?? 0,
    roundNumber: raw?.roundNumber ?? 1,
    fighters,
    lastMessage: raw?.lastMessage || "Тренировка началась.",
    log: safeArray(raw?.log),
    pendingRoundCards: safeArray(raw?.pendingRoundCards),
    finished: Boolean(raw?.finished),
    winnerSide: raw?.winnerSide || "",
    winnerUid: raw?.winnerUid || "",
    finishReason: raw?.finishReason || ""
  };
}

function createDefaultRoom(code, participant) {
  return {
    code,
    status: "waiting",
    modeId: "duel",
    createdAt: now(),
    createdBy: participant.uid,
    participants: {
      [participant.uid]: participant
    },
    readyMap: {
      [participant.uid]: false
    },
    battle: null,
    finishInfo: null,
    matchId: "",
    creditPreview: {
      badge: "Зачёта не будет",
      reason: "Сначала собери корректный состав комнаты.",
      eligibleByParticipant: {}
    }
  };
}

function normalizeParticipant(raw) {
  return {
    uid: raw?.uid || "",
    profileName: raw?.profileName || "",
    characterId: raw?.characterId || "",
    characterName: raw?.characterName || "",
    clan: raw?.clan || "",
    trainingStatus: raw?.trainingStatus || "warrior",
    side: raw?.side || "A",
    joinedAt: raw?.joinedAt ?? now()
  };
}

function normalizeRoom(raw) {
  const participants = Object.fromEntries(
    Object.entries(raw?.participants || {}).map(([key, value]) => [key, normalizeParticipant(value)])
  );

  return {
    code: raw?.code || "",
    status: raw?.status || "waiting",
    modeId: raw?.modeId || "duel",
    createdAt: raw?.createdAt ?? now(),
    createdBy: raw?.createdBy || "",
    participants,
    readyMap: raw?.readyMap || {},
    battle: raw?.battle ? normalizeBattle(raw.battle) : null,
    finishInfo: raw?.finishInfo || null,
    matchId: raw?.matchId || "",
    creditPreview: raw?.creditPreview || {
      badge: "Зачёта не будет",
      reason: "Сначала собери корректный состав комнаты.",
      eligibleByParticipant: {}
    }
  };
}

function getSortedCharacters(source = state.characters) {
  return Object.entries(source || {})
    .map(([id, value]) => ({ id, ...normalizeCharacter(value) }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
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
    bitePower: normalized.combatBase.bitePower + bonus.bitePower,
    bonus
  };
}

function getRemainingUpgradeSlotsByType(character, type) {
  const definition = UPGRADE_DEFINITIONS[type];
  if (!definition) return 0;
  return Math.max(0, definition.maxCount - getUpgradeCountByType(getCurrentUpgradePool(character), type));
}

function getRemainingUpgradeSlotsTotal(character) {
  return Object.keys(UPGRADE_DEFINITIONS).reduce((sum, type) => sum + getRemainingUpgradeSlotsByType(character, type), 0);
}

function canEarnAnyMoreUpgrades(character) {
  return getRemainingUpgradeSlotsTotal(character) > 0;
}

function canAddUpgradeOfType(character, type) {
  const definition = UPGRADE_DEFINITIONS[type];
  if (!definition) return false;
  const normalized = normalizeCharacter(character);
  const currentCount = getUpgradeCountByType(getCurrentUpgradePool(normalized), type);
  if (currentCount >= definition.maxCount) return false;
  const totals = getCombatViewTotals(normalized);
  return totals[type] + definition.increment <= definition.cap;
}

function createUpgradeRecord(type, sourceStatus, matchId = "") {
  return {
    id: `${type}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    label: UPGRADE_DEFINITIONS[type].label,
    value: UPGRADE_DEFINITIONS[type].increment,
    sourceStatus,
    matchId,
    createdAt: now()
  };
}

function getPendingChoiceCount(character) {
  return normalizeCharacter(character).training.progress.pendingUpgradePoints || 0;
}

function addPendingUpgradePoints(character, count = 1) {
  const next = deepClone(normalizeCharacter(character));
  next.training.progress.pendingUpgradePoints += Math.min(count, getRemainingUpgradeSlotsTotal(next));
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
  const next = consumePendingUpgradePoint(character);
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

function ensureUiChrome() {
  if (!state.toastContainer) {
    const node = document.createElement("div");
    node.className = "zenith-toast-container";
    document.body.appendChild(node);
    state.toastContainer = node;
  }

  if (!state.modalRoot) {
    const node = document.createElement("div");
    node.className = "zenith-modal-root hidden";
    node.innerHTML = `
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
    document.body.appendChild(node);
    state.modalRoot = node;

    const resolveModal = payload => {
      if (!state.modalResolver) return;
      const resolver = state.modalResolver;
      state.modalResolver = null;
      state.modalSerializer = null;
      hide(node);
      html(byId("zenithModalBody"), "");
      resolver(payload);
    };

    byId("zenithModalClose")?.addEventListener("click", () => {
      if (node.dataset.allowClose === "false") return;
      resolveModal({ confirmed: false, value: null });
    });

    node.querySelector(".zenith-modal-backdrop")?.addEventListener("click", () => {
      if (node.dataset.allowClose === "false") return;
      resolveModal({ confirmed: false, value: null });
    });

    byId("zenithModalCancel")?.addEventListener("click", () => {
      resolveModal({ confirmed: false, value: null });
    });

    byId("zenithModalConfirm")?.addEventListener("click", () => {
      const serializer = state.modalSerializer;
      resolveModal({
        confirmed: true,
        value: typeof serializer === "function" ? serializer(node) : true
      });
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
  if (variant === "default") text(ui.shell.globalNotice, message);
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

async function openConfirmModal({ title, text: bodyText, confirmLabel = "Подтвердить", cancelLabel = "Отмена" }) {
  const result = await openModal({ title, text: bodyText, confirmLabel, cancelLabel, showCancel: true, allowClose: true });
  return result.confirmed;
}

async function openInfoModal({ title, text: bodyText = "", bodyHtml = "", confirmLabel = "Я понял", allowClose = false }) {
  const result = await openModal({ title, text: bodyText, bodyHtml, confirmLabel, cancelLabel: "", showCancel: false, allowClose });
  return result.confirmed;
}

async function openChoiceModal({ title, text: bodyText = "", choices = [], confirmLabel = "Выбрать", cancelLabel = "Отмена" }) {
  const result = await openModal({
    title,
    text: bodyText,
    bodyHtml: choices.map((item, index) => `
      <label class="zenith-choice-item">
        <input type="radio" name="zenithModalChoice" value="${escapeHtml(item.value)}" ${index === 0 ? "checked" : ""} />
        <span>${escapeHtml(item.label)}</span>
      </label>
    `).join(""),
    confirmLabel,
    cancelLabel,
    showCancel: true,
    allowClose: true,
    serializer: root => root.querySelector("input[name='zenithModalChoice']:checked")?.value || null
  });
  return result.confirmed ? result.value : null;
}

function injectGroupUi() {
  if (byId("groupModeSelect")) return;

  const roomSide = document.querySelector("#roomScreen .room-side");
  const creditCard = document.querySelector("#roomScreen .room-credit-card");
  if (!roomSide || !creditCard) return;

  const card = document.createElement("div");
  card.className = "room-card";
  card.innerHTML = `
    <div class="card-title-row">
      <span class="card-title-mark">✦</span>
      <h3 class="card-title-text">Формат комнаты</h3>
    </div>
    <label class="field-block">
      <span class="field-label">Режим тренировки</span>
      <select id="groupModeSelect" class="field-select">
        ${Object.values(GROUP_MODES).map(mode => `<option value="${mode.id}">${mode.label}</option>`).join("")}
      </select>
    </label>
    <div id="groupModeHelp" class="training-credit-reason">${escapeHtml(GROUP_MODES.duel.description)}</div>
    <div id="groupModeValidity" class="training-credit-reason">Собери состав комнаты и расставь стороны.</div>
  `;
  roomSide.insertBefore(card, creditCard);

  const style = document.createElement("style");
  style.textContent = `
    .group-inline-select { margin-top: 12px; }
    .room-player-side-label { margin-top: 8px; color: var(--muted); font-size: 13px; }
    .room-player-side-value { margin-top: 6px; color: var(--accent-3); font-weight: 800; }
    .group-valid-good { color: var(--accent-3); }
    .group-valid-bad { color: #ffd9df; }
    .battle-plan-line { margin-top: 10px; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); color: var(--muted); }
    .battle-plan-targets { margin-top: 12px; display: grid; gap: 8px; }
  `;
  document.head.appendChild(style);
}

function getRoomRulesHtml() {
  return `
    <div class="room-rules-sheet">
      <div class="room-rules-section">
        <div class="room-rules-title">Теперь в комнате можно до шести игроков</div>
        <ul>
          <li>доступны форматы 1 на 1, 2 на 1, 2 на 2, 3 на 2, 3 на 3 и каждый сам за себя на троих;</li>
          <li>в командных режимах один персонаж может за свой ход назначить удары всем живым противникам по очереди;</li>
          <li>в формате «каждый сам за себя» участвуют ровно три персонажа.</li>
        </ul>
      </div>
      <div class="room-rules-section">
        <div class="room-rules-title">Зачёт в групповых тренировках</div>
        <ul>
          <li>каждый персонаж всё равно может получить максимум один зачёт за один завершённый бой;</li>
          <li>дневной лимит остаётся прежним: если персонаж уже получил зачёт сегодня, второй не дадут;</li>
          <li>откаты считаются попарно между противниками из разных сторон.</li>
        </ul>
      </div>
      <div class="room-rules-section">
        <div class="room-rules-title">Откат пары</div>
        <div class="room-rules-note">
          После завершённой тренировки каждая пара противников уходит на откат на 3 дня. До конца отката тренироваться можно, но без зачёта.
        </div>
      </div>
      <div class="room-rules-section">
        <div class="room-rules-title">Пороги улучшений</div>
        <ul>
          <li>воитель: 3 засчитанные победы или 5 засчитанных поражений дают 1 улучшение;</li>
          <li>оруженосец: 5 засчитанные победы или 7 засчитанных поражений дают 1 улучшение.</li>
        </ul>
      </div>
    </div>
  `;
}

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
  if (snapshot.exists()) return snapshot.val();
  const profile = createDefaultProfile(fallbackName || user.email?.split("@")[0] || "Зенит");
  await set(profileRef, profile);
  return profile;
}

async function loadOwnCharacters() {
  if (!state.user) return {};
  const snapshot = await get(ref(db, getCharactersPath(state.user.uid)));
  const value = snapshot.exists() ? snapshot.val() : {};
  state.characters = Object.fromEntries(
    Object.entries(value).map(([id, item]) => [id, normalizeCharacter(item)])
  );
  return state.characters;
}

async function saveProfileStatus() {
  if (!requireAuth()) return;
  const statusValue = ui.profile.statusInput?.value.trim() || "✦ Наблюдает за бабочками";
  await update(ref(db, getProfilePath(state.user.uid)), {
    displayName: state.userProfile?.displayName || state.user.email?.split("@")[0] || "Зенит",
    status: statusValue,
    updatedAt: now()
  });
  state.userProfile = await loadUserProfile(state.user.uid);
  notify("Профиль обновлён.");
  renderProfile();
}

async function savePortraitSymbol() {
  if (!requireAuth()) return;
  const symbol = ui.profile.symbolSelect?.value || "✦";
  await update(ref(db, getProfilePath(state.user.uid)), { portraitSymbol: symbol, updatedAt: now() });
  state.userProfile = await loadUserProfile(state.user.uid);
  notify("Знак профиля обновлён.");
  renderProfile();
}

async function saveActiveCharacter(characterId) {
  if (!requireAuth()) return;
  await update(ref(db, getProfilePath(state.user.uid)), {
    activeCharacterId: characterId || "",
    updatedAt: now()
  });
  state.userProfile = await loadUserProfile(state.user.uid);
  renderProfile();
}

async function saveOwnerNote(characterId, noteText) {
  if (!requireAuth() || !characterId) return;
  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    ownerNote: noteText || "",
    updatedAt: now()
  });
  await loadOwnCharacters();
  notify("Заметка сохранена.");
  renderProfile();
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
  await set(charRef, createDefaultCharacter(name, clan, trainingStatus));

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
  renderProfile();
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
          <input id="zenithModalCharName" type="text" value="${escapeHtml(current.name)}" />
        </label>
        <label class="zenith-input-label">
          <span>Племя</span>
          <input id="zenithModalCharClan" type="text" value="${escapeHtml(current.clan)}" />
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

async function editCharacter(characterId) {
  if (!requireAuth()) return;
  const character = getCharacterById(characterId);
  if (!character) return;
  const next = await openCharacterEditModal(character);
  if (!next) return;

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    name: next.name || character.name || "Без имени",
    clan: next.clan || "",
    updatedAt: now()
  });

  await loadOwnCharacters();
  notify("Персонаж обновлён.");
  renderProfile();
}

async function deleteCharacter(characterId) {
  if (!requireAuth()) return;
  const character = getCharacterById(characterId);
  if (!character) return;

  const ok = await openConfirmModal({
    title: "Удаление персонажа",
    text: `Удалить персонажа «${character.name}»?`,
    confirmLabel: "Удалить"
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
  renderProfile();
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

  const branch = await openChoiceModal({
    title: "Выбор улучшения",
    text: `${normalized.name} может получить улучшение. Доступно: ${pending}.`,
    choices: [
      { value: "accuracy", label: "Повысить шанс попадания" },
      { value: "dodge", label: "Повысить шанс уворота" },
      { value: "power", label: "Повысить силу удара" }
    ]
  });
  if (!branch) return false;

  let finalType = branch;
  if (branch === "power") {
    finalType = await openChoiceModal({
      title: "Сила удара",
      text: "Какой именно удар усилить?",
      choices: [
        { value: "clawPower", label: "Удар лапой" },
        { value: "bitePower", label: "Подсечка" }
      ]
    });
    if (!finalType) return false;
  }

  if (!canAddUpgradeOfType(normalized, finalType)) {
    notifyError("Это направление уже упёрлось в лимит.");
    return false;
  }

  const nextCharacter = addUpgradeToCurrentPool(normalized, finalType, matchId);
  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    training: nextCharacter.training,
    updatedAt: now()
  });

  await loadOwnCharacters();
  await pushFeedEntry({
    type: FEED_TYPES.UPGRADE_GAINED,
    createdAt: now(),
    text: `Персонаж ${nextCharacter.name} получает улучшение «${UPGRADE_DEFINITIONS[finalType].label}».`,
    characterName: nextCharacter.name,
    upgradeLabel: UPGRADE_DEFINITIONS[finalType].label
  });

  notify(`Улучшение «${UPGRADE_DEFINITIONS[finalType].label}» получено.`);
  renderProfile();
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
      ? `${normalized.name} может перенести ${transferLimit} улучшение(й).`
      : `${normalized.name} будет посвящён в воители без переноса улучшений.`
  });
  if (!ok) return false;

  const selectedIds = [];
  for (let i = 0; i < transferLimit; i += 1) {
    const remaining = apprenticeUpgrades.filter(item => !selectedIds.includes(item.id));
    if (!remaining.length) break;

    const selected = await openChoiceModal({
      title: `Перенос улучшения ${i + 1} из ${transferLimit}`,
      text: "Выбери улучшение, которое нужно сохранить.",
      choices: remaining.map(item => ({ value: item.id, label: item.label })),
      confirmLabel: "Сохранить",
      cancelLabel: "Пропустить"
    });

    if (!selected) break;
    selectedIds.push(selected);
  }

  const transferred = apprenticeUpgrades.filter(item => selectedIds.includes(item.id));
  const next = deepClone(normalized);

  next.trainingStatus = "warrior";
  next.training.warriorUpgrades = [
    ...next.training.warriorUpgrades,
    ...transferred.map(item => ({ ...item, sourceStatus: "apprentice" }))
  ];
  next.training.apprenticeUpgrades = [];
  next.training.promotion.canTransferNow = false;
  next.training.promotion.transferredAt = now();
  next.training.promotion.transferredCount = transferred.length;
  next.training.promotion.lastTransferSummary = transferred.length
    ? transferred.map(item => item.label).join(", ")
    : "без переноса";

  next.training.upgradeHistory.unshift({
    id: `promotion_${Math.random().toString(36).slice(2, 9)}`,
    action: "promotion_transfer",
    label: next.training.promotion.lastTransferSummary,
    createdAt: now()
  });

  next.updatedAt = now();

  await update(ref(db, getCharacterPath(state.user.uid, characterId)), {
    trainingStatus: "warrior",
    training: next.training,
    updatedAt: now()
  });

  await loadOwnCharacters();
  await pushFeedEntry({
    type: FEED_TYPES.PROMOTION_TRANSFER,
    createdAt: now(),
    text: `Персонаж ${next.name} посвящается в воители и переносит прогресс: ${next.training.promotion.lastTransferSummary}.`,
    characterName: next.name,
    transferSummary: next.training.promotion.lastTransferSummary
  });

  notify(`${next.name} посвящён в воители.`);
  renderProfile();
  return true;
}

async function bootstrapAdmin(user) {
  if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return false;
  const adminRef = ref(db, `system/admins/${user.uid}`);
  const snapshot = await get(adminRef);
  if (!snapshot.exists()) {
    await set(adminRef, { uid: user.uid, email: user.email, createdAt: now() });
  }
  return true;
}

async function checkAdmin(user) {
  if (!user) return false;
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
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
  clearActiveRoomLocal();
  state.currentRoomCode = "";
  state.currentParticipantKey = "";
  state.currentRoomSnapshot = null;
  stopRoomTimer();
  text(ui.auth.status, "Вы не вошли в аккаунт.");
  notify("Вы вышли из аккаунта.");
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
}

function handleSignedOutUser() {
  state.user = null;
  state.userProfile = null;
  state.characters = {};
  state.currentRoomCode = "";
  state.currentParticipantKey = "";
  state.currentRoomSnapshot = null;
  state.isAdmin = false;
  state.isBlocked = false;
  state.feedCache = [];
  state.publicCharactersCache = [];
  state.adminUsersCache = {};
  state.adminRoomsCache = {};
  state.adminMatchesCache = {};
  stopRoomTimer();
  renderRoomBadge();
  text(ui.auth.status, "Вы не вошли в аккаунт.");
}

function createParticipantFromSelectedCharacter() {
  const characterId = getSelectedCharacterId();
  const character = getCharacterById(characterId);
  if (!characterId || !character) return null;

  return {
    uid: state.user.uid,
    profileName: state.userProfile?.displayName || "Зенит",
    characterId,
    characterName: character.name,
    clan: character.clan || "",
    trainingStatus: character.trainingStatus || "warrior",
    side: "A",
    joinedAt: now()
  };
}

function getParticipantKeys(room) {
  return Object.keys(room?.participants || {});
}

function getParticipantsArray(room) {
  return getParticipantKeys(room).map(key => normalizeParticipant(room.participants[key]));
}

function getParticipantByUid(room, uid) {
  return room?.participants?.[uid] ? normalizeParticipant(room.participants[uid]) : null;
}

function getSideCounts(room) {
  const counts = { A: 0, B: 0, solo: 0 };
  getParticipantsArray(room).forEach(participant => {
    if (participant.side === "A") counts.A += 1;
    else if (participant.side === "B") counts.B += 1;
    else counts.solo += 1;
  });
  return counts;
}

function normalizeSidesForMode(room) {
  const mode = GROUP_MODES[room.modeId] || GROUP_MODES.duel;
  const next = deepClone(room);
  Object.keys(next.participants || {}).forEach(uid => {
    if (mode.type === "ffa") next.participants[uid].side = "solo";
    else if (!["A", "B"].includes(next.participants[uid].side)) next.participants[uid].side = "A";
  });
  return next;
}

function getRoomValidation(room) {
  const normalized = normalizeRoom(room);
  const mode = GROUP_MODES[normalized.modeId] || GROUP_MODES.duel;
  const participants = getParticipantsArray(normalized);
  const counts = getSideCounts(normalized);

  if (!participants.length) {
    return { valid: false, message: "В комнате пока нет участников." };
  }

  if (participants.length > ROOM_SOFT_LIMIT) {
    return { valid: false, message: "В одной комнате может быть не больше шести игроков." };
  }

  if (participants.length > mode.maxPlayers) {
    return { valid: false, message: `Для режима «${mode.label}» слишком много участников.` };
  }

  if (mode.type === "ffa") {
    if (counts.solo !== mode.exactSolo || participants.length !== mode.exactSolo) {
      return { valid: false, message: "Для режима «каждый сам за себя» нужно ровно три персонажа." };
    }
    return { valid: true, message: "Состав корректный: трое дерутся каждый сам за себя." };
  }

  const exactA = mode.exactSides.A;
  const exactB = mode.exactSides.B;
  const directMatch = counts.A === exactA && counts.B === exactB;
  const mirroredMatch = Boolean(mode.mirrored) && counts.A === exactB && counts.B === exactA;

  if (directMatch || mirroredMatch) {
    return {
      valid: true,
      message: `Состав корректный: ${counts.A} против ${counts.B}.`
    };
  }

  return {
    valid: false,
    message: `Для режима «${mode.label}» нужен состав ${exactA}×${exactB}${mode.mirrored ? " (или наоборот)" : ""}. Сейчас: ${counts.A}×${counts.B}.`
  };
}

function canCurrentUserChangeMode(room) {
  return Boolean(state.user && room?.createdBy === state.user.uid && room.status !== "battle");
}

function canCurrentUserChangeOwnSide(room) {
  return Boolean(state.user && room.status !== "battle" && room.status !== "finished");
}

async function setRoomMode(modeId) {
  if (!requireAuth() || !state.currentRoomCode) return;
  const room = state.currentRoomSnapshot ? normalizeRoom(state.currentRoomSnapshot) : null;
  if (!room || !canCurrentUserChangeMode(room)) {
    notifyError("Менять режим комнаты может только создатель до начала боя.");
    return;
  }

  let next = normalizeSidesForMode({ ...room, modeId });
  next.readyMap = Object.fromEntries(Object.keys(next.participants).map(uid => [uid, false]));

  await update(ref(db, getRoomPath(state.currentRoomCode)), {
    modeId,
    participants: next.participants,
    readyMap: next.readyMap,
    status: getParticipantKeys(next).length > 1 ? "ready" : "waiting",
    battle: null,
    finishInfo: null,
    matchId: ""
  });

  notify(`Режим комнаты: ${GROUP_MODES[modeId]?.label || modeId}.`);
}

async function setMySide(side) {
  if (!requireAuth() || !state.currentRoomCode) return;
  const room = state.currentRoomSnapshot ? normalizeRoom(state.currentRoomSnapshot) : null;
  if (!room || !canCurrentUserChangeOwnSide(room)) return;
  const mode = GROUP_MODES[room.modeId] || GROUP_MODES.duel;
  const allowed = mode.type === "ffa" ? "solo" : side;

  await update(ref(db, getRoomPath(state.currentRoomCode)), {
    [`participants/${state.user.uid}/side`]: allowed,
    [`readyMap/${state.user.uid}`]: false,
    status: getParticipantKeys(room).length > 1 ? "ready" : "waiting",
    battle: null,
    finishInfo: null,
    matchId: ""
  });
}

async function createRoom() {
  if (!requireAuth()) return;
  const participant = createParticipantFromSelectedCharacter();
  if (!participant) {
    notifyError("Сначала выбери активного персонажа в профиле.");
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

  await set(ref(db, getRoomPath(roomCode)), createDefaultRoom(roomCode, participant));

  state.currentRoomCode = roomCode;
  state.currentParticipantKey = state.user.uid;
  saveActiveRoomLocal(roomCode);
  watchCurrentRoom();
  setScreen("room");
  notify(`Комната ${roomCode} создана.`);
}

async function joinRoom() {
  if (!requireAuth()) return;
  const roomCode = (ui.room.roomCodeInput?.value || "").trim().toUpperCase();
  if (!roomCode) {
    notifyError("Впиши код комнаты.");
    return;
  }

  const participant = createParticipantFromSelectedCharacter();
  if (!participant) {
    notifyError("Сначала выбери активного персонажа в профиле.");
    return;
  }

  const roomRef = ref(db, getRoomPath(roomCode));
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    notifyError("Комната не найдена.");
    return;
  }

  const room = normalizeRoom(snapshot.val());

  if (room.participants[state.user.uid]) {
    state.currentRoomCode = roomCode;
    state.currentParticipantKey = state.user.uid;
    saveActiveRoomLocal(roomCode);
    watchCurrentRoom();
    setScreen("room");
    notify(`Вы вернулись в комнату ${roomCode}.`);
    return;
  }

  if (getParticipantKeys(room).length >= ROOM_SOFT_LIMIT) {
    notifyError("В комнате уже максимальное число игроков.");
    return;
  }

  const mode = GROUP_MODES[room.modeId] || GROUP_MODES.duel;
  const counts = getSideCounts(room);
  let defaultSide = mode.type === "ffa" ? "solo" : "A";
  if (mode.type === "team") {
    defaultSide = counts.A <= counts.B ? "A" : "B";
  }

  await update(roomRef, {
    [`participants/${state.user.uid}`]: { ...participant, side: defaultSide },
    [`readyMap/${state.user.uid}`]: false,
    status: getParticipantKeys(room).length + 1 > 1 ? "ready" : "waiting",
    battle: null,
    finishInfo: null,
    matchId: ""
  });

  state.currentRoomCode = roomCode;
  state.currentParticipantKey = state.user.uid;
  saveActiveRoomLocal(roomCode);
  watchCurrentRoom();
  setScreen("room");
  notify(`Вы вошли в комнату ${roomCode}.`);
}

async function tryAutoJoinSavedRoom() {
  if (!state.user) return;
  const saved = readActiveRoomLocal();
  if (!saved?.roomCode) return;

  const snapshot = await get(ref(db, getRoomPath(saved.roomCode)));
  if (!snapshot.exists()) {
    clearActiveRoomLocal();
    return;
  }

  const room = normalizeRoom(snapshot.val());
  if (!room.participants[state.user.uid]) {
    clearActiveRoomLocal();
    return;
  }

  state.currentRoomCode = saved.roomCode;
  state.currentParticipantKey = state.user.uid;
}

async function leaveRoom() {
  if (!requireAuth() || !state.currentRoomCode) {
    notifyError("Вы сейчас не в комнате.");
    return;
  }

  const roomRef = ref(db, getRoomPath(state.currentRoomCode));
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    clearActiveRoomLocal();
    state.currentRoomCode = "";
    state.currentParticipantKey = "";
    return;
  }

  const room = normalizeRoom(snapshot.val());
  if (room.status === "battle") {
    notifyError("Во время тренировки нужно использовать действие «Убежать», а не обычный выход.");
    return;
  }

  const participants = getParticipantKeys(room);
  if (room.createdBy === state.user.uid || participants.length <= 1) {
    await remove(roomRef);
    notify("Комната закрыта.");
  } else {
    const updates = {
      [`participants/${state.user.uid}`]: null,
      [`readyMap/${state.user.uid}`]: null,
      battle: null,
      finishInfo: null,
      matchId: ""
    };
    updates.status = participants.length - 1 > 1 ? "ready" : "waiting";
    await update(roomRef, updates);
    notify("Вы покинули комнату.");
  }

  clearActiveRoomLocal();
  state.currentRoomCode = "";
  state.currentParticipantKey = "";
  state.currentRoomSnapshot = null;
  renderRoomIdleState();
}

async function tryStartBattleAutomatically(room) {
  const normalized = normalizeRoom(room);
  if (!normalized || !state.currentRoomCode) return;
  if (normalized.status === "battle" || normalized.status === "finished") return;

  const validation = getRoomValidation(normalized);
  if (!validation.valid) return;

  const participants = getParticipantKeys(normalized);
  if (participants.length < 2) return;

  const everyoneReady = participants.every(uid => Boolean(normalized.readyMap?.[uid]));
  if (!everyoneReady) return;

  await runTransaction(ref(db, getRoomPath(state.currentRoomCode)), raw => {
    if (!raw) return raw;
    const roomTx = normalizeRoom(raw);
    if (roomTx.status === "battle" || roomTx.status === "finished") return raw;
    const validationTx = getRoomValidation(roomTx);
    if (!validationTx.valid) return raw;
    const participantsTx = getParticipantKeys(roomTx);
    const everyoneReadyTx = participantsTx.length > 1 && participantsTx.every(uid => Boolean(roomTx.readyMap?.[uid]));
    if (!everyoneReadyTx) return raw;

    return raw;
  });

  const fresh = await get(ref(db, getRoomPath(state.currentRoomCode)));
  if (!fresh.exists()) return;
  const freshRoom = normalizeRoom(fresh.val());
  if (freshRoom.status === "battle" || freshRoom.status === "finished") return;

  const battle = await createBattleFromRoom(freshRoom);
  await update(ref(db, getRoomPath(state.currentRoomCode)), {
    status: "battle",
    battle,
    finishInfo: null,
    matchId: ""
  });
}

async function toggleReady() {
  if (!requireAuth() || !state.currentRoomCode) {
    notifyError("Сначала войди в комнату.");
    return;
  }

  const snapshot = await get(ref(db, getRoomPath(state.currentRoomCode)));
  if (!snapshot.exists()) {
    notifyError("Комната больше не существует.");
    return;
  }

  const room = normalizeRoom(snapshot.val());
  if (!room.participants[state.user.uid]) {
    notifyError("Ты не участник этой комнаты.");
    return;
  }

  if (room.status === "battle") {
    notifyError("Во время боя менять готовность нельзя.");
    return;
  }

  const nextReady = !Boolean(room.readyMap?.[state.user.uid]);

  await update(ref(db, getRoomPath(state.currentRoomCode)), {
    [`readyMap/${state.user.uid}`]: nextReady,
    status: getParticipantKeys(room).length > 1 ? "ready" : "waiting"
  });

  notify(nextReady ? "Готовность подтверждена." : "Готовность снята.");

  const fresh = await get(ref(db, getRoomPath(state.currentRoomCode)));
  if (fresh.exists()) {
    await tryStartBattleAutomatically(normalizeRoom(fresh.val()));
  }
}

function buildCreditMatrixForPair(selfStatus, enemyStatus) {
  const selfApprentice = selfStatus === "apprentice";
  const enemyApprentice = enemyStatus === "apprentice";

  if (!selfApprentice && !enemyApprentice) return { getsCredit: true, reason: "воитель против воителя" };
  if (selfApprentice && enemyApprentice) return { getsCredit: true, reason: "оруженосец против оруженосца" };
  if (selfApprentice && !enemyApprentice) return { getsCredit: true, reason: "оруженосец против воителя" };
  return { getsCredit: false, reason: "воитель против оруженосца" };
}

function isEnemyParticipant(modeId, participantA, participantB) {
  const mode = GROUP_MODES[modeId] || GROUP_MODES.duel;
  if (participantA.uid === participantB.uid) return false;
  if (mode.type === "ffa") return true;
  return participantA.side !== participantB.side;
}

async function getCreditPreviewForRoom(room) {
  const normalized = normalizeRoom(room);
  const validation = getRoomValidation(normalized);
  const participants = getParticipantsArray(normalized);

  const result = {
    badge: validation.valid ? "Состав почти готов" : "Зачёта не будет",
    reason: validation.message,
    eligibleByParticipant: {}
  };

  if (!validation.valid) return result;

  const todayKey = getMoscowDateKey();

  for (const participant of participants) {
    const charSnap = await get(ref(db, getCharacterPath(participant.uid, participant.characterId)));
    if (!charSnap.exists()) {
      result.eligibleByParticipant[participant.uid] = { getsCredit: false, reason: "Персонаж не найден." };
      continue;
    }

    const character = normalizeCharacter(charSnap.val());

    if (character.training.progress.lastCreditedDateKey === todayKey) {
      result.eligibleByParticipant[participant.uid] = {
        getsCredit: false,
        reason: `${participant.characterName} уже получил зачёт сегодня.`
      };
      continue;
    }

    const enemyCandidates = participants.filter(other => isEnemyParticipant(normalized.modeId, participant, other));
    const reasons = [];
    let allowed = false;

    for (const enemy of enemyCandidates) {
      const matrix = buildCreditMatrixForPair(participant.trainingStatus, enemy.trainingStatus);
      if (!matrix.getsCredit) {
        reasons.push(`${enemy.characterName}: ${matrix.reason}.`);
        continue;
      }

      const pairKey = getPairKey(participant.uid, participant.characterId, enemy.uid, enemy.characterId);
      const cdSnap = await get(ref(db, getPairCooldownPath(pairKey)));
      if (cdSnap.exists()) {
        const cooldown = cdSnap.val();
        if (compareDateKeys(todayKey, cooldown.availableFromDateKey || "") < 0) {
          reasons.push(`${enemy.characterName}: откат до ${cooldown.availableFromDateKey}.`);
          continue;
        }
      }

      allowed = true;
      reasons.push(`${enemy.characterName}: зачёт возможен.`);
    }

    result.eligibleByParticipant[participant.uid] = {
      getsCredit: allowed,
      reason: reasons.join(" ") || "Нет подходящих противников для зачёта."
    };
  }

  const creditedCount = Object.values(result.eligibleByParticipant).filter(item => item.getsCredit).length;
  if (creditedCount === participants.length && participants.length > 0) result.badge = "Зачёт возможен всем";
  else if (creditedCount > 0) result.badge = "Зачёт возможен не всем";
  else result.badge = "Зачёта не будет";

  result.reason = validation.message;
  return result;
}

function getReadyCountdownLeft(room) {
  const marks = Object.entries(room?.readyMap || {}).filter(([, value]) => Boolean(value));
  if (!marks.length) return 0;
  return READY_TIMEOUT_MS;
}

function getBattleCountdownLeft(room) {
  const battle = room?.battle ? normalizeBattle(room.battle) : null;
  if (!battle?.inactivityDeadlineAt) return 0;
  return Math.max(0, battle.inactivityDeadlineAt - now());
}

function startRoomTimer(deadline) {
  stopRoomTimer();
  if (!deadline) return;

  state.roomTimerInterval = setInterval(() => {
    const left = Math.max(0, deadline - now());
    if (ui.room.roomTimer) {
      const minutes = String(Math.floor(left / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
      text(ui.room.roomTimer, `${minutes}:${seconds}`);
    }
    if (left <= 0) stopRoomTimer();
  }, 1000);
}

function stopRoomTimer() {
  if (state.roomTimerInterval) {
    clearInterval(state.roomTimerInterval);
    state.roomTimerInterval = null;
  }
  if (ui.room.roomTimer) text(ui.room.roomTimer, "00:00");
}

async function createBattleFromRoom(room) {
  const normalized = normalizeRoom(room);
  const queue = shuffle(getParticipantKeys(normalized));
  const fighters = {};

  for (const uid of queue) {
    const participant = normalizeParticipant(normalized.participants[uid]);
    let character = null;

    if (participant.uid === state.user?.uid) {
      character = getCharacterById(participant.characterId);
    }

    if (!character) {
      const snap = await get(ref(db, getCharacterPath(participant.uid, participant.characterId)));
      if (snap.exists()) character = normalizeCharacter(snap.val());
    }

    const combat = character ? getCombatViewTotals(character) : createDefaultCombatBase();

    fighters[uid] = normalizeBattleFighter({
      uid: participant.uid,
      profileName: participant.profileName,
      characterId: participant.characterId,
      characterName: participant.characterName,
      clan: participant.clan,
      trainingStatus: participant.trainingStatus,
      side: participant.side,
      combat: {
        accuracy: combat.accuracy || 0,
        dodge: combat.dodge || 0,
        clawPower: combat.clawPower || 0,
        bitePower: combat.bitePower || 0
      },
      hp: 100,
      alive: true,
      escaped: false,
      effects: createDefaultEffects(),
      analytics: createBattleAnalyticsBlock()
    });
  }

  return {
    modeId: normalized.modeId,
    startedAt: now(),
    completedAt: 0,
    lastActionAt: now(),
    inactivityDeadlineAt: now() + INACTIVITY_TIMEOUT_MS,
    turnQueue: queue,
    turnIndex: 0,
    roundNumber: 1,
    fighters,
    lastMessage: `Тренировка началась. Первый ход делает ${fighters[queue[0]]?.characterName || "—"}.`,
    log: [],
    pendingRoundCards: [],
    finished: false,
    winnerSide: "",
    winnerUid: "",
    finishReason: ""
  };
}

async function startBattle() {
  if (!requireAuth() || !state.currentRoomCode) return;
  const snapshot = await get(ref(db, getRoomPath(state.currentRoomCode)));
  if (!snapshot.exists()) return;
  const room = normalizeRoom(snapshot.val());
  if (!canCurrentUserChangeMode(room)) {
    notifyError("Стартовать бой вручную может только создатель комнаты.");
    return;
  }
  const validation = getRoomValidation(room);
  if (!validation.valid) {
    notifyError(validation.message);
    return;
  }
  const everyoneReady = getParticipantKeys(room).every(uid => Boolean(room.readyMap?.[uid]));
  if (!everyoneReady) {
    notifyError("Сначала дождись готовности всех участников.");
    return;
  }

  const battle = await createBattleFromRoom(room);

  await update(ref(db, getRoomPath(state.currentRoomCode)), {
    status: "battle",
    battle,
    finishInfo: null,
    matchId: ""
  });

  notify("Тренировка начинается.");
}

function getAliveFighterIds(battle) {
  return battle.turnQueue.filter(uid => {
    const fighter = battle.fighters[uid];
    return fighter && fighter.alive && !fighter.escaped;
  });
}

function getCurrentFighterId(battle) {
  const active = getAliveFighterIds(battle);
  if (!active.length) return "";
  const current = battle.turnQueue[battle.turnIndex];
  if (current && active.includes(current)) return current;
  return active[0] || "";
}

function getVisibleTeamForUser(battle, uid) {
  const me = battle.fighters[uid];
  if (!me) return new Set();
  const mode = GROUP_MODES[battle.modeId] || GROUP_MODES.duel;
  if (mode.type === "ffa") return new Set([uid]);
  const visible = new Set();
  Object.keys(battle.fighters).forEach(fighterUid => {
    const fighter = battle.fighters[fighterUid];
    if (fighter.side === me.side) visible.add(fighterUid);
  });
  return visible;
}

function shouldShowHpToUser(battle, viewerUid, targetUid) {
  if (!viewerUid) return false;
  const visible = getVisibleTeamForUser(battle, viewerUid);
  return visible.has(targetUid);
}

function advanceTurnIndex(battle) {
  const active = getAliveFighterIds(battle);
  if (!active.length) return;
  const currentId = getCurrentFighterId(battle);
  const currentPosition = battle.turnQueue.indexOf(currentId);
  let nextPosition = currentPosition;
  let safety = battle.turnQueue.length + 2;
  do {
    nextPosition = (nextPosition + 1) % battle.turnQueue.length;
    safety -= 1;
  } while (safety > 0 && !active.includes(battle.turnQueue[nextPosition]));
  battle.turnIndex = nextPosition;
  if (nextPosition <= currentPosition) battle.roundNumber += 1;
}

function appendBattleLog(battle, entries) {
  battle.log = [...safeArray(battle.log), ...safeArray(entries)].slice(-MAX_LOG_ITEMS);
}

function addRoundCard(battle, cardHtml) {
  battle.pendingRoundCards = [...safeArray(battle.pendingRoundCards), cardHtml];
}

function flushRoundCardsIfNeeded(battle) {
  const alive = getAliveFighterIds(battle);
  if (!alive.length) return;
  const currentPosition = battle.turnQueue.indexOf(getCurrentFighterId(battle));
  const wrapped = currentPosition <= 0 || battle.turnIndex === 0;
  if (!wrapped) return;
  if (!safeArray(battle.pendingRoundCards).length) return;
  appendBattleLog(battle, [`
    <div class="battle-round-stack">
      ${battle.pendingRoundCards.join("")}
    </div>
  `]);
  battle.pendingRoundCards = [];
}

function recordAnalyticsForAction(analytics, action, hit) {
  if (!action?.type) return;
  analytics.favoriteMoveCounters[action.type] = (analytics.favoriteMoveCounters[action.type] || 0) + 1;
  analytics.accuracy.totalAttacks += 1;
  if (hit) analytics.accuracy.hits += 1;
  else analytics.accuracy.misses += 1;
  if (action.type === "paw" && action.targetKey && analytics.targets[action.targetKey] !== undefined) {
    analytics.targets[action.targetKey] += 1;
  }
}

function areEnemies(battle, uidA, uidB) {
  if (uidA === uidB) return false;
  const mode = GROUP_MODES[battle.modeId] || GROUP_MODES.duel;
  const a = battle.fighters[uidA];
  const b = battle.fighters[uidB];
  if (!a || !b) return false;
  if (mode.type === "ffa") return true;
  return a.side !== b.side;
}

function getEnemyFighterIds(battle, uid) {
  return getAliveFighterIds(battle).filter(otherUid => areEnemies(battle, uid, otherUid));
}

function getTeamAliveIds(battle, side) {
  return getAliveFighterIds(battle).filter(uid => battle.fighters[uid]?.side === side);
}

function getTotalHpForIds(battle, ids) {
  return ids.reduce((sum, uid) => sum + (battle.fighters[uid]?.hp || 0), 0);
}

function getBattleWinnerState(battle) {
  const mode = GROUP_MODES[battle.modeId] || GROUP_MODES.duel;
  const active = getAliveFighterIds(battle);
  if (!active.length) {
    return { finished: true, winnerSide: "", winnerUid: "", message: "Все бойцы выбыли. Итог — ничья.", finishReason: "all_out" };
  }
  if (mode.type === "ffa") {
    if (active.length === 1) {
      const winnerUid = active[0];
      return {
        finished: true,
        winnerSide: "solo",
        winnerUid,
        message: `${battle.fighters[winnerUid].characterName} остаётся последним на лапах и побеждает.`,
        finishReason: "last_standing"
      };
    }
    return { finished: false };
  }
  const sideA = active.filter(uid => battle.fighters[uid].side === "A");
  const sideB = active.filter(uid => battle.fighters[uid].side === "B");
  if (!sideA.length && !sideB.length) {
    return { finished: true, winnerSide: "", winnerUid: "", message: "Обе стороны выбыли. Итог — ничья.", finishReason: "double_out" };
  }
  if (!sideA.length) {
    const winners = sideB.map(uid => battle.fighters[uid]?.characterName).filter(Boolean).join(", ");
    return { finished: true, winnerSide: "B", winnerUid: "", message: `Победа: ${winners}.`, finishReason: "team_elimination" };
  }
  if (!sideB.length) {
    const winners = sideA.map(uid => battle.fighters[uid]?.characterName).filter(Boolean).join(", ");
    return { finished: true, winnerSide: "A", winnerUid: "", message: `Победа: ${winners}.`, finishReason: "team_elimination" };
  }
  return { finished: false };
}

function getEscapeOutcomeForDuel(battle, actorUid) {
  const actor = battle.fighters[actorUid];
  const enemyUid = getEnemyFighterIds(battle, actorUid)[0];
  const enemy = battle.fighters[enemyUid];
  if (!actor || !enemy) {
    return { finished: true, winnerSide: "", winnerUid: "", message: "Бой завершён.", finishReason: "escape_end" };
  }

  if (actor.hp > 50) {
    return {
      finished: true,
      winnerSide: "",
      winnerUid: "",
      message: `${actor.characterName} уходит из дуэли с запасом сил. Итог — ничья.`,
      finishReason: "escape_draw"
    };
  }

  if (actor.hp > enemy.hp) {
    return {
      finished: true,
      winnerSide: actor.side,
      winnerUid: actorUid,
      message: `${actor.characterName} уходит из дуэли на последнем усилии, но перевес по очкам остаётся за ним.`,
      finishReason: "escape_hp_win"
    };
  }

  if (enemy.hp > actor.hp) {
    return {
      finished: true,
      winnerSide: enemy.side,
      winnerUid: enemyUid,
      message: `${actor.characterName} пытается уйти из дуэли, но перевес остаётся за ${enemy.characterName}.`,
      finishReason: "escape_hp_loss"
    };
  }

  return {
    finished: true,
    winnerSide: "",
    winnerUid: "",
    message: `${actor.characterName} уходит из дуэли, и силы оказываются равны. Итог — ничья.`,
    finishReason: "escape_draw"
  };
}

function tryDefenderDodge(defender, defenderName, actionLabel, logs) {
  if ((defender.effects.guardCharges || 0) <= 0) return false;
  defender.effects.guardCharges = 0;
  const dodgeChance = clamp(CHANCES.dodge + (defender.combat.dodge || 0), 0, 95);
  const dodgeRoll = randomRoll();
  if (dodgeRoll <= dodgeChance) {
    logs.push(`${defenderName} успевает увернуться от приёма «${actionLabel}». Бросок уворота: ${dodgeRoll} из ${dodgeChance}.`);
    return true;
  }
  logs.push(`${defenderName} пытается увернуться от приёма «${actionLabel}», но не успевает. Бросок уворота: ${dodgeRoll} из ${dodgeChance}.`);
  return false;
}

function resolveAttackAction(battle, attackerUid, action, logs) {
  const attacker = battle.fighters[attackerUid];
  const defender = battle.fighters[action.targetUid];
  if (!attacker || !defender || !attacker.alive || attacker.escaped || !defender.alive || defender.escaped) return;
  if (!areEnemies(battle, attackerUid, action.targetUid)) return;

  const attackerName = attacker.characterName;
  const defenderName = defender.characterName;
  const penalty = attacker.effects.accuracyPenaltyTurns > 0 ? SAND_ACCURACY_PENALTY : 0;
  let chance = 0;
  let actionLabel = "";
  let bodyTarget = null;

  if (action.type === "sand") {
    chance = CHANCES.sand + (attacker.combat.accuracy || 0) - penalty;
    actionLabel = "Песок в глаза";
  }

  if (action.type === "paw") {
    bodyTarget = BODY_TARGETS[action.targetKey];
    if (!bodyTarget) return;
    chance = CHANCES.paw + (attacker.combat.accuracy || 0) + bodyTarget.chanceModifier - penalty;
    actionLabel = `Удар лапой в ${bodyTarget.label}`;
  }

  if (action.type === "trip") {
    chance = CHANCES.trip + (attacker.combat.accuracy || 0) - penalty;
    actionLabel = "Подсечка";
  }

  chance = clamp(chance, 0, 95);

  if (tryDefenderDodge(defender, defenderName, actionLabel, logs)) {
    recordAnalyticsForAction(attacker.analytics, action, false);
    return;
  }

  const roll = randomRoll();
  const hit = roll <= chance;
  recordAnalyticsForAction(attacker.analytics, action, hit);

  if (!hit) {
    logs.push(`${attackerName} использует «${actionLabel}», но промахивается. Бросок: ${roll} из ${chance}.`);
    if (action.type === "trip") {
      attacker.effects.stunTurns += 1;
      logs.push(`${attackerName} теряет равновесие и сам оглушается на следующий ход.`);
    }
    return;
  }

  if (action.type === "sand") {
    defender.effects.stunTurns += 1;
    defender.effects.accuracyPenaltyTurns += SAND_PENALTY_TURNS;
    logs.push(`${attackerName} бросает песок в глаза ${defenderName}. Попадание. Бросок: ${roll} из ${chance}.`);
    logs.push(`${defenderName} будет оглушён на следующий ход, а его шанс попадания уменьшится на 10% на 2 хода.`);
    return;
  }

  if (action.type === "paw") {
    const directDamage = Math.round(bodyTarget.directDamage * (1 + (attacker.combat.clawPower || 0) / 100));
    const dotDamage = Math.round(bodyTarget.dotDamage * (1 + (attacker.combat.clawPower || 0) / 100));
    defender.hp = Math.max(0, defender.hp - directDamage);
    defender.effects.pendingDotDamage += dotDamage;
    logs.push(`${attackerName} попадает лапой в ${bodyTarget.label}. Бросок: ${roll} из ${chance}.`);
    logs.push(`${defenderName} теряет ${directDamage}% очков спарринга и получает кровотечение ${dotDamage}% на следующие ходы.`);
    if (defender.hp <= 0) {
      defender.alive = false;
      logs.push(`${defenderName} падает до 0% и выбывает из тренировки.`);
    }
    return;
  }

  if (action.type === "trip") {
    const directDamage = Math.round(DAMAGE.trip * (1 + (attacker.combat.bitePower || 0) / 100));
    const dotDamage = Math.round(DOT.trip * (1 + (attacker.combat.bitePower || 0) / 100));
    defender.hp = Math.max(0, defender.hp - directDamage);
    defender.effects.pendingDotDamage += dotDamage;
    defender.effects.stunTurns += 1;
    logs.push(`${attackerName} проводит подсечку. Попадание. Бросок: ${roll} из ${chance}.`);
    logs.push(`${defenderName} теряет ${directDamage}% очков спарринга, оглушается на следующий ход и получает кровотечение ${dotDamage}%.`);
    if (defender.hp <= 0) {
      defender.alive = false;
      logs.push(`${defenderName} падает до 0% и выбывает из тренировки.`);
    }
  }
}

function applyStartOfTurnEffects(battle, fighterUid, logs) {
  const fighter = battle.fighters[fighterUid];
  if (!fighter || !fighter.alive || fighter.escaped) {
    return { skipped: true, skipReason: "fighter_unavailable" };
  }

  fighter.effects.guardCharges = 0;

  if (fighter.effects.dotDamage > 0) {
    fighter.hp = Math.max(0, fighter.hp - fighter.effects.dotDamage);
    logs.push(`${fighter.characterName} теряет ${fighter.effects.dotDamage}% очков спарринга из-за кровотечения.`);
    if (fighter.hp <= 0) {
      fighter.alive = false;
      logs.push(`${fighter.characterName} падает до 0% ещё до действия и выбывает.`);
      return { skipped: true, skipReason: "dead_before_action" };
    }
  }

  if (fighter.effects.stunTurns > 0) {
    fighter.effects.stunTurns -= 1;
    logs.push(`${fighter.characterName} оглушён и пропускает ход.`);
    if (fighter.effects.accuracyPenaltyTurns > 0) {
      fighter.effects.accuracyPenaltyTurns -= 1;
    }
    return { skipped: true, skipReason: "stunned" };
  }

  return { skipped: false, skipReason: "" };
}

function finalizeEndOfTurn(battle, fighterUid) {
  const fighter = battle.fighters[fighterUid];
  if (!fighter) return;

  if (fighter.effects.accuracyPenaltyTurns > 0) {
    fighter.effects.accuracyPenaltyTurns -= 1;
  }

  Object.values(battle.fighters).forEach(item => {
    if (item.effects.pendingDotDamage > 0) {
      item.effects.dotDamage += item.effects.pendingDotDamage;
      item.effects.pendingDotDamage = 0;
    }
  });

  battle.lastActionAt = now();
  battle.inactivityDeadlineAt = now() + INACTIVITY_TIMEOUT_MS;
}

function buildBattleTurnCard(actorName, roundNumber, lines, accent = "default") {
  const items = safeArray(lines).filter(Boolean);
  const accentClass =
    accent === "danger"
      ? "battle-turn-card-danger"
      : accent === "good"
        ? "battle-turn-card-good"
        : "battle-turn-card-default";

  return `
    <div class="battle-turn-card ${accentClass}">
      <div class="battle-turn-card-top">
        <span class="battle-turn-card-round">Раунд ${roundNumber}</span>
        <span class="battle-turn-card-actor">${escapeHtml(actorName)}</span>
      </div>
      <div class="battle-turn-card-body">
        ${items.map(item => `<div class="battle-turn-card-line">${escapeHtml(item)}</div>`).join("")}
      </div>
    </div>
  `;
}

function flushPendingRoundCardsNow(battle) {
  if (!safeArray(battle.pendingRoundCards).length) return;
  appendBattleLog(battle, [
    `<div class="battle-round-stack">${battle.pendingRoundCards.join("")}</div>`
  ]);
  battle.pendingRoundCards = [];
}

function finishBattleObject(battle, outcome, finalCardHtml = "") {
  battle.finished = true;
  battle.completedAt = now();
  battle.winnerSide = outcome.winnerSide || "";
  battle.winnerUid = outcome.winnerUid || "";
  battle.finishReason = outcome.finishReason || "";
  battle.lastMessage = outcome.message || "Тренировка завершена.";

  if (finalCardHtml) {
    addRoundCard(battle, finalCardHtml);
  }

  flushPendingRoundCardsNow(battle);

  appendBattleLog(battle, [
    `<div class="battle-finish-note">${escapeHtml(battle.lastMessage)}</div>`
  ]);
}

function processBattleAction(battle, actorUid, action) {
  const actor = battle.fighters[actorUid];
  if (!actor) return;

  const roundNumber = battle.roundNumber;
  const logs = [];
  let accent = "default";

  if (!actor.alive || actor.escaped) {
    addRoundCard(
      battle,
      buildBattleTurnCard(actor.characterName || "Боец", roundNumber, ["Не смог продолжить ход."], "danger")
    );
    advanceTurnIndex(battle);
    flushRoundCardsIfNeeded(battle);
    return;
  }

  const start = applyStartOfTurnEffects(battle, actorUid, logs);

  const earlyOutcome = getBattleWinnerState(battle);
  if (earlyOutcome.finished) {
    finishBattleObject(
      battle,
      earlyOutcome,
      buildBattleTurnCard(actor.characterName, roundNumber, logs.length ? logs : ["Бой завершается до действия."], "danger")
    );
    return;
  }

  if (start.skipped) {
    accent = "danger";
    finalizeEndOfTurn(battle, actorUid);

    addRoundCard(
      battle,
      buildBattleTurnCard(actor.characterName, roundNumber, logs.length ? logs : ["Ход пропущен."], accent)
    );

    advanceTurnIndex(battle);
    flushRoundCardsIfNeeded(battle);
    battle.lastMessage = "Ожидание завершения круга.";
    return;
  }

  if (action.kind === "defend") {
    if (actor.effects.dodgesLeft <= 0) {
      accent = "danger";
      logs.push(`${actor.characterName} пытается уйти в защиту, но у него закончились увороты.`);
    } else {
      accent = "good";
      actor.effects.dodgesLeft -= 1;
      actor.effects.guardCharges = 1;
      logs.push(`${actor.characterName} уходит в защиту и готовится уклониться от первого следующего удара.`);
    }
  }

  if (action.kind === "escape") {
    const mode = GROUP_MODES[battle.modeId] || GROUP_MODES.duel;

    if (mode.id === "duel") {
      const outcome = getEscapeOutcomeForDuel(battle, actorUid);
      finishBattleObject(
        battle,
        outcome,
        buildBattleTurnCard(actor.characterName, roundNumber, [outcome.message], "danger")
      );
      return;
    }

    accent = "danger";
    actor.escaped = true;
    logs.push(`${actor.characterName} покидает тренировку и выбывает из боя.`);

    finalizeEndOfTurn(battle, actorUid);

    const outcome = getBattleWinnerState(battle);
    if (outcome.finished) {
      finishBattleObject(
        battle,
        outcome,
        buildBattleTurnCard(actor.characterName, roundNumber, logs, "danger")
      );
      return;
    }

    addRoundCard(
      battle,
      buildBattleTurnCard(actor.characterName, roundNumber, logs, "danger")
    );

    advanceTurnIndex(battle);
    flushRoundCardsIfNeeded(battle);
    battle.lastMessage = "Ожидание завершения круга.";
    return;
  }

  if (action.kind === "multiAttack") {
    const attacks = safeArray(action.actions);
    if (!attacks.length) {
      accent = "danger";
      logs.push(`${actor.characterName} медлит и не наносит ударов.`);
    } else {
      attacks.forEach(item => resolveAttackAction(battle, actorUid, item, logs));
    }
  }

  finalizeEndOfTurn(battle, actorUid);

  const outcome = getBattleWinnerState(battle);
  if (outcome.finished) {
    finishBattleObject(
      battle,
      outcome,
      buildBattleTurnCard(actor.characterName, roundNumber, logs.length ? logs : ["Ход завершён."], accent)
    );
    return;
  }

  addRoundCard(
    battle,
    buildBattleTurnCard(actor.characterName, roundNumber, logs.length ? logs : ["Ход завершён."], accent)
  );

  advanceTurnIndex(battle);
  flushRoundCardsIfNeeded(battle);
  battle.lastMessage = "Ожидание завершения круга.";
}

async function submitBattleAction(action) {
  if (!state.currentRoomCode || !state.currentParticipantKey) {
    notifyError("Сначала войди в комнату.");
    return;
  }

  const roomRef = ref(db, getRoomPath(state.currentRoomCode));
  await runTransaction(roomRef, raw => {
    if (!raw) return raw;
    const room = normalizeRoom(raw);
    if (room.status !== "battle" || !room.battle) return raw;

    const battle = normalizeBattle(room.battle);
    const actorUid = getCurrentFighterId(battle);
    if (actorUid !== state.user.uid) return raw;

    processBattleAction(battle, actorUid, action);

    room.battle = battle;
    room.status = battle.finished ? "finished" : "battle";
    room.finishInfo = battle.finished
      ? {
          completedAt: battle.completedAt,
          winnerSide: battle.winnerSide,
          winnerUid: battle.winnerUid,
          reason: battle.finishReason,
          message: battle.lastMessage
        }
      : null;

    return room;
  });
}

function resetPlanningState() {
  state.planningAttack = null;
  showBattleMainActions();
}

function startAttackPlanning() {
  const room = state.currentRoomSnapshot ? normalizeRoom(state.currentRoomSnapshot) : null;
  const battle = room?.battle ? normalizeBattle(room.battle) : null;
  if (!battle) return;

  const actorUid = getCurrentFighterId(battle);
  if (actorUid !== state.user?.uid) {
    notifyError("Сейчас ходит не ваш персонаж.");
    return;
  }

  const targets = getEnemyFighterIds(battle, actorUid);
  if (!targets.length) {
    notifyError("У вашего персонажа не осталось живых противников.");
    return;
  }

  state.planningAttack = {
    actorUid,
    targets,
    index: 0,
    actions: [],
    pendingType: ""
  };

  show(ui.battle.attackMenu);
  hide(ui.battle.actions);
  hide(ui.battle.targetMenu);
  updatePlanningBadge();
}

function updatePlanningBadge() {
  if (!state.planningAttack) {
    text(ui.battle.opponentChosenBadge, "Ожидание действий");
    return;
  }

  const room = state.currentRoomSnapshot ? normalizeRoom(state.currentRoomSnapshot) : null;
  const battle = room?.battle ? normalizeBattle(room.battle) : null;
  if (!battle) return;

  const currentTargetId = state.planningAttack.targets[state.planningAttack.index];
  const fighter = battle.fighters[currentTargetId];
  text(
    ui.battle.opponentChosenBadge,
    `Цель ${state.planningAttack.index + 1}/${state.planningAttack.targets.length}: ${fighter?.characterName || "—"}`
  );
}

function commitPlannedAttackStep(actionPayload) {
  if (!state.planningAttack) return;

  const targetUid = state.planningAttack.targets[state.planningAttack.index];
  state.planningAttack.actions.push({ ...actionPayload, targetUid });
  state.planningAttack.index += 1;
  state.planningAttack.pendingType = "";

  if (state.planningAttack.index >= state.planningAttack.targets.length) {
    const readyAction = {
      kind: "multiAttack",
      actions: state.planningAttack.actions
    };
    resetPlanningState();
    submitBattleAction(readyAction).catch(error => notifyError(error.message));
    return;
  }

  show(ui.battle.attackMenu);
  hide(ui.battle.targetMenu);
  updatePlanningBadge();
}

function showBattleMainActions() {
  show(ui.battle.actions);
  hide(ui.battle.attackMenu);
  hide(ui.battle.targetMenu);
  updatePlanningBadge();
}

function setBattleButtonsDisabled(disabled, defendDisabled = false) {
  [
    ui.battle.attackActionBtn,
    ui.battle.escapeActionBtn,
    ui.battle.sandAttackBtn,
    ui.battle.pawAttackBtn,
    ui.battle.tripAttackBtn,
    ui.battle.backToActionsBtn,
    ui.battle.backToAttackMenuBtn,
    ui.battle.faceTargetBtn,
    ui.battle.frontLeftTargetBtn,
    ui.battle.frontRightTargetBtn,
    ui.battle.sideTargetBtn,
    ui.battle.earsTargetBtn,
    ui.battle.neckTargetBtn
  ].forEach(node => disable(node, disabled));

  disable(ui.battle.defendActionBtn, disabled || defendDisabled);
}

function renderBattleBars(battle, viewerUid) {
  const orderedIds = getAliveFighterIds(battle).concat(
    Object.keys(battle.fighters).filter(uid => !getAliveFighterIds(battle).includes(uid))
  );

  return orderedIds.map(uid => {
    const fighter = battle.fighters[uid];
    const isVisible = shouldShowHpToUser(battle, viewerUid, uid);
    const deadLabel = !fighter.alive ? " · выбыл" : fighter.escaped ? " · ушёл" : "";

    if (!isVisible) {
      return `
        <div class="battle-bar-card battle-bar-card-hidden">
          <div class="battle-bar-top">
            <span>${escapeHtml(fighter.characterName)}${escapeHtml(deadLabel)}</span>
            <strong>✦✦✦</strong>
          </div>
          <div class="battle-bar-track battle-bar-track-hidden">
            <div class="battle-bar-fill battle-bar-fill-hidden" style="width:100%"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="battle-bar-card">
        <div class="battle-bar-top">
          <span>${escapeHtml(fighter.characterName)}${escapeHtml(deadLabel)}</span>
          <strong>${fighter.hp}%</strong>
        </div>
        <div class="battle-bar-track">
          <div class="battle-bar-fill" style="width:${clamp(fighter.hp, 0, 100)}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function getDodgeSymbols(left) {
  const safeLeft = clamp(left || 0, 0, MAX_DODGES);
  let result = "";
  for (let i = 0; i < MAX_DODGES; i += 1) {
    result += i < safeLeft ? "✦" : "✧";
  }
  return result;
}

function renderMyBattleEffects(fighter) {
  if (!fighter) return "";
  const stunned = fighter.effects.stunTurns > 0 ? "Да" : "Нет";
  const bleeding = fighter.effects.dotDamage > 0 ? `🩸 ${fighter.effects.dotDamage}%` : "Спокойно";
  const penalty = fighter.effects.accuracyPenaltyTurns > 0 ? `☾ ${fighter.effects.accuracyPenaltyTurns} х.` : "Чистый взгляд";

  return `
    <div class="battle-effects-grid">
      <div class="battle-effect-chip">
        <span class="battle-effect-chip-label">Увороты</span>
        <strong>${escapeHtml(getDodgeSymbols(fighter.effects.dodgesLeft))}</strong>
      </div>
      <div class="battle-effect-chip">
        <span class="battle-effect-chip-label">Кровотечение</span>
        <strong>${escapeHtml(bleeding)}</strong>
      </div>
      <div class="battle-effect-chip">
        <span class="battle-effect-chip-label">Оглушение</span>
        <strong>${escapeHtml(stunned)}</strong>
      </div>
      <div class="battle-effect-chip">
        <span class="battle-effect-chip-label">Точность</span>
        <strong>${escapeHtml(penalty)}</strong>
      </div>
    </div>
  `;
}

function setBattleLog(logItems) {
  const items = safeArray(logItems);
  if (!items.length) {
    html(ui.battle.log, `
      <div class="battle-log-empty">
        <span class="battle-log-empty-mark">✦</span>
        <span>Пока нет записей.</span>
      </div>
    `);
    return;
  }

  html(ui.battle.log, items.map((item, index) => {
    const isHtml = String(item).trim().startsWith("<");
    return `
      <div class="battle-log-entry ${index === items.length - 1 ? "battle-log-entry-latest" : ""}">
        <div class="battle-log-mark">✦</div>
        <div class="battle-log-text">${isHtml ? item : escapeHtml(item)}</div>
      </div>
    `;
  }).join(""));
}

function renderBattleForPlayer(room, battle) {
  const currentUid = getCurrentFighterId(battle);
  const isMine = currentUid === state.user?.uid;
  const currentFighter = battle.fighters[currentUid];
  const myFighter = state.user ? battle.fighters[state.user.uid] : null;
  const myEnemies = myFighter
    ? getEnemyFighterIds(battle, state.user.uid).map(uid => battle.fighters[uid]?.characterName).filter(Boolean)
    : [];

  html(ui.battle.info, `
    <div class="battle-status-shell">
      <div class="battle-status-top">
        <span class="battle-chip ${isMine ? "battle-chip-active" : "battle-chip-soft"}">
          ${isMine ? "Ваш ход" : "Ожидание хода"}
        </span>
        <span class="battle-chip">Режим: ${escapeHtml(getModeLabel(battle.modeId))}</span>
        <span class="battle-chip">Раунд: ${battle.roundNumber}</span>
      </div>

      <div class="battle-bars-wrap">${renderBattleBars(battle, state.user?.uid)}</div>

      <div class="battle-message">
        <div class="battle-message-title">✦ Текущее состояние</div>
        <div class="battle-message-text">
          ${escapeHtml(
            battle.finished
              ? battle.lastMessage || "Тренировка завершена."
              : isMine
                ? "Можно выбирать действие."
                : "Ждём завершения круга."
          )}
        </div>
      </div>

      ${myFighter ? renderMyBattleEffects(myFighter) : ""}

      <div class="battle-plan-line">
        ${myFighter ? `Ваш персонаж: ${escapeHtml(myFighter.characterName)}.` : "Вы наблюдатель в этой комнате."}
        ${myEnemies.length ? `<div class="battle-plan-targets">Противники: ${escapeHtml(myEnemies.join(", "))}</div>` : ""}
      </div>
    </div>
  `);

  setBattleLog(battle.log);

  const defendDisabled = !myFighter || myFighter.effects.dodgesLeft <= 0;

  if (battle.finished || !isMine || !myFighter || !myFighter.alive || myFighter.escaped) {
    setBattleButtonsDisabled(true, true);
    showBattleMainActions();
    return;
  }

  setBattleButtonsDisabled(false, defendDisabled);
  if (!state.planningAttack) showBattleMainActions();
  updatePlanningBadge();
}

function renderBattleForAdmin(room, battle) {
  html(ui.battle.info, `
    <div class="battle-status-shell">
      <div class="battle-status-top">
        <span class="battle-chip battle-chip-active">Админ-наблюдение</span>
        <span class="battle-chip">Режим: ${escapeHtml(getModeLabel(battle.modeId))}</span>
        <span class="battle-chip">Раунд: ${battle.roundNumber}</span>
      </div>
      <div class="battle-bars-wrap">${renderBattleBars(battle, "")}</div>
      <div class="battle-message">
        <div class="battle-message-title">✦ Состояние</div>
        <div class="battle-message-text">${escapeHtml(battle.lastMessage || "—")}</div>
      </div>
    </div>
  `);

  setBattleLog(battle.log);
  setBattleButtonsDisabled(true, true);
  showBattleMainActions();
}

function getSideDisplayNames(room) {
  const normalized = normalizeRoom(room);
  const mode = GROUP_MODES[normalized.modeId] || GROUP_MODES.duel;

  if (mode.type === "ffa") {
    return { solo: "Каждый сам за себя" };
  }

  const participants = getParticipantsArray(normalized);
  const sideA = participants.filter(item => item.side === "A");
  const sideB = participants.filter(item => item.side === "B");

  return {
    A: sideA[0]?.characterName ? `Отряд ${sideA[0].characterName}` : "Левая сторона",
    B: sideB[0]?.characterName ? `Отряд ${sideB[0].characterName}` : "Правая сторона"
  };
}

function renderRoomParticipantCard(participant, room, sideNames) {
  const isMe = participant.uid === state.user?.uid;
  const ready = Boolean(room.readyMap?.[participant.uid]);
  const mode = GROUP_MODES[room.modeId] || GROUP_MODES.duel;

  const sideLabel = mode.type === "ffa"
    ? "Сам за себя"
    : (participant.side === "A" ? sideNames.A : sideNames.B);

  const sideControl =
    room.status === "battle" ||
    room.status === "finished" ||
    !isMe ||
    !canCurrentUserChangeOwnSide(room) ||
    mode.type === "ffa"
      ? `<div class="room-sigil-side-value">${escapeHtml(sideLabel)}</div>`
      : `
        <select class="field-select participant-side-select" data-side-uid="${escapeHtml(participant.uid)}">
          <option value="A" ${participant.side === "A" ? "selected" : ""}>${escapeHtml(sideNames.A)}</option>
          <option value="B" ${participant.side === "B" ? "selected" : ""}>${escapeHtml(sideNames.B)}</option>
        </select>
      `;

  return `
    <div class="room-sigil-card ${isMe ? "room-sigil-card-self" : ""}">
      <div class="room-sigil-top">
        <div class="room-sigil-name">${escapeHtml(participant.characterName)}</div>
        <div class="room-sigil-ready ${ready ? "room-sigil-ready-yes" : "room-sigil-ready-no"}">
          ${ready ? "Готов" : "Не готов"}
        </div>
      </div>
      <div class="room-sigil-meta">${escapeHtml(participant.profileName)} · ${escapeHtml(getTrainingStatusLabel(participant.trainingStatus))}</div>
      <div class="room-sigil-meta">${escapeHtml(participant.clan || "Без племени")}</div>
      <div class="room-sigil-side">${sideControl}</div>
    </div>
  `;
}

function renderRoomPlayers(room) {
  const participants = getParticipantsArray(room);
  if (!participants.length) {
    html(ui.room.roomPlayers, `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">Пока вы не подключены ни к одной комнате.</div>
      </div>
    `);
    return;
  }

  const mode = GROUP_MODES[room.modeId] || GROUP_MODES.duel;
  const sideNames = getSideDisplayNames(room);

  if (mode.type === "ffa") {
    html(ui.room.roomPlayers, `
      <div class="room-ffa-grid">
        ${participants
          .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
          .map(participant => renderRoomParticipantCard(participant, room, sideNames))
          .join("")}
      </div>
    `);
  } else {
    const sideA = participants.filter(item => item.side === "A");
    const sideB = participants.filter(item => item.side === "B");

    html(ui.room.roomPlayers, `
      <div class="room-vs-shell">
        <div class="room-vs-column">
          <div class="room-vs-title">${escapeHtml(sideNames.A)}</div>
          <div class="room-vs-list">
            ${sideA.map(item => renderRoomParticipantCard(item, room, sideNames)).join("") || `<div class="empty-inline">Пусто</div>`}
          </div>
        </div>

        <div class="room-vs-mark">VS</div>

        <div class="room-vs-column">
          <div class="room-vs-title">${escapeHtml(sideNames.B)}</div>
          <div class="room-vs-list">
            ${sideB.map(item => renderRoomParticipantCard(item, room, sideNames)).join("") || `<div class="empty-inline">Пусто</div>`}
          </div>
        </div>
      </div>
    `);
  }

  ui.room.roomPlayers.querySelectorAll(".participant-side-select").forEach(select => {
    select.addEventListener("change", event => {
      const uid = event.target.dataset.sideUid;
      if (uid !== state.user?.uid) return;
      setMySide(event.target.value).catch(error => notifyError(error.message));
    });
  });
}

function renderCreditPreview(room) {
  const preview = room.creditPreview || {
    badge: "Зачёта не будет",
    reason: "Сначала собери корректный состав комнаты.",
    eligibleByParticipant: {}
  };

  text(ui.room.creditBadge, preview.badge || "Зачёта не будет");

  const participants = getParticipantsArray(room);
  const lines = participants.map(participant => {
    const item = preview.eligibleByParticipant?.[participant.uid];
    if (!item) return `${participant.characterName}: данных пока нет.`;
    return `${participant.characterName}: ${item.getsCredit ? "зачёт возможен" : "без зачёта"}. ${item.reason || ""}`;
  });

  text(
    ui.room.creditReasonBox,
    [preview.reason || "—", ...lines].join(" ")
  );
}

function renderWaitingState(room) {
  const validation = getRoomValidation(room);
  const participants = getParticipantsArray(room);
  const mode = GROUP_MODES[room.modeId] || GROUP_MODES.duel;
  const everyoneReady = participants.length > 1 && participants.every(item => Boolean(room.readyMap?.[item.uid]));
  const startAllowed = validation.valid && everyoneReady;

  const names = getSideDisplayNames(room);

  html(ui.room.waitingStateBox, `
    <div class="waiting-seal-card">
      <div class="waiting-seal-top">
        <div class="waiting-seal-title">${escapeHtml(mode.label)}</div>
        <div class="waiting-seal-badge ${startAllowed ? "waiting-seal-badge-good" : "waiting-seal-badge-soft"}">
          ${startAllowed ? "Можно начинать" : "Сбор продолжается"}
        </div>
      </div>

      <div class="waiting-seal-text">${escapeHtml(mode.description)}</div>
      <div class="waiting-seal-text ${validation.valid ? "group-valid-good" : "group-valid-bad"}">${escapeHtml(validation.message)}</div>
      <div class="waiting-seal-text">${everyoneReady ? "Все участники подтвердили готовность." : "Нужна готовность всех участников."}</div>

      ${mode.type !== "ffa" ? `
        <div class="waiting-side-summary">
          <div class="waiting-side-chip">${escapeHtml(names.A)}</div>
          <div class="waiting-side-chip waiting-side-chip-vs">VS</div>
          <div class="waiting-side-chip">${escapeHtml(names.B)}</div>
        </div>
      ` : ``}
    </div>
  `);

  const modeSelect = byId("groupModeSelect");
  const modeHelp = byId("groupModeHelp");
  const modeValidity = byId("groupModeValidity");

  if (modeSelect) {
    modeSelect.value = room.modeId;
    modeSelect.disabled = !canCurrentUserChangeMode(room);
  }

  if (modeHelp) text(modeHelp, mode.description);
  if (modeValidity) {
    modeValidity.textContent = validation.message;
    modeValidity.className = `training-credit-reason ${validation.valid ? "group-valid-good" : "group-valid-bad"}`;
  }
}

function getRoomWinTitle(room) {
  const battle = room.battle ? normalizeBattle(room.battle) : null;
  if (!battle) return "Тренировка завершена";

  if (battle.finishReason === "timeout_unfinished") return "Тренировка завершена без зачёта";
  if (!battle.winnerSide && !battle.winnerUid) return "Ничья";

  if (battle.winnerUid && battle.fighters[battle.winnerUid]) {
    return `Победа: ${battle.fighters[battle.winnerUid].characterName}`;
  }

  const winners = Object.values(battle.fighters)
    .filter(fighter => fighter.side === battle.winnerSide)
    .map(fighter => fighter.characterName)
    .join(", ");

  return winners ? `Победа: ${winners}` : "Тренировка завершена";
}

function renderRoomResultCard(room) {
  if (room.status !== "finished") {
    html(ui.room.roomResultCard, "");
    return;
  }

  const battle = room.battle ? normalizeBattle(room.battle) : null;

  html(ui.room.roomResultCard, `
    <div class="result-victory-card">
      <div class="result-victory-crown">✦</div>
      <div class="result-victory-title">${escapeHtml(getRoomWinTitle(room))}</div>
      <div class="result-victory-text">${escapeHtml(room.finishInfo?.message || battle?.lastMessage || "Тренировка закончена.")}</div>
      ${battle ? `<div class="result-victory-bars">${renderBattleBars(battle, state.user?.uid)}</div>` : ""}
    </div>
  `);
}

function setRoomStatus(message) {
  text(ui.room.statusLog, message || "Пока ничего не происходит.");
}

function renderRoomBadge(roomCode = "", roomStatus = "") {
  if (!ui.shell.currentRoomBadge) return;

  ui.shell.currentRoomBadge.classList.toggle("hidden", !roomCode);

  if (!roomCode) {
    text(ui.shell.currentRoomBadge, "✦ Комната: —");
    return;
  }

  text(ui.shell.currentRoomBadge, `✦ Комната ${roomCode}${roomStatus ? ` · ${getRoomStatusLabel(roomStatus)}` : ""}`);
}

function renderRoomIdleState() {
  state.currentRoomSnapshot = null;
  renderRoomBadge();
  setRoomStatus("Пока ничего не происходит.");
  html(ui.room.roomMeta, `<div class="room-meta-line">◈ Статус: ожидание</div><div class="room-meta-line">◈ Комната: —</div>`);
  html(ui.room.roomPlayers, `
    <div class="empty-state-card">
      <div class="empty-state-mark">✦</div>
      <div class="empty-state-text">Пока вы не подключены ни к одной комнате.</div>
    </div>
  `);
  html(ui.room.waitingStateBox, "");
  html(ui.room.roomResultCard, "");
  hide(ui.battle.screen);
  stopRoomTimer();
  text(ui.room.creditBadge, "Зачёта не будет");
  text(ui.room.creditReasonBox, "Сначала создай комнату или войди в неё.");
}

function renderRoom(roomCode, rawRoom) {
  const room = normalizeRoom(rawRoom);
  state.currentRoomSnapshot = room;
  state.currentRoomCode = roomCode;
  state.currentParticipantKey = room.participants[state.user?.uid] ? state.user.uid : "";

  renderRoomBadge(roomCode, room.status);
  renderRoomPlayers(room);
  renderCreditPreview(room);
  renderWaitingState(room);
  renderRoomResultCard(room);

  text(ui.room.playerNameMirror, state.userProfile?.displayName || "—");
  text(ui.room.activeCharacterMirror, getCharacterById(getSelectedCharacterId())?.name || "—");

  const participants = getParticipantsArray(room);
  const validation = getRoomValidation(room);
  const lines = [
    `Код комнаты: ${roomCode}`,
    `Статус: ${getRoomStatusLabel(room.status)}`,
    `Режим: ${getModeLabel(room.modeId)}`,
    `Участников: ${participants.length}`,
    `Состав: ${validation.message}`
  ];

  html(ui.room.roomMeta, `
    <div class="room-meta-line">◈ Статус: ${escapeHtml(getRoomStatusLabel(room.status))}</div>
    <div class="room-meta-line">◈ Комната: ${escapeHtml(roomCode)}</div>
    <div class="room-meta-line">◈ Режим: ${escapeHtml(getModeLabel(room.modeId))}</div>
  `);

  if (room.status === "waiting" || room.status === "ready") {
    hide(ui.battle.screen);
    stopRoomTimer();
    if (participants.some(item => room.readyMap?.[item.uid])) {
      startRoomTimer(now() + getReadyCountdownLeft(room));
    }
    setRoomStatus(lines.join("\n"));
    return;
  }

  const battle = room.battle ? normalizeBattle(room.battle) : null;
  if (!battle) {
    hide(ui.battle.screen);
    stopRoomTimer();
    setRoomStatus(lines.join("\n"));
    return;
  }

  show(ui.battle.screen);

  if (room.status === "battle") {
    lines.push(`Круг собирается. Отдельные карточки появятся после завершения круга.`);
    startRoomTimer(now() + getBattleCountdownLeft(room));
  }

  if (room.status === "finished") stopRoomTimer();

  const amSpectator = !state.user || !battle.fighters[state.user.uid];
  if (amSpectator && state.isAdmin) renderBattleForAdmin(room, battle);
  else renderBattleForPlayer(room, battle);

  setRoomStatus(lines.join("\n"));
}

async function maybeShowRoomRules(roomCode) {
  if (!roomCode || !state.user || state.modalResolver) return;
  if (hasReadRulesForRoom(roomCode)) return;

  const accepted = await openInfoModal({
    title: "Правила тренировки",
    bodyHtml: getRoomRulesHtml(),
    confirmLabel: "Я понял",
    allowClose: false
  });

  if (accepted) markRulesReadForRoom(roomCode);
}

async function finishBattleAsUnfinished(roomCode, reasonText) {
  const roomRef = ref(db, getRoomPath(roomCode));
  await runTransaction(roomRef, raw => {
    if (!raw) return raw;
    const room = normalizeRoom(raw);
    if (room.status !== "battle" || !room.battle) return raw;

    const battle = normalizeBattle(room.battle);
    battle.finished = true;
    battle.completedAt = now();
    battle.finishReason = "timeout_unfinished";
    battle.lastMessage = reasonText;

    flushPendingRoundCardsNow(battle);
    appendBattleLog(battle, [
      `<div class="battle-finish-note">${escapeHtml(reasonText)}</div>`
    ]);

    room.battle = battle;
    room.status = "finished";
    room.finishInfo = {
      completedAt: battle.completedAt,
      winnerSide: "",
      winnerUid: "",
      reason: battle.finishReason,
      message: reasonText
    };

    return room;
  });
}

async function ensureRoomTimeouts(roomCode, room) {
  const normalized = normalizeRoom(room);
  if (!roomCode) return;

  if (normalized.status === "battle" && normalized.battle) {
    if (getBattleCountdownLeft(normalized) <= 0) {
      await finishBattleAsUnfinished(roomCode, "Тренировка завершена из-за 10 минут бездействия.");
      notify("Тренировка мягко завершена из-за бездействия.");
    }
  }
}

function cleanupRoomWatcher() {
  if (typeof state.unsubscribeRoom === "function") {
    state.unsubscribeRoom();
    state.unsubscribeRoom = null;
  }
}

function watchCurrentRoom() {
  cleanupRoomWatcher();

  if (!state.currentRoomCode) {
    renderRoomIdleState();
    return;
  }

  const roomRef = ref(db, getRoomPath(state.currentRoomCode));
  state.unsubscribeRoom = onValue(roomRef, snapshot => {
    if (!snapshot.exists()) {
      clearActiveRoomLocal();
      state.currentRoomCode = "";
      state.currentParticipantKey = "";
      renderRoomIdleState();
      return;
    }

    const room = normalizeRoom(snapshot.val());
    state.currentRoomSnapshot = room;

    renderRoom(state.currentRoomCode, room);
    ensureRoomTimeouts(state.currentRoomCode, room).catch(console.error);

    if (room.status !== "battle" && room.status !== "finished") {
      getCreditPreviewForRoom(room)
        .then(preview => update(ref(db, getRoomPath(state.currentRoomCode)), { creditPreview: preview }).catch(() => {}))
        .catch(console.error);

      tryStartBattleAutomatically(room).catch(console.error);
    }

    if (room.status === "finished") {
      saveFinishedMatchIfNeeded(state.currentRoomCode, room).catch(error => {
        console.error(error);
        notifyError(`Не удалось сохранить итог тренировки: ${error.message}`);
      });
    }

    maybeShowRoomRules(state.currentRoomCode).catch(console.error);
  });
}

async function claimMatchWrite(roomCode) {
  const token = `claim_${state.user?.uid || "anon"}_${now()}`;
  const result = await runTransaction(ref(db, getRoomPath(roomCode)), raw => {
    if (!raw) return raw;
    const room = normalizeRoom(raw);
    if (room.matchId) return;
    raw.matchId = token;
    return raw;
  });

  if (!result.committed) return null;
  const value = result.snapshot.val();
  if (!value?.matchId || value.matchId !== token) return null;
  return token;
}

function createHistoryRecordPayload(roomCode, room, preview) {
  const battle = room.battle ? normalizeBattle(room.battle) : null;
  const participants = getParticipantsArray(room);

  return {
    roomCode,
    finishedAt: battle?.completedAt || room.finishInfo?.completedAt || now(),
    modeId: room.modeId,
    participants: participants.map(participant => ({
      uid: participant.uid,
      characterId: participant.characterId,
      characterName: participant.characterName,
      profileName: participant.profileName,
      side: participant.side,
      result: getParticipantResult(room, participant.uid),
      getsCredit: Boolean(preview?.eligibleByParticipant?.[participant.uid]?.getsCredit)
    })),
    creditPreview: preview,
    battleLog: safeArray(battle?.log),
    finishInfo: room.finishInfo || null
  };
}

function getParticipantResult(room, uid) {
  const battle = room.battle ? normalizeBattle(room.battle) : null;
  if (!battle) return RESULT_TYPES.UNFINISHED;
  if (battle.finishReason === "timeout_unfinished") return RESULT_TYPES.UNFINISHED;

  const fighter = battle.fighters[uid];
  if (!fighter) return RESULT_TYPES.UNFINISHED;

  if (!battle.winnerSide && !battle.winnerUid) return RESULT_TYPES.DRAW;

  const mode = GROUP_MODES[battle.modeId] || GROUP_MODES.duel;

  if (mode.type === "ffa") {
    if (battle.winnerUid) return battle.winnerUid === uid ? RESULT_TYPES.WIN : RESULT_TYPES.LOSS;
    return RESULT_TYPES.DRAW;
  }

  if (battle.winnerUid && battle.fighters[battle.winnerUid]) {
    return battle.fighters[battle.winnerUid].side === fighter.side ? RESULT_TYPES.WIN : RESULT_TYPES.LOSS;
  }

  if (!battle.winnerSide) return RESULT_TYPES.DRAW;
  return fighter.side === battle.winnerSide ? RESULT_TYPES.WIN : RESULT_TYPES.LOSS;
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

      const withPoints = addPendingUpgradePoints(next, earnedNow);
      next.training = withPoints.training;
    }
  }

  next.updatedAt = finishedAt;
  return next;
}

async function saveFinishedMatchIfNeeded(roomCode, room) {
  if (!room || room.status !== "finished") return;
  if (room.matchId && !String(room.matchId).startsWith("claim_")) return;

  const currentMatchId = room.matchId;
  let claimToken = currentMatchId;

  if (!currentMatchId || !String(currentMatchId).startsWith("claim_")) {
    const claimed = await claimMatchWrite(roomCode);
    if (!claimed) return;
    claimToken = claimed;
  }

  const latestRoomSnap = await get(ref(db, getRoomPath(roomCode)));
  if (!latestRoomSnap.exists()) return;
  const latestRoom = normalizeRoom(latestRoomSnap.val());
  if (latestRoom.matchId !== claimToken) return;

  const preview = latestRoom.creditPreview || await getCreditPreviewForRoom(latestRoom);
  const historyRef = push(ref(db, "trainingHistory"));
  const matchPayload = createHistoryRecordPayload(roomCode, latestRoom, preview);
  await set(historyRef, matchPayload);

  await update(ref(db, getRoomPath(roomCode)), { matchId: historyRef.key });

  const finishedAt = matchPayload.finishedAt;
  const battle = latestRoom.battle ? normalizeBattle(latestRoom.battle) : null;
  const participants = getParticipantsArray(latestRoom);

  for (const participant of participants) {
    const charSnap = await get(ref(db, getCharacterPath(participant.uid, participant.characterId)));
    if (!charSnap.exists()) continue;

    const character = normalizeCharacter(charSnap.val());
    const enemyNames = participants
      .filter(other => isEnemyParticipant(latestRoom.modeId, participant, other))
      .map(other => other.characterName)
      .join(", ");

    const next = applyBattleOutcomeToCharacter({
      character,
      resultType: getParticipantResult(latestRoom, participant.uid),
      opponentName: enemyNames,
      finishedAt,
      creditGranted: Boolean(preview.eligibleByParticipant?.[participant.uid]?.getsCredit),
      creditReason: preview.eligibleByParticipant?.[participant.uid]?.reason || preview.reason,
      analyticsDelta: battle?.fighters?.[participant.uid]?.analytics || createBattleAnalyticsBlock()
    });

    await set(ref(db, getCharacterPath(participant.uid, participant.characterId)), next);
  }

  if (battle && battle.finishReason !== "timeout_unfinished") {
    for (let i = 0; i < participants.length; i += 1) {
      for (let j = i + 1; j < participants.length; j += 1) {
        const a = participants[i];
        const b = participants[j];
        if (!isEnemyParticipant(latestRoom.modeId, a, b)) continue;

        const pairKey = getPairKey(a.uid, a.characterId, b.uid, b.characterId);
        await set(ref(db, getPairCooldownPath(pairKey)), {
          pairKey,
          updatedAt: finishedAt,
          availableFromDateKey: addDaysToDateKey(getMoscowDateKey(finishedAt), PAIR_COOLDOWN_DAYS),
          lastCompletedDateKey: getMoscowDateKey(finishedAt),
          leftCharacterName: a.characterName,
          rightCharacterName: b.characterName
        });
      }
    }

    const creditedNames = participants
      .filter(participant => preview.eligibleByParticipant?.[participant.uid]?.getsCredit)
      .map(participant => participant.characterName);

    if (creditedNames.length) {
      await pushFeedEntry({
        type: FEED_TYPES.CREDITED_TRAINING,
        createdAt: finishedAt,
        text: `Последняя засчитанная тренировка: ${creditedNames.join(", ")}.`,
        characterNames: creditedNames
      });
    }
  }

  if (participants.some(item => item.uid === state.user?.uid)) {
    await loadOwnCharacters();
    renderProfile();
    loadAndRenderHistory().catch(console.error);
  }
}

function renderFeedTicker() {
  if (!ui.shell.feedTicker) return;
  if (!state.feedCache.length) {
    html(ui.shell.feedTicker, `<span class="feed-empty">Пока лента пуста.</span>`);
    return;
  }

  html(
    ui.shell.feedTicker,
    state.feedCache
      .slice()
      .reverse()
      .map(item => `<span class="feed-item">${escapeHtml(item.text || "Событие")}</span>`)
      .join("")
  );
}

function watchFeed() {
  if (typeof state.unsubscribeFeed === "function") {
    state.unsubscribeFeed();
    state.unsubscribeFeed = null;
  }

  const feedQuery = query(ref(db, getFeedPath()), orderByChild("createdAt"), limitToLast(FEED_LIMIT));
  state.unsubscribeFeed = onValue(feedQuery, snapshot => {
    const raw = snapshot.exists() ? Object.values(snapshot.val()) : [];
    state.feedCache = raw.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    renderFeedTicker();
  });
}

function renderCharacterCard(item) {
  const character = normalizeCharacter(item);
  const combat = getCombatViewTotals(character);
  const pending = getPendingChoiceCount(character);
  const isApprentice = character.trainingStatus === "apprentice";
  const progress = character.training.progress;
  const styleClass = isApprentice ? "character-card-apprentice" : "character-card-warrior";

  const generalStats = `
    <div class="fancy-stats-grid">
      <div class="fancy-stat"><span>Все победы</span><strong>${character.profileStats.wins}</strong></div>
      <div class="fancy-stat"><span>Все поражения</span><strong>${character.profileStats.losses}</strong></div>
      <div class="fancy-stat"><span>Все ничьи</span><strong>${character.profileStats.draws}</strong></div>
    </div>
  `;

  const creditStats = `
    <div class="fancy-stats-grid">
      <div class="fancy-stat"><span>Зачётные победы</span><strong>${progress.creditedWins}</strong></div>
      <div class="fancy-stat"><span>Зачётные поражения</span><strong>${progress.creditedLosses}</strong></div>
      <div class="fancy-stat"><span>Зачётные ничьи</span><strong>${progress.creditedDraws}</strong></div>
    </div>
  `;

  return `
    <div class="character-card ${styleClass}">
      <div class="character-card-top">
        <div>
          <div class="character-card-name">${escapeHtml(character.name)}</div>
          <div class="character-card-meta">${escapeHtml(character.clan || "Без племени")} · ${escapeHtml(getTrainingStatusLabel(character.trainingStatus))}</div>
        </div>
        <div class="character-card-badge">${pending > 0 ? `Улучшений: ${pending}` : "Без улучшений"}</div>
      </div>

      <div class="character-detail-block">
        <div class="character-detail-title">Общая статистика</div>
        ${generalStats}
      </div>

      <div class="character-detail-block" style="margin-top:12px;">
        <div class="character-detail-title">Зачётная статистика</div>
        ${creditStats}
      </div>

      <div class="character-upgrades-wrap">
        <div class="character-upgrades-block">
          <div class="character-detail-title">Текущий прогресс</div>
          <div class="character-progress-line">Победы до улучшения: ${progress.winsTowardUpgrade}</div>
          <div class="character-progress-line">Поражения до улучшения: ${progress.lossesTowardUpgrade}</div>
          <div class="character-progress-line">Незавершённые: ${progress.unfinishedTrainings}</div>
          <div class="character-progress-line">Без зачёта: ${progress.deniedTrainings}</div>
        </div>

        <div class="character-upgrades-block">
          <div class="character-detail-title">Боевые параметры</div>
          <div class="character-progress-line">Точность: ${combat.accuracy}%</div>
          <div class="character-progress-line">Уворот: ${combat.dodge}%</div>
          <div class="character-progress-line">Сила лапы: ${combat.clawPower}%</div>
          <div class="character-progress-line">Сила подсечки: ${combat.bitePower}%</div>
        </div>
      </div>

      <div class="character-upgrades-wrap">
        <div class="character-upgrades-block">
          <div class="character-detail-title">Излюбленный приём</div>
          <div class="character-progress-line">${escapeHtml(getFavoriteMoveLabel(character))}</div>
          <div class="character-progress-line">Точность попаданий: ${getAccuracyPercent(character)}%</div>
        </div>

        <div class="character-upgrades-block">
          <div class="character-detail-title">Улучшения</div>
          <div class="upgrade-chip-list">
            ${getCurrentUpgradePool(character).length
              ? getCurrentUpgradePool(character).map(item => `<span class="upgrade-chip">${escapeHtml(item.label)}</span>`).join("")
              : `<span class="empty-inline">Пока пусто</span>`
            }
          </div>
        </div>
      </div>

      <div class="character-card-actions">
        <button type="button" class="secondary-btn character-edit-btn" data-char-id="${escapeHtml(item.id)}">Редактировать</button>
        <button type="button" class="ghost-btn ghost-btn-danger character-delete-btn" data-char-id="${escapeHtml(item.id)}">Удалить</button>
        <button type="button" class="primary-btn character-upgrade-btn" data-char-id="${escapeHtml(item.id)}" ${pending > 0 ? "" : "disabled"}>Выбрать улучшение</button>
        ${isApprentice ? `<button type="button" class="ghost-btn character-promote-btn" data-char-id="${escapeHtml(item.id)}">Посвятить в воители</button>` : `<span></span>`}
      </div>
    </div>
  `;
}

function renderProfile() {
  const profile = state.userProfile || createDefaultProfile("Зенит");
  const activeCharacterId = profile.activeCharacterId || "";
  const activeCharacter = getCharacterById(activeCharacterId);

  text(ui.profile.name, profile.displayName || "Зенит");
  text(ui.profile.statusText, profile.status || "✦ Наблюдает за бабочками");
  text(ui.profile.portraitInitials, profile.portraitSymbol || getInitials(profile.displayName));
  if (ui.profile.statusInput) ui.profile.statusInput.value = profile.status || "";
  if (ui.profile.symbolSelect) ui.profile.symbolSelect.value = profile.portraitSymbol || "✦";

  const characters = getSortedCharacters();
  html(
    ui.profile.activeCharacterSelect,
    characters.length
      ? characters.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === activeCharacterId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")
      : `<option value="">✦ Сначала добавь персонажа ✦</option>`
  );

  if (ui.profile.activeCharacterSelect) {
    ui.profile.activeCharacterSelect.value = activeCharacterId || "";
  }

  if (ui.profile.ownerNoteInput) {
    ui.profile.ownerNoteInput.value = activeCharacter?.ownerNote || "";
  }

  const queryText = (ui.profile.characterSearchInput?.value || "").trim().toLowerCase();
  const filtered = characters.filter(item => item.name.toLowerCase().includes(queryText));

  html(
    ui.profile.charactersList,
    filtered.length
      ? filtered.map(renderCharacterCard).join("")
      : `
        <div class="empty-state-card">
          <div class="empty-state-mark">✦</div>
          <div class="empty-state-text">${characters.length ? "Ничего не найдено." : "Добавь первого персонажа."}</div>
        </div>
      `
  );

  ui.profile.charactersList.querySelectorAll(".character-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => editCharacter(btn.dataset.charId).catch(error => notifyError(error.message)));
  });
  ui.profile.charactersList.querySelectorAll(".character-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteCharacter(btn.dataset.charId).catch(error => notifyError(error.message)));
  });
  ui.profile.charactersList.querySelectorAll(".character-upgrade-btn").forEach(btn => {
    btn.addEventListener("click", () => chooseUpgradeForCharacter(btn.dataset.charId).catch(error => notifyError(error.message)));
  });
  ui.profile.charactersList.querySelectorAll(".character-promote-btn").forEach(btn => {
    btn.addEventListener("click", () => promoteApprenticeToWarrior(btn.dataset.charId).catch(error => notifyError(error.message)));
  });

  text(ui.room.playerNameMirror, profile.displayName || "—");
  text(ui.room.activeCharacterMirror, activeCharacter?.name || "—");

  refreshShellChrome();
}

async function loadAndRenderHistory() {
  if (!state.user) {
    html(ui.history.list, `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">История тренировок пока пуста.</div>
      </div>
    `);
    return;
  }

  const snapshot = await get(ref(db, "trainingHistory"));
  const items = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value }))
    : [];

  const mine = items
    .filter(item => safeArray(item.participants).some(participant => participant.uid === state.user.uid))
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  if (!mine.length) {
    html(ui.history.list, `
      <div class="empty-state-card">
        <div class="empty-state-mark">✦</div>
        <div class="empty-state-text">История тренировок пока пуста.</div>
      </div>
    `);
    return;
  }

  html(
    ui.history.list,
    mine.map(item => {
      const myParticipants = safeArray(item.participants).filter(participant => participant.uid === state.user.uid);
      const resultText = myParticipants.map(p => `${p.characterName}: ${p.result === "win" ? "победа" : p.result === "loss" ? "поражение" : p.result === "draw" ? "ничья" : "без итога"}`).join(" · ");
      return `
        <div class="history-item-card">
          <div class="history-item-top">
            <div class="card-title-row">
              <span class="card-title-mark">✦</span>
              <h3 class="card-title-text">${escapeHtml(getModeLabel(item.modeId))}</h3>
            </div>
            <div class="history-item-date">${escapeHtml(formatDate(item.finishedAt))}</div>
          </div>
          <div class="history-item-meta">Комната: ${escapeHtml(item.roomCode || "—")}</div>
          <div class="history-item-result">${escapeHtml(resultText)}</div>
        </div>
      `;
    }).join("")
  );
}

async function refreshPublicCharactersCache() {
  const usersSnap = await get(ref(db, "users"));
  if (!usersSnap.exists()) {
    state.publicCharactersCache = [];
    return;
  }

  const rawUsers = usersSnap.val();
  const cache = [];

  Object.entries(rawUsers).forEach(([uid, userBlock]) => {
    const profile = userBlock.profile || {};
    const characters = userBlock.characters || {};
    Object.entries(characters).forEach(([characterId, charValue]) => {
      const character = normalizeCharacter(charValue);
      cache.push({
        uid,
        characterId,
        ownerName: profile.displayName || "Игрок",
        ownerStatus: profile.status || "",
        ...character
      });
    });
  });

  state.publicCharactersCache = cache.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function renderPublicProfilesList() {
  const queryText = (ui.publicProfiles.searchInput?.value || "").trim().toLowerCase();
  const filtered = state.publicCharactersCache.filter(item => item.name.toLowerCase().includes(queryText));

  html(
    ui.publicProfiles.list,
    filtered.length
      ? filtered.map(item => `
        <div class="public-character-card" data-public-key="${escapeHtml(`${item.uid}__${item.characterId}`)}">
          <div class="public-character-name">${escapeHtml(item.name)}</div>
          <div class="public-character-meta">${escapeHtml(item.clan || "Без племени")} · ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>
          <div class="public-character-owner">${escapeHtml(item.ownerName)}</div>
        </div>
      `).join("")
      : `
        <div class="empty-state-card">
          <div class="empty-state-mark">✦</div>
          <div class="empty-state-text">Ничего не найдено.</div>
        </div>
      `
  );

  ui.publicProfiles.list.querySelectorAll(".public-character-card").forEach(card => {
    card.addEventListener("click", () => {
      const [uid, characterId] = card.dataset.publicKey.split("__");
      const item = state.publicCharactersCache.find(entry => entry.uid === uid && entry.characterId === characterId);
      if (!item) return;

      html(ui.publicProfiles.details, `
        <div class="public-profile-card">
          <div class="public-profile-name">${escapeHtml(item.name)}</div>
          <div class="public-profile-owner">Игрок: ${escapeHtml(item.ownerName)}</div>
          <div class="public-profile-meta">${escapeHtml(item.clan || "Без племени")} · ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>

          <div class="public-profile-grid" style="margin-top:16px;">
            <div class="public-profile-stat"><span>Все победы</span><strong>${item.profileStats.wins}</strong></div>
            <div class="public-profile-stat"><span>Все поражения</span><strong>${item.profileStats.losses}</strong></div>
            <div class="public-profile-stat"><span>Все ничьи</span><strong>${item.profileStats.draws}</strong></div>
            <div class="public-profile-stat"><span>Зачётные победы</span><strong>${item.training.progress.creditedWins}</strong></div>
            <div class="public-profile-stat"><span>Зачётные поражения</span><strong>${item.training.progress.creditedLosses}</strong></div>
            <div class="public-profile-stat"><span>Зачётные ничьи</span><strong>${item.training.progress.creditedDraws}</strong></div>
          </div>

          <div class="public-profile-upgrades">
            Улучшения: ${
              getCurrentUpgradePool(item).length
                ? getCurrentUpgradePool(item).map(up => up.label).join(", ")
                : "пока нет"
            }
          </div>
        </div>
      `);
    });
  });
}

async function refreshAdminCaches() {
  const [usersSnap, roomsSnap, matchesSnap] = await Promise.all([
    get(ref(db, "users")),
    get(ref(db, "rooms")),
    get(ref(db, "trainingHistory"))
  ]);

  state.adminUsersCache = usersSnap.exists() ? usersSnap.val() : {};
  state.adminRoomsCache = roomsSnap.exists() ? roomsSnap.val() : {};
  state.adminMatchesCache = matchesSnap.exists() ? matchesSnap.val() : {};
}

function renderAdmin() {
  if (!state.isAdmin) return;

  const userEntries = Object.entries(state.adminUsersCache || {});
  const roomEntries = Object.entries(state.adminRoomsCache || {});
  const matchEntries = Object.entries(state.adminMatchesCache || {});

  html(ui.admin.summary, `
    <div class="admin-summary-grid">
      <div class="admin-summary-card"><span>Игроков</span><strong>${userEntries.length}</strong></div>
      <div class="admin-summary-card"><span>Комнат</span><strong>${roomEntries.length}</strong></div>
      <div class="admin-summary-card"><span>Тренировок</span><strong>${matchEntries.length}</strong></div>
    </div>
  `);

  html(
    ui.admin.playersList,
    userEntries.length
      ? userEntries.map(([uid, block]) => `
        <div class="admin-user-card">
          <div class="admin-user-name">${escapeHtml(block.profile?.displayName || "Игрок")}</div>
          <div class="admin-user-meta">${escapeHtml(uid)}</div>
        </div>
      `).join("")
      : `<div class="empty-inline">Пока пусто.</div>`
  );

  const characterSearch = (ui.admin.searchInput?.value || "").trim().toLowerCase();
  const allCharacters = [];
  userEntries.forEach(([uid, block]) => {
    Object.entries(block.characters || {}).forEach(([characterId, charValue]) => {
      const character = normalizeCharacter(charValue);
      allCharacters.push({
        uid,
        characterId,
        ownerName: block.profile?.displayName || "Игрок",
        ...character
      });
    });
  });

  const filteredCharacters = allCharacters.filter(item => item.name.toLowerCase().includes(characterSearch));

  html(
    ui.admin.charactersList,
    filteredCharacters.length
      ? filteredCharacters.map(item => `
        <div class="admin-character-card">
          <div class="admin-character-name">${escapeHtml(item.name)}</div>
          <div class="admin-character-meta">${escapeHtml(item.ownerName)} · ${escapeHtml(item.clan || "Без племени")} · ${escapeHtml(getTrainingStatusLabel(item.trainingStatus))}</div>
        </div>
      `).join("")
      : `<div class="empty-inline">Ничего не найдено.</div>`
  );

  html(
    ui.admin.roomsList,
    roomEntries.length
      ? roomEntries.map(([code, value]) => {
          const room = normalizeRoom(value);
          return `
            <div class="admin-room-card">
              <div class="admin-room-name">${escapeHtml(code)}</div>
              <div class="admin-room-meta">${escapeHtml(getRoomStatusLabel(room.status))} · ${escapeHtml(getModeLabel(room.modeId))}</div>
            </div>
          `;
        }).join("")
      : `<div class="empty-inline">Активных комнат нет.</div>`
  );

  const sortedMatches = matchEntries
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  html(
    ui.admin.matchesList,
    sortedMatches.length
      ? sortedMatches.map(item => `
        <div class="admin-match-card">
          <div class="admin-match-title">${escapeHtml(getModeLabel(item.modeId))}</div>
          <div class="admin-match-meta">${escapeHtml(formatDate(item.finishedAt))}</div>
          <div class="admin-match-result">${escapeHtml(item.finishInfo?.message || "Тренировка завершена.")}</div>
        </div>
      `).join("")
      : `<div class="empty-inline">История пуста.</div>`
  );

  html(ui.admin.playerHistoryList, `<div class="empty-inline">Выберите игрока в будущем.</div>`);
}

function setScreen(screenName) {
  state.currentScreen = screenName;

  Object.entries(ui.screens).forEach(([key, node]) => {
    if (!node) return;
    if (key === screenName) show(node);
    else hide(node);
  });

  if (screenName === "history") {
    loadAndRenderHistory().catch(error => notifyError(error.message));
  }

  if (screenName === "publicProfiles") {
    refreshPublicCharactersCache()
      .then(renderPublicProfilesList)
      .catch(error => notifyError(error.message));
  }

  if (screenName === "admin" && state.isAdmin) {
    refreshAdminCaches()
      .then(renderAdmin)
      .catch(error => notifyError(error.message));
  }
}

function refreshShellChrome() {
  text(ui.shell.currentUserBadge, `✦ ${state.userProfile?.displayName || "Гость"} ✦`);

  ui.shell.openHistoryBtn?.classList.toggle("hidden", !state.user);
  ui.shell.openPublicProfilesBtn?.classList.toggle("hidden", !state.user);
  ui.shell.openAdminBtn?.classList.toggle("hidden", !state.isAdmin);

  if (ui.shell.themeSelect) ui.shell.themeSelect.value = state.activeTheme;
  if (ui.shell.cardStyleSelect) ui.shell.cardStyleSelect.value = state.activeCardStyle;
}

async function saveUserVisualPrefs() {
  if (!state.user) return;
  await update(ref(db, getProfilePath(state.user.uid)), {
    themeId: state.activeTheme,
    cardStyleId: state.activeCardStyle,
    updatedAt: now()
  });
}

function injectSupplementalStyles() {
  if (document.getElementById("zenithSupplementalStyles")) return;

  const style = document.createElement("style");
  style.id = "zenithSupplementalStyles";
  style.textContent = `
    .room-vs-shell {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
      gap: 18px;
      align-items: start;
    }
    .room-vs-column {
      display: grid;
      gap: 14px;
      min-width: 0;
    }
    .room-vs-title {
      text-align: center;
      font-weight: 900;
      letter-spacing: 0.06em;
      color: var(--accent-3);
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.04);
    }
    .room-vs-mark {
      align-self: center;
      justify-self: center;
      font-weight: 1000;
      font-size: 28px;
      color: var(--gold);
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      background: rgba(255,255,255,0.04);
      box-shadow: 0 10px 24px rgba(0,0,0,0.2);
    }
    .room-vs-list,
    .room-ffa-grid {
      display: grid;
      gap: 14px;
    }
    .room-ffa-grid {
      grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
    }
    .room-sigil-card {
      padding: 16px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255,255,255,0.07);
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), var(--panel-3);
      box-shadow: var(--shadow);
    }
    .room-sigil-card-self {
      border-color: var(--border-strong);
      box-shadow: 0 16px 34px rgba(0,0,0,0.26);
    }
    .room-sigil-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .room-sigil-name {
      font-size: 22px;
      font-weight: 1000;
      line-height: 1.02;
    }
    .room-sigil-meta {
      margin-top: 6px;
      color: var(--muted);
    }
    .room-sigil-ready {
      min-height: 30px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      white-space: nowrap;
    }
    .room-sigil-ready-yes {
      color: var(--accent-3);
      border-color: var(--border-strong);
    }
    .room-sigil-ready-no {
      color: var(--muted);
    }
    .room-sigil-side {
      margin-top: 12px;
    }
    .room-sigil-side-value {
      color: var(--accent-3);
      font-weight: 800;
    }
    .waiting-seal-card {
      padding: 18px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255,255,255,0.06);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)), var(--panel-3);
      box-shadow: var(--shadow);
    }
    .waiting-seal-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .waiting-seal-title {
      font-size: 26px;
      font-weight: 1000;
      line-height: 1.04;
    }
    .waiting-seal-badge {
      min-height: 34px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      font-size: 12px;
      font-weight: 800;
    }
    .waiting-seal-badge-good {
      color: var(--accent-3);
      border-color: var(--border-strong);
    }
    .waiting-seal-badge-soft {
      color: var(--muted);
    }
    .waiting-seal-text {
      margin-top: 8px;
      color: var(--muted);
    }
    .waiting-side-summary {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .waiting-side-chip {
      min-height: 34px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--accent-3);
      font-weight: 800;
    }
    .waiting-side-chip-vs {
      color: var(--gold);
    }
    .result-victory-card {
      position: relative;
      overflow: hidden;
      padding: 20px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-strong);
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), var(--panel-3);
      box-shadow: var(--shadow-strong);
      text-align: center;
    }
    .result-victory-crown {
      font-size: 28px;
      color: var(--gold);
      margin-bottom: 8px;
    }
    .result-victory-title {
      font-size: 28px;
      font-weight: 1000;
      line-height: 1.04;
    }
    .result-victory-text {
      margin-top: 10px;
      color: var(--muted);
    }
    .result-victory-bars {
      margin-top: 18px;
      display: grid;
      gap: 10px;
      text-align: left;
    }
    .battle-bar-card-hidden .battle-bar-track-hidden {
      background: rgba(255,255,255,0.04);
    }
    .battle-bar-fill-hidden {
      opacity: 0.18;
      filter: grayscale(1);
    }
    .battle-effects-grid {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px,1fr));
      gap: 10px;
    }
    .battle-effect-chip {
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.035);
    }
    .battle-effect-chip-label {
      display: block;
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 6px;
    }
    .battle-effect-chip strong {
      font-size: 17px;
      font-weight: 900;
      color: var(--accent-3);
    }
    .battle-turn-card {
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.03);
    }
    .battle-turn-card-good {
      border-color: color-mix(in srgb, var(--accent-2) 32%, transparent);
    }
    .battle-turn-card-danger {
      border-color: rgba(255, 124, 148, 0.35);
    }
    .battle-turn-card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 10px;
    }
    .battle-turn-card-round {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .battle-turn-card-actor {
      color: var(--accent-3);
      font-weight: 900;
    }
    .battle-turn-card-body {
      display: grid;
      gap: 8px;
    }
    .battle-turn-card-line {
      color: var(--soft);
      line-height: 1.5;
    }
    .battle-round-stack {
      display: grid;
      gap: 10px;
      width: 100%;
    }
    .battle-finish-note {
      color: var(--accent-3);
      font-weight: 800;
      line-height: 1.5;
    }
    @media (max-width: 980px) {
      .room-vs-shell {
        grid-template-columns: 1fr;
      }
      .room-vs-mark {
        order: 2;
      }
    }
  `;
  document.head.appendChild(style);
}

function bindStaticEvents() {
  ui.auth.registerBtn?.addEventListener("click", () => handleRegister().catch(error => notifyError(error.message)));
  ui.auth.loginBtn?.addEventListener("click", () => handleLogin().catch(error => notifyError(error.message)));
  ui.auth.logoutBtn?.addEventListener("click", () => handleLogout().catch(error => notifyError(error.message)));
  ui.shell.mainLogoutBtn?.addEventListener("click", () => handleLogout().catch(error => notifyError(error.message)));

  ui.profile.saveProfileBtn?.addEventListener("click", () => saveProfileStatus().catch(error => notifyError(error.message)));
  ui.profile.savePortraitSymbolBtn?.addEventListener("click", () => savePortraitSymbol().catch(error => notifyError(error.message)));
  ui.profile.addCharacterBtn?.addEventListener("click", () => addCharacter().catch(error => notifyError(error.message)));
  ui.profile.saveOwnerNoteBtn?.addEventListener("click", () => {
    const characterId = getSelectedCharacterId();
    saveOwnerNote(characterId, ui.profile.ownerNoteInput?.value || "").catch(error => notifyError(error.message));
  });
  ui.profile.activeCharacterSelect?.addEventListener("change", event => {
    saveActiveCharacter(event.target.value).catch(error => notifyError(error.message));
  });
  ui.profile.characterSearchInput?.addEventListener("input", renderProfile);

  ui.room.createRoomBtn?.addEventListener("click", () => createRoom().catch(error => notifyError(error.message)));
  ui.room.joinRoomBtn?.addEventListener("click", () => joinRoom().catch(error => notifyError(error.message)));
  ui.room.leaveRoomBtn?.addEventListener("click", () => leaveRoom().catch(error => notifyError(error.message)));
  ui.room.readyToggleBtn?.addEventListener("click", () => toggleReady().catch(error => notifyError(error.message)));
  ui.room.startBattleBtn?.addEventListener("click", () => startBattle().catch(error => notifyError(error.message)));
  ui.room.copyRoomCodeBtn?.addEventListener("click", async () => {
    if (!state.currentRoomCode) {
      notifyError("Сначала открой комнату.");
      return;
    }
    await navigator.clipboard.writeText(state.currentRoomCode);
    notify("Код комнаты скопирован.");
  });

  byId("groupModeSelect")?.addEventListener("change", event => {
    setRoomMode(event.target.value).catch(error => notifyError(error.message));
  });

  ui.battle.attackActionBtn?.addEventListener("click", startAttackPlanning);
  ui.battle.defendActionBtn?.addEventListener("click", () => {
    submitBattleAction({ kind: "defend" }).catch(error => notifyError(error.message));
  });
  ui.battle.escapeActionBtn?.addEventListener("click", () => {
    submitBattleAction({ kind: "escape" }).catch(error => notifyError(error.message));
  });

  ui.battle.sandAttackBtn?.addEventListener("click", () => {
    commitPlannedAttackStep({ type: "sand" });
  });
  ui.battle.pawAttackBtn?.addEventListener("click", () => {
    state.planningAttack.pendingType = "paw";
    hide(ui.battle.attackMenu);
    show(ui.battle.targetMenu);
  });
  ui.battle.tripAttackBtn?.addEventListener("click", () => {
    commitPlannedAttackStep({ type: "trip" });
  });
  ui.battle.backToActionsBtn?.addEventListener("click", resetPlanningState);
  ui.battle.backToAttackMenuBtn?.addEventListener("click", () => {
    show(ui.battle.attackMenu);
    hide(ui.battle.targetMenu);
  });

  ui.battle.faceTargetBtn?.addEventListener("click", () => commitPlannedAttackStep({ type: "paw", targetKey: "face" }));
  ui.battle.frontLeftTargetBtn?.addEventListener("click", () => commitPlannedAttackStep({ type: "paw", targetKey: "frontLeft" }));
  ui.battle.frontRightTargetBtn?.addEventListener("click", () => commitPlannedAttackStep({ type: "paw", targetKey: "frontRight" }));
  ui.battle.sideTargetBtn?.addEventListener("click", () => commitPlannedAttackStep({ type: "paw", targetKey: "side" }));
  ui.battle.earsTargetBtn?.addEventListener("click", () => commitPlannedAttackStep({ type: "paw", targetKey: "ears" }));
  ui.battle.neckTargetBtn?.addEventListener("click", () => commitPlannedAttackStep({ type: "paw", targetKey: "neck" }));

  ui.shell.openProfileBtn?.addEventListener("click", () => setScreen("profile"));
  ui.shell.openRoomBtn?.addEventListener("click", () => setScreen("room"));
  ui.shell.openHistoryBtn?.addEventListener("click", () => setScreen("history"));
  ui.shell.openPublicProfilesBtn?.addEventListener("click", () => setScreen("publicProfiles"));
  ui.shell.openAdminBtn?.addEventListener("click", () => setScreen("admin"));

  ui.publicProfiles.searchBtn?.addEventListener("click", () => renderPublicProfilesList());
  ui.publicProfiles.searchInput?.addEventListener("input", () => renderPublicProfilesList());

  ui.admin.searchBtn?.addEventListener("click", renderAdmin);
  ui.admin.searchInput?.addEventListener("input", renderAdmin);
  ui.admin.refreshBtn?.addEventListener("click", () => {
    refreshAdminCaches().then(renderAdmin).catch(error => notifyError(error.message));
  });

  ui.shell.themeSelect?.addEventListener("change", event => {
    applyTheme(event.target.value);
    saveUserVisualPrefs().catch(() => {});
  });
  ui.shell.cardStyleSelect?.addEventListener("change", event => {
    applyCardStyle(event.target.value);
    saveUserVisualPrefs().catch(() => {});
  });
}

async function bootstrapApp() {
  injectGroupUi();
  injectSupplementalStyles();
  ensureUiChrome();
  bindStaticEvents();
  watchFeed();
  renderRoomIdleState();
  refreshShellChrome();
  setScreen("auth");

  onAuthStateChanged(auth, async user => {
    try {
      if (user) {
        await handleSignedInUser(user);
        await tryAutoJoinSavedRoom();
        renderProfile();
        if (state.currentRoomCode) watchCurrentRoom();
        setScreen("profile");
      } else {
        handleSignedOutUser();
        cleanupRoomWatcher();
        setScreen("auth");
      }
      refreshShellChrome();
    } catch (error) {
      console.error(error);
      notifyError(error.message || "Не удалось инициализировать приложение.");
    }
  });
}

bootstrapApp().catch(error => {
  console.error(error);
  notifyError(error.message || "Ошибка запуска.");
});