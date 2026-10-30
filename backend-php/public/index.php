<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use BecaComedor\Domain\Entities\Estudiante;
use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\EstadoMenu;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Enums\TipoRespuestaVoto;
use BecaComedor\Domain\Services\EstimadorRacionesService;
use BecaComedor\Domain\Services\ReglasNegocioMenuService;
use BecaComedor\Domain\Services\RescateRemanentesService;
use BecaComedor\Domain\Services\ValidadorAccesoService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Http\Controllers\AccesoController;
use BecaComedor\Http\Controllers\EstimacionController;
use BecaComedor\Http\Controllers\MenuController;
use BecaComedor\Http\Controllers\RemanentesController;
use BecaComedor\Http\Request;
use BecaComedor\Http\Response;
use BecaComedor\Infrastructure\Repositories\InMemoryAsistenciaRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryEstudianteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryMenuRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryRemanenteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryVotoRepository;
use BecaComedor\Infrastructure\Telegram\MockTelegramNotificationService;

// Configurar encabezados CORS globales
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// -------------------------------------------------------------
// Inyección de Dependencias y Cableado de Repositorios
// -------------------------------------------------------------
$estudianteRepo = new InMemoryEstudianteRepository([
    new Estudiante(
        id: 'est_001',
        nombre: 'Jonathan Alvaro Robles',
        ci: '8493021',
        ru: '98432',
        carrera: 'Ingeniería de Sistemas',
        telefono: '76891234',
        foto: 'data:image/jpeg;base64,...',
        activo: true
    ),
    new Estudiante(
        id: 'est_002',
        nombre: 'Camila Arrazola',
        ci: '7392019',
        ru: '97654',
        carrera: 'Ingeniería de Sistemas',
        telefono: '77234567',
        foto: null,
        activo: true
    ),
    new Estudiante(
        id: 'est_inactivo',
        nombre: 'Estudiante Suspendido',
        ci: '6123456',
        ru: '88776',
        carrera: 'Derecho',
        telefono: '',
        foto: null,
        activo: false
    ),
]);

$asistenciaRepo = new InMemoryAsistenciaRepository();
$votoRepo = new InMemoryVotoRepository();
$menuRepo = new InMemoryMenuRepository();
$remanenteRepo = new InMemoryRemanenteRepository();
$notificador = new MockTelegramNotificationService();

// Poblar menú de hoy y votos de prueba
$hoy = FechaBolivia::hoy();
$menuHoy = new MenuDia(
    fecha: $hoy,
    platillosAlmuerzo: ['Sopa de Maní tradicional', 'Majadito de Charque tostado con huevo y plátano', 'Refresco de Tamarindo'],
    platillosCena: ['Arroz con Pollo a la cacerola'],
    feriado: false,
    horaLimite: '10:30',
    estado: EstadoMenu::PUBLICADO
);
$menuRepo->guardar($menuHoy);

// Simular 150 votos afirmativos para estimación inicial
for ($i = 1; $i <= 150; $i++) {
    $votoRepo->guardar(Voto::crear(
        $hoy->toYmd(),
        "est_sim_{$i}",
        ServicioAlimentario::ALMUERZO,
        TipoRespuestaVoto::SI
    ));
}

// -------------------------------------------------------------
// Instanciación de Servicios de Dominio
// -------------------------------------------------------------
$validadorService = new ValidadorAccesoService($estudianteRepo, $asistenciaRepo);
$estimadorService = new EstimadorRacionesService($votoRepo, $asistenciaRepo);
$rescateService = new RescateRemanentesService($votoRepo, $asistenciaRepo, $remanenteRepo, $notificador);
$reglasService = new ReglasNegocioMenuService();

// -------------------------------------------------------------
// Controladores
// -------------------------------------------------------------
$accesoController = new AccesoController($validadorService);
$estimacionController = new EstimacionController($estimadorService);
$remanentesController = new RemanentesController($rescateService);
$menuController = new MenuController($menuRepo, $reglasService);

// -------------------------------------------------------------
// Enrutamiento HTTP
// -------------------------------------------------------------
$request = Request::fromGlobals();
$path = rtrim($request->getPath(), '/');
$method = $request->getMethod();

$response = match (true) {
    $path === '' || $path === '/api' || $path === '/api/health' => Response::exito([
        'proyecto' => 'Comedor Universitario U.A.B.J.B. - Backend POO en PHP 8.5',
        'arquitectura' => 'Domain-Driven Design / Clean Architecture (POO)',
        'estado' => 'Activo y en ejecución',
        'fechaBolivia' => $hoy->toYmd() . ' ' . $hoy->getHoraActualHm(),
        'endpoints' => [
            'POST /api/validar-acceso' => 'Validación de credenciales QR y registro de asistencia',
            'GET /api/estimacion-cocina' => 'Estimación de raciones cocinadas vs demanda en Telegram',
            'POST /api/liberar-remanentes' => 'Rescate de comida excedente ODS 12 con cooldown 10 min',
            'GET /api/menu' => 'Consulta de menú y reglas según día y feriados',
            'POST /api/menu' => 'Creación y publicación de minuta alimentaria',
        ]
    ]),

    $path === '/api/validar-acceso' && $method === 'POST' => $accesoController->validar($request),
    $path === '/api/estimacion-cocina' && $method === 'GET' => $estimacionController->obtener($request),
    $path === '/api/liberar-remanentes' && $method === 'POST' => $remanentesController->liberar($request),
    $path === '/api/menu' && $method === 'GET' => $menuController->obtener($request),
    $path === '/api/menu' && $method === 'POST' => $menuController->guardar($request),

    default => Response::error("Ruta '{$method} {$path}' no encontrada en el API REST POO.", 404),
};

$response->send();
