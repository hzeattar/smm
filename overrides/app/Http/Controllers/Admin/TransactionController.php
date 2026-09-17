<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\User;
use App\Support\YellowDuckMoney;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

class TransactionController extends Controller
{
    use MainTrait;

    private const CUSTOMER_PAYMENT_HIDDEN_FIELDS = [
        'api_key',
        'private_key',
        'client_id',
        'environment',
    ];

    public function index(Request $request)
    {
        $isAdmin = Gate::allows('isAdmin');
        $query = Transaction::with(['paymentMethod', 'user'])
            ->where('transaction_id', 'not like', 'SMOKE-%')
            ->orderBy('created_at', 'desc');
        if (!$isAdmin) {
            $query->where('user_id', Auth::id());
        }

        if ($request->filled('search')) {
            $query->where('transaction_id', 'like', '%' . $request->input('search') . '%');
        }

        $transactions = $query->paginate();
        if (!$isAdmin) {
            collect($transactions->items())->each(function ($transaction) {
                $this->sanitizeCustomerTransaction($transaction);
            });
        }

        $permissions = $this->getPermissions('transactions');

        if ($request->api) {
            return response()->json(compact('transactions', 'permissions'), 200);
        }

        $proofTransactionIds = [];
        $users = collect();
        if ($isAdmin) {
            $users = User::select(['id', 'username', 'email', 'funds'])
                ->orderBy('username')
                ->get();

            if (Schema::hasTable('yellow_duck_deposit_proofs')) {
                $pageIds = collect($transactions->items())->pluck('id')->filter()->values()->all();
                if ($pageIds) {
                    $proofTransactionIds = DB::table('yellow_duck_deposit_proofs')
                        ->whereIn('transaction_id', $pageIds)
                        ->pluck('transaction_id')
                        ->map(fn ($id) => (int) $id)
                        ->all();
                }
            }
        }

        return view('admin.transactions', compact('transactions', 'proofTransactionIds', 'users'));
    }

    public function show($id)
    {
        $isAdmin = Gate::allows('isAdmin');
        $query = Transaction::with(['paymentMethod', 'user'])
            ->where('transaction_id', 'not like', 'SMOKE-%')
            ->where('id', $id);
        if (!$isAdmin) {
            $query->where('user_id', Auth::id());
        }
        $transaction = $query->firstOrFail();
        if (!$isAdmin) {
            $this->sanitizeCustomerTransaction($transaction);
        }

        return response()->json($transaction, 200);
    }

    private function sanitizeCustomerTransaction(Transaction $transaction): void
    {
        if ($transaction->paymentMethod) {
            $transaction->paymentMethod->makeHidden(self::CUSTOMER_PAYMENT_HIDDEN_FIELDS);
        }
    }

    public function proof($id)
    {
        abort_unless(Gate::allows('isAdmin'), 403);
        $transaction = Transaction::where('transaction_id', 'not like', 'SMOKE-%')->where('id', $id)->firstOrFail();
        abort_unless(Schema::hasTable('yellow_duck_deposit_proofs'), 404);

        $proof = DB::table('yellow_duck_deposit_proofs')
            ->where('transaction_id', $transaction->id)
            ->first();
        abort_unless($proof, 404);

        $mime = (string) ($proof->mime ?: 'image/jpeg');
        $payload = (string) $proof->data;
        if (str_starts_with($payload, 'base64:')) {
            $decoded = base64_decode(substr($payload, 7), true);
            abort_if($decoded === false || $decoded === '', 422, 'تعذر قراءة صورة إثبات التحويل.');
            $payload = $decoded;
        }

        $extensions = [
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/jpeg' => 'jpg',
            'image/jpg' => 'jpg',
        ];
        $extension = $extensions[$mime] ?? 'jpg';

        return response($payload, 200)
            ->header('Content-Type', $mime)
            ->header('Content-Disposition', 'inline; filename="deposit-proof-' . $transaction->id . '.' . $extension . '"')
            ->header('Cache-Control', 'private, max-age=300')
            ->header('X-Content-Type-Options', 'nosniff');
    }

    public function update(Request $request, $id)
    {
        abort_unless(Gate::allows('isAdmin'), 403);
        $data = $request->validate([
            'status' => 'required|in:paid,refund',
            'notes' => 'nullable|string|max:2000',
        ]);

        $fresh = DB::transaction(function () use ($id, $data) {
            $transaction = Transaction::with('user')
                ->where('transaction_id', 'not like', 'SMOKE-%')
                ->where('id', $id)
                ->lockForUpdate()
                ->firstOrFail();
            $oldStatus = $transaction->status;
            $newStatus = $data['status'];

            if ($newStatus === 'paid' && $oldStatus !== 'paid' && YellowDuckMoney::isManualDeposit($transaction)) {
                $hasProof = Schema::hasTable('yellow_duck_deposit_proofs')
                    && DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $transaction->id)->exists();
                abort_unless($hasProof, 422, 'لا يمكن اعتماد الإيداع اليدوي بدون صورة إثبات التحويل.');
            }

            $transaction->update($data);

            if ($oldStatus !== $newStatus && $transaction->user) {
                $credit = YellowDuckMoney::creditedUsd($transaction);
                $user = User::where('id', $transaction->user_id)->lockForUpdate()->first();

                if ($user && $newStatus === 'paid' && $oldStatus !== 'paid') {
                    $user->funds = round((float) $user->funds + $credit, 4);
                    $user->save();
                }

                if ($user && $oldStatus === 'paid' && $newStatus !== 'paid') {
                    $user->funds = max(0, round((float) $user->funds - $credit, 4));
                    $user->save();
                }
            }

            return $transaction->fresh(['paymentMethod', 'user']);
        });

        if (!$request->expectsJson()) {
            return redirect()->route('admin.transactions.index')->with('success', 'تم تحديث حالة المعاملة بنجاح.');
        }

        return response()->json($fresh, 200);
    }

    public function destroy($id)
    {
        abort_unless(Gate::allows('isAdmin'), 403);
        $transaction = Transaction::where('transaction_id', 'not like', 'SMOKE-%')->where('id', $id)->firstOrFail();
        if ($transaction->status === 'paid') {
            return response()->json(['message' => 'لا يمكن حذف معاملة مدفوعة حفاظًا على سجل الرصيد.'], 422);
        }

        if (Schema::hasTable('yellow_duck_deposit_proofs')) {
            DB::table('yellow_duck_deposit_proofs')->where('transaction_id', $transaction->id)->delete();
        }

        $deleted = $transaction->delete();
        return response()->json($deleted, 200);
    }
}
