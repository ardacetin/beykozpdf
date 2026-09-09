# CloudPanel üzerinde PHP kurulumu

Uygulama mevcut `my.beykoz.edu.tr` PHP sitesinin `/pdf/` dizininde çalışır. Ayrı site, subdomain, vhost, açık port veya arka plan servisi oluşturulmaz. PM2, Redis, Node.js, Docker ve Python canlı sunucuda kullanılmaz.

## Dosyaları yerleştirme

Geliştirici bilgisayarında oluşturulan `dist/pdf-duzenle-php.zip` dosyasını site kullanıcısının ana dizinine yükleyip açın. ZIP içindeki klasörleri şu konumlara yerleştirin:

```text
/home/beykoz-my/htdocs/my.beykoz.edu.tr/pdf/
/home/beykoz-my/pdf-duzenle-private/
```

İlk dizinde `index.php`, `app.php`, `engine/` ve statik dosyalar; ikinci dizinde `.env`, `php/`, `vendor/`, `web/`, `engine-pages/`, `certs/` ve `var/` bulunmalıdır. Önceki Node.js proje klasörünü doğrudan web dizini olarak kullanmayın.

```sh
chmod 700 /home/beykoz-my/pdf-duzenle-private
chmod 600 /home/beykoz-my/pdf-duzenle-private/.env
chmod 700 /home/beykoz-my/pdf-duzenle-private/certs
```

PHP-FPM site kullanıcısı özel dizini okuyabilmeli ve `var/` dizinine yazabilmelidir. Paket site kullanıcısıyla açıldığında izinler buna uygundur.

## CloudPanel vhost

Paylaşılan standart PHP vhost yapısı yeterlidir. Daha önce Node sürümü için eklenen aşağıdaki kuralları kaldırın:

```nginx
location = /pdf { ... }
location ^~ /pdf/ { proxy_pass http://127.0.0.1:3000; ... }
```

Mevcut genel `location /`, Varnish ve 8080 PHP-FPM bloklarını değiştirmeyin. `/pdf/index.php` standart PHP akışında çalışır. PHP sürümü `.php` uzantılı açık uçlar kullandığı için ek rewrite kuralına ihtiyaç duymaz.

CloudPanel site ayarından PHP **8.2 veya üstünü** seçin. Gerekli uzantılar: DOM/XML, OpenSSL, mbstring ve zlib.

## Yapılandırma

`/home/beykoz-my/pdf-duzenle-private/.env`:

```dotenv
APP_URL=https://my.beykoz.edu.tr/pdf
SAML_ENTRY_POINT=
SAML_IDP_ISSUER=
SAML_IDP_CERT_PATH=./certs/google-workspace.pem
SAML_SP_ENTITY_ID=https://my.beykoz.edu.tr/pdf/metadata.php
```

Google hazır değilken iki IdP alanını boş bırakın. Google sertifikası hazır olduğunda `certs/google-workspace.pem` olarak kaydedip `chmod 600` uygulayın. Ayar değişikliğinde servis yeniden başlatılmaz; sonraki PHP isteği yeni değerleri okur.

## Kontrol

```sh
curl -i https://my.beykoz.edu.tr/pdf/healthz.php
curl -I https://my.beykoz.edu.tr/pdf/
curl -I https://my.beykoz.edu.tr/pdf/app.php
curl -I https://my.beykoz.edu.tr/pdf/engine/merge-pdf.php
```

Sağlık adresi HTTP 200 ve `{"status":"ok","runtime":"php"}` döndürmelidir. Giriş sayfası 200; oturumsuz `app.php` ve araç sayfası 303 ile `/pdf/` adresine dönmelidir.

Motorun OCR ve bazı gelişmiş işlevleri `cdn.jsdelivr.net` ve `tessdata.projectnaptha.com` üzerinden tarayıcı bileşeni indirebilir. PDF belgeleri bu adreslere veya sunucuya gönderilmez.
