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

        if (!Auth::guard('admin')->check()) {
            $paymentMethods->getCollection()->transform(function ($method) {
                return $this->safeForUser($method);
            });
        }

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
        return response()->json($paymentMethod->makeVisible(['api_key','private_key','client_id','environment']), 200);
    }

    public function show($id)
    {
        $query = PaymentMethod::where('id', $id);
        $isAdmin = Auth::guard('admin')->check();

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
        } else {
            $paymentMethod = $this->safeForUser($paymentMethod);
        }

        return response()->json($paymentMethod, 200);
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

        $payload = [];
        foreach (['name','min','max','fee','status','environment','api_key','private_key','client_id','image'] as $key) {
            if ($request->exists($key)) {
                $payload[$key] = $request->input($key);
            }
        }

        if ($requireName) {
            $payload['name'] = $request->input('name');
        }
        if (!array_key_exists('min', $payload) && $requireName) $payload['min'] = 0;
        if (!array_key_exists('max', $payload) && $requireName) $payload['max'] = 100000;
        if (!array_key_exists('fee', $payload) && $requireName) $payload['fee'] = 0;
        if (!array_key_exists('status', $payload) && $requireName) $payload['status'] = 'active';
        if (!array_key_exists('environment', $payload) && $requireName) $payload['environment'] = 'production';
        if (!array_key_exists('private_key', $payload) && $requireName) $payload['private_key'] = '-';
        if (!array_key_exists('image', $payload) && $requireName) $payload['image'] = 'payment-manual.svg';

        return $payload;
    }

    private function safeForUser(PaymentMethod $method): PaymentMethod
    {
        $method->makeHidden(['api_key', 'private_key', 'environment']);
        $method->makeVisible(['client_id']);
        return $method;
    }
}
