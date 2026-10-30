<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Repositories;

use BecaComedor\Domain\Entities\Estudiante;
use BecaComedor\Domain\Interfaces\EstudianteRepositoryInterface;

/**
 * Repositorio en memoria para pruebas unitarias, desarrollo local y desacoplamiento de infraestructura.
 */
class InMemoryEstudianteRepository implements EstudianteRepositoryInterface
{
    /**
     * @var array<string, Estudiante>
     */
    private array $estudiantes = [];

    /**
     * @param Estudiante[] $iniciales
     */
    public function __construct(array $iniciales = [])
    {
        foreach ($iniciales as $est) {
            $this->guardar($est);
        }
    }

    public function buscarPorId(string $id): ?Estudiante
    {
        return $this->estudiantes[$id] ?? null;
    }

    public function buscarPorCi(string $ci): ?Estudiante
    {
        foreach ($this->estudiantes as $est) {
            if ($est->getCi() === $ci) {
                return $est;
            }
        }
        return null;
    }

    public function guardar(Estudiante $estudiante): void
    {
        $this->estudiantes[$estudiante->getId()] = $estudiante;
    }

    /**
     * @return Estudiante[]
     */
    public function obtenerTodosActivos(): array
    {
        return array_values(array_filter(
            $this->estudiantes,
            fn(Estudiante $e) => $e->estaHabilitado()
        ));
    }
}
