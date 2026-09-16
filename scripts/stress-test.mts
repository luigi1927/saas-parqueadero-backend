/**
 * Prueba de concurrencia: operación de N parqueaderos (más de 20) al mismo tiempo.
 *
 * Simula la operación real de cada parqueadero:
 *   abrir turno -> entrada ocasional -> consulta por placa -> consulta pública QR del tiquete
 *   -> cobrar salida -> (se crea mensualidad directo en BD, sin WhatsApp) -> entrada por QR de mensualidad
 *   -> consulta pública QR de mensualidad -> cerrar turno.
 *
 * Uso:  node node_modules\tsx\dist\cli.mjs scripts\stress-test.mts
 * Env:  PARKINGS=25  BASE=http://localhost:3000  KEEP_DATA=1 (no limpiar)
 */
import { RegistrarParqueaderoUseCase } from '../src/application/use-cases/RegistrarParqueaderoUseCase.js';
import { MySQLParqueaderoRepository } from '../src/infrastructure/repositories/MySQLParqueaderoRepository.js';
import { MySQLClienteMensualRepository } from '../src/infrastructure/repositories/MySQLClienteMensualRepository.js';
import { MySQLTarifaRepository } from '../src/infrastructure/repositories/MySQLTarifaRepository.js';
import { calcularPrimerPeriodoMensualidad } from '../src/domain/services/CalcularPeriodoMensualidad.js';
import { dbPool } from '../src/infrastructure/database/mysql.config.js';
import { obtenerJwtSecret, obtenerJwtExpiraEn } from '../src/infrastructure/config/env.config.js';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';

const TRACE = path.join(import.meta.dirname, 'trace-stress.log');
fs.rmSync(TRACE, { force: true });
function trace(msg: string): void {
    fs.appendFileSync(TRACE, `${new Date().toISOString()} ${msg}\n`);
}

const PARKINGS = Number(process.env.PARKINGS ?? 25);
const BASE = process.env.BASE ?? 'http://localhost:3000';
const KEEP_DATA = process.env.KEEP_DATA === '1';
const PIN = '123456';
const RUN_ID = Date.now();

interface Resultado {
    nombre: string;
    ok: boolean;
    ms: number;
    status?: number;
    detalle?: string;
}

const resultados: Resultado[] = [];
const parqueaderosCreados: { parqueaderoId: number; administradorId: number; nombreComercial: string }[] = [];

function registrar(nombre: string, ms: number, ok: boolean, status?: number, detalle?: string): void {
    resultados.push({ nombre, ok, ms, status, detalle: detalle?.slice(0, 140) });
}

async function http(
    nombre: string,
    ruta: string,
    opciones: { metodo?: string; token?: string; body?: unknown; publico?: boolean }
): Promise<{ status: number; data: any }> {
    const inicio = Date.now();
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 30000);
    try {
        const respuesta = await fetch(`${BASE}${ruta}`, {
            method: opciones.metodo ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
            },
            body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
            signal: controlador.signal,
        });
        const texto = await respuesta.text();
        let data: any = null;
        try {
            data = texto ? JSON.parse(texto) : null;
        } catch {
            data = { error: texto.slice(0, 120) };
        }
        const ms = Date.now() - inicio;
        const ok = respuesta.status >= 200 && respuesta.status < 300;
        registrar(nombre, ms, ok, respuesta.status, ok ? undefined : data?.error ?? respuesta.statusText);
        return { status: respuesta.status, data };
    } catch (error: unknown) {
        const ms = Date.now() - inicio;
        registrar(nombre, ms, false, undefined, error instanceof Error ? error.message : String(error));
        return { status: -1, data: null };
    } finally {
        clearTimeout(temporizador);
    }
}

function percentil(valores: number[], p: number): number {
    if (valores.length === 0) return 0;
    const ordenados = [...valores].sort((a, b) => a - b);
    const indice = Math.min(ordenados.length - 1, Math.floor(ordenados.length * p));
    return ordenados[indice]!;
}

