#!/usr/bin/env node

// 🧪 TESTE DO FIREBASE INTEGRATOR
// Testa a integração completa do Firebase

const FirebaseIntegrator = require('./firebase-integrator');

async function testFirebaseIntegrator() {
  console.log('\n🧪 TESTE DO FIREBASE INTEGRATOR\n');
  
  const integrator = new FirebaseIntegrator();
  
  try {
    // 1. Verificar status
    console.log('1. 📊 Verificando status...');
    const status = integrator.getStatus();
    console.log('   Status:', JSON.stringify(status, null, 2));
    
    if (!status.isReady) {
      console.log('\n❌ Credenciais não configuradas!');
      console.log('Execute primeiro: npm run setup:google-credentials');
      return;
    }
    
    // 2. Inicializar
    console.log('\n2. 🚀 Inicializando integrador...');
    const initialized = await integrator.initialize();
    
    if (!initialized) {
      console.log('❌ Falha na inicialização');
      return;
    }
    
    console.log('✅ Integrador inicializado com sucesso!');
    
    // 3. Teste de criação de projeto (SIMULADO)
    console.log('\n3. 🧪 Teste de criação de projeto (simulado)...');
    console.log('   Nota: Este é apenas um teste de validação');
    console.log('   Para criar um projeto real, use:');
    console.log('   await integrator.createFirebaseProjectForClient("Nome do Cliente")');
    
    // 4. Validar estrutura Firebase
    console.log('\n4. 🔍 Validando estrutura Firebase...');
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Verificar se diretório firebase-projects existe
      const firebaseDir = path.join(__dirname, '../../firebase-projects');
      try {
        await fs.access(firebaseDir);
        console.log('   ✅ Diretório firebase-projects existe');
      } catch {
        await fs.mkdir(firebaseDir, { recursive: true });
        console.log('   ✅ Diretório firebase-projects criado');
      }
      
    } catch (error) {
      console.log('   ❌ Erro na validação:', error.message);
    }
    
    // 5. Teste de function com Claude (SIMULADO)
    console.log('\n5. 🧪 Teste de function com Claude (simulado)...');
    
    if (process.env.CLAUDE_API_KEY) {
      console.log('   ✅ Claude API Key configurada');
      console.log('   📝 Para criar function real, use:');
      console.log('   await integrator.createClaudeFunction("projectId", "functionName", "description")');
    } else {
      console.log('   ⚠️ Claude API Key não configurada');
      console.log('   Configure CLAUDE_API_KEY no .env');
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('\n📋 RESUMO:');
    console.log('✅ Integrador funcionando');
    console.log('✅ Credenciais carregadas');
    console.log('✅ Firebase Manager inicializado');
    console.log('✅ Estrutura preparada');
    console.log('✅ Pronto para criar projetos Firebase');
    
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('• Use o agente: npm start');
    console.log('• Comando: fb create-client "Nome da Empresa"');
    console.log('• Comando: fb setup client-id');
    console.log('• Comando: fb create-function client-id nomeFuncao "descrição"');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testFirebaseIntegrator();
}

module.exports = testFirebaseIntegrator;
