import express from 'express';
import type { Application, NextFunction, Request, Response } from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { obtenerJwtSecret } from './infrastructure/config/env.config.js';
import { checkDatabaseConnection, verificarConexionBaseDatos } from './infrastructure/database/mysql.config.js';
import { whatsappService } from './infrastructure/services/whatsappInstance.js';
import { MySQLTicketRepository } from './infrastructure/repositories/MySQLTicketRepository.js';
import { ProcesarRespuestaWhatsAppUseCase } from './application/use-cases/ProcesarRespuestaWhatsAppUseCase.js';
import { EnviarNotificacionesMensualidadUseCase } from './application/use-cases/EnviarNotificacionesMensualidadUseCase.js';
import { MySQLNotificacionMensualidadRepository } from './infrastructure/repositories/MySQLNotificacionMensualidadRepository.js';
import { ProcesadorNotificacionesMensualidad } from './infrastructure/services/ProcesadorNotificacionesMensualidad.js';
import { ProcesarRespuestaMensualidadUseCase } from './application/use-cases/ProcesarRespuestaMensualidadUseCase.js';
import { MySQLConversacionMensualidadRepository } from './infrastructure/repositories/MySQLConversacionMensualidadRepository.js';
import { MySQLConfiguracionMensualidadRepository } from './infrastructure/repositories/MySQLConfiguracionMensualidadRepository.js';
import { MySQLCalendarioHabilRepository } from './infrastructure/repositories/MySQLCalendarioHabilRepository.js';
import { ActualizarEstadosSaasUseCase } from './application/use-cases/ActualizarEstadosSaasUseCase.js';
import { MySQLParqueaderoRepository } from './infrastructure/repositories/MySQLParqueaderoRepository.js';
import { ProcesadorEstadosSaas } from './infrastructure/services/ProcesadorEstadosSaas.js';

import authRoutes from './presentation/routes/auth.routes.js';
import entradaRoutes from './presentation/routes/entrada.routes.js';
import ticketRoutes from './presentation/routes/ticket.routes.js';
import turnoRoutes from './presentation/routes/turno.routes.js';
import egresoRoutes from './presentation/routes/egreso.routes.js';
import tarifaRoutes from './presentation/routes/tarifa.routes.js';
import clienteMensualRoutes from './presentation/routes/clienteMensual.routes.js';
import configuracionMensualidadRoutes from './presentation/routes/configuracionMensualidad.routes.js';
import superAdminParqueaderoRoutes from './presentation/routes/superAdminParqueadero.routes.js';
import miPerfilRoutes from './presentation/routes/miPerfil.routes.js';
import operarioRoutes from './presentation/routes/operario.routes.js';
import reporteRoutes from './presentation/routes/reporte.routes.js';
import calendarioHabilRoutes from './presentation/routes/calendarioHabil.routes.js';
import dashboardRoutes from './presentation/routes/dashboard.routes.js';

import whatsappRoutes from './presentation/routes/whatsapp.routes.js';
dotenv.config();

// Falla rápido si el secreto JWT no es seguro (evita despliegues con 'secret_key' o sin clave).
obtenerJwtSecret();

const app: Application = express();
const httpServer = createServer(app);
let procesadorNotificacionesMensualidad: ProcesadorNotificacionesMensualidad | undefined;

