<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Services;

use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Interfaces\AsistenciaRepositoryInterface;
use BecaComedor\Domain\Interfaces\VotoRepositoryInterface;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Domain\ValueObjects\MetricasImpacto;

/**
 * Servicio de dominio responsable del cálculo predictivo de raciones a cocinar para el equipo de cocina.
 */
class EstimadorRacionesService
{
    public function __construct(
        private VotoRepositoryInterface $votoRepo,
        private AsistenciaRepositoryInterface $asistenciaRepo
    ) {
    }

    /**
     * Calcula la estimación para la cocina en función de los votos recibidos en Telegram.
     *
     * @return array{
     *     fecha: string,
     *     servicio: string,
     *     votosSi: int,
     *     votosNo: int,
     *     totalVotos: int,
     *     racionesSugeridas: int,
     *     kgInsumosEstimados: float,
     *     racionesServidas: int,
     *     metricas: MetricasImpacto
     * }
     */
    public function estimar(
        FechaBolivia $fecha,
        ServicioAlimentario $servicio = ServicioAlimentario::ALMUERZO,
        float $kgPorRacion = 0.5,
        float $margenSeguridad = 0.05
    ): array {
        $fechaYmd = $fecha->toYmd();

        $votosSi = $this->votoRepo->contarVotosSi($fechaYmd, $servicio);
        $votosNo = $this->votoRepo->contarVotosNo($fechaYmd, $servicio);
        $totalVotos = $votosSi + $votosNo;

        // Raciones recomendadas con margen de seguridad (ej. 5% extra por variaciones)
        $racionesSugeridas = (int) ceil($votosSi * (1.0 + $margenSeguridad));
        $kgInsumosEstimados = round($racionesSugeridas * $kgPorRacion, 2);

        $racionesServidas = $this->asistenciaRepo->contarPorFecha($fechaYmd);

        $metricas = MetricasImpacto::calcular(
            votosSi: $votosSi,
            racionesServidas: $racionesServidas,
            kgPorRacion: $kgPorRacion,
            margenSeguridad: $margenSeguridad
        );

        return [
            'fecha' => $fechaYmd,
            'servicio' => $servicio->value,
            'votosSi' => $votosSi,
            'votosNo' => $votosNo,
            'totalVotos' => $totalVotos,
            'racionesSugeridas' => $racionesSugeridas,
            'kgInsumosEstimados' => $kgInsumosEstimados,
            'racionesServidas' => $racionesServidas,
            'metricas' => $metricas,
        ];
    }
}
