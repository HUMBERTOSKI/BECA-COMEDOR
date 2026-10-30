<?php

declare(strict_types=1);

namespace BecaComedor\Domain\Services;

use BecaComedor\Domain\Entities\MenuDia;
use BecaComedor\Domain\ValueObjects\FechaBolivia;

/**
 * Servicio de dominio con las reglas operativas y restricciones de horario del Comedor UABJB.
 */
class ReglasNegocioMenuService
{
    /**
     * Determina las opciones de servicio habilitadas para una fecha dada.
     *
     * @return array{
     *     almuerzoHabilitado: bool,
     *     cenaHabilitada: bool,
     *     cenaParaLlevar: bool,
     *     esFeriado: bool,
     *     mensajeInformativo: string
     * }
     */
    public function evaluarServiciosDisponibles(FechaBolivia $fecha, bool $marcadoFeriado = false): array
    {
        $esFeriado = $marcadoFeriado;
        $esSabado = $fecha->esSabado();
        $esDomingo = $fecha->esDomingo();

        if ($esFeriado) {
            return [
                'almuerzoHabilitado' => true,
                'cenaHabilitada' => true,
                'cenaParaLlevar' => false,
                'esFeriado' => true,
                'mensajeInformativo' => 'Día feriado: Se atiende almuerzo y cena con entrega combinada.',
            ];
        }

        if ($esDomingo) {
            return [
                'almuerzoHabilitado' => true,
                'cenaHabilitada' => false,
                'cenaParaLlevar' => false,
                'esFeriado' => false,
                'mensajeInformativo' => 'Domingo: Servicio de almuerzo exclusivo. No se sirve cena.',
            ];
        }

        if ($esSabado) {
            return [
                'almuerzoHabilitado' => true,
                'cenaHabilitada' => true,
                'cenaParaLlevar' => true,
                'esFeriado' => false,
                'mensajeInformativo' => 'Sábado: Almuerzo regular y cena con modalidad exclusivamente para llevar.',
            ];
        }

        return [
            'almuerzoHabilitado' => true,
            'cenaHabilitada' => true,
            'cenaParaLlevar' => false,
            'esFeriado' => false,
            'mensajeInformativo' => 'Lunes a Viernes: Atención normal de almuerzo (12:00-14:00) y cena (18:00-19:00).',
        ];
    }
}
