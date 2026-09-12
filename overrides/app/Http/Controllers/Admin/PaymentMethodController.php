<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Traits\MainTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class PaymentMethodController extends Controller
{
    use MainTrait;

    public function index(Request $request)
    {
        $conditions = !Gate::allows('isAdmin') ? [['status', '=', 'active']] : [];
        $paymentMethods = PaymentMethod::where($conditions)->orderBy('id', 'desc')->paginate();

        if ($request->api) {
            if (isset($request->search)) {
                $paymentMethods = $this->filter([
                    'conditions' => $conditions,
                    'table' => 'payment_methods',
                    'class' => PaymentMethod::class,
                    'search' => $request->search,
                ]);
            }

            return response()->json($paymentMethods, 200);
        }

        return view('admin.payment_methods', compact('paymentMethods'));
    }

    public function store(Request $request)
    {
        $data = $this->validatedPayload($request);
        $paymentMethod = PaymentMethod::create($data);
        return response()->json($paymentMethod, 200);
    }

    public function show($id)
    {
        $paymentMethod = PaymentMethod::where('id', $id)->firstOrFail();
        if (Auth::guard('admin')->check()) {
            $paymentMethod->makeVisible(['api_key', 'private_key', 'client_id', 'environment']);
        } else {
            $paymentMethod->makeVisible(['api_key', 'client_id', 'environment']);
        }
        return response()->json($paymentMethod, 200);
    }

    public function update(Request $request, $id)
    {
        $paymentMethod = PaymentMethod::where('id', $id)->firstOrFail();
        $paymentMethod->update($this->validatedPayload($request, false));
        $paymentMethod->makeVisible(['api_key', 'private_key', 'client_id', 'environment']);
        return response()->json($paymentMethod, 200);
    }

    public function destroy($id)
    {
        $paymentMethod = PaymentMethod::where('id', $id)->firstOrFail();
        $deleted = $paymentMethod->delete();
        return response()->json($deleted, 200);
    }

    private function validatedPayload(Request $request, $requireName = true)
    {
        $rules = [
            'name' => [$requireName ? 'required' : 'sometimes', 'string', 'max:150'],
            'min' => 'nullable|numeric|min:0',
            'max' => 'nullable|numeric|min:0',
            'fee' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|in:active,deactive',
            'environment' => 'nullable|string|max:40',
            'api_key' => 'nullable|string|max:500',
            'private_key' => 'nullable|string|max:500',
            'client_id' => 'nullable|string|max:500',
            'image' => 'nullable|string|max:191',
        ];

        $validator = Validator::make($request->all(), $rules);
        $validator->validate();

        return [
            'name' => $request->input('name'),
            'min' => (int) $request->input('min', 0),
            'max' => (int) $request->input('max', 100000),
            'fee' => (float) $request->input('fee', 0),
            'status' => $request->input('status', 'active'),
            'environment' => $request->input('environment', 'production'),
            'api_key' => $request->input('api_key'),
            'private_key' => $request->input('private_key') ?: '-',
            'client_id' => $request->input('client_id'),
            'image' => $request->input('image') ?: 'payment-manual.svg',
        ];
    }
}
