<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

function pdf_redirect(string $url): never
{
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    header('Location: ' . $url, true, 303);
    exit;
}

function pdf_json(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function pdf_fail(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    exit($message);
}

function pdf_render_html(string $file, string $base, array $assets): string
{
    $html = file_get_contents($file);
    if ($html === false) throw new RuntimeException('Template unavailable');
    $modified = array_map(static fn(string $asset): int => (int)(filemtime($asset) ?: 0), $assets);
    $version = (string)max([0, ...$modified]);
    return str_replace(['{{BASE}}', '{{VERSION}}'], [$base, $version], $html);
}

function pdf_rate_limit(string $private): void
{
    // One bounded, locked file; no external process or database required.
    $file = fopen($private . '/var/login-limits.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) throw new RuntimeException('Rate store unavailable');
    $entries = json_decode(stream_get_contents($file), true) ?: [];
    $now = time();
    $entries = array_filter($entries, fn($entry) => $entry['until'] > $now);
    // Session-bound so a local Varnish/PHP proxy cannot collapse every user into one IP bucket.
    $key = hash('sha256', session_id());
    $entry = $entries[$key] ?? ['until' => $now + 900, 'count' => 0];
    $entry['count']++;
    $blocked = $entry['count'] > 40 || (!isset($entries[$key]) && count($entries) >= 10000);
    if (count($entries) < 10000 || isset($entries[$key])) $entries[$key] = $entry;
    rewind($file);
    ftruncate($file, 0);
    fwrite($file, json_encode($entries, JSON_THROW_ON_ERROR));
    fflush($file);
    flock($file, LOCK_UN);
    fclose($file);
    if ($blocked) {
        header('Retry-After: 900');
        pdf_fail(429, 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.');
    }
}

function pdf_assert_signed_claims(string $xml, array $config, string $requestId): void
{
    // Additional required Google profile claims, AFTER toolkit signature/schema validation.
    $doc = new DOMDocument();
    if (!$doc->loadXML($xml, LIBXML_NONET) || $doc->doctype) throw new RuntimeException('Invalid XML');
    $xp = new DOMXPath($doc);
    $xp->registerNamespace('p', 'urn:oasis:names:tc:SAML:2.0:protocol');
    $xp->registerNamespace('s', 'urn:oasis:names:tc:SAML:2.0:assertion');
    $xp->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
    $one = function (string $path) use ($xp): DOMElement {
        $nodes = $xp->query($path);
        if ($nodes->length !== 1 || !$nodes->item(0) instanceof DOMElement) throw new RuntimeException('Ambiguous claim');
        return $nodes->item(0);
    };
    $response = $one('/p:Response');
    $assertion = $one('/p:Response/s:Assertion');
    $subject = $one('/p:Response/s:Assertion/s:Subject/s:SubjectConfirmation');
    $data = $one('/p:Response/s:Assertion/s:Subject/s:SubjectConfirmation/s:SubjectConfirmationData');
    $conditions = $one('/p:Response/s:Assertion/s:Conditions');
    $audience = $one('/p:Response/s:Assertion/s:Conditions/s:AudienceRestriction/s:Audience');
    $callback = $config['url'] . '/saml-acs.php';
    if ($response->getAttribute('Destination') !== $callback ||
        $response->getAttribute('InResponseTo') !== $requestId ||
        $subject->getAttribute('Method') !== 'urn:oasis:names:tc:SAML:2.0:cm:bearer' ||
        $data->getAttribute('Recipient') !== $callback || $data->getAttribute('InResponseTo') !== $requestId ||
        trim($audience->textContent) !== $config['entity'] ||
        trim($one('/p:Response/s:Issuer')->textContent) !== $config['issuer'] ||
        trim($one('/p:Response/s:Assertion/s:Issuer')->textContent) !== $config['issuer']) {
        throw new RuntimeException('Claims mismatch');
    }
    foreach ([$response, $assertion] as $element) {
        $issued = strtotime($element->getAttribute('IssueInstant'));
        if (!$issued || $issued < time() - 300 || $issued > time() + 30) throw new RuntimeException('Assertion age');
    }
    foreach ([$data, $conditions] as $element) {
        $expiry = strtotime($element->getAttribute('NotOnOrAfter'));
        if (!$expiry || $expiry <= time() - 30) throw new RuntimeException('Expired assertion');
        if ($element->hasAttribute('NotBefore')) {
            $start = strtotime($element->getAttribute('NotBefore'));
            if (!$start || $start > time() + 30) throw new RuntimeException('Future assertion');
        }
    }
    foreach ($xp->query('//ds:SignatureMethod | //ds:DigestMethod') as $algorithm) {
        if (!in_array($algorithm->getAttribute('Algorithm'), [
            'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
            'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
            'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
            'http://www.w3.org/2001/04/xmlenc#sha256',
            'http://www.w3.org/2001/04/xmldsig-more#sha384',
            'http://www.w3.org/2001/04/xmlenc#sha512',
        ], true)) throw new RuntimeException('Weak signature algorithm');
    }
}

function pdf_run(string $private, string $route): void
{
    $config = pdf_config($private);
    $base = $config['base'];
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: same-origin');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Embedder-Policy: require-corp');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' blob: https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://fonts.gstatic.com; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; form-action 'self'");
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $expected = in_array($route, ['acs', 'logout'], true) ? 'POST' : 'GET';
    if ($method !== $expected && !($expected === 'GET' && $method === 'HEAD')) {
        header('Allow: ' . $expected);
        pdf_fail(405, 'Bu yöntem desteklenmiyor.');
    }
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 262144) pdf_fail(413, 'İstek çok büyük.');

    foreach (['var', 'var/sessions'] as $directory) {
        if (!is_dir($private . '/' . $directory) &&
            !mkdir($private . '/' . $directory, 0700, true) && !is_dir($private . '/' . $directory)) {
            throw new RuntimeException('Session directory unavailable');
        }
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', '28800');
    session_save_path($private . '/var/sessions');
    session_name($config['secure'] ? '__Host-pdf_session' : 'pdf_test_session');
    session_set_cookie_params([
        'lifetime' => 28800, 'path' => '/', 'secure' => $config['secure'],
        'httponly' => true, 'samesite' => $config['secure'] ? 'None' : 'Lax',
    ]);
    if (!session_start()) throw new RuntimeException('Session unavailable');
    if (isset($_SESSION['user']) && ($_SESSION['expires'] ?? 0) <= time()) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    if ($route === 'health') pdf_json(['status' => 'ok', 'runtime' => 'php']);
    if ($route === 'status') pdf_json(['configured' => $config['configured']]);
    if ($route === 'home') {
        if (isset($_SESSION['user'])) pdf_redirect($base . '/app.php');
        session_write_close();
        header('Content-Type: text/html; charset=utf-8');
        echo pdf_render_html($private . '/web/public/login.html', $base, [
            $private . '/web/public/style.css', $private . '/web/public/login.js',
        ]);
        return;
    }
    if (in_array($route, ['login', 'acs', 'metadata'], true)) {
        if (!$config['configured']) {
            if ($route === 'login') pdf_redirect($base . '/?error=configuration');
            pdf_fail(503, 'Google Workspace SAML yapılandırması henüz tamamlanmadı.');
        }
        require_once $private . '/vendor/autoload.php';
        $auth = new OneLogin\Saml2\Auth(pdf_saml_settings($config));
        if ($route === 'metadata') {
            header('Content-Type: application/samlmetadata+xml; charset=utf-8');
            echo $auth->getSettings()->getSPMetadata();
            return;
        }
        pdf_rate_limit($private);
        if ($route === 'login') {
            $relay = bin2hex(random_bytes(32));
            $target = $auth->login($relay, [], false, false, true);
            $_SESSION['saml'] = ['relay' => $relay, 'id' => $auth->getLastRequestID(), 'started' => time()];
            pdf_redirect($target);
        }
        $flow = $_SESSION['saml'] ?? null;
        unset($_SESSION['saml']); // Single use, serialized by PHP's session-file lock.
        if (!is_array($flow) || !is_string($_POST['RelayState'] ?? null) ||
            !hash_equals($flow['relay'], $_POST['RelayState']) || time() - $flow['started'] > 300) {
            pdf_redirect($base . '/?error=session');
        }
        try {
            if (!is_string($_POST['SAMLResponse'] ?? null)) throw new RuntimeException('Missing response');
            $auth->processResponse($flow['id']);
            if ($auth->getErrors() || !$auth->isAuthenticated()) {
                $codes = implode(',', $auth->getErrors());
                $reason = trim((string)$auth->getLastErrorReason());
                throw new RuntimeException('Toolkit [' . $codes . ']' . ($reason !== '' ? ': ' . $reason : ''));
            }
            pdf_assert_signed_claims($auth->getLastResponseXML(), $config, $flow['id']);
            $email = strtolower(trim($auth->getNameId() ?? ''));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '@beykoz.edu.tr')) {
                pdf_redirect($base . '/?error=domain');
            }
            session_regenerate_id(true);
            $_SESSION = [
                'user' => ['email' => $email, 'name' => preg_replace('/[._-]+/', ' ', explode('@', $email)[0])],
                'csrf' => bin2hex(random_bytes(32)), 'expires' => time() + 28800,
            ];
            pdf_redirect($base . '/app.php');
        } catch (Throwable $error) {
            // Error messages contain validation categories/expected endpoints, not the SAML payload.
            $reason = str_replace(["\r", "\n", "\0"], ' ', $error->getMessage());
            error_log('PDF Düzenle: SAML authentication rejected; ' . get_class($error) . ': ' . substr($reason, 0, 500));
            pdf_redirect($base . '/?error=authentication');
        }
    }
    if (!isset($_SESSION['user'])) {
        if ($route === 'me') pdf_json(['error' => 'Oturum açmanız gerekiyor.'], 401);
        pdf_redirect($base . '/');
    }
    if ($route === 'me') pdf_json($_SESSION['user'] + ['csrf' => $_SESSION['csrf']]);
    if ($route === 'logout') {
        if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $config['origin'] ||
            !is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) {
            pdf_fail(403, 'İstek doğrulanamadı.');
        }
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/',
            'secure' => $config['secure'], 'httponly' => true, 'samesite' => $config['secure'] ? 'None' : 'Lax']);
        pdf_redirect($base . '/');
    }
    session_write_close(); // PDF assets/downloads must not lock concurrent session requests.
    if ($route === 'app') {
        header('Content-Type: text/html; charset=utf-8');
        echo pdf_render_html($private . '/web/private/index.html', $base, [
            $private . '/web/public/style.css', $private . '/web/private/workspace.css',
            $private . '/web/private/workspace.js',
        ]);
        return;
    }
    if (in_array($route, ['engine', 'engine-asset'], true) && defined('PDF_ENGINE_FILE')) {
        // Constant originates only in generated PHP entry points, never in request parameters.
        $directory = $route === 'engine' ? 'engine-pages' : 'engine-assets';
        $extension = $route === 'engine' ? '.html' : '.js';
        $root = realpath($private . '/' . $directory);
        $file = realpath($private . '/' . $directory . '/' . PDF_ENGINE_FILE);
        if (!$root || !$file || !str_starts_with($file, $root . '/') || !str_ends_with($file, $extension)) {
            pdf_fail(404, 'Araç bulunamadı.');
        }
        header('Content-Type: ' . ($route === 'engine' ? 'text/html' : 'application/javascript') . '; charset=utf-8');
        readfile($file);
        return;
    }
    if ($route === 'source') {
        pdf_redirect('https://github.com/ardacetin/beykozpdf');
    }
    pdf_fail(404, 'Sayfa bulunamadı.');
}
