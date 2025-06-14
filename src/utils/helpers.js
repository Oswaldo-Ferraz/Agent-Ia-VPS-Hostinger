/**
 * Utilitários para o bot WhatsApp
 */

/**
 * Formata um número de telefone para o padrão do WhatsApp
 * @param {string} number - Número de telefone
 * @returns {string} - Número formatado (ex: 5511999998888@c.us)
 */
function formatWhatsAppNumber(number) {
  // Remove caracteres não numéricos
  const cleanNumber = number.replace(/\D/g, '');
  
  // Adiciona o formato esperado pelo WhatsApp
  return `${cleanNumber}@c.us`;
}

/**
 * Espera por um determinado tempo
 * @param {number} ms - Tempo em milissegundos
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitiza texto de entrada para evitar injeção
 * @param {string} text - Texto para sanitizar
 * @returns {string} - Texto sanitizado
 */
function sanitizeInput(text) {
  if (!text) return '';
  
  // Remove caracteres potencialmente perigosos
  return text
    .replace(/[<>]/g, '')
    .trim();
}

// Gerenciamento de estados e timers
const messageStates = {
  // Fila de mensagens aguardando processamento
  messageQueues: new Map(),
  
  // Timers ativos por usuário
  messageTimers: new Map(),
  
  // Estado de digitação dos usuários
  typingStates: new Map(),
  
  // Histórico de tempo da última mensagem
  lastMessageTime: new Map(),

  // Estado das respostas longas em andamento
  responseStates: new Map(),

  // Estado de pausa por intervenção do administrador
  interventionPauseStates: new Map(),

  // Estado para rastrear a última saudação enviada ao usuário
  userGreetingStates: new Map()
};

/**
 * Estrutura para o estado de uma resposta longa (para referência, não é uma variável global)
 * const responseState = {
 *   fullResponse: "",          // Resposta completa da IA
 *   sentParts: [],            // Partes da resposta já enviadas ao usuário
 *   remainingParts: [],       // Partes da resposta ainda não enviadas
 *   currentPartIndex: 0,      // Índice da próxima parte a ser enviada
 *   isPaused: false,          // Indica se a resposta está pausada aguardando continuação
 *   lastInteraction: Date.now(), // Timestamp da última interação ou envio de parte
 *   isWaitingForConfirmation: false // Se o bot está aguardando confirmação para continuar
 * };
 */

// Configurações do sistema de delay
const DELAY_CONFIG = {
  BASE_DELAY: 5000,           // Delay base de 5 segundos
  MAX_DELAY: 10000,          // Delay máximo de 10 segundos
  TYPING_RESET_DELAY: 1000,  // Reseta delay se usuário está digitando
  MIN_QUEUE_PROCESS: 2000    // Tempo mínimo para processar fila
};

// Configurações do sistema de Intervenção Humana
const INTERVENTION_CONFIG = {
  INITIAL_PAUSE_DURATION: 10 * 60 * 1000, // 10 minutos em ms
  EXTENSION_PAUSE_DURATION: 45 * 60 * 1000, // 45 minutos em ms
  MAX_PAUSE_DURATION: 60 * 60 * 1000,       // 1 hora em ms
  PAUSE_CHECK_INTERVAL: 1 * 60 * 1000       // Intervalo para verificar expiração da pausa (1 minuto)
};

// Cache para eventos da agenda (otimização)
const agendaCache = new Map();

// Configuração para sugestões de horários
const SCHEDULE_SUGGESTION_CONFIG = {
  // Horários preferenciais por período
  MORNING_SLOTS: ['09:00', '10:00', '11:00'],
  AFTERNOON_SLOTS: ['14:00', '15:00', '16:00', '17:00'],
  
  // Duração padrão dos ensaios (em horas)
  DEFAULT_DURATION: 2,
  
  // Tempo de cache da agenda (em minutos)
  CACHE_DURATION: 30,
  
  // Dias para buscar antecipadamente
  DAYS_AHEAD_TO_FETCH: 5
};

/**
 * Obtém eventos em cache ou busca novos se necessário
 * @param {string} senderId - ID do usuário
 * @param {string} startDate - Data de início (YYYY-MM-DD)
 * @param {number} daysAhead - Quantos dias buscar à frente
 * @returns {Promise<Array>} Lista de eventos
 */
