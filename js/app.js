/**
 * Uygulama kabuğu: JSON yükler, eylemleri çalıştırır, ui.js'e render ettirir.
 */
import { createGame, reduce, validateLevels } from './game.js';
import { announce, checkedChoice, clearHints, render, showHint } from './ui.js';

const DATA_URL = './data/levels.json';

let state = createGame();

async function boot() {
  state = { ...createGame(), phase: 'loading' };
  render(state);

  try {
    const response = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`levels.json → HTTP ${response.status}`);

    const data = await response.json();
    const check = validateLevels(data);
    if (!check.ok) throw new Error(check.errors.join(' · '));

    state = reduce(state, { type: 'LOADED', levels: data.levels });
  } catch (error) {
    console.error('[BugPark]', error);
    state = reduce(state, { type: 'LOAD_FAILED', error: error.message || String(error) });
  }

  render(state);
}

function run(action) {
  switch (action) {
    case 'start': {
      const next = reduce(state, { type: 'START' });
      if (next !== state) {
        state = next;
        clearHints();
      }
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
      announce(solved ? 'Düzeltildi.' : 'Bu düzeltme hedefe ulaşmıyor.');
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
      break;
    }

    case 'restart': {
      const next = reduce(state, { type: 'RESTART' });
      if (next === state) return;
      state = next;
      clearHints();
      break;
    }

    case 'retry':
      boot();
      return;

    default:
      return;
  }

  render(state);
}

document.addEventListener('click', (event) => {
  const trigger = event.target instanceof Element
    ? event.target.closest('[data-action]')
    : null;
  if (!trigger) return;
  if (trigger.getAttribute('aria-disabled') === 'true') return;
  event.preventDefault();
  run(trigger.dataset.action);
});

/* Radyo seçiminde Enter ile gönderim (fare/klavye alışkanlığı için). */
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

document.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'radio') {
    clearHints();
  }
});

boot();
