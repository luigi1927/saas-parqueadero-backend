import express from 'express';
import type { Application, Request, Response } from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkDatabaseConnection } from './infrastructure/database/mysql.config.js';
import authRoutes from './presentation/routes/auth.routes.js';
import entradaRoutes from './presentation/routes/entrada.routes.js';
import ticketRoutes from './presentation/routes/ticket.routes.js';
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

    // 2. Levantar servidor HTTP y WebSockets
    httpServer.listen(PORT, () => {
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log(`⚡ WebSockets listos en puerto ${PORT}`);
    });
};

startServer();