<?php

declare(strict_types=1);

namespace BecaComedor\Tests\Integration;

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
use BecaComedor\Infrastructure\Repositories\InMemoryAsistenciaRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryEstudianteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryMenuRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryRemanenteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryVotoRepository;
use BecaComedor\Infrastructure\Telegram\MockTelegramNotificationService;
use PHPUnit\Framework\TestCase;

class ApiRouterTest extends TestCase
{
    private InMemoryEstudianteRepository $estudianteRepo;
    private InMemoryAsistenciaRepository $asistenciaRepo;
    private InMemoryVotoRepository $votoRepo;
    private InMemoryMenuRepository $menuRepo;
    private InMemoryRemanenteRepository $remanenteRepo;

    private AccesoController $accesoCtrl;
    private EstimacionController $estimacionCtrl;
    private RemanentesController $remanentesCtrl;
    private MenuController $menuCtrl;

    protected function setUp(): void
    {
        $this->estudianteRepo = new InMemoryEstudianteRepository([
            new Estudiante(
                id: 'est_001',
                nombre: 'Jonathan Alvaro Robles',
                ci: '8493021',
                ru: '98432',
                carrera: 'Ingeniería de Sistemas',
                telefono: '76891234',
                foto: null,
                activo: true
            ),
        ]);
        $this->asistenciaRepo = new InMemoryAsistenciaRepository();
        $this->votoRepo = new InMemoryVotoRepository();
        $this->menuRepo = new InMemoryMenuRepository();
        $this->remanenteRepo = new InMemoryRemanenteRepository();
        $mockTelegram = new MockTelegramNotificationService();

        $validador = new ValidadorAccesoService($this->estudianteRepo, $this->asistenciaRepo);
        $estimador = new EstimadorRacionesService($this->votoRepo, $this->asistenciaRepo);
        $rescate = new RescateRemanentesService($this->votoRepo, $this->asistenciaRepo, $this->remanenteRepo, $mockTelegram);
        $reglas = new ReglasNegocioMenuService();

        $this->accesoCtrl = new AccesoController($validador);
        $this->estimacionCtrl = new EstimacionController($estimador);
        $this->remanentesCtrl = new RemanentesController($rescate);
        $this->menuCtrl = new MenuController($this->menuRepo, $reglas);
    }

    public function testEndpointValidarAccesoConQrValido(): void
    {
        $request = new Request(
            method: 'POST',
            path: '/api/validar-acceso',
            queryParams: [],
            body: [
                'qrPayload' => 'BECA1:est_001',
                'fecha' => '2026-10-30',
            ]
        );

        $response = $this->accesoCtrl->validar($request);
        $this->assertSame(200, $response->getStatusCode());

        $data = $response->getData();
        $this->assertTrue($data['autorizado']);
        $this->assertSame('acceso_concedido', $data['codigoMotivo']);
        $this->assertSame('Jonathan Alvaro Robles', $data['estudiante']['nombre']);
    }

    public function testEndpointEstimacionCocina(): void
    {
        $this->votoRepo->guardar(Voto::crear(
            '2026-10-30',
            'est_1',
            ServicioAlimentario::ALMUERZO,
            TipoRespuestaVoto::SI
        ));

        $request = new Request(
            method: 'GET',
            path: '/api/estimacion-cocina',
            queryParams: [
                'fecha' => '2026-10-30',
                'servicio' => 'a',
            ]
        );

        $response = $this->estimacionCtrl->obtener($request);
        $this->assertSame(200, $response->getStatusCode());

        $data = $response->getData();
        $this->assertTrue($data['ok']);
        $this->assertSame(1, $data['datos']['votosSi']);
        $this->assertSame(2, $data['datos']['racionesSugeridas']); // ceil(1 * 1.05) = 2
    }

    public function testEndpointGestionMenuGuardarYConsultar(): void
    {
        $postReq = new Request(
            method: 'POST',
            path: '/api/menu',
            queryParams: [],
            body: [
                'fecha' => '2026-10-30',
                'platillos' => ['Sopa de Maní', 'Majadito'],
                'platillosCena' => ['Pollo al Horno'],
                'feriado' => false,
                'publicar' => true,
            ]
        );

        $postRes = $this->menuCtrl->guardar($postReq);
        $this->assertSame(201, $postRes->getStatusCode());

        $getReq = new Request(
            method: 'GET',
            path: '/api/menu',
            queryParams: ['fecha' => '2026-10-30']
        );

        $getRes = $this->menuCtrl->obtener($getReq);
        $this->assertSame(200, $getRes->getStatusCode());
        $data = $getRes->getData();
        $this->assertTrue($data['existe']);
        $this->assertCount(2, $data['menu']['platillosAlmuerzo']);
        $this->assertSame('publicado', $data['menu']['estado']);
    }
}
