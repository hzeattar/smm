<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

try {
    if (!Schema::hasTable('yellow_duck_ticket_attachments')) {
        Schema::create('yellow_duck_ticket_attachments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('ticket_id')->index();
            $table->string('filename', 191)->unique();
            $table->string('original_name', 191);
            $table->string('mime', 100);
            $table->mediumBlob('data');
            $table->timestamps();
        });
        fwrite(STDOUT, "Created yellow_duck_ticket_attachments table.\n");
    } else {
        fwrite(STDOUT, "Ticket attachment table already exists.\n");
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Ticket attachment table setup failed: ' . get_class($e) . ': ' . $e->getMessage() . "\n");
    exit(1);
}
