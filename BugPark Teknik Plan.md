# BugPark — Teknik tasarım ve geliştirme planı (v2)

> Durum: uygulamaya hazır. v1'in üzerine **tasarım sistemi**, **tam içerik (5/5 bölüm)**, **durum makinesi tablosu**, **şema doğrulama**, **erişilebilirlik sözleşmeleri** ve **test planı** eklendi.
> Dil: arayüz Türkçe, kod ve dosya adları İngilizce.

---

## 0. v1 → v2 değişiklik özeti

| # | Eklenen | Neden |
|---|---|---|
| 1 | Bölüm 2: tam tasarım sistemi (kavram, token, tipografi, ızgara, motion, bileşen durumları) | v1'de tasarım "en son cila" idi; kalite hedefi baştan tanımlı olmalı |
| 2 | Ekran ekran yerleşim çizimleri (desktop + mobil + özet + hata) | Belirsizlik kaldırıldı, tasarım-before-code sırası kuruldu |
| 3 | Tasarım kalite barı: 13 ölçülebilir madde | "Kaliteli görünsün" ölçülebilir hale getirildi |
| 4 | 5 bölümün **tamamı** yazıldı (kod, çıktı, hedef, seçenekler, geri bildirim) | v1'de yalnızca 1 bölüm vardı |
| 5 | Şema v2: `version`, `concept`, `explain`, `fix.target`, `fix.solution`, `prediction.output` | Düzeltmenin *hangi satıra* uygulandığı ve "neden" anlatımı eksikti |
| 6 | `validate-levels` (çalışma anı + script) | Bozuk JSON'da beyaz ekran yerine anlaşılır hata |
| 7 | Durum makinesi tablosu + kenar durumlar (çift tıklama, seçimsiz gönderim, odak kaybı) | Akış kuralları dağınık paragraflardı |
| 8 | `node --test` ile `game.js` birim testleri + tokenizer değişmez testi | Regresyon güvencesi, ek bağımlılık yok |
| 9 | Erişilebilirlik sözleşmeleri (odak, canlı bölge, `aria-disabled`) | v1 "renk körlüğü" düzeyindeydi |
| 10 | Kontrast oranları ölçülüp tabloya yazıldı | Tasarım kararları tahmin değil, doğrulanmış |
| 11 | `js/tokenize.js` (güvenli sözdizimi renklendirme) + kural seti | Kod paneli görsel kalitesi; `innerHTML` yasağı korunarak |
| 12 | Riskler, kapsam dışı liste, açık kararlar | Kapsam kaymasını engeller |
| 13 | İş sırası 5 → 7 adım, her adımda DoD + süre | "Görünümü sonra parlat" yerine tasarım önce |

---

## 1. Ürün özeti

**Tek cümle:** Türkçe konuşan yeni başlayanlara JavaScript'teki yaygın 5 hatayı, "çıktıyı tahmin et → hatayı düzelt" döngüsüyle, süre/puan baskısı olmadan öğreten tek sayfalık tarayıcı oyunu.

- **Hedef kullanıcı:** JS'e yeni başlamış, `for`, dizi indeksi, tip dönüşümü, mantık operatörü ve `return` kavramlarını duymuş kişi.
- **Oturum:** 5 bölüm, ~6–8 dakika, tek oturuşta biter.
- **Başarı ölçütü:** Kullanıcı yardımsız ilk 3 bölümü bitirir ve 5. bölümde `return` hatasını kendi başına bulur.
- **Kapsam dışı:** hesap, skor tablosu, süre, ses, çoklu dil, kod çalıştırma, backend, React/TS, PWA, analitik.

### Ton ve üslup
- "Sen" dili, kısa cümle, ünlem yok, övgü yok ("Harika!" yasak). Geri bildirim **neden**'i söyler.
- Terim sözlüğü sabit: çıktı, konsol, koşul, dizi, indeks, fonksiyon, `return` (döndürme), tip dönüşümü.
- Her metin tek satırda okunabilir; buton etiketi en fazla 4 kelime.

---

## 2. Tasarım yönü — "Mürekkep & Kâğıt"

### 2.1 Kavram
Editör değil, **çalışma kâğıdı**: sıcak kâğıt zemin, mürekkep siyahı tipografi, tek renkli kod paneli. Renk dekorasyon değil **bilgi** taşır — yalnızca doğru/yanlış/ipucu durumlarında görünür. Böylece ekranda aynı anda en fazla bir anlamlı renk olur ve "AI üretimi mor degrade" görünümünden tamamen uzaklaşılır.

Üç imza öğe (marka taşıyıcıları):
1. **Bilet şeridi:** 5 bölümlük ilerleme, kesikli çizgiyle ayrılmış bilet parçaları gibi.
2. **Tek pencere kod kartı:** `main.js` başlığı + kod satırları + `KONSOL` bölümü aynı kart içinde, arada ince çizgi.
3. **Değişen satır işareti:** düzeltme sonrası hedef satırın solunda 3px renkli çubuk + `değişen satır` etiketi (renk tek başına anlatmaz).

### 2.2 Tipografi
Dış font yok (çevrimdışı çalışır, sıfır istek):

```css
--font-ui: ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, "Cascadia Mono", "Cascadia Code", Consolas, "SF Mono", Menlo, monospace;
```

