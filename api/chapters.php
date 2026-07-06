<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $path = (string)($_GET['path'] ?? '');

    if ($path === '') {
        json_response(['chapters' => list_chapters()]);
    }

    $fullPath = resolve_doc_path($path);
    if ($fullPath === null || !is_file($fullPath)) {
        json_response(['error' => 'Chapter not found'], 404);
    }

    $content = file_get_contents($fullPath) ?: '';
    $parsed = parse_frontmatter($content);
    $relativePath = str_replace('\\', '/', substr($fullPath, strlen($docsRoot) + 1));

    json_response([
        'chapter' => [
            'path' => $relativePath,
            'id' => preg_replace('/\.md$/i', '', $relativePath),
            'title' => $parsed['meta']['title'] ?? derive_title_from_body($parsed['body']),
            'sidebar_position' => $parsed['meta']['sidebar_position'] ?? '',
            'meta' => $parsed['meta'],
            'body' => $parsed['body'],
            'content' => $content,
            'modified' => gmdate('c', filemtime($fullPath)),
        ],
    ]);
}

require_auth();

if ($method === 'PUT' || $method === 'POST') {
    $payload = read_json_body();
    $path = (string)($payload['path'] ?? '');
    $title = trim((string)($payload['title'] ?? ''));
    $body = (string)($payload['body'] ?? '');
    $sidebarPosition = trim((string)($payload['sidebar_position'] ?? ''));

    if ($path === '') {
        json_response(['error' => 'Chapter path is required'], 400);
    }

    $fullPath = resolve_doc_path($path);
    if ($fullPath === null) {
        json_response(['error' => 'Invalid chapter path'], 400);
    }

    if (is_file($fullPath)) {
        backup_chapter($fullPath);
    }

    $meta = [];
    if ($sidebarPosition !== '') {
        $meta['sidebar_position'] = $sidebarPosition;
    }
    if ($title !== '') {
        $meta['title'] = $title;
    } elseif (is_file($fullPath)) {
        $existing = parse_frontmatter(file_get_contents($fullPath) ?: '');
        $meta = array_merge($existing['meta'], $meta);
    }

    if (!preg_match('/^#\s+/m', $body) && $title !== '') {
        $body = "# {$title}\n\n" . ltrim($body);
    }

    $markdown = build_markdown($meta, $body);
    $directory = dirname($fullPath);
    if (!is_dir($directory)) {
        mkdir($directory, 0775, true);
    }

    if (file_put_contents($fullPath, $markdown) === false) {
        json_response(['error' => 'Unable to save chapter'], 500);
    }

    $relativePath = str_replace('\\', '/', substr($fullPath, strlen($docsRoot) + 1));
    json_response([
        'success' => true,
        'chapter' => [
            'path' => $relativePath,
            'id' => preg_replace('/\.md$/i', '', $relativePath),
            'title' => $title !== '' ? $title : derive_title_from_body($body),
            'modified' => gmdate('c', filemtime($fullPath)),
        ],
        'rebuild_required' => true,
    ]);
}

json_response(['error' => 'Method not allowed'], 405);
