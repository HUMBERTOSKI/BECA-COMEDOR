<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Enums;

enum RolUsuario: string
{
    case ADMIN = 'admin';
    case COCINA = 'cocina';
    case RECEPCIONISTA = 'recepcionista';

    public function tieneAccesoAdmin(): bool
    {
        return $this === self::ADMIN;
    }

    public function tieneAccesoMeson(): bool
    {
        return $this === self::ADMIN || $this === self::COCINA || $this === self::RECEPCIONISTA;
    }
}
