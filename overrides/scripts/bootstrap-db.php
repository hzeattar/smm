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

$applied = 0;
$failed = 0;

if (!$ready()) {
    $file = base_path('database/init/init.sql');
    if (!is_file($file)) {
        fwrite(STDERR, "Initial seed file not found.\n");
        exit(2);
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES);
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
        }
    }
}

foreach ($required as $table) {
    if (!Schema::hasTable($table) || !DB::table($table)->exists()) {
        fwrite(STDERR, "Required seed table is still empty: {$table}\n");
        exit(3);
    }
}

$now = date('Y-m-d H:i:s');

// Known owner accounts. Passwords are stored only as bcrypt hashes in source.
if (Schema::hasTable('admins')) {
    DB::table('admins')->updateOrInsert(
        ['email' => 'admin@yellowduck.app'],
        [
            'username' => 'yellowduck_admin',
            'firstname' => 'Yellow Duck',
            'lastname' => 'Admin',
            'avatar' => 'avatar.jpg',
            'status' => 'active',
            'password' => '$2y$12$.t2EhRvjw5JLarrm7X8SBeLxnVndC4/grebvp4SJkPJ2qpI9/aNYy',
            'remember_token' => null,
            'updated_at' => $now,
            'created_at' => $now,
        ]
    );

    // Disable the publicly-known demo admin shipped by the upstream seed.
    DB::table('admins')
        ->where('email', 'admin@admin.com')
        ->orWhere(function ($q) {
            $q->where('username', 'admin')->where('email', '!=', 'admin@yellowduck.app');
        })
        ->update(['status' => 'deactive', 'updated_at' => $now]);
}

if (Schema::hasTable('users')) {
    DB::table('users')->updateOrInsert(
        ['email' => 'user@yellowduck.app'],
        [
            'username' => 'yellowduck_user',
            'firstname' => 'Yellow Duck',
            'lastname' => 'User',
            'avatar' => 'avatar.jpg',
            'status' => 'active',
            'email_verified_at' => $now,
            'notes' => null,
            'phone' => null,
            'address' => null,
            'password' => '$2y$12$i2RtWRVNZODO/Jan4.dipOmHDp99541zsstGV2OQW3bkxuwiCf7ly',
            'stripe_token' => null,
            'stripe_id' => null,
            'funds' => 0,
            'remember_token' => null,
            'updated_at' => $now,
            'created_at' => $now,
        ]
    );
}

fwrite(STDOUT, "Database bootstrap complete. SeedApplied={$applied}; SeedFailed={$failed}; OwnerAccounts=ready\n");
exit(0);
