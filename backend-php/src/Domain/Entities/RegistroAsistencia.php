<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Entities;

use JsonSerializable;

/**
 * Entidad de dominio que representa la validación y entrega efectiva de una ración en mesón o recepción.
 */
class RegistroAsistencia implements JsonSerializable
{
    public function __construct(
        private string $id,
        private string $fechaYmd,
        private string $studentId,
        private string $timestamp,
        private string $metodo = 'qr'
    ) {
    }

    public static function registrar(string $fechaYmd, string $studentId, string $metodo = 'qr'): self
    {
        // Clave única idempotente para mesón: {fecha}_{studentId}
        $id = sprintf('%s_%s', $fechaYmd, $studentId);
        $timestamp = date('c');

        return new self($id, $fechaYmd, $studentId, $timestamp, $metodo);
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

    public function getTimestamp(): string
    {
        return $this->timestamp;
    }

    public function getMetodo(): string
    {
        return $this->metodo;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->fechaYmd,
            'studentId' => $this->studentId,
            'timestamp' => $this->timestamp,
            'metodo' => $this->metodo,
        ];
    }
}