| Rol | Boyut / satır | Ağırlık | Harf aralığı |
|---|---|---|---|
| Display (intro H1) | `clamp(2rem, 1.35rem + 3.2vw, 3.25rem)` / 1.05 | 600 | -0.02em |
| Bölüm H1 | 1.75rem / 1.15 | 600 | -0.01em |
| Gövde | 1.0625rem (17px) / 1.6 | 400 | 0 |
| Vurgu / seçenek etiketi | 1rem / 1.45 | 500 | 0 |
| Etiket (uppercase) | 0.8125rem / 1.2 | 600 | 0.08em |
| Kod & konsol | 0.9375rem (15px) / 1.65 | 400 | 0, `tab-size: 2` |
| Küçük not | 0.875rem / 1.5 | 400 | 0 |

Kural: tek ekranda **en fazla 4** tipografi boyutu. Sayılar `font-variant-numeric: tabular-nums`.

### 2.3 Renk tokenları (kontrastlar ölçüldü)

| Token | Değer | Kullanım | Kontrast |
|---|---|---|---|
| `--paper` | `#F5F2EA` | sayfa zemini | — |
| `--surface` | `#FFFDF8` | kart zemini | — |
| `--ink` | `#14161A` | metin, birincil buton zemini | 16.19:1 (paper) / 17.82:1 (surface) |
| `--ink-soft` | `#4B4F58` | ikincil metin | 7.34:1 |
| `--ink-mute` | `#5F646D` | küçük not, etiket | 5.32:1 |
| `--line` | `#DCD6C8` | dekoratif ayraç | 1.43:1 (dekoratif, sınır değil) |
| `--line-ui` | `#8C8878` | **kontrol sınırı** (seçenek kartı, ayraç) | 3.50:1 ✔ |
| `--good` / `--good-soft` | `#0F6B45` / `#E4F0E9` | çözüldü | 5.85:1 / 5.59:1 |
| `--bad` / `--bad-soft` | `#A5211B` / `#FBEAE7` | hata | 6.63:1 / 6.36:1 |
| `--warn` / `--warn-soft` | `#7A5200` / `#FBF0D9` | çözüm gösterildi, ipucu | 6.19:1 |
| `--focus` | `#1F4BD8` | odak halkası (2px, 2px boşluk) | 6.14:1 (paper) |
| `--code-bg` | `#14161A` | kod paneli | — |
| `--code-ink` | `#EDEFF3` | kod metni | 15.73:1 |
| `--code-kw` | `#E8A76B` | `for`, `const`, `if`, `return`, `function` | 8.77:1 |
| `--code-str` | `#9BD3A6` | string | 10.58:1 |
| `--code-num` | `#8FB8F0` | sayı, noktalama, fonksiyon adı | 8.87:1 |
| `--code-comment` | `#8A93A3` | yorum, satır numarası | 5.85:1 |
| `--code-bad` / `--code-good` | `#F2877A` / `#5FC79B` | panel içi durum çubuğu | 7.35:1 / 8.74:1 |

Odak halkası kuralı: `outline: 2px solid var(--focus); outline-offset: 2px`. 2px'lik kâğıt boşluğu, halkayı koyu butondan ayırır (halka ile buton arasında boşluk var, bitişik değil).

Durum renkleri **her zaman** bir işaret + metinle birlikte kullanılır: `✓ Çözüldü`, `✕ Tekrar dene`, `! Çözüm gösterildi`.

### 2.4 Boşluk, yarıçap, gölge, ızgara

```css
--s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px; --s8:64px; --s9:96px;
--r-sm:4px; --r-md:10px; --r-lg:16px; --r-pill:999px;
--shadow-1: 0 1px 2px rgba(20,22,26,.06), 0 1px 1px rgba(20,22,26,.04);
--shadow-2: 0 2px 4px rgba(20,22,26,.06), 0 8px 24px -8px rgba(20,22,26,.12);
```

- Tüm boşluklar 4'ün katı. Kart içi `24`, kart arası `24`, bölüm arası `32`, ekran üst/alt `48/64`.
- İçerik genişliği `max-width: 1060px`, yan boşluk `clamp(16px, 4vw, 40px)`.
- Bölüm ekranı ızgarası: `grid-template-columns: minmax(0,1.1fr) minmax(0,.9fr); gap: 32px`.
- Kırılım noktaları: `900px` (tek kolon), `640px` (mobil ölçek), `1200px` (geniş ferahlık).
- Köşe yarıçapı hiyerarşisi: kod kartı `16`, seçenek kartı `10`, çip `999`, satır vurgusu `0` (tam genişlik).
- Gölge yalnızca iki seviye; kenarlıklar gölgeden önce gelir. Degrade yok, cam/blur efekti yok.

### 2.5 Hareket
| Olay | Süre | Eğri |
|---|---|---|
| Renk/kenarlık geçişi | 120ms | `ease-out` |
| Seçenek seçimi | 140ms | `cubic-bezier(.2,.7,.2,1)` |
| Panel açılışı (banner, düzeltme alanı) | 200ms, `translateY(4px)` + opacity | `cubic-bezier(.2,.7,.2,1)` |
| Ekran değişimi | 180ms fade | `ease-out` |

`@media (prefers-reduced-motion: reduce)` → tüm transform ve geçişler kapanır, içerik anında görünür. Sıçrama, yay, konfeti, sayaç animasyonu yok.

