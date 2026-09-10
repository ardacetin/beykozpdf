(function () {
  const copy = new Map(Object.entries({
    'Back to Tools': 'Araçlara Dön',
    'Merge PDF': 'PDF Birleştir',
    'Split PDF': 'PDF Böl',
    'Compress PDF': 'PDF Sıkıştır',
    'PDF Editor': 'PDF Düzenleyici',
    'JPG to PDF': "JPG'den PDF'ye",
    'PDF to JPG': "PDF'den JPG'ye",
    'Rotate PDF': "PDF'yi Döndür",
    'Duplicate & Organize': 'Çoğalt ve Düzenle',
    'Delete Pages': 'Sayfaları Sil',
    'Extract Pages': 'Sayfaları Çıkar',
    'Word to PDF': "Word'den PDF'ye",
    'Excel to PDF': "Excel'den PDF'ye",
    'PowerPoint to PDF': "PowerPoint'ten PDF'ye",
    'PNG to PDF': "PNG'den PDF'ye",
    'PDF to PNG': "PDF'den PNG'ye",
    'Add Watermark': 'Filigran Ekle',
    'Encrypt PDF': "PDF'yi Şifrele",
    'Decrypt PDF': 'PDF Şifresini Kaldır',
    'Sign PDF': 'PDF İmzala',
    'Page Numbers': 'Sayfa Numaraları',
    'Crop PDF': 'PDF Kırp',
    'OCR PDF': "PDF'de OCR",
    'Flatten PDF': "PDF'yi Düzleştir",
    'Edit Metadata': 'Belge Bilgilerini Düzenle',
    'Combine whole files, or select specific pages to merge into a new document.': 'Dosyaların tamamını birleştirin veya yeni bir belge için belirli sayfaları seçin.',
    'Extract a range of pages into a new PDF.': 'Sayfa aralığını yeni bir PDF olarak çıkarın.',
    'Reduce the file size of your PDF.': 'PDF dosyanızın boyutunu küçültün.',
    'Annotate, highlight, redact, comment, add shapes/images, search, and view PDFs.': "PDF'lere açıklama, vurgu, karartma, yorum, şekil ve görsel ekleyin; arayın ve görüntüleyin.",
    'Create a PDF from JPG, JPEG, and JPEG2000 (JP2/JPX) images.': 'JPG, JPEG ve JPEG2000 (JP2/JPX) görsellerinden PDF oluşturun.',
    'Convert each PDF page into a JPG image.': 'Her PDF sayfasını JPG görseline dönüştürün.',
    'Turn pages in 90-degree increments.': 'Sayfaları 90 derecelik adımlarla döndürün.',
    'Duplicate, reorder, and delete pages.': 'Sayfaları çoğaltın, yeniden sıralayın ve silin.',
    'Remove specific pages from your document.': 'Belgenizden belirli sayfaları kaldırın.',
    'Save a selection of pages as new files.': 'Seçtiğiniz sayfaları yeni dosyalar olarak kaydedin.',
    'Convert Word documents (DOCX, DOC, ODT, RTF) to PDF format. Supports multiple files.': 'Word belgelerini (DOCX, DOC, ODT, RTF) PDF biçimine dönüştürün. Birden fazla dosya desteklenir.',
    'Convert Excel spreadsheets (XLSX, XLS, ODS, CSV) to PDF format. Supports multiple files.': 'Excel çalışma tablolarını (XLSX, XLS, ODS, CSV) PDF biçimine dönüştürün. Birden fazla dosya desteklenir.',
    'Convert PowerPoint presentations (PPTX, PPT, ODP) to PDF format. Supports multiple files.': 'PowerPoint sunumlarını (PPTX, PPT, ODP) PDF biçimine dönüştürün. Birden fazla dosya desteklenir.',
    'Create a PDF from one or more PNG images.': 'Bir veya daha fazla PNG görselinden PDF oluşturun.',
    'Convert each PDF page into a PNG image.': 'Her PDF sayfasını PNG görseline dönüştürün.',
    'Stamp text or an image over your PDF pages.': 'PDF sayfalarınıza metin veya görsel filigran ekleyin.',
    'Lock your PDF by adding a password.': "PDF'nizi parola ekleyerek koruyun.",
    'Unlock PDF by removing password protection.': 'Parola korumasını kaldırarak PDF kilidini açın.',
    'Draw, type, or upload your signature.': 'İmzanızı çizin, yazın veya yükleyin.',
    'Insert page numbers into your document.': 'Belgenize sayfa numaraları ekleyin.',
    'Trim the margins of every page in your PDF.': "PDF'nizdeki her sayfanın kenar boşluklarını kırpın.",
    'Make a PDF searchable and copyable.': "PDF'yi aranabilir ve kopyalanabilir hale getirin.",
    'Make form fields and annotations non-editable.': 'Form alanlarını ve açıklamaları düzenlenemez hale getirin.',
    'Change the author, title, and other properties.': 'Yazar, başlık ve diğer belge özelliklerini değiştirin.',
    'Click to select a file': 'Dosya seçmek için tıklayın',
    'Click to select files': 'Dosya seçmek için tıklayın',
    'Click to select PDF': 'PDF seçmek için tıklayın',
    'Click to select PDFs': 'PDF seçmek için tıklayın',
    'or drag and drop': 'veya sürükleyip bırakın',
    'PDFs or Images': 'PDF veya görseller',
    'PDF file': 'PDF dosyası',
    'PDF Documents': 'PDF belgeleri',
    'A single PDF file': 'Tek bir PDF dosyası',
    'One or more PDF files': 'Bir veya daha fazla PDF dosyası',
    'Single or multiple PDF files supported': 'Tek veya birden fazla PDF dosyası desteklenir',
    'Your files never leave your device.': 'Dosyalarınız cihazınızı asla terk etmez.',
    'Add More Files': 'Daha Fazla Dosya Ekle',
    'Clear All': 'Tümünü Temizle',
    'Convert to PDF': "PDF'ye Dönüştür",
    'Convert': 'Dönüştür',
    'First load takes a moment as we download our conversion engine. After that, all loads will be instant.': 'Dönüştürme motoru ilk kullanımda indirildiği için işlem biraz sürebilir. Sonraki kullanımlar daha hızlı açılır.',
    'DOCX, DOC, ODT, RTF files': 'DOCX, DOC, ODT ve RTF dosyaları',
    'XLSX, XLS, ODS, CSV files': 'XLSX, XLS, ODS ve CSV dosyaları',
    'PPTX, PPT, ODP files': 'PPTX, PPT ve ODP dosyaları',
    'JPG, JPEG, JP2, JPX Images': 'JPG, JPEG, JP2 ve JPX görselleri',
    'PNG Images': 'PNG görselleri',
    'Split Mode': 'Bölme Modu',
    'Extract by Page Range (Default)': 'Sayfa Aralığına Göre Çıkar (Varsayılan)',
    'Split by Even/Odd Pages': 'Tek ve Çift Sayfalara Göre Böl',
    'Split All Pages into Separate Files': 'Tüm Sayfaları Ayrı Dosyalara Böl',
    'Select Pages Visually': 'Sayfaları Görsel Olarak Seç',
    'Split by Bookmarks': 'Yer İmlerine Göre Böl',
    'Split N Times': 'Her N Sayfada Böl',
    'How it works:': 'Nasıl çalışır?',
    'Enter page numbers separated by commas (e.g., 2, 8, 14).': 'Sayfa numaralarını virgülle ayırarak girin (ör. 2, 8, 14).',
    'Enter page ranges using a hyphen (e.g., 5-10).': 'Sayfa aralıklarını kısa çizgiyle girin (ör. 5-10).',
    'Combine them for complex selections (e.g., 1-3, 7, 12-15).': 'Karma seçimler için ikisini birlikte kullanın (ör. 1-3, 7, 12-15).',
    'Page Range': 'Sayfa Aralığı',
    'Extract all even pages (2, 4, 6...) or all odd pages (1, 3, 5...) into a new PDF.': 'Tüm çift sayfaları (2, 4, 6...) veya tüm tek sayfaları (1, 3, 5...) yeni bir PDF olarak çıkarın.',
    'Even Pages': 'Çift Sayfalar',
    'Odd Pages': 'Tek Sayfalar',
    'Every single page of the PDF will be saved as a separate PDF file.': "PDF'nin her sayfası ayrı bir PDF dosyası olarak kaydedilir.",
    'The result will be downloaded as a ZIP file containing all the pages.': 'Sonuç, bütün sayfaları içeren bir ZIP dosyası olarak indirilir.',
    'Click on the page thumbnails below to select the pages you want to extract.': 'Çıkarmak istediğiniz sayfaları seçmek için aşağıdaki küçük resimlere tıklayın.',
    'Selected pages will be highlighted.': 'Seçilen sayfalar vurgulanır.',
    'Split the PDF based on its bookmarks (outline).': "PDF'yi yer imlerine göre bölün.",
    'Select the bookmark level to split at.': 'Bölme için yer imi düzeyini seçin.',
    'Bookmark Level': 'Yer İmi Düzeyi',
    'All Levels': 'Tüm Düzeyler',
    'Level 0 (Top Level Only)': 'Düzey 0 (Yalnızca En Üst Düzey)',
    'Level 1': 'Düzey 1',
    'Level 2': 'Düzey 2',
    'Level 3': 'Düzey 3',
    'Split the PDF into multiple files, each containing N pages.': "PDF'yi, her biri N sayfa içeren birden fazla dosyaya bölün.",
    'Pages per file (N)': 'Dosya başına sayfa (N)',
    'Download as ZIP (for multiple files)': 'Birden fazla dosyayı ZIP olarak indir',
    'Compression Algorithm': 'Sıkıştırma Algoritması',
    'Condense (Recommended)': 'Condense (Önerilen)',
    'Photon (For Photo-Heavy PDFs)': "Photon (Fotoğraf Ağırlıklı PDF'ler İçin)",
    'uses advanced compression: removes dead-weight, optimizes images, subsets fonts. Best for most PDFs.': 'gelişmiş sıkıştırma kullanır; gereksiz verileri kaldırır, görselleri optimize eder ve yazı tiplerini küçültür. Çoğu PDF için uygundur.',
    'converts pages to images. Use for photo-heavy/scanned PDFs.': 'sayfaları görsellere dönüştürür. Fotoğraf ağırlıklı veya taranmış PDF’ler için kullanın.',
    '⚠️ Warning: Text will become non-selectable and links will stop working.': '⚠️ Uyarı: Metin seçilemez hale gelir ve bağlantılar çalışmaz.',
    'Compression Level': 'Sıkıştırma Seviyesi',
    'Light (Preserve Quality)': 'Hafif (Kaliteyi Koru)',
    'Balanced (Recommended)': 'Dengeli (Önerilen)',
    'Aggressive (Smaller Files)': 'Yoğun (Daha Küçük Dosyalar)',
    'Extreme (Maximum Compression)': 'En Yüksek (Maksimum Sıkıştırma)',
    'Convert to Grayscale': 'Gri Tonlamaya Dönüştür',
    'Reduces file size by removing color information': 'Renk bilgisini kaldırarak dosya boyutunu küçültür',
    'Custom Settings': 'Özel Ayarlar',
    'Fine-tune compression parameters:': 'Sıkıştırma ayarlarını ayrıntılı düzenleyin:',
    'Output Quality': 'Çıktı Kalitesi',
    'Resize Images To': 'Görselleri Yeniden Boyutlandır',
    'Only Process Above': 'Yalnızca Bu Değerin Üzerini İşle',
    'Remove metadata': 'Belge bilgilerini kaldır',
    'Subset fonts (remove unused glyphs)': 'Yazı tiplerini küçült (kullanılmayan karakterleri kaldır)',
    'Remove embedded thumbnails': 'Gömülü küçük resimleri kaldır',
    'PDF Quality': 'PDF Kalitesi',
    'High Quality (Larger file)': 'Yüksek Kalite (Daha büyük dosya)',
    'Medium Quality (Balanced)': 'Orta Kalite (Dengeli)',
    'Low Quality (Smaller file)': 'Düşük Kalite (Daha küçük dosya)',
    'Controls image compression when embedding into PDF': "Görseller PDF'ye eklenirken uygulanacak sıkıştırmayı belirler",
    'Image Quality': 'Görsel Kalitesi',
    'Higher quality = larger file size': 'Daha yüksek kalite, daha büyük dosya boyutu oluşturur',
    'Image Scale': 'Görsel Ölçeği',
    'Higher scale = better quality but larger file size': 'Daha yüksek ölçek daha iyi kalite ve daha büyük dosya oluşturur',
    'Batch Actions': 'Toplu İşlemler',
    'Left': 'Sola',
    'Right': 'Sağa',
    'Apply Rotations': 'Döndürmeleri Uygula',
    'Advanced Settings': 'Gelişmiş Ayarlar',
    'Page Order (comma-separated)': 'Sayfa Sırası (virgülle ayırın)',
    'Apply Order': 'Sıralamayı Uygula',
    'Save Changes': 'Değişiklikleri Kaydet',
    'Total Pages:': 'Toplam Sayfa:',
    'Enter pages to delete (e.g., 2, 4-6, 9):': 'Silinecek sayfaları girin (ör. 2, 4-6, 9):',
    'Delete Pages & Download': 'Sayfaları Sil ve İndir',
    'Enter pages to extract (e.g., 2, 4-6, 9):': 'Çıkarılacak sayfaları girin (ör. 2, 4-6, 9):',
    'Extract & Download ZIP': 'Çıkar ve ZIP Olarak İndir',
    'User Password (Required)': 'Kullanıcı Parolası (Zorunlu)',
    'This password will be required to open the PDF.': "PDF'yi açmak için bu parola gerekir.",
    'Owner Password (Optional)': 'Sahip Parolası (İsteğe Bağlı)',
    'If provided, usage restrictions will be applied. Leave empty for no restrictions.': 'Girildiğinde kullanım kısıtlamaları uygulanır. Kısıtlama istemiyorsanız boş bırakın.',
    'Encryption Details:': 'Şifreleme Ayrıntıları:',
    '256-bit AES encryption (highest security)': '256 bit AES şifreleme (en yüksek güvenlik)',
    'User password required to open PDF': "PDF'yi açmak için kullanıcı parolası gerekir",
    'Owner password enables usage restrictions': 'Sahip parolası kullanım kısıtlamalarını etkinleştirir',
    'Without owner password: no restrictions applied': 'Sahip parolası olmadan kısıtlama uygulanmaz',
    'PDF Password': 'PDF Parolası',
    'Enter the password used to protect this PDF.': "Bu PDF'yi korumak için kullanılan parolayı girin.",
    'Position': 'Konum',
    'Bottom Center': 'Alt Orta',
    'Bottom Left': 'Alt Sol',
    'Bottom Right': 'Alt Sağ',
    'Top Center': 'Üst Orta',
    'Top Left': 'Üst Sol',
    'Top Right': 'Üst Sağ',
    'Format': 'Biçim',
    'Font Size': 'Yazı Boyutu',
    'Color': 'Renk',
    'Add Page Numbers': 'Sayfa Numaralarını Ekle',
    'Extract Text:': 'Metni Çıkar:',
    'Uses Tesseract OCR to recognize text from scanned images or PDFs.': 'Taranmış görsellerdeki veya PDF’lerdeki metni tanımak için Tesseract OCR kullanır.',
    'Searchable Output:': 'Aranabilir Çıktı:',
    'Creates a new PDF with an invisible text layer, making your document fully searchable while preserving the original appearance.': 'Özgün görünümü koruyarak görünmez bir metin katmanı içeren, tamamen aranabilir yeni bir PDF oluşturur.',
    'Character Filtering:': 'Karakter Filtreleme:',
    'Use whitelists to filter out unwanted characters and improve accuracy for specific document types (invoices, forms, etc.).': 'İstenmeyen karakterleri elemek ve fatura veya form gibi belgelerde doğruluğu artırmak için karakter listesi kullanın.',
    'Multi-language Support:': 'Çoklu Dil Desteği:',
    'Select multiple languages for documents containing mixed language content.': 'Birden fazla dil içeren belgeler için ilgili dilleri birlikte seçin.',
    'Languages in Document': 'Belgedeki Diller',
    'Selected:': 'Seçilen:',
    'None': 'Yok',
    'Advanced Settings (Recommended to improve accuracy)': 'Gelişmiş Ayarlar (Doğruluğu artırmak için önerilir)',
    'Resolution': 'Çözünürlük',
    'Standard (192 DPI)': 'Standart (192 DPI)',
    'High (288 DPI)': 'Yüksek (288 DPI)',
    'Ultra (384 DPI)': 'Çok Yüksek (384 DPI)',
    'Binarize Image (Enhance Contrast for Clean Scans)': 'Görseli Siyah Beyaza Dönüştür (Temiz taramalarda kontrastı artırır)',
    'Embed Full Fonts (Larger file, better compatibility)': 'Yazı Tiplerinin Tamamını Göm (Daha büyük dosya, daha iyi uyumluluk)',
    'Character Whitelist Preset': 'İzin Verilen Karakter Hazır Ayarı',
    'None (All characters)': 'Yok (Tüm karakterler)',
    'Alphanumeric + Basic Punctuation': 'Harfler, rakamlar ve temel noktalama',
    'Numbers + Currency Symbols': 'Rakamlar ve para birimi simgeleri',
    'Letters Only (A-Z, a-z)': 'Yalnızca Harfler (A-Z, a-z)',
    'Numbers Only (0-9)': 'Yalnızca Rakamlar (0-9)',
    'Invoice/Receipt (Numbers, $, ., -, /)': 'Fatura/Fiş (Rakamlar, $, ., -, /)',
    'Forms (Alphanumeric + Common Symbols)': 'Formlar (Harfler, rakamlar ve yaygın simgeler)',
    'Custom...': 'Özel...',
    'Only these characters will be recognized. Leave empty for all characters.': 'Yalnızca bu karakterler tanınır. Tüm karakterler için boş bırakın.',
    'Character Whitelist (Optional)': 'İzin Verilen Karakterler (İsteğe Bağlı)',
    'Start OCR': "OCR'ı Başlat",
    'Initializing...': 'Hazırlanıyor...',
    'OCR Complete': 'OCR Tamamlandı',
    'Your searchable PDF is ready. You can also copy or download the extracted text below.': 'Aranabilir PDF hazır. Çıkarılan metni aşağıdan kopyalayabilir veya indirebilirsiniz.',
    'Download as .txt': '.txt Olarak İndir',
    'Download Searchable PDF': 'Aranabilir PDF’yi İndir',
    'What will be flattened:': 'Düzleştirilecek içerikler:',
    'Form fields (text fields, checkboxes, radio buttons, etc.)': 'Form alanları (metin alanları, onay kutuları, seçenek düğmeleri vb.)',
    'Annotations and comments': 'Açıklamalar ve yorumlar',
    'Interactive elements': 'Etkileşimli öğeler',
    'Note: Flattened content cannot be edited or filled out.': 'Not: Düzleştirilen içerik düzenlenemez veya doldurulamaz.',
    'Flatten PDF(s)': "PDF'leri Düzleştir",
    'Title': 'Başlık',
    'Author': 'Yazar',
    'Subject': 'Konu',
    'Keywords (comma-separated)': 'Anahtar Kelimeler (virgülle ayırın)',
    'Creator': 'Oluşturan',
    'Producer': 'Üretici',
    'Creation Date': 'Oluşturulma Tarihi',
    'Modification Date': 'Değiştirilme Tarihi',
    'Custom Fields': 'Özel Alanlar',
    'Note: Custom fields are not supported by all PDF readers.': 'Not: Özel alanlar bütün PDF okuyucuları tarafından desteklenmez.',
    'Add Custom Field': 'Özel Alan Ekle',
    'Save Metadata': 'Belge Bilgilerini Kaydet',
    'Loading PDF...': 'PDF yükleniyor...',
    'Rendering page previews...': 'Sayfa önizlemeleri hazırlanıyor...',
    'Applying rotations...': 'Döndürmeler uygulanıyor...',
    'Building new PDF...': 'Yeni PDF oluşturuluyor...',
    'Splitting PDF...': 'PDF bölünüyor...',
    'Creating ZIP file...': 'ZIP dosyası oluşturuluyor...',
    'Running Condense compression...': 'Condense sıkıştırması çalıştırılıyor...',
    'Running Photon compression...': 'Photon sıkıştırması çalıştırılıyor...',
    'Compressing multiple PDFs...': 'PDF dosyaları sıkıştırılıyor...',
    'Loading engine...': 'Dönüştürme motoru yükleniyor...',
    'Converting images to PDF...': "Görseller PDF'ye dönüştürülüyor...",
    'Creating PDF from JPGs...': "Görsellerden PDF oluşturuluyor...",
    'Adding watermark...': 'Filigran ekleniyor...',
    'Extracting pages...': 'Sayfalar çıkarılıyor...',
    'Deleting pages...': 'Sayfalar siliniyor...',
    'Adding page numbers...': 'Sayfa numaraları ekleniyor...',
    'Applying crop...': 'Kırpma uygulanıyor...',
    'Updating metadata...': 'Belge bilgileri güncelleniyor...',
    'Loading PDF viewer...': 'PDF görüntüleyici yükleniyor...',
    'Flattening and saving PDF...': 'PDF düzleştirilip kaydediliyor...',
    'No File': 'Dosya Yok',
    'No Files': 'Dosya Yok',
    'Invalid File': 'Geçersiz Dosya',
    'Invalid Files': 'Geçersiz Dosyalar',
    'Input Required': 'Bilgi Gerekli',
    'Success': 'Başarılı',
    'Error': 'Hata',
    'Conversion Error': 'Dönüştürme Hatası',
    'Compression Complete': 'Sıkıştırma Tamamlandı',
    'Compression Finished': 'Sıkıştırma Sonuçlandı',
    'Encryption Failed': 'Şifreleme Başarısız',
    'Incorrect Password': 'Parola Hatalı',
    'Password Error': 'Parola Hatası',
    'Decryption Failed': 'Şifre Kaldırma Başarısız',
    'Processing Complete': 'İşlem Tamamlandı',
    'No Pages': 'Sayfa Seçilmedi',
    'Invalid Pages': 'Geçersiz Sayfalar',
    'No Crop Area': 'Kırpma Alanı Seçilmedi',
    'Viewer not ready': 'Görüntüleyici Hazır Değil',
    'Export failed': 'Dışa Aktarma Başarısız',
    'No Languages Selected': 'Dil Seçilmedi',
    'OCR Language Not Available': 'OCR Dili Kullanılamıyor',
    'OCR Error': 'OCR Hatası',
    'Failed to load PDF file.': 'PDF dosyası yüklenemedi.',
    'Please upload a PDF first.': 'Önce bir PDF yükleyin.',
    'Please upload a PDF file first.': 'Önce bir PDF dosyası yükleyin.',
    'Please select a PDF file.': 'Lütfen bir PDF dosyası seçin.',
    'Please upload a valid PDF file.': 'Lütfen geçerli bir PDF dosyası yükleyin.',
    'Please select at least one PDF file.': 'Lütfen en az bir PDF dosyası seçin.',
    'Please upload at least one PDF file.': 'Lütfen en az bir PDF dosyası yükleyin.',
    'Please enter the PDF password.': 'Lütfen PDF parolasını girin.',
    'Please enter a user password.': 'Lütfen bir kullanıcı parolası girin.',
    'The password you entered is incorrect. Please try again.': 'Girdiğiniz parola hatalı. Lütfen yeniden deneyin.',
    'Unable to decrypt the PDF with the provided password.': 'PDF, verilen parolayla açılamadı.',
    'Rotations applied successfully!': 'Döndürmeler başarıyla uygulandı.',
    'Could not apply rotations.': 'Döndürmeler uygulanamadı.',
    'PDF created successfully!': 'PDF başarıyla oluşturuldu.',
    'Failed to convert images to PDF.': "Görseller PDF'ye dönüştürülemedi.",
    'Pages have been reordered.': 'Sayfalar yeniden sıralandı.',
    'PDF organized successfully!': 'PDF başarıyla düzenlendi.',
    'Failed to save changes.': 'Değişiklikler kaydedilemedi.',
    'Please select pages to delete.': 'Lütfen silinecek sayfaları seçin.',
    'Cannot delete all pages.': 'Bütün sayfalar silinemez.',
    'Failed to delete pages.': 'Sayfalar silinemedi.',
    'Please enter page numbers to extract.': 'Lütfen çıkarılacak sayfa numaralarını girin.',
    'No valid page numbers found.': 'Geçerli sayfa numarası bulunamadı.',
    'Failed to extract pages.': 'Sayfalar çıkarılamadı.',
    'PDF split successfully!': 'PDF başarıyla bölündü.',
    'Please select at least one language for OCR.': 'OCR için en az bir dil seçin.',
    'An error occurred during the OCR process. The worker may have failed to load. Please try again.': 'OCR işlemi sırasında hata oluştu. İşlem bileşeni yüklenememiş olabilir; lütfen yeniden deneyin.',
    'Watermark added successfully!': 'Filigran başarıyla eklendi.',
    'Could not add the watermark.': 'Filigran eklenemedi.',
    'Page numbers added successfully!': 'Sayfa numaraları başarıyla eklendi.',
    'Could not add page numbers.': 'Sayfa numaraları eklenemedi.',
    'Crop complete! Your download has started.': 'Kırpma tamamlandı. Dosyanız indiriliyor.',
    'An error occurred during cropping.': 'Kırpma sırasında bir hata oluştu.',
    'Metadata updated successfully!': 'Belge bilgileri başarıyla güncellendi.',
    'Could not update metadata. Please check that date formats are correct.': 'Belge bilgileri güncellenemedi. Tarih biçimlerinin doğru olduğunu kontrol edin.',
    'Please wait for the PDF viewer to load.': 'PDF görüntüleyicinin yüklenmesini bekleyin.',
    'The PDF viewer is still initializing.': 'PDF görüntüleyici hâlâ hazırlanıyor.',
    'Signed PDF saved successfully!': 'İmzalı PDF başarıyla kaydedildi.',
    'Signed PDF downloaded successfully!': 'İmzalı PDF başarıyla indirildi.',
    'Could not export the signed PDF. Please try again.': 'İmzalı PDF dışa aktarılamadı. Lütfen yeniden deneyin.',
    'No PDFs could be processed.': 'Hiçbir PDF işlenemedi.',
    'Search for languages...': 'Dil arayın...',
    'Enter password to open PDF': "PDF'yi açmak için parola girin",
    'Enter password for permissions (optional)': 'İzinler için parola girin (isteğe bağlı)',
    'Enter the PDF password': 'PDF parolasını girin',
    'Copy to Clipboard': 'Panoya Kopyala'
  }));

  const patterns = [
    [/^Rendering page previews: (\d+)\/(\d+)$/, (_m, a, b) => `Sayfa önizlemeleri hazırlanıyor: ${a}/${b}`],
    [/^Rendering Page (\d+)\.\.\.$/, (_m, page) => `Sayfa ${page} hazırlanıyor...`],
    [/^Processing page (\d+) of (\d+)\.\.\.$/, (_m, page, total) => `Sayfa işleniyor: ${page}/${total}...`],
    [/^Flattening page (\d+) of (\d+)\.\.\.$/, (_m, page, total) => `Sayfa düzleştiriliyor: ${page}/${total}...`],
    [/^Compressing (\d+)\/(\d+): (.+)\.\.\.$/, (_m, n, total, file) => `Sıkıştırılıyor ${n}/${total}: ${file}...`],
    [/^Deleted (\d+) page\(s\) successfully!$/, (_m, count) => `${count} sayfa başarıyla silindi.`],
    [/^Extracted (\d+) page\(s\) successfully!$/, (_m, count) => `${count} sayfa başarıyla çıkarıldı.`],
    [/^PDF split into (\d+) files successfully!$/, (_m, count) => `PDF başarıyla ${count} dosyaya bölündü.`],
    [/^Processed (\d+) PDFs\.$/, (_m, count) => `${count} PDF işlendi.`],
    [/^Status: (.+)$/, (_m, status) => `Durum: ${status}`]
  ];

  function translated(value) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    if (copy.has(normalized)) return copy.get(normalized);
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(normalized)) return normalized.replace(pattern, replacement);
    }
    return null;
  }

  function translateText(node) {
    const replacement = translated(node.data);
    if (!replacement) return;
    const leading = node.data.match(/^\s*/)[0];
    const trailing = node.data.match(/\s*$/)[0];
    node.data = leading + replacement + trailing;
  }

  function translateOcrLanguages(root) {
    if (!(root instanceof Element || root instanceof Document)) return;
    const displayNames = typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames(['tr'], { type: 'language' })
      : null;
    if (!displayNames) return;
    const labels = [
      ...(root.matches && root.matches('#lang-list label') ? [root] : []),
      ...root.querySelectorAll('#lang-list label')
    ];
    labels.forEach((label) => {
      const checkbox = label.querySelector('.lang-checkbox');
      if (!checkbox) return;
      let name;
      try { name = displayNames.of(checkbox.value.replace('_', '-')); } catch (_) { return; }
      if (!name || name === checkbox.value) return;
      const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.data = ` ${name}`;
      label.dataset.search = `${name} ${checkbox.value}`.toLocaleLowerCase('tr');
    });
  }

  function visit(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) translateText(root);
    const documentRoot = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
    if (!documentRoot) return;
    const walker = document.createTreeWalker(documentRoot, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateText(node);
    if (documentRoot.querySelectorAll) {
      const elements = [documentRoot, ...documentRoot.querySelectorAll('[placeholder], [title], [aria-label]')];
      for (const element of elements) {
        if (!(element instanceof Element)) continue;
        for (const attribute of ['placeholder', 'title', 'aria-label']) {
          const value = element.getAttribute(attribute);
          const replacement = value && translated(value);
          if (replacement) element.setAttribute(attribute, replacement);
        }
      }
    }
    translateOcrLanguages(documentRoot);
  }

  document.documentElement.lang = 'tr';
  localStorage.setItem('i18nextLng', 'tr');
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(visit);
      if (mutation.type === 'characterData') translateText(mutation.target);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', () => visit(document));
})();
