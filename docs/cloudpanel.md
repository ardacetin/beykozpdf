# CloudPanel üzerinde yayın

Hedef adres **https://my.beykoz.edu.tr/pdf**. Node.js 22.12+ veya 24 LTS, Redis ve CloudPanel'in Nginx sunucusu kullanılır. Python kurulumu yapılmaz.

## Dosyalar ve süreç

Mevcut `my.beykoz.edu.tr` sitesi varsa aynı alan adını yeniden oluşturmayın. Uygulamayı mevcut sitenin kullanıcısıyla, **web kökünün dışında**, örneğin `/home/SITE_USER/apps/beykozpdf` dizinine kurun. Aşağıdaki `SITE_USER` değerini gerçek site kullanıcınızla değiştirin.

```sh
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/ardacetin/beykozpdf.git
cd beykozpdf
npm ci
npm run install:engine
cp .env.example .env
openssl rand -base64 48
```

Üretilen rastgele değeri `.env` içindeki `SESSION_SECRET` alanına yazın. `APP_URL=https://my.beykoz.edu.tr/pdf`, `NODE_ENV=production`, `PORT=3000`, `TRUST_PROXY_HOPS=1` olmalı. Google hazır değilse `SAML_ENTRY_POINT` ve `SAML_IDP_ISSUER` boş kalabilir: giriş ekranı yayınlanır, araçlara erişim açılmaz.

Redis'i sunucuda hazırlayın. Mevcut kurumsal Redis varsa bağlantısını `REDIS_URL` içine girin. Yerel Redis kullanacaksanız yalnızca loopback üzerinde dinleyen, dış ağa kapalı bir servis olarak yapılandırın. Bağlantı üretimde zorunludur; bellek oturum deposuna sessiz geçiş yapılmaz.

```sh
chmod 600 .env
npm run build
npm test
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Derleme motor için 6 GB'a kadar Node heap ayırır. Küçük sunucularda derlemeyi CI üzerinde yapıp kaynakla birlikte `engine/dist/` ve `dist/` çıktısını sunucuya aktarabilirsiniz. Çalışan Node.js süreci PDF işlemez; yalnızca kimlik ve dosya servisini yürütür.

PM2'nin yeniden başlatma sonrası süreci geri getirmesini CloudPanel site kullanıcısının Cron Jobs alanında `@reboot` ve `pm2 resurrect` ile, Node/PM2'nin tam PATH değeriyle yapılandırın. Ayrıntılar: [CloudPanel PM2 kılavuzu](https://www.cloudpanel.io/docs/v2/nodejs/deployment/pm2/).

## `/pdf/` Nginx yönlendirmesi

CloudPanel → `my.beykoz.edu.tr` → **Vhost** ekranında, HTTPS `server` bloğuna [cloudpanel-nginx.conf](../deploy/cloudpanel-nginx.conf) içeriğini ekleyin. Mevcut uygulamanın `location /` tanımını koruyun. CloudPanel kayıt sırasında söz dizimini denetler. [Vhost belgesi](https://www.cloudpanel.io/docs/v2/frontend-area/vhost/).

`location ^~ /pdf/` içindeki `proxy_pass` sonunda `/` **yoktur**. Böylece `/pdf` öneki korunur. `^~`, CloudPanel'in `.js`, `.wasm`, `.css` gibi dosyalar için genel statik kurallarının oturum kontrolünü atlamasını önler. Bu yol için `alias`, `root`, `try_files`, CDN cache veya doğrudan `engine/dist` servisi eklemeyin.

`/pdf/` isteklerini doğrudan Node.js portuna iletin; PHP/Varnish cache katmanından geçirmeyin. Nginx 443 → Node 3000 tek güvenilir proxy zinciridir. İlave proxy/CDN varsa başlık güveni ve `TRUST_PROXY_HOPS` o topoloji için tekrar değerlendirilmelidir. 3000 ve Redis portunu dış ağa açmayın. Node.js yalnızca `127.0.0.1` üzerinde dinler.

## Kontrol

```sh
curl -I https://my.beykoz.edu.tr/pdf/
curl https://my.beykoz.edu.tr/pdf/healthz
curl -I https://my.beykoz.edu.tr/pdf/app
curl -I https://my.beykoz.edu.tr/pdf/engine/merge-pdf.html
pm2 status
```

Giriş sayfası 200; oturumsuz `/app` ve motor adresleri 302 ile `/pdf/` adresine dönmelidir. `/pdf/api/me` oturumsuz 401 verir. Google kurulumu tamamlanınca [SAML kılavuzunu](google-workspace.md) uygulayın.

Motorun sıkıştırma/OCR gibi gelişmiş işlevleri dışarıdan WASM ve dil bileşenleri indirebilir. Kurum ağı `cdn.jsdelivr.net` ve OCR için `tessdata.projectnaptha.com` erişimine izin vermelidir. Bunlar dosya yükleme uçları değildir. Tam çevrimdışı kurulum ayrıca motor varlıklarının içeride barındırılmasını gerektirir.

## Güncelleme ve bakım

Yeni sürümü ayrı bir release dizininde hazırlayıp `npm ci`, `npm run install:engine`, `npm run build` ve testleri çalıştırın. `.env` ile sertifikayı aktarın, PM2 sürecini yeni release dizininden başlatın. Eski release'i geri dönüş için saklayın. Kaynak arşivi her derlemede yenilenir; kod değişikliğinden sonra yalnızca JS dosyalarını kopyalayarak bu arşivi eski bırakmayın.

`pm2 logs pdf-duzenle` uygulama hatalarını gösterir. SAML assertion veya çerez değerleri loglanmaz. PDF dosyaları sunucuda tutulmadığı için belge yedeği bulunmaz. `.env` ve sertifika dosyalarını erişimi sınırlı yedekte saklayın; Redis oturumları kaybolursa kullanıcılar yeniden giriş yapar.
