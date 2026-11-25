# BugPark

Kodu oku, çıktısını tahmin et, hatayı düzelt. Beş kısa görevde JavaScript'in yaygın hatalarını
bulmaya dayanan, tek sayfalık bir tarayıcı oyunu. Süre, puan ve üyelik yok.

## Çalıştırma

Proje klasöründe:

```bash
python -m http.server 8000
```

Sonra tarayıcıdan <http://localhost:8000> adresini aç.

`index.html` dosyasını çift tıklamak **çalışmaz**: tarayıcı `file://` üzerinden `data/levels.json`
okumasını engeller. Oyun bu durumda "Görevler yüklenemedi" ekranını gösterir.

## Testler

Bağımlılık yok, Node 20+ yeterli:

```bash
npm test                            # 20 birim testi (game.js + tokenize.js)
node tests/validate-levels.mjs      # levels.json şema doğrulaması
```

## Dosya düzeni

```text
index.html          statik kabuk (ekranlar, kod kartı, sorular)
styles.css          tasarım tokenları + bileşenler
js/app.js           JSON yükleme, olaylar, game ↔ ui bağlantısı
js/game.js          createGame / reduce / validateLevels / fixedCode (saf, DOM yok)
js/ui.js            DOM yazımı, odak yönetimi, canlı bölge
js/tokenize.js      satırı {text, type} tokenlarına ayırır
data/levels.json    bölüm içeriği (tek doğruluk kaynağı)
tests/              node --test dosyaları
assets/favicon.svg  böcek işareti
```

## Yeni bölüm ekleme

JS'e dokunmadan yalnızca `data/levels.json` düzenlenir. Her bölüm şu alanları içerir:

| Alan | Kural |
|---|---|
| `id` | benzersiz, `kebab-case` |
| `order` | dizideki sırayla aynı (1..N) |
| `title`, `concept`, `goal` | kısa metin |
| `code` | gösterilecek kod, satırlar `\n` ile |
| `explain` | hatanın nedeni (tahminden sonra gösterilir) |
| `prediction` | `question`, `answerId`, `output` (kodun **şu anki** çıktısı), 3 `choices` |
| `fix` | `question`, `answerId`, `target: {line, snippet}`, `solution`, `output`, 3 `choices` |
| `choices[]` | `id`, `label`, `feedback` |

`fix.target.line` 1 tabanlıdır ve `snippet` o satırda birebir geçmelidir; düzeltme sonrası kod bu
alt dize değiştirilerek üretilir. Kurallar `validateLevels` ile açılışta ve testte denetlenir;
tek bir kural ihlali oyunu hata ekranına düşürür.

Bölüm sayısı `js/game.js` içindeki `LEVEL_COUNT` sabitidir (şu an 5).

## Bilinen davranışlar

- İlerleme kaydedilmez. Sayfa yenilenirse oyun baştan başlar (bilinçli tercih).
- Tarayıcı geri tuşu oyun içi geri sayılmaz.
- Kod asla çalıştırılmaz; örnekler, seçenekler ve çıktılar önceden yazılmış metinlerdir.
- Kod paneli uzun satırlarda yatay kaydırır; sağ kenardaki solma kaydırma ipucudur.

## Tarayıcı desteği

Chrome, Edge, Firefox ve Safari'nin son iki sürümü; iOS Safari 16+, Android Chrome.
JavaScript kapalıysa yalnızca başlık görünür.

## Erişilebilirlik

- Renk tek başına anlam taşımaz; her durum işaret ve metinle birlikte verilir.
- Tüm akış klavyeyle tamamlanabilir, odak halkası her adımda görünür.
- Sonuçlar `role="status"` ile bir kez duyurulur, uzun gerekçeler otomatik okunmaz.
- `prefers-reduced-motion` açıkken hareket kapanır.
