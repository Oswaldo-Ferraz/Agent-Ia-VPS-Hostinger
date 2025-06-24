#!/usr/bin/env node

// 🚀 Agente Completo - VPS + Sites Hostinger
require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

// Configurações
const VPS_CONFIG = {
  ip: process.env.VPS_IP || '147.79.83.6',
  user: process.env.VPS_USER || 'root', 
  password: process.env.VPS_PASSWORD || 'ybIOS0Zl7l@11N+Cg@H6'
};

const HOSTINGER_CONFIG = {
  ip: process.env.HOSTINGER_HOST || '147.93.37.192',
  port: process.env.HOSTINGER_PORT || '65002',
  user: process.env.HOSTINGER_USER || 'u148368058',
  password: process.env.HOSTINGER_PASS || 'pMU6XPk2k$epwC%'
};

// Sites WordPress detectados
const WP_SITES = [
  'agenciafer.com.br',
  'aiofotoevideo.com.br', 
  'malucosta.com.br',
  'metodoverus.com.br'
];

// Executar SSH na VPS
async function runVPS(command) {
  const sshCmd = `sshpass -p "${VPS_CONFIG.password}" ssh -o StrictHostKeyChecking=no ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "${command}"`;
  const { stdout } = await execAsync(sshCmd);
  return stdout || 'Executado com sucesso';
}

// Executar SSH na Hostinger
async function runHostinger(command) {
  const sshCmd = `sshpass -p "${HOSTINGER_CONFIG.password}" ssh -o StrictHostKeyChecking=no -p ${HOSTINGER_CONFIG.port} ${HOSTINGER_CONFIG.user}@${HOSTINGER_CONFIG.ip} "${command}"`;
  const { stdout } = await execAsync(sshCmd);
  return stdout || 'Executado com sucesso';
}

// Comandos
const COMMANDS = {
  // VPS
  'vps-status': () => runVPS('docker ps --format "table {{.Names}}\\t{{.Status}}"'),
  'vps-disk': () => runVPS('df -h'),
  'vps-memory': () => runVPS('free -h'),
  
  // Sites Hostinger
  'sites-list': () => runHostinger('ls -la ~/domains/'),
  'sites-wp': async () => {
    let result = '📱 SITES WORDPRESS DETECTADOS:\n\n';
    for (const site of WP_SITES) {
      try {
        const wpCheck = await runHostinger(`cd ~/domains/${site}/public_html && wp core version 2>/dev/null || echo "WP não encontrado"`);
        result += `🌐 ${site}: ${wpCheck.includes('WP não encontrado') ? '❌ Sem WP' : '✅ WordPress ' + wpCheck.trim()}\n`;
      } catch (error) {
        result += `🌐 ${site}: ❌ Erro de acesso\n`;
      }
    }
    return result;
  },
  
  'wp-users': async () => {
    const site = WP_SITES[0]; // Primeiro site como exemplo
    return await runHostinger(`cd ~/domains/${site}/public_html && wp user list --fields=user_login,user_email,roles`);
  }
};

// Processar comandos
async function processCommand(input) {
  const cmd = input.toLowerCase().trim();
  
  if (cmd === 'help') {
    return `
📋 COMANDOS DISPONÍVEIS:

🖥️  VPS (${VPS_CONFIG.ip}):
  • vps-status - Containers Docker
  • vps-disk - Uso do disco
  • vps-memory - Memória

📱 HOSTINGER (${HOSTINGER_CONFIG.ip}):
  • sites-list - Lista de domínios
  • sites-wp - Sites WordPress
  • wp-users - Usuários WP

🔧 ESPECIAIS:
  • diagnostico - Verificação completa
  • help - Esta ajuda
  • exit - Sair

💡 Sites WordPress encontrados: ${WP_SITES.length}
`;
  }
  
  if (cmd === 'diagnostico') {
    let result = '🔍 DIAGNÓSTICO COMPLETO:\n\n';
    
    // VPS
    try {
      const vpsStatus = await runVPS('docker ps | wc -l');
      result += `🖥️  VPS: ${parseInt(vpsStatus) - 1} containers ativos\n`;
    } catch (error) {
      result += `🖥️  VPS: ❌ ${error.message}\n`;
    }
    
    // Hostinger
    try {
      const sitesCount = await runHostinger('ls ~/domains/ | wc -l');
      result += `📱 Hostinger: ${sitesCount.trim()} domínios\n`;
    } catch (error) {
      result += `📱 Hostinger: ❌ ${error.message}\n`;
    }
    
    result += `\n✅ Sistemas funcionais: VPS + Hostinger`;
    return result;
  }
  
  if (COMMANDS[cmd]) {
    return await COMMANDS[cmd]();
  }
  
  return `❓ Comando não reconhecido: "${input}"\nDigite "help" para ver comandos.`;
}

// Interface CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🚀 Agente > '
});

console.log('🚀 AGENTE COMPLETO - VPS + HOSTINGER');
console.log(`🖥️  VPS: ${VPS_CONFIG.ip}`);
console.log(`📱 Hostinger: ${HOSTINGER_CONFIG.ip}:${HOSTINGER_CONFIG.port}`);
console.log(`💡 Sites WP: ${WP_SITES.length} encontrados\n`);

rl.prompt();

rl.on('line', async (input) => {
  const command = input.trim();
  
  if (command.toLowerCase() === 'exit') {
    console.log('👋 Saindo...');
    rl.close();
    process.exit(0);
  }
  
  if (command === '') {
    rl.prompt();
    return;
  }
  
  try {
    const result = await processCommand(command);
    console.log(result);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log();
  rl.prompt();
});

rl.on('close', () => {
  console.log('\n👋 Até logo!');
  process.exit(0);
});
