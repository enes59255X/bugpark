/**
 * Ekran katmanı. Oyun kurallarını bilmez; yalnızca durumu DOM'a yazar.
 * Güvenlik kuralı: innerHTML yok, tüm metinler textContent ile basılır.
 */
import { ACHIEVEMENTS, fixedCode } from './game.js';
import { tokenize } from './tokenize.js';

const byId = (id) => document.getElementById(id);

const CONCEPT_ICONS = [
  'i-loop', 'i-array', 'i-type', 'i-logic', 'i-return',
  'i-object', 'i-arrow', 'i-case', 'i-nested', 'i-sort',
  'i-template', 'i-filter', 'i-parse', 'i-nullish', 'i-empty',
];

const dom = {
  intro: byId('screenIntro'),
  loading: byId('screenLoading'),
  level: byId('screenLevel'),
  summary: byId('screenSummary'),
  error: byId('screenError'),
  topbarStatus: byId('topbarStatus'),
  rail: byId('rail'),
  railLabel: byId('railLabel'),
  themeBtn: byId('themeBtn'),
  themeIcon: byId('themeIcon'),
  soundBtn: byId('soundBtn'),
  soundIcon: byId('soundIcon'),
  passList: byId('passList'),
  passCount: byId('passCount'),
  startBlock: byId('startBlock'),
  resumeBlock: byId('resumeBlock'),
  resumeText: byId('resumeText'),
  levelPos: byId('levelPos'),
  conceptBtn: byId('conceptBtn'),
  concept: byId('concept'),
  conceptIcon: byId('conceptIcon'),
  levelTitle: byId('levelTitle'),
  goal: byId('goal'),
  brief: null,
  stamp: byId('stamp'),
  codeMeta: byId('codeMeta'),
  codeList: byId('codeList'),
  consoleLabel: byId('consoleLabel'),
  consoleList: byId('consoleList'),
  predictField: byId('predictField'),
  predictQuestion: byId('predictQuestion'),
  predictOptions: byId('predictOptions'),
  predictHint: byId('predictHint'),
  predictBanner: byId('predictBanner'),
  fixField: byId('fixField'),
  fixQuestion: byId('fixQuestion'),
  patchLine: byId('patchLine'),
  patchCode: byId('patchCode'),
  fixOptions: byId('fixOptions'),
  fixHint: byId('fixHint'),
  fixBanner: byId('fixBanner'),
  hintBox: byId('hintBox'),
  hintText: byId('hintText'),
  primaryBtn: byId('primaryBtn'),
  hintBtn: byId('hintBtn'),
  solutionBtn: byId('solutionBtn'),
  badges: byId('badges'),
  takeaways: byId('takeaways'),
  summaryMeta: byId('summaryMeta'),
  results: byId('results'),
  shareNote: byId('shareNote'),
  errorDetail: byId('errorDetail'),
  glossary: byId('glossary'),
  glossaryList: byId('glossaryList'),
  status: byId('status'),
};

dom.brief = dom.goal.closest('.brief');

const screens = {
  intro: dom.intro,
  loading: dom.loading,
  level: dom.level,
  summary: dom.summary,
  error: dom.error,
};

const HEADING = {
  intro: byId('introTitle'),
  loading: byId('loadingTitle'),
  level: dom.levelTitle,
  summary: byId('summaryTitle'),
  error: byId('errorTitle'),
};

let lastScreen = null;
let lastLevel = -1;
let firstRender = true;
let announceTimer = 0;

