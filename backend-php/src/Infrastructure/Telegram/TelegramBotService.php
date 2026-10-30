<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Telegram;

use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\Entities\RemanenteRacion;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Interfaces\NotificadorTelegramInterface;

class TelegramBotService implements NotificadorTelegramInterface
{
    public function __construct(
        private string $botTokenEstudiantes,
        private string $botTokenCocina,
        private string $chatIdEstudiantes,
        private string $chatIdCocina
    ) {
    }

    public function enviarEstimadoCocina(string $mensaje): bool
    {
        if (trim($this->botTokenCocina) === '' || trim($this->chatIdCocina) === '') {
            return false;
        }

        return $this->enviarMensaje($this->botTokenCocina, $this->chatIdCocina, $mensaje);
    }

    public function notificarLiberacionRemanentes(RemanenteRacion $remanente): bool
    {
        if (trim($this->botTokenEstudiantes) === '' || trim($this->chatIdEstudiantes) === '') {
            return false;
        }

        $servicioNombre = $remanente->getServicio() === ServicioAlimentario::CENA ? 'la CENA' : 'el ALMUERZO';
        $cantidad = $remanente->getCantidad();
        $kg = $remanente->getKgRescatados();
        $horaFin = $remanente->getHoraFin();

        $lineas = [
            '♻️ *¡ALERTA DE RESCATE DE ALIMENTOS (ODS 12)!*',
            '',
            "Se acaban de liberar *{$cantidad} raciones remanentes* para {$servicioNombre}.",
            "📦 Equivalente a *{$kg} kg de comida* rescatados del desperdicio.",
            '',
            "⏰ Retiro disponible hasta las *{$horaFin}* por estricto orden de llegada.",
            '🎫 *Requisito obligatorio:* Portar tu carnet universitario con código QR.',
            '',
            '¡Aprovecha y evita el desperdicio alimentario!',
        ];

        return $this->enviarMensaje($this->botTokenEstudiantes, $this->chatIdEstudiantes, implode("\n", $lineas));
    }

    public function publicarMenuEnTelegram(MenuDia $menu, string $servicio = 'ambos'): array
    {
        if (trim($this->botTokenEstudiantes) === '' || trim($this->chatIdEstudiantes) === '') {
            return ['ok' => false, 'error' => 'Bot token o chat ID no configurado'];
        }

        $fecha = $menu->getFecha();
        $fechaYmd = $fecha->toYmd();
        $diaSemana = $fecha->getDiaSemanaEspanol();
        $horaLimite = $menu->getHoraLimite();

        $resultados = [];

        // 1. Mensaje de Almuerzo
        if ($servicio === 'ambos' || $servicio === 'almuerzo') {
            $platillosAlm = $menu->getPlatillosAlmuerzo();
            $listaPlatos = empty($platillosAlm) ? '• Minuta regular del día' : implode("\n", array_map(fn($p) => "🍲 • {$p}", $platillosAlm));

            $textoAlm = implode("\n", [
                "🍽️ *MENÚ DEL DÍA — {$diaSemana} {$fecha->toDmy()}*",
                "⏰ *Servicio de Almuerzo (12:00 - 14:00)*",
                '',
                $listaPlatos,
                '',
                "🗳️ Confirma tu asistencia hasta las *{$horaLimite}*:",
            ]);

            $keyboardAlm = [
                'inline_keyboard' => [
                    [['text' => '🟢 Sí, iré a almorzar', 'callback_data' => 'a_si']],
                    [['text' => '🔴 No asistiré al almuerzo', 'callback_data' => 'a_no']],
                ],
            ];

            $resAlm = $this->enviarMensaje($this->botTokenEstudiantes, $this->chatIdEstudiantes, $textoAlm, $keyboardAlm);
            $resultados['almuerzo'] = $resAlm;
        }

        // 2. Mensaje de Cena (si está habilitado para el día)
        if (($servicio === 'ambos' || $servicio === 'cena') && $menu->tieneServicioCena()) {
            $platillosCena = $menu->getPlatillosCena();
            $listaPlatosCena = empty($platillosCena) ? '• Cena según menú planificado' : implode("\n", array_map(fn($p) => "🍛 • {$p}", $platillosCena));

            $modalidad = $fecha->esSabado() ? ' *(Modalidad: Exclusivamente para llevar)*' : '';

            $textoCena = implode("\n", [
                "🌙 *MENÚ DE CENA — {$diaSemana} {$fecha->toDmy()}*",
                "⏰ *Servicio de Cena (18:00 - 19:00)*{$modalidad}",
                '',
                $listaPlatosCena,
                '',
                "🗳️ Confirma tu asistencia hasta las *{$horaLimite}*:",
            ]);

            $keyboardCena = [
                'inline_keyboard' => [
                    [['text' => '🟢 Sí, acudiré a la cena', 'callback_data' => 'c_si']],
                    [['text' => '🔴 No acudiré a la cena', 'callback_data' => 'c_no']],
                ],
            ];

            $resCena = $this->enviarMensaje($this->botTokenEstudiantes, $this->chatIdEstudiantes, $textoCena, $keyboardCena);
            $resultados['cena'] = $resCena;
        }

        return ['ok' => true, 'envios' => $resultados];
    }

    private function enviarMensaje(string $botToken, string $chatId, string $text, ?array $keyboard = null): bool
    {
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown',
        ];

        if ($keyboard !== null) {
            $payload['reply_markup'] = $keyboard;
        }

        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }
}
