<?php

declare(strict_types=1);

namespace BecaComedor\Infrastructure\Firestore;

use RuntimeException;

/**
 * Cliente de bajo nivel para Google Cloud Firestore REST API (base de datos 'default').
 * Autentica mediante token JWT OAuth2 firmado con RS256 desde una Cuenta de Servicio.
 */
class FirestoreClient
{
    private string $projectId;
    private string $clientEmail;
    private string $privateKey;
    private ?string $cachedToken = null;
    private int $tokenExpiresAt = 0;

    public function __construct(string $serviceAccountPath)
    {
        if (!file_exists($serviceAccountPath)) {
            throw new RuntimeException("Archivo de cuenta de servicio no encontrado: {$serviceAccountPath}");
        }

        $json = file_get_contents($serviceAccountPath);
        $data = json_decode($json, true);

        if (!is_array($data) || !isset($data['project_id'], $data['client_email'], $data['private_key'])) {
            throw new RuntimeException("Formato inválido en archivo de cuenta de servicio: {$serviceAccountPath}");
        }

        $this->projectId = $data['project_id'];
        $this->clientEmail = $data['client_email'];
        $this->privateKey = $data['private_key'];
    }

    public function getProjectId(): string
    {
        return $this->projectId;
    }

    /**
     * Obtiene o renueva el token OAuth2 Bearer utilizando OpenSSL y JWT RS256.
     */
    public function getAccessToken(): string
    {
        $now = time();
        if ($this->cachedToken !== null && $now < ($this->tokenExpiresAt - 120)) {
            return $this->cachedToken;
        }

        $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
        $claim = rtrim(strtr(base64_encode(json_encode([
            'iss' => $this->clientEmail,
            'scope' => 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ])), '+/', '-_'), '=');

        $signature = '';
        $success = openssl_sign("{$header}.{$claim}", $signature, $this->privateKey, OPENSSL_ALGO_SHA256);
        if (!$success) {
            throw new RuntimeException('Error al firmar JWT con la clave privada de la cuenta de servicio.');
        }

        $sig = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        $jwt = "{$header}.{$claim}.{$sig}";

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !is_string($res)) {
            throw new RuntimeException("Fallo al obtener token OAuth2 de Google. Código HTTP {$httpCode}: {$res}");
        }

        $parsed = json_decode($res, true);
        if (!isset($parsed['access_token'])) {
            throw new RuntimeException('Respuesta OAuth2 sin access_token: ' . $res);
        }

        $this->cachedToken = $parsed['access_token'];
        $this->tokenExpiresAt = $now + 3600;

        return $this->cachedToken;
    }

    /**
     * Base URL para la base de datos 'default' de Firestore
     */
    private function getBaseUrl(): string
    {
        return "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/default/documents";
    }

    /**
     * Obtiene un documento de Firestore por su ruta relativa (ej. 'students/id_123').
     * Retorna null si el documento no existe (404).
     *
     * @return array<string, mixed>|null
     */
    public function getDocument(string $path): ?array
    {
        $url = $this->getBaseUrl() . '/' . ltrim($path, '/');
        $token = $this->getAccessToken();

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$token}"]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 404) {
            return null;
        }

        if ($httpCode !== 200 || !is_string($res)) {
            return null;
        }

        $data = json_decode($res, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Crea un documento atómicamente si NO existe.
     * Retorna true si fue creado, false si ya existía (409 Conflict) o error.
     */
    public function createDocument(string $collection, string $documentId, array $fields): bool
    {
        $url = $this->getBaseUrl() . '/' . urlencode($collection) . '?documentId=' . urlencode($documentId);
        $token = $this->getAccessToken();

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['fields' => $fields]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // 409 Conflict significa que el documento ya existía (bloqueo atómico contra duplicidad)
        if ($httpCode === 409) {
            return false;
        }

        return $httpCode === 200;
    }

    /**
     * Sobrescribe o actualiza un documento en Firestore.
     */
    public function setDocument(string $path, array $fields): bool
    {
        $url = $this->getBaseUrl() . '/' . ltrim($path, '/');
        $token = $this->getAccessToken();

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['fields' => $fields]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }

    /**
     * Ejecuta una consulta estructurada en Firestore (StructuredQuery).
     *
     * @return array<int, array<string, mixed>>
     */
    public function runQuery(string $collection, string $field, string $op, mixed $val, int $limit = 500): array
    {
        $url = $this->getBaseUrl() . ':runQuery';
        $token = $this->getAccessToken();

        // Determinar formato de valor para Firestore
        $valueField = is_int($val)
            ? ['integerValue' => (string) $val]
            : (is_bool($val)
                ? ['booleanValue' => $val]
                : ['stringValue' => (string) $val]);

        $query = [
            'structuredQuery' => [
                'from' => [['collectionId' => $collection]],
                'where' => [
                    'fieldFilter' => [
                        'field' => ['fieldPath' => $field],
                        'op' => $op,
                        'value' => $valueField,
                    ],
                ],
                'limit' => $limit,
            ],
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($query));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !is_string($res)) {
            return [];
        }

        $decoded = json_decode($res, true);
        if (!is_array($decoded)) {
            return [];
        }

        $results = [];
        foreach ($decoded as $item) {
            if (isset($item['document']['fields'])) {
                $results[] = $item['document'];
            }
        }

        return $results;
    }
}