async function limpiar(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const marcadores = ids.join(',');
    const tablas = [
        'notificaciones_mensualidades',
        'intenciones_pago_mensualidades',
        'pagos_mensualidades',
        'clientes_mensuales',
        'tickets',
        'turnos_caja',
        'auditoria_eventos',
        'suscripciones_parqueadero',
        'tarifas',
        'branding_parqueaderos',
        'configuracion_mensualidades',
        'dias_no_habiles_parqueadero',
        'usuarios',
    ];
    console.log('\n🧹 Limpiando datos de prueba...');
    try {
        const [r] = await dbPool.query(`DELETE e FROM egresos_caja_menor e INNER JOIN turnos_caja t ON t.id = e.turno_caja_id WHERE t.parqueadero_id IN (${marcadores})`);
        const borrados = (r as mysql2Result).affectedRows ?? 0;
        if (borrados > 0) console.log(`   egresos_caja_menor: ${borrados} fila(s)`);
    } catch (error: unknown) {
        console.log(`   egresos_caja_menor: ERROR ${error instanceof Error ? error.message : String(error)}`);
    }
    for (const tabla of tablas) {
        try {
            const [r] = await dbPool.query(`DELETE FROM ${tabla} WHERE parqueadero_id IN (${marcadores})`);
            const borrados = (r as mysql2Result).affectedRows ?? 0;
            if (borrados > 0) console.log(`   ${tabla}: ${borrados} fila(s)`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            if (!msg.toLowerCase().includes('cannot delete or update a parent row')) {
                console.log(`   ${tabla}: ERROR ${msg}`);
            }
        }
    }
    try {
        const [r] = await dbPool.query(`DELETE FROM parqueaderos WHERE id IN (${marcadores})`);
        const borrados = (r as mysql2Result).affectedRows ?? 0;
        if (borrados > 0) console.log(`   parqueaderos: ${borrados} fila(s)`);
    } catch (error: unknown) {
        console.log(`   parqueaderos: ERROR ${error instanceof Error ? error.message : String(error)}`);
    }
}

type mysql2Result = { affectedRows?: number };

async function main(): Promise<number> {
    const inicioGeneral = Date.now();
    console.log(`🚦 Prueba de concurrencia: ${PARKINGS} parqueaderos en paralelo → ${BASE}`);
    console.log('RID:', RUN_ID);

    const [filasRol] = await dbPool.query<any[]>(`SELECT id FROM roles WHERE nombre = 'ADMIN_PARQUEADERO' LIMIT 1`);
    const rolAdministrador = filasRol[0]?.id;
    if (!rolAdministrador) throw new Error('No existe el rol ADMIN_PARQUEADERO.');

    // 1) Registrar parqueaderos de prueba (PARKINGS)
    const registrarUseCase = new RegistrarParqueaderoUseCase(new MySQLParqueaderoRepository());
    const tCarga = Date.now();
    console.log('\n🏢 Registrando parqueaderos de prueba...');
    const lotes: Promise<void>[] = [];
    const encolar = async (i: number): Promise<void> => {
        const resultado = await registrarUseCase.ejecutar({
            nombreComercial: `Playa Test ${RUN_ID.toString().slice(-5)}-${i}`,
            nitDocumento: `NIT${RUN_ID}-${i}`,
            ciudad: 'Bogotá',
            direccion: 'Calle de prueba 123',
            telefonoContacto: `310000000${String(i).padStart(2, '0')}`,
            nombreAdministrador: `Admin Test ${i}`,
            documentoAdministrador: `DOC${RUN_ID}-${i}`,
            telefonoAdministrador: `311000000${String(i).padStart(2, '0')}`,
            planId: 1,
            pinAdministrador: PIN,
        });
        parqueaderosCreados.push({
            parqueaderoId: resultado.parqueaderoId,
            administradorId: resultado.administradorId,
            nombreComercial: `Playa Test ${i}`,
        });
    };
    const PROMESA_LOTE = 10;
    for (let inicio = 0; inicio < PARKINGS; inicio += PROMESA_LOTE) {
        const lote = Array.from({ length: Math.min(PROMESA_LOTE, PARKINGS - inicio) }, (_, k) => encolar(inicio + k));
        await Promise.all(lote);
    }
    const msCarga = Date.now() - tCarga;
    console.log(`✔ ${parqueaderosCreados.length}/${PARKINGS} parqueaderos creados en ${(msCarga / 1000).toFixed(2)}s`);
    if (parqueaderosCreados.length < PARKINGS) {
        console.log('⚠ Algunos parqueaderos no se crearon; continuo con los disponibles.');
    }

    // 2) Tokens JWT (mismo mecanismo que el login)
    const clienteMensualRepo = new MySQLClienteMensualRepository();
    const tarifaRepo = new MySQLTarifaRepository();
    const secret = obtenerJwtSecret();
    const expira = obtenerJwtExpiraEn();

    const tokenDe = (parqueaderoId: number, usuarioId: number): string =>
        jwt.sign(
            { usuarioId, parqueaderoId, rolId: rolAdministrador, rolNombre: 'ADMIN_PARQUEADERO' },
            secret,
            { expiresIn: expira as never }
        );

    // 3) Operar los parqueaderos TODOS EN PARALELO
    console.log('\n⚡ Ejecutando operaciones de los parqueaderos en paralelo...');
    const tParallel = Date.now();

    const operar = async (indice: number): Promise<void> => {
        const info = parqueaderosCreados[indice];
        if (!info) return;
        const { parqueaderoId, administradorId } = info;
        const token = tokenDe(parqueaderoId, administradorId);
        const placaOcasional = `PRV${String(indice + 1).padStart(3, '0')}A`;
        const placaMensual = `PRV${String(indice + 1).padStart(3, '0')}B`;
        const telefonoMensual = `300${String(indice + 1).padStart(7, '0')}`;

        // a) Abrir turno
        trace(`P${indice} abrir.app start`);
        const abrir = await http('abrir_turno', '/api/v1/turnos/abrir', {
            metodo: 'POST', token, body: { montoInicialEfectivo: 50000 },
        });
        trace(`P${indice} abrir.ok=${abrir.status}`);
        const turnoId = abrir.data?.data?.turnoId ?? abrir.data?.data?.id ?? null;
        if (!turnoId) return;

        // b) Entrada ocasional
        const entrada = await http('entrada_ocasional', '/api/v1/entradas', {
            metodo: 'POST', token, body: { placa: placaOcasional },
        });
        trace(`P${indice} entrada.ok=${entrada.status}`);
        const datosEntrada = entrada.data?.data;
        const ticketId = datosEntrada?.ticketId ?? null;
        const codigoQrTicket = datosEntrada?.codigoQrToken ?? '';

        // c) Consulta por placa (cajero)
        const placa = await http('consultar_por_placa', `/api/v1/tickets/placa/${placaOcasional}`, { token });
        trace(`P${indice} placa.ok=${placa.status}`);

        // d) Consulta pública del QR del tiquete
        if (codigoQrTicket) {
            const pubT = await http('consulta_publica_ticket', `/api/v1/tickets/qr/${codigoQrTicket}`, { publico: true });
            trace(`P${indice} pubTicket.ok=${pubT.status}`);
        }

        // e) Cobro de salida ocasional
        if (ticketId) {
            const salida = await http('salida_ocasional', '/api/v1/tickets/salida', {
                metodo: 'POST', token, body: { ticketId, metodoPago: 'EFECTIVO' },
            });
            trace(`P${indice} salida.ok=${salida.status}`);
        }

        // f) Crear mensualidad directo en BD (sin WhatsApp) para la misma parqueadero/turno
        const mensualInicio = Date.now();
        let codigoQrMensual = '';
        const poolInfo = (): string => {
            const p = (dbPool as any).pool;
            return `SCRIPT-POOL free=${p?._freeConnections?.length ?? '?'} total=${p?._allConnections?.length ?? '?'} queue=${p?._acquiringConnectionsQueue?.length ?? '?'}`;
        };
        try {
            trace(`P${indice} seed.app start`);
            const vigilante = setTimeout(() => trace(`P${indice} SEED-STALL>3s ${poolInfo()}`), 3000);
            const tarifa = await tarifaRepo.buscarActivaPorParqueadero(parqueaderoId);
            const periodo = calcularPrimerPeriodoMensualidad(new Date(), 15);
            const cliente = await clienteMensualRepo.registrarClienteConPago(
                {
                    parqueaderoId,
                    placa: placaMensual,
                    nombreCliente: `Cliente Mensual ${indice + 1}`,
                    tratamiento: 'NEUTRO',
                    telefono: telefonoMensual,
                    diaPagoMensual: 15,
                    metodoPagoInicial: 'EFECTIVO',
                },
                administradorId,
                turnoId,
                tarifa?.precioMensualidad ?? 110000,
                periodo,
            );
            clearTimeout(vigilante);
            codigoQrMensual = cliente.codigoQr ?? '';
            registrar('seed_mensualidad_db', Date.now() - mensualInicio, true);
            trace(`P${indice} seed.ok codigoQr=${codigoQrMensual.slice(0, 8)}`);
        } catch (error: unknown) {
            registrar('seed_mensualidad_db', Date.now() - mensualInicio, false, undefined, error instanceof Error ? error.message : String(error));
            trace(`P${indice} seed.ERROR ${error instanceof Error ? error.message : String(error)} ${poolInfo()}`);
        }

        // g) Entrada por QR de mensualidad (flujo real del operario)
        if (codigoQrMensual) {
            const entMens = await http('entrada_mensual_qr', '/api/v1/tickets/mensual/entrada', {
                metodo: 'POST', token, body: { codigoQr: codigoQrMensual },
            });
            trace(`P${indice} entMens.ok=${entMens.status}`);
            // h) Consulta pública del QR de mensualidad
            const pubMens = await http('consulta_publica_mensual', `/api/v1/clientes-mensuales/qr/${codigoQrMensual}`, { publico: true });
            trace(`P${indice} pubMens.ok=${pubMens.status}`);
        }

        // i) Estado actual del turno
        await http('estado_turno', '/api/v1/turnos/actual', { token });

        // j) Cerrar turno
        const cerrar = await http('cerrar_turno', '/api/v1/turnos/cerrar', {
            metodo: 'POST', token, body: { turnoId, efectivoReportadoCierre: 0 },
        });
        trace(`P${indice} cerrar.ok=${cerrar.status} END`);
    };

    const watchdog = setTimeout(
        () => {
            trace('WATCHDOG: fuerza salida tras 180s; fase paralela no terminó');
            console.error('WATCHDOG: fase paralela no terminó en 180s; saliendo');
            process.exit(3);
        },
        180000,
    );
    await Promise.all(parqueaderosCreados.map((_, i) => operar(i)));
    trace('PARALLEL-PHASE-DONE');
    clearTimeout(watchdog);
    const msParallel = Date.now() - tParallel;

    // 4) Métricas
    console.log('\n📊 RESULTADOS');
    console.log(`Tiempo total de la corrida (paralelo): ${(msParallel / 1000).toFixed(2)}s`);
    console.log('Solicitudes HTTP lanzadas en paralelo:', resultados.length);

    const porEndpoint = new Map<string, Resultado[]>();
    for (const r of resultados) {
        const lista = porEndpoint.get(r.nombre) ?? [];
        lista.push(r);
        porEndpoint.set(r.nombre, lista);
    }

    console.log('\n┌────────────────────────────────┬──────┬──────┬─────────┬──────────┬─────────┬─────────┐');
    console.log('│ Operación                      │  n   │ ok   │  p50 ms │  p95 ms  │  máx ms │ fail    │');
    console.log('├────────────────────────────────┼──────┼──────┼─────────┼──────────┼─────────┼─────────┤');
    for (const [nombre, lista] of [...porEndpoint.entries()].sort()) {
        const ok = lista.filter((r) => r.ok).length;
        const fallos = lista.length - ok;
        const ms = lista.map((r) => r.ms);
        console.log(
            `│ ${nombre.padEnd(30)} │ ${String(lista.length).padStart(4)} │ ${String(ok).padStart(4)} │ ${String(percentil(ms, 0.5)).padStart(7)} │ ${String(percentil(ms, 0.95)).padStart(8)} │ ${String(percentil(ms, 1)).padStart(7)} │ ${String(fallos).padStart(5)} │`,
        );
    }
    console.log('└────────────────────────────────┴──────┴──────┴─────────┴──────────┴─────────┴─────────┘');

    const totalOk = resultados.filter((r) => r.ok).length;
    const totalFail = resultados.length - totalOk;
    console.log(`Total OK: ${totalOk} | Total fallos: ${totalFail} | Tasa de éxito: ${(((totalOk) / Math.max(1, resultados.length)) * 100).toFixed(1)}%`);
    console.log(`Concurrencia real: ${PARKINGS} parqueaderos operando en paralelo (${parqueaderosCreados.length} creados).`);

    const fallos = resultados.filter((r) => !r.ok);
    if (fallos.length > 0) {
        console.log('\n⚠ FALLOS DETECTADOS:');
        const unicos = new Map<string, number>();
        for (const f of fallos) {
            const clave = `${f.nombre} | HTTP ${f.status ?? 'ERR'} | ${f.detalle ?? ''}`;
            unicos.set(clave, (unicos.get(clave) ?? 0) + 1);
        }
        for (const [clave, n] of unicos) {
            console.log(`   [${n}] ${clave}`);
        }
    }

    // 5) Limpieza
    if (!KEEP_DATA) {
        const ids = parqueaderosCreados.map((p) => p.parqueaderoId);
        await limpiar(ids);
        console.log('✔ Datos de prueba eliminados. BD restaurada.');
    } else {
        console.log(`\nℹ KEEP_DATA=1: se conservan ${parqueaderosCreados.length} parqueaderos de prueba.`);
    }

    const totalMs = Date.now() - inicioGeneral;
    console.log(`\nJornada completa: ${(totalMs / 1000).toFixed(2)}s`);

    await dbPool.end();
    return totalFail === 0 ? 0 : 1;
}

main()
    .then((codigo) => process.exit(codigo))
    .catch((error: unknown) => {
        console.error('ERROR en la prueba:', error instanceof Error ? error.message : error);
        process.exit(2);
    });