async function getCachedOrFetchEvents(senderId, startDate, daysAhead = SCHEDULE_SUGGESTION_CONFIG.DAYS_AHEAD_TO_FETCH) {
  const { listEventsByUserId } = require('../services/googleCalendar');
  
  const cacheKey = `${senderId}_${startDate}_${daysAhead}`;
  const cached = agendaCache.get(cacheKey);
  
  // Verifica se o cache é válido (não expirou)
  if (cached && (Date.now() - cached.timestamp) < (SCHEDULE_SUGGESTION_CONFIG.CACHE_DURATION * 60 * 1000)) {
    console.log(`[Cache] Usando eventos em cache para ${senderId}`);
    return cached.events;
  }
  
  try {
    const startDateTime = `${startDate}T00:00:00-03:00`;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead);
    const endDateTime = endDate.toISOString().split('T')[0] + 'T23:59:59-03:00';
    
    console.log(`[Cache] Buscando eventos para ${senderId} de ${startDate} até ${endDate.toISOString().split('T')[0]}`);
    const events = await listEventsByUserId(senderId, startDateTime, endDateTime);
    
    // Armazena no cache
    agendaCache.set(cacheKey, {
      events,
      timestamp: Date.now()
    });
    
    return events;
  } catch (error) {
    console.error('[Cache] Erro ao buscar eventos:', error);
    return [];
  }
}

/**
 * Verifica se um horário específico está disponível
 * @param {Array} events - Lista de eventos
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {string} time - Horário no formato HH:MM
 * @param {number} duration - Duração em horas
 * @returns {boolean} True se disponível
 */
function isTimeSlotAvailable(events, date, time, duration = SCHEDULE_SUGGESTION_CONFIG.DEFAULT_DURATION) {
  const slotStart = new Date(`${date}T${time}:00-03:00`);
  const slotEnd = new Date(slotStart.getTime() + (duration * 60 * 60 * 1000));
  
  return !events.some(event => {
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);
    
    // Verifica sobreposição
    return (slotStart < eventEnd && slotEnd > eventStart);
  });
}

/**
 * Gera sugestões inteligentes de horários para um dia específico
 * @param {string} senderId - ID do usuário
 * @param {string} targetDate - Data alvo no formato YYYY-MM-DD
 * @param {string} period - Período preferido: 'morning', 'afternoon', 'any'
 * @returns {Promise<Object>} Objeto com sugestões e mensagens de escassez
 */
async function generateTimeSlotSuggestions(senderId, targetDate, period = 'any') {
  try {
    const events = await getCachedOrFetchEvents(senderId, targetDate);
    const suggestions = [];
    
    let slotsToCheck = [];
    if (period === 'morning' || period === 'any') {
      slotsToCheck = [...slotsToCheck, ...SCHEDULE_SUGGESTION_CONFIG.MORNING_SLOTS.map(time => ({ time, period: 'morning' }))];
    }
    if (period === 'afternoon' || period === 'any') {
      slotsToCheck = [...slotsToCheck, ...SCHEDULE_SUGGESTION_CONFIG.AFTERNOON_SLOTS.map(time => ({ time, period: 'afternoon' }))];
    }
    
    // Verifica disponibilidade dos horários
    for (const slot of slotsToCheck) {
      if (isTimeSlotAvailable(events, targetDate, slot.time)) {
        suggestions.push({
          time: slot.time,
          period: slot.period,
          available: true
        });
      }
    }
    
    return {
      date: targetDate,
      suggestions,
      totalAvailable: suggestions.length,
      hasEvents: events.length > 0
    };
    
  } catch (error) {
    console.error('[Suggestions] Erro ao gerar sugestões:', error);
    return {
      date: targetDate,
      suggestions: [],
      totalAvailable: 0,
      hasEvents: false,
      error: true
    };
  }
}

/**
 * Gera uma resposta com técnica de escassez para sugestões de horário
 * @param {Object} suggestionData - Dados das sugestões
 * @param {string} period - Período solicitado
 * @param {string} dayReference - Referência do dia (ex: "amanhã", "terça-feira")
 * @returns {string} Mensagem formatada com escassez
 */
