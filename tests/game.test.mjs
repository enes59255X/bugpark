import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  fixedCode,
  hasProgress,
  LEVEL_COUNT,
  matchesPrediction,
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

test('Sekiz doğru tahminde "Keskin göz" açılır', () => {
  let state = started();
  for (let index = 0; index < 8; index += 1) {
    const level = state.levels[state.levelIndex];
    state = reduce(state, { type: 'SUBMIT_PREDICTION', choiceId: level.prediction.answerId });
    state = reduce(state, { type: 'SUBMIT_FIX', choiceId: level.fix.answerId });
    state = reduce(state, { type: 'NEXT_LEVEL' });
  }
  assert.equal(state.predictionsCorrect, 8);
  assert.ok(state.achievements.includes('keskin-goz'));
});

test('Dosya LEVEL_COUNT kadar bölüm içerir', () => {
  assert.equal(levels.length, LEVEL_COUNT);
  assert.deepEqual(levels.map((level) => level.order), levels.map((_, index) => index + 1));
});

test('Her bölümün düzeltmesi kodu gerçekten değiştirir', () => {
  for (const level of levels) {
    const fixed = fixedCode(level);
    assert.notEqual(fixed, level.code, `${level.id}: kod değişmedi`);
    assert.ok(fixed.includes(level.fix.solution), `${level.id}: çözüm kodda yok`);
    assert.equal(fixed.split('\n').length, level.code.split('\n').length, `${level.id}: satır sayısı değişti`);
  }
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

test('START: serbest modda verilen karışık sıra kullanılır', () => {
  const shuffled = [...levels].reverse();
  const state = reduce(loaded(), { type: 'START', levels: shuffled, mode: 'free' });

  assert.equal(state.mode, 'free');
  assert.equal(state.levels[0].id, levels.at(-1).id);
  assert.equal(state.phase, 'predict');
});

test('START: eksik sıra ve bilinmeyen mod yok sayılır', () => {
  const state = reduce(loaded(), { type: 'START', levels: levels.slice(0, 3), mode: 'bilinmez' });

  assert.equal(state.levels.length, levels.length);
  assert.equal(state.mode, 'guided');
});

test('matchesPrediction boşlukları ve virgüllü çok satırı tolere eder', () => {
  const multi = { prediction: { output: 'Ece\n17' } };
  assert.equal(matchesPrediction(multi, 'Ece\n17'), true);
  assert.equal(matchesPrediction(multi, ' Ece , 17 '), true);
  assert.equal(matchesPrediction(multi, 'Ece 17'), false);
  assert.equal(matchesPrediction({ prediction: { output: '4' } }, ' 4 '), true);
  assert.equal(matchesPrediction({ prediction: { output: '4' } }, '41'), false);
  assert.equal(matchesPrediction({ prediction: { output: '4' } }, '   '), false);
  assert.equal(matchesPrediction(null, '4'), false);
});

test('Doğru yazılı tahmin fix fazına geçer ve sayılır', () => {
  const state = started();
  const level = state.levels[0];
  const next = reduce(state, { type: 'SUBMIT_TYPED_PREDICTION', text: ` ${level.prediction.output} ` });

  assert.equal(next.phase, 'fix');
  assert.equal(next.predictionCorrect, true);
  assert.equal(next.predictionTyped, level.prediction.output.trim());
  assert.equal(next.predictionsCorrect, 1);
});

test('Yanlış yazılı tahmin akışı kilitlemez, sayacı artırmaz', () => {
  const state = started();
  const next = reduce(state, { type: 'SUBMIT_TYPED_PREDICTION', text: 'kesinlikle yanlış' });

  assert.equal(next.phase, 'fix');
  assert.equal(next.predictionCorrect, false);
  assert.equal(next.predictionsCorrect, 0);
  assert.equal(next.predictionTyped, 'kesinlikle yanlış');
});

test('Boş yazılı tahmin yok sayılır', () => {
  const state = started();
  assert.equal(reduce(state, { type: 'SUBMIT_TYPED_PREDICTION', text: '   ' }), state);
  assert.equal(reduce(state, { type: 'SUBMIT_TYPED_PREDICTION', text: null }), state);
});

test('HOME özetten girişe döner, sırayı ve ilerlemeyi sıfırlar', () => {
  const state = reduce(loaded(), { type: 'START', levels: [...levels].reverse(), mode: 'free' });
  const solved = reduce(state, { type: 'SUBMIT_TYPED_PREDICTION', text: state.levels[0].prediction.output });
  const home = reduce(solved, { type: 'HOME' });

  assert.equal(home.phase, 'intro');
  assert.equal(home.completed.length, 0);
  assert.deepEqual(home.levels.map((level) => level.order), levels.map((level) => level.order));
  assert.equal(reduce(home, { type: 'HOME' }), home);
});

test('RESTART verilen yeni sırayı kullanır', () => {
  const state = started();
  const next = reduce(state, { type: 'RESTART', levels: [...levels].reverse() });

  assert.equal(next.phase, 'predict');
  assert.equal(next.completed.length, 0);
  assert.equal(next.levels[0].id, levels.at(-1).id);
});
