<?php

declare(strict_types=1);

namespace BecaComedor\Domain\ValueObjects;

use JsonSerializable;

/**
 * Value Object inmutable con los indicadores de rendimiento y sostenibilidad (ODS 12 - Meta 12.3).
 */
final readonly class MetricasImpacto implements JsonSerializable
{
    public function __construct(
        public int $votosSi,
        public int $racionesServidas,
        public int $racionesExcedentes,
        public float $kgRescatados,
        public float $porcentajePrecision,
        public float $kgEstimadosCocina,
        public float $porcentajeAsistencia
    ) {
    }

    public static function calcular(
        int $votosSi,
        int $racionesServidas,
        float $kgPorRacion = 0.5,
        float $margenSeguridad = 0.05
    ): self {
        // Excedente no reclamado (remanentes potenciales)
        $excedente = max(0, $votosSi - $racionesServidas);
        $kgRescatados = round($excedente * $kgPorRacion, 2);

        // Precisión: 100 - (|votos - servidas| / votos) * 100
        $precision = 100.0;
        if ($votosSi > 0) {
            $error = abs($votosSi - $racionesServidas) / (float) $votosSi;
            $precision = round(max(0.0, (1.0 - $error) * 100.0), 1);
        }

        // Estimación sugerida a cocina con margen
        $racionesEstimadas = (int) ceil($votosSi * (1.0 + $margenSeguridad));
        $kgEstimadosCocina = round($racionesEstimadas * $kgPorRacion, 2);

        // Porcentaje de asistencia efectiva
        $asistencia = $votosSi > 0 ? round(($racionesServidas / (float) $votosSi) * 100.0, 1) : 0.0;

        return new self(
            votosSi: $votosSi,
            racionesServidas: $racionesServidas,
            racionesExcedentes: $excedente,
            kgRescatados: $kgRescatados,
            porcentajePrecision: $precision,
            kgEstimadosCocina: $kgEstimadosCocina,
            porcentajeAsistencia: $asistencia
        );
    }

    public function jsonSerialize(): array
    {
        return [
            'votosSi' => $this->votosSi,
            'racionesServidas' => $this->racionesServidas,
            'racionesExcedentes' => $this->racionesExcedentes,
            'kgRescatados' => $this->kgRescatados,
            'porcentajePrecision' => $this->porcentajePrecision,
            'kgEstimadosCocina' => $this->kgEstimadosCocina,
            'porcentajeAsistencia' => $this->porcentajeAsistencia,
        ];
    }
}
