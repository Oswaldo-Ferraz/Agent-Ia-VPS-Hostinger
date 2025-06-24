#!/usr/bin/env node

// 🧪 TESTE DO CLIENT MANAGER
// Demonstração completa do sistema multi-cliente

const ClientManager = require('./client-manager');

async function demonstrarClientManager() {
  console.log('🏢 DEMONSTRAÇÃO DO CLIENT MANAGER\n');
  
  const clientManager = new ClientManager();
  
  try {
    // 1. Criar clientes de exemplo
    console.log('1. 👥 CRIANDO CLIENTES...\n');
    
    const agenciaFer = await clientManager.createClient({
      name: 'Agência Fer',
      email: 'contato@agenciafer.com.br',
      sites: [
        {
          domain: 'agenciafer.com.br',
          wp_path: '/domains/agenciafer.com.br/public_html',
          ssh_config: {
            host: '147.93.37.192',
            port: 65002,
            user: 'u148368058'
          }
        }
      ],
      credentials: {
        google: {
          client_id: 'agencia-google-client-id',
          client_secret: 'agencia-google-secret',
          service_account: '/path/to/agencia-service-account.json'
        },
        stripe: {
          public_key: 'pk_test_agencia',
          secret_key: 'sk_test_agencia',
          webhook_secret: 'whsec_agencia'
        }
      },
      integrations: {
        google_calendar: {
          enabled: true,
          calendar_id: 'primary'
        },
        stripe_payments: {
          enabled: true,
          currency: 'BRL'
        }
      }
    });
    
    const metodoVerus = await clientManager.createClient({
      name: 'Método Verus',
      email: 'contato@metodoverus.com.br',
      sites: [
        {
          domain: 'metodoverus.com.br',
          wp_path: '/domains/metodoverus.com.br/public_html'
        }
      ],
      credentials: {
        openai: {
          api_key: 'sk-proj-metodoverus-key'
        },
        whatsapp: {
          token: 'metodoverus-whatsapp-token',
          verify_token: 'metodoverus-verify'
        }
      }
    });
    
    // 2. Listar clientes
    console.log('\n2. 📋 LISTANDO CLIENTES...\n');
    const clientes = await clientManager.listClients();
    clientes.forEach(client => {
      console.log(`   🏢 ${client.name} (${client.id})`);
      console.log(`      📧 ${client.email}`);
      console.log(`      🌐 Sites: ${client.sites.join(', ')}`);
      console.log(`      📅 Criado: ${new Date(client.created_at).toLocaleDateString()}\n`);
    });
    
    // 3. Buscar cliente por nome
    console.log('3. 🔍 BUSCANDO CLIENTE POR NOME...\n');
    const clienteEncontrado = await clientManager.getClientByName('Agência Fer');
    console.log(`   ✅ Encontrado: ${clienteEncontrado.name}`);
    console.log(`   🔑 Credenciais: ${Object.keys(clienteEncontrado.credentials).join(', ')}`);
    console.log(`   🔗 Integrações: ${Object.keys(clienteEncontrado.integrations).join(', ')}\n`);
    
    // 4. Obter credenciais específicas
    console.log('4. 🔑 OBTENDO CREDENCIAIS...\n');
    const googleCreds = await clientManager.getClientCredentials(agenciaFer.id, 'google');
    console.log(`   📅 Google Client ID: ${googleCreds.client_id}`);
    
    const stripeCreds = await clientManager.getClientCredentials(agenciaFer.id, 'stripe');
    console.log(`   💳 Stripe Public Key: ${stripeCreds.public_key}\n`);
    
    // 5. Adicionar novo site
    console.log('5. 🌐 ADICIONANDO NOVO SITE...\n');
    await clientManager.addSiteToClient(agenciaFer.id, {
      domain: 'blog.agenciafer.com.br',
      wp_path: '/domains/blog.agenciafer.com.br/public_html'
    });
    
    // 6. Configurar nova integração
    console.log('6. 🔗 CONFIGURANDO INTEGRAÇÃO...\n');
    await clientManager.updateClientIntegration(metodoVerus.id, 'email_marketing', {
      provider: 'mailchimp',
      api_key: 'mailchimp-api-key',
      list_id: 'default-list'
    });
    
    // 7. Atualizar credenciais
    console.log('7. 🔧 ATUALIZANDO CREDENCIAIS...\n');
    await clientManager.updateClientCredentials(metodoVerus.id, 'stripe', {
      public_key: 'pk_live_metodoverus',
      secret_key: 'sk_live_metodoverus'
    });
    
    // 8. Buscar cliente por site
    console.log('8. 🎯 BUSCANDO CLIENTE POR SITE...\n');
    const { client, site } = await clientManager.getClientBySite('metodoverus.com.br');
    console.log(`   🏢 Cliente: ${client.name}`);
    console.log(`   🌐 Site: ${site.domain}`);
    console.log(`   📁 Path: ${site.wp_path}\n`);
    
    // 9. Estatísticas
    console.log('9. 📊 ESTATÍSTICAS DOS CLIENTES...\n');
    for (const clientInfo of clientes) {
      const stats = await clientManager.getClientStats(clientInfo.id);
      console.log(`   🏢 ${stats.name}:`);
      console.log(`      🌐 Sites: ${stats.sites_count} (${stats.active_sites} ativos)`);
      console.log(`      🔗 Integrações: ${stats.integrations_count} (${stats.active_integrations} ativas)`);
      console.log(`      🔑 Credenciais: ${stats.credentials_count} serviços`);
      console.log(`      📅 Última atualização: ${new Date(stats.updated_at).toLocaleDateString()}\n`);
    }
    
    console.log('✅ DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n🎯 O SISTEMA MULTI-CLIENTE ESTÁ FUNCIONANDO PERFEITAMENTE!');
    
  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
  }
}

// Executar demonstração se chamado diretamente
if (require.main === module) {
  demonstrarClientManager();
}

module.exports = { demonstrarClientManager };
