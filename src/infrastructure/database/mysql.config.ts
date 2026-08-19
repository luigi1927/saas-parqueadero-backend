import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones asíncrono con Prepared Statements habilitados por defecto
export const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parqueadero_saas_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Máximo 10 conexiones simultáneas por instancia
    queueLimit: 0,
    timezone: '-05:00', // Ajustado a la zona horaria de Colombia/Latam
    dateStrings: true
});

// Helper para verificar conectividad al arrancar la app
export const checkDatabaseConnection = async (): Promise<void> => {
    try {
        const connection = await dbPool.getConnection();
        console.log('🟢 Conexión a MySQL establecida exitosamente (Pool InnoDB).');
        connection.release(); // Liberar la conexión de prueba inmediatamente
    } catch (error) {
        console.error('🔴 Error crítico al conectar con la base de datos MySQL:', error);
        process.exit(1); // Detener la ejecución si no hay base de datos
    }
};