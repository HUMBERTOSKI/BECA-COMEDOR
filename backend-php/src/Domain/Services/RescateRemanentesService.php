<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Services;

use BecaComedor\Domain\Entities\RemanenteRacion;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Interfaces\AsistenciaRepositoryInterface;
use BecaComedor\Domain\Interfaces\NotificadorTelegramInterface;
use BecaComedor\Domain\Interfaces\RemanenteRepositoryInterface;
use BecaComedor\Domain\Interfaces\VotoRepositoryInterface;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use DomainException;

/**
 * Servicio de dominio responsable del rescate y redistribución de raciones sobrantes (ODS 12 · Meta 12.3).
 * Implementa control de excedentes, cálculo de kilos salvados y temporizador anti-spam (cooldown).
 */
class RescateRemanentesService
{
    public function __construct(
        private VotoRepositoryInterface $votoRepo,
        private AsistenciaRepositoryInterface $asistenciaRepo,
        private RemanenteRepositoryInterface $remanenteRepo,
        private ?NotificadorTelegramInterface $notificador = null
    ) {
    }

    /**
     * Libera las raciones remanentes, genera la alerta y guarda el registro.
     *
     * @param int $cooldownMinutos Tiempo mínimo en minutos entre liberaciones consecutivas (default 10)
     */
    public function liberarRemanentes(
        FechaBolivia $fecha,
        ServicioAlimentario $servicio = ServicioAlimentario::ALMUERZO,
        float $kgPorRacion = 0.5,
        string $horaFin = '14:00',
        int $cooldownMinutos = 10
    ): RemanenteRacion {
        $fechaYmd = $fecha->toYmd();

        // 1. Verificar si existe una liberación reciente y respetar el cooldown anti-spam
        $ultimo = $this->remanenteRepo->obtenerUltimoRemanente($fechaYmd, $servicio);
        if ($ultimo !== null) {
            $tiempoUltimo = strtotime($ultimo->getLiberadoEn());
            $ahora = time();
            $diferenciaSegundos = $ahora - $tiempoUltimo;
            $segundosCooldown = $cooldownMinutos * 60;

            if ($diferenciaSegundos < $segundosCooldown) {
                $restante = ceil(($segundosCooldown - $diferenciaSegundos) / 60);
                throw new DomainException(
                    "Operación bloqueada temporalmente: Ya se notificó la liberación de remanentes hace poco. " .
                    "Espere {$restante} minuto(s) antes de volver a emitir una alerta (Anti-Spam 10 min)."
                );
            }
        }

        // 2. Calcular raciones cocinadas/confirmadas vs retiradas
        $votosSi = $this->votoRepo->contarVotosSi($fechaYmd, $servicio);
        $racionesServidas = $this->asistenciaRepo->contarPorFecha($fechaYmd);

        $excedente = max(0, $votosSi - $racionesServidas);
        if ($excedente <= 0) {
            throw new DomainException(
                "No existen raciones remanentes para liberar hoy (Votos afirmativos: {$votosSi}, Raciones servidas: {$racionesServidas})."
            );
        }

        // 3. Crear entidad de Remanente
        $remanente = RemanenteRacion::liberar($fechaYmd, $servicio, $excedente, $kgPorRacion, $horaFin);
        $this->remanenteRepo->guardar($remanente);

        // 4. Notificar a Telegram si el canal está configurado
        if ($this->notificador !== null) {
            $this->notificador->notificarLiberacionRemanentes($remanente);
        }

        return $remanente;
    }
}
