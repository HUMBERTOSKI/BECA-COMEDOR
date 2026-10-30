<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Services;

use BecaComedor\Domain\Entities\Estudiante;
use BecaComedor\Domain\Enums\EstadoAcceso;
use JsonSerializable;

/**
 * DTO que encapsula el resultado de la validación en mesón o recepción.
 */
final readonly class ResultadoValidacionAcceso implements JsonSerializable
{
    public function __construct(
        public EstadoAcceso $estado,
        public string $codigoMotivo,
        public string $mensaje,
        public ?Estudiante $estudiante = null,
        public ?string $timestamp = null
    ) {
    }

    public static function autorizado(Estudiante $estudiante): self
    {
        return new self(
            estado: EstadoAcceso::AUTORIZADO,
            codigoMotivo: 'acceso_concedido',
            mensaje: 'Acceso autorizado · Comensal habilitado',
            estudiante: $estudiante,
            timestamp: date('c')
        );
    }

    public static function bloqueado(string $codigoMotivo, string $mensaje, ?Estudiante $estudiante = null): self
    {
        return new self(
            estado: EstadoAcceso::BLOQUEADO,
            codigoMotivo: $codigoMotivo,
            mensaje: $mensaje,
            estudiante: $estudiante,
            timestamp: date('c')
        );
    }

    public function isAutorizado(): bool
    {
        return $this->estado === EstadoAcceso::AUTORIZADO;
    }

    public function jsonSerialize(): array
    {
        return [
            'estado' => $this->estado->value,
            'autorizado' => $this->isAutorizado(),
            'codigoMotivo' => $this->codigoMotivo,
            'mensaje' => $this->mensaje,
            'estudiante' => $this->estudiante?->jsonSerialize(),
            'timestamp' => $this->timestamp ?? date('c'),
        ];
    }
}
