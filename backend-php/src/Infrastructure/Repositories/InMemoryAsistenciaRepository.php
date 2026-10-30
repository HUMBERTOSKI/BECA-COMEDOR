<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Repositories;

use BecaComedor\Domain\Entities\RegistroAsistencia;
use BecaComedor\Domain\Interfaces\AsistenciaRepositoryInterface;

class InMemoryAsistenciaRepository implements AsistenciaRepositoryInterface
{
    /**
     * @var array<string, RegistroAsistencia>
     */
    private array $asistencias = [];

    public function yaRegistroAsistencia(string $fechaYmd, string $studentId): bool
    {
        $id = sprintf('%s_%s', $fechaYmd, $studentId);
        return isset($this->asistencias[$id]);
    }

    public function guardar(RegistroAsistencia $asistencia): void
    {
        $this->asistencias[$asistencia->getId()] = $asistencia;
    }

    public function contarPorFecha(string $fechaYmd): int
    {
        $count = 0;
        foreach ($this->asistencias as $asistencia) {
            if ($asistencia->getFechaYmd() === $fechaYmd) {
                $count++;
            }
        }
        return $count;
    }
}
