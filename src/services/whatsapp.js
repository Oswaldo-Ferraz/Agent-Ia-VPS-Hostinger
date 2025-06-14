const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { updateTypingState } = require('../utils/helpers'); // Added import

// Instância do cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ 
    clientId: 'bot-whatsapp',
    dataPath: path.join(process.cwd(), '.wwebjs_auth')
  }),
  puppeteer: {
    headless: true, // Alterado para true para rodar sem interface gráfica
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Caminho para o Chrome
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// Diretório para salvar arquivos temporários de áudio
const TMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Variável para armazenar o ID do administrador do bot (quem conectou via QR code)
let botAdminId = null;

/**
 * Inicializa o cliente WhatsApp
 * @param {function} messageHandler - Função para tratar mensagens recebidas
 * @param {function} handleUserIsTypingCallback - Callback para quando usuário está digitando
 */
function initializeWhatsApp(messageHandler, handleUserIsTypingCallback) { // Modified signature
  // Evento para exibir o QR code
  client.on('qr', (qr) => {
    console.clear(); // Limpa o console
    console.log('\n\n=========================');
    console.log('🔍 ESCANEIE O QR CODE ABAIXO:');
    console.log('=========================\n');
    
    // Gera o QR code no terminal
    qrcode.generate(qr, { small: true });
    
    console.log('\n=========================');
    console.log('📱 Instruções:');
    console.log('1. Abra o WhatsApp no seu celular');
    console.log('2. Toque nos 3 pontos ⋮ ou em Configurações ⚙️');
    console.log('3. Selecione "WhatsApp Web"');
    console.log('4. Aponte a câmera para este QR Code');
    console.log('=========================\n');
  });

  // Evento quando a autenticação é bem-sucedida
  client.on('authenticated', (session) => {
    console.log('🔑 AUTENTICADO COM SUCESSO!');
    // Se você precisar usar a sessão, pode fazer algo com ela aqui.
    // Não é comum precisar, pois o LocalAuth cuida disso.
  });

  // Evento quando a autenticação falha
  client.on('auth_failure', async (msg) => {
    console.error('❌ FALHA NA AUTENTICAÇÃO:', msg);
    console.log('💀 Destruindo cliente após falha de autenticação...');
    try {
      await client.destroy(); // client.destroy() com LocalAuth deve limpar a sessão.
      console.log('✅ Cliente destruído e sessão limpa.');
    } catch (e) {
      console.error('⚠️ Erro ao destruir o cliente após falha de autenticação:', e);
    }
    console.log('🔄 Tentando reinicializar o cliente em 5 segundos após falha de autenticação...');
    setTimeout(() => {
      client.initialize().catch(initErr => {
        console.error('❌ FALHA CRÍTICA AO REINICIALIZAR O CLIENTE APÓS AUTH_FAILURE:', initErr);
      });
    }, 5000); // Adiciona um atraso de 5 segundos
  });

  client.on('error', (err) => {
    console.error('❌ ERRO NO CLIENTE WHATSAPP:', err);
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`⏳ TELA DE CARREGAMENTO: ${percent}% - ${message}`);
  });

  // Evento quando o cliente está pronto
  client.on('ready', async () => {
    console.log('🏁 EVENTO "READY" DISPARADO!');
    botAdminId = client.info.wid._serialized;
    console.log('\n✅ BOT CONECTADO E PRONTO!');
    console.log(`🔑 Administrador do Bot definido como: ${botAdminId}`);
    console.log('🤖 Aguardando mensagens...\n');
    
    // Enviar mensagem de diagnóstico para o admin no startup
    try {
      const welcomeMessage = `🤖 *Bot Iniciado com Sucesso!*\n\nSeu ID de administrador é: ${botAdminId}\n\nComandos úteis:\n- Digite "/menu" para acessar o menu administrativo\n- Digite "/debug" para informações de diagnóstico\n\n👨‍🔧 Sistema atualizado para melhor compatibilidade com seu número!`;
      await sendMessage(botAdminId, welcomeMessage);
      console.log('📤 Mensagem de boas-vindas enviada para o administrador');
      
      // Enviar também o menu administrativo
      const { showMainMenu } = require('../services/adminCommandService');
      await showMainMenu(botAdminId);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem de boas-vindas:', error);
    }
  });

  // Evento para reconexão
  client.on('disconnected', async (reason) => {
    console.log(`❌ Bot desconectado: ${reason}`);
    // Razões que indicam que a sessão é definitivamente inválida ou um logout ocorreu.
    // 'NAVIGATION' pode ser problemático e muitas vezes requer um reset.
    // 'UNPAIRED' significa que o dispositivo foi despareado.
    const criticalReasons = ['LOGOUT', 'NAVIGATION', 'UNPAIRED'];
    let shouldDestroyClient = criticalReasons.includes(String(reason).toUpperCase());

    // Algumas mensagens de erro também podem indicar a necessidade de resetar a sessão.
    if (typeof reason === 'string' && (reason.includes('ERROR_CODE_401') || reason.includes('Account sync'))) {
      console.log(`ℹ️ Razão de desconexão (${reason}) sugere problema de autenticação/sincronização.`);
      shouldDestroyClient = true;
    }

    if (shouldDestroyClient) {
      console.log(`💀 Desconexão crítica ou sessão inválida (${reason}). Destruindo cliente para limpar a sessão...`);
      try {
        await client.destroy(); // Isso deve chamar o logout da LocalAuth e limpar os dados da sessão.
        console.log('✅ Cliente destruído e sessão limpa.');
      } catch (e) {
        console.error('⚠️ Erro ao destruir o cliente após desconexão crítica:', e);
      }
    } else {
      console.log(`🔌 Desconexão não crítica (${reason}). Tentará reconectar preservando a sessão se possível.`);
    }

    console.log('🔄 Tentando reinicializar o cliente em 5 segundos...');
    setTimeout(() => {
      client.initialize().catch(initErr => {
        console.error(`❌ FALHA AO REINICIALIZAR O CLIENTE APÓS DESCONEXÃO (Razão: ${reason}):`, initErr);
        // Se a inicialização falhar aqui, especialmente se não destruímos o cliente,
        // a sessão pode estar corrompida. Um novo QR code será provavelmente gerado pela biblioteca.
        if (!shouldDestroyClient && initErr) {
          console.warn('⚠️ A reinicialização falhou após uma desconexão não crítica. A sessão pode estar corrompida.');
          console.log('💀 Tentando forçar a destruição do cliente e uma nova inicialização em mais 5 segundos...');
          client.destroy().catch(destroyErr => console.error('⚠️ Erro ao tentar destruir o cliente no fallback:', destroyErr))
            .finally(() => {
              setTimeout(() => {
                client.initialize().catch(finalInitErr => console.error('❌ FALHA CRÍTICA NA TENTATIVA FINAL DE INICIALIZAÇÃO:', finalInitErr));
              }, 5000);
            });
        }
      });
    }, 5000); // Atraso de 5 segundos
  });

  // Evento para lidar com mensagens recebidas
  // Adicionar mais logs de eventos para debug
  client.on('message_create', async (message) => {
    console.log(`🔵 MESSAGE_CREATE: From ${message.from}, fromMe: ${message.fromMe}, Body: "${message.body}"`);
    
    // Processar mensagens do admin, mas evitar processar mensagens do bot geradas internamente
    if (message.from === botAdminId && message.body && message.body.trim() !== '') {
      // Filtro específico: não processar se for uma mensagem automática do bot
      const isBotGeneratedMessage = message.body.includes('🤖 *Bot Iniciado com Sucesso!*') || 
                                   message.body.includes('🛠️ *Menu Administrativo*') ||
                                   message.body.includes('❌ Opção inválida') ||
                                   message.body.includes('Bot pausado por intervenção') ||
                                   message.body.includes('📅 *Sistema de Lembretes*') ||
                                   message.body.includes('✅ Sistema de lembretes') ||
                                   message.body.includes('✅ Lembrete') ||
                                   message.body.includes('❌ Sistema de lembretes') ||
                                   message.body.includes('Status atual:') ||
                                   message.body.includes('Opções:') ||
                                   message.body.includes('Responda com o número da opção') ||
                                   message.body.includes('📲 *Exportação de Contatos*') ||
                                   message.body.includes('🔄 Processando sua solicitação') ||
                                   message.body.includes('🔄 Exportando todos os contatos') ||
                                   message.body.includes('Buscando contatos') ||
                                   message.body.includes('Encontrados') ||
                                   message.body.includes('contatos individuais') ||
                                   message.body.includes('grupos') ||
                                   message.body.includes('contatos no total') ||
                                   message.body.includes('Nenhum contato encontrado') ||
                                   message.body.includes('🗂️ Arquivo CSV gerado') ||
                                   message.body.includes('📊 Exportação de contatos:') ||
                                   message.body.includes('Seu ID de administrador é:') ||
                                   message.body.includes('Comandos úteis:') ||
                                   message.body.includes('Sistema atualizado para melhor') ||
                                   message.body.startsWith('✅') ||
                                   message.body.startsWith('❌') ||
                                   message.body.startsWith('📅') ||
                                   message.body.startsWith('🛠️') ||
                                   message.body.startsWith('🤖') ||
                                   message.body.startsWith('🔄') ||
                                   message.body.startsWith('📲') ||
                                   message.body.startsWith('🗂️') ||
                                   message.body.startsWith('📊') ||
                                   // Padrões de mensagens de sistema/automáticas
                                   /^[0-9]+\. /.test(message.body) || // Menus numerados
                                   message.body.includes('Digite "/') || // Instruções de comandos
                                   message.body.includes('👨‍🔧') || // Emojis técnicos
                                   message.body.includes('Aguardando sua escolha');
      
      if (!isBotGeneratedMessage) {
        console.log(`🔧 PROCESSANDO MESSAGE_CREATE do admin: "${message.body}"`);
        // Chamar o messageHandler diretamente
        try {
          await messageHandler(message, false);
        } catch (error) {
          console.error(`❌ Erro ao processar MESSAGE_CREATE:`, error);
        }
      } else {
        console.log(`⏩ Ignorando mensagem gerada pelo bot: "${message.body.substring(0, 50)}..."`);
      }
    }
  });

  client.on('message_revoke_everyone', (message) => {
    console.log(`🔴 MESSAGE_REVOKED: ${message.from}`);
  });

  client.on('message_ack', (message, ack) => {
    console.log(`✅ MESSAGE_ACK: ${message.from}, ACK: ${ack}`);
  });

  client.on('message', async (message) => {
    // Log de todas as mensagens que chegam
    console.log(`🔔 MENSAGEM RECEBIDA - From: ${message.from}, fromMe: ${message.fromMe}, Body: "${message.body}"`);
    console.log(`🔍 DEBUG: message.from: ${message.from}, botAdminId: ${botAdminId}`);
    
    // Ignora mensagens de status
    if (message.from === 'status@broadcast') {
      console.log(`⏩ Ignorando mensagem de status@broadcast`);
      return;
    }
    
    // Registrando detalhes da mensagem (importante para depuração)
    console.log(`📩 DETALHES DA MENSAGEM:
    De: ${message.from}
    Para: ${message._data.to || 'N/A'}
    ID: ${message.id._serialized}
    Autor: ${message._data.author || 'N/A'}
    Conteúdo: "${message.body.substring(0, 30)}${message.body.length > 30 ? '...' : ''}"
    fromMe: ${message.fromMe}
    Admin ID: ${botAdminId}`);
    
    // Simplifica a verificação do administrador
    const cleanFrom = (message.from || '').replace(/[^0-9]/g, '');
    const cleanAdmin = (botAdminId || '').replace(/[^0-9]/g, '');
    const isAdminMessage = message.from === botAdminId || 
                          cleanFrom.includes(cleanAdmin) || 
                          cleanAdmin.includes(cleanFrom);
    
    console.log(`🔄 Verificação de administrador: ${isAdminMessage ? '✓' : '✗'}`);
    console.log(`📞 De: ${cleanFrom}, Admin: ${cleanAdmin}`);
    
    // Tratamento especial para mensagens do admin
    if (isAdminMessage) {
      console.log(`👤 MENSAGEM DE ADMINISTRADOR DETECTADA: "${message.body}"`);
    }
    
    // Processa mensagens que não são do bot
    const shouldProcess = !message.fromMe;
    
    console.log(`🔧 DEBUG: shouldProcess: ${shouldProcess}, fromMe: ${message.fromMe}`);
    
    if (shouldProcess) {
      console.log(`✅ Processando mensagem: "${message.body}"`);
      // Verifica se é uma mensagem de texto ou áudio
      if (message.hasMedia && message.type === 'audio' || message.type === 'ptt') {
        // Processa mensagem de áudio
        console.log(`📥 Recebido áudio de ${message.from}`);
        await messageHandler(message, true);
      } else if (message.body) {
        // Processa mensagem de texto
        await messageHandler(message, false);
      }
    } else {
      console.log(`⏩ Ignorando mensagem enviada pelo próprio bot`);
    }
  });

  // Evento para detectar quando o usuário está digitando
  client.on('chatstate', async (chatState) => {
    const senderId = chatState.id._serialized;
    // We only care about 'composing' state.
    if (chatState.type === 'composing') {
      console.log(`💬 User ${senderId} started typing.`);
      updateTypingState(senderId); // Update state in helpers
      
      // Notify messageHandler to reset/adjust its timer
      if (handleUserIsTypingCallback) {
        handleUserIsTypingCallback(senderId);
      }
    }
  });

  // Inicializar cliente
  console.log('🚀 Tentando inicializar o cliente WhatsApp (chamada client.initialize())...');
  console.log('⏳ Aguardando eventos de inicialização (QR code, authenticated, loading, ready, auth_failure, error)...');
  client.initialize().catch(err => {
    console.error('❌ FALHA CRÍTICA AO INICIALIZAR O CLIENTE:', err);
  });

  return client;
}

