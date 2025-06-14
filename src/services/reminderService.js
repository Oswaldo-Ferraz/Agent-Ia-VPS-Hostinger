const { sendMessage } = require('./whatsapp');
const { listUpcomingEvents } = require('./googleCalendar');
const logger = require('../utils/logger');

// Configurações dos lembretes
let reminderConfig = {
  enabled: true,
  reminders: {
    '24h': {
      enabled: true,
      hours: 24
    },
    '2h': {
      enabled: true,
      hours: 2
    }
  },
  requireConfirmation: true,
  customReminders: [] // Array para lembretes personalizados
};

// Cache de lembretes já enviados para evitar duplicação
const sentReminders = new Set();

// Estado de lembretes pendentes de confirmação (eventId -> userId)
const pendingConfirmations = new Map();

/**
 * Verifica e envia lembretes para eventos próximos
 */
async function checkAndSendReminders() {
  if (!reminderConfig.enabled) return;

  try {
    const events = await listUpcomingEvents();
    const now = new Date();
    console.log(`[Reminder] Verificando ${events.length} eventos para lembretes...`);

    for (const event of events) {
      const eventStart = new Date(event.start.dateTime);
      const userId = event.extendedProperties?.private?.userId;

      if (!userId) {
        console.log(`[Reminder] Evento ${event.id} sem userId, pulando...`);
        continue;
      }

      // Verifica cada tipo de lembrete configurado
      for (const [key, reminder] of Object.entries(reminderConfig.reminders)) {
        if (!reminder.enabled) continue;

        const reminderTime = new Date(eventStart.getTime() - (reminder.hours * 60 * 60 * 1000));
        const cacheKey = `${event.id}_${key}`;
        
        // Verifica se já passou o tempo do lembrete e se ainda não foi enviado
        const shouldSendReminder = now >= reminderTime && 
                                 now <= eventStart &&
                                 !sentReminders.has(cacheKey);

        if (shouldSendReminder) {
          console.log(`[Reminder] Enviando lembrete ${key} para evento ${event.id} (userId: ${userId})`);
          await sendReminderMessage(userId, event, reminder.hours);
          sentReminders.add(cacheKey);
          console.log(`[Reminder] Cache atualizado: ${cacheKey} adicionado`);
        }
      }

      // Verifica lembretes personalizados
      for (const customReminder of reminderConfig.customReminders) {
        if (!customReminder.enabled) continue;
        
        const reminderTime = new Date(eventStart.getTime() - (customReminder.hours * 60 * 60 * 1000));
        const cacheKey = `${event.id}_custom_${customReminder.id}`;
        
        const shouldSendReminder = now >= reminderTime && 
                                 now <= eventStart &&
                                 !sentReminders.has(cacheKey);

        if (shouldSendReminder) {
          console.log(`[Reminder] Enviando lembrete personalizado para evento ${event.id} (userId: ${userId})`);
          await sendReminderMessage(userId, event, customReminder.hours, customReminder.message);
          sentReminders.add(cacheKey);
          console.log(`[Reminder] Cache atualizado: ${cacheKey} adicionado`);
        }
      }
    }
    
    // Limpeza de cache para eventos já passados (evita acúmulo de memória)
    cleanupExpiredReminders();
    
  } catch (error) {
    console.error('[Reminder] Erro ao verificar lembretes:', error);
  }
}

/**
 * Envia mensagem de lembrete para o usuário
 */
