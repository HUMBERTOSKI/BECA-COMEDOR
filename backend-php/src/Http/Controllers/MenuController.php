<?php

declare(strict_types=1);

namespace BecaComedor\Http\Controllers;

use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\Enums\EstadoMenu;
use BecaComedor\Domain\Interfaces\MenuRepositoryInterface;
use BecaComedor\Domain\Services\ReglasNegocioMenuService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;

class MenuController
{
    public function __construct(
        private MenuRepositoryInterface $menuRepo,
        private ReglasNegocioMenuService $reglasService
    ) {
    }

    public function obtener(Request $request): Response
    {
        $fechaStr = $request->input('fecha');
        $fecha = is_string($fechaStr) && trim($fechaStr) !== ''
            ? FechaBolivia::desdeString($fechaStr)
            : FechaBolivia::hoy();

        $menu = $this->menuRepo->obtenerPorFecha($fecha->toYmd());
        $evaluacion = $this->reglasService->evaluarServiciosDisponibles($fecha, $menu?->esFeriado() ?? false);

        if ($menu === null) {
            return Response::json([
                'ok' => true,
                'fecha' => $fecha->toYmd(),
                'existe' => false,
                'menu' => null,
                'reglasServicio' => $evaluacion,
            ]);
        }

        return Response::json([
            'ok' => true,
            'fecha' => $fecha->toYmd(),
            'existe' => true,
            'menu' => $menu->jsonSerialize(),
            'reglasServicio' => $evaluacion,
        ]);
    }

    public function guardar(Request $request): Response
    {
        $fechaStr = (string) $request->input('fecha');
        if (trim($fechaStr) === '') {
            return Response::error('El campo "fecha" es requerido (YYYY-MM-DD).', 400);
        }

        $fecha = FechaBolivia::desdeString($fechaStr);
        $platillosAlmuerzo = (array) ($request->input('platillos') ?? $request->input('platillosAlmuerzo') ?? []);
        $platillosCena = (array) ($request->input('platillosCena') ?? []);
        $feriado = (bool) ($request->input('feriado') ?? false);
        $horaLimite = (string) ($request->input('horaLimite') ?? '10:30');
        $publicar = (bool) ($request->input('publicar') ?? false);

        $estado = $publicar ? EstadoMenu::PUBLICADO : EstadoMenu::BORRADOR;

        $menu = new MenuDia(
            fecha: $fecha,
            platillosAlmuerzo: array_values(array_filter($platillosAlmuerzo, fn($p) => trim((string)$p) !== '')),
            platillosCena: array_values(array_filter($platillosCena, fn($p) => trim((string)$p) !== '')),
            feriado: $feriado,
            horaLimite: $horaLimite,
            estado: $estado
        );

        $this->menuRepo->guardar($menu);

        return Response::exito($menu->jsonSerialize(), 'Menú guardado con éxito', 201);
    }
}
