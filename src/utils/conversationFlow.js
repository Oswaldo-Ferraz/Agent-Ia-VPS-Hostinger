/**
 * Sistema de controle de fluxo de conversação
 * Permite gerenciar estados de conversas e transições de forma organizada
 */

const CONVERSATION_STATES = {
  INITIAL: 'initial',
  GREETING: 'greeting',
  AWAITING_DATE: 'awaiting_date',
  AWAITING_TIME: 'awaiting_time',
  SUGGESTING_SLOTS: 'suggesting_slots',
  CONFIRMING_APPOINTMENT: 'confirming_appointment',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  LISTING_APPOINTMENTS: 'listing_appointments',
  SELECTING_APPOINTMENT_TO_MODIFY: 'selecting_appointment_to_modify',
  SELECTING_APPOINTMENT_TO_CANCEL: 'selecting_appointment_to_cancel',
  CONFIRMING_CANCELLATION: 'confirming_cancellation',
  AWAITING_NEW_DATE_TIME: 'awaiting_new_date_time',
  CONFIRMING_MODIFICATION: 'confirming_modification',
  HANDLING_COMPLAINT: 'handling_complaint',
  FAREWELL: 'farewell',
  IDLE: 'idle'
};

// Armazenamento para estados de conversa
const conversationStates = new Map();

/**
 * Obtém o estado atual da conversa para um usuário
 * @param {string} userId - ID do usuário
 * @returns {Object} Estado da conversa com metadados
 */
function getConversationState(userId) {
  if (!conversationStates.has(userId)) {
    // Inicializar com estado padrão
    conversationStates.set(userId, {
      currentState: CONVERSATION_STATES.INITIAL,
      previousState: null,
      context: {},
      lastUpdateTime: Date.now(),
      stateHistory: []
    });
  }
  
  return conversationStates.get(userId);
}

/**
 * Atualiza o estado da conversa para um usuário
 * @param {string} userId - ID do usuário
 * @param {string} newState - Novo estado da conversa (usar constantes CONVERSATION_STATES)
 * @param {Object} contextData - Dados de contexto adicionais
 */
function updateConversationState(userId, newState, contextData = {}) {
  const currentStateObj = getConversationState(userId);
  
  // Registrar o estado anterior para histórico
  const previousState = currentStateObj.currentState;
  currentStateObj.previousState = previousState;
  
  // Adicionar ao histórico (limitar a 10 estados)
  currentStateObj.stateHistory.push({
    state: previousState,
    timestamp: currentStateObj.lastUpdateTime
  });
  
  if (currentStateObj.stateHistory.length > 10) {
    currentStateObj.stateHistory.shift();
  }
  
  // Atualizar para o novo estado
  currentStateObj.currentState = newState;
  currentStateObj.lastUpdateTime = Date.now();
  
  // Mesclar dados de contexto
  currentStateObj.context = {
    ...currentStateObj.context,
    ...contextData
  };
  
  // Salvar estado atualizado
  conversationStates.set(userId, currentStateObj);
  
  console.log(`[ConversationFlow] Usuário ${userId}: ${previousState} -> ${newState}`);
  return currentStateObj;
}

/**
 * Verifica se é hora de limpar o contexto da conversa (após longo tempo sem interação)
 * @param {string} userId - ID do usuário
 * @param {number} timeout - Tempo limite em ms (padrão: 30 minutos)
 * @returns {boolean} True se o contexto deve ser limpo
 */
function shouldResetConversation(userId, timeout = 30 * 60 * 1000) {
  const state = getConversationState(userId);
  return (Date.now() - state.lastUpdateTime) > timeout;
}

/**
 * Limpa o contexto da conversa para um usuário
 * @param {string} userId - ID do usuário
 */
function resetConversation(userId) {
  const currentState = conversationStates.get(userId);
  
  if (currentState) {
    // Manter uma cópia do histórico para referência
    const historyCopy = [...currentState.stateHistory, {
      state: currentState.currentState,
      timestamp: currentState.lastUpdateTime
    }];
    
    // Redefinir para o estado inicial
    conversationStates.set(userId, {
      currentState: CONVERSATION_STATES.INITIAL,
      previousState: null,
      context: { previousHistory: historyCopy },
      lastUpdateTime: Date.now(),
      stateHistory: []
    });
    
    console.log(`[ConversationFlow] Conversa resetada para ${userId}`);
  }
}

