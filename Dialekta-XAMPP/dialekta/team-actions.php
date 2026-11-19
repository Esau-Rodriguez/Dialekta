<?php
declare(strict_types=1);

function teamAction(string $action, PDO $db, int $adminId, array $body): void {
    if ($action === 'team') {
        $admins = query('SELECT id,name,email,auth_version AS version FROM admins ORDER BY name,id')->fetchAll();
        foreach ($admins as &$admin) {
            $admin['id'] = (int)$admin['id'];
            $admin['version'] = (int)$admin['version'];
        }
        reply(['admins' => $admins]);
    }

    if ($action === 'deleteAdmin') {
        $id = id_field($body['id'] ?? null);
        $version = id_field($body['version'] ?? null);
        if ($id === $adminId) fail('No puedes eliminar tu propia cuenta.');
        $db->beginTransaction();
        // Serializa las bajas para que dos solicitudes no puedan eliminarse mutuamente.
        $ids = query('SELECT id FROM admins ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
        if (count($ids) < 2 || !in_array($adminId, array_map('intval', $ids), true)) {
            $db->rollBack();
            fail('Se requiere al menos una cuenta administradora activa.', 409);
        }
        $changed = query('DELETE FROM admins WHERE id=? AND auth_version=?', [$id, $version])->rowCount();
        $db->commit();
        if (!$changed) fail('La cuenta cambió o ya se eliminó. Actualiza la lista.', 409);
        reply(['ok' => true]);
    }

    $name = text_field($body, 'name', 120);
    $email = text_field($body, 'email', 190);
    $password = $body['password'] ?? '';
    $id = isset($body['id']) ? id_field($body['id']) : null;
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Escribe un nombre y un correo válido.');
    if (!is_string($password) || (($password !== '' || $id === null) &&
        (mb_strlen($password, 'UTF-8') < 8 || strlen($password) > 72 || strpos($password, chr(0)) !== false))) {
        fail('Usa una contraseña de al menos 8 caracteres y hasta 72 bytes.');
    }

    try {
        if ($id === null) {
            query('INSERT INTO admins(name,email,password_hash) VALUES (?,?,?)',
                [$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            reply(['ok' => true], 201);
        }
        $version = id_field($body['version'] ?? null);
        $hash = $password === '' ? null : password_hash($password, PASSWORD_DEFAULT);
        $changed = query('UPDATE admins SET name=?,email=?,password_hash=COALESCE(?,password_hash),
            auth_version=auth_version+1,reset_hash=NULL,reset_expires=NULL WHERE id=? AND auth_version=?',
            [$name, $email, $hash, $id, $version])->rowCount();
        if (!$changed) fail('Otra persona modificó la cuenta. Actualiza la lista antes de editarla.', 409);
        if ($id === $adminId) {
            fresh_session();
            $_SESSION['uid'] = $id;
            $_SESSION['version'] = $version + 1;
        }
        reply(['ok' => true, 'csrf' => $_SESSION['csrf']]);
    } catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) === 1062) fail('Ya existe una cuenta con ese correo.', 409);
        throw $error;
    }
}
