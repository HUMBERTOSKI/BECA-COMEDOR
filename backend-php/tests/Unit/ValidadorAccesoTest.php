<?php

declare(strict_types=1);

namespace BecaComedor\Tests\Unit;

use BecaComedor\Domain\Entities\Estudiante;
use BecaComedor\Domain\Enums\EstadoAcceso;
use BecaComedor\Domain\Services\ValidadorAccesoService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Infrastructure\Repositories\InMemoryAsistenciaRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryEstudianteRepository;
use PHPUnit\Framework\TestCase;

class ValidadorAccesoTest extends TestCase
{
    private InMemoryEstudianteRepository $estudianteRepo;
    private InMemoryAsistenciaRepository $asistenciaRepo;
    private ValidadorAccesoService $service;

    protected function setUp(): void
    {
        $this->estudianteRepo = new InMemoryEstudianteRepository([
            new Estudiante(
                id: 'est_101',
                nombre: 'Jonathan Alvaro Robles',
                ci: '8493021',
                ru: '98432',
                carrera: 'Ingeniería de Sistemas',
                telefono: '76891234',
                foto: null,
                activo: true
            ),
            new Estudiante(
                id: 'est_suspendido',
                nombre: 'Estudiante Sancionado',
                ci: '7123982',
                ru: '95123',
                carrera: 'Derecho',
                telefono: '',
                foto: null,
                activo: false
            ),
        ]);
        $this->asistenciaRepo = new InMemoryAsistenciaRepository();
        $this->service = new ValidadorAccesoService($this->estudianteRepo, $this->asistenciaRepo);
    }

    public function testAccesoAutorizadoParaEstudianteActivoConQrValido(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $res = $this->service->validar('BECA1:est_101', $fecha);

        $this->assertTrue($res->isAutorizado());
        $this->assertSame(EstadoAcceso::AUTORIZADO, $res->estado);
        $this->assertSame('acceso_concedido', $res->codigoMotivo);
        $this->assertSame('Jonathan Alvaro Robles', $res->estudiante?->getNombre());

        // Verificar que quedó registrado en el repositorio de asistencia
        $this->assertTrue($this->asistenciaRepo->yaRegistroAsistencia('2026-10-30', 'est_101'));
    }

    public function testBloqueoPorDobleRacionElMismoDiaYaComio(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        // Primer escaneo: concedido
        $this->service->validar('BECA1:est_101', $fecha);

        // Segundo escaneo el mismo día: BLOQUEADO (ya_comio)
        $res2 = $this->service->validar('BECA1:est_101', $fecha);

        $this->assertFalse($res2->isAutorizado());
        $this->assertSame(EstadoAcceso::BLOQUEADO, $res2->estado);
        $this->assertSame('ya_comio', $res2->codigoMotivo);
    }

    public function testBloqueoPorEstudianteInactivoOSuspendido(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $res = $this->service->validar('BECA1:est_suspendido', $fecha);

        $this->assertFalse($res->isAutorizado());
        $this->assertSame('inactivo', $res->codigoMotivo);
    }

    public function testBloqueoPorEstudianteNoRegistradoEnPadron(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $res = $this->service->validar('BECA1:est_fantasma', $fecha);

        $this->assertFalse($res->isAutorizado());
        $this->assertSame('no_registrado', $res->codigoMotivo);
    }

    public function testBloqueoPorQrConFormatoInvalido(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $res = $this->service->validar('QR_FALSO_SIN_PREFIJO', $fecha);

        $this->assertFalse($res->isAutorizado());
        $this->assertSame('qr_invalido', $res->codigoMotivo);
    }
}
