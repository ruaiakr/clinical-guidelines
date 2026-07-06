<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

json_response([
    'ok' => true,
    'service' => 'clinical-guidelines-admin-api',
    'authenticated' => !empty($_SESSION['admin_authenticated']),
]);
