<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Firestore;

use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\Enums\EstadoMenu;
use BecaComedor\Domain\Interfaces\MenuRepositoryInterface;
use BecaComedor\Domain\ValueObjects\FechaBolivia;

class FirestoreMenuRepository implements MenuRepositoryInterface
{
    public function __construct(
        private FirestoreClient $client
    ) {
    }

    public function obtenerPorFecha(string $fechaYmd): ?MenuDia
    {
        $doc = $this->client->getDocument("menus/{$fechaYmd}");
        if ($doc === null || !isset($doc['fields'])) {
            return null;
        }

        $fields = $doc['fields'];
        $platillosAlm = [];
        if (isset($fields['platillos']['arrayValue']['values'])) {
            foreach ($fields['platillos']['arrayValue']['values'] as $val) {
                if (isset($val['stringValue'])) {
                    $platillosAlm[] = $val['stringValue'];
                }
            }
        }

        $platillosCena = [];
        if (isset($fields['platillosCena']['arrayValue']['values'])) {
            foreach ($fields['platillosCena']['arrayValue']['values'] as $val) {
                if (isset($val['stringValue'])) {
                    $platillosCena[] = $val['stringValue'];
                }
            }
        }

        $feriado = $fields['feriado']['booleanValue'] ?? false;
        $horaLimite = $fields['horaLimite']['stringValue'] ?? '10:30';
        $estadoRaw = $fields['estado']['stringValue'] ?? 'borrador';
        $estado = EstadoMenu::tryFrom($estadoRaw) ?? EstadoMenu::BORRADOR;
        $cerrado = $fields['cerrado']['booleanValue'] ?? false;

        return new MenuDia(
            fecha: FechaBolivia::desdeString($fechaYmd),
            platillosAlmuerzo: $platillosAlm,
            platillosCena: $platillosCena,
            feriado: $feriado,
            horaLimite: $horaLimite,
            estado: $estado,
            cerrado: $cerrado
        );
    }

    public function guardar(MenuDia $menu): void
    {
        $fechaYmd = $menu->getFecha()->toYmd();

        $valuesAlm = array_map(fn($p) => ['stringValue' => (string) $p], $menu->getPlatillosAlmuerzo());
        $valuesCena = array_map(fn($p) => ['stringValue' => (string) $p], $menu->getPlatillosCena());

        $fields = [
            'fecha' => ['stringValue' => $fechaYmd],
            'platillos' => ['arrayValue' => ['values' => $valuesAlm]],
            'platillosCena' => ['arrayValue' => ['values' => $valuesCena]],
            'feriado' => ['booleanValue' => $menu->esFeriado()],
            'horaLimite' => ['stringValue' => $menu->getHoraLimite()],
            'estado' => ['stringValue' => $menu->getEstado()->value],
            'cerrado' => ['booleanValue' => $menu->estaCerrado()],
        ];

        $this->client->setDocument("menus/{$fechaYmd}", $fields);
    }
}
