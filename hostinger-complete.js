#!/usr/bin/env node

// 🤖 Agente IA - Hostinger Complete
// Sistema completo para gerenciar VPS + Sites da Hospedagem

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

// Configurações VPS
const VPS_CONFIG = {
  ip: process.env.VPS_IP || '147.79.83.6',
  user: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD,
  authMethod: process.env.VPS_AUTH_METHOD || 'password',
  sshKey: process.env.VPS_SSH_KEY || '~/.ssh/vps_agent_key',
  portainer: process.env.PORTAINER_URL || 'https://painel.agenciafer.com.br'
};

// Configurações Hospedagem
const HOSTING_CONFIG = {
  ip: process.env.HOSTINGER_HOST || '147.93.37.192',
  port: process.env.HOSTINGER_PORT || '65002',
  user: process.env.HOSTINGER_USER || 'u148368058',
  password: process.env.HOSTINGER_PASS || 'pMU6XPk2k$epwC%'
};

// Função para executar comando SSH na VPS
async function runVPS(command) {
  let sshCommand;
  
  if (VPS_CONFIG.authMethod === 'ssh_key') {
    sshCommand = `ssh -i ${VPS_CONFIG.sshKey} -o StrictHostKeyChecking=no ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "${command}"`;
  } else {
    sshCommand = `sshpass -p "${VPS_CONFIG.password}" ssh -o StrictHostKeyChecking=no ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "${command}"`;
  }
  
  try {
    console.log(`🔄 [VPS] Executando: ${command}`);
    const { stdout, stderr } = await execAsync(sshCommand);
    if (stderr && !stderr.includes('Warning')) console.log('⚠️ ', stderr);
    return stdout || 'Comando executado com sucesso';
  } catch (error) {
    throw new Error(`VPS SSH Error: ${error.message}`);
  }
}

// Função para executar comando SSH na Hospedagem
async function runHosting(command) {
  const sshCommand = `sshpass -p "${HOSTING_CONFIG.password}" ssh -o StrictHostKeyChecking=no -p ${HOSTING_CONFIG.port} ${HOSTING_CONFIG.user}@${HOSTING_CONFIG.ip} "${command}"`;
  
  try {
    console.log(`🔄 [HOSTING] Executando: ${command}`);
    const { stdout, stderr } = await execAsync(sshCommand);
    if (stderr && !stderr.includes('Warning')) console.log('⚠️ ', stderr);
    return stdout || 'Comando executado com sucesso';
  } catch (error) {
    throw new Error(`Hosting SSH Error: ${error.message}`);
  }
}

// Comandos organizados por setores
const COMMAND_SECTORS = {
  'vps': {
    name: '🖥️ VPS MANAGEMENT',
    commands: {
      'vps-status': 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
      'vps-containers': 'docker ps -a',
      'vps-disk': 'df -h',
      'vps-memory': 'free -h',
      'vps-portainer': 'SPECIAL_VPS_PORTAINER',
      'vps-diagnostico': 'SPECIAL_VPS_DIAGNOSTICO'
    }
  },
  'sites': {
    name: '🌐 SITES MANAGEMENT',
    commands: {
      'sites-list': 'ls -la domains/',
      'sites-info': 'SPECIAL_SITES_INFO',
      'sites-wp-status': 'SPECIAL_WP_STATUS',
      'sites-logs': 'tail -20 error_log',
      'sites-backup': 'SPECIAL_SITES_BACKUP'
    }
  },
  'wordpress': {
    name: '📝 WORDPRESS MANAGEMENT',
    commands: {
      'wp-sites': 'SPECIAL_WP_SITES',
      'wp-users': 'SPECIAL_WP_USERS',
      'wp-plugins': 'SPECIAL_WP_PLUGINS',
      'wp-themes': 'SPECIAL_WP_THEMES',
      'wp-posts': 'SPECIAL_WP_POSTS',
      'wp-update': 'SPECIAL_WP_UPDATE'
    }
  },
  'sistema': {
    name: '💻 SISTEMA',
    commands: {
      'help': 'SPECIAL_HELP',
      'menu': 'SPECIAL_MENU',
      'connection-info': 'SPECIAL_CONNECTION_INFO',
      'test-connections': 'SPECIAL_TEST_CONNECTIONS'
    }
  }
};

// Sites detectados
const SITES = [
  'agenciafer.com.br',
  'aiofotoevideo.com',
  'aiofotoevideo.com.br',
  'fenixinfinity.com.br',
  'malucosta.com.br',
  'metodoverus.com.br'
];

