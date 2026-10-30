<?php

declare(strict_types=1);

namespace BecaComedor\Tests\Unit;

use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Enums\TipoRespuestaVoto;
use BecaComedor\Domain\Services\EstimadorRacionesService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use BecaComedor\Infrastructure\Repositories\InMemoryAsistenciaRepository;
use BecaComedor\Infrastructure\Repositories\InMemoryVotoRepository;
use PHPUnit\Framework\TestCase;

class EstimadorRacionesTest extends TestCase
{
    private InMemoryVotoRepository $votoRepo;
    private InMemoryAsistenciaRepository $asistenciaRepo;
    private EstimadorRacionesService $service;

    protected function setUp(): void
    {
        $this->votoRepo = new InMemoryVotoRepository();
        $this->asistenciaRepo = new InMemoryAsistenciaRepository();
        $this->service = new EstimadorRacionesService($this->votoRepo, $this->asistenciaRepo);
    }

    public function testCalculaRacionesSugeridasConCincoPorCientoDeMargen(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-30');
        $ymd = $fecha->toYmd();

        // 100 comensales votan SÍ
        for ($i = 1; $i <= 100; $i++) {
            $this->votoRepo->guardar(Voto::crear(
                $ymd,
                "est_{$i}",
                ServicioAlimentario::ALMUERZO,
                TipoRespuestaVoto::SI
            ));
        }

        // 20 comensales votan NO
        for ($j = 101; $j <= 120; $j++) {
            $this->votoRepo->guardar(Voto::crear(
                $ymd,
                "est_{$j}",
                ServicioAlimentario::ALMUERZO,
                TipoRespuestaVoto::NO
            ));
        }

        $res = $this->service->estimar($fecha, ServicioAlimentario::ALMUERZO, 0.5, 0.05);

        $this->assertSame(100, $res['votosSi']);
        $this->assertSame(20, $res['votosNo']);
        $this->assertSame(120, $res['totalVotos']);
        // 100 * 1.05 = 105 raciones sugeridas
        $this->assertSame(105, $res['racionesSugeridas']);
        // 105 * 0.5 kg = 52.5 kg
        $this->assertSame(52.5, $res['kgInsumosEstimados']);
    }
}
