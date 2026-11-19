<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('session.use_strict_mode', '1');
session_name('dialekta_admin');
session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
    'path' => str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])) ?: '/',
]);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$config = require __DIR__ . '/config.php';
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));

function reply(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(string $message, int $status = 422): void {
    reply(['error' => $message], $status);
}

function db(): PDO {
    global $config;
    static $pdo;
    if (!$pdo) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['host'], $config['port'], $config['database']);
        $pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function query(string $sql, array $values = []): PDOStatement {
    $statement = db()->prepare($sql);
    $statement->execute($values);
    return $statement;
}

function current_user(): ?array {
    if (empty($_SESSION['uid'])) return null;
    $user = query('SELECT id, name, email FROM admins WHERE id=? AND auth_version=?',
        [$_SESSION['uid'], $_SESSION['version']])->fetch();
    if (!$user) {
        unset($_SESSION['uid'], $_SESSION['version']);
        return null;
    }
    $user['id'] = (int)$user['id'];
    return $user;
}

function fresh_session(): void {
    $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
    session_regenerate_id(true);
}

function text_field(array $body, string $key, int $max, string $default = ''): string {
    $value = $body[$key] ?? $default;
    if (!is_string($value) || mb_strlen($value, 'UTF-8') > $max) {
        fail("Revisa el campo «$key» (máximo $max caracteres).");
    }
    return trim($value);
}

function id_field($value): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if (!$id) fail('El identificador debe ser un número positivo.');
    return $id;
}