### 2.6 Kod paneli
```
┌ main.js ──────────────────────── JavaScript · 3 satır ┐
│ 1  for (let i = 1; i < 3; i++) {                      │  ← renkli tokenlar
│ 2    console.log(i);                                  │
│ 3  }                                                  │
│ ─ KONSOL ─────────────────────────────────────────────│
│ › 1                                                   │
│ › 2                                                   │
└───────────────────────────────────────────────────────┘
```
- Satır numarası ayrı hücrede, `--code-comment`, `user-select: none`.
- Düzeltme sonrası hedef satırda 3px `--code-good` çubuk + sağda `değişen satır` etiketi.
- Konsol satırları `›` önekli; çok satırlı çıktı satır satır gösterilir, `\n` metin olarak basılmaz.
- Panel kendi içinde yatay kaydırır (`overflow-x:auto`), sayfa taşmaz.
- **Sözdizimi renklendirme güvenliği:** `js/tokenize.js` bir metni `{text, type}` dizisine çevirir; DOM'a `document.createElement` + `textContent` ile yazılır. `innerHTML`, `eval`, `new Function` yasak. Değişmez: tüm token metinleri birleşince giriş metnini **birebir** verir (test edilir). Eşleşmeyen her şey `plain` tipine düşer.

### 2.7 Bileşen envanteri ve durum matrisi

| Bileşen | Durumlar |
|---|---|
| `btn--primary` | idle (ink zemin/kâğıt metin) · hover (ink 90% + 1px iç gölge) · active (translateY 1px) · focus (halka) · `aria-disabled` (opacity .55, imleç not-allowed, tıklama yutulur) |
| `btn--ghost` | idle (alt çizgi) · hover (kâğıt tonu zemin) · focus |
| `option-card` (radio) | idle (`--line-ui` 1px) · hover (`--line` zemin) · selected (2px `--ink` + dolu radyo noktası + 600 ağırlık) · correct (`--good` 2px + `✓`) · wrong (`--bad` 2px + `✕`, seçilemez) · disabled-after-answer (opacity .7, imleç default) |
| `banner` | neutral (sol 3px `--ink-soft`) · correct (`--good`) · wrong (`--bad`) · revealed (`--warn`); her biri başlık + gövde + ikon |
| `progress-rail` | solved (dolu) · current (`aria-current`, 2px alt çizgi) · upcoming (boş) |
| `console` | loading (3 gri satır iskeleti) · filled · error |
| `details` (çözüm) | kapalı · açık |