async function sendReminderMessage(userId, event, hours, customMessage = null) {
  const eventStart = new Date(event.start.dateTime);
  const formattedDate = eventStart.toLocaleDateString('pt-BR');
  const formattedTime = eventStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let message;
  if (customMessage) {
    message = customMessage
      .replace('{data}', formattedDate)
      .replace('{hora}', formattedTime);
  } else {
    message = `🔔 Lembrete: Você tem um ensaio fotográfico marcado para ${formattedDate} às ${formattedTime}`;
    
    if (hours >= 24) {
      message += '\n\nPor favor, confirme sua presença! Pode responder com "sim", "confirmo", "beleza" ou qualquer confirmação positiva. 😊';
    } else {
      message += '\n\nEstamos ansiosos para recebê-lo(a)! 📸✨';
    }
  }

  try {
    await sendMessage(userId, message);
    console.log(`✅ Lembrete enviado para ${userId}: ${formattedDate} às ${formattedTime} (${hours}h antes)`);
    
    // Se for lembrete de 24h e requer confirmação, adiciona ao estado pendente
    if (hours >= 24 && reminderConfig.requireConfirmation) {
      pendingConfirmations.set(event.id, {
        userId,
        eventId: event.id,
        sentAt: new Date(),
        eventDate: formattedDate,
        eventTime: formattedTime
      });
      console.log(`[Reminder] Confirmação pendente adicionada para evento ${event.id}`);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao enviar lembrete para ${userId}:`, error);
  }
}

/**
 * Adiciona um novo lembrete personalizado
 */
function addCustomReminder(hours, message, enabled = true) {
  const id = Date.now().toString();
  reminderConfig.customReminders.push({
    id,
    hours,
    message,
    enabled
  });
  return id;
}

/**
 * Remove um lembrete personalizado
 */
function removeCustomReminder(id) {
  reminderConfig.customReminders = reminderConfig.customReminders.filter(
    reminder => reminder.id !== id
  );
}

/**
 * Atualiza as configurações dos lembretes
 */
function updateConfig(newConfig) {
  reminderConfig = {
    ...reminderConfig,
    ...newConfig
  };
}

/**
 * Processa confirmação de lembrete
 */
function processReminderConfirmation(userId, confirmed = true) {
  let processed = false;
  
  for (const [eventId, reminderData] of pendingConfirmations.entries()) {
    if (reminderData.userId === userId) {
      if (confirmed) {
        console.log(`[Reminder] Confirmação recebida para evento ${eventId} do usuário ${userId}`);
      } else {
        console.log(`[Reminder] Usuário ${userId} não confirmou presença para evento ${eventId}`);
      }
      
      pendingConfirmations.delete(eventId);
      processed = true;
      break; // Assume que o usuário está confirmando o lembrete mais recente
    }
  }
  
  return processed;
}

/**
 * Verifica se há confirmações pendentes para um usuário
 */
function hasPendingConfirmation(userId) {
  for (const reminderData of pendingConfirmations.values()) {
    if (reminderData.userId === userId) {
      return true;
    }
  }
  return false;
}

/**
 * Limpa confirmações expiradas (mais de 48h sem resposta)
 */
function cleanupExpiredConfirmations() {
  const now = new Date();
  const expiredKeys = [];
  
  for (const [eventId, reminderData] of pendingConfirmations.entries()) {
    // Verifica se tem sentAt, se não tem usa createdAt como fallback
    const sentTime = reminderData.sentAt || reminderData.createdAt;
    if (sentTime) {
      const timeSinceSent = now.getTime() - sentTime.getTime();
      if (timeSinceSent > 48 * 60 * 60 * 1000) { // 48 horas
        expiredKeys.push(eventId);
      }
    } else {
      // Se não tem nem sentAt nem createdAt, remove por segurança
      expiredKeys.push(eventId);
    }
  }
  
  for (const eventId of expiredKeys) {
    pendingConfirmations.delete(eventId);
  }
  
  if (expiredKeys.length > 0) {
    console.log(`[Reminder] ${expiredKeys.length} confirmações expiradas removidas`);
  }
}

/**
 * Remove lembretes expirados do cache para evitar acúmulo de memória
 */
function cleanupExpiredReminders() {
  const now = new Date();
  const expiredKeys = [];
  
  // Para uma limpeza mais eficiente, manteríamos metadados dos lembretes
  // Por enquanto, vamos limpar lembretes mais antigos que 7 dias
  // Esta é uma implementação simplificada - em produção seria melhor ter metadados
  
  for (const key of sentReminders) {
    // Se o cache ficar muito grande, limpa itens mais antigos
    if (sentReminders.size > 1000) {
      expiredKeys.push(key);
    }
  }
  
  // Remove as primeiras chaves (mais antigas) se houver muitas
  if (expiredKeys.length > 0) {
    const toRemove = expiredKeys.slice(0, 500); // Remove até 500 entradas antigas
    for (const key of toRemove) {
      sentReminders.delete(key);
    }
    console.log(`[Reminder] Cache limpo: ${toRemove.length} entradas antigas removidas`);
  }
  
  // Também limpa confirmações expiradas
  cleanupExpiredConfirmations();
}

/**
 * Retorna as configurações atuais
 */
function getConfig() {
  return { ...reminderConfig };
}

// Inicia verificação de lembretes a cada 5 minutos
setInterval(checkAndSendReminders, 5 * 60 * 1000);

module.exports = {
  checkAndSendReminders,
  addCustomReminder,
  removeCustomReminder,
  updateConfig,
  getConfig,
  processReminderConfirmation,
  hasPendingConfirmation,
  cleanupExpiredConfirmations,
  pendingConfirmations
};
