// src/infrastructure/services/whatsappInstance.ts
import { BaileysWhatsAppService } from './BaileysWhatsAppService.js';

// Exportamos la instancia única para toda la aplicación
export const whatsappService = new BaileysWhatsAppService();