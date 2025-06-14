const { generateResponse, transcribeAudio } = require('../services/openai');
const { sendMessage, downloadAudio, startTyping, stopTyping, calculateHumanTypingTime, getBotAdminId } = require('../services/whatsapp');
const { createEvent, listEventsByUserId, updateEvent, deleteEvent } = require('../services/googleCalendar');
const { handleAdminCommand, showMainMenu } = require('../services/adminCommandService');
const { processReminderConfirmation, hasPendingConfirmation } = require('../services/reminderService');
const {
  queueMessage,
  isUserTyping,
  calculateDelay,
  getQueuedMessages,
  clearUserTimer,
  updateTypingState,
  messageStates,
  setResponseState,
  getResponseState,
  clearResponseState,
  setInterventionPauseState, // Added
  getInterventionPauseState, // Added
  clearInterventionPauseState, // Added
  INTERVENTION_CONFIG, // Added
  getPeriodSpecificGreeting, // Added
  setUserGreetingState, // Added
  getUserGreetingState, // Added
  formatDateHumanReadable, // Added
  // Novas funções de agendamento flexível
  processFlexibleScheduleRequest,
  processFollowUpScheduleResponse,
  generateScarcityScheduleMessage,
  SCHEDULE_SUGGESTION_CONFIG
} = require('../utils/helpers');

// Novos sistemas para melhorar o bot
const { analyzeUserIntent, analyzeConfirmationWithAI, INTENTIONS } = require('../utils/intentAnalyzer');
const { 
  CONVERSATION_STATES, 
  getConversationState, 
  updateConversationState,
  shouldResetConversation,
  resetConversation,
  processStateTransition
} = require('../utils/conversationFlow');
const { generateContextualResponse } = require('../utils/contextualResponses');
const { calculateTypingTime } = require('../utils/humanBehaviorSimulator');
const { extractDateFromMessage } = require('../utils/helpers');
const fs = require('fs');

// Simple delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Armazenamento de conversas (in-memory para simplificar)
const conversations = new Map();

// NEW: Test number configuration state
let officialTestNumber = null; // Stores the official test number once confirmed
let potentialTestNumber = null; // Stores the senderId of the first user to message
let awaitingInitialConfirmation = false; // Flag to indicate if we're waiting for "ok" from potentialTestNumber

/**
 * Processa múltiplas mensagens como uma única entrada
 * @param {Array} messages - Array de mensagens do usuário
 * @param {string} senderId - ID do remetente
 */
async function processMessageBatch(messages, senderId) {
  try {
    // Combina todas as mensagens em um único texto
    const combinedText = messages
      .map(msg => msg.content)
      .join('\n');

    console.log(`Processando lote de mensagens de ${senderId}:`, combinedText);
    
    // Analisa a intenção do usuário antes do processamento completo
    const userIntent = analyzeUserIntent(combinedText);
    
    // Se for uma intenção de "resposta rápida" (como saudação ou confirmação simples),
    // podemos responder imediatamente sem passar pelo processo completo de IA
    if (userIntent.confidence > 0.9 && 
        [INTENTIONS.GREETING, INTENTIONS.FAREWELL, 
         INTENTIONS.THANKS, INTENTIONS.CONFIRMATION,
         INTENTIONS.REJECTION].includes(userIntent.mainIntent)) {
      
      // Obter estado atual da conversa
      const conversationState = getConversationState(senderId);
      
      // Verificar se a intenção de confirmação/rejeição corresponde a um estado esperado
      if ((userIntent.mainIntent === INTENTIONS.CONFIRMATION || 
           userIntent.mainIntent === INTENTIONS.REJECTION) && 
          conversationState.currentState.includes('CONFIRMING_')) {
        
        // Processar usando o fluxo normal para tratamento da confirmação
        await handleSingleMessage(combinedText, senderId, messages[0].messageObj);
        return;
      }
      
      // Verificar se é uma intenção de LIST com alta confiança
      if (userIntent.mainIntent === INTENTIONS.LIST && userIntent.confidence >= 0.85) {
        // Processa diretamente com o handler normal que vai tratar consultas de agendamento
        await handleSingleMessage(combinedText, senderId, messages[0].messageObj);
        return;
      }
      
      // Para outras intenções de resposta rápida, podemos gerar uma resposta contextual
      // Kilo Code: Modified to exclude GREETING from quick contextual responses,
      // so it goes to full processing as per user request.
      if ([INTENTIONS.FAREWELL, INTENTIONS.THANKS].includes(userIntent.mainIntent)) {
        // Gerar resposta contextualizada
        const contextualResponse = generateContextualResponse(conversationState, userIntent);
        
        // Atualizar estado da conversa
        if (userIntent.mainIntent === INTENTIONS.GREETING) {
          updateConversationState(senderId, CONVERSATION_STATES.GREETING);
          // Marca que já enviou uma saudação hoje para evitar duplicação
          setUserGreetingState(senderId, {
            greetingText: getPeriodSpecificGreeting(),
            timestamp: Date.now()
          });
        } else if (userIntent.mainIntent === INTENTIONS.FAREWELL) {
          updateConversationState(senderId, CONVERSATION_STATES.FAREWELL);
        }
        
        // Simular tempo de digitação humano
        const { calculateTypingTime } = require('../utils/humanBehaviorSimulator');
        const typingTime = calculateTypingTime(contextualResponse);
        
        await startTyping(senderId);
        await new Promise(resolve => setTimeout(resolve, typingTime));
        await sendMessage(senderId, contextualResponse);
        await stopTyping(senderId);
        
        return;
      }
    }

    // Para outras intenções mais complexas, processa o lote completo
    await handleSingleMessage(combinedText, senderId, messages[0].messageObj);
  } catch (error) {
    console.error('Erro ao processar lote de mensagens:', error);
    await sendMessage(senderId, 'Desculpe, ocorreu um erro ao processar suas mensagens.');
  }
}

/**
 * Processa uma única mensagem após o delay
 */
