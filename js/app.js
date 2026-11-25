/**
 * Uygulama kabuğu: JSON yükler, eylemleri çalıştırır, ui.js'e render ettirir.
 * Tercihler, ilerleme ve sınıf listesi storage.js üzerinden yerelde tutulur.
 */
import {
  ACHIEVEMENTS,
  createGame,
  hasProgress,
  reduce,
  validateLevels,
} from './game.js';
import { addReports, summarize, toCsv } from './classroom.js';
import { decodeReport, encodeReport, readReportCode, reportLink } from './report.js';
import {
  announce,
  checkedChoice,
  classInputValue,
  clearClassInput,
  clearHints,
  closeGlossary,
  isGlossaryOpen,
  isTypedInput,
  openGlossary,
  render,
  reportNameValue,
  revealHint,
  setClassNote,
  setReportNote,
  setShareNote,
  showHint,
  typedAnswer,
} from './ui.js';
import {
  clearProgress,
  loadClassCodes,
  loadPrefs,
  loadProgress,
  saveClassCodes,
  savePrefs,
  saveProgress,
} from './storage.js';

const DATA_URL = './data/levels.json';
const THEME_COLOR = { light: '#F5F2EA', dark: '#12141A' };

let state = createGame();
let savedProgress = null;
let baseLevels = [];
let classReports = [];

const view = {
  theme: 'light',
  sound: false,
  mode: 'guided',
  hasResume: false,
  resumeLabel: '',
  shareNote: '',
  report: null,
  classroom: null,
};

let audioContext = null;
let shareTimer = 0;

/* ------------------------------------------------------------- yardımcı */

function applyTheme(theme) {
  view.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = view.theme;
  document.documentElement.style.colorScheme = view.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[view.theme]);
}

function savePrefsNow() {
  savePrefs({ theme: view.theme, sound: view.sound, mode: view.mode });
}

function siteBase() {
  if (window.location.protocol === 'file:') return null;
  return `${window.location.origin}${window.location.pathname}`;
}

function refreshResume() {
  view.hasResume = Boolean(savedProgress && hasProgress(savedProgress));
  if (!view.hasResume) {
    view.resumeLabel = '';
    return;
  }
  const done = Math.min(savedProgress.completed.length, state.levels.length);
  view.resumeLabel = done >= state.levels.length
    ? `Tüm görevleri bitirdin (${done}/${state.levels.length}). Sonucu yeniden görebilirsin.`
    : `Kaldığın yer: Bölüm ${done + 1}/${state.levels.length} · ${done} görev tamamlandı.`;
}

function persist() {
  if (state.phase === 'intro' || state.phase === 'loading' || state.phase === 'error') return;
  if (state.mode === 'free') return;
  saveProgress(state);
  savedProgress = loadProgress();
}

function renderAll() {
  render(state, view);
}

function shuffled(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[pick]] = [copy[pick], copy[index]];
  }
  return copy;
}

