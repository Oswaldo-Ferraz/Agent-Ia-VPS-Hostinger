#!/usr/bin/env node

// 🎨 WordPress Manager - Ferramenta Completa para Gerenciamento
require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

// Configurações
const HOSTINGER_CONFIG = {
  ip: process.env.HOSTINGER_HOST || '147.93.37.192',
  port: process.env.HOSTINGER_PORT || '65002',
  user: process.env.HOSTINGER_USER || 'u148368058',
  password: process.env.HOSTINGER_PASS || 'pMU6XPk2k$epwC%'
};

// Sites WordPress
const WP_SITES = [
  'agenciafer.com.br',
  'aiofotoevideo.com.br', 
  'malucosta.com.br',
  'metodoverus.com.br'
];

// Executar comando SSH
async function runWordPress(site, command) {
  const sshCmd = `sshpass -p "${HOSTINGER_CONFIG.password}" ssh -o StrictHostKeyChecking=no -p ${HOSTINGER_CONFIG.port} ${HOSTINGER_CONFIG.user}@${HOSTINGER_CONFIG.ip} 'cd domains/${site}/public_html && ${command}'`;
  try {
    const { stdout } = await execAsync(sshCmd);
    return stdout || 'Comando executado com sucesso';
  } catch (error) {
    throw new Error(`Erro: ${error.message}`);
  }
}

// Selecionar site
async function selectSite() {
  console.log('\n🌐 SELECIONE O SITE:');
  WP_SITES.forEach((site, index) => {
    console.log(`${index + 1}. ${site}`);
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('\nDigite o número do site: ', (answer) => {
      rl.close();
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < WP_SITES.length) {
        resolve(WP_SITES[index]);
      } else {
        console.log('❌ Seleção inválida');
        process.exit(1);
      }
    });
  });
}

// Comandos WordPress
const WP_COMMANDS = {
  // 1. INFORMAÇÕES BÁSICAS
  'info': 'wp core version && echo "---" && wp option get blogname && wp option get blogdescription',
  'status': 'wp core check-update && wp plugin status && wp theme status',
  
  // 2. CONTEÚDO
  'posts': 'wp post list --format=table',
  'pages': 'wp post list --post_type=page --format=table',
  'create-post': 'wp post create --post_title="Novo Post $(date)" --post_content="Conteúdo criado via terminal" --post_status=publish',
  'create-page': 'wp post create --post_type=page --post_title="Nova Página $(date)" --post_content="Conteúdo da página" --post_status=publish',
  
  // 3. TEMAS
  'themes': 'wp theme list',
  'active-theme': 'wp theme list --status=active',
  
  // 4. PLUGINS  
  'plugins': 'wp plugin list',
  'install-seo': 'wp plugin install wordpress-seo --activate',
  'install-security': 'wp plugin install wordfence --activate',
  'install-backup': 'wp plugin install updraftplus --activate',
  
  // 5. USUÁRIOS
  'users': 'wp user list --format=table',
  
  // 6. ATUALIZAÇÕES
  'update-all': 'wp core update && wp plugin update --all && wp theme update --all',
  'update-core': 'wp core update',
  
  // 7. SEO
  'seo-permalinks': 'wp rewrite structure "/%postname%/" && wp rewrite flush',
  
  // 8. BACKUP
  'backup-db': 'wp db export backup-$(date +%Y%m%d-%H%M%S).sql',
  
  // 9. CONFIGURAÇÕES
  'set-title': null, // Será tratado especialmente
  'set-description': null, // Será tratado especialmente
};

// Processar comandos
async function processCommand() {
  const command = process.argv[2];
  
  if (!command) {
    console.log(`
🎨 WORDPRESS MANAGER - Comandos Disponíveis:

📊 INFORMAÇÕES:
  info           - Versão e configurações básicas
  status         - Status de atualizações
  users          - Lista de usuários

📝 CONTEÚDO:
  posts          - Lista de posts
  pages          - Lista de páginas
  create-post    - Criar novo post
  create-page    - Criar nova página

🎨 TEMAS & PLUGINS:
  themes         - Lista de temas
  active-theme   - Tema ativo
  plugins        - Lista de plugins
  install-seo    - Instalar Yoast SEO
  install-security - Instalar Wordfence
  install-backup - Instalar UpdraftPlus

🔄 ATUALIZAÇÕES:
  update-all     - Atualizar tudo
  update-core    - Atualizar WordPress

🔧 CONFIGURAÇÕES:
  seo-permalinks - Configurar permalinks SEO
  backup-db      - Backup do banco de dados

💡 USO: node wp-manager.js [comando]
`);
    return;
  }
  
  const site = await selectSite();
  console.log(`\n🌐 Site selecionado: ${site}`);
  
  // Comandos especiais
  if (command === 'set-title') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Digite o novo título do site: ', async (title) => {
      rl.close();
      try {
        const result = await runWordPress(site, `wp option update blogname "${title}"`);
        console.log(`✅ Título alterado para: ${title}`);
      } catch (error) {
        console.error('❌', error.message);
      }
    });
    return;
  }
  
  if (command === 'set-description') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Digite a nova descrição do site: ', async (description) => {
      rl.close();
      try {
        const result = await runWordPress(site, `wp option update blogdescription "${description}"`);
        console.log(`✅ Descrição alterada para: ${description}`);
      } catch (error) {
        console.error('❌', error.message);
      }
    });
    return;
  }
  
  // Comandos normais
  if (WP_COMMANDS[command]) {
    try {
      console.log(`\n🔄 Executando: ${command}...`);
      const result = await runWordPress(site, WP_COMMANDS[command]);
      console.log('\n📊 RESULTADO:');
      console.log(result);
    } catch (error) {
      console.error('\n❌ ERRO:', error.message);
    }
  } else {
    console.log(`❌ Comando não encontrado: ${command}`);
    console.log('💡 Use: node wp-manager.js para ver comandos disponíveis');
  }
}

// Executar
processCommand();
