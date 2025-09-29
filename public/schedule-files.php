<?php
// Minimal helper to list and serve CSV files stored in storage/app/private
// Usage:
//  - /schedule-files.php?action=list     -> returns JSON array of basenames
//  - /schedule-files.php?file=NAME.csv    -> returns raw file contents

declare(strict_types=1);

$base = __DIR__ . '/../storage/app/private';
if (!is_dir($base)) {
    http_response_code(500);
    echo json_encode(['error' => 'storage path not found']);
    exit;
}

function safe_basename(string $s): string {
    // allow only simple filename chars
    return preg_replace('/[^A-Za-z0-9_\-\.]/', '', $s);
}

if (isset($_GET['action']) && $_GET['action'] === 'list') {
    $files = [];
    $it = new DirectoryIterator($base);
    foreach ($it as $f) {
        if ($f->isFile()) {
            $name = $f->getFilename();
            if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'csv') {
                $files[] = $name;
            }
        }
    }
    header('Content-Type: application/json');
    echo json_encode($files);
    exit;
}

if (isset($_GET['file'])) {
    $fn = safe_basename((string)$_GET['file']);
    if ($fn === '') { http_response_code(400); echo 'Invalid file'; exit; }
    $path = $base . DIRECTORY_SEPARATOR . $fn;
    // ensure file inside base
    $real = realpath($path);
    if ($real === false || strpos($real, realpath($base)) !== 0) {
        http_response_code(404); echo 'Not found'; exit;
    }
    if (!is_file($real) || !is_readable($real)) { http_response_code(404); echo 'Not found'; exit; }
    header('Content-Type: text/csv');
    readfile($real);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'invalid request']);
