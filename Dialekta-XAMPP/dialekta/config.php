<?php
declare(strict_types=1);

// Valores predeterminados de XAMPP. Ajusta el puerto si MySQL usa otro.
return [
    'host' => getenv('DIALEKTA_DB_HOST') ?: '127.0.0.1',
    'port' => (int)(getenv('DIALEKTA_DB_PORT') ?: 3307),
    'database' => getenv('DIALEKTA_DB_NAME') ?: 'dialekta',
    'username' => getenv('DIALEKTA_DB_USER') ?: 'root',
    'password' => getenv('DIALEKTA_DB_PASSWORD') ?: '',
    'local_recovery' => true,
];
