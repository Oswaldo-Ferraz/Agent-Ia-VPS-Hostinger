/**
 * Serviço para exportação de contatos do WhatsApp
 */
const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./whatsapp');
const { MessageMedia } = require('whatsapp-web.js');

// Diretório para salvar arquivos temporários
const EXPORT_DIR = path.join(process.cwd(), 'exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Extrai e formata o número de telefone do contato do WhatsApp
 * @param {Object} contact - Objeto de contato do WhatsApp
 * @returns {string} - Número formatado
 */
function extractPhoneNumber(contact) {
  try {
    // Tenta usar contact.number se disponível
    if (contact.number) {
      const validNumber = validateAndFormatPhoneNumber(contact.number);
      if (validNumber) {
        return validNumber;
      }
    }
    
    // Extrai do contact.id.user ou _serialized
    let rawId = contact.id.user || contact.id._serialized || '';
    
    // Remove sufixos comuns do WhatsApp (@c.us, @g.us, etc.)
    let phoneNumber = rawId.split('@')[0];
    
    // Usa a função melhorada de validação
    return validateAndFormatPhoneNumber(phoneNumber);
    
  } catch (error) {
    console.error('❌ Erro ao extrair número do contato:', error);
    return null;
  }
}

/**
 * Valida e formata número de telefone, filtrando IDs inválidos
 * @param {string} whatsappId - ID do WhatsApp a ser validado
 * @returns {string|null} - Número formatado ou null se inválido
 */
function validateAndFormatPhoneNumber(whatsappId) {
  if (!whatsappId) return null;
  
  // Remove caracteres não numéricos
  let phoneNumber = whatsappId.replace(/\D/g, '');
  
  if (!phoneNumber) {
    return null; // Não é número válido
  }
  
  // ❌ Filtros mais rigorosos para identificar IDs inválidos
  
  // 1. IDs muito longos (mais de 15 dígitos) são geralmente IDs internos
  if (phoneNumber.length > 15) {
    return null;
  }
  
  // 2. IDs começando com padrões específicos são IDs internos do WhatsApp
  const invalidPrefixes = [
    /^100\d{10,}$/, // IDs com prefixo 100 e 10+ dígitos
    /^999\d{9,}$/,  // IDs com prefixo 999 e 9+ dígitos  
    /^1001\d{8,}$/, // IDs específicos do WhatsApp
    /^1002\d{8,}$/,
    /^120\d{10,}$/,
    /^[2-9]\d{13,}$/, // Números começando com 2-9 e com 14+ dígitos são suspeitos
    /^\d{14,}$/,    // Qualquer número com 14+ dígitos é suspeito
  ];
  
  for (const pattern of invalidPrefixes) {
    if (pattern.test(phoneNumber)) {
      return null; // ID interno, não é número de telefone
    }
  }
  
  // 3. Números muito curtos (menos de 8 dígitos) provavelmente inválidos
  if (phoneNumber.length < 8) {
    return null;
  }
  
  // ✅ Validação de números reais
  
  // Remove prefixos válidos do WhatsApp se existirem (mas com mais cuidado)
  const validPrefixesToRemove = ['1002', '1001', '120'];
  
  for (const prefix of validPrefixesToRemove) {
    if (phoneNumber.startsWith(prefix) && phoneNumber.length > prefix.length + 8) {
      const withoutPrefix = phoneNumber.substring(prefix.length);
      // Só remove se o número resultante parecer válido
      if (withoutPrefix.length >= 8 && withoutPrefix.length <= 13) {
        phoneNumber = withoutPrefix;
        break;
      }
    }
  }
  
  // Formatação final baseada em padrões conhecidos
  let formattedNumber = '';
  
  // Número brasileiro com código do país (55)
  if (phoneNumber.startsWith('55') && phoneNumber.length >= 12 && phoneNumber.length <= 13) {
    const ddd = phoneNumber.substring(2, 4);
    const number = phoneNumber.substring(4);
    
    // Valida DDD brasileiro (11-99)
    const dddNum = parseInt(ddd);
    if (dddNum >= 11 && dddNum <= 99 && (number.length === 8 || number.length === 9)) {
      formattedNumber = phoneNumber; // SEM O + para facilitar uso
    }
  }
  // Número brasileiro sem código do país (10 ou 11 dígitos)
  else if ((phoneNumber.length === 10 || phoneNumber.length === 11) && /^[1-9]/.test(phoneNumber)) {
    const ddd = phoneNumber.substring(0, 2);
    
    // Valida DDD brasileiro (11-99)
    const dddNum = parseInt(ddd);
    if (dddNum >= 11 && dddNum <= 99) {
      formattedNumber = `55${phoneNumber}`; // SEM O + para facilitar uso
    }
  }
  // Outros números internacionais válidos (8-12 dígitos apenas)
  else if (phoneNumber.length >= 8 && phoneNumber.length <= 12) {
    // Verifica se não é um padrão conhecido de ID interno
    if (!phoneNumber.startsWith('999') && !phoneNumber.startsWith('100') && !phoneNumber.startsWith('200')) {
      formattedNumber = phoneNumber; // SEM O + para facilitar uso
    }
  }
  
  return formattedNumber || null;
}

/**
 * Exporta contatos em formato CSV
 * @param {Object} client - Cliente WhatsApp
 * @param {string} userId - ID do usuário solicitante
 * @param {string} exportType - Tipo de exportação: 'all', 'noGroups', 'onlyGroups'
 * @returns {Promise<void>}
 */
async function exportContacts(client, userId, exportType) {
  try {
    await sendMessage(userId, "🔄 Processando sua solicitação. Buscando contatos...");
    
    let contactsToProcess = [];
    
    if (exportType === 'onlyGroups') {
      // Para grupos: busca todos os chats (incluindo arquivados) e extrai membros
      await sendMessage(userId, "⏳ *Iniciando exportação de contatos dos grupos...*\n\n📋 *O que será feito:*\n• Buscar todos os grupos (incluindo arquivados)\n• Extrair membros de cada grupo\n• Validar e formatar números\n• Gerar arquivo CSV\n\n⏱️ *Tempo estimado: 2 minutos*\n*Por favor, aguarde...*");
      
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);
      
      console.log(`📋 Total de grupos encontrados: ${groups.length}`);
      await sendMessage(userId, `✅ Encontrados ${groups.length} grupos.\n\n🔄 *Iniciando extração dos membros...*`);
      
      // Extrai membros de todos os grupos
      let processedGroups = 0;
      for (let group of groups) {
        try {
          console.log(`👥 Processando grupo: ${group.name}`);
          processedGroups++;
          
          // Enviar mensagem de progresso a cada 10 grupos
          if (processedGroups % 10 === 0 || processedGroups === groups.length) {
            const percentage = Math.round((processedGroups / groups.length) * 100);
            await sendMessage(userId, `🔄 Progresso: ${processedGroups}/${groups.length} grupos processados (${percentage}%)`);
          }
          
          // Busca participantes do grupo
          const participants = group.participants || [];
          
          for (let participant of participants) {
            // Busca informações completas do contato
            try {
              const contact = await client.getContactById(participant.id._serialized);
              
              // Adiciona informação do grupo ao contato
              const contactWithGroup = {
                ...contact,
                groupName: group.name,
                groupId: group.id._serialized
              };
              
              contactsToProcess.push(contactWithGroup);
            } catch (error) {
              console.error(`❌ Erro ao buscar contato ${participant.id._serialized}:`, error.message);
              
              // Cria contato básico mesmo se não conseguir buscar detalhes
              const basicContact = {
                id: participant.id,
                name: participant.id._serialized.split('@')[0], // Usa o número como nome temporário
                number: participant.id._serialized.split('@')[0],
                isGroup: false,
                groupName: group.name,
                groupId: group.id._serialized
              };
              
              contactsToProcess.push(basicContact);
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao processar grupo ${group.name}:`, error.message);
        }
      }
      
      console.log(`👥 Total de membros extraídos dos grupos: ${contactsToProcess.length}`);
      await sendMessage(userId, `👥 Extraídos ${contactsToProcess.length} membros dos grupos.`);
      
    } else {
      // Para contatos individuais ou todos: usa o método original
      const contacts = await client.getContacts();
      console.log(`📋 Total de contatos encontrados: ${contacts.length}`);
      
      // Filtra os contatos de acordo com o tipo de exportação
      switch(exportType) {
        case 'noGroups':
          contactsToProcess = contacts.filter(contact => !contact.isGroup);
          await sendMessage(userId, `✅ Encontrados ${contactsToProcess.length} contatos individuais.`);
          break;
        
        case 'all':
        default:
          contactsToProcess = contacts;
          await sendMessage(userId, `✅ Encontrados ${contactsToProcess.length} contatos no total.`);
          break;
      }
    }
    
    
    if (contactsToProcess.length === 0) {
      await sendMessage(userId, "❌ Nenhum contato encontrado com os critérios selecionados.");
      return;
    }

    // Mensagem de progresso - iniciando validação e geração do CSV
    await sendMessage(userId, `📝 *Validando e gerando arquivo CSV...*\n\n📊 *Contatos encontrados:* ${contactsToProcess.length}\n🔍 *Validando números e removendo duplicados...*`);

    // Cria o conteúdo do arquivo CSV com cabeçalhos ajustados
    const headers = exportType === 'onlyGroups' 
      ? ['Nome', 'Número', 'Tipo', 'Grupo', 'Email', 'Status', 'Sobre']
      : ['Nome', 'Número', 'Tipo', 'Email', 'Status', 'Sobre'];
    
    let csvContent = headers.join(',') + '\n';
    let csvContentInvalid = headers.join(',') + '\n';
    
    // Adiciona cada contato ao CSV
    let processedCount = 0;
    let validCount = 0;
    let invalidCount = 0;
    const processedNumbers = new Set(); // Para evitar duplicatas
    
    console.log(`📋 Processando ${contactsToProcess.length} contatos...`);
    
    contactsToProcess.forEach(contact => {
      // Remove o "~" do início do nome
      let rawName = contact.name || contact.pushname || '';
      if (rawName.startsWith('~')) {
        rawName = rawName.substring(1).trim();
      }
      const name = rawName.replace(/,/g, ' '); // Remove vírgulas que podem quebrar o CSV
      
      // Log detalhado para debug (primeiros 3 contatos)
      const showDetailedLog = processedCount < 3;
      if (showDetailedLog) {
        console.log(`\n--- CONTATO ${processedCount + 1} ---`);
        console.log(`Nome original: "${contact.name || contact.pushname}"`);
        console.log(`Nome limpo: "${name}"`);
        if (contact.groupName) {
          console.log(`Grupo: "${contact.groupName}"`);
        }
      }
      
      const number = extractPhoneNumber(contact); // Usa a nova função para extrair o número
      const type = contact.isGroup ? 'Grupo' : 'Individual';
      const groupName = contact.groupName || '';
      const email = ''; // WhatsApp Web.js não disponibiliza email
      const status = ''; // Status nem sempre está disponível
      const about = (contact.about || '').replace(/,/g, ' ').replace(/\n/g, ' '); // Limpa o texto
      
      // Log simplificado para os demais contatos
      if (!showDetailedLog && processedCount < 10) {
        const logName = name || 'Sem nome';
        const groupInfo = groupName ? ` (${groupName})` : '';
        console.log(`📱 Contato ${processedCount + 1}: "${logName}"${groupInfo} → ${number || 'INVÁLIDO'}`);
      }
      
      // Verifica se é um número válido e não duplicado
      const isValidNumber = number && number.length >= 8;
      const isDuplicate = processedNumbers.has(number);
      
      if (isValidNumber && !isDuplicate) {
        processedNumbers.add(number);
        
        const row = exportType === 'onlyGroups' 
          ? [
              `"${name}"`,
              `"${number}"`,
              `"${type}"`,
              `"${groupName}"`,
              `"${email}"`,
              `"${status}"`,
              `"${about}"`
            ]
          : [
              `"${name}"`,
              `"${number}"`,
              `"${type}"`,
              `"${email}"`,
              `"${status}"`,
              `"${about}"`
            ];
        
        csvContent += row.join(',') + '\n';
        validCount++;
      } else {
        const reason = !isValidNumber ? 'ID_INVALIDO' : 'DUPLICADO';
        
        const row = exportType === 'onlyGroups'
          ? [
              `"${name}"`,
              `"${reason}"`,
              `"${type}"`,
              `"${groupName}"`,
              `"${email}"`,
              `"${status}"`,
              `"${about}"`
            ]
          : [
              `"${name}"`,
              `"${reason}"`,
              `"${type}"`,
              `"${email}"`,
              `"${status}"`,
              `"${about}"`
            ];
        
        csvContentInvalid += row.join(',') + '\n';
        invalidCount++;
      }
      
      processedCount++;
    });
    
    console.log(`\n📊 RESUMO DO PROCESSAMENTO:`);
    console.log(`   Total processados: ${processedCount}`);
    console.log(`   Números válidos: ${validCount}`);
    console.log(`   IDs inválidos: ${invalidCount}`);
    
    // Define o nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `contatos_${exportType}_VALIDOS_${timestamp}.csv`;
    const fileNameInvalid = `contatos_${exportType}_INVALIDOS_${timestamp}.csv`;
    const filePath = path.join(EXPORT_DIR, fileName);
    const filePathInvalid = path.join(EXPORT_DIR, fileNameInvalid);
    
    // Salva o arquivo de contatos válidos
    fs.writeFileSync(filePath, csvContent, { encoding: 'utf8' });
    console.log(`✅ Arquivo de números válidos exportado: ${filePath}`);
    
    // Salva o arquivo de IDs inválidos se houver
    if (invalidCount > 0) {
      fs.writeFileSync(filePathInvalid, csvContentInvalid, { encoding: 'utf8' });
      console.log(`⚠️ Arquivo de IDs inválidos exportado: ${filePathInvalid}`);
    }
    
    // Mensagem de resultado
    let resultMessage = `✅ **EXPORTAÇÃO CONCLUÍDA**\n\n`;
    resultMessage += `📊 **Estatísticas:**\n`;
    resultMessage += `• Total processados: ${processedCount}\n`;
    resultMessage += `• 📱 Números válidos: ${validCount}\n`;
    resultMessage += `• ❌ IDs inválidos: ${invalidCount}\n\n`;
    resultMessage += `� **Arquivos gerados:**\n`;
    resultMessage += `• Números válidos para mensagens: ${fileName}\n`;
    if (invalidCount > 0) {
      resultMessage += `• IDs inválidos (não usar): ${fileNameInvalid}\n`;
    }
    resultMessage += `\n💡 **Use apenas o arquivo de números VÁLIDOS para envio de mensagens!**`;
    
    await sendMessage(userId, resultMessage);
    
    // Envia o arquivo para o usuário
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(userId, media, { 
      caption: `📊 Exportação de contatos: ${fileName}` 
    });
    
    // Apaga o arquivo após enviá-lo (opcional, caso queira manter os arquivos, remova estas linhas)
    fs.unlinkSync(filePath);
    console.log(`🗑️ Arquivo temporário removido: ${filePath}`);
    
  } catch (error) {
    console.error('❌ Erro ao exportar contatos:', error);
    await sendMessage(userId, "❌ Ocorreu um erro ao exportar os contatos. Por favor, tente novamente.");
  }
}

module.exports = {
  exportContacts
};
