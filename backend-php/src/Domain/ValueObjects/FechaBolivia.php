<?php

declare(strict_types=1);

namespace BecaComedor\Domain\ValueObjects;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/**
 * Value Object inmutable para control de fechas y tiempos en zona horaria Bolivia (UTC-4).
 */
final readonly class FechaBolivia
{
    public const string TIMEZONE = 'America/La_Paz';
    private DateTimeImmutable $dateTime;

    public function __construct(?string $fechaYmd = null)
    {
        $tz = new DateTimeZone(self::TIMEZONE);
        if ($fechaYmd === null) {
            $this->dateTime = new DateTimeImmutable('now', $tz);
        } else {
            $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $fechaYmd, $tz);
            if ($parsed === false) {
                throw new InvalidArgumentException("Formato de fecha inválido: '{$fechaYmd}'. Debe ser YYYY-MM-DD.");
            }
            // Normalizar a inicio de día en la zona horaria de Bolivia
            $this->dateTime = $parsed->setTime(0, 0, 0);
        }
    }

    public static function hoy(): self
    {
        return new self();
    }

    public static function desdeString(string $fechaYmd): self
    {
        return new self($fechaYmd);
    }

    public function toYmd(): string
    {
        return $this->dateTime->format('Y-m-d');
    }

    public function toDmy(): string
    {
        return $this->dateTime->format('d/m/Y');
    }

    public function getDiaSemanaEspanol(): string
    {
        $dias = [
            1 => 'Lunes',
            2 => 'Martes',
            3 => 'Miércoles',
            4 => 'Jueves',
            5 => 'Viernes',
            6 => 'Sábado',
            7 => 'Domingo',
        ];
        $n = (int) $this->dateTime->format('N');
        return $dias[$n] ?? 'Lunes';
    }

    public function esSabado(): bool
    {
        return (int) $this->dateTime->format('N') === 6;
    }

    public function esDomingo(): bool
    {
        return (int) $this->dateTime->format('N') === 7;
    }

    public function getHoraActualHm(): string
    {
        return $this->dateTime->format('H:i');
    }

    public function yaPasoHoraLimite(string $horaLimiteHm): bool
    {
        $actualHm = $this->dateTime->format('H:i');
        return strcmp($actualHm, $horaLimiteHm) >= 0;
    }

    public function getSegundosHasta(string $horaLimiteHm): int
    {
        $partes = explode(':', $horaLimiteHm);
        $hora = (int) ($partes[0] ?? 10);
        $min = (int) ($partes[1] ?? 30);

        $limite = $this->dateTime->setTime($hora, $min, 0);
        $segundos = $limite->getTimestamp() - $this->dateTime->getTimestamp();
        return max(0, $segundos);
    }

    public function getDateTime(): DateTimeImmutable
    {
        return $this->dateTime;
    }
}
