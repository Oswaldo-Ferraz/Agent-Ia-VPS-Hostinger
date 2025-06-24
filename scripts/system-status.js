#!/usr/bin/env node

// 📊 STATUS GERAL DO SISTEMA
// Verifica o status de todos os componentes

const CredentialsManager = require('../src/core/credentials-manager');
const GoogleCloudIntegrator = require('../src/core/google-cloud-integrator');
const ClientManager = require('../src/core/client-manager');

async function checkSystemStatus() {
  console.log('\n📊 STATUS GERAL DO SISTEMA\n');
  
  try {
    // 1. Credenciais
    console.log('🔐 CREDENCIAIS:');
    const credentialsManager = new CredentialsManager();
    const credStatus = credentialsManager.getCredentialsStatus();
    
    console.log(`   Credenciais Google Cloud Admin: ${credStatus.hasGoogleCloudAdmin ? '✅' : '❌'}`);
    console.log(`   Total de credenciais: ${credStatus.totalCredentials}`);
    if (credStatus.availableTypes.length > 0) {
      console.log(`   Tipos: ${credStatus.availableTypes.join(', ')}`);
    }
    
    // 2. Google Cloud Integrator
    console.log('\n🌐 GOOGLE CLOUD INTEGRATOR:');
    const gcIntegrator = new GoogleCloudIntegrator();
    const gcStatus = gcIntegrator.getStatus();
    
    console.log(`   Pronto para uso: ${gcStatus.isReady ? '✅' : '❌'}`);
    console.log(`   Cloud Manager: ${gcStatus.hasCloudManager ? '✅' : '❌'}`);
    
    // 2.1. Firebase Integrator
    console.log('\n🔥 FIREBASE INTEGRATOR:');
    const FirebaseIntegrator = require('../src/core/firebase-integrator');
    const fbIntegrator = new FirebaseIntegrator();
    const fbStatus = fbIntegrator.getStatus();
    
    console.log(`   Pronto para uso: ${fbStatus.isReady ? '✅' : '❌'}`);
    console.log(`   Firebase Manager: ${fbStatus.hasFirebaseManager ? '✅' : '❌'}`);
    console.log(`   Claude API: ${fbStatus.hasClaudeApi ? '✅' : '❌'}`);

    // 3. Client Manager
    console.log('\n👥 CLIENT MANAGER:');
    const clientManager = new ClientManager();
    
    try {
      const clients = await clientManager.listClients();
      console.log(`   Total de clientes: ${clients.length}`);
      
      if (clients.length > 0) {
        const withGoogleCloud = clients.filter(c => c.credentials?.googleCloud).length;
        const withFirebase = clients.filter(c => c.credentials?.firebase).length;
        console.log(`   Com Google Cloud: ${withGoogleCloud}`);
        console.log(`   Com Firebase: ${withFirebase}`);
        
        console.log('\n   📋 Clientes:');
        clients.forEach(client => {
          const gcIcon = client.credentials?.googleCloud ? '🌐' : '⚪';
          const fbIcon = client.credentials?.firebase ? '🔥' : '⚪';
          console.log(`   ${gcIcon}${fbIcon} ${client.name} (${client.id})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Erro ao listar clientes: ${error.message}`);
    }
    
    // 4. Projetos Google Cloud
    if (gcStatus.isReady) {
      console.log('\n☁️ PROJETOS GOOGLE CLOUD:');
      try {
        await gcIntegrator.initialize();
        const projects = await gcIntegrator.listClientProjects();
        console.log(`   Total de projetos: ${projects.length}`);
        
        if (projects.length > 0) {
          console.log('\n   📁 Projetos:');
          projects.forEach(project => {
            console.log(`   • ${project.name} (${project.projectId})`);
          });
        }
      } catch (error) {
        console.log(`   ❌ Erro ao listar projetos: ${error.message}`);
      }
    }
    
    // 5. Resumo e recomendações
    console.log('\n📋 RESUMO:');
    
    if (!credStatus.hasGoogleCloudAdmin) {
      console.log('❌ Configure as credenciais Google Cloud Admin primeiro');
      console.log('   Comando: npm run setup:google-credentials');
    } else {
      console.log('✅ Sistema configurado e pronto para uso');
    }
    
    console.log('\n💡 COMANDOS ÚTEIS:');
    console.log('• npm run setup:google-credentials  - Configurar credenciais');
    console.log('• npm run test:google-cloud        - Testar Google Cloud');
    console.log('• npm run test:firebase            - Testar Firebase');
    console.log('• npm run test:client-manager       - Testar gerenciador de clientes');
    console.log('• npm start                        - Iniciar agente IA');
    console.log('• node scripts/remove-credentials.js - Remover credenciais');
    
  } catch (error) {
    console.error('\n❌ Erro ao verificar status:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkSystemStatus();
}

module.exports = checkSystemStatus;
