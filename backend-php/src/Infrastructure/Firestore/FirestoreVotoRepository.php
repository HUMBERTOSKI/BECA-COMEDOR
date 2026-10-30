<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Firestore;

use BecaComedor\Domain\Entities\Voto;
use BecaComedor\Domain\Enums\ServicioAlimentario;
use BecaComedor\Domain\Interfaces\VotoRepositoryInterface;

class FirestoreVotoRepository implements VotoRepositoryInterface
{
    public function __construct(
        private FirestoreClient $client
    ) {
    }

    public function contarVotosSi(string $fechaYmd, ServicioAlimentario $servicio): int
    {
        $votos = $this->obtenerVotosDeFecha($fechaYmd, $servicio);
        return count(array_filter($votos, fn($v) => ($v['respuesta']['stringValue'] ?? '') === 'si'));
    }

    public function contarVotosNo(string $fechaYmd, ServicioAlimentario $servicio): int
    {
        $votos = $this->obtenerVotosDeFecha($fechaYmd, $servicio);
        return count(array_filter($votos, fn($v) => ($v['respuesta']['stringValue'] ?? '') === 'no'));
    }

    public function guardar(Voto $voto): void
    {
        $fields = [
            'fecha' => ['stringValue' => $voto->getFechaYmd()],
            'studentId' => ['stringValue' => $voto->getStudentId()],
            'servicio' => ['stringValue' => $voto->getServicio()->value],
            'respuesta' => ['stringValue' => $voto->getRespuesta()->value],
            'timestamp' => ['timestampValue' => date('c')],
        ];

        $this->client->setDocument("votes/{$voto->getId()}", $fields);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function obtenerVotosDeFecha(string $fechaYmd, ServicioAlimentario $servicio): array
    {
        $docs = $this->client->runQuery('votes', 'fecha', 'EQUAL', $fechaYmd, 3000);
        $filtrados = [];

        foreach ($docs as $doc) {
            $fields = $doc['fields'] ?? [];
            // Si no tiene campo de servicio, por compatibilidad legacy se asume almuerzo ('a')
            $serv = $fields['servicio']['stringValue'] ?? 'a';
            if ($serv === $servicio->value) {
                $filtrados[] = $fields;
            }
        }

        return $filtrados;
    }
}
