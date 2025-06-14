const { getBotAdminId, sendMessage, getClient } = require('./whatsapp');
const { getConfig, updateConfig, addCustomReminder, removeCustomReminder } = require('./reminderService');
const { exportContacts } = require('./contactExporter');

// Prefixo para comandos administrativos
const COMMAND_PREFIX = '/';

// Comandos disponíveis
const COMMANDS = {
  CONFIG: 'config',
  REMINDER: 'reminder',
  HELP: 'help',
  BACK: 'voltar',
  MAIN: 'menu'
};

// Estado do menu para cada usuário
const menuStates = new Map(); // Exportado para uso externo

/**
 * Menu principal do sistema administrativo
 */
async function showMainMenu(userId) {
  console.log(`🚀 Iniciando exibição do menu principal para ${userId}`);
  
  try {
    const menu = `🛠️ *Menu Administrativo*

1️⃣ Sistema de Lembretes
2️⃣ Agendamentos e Horários
3️⃣ Lista de Espera
4️⃣ Configurações Gerais
5️⃣ Relatórios e Status
6️⃣ Exportar Contatos

Responda com o número da opção desejada.
Digite /menu para voltar a este menu principal.
Digite /voltar para retornar ao menu anterior.`;

    console.log(`📤 Enviando menu para ${userId}`);
    const result = await sendMessage(userId, menu);
    console.log(`📨 Resultado do envio: ${result ? "Sucesso" : "Falha"}`);
    
    menuStates.set(userId, {
      currentMenu: 'main',
      previousMenu: null
    });
    
    console.log(`💾 Estado do menu atualizado para ${userId}: 'main'`);
    
  } catch (error) {
    console.error(`❌ ERRO ao exibir menu principal: ${error}`);
  }
}

/**
 * Menu do sistema de lembretes
 */
async function showReminderMenu(userId) {
  const config = getConfig();
  const menu = `📅 *Sistema de Lembretes*

Status atual:
${config.enabled ? '✅' : '❌'} Sistema de Lembretes
${config.reminders['24h'].enabled ? '✅' : '❌'} Lembrete 24h antes
${config.reminders['2h'].enabled ? '✅' : '❌'} Lembrete 2h antes
${config.requireConfirmation ? '✅' : '❌'} Confirmação antecipada

Opções:
1️⃣ Ativar/Desativar Sistema de Lembretes
2️⃣ Configurar Lembrete 24h
3️⃣ Configurar Lembrete 2h
4️⃣ Configurar Confirmação Antecipada
5️⃣ Gerenciar Lembretes Personalizados

Responda com o número da opção desejada.`;

  await sendMessage(userId, menu);
  menuStates.set(userId, {
    currentMenu: 'reminders',
    previousMenu: 'main'
  });
}

/**
 * Menu de lembretes personalizados
 */
async function showCustomRemindersMenu(userId) {
  const config = getConfig();
  const menu = `🔔 *Lembretes Personalizados*

Lembretes atuais:
${config.customReminders.map((reminder, index) => 
  `${index + 1}. ${reminder.hours}h antes - ${reminder.enabled ? '✅' : '❌'}\n   "${reminder.message}"`
).join('\n')}

Opções:
1️⃣ Adicionar Novo Lembrete
2️⃣ Remover Lembrete
3️⃣ Ativar/Desativar Lembrete

Responda com o número da opção desejada.`;

  await sendMessage(userId, menu);
  menuStates.set(userId, {
    currentMenu: 'customReminders',
    previousMenu: 'reminders'
  });
}

/**
 * Menu de exportação de contatos
 */
async function showContactExportMenu(userId) {
  const menu = `📲 *Exportação de Contatos*

Escolha o tipo de contatos que deseja exportar:

1️⃣ Todos os contatos (exceto grupos)
2️⃣ Somente contatos de grupos
3️⃣ Todos os contatos

O arquivo será gerado em formato CSV e enviado para você.

Responda com o número da opção desejada.`;

  await sendMessage(userId, menu);
  menuStates.set(userId, {
    currentMenu: 'contactExport',
    previousMenu: 'main'
  });
}

/**
 * Processa comandos administrativos
 */
