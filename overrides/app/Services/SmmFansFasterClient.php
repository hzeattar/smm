<?php

namespace App\Services;

use GuzzleHttp\Client;
use RuntimeException;

class SmmFansFasterClient
{
    private string $url;
    private string $key;
    private Client $client;

    public function __construct(?string $url = null, ?string $key = null)
    {
        $this->url = rtrim($url ?: (string) env('SMMFANSFASTER_API_URL', ''), '/');
        $this->key = $key ?: (string) env('SMMFANSFASTER_API_KEY', '');

        if ($this->url === '' || $this->key === '') {
            throw new RuntimeException('SMMFansFaster API credentials are not configured.');
        }

        $this->client = new Client([
            'timeout' => 20,
            'connect_timeout' => 8,
            'http_errors' => false,
            'verify' => true,
            'headers' => [
                'Accept' => 'application/json',
                'User-Agent' => 'YellowDuck-SMM/1.0',
            ],
        ]);
    }

    public function services(): array
    {
        $response = $this->request(['action' => 'services']);
        return array_is_list($response) ? $response : [];
    }

    public function balance(): array
    {
        return $this->request(['action' => 'balance']);
    }

    public function addOrder(int $serviceId, string $link, int $quantity, array $extra = []): array
    {
        $payload = [
            'action' => 'add',
            'service' => $serviceId,
            'link' => $link,
            'quantity' => $quantity,
        ];

        foreach (['runs', 'interval', 'comments', 'username', 'min', 'max', 'posts', 'delay', 'expiry'] as $key) {
            if (array_key_exists($key, $extra) && $extra[$key] !== null && $extra[$key] !== '') {
                $payload[$key] = $extra[$key];
            }
        }

        return $this->request($payload);
    }

    public function status(int $orderId): array
    {
        return $this->request(['action' => 'status', 'order' => $orderId]);
    }

    public function statuses(array $orderIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
        if ($ids === []) {
            return [];
        }
        $ids = array_slice($ids, 0, 100);
        return $this->request(['action' => 'status', 'orders' => implode(',', $ids)]);
    }

    public function refill(int $orderId): array
    {
        return $this->request(['action' => 'refill', 'order' => $orderId]);
    }

    public function refillStatus(int $refillId): array
    {
        return $this->request(['action' => 'refill_status', 'refill' => $refillId]);
    }

    public function cancel(array $orderIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
        if ($ids === []) {
            return [];
        }
        return $this->request(['action' => 'cancel', 'orders' => implode(',', array_slice($ids, 0, 100))]);
    }

    private function request(array $payload): array
    {
        $payload['key'] = $this->key;

        $response = $this->client->post($this->url, ['form_params' => $payload]);
        $status = $response->getStatusCode();
        $body = trim((string) $response->getBody());

        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Provider HTTP error: ' . $status);
        }

        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Provider returned invalid JSON.');
        }

        return $decoded;
    }
}
