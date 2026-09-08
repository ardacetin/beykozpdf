# PDF Düzenle — Beykoz Üniversitesi

Beykoz Üniversitesi için özel PDF çalışma alanı. Kurumsal ana renk **#7A232C**, Türkçe arayüz, Google Workspace özel SAML uygulaması ile giriş. Yayın adresi: **https://my.beykoz.edu.tr/pdf**.

Node.js + Express + Redis kullanır. Python sunucusu, Docker veya dosya yükleme servisi gerekmez. PDF işlemleri tarayıcıda, UlakPDF kaynaklı BentoPDF motoruyla yapılır. Giriş sayfası herkese görünür; çalışma alanı, araçlar, JavaScript/WASM dosyaları ve kaynak arşivi sunucuda oturumla korunur.

## Başlangıç

Node.js **22.12+** (veya 24 LTS), npm ve derleme için yaklaşık 6 GB kullanılabilir bellek.

```sh
npm ci
npm run install:engine
npm run build
```

Yerel giriş ekranını görmek için:

```sh
NODE_ENV=development APP_URL=http://localhost:3000/pdf REDIS_URL= npm run dev
```

Adres: http://localhost:3000/pdf/. Yerelde SAML ayarları boşken araçlara giriş yapılamaz. Bir geliştirme giriş atlaması yoktur. Tarayıcı testleri kendi geçici sertifikalı yerel IdP'sini kullanır; bu kod production başlangıcında yüklenmez.

## Canlı kurulum

1. [CloudPanel kurulum kılavuzu](docs/cloudpanel.md) ile Node.js sürecini ve `/pdf/` Nginx yönlendirmesini kurun.
2. `.env.example` dosyasını `.env` olarak kopyalayın, `SESSION_SECRET` üretin ve Redis adresini girin.
3. Google henüz hazır değilse SAML URL ve issuer alanlarını boş bırakın. Production giriş ekranı açılır, araçlar kapalı kalır.
4. [Google Workspace SAML kılavuzuna](docs/google-workspace.md) göre uygulamayı oluşturun. SSO URL, Entity ID ve sertifikayı `.env` üzerinden tanımlayın; Node.js sürecini yeniden başlatın.

`APP_URL` alt dizini derleme sırasında motor yollarına yazılır. Alan adı değişikliği SAML ayarlarıyla birlikte ele alınmalıdır. `/pdf` alt dizini değişirse yeniden derleyin. Giriş ayarları değiştiğinde yalnızca süreç yeniden başlatması gerekir.

## İçerik

- 24 seçili PDF aracı: birleştirme, bölme, sıkıştırma, düzenleme, sayfa işlemleri, Office/görsel dönüşümleri, OCR, şifreleme ve imza.
- Arama, kategori filtreleri, yerel favoriler, mobil menü, yardım ve gizlilik açıklamaları.
- İmzalı SAML yanıtı ve assertion doğrulaması; audience, issuer, recipient, süre, InResponseTo ve tarayıcıya bağlı RelayState kontrolü.
- Sadece imzalı **NameID** içindeki tam `@beykoz.edu.tr` adresleri kabul edilir. Google Admin'de tüm kuruma erişim açılmalıdır.
- Redis'te en fazla 8 saatlik oturum; Secure/HttpOnly çerezler, CSRF korumalı çıkış, giriş hız sınırı.
- Gelişmiş motorlar bazı WASM/OCR bileşenlerini CDN'den indirebilir. Belgeler sunucuya yüklenmez. Sistem tam çevrimdışı kurulum olarak sunulmaz.

## Test

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Sunucu testleri gerçek RSA/SHA-256 ile imzalanmış geçici SAML belgeleri üretir. Tarayıcı testleri masaüstü/mobil arayüzü, oturum, arama, favoriler, çıkış ve gerçek PDF birleştirme/indirme akışını kapsar. Google hesabıyla canlı SSO ve CloudPanel sunucusundaki doğrulama, kurumsal yapılandırma tamamlanınca yapılmalıdır.

## Kaynaklar ve lisans

`engine/`, [ciari/ulakpdf](https://github.com/ciari/ulakpdf) deposunun `bentopdf/` dizininden alınmıştır. Kaynak revizyonu ve yerel değişiklikler: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Bu deponun mevcut `LICENSE` dosyası GPL-3.0 olarak korunmuştur. BentoPDF ve UlakPDF'den türetilen motor/tema AGPL-3.0 şartlarına tabidir; metin `LICENSE-AGPL` ve `engine/LICENSE` içindedir. Giriş yapan kullanıcılar **Uygulama hakkında → Kaynak kod ve lisansları indir** üzerinden dağıtılan sürümün kaynaklarına erişebilir. Açık kaynak lisansı, uygulamanın anonim kullanıma açılmasını gerektiren bir giriş ayarı değildir.