function generateScarcityScheduleMessage(suggestionData, period, dayReference = "neste dia") {
  const { suggestions, totalAvailable } = suggestionData;
  
  if (totalAvailable === 0) {
    return `😔 Infelizmente não tenho horários disponíveis ${dayReference}. Que tal verificarmos outro dia? Posso sugerir algumas opções!`;
  }
  
  // Estratégia de escassez - mostrar apenas 1-2 horários por vez
  let message = '';
  
  if (period === 'morning' || (period === 'any' && suggestions.some(s => s.period === 'morning'))) {
    const morningSlots = suggestions.filter(s => s.period === 'morning');
    if (morningSlots.length > 0) {
      const firstSlot = morningSlots[0];
      message += `✨ Que bom! Tenho um horário que acabou de vagar ${dayReference} às ${firstSlot.time}h da manhã! `;
      
      // Técnica de escassez
      if (morningSlots.length > 1) {
        message += `É uma excelente opção e está saindo rápido! 😊`;
      } else {
        message += `É o último horário da manhã disponível! 😱`;
      }
      
      return message + `\n\nO que acha? Fica bom pra você às ${firstSlot.time}h?`;
    }
  }
  
  if (period === 'afternoon' || (period === 'any' && suggestions.some(s => s.period === 'afternoon'))) {
    const afternoonSlots = suggestions.filter(s => s.period === 'afternoon');
    if (afternoonSlots.length > 0) {
      const firstSlot = afternoonSlots[0];
      
      if (afternoonSlots.length === 1) {
        message += `😍 Tenho apenas UM horário na tarde ${dayReference} às ${firstSlot.time}h! `;
        message += `Mas me confirma logo porque está chegando outra pessoa interessada neste mesmo horário! ⏰`;
      } else {
        const secondSlot = afternoonSlots[1];
        message += `👀 Para a tarde ${dayReference}, tenho às ${firstSlot.time}h ou às ${secondSlot.time}h. `;
        message += `Mas o das ${secondSlot.time}h também está para confirmar com outro cliente! `;
      }
      
      return message + `\n\nQual prefere?`;
    }
  }
  
  // Fallback genérico
  const firstAvailable = suggestions[0];
  message = `😊 Tenho um horário especial ${dayReference} às ${firstAvailable.time}h! `;
  
  if (totalAvailable === 1) {
    message += `É o último disponível e está saindo rápido! 🔥`;
  } else {
    message += `É uma das poucas opções que restam hoje! ✨`;
  }
  
  return message + `\n\nFica bom pra você?`;
}

/**
 * Processa uma solicitação flexível de agendamento
 * @param {string} senderId - ID do usuário
 * @param {string} userMessage - Mensagem do usuário
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processFlexibleScheduleRequest(senderId, userMessage) {
  try {
    const today = new Date();
    let targetDate = '';
    let period = 'any';
    let dayReference = '';
    
    // Parsing simples da mensagem (pode ser melhorado com NLP mais sofisticado)
    const lowerMessage = userMessage.toLowerCase();
    
    // Detecta o dia solicitado
    if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDate = tomorrow.toISOString().split('T')[0];
      dayReference = 'amanhã';
    } else if (lowerMessage.includes('hoje')) {
      targetDate = today.toISOString().split('T')[0];
      dayReference = 'hoje';
    } else if (lowerMessage.includes('segunda')) {
      // Próxima segunda-feira
      const nextMonday = new Date(today);
      const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7;
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      targetDate = nextMonday.toISOString().split('T')[0];
      dayReference = 'na segunda-feira';
    } else if (lowerMessage.includes('terça')) {
      const nextTuesday = new Date(today);
      const daysUntilTuesday = (2 + 7 - today.getDay()) % 7 || 7;
      nextTuesday.setDate(today.getDate() + daysUntilTuesday);
      targetDate = nextTuesday.toISOString().split('T')[0];
      dayReference = 'na terça-feira';
    }
    // Adicionar mais dias conforme necessário...
    
    // Detecta período preferido
    if (lowerMessage.includes('manhã') || lowerMessage.includes('manha')) {
      period = 'morning';
    } else if (lowerMessage.includes('tarde')) {
      period = 'afternoon';
    }
    
    // Se não conseguiu detectar a data, usa amanhã como padrão
    if (!targetDate) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDate = tomorrow.toISOString().split('T')[0];
      dayReference = 'amanhã';
    }
    
    const suggestionData = await generateTimeSlotSuggestions(senderId, targetDate, period);
    const scarcityMessage = generateScarcityScheduleMessage(suggestionData, period, dayReference);
    
    return {
      success: true,
      targetDate,
      period,
      dayReference,
      suggestions: suggestionData.suggestions,
      message: scarcityMessage,
      hasAvailableSlots: suggestionData.totalAvailable > 0
    };
    
  } catch (error) {
    console.error('[FlexibleSchedule] Erro ao processar solicitação:', error);
    return {
      success: false,
      error: true,
      message: '😅 Ops! Tive um probleminha ao verificar a agenda. Pode tentar novamente?'
    };
  }
}

/**
 * Processa respostas de follow-up (muito cedo, muito tarde, etc.)
 * @param {string} senderId - ID do usuário
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} lastSuggestedTime - Último horário sugerido
 * @param {string} targetDate - Data alvo
 * @returns {Promise<Object>} Resultado com nova sugestão
 */
