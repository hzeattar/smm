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
use Throwable;

class OrderController extends Controller
{
    use MainTrait;

    private const ORDER_STATUSES = [
        'pending',
        'processing',
        'in progress',
        'completed',
        'partial',
        'refunded',
        'awaiting',
        'error',
    ];

    public function index(Request $request)
    {
        $isAdmin = Auth::guard('admin')->check();

        $query = Order::with(['user', 'service', 'service.apiProvider', 'service.category'])
            ->orderBy('id', 'desc');

        if (!$isAdmin) {
            $query->where('user_id', (int) Auth::id());
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('link', 'like', '%' . $search . '%')
                    ->orWhere('status', 'like', '%' . $search . '%')
                    ->orWhere('id', $search);
            });
        }

        $orders = $query->paginate();
        $permissions = $this->getPermissions('orders');

        if ($request->api) {
            return response()->json(compact('permissions', 'orders'), 200);
        }

        $categories = Category::where('status', 'active')->orderBy('id', 'desc')->get();
        $services = Service::where('status', 'active')->orderBy('id', 'desc')->get();

        return view('admin.orders', compact('orders', 'categories', 'services'));
    }

    public function store(Request $request)
    {
        $rules = [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'link' => ['required', 'string', 'max:2048'],
            'details' => ['nullable', 'string'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'runs' => ['nullable', 'integer', 'min:1'],
            'interval' => ['nullable', 'integer', 'min:0'],
            'comments' => ['nullable', 'string'],
        ];

        $isAdmin = Auth::guard('admin')->check();
        if ($isAdmin) {
            $rules['user_id'] = ['required', 'integer', 'exists:users,id'];
        }

        $data = $request->validate($rules);
        $service = Service::with('apiProvider')->findOrFail((int) $data['service_id']);

        if ($service->status !== 'active') {
            throw ValidationException::withMessages([
                'service_id' => ['هذه الخدمة غير متاحة حاليًا.'],
            ]);
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
            throw ValidationException::withMessages([
                'service_id' => ['سعر الخدمة غير صالح.'],
            ]);
        }

        if ($service->type === 'api') {
            $provider = $service->apiProvider;
            if (!$provider || $provider->status !== 'active') {
                return response()->json(['message' => 'مزود الخدمة غير متاح حاليًا.'], 422);
            }
            if ((int) $service->api_provider_service_id <= 0) {
                return response()->json(['message' => 'الخدمة غير مرتبطة بخدمة صحيحة لدى المزود.'], 422);
            }
        }

        try {
            // Persist the local order and debit exactly once before contacting the provider.
            // Provider I/O is deliberately outside this transaction so a DB deadlock retry can
            // never submit the same paid order to the provider twice.
            $order = DB::transaction(function () use ($data, $service, $userId, $quantity, $total) {
                $user = User::where('id', $userId)->lockForUpdate()->firstOrFail();
                if ((float) $user->funds + 0.0000001 < $total) {
                    throw new RuntimeException('INSUFFICIENT_BALANCE');
                }

                $now = date('Y-m-d H:i:s');
                $orderId = DB::table('orders')->insertGetId([
                    'user_id' => $userId,
                    'service_id' => (int) $service->id,
                    'order_api_id' => null,
                    'api_provider_error' => $service->type === 'api' ? 'DISPATCH_PENDING' : null,
                    'quantity' => $quantity,
                    'link' => (string) $data['link'],
                    'total' => $total,
                    'details' => (string) ($data['details'] ?? ''),
                    'notes' => $data['notes'] ?? null,
                    'status' => $service->type === 'api' ? 'processing' : 'pending',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $user->funds = round((float) $user->funds - $total, 4);
                $user->save();

                return Order::with(['service', 'service.apiProvider', 'service.category', 'user'])->findOrFail($orderId);
            });
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'INSUFFICIENT_BALANCE') {
                return response()->json(['message' => 'الرصيد غير كافٍ لإتمام الطلب.'], 422);
            }
            throw $e;
        }

        if ($service->type !== 'api') {
            return response()->json($order, 200);
        }

        try {
            $provider = $service->apiProvider;
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
                $order->update([
                    'order_api_id' => $remoteOrderId,
                    'api_provider_error' => null,
                    'status' => 'pending',
                ]);

                return response()->json($order->fresh(['service', 'service.apiProvider', 'service.category', 'user']), 200);
            }

            $providerError = isset($remote['error'])
                ? (string) $remote['error']
                : 'Provider rejected order without an order id.';

            $this->refundRejectedOrder($order->id, $providerError);

            return response()->json([
                'message' => 'تعذر إرسال الطلب إلى مزود الخدمة وتمت إعادة المبلغ إلى الرصيد.',
                'provider_error' => mb_substr($providerError, 0, 180),
            ], 422);
        } catch (Throwable $e) {
            // A transport/HTTP failure can happen after the provider accepted the order but before
            // we received its id. Do not retry or auto-refund such an uncertain dispatch: either
            // action could create a duplicate/free provider order. Keep a durable local record for
            // admin reconciliation instead.
            Order::where('id', $order->id)->update([
                'status' => 'error',
                'api_provider_error' => mb_substr(
                    'DISPATCH_UNCERTAIN:' . get_class($e) . ':' . $e->getMessage(),
                    0,
                    250
                ),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            report($e);

            return response()->json([
                'message' => 'تعذر تأكيد نتيجة الطلب لدى المزود. تم حفظ الطلب للمراجعة ولن تتم إعادة إرساله تلقائيًا حتى لا يتكرر.',
                'order_id' => (int) $order->id,
            ], 503);
        }
    }

    private function refundRejectedOrder(int $orderId, string $providerError): void
    {
        DB::transaction(function () use ($orderId, $providerError) {
            $order = Order::where('id', $orderId)->lockForUpdate()->firstOrFail();

            // Idempotent refund: only a provider-rejected order with no remote id can be refunded here.
            if ($order->order_api_id || $order->status === 'refunded') {
                return;
            }

            $user = User::where('id', $order->user_id)->lockForUpdate()->firstOrFail();
            $user->funds = round((float) $user->funds + (float) $order->total, 4);
            $user->save();

            $order->update([
                'status' => 'refunded',
                'api_provider_error' => mb_substr($providerError, 0, 250),
            ]);
        });
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
        $query = Order::with(['service', 'service.category', 'user'])->where('id', $id);
        if (!Auth::guard('admin')->check()) {
            $query->where('user_id', (int) Auth::id());
        }

        $order = $query->firstOrFail()->toArray();
        $order['category_id'] = $order['service']['category_id'];

        return response()->json($order, 200);
    }

    public function update(Request $request, $id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);

        $data = $request->validate([
            'status' => ['sometimes', 'in:' . implode(',', self::ORDER_STATUSES)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $order = Order::where('id', $id)->firstOrFail();
        $order->update($data);

        return response()->json($order->fresh(), 200);
    }

    public function destroy($id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);

        $order = Order::findOrFail($id);
        $order->delete();

        return response()->json(true, 200);
    }

    public function getServices($category_id)
    {
        $services = Service::where('category_id', $category_id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        return response()->json($services, 200);
    }
}
