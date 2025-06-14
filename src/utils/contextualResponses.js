/**
 * Sistema de respostas contextualmente relevantes
 * Gera mensagens baseadas no estado da conversa, intenção do usuário e contexto
 */

/**
 * Gera uma resposta contextualmente relevante
 * @param {Object} conversationState - Estado atual da conversa
 * @param {Object} userIntent - Intenção detectada
 * @param {Object} contextData - Dados de contexto adicionais
 * @returns {string} Resposta contextualizada
 */
function generateContextualResponse(conversationState, userIntent, contextData = {}) {
  const { CONVERSATION_STATES } = require('./conversationFlow');
  const { INTENTIONS } = require('./intentAnalyzer');
  
  // Combinar todo o contexto disponível
  const context = {
    ...conversationState.context,
    ...contextData
  };
  
  // Variantes de respostas para diferentes situações
  const responses = {
    greeting: [
      "Olá! Como posso ajudar você hoje?",
      "Oi! Tudo bem? Como posso te ajudar?",
      "Olá! Que bom falar com você. Como posso ser útil?"
    ],
    
    farewell: [
      "Até a próxima! Sempre que precisar, estou aqui.",
      "Tchau! Foi um prazer ajudar. Até breve!",
      "Até mais! Qualquer dúvida sobre seu agendamento, pode me chamar."
    ],
    
    askForDate: [
      "Para qual data você gostaria de agendar seu ensaio?",
      "Qual seria a melhor data para você?",
      "Em qual data você prefere fazer seu ensaio fotográfico?"
    ],
    
    askForTime: [
      "Ótimo! E qual horário seria melhor para você?",
      "Perfeito! E em qual horário você prefere?",
      "Essa data funciona! Qual seria o melhor horário para você?"
    ],
    
    confirmationPositive: [
      "Perfeito! Seu agendamento foi confirmado.",
      "Ótimo! Confirmei seu agendamento com sucesso.",
      "Excelente! Seu horário está reservado."
    ],
    
    confirmationNegative: [
      "Sem problemas! Podemos tentar outra data ou horário.",
      "Entendi! Vamos procurar uma alternativa melhor para você.",
      "Tudo bem! O que você prefere fazer agora?"
    ],
    
    confusion: [
      "Desculpe, acho que não entendi corretamente. Poderia explicar de outra forma?",
      "Hmm, não tenho certeza se compreendi. Pode dizer de outro jeito?",
      "Peço desculpas pela confusão. Você poderia reformular sua solicitação?"
    ],
    
    noAppointments: [
      "Você não tem nenhum agendamento marcado no momento. Gostaria de agendar agora?",
      "Não encontrei agendamentos ativos para você. Posso ajudar a criar um novo?",
      "Parece que você ainda não tem ensaios agendados. Quer marcar um horário?"
    ]
  };
  
  // Escolher uma resposta aleatória da categoria apropriada
  const getRandomResponse = (category) => {
    const options = responses[category] || ["Hmm, não tenho uma resposta específica para isso."];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  // Lógica para selecionar o tipo de resposta baseado no estado e intenção
  if (userIntent.mainIntent === INTENTIONS.GREETING) {
    // Personalizar saudação baseada na hora do dia
    const hour = new Date().getHours();
    let timeGreeting = "";
    
    if (hour >= 5 && hour < 12) {
      timeGreeting = "Bom dia!";
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = "Boa tarde!";
    } else {
      timeGreeting = "Boa noite!";
    }
    
    return `${timeGreeting} ${getRandomResponse('greeting')}`;
  }
  
  if (userIntent.mainIntent === INTENTIONS.FAREWELL) {
    return getRandomResponse('farewell');
  }
  
  if (userIntent.mainIntent === INTENTIONS.CONFUSION || 
      conversationState.currentState === CONVERSATION_STATES.HANDLING_COMPLAINT) {
    return getRandomResponse('confusion');
  }
  
  if (conversationState.currentState === CONVERSATION_STATES.AWAITING_DATE) {
    return getRandomResponse('askForDate');
  }
  
  if (conversationState.currentState === CONVERSATION_STATES.AWAITING_TIME) {
    if (context.selectedDate) {
      const dateStr = formatDateReference(context.selectedDate);
      return `Para ${dateStr}, ${getRandomResponse('askForTime').toLowerCase()}`;
    }
    return getRandomResponse('askForTime');
  }
  
  if (conversationState.currentState === CONVERSATION_STATES.APPOINTMENT_CONFIRMED) {
    // Personalizar mensagem de confirmação com os detalhes do agendamento
    if (context.appointmentDate && context.appointmentTime) {
      const dateRef = formatDateReference(context.appointmentDate);
      return `${getRandomResponse('confirmationPositive')} Seu ensaio fotográfico está marcado para ${dateRef} às ${context.appointmentTime}. Estamos ansiosos para recebê-lo!`;
    }
    return getRandomResponse('confirmationPositive');
  }
  
  if (conversationState.currentState === CONVERSATION_STATES.LISTING_APPOINTMENTS) {
    if (context.appointments && context.appointments.length > 0) {
      let response = "Aqui estão seus agendamentos:\n";
      // Formatar cada agendamento
      context.appointments.forEach((appt, index) => {
        const dateRef = formatDateReference(appt.date);
        response += `${index + 1}. ${dateRef} às ${appt.time} - ${appt.type || 'Ensaio Fotográfico'}\n`;
      });
      return response;
    } else {
      return getRandomResponse('noAppointments');
    }
  }
  
  // Fallback para casos não tratados
  return "Estou aqui para ajudar com seu agendamento. Você gostaria de marcar, remarcar ou cancelar um horário?";
}

/**
 * Formata referências de data para exibição amigável
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @returns {string} Data formatada para exibição
 */
function formatDateReference(dateStr) {
  if (!dateStr) return "a data informada";
  
  try {
    const { formatDateHumanReadable } = require('./helpers');
    return formatDateHumanReadable(dateStr);
  } catch (err) {
    // Fallback simples se houver erro
    return dateStr;
  }
}

module.exports = {
  generateContextualResponse
};