/**
 * Envia mensagem para um contato
 * @param {string} to - Número do destinatário
 * @param {string} text - Texto da mensagem
 */
async function sendMessage(to, text) {
  try {
    console.log(`📤 Enviando mensagem para ${to}: "${text.substring(0, 30)}..."`);
    
    // Verifica se o número está no formato correto para WhatsApp
    let targetNumber = to;
    
    // Se for o admin enviando para si mesmo e os formatos são diferentes
    // tenta formatar corretamente
    const adminId = getBotAdminId();
    if (to === adminId) {
      // Tenta extrair apenas os dígitos do número
      const cleanNumber = to.replace(/[^0-9]/g, '');
      
      // Se o número não tiver o formato internacional adiciona (para BR)
      if (!to.includes('@') && !to.includes(':')) {
        // Verifica se é um formato com ou sem código do país
        if (cleanNumber.length <= 11) { // Número sem código do país
          targetNumber = `55${cleanNumber}@c.us`;
          console.log(`🔄 Reformatando número para ${targetNumber}`);
        } else {
          targetNumber = `${cleanNumber}@c.us`;
          console.log(`🔄 Reformatando número para ${targetNumber}`);
        }
      }
    }
    
    console.log(`📢 Tentando enviar para: ${targetNumber}`);
    await client.sendMessage(targetNumber, text);
    console.log(`✅ Mensagem enviada com sucesso para ${targetNumber}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${to}:`, error);
    
    // Tenta novamente com formato alternativo em caso de falha
    if (!to.includes('@c.us') && !to.includes(':')) {
      try {
        // Limpa o número e tenta o formato padrão do WhatsApp
        const cleanNumber = to.replace(/[^0-9]/g, '');
        const whatsappFormat = `${cleanNumber}@c.us`;
        
        console.log(`🔄 Tentativa alternativa: enviando para ${whatsappFormat}`);
        await client.sendMessage(whatsappFormat, text);
        console.log(`✅ Mensagem enviada com sucesso usando formato alternativo`);
        return true;
      } catch (secondError) {
        console.error(`❌ Falha na tentativa alternativa:`, secondError);
      }
    }
    
    return false;
  }
}

