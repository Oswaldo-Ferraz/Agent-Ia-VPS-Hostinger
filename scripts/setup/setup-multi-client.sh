#!/bin/bash

# 🏢 SETUP SISTEMA MULTI-CLIENTE
# Configuração inicial para gestão de múltiplos clientes

echo "🏢 CONFIGURANDO SISTEMA MULTI-CLIENTE"
echo "===================================="

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado. Instale Node.js primeiro."
    exit 1
fi

log_success "Node.js encontrado: $(node --version)"

# Verificar dependências
log_info "Verificando dependências..."

if [ -f "package.json" ]; then
    npm install
    log_success "Dependências instaladas"
else
    log_error "package.json não encontrado"
    exit 1
fi

# Criar diretórios necessários
log_info "Criando estrutura de diretórios..."

mkdir -p config/clients
mkdir -p config/credentials
mkdir -p config/settings
mkdir -p logs
mkdir -p backups
mkdir -p src/cli
mkdir -p src/connectors
mkdir -p src/templates
mkdir -p src/prompts

log_success "Diretórios criados"

# Configurar permissões de segurança
log_info "Configurando permissões de segurança..."

chmod 700 config/credentials
chmod 700 config/clients
chmod 600 config/credentials/* 2>/dev/null || true
chmod 600 config/clients/* 2>/dev/null || true

log_success "Permissões configuradas"

# Gerar chave mestra de criptografia
log_info "Gerando chave mestra de criptografia..."

node -e "
const CredentialManager = require('./src/security/credential-manager');
const credManager = new CredentialManager();
credManager.generateMasterKey().then(() => {
    console.log('🔑 Chave mestra gerada com sucesso');
}).catch(err => {
    console.error('❌ Erro ao gerar chave:', err.message);
    process.exit(1);
});
"

# Criar configuração inicial do sistema
log_info "Criando configuração inicial..."

cat > config/settings/system-config.json << EOF
{
  "version": "2.0.0",
  "multi_client": {
    "enabled": true,
    "max_clients": 100,
    "default_language": "pt-BR",
    "default_timezone": "America/Sao_Paulo",
    "default_currency": "BRL"
  },
  "security": {
    "encryption_algorithm": "aes-256-gcm",
    "key_rotation_days": 90,
    "audit_enabled": true,
    "backup_retention_days": 30
  },
  "integrations": {
    "supported_services": [
      "google",
      "stripe",
      "whatsapp",
      "mailgun",
      "twillio",
      "hubspot",
      "rdstation"
    ]
  },
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
}
EOF

log_success "Configuração do sistema criada"

# Criar configuração de IA
cat > config/settings/ai-config.json << EOF
{
  "dual_ai": {
    "enabled": true,
    "default_choice": "auto",
    "claude": {
      "model": "claude-3-5-sonnet-20241022",
      "max_tokens": 4000,
      "use_for": ["code", "system", "plugin", "integration", "architecture"]
    },
    "openai": {
      "model": "gpt-4-turbo-preview", 
      "max_tokens": 4000,
      "use_for": ["content", "text", "copy", "blog", "marketing"]
    }
  },
  "prompts": {
    "contextual": true,
    "client_specific": true,
    "auto_inject_credentials": false
  }
}
EOF

log_success "Configuração de IA criada"

# Testar sistema
log_info "Testando sistema multi-cliente..."

node -e "
const MultiClientSystem = require('./src/core/multi-client-system');
const system = new MultiClientSystem();

async function testSystem() {
    try {
        // Testar se consegue inicializar
        const report = await system.getSystemReport();
        console.log('✅ Sistema multi-cliente funcionando');
        console.log('📊 Clientes configurados:', report.clients.total_clients);
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        process.exit(1);
    }
}

testSystem();
"

# Criar exemplo de cliente
log_info "Criando cliente de exemplo..."

node -e "
const MultiClientSystem = require('./src/core/multi-client-system');
const system = new MultiClientSystem();

async function createExampleClient() {
    try {
        const client = await system.createClientWithCredentials({
            name: 'Cliente Exemplo',
            email: 'exemplo@email.com',
            company: 'Empresa Exemplo Ltda',
            sites: ['exemplo.com.br'],
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            currency: 'BRL'
        });
        
        console.log('✅ Cliente exemplo criado:', client.name);
        console.log('🆔 ID:', client.id);
        
    } catch (error) {
        console.error('❌ Erro ao criar cliente exemplo:', error.message);
    }
}

createExampleClient();
"

# Criar script de comando rápido
log_info "Criando comandos rápidos..."

cat > scripts/client-cli.sh << 'EOF'
#!/bin/bash

# Script para comandos rápidos do sistema multi-cliente

case "$1" in
    "list")
        node -e "
        const MultiClientSystem = require('./src/core/multi-client-system');
        const system = new MultiClientSystem();
        system.listClientsWithIntegrations().then(clients => {
            console.log('📋 CLIENTES CONFIGURADOS:');
            clients.forEach(client => {
                console.log(\`  • \${client.name} (\${client.sites.length} sites, \${client.integration_count} integrações)\`);
            });
        });
        "
        ;;
    "stats")
        node -e "
        const MultiClientSystem = require('./src/core/multi-client-system');
        const system = new MultiClientSystem();
        system.getSystemReport().then(report => {
            console.log('📊 ESTATÍSTICAS DO SISTEMA:');
            console.log('Total de clientes:', report.clients.total_clients);
            console.log('Clientes ativos:', report.clients.active_clients);
            console.log('Total de sites:', report.clients.total_sites);
            console.log('Cobertura de credenciais:', report.health.coverage_percentage + '%');
        });
        "
        ;;
    "backup")
        node -e "
        const MultiClientSystem = require('./src/core/multi-client-system');
        const system = new MultiClientSystem();
        system.backupSystem().then(result => {
            console.log('💾 Backup realizado:', result.timestamp);
        });
        "
        ;;
    *)
        echo "Uso: $0 {list|stats|backup}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  list   - Listar todos os clientes"
        echo "  stats  - Mostrar estatísticas do sistema" 
        echo "  backup - Fazer backup completo"
        ;;
esac
EOF

chmod +x scripts/client-cli.sh

log_success "Comandos rápidos criados"

# Atualizar package.json com novos scripts
log_info "Atualizando package.json..."

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
    ...pkg.scripts,
    'client': 'node src/core/multi-client-system.js',
    'client-test': 'node src/core/client-manager.js',
    'cred-test': 'node src/security/credential-manager.js',
    'client-list': './scripts/client-cli.sh list',
    'client-stats': './scripts/client-cli.sh stats',
    'client-backup': './scripts/client-cli.sh backup'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Scripts adicionados ao package.json');
"

# Resumo final
echo ""
log_success "🎉 SISTEMA MULTI-CLIENTE CONFIGURADO COM SUCESSO!"
echo ""
echo "📋 COMANDOS DISPONÍVEIS:"
echo "  npm run client         - Demonstração completa"
echo "  npm run client-test    - Testar ClientManager"
echo "  npm run cred-test      - Testar CredentialManager"
echo "  npm run client-list    - Listar clientes"
echo "  npm run client-stats   - Estatísticas do sistema"
echo "  npm run client-backup  - Backup completo"
echo ""
echo "📁 ARQUIVOS CRIADOS:"
echo "  config/clients/        - Dados dos clientes"
echo "  config/credentials/    - Credenciais criptografadas"
echo "  config/settings/       - Configurações do sistema"
echo "  src/core/             - Sistema multi-cliente"
echo "  src/security/         - Gerenciamento de credenciais"
echo ""
log_info "Use 'npm run client' para ver uma demonstração completa!"

exit 0