dom.codeList.addEventListener('scroll', () => {
  const node = dom.codeList;
  const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2;
  node.classList.toggle('is-end', atEnd);
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(symbolId, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${symbolId}`);
  svg.append(use);
  return svg;
}

function screenNameFor(state) {
  switch (state.phase) {
    case 'loading': return 'loading';
    case 'error': return 'error';
    case 'intro': return 'intro';
    case 'summary': return 'summary';
    default: return 'level';
  }
}

/* ---------------------------------------------------------------- genel */

export function render(state, view = {}) {
  const screen = screenNameFor(state);

  for (const [name, node] of Object.entries(screens)) {
    node.hidden = name !== screen;
  }

  renderTools(view);
  if (screen === 'level') renderLevel(state);
  if (screen === 'intro') renderIntro(state, view);
  if (screen === 'summary') renderSummary(state, view);
  if (screen === 'error') renderError(state);
  renderChrome(state, screen);

  const screenChanged = screen !== lastScreen;
  const levelChanged = state.levelIndex !== lastLevel;
  if (!firstRender && (screenChanged || (screen === 'level' && levelChanged))) {
    const heading = HEADING[screen];
    if (heading) heading.focus();
  }
  firstRender = false;
  lastScreen = screen;
  lastLevel = state.levelIndex;
}

export function announce(text) {
  window.clearTimeout(announceTimer);
  dom.status.textContent = '';
  announceTimer = window.setTimeout(() => {
    dom.status.textContent = text;
  }, 60);
}

export function showHint(which) {
  if (which === 'predict') {
    dom.predictHint.hidden = false;
    dom.predictField.setAttribute('aria-describedby', 'predictHint');
    dom.predictField.tabIndex = -1;
    dom.predictField.focus();
  } else {
    dom.fixHint.hidden = false;
    dom.fixField.setAttribute('aria-describedby', 'fixHint');
    dom.fixField.tabIndex = -1;
    dom.fixField.focus();
  }
}

export function clearHints() {
  dom.predictHint.hidden = true;
  dom.fixHint.hidden = true;
  dom.predictField.removeAttribute('aria-describedby');
  dom.fixField.removeAttribute('aria-describedby');
}

export function checkedChoice(containerId) {
  const input = byId(containerId).querySelector('input[type="radio"]:checked');
  return input ? input.value : null;
}

export function openGlossary(state) {
  dom.glossaryList.textContent = '';
  const currentIndex = state.levels.length ? state.levelIndex : -1;

  state.levels.forEach((level, index) => {
    const row = document.createElement('li');
    if (index === currentIndex && state.phase !== 'summary') row.classList.add('is-current');

    const term = el('p', 'glossary__term');
    term.append(icon(CONCEPT_ICONS[index] || 'i-loop', 'icon icon--sm'), el('span', null, level.concept));

    row.append(term, el('p', 'glossary__body', level.takeaway));
    dom.glossaryList.append(row);
  });

  if (typeof dom.glossary.showModal === 'function') dom.glossary.showModal();
  else dom.glossary.setAttribute('open', '');
}

export function closeGlossary() {
  if (typeof dom.glossary.close === 'function') dom.glossary.close();
  else dom.glossary.removeAttribute('open');
}

export function isGlossaryOpen() {
  return dom.glossary.hasAttribute('open');
}

export function setShareNote(text) {
  dom.shareNote.textContent = text;
}

export function revealHint() {
  if (dom.hintBox.hidden) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  dom.hintBox.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* --------------------------------------------------------------- topbar */

function renderTools(view) {
  const theme = view.theme === 'dark' ? 'dark' : 'light';
  dom.themeIcon.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
  dom.themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  dom.themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Aydınlık temaya geç' : 'Karanlık temaya geç');

  const sound = Boolean(view.sound);
  dom.soundIcon.setAttribute('href', sound ? '#i-sound' : '#i-mute');
  dom.soundBtn.setAttribute('aria-pressed', sound ? 'true' : 'false');
  dom.soundBtn.setAttribute('aria-label', sound ? 'Sesi kapat' : 'Sesi aç');
}

function renderChrome(state, screen) {
  dom.topbarStatus.hidden = !(screen === 'level' || screen === 'summary');

  dom.rail.textContent = '';
  for (let index = 0; index < state.levels.length; index += 1) {
    const item = document.createElement('li');
    const done = state.completed[index];
    if (done) {
      item.classList.add(done.outcome === 'solved' ? 'is-done' : 'is-revealed');
    } else if (screen === 'level' && index === state.levelIndex) {
      item.classList.add('is-current');
    }
    dom.rail.append(item);
  }

  dom.railLabel.textContent = screen === 'summary'
    ? 'Özet'
    : `Bölüm ${state.levelIndex + 1}/${state.levels.length}`;
}

/* ---------------------------------------------------------------- giriş */

function renderIntro(state, view) {
  dom.passCount.textContent = `${state.levels.length} görev`;
  dom.passList.textContent = '';

  state.levels.forEach((level, index) => {
    const row = document.createElement('li');
    row.append(
      el('span', null, String(index + 1).padStart(2, '0')),
      document.createTextNode(level.title),
    );
    dom.passList.append(row);
  });

  const hasResume = Boolean(view.hasResume);
  dom.startBlock.hidden = hasResume;
  dom.resumeBlock.hidden = !hasResume;
  if (hasResume) {
    dom.resumeText.textContent = view.resumeLabel || '';
  }
}

/* ---------------------------------------------------------------- bölüm */

function renderLevel(state) {
  const level = state.levels[state.levelIndex];
  if (!level) return;

  const solved = state.phase === 'solved';
  const total = state.levels.length;
  const position = `Bölüm ${state.levelIndex + 1}/${total}`;

  dom.levelPos.textContent = position;
  dom.concept.textContent = level.concept;
  dom.conceptIcon.setAttribute('href', `#${CONCEPT_ICONS[state.levelIndex] || 'i-loop'}`);

  dom.levelTitle.textContent = '';
  dom.levelTitle.append(
    el('span', 'sr-only', `${position}. `),
    document.createTextNode(level.title),
  );

  dom.goal.textContent = level.goal;
  dom.brief.classList.toggle('is-solved', solved && !state.revealed);

  /* Kod */
  const code = solved ? fixedCode(level) : level.code;
  const lineCount = code.split('\n').length;
  const changedLine = solved ? level.fix.target.line : 0;
  dom.codeMeta.textContent = changedLine
    ? `JavaScript · ${lineCount} satır · değişen satır ${changedLine}`
    : `JavaScript · ${lineCount} satır`;
  renderCode(code, changedLine, lineCount);

  /* Konsol */
  const answered = state.predictionChoiceId !== null;
  if (!answered) {
    dom.consoleLabel.textContent = 'Konsol';
    dom.consoleList.classList.remove('console--good', 'console--bad');
    dom.consoleList.textContent = '';
    dom.consoleList.append(el('p', 'console__idle', 'Çıktı tahminden sonra görünür.'));
  } else {
    const tone = solved ? 'good' : (state.predictionCorrect ? 'good' : 'bad');
    dom.consoleLabel.textContent = solved ? 'Konsol · düzeltilmiş çıktı' : 'Konsol · gerçek çıktı';
    renderConsole(solved ? level.fix.output : level.prediction.output, tone);
  }

  /* Tahmin */
  dom.predictQuestion.textContent = level.prediction.question;

  const predictionMarks = {};
  if (answered) {
    predictionMarks[level.prediction.answerId] = 'good';
    if (!state.predictionCorrect) predictionMarks[state.predictionChoiceId] = 'bad';
  }

  renderOptions(dom.predictOptions, level.prediction.choices, {
    name: 'prediction',
    selectedId: state.predictionChoiceId,
    marks: predictionMarks,
    allLocked: answered,
  });

  if (answered) {
    const chosen = level.prediction.choices.find((item) => item.id === state.predictionChoiceId);
    dom.predictBanner.hidden = solved;
    if (!solved) {
      showBanner(
        dom.predictBanner,
        state.predictionCorrect ? 'good' : 'bad',
        state.predictionCorrect ? 'Doğru tahmin' : 'Tahmin tutmadı',
        chosen ? chosen.feedback : '',
        level.explain,
      );
    }
  } else {
    dom.predictBanner.hidden = true;
  }

  /* Düzeltme */
  dom.fixField.hidden = !answered || solved;
  dom.fixQuestion.textContent = level.fix.question;

  if (answered && !solved) {
    renderPatch(level);
    const marks = {};
    for (const id of state.wrongFixIds) marks[id] = 'bad';
    renderOptions(dom.fixOptions, level.fix.choices, {
      name: 'fix',
      selectedId: state.fixChoiceId,
      marks,
      lockedIds: state.wrongFixIds,
    });

    if (state.fixChoiceId && state.wrongFixIds.includes(state.fixChoiceId)) {
      const chosenFix = level.fix.choices.find((item) => item.id === state.fixChoiceId);
      showBanner(
        dom.fixBanner,
        'bad',
        'Bu düzeltme hedefe ulaşmıyor',
        chosenFix ? chosenFix.feedback : '',
      );
    } else {
      dom.fixBanner.hidden = true;
    }
  } else if (solved) {
    const change = `Satır ${level.fix.target.line}: ${level.fix.solution}`;
    if (state.revealed) {
      showBanner(
        dom.fixBanner,
        'warn',
        'Çözüm gösterildi',
        change,
        'Bu bölüm "çözüldü" sayılmaz; özette ayrı işaretlenir.',
      );
    } else {
      showBanner(dom.fixBanner, 'good', 'Düzeltildi', change, level.explain);
    }
  } else {
    dom.fixBanner.hidden = true;
  }

  /* İpucu */
  dom.hintBox.hidden = !(state.hintVisible && !solved);
  if (state.hintVisible) dom.hintText.textContent = level.hint;

  /* Eylem çubuğu */
  const isLast = state.levelIndex === total - 1;
  if (state.phase === 'predict') {
    dom.primaryBtn.textContent = 'Tahminimi kontrol et';
    dom.primaryBtn.dataset.action = 'predict-submit';
  } else if (state.phase === 'fix') {
    dom.primaryBtn.textContent = 'Düzeltmeyi dene';
    dom.primaryBtn.dataset.action = 'fix-submit';
  } else {
    dom.primaryBtn.textContent = isLast ? 'Sonuçları gör' : 'Sonraki bölüm';
    dom.primaryBtn.dataset.action = 'next';
  }
  dom.primaryBtn.removeAttribute('aria-disabled');
  dom.hintBtn.hidden = !(state.phase === 'fix' && !state.hintVisible);
  dom.solutionBtn.hidden = !(state.phase === 'fix' && state.fixAttempts >= 2);
}

function renderCode(code, changedLine, lineCount) {
  dom.codeList.textContent = '';
  dom.codeList.setAttribute('aria-label', `Kod, main.js, ${lineCount} satır`);

  const fragment = document.createDocumentFragment();
  code.split('\n').forEach((line, index) => {
    const row = el('div', 'row');
    if (changedLine === index + 1) row.classList.add('is-changed');

    const num = el('span', 'row__num', String(index + 1));
    num.setAttribute('aria-hidden', 'true');

    const codeCell = el('span', 'row__code');
    for (const token of tokenize(line)) {
      codeCell.append(el('span', `tok tok--${token.type}`, token.text));
    }

    row.append(num, codeCell);
    fragment.append(row);
  });
  dom.codeList.append(fragment);

  const overflowing = dom.codeList.scrollWidth > dom.codeList.clientWidth + 1;
  dom.codeList.classList.toggle('is-scrollable', overflowing);
  dom.codeList.classList.toggle('is-end', !overflowing);
}

function renderConsole(text, tone) {
  dom.consoleList.textContent = '';
  dom.consoleList.classList.toggle('console--good', tone === 'good');
  dom.consoleList.classList.toggle('console--bad', tone === 'bad');

  for (const line of text.split('\n')) {
    const row = el('p', 'console__row');
    const caret = el('span', 'console__caret', '›');
    caret.setAttribute('aria-hidden', 'true');
    row.append(caret, el('span', null, line));
    dom.consoleList.append(row);
  }
}

function renderOptions(container, choices, options) {
  const { name, selectedId, marks = {}, lockedIds = [], allLocked = false } = options;
  container.textContent = '';

  for (const choice of choices) {
    const wrapper = el('label', 'option');

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = choice.id;
    if (choice.id === selectedId) input.checked = true;

    const locked = allLocked || lockedIds.includes(choice.id);
    if (locked) {
      input.disabled = true;
      wrapper.classList.add('is-locked');
    }

    const body = el('span', 'option__body');
    if (locked) body.classList.add('is-locked');

    const mark = el('span', 'option__mark');
    mark.setAttribute('aria-hidden', 'true');

    const label = el('span', 'option__label');
    const lines = choice.label.split('\n');
    for (const line of lines) {
      label.append(el('span', 'option__line', line));
    }
    if (lines.length > 1) body.classList.add('has-lines');

    const iconEl = el('span', 'option__icon');
    iconEl.setAttribute('aria-hidden', 'true');

    const markState = marks[choice.id];
    if (markState === 'good') {
      body.classList.add('is-good');
      iconEl.textContent = '✓';
      body.append(mark, label, iconEl, el('span', 'sr-only', ' (doğru cevap)'));
    } else if (markState === 'bad') {
      body.classList.add('is-bad');
      iconEl.textContent = '✕';
      body.append(mark, label, iconEl, el('span', 'sr-only', ' (yanlış cevap)'));
    } else {
      body.append(mark, label, iconEl);
    }

    wrapper.append(input, body);
    container.append(wrapper);
  }
}

function renderPatch(level) {
  const { line, snippet } = level.fix.target;
  const text = level.code.split('\n')[line - 1] || '';

  dom.patchLine.textContent = String(line);
  dom.patchCode.textContent = '';

  const at = text.indexOf(snippet);
  if (at === -1) {
    dom.patchCode.textContent = text;
    return;
  }

  const mark = document.createElement('mark');
  mark.textContent = snippet;

  dom.patchCode.append(
    document.createTextNode(text.slice(0, at)),
    mark,
    document.createTextNode(text.slice(at + snippet.length)),
  );
}

function showBanner(node, tone, title, body, note) {
  node.hidden = false;
  node.className = `banner banner--${tone}`;
  node.textContent = '';

  const heading = el('p', 'banner__title');
  const glyph = el('span', 'banner__icon', tone === 'good' ? '✓' : tone === 'bad' ? '✕' : '!');
  glyph.setAttribute('aria-hidden', 'true');
  heading.append(glyph, document.createTextNode(title));

  node.append(heading);

  if (body) node.append(el('p', 'banner__body', body));
  if (note) node.append(el('p', 'banner__note', note));
}

/* ---------------------------------------------------------------- özet */

function renderSummary(state, view) {
  const total = state.levels.length;
  const solvedCount = state.completed.filter((item) => item.outcome === 'solved').length;
  const revealedCount = state.completed.length - solvedCount;

  dom.summaryMeta.textContent = `${state.completed.length}/${total} görev tamamlandı`
    + (revealedCount > 0 ? ` · ${revealedCount} görevde çözüm gösterildi` : '');

  /* Rozetler */
  dom.badges.textContent = '';
  for (const achievement of ACHIEVEMENTS) {
    const earned = state.achievements.includes(achievement.id);
    const item = document.createElement('li');
    item.className = earned ? 'badge' : 'badge badge--locked';

    const badgeIcon = el('span', 'badge__icon');
    badgeIcon.append(icon(`i-${achievement.icon}`));

    const text = el('span', 'badge__text');
    text.append(
      el('span', 'badge__title', achievement.title),
      el('span', 'badge__desc', earned ? achievement.description : 'Henüz kazanılmadı'),
    );
    text.style.display = 'grid';

    item.append(badgeIcon, text);
    dom.badges.append(item);
  }

  /* Karne */
  dom.takeaways.textContent = '';
  state.levels.forEach((level, index) => {
    const done = state.completed[index];
    const row = document.createElement('li');
    const glyph = icon(CONCEPT_ICONS[index] || 'i-loop', 'icon icon--sm');
    if (!done) glyph.style.color = 'var(--ink-mute)';
    row.append(glyph, el('span', null, level.takeaway));
    dom.takeaways.append(row);
  });

  /* Görev listesi */
  dom.results.textContent = '';
  state.levels.forEach((level, index) => {
    const done = state.completed[index];
    const row = document.createElement('li');

    const num = el('span', 'results__n', String(index + 1));
    num.setAttribute('aria-hidden', 'true');

    const main = el('span', 'results__main');
    main.append(
      el('span', 'results__title', level.title),
      el('span', 'results__concept', level.concept),
    );

    const revealed = done && done.outcome === 'revealed';
    const chip = el(
      'span',
      `chip chip--${revealed ? 'revealed' : 'solved'}`,
      revealed ? '! Çözüm gösterildi' : '✓ Çözüldü',
    );

    row.append(num, main, chip);
    dom.results.append(row);
  });

  dom.shareNote.textContent = view.shareNote || '';
}

function renderError(state) {
  dom.errorDetail.textContent = state.error ? `Teknik ayrıntı: ${state.error}` : '';
}
