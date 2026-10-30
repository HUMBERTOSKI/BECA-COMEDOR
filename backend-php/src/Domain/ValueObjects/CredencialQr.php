<?php

declare(strict_types=1);

namespace BecaComedor\Domain\ValueObjects;

use InvalidArgumentException;

/**
 * Value Object inmutable que representa la credencial física/digital con código QR.
 * Estándar institucional: BECA1:<studentId>
 */
final readonly class CredencialQr
{
    public const string PREFIJO = 'BECA1:';

    public function __construct(
        public string $studentId
    ) {
        $trimmed = trim($this->studentId);
        if ($trimmed === '') {
            throw new InvalidArgumentException('El identificador del estudiante no puede estar vacío.');
        }
    }

    public static function desdePayload(string $rawPayload): self
    {
        $payload = trim($rawPayload);
        if (!str_starts_with($payload, self::PREFIJO)) {
            throw new InvalidArgumentException('Formato de código QR inválido. Debe comenzar con ' . self::PREFIJO);
        }

        $id = substr($payload, strlen(self::PREFIJO));
        if ($id === false || trim($id) === '') {
            throw new InvalidArgumentException('El código QR no contiene un ID de estudiante válido.');
        }

        return new self(trim($id));
    }

    public static function paraEstudiante(string $studentId): self
    {
        return new self($studentId);
    }

    public function getPayload(): string
    {
        return self::PREFIJO . $this->studentId;
    }

    public function equals(self $other): bool
    {
        return $this->studentId === $other->studentId;
    }

    public function __toString(): string
    {
        return $this->getPayload();
    }
}