async function handleSingleMessage(messageText, senderId, originalMessage) {
  const startTime = Date.now();
  console.log(`[Message] Iniciando processamento para ${senderId}: "${messageText.substring(0, 100)}..."`);
  
  try {
    // Recupera ou cria o histórico da conversa
    if (!conversations.has(senderId)) {
      conversations.set(senderId, [
        {
          role: 'system',
          content: `Você é um assistente de agendamento fotográfico alegre e gentil. Responda perguntas de forma clara, educada e humanizada, sempre com um tom positivo e acolhedor.

🎯 AGENDAMENTOS FLEXÍVEIS (NOVO SISTEMA):
Se o usuário perguntar sobre disponibilidade de forma genérica (ex: "tem horário amanhã?", "quais horários livres hoje?", "tem vaga na terça?"), use a tag <AGENDAMENTO_FLEXIVEL> seguida da data/período mencionado. Exemplo: <AGENDAMENTO_FLEXIVEL> amanhã manhã ou <AGENDAMENTO_FLEXIVEL> terça-feira tarde. O sistema irá verificar a agenda e sugerir horários com técnicas de escassez.

Se o usuário fornecer detalhes específicos de agendamento (data e hora específicas), inclua a tag <AGENDAMENTO_SOLICITADO> seguida pelos detalhes. Exemplo: <AGENDAMENTO_SOLICITADO> Ensaio Fotográfico para 2025-05-28 às 14:30.

🔄 FOLLOW-UP INTELIGENTE:
Se o usuário responder com feedback sobre horários sugeridos (ex: "muito cedo", "muito tarde", "tem outra opção?"), use a tag <AGENDAMENTO_FOLLOWUP> seguida do último horário sugerido e da data. Exemplo: <AGENDAMENTO_FOLLOWUP> 09:00 2025-05-27 muito cedo. O sistema irá sugerir alternativas mais adequadas.

🔄 MODIFICAÇÕES, CANCELAMENTOS E CONSULTAS:
Para alterações: <AGENDAMENTO_MODIFICAR> Antigo: [data] às [hora] Novo: [data] às [hora]
Para cancelamentos: <AGENDAMENTO_CANCELAR> [data] às [hora]  
Para listar agendamentos: <AGENDAMENTO_LISTAR>

IMPORTANTE: Sempre use a tag <AGENDAMENTO_LISTAR> quando o usuário quiser saber seus agendamentos existentes. Exemplos:
- "Quero saber que dia marquei meu ensaio"
- "Quando é minha sessão de fotos?" 
- "Em que data está marcado meu ensaio?"
- "Qual dia agendei minha sessão?"

💡 DIRETRIZES DE COMUNICAÇÃO:
- Seja sempre gentil, alegre e use emojis com moderação
- Use técnicas de escassez natural ("acabou de vagar", "último horário", "está saindo rápido")
- Priorize manhãs (9h, 10h, 11h) e tardes (14h, 15h, 16h, 17h)
- Nunca revele informações sobre lotação geral da agenda
- Mantenha respostas concisas e conversacionais
- Se não entender algo, peça esclarecimento de forma simpática

Data atual para referência: 26 de maio de 2025 (segunda-feira)`
        }
      ]);
    }

    const history = conversations.get(senderId);
    
    // Limita o histórico
    if (history.length > 10) {
      const systemMessage = history[0];
      const recentMessages = history.slice(-9); // Pega as últimas 9 mensagens de usuário/assistente
      history.length = 0;
      history.push(systemMessage, ...recentMessages);
    }

    // Adiciona a mensagem ao histórico
    history.push({ role: 'user', content: messageText });          // Verifica se deve resetar a conversa por inatividade
    if (shouldResetConversation(senderId)) {
      console.log(`[Conversa] Resetando conversa para ${senderId} devido ao tempo de inatividade`);
      resetConversation(senderId);
    }
    
    // Analisa a intenção do usuário
    const userIntent = analyzeUserIntent(messageText);
    console.log(`[Intenção] Detectada: ${userIntent.mainIntent || 'indeterminada'} (confiança: ${userIntent.confidence})`);
    
    // Handle LIST intent directly with high confidence
    if (userIntent.mainIntent === INTENTIONS.LIST && userIntent.confidence >= 0.9) {
      console.log(`[Agendamento] Detectado pedido direto de listagem com alta confiança para ${senderId}`);
      try {
        // Adiciona histórico para contexto
        history.push({
          role: 'system',
          content: 'Usuário solicitou listagem de seus agendamentos.'
        });
        
        const now = new Date();
        const timeMin = now.toISOString();
        const timeMaxDate = new Date();
        timeMaxDate.setDate(now.getDate() + 90);
        const timeMax = timeMaxDate.toISOString();

        console.log(`[Agendamento] Listando agendamentos para ${senderId} de ${timeMin} até ${timeMax}`);
        const userEvents = await listEventsByUserId(senderId, timeMin, timeMax);

        if (userEvents && userEvents.length > 0) {
          let responseMessage = "🗓️ Seus próximos agendamentos são:\n";
          userEvents.forEach(event => {
            const eventStartDate = new Date(event.start.dateTime || event.start.date);
            const formattedDate = eventStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = eventStartDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
            responseMessage += `- ${formattedDate} às ${formattedTime}: ${event.summary}\n`;
          });
          
          // Simular tempo de digitação humano
          const typingTime = calculateTypingTime(responseMessage);
          await startTyping(senderId);
          await new Promise(resolve => setTimeout(resolve, typingTime));
          await sendMessage(senderId, responseMessage);
          await stopTyping(senderId);
          
          // Adicionar resposta ao histórico
          history.push({
            role: 'assistant',
            content: responseMessage
          });
          
          return; // Interrompe o processamento para não enviar para o modelo OpenAI
        } else {
          // Se não encontrar eventos, responde diretamente
          const noEventsMessage = "📅 Não encontrei nenhum agendamento futuro para você. Gostaria de marcar um novo horário?";
          
          const typingTime = calculateTypingTime(noEventsMessage);
          await startTyping(senderId);
          await new Promise(resolve => setTimeout(resolve, typingTime));
          await sendMessage(senderId, noEventsMessage);
          await stopTyping(senderId);
          
          // Adicionar resposta ao histórico
          history.push({
            role: 'assistant',
            content: noEventsMessage
          });
          
          return; // Interrompe o processamento para não enviar para o modelo OpenAI
        }
      } catch (error) {
        console.error(`[Agendamento] Erro ao listar eventos diretamente para ${senderId}:`, error);
        // Continua fluxo normal em caso de erro
      }
    }
    
    // Verifica se há confirmação de lembrete pendente
    if (hasPendingConfirmation(senderId)) {
      console.log(`[Reminder] Usuário ${senderId} tem confirmação pendente`);
      
      // Se for uma confirmação clara, processa
      if ((userIntent.mainIntent === INTENTIONS.CONFIRMATION || userIntent.mainIntent === INTENTIONS.REJECTION) 
          && userIntent.confidence >= 0.8) {
        const processed = await checkAndProcessReminderConfirmation(senderId, messageText, userIntent);
        if (processed) {
          return; // Confirmação de lembrete processada
        }
      }
      
      // Se não for confirmação, mas é uma mensagem relacionada a agendamento,
      // processa normalmente mas adiciona contexto sobre o lembrete pendente
      if (userIntent.mainIntent === INTENTIONS.SCHEDULE || 
          userIntent.mainIntent === INTENTIONS.RESCHEDULE || 
          userIntent.mainIntent === INTENTIONS.CANCEL) {
        history.push({
          role: 'system',
          content: 'Nota: Este usuário tem um lembrete de agendamento pendente de confirmação. Seja natural na conversa mas pode mencionar isso se for relevante.'
        });
      }
    }
    
    // Verifica contexto de data antes de gerar resposta
    let userDateIntent = null;
    try {
      userDateIntent = extractDateFromMessage(messageText);
      console.log(`[Data] Análise de data para mensagem: "${messageText.substring(0, 50)}..." => `, userDateIntent);
    } catch (error) {
      console.error(`[Data] Erro ao analisar data da mensagem: ${error.message}`);
      // Continue processing even if date extraction fails
    }
    
    // Processa o estado da conversa
    const currentConversationState = getConversationState(senderId);
    
    // Atualiza o contexto com informações de data, se disponíveis
    if (userDateIntent && userDateIntent.date && userDateIntent.reference) {
      console.log(`[Contexto] Usuário mencionou data: ${userDateIntent.date} (${userDateIntent.reference})`);
      
      // Atualizar o contexto da conversa
      updateConversationState(senderId, currentConversationState.currentState, {
        mentionedDate: userDateIntent.date,
        dateReference: userDateIntent.reference
      });
      
      // Não modificamos a mensagem original, apenas adicionamos contexto para o assistant
      history.push({ 
        role: 'system', 
        content: `Nota: O usuário acabou de mencionar ${userDateIntent.reference} (${userDateIntent.date}). Use esta data para entender o contexto da conversa.`
      });
    }
    
    // Avaliar transição de estado com base na intenção
    const stateTransition = processStateTransition(senderId, userIntent, messageText);
    
    // Atualizar o estado se necessário
    if (stateTransition.suggestedNextState !== currentConversationState.currentState) {
      updateConversationState(senderId, stateTransition.suggestedNextState);
      
      // Informar a IA sobre mudança de estado (para contexto)
      history.push({
        role: 'system',
        content: `Estado da conversa atualizado para: ${stateTransition.suggestedNextState}`
      });
    }
    
    // Adicionar contexto de intenção para a IA
    if (userIntent.mainIntent) {
      history.push({
        role: 'system',
        content: `Intenção do usuário identificada: ${userIntent.mainIntent}`
      });
    }
    
    // Gera resposta usando OpenAI com timeout
    console.log(`[OpenAI] Solicitando resposta para ${senderId}...`);
    const aiResponsePromise = generateResponse(messageText, history);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout na geração de resposta')), 30000) // 30 segundos timeout
    );
    
    const aiResponse = await Promise.race([aiResponsePromise, timeoutPromise]);
    console.log(`[OpenAI] Resposta recebida para ${senderId}: ${aiResponse.substring(0, 100)}...`);
    
    history.push({ role: 'assistant', content: aiResponse });

    // Verifica se a IA solicitou uma ação de agendamento
    if (aiResponse.includes('<AGENDAMENTO_SOLICITADO>')) {
      console.log(`[Agendamento] IA detectou solicitação de agendamento: ${aiResponse}`);
      
      const dateRegex = /(\d{4}-\d{2}-\d{2})/;
      const timeRegex = /(\d{2}:\d{2})/;
      
      let extractedDate = null;
      let extractedTime = null;

      // Análise contextual do texto original para extrair a data que o usuário mencionou
      const userDateIntent = extractDateFromMessage(messageText);
      
      // Tenta extrair data e hora de formatos mais genéricos primeiro
      const genericDateTimeRegex = /(\d{4}-\d{2}-\d{2})\s*(?:às|as|@)?\s*(\d{2}:\d{2})/;
      const genericMatch = aiResponse.match(genericDateTimeRegex);
      if (genericMatch) {
        extractedDate = genericMatch[1];
        extractedTime = genericMatch[2];
      } else {
        // Tenta extrair de "Data: YYYY-MM-DD Hora: HH:MM"
        const specificDateMatch = aiResponse.match(/Data:\s*(\d{4}-\d{2}-\d{2})/);
        if (specificDateMatch && specificDateMatch[1]) {
          extractedDate = specificDateMatch[1];
        }
        const specificTimeMatch = aiResponse.match(/Hora:\s*(\d{2}:\d{2})/);
        if (specificTimeMatch && specificTimeMatch[1]) {
          extractedTime = specificTimeMatch[1];
        }
      }
      
      // Se o usuário especificou claramente uma data e a IA extraiu outra, usamos a data do usuário
      if (userDateIntent.date && extractedDate && userDateIntent.date !== extractedDate) {
        console.log(`[Agendamento] Substituindo data detectada pela IA (${extractedDate}) pela data mencionada pelo usuário (${userDateIntent.date})`);
        extractedDate = userDateIntent.date;
        console.log(`[Agendamento] Data referenciada pelo usuário como: ${userDateIntent.reference || 'data específica'}`);
      } else if (userDateIntent.date && !extractedDate) {
        console.log(`[Agendamento] IA não detectou data, mas o usuário mencionou (${userDateIntent.date})`);
        extractedDate = userDateIntent.date;
      }
      
      if (extractedDate && extractedTime) {
        const startDateTime = `${extractedDate}T${extractedTime}:00-03:00`; // Assumindo GMT-3 (Brasília)
        const startDateObj = new Date(startDateTime);
        const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000); // Adiciona 1 hora
        const endDateTime = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}T${String(endDateObj.getHours()).padStart(2, '0')}:${String(endDateObj.getMinutes()).padStart(2, '0')}:00-03:00`;

        try {
          // Verificar eventos existentes para este usuário no dia solicitado
          const dayStart = `${extractedDate}T00:00:00-03:00`;
          const dayEnd = `${extractedDate}T23:59:59-03:00`;
          
          console.log(`[Agendamento] Verificando eventos existentes para ${senderId} em ${extractedDate}`);
          const existingEvents = await listEventsByUserId(senderId, dayStart, dayEnd);

          if (existingEvents && existingEvents.length > 0) {
            const humanReadableDate = formatDateHumanReadable(extractedDate);
            let conflictMessage = `⚠️ Vi aqui que você já tem compromisso(s) marcado(s) para ${humanReadableDate}:\n`;
            existingEvents.forEach(event => {
              const eventStartTime = new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
              conflictMessage += `- ${event.summary} às ${eventStartTime}\n`;
            });
            conflictMessage += `\nQuer adicionar mais este horário às ${extractedTime} mesmo assim, ou prefere reagendar algum dos existentes? Se quiser reagendar, pode me dizer algo como "quero mudar meu horário das [hora existente] para ${extractedTime}".`;
            
            await sendMessage(senderId, conflictMessage);
            // Não prossegue com a criação automática para evitar duplicidade sem confirmação explícita.
            // A IA foi instruída a não lidar com conflitos diretamente.
            clearResponseState(senderId); // Limpa para permitir nova interação do usuário
            return;
          }

          // Se não há conflitos, prepara para confirmação
          const eventDetails = {
            summary: 'Ensaio Fotográfico (Agendado pelo Bot)',
            description: `Agendamento solicitado por ${senderId} (${originalMessage.sender ? originalMessage.sender.pushname : 'Nome não disponível'}). Detalhes fornecidos: ${messageText}`,
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            timeZone: 'America/Sao_Paulo',
            userId: senderId,
            extractedDate: extractedDate, // Guardar para a mensagem de confirmação
            extractedTime: extractedTime  // Guardar para a mensagem de confirmação
          };

          const humanReadableDate = formatDateHumanReadable(extractedDate);
          
          // Importa o simulador de comportamento humano
          const { simulateTypingError } = require('../utils/humanBehaviorSimulator');
          
          // Personaliza a confirmação caso tenha usado a data mencionada pelo usuário
          let confirmationMessage;
          const confirmationTemplates = [
            `Perfeito! Posso agendar seu ensaio fotográfico para ${humanReadableDate} às ${extractedTime}. Funciona para você?`,
            `Ótimo! Tenho um horário disponível ${humanReadableDate} às ${extractedTime}. Gostaria de confirmar?`,
            `${humanReadableDate} às ${extractedTime} seria um excelente horário para seu ensaio! Confirma?`,
            `Que bom! Consigo encaixar você ${humanReadableDate} às ${extractedTime}. Esse horário é bom para você?`,
            `Excelente escolha! Posso reservar ${humanReadableDate} às ${extractedTime} para seu ensaio. Fechamos assim?`
          ];
          
          if (userDateIntent.date && userDateIntent.date === extractedDate && userDateIntent.reference) {
            // Se o usuário mencionou uma data específica, personaliza ainda mais
            const referenceTemplates = [
              `Perfeito! Para ${userDateIntent.reference}, posso agendar seu ensaio fotográfico para ${humanReadableDate} às ${extractedTime}. Isso funciona para você?`,
              `Ótimo! Tenho um horário exatamente para ${userDateIntent.reference} às ${extractedTime}. Devo reservar para você?`,
              `${userDateIntent.reference} às ${extractedTime} seria perfeito para seu ensaio! Confirma?`
            ];
            
            confirmationMessage = referenceTemplates[Math.floor(Math.random() * referenceTemplates.length)];
          } else {
            confirmationMessage = confirmationTemplates[Math.floor(Math.random() * confirmationTemplates.length)];
          }
          
          // Ocasionalmente simula um erro de digitação para parecer mais humano (5% de chance)
          const errorSimulation = simulateTypingError(confirmationMessage);
          if (errorSimulation.hasError) {
            // Primeiro envia a mensagem com erro
            await sendMessage(senderId, errorSimulation.errorMessage);
            
            // Em seguida envia a correção
            await sendMessage(senderId, "*" + errorSimulation.correctedMessage + "");
            
            // Define a mensagem corrigida como a confirmação final
            confirmationMessage = errorSimulation.correctedMessage;
          }
          
          const newResponseState = {
            isWaitingForConfirmation: true, // Flag geral de espera
            confirmationType: 'schedule_create', // Tipo específico de confirmação
            eventDetails: eventDetails, // Detalhes para usar após confirmação
            fullResponse: confirmationMessage, // A pergunta de confirmação é a "resposta" atual
            sentParts: [confirmationMessage], // Já consideramos enviada
            remainingParts: [],
            currentPartIndex: 1,
            isPaused: false,
            lastInteraction: Date.now()
          };
          setResponseState(senderId, newResponseState);
          await sendMessage(senderId, confirmationMessage);
          // Não limpa o responseState aqui, aguarda a resposta do usuário
          return;

        } catch (error) {
          console.error('[Agendamento] Erro durante o processo de agendamento:', error);
          const humanReadableDate = formatDateHumanReadable(extractedDate);
          await sendMessage(senderId, `Ops! Tive um probleminha técnico ao tentar agendar para ${humanReadableDate} às ${extractedTime}. 😅 Pode tentar de novo com um outro horário? Ou se preferir, me diga "quero falar com uma pessoa" para ajuda personalizada.`);
        }
      } else {
        console.log(`[Agendamento] Tag <AGENDAMENTO_SOLICITADO> encontrada, mas não foi possível extrair data e hora da resposta: ${aiResponse}`);
        const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_SOLICITADO>/gi, '').trim();
        // Envia a resposta da IA sem a tag para evitar loop, se houver conteúdo.
        if (cleanedAiResponse) {
            const parts = splitMessage(cleanedAiResponse);
            if (parts.length > 0) {
                const newResponseState = {
                    fullResponse: cleanedAiResponse,
                    sentParts: [],
                    remainingParts: [...parts],
                    currentPartIndex: 0,
                    isPaused: false,
                    lastInteraction: Date.now(),
                    isWaitingForConfirmation: false,
                    confirmationType: null,
                    eventDetails: null
                };
                setResponseState(senderId, newResponseState);
                await sendNextMessagePart(senderId);
            }
        } else {
            // Se a resposta era SÓ a tag e não extraiu, envia uma mensagem mais natural.
            await sendMessage(senderId, "Quero te ajudar com esse agendamento, mas não consegui entender exatamente qual data e horário você prefere. Pode me dizer novamente quando gostaria de agendar seu ensaio? Por exemplo, 'quero marcar para dia 27 às 15h'.");
            clearResponseState(senderId);
        }
        return;
      }
    } else if (aiResponse.includes('<AGENDAMENTO_MODIFICAR>')) {
      console.log(`[Agendamento] IA detectou solicitação de MODIFICAÇÃO de agendamento: ${aiResponse}`);
      const modifyRegex = /<AGENDAMENTO_MODIFICAR>\s*Antigo:\s*(\d{4}-\d{2}-\d{2})\s*(?:às|as|@)?\s*(\d{2}:\d{2})\s*Novo:\s*(\d{4}-\d{2}-\d{2})\s*(?:às|as|@)?\s*(\d{2}:\d{2})/;
      const modifyMatch = aiResponse.match(modifyRegex);
      
      // Análise contextual do texto original para extrair a data que o usuário mencionou
      const userDateIntent = extractDateFromMessage(messageText);

      if (modifyMatch) {
        let [, oldDate, oldTime, newDate, newTime] = modifyMatch;
        
        // Se o usuário especificou claramente uma data no contexto, considere usar essa data para o novo agendamento
        if (userDateIntent.date) {
          console.log(`[Agendamento] Usuário mencionou especificamente a data: ${userDateIntent.date}. Comparando com datas extraídas pela IA: Antiga=${oldDate}, Nova=${newDate}`);
          
          // Se a nova data é diferente da mencionada pelo usuário, usamos a data do usuário
          if (userDateIntent.date !== newDate) {
            console.log(`[Agendamento] Substituindo nova data detectada pela IA (${newDate}) pela data mencionada pelo usuário (${userDateIntent.date})`);
            newDate = userDateIntent.date;
          }
        }
        
        console.log(`[Agendamento] Solicitação para modificar agendamento para ${senderId}: de ${oldDate} ${oldTime} para ${newDate} ${newTime}`);
        await sendMessage(senderId, `Ok, você quer remarcar de ${oldDate} às ${oldTime} para ${newDate} às ${newTime}. Vou verificar a disponibilidade um momento... ⏳`);

        try {
          const oldSearchDateStart = `${oldDate}T00:00:00-03:00`;
          const oldSearchDateEnd = `${oldDate}T23:59:59-03:00`;
          const userEventsOnOldDate = await listEventsByUserId(senderId, oldSearchDateStart, oldSearchDateEnd);

          let eventToModify = null;
          if (userEventsOnOldDate && userEventsOnOldDate.length > 0) {
            const oldTargetDateTime = new Date(`${oldDate}T${oldTime}:00-03:00`);
            eventToModify = userEventsOnOldDate.find(event => {
              const eventStartDateTime = new Date(event.start.dateTime);
              return eventStartDateTime.getTime() === oldTargetDateTime.getTime();
            });
          }

          if (!eventToModify) {
            await sendMessage(senderId, `Hmm, não estou conseguindo encontrar seu agendamento de ${formatDateHumanReadable(oldDate)} às ${oldTime}. Você pode conferir a data e horário novamente? Se preferir, me peça para "listar meus agendamentos" e te mostrarei tudo que está marcado.`);
            clearResponseState(senderId);
            return;
          }

          const newStartDateTime = `${newDate}T${newTime}:00-03:00`;
          const newStartDateObj = new Date(newStartDateTime);
          const originalDuration = new Date(eventToModify.end.dateTime).getTime() - new Date(eventToModify.start.dateTime).getTime();
          const newEndDateObj = new Date(newStartDateObj.getTime() + originalDuration);
          const newEndDateTime = `${newEndDateObj.getFullYear()}-${String(newEndDateObj.getMonth() + 1).padStart(2, '0')}-${String(newEndDateObj.getDate()).padStart(2, '0')}T${String(newEndDateObj.getHours()).padStart(2, '0')}:${String(newEndDateObj.getMinutes()).padStart(2, '0')}:00-03:00`;

          // Verificar conflito no NOVO horário
          // Idealmente, verificaríamos a disponibilidade geral do calendário, não apenas os eventos do usuário.
          // Por agora, a lógica de conflito existente para o usuário será adaptada.
          const newDayStart = `${newDate}T00:00:00-03:00`;
          const newDayEnd = `${newDate}T23:59:59-03:00`;
          
          // Lista todos os eventos no novo dia para checar disponibilidade geral (simulado, pois listEventsByUserId é por user)
          // Para uma checagem real de disponibilidade geral, precisaríamos de uma função listAllEventsInRange(timeMin, timeMax)
          // ou assumir que o AI já filtrou por horários potencialmente vagos.
          // Vamos focar no conflito do próprio usuário por enquanto, como já estava.
          const existingEventsOnNewDate = await listEventsByUserId(senderId, newDayStart, newDayEnd);
          
          const conflictingEvent = existingEventsOnNewDate.find(event => {
              if (event.id === eventToModify.id) return false;
              const eventStart = new Date(event.start.dateTime).getTime();
              const eventEnd = new Date(event.end.dateTime).getTime();
              const newEventStart = newStartDateObj.getTime();
              const newEventEnd = newEndDateObj.getTime();
              return (newEventStart < eventEnd && newEventEnd > eventStart);
          });

          if (conflictingEvent) {
              const conflictingStartTime = new Date(conflictingEvent.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              // Sugerir horário alternativo (simplificado: 1h depois, se não, 1h antes)
              // Esta parte precisaria de lógica mais robusta para encontrar horários realmente livres.
              const suggestedNewTimeLater = new Date(newStartDateObj.getTime() + 60 * 60 * 1000);
              const suggestedNewTimeEarlier = new Date(newStartDateObj.getTime() - 60 * 60 * 1000);
              // (Aqui precisaria verificar a disponibilidade desses horários sugeridos)

              await sendMessage(senderId, `⚠️ Opa! Parece que você já tem um compromisso (${conflictingEvent.summary} às ${conflictingStartTime}) nesse horário de ${newDate} às ${newTime}. Mas temos alternativas! O que acha de remarcar para ${String(suggestedNewTimeLater.getHours()).padStart(2, '0')}:${String(suggestedNewTimeLater.getMinutes()).padStart(2, '0')} ou talvez ${String(suggestedNewTimeEarlier.getHours()).padStart(2, '0')}:${String(suggestedNewTimeEarlier.getMinutes()).padStart(2, '0')} no mesmo dia? Ou me diga outro horário que funcione melhor para você.`);
              clearResponseState(senderId);
              return;
          }
          
          // Se disponível, pedir confirmação
          const modificationDetails = {
            eventId: eventToModify.id,
            updatedEventData: {
              start: { dateTime: newStartDateTime, timeZone: 'America/Sao_Paulo' },
              end: { dateTime: newEndDateTime, timeZone: 'America/Sao_Paulo' },
            },
            oldDate: oldDate,
            oldTime: oldTime,
            newDate: newDate,
            newTime: newTime
          };
          
          const humanReadableOldDate = formatDateHumanReadable(oldDate);
          const humanReadableNewDate = formatDateHumanReadable(newDate);
          const confirmationMessage = `Perfeito! Então vamos mudar seu ensaio de ${humanReadableOldDate} às ${oldTime} para ${humanReadableNewDate} às ${newTime}. Confirma essa alteração?`;

          const newResponseState = {
            isWaitingForConfirmation: true,
            confirmationType: 'schedule_modify',
            eventDetails: modificationDetails, // Usando eventDetails para armazenar os dados da modificação
            fullResponse: confirmationMessage,
            sentParts: [confirmationMessage],
            remainingParts: [],
            currentPartIndex: 1,
            isPaused: false,
            lastInteraction: Date.now()
          };
          setResponseState(senderId, newResponseState);
          await sendMessage(senderId, confirmationMessage);
          return;

        } catch (error) {
          console.error(`[Agendamento] Erro ao processar modificação para ${senderId}:`, error);
          await sendMessage(senderId, `😥 Desculpe, ocorreu um erro ao tentar verificar a disponibilidade para sua remarcação. Por favor, tente novamente.`);
          clearResponseState(senderId);
        }
      } else {
        await sendMessage(senderId, "Desculpe, não consegui entender completamente qual agendamento você deseja alterar. Poderia me dizer de uma forma mais clara? Por exemplo: 'quero mudar meu horário do dia 26 às 14h para o dia 27 às 15h'. Assim posso te ajudar melhor!");
        clearResponseState(senderId);
      }
      return;

    } else if (aiResponse.includes('<AGENDAMENTO_CANCELAR>')) {
      console.log(`[Agendamento] IA detectou solicitação de CANCELAMENTO de agendamento: ${aiResponse}`);
      const cancelRegex = /<AGENDAMENTO_CANCELAR>\s*(\d{4}-\d{2}-\d{2})\s*(?:às|as|@)?\s*(\d{2}:\d{2})/;
      const cancelMatch = aiResponse.match(cancelRegex);

      // Análise contextual do texto original para extrair a data (caso a IA tenha interpretado incorretamente)
      const userDateIntent = extractDateFromMessage(messageText);
      
      if (cancelMatch) {
        let cancelDate = cancelMatch[1];
        const cancelTime = cancelMatch[2];
        
        // Se o usuário especificou claramente uma data e a IA extraiu outra, usamos a data do usuário
        if (userDateIntent.date && userDateIntent.day) {
          cancelDate = userDateIntent.date;
          console.log(`[Agendamento] Substituindo data detectada pela IA (${cancelMatch[1]}) pela data mencionada pelo usuário (${cancelDate})`);
        }
        
        console.log(`[Agendamento] Solicitação para cancelar agendamento para ${senderId}: ${cancelDate} às ${cancelTime}`);

        try {
          const searchDateStart = `${cancelDate}T00:00:00-03:00`;
          const searchDateEnd = `${cancelDate}T23:59:59-03:00`;
          const userEventsOnDate = await listEventsByUserId(senderId, searchDateStart, searchDateEnd);

          let eventToCancel = null;
          if (userEventsOnDate && userEventsOnDate.length > 0) {
            const targetDateTime = new Date(`${cancelDate}T${cancelTime}:00-03:00`);
            eventToCancel = userEventsOnDate.find(event => {
              const eventStartDateTime = new Date(event.start.dateTime);
              return eventStartDateTime.getTime() === targetDateTime.getTime();
            });
          }

          if (!eventToCancel) {
            const humanReadableNotFoundDate = formatDateHumanReadable(cancelDate);
            await sendMessage(senderId, `Estranho, não encontrei nenhum agendamento seu para ${humanReadableNotFoundDate} às ${cancelTime}. Pode verificar se a data e horário estão corretos? Posso listar todos os seus agendamentos se me pedir "quais são meus horários" ou "listar meus agendamentos".`);
            clearResponseState(senderId);
            return;
          }

          // Pedir confirmação antes de cancelar
          const cancellationDetails = {
            eventId: eventToCancel.id,
            cancelDate: cancelDate,
            cancelTime: cancelTime,
            summary: eventToCancel.summary // Para usar na mensagem de confirmação se necessário
          };
          
          const humanReadableDate = formatDateHumanReadable(cancelDate);
          const confirmationMessage = `Entendi! Você quer cancelar seu agendamento de ${humanReadableDate} às ${cancelTime}. Posso fazer isso para você, só preciso que confirme antes.`;

          const newResponseState = {
            isWaitingForConfirmation: true,
            confirmationType: 'schedule_cancel',
            eventDetails: cancellationDetails,
            fullResponse: confirmationMessage,
            sentParts: [confirmationMessage],
            remainingParts: [],
            currentPartIndex: 1,
            isPaused: false,
            lastInteraction: Date.now()
          };
          setResponseState(senderId, newResponseState);
          await sendMessage(senderId, confirmationMessage);
          return;

        } catch (error) {
          console.error(`[Agendamento] Erro ao processar cancelamento para ${senderId}:`, error);
          await sendMessage(senderId, `😥 Desculpe, ocorreu um erro ao tentar processar seu pedido de cancelamento. Por favor, tente novamente.`);
          clearResponseState(senderId);
        }
      } else {
        await sendMessage(senderId, "Estou quase entendendo, mas não consegui identificar qual agendamento você quer cancelar. Poderia me dizer algo como 'quero cancelar meu agendamento do dia 27 às 15h'? Ou se preferir, posso listar todos os seus agendamentos ativos.");
        clearResponseState(senderId);
      }
      return;
    } else if (aiResponse.includes('<AGENDAMENTO_LISTAR>')) {
      console.log(`[Agendamento] IA detectou solicitação de LISTAGEM de agendamentos: ${aiResponse}`);
      try {
        // Extrair data específica da mensagem do usuário se houver
        const userDateIntent = extractDateFromMessage(messageText);
        
        let timeMin, timeMax;
        
        if (userDateIntent.date) {
          // Se o usuário menciona uma data específica, busca eventos daquele dia
          console.log(`[Agendamento] Usuário mencionou data específica: ${userDateIntent.date} (${userDateIntent.reference})`);
          const specificDate = new Date(userDateIntent.date);
          
          // Define o início do dia
          specificDate.setHours(0, 0, 0, 0);
          timeMin = specificDate.toISOString();
          
          // Define o fim do dia
          const endOfDay = new Date(specificDate);
          endOfDay.setHours(23, 59, 59, 999);
          timeMax = endOfDay.toISOString();
          
          console.log(`[Agendamento] Buscando eventos para ${userDateIntent.reference}: de ${timeMin} até ${timeMax}`);
        } else {
          // Caso contrário, busca eventos futuros (próximos 90 dias)
          const now = new Date();
          timeMin = now.toISOString();
          const timeMaxDate = new Date();
          timeMaxDate.setDate(now.getDate() + 90);
          timeMax = timeMaxDate.toISOString();
          console.log(`[Agendamento] Listando agendamentos futuros para ${senderId}: de ${timeMin} até ${timeMax}`);
        }

        try {
          const userEvents = await listEventsByUserId(senderId, timeMin, timeMax);
          
          if (userEvents && userEvents.length > 0) {
            let responseMessage = "🗓️ Seus agendamentos ";
            
            if (userDateIntent.date) {
              const readableDate = new Date(userDateIntent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              responseMessage += `para ${readableDate}`;
            } else {
              responseMessage += "agendados";
            }
            
            responseMessage += " são:\n";
            
            userEvents.forEach(event => {
              const eventStartDate = new Date(event.start.dateTime || event.start.date);
              const formattedDate = eventStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const formattedTime = eventStartDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
              responseMessage += `- ${formattedDate} às ${formattedTime}: ${event.summary || 'Agendamento'}\n`;
            });
            
            // Simular tempo de digitação humano
            const typingTime = calculateTypingTime(responseMessage);
            await startTyping(senderId);
            await new Promise(resolve => setTimeout(resolve, typingTime));
            await sendMessage(senderId, responseMessage);
            await stopTyping(senderId);
          } else {
            let noEventsMessage;
            
            if (userDateIntent.date) {
              const readableDate = new Date(userDateIntent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              noEventsMessage = `Não encontrei nenhum agendamento para ${readableDate}. Quer aproveitar para marcar um ensaio fotográfico? Temos horários disponíveis! 📸✨`;
            } else {
              noEventsMessage = "Parece que você não tem nenhum agendamento pendente comigo. Que tal aproveitar e marcar um ensaio agora? Temos algumas datas disponíveis! 📸✨";
            }
            
            const typingTime = calculateTypingTime(noEventsMessage);
            await startTyping(senderId);
            await new Promise(resolve => setTimeout(resolve, typingTime));
            await sendMessage(senderId, noEventsMessage);
            await stopTyping(senderId);
          }
        } catch (error) {
          console.error(`[Agendamento] Erro ao obter eventos do calendário:`, error);
          throw new Error('Erro na API do Google Calendar: ' + error.message);
        }
      } catch (error) {
        console.error(`[Agendamento] Erro ao listar eventos para ${senderId}:`, error);
        let errorMessage = "😥 Desculpe, ocorreu um erro ao buscar seus agendamentos.";
        
        if (error.message.includes('extractDateFromMessage')) {
          errorMessage = "😥 Desculpe, não consegui entender qual data você está procurando. Pode informar de outra forma?";
        } else if (error.message.includes('Google Calendar')) {
          errorMessage = "😓 Estamos com um problema técnico para acessar a agenda. Por favor, tente novamente em alguns minutos.";
        }
        
        await sendMessage(senderId, errorMessage);
      }
      clearResponseState(senderId);
      return;
    } else if (aiResponse.includes('<AGENDAMENTO_FLEXIVEL>')) {
      console.log(`[Agendamento Flexível] IA detectou consulta de disponibilidade: ${aiResponse}`);
      
      try {
        // Processa a solicitação flexível usando a nova função
        const scheduleResult = await processFlexibleScheduleRequest(aiResponse, senderId);
        
        if (scheduleResult.success) {
          // Gera mensagem com técnicas de escassez
          const scarcityMessage = generateScarcityScheduleMessage(
            scheduleResult.suggestions,
            scheduleResult.requestType,
            scheduleResult.targetDate
          );
          
          // Remove a tag da resposta original e combina com a mensagem de escassez
          const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FLEXIVEL>/gi, '').trim();
          
          let finalMessage;
          if (cleanedAiResponse) {
            finalMessage = `${cleanedAiResponse}\n\n${scarcityMessage}`;
          } else {
            finalMessage = scarcityMessage;
          }
          
          console.log(`[Agendamento Flexível] Enviando sugestões para ${senderId}: ${scheduleResult.suggestions.length} opções`);
          
          // Divide a mensagem em partes se necessário
          const parts = splitMessage(finalMessage);
          if (parts.length > 0) {
            const newResponseState = {
              fullResponse: finalMessage,
              sentParts: [],
              remainingParts: [...parts],
              currentPartIndex: 0,
              isPaused: false,
              lastInteraction: Date.now(),
              isWaitingForConfirmation: false,
              confirmationType: null,
              eventDetails: null
            };
            setResponseState(senderId, newResponseState);
            await sendNextMessagePart(senderId);
          }
        } else {
          // Em caso de erro, envia a resposta original limpa
          const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FLEXIVEL>/gi, '').trim();
          const fallbackMessage = cleanedAiResponse || 
            "😊 Gostaria de agendar um horário? Me fale qual período você prefere (manhã, tarde, ou uma data específica) e eu vou sugerir as melhores opções!";
          
          const parts = splitMessage(fallbackMessage);
          if (parts.length > 0) {
            const newResponseState = {
              fullResponse: fallbackMessage,
              sentParts: [],
              remainingParts: [...parts],
              currentPartIndex: 0,
              isPaused: false,
              lastInteraction: Date.now(),
              isWaitingForConfirmation: false,
              confirmationType: null,
              eventDetails: null
            };
            setResponseState(senderId, newResponseState);
            await sendNextMessagePart(senderId);
          }
        }
      } catch (error) {
        console.error('[Agendamento Flexível] Erro durante processamento:', error);
        
        // Em caso de erro, remove a tag e envia resposta normal
        const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FLEXIVEL>/gi, '').trim();
        const errorMessage = cleanedAiResponse || 
          "😊 Desculpe, houve um probleminha ao verificar os horários disponíveis. Que tal me falar diretamente qual data e horário você prefere?";
        
        const parts = splitMessage(errorMessage);
        if (parts.length > 0) {
          const newResponseState = {
            fullResponse: errorMessage,
            sentParts: [],
            remainingParts: [...parts],
            currentPartIndex: 0,
            isPaused: false,
            lastInteraction: Date.now(),
            isWaitingForConfirmation: false,
            confirmationType: null,
            eventDetails: null
          };
          setResponseState(senderId, newResponseState);
          await sendNextMessagePart(senderId);
        }
      }
      return;
    } else if (aiResponse.includes('<AGENDAMENTO_FOLLOWUP>')) {
      console.log(`[Agendamento Follow-up] IA detectou resposta de feedback: ${aiResponse}`);
      
      try {
        // Extrai informações do follow-up
        const followupRegex = /<AGENDAMENTO_FOLLOWUP>\s*(\d{2}:\d{2})\s*(\d{4}-\d{2}-\d{2})\s*(.*)/;
        const followupMatch = aiResponse.match(followupRegex);
        
        if (followupMatch) {
          const [, lastSuggestedTime, targetDate, userFeedback] = followupMatch;
          
          console.log(`[Follow-up] Processando feedback para tempo ${lastSuggestedTime} em ${targetDate}: ${userFeedback}`);
          
          // Processa o feedback usando a nova função
          const followupResult = await processFollowUpScheduleResponse(
            senderId, 
            userFeedback.trim(), 
            lastSuggestedTime, 
            targetDate
          );
          
          if (followupResult.success) {
            if (followupResult.hasAlternatives) {
              // Remove a tag da resposta original e combina com a nova sugestão
              const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FOLLOWUP>.*$/gi, '').trim();
              
              let finalMessage;
              if (cleanedAiResponse) {
                finalMessage = `${cleanedAiResponse}\n\n${followupResult.message}`;
              } else {
                finalMessage = followupResult.message;
              }
              
              console.log(`[Follow-up] Enviando ${followupResult.suggestions.length} alternativas para ${senderId}`);
              
              // Divide a mensagem em partes se necessário
              const parts = splitMessage(finalMessage);
              if (parts.length > 0) {
                const newResponseState = {
                  fullResponse: finalMessage,
                  sentParts: [],
                  remainingParts: [...parts],
                  currentPartIndex: 0,
                  isPaused: false,
                  lastInteraction: Date.now(),
                  isWaitingForConfirmation: false,
                  confirmationType: null,
                  eventDetails: null
                };
                setResponseState(senderId, newResponseState);
                await sendNextMessagePart(senderId);
              }
            } else {
              // Sem alternativas - envia a mensagem sem opções
              const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FOLLOWUP>.*$/gi, '').trim();
              const finalMessage = cleanedAiResponse ? 
                `${cleanedAiResponse}\n\n${followupResult.message}` : 
                followupResult.message;
              
              const parts = splitMessage(finalMessage);
              if (parts.length > 0) {
                const newResponseState = {
                  fullResponse: finalMessage,
                  sentParts: [],
                  remainingParts: [...parts],
                  currentPartIndex: 0,
                  isPaused: false,
                  lastInteraction: Date.now(),
                  isWaitingForConfirmation: false,
                  confirmationType: null,
                  eventDetails: null
                };
                setResponseState(senderId, newResponseState);
                await sendNextMessagePart(senderId);
              }
            }
          } else {
            // Em caso de erro no processamento do follow-up
            const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FOLLOWUP>.*$/gi, '').trim();
            const errorMessage = cleanedAiResponse || 
              "😅 Entendi seu feedback! Deixa eu verificar outras opções disponíveis pra você...";
            
            const parts = splitMessage(errorMessage);
            if (parts.length > 0) {
              const newResponseState = {
                fullResponse: errorMessage,
                sentParts: [],
                remainingParts: [...parts],
                currentPartIndex: 0,
                isPaused: false,
                lastInteraction: Date.now(),
                isWaitingForConfirmation: false,
                confirmationType: null,
                eventDetails: null
              };
              setResponseState(senderId, newResponseState);
              await sendNextMessagePart(senderId);
            }
          }
        } else {
          // Se não conseguiu extrair as informações do follow-up, processa como mensagem normal
          console.log(`[Follow-up] Não foi possível extrair informações da tag AGENDAMENTO_FOLLOWUP: ${aiResponse}`);
          const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FOLLOWUP>/gi, '').trim();
          const fallbackMessage = cleanedAiResponse || 
            "😊 Entendi! Deixa eu ver outras opções disponíveis pra você...";
          
          const parts = splitMessage(fallbackMessage);
          if (parts.length > 0) {
            const newResponseState = {
              fullResponse: fallbackMessage,
              sentParts: [],
              remainingParts: [...parts],
              currentPartIndex: 0,
              isPaused: false,
              lastInteraction: Date.now(),
              isWaitingForConfirmation: false,
              confirmationType: null,
              eventDetails: null
            };
            setResponseState(senderId, newResponseState);
            await sendNextMessagePart(senderId);
          }
        }
      } catch (error) {
        console.error('[Agendamento Follow-up] Erro durante processamento:', error);
        
        // Em caso de erro, remove a tag e envia resposta normal
        const cleanedAiResponse = aiResponse.replace(/<AGENDAMENTO_FOLLOWUP>.*$/gi, '').trim();
        const errorMessage = cleanedAiResponse || 
          "😊 Entendi seu feedback! Deixa eu verificar as opções disponíveis e já te dou uma resposta...";
        
        const parts = splitMessage(errorMessage);
        if (parts.length > 0) {
          const newResponseState = {
            fullResponse: errorMessage,
            sentParts: [],
            remainingParts: [...parts],
            currentPartIndex: 0,
            isPaused: false,
            lastInteraction: Date.now(),
            isWaitingForConfirmation: false,
            confirmationType: null,
            eventDetails: null
          };
          setResponseState(senderId, newResponseState);
          await sendNextMessagePart(senderId);
        }
      }
      return;
    }

    // Divide a resposta em partes menores (se não for agendamento ou se agendamento falhou na extração)
    const parts = splitMessage(aiResponse);

    if (parts.length > 0) {
      const newResponseState = {
        fullResponse: aiResponse,
        sentParts: [],
        remainingParts: [...parts],
        currentPartIndex: 0,
        isPaused: false,
        lastInteraction: Date.now(),
        isWaitingForConfirmation: false
      };
      setResponseState(senderId, newResponseState);
      await sendNextMessagePart(senderId);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`[Message] Processamento concluído para ${senderId} em ${processingTime}ms`);
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Message] Erro em handleSingleMessage para ${senderId} após ${processingTime}ms:`, error);
    
    // Diferentes mensagens de erro dependendo do tipo de erro
    let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem.';
    
    if (error.message === 'Timeout na geração de resposta') {
      errorMessage = 'Desculpe, minha resposta está demorando mais que o esperado. Pode tentar novamente? 🤔';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Parece que estou com problemas de conexão. Pode tentar novamente em alguns segundos? 📶';
    } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      errorMessage = 'Estou um pouco sobrecarregado no momento. Pode aguardar um minutinho e tentar novamente? ⏳';
    }
    
    await sendMessage(senderId, errorMessage);
    clearResponseState(senderId);
  }
}

