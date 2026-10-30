<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Telegram;

use BecaComedor\Domain\Entities\RemanenteRacion;
use BecaComedor\Domain\Interfaces\NotificadorTelegramInterface;

/**
 * Servicio de notificación simulado para pruebas unitarias y entornos sin token de bot.
 */
class MockTelegramNotificationService implements NotificadorTelegramInterface
{
    /**
     * @var string[]
     */
    public array $mensajesCocinaEnviados = [];

    /**
     * @var RemanenteRacion[]
     */
    public array $remanentesNotificados = [];

    public function enviarEstimadoCocina(string $mensaje): bool
    {
        $this->mensajesCocinaEnviados[] = $mensaje;
        return true;
    }

    public function notificarLiberacionRemanentes(RemanenteRacion $remanente): bool
    {
        $this->remanentesNotificados[] = $remanente;
        return true;
    }
}
