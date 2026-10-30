<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Interfaces;

use BecaComedor\Domain\Entities\RemanenteRacion;
use BecaComedor\Domain\Enums\ServicioAlimentario;

interface RemanenteRepositoryInterface
{
    public function obtenerUltimoRemanente(string $fechaYmd, ServicioAlimentario $servicio): ?RemanenteRacion;
    public function guardar(RemanenteRacion $remanente): void;
}
