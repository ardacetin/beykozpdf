# CloudPanel üzerinde PHP kurulumu

Önerilen yayın Cloudflare Workers'tır ([cloudflare.md](cloudflare.md)). Bu belge aynı uygulamanın CloudPanel'de PHP ile yayınlanmasını anlatır.

Uygulama `pdf.beykoz.edu.tr` adında ayrı bir CloudPanel PHP sitesinin kökünde çalışır. Açık port veya arka plan servisi gerekmez. PM2, Redis, Node.js, Docker ve Python canlı sunucuda kullanılmaz. Aşağıdaki örneklerde site kullanıcısı `beykoz-pdf` varsayılmıştır; CloudPanel'de seçtiğiniz kullanıcı adıyla değiştirin.

## Dosyaları yerleştirme

Geliştirici bilgisayarında oluşturulan `dist/pdf-duzenle-php.zip` dosyasını `/home/beykoz-pdf` dizinine yükleyip aynı dizinde açın. Paket sunucunun dizin yapısını içerdiği için dosyalar doğrudan şu konumlara yerleşir:

```text
/home/beykoz-pdf/htdocs/pdf.beykoz.edu.tr/
/home/beykoz-pdf/pdf-duzenle-private/
```

İlk dizin uygulamanın **public dizinidir**. Burada `index.php`, `app.php`, `public/`, `app-assets/`, `engine/` ve diğer PHP giriş dosyaları bulunur. İkinci dizin web erişimine kapalı uygulama alanıdır; `.env`, `php/`, `vendor/`, `web/`, `engine-pages/`, `engine-assets/`, `certs/` ve `var/` burada bulunur.

CloudPanel'de site oluştururken Document Root olarak varsayılan `/home/beykoz-pdf/htdocs/pdf.beykoz.edu.tr` dizinini bırakın.

```sh
chmod 700 /home/beykoz-pdf/pdf-duzenle-private
chmod 600 /home/beykoz-pdf/pdf-duzenle-private/.env
chmod 700 /home/beykoz-pdf/pdf-duzenle-private/certs
```

PHP-FPM site kullanıcısı özel dizini okuyabilmeli ve `var/` dizinine yazabilmelidir. Paket site kullanıcısıyla açıldığında izinler buna uygundur.

İlk kurulumda örnek yapılandırmayı kopyalayın. Güncelleme paketleri canlı `.env`, sertifika ve oturum dosyalarını içermez veya bunların üzerine yazmaz:

```sh
cd /home/beykoz-pdf/pdf-duzenle-private
test -f .env || cp .env.example .env
```

## CloudPanel vhost

CloudPanel'in standart PHP vhost yapısı yeterlidir. `index.php` standart PHP akışında çalışır. PHP sürümü `.php` uzantılı açık uçlar kullandığı için ek rewrite kuralına ihtiyaç duymaz.

Dağıtım paketi ES modüllerini `.js` uzantısıyla yayınlar. Bu, CloudPanel'in varsayılan Nginx MIME eşlemesinde PDF.js worker dosyalarının tarayıcı tarafından reddedilmesini önler. Araç giriş dosyalarına paket sürümü eklenir; yeni dağıtım sonrasında Cloudflare veya tarayıcı eski worker yolunu kullanmaz. Kaynaktaki `engine/dist` dizinini doğrudan sunucuya kopyalamayın; `dist/pdf-duzenle-php.zip` içindeki hazırlanmış `engine/` dizinini kullanın.

Word, Excel, PowerPoint ve diğer ofis belgesi dönüşümleri için gereken LibreOffice worker, WebAssembly ve veri dosyaları paket tarafından oturum denetimli PHP uçlarından sunulur. Bu uçlar gerekli izolasyon, MIME ve gzip başlıklarını kendileri gönderir; vhost'a worker ya da WebAssembly kuralı eklemeyin.

CloudPanel site ayarından PHP **8.2 veya üstünü** seçin. Gerekli uzantılar: DOM/XML, OpenSSL, mbstring ve zlib.

## Yapılandırma

`/home/beykoz-pdf/pdf-duzenle-private/.env`:

```dotenv
APP_URL=https://pdf.beykoz.edu.tr
SAML_ENTRY_POINT=
SAML_IDP_ISSUER=
SAML_IDP_CERT_PATH=./certs/google-workspace.pem
SAML_SP_ENTITY_ID=https://pdf.beykoz.edu.tr/metadata.php
```

Google hazır değilken iki IdP alanını boş bırakın. Google sertifikası hazır olduğunda `certs/google-workspace.pem` olarak kaydedip `chmod 600` uygulayın. Ayar değişikliğinde servis yeniden başlatılmaz; sonraki PHP isteği yeni değerleri okur.

## Kontrol

```sh
curl -i https://pdf.beykoz.edu.tr/healthz.php
curl -I https://pdf.beykoz.edu.tr/
curl -I https://pdf.beykoz.edu.tr/app.php
curl -I https://pdf.beykoz.edu.tr/engine/merge-pdf.php
```

Sağlık adresi HTTP 200 ve `{"status":"ok","runtime":"php"}` döndürmelidir. Giriş sayfası 200; oturumsuz `app.php` ve araç sayfası 303 ile `/` adresine dönmelidir.

Motorun OCR ve bazı gelişmiş işlevleri `cdn.jsdelivr.net` ve `tessdata.projectnaptha.com` üzerinden tarayıcı bileşeni indirebilir. PDF belgeleri bu adreslere veya sunucuya gönderilmez.
