<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Firestore;

use BecaComedor\Domain\Entities\Estudiante;
use BecaComedor\Domain\Interfaces\EstudianteRepositoryInterface;

class FirestoreEstudianteRepository implements EstudianteRepositoryInterface
{
    public function __construct(
        private FirestoreClient $client
    ) {
    }

    public function buscarPorId(string $id): ?Estudiante
    {
        $doc = $this->client->getDocument("students/{$id}");
        if ($doc === null || !isset($doc['fields'])) {
            return null;
        }

        return $this->mapearDocumentoAEntidad($id, $doc['fields']);
    }

    public function buscarPorCi(string $ci): ?Estudiante
    {
        $docs = $this->client->runQuery('students', 'ci', 'EQUAL', $ci, 1);
        if (empty($docs) || !isset($docs[0]['fields'])) {
            return null;
        }

        $fullName = $docs[0]['name'] ?? '';
        $id = basename($fullName);
        return $this->mapearDocumentoAEntidad($id, $docs[0]['fields']);
    }

    public function guardar(Estudiante $estudiante): void
    {
        $fields = [
            'nombre' => ['stringValue' => $estudiante->getNombre()],
            'ci' => ['stringValue' => $estudiante->getCi()],
            'ru' => ['stringValue' => $estudiante->getRu()],
            'carrera' => ['stringValue' => $estudiante->getCarrera()],
            'telefono' => ['stringValue' => $estudiante->getTelefono()],
            'activo' => ['booleanValue' => $estudiante->estaHabilitado()],
        ];

        if ($estudiante->getFoto() !== null) {
            $fields['foto'] = ['stringValue' => $estudiante->getFoto()];
        } else {
            $fields['foto'] = ['nullValue' => null];
        }

        if ($estudiante->getTelegramUserId() !== null) {
            $fields['telegramUserId'] = ['integerValue' => (string) $estudiante->getTelegramUserId()];
        }

        $this->client->setDocument("students/{$estudiante->getId()}", $fields);
    }

    /**
     * @return Estudiante[]
     */
    public function obtenerTodosActivos(): array
    {
        $docs = $this->client->runQuery('students', 'activo', 'EQUAL', true, 1000);
        $estudiantes = [];

        foreach ($docs as $doc) {
            $id = basename($doc['name'] ?? '');
            if (isset($doc['fields'])) {
                $estudiantes[] = $this->mapearDocumentoAEntidad($id, $doc['fields']);
            }
        }

        return $estudiantes;
    }

    /**
     * @param array<string, mixed> $fields
     */
    private function mapearDocumentoAEntidad(string $id, array $fields): Estudiante
    {
        $nombre = $fields['nombre']['stringValue'] ?? '';
        $ci = $fields['ci']['stringValue'] ?? '';
        $ru = $fields['ru']['stringValue'] ?? '';
        $carrera = $fields['carrera']['stringValue'] ?? '';
        $telefono = $fields['telefono']['stringValue'] ?? '';
        $foto = $fields['foto']['stringValue'] ?? null;
        $activo = $fields['activo']['booleanValue'] ?? true;
        $telegramUserId = isset($fields['telegramUserId']['integerValue'])
            ? (int) $fields['telegramUserId']['integerValue']
            : null;

        return new Estudiante(
            id: $id,
            nombre: $nombre,
            ci: $ci,
            ru: $ru,
            carrera: $carrera,
            telefono: $telefono,
            foto: $foto,
            activo: $activo,
            telegramUserId: $telegramUserId
        );
    }
}