// Processar comandos especiais
async function processSpecialCommand(cmd) {
  if (cmd === 'connection-info') {
    return `
🔗 INFORMAÇÕES DE CONEXÃO:

🖥️ VPS:
  • IP: ${VPS_CONFIG.ip}
  • Usuário: ${VPS_CONFIG.user}
  • Método: ${VPS_CONFIG.authMethod === 'ssh_key' ? '🔑 Chave SSH' : '🔒 Senha'}
  • Portainer: ${VPS_CONFIG.portainer}

🌐 HOSPEDAGEM:
  • IP: ${HOSTING_CONFIG.ip}
  • Porta: ${HOSTING_CONFIG.port}
  • Usuário: ${HOSTING_CONFIG.user}
  • Sites: ${SITES.length} detectados

📋 SITES DISPONÍVEIS:
${SITES.map(site => `  • ${site}`).join('\n')}
`;
  }

  if (cmd === 'test-connections') {
    let result = '🧪 TESTANDO CONEXÕES:\n\n';
    
    try {
      const vpsTest = await runVPS('whoami');
      result += `✅ VPS: Conectado como ${vpsTest.trim()}\n`;
    } catch (error) {
      result += `❌ VPS: ${error.message}\n`;
    }
    
    try {
      const hostingTest = await runHosting('whoami');
      result += `✅ HOSPEDAGEM: Conectado como ${hostingTest.trim()}\n`;
    } catch (error) {
      result += `❌ HOSPEDAGEM: ${error.message}\n`;
    }
    
    return result;
  }

  if (cmd === 'sites-info') {
    try {
      const sitesData = await runHosting('ls -la domains/');
      return `📂 ESTRUTURA DOS SITES:\n\n${sitesData}`;
    } catch (error) {
      return `❌ Erro ao listar sites: ${error.message}`;
    }
  }

  if (cmd === 'wp-sites') {
    let result = '📝 STATUS WORDPRESS DOS SITES:\n\n';
    
    for (const site of SITES) {
      try {
        const wpVersion = await runHosting(`cd domains/${site}/public_html && wp core version 2>/dev/null || echo "Não é WordPress"`);
        result += `🌐 ${site}: WordPress ${wpVersion.trim()}\n`;
      } catch (error) {
        result += `🌐 ${site}: Erro ao verificar\n`;
      }
    }
    
    return result;
  }

  if (cmd === 'wp-users') {
    const site = await askSite();
    if (!site) return '❌ Site não especificado';
    
    try {
      const users = await runHosting(`cd domains/${site}/public_html && wp user list --format=table 2>/dev/null || echo "Erro ou não é WordPress"`);
      return `👥 USUÁRIOS DO SITE ${site}:\n\n${users}`;
    } catch (error) {
      return `❌ Erro ao listar usuários: ${error.message}`;
    }
  }

  if (cmd === 'wp-plugins') {
    const site = await askSite();
    if (!site) return '❌ Site não especificado';
    
    try {
      const plugins = await runHosting(`cd domains/${site}/public_html && wp plugin list --format=table 2>/dev/null || echo "Erro ou não é WordPress"`);
      return `🔌 PLUGINS DO SITE ${site}:\n\n${plugins}`;
    } catch (error) {
      return `❌ Erro ao listar plugins: ${error.message}`;
    }
  }

  if (cmd === 'vps-diagnostico') {
    let result = '📊 DIAGNÓSTICO VPS:\n\n';
    
    const checks = [
      ['🌐 IP Público', 'curl -s ifconfig.me'],
      ['🐳 Containers', 'docker ps --format "table {{.Names}}\\t{{.Status}}"'],
      ['💾 Disco', 'df -h | head -5'],
      ['🧠 Memória', 'free -h']
    ];
    
    for (const [name, command] of checks) {
      try {
        const output = await runVPS(command);
        result += `${name}:\n${output}\n\n`;
      } catch (error) {
        result += `${name}: ❌ ${error.message}\n\n`;
      }
    }
    
    return result;
  }

  return null;
}

// Função para perguntar qual site
async function askSite() {
  return new Promise((resolve) => {
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n📋 SITES DISPONÍVEIS:');
    SITES.forEach((site, index) => console.log(`${index + 1}. ${site}`));
    
    rl2.question('\n🌐 Digite o número ou nome do site: ', (answer) => {
      rl2.close();
      const index = parseInt(answer) - 1;
      resolve(SITES[index] || answer.trim());
    });
  });
}

