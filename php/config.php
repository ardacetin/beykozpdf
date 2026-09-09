<?php
declare(strict_types=1);

function pdf_config(string $private): array
{
    $contents = file_get_contents($private . '/.env');
    if ($contents === false) {
        throw new RuntimeException('Configuration missing');
    }
    // PHP's INI parser only accepts semicolon comments consistently. The
    // distributed file uses the more familiar dotenv-style # comments.
    $contents = preg_replace('/^\s*#.*$/m', '', $contents);
    $env = is_string($contents) ? parse_ini_string($contents, false, INI_SCANNER_RAW) : false;
    if ($env === false) {
        throw new RuntimeException('Configuration missing');
    }
    $url = rtrim($env['APP_URL'] ?? 'https://my.beykoz.edu.tr/pdf', '/');
    $parts = parse_url($url);
    $testing = getenv('PDF_TESTING') === '1' && PHP_SAPI === 'cli-server';
    if (!$parts || !isset($parts['host']) || isset($parts['query']) || isset($parts['fragment']) ||
        isset($parts['user']) || isset($parts['pass']) ||
        !preg_match('~^/[a-zA-Z0-9/_-]*$~D', $parts['path'] ?? '/') ||
        (!($testing && ($parts['host'] === '127.0.0.1')) && ($parts['scheme'] ?? '') !== 'https')) {
        throw new RuntimeException('Invalid APP_URL');
    }
    $entry = trim($env['SAML_ENTRY_POINT'] ?? '');
    $issuer = trim($env['SAML_IDP_ISSUER'] ?? '');
    $certPath = $env['SAML_IDP_CERT_PATH'] ?? './certs/google-workspace.pem';
    $certPath = str_starts_with($certPath, '/') ? $certPath : $private . '/' . $certPath;
    $certValue = is_file($certPath) ? file_get_contents($certPath) : '';
    $cert = is_string($certValue) ? $certValue : '';
    $configured = $entry !== '' && $issuer !== '' && $cert !== '';
    if (($entry !== '' || $issuer !== '') && !$configured) {
        throw new RuntimeException('Incomplete SAML configuration');
    }
    if ($entry !== '' && parse_url($entry, PHP_URL_SCHEME) !== 'https' &&
        !($testing && parse_url($entry, PHP_URL_HOST) === '127.0.0.1')) {
        throw new RuntimeException('SSO requires HTTPS');
    }
    return [
        'url' => $url, 'base' => rtrim($parts['path'] ?? '', '/'),
        'origin' => $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : ''),
        'secure' => !$testing, 'configured' => $configured,
        'entry' => $entry, 'issuer' => $issuer, 'cert' => $cert,
        'entity' => ($env['SAML_SP_ENTITY_ID'] ?? '') ?: $url . '/metadata.php',
    ];
}

function pdf_saml_settings(array $config): array
{
    return [
        'strict' => true, 'debug' => false, 'baseurl' => $config['url'] . '/',
        'sp' => [
            'entityId' => $config['entity'],
            'assertionConsumerService' => [
                'url' => $config['url'] . '/saml-acs.php',
                'binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
            ],
            'NameIDFormat' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        ],
        'idp' => [
            'entityId' => $config['issuer'],
            'singleSignOnService' => ['url' => $config['entry']],
            'x509cert' => $config['cert'],
        ],
        'security' => [
            'wantAssertionsSigned' => true, 'wantMessagesSigned' => true,
            'wantXMLValidation' => true, 'wantNameId' => true,
            'requestedAuthnContext' => false, 'destinationStrictlyMatches' => true,
            'relaxDestinationValidation' => false,
            'rejectUnsolicitedResponsesWithInResponseTo' => true,
            'signatureAlgorithm' => 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
            'digestAlgorithm' => 'http://www.w3.org/2001/04/xmlenc#sha256',
        ],
    ];
}
