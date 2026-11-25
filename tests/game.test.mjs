import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  fixedCode,
  hasProgress,
  progressSnapshot,
  reduce,
  validateLevels,
} from '../js/game.js';

const data = JSON.parse(readFileSync(new URL('../data/levels.json', import.meta.url), 'utf8'));
const levels = data.levels;

const loaded = () => reduce(createGame(), { type: 'LOADED', levels });
const started = () => reduce(loaded(), { type: 'START' });

const pick = (state, phase, index) => {
  const level = state.levels[state.levelIndex];
  return phase === 'prediction'
    ? level.prediction.choices[index].id
    : level.fix.choices[index].id;
};

test('START: intro → predict, bölüm 0', () => {
  const state = started();
  assert.equal(state.phase, 'predict');
  assert.equal(state.levelIndex, 0);
  assert.deepEqual(state.completed, []);
});

test('Seçimsiz gönderim durumu değiştirmez', () => {
  const state = started();
  assert.equal(reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: null }), state);
  assert.equal(reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: 'yok' }), state);
});

test('Doğru tahmin fix fazına geçer', () => {
  const state = started();
  const next = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: state.levels[0].prediction.answerId });
  assert.equal(next.phase, 'fix');
  assert.equal(next.predictionCorrect, true);
});

test('Yanlış tahmin akışı kilitlemez', () => {
  const state = started();
  const level = state.levels[0];
  const wrong = level.prediction.choices.find((choice) => choice.id !== level.prediction.answerId).id;
  const next = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: wrong });
  assert.equal(next.phase, 'fix');
  assert.equal(next.predictionCorrect, false);
});

test('Aynı yanlış düzeltme denemeyi iki kez saymaz', () => {
  const state = reduce(started(), { type: 'SUBMIT_PREDICTION', choiceId: pick(started(), 'prediction', 0) });
  const level = state.levels[0];
  const wrong = level.fix.choices.find((choice) => choice.id !== level.fix.answerId).id;

  const once = reduce(state, { type: 'SUBMIT_FIX', choiceId: wrong });
  const twice = reduce(once, { type: 'SUBMIT_FIX', choiceId: wrong });

  assert.equal(once.fixAttempts, 1);
  assert.equal(twice, once);
  assert.equal(twice.fixAttempts, 1);
});

test('Doğru düzeltme çözüldü sayılır', () => {
  const state = reduce(started(), { type: 'SUBMIT_PREDICTION', choiceId: pick(started(), 'prediction', 0) });
  const level = state.levels[0];
  const next = reduce(state, { type: 'SUBMIT_FIX', choiceId: level.fix.answerId });

  assert.equal(next.phase, 'solved');
  assert.deepEqual(next.completed, [{ id: level.id, outcome: 'solved' }]);
});

test('Tek yanlıştan sonra çözüm gösterilemez', () => {
  const state = reduce(started(), { type: 'SUBMIT_PREDICTION', choiceId: pick(started(), 'prediction', 0) });
  const level = state.levels[0];
  const wrong = level.fix.choices.find((choice) => choice.id !== level.fix.answerId).id;
  const afterWrong = reduce(state, { type: 'SUBMIT_FIX', choiceId: wrong });

  assert.equal(reduce(afterWrong, { type: 'SHOW_SOLUTION' }), afterWrong);
});

test('İki yanlıştan sonra çözüm revealed olarak işaretlenir', () => {
  const state = reduce(started(), { type: 'SUBMIT_PREDICTION', choiceId: pick(started(), 'prediction', 0) });
  const level = state.levels[0];
  const wrongs = level.fix.choices
    .filter((choice) => choice.id !== level.fix.answerId)
    .map((choice) => choice.id);

  let current = state;
  for (const id of wrongs) current = reduce(current, { type: 'SUBMIT_FIX', choiceId: id });

  assert.equal(current.fixAttempts, 2);

  const revealed = reduce(current, { type: 'SHOW_SOLUTION' });
  assert.equal(revealed.phase, 'solved');
  assert.equal(revealed.revealed, true);
  assert.deepEqual(revealed.completed, [{ id: level.id, outcome: 'revealed' }]);
});

test('Son bölümden sonra özet açılır', () => {
  let state = started();
  for (let index = 0; index < levels.length; index += 1) {
    const level = state.levels[state.levelIndex];
    state = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: level.prediction.answerId });
    state = reduce(state, { type: 'SUBMIT_FIX', choiceId: level.fix.answerId });
    state = reduce(state, { type: 'NEXT_LEVEL' });
  }
  assert.equal(state.phase, 'summary');
  assert.equal(state.completed.length, levels.length);
});

test('Çözülmeden NEXT_LEVEL yok sayılır', () => {
  const state = started();
  assert.equal(reduce(state, { type: 'NEXT_LEVEL' }), state);
});

test('RESTART temiz bir ilk bölüm açar', () => {
  const state = reduce(started(), { type: 'SUBMIT_PREDICTION', choiceId: pick(started(), 'prediction', 0) });
  const restarted = reduce(state, { type: 'RESTART' });

  assert.equal(restarted.phase, 'predict');
  assert.equal(restarted.levelIndex, 0);
  assert.equal(restarted.predictionChoiceId, null);
  assert.deepEqual(restarted.completed, []);
});

