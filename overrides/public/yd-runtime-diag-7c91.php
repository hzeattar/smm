<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$result = [
    'php' => PHP_VERSION,
    'bootstrap' => 'pending',
    'database' => 'pending',
    'home_render' => 'pending',
];

$cleanError = static function (Throwable $e): array {
    return [
        'class' => get_class($e),
        'message' => mb_substr($e->getMessage(), 0, 500),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
    ];
};

try {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    $result['bootstrap'] = 'ok';

    try {
        $tables = ['users','admins','orders','services','categories','settings','languages','language_values','faqs'];
        $state = [];
        foreach ($tables as $table) {
            $state[$table] = Illuminate\Support\Facades\Schema::hasTable($table);
        }
        $result['database'] = 'ok';
        $result['tables'] = $state;
        $result['counts'] = [
            'settings' => $state['settings'] ? Illuminate\Support\Facades\DB::table('settings')->count() : null,
            'languages' => $state['languages'] ? Illuminate\Support\Facades\DB::table('languages')->count() : null,
            'language_values' => $state['language_values'] ? Illuminate\Support\Facades\DB::table('language_values')->count() : null,
            'faqs' => $state['faqs'] ? Illuminate\Support\Facades\DB::table('faqs')->count() : null,
            'services' => $state['services'] ? Illuminate\Support\Facades\DB::table('services')->count() : null,
        ];
    } catch (Throwable $e) {
        $result['database'] = 'error';
        $result['database_error'] = $cleanError($e);
    }

    try {
        $faqs = App\Models\Faq::where('status', 'active')->orderBy('sort', 'asc')->get();
        $html = view('web.index', compact('faqs'))->render();
        $result['home_render'] = 'ok';
        $result['home_bytes'] = strlen($html);
    } catch (Throwable $e) {
        $result['home_render'] = 'error';
        $result['home_error'] = $cleanError($e);
    }
} catch (Throwable $e) {
    $result['bootstrap'] = 'error';
    $result['bootstrap_error'] = $cleanError($e);
}

http_response_code(200);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
