<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Entities;

use BecaComedor\Domain\Enums\EstadoMenu;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use DomainException;
use JsonSerializable;

/**
 * Entidad de dominio que representa la minuta alimentaria de una fecha específica.
 */
class MenuDia implements JsonSerializable
{
    /**
     * @param string[] $platillosAlmuerzo
     * @param string[] $platillosCena
     */
    public function __construct(
        private FechaBolivia $fecha,
        private array $platillosAlmuerzo = [],
        private array $platillosCena = [],
        private bool $feriado = false,
        private string $horaLimite = '10:30',
        private EstadoMenu $estado = EstadoMenu::BORRADOR,
        private bool $cerrado = false
    ) {
    }

    public function getFecha(): FechaBolivia
    {
        return $this->fecha;
    }

    /**
     * @return string[]
     */
    public function getPlatillosAlmuerzo(): array
    {
        return $this->platillosAlmuerzo;
    }

    /**
     * @return string[]
     */
    public function getPlatillosCena(): array
    {
        return $this->platillosCena;
    }

    public function esFeriado(): bool
    {
        return $this->feriado;
    }

    public function getHoraLimite(): string
    {
        return $this->horaLimite;
    }

    public function getEstado(): EstadoMenu
    {
        return $this->estado;
    }

    public function estaCerrado(): bool
    {
        return $this->cerrado;
    }

    public function publicar(): void
    {
        if (empty($this->platillosAlmuerzo)) {
            throw new DomainException('No se puede publicar un menú sin al menos un platillo de almuerzo.');
        }
        $this->estado = EstadoMenu::PUBLICADO;
    }

    public function cerrarVotaciones(): void
    {
        $this->cerrado = true;
    }

    public function reabrirVotaciones(): void
    {
        $this->cerrado = false;
    }

    /**
     * Regla institucional: Los domingos no hay servicio de cena.
     * Los sábados la cena es para llevar.
     */
    public function tieneServicioCena(): bool
    {
        if ($this->fecha->esDomingo()) {
            return false;
        }
        return !empty($this->platillosCena);
    }

    public function puedeVotar(FechaBolivia $momentoActual): bool
    {
        if ($this->estado !== EstadoMenu::PUBLICADO) {
            return false;
        }
        if ($this->cerrado) {
            return false;
        }
        if ($momentoActual->yaPasoHoraLimite($this->horaLimite)) {
            return false;
        }
        return true;
    }

    public function jsonSerialize(): array
    {
        return [
            'fecha' => $this->fecha->toYmd(),
            'diaSemana' => $this->fecha->getDiaSemanaEspanol(),
            'platillosAlmuerzo' => $this->platillosAlmuerzo,
            'platillosCena' => $this->platillosCena,
            'feriado' => $this->feriado,
            'horaLimite' => $this->horaLimite,
            'estado' => $this->estado->value,
            'cerrado' => $this->cerrado,
            'tieneCena' => $this->tieneServicioCena(),
        ];
    }
}