async function handleAdminCommand(message) {
  const adminId = getBotAdminId();
  
  // Simplificando: verifica se a mensagem vem do número do admin (ou similar)
  const cleanFrom = message.from.replace(/[^0-9]/g, '');
  const cleanAdmin = adminId ? adminId.replace(/[^0-9]/g, '') : '';
  const isFromAdmin = message.from === adminId || 
                     cleanFrom.includes(cleanAdmin) || 
                     cleanAdmin.includes(cleanFrom);
  
  console.log(`🔐 Verificando comando admin - De: ${message.from}, Admin: ${adminId}`);
  console.log(`🔢 Números limpos - De: ${cleanFrom}, Admin: ${cleanAdmin}`);
  console.log(`📝 Conteúdo da mensagem: "${message.body}"`);
  console.log(`✅ É do admin: ${isFromAdmin}`);
  
  if (!isFromAdmin) {
    console.log(`❌ Rejeitado: Mensagem não é do administrador`);
    return false;
  }

  // Verifica se a mensagem tem conteúdo
  if (!message.body || message.body.trim() === '') {
    console.log(`⚠️ Mensagem vazia ignorada`);
    return false;
  }

  const text = message.body.trim();
  console.log(`📋 Processando texto: "${text}"`);
  
  // Verifica se há um menu ativo para este usuário
  const hasActiveMenu = menuStates.has(message.from);
  console.log(`🔍 Usuário tem menu ativo: ${hasActiveMenu ? 'Sim' : 'Não'}`);
  if (hasActiveMenu) {
    const menuState = menuStates.get(message.from);
    console.log(`🔍 Menu atual: ${menuState.currentMenu}, Menu anterior: ${menuState.previousMenu || 'nenhum'}`);
  }
  
  // Se a mensagem for "menu" ou "Menu" sem prefixo, trate como /menu
  if (text.toLowerCase() === "menu") {
    console.log(`✅ Exibindo menu principal para ${message.from} (palavra-chave 'menu')`);
    await showMainMenu(message.from);
    return true;
  }
  
  // Verifica se é uma resposta numérica para um menu ativo PRIMEIRO
  if (/^\d+$/.test(text) && menuStates.has(message.from)) {
    console.log(`✅ Detectada resposta numérica "${text}" para menu ativo - processando diretamente`);
    await handleMenuResponse(message);
    return true;
  }
  
  // Se for um comando direto com prefixo
  if (text.startsWith(COMMAND_PREFIX)) {
    const command = text.slice(1).toLowerCase();
    console.log(`🔧 Processando comando com prefixo: ${command}`);
    
    switch (command) {
      case COMMANDS.CONFIG:
      case COMMANDS.MAIN:
        await showMainMenu(message.from);
        break;
      case COMMANDS.HELP:
        await showHelp(message);
        break;
      case COMMANDS.BACK:
        await handleBackCommand(message.from);
        break;
      case 'debug':
        await showDebugInfo(message);
        break;
      default:
        await sendMessage(adminId, '❌ Comando não reconhecido. Use /menu para acessar o menu principal.');
    }
    return true;
  }
  
  // Se não é comando com prefixo e não tem menu ativo, rejeita
  if (!text.startsWith(COMMAND_PREFIX) && !menuStates.has(message.from)) {
    console.log(`❌ Rejeitado: Não é comando (${COMMAND_PREFIX}) nem usuário com menu ativo`);
    return false;
  }

  // Se chegou até aqui e tem menu ativo, processa como resposta do menu
  if (menuStates.has(message.from)) {
    console.log(`🎯 Processando como resposta do menu ativo`);
    await handleMenuResponse(message);
    return true;
  }
  
  console.log(`⚠️ Mensagem do admin não foi processada - texto: "${text}"`);
  return false;
}

/**
 * Mostra ajuda dos comandos disponíveis
 */
async function showHelp(message) {
  const help = `🤖 *Sistema Administrativo - Ajuda*

Comandos principais:
/menu - Abre o menu principal
/voltar - Retorna ao menu anterior
/help - Mostra esta mensagem de ajuda

Para navegar, use os números das opções mostradas em cada menu.
Todos os menus são interativos e guiados.

Para sair de qualquer menu, envie uma mensagem normal sem /`;

  await sendMessage(message.from, help);
}

/**
 * Processa comandos de configuração
 */
