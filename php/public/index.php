<?php
declare(strict_types=1);

// Shown when the private install is missing or the app fails to start. Public
// visitors see a branded maintenance notice; the cause goes to the error log.
// maintenance.html is self-contained (inline CSS/SVG) because the failure may
// be the files it would otherwise load. The Cloudflare Worker serves the same page.
function pdf_maintenance(): never
{
    if (!headers_sent()) {
        http_response_code(503);
        header('Retry-After: 300');
        header('Cache-Control: no-store');
        if (in_array(defined('PDF_ROUTE') ? PDF_ROUTE : 'home', ['me', 'status', 'health'], true)) {
            header('Content-Type: application/json; charset=utf-8');
            exit('{"error":"maintenance"}');
        }
        header('Content-Type: text/html; charset=utf-8');
    }
    $page = @file_get_contents(__DIR__ . '/maintenance.html');
    echo is_string($page) ? str_replace('{{YEAR}}', date('Y'), $page) : 'PDF Düzenle bakımda. Lütfen daha sonra tekrar deneyin.';
    exit;
}

// CloudPanel: /home/USER/htdocs/DOMAIN -> /home/USER/pdf-duzenle-private
$private = getenv('PDF_PRIVATE_DIR') ?: dirname(__DIR__, 2) . '/pdf-duzenle-private';
ini_set('display_errors', '0');
header_remove('X-Powered-By');
header('Cache-Control: private, no-store, max-age=0');
if (!is_file($private . '/php/app.php')) {
    error_log('PDF Düzenle: kurulum eksik; pdf-duzenle-private klasörü bulunamadı: ' . $private);
    pdf_maintenance();
}
try {
    require $private . '/php/app.php';
    pdf_run($private, defined('PDF_ROUTE') ? PDF_ROUTE : 'home');
} catch (Throwable $error) {
    // Exception messages name failed checks/paths only; never assertions or session tokens.
    $reason = str_replace(["\r", "\n", "\0"], ' ', $error->getMessage());
    error_log('PDF Düzenle: ' . get_class($error) . ': ' . substr($reason, 0, 500));
    pdf_maintenance();
}
