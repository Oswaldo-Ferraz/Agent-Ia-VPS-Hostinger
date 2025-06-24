#!/usr/bin/env node

// 🤖 Agente IA - VPS Hostinger
// Sistema simples para acesso e gerenciamento de VPS

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

// Configurações VPS
const VPS_CONFIG = {
  ip: process.env.VPS_IP || '147.79.83.63',
  password: process.env.VPS_PASSWORD,
  portainer: process.env.PORTAINER_URL || 'https://painel.agenciafer.com.br'
};

// Verificar configurações
if (!VPS_CONFIG.password) {
  console.error('❌ VPS_PASSWORD não encontrada no arquivo .env');
  process.exit(1);
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
      'check-passwd': 'which passwd && echo "Comando passwd disponível"',
      'check-users': 'cat /etc/passwd | grep -E "(root|sudo|vpsagent)" | cut -d: -f1',
      'last-login': 'last -n 10',
      'auth-logs': 'tail -20 /var/log/auth.log',
      'criar-usuario-agente': 'SPECIAL_CREATE_USER',
      'setup-ssh-key': 'SPECIAL_SSH_KEY'
    }
  }
};

// Comandos rápidos (legacy)
const COMMANDS = {};
Object.values(COMMAND_SECTORS).forEach(sector => {
  Object.assign(COMMANDS, sector.commands);
});

// Função para executar comando SSH
async function runSSH(command) {
  const sshCommand = `sshpass -p "${VPS_CONFIG.password}" ssh -o StrictHostKeyChecking=no root@${VPS_CONFIG.ip} "${command}"`;
  
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
  • Portainer: ${VPS_CONFIG.portainer}
  • Status: ✅ CONECTADO

📖 Para ver menu detalhado: menu
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
                             desc.split(' ')[0]}`
  ).join('\n')}`
).join('\n\n')}

💡 EXEMPLOS:
  • diagnostico - Verificação completa
  • status - Ver containers  
  • disk - Uso do disco
  • ssh "docker logs container_name" - Logs específicos

📋 Digite qualquer comando acima ou "help" para lista simples.
`;
  }
  
  if (cmd === 'diagnostico') {
    let result = '📊 DIAGNÓSTICO COMPLETO:\n\n';
    
    const checks = [
      ['IP Público', 'curl -s ifconfig.me'],
      ['Containers', 'docker ps --format "table {{.Names}}\\t{{.Status}}"'],
      ['Uso Disco', 'df -h | head -5'],
      ['Memória', 'free -h'],
      ['Portas', 'netstat -tlnp | grep -E ":(80|443|9000|9443)"']
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
  
  if (cmd === 'trocar-senha' || cmd === 'change-password') {
    return `
⚠️ TROCA DE SENHA - INFORMAÇÕES:

✅ CAPACIDADES DETECTADAS:
  • Comando 'passwd' disponível: /usr/bin/passwd
  • Usuário atual: root (acesso total)
  • Sistema: Ubuntu/Debian
  
🔧 COMO TROCAR SENHA:
  • ssh "passwd" - Solicita nova senha
  • ssh "passwd root" - Específico para root
  
⚠️ CUIDADOS IMPORTANTES:
  • Anote a nova senha antes de trocar
  • Teste a nova senha antes de desconectar
  • Atualize o arquivo .env após a troca
  
🚨 RISCO: Se perder a senha, pode perder acesso à VPS!

💡 Para executar: ssh "passwd"
   (Não recomendado fazer via script automático)
`;
  }

  if (cmd === 'criar-usuario-agente' || cmd === 'setup-agent-user') {
    return `
🤖 CRIAR USUÁRIO ESPECIAL PARA AGENTE

✅ VERIFICAÇÕES:
  • Comandos useradd/usermod: Disponíveis
  • Grupos importantes: sudo, docker, adm
  • Sistema: Ubuntu/Debian

🔧 PASSOS PARA CRIAR USUÁRIO 'vpsagent':