async function handleConfigCommand(message, args) {
  const config = getConfig();
  
  if (!args) {
    const status = `📋 *Configurações Atuais*

Sistema de Lembretes: ${config.enabled ? '✅' : '❌'}

Lembretes Padrão:
- 24h antes: ${config.reminders['24h'].enabled ? '✅' : '❌'}
- 2h antes: ${config.reminders['2h'].enabled ? '✅' : '❌'}

Confirmação Antecipada: ${config.requireConfirmation ? '✅' : '❌'}

Use /help para ver os comandos disponíveis.`;
    
    await sendMessage(message.from, status);
    return;
  }

  const [option, value] = args.split(' ');

  switch (option) {
    case 'lembretes':
      config.enabled = value === 'on';
      break;
    case '24h':
      config.reminders['24h'].enabled = value === 'on';
      break;
    case '2h':
      config.reminders['2h'].enabled = value === 'on';
      break;
    case 'confirmacao':
      config.requireConfirmation = value === 'on';
      break;
    default:
      await sendMessage(message.from, '❌ Opção de configuração inválida');
      return;
  }

  updateConfig(config);
  await sendMessage(message.from, '✅ Configuração atualizada com sucesso!');
}

/**
 * Processa comandos de lembrete
 */
async function handleReminderCommand(message, args) {
  if (!args) {
    await sendMessage(message.from, '❌ Argumentos necessários. Use /help para ver exemplos.');
    return;
  }

  const [action, ...rest] = args.split(' ');

  switch (action) {
    case 'add': {
      const hours = parseInt(rest[0]);
      const reminderMessage = rest.slice(1).join(' ');

      if (isNaN(hours) || !reminderMessage) {
        await sendMessage(message.from, '❌ Formato inválido. Use: /reminder add <horas> <mensagem>');
        return;
      }

      const id = addCustomReminder(hours, reminderMessage);
      await sendMessage(message.from, `✅ Lembrete personalizado adicionado com ID: ${id}`);
      break;
    }
    case 'list': {
      const config = getConfig();
      if (config.customReminders.length === 0) {
        await sendMessage(message.from, '📝 Não há lembretes personalizados configurados.');
        return;
      }

      const list = config.customReminders.map(reminder => 
        `ID: ${reminder.id}\nHoras antes: ${reminder.hours}\nMensagem: ${reminder.message}\nAtivo: ${reminder.enabled ? '✅' : '❌'}\n`
      ).join('\n');

      await sendMessage(message.from, `📋 *Lembretes Personalizados:*\n\n${list}`);
      break;
    }
    case 'remove': {
      const id = rest[0];
      if (!id) {
        await sendMessage(message.from, '❌ ID do lembrete necessário');
        return;
      }

      removeCustomReminder(id);
      await sendMessage(message.from, '✅ Lembrete removido com sucesso!');
      break;
    }
    default:
      await sendMessage(message.from, '❌ Ação inválida. Use /help para ver os comandos disponíveis.');
  }
}

/**
 * Processa respostas do menu
 * @param {Object} message - Mensagem do WhatsApp
 * @returns {Promise<boolean>} - True se a mensagem foi processada, False caso contrário
 */
async function handleMenuResponse(message) {
  console.log(`🎯 Processando resposta do menu: "${message.body}"`);
  
  const userId = message.from;
  const menuState = menuStates.get(userId);
  if (!menuState) {
    console.log(`⚠️ Nenhum estado de menu encontrado para ${userId}, exibindo menu principal`);
    await showMainMenu(userId);
    return;
  }

  console.log(`🔄 Estado atual do menu para ${userId}: ${menuState.currentMenu}, estado anterior: ${menuState.previousMenu || 'nenhum'}`);
  const response = message.body.trim();

  // Log detalhado da resposta numérica
  if (/^[0-9]+$/.test(response)) {
    console.log(`🔢 Resposta numérica detectada: ${response} para menu: ${menuState.currentMenu}`);
  }

  switch (menuState.currentMenu) {
    case 'main':
      console.log(`⏩ Encaminhando para handleMainMenuResponse com resposta: "${response}"`);
      await handleMainMenuResponse(userId, response);
      break;
    case 'reminders':
      console.log(`⏩ Encaminhando para handleReminderMenuResponse com resposta: "${response}"`);
      await handleReminderMenuResponse(userId, response);
      break;
    case 'customReminders':
      console.log(`⏩ Encaminhando para handleCustomReminderMenuResponse com resposta: "${response}"`);
      await handleCustomReminderMenuResponse(userId, response);
      break;
    case 'contactExport':
      console.log(`⏩ Encaminhando para handleContactExportMenuResponse com resposta: "${response}"`);
      await handleContactExportMenuResponse(userId, response);
      break;
    default:
      console.log(`⚠️ Menu desconhecido: ${menuState.currentMenu}, exibindo menu principal`);
      await showMainMenu(userId);
  }
}

