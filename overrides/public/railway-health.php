<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$port = (int) (getenv('PORT') ?: 8080);
$publicHost = trim((string) (getenv('RAILWAY_PUBLIC_DOMAIN') ?: 'localhost'));

$probe = static function (string $path, ?string $cookie = null) use ($port, $publicHost): array {
    $url = 'http://127.0.0.1:' . $port . $path;
    $ch = curl_init($url);
    $headers = [
        'Host: ' . $publicHost,
        'X-Forwarded-Proto: https',
        'X-Forwarded-Host: ' . $publicHost,
        'X-Forwarded-Port: 443',
        'Accept: text/html,application/xhtml+xml',
        'User-Agent: YellowDuck-Railway-Health/2.0',
        'Connection: close',
    ];
    if ($cookie !== null) {
        $headers[] = 'Cookie: ' . $cookie;
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => false,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => $headers,
    ]);

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    $snippet = is_string($body)
        ? trim(preg_replace('/\s+/', ' ', strip_tags(substr($body, 0, 800))))
        : '';

    return [
        'status' => $status,
        'curl_errno' => $errno,
        'curl_error' => $error !== '' ? substr($error, 0, 160) : null,
        'body_hint' => substr($snippet, 0, 220),
    ];
};

$checks = [
    'home_clean' => $probe('/'),
    'login_clean' => $probe('/login'),
    'home_stale_cookie' => $probe('/', 'laravel_session=invalid; yellow_duck_session_v2=invalid; XSRF-TOKEN=invalid'),
];

$ok = true;
foreach ($checks as $result) {
    if (($result['curl_errno'] ?? 0) !== 0 || ($result['status'] ?? 0) < 200 || ($result['status'] ?? 0) >= 500) {
        $ok = false;
        break;
    }
}

http_response_code($ok ? 200 : 503);
echo json_encode([
    'ok' => $ok,
    'mode' => 'real_apache_loopback',
    'checks' => $checks,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
