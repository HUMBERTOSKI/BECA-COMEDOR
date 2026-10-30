<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Interfaces;

use BecaComedor\Domain\Entities\Estudiante;

interface EstudianteRepositoryInterface
{
    public function buscarPorId(string $id): ?Estudiante;
    public function buscarPorCi(string $ci): ?Estudiante;
    public function guardar(Estudiante $estudiante): void;
    /**
     * @return Estudiante[]
     */
    public function obtenerTodosActivos(): array;
}
