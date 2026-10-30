<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use BecaComedor\Domain\Entities\Estudiante;
use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Services\EstimadorRacionesService;
use BecaComedor\Domain\Services\ReglasNegocioMenuService;
use BecaComedor\Domain\Services\RescateRemanentesService;
use BecaComedor\Domain\Services\ValidadorAccesoService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Controllers\AccesoController;
use BecaComedor\Http\Controllers\EstimacionController;
use BecaComedor\Http\Controllers\MenuController;
use BecaComedor\Http\Controllers\RemanentesController;
use BecaComedor\Http\Controllers\TelegramWebhookController;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;
use BecaComedor\Infrastructure\Firestore\FirestoreAsistenciaRepository;
use BecaComedor\Infrastructure\Firestore\FirestoreClient;
use BecaComedor\Infrastructure\Firestore\FirestoreEstudianteRepository;
use BecaComedor\Infrastructure\Firestore\FirestoreMenuRepository;
use BecaComedor\Infrastructure\Firestore\FirestoreRemanenteRepository;
use BecaComedor\Infrastructure\Firestore\FirestoreVotoRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryAsistenciaRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryEstudianteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryMenuRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryRemanenteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryVotoRepository;
use BecaComedor\Infrastructure\Telegram\MockTelegramNotificationService;
use BecaComedor\Infrastructure\Telegram\TelegramBotService;

// Configurar encabezados CORS globales
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Telegram-Bot-Api-Secret-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -------------------------------------------------------------
// Detección de Configuración y Credenciales de Producción
// -------------------------------------------------------------
$rootDir = dirname(__DIR__, 2);
$serviceAccountPath = $rootDir . '/firebase-service-account.json';

// Cargar Tokens de Telegram
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

// -------------------------------------------------------------
// Inicialización de Repositorios (Firestore Real vs InMemory)
// -------------------------------------------------------------
$esModoProduccion = file_exists($serviceAccountPath);

if ($esModoProduccion) {
    try {
        $firestoreClient = new FirestoreClient($serviceAccountPath);
        $estudianteRepo = new FirestoreEstudianteRepository($firestoreClient);
        $asistenciaRepo = new FirestoreAsistenciaRepository($firestoreClient);
        $votoRepo = new FirestoreVotoRepository($firestoreClient);
        $menuRepo = new FirestoreMenuRepository($firestoreClient);
        $remanenteRepo = new FirestoreRemanenteRepository($firestoreClient);
    } catch (\Throwable $e) {
        $esModoProduccion = false;
    }
}

if (!$esModoProduccion) {
    // Fallback seguro a repositorios en memoria si no hay cuenta de servicio
    $estudianteRepo = new InMemoryEstudianteRepository([
        new Estudiante('est_001', 'Jonathan Alvaro Robles', '8493021', '98432', 'Ingeniería de Sistemas', '76891234', null, true),
        new Estudiante('est_002', 'Camila Arrazola', '7392019', '97654', 'Ingeniería de Sistemas', '77234567', null, true),
        new Estudiante('est_inactivo', 'Estudiante Suspendido', '6123456', '88776', 'Derecho', '', null, false),
    ]);
    $asistenciaRepo = new InMemoryAsistenciaRepository();
    $votoRepo = new InMemoryVotoRepository();
    $menuRepo = new InMemoryMenuRepository();
    $remanenteRepo = new InMemoryRemanenteRepository();
}

// Configurar Notificador Telegram
if ($botToken !== '') {
    $notificadorTelegram = new TelegramBotService($botToken, $botTokenCocina, $chatIdEstudiantes, $chatIdCocina);
} else {
    $notificadorTelegram = new MockTelegramNotificationService();
}

// -------------------------------------------------------------
// Servicios de Dominio POO
// -------------------------------------------------------------
$validadorService = new ValidadorAccesoService($estudianteRepo, $asistenciaRepo);
$estimadorService = new EstimadorRacionesService($votoRepo, $asistenciaRepo);
$rescateService = new RescateRemanentesService($votoRepo, $asistenciaRepo, $remanenteRepo, $notificadorTelegram);
$reglasService = new ReglasNegocioMenuService();

// -------------------------------------------------------------
// Controladores
// -------------------------------------------------------------
$accesoController = new AccesoController($validadorService);
$estimacionController = new EstimacionController($estimadorService);
$remanentesController = new RemanentesController($rescateService);
$menuController = new MenuController($menuRepo, $reglasService);
$telegramWebhookController = new TelegramWebhookController($estudianteRepo, $votoRepo, $menuRepo, $botToken);

// -------------------------------------------------------------
// Enrutamiento HTTP
// -------------------------------------------------------------
$request = Request::fromGlobals();
$path = rtrim($request->getPath(), '/');
$method = $request->getMethod();