/**
 * Baixa e salva um arquivo de áudio
 * @param {Object} message - Mensagem do WhatsApp
 * @returns {Promise<string>} - Caminho do arquivo salvo
 */
async function downloadAudio(message) {
  try {
    const media = await message.downloadMedia();
    const filename = `audio-${Date.now()}.ogg`;
    const filePath = path.join(TMP_DIR, filename);
    
    // Decodifica o base64 e salva como arquivo
    fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
    console.log(`📁 Áudio salvo em: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('❌ Erro ao baixar áudio:', error);
    throw error;
  }
}

/**
 * Inicia o estado de "digitando..." para um chat
 * @param {string} chatId - ID do chat
 */
async function startTyping(chatId) {
  try {
    const chat = await client.getChatById(chatId);
    await chat.sendStateTyping();
  } catch (error) {
    console.error('Erro ao iniciar digitação:', error);
  }
}

/**
 * Para o estado de "digitando..." para um chat
 * @param {string} chatId - ID do chat
 */
async function stopTyping(chatId) {
  try {
    const chat = await client.getChatById(chatId);
    await chat.clearState();
  } catch (error) {
    console.error('Erro ao parar digitação:', error);
  }
}

/**
 * Simula digitação humana
 * @param {string} text - Texto a ser "digitado"
 * @returns {number} - Tempo estimado de digitação em ms
 */
function calculateHumanTypingTime(text) {
  // Média de velocidade de digitação humana (caracteres por minuto)
  const avgTypingSpeed = 200;
  // Converte para caracteres por segundo
  const charsPerSecond = avgTypingSpeed / 60;
  // Calcula tempo base pela quantidade de caracteres
  let baseTime = (text.length / charsPerSecond) * 1000;
  
  // Adiciona variação aleatória (±20%)
  const variation = baseTime * 0.2;
  baseTime += (Math.random() * variation * 2) - variation;
  
  // Limita o tempo entre 2s e 10s
  return Math.max(2000, Math.min(10000, baseTime));
}

/**
 * Retorna o ID do administrador do bot conectado.
 * @returns {string | null} O ID do administrador ou null se não estiver definido.
 */
function getBotAdminId() {
  return botAdminId;
}

module.exports = {
  initializeWhatsApp,
  sendMessage,
  downloadAudio,
  startTyping,
  stopTyping,
  calculateHumanTypingTime,
  getBotAdminId,
  getClient: () => client, // Expõe o cliente WhatsApp para uso em outros módulos
};