// Configuración de WebSockets con Socket.io
export const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Middlewares de Seguridad y Registro
app.use(helmet()); // Cabeceras HTTP seguras
app.use(cors()); // Control de acceso HTTP
app.use(express.json()); // Parsing de body JSON
app.use(morgan('dev')); // Logger de peticiones HTTP en consola

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/entradas', entradaRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/turnos', turnoRoutes);
app.use('/api/v1/egresos', egresoRoutes);
app.use('/api/v1/tarifas', tarifaRoutes);
app.use('/api/v1/clientes-mensuales', clienteMensualRoutes);
app.use('/api/v1/configuracion-mensualidades', configuracionMensualidadRoutes);
app.use('/api/v1/admin', superAdminParqueaderoRoutes);
app.use('/api/v1/mi-perfil', miPerfilRoutes);
app.use('/api/v1/operarios', operarioRoutes);
app.use('/api/v1/reportes', reporteRoutes);
app.use('/api/v1/dias-no-habiles', calendarioHabilRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use('/api/v1/whatsapp', whatsappRoutes);
// Endpoint HealthCheck
app.get('/api/v1/health', async (_req: Request, res: Response): Promise<void> => {
    const baseDatosConectada = await verificarConexionBaseDatos();
    const whatsappConectado = whatsappService.estaConectado();
    const procesadorActivo = procesadorNotificacionesMensualidad?.obtenerUltimaEjecucion() !== undefined;
    const saludable = baseDatosConectada && whatsappConectado && procesadorActivo;
    res.status(saludable ? 200 : 503).json({
        status: saludable ? 'ok' : 'degradado',
        timestamp: new Date().toISOString(),
        dependencias: {
            baseDatos: baseDatosConectada ? 'conectada' : 'desconectada',
            whatsapp: whatsappConectado ? 'conectado' : 'desconectado',
            procesadorMensualidades: procesadorActivo ? 'activo' : 'pendiente'
        },
        ultimaEjecucionMensualidades: procesadorNotificacionesMensualidad?.obtenerUltimaEjecucion()?.toISOString() ?? null
    });
});

// Middleware centralizado de errores: garantiza respuestas JSON ante fallos
// no controlados (evita HTML/stack traces expuestos al cliente).
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    console.error('❌ Error no controlado:', error);
    if (res.headersSent) {
        return;
    }
    const detalle = error as { status?: unknown; statusCode?: unknown; type?: unknown } | null;
    const jsonMalformado = typeof error === 'object' &&
        error !== null &&
        detalle?.type === 'entity.parse.failed';
    const statusConocido = Number(detalle?.status ?? detalle?.statusCode) || 0;
    const esErrorDeValidacion = jsonMalformado || error instanceof TypeError;
    const status = esErrorDeValidacion
        ? 400
        : (statusConocido >= 400 && statusConocido < 600 ? statusConocido : 500);
    res.status(status).json({
        success: false,
        message: status < 500 && error instanceof Error
            ? error.message
            : 'Error interno del servidor.'
    });
});

// Ruta no encontrada (API): responde JSON en lugar del HTML por defecto de Express.
app.use((_req: Request, res: Response): void => {
    res.status(404).json({ success: false, message: 'Recurso no encontrado.' });
});

// Evento de Conexión WebSocket para la PWA
io.on('connection', (socket) => {
    console.log(`📡 Cliente conectado a WebSockets: ${socket.id}`);

    // Permite a la PWA unirse a una "sala" exclusiva de su parqueadero
    socket.on('unirse_parqueadero', (parqueaderoId: number) => {
        socket.join(`parqueadero_${parqueaderoId}`);
        console.log(`🔑 Socket ${socket.id} unido a sala: parqueadero_${parqueaderoId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
});

// Inicialización del Servidor
const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
    // 1. Validar conexión a MySQL antes de abrir el puerto
    await checkDatabaseConnection();
    new ProcesadorEstadosSaas(new ActualizarEstadosSaasUseCase(new MySQLParqueaderoRepository()), 60 * 60 * 1000).iniciar();

    // 2. 🚀 NUEVO: Inicializar conexión con WhatsApp (Baileys)
    try {
        await whatsappService.inicializar();

        // Conectar el escucha para respuestas numéricas del cliente (Ej: presionar "1" para ver QR)
        const ticketRepository = new MySQLTicketRepository();
        const procesarRespuestaUseCase = new ProcesarRespuestaWhatsAppUseCase(ticketRepository, whatsappService);
        const conversacionMensualidadRepository = new MySQLConversacionMensualidadRepository();
        const procesarRespuestaMensualidadUseCase = new ProcesarRespuestaMensualidadUseCase(
            conversacionMensualidadRepository,
            new MySQLConfiguracionMensualidadRepository(),
            new MySQLCalendarioHabilRepository(),
            whatsappService
        );

        whatsappService.alRecibirMensaje(async (telefono, texto) => {
            try {
                const respuestaMensualidadProcesada = await procesarRespuestaMensualidadUseCase.ejecutar(telefono, texto);
                if (respuestaMensualidadProcesada) {
                    console.log(`Respuesta de mensualidad procesada para ${telefono}.`);
                    return;
                }
                await procesarRespuestaUseCase.ejecutar(telefono, texto);
            } catch (error: unknown) {
                console.error(`❌ Error procesando el mensaje de WhatsApp de ${telefono}:`, error);
            }
        });

        const notificacionMensualidadRepository = new MySQLNotificacionMensualidadRepository();
        const enviarNotificacionesMensualidadUseCase = new EnviarNotificacionesMensualidadUseCase(
            notificacionMensualidadRepository,
            whatsappService
        );
        procesadorNotificacionesMensualidad = new ProcesadorNotificacionesMensualidad(enviarNotificacionesMensualidadUseCase, 30 * 1000);
        procesadorNotificacionesMensualidad.iniciar();
    } catch (error) {
        console.error('❌ Error al conectar servicio de WhatsApp:', error);
    }

    // 3. Levantar servidor HTTP y WebSockets
    httpServer.listen(PORT, () => {
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log(`⚡ WebSockets listos en puerto ${PORT}`);
    });
};

startServer();