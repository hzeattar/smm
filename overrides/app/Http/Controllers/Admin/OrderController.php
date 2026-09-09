<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Services\SmmFansFasterClient;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class OrderController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $orders = Order::with(['user','service','service.apiProvider','service.category'])->orderBy('id','desc')->paginate();
        $permissions = $this->getPermissions('orders');

        if ($request->api) {
            if (isset($request->search)) {
                $orders = $this->filter([
                    'table' => 'orders',
                    'class' => Order::class,
                    'tables' => ['users','services','api_providers','categories'],
                    'with' => ['user','service','service.apiProvider','service.category'],
                    'search' => $request->search,
                ]);
            }
            return response()->json(compact('permissions','orders'), 200);
        }

        $categories = Category::where('status','active')->orderBy('id','desc')->get();
        $services = Service::where('status','active')->orderBy('id','desc')->get();
        return view('admin.orders', compact('orders','categories','services'));
    }

    public function store(Request $request)
    {
        $rules = [
            'service_id' => ['required','integer','exists:services,id'],
            'quantity' => ['required','integer','min:1'],
            'link' => ['required','string','max:2048'],
            'details' => ['nullable','string'],
            'notes' => ['nullable','string','max:5000'],
            'runs' => ['nullable','integer','min:1'],
            'interval' => ['nullable','integer','min:0'],
            'comments' => ['nullable','string'],
        ];

        $isAdmin = Auth::guard('admin')->check();
        if ($isAdmin) {
            $rules['user_id'] = ['required','integer','exists:users,id'];
        }

        $data = $request->validate($rules);
        $service = Service::with('apiProvider')->findOrFail((int) $data['service_id']);

        if ($service->status !== 'active') {
            throw ValidationException::withMessages(['service_id' => ['هذه الخدمة غير متاحة حاليًا.']]);
        }

        $quantity = (int) $data['quantity'];
        if ($quantity < (int) $service->min || $quantity > (int) $service->max) {
            throw ValidationException::withMessages([
                'quantity' => [sprintf('الكمية يجب أن تكون بين %d و %d.', (int) $service->min, (int) $service->max)],
            ]);
        }

        $userId = $isAdmin ? (int) $data['user_id'] : (int) Auth::id();
        if ($userId <= 0) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $rate = (float) $service->rate;
        $total = round(($quantity * $rate) / 1000, 4);
        if ($total <= 0) {
            throw ValidationException::withMessages(['service_id' => ['سعر الخدمة غير صالح.']]);
        }

        try {
            $order = DB::transaction(function () use ($data, $service, $userId, $quantity, $total) {
                $user = User::where('id', $userId)->lockForUpdate()->firstOrFail();
                if ((float) $user->funds + 0.0000001 < $total) {
                    throw new RuntimeException('INSUFFICIENT_BALANCE');
                }

                $remoteOrderId = null;
                $providerError = null;

                if ($service->type === 'api') {
                    $provider = $service->apiProvider;
                    if (!$provider || $provider->status !== 'active') {
                        throw new RuntimeException('PROVIDER_INACTIVE');
                    }

                    $client = new SmmFansFasterClient((string) $provider->url, (string) $provider->api_key);
                    $remote = $client->addOrder(
                        (int) $service->api_provider_service_id,
                        (string) $data['link'],
                        $quantity,
                        [
                            'runs' => $data['runs'] ?? null,
                            'interval' => $data['interval'] ?? null,
                            'comments' => $data['comments'] ?? null,
                        ]
                    );

                    if (!empty($remote['order'])) {
                        $remoteOrderId = (int) $remote['order'];
                    } else {
                        $providerError = isset($remote['error']) ? (string) $remote['error'] : 'Provider rejected order';
                        throw new RuntimeException('PROVIDER_ERROR:' . mb_substr($providerError, 0, 180));
                    }
                }

                $now = date('Y-m-d H:i:s');
                $orderId = DB::table('orders')->insertGetId([
                    'user_id' => $userId,
                    'service_id' => (int) $service->id,
                    'order_api_id' => $remoteOrderId,
                    'api_provider_error' => $providerError,
                    'quantity' => $quantity,
                    'link' => (string) $data['link'],
                    'total' => $total,
                    'details' => (string) ($data['details'] ?? ''),
                    'notes' => $data['notes'] ?? null,
                    'status' => 'pending',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $user->funds = round((float) $user->funds - $total, 4);
                $user->save();

                return Order::with(['service','service.apiProvider','service.category','user'])->find($orderId);
            }, 3);

            return response()->json($order, 200);
        } catch (RuntimeException $e) {
            $message = $e->getMessage();
            if ($message === 'INSUFFICIENT_BALANCE') {
                return response()->json(['message' => 'الرصيد غير كافٍ لإتمام الطلب.'], 422);
            }
            if ($message === 'PROVIDER_INACTIVE') {
                return response()->json(['message' => 'مزود الخدمة غير متاح حاليًا.'], 422);
            }
            if (str_starts_with($message, 'PROVIDER_ERROR:')) {
                return response()->json(['message' => 'تعذر إرسال الطلب إلى مزود الخدمة.', 'provider_error' => substr($message, 15)], 422);
            }
            throw $e;
        }
    }

    public function checkBalance($order)
    {
        $service = Service::find($order['service_id'] ?? null);
        if (!$service || !Auth::check()) {
            return false;
        }
        $total = ((int) ($order['quantity'] ?? 0) * (float) $service->rate) / 1000;
        return (float) Auth::user()->funds >= $total;
    }

    public function discountBalance($order)
    {
        // Kept for backwards compatibility. New order creation performs an atomic debit in store().
        return true;
    }

    public function show($id)
    {
        $order = Order::with(['service','service.category','user'])->where('id',$id)->firstOrFail()->toArray();
        $order['category_id'] = $order['service']['category_id'];
        return response()->json($order, 200);
    }

    public function update(Request $request, $id)
    {
        $order = Order::where('id',$id)->firstOrFail();
        $allowed = $request->only(['status','notes']);
        $order->update($allowed);
        return response()->json($order, 200);
    }

    public function destroy($id)
    {
        if (!Auth::guard('admin')->check()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $order = Order::findOrFail($id);
        $order->delete();
        return response()->json(true, 200);
    }

    public function getServices($category_id)
    {
        $services = Service::where('category_id',$category_id)->where('status','active')->orderBy('name')->get();
        return response()->json($services, 200);
    }
}
