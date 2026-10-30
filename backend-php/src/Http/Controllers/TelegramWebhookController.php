<?php

declare(strict_types=1);

namespace BecaComedor\Http\Controllers;

use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Enums\TipoRespuestaVoto;
use BecaComedor\Domain\Interfaces\EstudianteRepositoryInterface;
use BecaComedor\Domain\Interfaces\MenuRepositoryInterface;
use BecaComedor\Domain\Interfaces\VotoRepositoryInterface;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;

class TelegramWebhookController
{
    public function __construct(
        private EstudianteRepositoryInterface $estudianteRepo,
        private VotoRepositoryInterface $votoRepo,
        private MenuRepositoryInterface $menuRepo,
        private string $botToken
    ) {
    }

    public function handle(Request $request): Response
    {
        $update = $request->getBody();

        // 1. Manejo de clics en botones inline (Votación de Almuerzo / Cena)
        if (isset($update['callback_query'])) {
            $this->procesarCallback($update['callback_query']);
            return Response::json(['ok' => true]);
        }

        // 2. Manejo de mensajes de texto y comandos
        if (isset($update['message'])) {
            $this->procesarMensaje($update['message']);
            return Response::json(['ok' => true]);
        }

        return Response::json(['ok' => true]);
    }

    private function procesarCallback(array $cq): void
    {
        $callbackId = $cq['id'] ?? '';
        $data = $cq['data'] ?? '';
        $fromId = (int) ($cq['from']['id'] ?? 0);
        $hoy = FechaBolivia::hoy();
        $fechaYmd = $hoy->toYmd();

        // Mapear callback data: 'a_si', 'a_no', 'c_si', 'c_no'
        $servicio = str_starts_with($data, 'c_') ? ServicioAlimentario::CENA : ServicioAlimentario::ALMUERZO;
        $esAfirmativo = str_ends_with($data, '_si') || $data === 'si';
        $respuesta = $esAfirmativo ? TipoRespuestaVoto::SI : TipoRespuestaVoto::NO;

        // Verificar si la votación sigue abierta
        $menu = $this->menuRepo->obtenerPorFecha($fechaYmd);
        if ($menu !== null && !$menu->puedeVotar($hoy)) {
            $this->responderCallback($callbackId, '🔒 La votación para este servicio ya cerró.', true);
            return;
        }

        // Buscar estudiante por su Telegram User ID o registrar voto
        $studentId = "tg_{$fromId}";
        $voto = Voto::crear($fechaYmd, $studentId, $servicio, $respuesta, $fromId);
        $this->votoRepo->guardar($voto);

        $msgConfirmacion = $esAfirmativo
            ? "✅ ¡Confirmado! Asistirás a " . $servicio->getNombreCompleto()
            : "❌ Registrado: No asistirás a " . $servicio->getNombreCompleto();

        $this->responderCallback($callbackId, $msgConfirmacion, false);
    }

    private function procesarMensaje(array $msg): void
    {
        $chatId = $msg['chat']['id'] ?? null;
        $fromId = (int) ($msg['from']['id'] ?? 0);
        $text = trim($msg['text'] ?? '');

        if ($chatId === null) return;

        // Comando /miid
        if ($text === '/miid') {
            $this->enviarMensaje((string)$chatId, "👤 Tu ID de Telegram es: `{$fromId}`");
            return;
        }

        // Comando /start o /menu
        if ($text === '/start' || $text === '/menu') {
            $hoy = FechaBolivia::hoy();
            $menu = $this->menuRepo->obtenerPorFecha($hoy->toYmd());

            if ($menu === null) {
                $this->enviarMensaje((string)$chatId, "👋 ¡Hola! El menú del día de hoy aún no ha sido publicado. Consulta más tarde.");
                return;
            }

            $platos = implode("\n", array_map(fn($p) => "🍲 • {$p}", $menu->getPlatillosAlmuerzo()));
            $respuesta = "🍽️ *Menú de Hoy ({$hoy->getDiaSemanaEspanol()} {$hoy->toDmy()}):*\n\n{$platos}\n\n🗳️ Revisa el grupo de comensales para votar.";
            $this->enviarMensaje((string)$chatId, $respuesta);
            return;
        }

        // Si comparte contacto
        if (isset($msg['contact']['phone_number'])) {
            $telefono = preg_replace('/\D/', '', $msg['contact']['phone_number']);
            $this->enviarMensaje((string)$chatId, "📱 Número recibido ({$telefono}). Cuenta vinculada con éxito.");
        }
    }

    private function responderCallback(string $callbackId, string $text, bool $showAlert = false): void
    {
        if ($callbackId === '' || $this->botToken === '') return;

        $url = "https://api.telegram.org/bot{$this->botToken}/answerCallbackQuery";
        $payload = [
            'callback_query_id' => $callbackId,
            'text' => $text,
            'show_alert' => $showAlert,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    }

    private function enviarMensaje(string $chatId, string $text): void
    {
        if ($this->botToken === '') return;

        $url = "https://api.telegram.org/bot{$this->botToken}/sendMessage";
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown',
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    }
}
