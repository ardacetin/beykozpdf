# PDF Düzenle — Beykoz Üniversitesi

Beykoz Üniversitesi için, `https://my.beykoz.edu.tr/pdf/` altında çalışan özel PDF çalışma alanı. Arayüz kurumsal **#7A232C** rengiyle hazırlanmıştır. PDF işlemleri BentoPDF motoruyla kullanıcının tarayıcısında yapılır; belgeler sunucuya yüklenmez.

Canlı uygulama standart PHP-FPM ile çalışır. Node.js, PM2, Redis, Docker veya Python servisi gerekmez. Google Workspace özel SAML uygulaması ile giriş yapılır ve yalnızca tam `@beykoz.edu.tr` alanındaki hesaplar kabul edilir.

## Hazır PHP paketini oluşturma

Node.js yalnızca geliştirici bilgisayarında ön yüzü derlemek için kullanılır:

```sh
npm ci
npm run install:engine
composer install --no-dev --prefer-dist
npm run build
npm test
npm run test:e2e
```

Çıktı: `dist/pdf-duzenle-php.zip`. ZIP, sunucuda derleme veya Composer çalıştırma gerektirmeyen `pdf/` ve `pdf-duzenle-private/` klasörlerini içerir.

## Canlı kurulum

Adım adım kurulum [CloudPanel kılavuzunda](docs/cloudpanel.md), Google alanları [SAML kılavuzunda](docs/google-workspace.md) bulunur. Özet dizinler:

```text
/home/beykoz-my/htdocs/my.beykoz.edu.tr/pdf/  # ZIP içindeki pdf/ içeriği
/home/beykoz-my/pdf-duzenle-private/          # PHP, ayarlar, SAML kütüphanesi ve oturumlar
```

`pdf-duzenle-private/.env` ve `certs/` web kökünün dışındadır. SAML ayarları boşken giriş sayfası çalışır; çalışma alanı açılmaz.

## Kaynak ve lisans

Uygulama GPL-3.0, BentoPDF motoru AGPL-3.0 kapsamındadır. Giriş yapan kullanıcılar kullanılan kaynak arşivini uygulamadaki **Hakkında** ekranından indirebilir. Ayrıntılar `LICENSE`, `LICENSE-AGPL` ve `THIRD_PARTY_NOTICES.md` dosyalarındadır.
