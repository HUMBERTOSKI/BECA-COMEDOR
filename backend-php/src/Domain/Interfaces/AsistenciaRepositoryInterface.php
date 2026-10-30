<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Interfaces;

use BecaComedor\Domain\Entities\RegistroAsistencia;

interface AsistenciaRepositoryInterface
{
    public function yaRegistroAsistencia(string $fechaYmd, string $studentId): bool;
    public function guardar(RegistroAsistencia $asistencia): void;
    public function contarPorFecha(string $fechaYmd): int;
}
