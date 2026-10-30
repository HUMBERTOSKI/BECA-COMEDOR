<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Services;

use BecaComedor\Domain\Entities\RegistroAsistencia;
use BecaComedor\Domain\Interfaces\AsistenciaRepositoryInterface;
use BecaComedor\Domain\Interfaces\EstudianteRepositoryInterface;
use BecaComedor\Domain\ValueObjects\CredencialQr;
use BecaComedor\Domain\ValueObjects\FechaBolivia;
use InvalidArgumentException;

/**
 * Servicio de dominio responsable de la verificación estricta de acceso al comedor.
 * Implementa el control atómico contra duplicidad (ya_comio), validación de padrón y registro de asistencia.
 */
class ValidadorAccesoService
{
    public function __construct(
        private EstudianteRepositoryInterface $estudianteRepo,
        private AsistenciaRepositoryInterface $asistenciaRepo
    ) {
    }

    /**
     * Valida el acceso a partir del string escaneado del código QR o código manual.
     */
    public function validar(string $rawQrPayload, ?FechaBolivia $fecha = null, string $metodo = 'qr'): ResultadoValidacionAcceso
    {
        $fechaOperacion = $fecha ?? FechaBolivia::hoy();
        $fechaYmd = $fechaOperacion->toYmd();

        // 1. Decodificar y validar estructura del QR
        try {
            $credencial = CredencialQr::desdePayload($rawQrPayload);
        } catch (InvalidArgumentException $e) {
            return ResultadoValidacionAcceso::bloqueado(
                'qr_invalido',
                'Código QR con formato irreconocible: ' . $e->getMessage()
            );
        }

        $studentId = $credencial->studentId;

        // 2. Buscar en el padrón oficial de becarios
        $estudiante = $this->estudianteRepo->buscarPorId($studentId);
        if ($estudiante === null) {
            return ResultadoValidacionAcceso::bloqueado(
                'no_registrado',
                "El estudiante con identificador '{$studentId}' no figura en el padrón de becarios."
            );
        }

        // 3. Verificar estado de habilitación de la beca
        if (!$estudiante->estaHabilitado()) {
            return ResultadoValidacionAcceso::bloqueado(
                'inactivo',
                'Beca comedor suspendida o inactiva. Diríjase a Bienestar Estudiantil.',
                $estudiante
            );
        }

        // 4. Bloqueo atómico contra doble ración o reingreso el mismo día (ya_comio)
        if ($this->asistenciaRepo->yaRegistroAsistencia($fechaYmd, $studentId)) {
            return ResultadoValidacionAcceso::bloqueado(
                'ya_comio',
                'Comensal ya retiró su ración del día de hoy. Acceso denegado.',
                $estudiante
            );
        }

        // 5. Todo válido: Registrar asistencia de forma idempotente
        $asistencia = RegistroAsistencia::registrar($fechaYmd, $studentId, $metodo);
        $this->asistenciaRepo->guardar($asistencia);

        return ResultadoValidacionAcceso::autorizado($estudiante);
    }
}
