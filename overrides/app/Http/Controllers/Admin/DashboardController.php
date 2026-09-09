<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function dashboardAdmin()
    {
        $users_count = $this->safeCount(User::class, 'users', [['status', 1]]);
        $ordrs_count = $this->safeCount(Order::class, 'orders');
        $services_count = $this->safeCount(Service::class, 'services', [['status', 'active']]);
        $total_earnings = $this->safeSum(Transaction::class, 'transactions', 'profit', [['status', 'paid']]);

        return view('admin.dashboard_admin', compact('users_count', 'ordrs_count', 'services_count', 'total_earnings'));
    }

    public function dashboardUser()
    {
        $user = Auth::user();
        $userId = $user ? (int) $user->id : 0;

        $balance = $user ? (float) $user->funds : 0.0;
        $ordrs_count = $this->safeCount(Order::class, 'orders', [['user_id', $userId]]);
        $transactions_count = $this->safeCount(Transaction::class, 'transactions', [['user_id', $userId]]);
        $total_spent = $this->safeSum(Order::class, 'orders', 'total', [['status', 'completed'], ['user_id', $userId]]);

        $order_status_counts = [];
        foreach (['pending', 'processing', 'in progress', 'completed', 'partial', 'refunded', 'cancelled', 'error'] as $status) {
            $order_status_counts[$status] = $this->safeCount(Order::class, 'orders', [['user_id', $userId], ['status', $status]]);
        }

        $categories = collect();
        try {
            if (Schema::hasTable('categories') && Schema::hasTable('services')) {
                $activeCategoryIds = Service::where('status', 'active')
                    ->whereNotNull('category_id')
                    ->distinct()
                    ->pluck('category_id');

                $categories = Category::where('status', 'active')
                    ->whereIn('id', $activeCategoryIds)
                    ->orderBy('sort', 'desc')
                    ->orderBy('name')
                    ->get();
            }
        } catch (\Throwable $e) {
            report($e);
        }

        $services_count = $this->safeCount(Service::class, 'services', [['status', 'active']]);

        return view('admin.dashboard_user', compact(
            'balance',
            'ordrs_count',
            'total_spent',
            'transactions_count',
            'order_status_counts',
            'categories',
            'services_count'
        ));
    }

    public function getChartProfit()
    {
        $week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $months = array_reverse(['December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January']);
        $weekProfit = array_fill(0, count($week), 0);
        $yearProfit = array_fill(0, count($months), 0);

        try {
            if (!Schema::hasTable('transactions')) {
                return response()->json(compact('weekProfit', 'yearProfit'), 200);
            }

            $dataWeek = Transaction::select(DB::raw('DAYNAME(created_at) as day, SUM(profit) as profit'))
                ->whereBetween('created_at', [
                    Carbon::parse('monday')->startOfDay(),
                    Carbon::parse('Sunday')->endOfDay(),
                ])->groupBy('day')->get()->pluck('profit', 'day');

            $dataYear = Transaction::select(DB::raw('MONTHNAME(created_at) as month, SUM(profit) as profit'))
                ->whereYear('created_at', date('Y'))
                ->groupBy('month')->get()->pluck('profit', 'month');

            foreach ($week as $index => $day) {
                $weekProfit[$index] = isset($dataWeek[$day]) ? (float) $dataWeek[$day] : 0;
            }
            foreach ($months as $index => $month) {
                $yearProfit[$index] = isset($dataYear[$month]) ? (float) $dataYear[$month] : 0;
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(compact('weekProfit', 'yearProfit'), 200);
    }

    private function safeCount(string $model, string $table, array $conditions = []): int
    {
        try {
            if (!Schema::hasTable($table)) {
                return 0;
            }
            $query = $model::query();
            foreach ($conditions as $condition) {
                $query->where($condition[0], $condition[1]);
            }
            return (int) $query->count();
        } catch (\Throwable $e) {
            report($e);
            return 0;
        }
    }

    private function safeSum(string $model, string $table, string $column, array $conditions = []): float
    {
        try {
            if (!Schema::hasTable($table)) {
                return 0.0;
            }
            $query = $model::query();
            foreach ($conditions as $condition) {
                $query->where($condition[0], $condition[1]);
            }
            return (float) $query->sum($column);
        } catch (\Throwable $e) {
            report($e);
            return 0.0;
        }
    }
}
