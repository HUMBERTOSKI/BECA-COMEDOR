<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Entities;

use BecaComedor\Domain\ValueObjects\CredencialQr;
use JsonSerializable;

/**
 * Entidad de dominio que representa a un comensale becario del Comedor UABJB.
 */
class Estudiante implements JsonSerializable
{
    public function __construct(
        private string $id,
        private string $nombre,
        private string $ci,
        private string $ru,
        private string $carrera,
        private string $telefono = '',
        private ?string $foto = null,
        private bool $activo = true,
        private ?int $telegramUserId = null,
        private ?string $creadoEn = null
    ) {
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getNombre(): string
    {
        return $this->nombre;
    }

    public function getCi(): string
    {
        return $this->ci;
    }

    public function getRu(): string
    {
        return $this->ru;
    }

    public function getCarrera(): string
    {
        return $this->carrera;
    }

    public function getTelefono(): string
    {
        return $this->telefono;
    }

    public function getFoto(): ?string
    {
        return $this->foto;
    }

    public function estaHabilitado(): bool
    {
        return $this->activo;
    }

    public function activar(): void
    {
        $this->activo = true;
    }

    public function suspender(): void
    {
        $this->activo = false;
    }

    public function getTelegramUserId(): ?int
    {
        return $this->telegramUserId;
    }

    public function vincularTelegram(int $telegramUserId): void
    {
        $this->telegramUserId = $telegramUserId;
    }

    public function obtenerCredencial(): CredencialQr
    {
        return CredencialQr::paraEstudiante($this->id);
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'ci' => $this->ci,
            'ru' => $this->ru,
            'carrera' => $this->carrera,
            'telefono' => $this->telefono,
            'foto' => $this->foto,
            'activo' => $this->activo,
            'telegramUserId' => $this->telegramUserId,
            'qrPayload' => $this->obtenerCredencial()->getPayload(),
        ];
    }
}