/**
 * Envia a próxima parte de uma resposta longa, gerenciando pausas e interrupções.
 * @param {string} senderId - ID do remetente.
 */
async function sendNextMessagePart(senderId) {
  const responseState = getResponseState(senderId);

  if (!responseState || responseState.isPaused || responseState.remainingParts.length === 0) {
    if (responseState && responseState.remainingParts.length === 0 && !responseState.isWaitingForConfirmation) {
      console.log(`Resposta completa enviada para ${senderId}. Limpando estado.`);
      clearResponseState(senderId);
    }
    return;
  }

  // Verifica se houve interrupção (nova mensagem do usuário)
  // Consideramos uma interrupção se uma nova mensagem foi enfileirada OU se o timestamp da última mensagem é mais recente
  const userQueue = messageStates.messageQueues.get(senderId);
  const lastUserMessageTime = messageStates.lastMessageTime.get(senderId);
  const hasNewerMessageInQueue = userQueue && userQueue.length > 0 && userQueue[userQueue.length -1].timestamp > responseState.lastInteraction;
  const hasRecentUnprocessedMessage = lastUserMessageTime && lastUserMessageTime > responseState.lastInteraction && (!userQueue || userQueue.length === 0);


  if ((hasNewerMessageInQueue || hasRecentUnprocessedMessage) && responseState.sentParts.length > 0) { // Só pausa se já enviou algo
    console.log(`Interrupção detectada para ${senderId}. Pausando resposta.`);
    responseState.isPaused = true;
    responseState.isWaitingForConfirmation = true;
    setResponseState(senderId, responseState);
    await sendMessage(senderId, "Você enviou uma nova mensagem enquanto eu respondia. Deseja que eu continue a resposta anterior? (Responda 'sim' para continuar ou 'não' para parar).");
    return;
  }
  
  const part = responseState.remainingParts[0];
  const typingTime = calculateHumanTypingTime(part);

  try {
    await startTyping(senderId);
    await delay(typingTime);
    // await stopTyping(senderId); // Moved after sendMessage
    
    await sendMessage(senderId, part);
    await stopTyping(senderId); // Added here

    responseState.sentParts.push(part);
    responseState.remainingParts.shift(); // Remove a parte enviada
    responseState.currentPartIndex++;
    responseState.lastInteraction = Date.now();
    setResponseState(senderId, responseState);

    if (responseState.remainingParts.length > 0) {
      // Adiciona um pequeno delay entre as partes
      await delay(Math.random() * 1000 + 1500);
      sendNextMessagePart(senderId); // Chama recursivamente para a próxima parte
    } else {
      console.log(`Resposta completa enviada para ${senderId}. Limpando estado.`);
      clearResponseState(senderId);
    }
  } catch (error) {
    console.error(`Erro ao enviar parte da mensagem para ${senderId}:`, error);
    await sendMessage(senderId, "Ocorreu um erro ao tentar enviar uma parte da resposta. Por favor, tente novamente.");
    clearResponseState(senderId); // Limpa o estado para evitar loops de erro
  }
}