async function processFollowUpScheduleResponse(senderId, userMessage, lastSuggestedTime, targetDate) {
  try {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detecta o tipo de feedback
    let feedbackType = null;
    if (lowerMessage.includes('cedo') || lowerMessage.includes('muito cedo')) {
      feedbackType = 'too_early';
    } else if (lowerMessage.includes('tarde') || lowerMessage.includes('muito tarde')) {
      feedbackType = 'too_late';
    } else if (lowerMessage.includes('outro') || lowerMessage.includes('outra opção') || lowerMessage.includes('alternativa')) {
      feedbackType = 'alternative';
    }
    
    if (!feedbackType) {
      return { success: false, reason: 'no_feedback_detected' };
    }
    
    // Busca eventos para o dia
    const events = await getCachedOrFetchEvents(senderId, targetDate);
    let newSuggestions = [];
    
    if (feedbackType === 'too_early') {
      // Se muito cedo, sugere horários mais tarde
      const laterSlots = [
        ...SCHEDULE_SUGGESTION_CONFIG.MORNING_SLOTS.filter(time => time > lastSuggestedTime).map(time => ({ time, period: 'morning' })),
        ...SCHEDULE_SUGGESTION_CONFIG.AFTERNOON_SLOTS.map(time => ({ time, period: 'afternoon' }))
      ];
      
      for (const slot of laterSlots.slice(0, 2)) { // Máximo 2 sugestões
        if (isTimeSlotAvailable(events, targetDate, slot.time)) {
          newSuggestions.push(slot);
        }
      }
    } else if (feedbackType === 'too_late') {
      // Se muito tarde, sugere horários mais cedo
      const earlierSlots = [
        ...SCHEDULE_SUGGESTION_CONFIG.MORNING_SLOTS.map(time => ({ time, period: 'morning' })),
        ...SCHEDULE_SUGGESTION_CONFIG.AFTERNOON_SLOTS.filter(time => time < lastSuggestedTime).map(time => ({ time, period: 'afternoon' }))
      ];
      
      for (const slot of earlierSlots.slice(0, 2)) { // Máximo 2 sugestões
        if (isTimeSlotAvailable(events, targetDate, slot.time)) {
          newSuggestions.push(slot);
        }
      }
    } else if (feedbackType === 'alternative') {
      // Sugere outras opções disponíveis
      const allSlots = [
        ...SCHEDULE_SUGGESTION_CONFIG.MORNING_SLOTS.map(time => ({ time, period: 'morning' })),
        ...SCHEDULE_SUGGESTION_CONFIG.AFTERNOON_SLOTS.map(time => ({ time, period: 'afternoon' }))
      ].filter(slot => slot.time !== lastSuggestedTime);
      
      for (const slot of allSlots.slice(0, 2)) { // Máximo 2 sugestões
        if (isTimeSlotAvailable(events, targetDate, slot.time)) {
          newSuggestions.push(slot);
        }
      }
    }
    
    if (newSuggestions.length === 0) {
      return {
        success: true,
        hasAlternatives: false,
        message: '😔 Entendo sua preferência! Infelizmente não tenho outros horários disponíveis neste dia. Que tal verificarmos outro dia? Posso sugerir algumas opções!'
      };
    }
    
    // Gera mensagem de follow-up com escassez
    let message = '';
    const firstOption = newSuggestions[0];
    
    if (feedbackType === 'too_early') {
      message = `😊 Ah, entendi! Que tal um horário mais tarde? `;
      if (firstOption.period === 'afternoon') {
        message += `Tenho às ${firstOption.time}h na tarde que acabou de ficar disponível! `;
      } else {
        message += `Tenho às ${firstOption.time}h da manhã, é mais tarde mas ainda cedinho! `;
      }
    } else if (feedbackType === 'too_late') {
      message = `😊 Claro! Que tal algo mais cedo? `;
      message += `Tenho às ${firstOption.time}h`;
      if (firstOption.period === 'morning') {
        message += ` da manhã`;
      }
      message += ` que acabou de vagar! `;
    } else {
      message = `😊 Claro! Tenho outras opções: às ${firstOption.time}h`;
      if (newSuggestions.length > 1) {
        message += ` ou às ${newSuggestions[1].time}h`;
      }
      message += `! `;
    }
    
    // Adiciona escassez
    if (newSuggestions.length === 1) {
      message += `É o único que tenho disponível, confirma comigo rapidinho? ⏰`;
    } else {
      message += `Mas o segundo está praticamente confirmado com outra pessoa! 👀`;
    }
    
    return {
      success: true,
      hasAlternatives: true,
      suggestions: newSuggestions,
      message: message + `\n\nQual fica melhor pra você?`,
      targetDate,
      feedbackType
    };
    
  } catch (error) {
    console.error('[FollowUp] Erro ao processar follow-up:', error);
    return {
      success: false,
      error: true,
      message: '😅 Ops! Deixa eu verificar outras opções pra você...'
    };
  }
}

