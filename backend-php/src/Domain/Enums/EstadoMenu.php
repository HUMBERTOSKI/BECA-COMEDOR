<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Enums;

enum EstadoMenu: string
{
    case BORRADOR = 'borrador';
    case PUBLICADO = 'publicado';

    public function isModificable(): bool
    {
        return $this === self::BORRADOR;
    }
}