/**
 * Processa respostas do menu principal
 */
async function handleMainMenuResponse(userId, response) {
  switch (response) {
    case '1':
      await showReminderMenu(userId);
      break;
    case '2':
      // Implementar menu de agendamentos
      await sendMessage(userId, "📅 *Sistema de Agendamentos*\n\nEsta função está em desenvolvimento.");
      break;
    case '3':
      // Implementar menu de lista de espera
      await sendMessage(userId, '🚧 Menu de lista de espera em desenvolvimento...');
      break;
    case '4':
      // Implementar menu de configurações gerais
      await sendMessage(userId, '🚧 Menu de configurações em desenvolvimento...');
      break;
    case '5':
      // Implementar menu de relatórios
      await sendMessage(userId, '🚧 Menu de relatórios em desenvolvimento...');
      break;
    case '6':
      await showContactExportMenu(userId);
      break;
    default:
      await sendMessage(userId, '❌ Opção inválida. Por favor, escolha um número de 1 a 6.');
  }
}

/**
 * Processa respostas do menu de lembretes
 */
async function handleReminderMenuResponse(userId, response) {
  const config = getConfig();

  switch (response) {
    case '1':
      config.enabled = !config.enabled;
      updateConfig(config);
      await sendMessage(userId, `✅ Sistema de lembretes ${config.enabled ? 'ativado' : 'desativado'}`);
      await showReminderMenu(userId);
      break;
    case '2':
      config.reminders['24h'].enabled = !config.reminders['24h'].enabled;
      updateConfig(config);
      await sendMessage(userId, `✅ Lembrete 24h ${config.reminders['24h'].enabled ? 'ativado' : 'desativado'}`);
      await showReminderMenu(userId);
      break;
    case '3':
      config.reminders['2h'].enabled = !config.reminders['2h'].enabled;
      updateConfig(config);
      await sendMessage(userId, `✅ Lembrete 2h ${config.reminders['2h'].enabled ? 'ativado' : 'desativado'}`);
      await showReminderMenu(userId);
      break;
    case '4':
      config.requireConfirmation = !config.requireConfirmation;
      updateConfig(config);
      await sendMessage(userId, `✅ Confirmação antecipada ${config.requireConfirmation ? 'ativada' : 'desativada'}`);
      await showReminderMenu(userId);
      break;
    case '5':
      await showCustomRemindersMenu(userId);
      break;
    default:
      await sendMessage(userId, '❌ Opção inválida. Por favor, escolha um número de 1 a 5.');
  }
}

/**
 * Processa respostas do menu de lembretes personalizados
 */
async function handleCustomReminderMenuResponse(userId, response) {
  switch (response) {
    case '1':
      menuStates.set(userId, {
        currentMenu: 'addingReminder',
        previousMenu: 'customReminders',
        step: 'hours'
      });
      await sendMessage(userId, '⏰ Digite quantas horas antes do evento o lembrete deve ser enviado:');
      break;
    case '2':
      menuStates.set(userId, {
        currentMenu: 'removingReminder',
        previousMenu: 'customReminders'
      });
      await showRemindersToRemove(userId);
      break;
    case '3':
      menuStates.set(userId, {
        currentMenu: 'toggleReminder',
        previousMenu: 'customReminders'
      });
      await showRemindersToToggle(userId);
      break;
    default:
      await sendMessage(userId, '❌ Opção inválida. Por favor, escolha um número de 1 a 3.');
  }
}

/**
 * Processa comando de voltar
 */
async function handleBackCommand(userId) {
  const menuState = menuStates.get(userId);
  if (!menuState || !menuState.previousMenu) {
    await showMainMenu(userId);
    return;
  }

  switch (menuState.previousMenu) {
    case 'main':
      await showMainMenu(userId);
      break;
    case 'reminders':
      await showReminderMenu(userId);
      break;
    case 'customReminders':
      await showCustomRemindersMenu(userId);
      break;
    default:
      await showMainMenu(userId);
  }
}

