#!/usr/bin/env node

// 🔐 SCRIPT DE CONFIGURAÇÃO DE CREDENCIAIS
// Interface CLI para configurar credenciais Google Cloud de forma segura

const GoogleCloudIntegrator = require('../core/google-cloud-integrator');

async function main() {
  console.log('\n🚀 CONFIGURAÇÃO DE CREDENCIAIS GOOGLE CLOUD\n');
  
  const integrator = new GoogleCloudIntegrator();
  
  // Verificar status atual
  const status = integrator.getStatus();
  
  if (status.isReady) {
    console.log('✅ Credenciais Google Cloud já configuradas!');
    console.log('\nPara reconfigurar, remova as credenciais primeiro:');
    console.log('node scripts/remove-credentials.js');
    return;
  }

  console.log('🔧 Iniciando configuração de credenciais...\n');
  
  try {
    const success = await integrator.setupCredentials();
    
    if (success) {
      console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA!');
      console.log('✅ Credenciais Google Cloud configuradas com segurança');
      console.log('\nAgora você pode:');
      console.log('• Criar projetos Google Cloud automaticamente');
      console.log('• Ativar APIs necessárias');
      console.log('• Gerar Service Accounts para clientes');
      console.log('• Integrar serviços Google (Calendar, Gmail, Drive, etc.)');
      console.log('\nPróximos passos:');
      console.log('• Execute: node src/core/test-google-cloud-integrator.js');
      console.log('• Ou use o agente: node src/agents/ai-agent-advanced.js');
    } else {
      console.log('\n❌ Configuração cancelada ou falhou');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante configuração:', error.message);
  }
}

main().catch(console.error);