/**
 * Verifica transições de estado com base na mensagem e intenção do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} userIntent - Resultado da análise de intenção 
 * @param {string} message - Mensagem do usuário
 * @returns {Object} Próximo estado sugerido e ações recomendadas
 */
function processStateTransition(userId, userIntent, message) {
  const currentState = getConversationState(userId);
  let nextState = currentState.currentState; // Por padrão, mantém o mesmo estado
  const actions = [];
  
  // Alguns exemplos de transições baseadas em intenções e estados
  // Esta é uma versão simplificada, pode ser expandida conforme necessário
  
  const { INTENTIONS } = require('./intentAnalyzer');
  
  // Manipulação de saudações em qualquer estado
  if (userIntent.mainIntent === INTENTIONS.GREETING) {
    nextState = CONVERSATION_STATES.GREETING;
    actions.push('send_greeting');
  }
  
  // Manipulação de despedidas em qualquer estado
  if (userIntent.mainIntent === INTENTIONS.FAREWELL) {
    nextState = CONVERSATION_STATES.FAREWELL;
    actions.push('send_farewell');
  }
  
  // Respostas de confirmação/rejeição baseadas no estado atual
  if (userIntent.mainIntent === INTENTIONS.CONFIRMATION) {
    if (currentState.currentState === CONVERSATION_STATES.CONFIRMING_APPOINTMENT) {
      nextState = CONVERSATION_STATES.APPOINTMENT_CONFIRMED;
      actions.push('create_appointment');
    } else if (currentState.currentState === CONVERSATION_STATES.CONFIRMING_CANCELLATION) {
      actions.push('cancel_appointment');
      nextState = CONVERSATION_STATES.IDLE;
    } else if (currentState.currentState === CONVERSATION_STATES.CONFIRMING_MODIFICATION) {
      actions.push('modify_appointment');
      nextState = CONVERSATION_STATES.IDLE;
    }
  }
  
  if (userIntent.mainIntent === INTENTIONS.REJECTION) {
    if ([CONVERSATION_STATES.CONFIRMING_APPOINTMENT, 
         CONVERSATION_STATES.CONFIRMING_CANCELLATION,
         CONVERSATION_STATES.CONFIRMING_MODIFICATION].includes(currentState.currentState)) {
      actions.push('acknowledge_rejection');
      nextState = CONVERSATION_STATES.IDLE;
    }
  }
  
  // Manipulação de novas intenções em qualquer estado
  if (userIntent.mainIntent === INTENTIONS.SCHEDULE) {
    nextState = CONVERSATION_STATES.AWAITING_DATE;
    actions.push('ask_for_date');
  } else if (userIntent.mainIntent === INTENTIONS.RESCHEDULE) {
    nextState = CONVERSATION_STATES.SELECTING_APPOINTMENT_TO_MODIFY;
    actions.push('list_appointments_for_modification');
  } else if (userIntent.mainIntent === INTENTIONS.CANCEL) {
    nextState = CONVERSATION_STATES.SELECTING_APPOINTMENT_TO_CANCEL;
    actions.push('list_appointments_for_cancellation');
  } else if (userIntent.mainIntent === INTENTIONS.LIST) {
    nextState = CONVERSATION_STATES.LISTING_APPOINTMENTS;
    actions.push('list_appointments');
  } else if (userIntent.mainIntent === INTENTIONS.CONFUSION) {
    actions.push('handle_confusion');
  }
  
  return {
    currentState: currentState.currentState,
    suggestedNextState: nextState,
    recommendedActions: actions,
    context: currentState.context
  };
}

module.exports = {
  CONVERSATION_STATES,
  getConversationState,
  updateConversationState,
  shouldResetConversation,
  resetConversation,
  processStateTransition
};
