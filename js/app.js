/**
 * Uygulama kabuğu: JSON yükler, eylemleri çalıştırır, ui.js'e render ettirir.
 * Tercihler ve ilerleme storage.js üzerinden yerelde tutulur.
 */
import {
  ACHIEVEMENTS,
  createGame,
  hasProgress,
  reduce,
  validateLevels,
} from './game.js';
import {
  announce,
  checkedChoice,
  clearHints,
  closeGlossary,
  isGlossaryOpen,
  openGlossary,
  render,
  revealHint,
  setShareNote,
  showHint,
} from './ui.js';
import {
  clearProgress,
  loadPrefs,
  loadProgress,
  savePrefs,
  saveProgress,
} from './storage.js';

const DATA_URL = './data/levels.json';
const THEME_COLOR = { light: '#F5F2EA', dark: '#12141A' };

let state = createGame();
let savedProgress = null;

const view = {
  theme: 'light',
  sound: false,
  hasResume: false,
  resumeLabel: '',
  shareNote: '',
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
  saveProgress(state);
  savedProgress = loadProgress();
}

function renderAll() {
  render(state, view);
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

function shareText() {
  const total = state.levels.length;
  const solved = state.completed.filter((item) => item.outcome === 'solved').length;
  const url = `${window.location.origin}${window.location.pathname}`;
  const earned = state.achievements.length;

  return [
    `BugPark — ${total} görevden ${solved} tanesini çözüm göstermeden bitirdim.`,
    `${state.predictionsCorrect}/${total} tahmin doğru · ${earned}/${ACHIEVEMENTS.length} rozet`,
    url,
  ].join('\n');
}

async function copyShare() {
  const text = shareText();
  let copied = false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (!copied) {
    try {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.top = '-1000px';
      document.body.append(field);
      field.select();
      copied = document.execCommand('copy');
      field.remove();
    } catch {
      copied = false;
    }
  }

  if (copied) {
    view.shareNote = 'Sonuç panoya kopyalandı.';
    announce('Sonuç panoya kopyalandı.');
  } else {
    view.shareNote = 'Kopyalanamadı; metni seçip elle kopyalayabilirsin.';
    announce('Sonuç kopyalanamadı.');
  }

  setShareNote(view.shareNote);
  window.clearTimeout(shareTimer);
  shareTimer = window.setTimeout(() => {
    view.shareNote = '';
    setShareNote('');
  }, 4000);
}

/* ---------------------------------------------------------------- yükleme */

async function boot() {
  state = { ...createGame(), phase: 'loading' };
  renderAll();

  try {
    const response = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`levels.json → HTTP ${response.status}`);

    const data = await response.json();
    const check = validateLevels(data);
    if (!check.ok) throw new Error(check.errors.join(' · '));

    state = reduce(state, { type: 'LOADED', levels: data.levels });
    refreshResume();
    view.hasResume = Boolean(savedProgress && hasProgress(savedProgress)) && savedProgress.completed.length <= data.levels.length;
  } catch (error) {
    console.error('[BugPark]', error);
    state = reduce(state, { type: 'LOAD_FAILED', error: error.message || String(error) });
  }

  renderAll();
}

/* ---------------------------------------------------------------- eylemler */

function run(action) {
  switch (action) {
    case 'start': {
      const next = reduce(state, { type: 'START' });
      if (next === state) return;
      state = next;
      view.hasResume = false;
      clearHints();
      clearProgress();
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

    case 'predict-submit': {
      const choiceId = checkedChoice('predictOptions');
      if (!choiceId) {
        showHint('predict');
        announce('Bir seçenek seç.');
        return;
      }
      const next = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId });
      if (next === state) return;
      state = next;
      clearHints();
      beep(state.predictionCorrect ? 'good' : 'bad');
      announce(state.predictionCorrect
        ? 'Doğru tahmin. Şimdi kodu düzelt.'
        : 'Tahmin tutmadı. Gerçek çıktı konsolda.');
      break;
    }

    case 'fix-submit': {
      const choiceId = checkedChoice('fixOptions');
      if (!choiceId) {
        showHint('fix');
        announce('Bir seçenek seç.');
        return;
      }
      const next = reduce(state, { type: 'SUBMIT_FIX', choiceId });
      if (next === state) return;
      const solved = next.phase === 'solved';
      state = next;
      clearHints();
      if (solved) beep('good');
      else beep('bad');
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
      const next = reduce(state, { type: 'RESTART' });
      if (next === state) return;
      state = next;
      view.shareNote = '';
      clearHints();
      clearProgress();
      announce('Baştan başlıyorsun.');
      break;
    }

    case 'retry':
      boot();
      return;

    case 'share':
      copyShare();
      return;

    case 'toggle-theme': {
      const theme = view.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      savePrefs({ theme, sound: view.sound });
      announce(view.theme === 'dark' ? 'Karanlık tema açık.' : 'Aydınlık tema açık.');
      renderAll();
      return;
    }

    case 'toggle-sound': {
      view.sound = !view.sound;
      savePrefs({ theme: view.theme, sound: view.sound });
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
  if (event.target instanceof HTMLButtonElement) return;

  if (['1', '2', '3'].includes(event.key) && ['predict', 'fix'].includes(state.phase)) {
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

applyTheme(loadPrefs().theme);
view.sound = loadPrefs().sound;
savedProgress = loadProgress();
renderAll();
boot();
