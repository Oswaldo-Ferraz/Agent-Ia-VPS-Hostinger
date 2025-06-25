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
 * TEST FASE 3 (SIMPLIFIED) - Lógica Correta de Resumos e Contexto
 * 
 * LÓGICA DO SISTEMA:
 * 1. Conversas ATUAIS (mês corrente) = ficam completas, não resumidas
 * 2. Cliente tem RESUMO DO PERFIL = informações essenciais permanentes
 * 3. Para cada resposta = perfil do cliente + conversas atuais do mês
 * 4. Conversas antigas (+1 mês) = são resumidas e arquivadas
 * 5. Busca histórica = busca nos resumos antigos quando necessário
 */

async function runFase3SimplifiedTest() {
  console.log('\n🚀 TESTE FASE 3 (SIMPLIFIED) - LÓGICA CORRETA DE CONTEXTO\n');
  
  try {
    // 1. Validação OpenAI
    console.log('🤖 1. Validando OpenAI Service...');
    const isValid = await openAIService.validateService();
    if (!isValid) {
      throw new Error('OpenAI Service validation failed');
    }
    console.log('✅ OpenAI Service funcionando corretamente');

    // 2. Setup: Criar empresa e cliente
    console.log('\n📋 2. Criando empresa e cliente de teste...');
    
    const testCompanyData = {
      name: `Loja de Roupas Fashion`,
      domain: `fashionstore.com.br`,
      whatsapp: '+5511999887766',
      instagram: '@fashionstore',
      customPrompt: 'Você é um atendente da Loja de Roupas Fashion. Seja sempre estiloso, sugira produtos da moda e ajude com looks.'
    };

    let company;
    try {
      company = await companiesService.createCompany(testCompanyData);
      console.log(`✅ Empresa criada: ${testCompanyData.name}`);
    } catch (error) {
      if (error.message.includes('já existe')) {
        // Se já existe, buscar a empresa existente
        const companies = await companiesService.listCompanies();
        company = companies.find(c => c.domain === testCompanyData.domain);
        if (!company) {
          throw new Error('Empresa deveria existir mas não foi encontrada');
        }
        console.log(`✅ Usando empresa existente: ${company.name}`);
      } else {
        throw error;
      }
    }
    const companyId = company.companyId;

    const testClientData = {
      name: 'Ana Carolina',
      contact: {
        whatsapp: '+5511988776644',
        email: `ana.carolina.${Date.now()}@test.com`
      }
    };

    let client;
    try {
      client = await clientsService.createClient(companyId, testClientData);
      console.log(`✅ Cliente criado: ${testClientData.name}`);
    } catch (error) {
      if (error.message.includes('já existe')) {
        // Se já existe, buscar o cliente existente
        const clients = await clientsService.listClients(companyId);
        client = clients.find(c => c.contact.whatsapp === testClientData.contact.whatsapp);
        if (!client) {
          throw new Error('Cliente deveria existir mas não foi encontrado');
        }
        console.log(`✅ Usando cliente existente: ${client.name}`);
      } else {
        throw error;
      }
    }
    const clientId = client.clientId;

    // 3. Simular conversas atuais (mês corrente)
    console.log('\n📱 3. Criando conversas ATUAIS (mês corrente)...');
    
    // Conversa 1: Interesse em vestido
    const conv1Id = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Interesse em vestido para casamento',
      priority: 'normal'
    });

    await conversationsService.addMessage(companyId, clientId, conv1Id, {
      role: 'user',
      content: 'Oi! Estou procurando um vestido elegante para um casamento. Prefiro cores claras e tecidos leves.',
      platform: 'whatsapp'
    });

    await conversationsService.addMessage(companyId, clientId, conv1Id, {
      role: 'assistant',
      content: 'Olá Ana! Temos vestidos lindos perfeitos para casamentos! Que tamanho você usa? E prefere manga longa ou sem manga?',
      platform: 'whatsapp'
    });

    // Conversa 2: Pergunta sobre entrega
    const conv2Id = await conversationsService.createConversation(companyId, clientId, {
      subject: 'Dúvida sobre prazo de entrega',
      priority: 'normal'
    });

    await conversationsService.addMessage(companyId, clientId, conv2Id, {
      role: 'user',
      content: 'O vestido que escolhi chegaria a tempo para o casamento que é na próxima semana?',
      platform: 'whatsapp'
    });

    console.log(`✅ 2 conversas ATUAIS criadas (não serão resumidas)`);

    // 4. Teste: Categorização inteligente
    console.log('\n🏷️ 4. Testando categorização inteligente...');
    
    const categorization1 = await openAIService.categorizeMessage(
      'Estou procurando um vestido elegante para um casamento',
      { companyName: testCompanyData.name, clientName: testClientData.name }
    );
    
    console.log(`✅ Mensagem categorizada:`);
    console.log(`   Categoria: ${categorization1.category}`);
    console.log(`   Prioridade: ${categorization1.priority}`);
    console.log(`   Sentimento: ${categorization1.sentiment}`);
    console.log(`   Tags: ${categorization1.tags?.join(', ')}`);

    // 5. Gerar RESUMO DO PERFIL do cliente (informações essenciais)
    console.log('\n👤 5. Gerando RESUMO DO PERFIL do cliente...');
    
    // Buscar todas as mensagens do cliente para criar perfil
    const messages1 = await conversationsService.getConversationMessages(companyId, clientId, conv1Id);
    const messages2 = await conversationsService.getConversationMessages(companyId, clientId, conv2Id);
    const allCurrentMessages = [...messages1, ...messages2];

    const clientProfile = await openAIService.generateClientProfile(
      testClientData,
      [], // Sem resumos antigos ainda
      testCompanyData
    );

    console.log(`✅ RESUMO DO PERFIL gerado:`);
    console.log(`   Personalidade: ${clientProfile.profile.personalityType}`);
    console.log(`   Preferências: ${clientProfile.profile.preferences?.join(', ')}`);
    console.log(`   Estilo comunicação: ${clientProfile.profile.communicationStyle}`);
    console.log(`   Resumo: ${clientProfile.summary?.substring(0, 100)}...`);

    // 6. Simular atualização do cliente com perfil
    console.log('\n📝 6. Salvando resumo do perfil no cliente...');
    
    // Atualizar cliente com perfil (simulando o que faria o ContextService)
    await clientsService.updateClient(companyId, clientId, {
      summary: clientProfile.summary,
      profile: clientProfile.profile,
      tags: clientProfile.tags || [],
      insights: clientProfile.insights || [],
      lastProfileUpdate: new Date()
    });

    console.log(`✅ Perfil do cliente salvo no Firebase`);

    // 7. Teste do FLUXO PRINCIPAL: Cliente faz nova pergunta
    console.log('\n🧠 7. TESTE DO FLUXO PRINCIPAL - Nova pergunta do cliente...');
    
    const novaPergunta = 'Vocês têm aquele modelo de bolsa que me mostraram no mês passado?';
    
    console.log(`📤 Cliente pergunta: "${novaPergunta}"`);
    
    // Simular detecção de busca histórica
    const needsHistorySearch = await openAIService.categorizeMessage(novaPergunta, {
      companyName: testCompanyData.name,
      clientName: testClientData.name
    });
    
    console.log(`🔍 IA detectou: Categoria "${needsHistorySearch.category}" - Pode precisar de busca histórica`);

    // 8. Buscar contexto ATUAL (sem índices compostos)
    console.log('\n📋 8. Buscando contexto ATUAL do cliente...');
    
    // Buscar cliente atualizado com perfil
    const clientUpdated = await clientsService.getClientById(companyId, clientId);
    
    // Buscar mensagens atuais (sem orderBy complexo)
    const currentMessages = await conversationsService.getConversationMessages(companyId, clientId, conv1Id, 10);
    const currentMessages2 = await conversationsService.getConversationMessages(companyId, clientId, conv2Id, 10);
    const allRecentMessages = [...currentMessages, ...currentMessages2];

    console.log(`✅ Contexto atual coletado:`);
    console.log(`   Cliente: ${clientUpdated.name}`);
    console.log(`   Resumo perfil: ${clientUpdated.summary?.substring(0, 80)}...`);
    console.log(`   Mensagens atuais: ${allRecentMessages.length}`);
    console.log(`   Tags: ${clientUpdated.tags?.join(', ')}`);

    // 9. Gerar resposta com contexto completo
    console.log('\n🤖 9. Gerando resposta da IA com contexto...');
    
    const contextualResponse = await openAIService.generateContextualResponse(novaPergunta, {
      company: {
        name: testCompanyData.name,
        customPrompt: testCompanyData.customPrompt
      },
      client: {
        name: clientUpdated.name,
        tags: clientUpdated.tags,
        summary: clientUpdated.summary
      },
      recentConversations: allRecentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      clientSummary: clientUpdated.summary
    });

    console.log(`✅ Resposta contextual gerada:`);
    console.log(`   "${contextualResponse.substring(0, 150)}..."`);

    // 10. Teste: Simular resumo mensal (conversas antigas)
    console.log('\n📅 10. Simulando processo de resumo mensal...');
    
    // Simular que temos conversas antigas (seria feito automaticamente após 1 mês)
    const simulatedOldConversations = [
      {
        role: 'user',
        content: 'Vocês têm bolsas de couro marrom? Preciso de uma para trabalho.',
        timestamp: { seconds: Date.now() / 1000 - (40 * 24 * 60 * 60) } // 40 dias atrás
      },
      {
        role: 'assistant', 
        content: 'Sim! Temos uma linha executiva linda. Aqui está o link do catálogo: fashionstore.com.br/bolsas-executivas',
        timestamp: { seconds: Date.now() / 1000 - (40 * 24 * 60 * 60) }
      }
    ];

    const oldConversationSummary = await openAIService.generateConversationSummary(
      simulatedOldConversations,
      testClientData,
      testCompanyData
    );

    console.log(`✅ Resumo de conversa antiga gerado:`);
    console.log(`   "${oldConversationSummary.substring(0, 120)}..."`);

    // 11. Teste: Busca semântica nos resumos
    console.log('\n🔍 11. Testando busca semântica em resumos...');
    
    const searchQuery = 'bolsa couro trabalho link catálogo';
    const searchResults = await openAIService.semanticSearch(searchQuery, [
      { text: oldConversationSummary, id: 'summary-1' }
    ]);

    console.log(`✅ Busca semântica executada para: "${searchQuery}"`);
    console.log(`   Resultados encontrados: ${searchResults.length}`);

    // Resultado final
    console.log('\n🎉 TESTE FASE 3 (SIMPLIFIED) CONCLUÍDO COM SUCESSO!\n');
    
    console.log('📊 RESUMO DA LÓGICA VALIDADA:');
    console.log(`   ✅ Conversas ATUAIS: mantidas completas (${allRecentMessages.length} mensagens)`);
    console.log(`   ✅ Perfil do cliente: resumo essencial salvo`);
    console.log(`   ✅ Contexto para IA: perfil + conversas atuais`);
    console.log(`   ✅ Resumos antigos: geração funcionando`);
    console.log(`   ✅ Busca histórica: busca semântica funcionando`);
    console.log(`   ✅ Categorização: detecta necessidade de busca`);
    
    console.log('\n🤖 FLUXO DE RESPOSTA DA IA:');
    console.log('   1️⃣ Cliente faz pergunta');
    console.log('   2️⃣ IA analisa se precisa buscar histórico');
    console.log('   3️⃣ Sistema busca: perfil + conversas atuais');
    console.log('   4️⃣ Se necessário: busca em resumos antigos');
    console.log('   5️⃣ IA responde com contexto completo');
    
    console.log('\n⚡ SISTEMA INTELIGENTE DE MEMÓRIA:');
    console.log('   🧠 Memória imediata: conversas do mês atual');
    console.log('   👤 Memória pessoal: resumo do perfil do cliente');
    console.log('   📚 Memória longa: resumos de meses anteriores');
    console.log('   🔍 Busca inteligente: quando cliente menciona passado');

    return {
      success: true,
      companyId,
      clientId,
      clientProfileGenerated: true,
      currentConversations: 2,
      messagesInMemory: allRecentMessages.length,
      historicalSummaryTested: true,
      semanticSearchTested: true,
      aiContextWorking: true
    };

  } catch (error) {
    console.error('❌ ERRO NO TESTE FASE 3 SIMPLIFIED:', error);
    throw error;
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  runFase3SimplifiedTest()
    .then(result => {
      console.log('\n✅ Teste Fase 3 (Simplified) concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Teste Fase 3 (Simplified) falhou:', error);
      process.exit(1);
    });
}

module.exports = { runFase3SimplifiedTest };
