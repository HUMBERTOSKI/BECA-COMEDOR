<?php

declare(strict_types=1);

namespace BecaComedor\Tests\Unit;

use BecaComedor\Domain\Entities\RegistroAsistencia;
use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Enums\TipoRespuestaVoto;
use BecaComedor\Domain\Services\RescateRemanentesService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Infrastructure\Repositories\InMemoryAsistenciaRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryRemanenteRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryVotoRepository;
use BecaComedor\Infrastructure\Telegram\MockTelegramNotificationService;
use DomainException;
use PHPUnit\Framework\TestCase;

class RescateRemanentesTest extends TestCase
{
    private InMemoryVotoRepository $votoRepo;
    private InMemoryAsistenciaRepository $asistenciaRepo;
    private InMemoryRemanenteRepository $remanenteRepo;
    private MockTelegramNotificationService $notificador;
    private RescateRemanentesService $service;

    protected function setUp(): void
    {
        $this->votoRepo = new InMemoryVotoRepository();
        $this->asistenciaRepo = new InMemoryAsistenciaRepository();
        $this->remanenteRepo = new InMemoryRemanenteRepository();
        $this->notificador = new MockTelegramNotificationService();

        $this->service = new RescateRemanentesService(
            $this->votoRepo,
            $this->asistenciaRepo,
            $this->remanenteRepo,
            $this->notificador
        );
    }

    public function testLiberaRemanentesYCalculaKilogramosSalvadosOds12(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $ymd = $fecha->toYmd();

        // 100 comensales votaron SÍ
        for ($i = 1; $i <= 100; $i++) {
            $this->votoRepo->guardar(Voto::crear($ymd, "est_{$i}", ServicioAlimentario::ALMUERZO, TipoRespuestaVoto::SI));
        }

        // Solo 70 comensales retiraron su ración en mesón
        for ($j = 1; $j <= 70; $j++) {
            $this->asistenciaRepo->guardar(RegistroAsistencia::registrar($ymd, "est_{$j}"));
        }

        // Excedente = 100 - 70 = 30 raciones remanentes
        $remanente = $this->service->liberarRemanentes($fecha, ServicioAlimentario::ALMUERZO, 0.5, '14:00', 10);

        $this->assertSame(30, $remanente->getCantidad());
        $this->assertSame(15.0, $remanente->getKgRescatados()); // 30 * 0.5 kg
        $this->assertTrue($remanente->isActivo());

        // Verificar que se invocó la notificación simulada a Telegram
        $this->assertCount(1, $this->notificador->remanentesNotificados);
    }

    public function testBloqueaLiberacionesConsecutivasDentroDelCooldownDeDiezMinutos(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $ymd = $fecha->toYmd();

        for ($i = 1; $i <= 50; $i++) {
            $this->votoRepo->guardar(Voto::crear($ymd, "est_{$i}", ServicioAlimentario::ALMUERZO, TipoRespuestaVoto::SI));
        }

        // Primera liberación: OK
        $this->service->liberarRemanentes($fecha, ServicioAlimentario::ALMUERZO, 0.5, '14:00', 10);

        // Segunda liberación inmediata: debe lanzar DomainException por Anti-Spam
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Operación bloqueada temporalmente');

        $this->service->liberarRemanentes($fecha, ServicioAlimentario::ALMUERZO, 0.5, '14:00', 10);
    }

    public function testLanzaExcepcionSiNoHayComidaSobrante(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $ymd = $fecha->toYmd();

        // 20 votos SÍ y 20 raciones ya servidas (0 remanentes)
        for ($i = 1; $i <= 20; $i++) {
            $this->votoRepo->guardar(Voto::crear($ymd, "est_{$i}", ServicioAlimentario::ALMUERZO, TipoRespuestaVoto::SI));
            $this->asistenciaRepo->guardar(RegistroAsistencia::registrar($ymd, "est_{$i}"));
        }

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('No existen raciones remanentes para liberar');

        $this->service->liberarRemanentes($fecha, ServicioAlimentario::ALMUERZO, 0.5, '14:00', 10);
    }
}
