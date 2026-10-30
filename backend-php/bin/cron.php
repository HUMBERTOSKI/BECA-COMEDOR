<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Services\EstimadorRacionesService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Infrastructure\Firestore\FirestoreAsistenciaRepository;
use BecaComedor\Infrastructure\Firestore\FirestoreClient;
use BecaComedor\Infrastructure\Firestore\FirestoreMenuRepository;
use BecaComedor\Infrastructure\Firestore\FirestoreVotoRepository;
use BecaComedor\Infrastructure\Telegram\TelegramBotService;

/**
 * Script de ejecución periódica (Cron) en PHP POO.
 * Automatiza:
 * 1. Publicación matutina de menú a las 08:00 Bolivia.
 * 2. Envío de estimado de raciones a cocina a las 10:30 Bolivia.
 * 3. Cierre automático de votaciones al pasar la hora límite.
 */

$rootDir = dirname(__DIR__, 2);
$serviceAccountPath = $rootDir . '/firebase-service-account.json';

if (!file_exists($serviceAccountPath)) {
    echo "[-] Error: firebase-service-account.json no encontrado.\n";
    exit(1);
}

$botToken = getenv('BOT_TOKEN') ?: '';
$botTokenCocina = getenv('BOT_TOKEN_COCINA') ?: '';
$chatIdEstudiantes = getenv('TELEGRAM_CHAT_ID') ?: '-1003829511518';
$chatIdCocina = getenv('TELEGRAM_KITCHEN_CHAT_ID') ?: '-1004415815181';

if ($botToken === '' && file_exists($rootDir . '/.bot-token')) {
    $botToken = trim(file_get_contents($rootDir . '/.bot-token'));
}
if ($botTokenCocina === '' && file_exists($rootDir . '/.bot-token-cocina')) {
    $botTokenCocina = trim(file_get_contents($rootDir . '/.bot-token-cocina'));
}

$firestoreClient = new FirestoreClient($serviceAccountPath);
$menuRepo = new FirestoreMenuRepository($firestoreClient);
$votoRepo = new FirestoreVotoRepository($firestoreClient);
$asistenciaRepo = new FirestoreAsistenciaRepository($firestoreClient);
$telegramService = new TelegramBotService($botToken, $botTokenCocina, $chatIdEstudiantes, $chatIdCocina);
$estimador = new EstimadorRacionesService($votoRepo, $asistenciaRepo);

$hoy = FechaBolivia::hoy();
$horaActual = $hoy->getHoraActualHm();
$fechaYmd = $hoy->toYmd();

echo "[*] Ejecutando Cron PHP Beca Comedor UABJB — Fecha: {$fechaYmd} Hora: {$horaActual}\n";

$menu = $menuRepo->obtenerPorFecha($fechaYmd);

// 1. Publicación a las 08:00
if ($horaActual === '08:00' && $menu !== null) {
    echo "[+] Publicando menú matutino...\n";
    $telegramService->publicarMenuEnTelegram($menu, 'ambos');
}

// 2. Envío a cocina a las 10:30
if ($horaActual === '10:30') {
    echo "[+] Enviando estimado a cocina...\n";
    $est = $estimador->estimar($hoy, ServicioAlimentario::ALMUERZO);
    $texto = implode("\n", [
        "🔪 *Estimado del comedor — {$fechaYmd}*",
        '',
        "🟢 Asistirán a almorzar: *{$est['votosSi']}*",
        "🔴 No almorzarán: {$est['votosNo']}",
        '',
        "🍳 Prepara alrededor de *{$est['racionesSugeridas']}* raciones.",
        'La votación ya cerró. ¡Buen provecho!',
    ]);
    $telegramService->enviarEstimadoCocina($texto);
}

// 3. Cierre automático de votación al pasar la hora límite
if ($menu !== null && !$menu->estaCerrado() && $hoy->yaPasoHoraLimite($menu->getHoraLimite())) {
    echo "[+] Cerrando votaciones para el menú del día...\n";
    $menu->cerrarVotaciones();
    $menuRepo->guardar($menu);
    echo "[+] Menú cerrado con éxito.\n";
}

echo "[*] Tarea finalizada con éxito.\n";
