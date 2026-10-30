<?php

declare(strict_types=1);

namespace BecaComedor\Http\Controllers;

use BecaComedor\Domain\Services\ValidadorAccesoService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;

class AccesoController
{
    public function __construct(
        private ValidadorAccesoService $validador
    ) {
    }

    public function validar(Request $request): Response
    {
        $payload = $request->input('qrPayload') ?? $request->input('codigo');
        if (!is_string($payload) || trim($payload) === '') {
            return Response::error('Se requiere el campo "qrPayload" o "codigo" con el código QR.', 400);
        }

        $fechaStr = $request->input('fecha');
        $fecha = is_string($fechaStr) && trim($fechaStr) !== ''
            ? FechaBolivia::desdeString($fechaStr)
            : FechaBolivia::hoy();

        $metodo = is_string($request->input('metodo')) ? $request->input('metodo') : 'qr';

        $resultado = $this->validador->validar($payload, $fecha, $metodo);

        $status = $resultado->isAutorizado() ? 200 : 403;
        return Response::json($resultado->jsonSerialize(), $status);
    }
}
