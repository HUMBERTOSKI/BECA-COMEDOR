<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Enums;

enum EstadoAcceso: string
{
    case AUTORIZADO = 'autorizado';
    case BLOQUEADO = 'bloqueado';

    public function isPermitido(): bool
    {
        return $this === self::AUTORIZADO;
    }
}
