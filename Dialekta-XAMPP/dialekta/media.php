<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

function media_error(string $message, int $code): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
try {
    if (!current_user()) media_error('Inicia sesión para acceder a los archivos.', 401);
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        $id = (string)($_GET['id'] ?? '');
        if (!preg_match('/^[a-f0-9]{64}$/D', $id)) media_error('Recurso desconocido.', 404);
        $file = query('SELECT mime, bytes FROM media_files WHERE id=?', [$id])->fetch();
        if (!$file) media_error('Recurso desconocido.', 404);
        $parts = query('SELECT payload FROM media_chunks WHERE file_id=? ORDER BY part', [$id]);
        header('Content-Type: ' . $file['mime']);
        header('Content-Length: ' . $file['bytes']);
        while ($part = $parts->fetch(PDO::FETCH_ASSOC)) echo $part['payload'];
        exit;
    }
    if ($method !== 'POST') media_error('Método no permitido.', 405);
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        media_error('Actualiza la página e intenta de nuevo.', 403);
    }
    $file = $_FILES['file'] ?? [];
    if (($file['error'] ?? -1) !== UPLOAD_ERR_OK || $file['size'] <= 0 || $file['size'] > 2097152 || !is_uploaded_file($file['tmp_name'])) {
        media_error('Selecciona un archivo de hasta 2 MiB.', 422);
    }
    $bytes = file_get_contents($file['tmp_name']);
    $kind = $_POST['kind'] ?? '';
    if ($kind === 'image') {
        $info = @getimagesizefromstring($bytes);
        $mime = $info['mime'] ?? '';
        if (!in_array($mime, ['image/jpeg','image/png','image/webp'], true)) media_error('Elige una imagen PNG, JPG o WebP.', 422);
    } elseif ($kind === 'audio') {
        $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        $allowed = ['audio/mpeg'=>'audio/mpeg','audio/wav'=>'audio/wav','audio/x-wav'=>'audio/wav','audio/ogg'=>'audio/ogg','application/ogg'=>'audio/ogg','audio/webm'=>'audio/webm','video/webm'=>'audio/webm','audio/mp4'=>'audio/mp4','audio/x-m4a'=>'audio/mp4'];
        if (!isset($allowed[$mime])) media_error('Elige un audio MP3, WAV, OGG, WebM o M4A.', 422);
        $mime = $allowed[$mime];
    } else media_error('Tipo de recurso desconocido.', 422);
    $id = hash('sha256', $bytes);
    $db = db();
    $db->beginTransaction();
    $created = query('INSERT IGNORE INTO media_files (id,mime,bytes) VALUES (?,?,?)', [$id, $mime, strlen($bytes)]);
    if ($created->rowCount() === 1) {
        foreach (str_split($bytes, 131072) as $part => $chunk) {
            query('INSERT INTO media_chunks (file_id,part,payload) VALUES (?,?,?)', [$id, $part, $chunk]);
        }
    }
    $db->commit();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['url' => 'media.php?id=' . $id]);
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log($error->getMessage());
    media_error('No se pudo acceder a los recursos. Comprueba la instalación de la base de datos.', 500);
}