function beep(kind) {
  if (!view.sound) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = audioContext || new AudioCtx();

    const notes = kind === 'good' ? [523.25, 783.99] : [207.65, 174.61];
    const start = audioContext.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const at = start + index * 0.09;

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.06, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.2);
    });
  } catch {
    /* ses desteklenmiyorsa sessizce devam et */
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* aşağıdaki yedeğe geç */
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

function shareText() {
  const total = state.levels.length;
  const solved = state.completed.filter((item) => item.outcome === 'solved').length;
  const earned = state.achievements.length;
  const mode = state.mode === 'free' ? ' · serbest mod' : '';
  const url = siteBase() || 'BugPark (tek dosya)';

  return [
    `BugPark — ${total} görevden ${solved} tanesini çözüm göstermeden bitirdim.`,
    `${state.predictionsCorrect}/${total} tahmin doğru · ${earned}/${ACHIEVEMENTS.length} rozet${mode}`,
    url,
  ].join('\n');
}

async function copyShare() {
  const copied = await copyText(shareText());

  view.shareNote = copied
    ? 'Sonuç panoya kopyalandı.'
    : 'Kopyalanamadı; metni seçip elle kopyalayabilirsin.';
  announce(copied ? 'Sonuç panoya kopyalandı.' : 'Sonuç kopyalanamadı.');

  setShareNote(view.shareNote);
  window.clearTimeout(shareTimer);
  shareTimer = window.setTimeout(() => {
    view.shareNote = '';
    setShareNote('');
  }, 4000);
}

async function makeReportLink() {
  const code = encodeReport({
    name: reportNameValue(),
    completed: state.completed,
    predictionsCorrect: state.predictionsCorrect,
    hintUsedEver: state.hintUsedEver,
    achievements: state.achievements,
    mode: state.mode,
  });

  const base = siteBase();
  const text = base ? reportLink(base, code) : code;
  const copied = await copyText(text);

  if (!base) {
    setReportNote(copied
      ? `Bağlantı yerine kodu paylaş (sınıf paneli kodu okur): ${code}`
      : `Kodu elle kopyala: ${code}`);
    announce(copied ? 'Rapor kodu kopyalandı.' : 'Rapor kodu hazır.');
    return;
  }

  setReportNote(copied
    ? `Bağlantı kopyalandı: ${text}`
    : `Bağlantı hazır (kopyalanamadı, elle seç): ${text}`);
  announce(copied ? 'Rapor bağlantısı kopyalandı.' : 'Rapor bağlantısı hazırlandı.');
}

function refreshClassroom() {
  if (!view.classroom) return;
  view.classroom = { summary: summarize(state.levels, classReports) };
}

function saveClass() {
  saveClassCodes(classReports.map((report) => report.code));
  refreshClassroom();
}

function downloadCsv() {
  const csv = toCsv(summarize(state.levels, classReports));
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bugpark-sinif-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------------------------------------------------------- yükleme */

async function loadLevels() {
  const inline = globalThis.__BUGPARK_LEVELS__;
  if (inline) return inline;

  const response = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`levels.json → HTTP ${response.status}`);
  return response.json();
}

async function boot() {
  state = { ...createGame(), phase: 'loading' };
  renderAll();

  try {
    const data = await loadLevels();
    const check = validateLevels(data);
    if (!check.ok) throw new Error(check.errors.join(' · '));

    state = reduce(state, { type: 'LOADED', levels: data.levels });
    baseLevels = data.levels;
    refreshResume();
    view.hasResume = Boolean(savedProgress && hasProgress(savedProgress))
      && savedProgress.completed.length <= data.levels.length;

    classReports = loadClassCodes()
      .map((code) => ({ code, data: decodeReport(code) }))
      .filter((report) => report.data);
    refreshClassroom();
    syncRoutes();
  } catch (error) {
    console.error('[BugPark]', error);
    state = reduce(state, { type: 'LOAD_FAILED', error: error.message || String(error) });
  }

  renderAll();
}

/* ----------------------------------------------------------------- rotalar */

function clearHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

/** Adresteki #rapor=… ve #sinif yollarını view durumuna yansıtır. */
function syncRoutes() {
  const code = readReportCode(window.location.hash);

  if (code) {
    const decoded = decodeReport(code);
    view.report = decoded;
    view.classroom = null;
    if (!decoded) {
      console.warn('[BugPark] Rapor bağlantısı okunamadı, oyun açılıyor.');
      clearHash();
    }
    return;
  }

  view.report = null;
  if (window.location.hash === '#sinif' && state.levels.length > 0) {
    view.classroom = { summary: summarize(state.levels, classReports) };
  } else {
    view.classroom = null;
  }
}

/* ---------------------------------------------------------------- eylemler */

function submitPrediction() {
  if (state.mode === 'free') {
    const text = typedAnswer();
    if (!text.trim()) {
      showHint('predict', 'Çıktıyı yaz.');
      announce('Önce çıktıyı yaz.');
      return false;
    }
    const next = reduce(state, { type: 'SUBMIT_TYPED_PREDICTION', text });
    if (next === state) return false;
    state = next;
  } else {
    const choiceId = checkedChoice('predictOptions');
    if (!choiceId) {
      showHint('predict', 'Bir seçenek seç.');
      announce('Bir seçenek seç.');
      return false;
    }
    const next = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId });
    if (next === state) return false;
    state = next;
  }

  clearHints();
  beep(state.predictionCorrect ? 'good' : 'bad');
  announce(state.predictionCorrect
    ? 'Doğru tahmin. Şimdi kodu düzelt.'
    : 'Tahmin tutmadı. Gerçek çıktı konsolda.');
  return true;
}

