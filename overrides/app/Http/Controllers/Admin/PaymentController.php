<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Support\YellowDuckMoney;
use PayPal\Api\Amount;
use PayPal\Api\Item;
use PayPal\Api\ItemList;
use PayPal\Api\Payer;
use PayPal\Api\Payment;
use PayPal\Api\PaymentExecution;
use PayPal\Api\RedirectUrls;
use PayPal\Auth\OAuthTokenCredential;
use PayPal\Rest\ApiContext;
use Stripe\StripeClient;

class PaymentController extends Controller
{
    private $_api_context;

    public function __construct()
    {
        $paypal_conf = config('paypal');
        $this->_api_context = new ApiContext(new OAuthTokenCredential(
            $paypal_conf['client_id'] ?? '',
            $paypal_conf['secret'] ?? ''
        ));
        $this->_api_context->setConfig($paypal_conf['settings'] ?? []);
    }

    public function addFunds(Request $request, $payment_method = null)
    {
        $this->ensureManualPaymentMethods();

        if ($request->isMethod('post')) {
            if ($payment_method === 'stripe') {
                return $this->payWithStrip($request);
            }

            if ($payment_method === 'paypal') {
                return $this->payWithPaypal($request);
            }

            if ($payment_method === 'manual') {
                return $this->payWithManualDeposit($request);
            }
        }

        $paymentMethods = PaymentMethod::where('status', 'active')
            ->orderBy('id', 'desc')
            ->get()
            ->filter(fn (PaymentMethod $method) => $this->isManualPaymentMethod($method));
        return view('admin.add_funds', compact('paymentMethods'));
    }

    public function payWithManualDeposit(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'method_id' => 'required|integer|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'sender_phone' => 'required|string|max:80',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $method = PaymentMethod::where('id', $request->input('method_id'))->where('status', 'active')->firstOrFail();
        if (!$this->isManualPaymentMethod($method)) {
            abort(422, 'هذه الطريقة لا تدعم الإيداع اليدوي.');
        }

        $amount = round((float) $request->input('amount'), 2);
        $min = (float) $method->min;
        $max = (float) $method->max;

        if ($amount < $min || ($max > 0 && $amount > $max)) {
            return back()
                ->withErrors(['amount' => 'المبلغ خارج حدود طريقة الدفع المختارة.'])
                ->withInput();
        }

        $fee = round($amount * ((float) $method->fee / 100), 2);
        $rate = YellowDuckMoney::exchangeRate();
        $credit = max(0, round(($amount - $fee) / $rate, 4));
        Transaction::withoutEvents(function () use ($method, $amount, $fee, $credit, $rate, $request) {
            $transaction = new Transaction();
            $transaction->method_id = $method->id;
            $transaction->transaction_id = 'YD-' . now()->format('YmdHis') . '-' . Auth::id();
            $transaction->user_id = Auth::id();
            $transaction->amount = $amount;
            $transaction->fee = 0;
            $transaction->profit = 0;
            $transaction->take_fee = $fee;
            $transaction->status = 'refund';
            $transaction->notes = trim(implode("\n", array_filter([
                'Yellow Duck manual deposit - pending admin approval.',
                'Deposit currency: EGP',
                'Deposit amount (EGP): ' . number_format($amount, 2, '.', ''),
                'Exchange rate: EGP ' . number_format($rate, 2, '.', '') . ' = USD 1',
                'USD credit: ' . number_format($credit, 4, '.', ''),
                'Sender phone: ' . (string) $request->input('sender_phone'),
            ])));
            $transaction->save();
        });

        return redirect()
            ->route('user.transactions.index')
            ->with('success', 'تم إرسال طلب الإيداع. سيتم إضافة الرصيد بعد مراجعة الأدمن.');
    }