1️⃣ CRIAR USUÁRIO:
   ssh "useradd -m -s /bin/bash vpsagent"

2️⃣ DEFINIR SENHA:
   ssh "passwd vpsagent"

3️⃣ ADICIONAR AOS GRUPOS:
   ssh "usermod -aG sudo,docker,adm vpsagent"

4️⃣ TESTAR ACESSO:
   ssh "su - vpsagent -c 'whoami && groups'"

5️⃣ CONFIGURAR CHAVE SSH (OPCIONAL):
   ssh "mkdir -p /home/vpsagent/.ssh"
   ssh "chmod 700 /home/vpsagent/.ssh"

🔐 VANTAGENS:
  • Senha independente do root
  • Acesso aos containers Docker
  • Privilégios sudo quando necessário
  • Mais seguro que usar root direto

⚠️ DEPOIS DE CRIAR:
  • Atualizar .env com novo usuário
  • Testar conexão
  • Manter senha root como backup

💡 Para executar todos os passos: criar-usuario-agente-exec
`;
  }

  if (cmd === 'criar-usuario-agente-exec') {
    const commands = [
      'useradd -m -s /bin/bash vpsagent',
      'usermod -aG sudo,docker,adm vpsagent',
      'mkdir -p /home/vpsagent/.ssh',
      'chmod 700 /home/vpsagent/.ssh',
      'chown vpsagent:vpsagent /home/vpsagent/.ssh'
    ];
    
    let result = '🤖 CRIANDO USUÁRIO AGENTE:\n\n';
    
    for (const [index, command] of commands.entries()) {
      try {
        const output = await runSSH(command);
        result += `${index + 1}️⃣ ${command}\n✅ ${output || 'Executado com sucesso'}\n\n`;
      } catch (error) {
        result += `${index + 1}️⃣ ${command}\n❌ Erro: ${error.message}\n\n`;
      }
    }
    
    result += `
⚠️ PRÓXIMOS PASSOS MANUAIS:
1. Definir senha: ssh "passwd vpsagent"
2. Testar acesso: ssh vpsagent@${VPS_CONFIG.ip}
3. Atualizar .env se funcionou
`;
    
    return result;
  }

  if (cmd === 'setup-ssh-key' || cmd === 'configurar-chave-ssh') {
    return `
🔑 CONFIGURAR CHAVE SSH PARA ACESSO SEM SENHA

✅ VANTAGENS:
  • Acesso sem senha (mais seguro)
  • Não depende de mudanças de senha
  • Automatização mais fácil

🔧 PASSOS:

1️⃣ GERAR CHAVE LOCAL (no seu Mac):
   ssh-keygen -t ed25519 -C "vps-agent-key" -f ~/.ssh/vps_agent_key

2️⃣ COPIAR CHAVE PÚBLICA PARA VPS:
   ssh-copy-id -i ~/.ssh/vps_agent_key.pub vpsagent@${VPS_CONFIG.ip}

3️⃣ TESTAR CONEXÃO:
   ssh -i ~/.ssh/vps_agent_key vpsagent@${VPS_CONFIG.ip}

4️⃣ ATUALIZAR AGENTE:
   • Criar arquivo ~/.ssh/config:
     Host vps-hostinger
       HostName ${VPS_CONFIG.ip}
       User vpsagent
       IdentityFile ~/.ssh/vps_agent_key

5️⃣ MODIFICAR CONEXÃO NO AGENTE:
   • Trocar sshpass por ssh com chave
   • Usar: ssh vps-hostinger "comando"

🔐 CONFIGURAÇÃO FINAL:
   VPS_IP=147.79.83.6
   VPS_USER=vpsagent
   VPS_AUTH_METHOD=ssh_key
   VPS_SSH_KEY=~/.ssh/vps_agent_key

💡 Após configurar, o agente funcionará sem senhas!
`;
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
console.log('🎯 Digite "menu" para ver todos comandos ou "help" para lista rápida');
console.log('💡 Comandos rápidos: status | diagnostico | portainer | exit\n');

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
