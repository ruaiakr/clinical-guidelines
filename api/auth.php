<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_response([
        'authenticated' => !empty($_SESSION['admin_authenticated']),
    ]);
}

if ($method === 'POST') {
    $payload = read_json_body();
    $password = trim((string)($payload['password'] ?? ''));
    $expected = trim((string)$config['admin_password']);

    if ($password === '' || !hash_equals($expected, $password)) {
        json_response(['error' => 'Invalid password'], 401);
    }

    $_SESSION['admin_authenticated'] = true;
    json_response(['authenticated' => true]);
}

if ($method === 'DELETE') {
    $_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    json_response(['authenticated' => false]);
}

json_response(['error' => 'Method not allowed'], 405);
