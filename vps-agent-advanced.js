#!/usr/bin/env node

// 🤖 Agente IA - VPS Hostinger (Versão com suporte SSH Key)
// Sistema simples para acesso e gerenciamento de VPS

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
  authMethod: process.env.VPS_AUTH_METHOD || 'password', // 'password' ou 'ssh_key'
  sshKey: process.env.VPS_SSH_KEY || '~/.ssh/vps_agent_key',
  portainer: process.env.PORTAINER_URL || 'https://painel.agenciafer.com.br'
};

// Verificar configurações
if (VPS_CONFIG.authMethod === 'password' && !VPS_CONFIG.password) {
  console.error('❌ VPS_PASSWORD não encontrada no arquivo .env');
  process.exit(1);
}

// Função para executar comando SSH (com suporte a chave SSH)
async function runSSH(command) {
  let sshCommand;
  
  if (VPS_CONFIG.authMethod === 'ssh_key') {
    sshCommand = `ssh -i ${VPS_CONFIG.sshKey} -o StrictHostKeyChecking=no ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "${command}"`;
  } else {
    sshCommand = `sshpass -p "${VPS_CONFIG.password}" ssh -o StrictHostKeyChecking=no ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "${command}"`;
  }
  
  try {
    console.log(`🔄 Executando: ${command}`);
    const { stdout, stderr } = await execAsync(sshCommand);
    
    if (stderr && !stderr.includes('Warning')) {
      console.log('⚠️ ', stderr);
    }
    
    return stdout || 'Comando executado com sucesso';
  } catch (error) {
    throw new Error(`SSH Error: ${error.message}`);
  }
}

// Comandos organizados por setores
const COMMAND_SECTORS = {
  'basico': {
    name: '🚀 BÁSICO',
    commands: {
      'status': 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
      'diagnostico': 'SPECIAL_DIAGNOSTICO',
      'portainer': 'SPECIAL_PORTAINER',
      'help': 'SPECIAL_HELP',
      'menu': 'SPECIAL_MENU'
    }
  },
  'docker': {
    name: '🐳 DOCKER',
    commands: {
      'containers': 'docker ps -a',
      'images': 'docker images',
      'cleanup': 'docker system prune -f',
      'restart-docker': 'systemctl restart docker'
    }
  },
  'sistema': {
    name: '💻 SISTEMA', 
    commands: {
      'disk': 'df -h',
      'memory': 'free -h',
      'cpu': 'top -bn1 | head -20',
      'ip': 'curl -s ifconfig.me',
      'ports': 'netstat -tlnp | grep -E ":(80|443|9000|9443)"',
      'logs': 'tail -20 /var/log/syslog'
    }
  },
  'seguranca': {
    name: '🔐 SEGURANÇA',
    commands: {
      'check-users': 'cat /etc/passwd | grep -E "(root|sudo|vpsagent)" | cut -d: -f1',
      'last-login': 'last -n 10',
      'auth-logs': 'tail -20 /var/log/auth.log',
      'setup-agent-user': 'SPECIAL_SETUP_USER',
      'setup-ssh-key': 'SPECIAL_SSH_KEY',
      'connection-info': 'SPECIAL_CONNECTION_INFO'
    }
  }
};

// Comandos rápidos (legacy)
const COMMANDS = {};
Object.values(COMMAND_SECTORS).forEach(sector => {
  Object.assign(COMMANDS, sector.commands);
});

