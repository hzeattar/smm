<?php

$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: '3306';
$db   = getenv('DB_DATABASE');
$user = getenv('DB_USERNAME');
$pass = getenv('DB_PASSWORD');

if (!$host || !$db || !$user) {
    fwrite(STDERR, "Session table bootstrap skipped: database configuration incomplete.\n");
    exit(2);
}

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5,
        ]
    );

    $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
    );

    // Older deployments created payload as TEXT. Browser POSTs can carry a larger
    // serialized session after validation/flash data, so make the live schema robust
    // instead of relying on CREATE TABLE IF NOT EXISTS to leave an old column unchanged.
    $pdo->exec("ALTER TABLE `sessions` MODIFY `payload` MEDIUMTEXT COLLATE utf8mb4_unicode_ci NOT NULL");

    $stmt = $pdo->query("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'payload' LIMIT 1");
    $payloadType = strtolower((string) $stmt->fetchColumn());
    if ($payloadType !== 'mediumtext' && $payloadType !== 'longtext') {
        throw new RuntimeException('Session payload column is not MEDIUMTEXT/LONGTEXT after bootstrap: ' . $payloadType);
    }

    fwrite(STDOUT, "Persistent session table ready. Payload={$payloadType}.\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Session table bootstrap failed: ".$e->getMessage()."\n");
    exit(3);
}
