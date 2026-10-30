<?php

declare(strict_types=1);

namespace BecaComedor\Http\Controllers;

use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Services\RescateRemanentesService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;
use DomainException;

class RemanentesController
{
    public function __construct(
        private RescateRemanentesService $rescateService
    ) {
    }

    public function liberar(Request $request): Response
    {
        $fechaStr = $request->input('fecha');
        $fecha = is_string($fechaStr) && trim($fechaStr) !== ''
            ? FechaBolivia::desdeString($fechaStr)
            : FechaBolivia::hoy();

        $servicioRaw = (string) ($request->input('servicio') ?? 'a');
        $servicio = ServicioAlimentario::tryFrom($servicioRaw) ?? ServicioAlimentario::ALMUERZO;

        $kgPorRacion = (float) ($request->input('kgPorRacion') ?? 0.5);
        $horaFin = (string) ($request->input('horaFin') ?? '14:00');
        $cooldown = (int) ($request->input('cooldownMinutos') ?? 10);

        try {
            $remanente = $this->rescateService->liberarRemanentes(
                fecha: $fecha,
                servicio: $servicio,
                kgPorRacion: $kgPorRacion,
                horaFin: $horaFin,
                cooldownMinutos: $cooldown
            );

            return Response::exito(
                $remanente->jsonSerialize(),
                'Raciones remanentes liberadas exitosamente (ODS 12.3)',
                201
            );
        } catch (DomainException $e) {
            return Response::error($e->getMessage(), 422);
        }
    }
}
