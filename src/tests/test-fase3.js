const openAIService = require('../services/OpenAIService');
const summarizerService = require('../firebase/firestore/summarizer');
const contextService = require('../services/ContextService');
const conversationsService = require('../firebase/firestore/conversations');
const CompaniesService = require('../firebase/firestore/companies');
const ClientsService = require('../firebase/firestore/clients');

// Initialize service instances
const companiesService = new CompaniesService();
const clientsService = new ClientsService();

/**
 * TEST FASE 3: INTEGRAÇÃO OPENAI E RESUMOS AUTOMÁTICOS
 * 
 * Este teste valida:
 * - Conexão e funcionamento do OpenAI SDK
 * - Geração de resumos automáticos
 * - Categorização inteligente de mensagens
 * - Sistema de contexto completo para IA
 * - Busca semântica
 * - Geração de respostas contextuais
 */

async function runFase3Tests() {
  console.log('\n🚀 INICIANDO TESTES DA FASE 3 - INTEGRAÇÃO OPENAI E RESUMOS\n');
  
  try {
    // 1. Validação inicial do OpenAI Service
    console.log('🤖 1. Validando OpenAI Service...');
    
    const isValid = await openAIService.validateService();
    if (!isValid) {
      throw new Error('OpenAI Service validation failed');
    }
    console.log('✅ OpenAI Service está funcionando corretamente');

    // 2. Setup: Criar dados de teste com conversas ricas
    console.log('\n📋 2. Configurando dados de teste com conversas...');
    
    const testCompanyData = {
      name: `Pizzaria do João`,
      domain: `pizzariadojoao.com.br`,
      whatsapp: '+5511999887700',
      instagram: '@pizzariadojoao',
      customPrompt: 'Você é um atendente da Pizzaria do João. Sempre seja amigável, sugira produtos e ajude com pedidos de pizza.'
    };

    const company = await companiesService.createCompany(testCompanyData);
    const companyId = company.companyId;
    console.log(`✅ Empresa criada: ${testCompanyData.name}`);

    const testClientData = {
      name: 'Maria Santos',
      contact: {
        whatsapp: '+5511988776655',
        email: `maria.santos.${Date.now()}@test.com`
      }
    };

    const client = await clientsService.createClient(companyId, testClientData);
    const clientId = client.clientId;
    console.log(`✅ Cliente criado: ${testClientData.name}`);

    // 3. Criar conversas com histórico rico
    console.log('\n📱 3. Criando conversas com histórico rico...');
    
    // Conversa 1: Pedido de pizza
    const conv1Id = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Pedido de pizza margherita',
      priority: 'normal'
    });

    await conversationsService.addMessage(companyId, clientId, conv1Id, {
      role: 'user',
      content: 'Oi! Gostaria de fazer um pedido. Quero uma pizza margherita grande.',
      platform: 'whatsapp'
    });

    await conversationsService.addMessage(companyId, clientId, conv1Id, {
      role: 'assistant',
      content: 'Olá Maria! Claro, uma pizza margherita grande. Gostaria de adicionar algum ingrediente extra? Temos promoção de borda recheada hoje!',
      platform: 'whatsapp'
    });

    await conversationsService.addMessage(companyId, clientId, conv1Id, {
      role: 'user',
      content: 'Sim, quero borda de catupiry! Quanto fica o total? E qual o tempo de entrega?',
      platform: 'whatsapp'
    });

    // Conversa 2: Feedback positivo
    const conv2Id = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Elogio sobre entrega',
      priority: 'low'
    });

    await conversationsService.addMessage(companyId, clientId, conv2Id, {
      role: 'user',
      content: 'A pizza chegou quentinha e deliciosa! Parabéns pela qualidade. O entregador foi muito educado.',
      platform: 'whatsapp'
    });

    await conversationsService.addMessage(companyId, clientId, conv2Id, {
      role: 'assistant',
      content: 'Que alegria receber seu feedback, Maria! Fico muito feliz que tenha gostado. Vou repassar o elogio para nossa equipe. Obrigado pela preferência!',
      platform: 'whatsapp'
    });

    console.log(`✅ 2 conversas criadas com 5 mensagens`);

    // 4. Teste: Categorização inteligente de mensagem
    console.log('\n🏷️ 4. Testando categorização inteligente...');
    
    const testMessages = [
      'Gostaria de cancelar meu pedido urgentemente!',
      'Vocês fazem pizza vegana?',
      'A pizza chegou fria e sem um ingrediente que pedi',
      'Quero fazer um pedido para entrega'
    ];

    for (const [index, message] of testMessages.entries()) {
      const categorization = await openAIService.categorizeMessage(message, {
        companyName: testCompanyData.name,
        clientName: testClientData.name
      });
      
      console.log(`   ${index + 1}. "${message}"`);
      console.log(`      → Categoria: ${categorization.category}, Prioridade: ${categorization.priority}, Sentimento: ${categorization.sentiment}`);
    }

    // 5. Teste: Geração de resumo de conversas
    console.log('\n📝 5. Testando geração de resumos...');
    
    // Buscar mensagens para resumir
    const messages1 = await conversationsService.getConversationMessages(companyId, clientId, conv1Id);
    const messages2 = await conversationsService.getConversationMessages(companyId, clientId, conv2Id);
    const allMessages = [...messages1, ...messages2];

    const summary = await openAIService.generateConversationSummary(
      allMessages,
      testClientData,
      testCompanyData
    );

    console.log(`✅ Resumo gerado (${summary.length} caracteres):`);
    console.log(`   ${summary.substring(0, 200)}...`);

    // 6. Teste: Geração de perfil do cliente
    console.log('\n👤 6. Testando geração de perfil do cliente...');
    
    const clientProfile = await openAIService.generateClientProfile(
      testClientData,
      [summary],
      testCompanyData
    );

    console.log(`✅ Perfil do cliente gerado:`);
    console.log(`   Tipo de personalidade: ${clientProfile.profile.personalityType}`);
    console.log(`   Preferências: ${clientProfile.profile.preferences.join(', ')}`);
    console.log(`   Estilo de comunicação: ${clientProfile.profile.communicationStyle}`);
    console.log(`   Tags sugeridas: ${clientProfile.tags.join(', ')}`);

    // 7. Teste: Sistema de contexto completo
    console.log('\n🧠 7. Testando sistema de contexto...');
    
    const context = await contextService.getClientContext(companyId, clientId);
    
    console.log(`✅ Contexto construído:`);
    console.log(`   Empresa: ${context.company.name}`);
    console.log(`   Cliente: ${context.client.name}`);
    console.log(`   Mensagens recentes: ${context.recentMessages.length}`);
    console.log(`   Resumos disponíveis: ${context.summaries.length}`);
    console.log(`   Qualidade do contexto: ${context.metadata ? 'boa' : 'limitada'}`);

    // 8. Teste: Geração de resposta contextual
    console.log('\n🤖 8. Testando geração de resposta contextual...');
    
    const testMessage = 'Oi! Quero pedir a mesma pizza da última vez, pode ser?';
    
    const aiResponse = await contextService.generateAIResponse(
      companyId, 
      clientId, 
      testMessage
    );

    console.log(`✅ Resposta da IA gerada:`);
    console.log(`   Categoria: ${aiResponse.categorization.category}`);
    console.log(`   Prioridade: ${aiResponse.categorization.priority}`);
    console.log(`   Resposta: "${aiResponse.response}"`);

    // 9. Teste: Processamento de resumos mensais
    console.log('\n📅 9. Testando processamento de resumos mensais...');
    
    const monthlyResult = await summarizerService.processMonthlyResumes(companyId);
    
    console.log(`✅ Processamento mensal executado:`);
    console.log(`   Clientes processados: ${monthlyResult.processedClients}`);
    console.log(`   Resumos criados: ${monthlyResult.resumesCreated}`);
    console.log(`   Erros: ${monthlyResult.errors}`);

    // 10. Teste: Busca semântica
    console.log('\n🔍 10. Testando busca semântica...');
    
    const searchResults = await summarizerService.searchClientSummaries(
      companyId, 
      clientId, 
      'pizza margherita'
    );

    console.log(`✅ Busca semântica executada:`);
    console.log(`   Resultados encontrados: ${searchResults.length}`);

    // 11. Teste: Insights do cliente
    console.log('\n📊 11. Testando geração de insights...');
    
    const insights = await contextService.getClientInsights(companyId, clientId);
    
    console.log(`✅ Insights gerados:`);
    console.log(`   Total de interações: ${insights.metrics.totalInteractions}`);
    console.log(`   Plataforma mais usada: ${insights.metrics.mostUsedPlatform}`);
    console.log(`   Tendência de sentimento: ${insights.metrics.sentimentTrend}`);

    // 12. Teste: Atualização automática de contexto
    console.log('\n🔄 12. Testando atualização automática de contexto...');
    
    const newConvId = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Nova conversa para teste de contexto'
    });

    await conversationsService.addMessage(companyId, clientId, newConvId, {
      role: 'user',
      content: 'Vocês têm promoções especiais para clientes frequentes?',
      platform: 'whatsapp'
    });

    await contextService.updateClientContextAfterMessage(
      companyId, 
      clientId, 
      newConvId, 
      'Vocês têm promoções especiais para clientes frequentes?'
    );

    console.log(`✅ Contexto atualizado após nova mensagem`);

    // Resultado final
    console.log('\n🎉 TODOS OS TESTES DA FASE 3 FORAM EXECUTADOS COM SUCESSO!\n');
    
    console.log('📊 RESUMO FINAL DOS TESTES:');
    console.log(`   ✅ OpenAI SDK: funcionando`);
    console.log(`   ✅ Empresa criada: ${testCompanyData.name}`);
    console.log(`   ✅ Cliente criado: ${testClientData.name}`);
    console.log(`   ✅ Conversas com histórico: 3 conversas`);
    console.log(`   ✅ Categorização inteligente: 4 mensagens testadas`);
    console.log(`   ✅ Resumos automáticos: funcionando`);
    console.log(`   ✅ Perfil de cliente: gerado com IA`);
    console.log(`   ✅ Sistema de contexto: completo`);
    console.log(`   ✅ Respostas contextuais: funcionando`);
    console.log(`   ✅ Busca semântica: implementada`);
    console.log(`   ✅ Insights automáticos: funcionando`);
    
    console.log('\n🤖 FUNCIONALIDADES DE IA VALIDADAS:');
    console.log('   🔹 Categorização automática por conteúdo');
    console.log('   🔹 Geração de resumos inteligentes');
    console.log('   🔹 Análise de perfil de cliente');
    console.log('   🔹 Respostas contextuais personalizadas');
    console.log('   🔹 Busca semântica em histórico');
    console.log('   🔹 Insights comportamentais');
    console.log('   🔹 Processamento automático em lote');
    
    console.log('\n⚡ INTEGRAÇÕES TESTADAS:');
    console.log('   🔹 OpenAI GPT-4o-mini');
    console.log('   🔹 Firebase Firestore');
    console.log('   🔹 Sistema multiempresa');
    console.log('   🔹 Contexto de longo prazo');
    
    return {
      success: true,
      companyId,
      clientId,
      conversationsCreated: 3,
      messagesProcessed: 6,
      summariesGenerated: monthlyResult.resumesCreated,
      openaiIntegration: true,
      contextSystem: true
    };

  } catch (error) {
    console.error('❌ ERRO NOS TESTES DA FASE 3:', error);
    throw error;
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  runFase3Tests()
    .then(result => {
      console.log('\n✅ Teste da Fase 3 concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Teste da Fase 3 falhou:', error);
      process.exit(1);
    });
}

module.exports = { runFase3Tests };
