/**
 * Oyun kuralları. DOM'a erişmez; test edilebilir saf fonksiyonlar içerir.
 * Fazlar: loading | error | intro | predict | fix | solved | summary
 */

export const LEVEL_COUNT = 5;

const LEVEL_TEXT_FIELDS = ['id', 'title', 'concept', 'goal', 'code', 'explain'];
const CHOICE_TEXT_FIELDS = ['id', 'label', 'feedback'];

const isText = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * levels.json dosyasını doğrular. Uygulama açılışta bunu çağırır,
 * bozuk veri sessizce oyuna dönüşmez.
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateLevels(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['Kök değer bir nesne olmalı.'] };
  }
  if (data.version !== 1) {
    errors.push('version 1 olmalı.');
  }
  if (!Array.isArray(data.levels)) {
    errors.push('levels bir dizi olmalı.');
    return { ok: false, errors };
  }
  if (data.levels.length !== LEVEL_COUNT) {
    errors.push(`levels ${LEVEL_COUNT} bölüm içermeli (şu an ${data.levels.length}).`);
  }

  const seen = new Set();

  data.levels.forEach((level, index) => {
    const at = `levels[${index}]`;
    if (!level || typeof level !== 'object') {
      errors.push(`${at} bir nesne değil.`);
      return;
    }

    for (const field of LEVEL_TEXT_FIELDS) {
      if (!isText(level[field])) errors.push(`${at}.${field} eksik veya boş.`);
    }

    if (isText(level.id)) {
      if (seen.has(level.id)) errors.push(`${at}.id tekrar ediyor: ${level.id}`);
      seen.add(level.id);
    }
    if (level.order !== index + 1) {
      errors.push(`${at}.order ${index + 1} olmalı.`);
    }

    for (const phase of ['prediction', 'fix']) {
      const part = level[phase];
      if (!part || typeof part !== 'object') {
        errors.push(`${at}.${phase} eksik.`);
        continue;
      }
      if (!isText(part.question)) errors.push(`${at}.${phase}.question eksik.`);
      if (!isText(part.output)) errors.push(`${at}.${phase}.output eksik.`);

      if (!Array.isArray(part.choices) || part.choices.length !== 3) {
        errors.push(`${at}.${phase}.choices tam 3 seçenek içermeli.`);
        continue;
      }

      part.choices.forEach((choice, choiceIndex) => {
        const choiceAt = `${at}.${phase}.choices[${choiceIndex}]`;
        if (!choice || typeof choice !== 'object') {
          errors.push(`${choiceAt} bir nesne değil.`);
          return;
        }
        for (const field of CHOICE_TEXT_FIELDS) {
          if (!isText(choice[field])) errors.push(`${choiceAt}.${field} eksik.`);
        }
      });

      const ids = part.choices.map((choice) => choice && choice.id);
      if (new Set(ids).size !== ids.length) {
        errors.push(`${at}.${phase}.choices içinde tekrar eden id var.`);
      }
      if (!ids.includes(part.answerId)) {
        errors.push(`${at}.${phase}.answerId seçenekler arasında yok.`);
      }
    }

    const fix = level.fix;
    if (fix && typeof fix === 'object') {
      const target = fix.target;
      if (!target || typeof target !== 'object') {
        errors.push(`${at}.fix.target eksik.`);
      } else if (!Number.isInteger(target.line) || !isText(target.snippet)) {
        errors.push(`${at}.fix.target line (sayı) ve snippet (metin) içermeli.`);
      } else if (isText(level.code)) {
        const lines = level.code.split('\n');
        const targetLine = lines[target.line - 1];
        if (targetLine === undefined) {
          errors.push(`${at}.fix.target.line kod aralığının dışında.`);
        } else if (!targetLine.includes(target.snippet)) {
          errors.push(`${at}.fix.target.snippet ${target.line}. satırda bulunamadı.`);
        }
      }
      if (!isText(fix.solution)) errors.push(`${at}.fix.solution eksik.`);
    }
  });

  return { ok: errors.length === 0, errors };
}

export function createGame() {
  return {
    levels: [],
    levelIndex: 0,
    phase: 'loading',
    predictionChoiceId: null,
    predictionCorrect: null,
    fixChoiceId: null,
    fixAttempts: 0,
    wrongFixIds: [],
    revealed: false,
    completed: [],
    error: null,
  };
}

function resetLevel(state) {
  return {
    ...state,
    predictionChoiceId: null,
    predictionCorrect: null,
    fixChoiceId: null,
    fixAttempts: 0,
    wrongFixIds: [],
    revealed: false,
  };
}

/**
 * @param {ReturnType<typeof createGame>} state
 * @param {{type: string, [key: string]: any}} action
 * @returns {ReturnType<typeof createGame>} geçersiz eylemde aynı referans döner
 */
export function reduce(state, action) {
  const level = state.levels[state.levelIndex];

  switch (action.type) {
    case 'LOADED':
      return { ...createGame(), levels: action.levels, phase: 'intro' };

    case 'LOAD_FAILED':
      return { ...createGame(), phase: 'error', error: String(action.error ?? 'Bilinmeyen hata') };

    case 'START':
      if (state.phase !== 'intro' || state.levels.length === 0) return state;
      return { ...resetLevel(state), phase: 'predict', levelIndex: 0, completed: [] };

    case 'SUBMIT_PREDICTION': {
      if (state.phase !== 'predict' || !level) return state;
      const choice = level.prediction.choices.find((item) => item.id === action.choiceId);
      if (!choice) return state;
      return {
        ...state,
        phase: 'fix',
        predictionChoiceId: choice.id,
        predictionCorrect: choice.id === level.prediction.answerId,
      };
    }

    case 'SUBMIT_FIX': {
      if (state.phase !== 'fix' || !level) return state;
      const choice = level.fix.choices.find((item) => item.id === action.choiceId);
      if (!choice) return state;
      if (state.wrongFixIds.includes(choice.id)) return state;

      if (choice.id === level.fix.answerId) {
        return {
          ...state,
          phase: 'solved',
          fixChoiceId: choice.id,
          fixAttempts: state.fixAttempts + 1,
          completed: [...state.completed, { id: level.id, outcome: 'solved' }],
        };
      }

      return {
        ...state,
        fixChoiceId: choice.id,
        fixAttempts: state.fixAttempts + 1,
        wrongFixIds: [...state.wrongFixIds, choice.id],
      };
    }

    case 'SHOW_SOLUTION': {
      if (state.phase !== 'fix' || !level) return state;
      if (state.fixAttempts < 2) return state;
      return {
        ...state,
        phase: 'solved',
        revealed: true,
        fixChoiceId: null,
        completed: [...state.completed, { id: level.id, outcome: 'revealed' }],
      };
    }

    case 'NEXT_LEVEL': {
      if (state.phase !== 'solved') return state;
      const nextIndex = state.levelIndex + 1;
      if (nextIndex >= state.levels.length) return { ...state, phase: 'summary' };
      return { ...resetLevel(state), phase: 'predict', levelIndex: nextIndex };
    }

    case 'RESTART': {
      if (state.levels.length === 0) return state;
      return { ...resetLevel(state), phase: 'predict', levelIndex: 0, completed: [] };
    }

    default:
      return state;
  }
}

/** Düzeltme uygulanmış kodu üretir (gösterim için). */
export function fixedCode(level) {
  const lines = level.code.split('\n');
  const index = level.fix.target.line - 1;
  if (lines[index] === undefined) return level.code;
  lines[index] = lines[index].replace(level.fix.target.snippet, level.fix.solution);
  return lines.join('\n');
}
