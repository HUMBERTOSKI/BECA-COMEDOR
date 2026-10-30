<?php

declare(strict_types=1);

namespace BecaComedor\Http;

use JsonSerializable;

class Response
{
    /**
     * @param array<string, mixed>|JsonSerializable $data
     * @param array<string, string> $headers
     */
    public function __construct(
        private mixed $data,
        private int $statusCode = 200,
        private array $headers = []
    ) {
    }

    public static function json(mixed $data, int $statusCode = 200): self
    {
        return new self($data, $statusCode, [
            'Content-Type' => 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
        ]);
    }

    public static function error(string $mensaje, int $statusCode = 400, array $detalles = []): self
    {
        return self::json([
            'ok' => false,
            'error' => $mensaje,
            'detalles' => $detalles,
            'timestamp' => date('c'),
        ], $statusCode);
    }

    public static function exito(mixed $datos, string $mensaje = 'Operación exitosa', int $statusCode = 200): self
    {
        return self::json([
            'ok' => true,
            'mensaje' => $mensaje,
            'datos' => $datos,
            'timestamp' => date('c'),
        ], $statusCode);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getData(): mixed
    {
        return $this->data;
    }

    public function send(): void
    {
        http_response_code($this->statusCode);

        foreach ($this->headers as $nombre => $valor) {
            header("{$nombre}: {$valor}");
        }

        echo json_encode($this->data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
}