// Processar comando do usuário
async function processCommand(input) {
  const cmd = input.toLowerCase().trim();
  
  // Comandos especiais
  if (cmd === 'help' || cmd === 'ajuda') {
    return `
📋 COMANDOS DISPONÍVEIS:

${Object.entries(COMMAND_SECTORS).map(([key, sector]) => 
  `${sector.name}:\n${Object.keys(sector.commands).map(c => `  • ${c}`).join('\n')}`
).join('\n\n')}

🔧 COMANDOS ESPECIAIS:
  • ssh [comando] - Executar comando personalizado
  • exit - Sair

🌐 VPS INFO:
  • IP: ${VPS_CONFIG.ip}
  • Usuário: ${VPS_CONFIG.user}
  • Autenticação: ${VPS_CONFIG.authMethod === 'ssh_key' ? '🔑 Chave SSH' : '🔒 Senha'}
  • Status: ✅ CONECTADO

📖 Para ver menu detalhado: menu
`;
  }

  if (cmd === 'connection-info' || cmd === 'info-conexao') {
    return `
🔗 INFORMAÇÕES DE CONEXÃO:

📡 CONFIGURAÇÃO ATUAL:
  • IP: ${VPS_CONFIG.ip}
  • Usuário: ${VPS_CONFIG.user}
  • Método: ${VPS_CONFIG.authMethod === 'ssh_key' ? '🔑 Chave SSH' : '🔒 Senha'}
  • Portainer: ${VPS_CONFIG.portainer}

${VPS_CONFIG.authMethod === 'ssh_key' ? 
`🔑 SSH KEY CONFIG:
  • Chave: ${VPS_CONFIG.sshKey}
  • Comando: ssh -i ${VPS_CONFIG.sshKey} ${VPS_CONFIG.user}@${VPS_CONFIG.ip}` :
`🔒 PASSWORD CONFIG:
  • Comando: sshpass ssh ${VPS_CONFIG.user}@${VPS_CONFIG.ip}`
}

💡 Para trocar método de autenticação:
  • Configurar chave SSH: setup-ssh-key
  • Criar usuário dedicado: setup-agent-user
`;
  }

  if (cmd === 'setup-agent-user') {
    return `
🤖 CONFIGURAR USUÁRIO DEDICADO PARA AGENTE

✅ VANTAGENS:
  • Senha independente do root
  • Acesso seguro aos containers
  • Não interfere com administração principal

🔧 COMANDOS PARA EXECUTAR:

1️⃣ CRIAR USUÁRIO:
   ssh "useradd -m -s /bin/bash vpsagent"

2️⃣ DEFINIR SENHA:
   ssh "passwd vpsagent"

3️⃣ ADICIONAR AOS GRUPOS NECESSÁRIOS:
   ssh "usermod -aG sudo,docker,adm vpsagent"

4️⃣ CRIAR DIRETÓRIO SSH:
   ssh "mkdir -p /home/vpsagent/.ssh && chmod 700 /home/vpsagent/.ssh"

5️⃣ TESTAR:
   ssh "su - vpsagent -c 'whoami && groups'"

📝 DEPOIS ATUALIZAR .env:
   VPS_USER=vpsagent
   VPS_PASSWORD=nova_senha_do_vpsagent

💡 Para executar automaticamente: ssh "useradd -m -s /bin/bash vpsagent && usermod -aG sudo,docker,adm vpsagent"
`;
  }

  if (cmd === 'setup-ssh-key') {
    return `
🔑 CONFIGURAR CHAVE SSH (ACESSO SEM SENHA)

✅ VANTAGENS:
  • Acesso automático sem senha
  • Mais seguro
  • Independente de mudanças de senha

🔧 PASSOS:

1️⃣ GERAR CHAVE (NO SEU MAC):
   ssh-keygen -t ed25519 -C "vps-agent" -f ~/.ssh/vps_agent_key

2️⃣ COPIAR PARA VPS:
   ssh-copy-id -i ~/.ssh/vps_agent_key.pub ${VPS_CONFIG.user}@${VPS_CONFIG.ip}

3️⃣ TESTAR:
   ssh -i ~/.ssh/vps_agent_key ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "whoami"

4️⃣ ATUALIZAR .env:
   VPS_AUTH_METHOD=ssh_key
   VPS_SSH_KEY=~/.ssh/vps_agent_key
   # Remover VPS_PASSWORD

5️⃣ REINICIAR AGENTE:
   npm start

💡 Após configurar, funcionará sem senhas!
`;
  }

  if (cmd === 'menu') {
    return `
🎯 MENU PRINCIPAL - VPS AGENT

${Object.entries(COMMAND_SECTORS).map(([key, sector]) => 
  `${sector.name}:\n${Object.entries(sector.commands).map(([cmd, desc]) => 
    `  ${cmd.padEnd(15)} - ${desc === 'SPECIAL_DIAGNOSTICO' ? 'Diagnóstico completo' : 
                             desc === 'SPECIAL_PORTAINER' ? 'Status Portainer' :
                             desc === 'SPECIAL_HELP' ? 'Lista comandos' :
                             desc === 'SPECIAL_MENU' ? 'Este menu' :
                             desc === 'SPECIAL_SETUP_USER' ? 'Criar usuário dedicado' :
                             desc === 'SPECIAL_SSH_KEY' ? 'Configurar chave SSH' :
                             desc === 'SPECIAL_CONNECTION_INFO' ? 'Info da conexão' :
                             desc.split(' ')[0]}`
  ).join('\n')}`
).join('\n\n')}

💡 EXEMPLOS:
  • diagnostico - Verificação completa
  • setup-agent-user - Criar usuário dedicado
  • setup-ssh-key - Configurar acesso sem senha
  • connection-info - Ver configuração atual

📋 Digite qualquer comando acima ou "help" para lista simples.
`;
  }
  
  if (cmd === 'diagnostico') {
    let result = '📊 DIAGNÓSTICO COMPLETO:\n\n';
    
    const checks = [
      ['🌐 IP Público', 'curl -s ifconfig.me'],
      ['🐳 Containers', 'docker ps --format "table {{.Names}}\\t{{.Status}}"'],
      ['💾 Disco', 'df -h | head -5'],
      ['🧠 Memória', 'free -h'],
      ['🔌 Portas', 'netstat -tlnp | grep -E ":(80|443|9000|9443)"']
    ];
    
    for (const [name, command] of checks) {
      try {
        const output = await runSSH(command);
        result += `${name}:\n${output}\n\n`;
      } catch (error) {
        result += `${name}: ❌ ${error.message}\n\n`;
      }
    }
    
    return result;
  }
  
  if (cmd === 'portainer') {
    try {
      const result = await runSSH('curl -s -o /dev/null -w "%{http_code}" -k https://localhost:9443');
      return result === '200' ? '✅ Portainer está funcionando' : `⚠️ Portainer retornou: ${result}`;
    } catch (error) {
      return `❌ Erro ao verificar Portainer: ${error.message}`;
    }
  }
  
  // Comandos predefinidos
  if (COMMANDS[cmd]) {
    return await runSSH(COMMANDS[cmd]);
  }
  
  // Comando personalizado
  if (cmd.startsWith('ssh ')) {
    const customCmd = cmd.replace('ssh ', '');
    return await runSSH(customCmd);
  }
  
  return `❓ Comando não reconhecido: "${input}"\nDigite "help" para ver comandos disponíveis.`;
}

// Interface CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🤖 VPS > '
});

console.log('🚀 Agente IA - VPS Hostinger');
console.log('📡 Conectado em:', VPS_CONFIG.ip);
console.log('👤 Usuário:', VPS_CONFIG.user);
console.log('🔐 Autenticação:', VPS_CONFIG.authMethod === 'ssh_key' ? '🔑 Chave SSH' : '🔒 Senha');
console.log('🎯 Digite "menu" para ver todos comandos ou "help" para lista rápida');
console.log('💡 Comandos rápidos: status | diagnostico | setup-agent-user | exit\n');

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

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não tratado:', error.message);
});
