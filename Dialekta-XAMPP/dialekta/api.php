<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lesson-publication.php';

function serialize_module(array $row): array {
    $row['id'] = (int)$row['id'];
    $row['version'] = (int)$row['version'];
    if (isset($row['lesson_count'])) $row['lesson_count'] = (int)$row['lesson_count'];
    if (isset($row['data'])) $row['data'] = json_decode($row['data'], false, 128, JSON_THROW_ON_ERROR);
    return $row;
}

function fetch_module(int $id): array {$row = query('SELECT id, title, description, level, status, data, version, created_at, updated_at
        FROM modules WHERE id=?', [$id])->fetch();
    if (!$row) fail('Este módulo ya no existe.', 404);
    return serialize_module($row);
}

function legacy_module_ready(object $data, string $description): bool {$hasTeaching = !empty($data->phonemes) \vert{}\vert{} !empty($data->phrases)
        || !empty($data->context) \vert{}\vert{} !empty($data->morphology);
    if ($description === '' \vert{}\vert{} !$hasTeaching) return false;
    foreach (['exercises', 'questions'] as $key) {$rows = $data->$key ?? [];
        if (!is_array($rows) \vert{}\vert{} !$rows) return false;
        foreach ($rows as$row) {
            if (!is_object($row) || !is_string($row->prompt ?? null) \vert{}\vert{} trim($row->prompt) === ''
                || !is_string($row->answer ?? null) \vert{}\vert{} trim($row->answer) === '') {
                return false;
            }
        }
    }
    return true;
}

function is_local_recovery(): bool {
    global $config;
    $host = strtolower(parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST) ?: '');
    return $config['local_recovery']
        && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1', '::ffff:127.0.0.1'], true)
        && in_array($host, ['localhost', '127.0.0.1', '[::1]'], true);
}

