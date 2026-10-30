<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Firestore;

use BecaComedor\Domain\Entities\RemanenteRacion;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Interfaces\RemanenteRepositoryInterface;

class FirestoreRemanenteRepository implements RemanenteRepositoryInterface
{
    public function __construct(
        private FirestoreClient $client
    ) {
    }

    public function obtenerUltimoRemanente(string $fechaYmd, ServicioAlimentario $servicio): ?RemanenteRacion
    {
        $docId = sprintf('%s_%s', $fechaYmd, $servicio->value);
        $doc = $this->client->getDocument("remanentes/{$docId}");
        if ($doc === null || !isset($doc['fields'])) {
            return null;
        }

        $fields = $doc['fields'];
        $cantidad = (int) ($fields['cantidad']['integerValue'] ?? 0);
        $kgRescatados = (float) (($fields['kgRescatados']['integerValue'] ?? 0) / 1000);
        $horaFin = $fields['horaFin']['stringValue'] ?? '14:00';
        $liberadoEn = $fields['liberadoEn']['timestampValue'] ?? date('c');
        $activo = $fields['activo']['booleanValue'] ?? true;

        return new RemanenteRacion(
            id: $docId,
            fechaYmd: $fechaYmd,
            servicio: $servicio,
            cantidad: $cantidad,
            kgRescatados: $kgRescatados,
            horaFin: $horaFin,
            liberadoEn: $liberadoEn,
            activo: $activo
        );
    }

    public function guardar(RemanenteRacion $remanente): void
    {
        $fields = [
            'fecha' => ['stringValue' => $remanente->getFechaYmd()],
            'servicio' => ['stringValue' => $remanente->getServicio()->value],
            'cantidad' => ['integerValue' => (string) $remanente->getCantidad()],
            'kgRescatados' => ['integerValue' => (string) round($remanente->getKgRescatados() * 1000)],
            'horaFin' => ['stringValue' => $remanente->getHoraFin()],
            'liberadoEn' => ['timestampValue' => $remanente->getLiberadoEn()],
            'activo' => ['booleanValue' => $remanente->isActivo()],
        ];

        $this->client->setDocument("remanentes/{$remanente->getId()}", $fields);
    }
}
