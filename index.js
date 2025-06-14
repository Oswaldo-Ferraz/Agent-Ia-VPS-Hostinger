// Carrega as variáveis de ambiente
require('dotenv').config();

const { initializeWhatsApp, getBotAdminId, sendMessage } = require('./src/services/whatsapp'); // Added getBotAdminId, sendMessage
const { messageHandler, handleUserIsTyping } = require('./src/handlers/messageHandler'); // Added handleUserIsTyping
const { getInterventionPauseState, clearInterventionPauseState, INTERVENTION_CONFIG } = require('./src/utils/helpers'); // Added intervention helpers
const { listUpcomingEvents } = require('./src/services/googleCalendar'); // Import Google Calendar service

// Verifica se a chave da API foi configurada
if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️ OPENAI_API_KEY não encontrada no arquivo .env');
  console.error('Por favor, adicione sua chave de API da OpenAI ao arquivo .env');
  process.exit(1);
}

console.log('🤖 Script principal iniciado...');

// Testar a listagem de eventos do Google Calendar ANTES de inicializar o WhatsApp
(async () => {
  try {
    console.log('🗓️  Tentando listar eventos do Google Calendar (teste inicial)...');
    await listUpcomingEvents();
    console.log('✅ Teste de listagem de eventos do Google Calendar concluído.');
  } catch (error) {
    console.error('⚠️ Erro ao testar a listagem de eventos do Google Calendar (teste inicial):', error);
  } finally {
    // Prosseguir com a inicialização do WhatsApp independentemente do resultado do teste do calendário
    console.log('🤖 Inicializando Bot WhatsApp com integração OpenAI...');
    const client = initializeWhatsApp(messageHandler, handleUserIsTyping); // Added handleUserIsTyping callback
    // O restante da lógica do WhatsApp (QR code, etc.) será tratado por initializeWhatsApp
  }
})();

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
});

console.log('⏳ Aguardando QR code para conexão...');

// Verifica periodicamente a expiração da pausa de intervenção
setInterval(async () => {
  const interventionState = getInterventionPauseState();
  if (interventionState && interventionState.isPaused && Date.now() >= interventionState.pausedUntil) {
    const adminId = getBotAdminId();
    console.log("⏰ Pausa de intervenção do bot expirou. Reativando...");
    clearInterventionPauseState();
    if (adminId) {
      try {
        await sendMessage(adminId, "🤖 Pausa de intervenção expirou. Bot reativado automaticamente.");
      } catch (error) {
        console.error("Erro ao enviar mensagem de reativação para o admin:", error);
      }
    }
  }
}, INTERVENTION_CONFIG.PAUSE_CHECK_INTERVAL);