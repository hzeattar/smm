<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Support\YellowDuckMoney;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class TransactionController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $isAdmin = Gate::allows('isAdmin');
        $query = Transaction::with(['paymentMethod', 'user'])->orderBy('created_at', 'desc');
        if (!$isAdmin) {
            $query->where('user_id', Auth::id());
        }

        if ($request->filled('search')) {
            $query->where('transaction_id', 'like', '%' . $request->input('search') . '%');
        }

        $transactions = $query->paginate();
        $permissions = $this->getPermissions('transactions');

        if ($request->api) {
            return response()->json(compact('transactions', 'permissions'), 200);
        }

        return view('admin.transactions', compact('transactions'));
    }

    public function show($id)
    {
        $query = Transaction::with(['paymentMethod', 'user'])->where('id', $id);
        if (!Gate::allows('isAdmin')) {
            $query->where('user_id', Auth::id());
        }
        $transaction = $query->firstOrFail();
        return response()->json($transaction, 200);
    }

    public function update(Request $request, $id)
    {
        abort_unless(Gate::allows('isAdmin'), 403);
        $transaction = Transaction::with('user')->where('id', $id)->firstOrFail();
        $oldStatus = $transaction->status;
        $newStatus = $request->input('status', $oldStatus);

        $data = $request->validate([
            'status' => 'required|in:paid,refund',
            'notes' => 'nullable|string|max:2000',
        ]);
        $transaction->update($data);

        if ($oldStatus !== $newStatus && $transaction->user) {
            $credit = YellowDuckMoney::creditedUsd($transaction);

            if ($newStatus === 'paid' && $oldStatus !== 'paid') {
                $transaction->user->update(['funds' => (float) $transaction->user->funds + $credit]);
            }

            if ($oldStatus === 'paid' && $newStatus !== 'paid') {
                $transaction->user->update(['funds' => max(0, (float) $transaction->user->funds - $credit)]);
            }
        }

        $fresh = $transaction->fresh(['paymentMethod', 'user']);
        if (!$request->expectsJson()) {
            return redirect()->route('admin.transactions.index')->with('success', 'تم تحديث حالة المعاملة بنجاح.');
        }

        return response()->json($fresh, 200);
    }

    public function destroy($id)
    {
        abort_unless(Gate::allows('isAdmin'), 403);
        $transaction = Transaction::where('id', $id)->firstOrFail();
        if ($transaction->status === 'paid') {
            return response()->json(['message' => 'لا يمكن حذف معاملة مدفوعة حفاظًا على سجل الرصيد.'], 422);
        }
        $deleted = $transaction->delete();
        return response()->json($deleted, 200);
    }
}