// Processar comando do usuário
async function processCommand(input) {
  const cmd = input.toLowerCase().trim();
  
  // Comandos especiais
  const specialResult = await processSpecialCommand(cmd);
  if (specialResult) return specialResult;
  
  if (cmd === 'help' || cmd === 'ajuda') {
    return `
📋 AGENTE HOSTINGER COMPLETE

${Object.entries(COMMAND_SECTORS).map(([key, sector]) => 
  `${sector.name}:\n${Object.keys(sector.commands).map(c => `  • ${c}`).join('\n')}`
).join('\n\n')}

🔧 COMANDOS PERSONALIZADOS:
  • vps [comando] - Executar comando na VPS
  • hosting [comando] - Executar comando na hospedagem
  • wp [site] [comando] - Executar WP-CLI em site específico
  • exit - Sair

💡 Para ver menu detalhado: menu
`;
  }

  if (cmd === 'menu') {
    return `
🎯 MENU PRINCIPAL - HOSTINGER COMPLETE

🖥️ VPS MANAGEMENT:
  vps-status       - Status containers Docker
  vps-diagnostico  - Diagnóstico completo VPS
  vps-portainer    - Status Portainer

🌐 SITES MANAGEMENT:
  sites-list       - Listar todos os sites
  sites-info       - Informações detalhadas
  sites-logs       - Logs de erro

📝 WORDPRESS MANAGEMENT:
  wp-sites         - Status WordPress de todos sites
  wp-users         - Usuários de um site
  wp-plugins       - Plugins de um site
  wp-themes        - Temas de um site

💻 SISTEMA:
  connection-info  - Info das conexões
  test-connections - Testar VPS + Hospedagem
  help            - Lista de comandos

💡 EXEMPLOS:
  • vps-diagnostico
  • wp-sites
  • hosting "ls domains/"
  • vps "docker ps"
`;
  }
  
  // Comandos VPS
  if (cmd.startsWith('vps ')) {
    const vpsCmd = cmd.replace('vps ', '');
    return await runVPS(vpsCmd);
  }
  
  // Comandos Hospedagem
  if (cmd.startsWith('hosting ')) {
    const hostingCmd = cmd.replace('hosting ', '');
    return await runHosting(hostingCmd);
  }
  
  // Comandos WordPress específicos
  if (cmd.startsWith('wp ')) {
    const wpParts = cmd.split(' ');
    if (wpParts.length < 3) {
      return `❓ Uso: wp [site] [comando]\nExemplo: wp aiofotoevideo.com.br "user list"`;
    }
    const site = wpParts[1];
    const wpCmd = wpParts.slice(2).join(' ');
    const fullCmd = `cd domains/${site}/public_html && wp ${wpCmd}`;
    return await runHosting(fullCmd);
  }
  
  // Comandos predefinidos VPS
  const vpsCommands = COMMAND_SECTORS.vps.commands;
  if (vpsCommands[cmd]) {
    if (cmd === 'vps-portainer') {
      try {
        const result = await runVPS('curl -s -o /dev/null -w "%{http_code}" -k https://localhost:9443');
        return result === '200' ? '✅ Portainer está funcionando' : `⚠️ Portainer retornou: ${result}`;
      } catch (error) {
        return `❌ Erro ao verificar Portainer: ${error.message}`;
      }
    }
    return await runVPS(vpsCommands[cmd]);
  }
  
  // Comandos predefinidos Hospedagem
  const sitesCommands = COMMAND_SECTORS.sites.commands;
  if (sitesCommands[cmd]) {
    return await runHosting(sitesCommands[cmd]);
  }
  
  return `❓ Comando não reconhecido: "${input}"\nDigite "help" para ver comandos disponíveis.`;
}

// Interface CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🚀 HOSTINGER > '
});

console.log('🌟 AGENTE HOSTINGER COMPLETE');
console.log('🖥️ VPS:', VPS_CONFIG.ip);
console.log('🌐 Hospedagem:', HOSTING_CONFIG.ip);
console.log('📋 Sites detectados:', SITES.length);
console.log('💡 Digite "test-connections" para testar ou "menu" para ver comandos\n');

rl.prompt();

rl.on('line', async (input) => {
  const command = input.trim();
  
  if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
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

process.on('uncaughtException', (error) => {
  console.error('❌ Erro não tratado:', error.message);
});
