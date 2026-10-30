<?php

declare(strict_types=1);

namespace BecaComedor\Http\Controllers;

use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Services\EstimadorRacionesService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;

class EstimacionController
{
    public function __construct(
        private EstimadorRacionesService $estimador
    ) {
    }

    public function obtener(Request $request): Response
    {
        $fechaStr = $request->input('fecha');
        $fecha = is_string($fechaStr) && trim($fechaStr) !== ''
            ? FechaBolivia::desdeString($fechaStr)
            : FechaBolivia::hoy();

        $servicioRaw = (string) ($request->input('servicio') ?? 'a');
        $servicio = ServicioAlimentario::tryFrom($servicioRaw) ?? ServicioAlimentario::ALMUERZO;

        $kgPorRacion = (float) ($request->input('kgPorRacion') ?? 0.5);
        $margen = (float) ($request->input('margenSeguridad') ?? 0.05);

        $estimacion = $this->estimador->estimar($fecha, $servicio, $kgPorRacion, $margen);

        return Response::exito($estimacion, 'Estimación de raciones calculada con éxito');
    }
}
