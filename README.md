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

Çıktı: `dist/pdf-duzenle-php.zip`. ZIP, sunucuda derleme veya Composer çalıştırma gerektirmez.

## Public dizini hangisi?

Canlı sunucuda uygulamanın public dizini şudur:

```text
/home/beykoz-my/htdocs/my.beykoz.edu.tr/pdf/
```

Bu dizinde `index.php`, diğer PHP giriş dosyaları, `public/`, `app-assets/` ve `engine/` bulunur. CloudPanel'in ana site kökü `/home/beykoz-my/htdocs/my.beykoz.edu.tr` olarak kalır; yalnızca onun altındaki `pdf/` uygulamanın public dizinidir.

SAML kütüphanesi, gerçek HTML şablonları, ayarlar ve oturumlar public dizinin dışında tutulur:

```text
/home/beykoz-my/pdf-duzenle-private/
```

Kaynak depodaki `php/public/index.php` public giriş dosyasının şablonudur. `npm run build`, sunucuya yüklenecek tam public ağacını `dist/php-release/htdocs/my.beykoz.edu.tr/pdf/` altında üretir.

## Canlı kurulum

Adım adım kurulum [CloudPanel kılavuzunda](docs/cloudpanel.md), Google alanları [SAML kılavuzunda](docs/google-workspace.md) bulunur. Özet dizinler:

ZIP'i `/home/beykoz-my` altında açtığınızda `htdocs/my.beykoz.edu.tr/pdf/` ve `pdf-duzenle-private/` doğrudan doğru konumlarına yerleşir.

`pdf-duzenle-private/.env` ve `certs/` web kökünün dışındadır. SAML ayarları boşken giriş sayfası çalışır; çalışma alanı açılmaz.

## Kaynak ve lisans

Uygulama GPL-3.0, BentoPDF motoru AGPL-3.0 kapsamındadır. Giriş yapan kullanıcılar kullanılan kaynak arşivini uygulamadaki **Hakkında** ekranından indirebilir. Ayrıntılar `LICENSE`, `LICENSE-AGPL` ve `THIRD_PARTY_NOTICES.md` dosyalarındadır.
