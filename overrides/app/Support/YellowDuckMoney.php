<?php

namespace App\Support;

use App\Models\Setting;
use App\Models\Transaction;

class YellowDuckMoney
{
    public const RATE_SETTING = 'yellow_duck_usd_egp_rate';

    public static function exchangeRate(): float
    {
        $fallback = (float) config('yellow-duck.usd_egp_rate', 55);

        try {
            $stored = Setting::where('name', self::RATE_SETTING)->value('value');
            if (is_numeric($stored) && (float) $stored >= 1 && (float) $stored <= 1000) {
                return (float) $stored;
            }
        } catch (\Throwable $exception) {
            // The fallback keeps pages available while a fresh schema is bootstrapping.
        }

        return $fallback >= 1 ? $fallback : 55;
    }

    public static function egpToUsd(float $egp): float
    {
        return round($egp / self::exchangeRate(), 4);
    }

    public static function usdToEgp(float $usd): float
    {
        return round($usd * self::exchangeRate(), 2);
    }

    public static function isManualDeposit(Transaction $transaction): bool
    {
        return str_contains((string) $transaction->notes, 'Yellow Duck manual deposit');
    }

    public static function creditedUsd(Transaction $transaction): float
    {
        if (self::isManualDeposit($transaction) && preg_match('/USD credit:\s*([0-9]+(?:\.[0-9]+)?)/i', (string) $transaction->notes, $matches)) {
            return max(0, (float) $matches[1]);
        }

        return max(0, (float) $transaction->amount - (float) $transaction->take_fee);
    }
}