/**
 * Limpa cache expirado da agenda
 */
function clearExpiredAgendaCache() {
  const now = Date.now();
  const maxAge = SCHEDULE_SUGGESTION_CONFIG.CACHE_DURATION * 60 * 1000;
  
  for (const [key, cached] of agendaCache.entries()) {
    if ((now - cached.timestamp) > maxAge) {
      agendaCache.delete(key);
    }
  }
}

// Limpa cache expirado a cada 15 minutos
setInterval(clearExpiredAgendaCache, 15 * 60 * 1000);

/**
 * Adiciona uma mensagem à fila de processamento
 * @param {string} senderId - ID do remetente
 * @param {object} message - Mensagem do WhatsApp
 */
function queueMessage(senderId, message) {
  // Obtém ou cria fila para o usuário
  let userQueue = messageStates.messageQueues.get(senderId) || [];
  userQueue.push({
    content: message.body,
    timestamp: Date.now(),
    messageObj: message
  });
  messageStates.messageQueues.set(senderId, userQueue);

  // Atualiza timestamp da última mensagem
  messageStates.lastMessageTime.set(senderId, Date.now());
}

/**
 * Verifica se o usuário está em estado de digitação
 * @param {string} senderId - ID do remetente
 * @returns {boolean}
 */
function isUserTyping(senderId) {
  const typingState = messageStates.typingStates.get(senderId);
  if (!typingState) return false;
  
  // Considera digitação ativa nos últimos 2 segundos
  return (Date.now() - typingState.timestamp) < 2000;
}

/**
 * Calcula o delay apropriado baseado no contexto
 * @param {string} senderId - ID do remetente
 * @returns {number} - Tempo de delay em ms
 */
function calculateDelay(senderId) {
  // Se usuário está digitando, usa delay mínimo
  if (isUserTyping(senderId)) {
    return DELAY_CONFIG.TYPING_RESET_DELAY;
  }

  // Calcula tempo desde última mensagem
  const lastTime = messageStates.lastMessageTime.get(senderId);
  if (!lastTime) return DELAY_CONFIG.BASE_DELAY;

  const timeSinceLastMessage = Date.now() - lastTime;
  
  // Se mensagens muito próximas, aumenta delay
  if (timeSinceLastMessage < 1000) {
    return DELAY_CONFIG.MAX_DELAY;
  }

  return DELAY_CONFIG.BASE_DELAY;
}

/**
 * Obtém todas as mensagens na fila de um usuário
 * @param {string} senderId - ID do remetente
 * @returns {Array} - Array de mensagens
 */
function getQueuedMessages(senderId) {
  const queue = messageStates.messageQueues.get(senderId) || [];
  messageStates.messageQueues.delete(senderId); // Limpa a fila
  return queue;
}

/**
 * Limpa timer existente para um usuário
 * @param {string} senderId - ID do remetente
 */
function clearUserTimer(senderId) {
  const existingTimer = messageStates.messageTimers.get(senderId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    messageStates.messageTimers.delete(senderId);
  }
}

/**
 * Atualiza estado de digitação do usuário
 * @param {string} senderId - ID do remetente
 */
function updateTypingState(senderId) {
  messageStates.typingStates.set(senderId, {
    timestamp: Date.now(),
    isTyping: true
  });
}

/**
 * Define o estado de uma resposta para um determinado usuário.
 * @param {string} senderId - ID do remetente.
 * @param {object} state - O objeto de estado da resposta.
 */
function setResponseState(senderId, state) {
  messageStates.responseStates.set(senderId, state);
}

/**
 * Obtém o estado de uma resposta para um determinado usuário.
 * @param {string} senderId - ID do remetente.
 * @returns {object | undefined} - O objeto de estado da resposta, ou undefined se não existir.
 */
function getResponseState(senderId) {
  return messageStates.responseStates.get(senderId);
}

/**
 * Limpa o estado de uma resposta para um determinado usuário.
 * @param {string} senderId - ID do remetente.
 */
function clearResponseState(senderId) {
  messageStates.responseStates.delete(senderId);
}

/**
 * Define o estado de pausa por intervenção para o bot.
 * O ID do sender aqui é simbólico, pois a pausa é global para o bot,
 * mas podemos querer armazenar quem iniciou, se necessário no futuro.
 * Usaremos um ID fixo como 'global_bot_pause'.
 * @param {object} state - O objeto de estado da pausa por intervenção.
 *                         Ex: { isPaused: true, pausedUntil: timestamp, pauseLevel: 1 }
 */
