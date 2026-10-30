<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Interfaces;

use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\ServicioAlimentario;

interface VotoRepositoryInterface
{
    public function contarVotosSi(string $fechaYmd, ServicioAlimentario $servicio): int;
    public function contarVotosNo(string $fechaYmd, ServicioAlimentario $servicio): int;
    public function guardar(Voto $voto): void;
}
