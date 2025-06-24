#!/usr/bin/env node

// 🗑️ SCRIPT PARA REMOVER CREDENCIAIS
// Remove credenciais para permitir reconfiguração

const CredentialsManager = require('../src/core/credentials-manager');
const readline = require('readline');

async function main() {
  console.log('\n🗑️ REMOÇÃO DE CREDENCIAIS\n');
  
  const credentialsManager = new CredentialsManager();
  const types = credentialsManager.listCredentialTypes();
  
  if (types.length === 0) {
    console.log('❌ Nenhuma credencial encontrada');
    return;
  }
  
  console.log('📋 Credenciais disponíveis:');
  types.forEach((type, index) => {
    console.log(`${index + 1}. ${type}`);
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\nSelecione o número da credencial para remover (ou "all" para todas): ', (answer) => {
    if (answer.toLowerCase() === 'all') {
      console.log('\n⚠️ ATENÇÃO: Isso irá remover TODAS as credenciais!');
      rl.question('Digite "CONFIRMAR" para continuar: ', (confirm) => {
        if (confirm === 'CONFIRMAR') {
          types.forEach(type => {
            credentialsManager.removeCredentials(type);
          });
          console.log('\n✅ Todas as credenciais removidas!');
        } else {
          console.log('\n❌ Operação cancelada');
        }
        rl.close();
      });
    } else {
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < types.length) {
        const type = types[index];
        credentialsManager.removeCredentials(type);
        console.log(`\n✅ Credenciais ${type} removidas!`);
      } else {
        console.log('\n❌ Seleção inválida');
      }
      rl.close();
    }
  });
}

main().catch(console.error);