function setInterventionPauseState(state) {
  messageStates.interventionPauseStates.set('global_bot_pause', state);
}

/**
 * Obtém o estado de pausa por intervenção do bot.
 * @returns {object | undefined} - O objeto de estado da pausa, ou undefined se não estiver em pausa.
 */
function getInterventionPauseState() {
  return messageStates.interventionPauseStates.get('global_bot_pause');
}

/**
 * Limpa o estado de pausa por intervenção do bot.
 */
function clearInterventionPauseState() {
  messageStates.interventionPauseStates.delete('global_bot_pause');
}

/**
 * Retorna a saudação apropriada ("Bom dia", "Boa tarde", "Boa noite")
 * baseada na hora atual.
 * @returns {string} A saudação.
 */
function getPeriodSpecificGreeting() {
  const currentHour = new Date().getHours();
  if (currentHour >= 5 && currentHour < 12) {
    return "Bom dia";
  } else if (currentHour >= 12 && currentHour < 18) {
    return "Boa tarde";
  } else {
    return "Boa noite";
  }
}

/**
 * Define o estado da última saudação enviada para um usuário.
 * @param {string} senderId - ID do remetente.
 * @param {{period: string, timestamp: number}} state - Estado da saudação.
 *        Ex: { period: 'morning', timestamp: 1678886400000 }
 */
function setUserGreetingState(senderId, state) {
  messageStates.userGreetingStates.set(senderId, state);
}

/**
 * Obtém o estado da última saudação enviada para um usuário.
 * @param {string} senderId - ID do remetente.
 * @returns {{period: string, timestamp: number} | undefined}
 */
function getUserGreetingState(senderId) {
  return messageStates.userGreetingStates.get(senderId);
}

/**
 * Formata uma string de data (AAAA-MM-DD) para um formato legível.
 * Ex: "2025-05-27" para "terça-feira dia 27 de maio"
 * @param {string} dateString - A data no formato "AAAA-MM-DD".
 * @returns {string} - A data formatada ou a string original em caso de erro.
 */
function formatDateHumanReadable(dateString) {
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      console.warn(`Invalid dateString format for formatDateHumanReadable: ${dateString}`);
      return dateString;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mês no JavaScript é 0-indexado
    const day = parseInt(parts[2], 10);

    // Criar o objeto Date tratando como UTC para evitar deslocamentos de fuso horário local ao interpretar a string.
    // A formatação subsequente usará 'America/Sao_Paulo'.
    const dateObj = new Date(Date.UTC(year, month, day));

    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
    const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });

    return `${weekday} dia ${dayMonth}`;
  } catch (error) {
    console.error(`Error formatting date ${dateString}:`, error);
    return dateString; // Retorna a string original em caso de erro
  }
}

/**
 * Extrai a data da mensagem do usuário, analisando texto em linguagem natural
 * @param {string} message - Mensagem do usuário
 * @returns {Object} Objeto com data e tipo de referência
 */
