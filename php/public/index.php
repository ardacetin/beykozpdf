<?php
declare(strict_types=1);

// CloudPanel: /home/USER/htdocs/DOMAIN/pdf -> /home/USER/pdf-duzenle-private
$private = getenv('PDF_PRIVATE_DIR') ?: dirname(__DIR__, 3) . '/pdf-duzenle-private';
ini_set('display_errors', '0');
header_remove('X-Powered-By');
header('Cache-Control: private, no-store, max-age=0');
if (!is_file($private . '/php/app.php')) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit('PDF Düzenle kurulumu eksik. pdf-duzenle-private klasörünü site kullanıcısının ana dizinine yükleyin.');
}
try {
    require $private . '/php/app.php';
    pdf_run($private, defined('PDF_ROUTE') ? PDF_ROUTE : 'home');
} catch (Throwable $error) {
    // No assertions, configuration values or session tokens in responses/logs.
    error_log('PDF Düzenle: ' . get_class($error) . '; kurulum ve PHP hata günlüğünü kontrol edin.');
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'PDF Düzenle açılamadı. PHP gereksinimlerini, özel dizin izinlerini ve .env ayarlarını kontrol edin.';
}