Seçenek kartı yapısı (CSS ile durum, JS'e bağımlı değil):
```html
<label class="option">
  <input type="radio" name="prediction" value="p1">
  <span class="option__mark"></span>
  <span class="option__label">1<br>2</span>
</label>
```
`input:checked ~ .option__mark` ile dolu nokta; `input:focus-visible ~ .option__mark` ile halka. Minimum yükseklik `56px` (dokunma alanı ≥ 44px).

### 2.8 Ekran yerleşimleri

**A. Karşılama**
```
┌───────────────────────────────────────────────┐
│ [🐞] BugPark                                  │
│                                               │
│ Kodu oku. Çıktıyı tahmin et.                  │
│ Hatayı düzelt.                                │
│                                               │
│ 5 kısa görev · süre yok · puan yok            │
│                                               │
│ ① Oku ──── ② Tahmin et ──── ③ Düzelt          │
│                                               │
│ [ Başla ]      ↑ birincil, tek CTA            │
└───────────────────────────────────────────────┘
```

**B. Bölüm (masaüstü ≥900px)**
```
┌──────────────────────────────────────────────────────────────┐
│ [🐞] BugPark     ▮▮▯▯▯      Bölüm 2/5      Döngü koşulu      │
├──────────────────────────────────────────────────────────────┤
│ Eksik tur                                                    │
│ ┌ HEDEF ───────────────────────────────────────────────────┐ │
│ │ 1, 2 ve 3 sayılarını ayrı satırlara yazdır.              │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌ main.js ───────────────────────┐ ┌ Bu kod şu anda ne   ┐  │
│ │ 1  for (let i = 1; i < 3; ...  │ │ yazdırır?            │  │
│ │ 2    console.log(i);           │ │ ( ) 1  2             │  │
│ │ 3  }                           │ │ (•) 1  2  3          │  │
│ │ ─ KONSOL ───────────────────── │ │ ( ) 0  1  2          │  │
│ │ › 1                            │ │                      │  │
│ │ › 2                            │ │ [ Tahminimi kontrol ]│  │
│ └────────────────────────────────┘ └──────────────────────┘  │
│                                    ┌ ✓ Doğru tahmin ──────┐  │
│                                    │ Koşul 3'ü kapsamıyor │  │
│                                    └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```
Tahmin kontrol edildikten sonra sağ kolonun altına **düzeltme alanı** açılır (aynı kolonda, aşağı kaydırarak). Sol kolon sabit kalır.

**C. Bölüm (mobil <900px)** — tek kolon, sıra: başlık → hedef → kod+konsol → soru → seçenekler → **yapışkan alt CTA çubuğu** (`position: sticky; bottom: 0`, `padding-bottom: max(12px, env(safe-area-inset-bottom))`, üstte 1px `--line`).

**D. Özet**
```
Park turu tamam
5 görevden 4'ü çözüldü · 1 görevde çözüm gösterildi

1  Eksik tur            ✓ Çözüldü        Döngü koşulu
2  İlk meyve            ✓ Çözüldü        Dizi indeksi
3  Yan yana sayılar     ✓ Çözüldü        Tip dönüşümü
4  Kulüp kapısı         ✓ Çözüldü        Mantık operatörü
5  Kayıp sonuç          ! Çözüm gösterildi   return

[ Yeniden oyna ]
```

**E. Hata / yükleme** — kod kartı iskeleti (3 gri satır) yükleniyor; hata durumunda aynı kartta başlık + tek satır açıklama + mono komut ipucu (`python -m http.server 8000`) + `Yeniden dene`.

### 2.9 Mikro metin sözleşmesi

| Yer | Metin |
|---|---|
| Karşılama H1 | Kodu oku. Çıktıyı tahmin et. Hatayı düzelt. |
| Meta | 5 kısa görev · süre yok · puan yok |
| CTA (intro) | Başla |
| Tahmin sorusu | Bu kod şu anda ne yazdırır? |
| CTA (tahmin) | Tahminimi kontrol et |
| Doğru tahmin | `✓ Doğru tahmin` + gerçek çıktının nedeni |
| Yanlış tahmin | `✕ Tahmin tutmadı` + `Gerçek çıktı aşağıda.` |
| Düzeltme sorusu | Hedefe ulaşmak için hangi değişiklik gerekli? |
| CTA (düzeltme) | Düzeltmeyi dene |
| Doğru düzeltme | `✓ Düzeltildi` + `Değişen satır: 1` + yeni çıktı |
| Yanlış düzeltme | `✕ Bu düzeltme hedefe ulaşmıyor` + seçeneğe özel gerekçe |
| Çözüm kapısı (2. yanlıştan sonra) | `Çözümü göster` + `Bu bölüm "çözüldü" sayılmaz.` |
| CTA (çözüldü) | Sonraki bölüm / Sonuçları gör |
| Seçimsiz gönderim | Bir seçenek seç. (odak fieldset'e) |
| Yeniden başlat | Yeniden oyna |

### 2.10 Tasarım kalite barı (kabul edilmeden yayınlanmaz)

1. Tek ekranda en fazla 4 tipografi boyutu; hiçbir metin 13px'in altında değil.
2. Tüm metin kontrastı ≥ 4.5:1, kontrol sınırları ve durum çubukları ≥ 3:1 (2.3 tablosu esas).
3. Hiçbir durum yalnızca renkle anlatılmaz (işaret + metin zorunlu).
4. Tüm dokunma hedefleri ≥ 44×44px, seçenek kartları ≥ 56px yüksekliğinde.
5. 360px genişlikte sayfa yatay kaydırmaz (yalnızca kod paneli kendi içinde kaydırır).
6. %200 yakınlaştırmada hiçbir içerik kırpılmaz; yapışkan CTA içeriği örtmez.
7. Klavye ile tüm akış tamamlanır; her adımda görünür odak; odak kaybı yok.
8. Boşluk ritmi 4'ün katı; kart içi 24, bölüm arası 32.
9. Yükleme, boş, hata ve dolu durumların hepsi tasarlanmış.
10. Ekranda tek birincil CTA; ikincil eylemler metin/ghost buton.
11. `prefers-reduced-motion` açıkken hiçbir hareket yok.
12. Mikro metinler ≤ 12 kelime, ünlem yok, övgü yok.
13. Lighthouse erişilebilirlik skoru 100, performans ≥ 95.

---

## 3. Teknoloji

**HTML + CSS + Vanilla JS (ES modülleri) + JSON.** Build adımı yok, bağımlılık yok, çalışma anında kod yürütme yok (örnek kod, seçenekler ve çıktılar önceden yazılmış metinlerdir).

- **Tarayıcı hedefi:** Chrome/Edge/Firefox/Safari son 2 sürüm, iOS Safari 16+, Android Chrome. IE yok.
- **Kullanılabilen CSS:** custom properties, grid, flex, `clamp()`, `:focus-visible`, `prefers-reduced-motion`, `dvh`, `env()`, `@media (forced-colors)`.
- **Kullanılmayan:** `:has()` zorunluluğu (kardeş seçicilerle çözülüyor), harici font, harici ikon seti, CSS framework, `innerHTML`.
- **JS:** ES2022 modülleri, `fetch`, `structuredClone` yok (elle kopyalama), `localStorage` yalnızca 7. adımda.

```text
Tarayıcı → index.html → app.js → fetch('./data/levels.json')
                         ├── game.js     (saf kural/durum, DOM yok)
                         ├── ui.js       (DOM, odak, canlı bölge)
                         ├── tokenize.js (güvenli renklendirme)
                         └── storage.js  (7. adım, isteğe bağlı)
```

---

## 4. Klasör yapısı

```text
bugpark/
├── index.html
├── styles.css            # tek dosya; bölüm sırası: tokens → base → layout → components → utilities → media
├── js/
│   ├── app.js            # JSON yükleme, olaylar, game ↔ ui bağlantısı
│   ├── game.js           # createGame, reduce, validateLevels (saf)
│   ├── ui.js             # render, odak yönetimi, canlı bölge
│   ├── tokenize.js       # metin → {text,type}[] (DOM yazmaz)
│   └── storage.js        # 7. adım: localStorage sarmalayıcı
├── data/
│   └── levels.json
├── tests/
│   ├── game.test.mjs
│   ├── tokenize.test.mjs
│   └── validate-levels.mjs
├── assets/
│   └── favicon.svg       # satır içi SVG ile aynı böcek işareti
└── README.md
```

`git init` + her adım sonunda tek commit (`1-design`, `2-content`, …). `.gitignore` gerekmez.

---

## 5. Akış ve durum makinesi

**Fazlar:** `intro | predict | fix | solved | summary` (+ `loading`, `error` uygulama seviyesinde).

**Durum:**
```js
{ levels, levelIndex, phase, predictionChoiceId, predictionCorrect,
  fixChoiceId, fixAttempts, revealed, completed[], error }
```

**Geçişler** — `reduce(state, action, levels)` saf fonksiyon, her dal tabloda:

| # | Faz | Eylem | Sonuç |
|---|---|---|---|
| 1 | `intro` | `START` | `predict`, `levelIndex=0`, tüm seçimler sıfır |
| 2 | `predict` | `SUBMIT_PREDICTION(id)` — seçim yok | Değişiklik yok; UI "Bir seçenek seç." gösterir |
| 3 | `predict` | `SUBMIT_PREDICTION(id)` — geçerli | `phase=fix`, `predictionChoiceId=id`, `predictionCorrect=(id===answerId)`; iki panel de görünür, tahmin seçenekleri kilitlenir |
| 4 | `fix` | `SUBMIT_FIX(id)` — seçim yok | Değişiklik yok; UI uyarır |
| 5 | `fix` | `SUBMIT_FIX(id)` — doğru | `phase=solved`, `fixAttempts++`, `completed.push({id, outcome:'solved'})` |
| 6 | `fix` | `SUBMIT_FIX(id)` — yanlış | `fixAttempts++`, faz `fix` kalır; seçenek `✕` işaretlenir ve kilitlenir |
| 7 | `fix` | `SHOW_SOLUTION` — `fixAttempts < 2` | Yok sayılır (düğme zaten gizli) |
| 8 | `fix` | `SHOW_SOLUTION` — `fixAttempts ≥ 2` | `phase=solved`, `revealed=true`, `completed.push({id, outcome:'revealed'})` |
| 9 | `solved` | `NEXT_LEVEL` | Son bölüm değilse `levelIndex++`, `phase=predict`, seçimler/deneme sıfır; son bölümse `phase=summary` |
| 10 | `solved` | `SUBMIT_*` / ikinci `NEXT_LEVEL` | Yok sayılır (idempotent — çift tıklama güvenli) |
| 11 | herhangi | `RESTART` | `predict`, `levelIndex=0`, `completed=[]` |
| 12 | `loading` | `LOADED(levels)` | `intro` |
| 13 | `loading` | `LOAD_FAILED(msg)` | `error` |

**Kurallar**
- `completed` sırası bölüm sırasıyla aynıdır; özet ekranı bu diziden üretilir, ayrı sayaç tutulmaz.
- Yanlış seçenek **bir kez** değerlendirilir; aynı seçeneği tekrar göndermek yeni deneme saymaz.
- `NEXT_LEVEL` yalnızca `solved` fazında çalışır.
- Sayfa yenilenirse v1'de ilerleme kaybolur ve `intro` açılır (bilinen davranış, README'de yazar). Tarayıcı geri tuşu oyun içi geri sayılmaz; oturum geçmişine kayıt eklenmez.
- JSON yüklenemez veya doğrulamadan geçemezse `error` ekranı; konsola tam neden yazılır.

---

## 6. İçerik şeması v2

```json
{
  "version": 1,
  "levels": [
    {
      "id": "loop-boundary",
      "order": 1,
      "title": "Eksik tur",
      "concept": "Döngü koşulu",
      "goal": "1, 2 ve 3 sayılarını ayrı satırlara yazdır.",
      "code": "for (let i = 1; i < 3; i++) {\n  console.log(i);\n}",
      "explain": "Koşul 3 < 3 olduğunda false döner; döngü üçüncü tura hiç girmez.",
      "prediction": {
        "question": "Bu kod şu anda ne yazdırır?",
        "answerId": "p1",
        "output": "1\n2",
        "choices": [
          { "id": "p1", "label": "1\n2", "feedback": "Doğru. Üçüncü tur başlamadan koşul false oluyor." },
          { "id": "p2", "label": "1\n2\n3", "feedback": "Koşul 3 değerini kapsamıyor: 3 < 3 false." },
          { "id": "p3", "label": "0\n1\n2", "feedback": "Sayaç 1'den başlıyor, 0'dan değil." }
        ]
      },
      "fix": {
        "question": "Hedefe ulaşmak için hangi değişiklik gerekli?",
        "answerId": "f2",
        "target": { "line": 1, "snippet": "i < 3" },
        "solution": "i <= 3",
        "output": "1\n2\n3",
        "choices": [
          { "id": "f1", "label": "i < 2", "feedback": "Bu durumda yalnızca 1 yazdırılır." },
          { "id": "f2", "label": "i <= 3", "feedback": "3 de koşulu sağladığı için üçüncü tur çalışır." },
          { "id": "f3", "label": "i <= 4", "feedback": "4 de yazdırılır; hedefte fazladan bir sayı var." }
        ]
      }
    }
  ]
}
```

### 6.1 Alan kuralları
- `version` = 1. Uyuşmazsa `error` ekranı (ileri uyumluluk bilinçli olarak yok).
- `id` benzersiz, `kebab-case`; `order` 1..N artan.
- `code` ve `output` düz metindir, `\n` satır ayırır; HTML yok.
- `target.line` **1 tabanlı**, gösterilen satır numarasıyla aynı; `target.snippet` o satırda geçen alt dize.
- `solution` açıkça gösterilecek metin (düzeltilmiş parça).
- `prediction.output` = kodun **şu anki** çıktısı (yanlış olan). `fix.output` = düzeltme sonrası çıktı.
- Her fazda tam **3** seçenek, tam **1** doğru (`answerId`), id'ler faza göre benzersiz.
- `feedback` her seçenekte zorunlu, ≤ 110 karakter, "Doğru"/"Yanlış" ile başlamaz (durumu UI gösterir).

### 6.2 Doğrulama
`validateLevels(data) → {ok, errors[]}` hem `app.js` içinde (açılışta) hem `tests/validate-levels.mjs` içinde çalışır. Kontroller: `version`, `levels.length === 5`, benzersiz id, 3 seçenek, `answerId` seçeneklerde var, `target.snippet` satırda geçiyor, boş metin yok. Hata varsa: `error` ekranı + konsolda madde madde liste.

### 6.3 Beş bölümün tamamı (yayınlanacak içerik)

| # | Başlık | Beceri | Hatalı çıktı → hedef |
|---|---|---|---|
| 1 | Eksik tur | Döngü koşulu | `1 2` → `1 2 3` |
| 2 | İlk meyve | Dizi indeksi | `armut` → `elma` |
| 3 | Yan yana sayılar | Tip dönüşümü | `52` → `7` |
| 4 | Kulüp kapısı | Mantık operatörü | `Girebilir` → `Giremez` |
| 5 | Kayıp sonuç | `return` | `undefined` → `6` |

**2 — İlk meyve**
```js
const meyveler = ['elma', 'armut', 'kiraz'];
console.log(meyveler[1]);
```
- Hedef: "Konsola `elma` yazdır. En sevdiği meyve listenin başında."
- Açıklama: "Dizi indeksleri 0'dan başlar; `[1]` ikinci elemanı verir."
- Tahmin: `armut` ✔ · `elma` (indeksin 1'den başladığı yanılgısı) · `kiraz`
- Düzeltme (satır 2, `meyveler[1]`): `meyveler[0]` ✔ · `meyveler[2]` → kiraz · `meyveler[3]` → `undefined`

**3 — Yan yana sayılar**
```js
const metin = '5';
const sayi = 2;
console.log(metin + sayi);
```
- Hedef: "Konsola `7` yazdır."
- Açıklama: "`+` işareti bir taraf string ise birleştirir; 5 ve 2 yan yana gelir."
- Tahmin: `52` ✔ · `7` · `NaN`
- Düzeltme (satır 3, `metin + sayi`): `Number(metin) + sayi` ✔ (7) · `Number(sayi) + metin` → `"25"` · `metin + Number(sayi)` → `"52"`

**4 — Kulüp kapısı**
```js
const yas = 20;
const izinVar = false;

if (yas >= 18 || izinVar) {
  console.log('Girebilir');
} else {
  console.log('Giremez');
}
```
- Hedef: "Kural: kulübe girmek için 18 yaşından büyük **ve** veli izni olmalı. Bu kişi için konsola `Giremez` yazdır."
- Açıklama: "`||` iki şarttan biri yeterli olur; izin yokken de içeri alıyor."
- Tahmin: `Girebilir` ✔ · `Giremez` · `true`
- Düzeltme (satır 4, `yas >= 18 || izinVar`): `yas >= 18 && izinVar` ✔ · `yas >= 18 || !izinVar` → Girebilir · `yas >= 18 && !izinVar` → Girebilir (izni tersine çeviriyor)
- Ek kontrol notu (feedback içinde): "`izinVar = true` olsaydı çıktı `Girebilir` olmalıydı."

**5 — Kayıp sonuç**
```js
function ikiKat(n) {
  n * 2;
}

console.log(ikiKat(3));
```
- Hedef: "Konsola `6` yazdır."
- Açıklama: "Fonksiyon değer üretiyor ama `return` olmadığı için dışarı `undefined` çıkıyor."
- Tahmin: `undefined` ✔ · `6` · `NaN`
- Düzeltme (satır 2, `n * 2`): `return n * 2` ✔ · `console.log(n * 2)` → 6 ve undefined iki satır · `return n + 2` → 5

---

## 7. Erişilebilirlik sözleşmeleri

- **Başlık hiyerarşisi:** ekran başına tek `h1`. Bölüm ekranında `h1` = `<span class="sr-only">Bölüm 2/5. </span>İlk meyve`.
- **Odak:** ekran/bölüm değişince odak `h1`'e (`tabindex="-1"`), `preventScroll:false` ile. Geri bildirim geldiğinde odak **butonda kalır** (odak çalınmaz).
- **Canlı bölge:** tek `role="status"` paragrafı yalnızca kısa hükmü duyurur ("Doğru tahmin", "Bu düzeltme hedefe ulaşmıyor"). Uzun gerekçe ayrı metindir, otomatik okunmaz → çift anons olmaz.
- **Buton kilidi:** odaklı butonu asla `disabled` yapma; `aria-disabled="true"` + işleyicide erken çıkış kullan.
- **Form:** her soru `fieldset` + `legend` (legend = soru metni). Radyo `name` faz başına tekil. `label` tıklanabilir, kart tamamı hedef.
- **Hata:** seçimsiz gönderimde `aria-describedby` ile bağlı uyarı metni + `fieldset`'e odak.
- **Renk:** durumlar işaret + metinle; `forced-colors` modunda kenarlıklar `CanvasText`'e düşer, düzen bozulmaz.
- **Klavye:** Tab sırası görsel sırayla aynı; `Space`/`Enter` ile seçim; `Skip to content` bağlantısı.
- **Kod bloğu:** ekran okuyucuda satır numarası okunmaz (`aria-hidden="true"`), kod `aria-label` ile "Kod, main.js, 3 satır" olarak özetlenir.

---

## 8. Test planı

**Birim (`node --test tests/`)** — bağımlılık yok:
1. `START` → `predict`, level 0.
2. Seçimsiz `SUBMIT_PREDICTION` durumu değiştirmez.
3. Doğru tahmin → `fix` + `predictionCorrect=true`.
4. Yanlış tahmin → `fix` + `predictionCorrect=false` (akış kilitlenmez).
5. Yanlış `SUBMIT_FIX` iki kez aynı id → `fixAttempts` yalnızca 1 artar.
6. Doğru `SUBMIT_FIX` → `solved` + `completed` "solved".
7. `SHOW_SOLUTION` (1 yanlıştan sonra) → yok sayılır.
8. `SHOW_SOLUTION` (2 yanlıştan sonra) → `solved` + "revealed".
9. Son bölümde `NEXT_LEVEL` → `summary`.
10. `solved` dışında `NEXT_LEVEL` → yok sayılır.
11. `RESTART` → temiz `predict` level 0.
12. `LOAD_FAILED` → `error`.
13. `tokenize`: her örnek kod için token metinleri birleşimi girdiyle **birebir** eşit.
14. `validateLevels`: 5 bölüm geçer; bozuk cevap id'si hata üretir.

**Elle test matrisi (yayın öncesi, tek geçiş)**

| # | Senaryo | Beklenen |
|---|---|---|
| 1 | Seçimsiz "Tahminimi kontrol et" | Uyarı + odak fieldset'te, faz değişmez |
| 2 | En sık yanlış tahmin | Gerçek çıktı görünür, düzeltme açılır |
| 3 | 3 yanlış düzeltme | Her biri kendi gerekçesi, seçenek kilitli, akış çalışır |
| 4 | Çözümü göster | Özet ekranında "Çözüm gösterildi" işareti |
| 5 | Son bölümde bitir | 5/5 sayımı, "Yeniden oyna" |
| 6 | Yeniden oyna | Tüm ilerleme sıfır, `intro` değil `predict` |
| 7 | JSON dosyasını sil / engelle | Hata ekranı + "Yeniden dene" |
| 8 | 360×640, 390×844, 768×1024, 1440×900 | Yatay kaydırma yok, CTA erişilebilir |
| 9 | %200 yakınlaştırma | Kırpılma yok |
| 10 | Sadece klavye | Tüm akış tamamlanır |
| 11 | NVDA (Windows) | Tek `h1`, hüküm bir kez duyurulur |
| 12 | `prefers-reduced-motion` | Hareket yok |
| 13 | `forced-colors: active` | Kenarlıklar görünür |
| 14 | Türkçe karakter + uzun başlık | Taşma yok, satır kırılması düzgün |
| 15 | Çift hızlı tıklama (CTA) | Bölüm atlanmaz |
| 16 | Ağ yavaş (throttle 3G) | İskelet görünür, atlama yok |

**Tarayıcı matrisi:** Chrome, Edge, Firefox, Safari (son 2 sürüm), iOS Safari 16+, Android Chrome. GitHub Pages'te gizli sekmede canlı doğrulama.

---

## 9. İş sırası — 5 faz

> **Durum (25.11.2026):** Faz 1 ✅ · Faz 2 ✅ · Faz 3 ✅ · Faz 4 ✅ (axe-core 4.10, WCAG 2.1 A/AA: 7 ekran durumunda 0 ihlal; klavye, odak, `forced-colors` doğrulandı) · Faz 5 ✅ (GitHub Pages yayını: <https://enes59255x.github.io/bugpark/> · build doğrulandı)
>
> **GençTek sürümü (v3):** karanlık tema, ses, rozetler, karne, ipucu, kavram sözlüğü, kalıcı ilerleme, paylaşım, klavye kısayolları ve illüstrasyonlar eklendi. `js/storage.js` ve `SHOW_HINT` / `RESUME` eylemleri bu sürümle geldi; test sayısı 20 → 28.

Her faz tek başına çalışır bir çıktı bırakır; faz atlanmaz, faz içinde geri dönülür.

### Faz 1 — Tasarım sistemi ve görünüm (statik)
**Kapsam:** `index.html`, `styles.css` (2.3–2.4 tokenları), `assets/favicon.svg`, boş modül dosyaları, `git init`.
Bölüm ekranı sahte veriyle kurulur; **JS yok**. Tahmin / yanlış / doğru / çözüm / özet / hata durumları `data-state` ile elle açılır.
**Çıktı:** Tarayıcıda gezilebilen, yayın kalitesinde tek ekran + intro + özet + hata.
**DoD:** Kalite barı maddeleri **1–6, 8–12** masaüstü (1440) ve mobilde (390) sağlanıyor.
**Süre:** ~3.5 sa · *Tasarım onaylanmadan Faz 3'e geçilmez.*

### Faz 2 — İçerik ve oyun çekirdeği
**Kapsam:** 5 bölümün tamamı `data/levels.json` içinde, `validateLevels`, `game.js` (saf reducer), `tests/game.test.mjs`, `tests/validate-levels.mjs`.
**Çıktı:** `node --test` yeşil; JSON bozuk olduğunda anlaşılır hata listesi.
**DoD:** 14 birim testi geçiyor; yeni bölüm eklemek için JS değişmiyor.
**Süre:** ~3.5 sa

### Faz 3 — Bağlama: oynanabilir döngü
**Kapsam:** `app.js`, `ui.js`, `tokenize.js`; gerçek JSON ile uçtan uca 5 bölüm, ilerleme rayı, sonuç ekranı, yeniden oyna.
**Çıktı:** Oyun baştan sona oynanabiliyor.
**DoD:** Elle matrisin 1–6. senaryoları geçiyor; kod panelinde `innerHTML` yok; tokenizer birleşim testi yeşil.
**Süre:** ~3 sa

### Faz 4 — Erişilebilirlik ve dayanıklılık
**Kapsam:** Klavye akışı, odak sözleşmeleri, canlı bölge, `aria-disabled`, `forced-colors`, yükleme iskeleti, JSON hata ekranı.
**Çıktı:** Klavye ve ekran okuyucu ile tam akış.
**DoD:** Kalite barı **3** ve **7**; matris 7, 9, 10, 11, 13, 15, 16; Lighthouse a11y 100.
**Süre:** ~2 sa

### Faz 5 — Cila, test, yayın
**Kapsam:** Motion, meta/favicon, README, elle matris 16/16, tarayıcı matrisi, GitHub Pages demosu.
**Çıktı:** Yayınlanmış demo + README.
**DoD:** Kalite barı 13/13, matris 16/16, gizli sekmede canlı demo doğrulandı.
**Süre:** ~3 sa

**Toplam ~15 saat.** Sıra kuralı: Faz 1 onayı olmadan Faz 3'e, Faz 2 testleri yeşil olmadan Faz 3'e, Faz 5'e ise Faz 4 kapanmadan geçilmez.

### README içeriği
Ne olduğu (1 paragraf), nasıl çalıştırılır (`python -m http.server 8000` + çift tıklamanın neden çalışmadığı), nasıl yeni bölüm eklenir (şema + doğrulama kuralı: "JS'e dokunmadan"), tarayıcı desteği, bilinen davranışlar (yenilemede ilerleme kaybı), ekran görüntüsü.

---

## 10. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Tasarım "AI uygulaması" gibi görünür | Ürün değersizleşir | Mürekkep & kâğıt yönü, tek renk kuralı, Adım 1 onayı |
| Kontrast/odak gerilemesi | Erişilebilirlik iddiası çürür | Token tablosu + ölçülmüş oranlar + 2.10 kontrolü |
| Tokenizer yanlış renklendirir | Kod anlaşılmaz | `text` birleşimi = girdi testi, bilinmeyen → `plain` |
| Şema kayması (UI veriye bağımlı varsayar) | Yeni bölümde JS değişikliği gerekir | `validateLevels` zorunlu alanları kilitler |
| Mobilde CTA kodun altında kalır | Kullanıcı takılır | Yapışkan alt CTA + 360px testi |
| "Tahmin" adımı öğrenmeyi gölgeler | Pedagojik değer düşer | Her iki yanlışta `explain` gerekçesi zorunlu |

---

## 11. Yapılmayacaklar (bilinçli)

Kod çalıştırma/eval, hesap, skor, süre, liderlik tablosu, ses, bildirim, çoklu dil, karanlık tema (v1), PWA/offline cache, framework, CSS kütüphanesi, harici font, analitik, URL yönlendirme, geri tuşu entegrasyonu.

---

## 12. Açık kararlar (uygulamadan önce netleşmeli)

1. **Karanlık tema:** v1'de yok; tokenlar tek blokla eklenebilir durumda. İstenir mi?
2. **Kalıcılık:** `localStorage` 7. adımda mı eklensin, yoksa v1 hiç kaydetmesin mi? (Öneri: v1 kaydetmesin, yenileme = baştan.)
3. **İlerleme göstergesi:** 5 bilet parçası mı, `Bölüm 2/5` metni mi? (Öneri: ikisi birlikte — görsel + metin.)
4. **Dalga/hover sesli geri bildirim:** kapsam dışı. Onay?
5. **Bölüm 4'ün kuralı:** kulüp senaryosu (yaş 20 + izin yok) korunuyor; v1 tablosundaki "yaş 16" ifadesi bu senaryoyla çelişiyordu, düzeltildi.
