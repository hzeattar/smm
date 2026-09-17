<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminUserManagementController extends Controller
{
    public function show($id)
    {
        $this->ensureAuditTable();

        $user = User::findOrFail((int) $id);
        $orders = Order::with(['service', 'service.category'])
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        $transactions = Transaction::with('paymentMethod')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        $audits = DB::table('yellow_duck_admin_user_audits')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return view('admin.user_manage', compact('user', 'orders', 'transactions', 'audits'));
    }

    public function updateProfile(Request $request, $id)
    {
        $user = User::findOrFail((int) $id);

        $validated = $request->validate([
            'username' => ['required', 'string', 'max:120', Rule::unique('users', 'username')->ignore($user->id)],
            'firstname' => ['required', 'string', 'max:120'],
            'lastname' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'status' => ['required', Rule::in(['active', 'deactive'])],
            'password' => ['nullable', 'string', 'min:8', 'max:190', 'confirmed'],
        ]);

        $before = [
            'username' => (string) $user->username,
            'firstname' => (string) $user->firstname,
            'lastname' => (string) $user->lastname,
            'email' => (string) $user->email,
            'status' => (string) $user->status,
        ];

        $user->username = $validated['username'];
        $user->firstname = $validated['firstname'];
        $user->lastname = $validated['lastname'];
        $user->email = $validated['email'];
        $user->status = $validated['status'];
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        $this->audit($user->id, 'profile_updated', [
            'before' => $before,
            'after' => [
                'username' => (string) $user->username,
                'firstname' => (string) $user->firstname,
                'lastname' => (string) $user->lastname,
                'email' => (string) $user->email,
                'status' => (string) $user->status,
            ],
            'password_changed' => !empty($validated['password']),
        ]);

        return back()->with('success', 'تم تحديث بيانات العميل بنجاح.');
    }

    public function adjustBalance(Request $request, $id)
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['credit', 'debit'])],
            'amount' => ['required', 'numeric', 'min:0.0001', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $amount = round((float) $validated['amount'], 4);
        $isCredit = $validated['action'] === 'credit';
        $admin = Auth::guard('admin')->user();

        try {
            DB::transaction(function () use ($id, $validated, $amount, $isCredit, $admin) {
                $user = User::where('id', (int) $id)->lockForUpdate()->firstOrFail();
                $before = round((float) $user->funds, 4);

                if (!$isCredit && $before + 0.0000001 < $amount) {
                    throw ValidationException::withMessages([
                        'amount' => ['لا يمكن خصم مبلغ أكبر من الرصيد الحالي للعميل.'],
                    ]);
                }

                $after = round($before + ($isCredit ? $amount : -$amount), 4);
                $user->funds = $after;
                $user->save();

                $method = PaymentMethod::firstOrCreate(
                    ['name' => 'Admin Balance Adjustment'],
                    [
                        'min' => 0,
                        'max' => 1000000,
                        'status' => 'deactive',
                        'fee' => 0,
                        'environment' => 'production',
                        'api_key' => null,
                        'private_key' => 'admin-panel',
                        'client_id' => 'Audited balance adjustments from Yellow Duck admin panel.',
                        'image' => 'admin-credit.svg',
                    ]
                );

                $signed = $isCredit ? $amount : -$amount;
                $reference = 'ADMIN-BAL-' . now()->format('YmdHis') . '-' . $user->id . '-' . strtoupper(bin2hex(random_bytes(2)));
                $now = now()->format('Y-m-d H:i:s');

                DB::table('transactions')->insert([
                    'method_id' => $method->id,
                    'transaction_id' => $reference,
                    'user_id' => $user->id,
                    'amount' => $signed,
                    'fee' => 0,
                    'profit' => $signed,
                    'take_fee' => 0,
                    'status' => 'paid',
                    'notes' => implode("\n", [
                        $isCredit ? 'Admin manual balance credit.' : 'Admin manual balance debit.',
                        'Balance before: $' . number_format($before, 4, '.', ''),
                        'Adjustment: ' . ($isCredit ? '+' : '-') . '$' . number_format($amount, 4, '.', ''),
                        'Balance after: $' . number_format($after, 4, '.', ''),
                        'Admin: ' . ($admin ? (string) $admin->email : 'unknown'),
                        'Note: ' . trim((string) ($validated['note'] ?? '')),
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $this->audit($user->id, $isCredit ? 'balance_credit' : 'balance_debit', [
                    'amount' => $amount,
                    'before' => $before,
                    'after' => $after,
                    'reference' => $reference,
                    'note' => trim((string) ($validated['note'] ?? '')),
                ]);
            }, 1);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('Admin balance adjustment failed', [
                'user_id' => (int) $id,
                'action' => $validated['action'],
                'amount' => $amount,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return back()->withErrors(['amount' => 'تعذر تعديل الرصيد الآن. لم يتم حفظ أي تغيير.']);
        }

        return back()->with('success', $isCredit
            ? 'تمت إضافة $' . number_format($amount, 4) . ' إلى رصيد العميل.'
            : 'تم خصم $' . number_format($amount, 4) . ' من رصيد العميل.');
    }

    public function createOrder(Request $request, $id)
    {
        $user = User::findOrFail((int) $id);

        $request->merge([
            'user_id' => $user->id,
        ]);

        try {
            $response = app(OrderController::class)->store($request);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (Throwable $e) {
            Log::error('Admin create order for user failed', [
                'user_id' => $user->id,
                'service_id' => $request->input('service_id'),
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return back()->withErrors(['order' => 'تعذر إنشاء الطلب الآن. لم يتم إرسال طلب جديد تلقائيًا.'])->withInput();
        }

        $status = method_exists($response, 'getStatusCode') ? (int) $response->getStatusCode() : 500;
        $payload = method_exists($response, 'getData') ? $response->getData(true) : [];

        if ($status >= 200 && $status < 300) {
            $orderId = is_array($payload) ? ($payload['id'] ?? null) : null;
            if ($orderId) {
                $this->audit($user->id, 'order_created', [
                    'order_id' => (int) $orderId,
                    'service_id' => (int) $request->input('service_id'),
                    'quantity' => (int) $request->input('quantity'),
                    'link' => (string) $request->input('link'),
                ]);
            }
            return back()->with('success', 'تم إنشاء الطلب للعميل وخصم تكلفته من رصيده بنجاح.' . ($orderId ? ' رقم الطلب: #' . $orderId : ''));
        }

        $message = is_array($payload) && !empty($payload['message'])
            ? (string) $payload['message']
            : 'تعذر إنشاء الطلب للعميل.';

        return back()->withErrors(['order' => $message])->withInput();
    }

    public function searchServices(Request $request)
    {
        $q = trim((string) $request->input('q', ''));
        $query = Service::with('category')->where('status', 'active');

        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                if (ctype_digit($q)) {
                    $builder->orWhere('id', (int) $q);
                }
                $builder->orWhere('name', 'like', '%' . $q . '%');
            });
        }

        $services = $query->orderBy('id', 'desc')->limit(30)->get()->map(function ($service) {
            return [
                'id' => (int) $service->id,
                'name' => (string) $service->name,
                'rate' => (float) $service->rate,
                'min' => (int) $service->min,
                'max' => (int) $service->max,
                'category' => $service->category ? (string) $service->category->name : '',
            ];
        })->values();

        return response()->json(['services' => $services], 200);
    }

    private function ensureAuditTable(): void
    {
        DB::statement("CREATE TABLE IF NOT EXISTS `yellow_duck_admin_user_audits` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `admin_id` BIGINT UNSIGNED NULL,
            `user_id` BIGINT UNSIGNED NOT NULL,
            `action` VARCHAR(80) NOT NULL,
            `payload` LONGTEXT NULL,
            `created_at` TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `yd_admin_user_audits_user_idx` (`user_id`),
            KEY `yd_admin_user_audits_action_idx` (`action`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    private function audit(int $userId, string $action, array $payload = []): void
    {
        $this->ensureAuditTable();

        DB::table('yellow_duck_admin_user_audits')->insert([
            'admin_id' => Auth::guard('admin')->id(),
            'user_id' => $userId,
            'action' => $action,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now()->format('Y-m-d H:i:s'),
        ]);
    }
}