try {
    $action =$_GET['action'] ?? 'session';
    $reads = ['session', 'list', 'get', 'team', 'app_modules'];$writes = ['login', 'register', 'logout', 'recover', 'reset', 'save', 'delete', 'saveAdmin', 'deleteAdmin', 'app_register', 'app_login'];
    
    if (!in_array($action, array_merge($reads,$writes), true)) fail('Acción desconocida.', 404);
    $write = in_array($action,$writes, true);
    if ($_SERVER['REQUEST_METHOD'] !== ($write ? 'POST' : 'GET')) fail('Método no permitido.', 405);
    
    $body = [];
    if ($write) {
        // Eximir de CSRF a las peticiones públicas de la aplicación móvil
        $mobilePublicActions = ['app_register', 'app_login'];
        if (!in_array($action,$mobilePublicActions, true)) {
            if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
                fail('La sesión cambió. Actualiza la página e inténtalo de nuevo.', 403);
            }
        }

        $limit = 3 * 1024 * 1024;
        $raw = file_get_contents('php://input', false, null, 0,$limit + 1);
        if (strlen($raw) >$limit) fail('El contenido supera los 3 MiB.', 413);
        $payload = json_decode($raw ?: '{}', false, 128);
        if (!is_object($payload)) fail('El cuerpo de la solicitud debe ser un objeto JSON.', 400);
        $body = (array)$payload;
    }

    switch ($action) {
        // --- ENDPOINTS PARA LA APP MÓVIL ANDROID ---
        case 'app_register':
            $name = text_field($body, 'name', 120);
            $email = text_field($body, 'email', 190);
            $password =$body['password'] ?? null;
            
            if ($name === '' \vert{}\vert{} !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                fail('Escribe un nombre y un correo válido.', 400);
            }
            if (!is_string($password) || mb_strlen($password, 'UTF-8') < 8 \vert{}\vert{} strlen($password) > 72) {
                fail('La contraseña debe tener entre 8 y 72 caracteres.', 400);
            }
            try {
                query('INSERT INTO users(name,email,password_hash) VALUES (?,?,?)',
                    [$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            } catch (PDOException $error) {
                if ((int)($error->errorInfo[1] ?? 0) === 1062) fail('Ya existe una cuenta con este correo.', 409);
                throw $error;
            }
            reply(['ok' => true, 'message' => 'Usuario registrado con éxito.'], 201);

        case 'app_login':
            $email = text_field($body, 'email', 190);
            $user = query('SELECT id, name, email, password_hash FROM users WHERE email=?', [$email])->fetch();
            if (!$user \vert{}\vert{} !is_string($body['password'] ?? null)
                || !password_verify($body['password'],$user['password_hash'])) {
                fail('Correo o contraseña incorrectos.', 401);
            }
            reply([
                'ok' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'name' => $user['name'],
                    'email' => $user['email']
                ]
            ]);

        case 'app_modules':
            $rows = query("SELECT id, title, description, level, status, version, data, updated_at
                FROM modules WHERE status = 'published' ORDER BY id ASC")->fetchAll();
            reply(['modules' => array_map('serialize_module', $rows)]);

        // --- ENDPOINTS DEL PANEL ADMINISTRATIVO WEB ---
        case 'session':
            reply(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);

        case 'login':
            $email = text_field($body, 'email', 190);
            $user = query('SELECT * FROM admins WHERE email=?', [$email])->fetch();
            if (!$user \vert{}\vert{} !is_string($body['password'] ?? null)
                || !password_verify($body['password'],$user['password_hash'])) {
                fail('Correo o contraseña incorrectos.', 401);
            }
            fresh_session();
            $_SESSION['uid'] = (int)$user['id'];
            $_SESSION['version'] = (int)$user['auth_version'];
            reply(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);

        case 'register':
            $name = text_field($body, 'name', 120);
            $email = text_field($body, 'email', 190);
            $password =$body['password'] ?? null;
            if ($name === '' \vert{}\vert{} !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                fail('Escribe un nombre y un correo válido.');
            }
            if (!is_string($password) \vert{}\vert{} mb_strlen($password, 'UTF-8') < 8
                || strlen($password) > 72 \vert{}\vert{} strpos($password, chr(0)) !== false) {
                fail('Usa una contraseña de al menos 8 caracteres y hasta 72 bytes.');
            }
            try {
                query('INSERT INTO admins(name,email,password_hash) VALUES (?,?,?)',
                    [$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            } catch (PDOException $error) {
                if ((int)($error->errorInfo[1] ?? 0) === 1062) fail('Ya existe una cuenta con ese correo.', 409);
                throw $error;
            }
            reply(['ok' => true], 201);

        case 'logout':
            fresh_session();
            reply(['ok' => true, 'csrf' => $_SESSION['csrf']]);

        case 'recover':
            if (!is_local_recovery()) fail('La bandeja de pruebas se abre desde localhost en el equipo de XAMPP.', 403);
            $email = text_field($body, 'email', 190);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Escribe un correo válido.');
            $token = bin2hex(random_bytes(32));$changed = query('UPDATE admins SET reset_hash=?, reset_expires=UTC_TIMESTAMP() + INTERVAL 20 MINUTE WHERE email=?',
                [hash('sha256', $token), $email])->rowCount();$result = ['message' => 'Si la cuenta existe, encontrarás un enlace válido durante 20 minutos en la bandeja local.'];
            if ($changed) $result['token'] =$token;
            reply($result);

        case 'reset':
            $token = text_field($body, 'token', 64);
            $password =$body['password'] ?? null;
            if (!is_string($password) \vert{}\vert{} mb_strlen($password, 'UTF-8') < 8 || strlen($password) > 72 \vert{}\vert{} strpos($password, chr(0)) !== false) fail('Usa al menos 8 caracteres y un máximo de 72 bytes.');
            $changed = query('UPDATE admins SET password_hash=?, reset_hash=NULL, reset_expires=NULL,
                auth_version=auth_version+1 WHERE reset_hash=? AND reset_expires>UTC_TIMESTAMP()',
                [password_hash($password, PASSWORD_DEFAULT), hash('sha256',$token)])->rowCount();
            if (!$changed) fail('Este enlace ya caducó o fue utilizado. Solicita otro.');
            reply(['ok' => true]);
    }

    if (!current_user()) fail('Inicia sesión para administrar los módulos.', 401);

    if (in_array($action, ['team', 'saveAdmin', 'deleteAdmin'], true)) {
        require_once __DIR__ . '/team-actions.php';
        teamAction($action, db(), (int)$_SESSION['uid'],$body);