/**
 * Handler principal de mensagens com sistema de delay
 */
async function messageHandler(message, isAudio = false) {
  const senderId = message.from;

  try {
    // Get chat object and admin ID
    const chat = await message.getChat();
    const adminId = getBotAdminId();

    console.log(`📨 Processando mensagem de ${senderId}, Admin: ${adminId}`);
    console.log(`📝 Conteúdo: "${message.body}"`);

    // Primeiro, sempre tenta processar como comando administrativo
    if (!isAudio && await handleAdminCommand(message)) {
      console.log(`✅ [Admin] Comando administrativo processado com sucesso`);
      return;
    }

    // --- Lógica de Saudação ---
    // Analisa a intenção do usuário antes de decidir enviar saudação
    const userMessageBody = message.body ? message.body.toLowerCase().trim() : "";
    const userIntent = analyzeUserIntent(userMessageBody);
    
    // Não envia saudação automática se já detectamos uma intenção clara
    let shouldSendGreeting = false;
    
    // Só considera enviar saudação automática se:
    // 1. Não há intenção clara OU 
    // 2. A intenção é uma saudação genérica
    if (!userIntent.mainIntent || 
        (userIntent.mainIntent === INTENTIONS.GREETING && userIntent.confidence >= 0.9)) {
        
      const lastGreetingState = getUserGreetingState(senderId);
      const currentPeriodGreeting = getPeriodSpecificGreeting(); // Ex: "Bom dia"
      const todayDateString = new Date().toLocaleDateString('pt-BR');
      
      if (!lastGreetingState) {
        shouldSendGreeting = true;
      } else {
        const lastGreetingDateString = new Date(lastGreetingState.timestamp).toLocaleDateString('pt-BR');
        // Envia se for um novo dia OU se o período mudou (ex: de manhã para tarde) no mesmo dia
        if (lastGreetingDateString !== todayDateString || lastGreetingState.greetingText !== currentPeriodGreeting) {
          shouldSendGreeting = true;
        }
      }
    }

    if (false) { // Greeting logic disabled by Kilo Code as per user request
      // Decide se é uma mensagem genérica para adequar a resposta
      const genericGreetings = ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "e ai", "tudo bem", "tudo bem?"];
      const isGenericUserMessage = userMessageBody.length < 15 && genericGreetings.some(g => userMessageBody.startsWith(g));

      let greetingMessage = `${getPeriodSpecificGreeting()}! 👋`;
      if (isGenericUserMessage || userMessageBody.length === 0) { // Se for genérico ou vazio (ex: só um áudio inicial)
        greetingMessage += ` Como posso te ajudar hoje?`;
      }
      // Se a mensagem do usuário já for mais específica, a saudação será mais curta,
      // e o bot processará a mensagem do usuário em seguida.

      // Moved setUserGreetingState earlier and corrected typing indicator logic
      setUserGreetingState(senderId, {
        greetingText: getPeriodSpecificGreeting(),
        timestamp: Date.now()
      });

      // Simula tempo de digitação humanizado para a saudação
      const greetingTypingTime = calculateTypingTime(greetingMessage);
      
      try {
        await startTyping(senderId);
        await delay(greetingTypingTime);
        await sendMessage(senderId, greetingMessage); // sendMessage before stopTyping
        await stopTyping(senderId); // stopTyping after sendMessage
        
        // setUserGreetingState was already called
      } catch (error) {
        console.error(`Erro ao enviar saudação principal para ${senderId}:`, error);
        // Em caso de erro, tenta enviar a saudação novamente (pode ter falhado antes).
        // A mensagem original já foi construída.
        try {
          console.log(`Tentando enviar saudação de fallback para ${senderId} após erro inicial.`);
          await sendMessage(senderId, greetingMessage);
          console.log(`Saudação de fallback enviada com sucesso para ${senderId}.`);
        } catch (fallbackError) {
          console.error(`Erro TAMBÉM ao enviar saudação de fallback para ${senderId}:`, fallbackError);
          // Mesmo que o fallback falhe, o erro original (primeiro 'error') já foi logado.
          // Não há muito mais a fazer aqui senão garantir que este erro não quebre o fluxo superior.
        }
        // setUserGreetingState was already called, no need to call it again here.
      }
    }
    // --- Fim da Lógica de Saudação ---

    // --- Impedir resposta em grupos ---
    if (chat && chat.isGroup) {
      console.log(`Mensagem recebida do grupo "${chat.name}" (${senderId}). Bot não responderá a grupos.`);
      return; // Ignora mensagens de grupo
    }

    // --- Lógica de Intervenção Humana ---
    const interventionState = getInterventionPauseState();

    if (adminId && senderId === adminId) {
      // Mensagem do Administrador - Comandos de pausa
      // Por enquanto, qualquer mensagem do admin ativa/estende a pausa.
      // Futuramente, pode-se usar comandos específicos como "/pause", "/extendpause", "/unpause"
      
      let newPauseState = {};
      let adminMessage = "";

      if (!interventionState || !interventionState.isPaused || Date.now() >= interventionState.pausedUntil) {
        // Iniciar pausa
        newPauseState = {
          isPaused: true,
          pausedUntil: Date.now() + INTERVENTION_CONFIG.INITIAL_PAUSE_DURATION,
          pauseLevel: 1
        };
        adminMessage = `🤖 Bot pausado por intervenção. Pausa inicial de ${INTERVENTION_CONFIG.INITIAL_PAUSE_DURATION / (60 * 1000)} minutos.`;
      } else {
        // Estender pausa existente
        if (interventionState.pauseLevel === 1) {
          newPauseState = {
            isPaused: true,
            pausedUntil: Date.now() + INTERVENTION_CONFIG.EXTENSION_PAUSE_DURATION,
            pauseLevel: 2
          };
          adminMessage = `🤖 Pausa do bot estendida. Nova duração: ${INTERVENTION_CONFIG.EXTENSION_PAUSE_DURATION / (60 * 1000)} minutos.`;
        } else if (interventionState.pauseLevel === 2) {
          newPauseState = {
            isPaused: true,
            pausedUntil: Date.now() + INTERVENTION_CONFIG.MAX_PAUSE_DURATION,
            pauseLevel: 3
          };
          adminMessage = `🤖 Pausa do bot estendida para a duração máxima: ${INTERVENTION_CONFIG.MAX_PAUSE_DURATION / (60 * 1000)} minutos.`;
        } else { // pauseLevel >= 3
          adminMessage = `🤖 Bot já está na duração máxima de pausa (${(interventionState.pausedUntil - Date.now()) / (60*1000) > 0 ? ((interventionState.pausedUntil - Date.now()) / (60*1000)).toFixed(1) : 0 } min restantes).`;
          // Não altera o newPauseState, mantém o atual.
           setInterventionPauseState(interventionState); // Re-set para atualizar timestamp se necessário, ou apenas para log
        }
      }
      
      if (newPauseState.isPaused) { // Apenas atualiza se um novo estado de pausa foi definido
        setInterventionPauseState(newPauseState);
      }
      console.log(adminMessage);
      await sendMessage(adminId, adminMessage);
      return; // Mensagem do admin para intervenção não deve ser processada como query
    }

    // Verificar se o bot está em pausa global por intervenção
    if (interventionState && interventionState.isPaused && Date.now() < interventionState.pausedUntil) {
      console.log(`Bot em pausa por intervenção (até ${new Date(interventionState.pausedUntil).toLocaleTimeString()}). Mensagem de ${senderId} ignorada.`);
      // Opcional: Enviar mensagem ao usuário informando da manutenção
      // await sendMessage(senderId, "Desculpe, o assistente está temporariamente em manutenção. Por favor, tente mais tarde.");
      return; // Ignora mensagens de outros usuários durante a pausa de intervenção
    } else if (interventionState && interventionState.isPaused && Date.now() >= interventionState.pausedUntil) {
      // Pausa expirou
      console.log("Pausa de intervenção do bot expirou. Reativando...");
      clearInterventionPauseState();
      await sendMessage(adminId, "🤖 Pausa de intervenção expirou. Bot reativado.");
    }
    // --- Fim da Lógica de Intervenção Humana ---

    // Verifica se há uma resposta pausada aguardando confirmação
    const currentResponseState = getResponseState(senderId);
    if (currentResponseState && currentResponseState.isWaitingForConfirmation && !isAudio) {
      // Analisa a intenção da mensagem primeiro
      const userIntent = analyzeUserIntent(message.body);
      
      // Se for uma saudação simples, responde educadamente e mantém o estado de confirmação
      if (userIntent.mainIntent === INTENTIONS.GREETING && userIntent.confidence > 0.9) {
        const greetingResponses = [
          "Oi! 😊 Ainda estou aguardando sua confirmação sobre o que conversamos antes...",
          "Olá! 👋 Lembra que estava esperando sua resposta sobre aquele assunto?",
          "Oi! Que bom te ver de novo. Ainda preciso da sua confirmação para continuar..."
        ];
        const greetingResponse = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
        await sendMessage(senderId, greetingResponse);
        return;
      }
      
      const userConfirmation = message.body.toLowerCase().trim();
      clearUserTimer(senderId);
      const processedConfirmationMessage = getQueuedMessages(senderId); // Limpa a mensagem de confirmação da fila principal
      console.log(`[Confirmation] User ${senderId} responded: ${userConfirmation} to type: ${currentResponseState.confirmationType}`);

      // Usar o sistema de análise de intenções para detectar confirmações flexíveis
      const isPositiveConfirmation = userIntent.mainIntent === INTENTIONS.CONFIRMATION && userIntent.confidence >= 0.8;
      const isNegativeResponse = userIntent.mainIntent === INTENTIONS.REJECTION && userIntent.confidence >= 0.8;

      if (currentResponseState.confirmationType === 'schedule_create') {
        if (isPositiveConfirmation || userConfirmation === 'sim') {
          try {
            const eventDetailsToCreate = currentResponseState.eventDetails;
            if (!eventDetailsToCreate || !eventDetailsToCreate.extractedDate || !eventDetailsToCreate.extractedTime) {
                throw new Error('Detalhes do evento ausentes no estado de confirmação para criação.');
            }
            await sendMessage(senderId, `Confirmado! Vou criar seu agendamento... 🗓️`);
            const { extractedDate, extractedTime, ...cleanedEventDetails } = eventDetailsToCreate;
            const createdEvent = await createEvent(cleanedEventDetails);
            
            const humanReadableDate = formatDateHumanReadable(extractedDate);
            const successMessage = `Agendamento confirmado!🤠 Seu ensaio fotográfico foi marcado para ${humanReadableDate} às ${extractedTime}.`;
            await sendMessage(senderId, successMessage);
          } catch (error) {
            console.error('[Agendamento] Erro ao criar evento após confirmação:', error);
            await sendMessage(senderId, `😥 Desculpe, ocorreu um erro ao criar seu agendamento após a confirmação. Por favor, tente reagendar ou entre em contato.`);
          } finally {
            clearResponseState(senderId);
          }
        } else if (isNegativeResponse || userConfirmation === 'não' || userConfirmation === 'nao') {
          await sendMessage(senderId, "Ok, o agendamento não foi criado. Se precisar de algo mais, é só chamar! 👍");
          clearResponseState(senderId);
        } else {
          await sendMessage(senderId, "Não entendi sua resposta. Por favor, responda com uma confirmação positiva como 'sim', 'beleza', 'confirmo' para confirmar o agendamento ou 'não' para cancelar.");
        }
      } else if (currentResponseState.confirmationType === 'schedule_modify') {
        if (isPositiveConfirmation || userConfirmation === 'sim') {
          try {
            const modDetails = currentResponseState.eventDetails;
            if (!modDetails || !modDetails.eventId || !modDetails.updatedEventData || !modDetails.newDate || !modDetails.newTime) {
              throw new Error('Detalhes da modificação ausentes no estado de confirmação.');
            }
            await sendMessage(senderId, `Confirmado! Vou remarcar seu ensaio... 🛠️`);
            await updateEvent(modDetails.eventId, modDetails.updatedEventData);
            
            const humanReadableNewDate = formatDateHumanReadable(modDetails.newDate);
            const successMessage = `Ensaio remarcado para ${humanReadableNewDate} às ${modDetails.newTime}.`;
            await sendMessage(senderId, successMessage);
          } catch (error) {
            console.error('[Agendamento] Erro ao modificar evento após confirmação:', error);
            await sendMessage(senderId, `😥 Desculpe, ocorreu um erro ao tentar remarcar seu ensaio. Por favor, tente novamente.`);
          } finally {
            clearResponseState(senderId);
          }
        } else if (isNegativeResponse || userConfirmation === 'não' || userConfirmation === 'nao') {
          await sendMessage(senderId, "Ok, o agendamento não foi remarcado. Permanece como estava. 😉");
          clearResponseState(senderId);
        } else {
          await sendMessage(senderId, "Não entendi sua resposta. Por favor, responda com uma confirmação positiva como 'sim', 'beleza', 'confirmo' para confirmar a remarcação ou 'não' para manter o agendamento original.");
        }
      } else if (currentResponseState.confirmationType === 'schedule_cancel') {
        if (isPositiveConfirmation || userConfirmation === 'sim') {
          try {
            const cancelDetails = currentResponseState.eventDetails;
            if (!cancelDetails || !cancelDetails.eventId || !cancelDetails.cancelDate || !cancelDetails.cancelTime) {
              throw new Error('Detalhes do cancelamento ausentes no estado de confirmação.');
            }
            await sendMessage(senderId, `Confirmado! Vou cancelar seu agendamento... 🗑️`);
            await deleteEvent(cancelDetails.eventId);
            
            const humanReadableDate = formatDateHumanReadable(cancelDetails.cancelDate);
            const successMessage = `Agendamento de ${humanReadableDate} às ${cancelDetails.cancelTime} cancelado com sucesso!`;
            await sendMessage(senderId, successMessage);
          } catch (error) {
            console.error('[Agendamento] Erro ao cancelar evento após confirmação:', error);
            await sendMessage(senderId, `😥 Desculpe, ocorreu um erro ao tentar cancelar seu agendamento. Por favor, tente novamente.`);
          } finally {
            clearResponseState(senderId);
          }
        } else if (isNegativeResponse || userConfirmation === 'não' || userConfirmation === 'nao') {
          await sendMessage(senderId, "Ok, o agendamento não foi cancelado. Continua marcado! 👍");
          clearResponseState(senderId);
        } else {
          await sendMessage(senderId, "Não entendi sua resposta. Por favor, responda com uma confirmação positiva como 'sim', 'beleza', 'confirmo' para confirmar o cancelamento ou 'não' para mantê-lo.");
        }
      } else { // Lógica original para interrupção de resposta longa (confirmação de continuação)
        if (isPositiveConfirmation || userConfirmation === 'sim') {
          currentResponseState.isPaused = false;
          currentResponseState.isWaitingForConfirmation = false;
          currentResponseState.lastInteraction = Date.now();
          setResponseState(senderId, currentResponseState);
          await sendMessage(senderId, "Ok, continuando a resposta anterior...");
          sendNextMessagePart(senderId);
        } else if (isNegativeResponse || userConfirmation === 'não' || userConfirmation === 'nao') {
          await sendMessage(senderId, "Ok, descartei a resposta anterior. Pode me perguntar outra coisa se desejar.");
          clearResponseState(senderId);
        } else {
          await sendMessage(senderId, "Não entendi sua confirmação. Responda com uma confirmação positiva como 'sim', 'beleza', 'ok' para continuar ou 'não' para parar.");
          clearResponseState(senderId);
          queueMessage(senderId, message);
        }
      }
      
      // Se a mensagem foi uma confirmação (sim/não) E o estado foi limpo ou a resposta continuada,
      // configura um novo timer de delay. Se a confirmação não foi entendida e o estado não foi limpo,
      // não inicia um novo timer aqui, pois o bot está aguardando uma resposta válida para a pergunta anterior.
      if (userConfirmation === 'sim' || userConfirmation === 'não' || userConfirmation === 'nao') {
        if (!getResponseState(senderId) || (currentResponseState && !currentResponseState.isWaitingForConfirmation)) {
            const delayForNextInteraction = calculateDelay(senderId);
            const newTimer = setTimeout(async () => {
              const queuedMessages = getQueuedMessages(senderId);
              if (queuedMessages.length > 0) {
                await processMessageBatch(queuedMessages, senderId);
              }
            }, delayForNextInteraction);
            messageStates.messageTimers.set(senderId, newTimer);
        }
        return;
      }
      // Se a confirmação não foi 'sim' ou 'não' (e não era para 'schedule_create' onde mantemos o estado),
      // a mensagem original foi re-enfileirada, então o fluxo normal de enfileiramento abaixo cuidará dela.
      
      // Se a confirmação não foi entendida mas era de agendamento ou resposta longa,
      // verifica se não seria uma confirmação de lembrete
      if (!isPositiveConfirmation && !isNegativeResponse && 
          userConfirmation !== 'sim' && userConfirmation !== 'não' && userConfirmation !== 'nao') {
        
        // Verifica se a mensagem poderia ser uma confirmação de lembrete flexível
        const isReminderConfirmation = await checkAndProcessReminderConfirmation(senderId, message.body, userIntent);
        if (isReminderConfirmation) {
          return; // A confirmação do lembrete foi processada
        }
      }
    }


    // Se for mensagem de áudio, processa imediatamente (sem pausa contextual por enquanto para áudio)
    if (isAudio) {
      if (currentResponseState && currentResponseState.isPaused) {
         // Se estiver respondendo e receber um áudio, pausa e pergunta.
        currentResponseState.isPaused = true;
        currentResponseState.isWaitingForConfirmation = true;
        setResponseState(senderId, currentResponseState);
        await sendMessage(senderId, "Recebi um áudio seu enquanto eu respondia. Deseja que eu continue a resposta anterior após processar este áudio, ou paro a anterior? (Responda 'sim continuar' ou 'não parar').");
        // O áudio será processado, e a resposta da confirmação será tratada na próxima mensagem de texto.
      }
      let audioPath = null;
      try {
        audioPath = await downloadAudio(message);
        const messageText = await transcribeAudio(audioPath);
        
        if (!messageText) {
          await sendMessage(senderId, 'Não consegui entender o áudio. Pode tentar novamente ou enviar como texto?');
          return;
        }
        // Processa o áudio imediatamente
        await handleSingleMessage(messageText, senderId, message); // Isso pode iniciar uma nova resposta
      } catch (error) {
        console.error('Erro ao processar áudio:', error);
        await sendMessage(senderId, 'Ocorreu um erro ao processar o áudio. Por favor, tente novamente.');
      } finally {
        if (audioPath && fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      }
      return;
    }

    // Para mensagens de texto, implementa o sistema de delay
    queueMessage(senderId, message);
    clearUserTimer(senderId);

    // Calcula o delay apropriado
    const currentDelay = calculateDelay(senderId);

    // Define novo timer para processar mensagens
    const timer = setTimeout(async () => {
      const queuedMessages = getQueuedMessages(senderId);
      if (queuedMessages.length > 0) {
        // Antes de processar o lote, verifica se uma resposta longa foi interrompida e não confirmada
        const existingState = getResponseState(senderId);
        if (existingState && existingState.isWaitingForConfirmation) {
          console.log(`Timer de delay expirou, mas ${senderId} ainda não confirmou a continuação. Não processando novas mensagens ainda.`);
          // Re-agenda o timer para verificar novamente, ou aguarda a confirmação.
          // Por simplicidade, vamos apenas logar e não processar o lote para não sobrescrever a pergunta de confirmação.
          // O usuário precisa responder à pergunta de confirmação.
          // Se o usuário não responder, as mensagens ficarão na fila.
          // Poderíamos adicionar um timeout para a confirmação aqui.
          messageStates.messageQueues.set(senderId, queuedMessages); // Devolve as mensagens para a fila
          
                          const newTimerForConfirmation = setTimeout(async () => {
                            const stillQueuedMessages = getQueuedMessages(senderId);
                            if(getResponseState(senderId) && getResponseState(senderId).isWaitingForConfirmation){
                                console.log(`Usuário ${senderId} não respondeu à confirmação. Processando mensagens da fila.`);
                                clearResponseState(senderId); // Limpa o estado de pausa, assume que não quer continuar.
                                if (stillQueuedMessages.length > 0) {
                                   await processMessageBatch(stillQueuedMessages, senderId);
                                }
                            } else if (stillQueuedMessages.length > 0) {
                                await processMessageBatch(stillQueuedMessages, senderId);
                            }
                        }, 30000); // Timeout de 30s para confirmação
                        messageStates.messageTimers.set(senderId, newTimerForConfirmation);

        } else {
          await processMessageBatch(queuedMessages, senderId);
        }
      }
    }, currentDelay);

    messageStates.messageTimers.set(senderId, timer);

  } catch (error) {
    console.error('Erro no processamento da mensagem:', error);
    await sendMessage(message.from, 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.');
  }
}

/**
 * Manipula o evento de usuário digitando para resetar o timer de delay.
 * @param {string} senderId - ID do remetente.
 */
async function handleUserIsTyping(senderId) {
  console.log(`🔄 User ${senderId} is typing, resetting delay timer...`);
  clearUserTimer(senderId); // Limpa o timer existente

  // Calcula um novo delay (deve ser menor devido ao estado de digitação)
  const newDelay = calculateDelay(senderId);

  // Define um novo timer para processar a fila de mensagens
  const newTimer = setTimeout(async () => {
    const queuedMessages = getQueuedMessages(senderId);
    if (queuedMessages.length > 0) {
      console.log(`⏳ Processing queued messages for ${senderId} after typing event.`);
      await processMessageBatch(queuedMessages, senderId);
    }
  }, newDelay);

  messageStates.messageTimers.set(senderId, newTimer);
}

// Funções auxiliares existentes
function splitMessage(text, maxLen = 300) {
  // Primeiro, divide por parágrafos (linhas duplas)
  const paragraphs = text.split('\n\n');
  const parts = [];
  let currentPart = '';

  for (const paragraph of paragraphs) {
    // Se o parágrafo já é maior que o máximo, divide por pontuação
    if (paragraph.length > maxLen) {
      const sentences = paragraph.split(/([.!?]+\s+)/);
      let currentSentenceGroup = '';

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if ((currentSentenceGroup + sentence).length > maxLen) {
          if (currentSentenceGroup) parts.push(currentSentenceGroup.trim());
          currentSentenceGroup = sentence;
        } else {
          currentSentenceGroup += sentence;
        }
      }
      if (currentSentenceGroup) parts.push(currentSentenceGroup.trim());
    }
    // Se o parágrafo é menor que o máximo, tenta adicionar ao grupo atual
    else {
      if ((currentPart + '\n\n' + paragraph).length > maxLen) {
        parts.push(currentPart.trim());
        currentPart = paragraph;
      } else {
        currentPart = currentPart ? currentPart + '\n\n' + paragraph : paragraph;
      }
    }
  }

  if (currentPart) parts.push(currentPart.trim());
  return parts;
}