    public function payWithStrip($request)
    {
        $validator = Validator::make($request->all(), [
            'stripe_token' => 'required',
            'method_id' => 'required|integer',
            'amount' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->messages(), 400);
        }

        $paymentMethod = PaymentMethod::where('id', $request->input('method_id'))->where('status', 'active')->firstOrFail();
        if (stripos((string) $paymentMethod->name, 'stripe') === false) {
            abort(422, 'طريقة الدفع غير صحيحة.');
        }

        $creditUsd = round((float) $request->input('amount'), 2);
        if ($creditUsd < (float) $paymentMethod->min || ((float) $paymentMethod->max > 0 && $creditUsd > (float) $paymentMethod->max)) {
            return response()->json(['message' => 'المبلغ خارج الحدود المسموحة.'], 422);
        }

        $customer = Auth::user();
        $stripe_token = $request->input('stripe_token');
        $amount = $creditUsd * 100;
        $amount_total = round($creditUsd * (1 + ((float) $paymentMethod->fee / 100)), 2) * 100;
        $paymentMethod->makeVisible('private_key');

        if (!$customer->stripe_token) {
            $result = \Stripe\Customer::create([
                'email' => $customer->email,
                'source' => $stripe_token['id'],
            ]);

            if ($result && $result->id) {
                $customer->stripe_id = $result->id;
                $customer->stripe_token = $stripe_token;
                $customer->save();
            }
        }

        if ($customer->stripe_token) {
            $result = \Stripe\Charge::create([
                'currency' => 'usd',
                'customer' => $customer->stripe_id,
                'amount' => $amount_total,
            ]);

            $stripe = new StripeClient($paymentMethod->private_key);
            $transactions_details = $stripe->balanceTransactions->retrieve($result->balance_transaction, []);

            $transaction = new Transaction();
            $transaction->method_id = $paymentMethod->id;
            $transaction->transaction_id = $result->balance_transaction;
            $transaction->user_id = Auth::id();
            $transaction->fee = $transactions_details->fee / 100;
            $transaction->amount = $creditUsd;
            $transaction->profit = $transaction->amount - $transaction->fee;
            $transaction->take_fee = 0;
            $transaction->status = $result->paid ? 'paid' : 'refund';
            $transaction->save();

            if ($result->paid) {
                $this->increaseBalance($creditUsd);
            }

            return response()->json(['result' => $result, 'transactions_details' => $transactions_details], 200);
        }

        return response()->json([], 400);
    }

