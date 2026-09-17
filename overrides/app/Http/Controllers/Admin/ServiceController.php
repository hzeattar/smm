<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Service;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ServiceController extends Controller
{
    use MainTrait;

    private const CUSTOMER_HIDDEN_FIELDS = [
        'api_provider_id',
        'api_provider_service_id',
        'api_provider_rate',
        'api_provider_error',
        'api_provider_payload',
    ];

    public function index(Request $request)
    {
        $isAdmin = Auth::guard('admin')->check();
        $categories = Category::orderBy('sort', 'desc')->get();
        $permissions = $this->getPermissions('services');

        $query = Service::with(['category'])->orderBy('id', 'desc');

        if ($request->filled('api_provider') && $isAdmin) {
            $query->where('api_provider_id', (int) $request->input('api_provider'));
        }

        if (!$isAdmin) {
            $query->where('status', 'active');
        }

        if ($request->filled('search')) {
            $search = '%' . trim((string) $request->input('search')) . '%';
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', $search)
                    ->orWhere('id', trim($search, '%'));
            });
        }

        if ($request->api) {
            $services = $query->paginate();
            if (!$isAdmin) {
                collect($services->items())->each(function ($service) {
                    $service->makeHidden(self::CUSTOMER_HIDDEN_FIELDS);
                });
            }

            return response()->json(compact('permissions', 'services'), 200);
        }

        return view('admin.services', compact('categories'));
    }

    public function store(Request $request)
    {
        abort_unless(Auth::guard('admin')->check(), 403);
        $service = Service::create($request->all());
        return response()->json($service, 200);
    }

    public function show($id)
    {
        $isAdmin = Auth::guard('admin')->check();

        if ($isAdmin) {
            $service = Service::with(['apiProvider'])->where('id', $id)->firstOrFail();
            return response()->json($service, 200);
        }

        $service = Service::with(['category'])
            ->where('id', $id)
            ->where('status', 'active')
            ->firstOrFail();
        $service->makeHidden(self::CUSTOMER_HIDDEN_FIELDS);

        return response()->json($service, 200);
    }

    public function update(Request $request, $id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);
        $service = Service::where('id', $id)->firstOrFail();
        $service->update($request->all());
        return response()->json($service, 200);
    }

    public function destroy($id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);
        $service = Service::where('id', $id)->firstOrFail();
        return response()->json($service->delete(), 200);
    }
}
