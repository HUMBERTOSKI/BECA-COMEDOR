<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Repositories;

use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Enums\TipoRespuestaVoto;
use BecaComedor\Domain\Interfaces\VotoRepositoryInterface;

class InMemoryVotoRepository implements VotoRepositoryInterface
{
    /**
     * @var array<string, Voto>
     */
    private array $votos = [];

    public function contarVotosSi(string $fechaYmd, ServicioAlimentario $servicio): int
    {
        $count = 0;
        foreach ($this->votos as $voto) {
            if ($voto->getFechaYmd() === $fechaYmd &&
                $voto->getServicio() === $servicio &&
                $voto->getRespuesta() === TipoRespuestaVoto::SI) {
                $count++;
            }
        }
        return $count;
    }

    public function contarVotosNo(string $fechaYmd, ServicioAlimentario $servicio): int
    {
        $count = 0;
        foreach ($this->votos as $voto) {
            if ($voto->getFechaYmd() === $fechaYmd &&
                $voto->getServicio() === $servicio &&
                $voto->getRespuesta() === TipoRespuestaVoto::NO) {
                $count++;
            }
        }
        return $count;
    }

    public function guardar(Voto $voto): void
    {
        $this->votos[$voto->getId()] = $voto;
    }
}
