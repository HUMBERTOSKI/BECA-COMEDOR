<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Firestore;

use BecaComedor\Domain\Entities\RegistroAsistencia;
use BecaComedor\Domain\Interfaces\AsistenciaRepositoryInterface;

class FirestoreAsistenciaRepository implements AsistenciaRepositoryInterface
{
    public function __construct(
        private FirestoreClient $client
    ) {
    }

    public function yaRegistroAsistencia(string $fechaYmd, string $studentId): bool
    {
        $docId = sprintf('%s_%s', $fechaYmd, $studentId);
        $doc = $this->client->getDocument("attendance/{$docId}");
        return $doc !== null;
    }

    public function guardar(RegistroAsistencia $asistencia): void
    {
        $fields = [
            'fecha' => ['stringValue' => $asistencia->getFechaYmd()],
            'studentId' => ['stringValue' => $asistencia->getStudentId()],
            'timestamp' => ['timestampValue' => date('c')],
            'metodo' => ['stringValue' => $asistencia->getMetodo()],
        ];

        // Creación atómica en Firestore para garantizar el bloqueo de duplicados
        $this->client->createDocument('attendance', $asistencia->getId(), $fields);
    }

    public function contarPorFecha(string $fechaYmd): int
    {
        $docs = $this->client->runQuery('attendance', 'fecha', 'EQUAL', $fechaYmd, 2000);
        return count($docs);
    }
}
