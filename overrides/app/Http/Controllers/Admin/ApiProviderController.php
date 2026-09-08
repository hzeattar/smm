<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApiProvider;
use App\Models\Service;
use App\Services\SmmFansFasterClient;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ApiProviderController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $api_providers = ApiProvider::orderBy('id','desc')->paginate();
        if ($request->api) {
            if (isset($request->search)) {
                $api_providers = $this->filter([
                    'table' => 'api_providers',
                    'class' => ApiProvider::class,
                    'search' => $request->search,
                ]);
            }
            return response()->json($api_providers, 200);
        }
        return view('admin.api_providers', compact('api_providers'));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $provider = ApiProvider::create($data);
        $result = $this->syncProviderServices($provider);
        return response()->json(['provider' => $provider->fresh(), 'sync' => $result], 200);
    }

    public function show($id)
    {
        return response()->json(ApiProvider::findOrFail($id), 200);
    }

    public function update(Request $request, $id)
    {
        $provider = ApiProvider::findOrFail($id);
        $provider->update($this->validated($request, true));
        $result = $this->syncProviderServices($provider->fresh());
        return response()->json(['provider' => $provider->fresh(), 'sync' => $result], 200);
    }

    public function destroy($id)
    {
        $provider = ApiProvider::findOrFail($id);
        $provider->update(['status' => 'deactive']);
        Service::where('api_provider_id', $provider->id)->update(['status' => 'deactive']);
        $provider->delete();
        return response()->json(true, 200);
    }

    public function syncServices($id)
    {
        $provider = ApiProvider::findOrFail($id);
        return response()->json($this->syncProviderServices($provider), 200);
    }

    public function getApiServiceProviderData(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'url' => ['required','url'],
            'key' => ['required','string'],
            'action' => ['required','string'],
        ]);
        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        try {
            $client = new SmmFansFasterClient($request->input('url'), $request->input('key'));
            if ($request->input('action') === 'balance') {
                return response()->json($client->balance(), 200);
            }
            return response()->json($client->services(), 200);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'provider_unreachable'], 422);
        }
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $prefix = $partial ? 'sometimes|' : '';
        return $request->validate([
            'name' => [$partial ? 'sometimes' : 'required','string','max:255'],
            'url' => [$partial ? 'sometimes' : 'required','url','max:255'],
            'api_key' => [$partial ? 'sometimes' : 'required','string','max:255'],
            'percentage_increase' => [$partial ? 'sometimes' : 'required','numeric','min:0','max:1000'],
            'status' => [$partial ? 'sometimes' : 'required','in:active,deactive'],
            'notes' => ['nullable','string','max:2000'],
        ]);
    }

    private function syncProviderServices(ApiProvider $provider): array
    {
        try {
            $client = new SmmFansFasterClient((string) $provider->url, (string) $provider->api_key);
            $remoteServices = $client->services();
            $balance = $client->balance();
            $now = date('Y-m-d H:i:s');
            $seen = [];
            $active = 0;
            $unsupported = 0;
            $simpleTypes = ['default','package'];
            $margin = max(0, (float) $provider->percentage_increase);

            foreach ($remoteServices as $remote) {
                if (!is_array($remote) || !isset($remote['service'],$remote['name'],$remote['category'],$remote['rate'],$remote['min'],$remote['max'])) {
                    continue;
                }

                $remoteId = (int) $remote['service'];
                if ($remoteId <= 0) {
                    continue;
                }
                $seen[] = $remoteId;

                $categoryName = trim((string) $remote['category']) ?: 'Other';
                $category = DB::table('categories')->where('name', $categoryName)->first();
                if ($category) {
                    $categoryId = (int) $category->id;
                } else {
                    $categoryId = (int) DB::table('categories')->insertGetId([
                        'name' => $categoryName,
                        'status' => 'active',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                $providerType = strtolower(trim((string) ($remote['type'] ?? 'Default')));
                $simple = in_array($providerType, $simpleTypes, true);
                if (!$simple) {
                    $unsupported++;
                }
                $status = ($provider->status === 'active' && $margin > 0 && $simple) ? 'active' : 'deactive';
                if ($status === 'active') {
                    $active++;
                }

                $original = round((float) $remote['rate'], 4);
                $rate = round($original * (1 + $margin / 100), 4);
                $metadata = json_encode([
                    'provider_type' => $remote['type'] ?? 'Default',
                    'refill' => (bool) ($remote['refill'] ?? false),
                    'cancel' => (bool) ($remote['cancel'] ?? false),
                    'simple_order_supported' => $simple,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

                $values = [
                    'category_id' => $categoryId,
                    'api_provider_id' => $provider->id,
                    'api_provider_service_id' => $remoteId,
                    'type' => 'api',
                    'status' => $status,
                    'name' => (string) $remote['name'],
                    'rate' => $rate,
                    'rate_original' => $original,
                    'min' => max(1, (int) $remote['min']),
                    'max' => max(1, (int) $remote['max']),
                    'percentage_increase' => $margin,
                    'description' => $metadata,
                    'updated_at' => $now,
                ];

                $existing = DB::table('services')
                    ->where('api_provider_id', $provider->id)
                    ->where('api_provider_service_id', $remoteId)
                    ->first();

                if ($existing) {
                    DB::table('services')->where('id', $existing->id)->update($values);
                } else {
                    $values['created_at'] = $now;
                    DB::table('services')->insert($values);
                }
            }

            if ($seen !== []) {
                DB::table('services')
                    ->where('api_provider_id', $provider->id)
                    ->whereNotIn('api_provider_service_id', $seen)
                    ->update(['status' => 'deactive', 'updated_at' => $now]);
            }

            $count = Service::where('api_provider_id', $provider->id)->count();
            DB::table('api_providers')->where('id', $provider->id)->update([
                'services_count' => $count,
                'updated_at' => $now,
            ]);

            return [
                'ok' => true,
                'services' => $count,
                'active_services' => $active,
                'unsupported_services' => $unsupported,
                'balance' => $balance['balance'] ?? null,
                'currency' => $balance['currency'] ?? null,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'provider_unreachable'];
        }
    }
}
