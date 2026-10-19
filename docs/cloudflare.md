# Cloudflare Workers üzerinde yayın

PDF Düzenle, `pdf.beykoz.edu.tr` alan adında bir Cloudflare Worker olarak çalışır. Sunucu, PHP, veritabanı veya KV deposu gerekmez:

- **Worker** (`cloudflare/worker.mjs`) Google Workspace SAML girişini doğrular, oturumu imzalı bir çerezde tutar ve korumalı sayfaları yalnızca giriş yapmış kullanıcılara sunar.
- **Statik dosyalar** (`dist/cloudflare/assets`) Cloudflare'in dosya sunucusundan gelir. Giriş gerektiren sayfalar ve motor dosyaları `_private/` altındadır; bu klasöre dışarıdan erişilemez, yalnızca Worker okuyabilir.
- PDF işlemleri her zamanki gibi tarayıcıda yapılır; belgeler Cloudflare'e de gönderilmez.

Adresler PHP sürümüyle aynıdır (`/app.php`, `/saml-acs.php`, `/engine/merge-pdf.php` …). Böylece arayüz ve PDF motoru iki ortamda da değişmeden çalışır.

## Gereksinimler

- `beykoz.edu.tr` alanının DNS'i Cloudflare'de olmalıdır. `wrangler deploy`, `pdf.beykoz.edu.tr` alt alan adını Worker'a kendisi bağlar ve sertifikayı oluşturur. Bu adda başka bir DNS kaydı varsa önce silin.
- Cloudflare Workers ücretsiz planı çoğu kullanım için yeterlidir. Ücretsiz planda istek başına CPU süresi 10 ms ile sınırlıdır; SAML doğrulamasının bu sınırın altında kalması beklenir, ancak canlı ortamda ölçülmedi. Giriş sırasında `Exceeded CPU` hatası görülürse Workers Paid planına (aylık 5 $) geçin.
- Geliştirici bilgisayarında Node.js 22, PHP 8.2 ve Composer (paket aynı derlemeyle PHP sürümünü de üretir).

## İlk kurulum

```sh
npm ci
npm run install:engine
composer install --no-dev
npm run build            # dist/cloudflare/assets klasörünü üretir
npx wrangler login       # Cloudflare hesabıyla bir kez
```

İki gizli değeri girin. Bunlar depoya yazılmaz, yalnızca Cloudflare'de saklanır:

```sh
# Google Admin'den indirilen herkese açık X.509 sertifikası (PEM dosyasının tamamı)
npx wrangler secret put SAML_IDP_CERT < Google_2030-12-4-0529_SAML2_0.pem

# Oturum çerezlerini imzalayan rastgele anahtar
openssl rand -base64 48 | npx wrangler secret put SESSION_SECRET
```

Ardından yayınlayın:

```sh
npx wrangler deploy
```

Diğer ayarlar (`APP_URL`, `SAML_ENTRY_POINT`, `SAML_IDP_ISSUER`, `SAML_SP_ENTITY_ID`) `wrangler.jsonc` dosyasındaki `vars` bölümündedir. Google'daki değerler değişirse bu dosyayı güncelleyip yeniden yayınlayın.

## Google Workspace ayarları

Google Admin → **Uygulamalar → Web ve mobil uygulamalar → PDF Düzenle** → **Service Provider ayrıntıları**:

| Alan | Değer |
| --- | --- |
| ACS URL | `https://pdf.beykoz.edu.tr/saml-acs.php` |
| Entity ID | `https://pdf.beykoz.edu.tr/metadata.php` |
| Signed response | **İşaretli** |
| Name ID format | **EMAIL** |
| Name ID | **Basic Information → Primary email** |

Diğer ayrıntılar için [google-workspace.md](google-workspace.md) dosyasına bakın.

## Güncelleme

```sh
git pull
npm run build
npx wrangler deploy
```

Yeni sürüm birkaç saniyede tüm kullanıcılara ulaşır. Açık oturumlar korunur.

## Kontrol

```sh
curl -i https://pdf.beykoz.edu.tr/healthz.php          # 200 {"status":"ok","runtime":"cloudflare"}
curl -I https://pdf.beykoz.edu.tr/                     # 200, giriş sayfası
curl -I https://pdf.beykoz.edu.tr/app.php              # 303, giriş sayfasına
curl -I https://pdf.beykoz.edu.tr/_private/manifest.json  # 404
```

Bir ayar eksik veya hatalıysa sayfalar "Yapım aşamasındayız" bakım ekranını (HTTP 503) gösterir. Nedeni görmek için:

```sh
npx wrangler tail
```

Çıktıda `PDF Düzenle:` ile başlayan satırı arayın (örneğin `SAML_IDP_CERT is empty` veya `SAML authentication rejected; Claims mismatch`). Aynı kayıtlar Cloudflare panelinde **Workers → pdf-duzenle → Logs** altında da görünür.

## Oturumlar ve acil iptal

Oturum, 8 saat geçerli ve `SESSION_SECRET` ile imzalı bir çerezdir; sunucuda oturum listesi tutulmaz. Tüm oturumları hemen kapatmak için anahtarı değiştirin:

```sh
openssl rand -base64 48 | npx wrangler secret put SESSION_SECRET
```

Herkes bir sonraki isteğinde giriş sayfasına döner.

## Giriş deneme sınırı

PHP sürümü giriş denemelerini 15 dakikada 40 ile sınırlıyordu. Worker bunu kendisi yapmaz; gerekirse Cloudflare panelinde **Security → WAF → Rate limiting rules** altında `/login.php` ve `/saml-acs.php` için bir kural ekleyin (örneğin IP başına 10 dakikada 40 istek).

## Büyük dosyalar

Cloudflare statik dosya başına 25 MiB sınırı uygular. Word, Excel ve PowerPoint dönüşümleri için gereken LibreOffice dosyaları (`soffice.wasm`, `soffice.data`) bundan büyüktür. Derleme bu dosyaları 24 MiB'lık parçalara böler, Worker ise parçaları tek dosya olarak sırayla gönderir. Ek bir depolama (R2) gerekmez.

## Yerel deneme

```sh
PDF_TARGET=cloudflare npm run test:e2e
```

Bu komut Worker'ı `wrangler dev` ile yerelde ve bir test kimlik sağlayıcısıyla çalıştırır; gerçek Google hesabı kullanılmaz.
