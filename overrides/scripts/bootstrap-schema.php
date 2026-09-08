<?php

declare(strict_types=1);

$schemaPath = '/opt/smm/schema.sql';
if (!is_file($schemaPath)) {
    fwrite(STDERR, "Pinned schema dump is unavailable.\n");
    exit(2);
}

function pdoFromEnvironment(): PDO
{
    $url = getenv('DATABASE_URL') ?: getenv('MYSQL_URL') ?: '';
    if ($url !== '') {
        $p = parse_url($url);
        if ($p && !empty($p['host'])) {
            $host = $p['host'];
            $port = $p['port'] ?? 3306;
            $db = ltrim($p['path'] ?? '', '/');
            $user = urldecode($p['user'] ?? '');
            $pass = urldecode($p['pass'] ?? '');
            return new PDO(
                "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
                $user,
                $pass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
            );
        }
    }

    $host = getenv('DB_HOST') ?: getenv('MYSQLHOST') ?: '';
    $port = getenv('DB_PORT') ?: getenv('MYSQLPORT') ?: '3306';
    $db = getenv('DB_DATABASE') ?: getenv('MYSQLDATABASE') ?: 'railway';
    $user = getenv('DB_USERNAME') ?: getenv('MYSQLUSER') ?: 'root';
    $pass = getenv('DB_PASSWORD') ?: getenv('MYSQLPASSWORD') ?: '';

    if ($host === '') {
        throw new RuntimeException('Database host is unavailable.');
    }

    return new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
}

try {
    $pdo = pdoFromEnvironment();
    $pdo->exec("SET NAMES utf8mb4");
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
} catch (Throwable $e) {
    fwrite(STDERR, "Schema recovery could not connect to MySQL: " . get_class($e) . "\n");
    exit(3);
}

$sql = file($schemaPath, FILE_IGNORE_NEW_LINES);
if ($sql === false) {
    fwrite(STDERR, "Could not read pinned schema dump.\n");
    exit(4);
}

$collecting = false;
$table = null;
$buffer = [];
$created = 0;
$skipped = 0;
$failed = 0;

$tableExists = static function (PDO $pdo, string $name): bool {
    $stmt = $pdo->prepare('SHOW TABLES LIKE ?');
    $stmt->execute([$name]);
    return (bool) $stmt->fetchColumn();
};

$executeCreate = static function (PDO $pdo, string $table, array $buffer) use ($tableExists, &$created, &$skipped, &$failed): void {
    if ($tableExists($pdo, $table)) {
        $skipped++;
        return;
    }

    $statement = implode("\n", $buffer);
    $statement = preg_replace('/^CREATE TABLE\s+/i', 'CREATE TABLE IF NOT EXISTS ', $statement, 1);

    try {
        $pdo->exec($statement);
        $created++;
        fwrite(STDOUT, "Created schema table: {$table}\n");
    } catch (Throwable $e) {
        $failed++;
        fwrite(STDERR, "Schema table failed: {$table} (" . get_class($e) . ")\n");
    }
};

foreach ($sql as $line) {
    $trim = trim($line);

    if (!$collecting && preg_match('/^CREATE TABLE `([^`]+)` \($/i', $trim, $m)) {
        $collecting = true;
        $table = $m[1];
        $buffer = [$line];
        continue;
    }

    if ($collecting) {
        $buffer[] = $line;
        if (preg_match('/^\)\s+ENGINE=.*;$/i', $trim)) {
            $executeCreate($pdo, (string) $table, $buffer);
            $collecting = false;
            $table = null;
            $buffer = [];
        }
    }
}

try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
} catch (Throwable $e) {
    // Non-fatal; the connection is about to close.
}

$required = ['users', 'admins', 'orders', 'services', 'categories', 'settings', 'languages'];
$missing = [];
foreach ($required as $requiredTable) {
    if (!$tableExists($pdo, $requiredTable)) {
        $missing[] = $requiredTable;
    }
}

if ($missing) {
    fwrite(STDERR, 'Schema recovery is incomplete. Missing required tables: ' . implode(',', $missing) . "\n");
    exit(5);
}

fwrite(STDOUT, "Schema recovery complete. Created={$created}; Skipped={$skipped}; Failed={$failed}\n");
exit(0);
