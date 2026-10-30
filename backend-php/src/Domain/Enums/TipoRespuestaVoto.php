<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Enums;

enum TipoRespuestaVoto: string
{
    case SI = 'si';
    case NO = 'no';

    public function esAfirmativo(): bool
    {
        return $this === self::SI;
    }
}
