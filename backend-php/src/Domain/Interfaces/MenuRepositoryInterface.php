<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Interfaces;

use BecaComedor\Domain\Entities\MenuDia;

interface MenuRepositoryInterface
{
    public function obtenerPorFecha(string $fechaYmd): ?MenuDia;
    public function guardar(MenuDia $menu): void;
}
