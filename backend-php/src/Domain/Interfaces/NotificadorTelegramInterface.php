<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Interfaces;

use BecaComedor\Domain\Entities\RemanenteRacion;

interface NotificadorTelegramInterface
{
    public function enviarEstimadoCocina(string $mensaje): bool;
    public function notificarLiberacionRemanentes(RemanenteRacion $remanente): bool;
}
