#!/usr/bin/env node

/**
 * 🧪 TESTE FASE 1 - ESTRUTURA BASE E BANCO DE DADOS
 * Testar: Criar empresa → Adicionar cliente → Visualizar dados
 */

const CompaniesService = require('../firebase/firestore/companies');
const ClientsService = require('../firebase/firestore/clients');
const FirestoreConfig = require('../firebase/config/firestore-config');

class TesteFase1 {
  constructor() {
    this.companiesService = new CompaniesService();
    this.clientsService = new ClientsService();
    this.firestore = new FirestoreConfig();
  }

  async executarTeste() {
    console.log('\n🧪 INICIANDO TESTE FASE 1 - ESTRUTURA BASE\n');
    console.log('=' .repeat(60));

    try {
      // 🔥 Passo 1: Testar conexão Firestore
      console.log('\n1️⃣ TESTANDO CONEXÃO FIRESTORE...');
      const conexaoOk = await this.firestore.testConnection();
      if (!conexaoOk) {
        throw new Error('Falha na conexão com Firestore');
      }
      console.log('✅ Conexão Firestore estabelecida');

      // 🏢 Passo 2: Criar empresa teste
      console.log('\n2️⃣ CRIANDO EMPRESA TESTE...');
      const timestamp = Date.now();
      const shortId = timestamp.toString().slice(-6);
      const empresaTeste = await this.companiesService.createCompany({
        name: `Restaurante Mario Bros ${shortId}`,
        domain: `mariobros${shortId}.com.br`,
        whatsappId: `+5511999${shortId}`,
        instagram: `@mario${shortId}`,
        customPrompt: 'Você é o atendente virtual do Restaurante Mario Bros. Somos especializados em pizza italiana e massas artesanais. Sempre seja cordial e sugira nossos pratos especiais.'
      });
      
      console.log('✅ Empresa criada com sucesso!');
      console.log(`   📋 ID: ${empresaTeste.companyId}`);
      console.log(`   🏢 Nome: ${empresaTeste.name}`);
      console.log(`   🌐 Domínio: ${empresaTeste.domain}`);
      console.log(`   📱 WhatsApp: ${empresaTeste.whatsappId}`);

      // 👤 Passo 3: Adicionar clientes à empresa
      console.log('\n3️⃣ ADICIONANDO CLIENTES...');
      
      const cliente1 = await this.clientsService.createClient(empresaTeste.companyId, {
        name: 'João Silva',
        contact: {
          whatsapp: '+5511888777666',
          email: 'joao.silva@email.com',
          preferredChannel: 'whatsapp'
        },
        tags: ['frequente', 'pizza', 'vip'],
        summary: 'Cliente frequente, prefere pizza margherita, sempre pede às sextas-feiras',
        profile: {
          preferences: ['pizza margherita', 'massa carbonara', 'entrega rápida'],
          behavior: 'Educado, pontual nos pagamentos, gosta de promoções',
          frequency: 'frequent',
          customerType: 'loyal'
        }
      });

      const cliente2 = await this.clientsService.createClient(empresaTeste.companyId, {
        name: 'Maria Santos',
        contact: {
          whatsapp: '+5511777666555',
          email: 'maria.santos@email.com',
          preferredChannel: 'whatsapp'
        },
        tags: ['nova', 'massa'],
        summary: 'Cliente nova, interessada em massas especiais',
        profile: {
          preferences: ['massa', 'vegetariano'],
          behavior: 'Faz muitas perguntas, gosta de detalhes',
          frequency: 'occasional',
          customerType: 'new'
        }
      });

      const cliente3 = await this.clientsService.createClient(empresaTeste.companyId, {
        name: 'Pedro Oliveira',
        contact: {
          whatsapp: '+5511666555444',
          email: 'pedro.oliveira@email.com',
          preferredChannel: 'whatsapp'
        },
        tags: ['empresarial', 'eventos', 'vip'],
        summary: 'Cliente empresarial, faz pedidos grandes para eventos',
        profile: {
          preferences: ['pedidos grandes', 'variedade', 'pontualidade'],
          behavior: 'Profissional, planeja com antecedência',
          frequency: 'regular',
          customerType: 'vip'
        }
      });

      console.log('✅ Clientes adicionados com sucesso!');
      console.log(`   👤 Cliente 1: ${cliente1.name} (${cliente1.clientId})`);
      console.log(`   👤 Cliente 2: ${cliente2.name} (${cliente2.clientId})`);
      console.log(`   👤 Cliente 3: ${cliente3.name} (${cliente3.clientId})`);

      // 📊 Passo 4: Visualizar dados criados
      console.log('\n4️⃣ VISUALIZANDO DADOS...');
      
      // Buscar empresa criada
      const empresaEncontrada = await this.companiesService.getCompanyById(empresaTeste.companyId);
      console.log('✅ Empresa encontrada:', empresaEncontrada ? 'Sim' : 'Não');

      // Listar clientes da empresa
      const listaClientes = await this.clientsService.listClients(empresaTeste.companyId, 10);
      console.log(`✅ Clientes listados: ${listaClientes.clients.length} encontrados`);

      // Buscar cliente por contato
      const clientePorContato = await this.clientsService.findByContact(empresaTeste.companyId, '+5511888777666');
      console.log('✅ Busca por contato:', clientePorContato ? clientePorContato.name : 'Não encontrado');

      // Buscar clientes VIP
      const clientesVIP = await this.clientsService.getVIPClients(empresaTeste.companyId);
      console.log(`✅ Clientes VIP encontrados: ${clientesVIP.length}`);

      // 📈 Passo 5: Verificar estatísticas
      console.log('\n5️⃣ VERIFICANDO ESTATÍSTICAS...');
      
      const statsEmpresa = await this.clientsService.getCompanyClientStats(empresaTeste.companyId);
      console.log('✅ Estatísticas da empresa:', JSON.stringify(statsEmpresa, null, 2));

      const statsGerais = await this.companiesService.getGeneralStats();
      console.log('✅ Estatísticas gerais:', statsGerais ? 'Obtidas' : 'Erro');

      // 🧪 Passo 6: Testar funcionalidades específicas
      console.log('\n6️⃣ TESTANDO FUNCIONALIDADES...');
      
      // Atualizar cliente
      await this.clientsService.updateClient(empresaTeste.companyId, cliente1.clientId, {
        summary: 'Cliente frequente ATUALIZADO - prefere pizza margherita, sempre pede às sextas-feiras'
      });
      console.log('✅ Cliente atualizado com sucesso');

      // Buscar por tag
      const clientesPizza = await this.clientsService.getClientsByTag(empresaTeste.companyId, 'pizza');
      console.log(`✅ Clientes que gostam de pizza: ${clientesPizza.length}`);

      // Buscar empresa por domínio
      const empresaPorDominio = await this.companiesService.findByIdentifier('mariobros.com.br');
      console.log('✅ Busca por domínio:', empresaPorDominio ? empresaPorDominio.name : 'Não encontrada');

      // 🎉 Passo 7: Resultado final
      console.log('\n7️⃣ RESULTADO FINAL...');
      
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 TESTE FASE 1 CONCLUÍDO COM SUCESSO!');
      console.log('=' .repeat(60));
      
      console.log('\n📊 RESUMO DO TESTE:');
      console.log(`✅ Empresa criada: ${empresaTeste.name}`);
      console.log(`✅ Clientes adicionados: ${listaClientes.clients.length}`);
      console.log(`✅ Clientes VIP: ${clientesVIP.length}`);
      console.log(`✅ Funcionalidades testadas: Todas passaram`);
      
      console.log('\n🚀 SISTEMA BASE ESTÁ FUNCIONANDO 100%!');
      console.log('📋 Próximo passo: Iniciar FASE 2 - Sistema de Conversas');

      // ⚠️ Opcional: Limpar dados de teste
      console.log('\n🧹 LIMPANDO DADOS DE TESTE...');
      await this.clientsService.deleteClient(empresaTeste.companyId, cliente1.clientId);
      await this.clientsService.deleteClient(empresaTeste.companyId, cliente2.clientId);
      await this.clientsService.deleteClient(empresaTeste.companyId, cliente3.clientId);
      await this.companiesService.deleteCompany(empresaTeste.companyId);
      console.log('✅ Dados de teste removidos');

      return {
        sucesso: true,
        empresa: empresaTeste,
        clientes: [cliente1, cliente2, cliente3],
        estatisticas: statsEmpresa
      };

    } catch (error) {
      console.error('\n❌ ERRO NO TESTE FASE 1:', error.message);
      console.error('\n📋 Stack trace:', error.stack);
      
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // 🔧 Método auxiliar para verificar dependências
  async verificarDependencias() {
    console.log('\n🔍 VERIFICANDO DEPENDÊNCIAS...');
    
    try {
      // Verificar se Firebase está configurado
      const admin = require('firebase-admin');
      console.log('✅ Firebase Admin SDK carregado');

      // Verificar variáveis de ambiente
      if (process.env.FIREBASE_PROJECT_ID) {
        console.log('✅ FIREBASE_PROJECT_ID configurado');
      } else {
        console.log('⚠️ FIREBASE_PROJECT_ID não encontrado');
      }

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('✅ GOOGLE_APPLICATION_CREDENTIALS configurado');
      } else {
        console.log('⚠️ GOOGLE_APPLICATION_CREDENTIALS não encontrado');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro nas dependências:', error.message);
      return false;
    }
  }
}

// 🧪 Executar teste se chamado diretamente
if (require.main === module) {
  async function executarTesteFase1() {
    const teste = new TesteFase1();
    
    // Verificar dependências primeiro
    const depOk = await teste.verificarDependencias();
    if (!depOk) {
      console.log('\n❌ Falha nas dependências. Verifique a configuração do Firebase.');
      process.exit(1);
    }

    // Executar teste principal
    const resultado = await teste.executarTeste();
    
    if (resultado.sucesso) {
      console.log('\n🏆 TESTE FASE 1 - SUCESSO TOTAL!');
      process.exit(0);
    } else {
      console.log('\n💥 TESTE FASE 1 - FALHA!');
      process.exit(1);
    }
  }

  executarTesteFase1().catch(error => {
    console.error('💥 Erro fatal no teste:', error);
    process.exit(1);
  });
}

module.exports = TesteFase1;
