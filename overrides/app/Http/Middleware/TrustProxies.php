<?php

namespace App\Http\Middleware;

use Fideloper\Proxy\TrustProxies as Middleware;
use Illuminate\Http\Request;

class TrustProxies extends Middleware
{
    /**
     * Railway terminates HTTPS at its proxy. Trust the platform proxy so
     * Laravel correctly detects scheme/host/port and emits secure URLs/cookies.
     * The application service itself is only exposed through Railway's proxy.
     *
     * @var array|string|null
     */
    protected $proxies = '*';

    /**
     * Honor the standard forwarded headers supplied by Railway.
     *
     * @var int
     */
    protected $headers = Request::HEADER_X_FORWARDED_FOR
        | Request::HEADER_X_FORWARDED_HOST
        | Request::HEADER_X_FORWARDED_PORT
        | Request::HEADER_X_FORWARDED_PROTO
        | Request::HEADER_X_FORWARDED_AWS_ELB;
}
