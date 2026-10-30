<?php

declare(strict_types=1);

namespace BecaComedor\Tests\Unit;

use BecaComedor\Domain\Services\ReglasNegocioMenuService;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use PHPUnit\Framework\TestCase;

class ReglasNegocioMenuTest extends TestCase
{
    private ReglasNegocioMenuService $service;

    protected function setUp(): void
    {
        $this->service = new ReglasNegocioMenuService();
    }

    public function testAtencionNormalDeLunesAViernes(): void
    {
        // 2026-10-28 fue Miércoles
        $fecha = FechaBolivia::desdeString('2026-10-28');
        $eval = $this->service->evaluarServiciosDisponibles($fecha);

        $this->assertTrue($eval['almuerzoHabilitado']);
        $this->assertTrue($eval['cenaHabilitada']);
        $this->assertFalse($eval['cenaParaLlevar']);
        $this->assertFalse($eval['esFeriado']);
    }

    public function testSabadoCenaExclusivamenteParaLlevar(): void
    {
        // 2026-10-31 es Sábado
        $fecha = FechaBolivia::desdeString('2026-10-31');
        $eval = $this->service->evaluarServiciosDisponibles($fecha);

        $this->assertTrue($eval['almuerzoHabilitado']);
        $this->assertTrue($eval['cenaHabilitada']);
        $this->assertTrue($eval['cenaParaLlevar']);
    }

    public function testDomingoSinServicioDeCena(): void
    {
        // 2026-11-01 es Domingo
        $fecha = FechaBolivia::desdeString('2026-11-01');
        $eval = $this->service->evaluarServiciosDisponibles($fecha);

        $this->assertTrue($eval['almuerzoHabilitado']);
        $this->assertFalse($eval['cenaHabilitada']);
    }

    public function testFeriadoHabilitaAmbosServiciosCombinados(): void
    {
        $fecha = FechaBolivia::desdeString('2026-10-28');
        $eval = $this->service->evaluarServiciosDisponibles($fecha, true);

        $this->assertTrue($eval['esFeriado']);
        $this->assertTrue($eval['almuerzoHabilitado']);
        $this->assertTrue($eval['cenaHabilitada']);
    }
}
