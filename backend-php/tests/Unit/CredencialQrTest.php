<?php

declare(strict_types=1);

namespace BecaComedor\Tests\Unit;

use BecaComedor\Domain\ValueObjects\CredencialQr;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class CredencialQrTest extends TestCase
{
    public function testDecodificaQrValidoConPrefijoInstitucional(): void
    {
        $qr = CredencialQr::desdePayload('BECA1:est_4892');
        $this->assertSame('est_4892', $qr->studentId);
        $this->assertSame('BECA1:est_4892', $qr->getPayload());
        $this->assertSame('BECA1:est_4892', (string) $qr);
    }

    public function testRechazaQrSinPrefijoBeca1(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Formato de código QR inválido');
        CredencialQr::desdePayload('OTRO_PREFIJO:est_123');
    }

    public function testRechazaQrConIdVacio(): void
    {
        $this->expectException(InvalidArgumentException::class);
        CredencialQr::desdePayload('BECA1:');
    }

    public function testComparaIgualdadDeDosCredenciales(): void
    {
        $qr1 = CredencialQr::paraEstudiante('est_abc');
        $qr2 = CredencialQr::desdePayload('BECA1:est_abc');
        $qr3 = CredencialQr::paraEstudiante('est_xyz');

        $this->assertTrue($qr1->equals($qr2));
        $this->assertFalse($qr1->equals($qr3));
    }
}
