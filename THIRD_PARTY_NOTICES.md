# Üçüncü taraf kaynaklar

## UlakPDF / BentoPDF

- Kaynak depo: https://github.com/ciari/ulakpdf
- Alınan dizin: `bentopdf/`
- Kaynak commit: `46f763a00524428419640f1a6bbc166067c79aa1`
- BentoPDF paket sürümü: 2.8.4
- Üst proje: https://github.com/alam00000/bentopdf
- Lisans: AGPL-3.0-only (`engine/LICENSE`, `LICENSE-AGPL`)

Kaynak bildirimleri, lisans dosyaları ve motorun kodu korunmuştur. `web/private/engine-theme.css`, UlakPDF'in `overlay/light-theme.css` dosyasından uyarlanmıştır; Beykoz renkleri, tipografi ve çalışma alanı çerçevesi eklenmiştir.

Yerel motor değişiklikleri:

- `COMPRESSION_MODE=o` ile sıkıştırılmış yedek build dosyalarının üretimini kapatma; Node servisinin normal varlıkları sunması.
- Güvenlik güncellemeleri için kilit dosyası yenileme.
- Bu dağıtımda kullanılmayan VitePress geliştirme bağımlılığını kaldırma. Motorun eski belge sitesi bu dağıtımda derlenmez; geçerli kurulum belgeleri kök `docs/` dizinindedir.
- Derleme sonrası marka, Türkçe başlangıç, noindex ve Beykoz tema dosyalarının eklenmesi. Bu işlem `scripts/build.mjs` ile tekrarlanabilir.
- Motor HTML'lerinin ve WASM dahil tüm statik dosyalarının Express oturum denetimi arkasında sunulması.

Yeni portal ve Node.js kodu deponun mevcut GPL-3.0 lisansı altında sunulur. Motor ve ondan türeyen değişikliklerin AGPL koşulları korunur. Kaynak arşivi giriş yapan tüm kullanıcılara `/pdf/source` üzerinden sağlanır; kimlik doğrulama bilgileri ve sertifika dosyaları arşivden çıkarılır.

Motorun npm bağımlılıkları kendi paketlerindeki lisanslarını korur. Özellikle WASM tabanlı dönüştürme modülleri ayrı lisanslara sahip olabilir; kurum içi yeniden dağıtım veya modül güncellemesinde ilgili paket lisanslarını inceleyin.

- `engine/src/js/logic/merge-pdf-page.ts` ve ilgili HTML'de, dosyalar/sayfa listesi yüklenirken erken birleştirmeyi engelleyen düğme durumu düzeltildi; sık kullanılan birleştirme metinleri Türkçeleştirildi.
