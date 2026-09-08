<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$required = ['admins', 'settings', 'languages', 'language_values'];

$ready = function () use ($required): bool {
    foreach ($required as $table) {
        if (!Schema::hasTable($table) || !DB::table($table)->exists()) {
            return false;
        }
    }
    return true;
};

if ($ready()) {
    fwrite(STDOUT, "Initial data already present; resilient seed skipped.\n");
    exit(0);
}

$file = base_path('database/init/init.sql');
if (!is_file($file)) {
    fwrite(STDERR, "Initial seed file not found.\n");
    exit(2);
}

$lines = file($file, FILE_IGNORE_NEW_LINES);
$applied = 0;
$skipped = 0;
$failed = 0;

foreach ($lines as $line) {
    $statement = trim($line);
    if ($statement === '' || stripos($statement, 'INSERT INTO ') !== 0) {
        continue;
    }

    $table = 'unknown';
    if (preg_match('/^INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?/i', $statement, $m)) {
        $table = $m[1];
    }

    $statement = preg_replace('/^INSERT\s+INTO/i', 'INSERT IGNORE INTO', $statement, 1);

    try {
        DB::unprepared($statement);
        $applied++;
    } catch (Throwable $e) {
        $failed++;
        fwrite(STDERR, "Seed statement skipped for table {$table}: " . get_class($e) . "\n");
        continue;
    }
}

foreach ($required as $table) {
    if (!Schema::hasTable($table) || !DB::table($table)->exists()) {
        fwrite(STDERR, "Required seed table is still empty: {$table}\n");
        exit(3);
    }
}

fwrite(STDOUT, "Resilient seed complete. Applied={$applied}; Failed={$failed}; Skipped={$skipped}\n");
exit(0);