test('LOAD_FAILED hata fazına geçer', () => {
  const state = reduce(createGame(), { type: 'LOAD_FAILED', error: 'HTTP 404' });
  assert.equal(state.phase, 'error');
  assert.equal(state.error, 'HTTP 404');
});

test('validateLevels gerçek dosyayı kabul eder', () => {
  const result = validateLevels(data);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('validateLevels bozuk cevap id’sini yakalar', () => {
  const broken = structuredClone(data);
  broken.levels[0].prediction.answerId = 'yok';
  const result = validateLevels(broken);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('answerId')));
});

test('fixedCode hedef satırı değiştirir', () => {
  const level = levels[0];
  assert.match(fixedCode(level), /i <= 3/);
  assert.match(fixedCode(levels[4]), /return n \* 2/);
});

test('İpucu yalnızca düzeltme fazında açılır', () => {
  const state = started();
  assert.equal(reduce(state, { type: 'SHOW_HINT' }), state);

  const after = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: state.levels[0].prediction.answerId });
  const hinted = reduce(after, { type: 'SHOW_HINT' });

  assert.equal(hinted.hintVisible, true);
  assert.equal(hinted.hintUsedEver, true);
  assert.equal(reduce(hinted, { type: 'SHOW_HINT' }), hinted);
});

test('İlk düzeltmede "İlk adım" rozeti gelir', () => {
  const state = reduce(started(), {
    type: 'SUBMIT_PREDICTION',
    choiceId: levels[0].prediction.answerId,
  });
  const solved = reduce(state, { type: 'SUBMIT_FIX', choiceId: levels[0].fix.answerId });
  assert.ok(solved.achievements.includes('ilk-adim'));
  assert.equal(solved.predictionsCorrect, 1);
});

test('Üç doğru tahminde "Keskin göz" açılır', () => {
  let state = started();
  for (let index = 0; index < 3; index += 1) {
    const level = state.levels[state.levelIndex];
    state = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: level.prediction.answerId });
    state = reduce(state, { type: 'SUBMIT_FIX', choiceId: level.fix.answerId });
    state = reduce(state, { type: 'NEXT_LEVEL' });
  }
  assert.equal(state.predictionsCorrect, 3);
  assert.ok(state.achievements.includes('keskin-goz'));
});

test('Temiz tur ve ipucusuz rozetleri tamamlanınca gelir', () => {
  let state = started();
  for (let index = 0; index < levels.length; index += 1) {
    const level = state.levels[state.levelIndex];
    state = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: level.prediction.answerId });
    state = reduce(state, { type: 'SUBMIT_FIX', choiceId: level.fix.answerId });
    state = reduce(state, { type: 'NEXT_LEVEL' });
  }
  assert.ok(state.achievements.includes('temiz-tur'));
  assert.ok(state.achievements.includes('ipucusuz'));
});

test('İpucu kullanılan turda "ipucusuz" rozeti verilmez', () => {
  let state = started();
  const first = state.levels[0];
  state = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: first.prediction.answerId });
  state = reduce(state, { type: 'SHOW_HINT' });
  state = reduce(state, { type: 'SUBMIT_FIX', choiceId: first.fix.answerId });
  state = reduce(state, { type: 'NEXT_LEVEL' });

  for (let index = 1; index < levels.length; index += 1) {
    const level = state.levels[state.levelIndex];
    state = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: level.prediction.answerId });
    state = reduce(state, { type: 'SUBMIT_FIX', choiceId: level.fix.answerId });
    state = reduce(state, { type: 'NEXT_LEVEL' });
  }

  assert.ok(state.achievements.includes('temiz-tur'));
  assert.equal(state.achievements.includes('ipucusuz'), false);
});

test('RESUME kaydedilen bölümden devam eder', () => {
  const progress = {
    completed: [{ id: levels[0].id, outcome: 'solved' }, { id: levels[1].id, outcome: 'solved' }],
    predictionsCorrect: 2,
    hintUsedEver: true,
    achievements: ['ilk-adim'],
  };
  const state = reduce(loaded(), { type: 'RESUME', progress });

  assert.equal(state.phase, 'predict');
  assert.equal(state.levelIndex, 2);
  assert.equal(state.completed.length, 2);
  assert.equal(state.predictionsCorrect, 2);
  assert.equal(state.hintVisible, false);
});

test('RESUME tüm bölümler bitmişse özete gider', () => {
  const progress = {
    completed: levels.map((level) => ({ id: level.id, outcome: 'solved' })),
    predictionsCorrect: 5,
    hintUsedEver: false,
    achievements: ['ilk-adim', 'temiz-tur'],
  };
  const state = reduce(loaded(), { type: 'RESUME', progress });
  assert.equal(state.phase, 'summary');
});

test('progressSnapshot yalnızca kalıcı alanları taşır', () => {
  const state = started();
  const snapshot = progressSnapshot(state);
  assert.deepEqual(Object.keys(snapshot).sort(), ['achievements', 'completed', 'hintUsedEver', 'predictionsCorrect']);
  assert.equal(hasProgress(snapshot), false);
  assert.equal(hasProgress({ completed: [{ id: 'x', outcome: 'solved' }] }), true);
});
