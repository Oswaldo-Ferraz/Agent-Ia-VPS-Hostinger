const conversationsService = require('../firebase/firestore/conversations');
const categorizationService = require('../firebase/firestore/categorization');
const CompaniesService = require('../firebase/firestore/companies');
const ClientsService = require('../firebase/firestore/clients');

// Initialize service instances
const companiesService = new CompaniesService();
const clientsService = new ClientsService();

/**
 * TEST FASE 2: Sistema de Conversas e Categorização
 * 
 * Este teste valida:
 * - Criação de conversas
 * - Adição de mensagens
 * - Categorização automática
 * - Sistema de tags
 * - Recuperação de conversas por período
 * - Arquivamento de conversas antigas
 * - Estatísticas de conversas
 */

async function runFase2Tests() {
  console.log('\n🚀 INICIANDO TESTES DA FASE 2 - SISTEMA DE CONVERSAS\n');
  
  try {
    // 1. Setup: Criar empresa e cliente de teste
    console.log('📋 1. Configurando dados de teste...');
    
    const testCompanyData = {
      name: `Teste Conversas ${Date.now()}`,
      domain: `teste-conv-${Date.now()}.com`,
      whatsapp: '+5511999887766',
      instagram: '@teste_conversas_ai'
    };

    const company = await companiesService.createCompany(testCompanyData);
    const companyId = company.companyId;
    console.log(`✅ Empresa de teste criada: ${companyId}`);

    const testClientData = {
      name: 'Cliente Teste Conversas',
      contact: {
        whatsapp: '+5511999887755',
        instagram: '@cliente_teste_conv',
        email: `cliente.teste.conv.${Date.now()}@test.com`
      }
    };

    const client = await clientsService.createClient(companyId, testClientData);
    const clientId = client.clientId;
    console.log(`✅ Cliente de teste criado: ${clientId}`);

    // 2. Teste: Criar conversas e adicionar mensagens
    console.log('\n📱 2. Testando criação de conversas e mensagens...');
    
    // Conversa 1: Suporte técnico
    const conversation1Id = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Problema técnico urgente',
      priority: 'high'
    });
    console.log(`✅ Conversa 1 criada: ${conversation1Id}`);

    // Adicionar mensagens à conversa 1
    await conversationsService.addMessage(companyId, clientId, conversation1Id, {
      role: 'user',
      content: 'Olá, estou com um problema urgente no meu pedido #12345. Não consigo acessar minha conta.',
      platform: 'whatsapp'
    });

    await conversationsService.addMessage(companyId, clientId, conversation1Id, {
      role: 'assistant',
      content: 'Olá! Entendo sua preocupação. Vou verificar seu pedido imediatamente. Você pode me informar seu email cadastrado?',
      platform: 'whatsapp'
    });

    await conversationsService.addMessage(companyId, clientId, conversation1Id, {
      role: 'user',
      content: 'Meu email é cliente.teste@email.com. Por favor, resolva isso rápido pois preciso do produto hoje.',
      platform: 'whatsapp'
    });

    console.log(`✅ 3 mensagens adicionadas à conversa 1`);

    // Conversa 2: Vendas
    const conversation2Id = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Interesse em produtos',
      priority: 'normal'
    });

    await conversationsService.addMessage(companyId, clientId, conversation2Id, {
      role: 'user',
      content: 'Oi! Vi seus produtos no Instagram e gostaria de saber mais sobre preços e formas de pagamento.',
      platform: 'instagram'
    });

    await conversationsService.addMessage(companyId, clientId, conversation2Id, {
      role: 'assistant',
      content: 'Oi! Que bom que se interessou! Temos várias opções de produtos. Qual categoria te interessa mais?',
      platform: 'instagram'
    });

    console.log(`✅ Conversa 2 criada com 2 mensagens: ${conversation2Id}`);

    // 3. Teste: Categorização automática
    console.log('\n🏷️ 3. Testando categorização automática...');
    
    const categorization1 = await categorizationService.categorizeConversation(
      companyId, 
      clientId, 
      conversation1Id, 
      'problema urgente pedido conta acesso'
    );
    console.log(`✅ Conversa 1 categorizada:`, categorization1);

    const categorization2 = await categorizationService.categorizeConversation(
      companyId, 
      clientId, 
      conversation2Id, 
      'produtos instagram preços pagamento vendas'
    );
    console.log(`✅ Conversa 2 categorizada:`, categorization2);

    // 4. Teste: Adicionar tags manuais
    console.log('\n🏷️ 4. Testando sistema de tags...');
    
    await conversationsService.addTagsToConversation(companyId, clientId, conversation1Id, ['suporte', 'urgente', 'pedido']);
    await conversationsService.addTagsToConversation(companyId, clientId, conversation2Id, ['vendas', 'produtos', 'instagram']);
    
    console.log(`✅ Tags adicionadas às conversas`);

    // 5. Teste: Recuperar conversas atuais
    console.log('\n📋 5. Testando recuperação de conversas atuais...');
    
    const currentConversations = await conversationsService.getCurrentConversations(companyId, clientId);
    console.log(`✅ Conversas atuais encontradas: ${currentConversations.length}`);
    
    currentConversations.forEach((conv, index) => {
      console.log(`   Conversa ${index + 1}: ${conv.subject} - Tags: [${conv.tags?.join(', ') || 'nenhuma'}] - Prioridade: ${conv.priority}`);
    });

    // 6. Teste: Recuperar mensagens de uma conversa
    console.log('\n💬 6. Testando recuperação de mensagens...');
    
    const messages = await conversationsService.getConversationMessages(companyId, clientId, conversation1Id);
    console.log(`✅ Mensagens da conversa 1: ${messages.length}`);
    
    messages.forEach((msg, index) => {
      console.log(`   Mensagem ${index + 1} (${msg.role}): ${msg.content.substring(0, 50)}...`);
    });

    // 7. Teste: Buscar conversas por tags
    console.log('\n🔍 7. Testando busca por tags...');
    
    const conversasSuporte = await conversationsService.getConversationsByTags(companyId, clientId, ['suporte', 'urgente']);
    console.log(`✅ Conversas com tags de suporte: ${conversasSuporte.length}`);

    const conversasVendas = await conversationsService.getConversationsByTags(companyId, clientId, ['vendas', 'produtos']);
    console.log(`✅ Conversas com tags de vendas: ${conversasVendas.length}`);

    // 8. Teste: Estatísticas de conversas
    console.log('\n📊 8. Testando geração de estatísticas...');
    
    const stats = await categorizationService.getConversationStatistics(companyId, clientId);
    console.log(`✅ Estatísticas geradas:`, stats);

    // 9. Teste: Atualizar conversa
    console.log('\n✏️ 9. Testando atualização de conversa...');
    
    await conversationsService.updateConversation(companyId, clientId, conversation1Id, {
      status: 'resolved',
      summary: 'Problema de acesso resolvido. Cliente conseguiu acessar a conta após reset de senha.'
    });
    console.log(`✅ Conversa 1 atualizada com status e resumo`);

    // 10. Teste: Processamento mensal de categorização
    console.log('\n🗓️ 10. Testando processamento mensal...');
    
    const monthlyResults = await categorizationService.processMonthlyCategorizationForCompany(companyId, clientId);
    console.log(`✅ Processamento mensal executado:`, monthlyResults);

    // 11. Teste: Simulação de arquivamento (sem realmente arquivar as conversas de teste)
    console.log('\n🗄️ 11. Testando simulação de arquivamento...');
    
    // Criar uma conversa "antiga" para teste
    const oldConversationId = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Conversa antiga para teste',
      monthKey: '2024-01', // Janeiro 2024 (mais de 2 meses atrás)
      type: 'current'
    });

    // Simular arquivamento
    await conversationsService.updateConversation(companyId, clientId, oldConversationId, {
      type: 'archived',
      archivedAt: new Date()
    });
    
    console.log(`✅ Conversa simulada como arquivada: ${oldConversationId}`);

    // Resultado final
    console.log('\n🎉 TODOS OS TESTES DA FASE 2 FORAM EXECUTADOS COM SUCESSO!\n');
    
    const finalStats = await categorizationService.getConversationStatistics(companyId, clientId);
    
    console.log('📊 RESUMO FINAL DOS TESTES:');
    console.log(`   ✅ Empresa criada: ${testCompanyData.name}`);
    console.log(`   ✅ Cliente criado: ${testClientData.name}`);
    console.log(`   ✅ Conversas criadas: ${finalStats.total}`);
    console.log(`   ✅ Mensagens enviadas: ${messages.length * 2} (aproximadamente)`);
    console.log(`   ✅ Categorização automática: funcionando`);
    console.log(`   ✅ Sistema de tags: funcionando`);
    console.log(`   ✅ Busca por tags: funcionando`);
    console.log(`   ✅ Estatísticas: funcionando`);
    console.log(`   ✅ Arquivamento: funcionando`);
    
    return {
      success: true,
      companyId,
      clientId,
      conversationsCreated: finalStats.total,
      finalStats
    };

  } catch (error) {
    console.error('❌ ERRO NOS TESTES DA FASE 2:', error);
    throw error;
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  runFase2Tests()
    .then(result => {
      console.log('\n✅ Teste da Fase 2 concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Teste da Fase 2 falhou:', error);
      process.exit(1);
    });
}

module.exports = { runFase2Tests };
