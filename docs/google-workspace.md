# Google Workspace özel SAML uygulaması

Google Admin konsolunda **Uygulamalar → Web ve mobil uygulamalar → Uygulama ekle → Özel SAML uygulaması ekle** yolunu açın. Uygulama adı **PDF Düzenle** olsun.

Google kimlik sağlayıcı ayrıntılarındaki **SSO URL**, **Entity ID** ve indirilen herkese açık **X.509 sertifikası** kullanılır. OAuth client ID veya client secret gerekmez.

## Service Provider bilgileri

| Google alanı                   | Değer                                             |
| ------------------------------ | ------------------------------------------------- |
| ACS URL                        | `https://my.beykoz.edu.tr/pdf/auth/saml/acs`      |
| Entity ID                      | `https://my.beykoz.edu.tr/pdf/auth/saml/metadata` |
| Start URL                      | Boş bırakın                                       |
| Signed response / İmzalı yanıt | **İşaretli olmalı**                               |
| Name ID format                 | **EMAIL**                                         |
| Name ID değeri                 | **Basic Information → Primary email**             |
| Ek attribute mapping           | Gerekmiyor                                        |

Google varsayılan olarak assertion'ı imzalar; bu uygulama ayrıca yanıtın tamamının imzasını ister. Dolayısıyla **Signed response** zorunludur.

**User access → On for everyone** seçerek tüm üniversite kullanıcılarına açın. Uygulama ayrıca e-postanın tam alan adını sunucuda kontrol eder; `@beykoz.edu.tr` dışındaki adresler, alt alan adları ve kişisel Google hesapları kabul edilmez.

## Sunucudaki `.env`

```dotenv
APP_URL=https://my.beykoz.edu.tr/pdf
SAML_ENTRY_POINT=https://accounts.google.com/o/saml2/idp?idpid=GOOGLE_TARAFINDAKI_DEGER
SAML_IDP_ISSUER=https://accounts.google.com/o/saml2?idpid=GOOGLE_TARAFINDAKI_DEGER
SAML_IDP_CERT_PATH=./certs/google-workspace.pem
SAML_SP_ENTITY_ID=https://my.beykoz.edu.tr/pdf/auth/saml/metadata
```

SSO URL ve issuer örneklerini tahmin ederek kullanmayın; Google ekranındaki değerleri aynen kopyalayın. İndirilen PEM sertifikasını belirtilen dosyaya yerleştirin. Bu, Google'ın **herkese açık sertifikasıdır**; Google özel anahtarı alınmaz.

```sh
mkdir -p certs
chmod 700 certs
# İndirilen sertifikayı certs/google-workspace.pem olarak kaydedin.
chmod 600 certs/google-workspace.pem .env
pm2 restart pdf-duzenle --update-env
```

Kurulumdan sonra SP metadata adresi `https://my.beykoz.edu.tr/pdf/auth/saml/metadata` olur.

## Girişi deneme

Tarayıcıdan **https://my.beykoz.edu.tr/pdf/** adresine gidip **Google Workspace ile giriş yap** düğmesine basın. Bu uygulama **SP-initiated SSO** kullanır. Google Admin'deki “Test SAML login” ve uygulama başlatıcısının doğrudan IdP-initiated POST akışı desteklenmez; istekle eşleşmeyen yanıtlar reddedilir. Kullanıcı kısayolu için giriş sayfasının adresini kullanın.

Başarılı girişten sonra `/pdf/app` açılır. Başka alan adından bir hesapla erişimin reddedildiğini kontrol edin. Oturumu kapattıktan sonra `/pdf/engine/merge-pdf.html` yeniden giriş sayfasına dönmelidir.

SAML dönüşü başka bir siteden POST olduğu için canlı oturum çerezi `SameSite=None; Secure; HttpOnly` kullanır. HTTPS, güvenilir Nginx proxy başlıkları ve tarayıcı çerez izni gereklidir. İstekler 5 dakika içinde tamamlanmalı, sunucu saati senkron olmalıdır. Yerel HTTP üzerinde gerçek Google SSO testi yapmayın.

Çıkış yalnızca PDF Düzenle oturumunu sonlandırır. Google Workspace hesabından çıkış veya Google Single Logout uygulanmaz. Google hesabı askıya alındığında mevcut uygulama oturumu en fazla 8 saat geçerliliğini koruyabilir; acil iptal için ilgili Redis oturumu silinmelidir.

Sertifika yenilendiğinde PEM dosyasını güncelleyin ve uygulamayı yeniden başlatın. Sertifikanın bitiş tarihini kurumun izleme sistemine ekleyin.

Kaynak: [Google Workspace — özel SAML uygulaması kurma](https://knowledge.workspace.google.com/admin/apps/set-up-your-own-custom-saml-app?hl=en).
