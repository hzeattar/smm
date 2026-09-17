<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

if (!Schema::hasTable('tickets')) {
    fwrite(STDERR, "Tickets table is missing; cannot prepare persistent ticket attachments.\n");
    exit(1);
}

if (!Schema::hasTable('yellow_duck_ticket_attachments')) {
    DB::statement(<<<'SQL'
CREATE TABLE `yellow_duck_ticket_attachments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` BIGINT UNSIGNED NOT NULL,
  `filename` VARCHAR(191) NOT NULL,
  `mime` VARCHAR(100) NOT NULL,
  `size_bytes` INT UNSIGNED NOT NULL DEFAULT 0,
  `data` MEDIUMBLOB NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `yd_ticket_attachment_ticket_unique` (`ticket_id`),
  KEY `yd_ticket_attachment_filename_idx` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
    );
    fwrite(STDOUT, "Created yellow_duck_ticket_attachments table.\n");
} else {
    fwrite(STDOUT, "Ticket attachment storage ready.\n");
}
