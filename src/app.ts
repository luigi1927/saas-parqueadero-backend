// import express from 'express';
// import type { Application, Request, Response } from 'express';
// import { createServer } from 'node:http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import dotenv from 'dotenv';
// import { checkDatabaseConnection } from './infrastructure/database/mysql.config.js';
// import authRoutes from './presentation/routes/auth.routes.js';
// import entradaRoutes from './presentation/routes/entrada.routes.js';
// import ticketRoutes from './presentation/routes/ticket.routes.js';
// import turnoRoutes from './presentation/routes/turno.routes.js';
// import egresoRoutes from './presentation/routes/egreso.routes.js';
// import tarifaRoutes from './presentation/routes/tarifa.routes.js';
// import clienteMensualRoutes from './presentation/routes/clienteMensual.routes.js';
// dotenv.config();

// const app: Application = express();
// const httpServer = createServer(app);

// // Configuración de WebSockets con Socket.io
// export const io = new Server(httpServer, {
//     cors: {
//         origin: process.env.CLIENT_URL || '*',
//         methods: ['GET', 'POST', 'PUT', 'DELETE']
//     }
// });

// // Middlewares de Seguridad y Registro
// app.use(helmet()); // Cabeceras HTTP seguras
// app.use(cors()); // Control de acceso HTTP
// app.use(express.json()); // Parsing de body JSON
// app.use(morgan('dev')); // Logger de peticiones HTTP en consola

// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/entradas', entradaRoutes);
// app.use('/api/v1/tickets', ticketRoutes);
// app.use('/api/v1/turnos', turnoRoutes);
// app.use('/api/v1/egresos', egresoRoutes);
// app.use('/api/v1/tarifas', tarifaRoutes);
// app.use('/api/v1/clientes-mensuales', clienteMensualRoutes);

// // Endpoint HealthCheck
// app.get('/api/v1/health', (_req: Request, res: Response) => {
//     res.status(200).json({
//         status: 'ok',
//         timestamp: new Date().toISOString()
//     });
// });

// // Evento de Conexión WebSocket para la PWA
// io.on('connection', (socket) => {
//     console.log(`📡 Cliente conectado a WebSockets: ${socket.id}`);

//     // Permite a la PWA unirse a una "sala" exclusiva de su parqueadero
//     socket.on('unirse_parqueadero', (parqueaderoId: number) => {
//         socket.join(`parqueadero_${parqueaderoId}`);
//         console.log(`🔑 Socket ${socket.id} unido a sala: parqueadero_${parqueaderoId}`);
//     });

//     socket.on('disconnect', () => {
//         console.log(`🔌 Cliente desconectado: ${socket.id}`);
//     });
// });

// // Inicialización del Servidor
// const PORT = Number(process.env.PORT) || 3000;

// const startServer = async () => {
//     // 1. Validar conexión a MySQL antes de abrir el puerto
//     await checkDatabaseConnection();

//     // 2. Levantar servidor HTTP y WebSockets
//     httpServer.listen(PORT, () => {
//         console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
//         console.log(`⚡ WebSockets listos en puerto ${PORT}`);
//     });
// };

// startServer();

import express from 'express';
import type { Application, Request, Response } from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkDatabaseConnection } from './infrastructure/database/mysql.config.js';
import { whatsappService } from './infrastructure/services/whatsappInstance.js';
import { MySQLTicketRepository } from './infrastructure/repositories/MySQLTicketRepository.js';
import { ProcesarRespuestaWhatsAppUseCase } from './application/use-cases/ProcesarRespuestaWhatsAppUseCase.js';

import authRoutes from './presentation/routes/auth.routes.js';
import entradaRoutes from './presentation/routes/entrada.routes.js';
import ticketRoutes from './presentation/routes/ticket.routes.js';
import turnoRoutes from './presentation/routes/turno.routes.js';
import egresoRoutes from './presentation/routes/egreso.routes.js';
import tarifaRoutes from './presentation/routes/tarifa.routes.js';
import clienteMensualRoutes from './presentation/routes/clienteMensual.routes.js';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

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

// Endpoint HealthCheck
app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
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

    // 2. 🚀 NUEVO: Inicializar conexión con WhatsApp (Baileys)
    try {
        await whatsappService.inicializar();

        // Conectar el escucha para respuestas numéricas del cliente (Ej: presionar "1" para ver QR)
        const ticketRepository = new MySQLTicketRepository();
        const procesarRespuestaUseCase = new ProcesarRespuestaWhatsAppUseCase(ticketRepository, whatsappService);

        whatsappService.alRecibirMensaje(async (telefono, texto) => {
            await procesarRespuestaUseCase.ejecutar(telefono, texto);
        });
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