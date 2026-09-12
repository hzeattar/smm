<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
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

        $paymentMethods = PaymentMethod::where('status', 'active')->orderBy('id', 'desc')->get();
        return view('admin.add_funds', compact('paymentMethods'));
    }

    public function payWithManualDeposit(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'method_id' => 'required|integer|exists:payment_methods,id',
            'amount' => 'required|numeric|min:1',
            'sender_phone' => 'nullable|string|max:80',
            'sender_name' => 'nullable|string|max:120',
            'reference' => 'nullable|string|max:160',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $method = PaymentMethod::where('id', $request->input('method_id'))->where('status', 'active')->firstOrFail();
        $amount = round((float) $request->input('amount'), 4);
        $min = (float) $method->min;
        $max = (float) $method->max;

        if ($amount < $min || ($max > 0 && $amount > $max)) {
            return back()
                ->withErrors(['amount' => 'المبلغ خارج حدود طريقة الدفع المختارة.'])
                ->withInput();
        }

        $fee = round($amount * ((float) $method->fee / 100), 4);
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
            'Manual deposit pending admin approval.',
            'Sender phone: ' . (string) $request->input('sender_phone'),
            'Sender name: ' . (string) $request->input('sender_name'),
            'Reference: ' . (string) $request->input('reference'),
        ])));
        $transaction->save();

        return redirect()
            ->route('user.transactions.index')
            ->with('success', 'تم إرسال طلب الإيداع. سيتم إضافة الرصيد بعد مراجعة الأدمن.');
    }

    public function payWithStrip($request)
    {
        $validator = Validator::make($request->all(), [
            'stripe_token' => 'required',
            'min' => 'required|numeric',
            'max' => 'required|numeric',
            'method_id' => 'required',
            'amount' => 'required|numeric',
            'amount_total' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->messages(), 400);
        }

        $customer = Auth::user();
        $stripe_token = $request->input('stripe_token');
        $amount = (float) $request->input('amount') * 100;
        $amount_total = (float) $request->input('amount_total') * 100;
        $paymentMethod = PaymentMethod::where('id', $request->input('method_id'))->firstOrFail();
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
            $transaction->amount = $amount_total / 100;
            $transaction->profit = $transaction->amount - $transaction->fee;
            $transaction->take_fee = ($amount / 100) * $paymentMethod->fee / 100;
            $transaction->status = $result->paid ? 'paid' : 'refund';
            $transaction->save();

            $this->increaseBalance($amount / 100);

            return response()->json(['result' => $result, 'transactions_details' => $transactions_details], 200);
        }

        return response()->json([], 400);
    }

    public function payWithPaypal($request)
    {
        $validator = Validator::make($request->all(), [
            'min' => 'required|numeric',
            'max' => 'required|numeric',
            'amount' => 'required|numeric',
            'amount_total' => 'required|numeric',
            'method_id' => 'required|numeric',
        ]);

        $paymentMethod = PaymentMethod::where('id', $request->input('method_id'))->firstOrFail();
        session()->put('payment_method', $paymentMethod);

        if ($validator->fails()) {
            return response()->json($validator->messages(), 400);
        }

        $amountToBePaid = $request->input('amount_total');
        $amountWithoutFee = $request->input('amount');
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
                'min' => 10,
                'max' => 100000,
                'fee' => 0,
                'environment' => 'production',
                'api_key' => null,
                'private_key' => '01205323440',
                'client_id' => 'حول على رقم فودافون كاش ثم اكتب رقم الهاتف والمبلغ في النموذج.',
                'image' => 'vodafone-cash.svg',
            ],
            [
                'name' => 'InstaPay Egypt',
                'min' => 10,
                'max' => 100000,
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
}