/**
 * Show reminders for removal selection
 */
async function showRemindersToRemove(userId) {
  const config = getConfig();
  if (config.customReminders.length === 0) {
    await sendMessage(userId, '📝 Não há lembretes personalizados para remover.');
    await showCustomRemindersMenu(userId);
    return;
  }

  const list = config.customReminders.map((reminder, index) => 
    `${index + 1}. ${reminder.hours}h antes - "${reminder.message}"`
  ).join('\n');

  await sendMessage(userId, `📋 *Selecione o lembrete para remover:*\n\n${list}\n\nDigite o número do lembrete que deseja remover:`);
}

/**
 * Show reminders for toggle selection
 */
async function showRemindersToToggle(userId) {
  const config = getConfig();
  if (config.customReminders.length === 0) {
    await sendMessage(userId, '📝 Não há lembretes personalizados para ativar/desativar.');
    await showCustomRemindersMenu(userId);
    return;
  }

  const list = config.customReminders.map((reminder, index) => 
    `${index + 1}. ${reminder.hours}h antes - ${reminder.enabled ? '✅' : '❌'} - "${reminder.message}"`
  ).join('\n');

  await sendMessage(userId, `📋 *Selecione o lembrete para ativar/desativar:*\n\n${list}\n\nDigite o número do lembrete:`);
}

/**
 * Mostra informações de diagnóstico para ajudar a depurar problemas
 */
async function showDebugInfo(message) {
  const adminId = getBotAdminId();
  
  // Coleta informações relevantes
  const debugInfo = `🔍 *Informações de Diagnóstico*

📱 Seu número detectado: ${message.from}
🔐 ID do Admin no sistema: ${adminId}
📲 Você está enviando como: ${message.author || "Você mesmo"}
📤 ID que está recebendo: ${message.to || "Desconhecido"}
🔄 Mensagem marcada como sua: ${message.fromMe ? "Sim" : "Não"}

*Estado do Menu:*
${menuStates.has(message.from) ? 
  `Menu atual: ${menuStates.get(message.from).currentMenu}
Menu anterior: ${menuStates.get(message.from).previousMenu || "Nenhum"}` : 
  "Você não tem um estado de menu ativo."
}

*Como corrigir problemas comuns:*
1️⃣ Envie "/debug" para ver estas informações
2️⃣ Envie "/menu" para abrir o menu administrativo
3️⃣ Reinicie o bot se os comandos não funcionarem
4️⃣ Verifique os logs para mais detalhes`;

  await sendMessage(message.from, debugInfo);
}

/**
 * Processa respostas do menu de exportação de contatos
 */
async function handleContactExportMenuResponse(userId, response) {
  const client = getClient();
  
  if (!client) {
    await sendMessage(userId, "❌ Erro: Cliente WhatsApp não está disponível.");
    await showMainMenu(userId);
    return;
  }
  
  let exportType = 'all';
  let description = '';
  
  switch(response) {
    case '1':
      exportType = 'noGroups';
      description = "todos os contatos (exceto grupos)";
      break;
    case '2':
      exportType = 'onlyGroups';
      description = "somente contatos de grupos";
      break;
    case '3':
      exportType = 'all';
      description = "todos os contatos";
      break;
    default:
      await sendMessage(userId, "❌ Opção inválida. Por favor, escolha uma opção entre 1 e 3.");
      await showContactExportMenu(userId);
      return;
  }
  
  await sendMessage(userId, `🔄 Exportando ${description}... Por favor, aguarde.`);
  
  try {
    await exportContacts(client, userId, exportType);
  } catch (error) {
    console.error('Erro ao exportar contatos:', error);
    await sendMessage(userId, "❌ Ocorreu um erro ao exportar os contatos. Por favor, tente novamente.");
    await showMainMenu(userId);
  }
}

module.exports = {
  handleAdminCommand,
  showMainMenu,
  showReminderMenu,
  showCustomRemindersMenu,
  showContactExportMenu,
  showDebugInfo,
  menuStates,
  COMMANDS,
  COMMAND_PREFIX
};