<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Entities;

use BecaComedor\Domain\Enums\ServicioAlimentario;
use JsonSerializable;

/**
 * Entidad de dominio que representa la liberación de raciones remanentes (ODS 12 - Meta 12.3).
 */
class RemanenteRacion implements JsonSerializable
{
    public function __construct(
        private string $id,
        private string $fechaYmd,
        private ServicioAlimentario $servicio,
        private int $cantidad,
        private float $kgRescatados,
        private string $horaFin,
        private string $liberadoEn,
        private bool $activo = true
    ) {
    }

    public static function liberar(
        string $fechaYmd,
        ServicioAlimentario $servicio,
        int $cantidad,
        float $kgPorRacion = 0.5,
        string $horaFin = '14:00'
    ): self {
        $id = sprintf('%s_%s', $fechaYmd, $servicio->value);
        $kgRescatados = round($cantidad * $kgPorRacion, 2);
        $liberadoEn = date('c');

        return new self($id, $fechaYmd, $servicio, $cantidad, $kgRescatados, $horaFin, $liberadoEn, true);
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getFechaYmd(): string
    {
        return $this->fechaYmd;
    }

    public function getServicio(): ServicioAlimentario
    {
        return $this->servicio;
    }

    public function getCantidad(): int
    {
        return $this->cantidad;
    }

    public function getKgRescatados(): float
    {
        return $this->kgRescatados;
    }

    public function getHoraFin(): string
    {
        return $this->horaFin;
    }

    public function getLiberadoEn(): string
    {
        return $this->liberadoEn;
    }

    public function isActivo(): bool
    {
        return $this->activo;
    }

    public function desactivar(): void
    {
        $this->activo = false;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->fechaYmd,
            'servicio' => $this->servicio->value,
            'cantidad' => $this->cantidad,
            'kgRescatados' => $this->kgRescatados,
            'horaFin' => $this->horaFin,
            'liberadoEn' => $this->liberadoEn,
            'activo' => $this->activo,
        ];
    }
}