/**
 * Verifica e processa confirmações de lembretes
 */
async function checkAndProcessReminderConfirmation(senderId, messageText, userIntent) {
  try {
    // Verifica se há confirmação pendente para este usuário
    if (!hasPendingConfirmation(senderId)) {
      return false;
    }

    console.log(`[Reminder] Analisando confirmação do usuário ${senderId}: "${messageText}"`);
    
    // Usa a OpenAI para analisar a confirmação
    const aiAnalysis = await analyzeConfirmationWithAI(messageText);
    console.log(`[Reminder] Análise da OpenAI: ${aiAnalysis.mainIntent} (confiança: ${aiAnalysis.confidence}) - ${aiAnalysis.reasoning}`);
    
    // Processa confirmação positiva
    if (aiAnalysis.mainIntent === INTENTIONS.CONFIRMATION && aiAnalysis.confidence >= 0.7) {
      const processed = processReminderConfirmation(senderId, true);
      if (processed) {
        const confirmationResponses = [
          "Perfeito! Obrigado por confirmar. Estamos ansiosos para recebê-lo! 📸✨",
          "Ótimo! Confirmação recebida. Até breve! 😊",
          "Maravilha! Sua presença está confirmada. Nos vemos em breve! 🎉",
          "Excelente! Obrigado pela confirmação. Será um prazer recebê-lo! 📷"
        ];
        
        const randomResponse = confirmationResponses[Math.floor(Math.random() * confirmationResponses.length)];
        await sendMessage(senderId, randomResponse);
        return true;
      }
    } 
    // Processa confirmação negativa
    else if (aiAnalysis.mainIntent === INTENTIONS.REJECTION && aiAnalysis.confidence >= 0.7) {
      const processed = processReminderConfirmation(senderId, false);
      if (processed) {
        await sendMessage(senderId, "Entendi, obrigado por me avisar. Caso precise remarcar, é só me chamar! 😊");
        return true;
      }
    }
    // Se não for claro, pede esclarecimento
    else if (aiAnalysis.mainIntent === INTENTIONS.CONFUSION || aiAnalysis.confidence < 0.7) {
      console.log(`[Reminder] Resposta não clara, pedindo esclarecimento. Análise: ${aiAnalysis.reasoning}`);
      await sendMessage(senderId, "Não entendi se você está confirmando ou cancelando sua presença no ensaio. Pode responder com 'sim' para confirmar ou 'não' para cancelar? 😊");
      return true; // Retorna true para não processar a mensagem como conversa normal
    }

    return false;
  } catch (error) {
    console.error('[Reminder] Erro ao processar confirmação de lembrete:', error);
    
    // Em caso de erro da OpenAI, usa análise básica como fallback
    if (userIntent.mainIntent === INTENTIONS.CONFIRMATION && userIntent.confidence >= 0.8) {
      const processed = processReminderConfirmation(senderId, true);
      if (processed) {
        await sendMessage(senderId, "Perfeito! Obrigado por confirmar. Estamos ansiosos para recebê-lo! 📸✨");
        return true;
      }
    } else if (userIntent.mainIntent === INTENTIONS.REJECTION && userIntent.confidence >= 0.8) {
      const processed = processReminderConfirmation(senderId, false);
      if (processed) {
        await sendMessage(senderId, "Entendi, obrigado por me avisar. Caso precise remarcar, é só me chamar! 😊");
        return true;
      }
    }
    
    return false;
  }
}

module.exports = {
  messageHandler,
  handleUserIsTyping, // Exported new function
};