function extractDateFromMessage(message) {
  const result = {
    date: null,      // Data no formato YYYY-MM-DD
    reference: null, // Referência como "amanhã", "hoje", "terça", etc
    day: null        // Número do dia se mencionado
  };
  
  const lowerMessage = message.toLowerCase().trim();
  const today = new Date();
  
  // Mapeamento de nomes de meses em português
  const mesesNome = {
    'janeiro': 0, 'jan': 0, 
    'fevereiro': 1, 'fev': 1, 
    'março': 2, 'mar': 2, 
    'abril': 3, 'abr': 3, 
    'maio': 4, 'mai': 4, 
    'junho': 5, 'jun': 5, 
    'julho': 6, 'jul': 6, 
    'agosto': 7, 'ago': 7, 
    'setembro': 8, 'set': 8, 
    'outubro': 9, 'out': 9, 
    'novembro': 10, 'nov': 10, 
    'dezembro': 11, 'dez': 11
  };
  
  // Verificar padrão de data com nome de mês (ex: "27 de maio" ou "27 maio")
  const monthNameRegex = /\b(\d{1,2})\s+(?:de\s+)?([a-zç]+)(?:\s+(?:de\s+)?(\d{2,4}))?\b/i;
  const monthNameMatch = lowerMessage.match(monthNameRegex);
  
  if (monthNameMatch) {
    const day = parseInt(monthNameMatch[1], 10);
    const monthName = monthNameMatch[2].toLowerCase();
    let year = monthNameMatch[3] ? parseInt(monthNameMatch[3], 10) : today.getFullYear();
    
    // Ajuste para anos abreviados (22 -> 2022)
    if (year && year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Verificar se o nome do mês é válido
    if (mesesNome.hasOwnProperty(monthName)) {
      const month = mesesNome[monthName];
      
      // Validar se o dia é válido para o mês
      if (day >= 1 && day <= 31) {
        const dateObj = new Date(year, month, day);
        // Verificar se a data é válida (ex: evitar 31 de fevereiro)
        if (dateObj.getMonth() === month && dateObj.getDate() === day) {
          result.date = dateObj.toISOString().split('T')[0];
          result.day = day;
          result.reference = `dia ${day} de ${monthName}`;
          return result;
        }
      }
    }
  }
  
  // Verificar padrão de data completa (dia/mês ou dia-mês)
  const fullDateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/;
  const fullDateMatch = lowerMessage.match(fullDateRegex);
  
  if (fullDateMatch) {
    let day = parseInt(fullDateMatch[1], 10);
    let month = parseInt(fullDateMatch[2], 10) - 1; // Meses em JS são 0-indexados
    let year = fullDateMatch[3] ? parseInt(fullDateMatch[3], 10) : today.getFullYear();
    
    // Ajuste para anos abreviados (22 -> 2022)
    if (year && year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Validação básica
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dateObj = new Date(year, month, day);
      result.date = dateObj.toISOString().split('T')[0];
      result.day = day;
      result.reference = `dia ${day}/${month + 1}`;
      return result;
    }
  }
  
  // Verificar menções a dias específicos (1 a 31)
  const dayRegex = /\b(?:dia\s+)?(\d{1,2})\b/;
  const dayMatch = lowerMessage.match(dayRegex);
  
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    
    // Validar se é um dia do mês válido
    if (day >= 1 && day <= 31) {
      result.day = day;
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Lógica para determinar o mês apropriado
      if (currentDay > day) {
        // Se o dia já passou este mês, assumir o próximo mês
        const nextMonth = new Date(currentYear, currentMonth + 1, day);
        // Verificar se o dia existe no próximo mês (ex: 31 de abril)
        if (nextMonth.getDate() === day) {
          result.date = nextMonth.toISOString().split('T')[0];
        } else {
          // Se não existir (ex: 31/04), usar o último dia do próximo mês
          const lastDayNextMonth = new Date(currentYear, currentMonth + 2, 0);
          result.date = lastDayNextMonth.toISOString().split('T')[0];
        }
      } else {
        // Senão, assumir o mês atual
        const targetDate = new Date(currentYear, currentMonth, day);
        // Verificar se o dia existe no mês atual
        if (targetDate.getDate() === day) {
          result.date = targetDate.toISOString().split('T')[0];
        } else {
          // Se não existir (ex: 31/02), usar o último dia do mês
          const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
          result.date = lastDayCurrentMonth.toISOString().split('T')[0];
        }
      }
      result.reference = `dia ${day}`;
      return result;
    }
  }
  
  // Verificações específicas para dias 26 e 27 (mantidos para compatibilidade)
  if (lowerMessage.includes('dia 27') || lowerMessage.match(/\b27\b/)) {
    result.day = 27;
    // Se estamos no mesmo mês e o dia 27 já passou, assumir o próximo mês
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (currentDay > 27) {
      // Avança um mês
      const nextMonth = new Date(currentYear, currentMonth + 1, 27);
      result.date = nextMonth.toISOString().split('T')[0];
    } else {
      result.date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-27`;
    }
    result.reference = `dia 27`;
    return result;
  }
  
  if (lowerMessage.includes('dia 26') || lowerMessage.match(/\b26\b/)) {
    result.day = 26;
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (currentDay > 26) {
      // Avança um mês
      const nextMonth = new Date(currentYear, currentMonth + 1, 26);
      result.date = nextMonth.toISOString().split('T')[0];
    } else {
      result.date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-26`;
    }
    result.reference = `dia 26`;
    return result;
  }
  
  // Verificar referências relativas
  if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    result.date = tomorrow.toISOString().split('T')[0];
    result.reference = 'amanhã';
    return result;
  }
  
  if (lowerMessage.includes('hoje')) {
    result.date = today.toISOString().split('T')[0];
    result.reference = 'hoje';
    return result;
  }
  
  if (lowerMessage.includes('depois de amanhã') || lowerMessage.includes('depois de amanha')) {
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    result.date = dayAfterTomorrow.toISOString().split('T')[0];
    result.reference = 'depois de amanhã';
    return result;
  }
  
  if (lowerMessage.includes('próxima semana') || lowerMessage.includes('proxima semana') || 
      lowerMessage.includes('semana que vem')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    result.date = nextWeek.toISOString().split('T')[0];
    result.reference = 'próxima semana';
    return result;
  }
  
  if (lowerMessage.includes('fim de semana') || lowerMessage.includes('final de semana') || 
      lowerMessage.includes('fds')) {
    // Assumir o próximo sábado como referência para fim de semana
    const currentDay = today.getDay(); // 0 = domingo, 6 = sábado
    const daysUntilSaturday = currentDay === 6 ? 7 : 6 - currentDay;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    result.date = nextSaturday.toISOString().split('T')[0];
    result.reference = 'fim de semana';
    return result;
  }
  
  // Dias da semana
  const diasSemana = {
    'segunda': 1, 'segunda-feira': 1, 'próxima segunda': 1, 'proxima segunda': 1,
    'terça': 2, 'terça-feira': 2, 'terca': 2, 'terca-feira': 2, 'próxima terça': 2, 'proxima terca': 2,
    'quarta': 3, 'quarta-feira': 3, 'próxima quarta': 3, 'proxima quarta': 3,
    'quinta': 4, 'quinta-feira': 4, 'próxima quinta': 4, 'proxima quinta': 4,
    'sexta': 5, 'sexta-feira': 5, 'próxima sexta': 5, 'proxima sexta': 5,
    'sábado': 6, 'sabado': 6, 'próximo sábado': 6, 'proximo sabado': 6,
    'domingo': 0, 'próximo domingo': 0, 'proximo domingo': 0
  };
  
  // Verificação para palavras-chave como "próxima" seguida do dia da semana
  const proximaSemanaRegex = /(próxima|proxima|próximo|proximo)\s+(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?/i;
  const proximaSemanaMatch = lowerMessage.match(proximaSemanaRegex);
  
  if (proximaSemanaMatch) {
    // Extrair o dia da semana
    let diaSemana = proximaSemanaMatch[2].toLowerCase();
    
    // Normalizar para as chaves do objeto diasSemana
    if (diaSemana === 'terca') diaSemana = 'terça';
    if (diaSemana === 'sabado') diaSemana = 'sábado';
    
    // Encontrar o número do dia da semana (0-6)
    let targetDay = null;
    for (const [dia, valor] of Object.entries(diasSemana)) {
      if (dia.includes(diaSemana)) {
        targetDay = valor;
        break;
      }
    }
    
    if (targetDay !== null) {
      const currentDay = today.getDay();
      // Garantir que a data será na próxima semana, independente de qual dia é hoje
      let daysToAdd = (targetDay + 7 - currentDay) % 7;
      if (daysToAdd === 0 || // Se for o mesmo dia da semana
          proximaSemanaMatch[1].toLowerCase().includes('próxim') || // Ou se explicitamente pedir "próximo/a"
          proximaSemanaMatch[1].toLowerCase().includes('proxim')) {
        daysToAdd += 7; // Vai para a próxima semana
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      
      result.date = targetDate.toISOString().split('T')[0];
      result.reference = `${diaSemana}-feira`;
      return result;
    }
  }
  
  // Verificação regular para menções diretas a dias da semana
  for (const [dia, valor] of Object.entries(diasSemana)) {
    if (lowerMessage.includes(dia)) {
      const targetDay = valor;
      const currentDay = today.getDay();
      let daysToAdd = (targetDay + 7 - currentDay) % 7;
      
      // Se for o mesmo dia da semana e não for explicitamente "hoje", vai para a próxima semana
      if (daysToAdd === 0 && !lowerMessage.includes('hoje')) {
        daysToAdd = 7;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      
      result.date = targetDate.toISOString().split('T')[0];
      result.reference = dia;
      return result;
    }
  }
  
  return result;
}
module.exports = {
  formatWhatsAppNumber,
  delay,
  sanitizeInput,
  messageStates,
  DELAY_CONFIG,
  INTERVENTION_CONFIG, // Added
  queueMessage,
  isUserTyping,
  calculateDelay,
  getQueuedMessages,
  clearUserTimer,
  updateTypingState,
  setResponseState,
  getResponseState,
  clearResponseState,
  setInterventionPauseState, // Added
  getInterventionPauseState, // Added
  clearInterventionPauseState, // Added
  getPeriodSpecificGreeting, // Added
  setUserGreetingState, // Added
  getUserGreetingState, // Added
  formatDateHumanReadable, // Added
  extractDateFromMessage, // Added
  // Novas funções de agendamento flexível
  SCHEDULE_SUGGESTION_CONFIG,
  getCachedOrFetchEvents,
  isTimeSlotAvailable,
  generateTimeSlotSuggestions,
  generateScarcityScheduleMessage,
  processFlexibleScheduleRequest,
  processFollowUpScheduleResponse,
  clearExpiredAgendaCache,
  extractDateFromMessage // Adicionada função auxiliar
};