    public function payWithPaypal($request)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric',
            'method_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->messages(), 400);
        }

        $paymentMethod = PaymentMethod::where('id', $request->input('method_id'))->where('status', 'active')->firstOrFail();
        if (stripos((string) $paymentMethod->name, 'paypal') === false) {
            abort(422, 'طريقة الدفع غير صحيحة.');
        }
        $amountWithoutFee = round((float) $request->input('amount'), 2);
        if ($amountWithoutFee < (float) $paymentMethod->min || ((float) $paymentMethod->max > 0 && $amountWithoutFee > (float) $paymentMethod->max)) {
            return response()->json(['message' => 'المبلغ خارج الحدود المسموحة.'], 422);
        }
        $amountToBePaid = round($amountWithoutFee * (1 + ((float) $paymentMethod->fee / 100)), 2);
        session()->put('payment_method', $paymentMethod);
        $payer = new Payer();
        $payer->setPaymentMethod('paypal');

        session()->put('amount_to_BePaid', $amountToBePaid);
        session()->put('amount_without_fee', $amountWithoutFee);

        $item = new Item();
        $item->setName('Add funds Payment')->setCurrency('USD')->setQuantity(1)->setPrice($amountToBePaid);

        $item_list = new ItemList();
        $item_list->setItems([$item]);

        $amount = new Amount();
        $amount->setCurrency('USD')->setTotal($amountToBePaid);

        $redirect_urls = new RedirectUrls();
        $redirect_urls->setReturnUrl(route('user.get-payment-status'))->setCancelUrl(route('user.get-payment-status'));

        $transaction = new \PayPal\Api\Transaction();
        $transaction->setAmount($amount)->setItemList($item_list)->setDescription('Add funds');

        $payment = new Payment();
        $payment->setIntent('Sale')->setPayer($payer)->setRedirectUrls($redirect_urls)->setTransactions([$transaction]);

        try {
            $payment = $payment->create($this->_api_context);
        } catch (\Throwable $ex) {
            session()->put('error', config('app.debug') ? 'Connection timeout' : 'Some error occur, sorry for inconvenient');
            return response()->json([], 400);
        }

        $redirect_url = null;
        foreach ($payment->getLinks() as $link) {
            if ($link->getRel() === 'approval_url') {
                $redirect_url = $link->getHref();
                break;
            }
        }

        session()->put('paypal_payment_id', $payment->getId());

        if ($redirect_url) {
            return response()->json(['payment_id' => $payment->getId(), 'redirect_url' => $redirect_url], 200);
        }

        session()->put('error', 'Unknown error occurred');
        return response()->json([], 400);
    }

    public function getPaymentStatus(Request $request)
    {
        $payment_id = session()->get('paypal_payment_id');
        session()->forget('paypal_payment_id');

        if (empty($request->PayerID) || empty($request->token)) {
            session()->flash('error', 'Payment failed');
            return 'Payment failed';
        }

        $payment = Payment::get($payment_id, $this->_api_context);
        $execution = new PaymentExecution();
        $execution->setPayerId($request->PayerID);
        $result = $payment->execute($execution, $this->_api_context);

        if ($result->getState() === 'approved') {
            $transaction_details = $result->getTransactions()[0]->getRelatedResources()[0];
            $paymentMethod = session()->get('payment_method');
            $amountToBePaid = session()->get('amount_to_BePaid');
            $amountWithoutFee = session()->get('amount_without_fee');
            session()->forget(['payment_method', 'amount_to_BePaid', 'amount_without_fee', 'success_payment']);

            $this->increaseBalance($amountWithoutFee);

            $transaction = new Transaction();
            $transaction->method_id = $paymentMethod->id;
            $transaction->transaction_id = $transaction_details->sale->getId();
            $transaction->user_id = Auth::id();
            $transaction->fee = $transaction_details->sale->getTransactionFee()->getValue();
            $transaction->amount = $amountToBePaid;
            $transaction->profit = $transaction->amount - $transaction->fee;
            $transaction->take_fee = $amountWithoutFee * $paymentMethod->fee / 100;
            $transaction->status = $transaction_details->sale->getState() === 'completed' ? 'paid' : 'refund';
            $transaction->save();

            session()->put('success_payment', true);
            return redirect(route('user.transactions.index'));
        }

        session()->flash('error', 'Payment failed');
        return 'Payment failed';
    }

    public function increaseBalance($funds)
    {
        $user = Auth::user();
        $user->update(['funds' => $user->funds + $funds]);
    }

    private function ensureManualPaymentMethods()
    {
        $now = now();
        $defaults = [
            [
                'name' => 'Vodafone Cash',
                'min' => 55,
                'max' => 550000,
                'fee' => 0,
                'environment' => 'production',
                'api_key' => null,
                'private_key' => '01205323440',
                'client_id' => 'حول على رقم فودافون كاش ثم اكتب رقم الهاتف والمبلغ في النموذج.',
                'image' => 'vodafone-cash.svg',
            ],
            [
                'name' => 'InstaPay Egypt',
                'min' => 55,
                'max' => 550000,
                'fee' => 0,
                'environment' => 'production',
                'api_key' => null,
                'private_key' => 'ارفع QR أو ضع رابط InstaPay من لوحة الأدمن.',
                'client_id' => 'استخدم QR أو رابط InstaPay، ثم اكتب بيانات التحويل في النموذج.',
                'image' => 'instapay.svg',
            ],
        ];

        foreach ($defaults as $data) {
            $exists = PaymentMethod::where('name', $data['name'])->first();
            if (!$exists) {
                $data['status'] = 'active';
                $data['created_at'] = $now;
                $data['updated_at'] = $now;
                PaymentMethod::insert($data);
            }
        }
    }

    private function isManualPaymentMethod(PaymentMethod $method): bool
    {
        $name = strtolower((string) $method->name);
        return str_contains($name, 'vodafone') || str_contains($name, 'instapay') || str_contains($name, 'insta pay');
    }
}