function addToClass(text, code) {
  const result = addReports(classReports, text ?? code ?? '');
  classReports = result.reports;
  saveClass();

  const parts = [];
  if (result.added) parts.push(`${result.added} rapor eklendi`);
  if (result.duplicate) parts.push(`${result.duplicate} zaten listede`);
  if (result.invalid) parts.push(`${result.invalid} kod okunamadı`);
  const message = parts.join(' · ') || 'Yeni rapor bulunamadı.';

  setClassNote(message);
  announce(message);
  return result;
}

function run(action) {
  switch (action) {
    case 'start': {
      const source = baseLevels.length > 0 ? baseLevels : state.levels;
      const levels = view.mode === 'free' ? shuffled(source) : source;
      const next = reduce(state, { type: 'START', levels, mode: view.mode });
      if (next === state) return;
      state = next;
      view.hasResume = false;
      clearHints();
      clearProgress();
      if (view.mode === 'free') announce('Serbest mod başladı. Görevler karışık.');
      break;
    }

    case 'resume': {
      const next = reduce(state, { type: 'RESUME', progress: savedProgress || {} });
      if (next === state) return;
      state = next;
      view.hasResume = false;
      clearHints();
      announce('Kaldığın yerden devam ediyorsun.');
      break;
    }

    case 'predict-submit':
      if (!submitPrediction()) return;
      break;

    case 'fix-submit': {
      const choiceId = checkedChoice('fixOptions');
      if (!choiceId) {
        showHint('fix', 'Bir seçenek seç.');
        announce('Bir seçenek seç.');
        return;
      }
      const next = reduce(state, { type: 'SUBMIT_FIX', choiceId });
      if (next === state) return;
      const solved = next.phase === 'solved';
      state = next;
      clearHints();
      beep(solved ? 'good' : 'bad');
      announce(solved ? 'Düzeltildi.' : 'Bu düzeltme hedefe ulaşmıyor.');
      break;
    }

    case 'hint': {
      const next = reduce(state, { type: 'SHOW_HINT' });
      if (next === state) return;
      state = next;
      announce('İpucu açıldı.');
      window.setTimeout(revealHint, 0);
      break;
    }

    case 'solution': {
      const next = reduce(state, { type: 'SHOW_SOLUTION' });
      if (next === state) return;
      state = next;
      announce('Çözüm gösterildi. Bu bölüm çözüldü sayılmadı.');
      break;
    }

    case 'next': {
      const next = reduce(state, { type: 'NEXT_LEVEL' });
      if (next === state) return;
      state = next;
      if (state.phase === 'summary') window.clearTimeout(shareTimer);
      break;
    }

    case 'restart': {
      const source = baseLevels.length > 0 ? baseLevels : state.levels;
      const levels = state.mode === 'free' ? shuffled(source) : source;
      const next = reduce(state, { type: 'RESTART', levels });
      if (next === state) return;
      state = next;
      view.shareNote = '';
      clearHints();
      clearProgress();
      setReportNote('Bağlantı yalnızca sonuçları taşır; sunucuya hiçbir şey gönderilmez.');
      announce('Baştan başlıyorsun.');
      break;
    }

    case 'home': {
      const next = reduce(state, { type: 'HOME' });
      if (next === state) return;
      state = next;
      view.shareNote = '';
      setShareNote('');
      clearHints();
      savedProgress = loadProgress();
      refreshResume();
      announce('Giriş ekranındasın.');
      break;
    }

    case 'retry':
      boot();
      return;

    case 'share':
      copyShare();
      return;

    case 'report-link':
      makeReportLink();
      return;

    case 'report-close': {
      view.report = null;
      if (window.location.hash) clearHash();
      renderAll();
      announce('Oyun açık.');
      return;
    }

    case 'report-class': {
      const code = readReportCode(window.location.hash);
      if (!code) return;
      addToClass(code);
      view.report = null;
      view.classroom = { summary: summarize(state.levels, classReports) };
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}#sinif`);
      renderAll();
      return;
    }

    case 'classroom-open': {
      view.report = null;
      view.classroom = { summary: summarize(state.levels, classReports) };
      if (window.location.hash !== '#sinif') {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}#sinif`);
      }
      setClassNote(classReports.length
        ? `${classReports.length} rapor listede.`
        : 'Henüz rapor yok.');
      renderAll();
      announce('Sınıf paneli açıldı.');
      return;
    }

    case 'class-add': {
      const text = classInputValue();
      if (!text.trim()) {
        setClassNote('Önce bir bağlantı ya da kod yapıştır.');
        announce('Kod alanı boş.');
        return;
      }
      addToClass(text);
      clearClassInput();
      renderAll();
      return;
    }

    case 'class-csv': {
      if (classReports.length === 0) {
        setClassNote('CSV için önce en az bir rapor ekle.');
        announce('Liste boş.');
        return;
      }
      downloadCsv();
      setClassNote('CSV indirildi.');
      announce('CSV indirildi.');
      return;
    }

    case 'class-clear': {
      if (classReports.length === 0) {
        setClassNote('Liste zaten boş.');
        return;
      }
      if (!window.confirm('Sınıf listesindeki tüm raporlar bu tarayıcıdan silinecek. Emin misin?')) return;
      classReports = [];
      saveClass();
      setClassNote('Liste temizlendi.');
      announce('Sınıf listesi temizlendi.');
      renderAll();
      return;
    }

    case 'class-close': {
      view.classroom = null;
      if (window.location.hash === '#sinif') clearHash();
      renderAll();
      announce('Giriş ekranındasın.');
      return;
    }

    case 'mode-guided':
    case 'mode-free': {
      view.mode = action === 'mode-free' ? 'free' : 'guided';
      savePrefsNow();
      savedProgress = loadProgress();
      refreshResume();
      announce(view.mode === 'free' ? 'Serbest mod seçildi.' : 'Sıralı mod seçildi.');
      renderAll();
      return;
    }

    case 'toggle-theme': {
      applyTheme(view.theme === 'dark' ? 'light' : 'dark');
      savePrefsNow();
      announce(view.theme === 'dark' ? 'Karanlık tema açık.' : 'Aydınlık tema açık.');
      renderAll();
      return;
    }

    case 'toggle-sound': {
      view.sound = !view.sound;
      savePrefsNow();
      announce(view.sound ? 'Ses açık.' : 'Ses kapalı.');
      renderAll();
      if (view.sound) beep('good');
      return;
    }

    case 'glossary':
      openGlossary(state);
      return;

    case 'glossary-close':
      closeGlossary();
      return;

    default:
      return;
  }

  persist();
  renderAll();
}

