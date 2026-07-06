<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$docsRoot = realpath(__DIR__ . '/../docs');

if ($docsRoot === false) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Docs directory not found']);
    exit;
}

session_start();

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $config['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_auth(): void
{
    if (empty($_SESSION['admin_authenticated'])) {
        json_response(['error' => 'Unauthorized'], 401);
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function normalize_doc_path(string $path): string
{
    $path = str_replace('\\', '/', $path);
    $path = ltrim($path, '/');

    if (!str_ends_with(strtolower($path), '.md')) {
        $path .= '.md';
    }

    return $path;
}

function resolve_doc_path(string $relativePath): ?string
{
    global $docsRoot;

    $relativePath = normalize_doc_path($relativePath);
    $fullPath = $docsRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
    $realPath = realpath($fullPath);

    if ($realPath === false) {
        $parentDir = dirname($fullPath);
        if (!is_dir($parentDir)) {
            return null;
        }

        if (!str_starts_with(realpath($parentDir) ?: '', $docsRoot)) {
            return null;
        }

        return $fullPath;
    }

    if (!str_starts_with($realPath, $docsRoot)) {
        return null;
    }

    if (!str_ends_with(strtolower($realPath), '.md')) {
        return null;
    }

    return $realPath;
}

function parse_frontmatter(string $content): array
{
    if (!preg_match('/^---\r?\n(.*?)\r?\n---\r?\n/s', $content, $matches)) {
        return ['meta' => [], 'body' => $content];
    }

    $meta = [];
    foreach (preg_split('/\r?\n/', $matches[1]) as $line) {
        if (preg_match('/^([A-Za-z0-9_-]+):\s*(.*)$/', trim($line), $parts)) {
            $meta[$parts[1]] = trim($parts[2], " \t\"'");
        }
    }

    $body = substr($content, strlen($matches[0]));
    return ['meta' => $meta, 'body' => $body];
}

function build_markdown(array $meta, string $body): string
{
    $lines = ["---"];
    foreach ($meta as $key => $value) {
        if ($value === '') {
            continue;
        }
        $lines[] = $key . ': ' . $value;
    }
    $lines[] = '---';
    $lines[] = '';
    return implode("\n", $lines) . ltrim($body);
}

function list_chapters(): array
{
    global $docsRoot;

    $chapters = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($docsRoot, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile() || strtolower($fileInfo->getExtension()) !== 'md') {
            continue;
        }

        $fullPath = $fileInfo->getPathname();
        $relativePath = str_replace('\\', '/', substr($fullPath, strlen($docsRoot) + 1));
        $content = file_get_contents($fullPath);
        $parsed = parse_frontmatter($content ?: '');
        $category = dirname($relativePath);
        if ($category === '.') {
            $category = 'General';
        }

        $chapters[] = [
            'path' => $relativePath,
            'id' => preg_replace('/\.md$/i', '', $relativePath),
            'title' => $parsed['meta']['title'] ?? derive_title_from_body($parsed['body']),
            'category' => str_replace('/', ' / ', $category),
            'sidebar_position' => $parsed['meta']['sidebar_position'] ?? '',
            'modified' => gmdate('c', $fileInfo->getMTime()),
        ];
    }

    usort($chapters, static function (array $a, array $b): int {
        return [$a['category'], $a['title']] <=> [$b['category'], $b['title']];
    });

    return $chapters;
}

function derive_title_from_body(string $body): string
{
    if (preg_match('/^#\s+(.+)$/m', $body, $matches)) {
        return trim($matches[1]);
    }

    return 'Untitled chapter';
}

function backup_chapter(string $fullPath): void
{
    $backupDir = __DIR__ . '/backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0775, true);
    }

    $relative = str_replace(['/', '\\'], '__', basename(dirname($fullPath)) . '__' . basename($fullPath));
    $target = $backupDir . '/' . date('Ymd-His') . '__' . $relative;
    copy($fullPath, $target);
}
