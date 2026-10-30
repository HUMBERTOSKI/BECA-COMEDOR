<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Repositories;

use BecaComedor\Domain\Entities\RemanenteRacion;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Interfaces\RemanenteRepositoryInterface;

class InMemoryRemanenteRepository implements RemanenteRepositoryInterface
{
    /**
     * @var array<string, RemanenteRacion>
     */
    private array $remanentes = [];

    public function obtenerUltimoRemanente(string $fechaYmd, ServicioAlimentario $servicio): ?RemanenteRacion
    {
        $id = sprintf('%s_%s', $fechaYmd, $servicio->value);
        return $this->remanentes[$id] ?? null;
    }

    public function guardar(RemanenteRacion $remanente): void
    {
        $this->remanentes[$remanente->getId()] = $remanente;
    }
}
