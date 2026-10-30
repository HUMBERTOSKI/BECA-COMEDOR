<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Enums;

enum ServicioAlimentario: string
{
    case ALMUERZO = 'a';
    case CENA = 'c';

    public function getNombreCompleto(): string
    {
        return match ($this) {
            self::ALMUERZO => 'Almuerzo',
            self::CENA => 'Cena',
        };
    }

    public function getHorario(): string
    {
        return match ($this) {
            self::ALMUERZO => '12:00 - 14:00',
            self::CENA => '18:00 - 19:00',
        };
    }
}
