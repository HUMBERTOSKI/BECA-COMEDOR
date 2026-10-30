<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Entities;

use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Enums\TipoRespuestaVoto;
use JsonSerializable;

/**
 * Entidad de dominio que representa un voto de confirmación o declinación.
 */
class Voto implements JsonSerializable
{
    public function __construct(
        private string $id,
        private string $fechaYmd,
        private string $studentId,
        private ServicioAlimentario $servicio,
        private TipoRespuestaVoto $respuesta,
        private ?int $telegramUserId = null,
        private ?string $timestamp = null
    ) {
    }

    public static function crear(
        string $fechaYmd,
        string $studentId,
        ServicioAlimentario $servicio,
        TipoRespuestaVoto $respuesta,
        ?int $telegramUserId = null
    ): self {
        // Clave compuesta natural: {fecha}_{studentId}_{servicio}
        $id = sprintf('%s_%s_%s', $fechaYmd, $studentId, $servicio->value);
        $timestamp = date('c');

        return new self($id, $fechaYmd, $studentId, $servicio, $respuesta, $telegramUserId, $timestamp);
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getFechaYmd(): string
    {
        return $this->fechaYmd;
    }

    public function getStudentId(): string
    {
        return $this->studentId;
    }

    public function getServicio(): ServicioAlimentario
    {
        return $this->servicio;
    }

    public function getRespuesta(): TipoRespuestaVoto
    {
        return $this->respuesta;
    }

    public function esAfirmativo(): bool
    {
        return $this->respuesta === TipoRespuestaVoto::SI;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->fechaYmd,
            'studentId' => $this->studentId,
            'servicio' => $this->servicio->value,
            'respuesta' => $this->respuesta->value,
            'telegramUserId' => $this->telegramUserId,
            'timestamp' => $this->timestamp,
        ];
    }
}
