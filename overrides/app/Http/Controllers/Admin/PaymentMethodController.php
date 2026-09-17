<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Setting;
use App\Support\YellowDuckMoney;
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
        $query = PaymentMethod::query()->where(function ($builder) {
            $builder->where('name', 'like', '%Vodafone%')
                ->orWhere('name', 'like', '%InstaPay%')
                ->orWhere('name', 'like', '%Insta Pay%');
        });

        if (!Gate::allows('isAdmin')) {
            $query->where('status', 'active');
        }

        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', $search)
                    ->orWhere('client_id', 'like', $search);
            });
        }

        $paymentMethods = $query->orderBy('id', 'desc')->paginate();

        if ($request->api) {
            return response()->json($paymentMethods, 200);
        }

        return view('admin.payment_methods', compact('paymentMethods'));
    }

    public function store(Request $request)
    {
        abort_unless(Auth::guard('admin')->check(), 403);

        if ($request->has('exchange_rate') && !$request->filled('name')) {
            $data = $request->validate(['exchange_rate' => 'required|numeric|min:1|max:1000']);
            Setting::updateOrCreate(
                ['name' => YellowDuckMoney::RATE_SETTING],
                ['value' => number_format((float) $data['exchange_rate'], 2, '.', ''), 'type' => 'general']
            );
            return response()->json(['exchange_rate' => YellowDuckMoney::exchangeRate()], 200);
        }

        $data = $this->validatedPayload($request);
        $paymentMethod = PaymentMethod::create($data);
        return response()->json($paymentMethod, 200);
    }

    public function show($id)
    {
        $isAdmin = Auth::guard('admin')->check();
        $query = PaymentMethod::where('id', $id);

        if (!$isAdmin) {
            $query->where('status', 'active')
                ->where(function ($builder) {
                    $builder->where('name', 'like', '%Vodafone%')
                        ->orWhere('name', 'like', '%InstaPay%')
                        ->orWhere('name', 'like', '%Insta Pay%');
                });
        }

        $paymentMethod = $query->firstOrFail();

        if ($isAdmin) {
            $paymentMethod->makeVisible(['api_key', 'private_key', 'client_id', 'environment']);
            return response()->json($paymentMethod, 200);
        }

        // Never expose gateway credentials or internal environment fields to customers.
        // Only return the values required by the manual-funding UI.
        return response()->json([
            'id' => $paymentMethod->id,
            'name' => $paymentMethod->name,
            'min' => $paymentMethod->min,
            'max' => $paymentMethod->max,
            'fee' => $paymentMethod->fee,
            'status' => $paymentMethod->status,
            'image' => $paymentMethod->image,
            'client_id' => $paymentMethod->client_id,
        ], 200);
    }

    public function update(Request $request, $id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);
        $paymentMethod = PaymentMethod::where('id', $id)->firstOrFail();
        $paymentMethod->update($this->validatedPayload($request, false));
        $paymentMethod->makeVisible(['api_key', 'private_key', 'client_id', 'environment']);
        return response()->json($paymentMethod, 200);
    }

    public function destroy($id)
    {
        abort_unless(Auth::guard('admin')->check(), 403);
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
