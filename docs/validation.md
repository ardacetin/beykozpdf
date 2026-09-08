# Doğrulama notları

Yerel doğrulama: 8 Eylül 2026.

- Production motor derlemesi başarılı. 24 portal aracı gerçek motor sayfalarına yönleniyor.
- 17 Node.js/Supertest testi: gerçek RSA/SHA-256 imzalı SAML girişleri, alan adı, issuer, audience, recipient, zaman aşımı, imzasız/değiştirilmiş belge, InResponseTo, tarayıcıya bağlı RelayState, oturum korumalı dosyalar ve CSRF korumalı çıkış.
- 3 Chromium uçtan uca testi: masaüstü giriş/arama/favori/çıkış, 390 px mobil görünüm ve menü, iki PDF dosyasından üç sayfalık geçerli PDF indirme.
- Birleştirilen PDF'in sayfa sayısı ve sayfa boyutları `pdf-lib` ile okundu. PDF işlemi sırasında POST/PUT/PATCH isteği oluşmadığı doğrulandı.
- Görsel incelemede giriş, çalışma alanı ve araç ekranının masaüstü/mobil çıktıları kontrol edildi. Iframe yüksekliğinin upstream `100vh` stilleriyle sürekli büyümesi düzeltildi.
- Upstream birleştirme ekranındaki erken etkinleşen işlem düğmesi düzeltildi; dosyalar ve sayfa listesi hazır olana kadar birleştirme kapalı.
- Node sunucusu bağımlılıkları: npm audit bulgusu yok. Motor paketinde uyumlu güncellemeler sonrası 6 düşük seviyeli, `elliptic` kaynaklı dolaylı polyfill bulgusu kaldı. Yüksek/orta bulgu yok. `npm audit fix --force` önerdiği uyumsuz eski polyfill sürümüne dönüş uygulanmadı.

Google Workspace henüz yapılandırılmadığı ve CloudPanel sunucusuna erişim sağlanmadığı için gerçek kurumsal SSO ve canlı ortam dağıtımı doğrulanmış değildir. Bunlar kurulum kılavuzundaki son kontrollerdir. Office/OCR gibi tüm motorların her format ve tarayıcı kombinasyonu uçtan uca test edilmedi; motorun mevcut işlevleri kullanılıyor. Office WASM için COOP/COEP başlıkları etkinleştirildi.
