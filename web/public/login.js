const base = document.documentElement.dataset.base;
const errors = {
  configuration:
    "Kurumsal giriş henüz etkinleştirilmedi. Google Workspace bağlantısı tamamlandığında hesabınızla giriş yapabilirsiniz.",
  session:
    "Giriş isteğinin süresi dolmuş veya tarayıcı oturumu bulunamamış. Lütfen bu sayfadan yeniden giriş yapın.",
  domain:
    "Bu çalışma alanına yalnızca @beykoz.edu.tr hesabıyla erişebilirsiniz.",
  authentication:
    "Google giriş yanıtı doğrulanamadı. Yeniden deneyin; sorun sürerse Bilgi İşlem biriminize başvurun.",
};
const error = new URLSearchParams(location.search).get("error");
const message = document.querySelector("#login-message");
if (errors[error]) {
  message.textContent = errors[error];
  message.hidden = false;
}
const dialog = document.querySelector("#info-dialog");
const showInfo = (content) => {
  document.querySelector("#dialog-content").innerHTML = content;
  dialog.showModal();
};
document.querySelector("#help-button").onclick = () =>
  showInfo(
    '<span class="eyebrow">YARDIM VE DESTEK</span><h2>Birlikte çözelim.</h2><p>Google hesabınızın <strong>@beykoz.edu.tr</strong> uzantılı olduğundan emin olun. Birden fazla Google hesabınız açıksa üniversite hesabınızı seçin.</p><p>Giriş isteği zaman aşımına uğradıysa bu sayfadan yeniden başlayın. Tarayıcınızda çerezlere izin verin.</p><p>Sorun devam ederse Beykoz Üniversitesi Bilgi İşlem birimine başvurun. Destek talebinize hata mesajını ekleyebilirsiniz; belgenizi veya şifrenizi paylaşmayın.</p>',
  );
document.querySelector("#privacy-button").onclick = () =>
  showInfo(
    '<span class="eyebrow">GİZLİLİK VE KULLANIM</span><h2>Dosyalarınız cihazınızda.</h2><p>PDF işlemleri tarayıcınızda yapılır; uygulama PDF dosyalarını sunucuya yüklemez. Bazı gelişmiş araçlar gerekli yazılım bileşenlerini internetten indirebilir.</p><p>Giriş için kurumsal e-posta adresiniz ve güvenli bir oturum çerezi kullanılır. Oturum en fazla 8 saat sürer. Favori araç tercihleriniz bu tarayıcıda saklanır.</p><p>PDF Düzenle, UlakPDF ve BentoPDF açık kaynak bileşenlerinden yararlanır. Lisanslar ve kullanılan kaynak kod giriş yaptıktan sonra çalışma alanından erişilebilir.</p>',
  );
for (const button of dialog.querySelectorAll(".dialog-close,.dialog-ok"))
  button.onclick = () => dialog.close();
document.querySelector("#year").textContent = new Date().getFullYear();
