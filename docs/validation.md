# Doğrulama notları

- Canlı çalışma zamanı PHP-FPM'e taşındı; Node.js, PM2 ve Redis gereksinimleri kaldırıldı.
- PHP kaynakları söz dizimi kontrolünden geçirildi; Composer bağımlılıklarında bilinen güvenlik bildirimi bulunmadı.
- SAML strict modda çalışır; Google yanıtı ve assertion imzası, issuer, audience, tam destination/recipient, `InResponseTo`, RelayState, süre ve güçlü imza algoritmaları denetlenir.
- Oturum kimliği girişte yenilenir, çerez `Secure`, `HttpOnly`, `SameSite=None` ve en fazla 8 saat ömürlüdür. Çıkış Origin ve CSRF doğrulaması ister.
- 24 portal aracı gerçek BentoPDF sayfalarına bağlanır. Araç HTML sayfaları PHP oturum kontrolünden geçer; PDF işlemleri tarayıcıda yapılır.
- Chromium testleri masaüstü giriş/arama/favori/çıkış, 390 px mobil görünüm ve iki PDF'den üç sayfalık geçerli PDF indirmeyi doğrular.

Google Workspace henüz yapılandırılmadığı için gerçek kurumsal SSO ve canlı CloudPanel kurulumu yerelde doğrulanamaz. Canlı kontrol adımları CloudPanel ve Google Workspace kılavuzlarındadır.
