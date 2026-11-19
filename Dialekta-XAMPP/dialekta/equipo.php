<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
try {
    if (!current_user()) {
        header('Location: index.html', true, 303);
        exit;
    }
} catch (PDOException $error) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit('No se pudo conectar a la base de datos. Revisa MySQL en XAMPP.');
}
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Equipo administrador · Dialekta</title>
  <link rel="icon" href="assets/logo.png">
  <link rel="stylesheet" href="ui.css">
  <link rel="stylesheet" href="equipo.css">
  <script defer src="equipo.js"></script>
</head>
<body>
  <header class="team-head"><div><a class="team-brand" href="index.html">Dialekta</a><a href="index.html">Volver al panel</a></div></header>
  <main class="team-main">
    <h1>Equipo administrador</h1>
    <p id="status" role="status" aria-live="polite">Cargando equipo…</p>
    <section id="team" hidden>
      <div class="team-bar"><p>Estas cuentas pueden administrar módulos y editar el equipo.</p><button id="add" class="team-primary">Añadir cuenta</button></div>
      <div id="people"></div>
    </section>
    <dialog id="editor" aria-labelledby="editor-title">
      <form id="form">
        <h2 id="editor-title">Añadir cuenta</h2>
        <label>Nombre<input name="name" required maxlength="120" autocomplete="off"></label>
        <label>Correo electrónico<input name="email" type="email" required maxlength="190" autocomplete="off"></label>
        <label id="password-label">Contraseña<input name="password" type="password" minlength="8" autocomplete="new-password"></label>
        <small id="password-help">Usa al menos 8 caracteres.</small>
        <p id="error" role="alert"></p>
        <div class="team-actions"><button type="button" id="cancel">Cancelar</button><button class="team-primary" type="submit">Guardar</button></div>
      </form>
    </dialog>
    <dialog id="confirmation" aria-labelledby="delete-title">
      <h2 id="delete-title">Eliminar cuenta</h2><p id="delete-message"></p>
      <div class="team-actions"><button id="keep">Cancelar</button><button id="delete" class="team-danger">Eliminar</button></div>
    </dialog>
    <noscript>Activa JavaScript para administrar el equipo.</noscript>
  </main>
</body>
</html>
