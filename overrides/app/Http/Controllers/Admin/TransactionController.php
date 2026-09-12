<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Traits\MainTrait;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $transactions = Transaction::with(['paymentMethod', 'user'])->orderBy('created_at', 'desc')->paginate();
        $permissions = $this->getPermissions('transactions');

        if ($request->api) {
            if (isset($request->search)) {
                $transactions = $this->filter([
                    'table' => 'transactions',
                    'tables' => ['payment_methods', 'users'],
                    'with' => ['paymentMethod', 'user'],
                    'class' => Transaction::class,
                    'search' => $request->search,
                ]);
            }

            return response()->json(compact('transactions', 'permissions'), 200);
        }

        return view('admin.transactions', compact('transactions'));
    }

    public function show($id)
    {
        $transaction = Transaction::with(['paymentMethod', 'user'])->where('id', $id)->firstOrFail();
        return response()->json($transaction, 200);
    }

    public function update(Request $request, $id)
    {
        $transaction = Transaction::with('user')->where('id', $id)->firstOrFail();
        $oldStatus = $transaction->status;
        $newStatus = $request->input('status', $oldStatus);

        $transaction->update($request->all());

        if ($oldStatus !== $newStatus && $transaction->user) {
            $credit = max(0, (float) $transaction->amount - (float) $transaction->take_fee);

            if ($newStatus === 'paid' && $oldStatus !== 'paid') {
                $transaction->user->update(['funds' => (float) $transaction->user->funds + $credit]);
            }

            if ($oldStatus === 'paid' && $newStatus !== 'paid') {
                $transaction->user->update(['funds' => max(0, (float) $transaction->user->funds - $credit)]);
            }
        }

        return response()->json($transaction->fresh(['paymentMethod', 'user']), 200);
    }

    public function destroy($id)
    {
        $transaction = Transaction::where('id', $id)->firstOrFail();
        $deleted = $transaction->delete();
        return response()->json($deleted, 200);
    }
}
