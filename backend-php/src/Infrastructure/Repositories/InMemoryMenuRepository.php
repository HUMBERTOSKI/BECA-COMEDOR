<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Repositories;

use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\Interfaces\MenuRepositoryInterface;

class InMemoryMenuRepository implements MenuRepositoryInterface
{
    /**
     * @var array<string, MenuDia>
     */
    private array $menus = [];

    public function obtenerPorFecha(string $fechaYmd): ?MenuDia
    {
        return $this->menus[$fechaYmd] ?? null;
    }

    public function guardar(MenuDia $menu): void
    {
        $this->menus[$menu->getFecha()->toYmd()] = $menu;
    }
}