/* ---------------------------------------------------------------- olaylar */

document.addEventListener('click', (event) => {
  const trigger = event.target instanceof Element
    ? event.target.closest('[data-action]')
    : null;
  if (!trigger) return;
  if (trigger.getAttribute('aria-disabled') === 'true') return;
  event.preventDefault();
  run(trigger.dataset.action);
});

/* Radyo seçiminde Enter ile gönderim. */
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;

  if (isTypedInput(event.target)) {
    event.preventDefault();
    run('predict-submit');
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'radio') return;

  const action = target.closest('#predictField')
    ? 'predict-submit'
    : target.closest('#fixField')
      ? 'fix-submit'
      : null;

  if (action) {
    event.preventDefault();
    run(action);
  }
});

/* Klavye kısayolları: 1-3 seç, N sonraki. */
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (isGlossaryOpen()) return;
  if (view.report || view.classroom) return;
  if (event.target instanceof HTMLButtonElement) return;
  if (event.target instanceof HTMLInputElement && event.target.type === 'text') return;

  if (['1', '2', '3'].includes(event.key) && state.mode !== 'free' && ['predict', 'fix'].includes(state.phase)) {
    const container = state.phase === 'predict' ? 'predictOptions' : 'fixOptions';
    const inputs = byIdList(container);
    const target = inputs[Number(event.key) - 1];
    if (target && !target.disabled) {
      event.preventDefault();
      target.checked = true;
      clearHints();
    }
    return;
  }

  if ((event.key === 'n' || event.key === 'N') && state.phase === 'solved') {
    event.preventDefault();
    run('next');
  }
});

function byIdList(id) {
  return [...document.getElementById(id).querySelectorAll('input[type="radio"]')];
}

document.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'radio') {
    clearHints();
  }
});

/* ---------------------------------------------------------------- başlat */

const prefs = loadPrefs();
applyTheme(prefs.theme);
view.sound = prefs.sound;
view.mode = prefs.mode;
savedProgress = loadProgress();

/* Aynı sayfada başka bir rota açılırsa (rapor bağlantısı ya da #sinif) uygula. */
window.addEventListener('hashchange', () => {
  if (state.levels.length === 0) {
    boot();
    return;
  }
  syncRoutes();
  renderAll();
});

renderAll();
boot();