// Manejo de rutas con compatibilidad estricta con el Frontend anterior y las nuevas rutas REST
$response = match (true) {
    // 1. Healthcheck y descripción del sistema
    $path === '' || $path === '/api' || $path === '/api/health' => Response::exito([
        'proyecto' => 'Comedor Universitario U.A.B.J.B. - Backend POO en PHP 8.5',
        'arquitectura' => 'Domain-Driven Design / Clean Architecture (POO)',
        'modo' => $esModoProduccion ? 'Producción (Google Cloud Firestore)' : 'Desarrollo Local (InMemory)',
        'fechaBolivia' => FechaBolivia::hoy()->toYmd() . ' ' . FechaBolivia::hoy()->getHoraActualHm(),
        'endpoints' => [
            'POST /validate' => 'Validación de credenciales QR y registro atómico de asistencia',
            'POST /publicarmenu' => 'Publicación de minuta diaria en Telegram',
            'POST /notify-kitchen' => 'Envío del estimado de raciones a cocina por Telegram',
            'POST /liberar-remanentes' => 'Rescate de excedentes ODS 12 con alerta y cooldown de 10 min',
            'GET /api/estimacion-cocina' => 'Consulta de raciones sugeridas e insumos para cocción',
            'GET /api/menu' => 'Consulta de menú y reglas según día',
            'POST /api/telegram-webhook' => 'Recepción de webhook y votación interactiva de Telegram',
        ]
    ]),

    // 2. Validación en Mesón / Recepción (Contrato idéntico al frontend: { code: string })
    ($path === '/validate' || $path === '/api/validar-acceso') && $method === 'POST' => (function() use ($request, $validadorService) {
        $rawCode = $request->input('code') ?? $request->input('qrPayload') ?? $request->input('codigo');
        if (!is_string($rawCode) || trim($rawCode) === '') {
            return Response::json(['ok' => false, 'reason' => 'qr_invalido'], 400);
        }

        $resultado = $validadorService->validar($rawCode);
        if (!$resultado->isAutorizado()) {
            return Response::json([
                'ok' => false,
                'reason' => $resultado->codigoMotivo,
                'mensaje' => $resultado->mensaje,
            ], 200); // El frontend espera { ok: false, reason: 'ya_comio'|'inactivo'|... }
        }

        $est = $resultado->estudiante;
        return Response::json([
            'ok' => true,
            'student' => [
                'nombre' => $est?->getNombre() ?? '',
                'ci' => $est?->getCi() ?? '',
                'ru' => $est?->getRu() ?? '',
                'carrera' => $est?->getCarrera() ?? '',
                'foto' => $est?->getFoto() ?? null,
            ],
            'autorizado' => true,
            'codigoMotivo' => 'acceso_concedido',
        ]);
    })(),

    // 3. Publicación de Menú en Telegram
    $path === '/publicarmenu' && $method === 'POST' => (function() use ($request, $menuRepo, $notificadorTelegram) {
        $fechaStr = (string) ($request->input('fecha') ?? FechaBolivia::hoy()->toYmd());
        $servicio = (string) ($request->input('servicio') ?? 'ambos');

        $menu = $menuRepo->obtenerPorFecha($fechaStr);
        if ($menu === null) {
            return Response::json(['ok' => false, 'error' => 'No existe menú registrado para la fecha indicada'], 404);
        }

        if ($notificadorTelegram instanceof TelegramBotService) {
            $res = $notificadorTelegram->publicarMenuEnTelegram($menu, $servicio);
            return Response::json($res);
        }

        return Response::json(['ok' => true, 'mensaje' => 'Simulación de publicación completada']);
    })(),

    // 4. Notificar a Cocina por Telegram
    $path === '/notify-kitchen' && $method === 'POST' => (function() use ($estimadorService, $notificadorTelegram) {
        $hoy = FechaBolivia::hoy();
        $estimado = $estimadorService->estimar($hoy, ServicioAlimentario::ALMUERZO);

        $si = $estimado['votosSi'];
        $no = $estimado['votosNo'];
        $sugeridas = $estimado['racionesSugeridas'];
        $kg = $estimado['kgInsumosEstimados'];

        $texto = implode("\n", [
            "🔪 *Estimado del comedor — {$hoy->toYmd()}*",
            '',
            "🟢 Asistirán a almorzar: *{$si}*",
            "🔴 No almorzarán: {$no}",
            '',
            "🍳 Prepara alrededor de *{$sugeridas}* raciones (aprox. *{$kg} kg* de insumos).",
            'La votación ya cerró. ¡Buen provecho!',
        ]);

        $enviado = $notificadorTelegram->enviarEstimadoCocina($texto);
        return Response::json([
            'ok' => true,
            'enviado' => $enviado,
            'votosSi' => $si,
            'votosNo' => $no,
            'racionesSugeridas' => $sugeridas,
        ]);
    })(),

    // 5. Liberar Remanentes (ODS 12)
    ($path === '/liberar-remanentes' || $path === '/api/liberar-remanentes') && $method === 'POST' => $remanentesController->liberar($request),

    // 6. Consultas de Menú y Estimación
    $path === '/api/estimacion-cocina' && $method === 'GET' => $estimacionController->obtener($request),
    $path === '/api/menu' && $method === 'GET' => $menuController->obtener($request),
    $path === '/api/menu' && $method === 'POST' => $menuController->guardar($request),

    // 7. Webhook interactivo de Telegram
    ($path === '' || $path === '/' || $path === '/api/telegram-webhook') && $method === 'POST' && isset($request->getBody()['update_id']) =>
        $telegramWebhookController->handle($request),

    default => Response::error("Ruta '{$method} {$path}' no encontrada en el backend POO.", 404),
};

$response->send();
