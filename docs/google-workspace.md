# Google Workspace özel SAML uygulaması

Google Admin konsolunda **Uygulamalar → Web ve mobil uygulamalar → Uygulama ekle → Özel SAML uygulaması ekle** yolunu açın. Uygulama adı **PDF Düzenle** olsun.

Google kimlik sağlayıcı ayrıntılarındaki **SSO URL**, **Entity ID** ve indirilen herkese açık **X.509 sertifikası** kullanılır. OAuth client ID veya client secret gerekmez.

## Service Provider bilgileri

| Google alanı                   | Değer                                             |
| ------------------------------ | ------------------------------------------------- |
| ACS URL                        | `https://pdf.beykoz.edu.tr/saml-acs.php`       |
| Entity ID                      | `https://pdf.beykoz.edu.tr/metadata.php`       |
| Start URL                      | Boş bırakın                                       |
| Signed response / İmzalı yanıt | **İşaretli olmalı**                               |
| Name ID format                 | **EMAIL**                                         |
| Name ID değeri                 | **Basic Information → Primary email**             |
| Ek attribute mapping           | Gerekmiyor                                        |

Google varsayılan olarak yalnızca assertion'ı imzalar. **Signed response** seçildiğinde yanıtın tamamı imzalanır ve bu imza yanıtın içindeki assertion'ı da korur. Uygulama Google Workspace'in bu profiline göre yanıt imzasını zorunlu tutar; assertion üzerinde ikinci bir imza aramaz. Dolayısıyla **Signed response** zorunludur.

**User access → On for everyone** seçerek tüm üniversite kullanıcılarına açın. Uygulama ayrıca e-postanın tam alan adını sunucuda kontrol eder; `@beykoz.edu.tr` dışındaki adresler, alt alan adları ve kişisel Google hesapları kabul edilmez.

## Sunucudaki `.env` (CloudPanel / PHP)

Cloudflare Workers ile yayında `.env` kullanılmaz; ayarlar `wrangler.jsonc` ve `wrangler secret` ile girilir. Ayrıntılar: [cloudflare.md](cloudflare.md).

```dotenv
APP_URL=https://pdf.beykoz.edu.tr
SAML_ENTRY_POINT=https://accounts.google.com/o/saml2/idp?idpid=GOOGLE_TARAFINDAKI_DEGER
SAML_IDP_ISSUER=https://accounts.google.com/o/saml2?idpid=GOOGLE_TARAFINDAKI_DEGER
SAML_IDP_CERT_PATH=./certs/google-workspace.pem
SAML_SP_ENTITY_ID=https://pdf.beykoz.edu.tr/metadata.php
```

Her anahtarı `.env` içinde **yalnızca bir kez** yazın. Aynı anahtar iki kez geçerse sonraki satır geçerli olur; örneğin ikinci bir `SAML_IDP_CERT_PATH` satırı, var olan sertifika dosyasının yerine olmayan bir dosyayı gösterebilir ve tüm sayfalar “Yapım aşamasındayız” bakım sayfasını (HTTP 503) gösterir. Ziyaretçiler teknik ayrıntı görmez; asıl neden PHP hata günlüğüne `PDF Düzenle:` önekiyle yazılır (örneğin eksik sertifika dosyasının yolu).

SSO URL ve issuer örneklerini tahmin ederek kullanmayın; Google ekranındaki değerleri aynen kopyalayın. İndirilen PEM sertifikasını belirtilen dosyaya yerleştirin. Bu, Google'ın **herkese açık sertifikasıdır**; Google özel anahtarı alınmaz.

```sh
mkdir -p certs
chmod 700 certs
# İndirilen sertifikayı certs/google-workspace.pem olarak kaydedin.
chmod 600 certs/google-workspace.pem .env
```

Kurulumdan sonra SP metadata adresi `https://pdf.beykoz.edu.tr/metadata.php` olur.

## Girişi deneme

Tarayıcıdan **https://pdf.beykoz.edu.tr/** adresine gidip **Google Workspace ile giriş yap** düğmesine basın. Bu uygulama **SP-initiated SSO** kullanır. Google Admin'deki “Test SAML login” ve uygulama başlatıcısının doğrudan IdP-initiated POST akışı desteklenmez; istekle eşleşmeyen yanıtlar reddedilir. Kullanıcı kısayolu için giriş sayfasının adresini kullanın.

`/saml-acs.php` adresi tarayıcıda doğrudan açılmak için değildir; Google bu adrese yalnızca POST gönderir. Adres doğrudan açılırsa giriş sayfasına yönlendirilir.

Başarılı girişten sonra `/app.php` açılır. Başka alan adından bir hesapla erişimin reddedildiğini kontrol edin. Oturumu kapattıktan sonra `/engine/merge-pdf.php` yeniden giriş sayfasına dönmelidir.

`Google giriş yanıtı doğrulanamadı` mesajı alınırsa Google'daki **Name ID formatının EMAIL**, **Name ID değerinin Basic Information → Primary email** ve **Signed response** seçeneğinin işaretli olduğunu yeniden kontrol edin. Güncel sürüm, imza veya talep eşleştirme hatasının nedenini SAML yanıtını kaydetmeden PHP hata günlüğüne yazar. Giriş denemesinden sonra günlüklerde `PDF Düzenle: SAML authentication rejected` metnini arayın: Cloudflare'de `npx wrangler tail`, CloudPanel'de PHP hata günlüğü.

SAML dönüşü başka bir siteden POST olduğu için canlı oturum çerezi `SameSite=None; Secure; HttpOnly` kullanır. HTTPS, güvenilir Nginx proxy başlıkları ve tarayıcı çerez izni gereklidir. İstekler 5 dakika içinde tamamlanmalı, sunucu saati senkron olmalıdır. Yerel HTTP üzerinde gerçek Google SSO testi yapmayın.

Çıkış yalnızca PDF Düzenle oturumunu sonlandırır. Google Workspace hesabından çıkış veya Google Single Logout uygulanmaz. Google hesabı askıya alındığında mevcut uygulama oturumu en fazla 8 saat geçerliliğini koruyabilir; acil iptal için Cloudflare'de `SESSION_SECRET` değiştirilir (bkz. [cloudflare.md](cloudflare.md)), CloudPanel'de `pdf-duzenle-private/var/sessions/` altındaki PHP oturumları temizlenir.

Sertifika yenilendiğinde PEM dosyasını güncelleyin. Sertifikanın bitiş tarihini kurumun izleme sistemine ekleyin.

Kaynak: [Google Workspace — özel SAML uygulaması kurma](https://knowledge.workspace.google.com/admin/apps/set-up-your-own-custom-saml-app?hl=en).
