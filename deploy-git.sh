#!/bin/bash

# 🚀 Deploy Bot WhatsApp via Git
# Este script automatiza o deploy usando Git + Docker
# Autor: Assistant
# Data: 2025-06-14

set -e

# Configurações (CONFIGURE AQUI)
PROJECT_NAME="bot-whatsapp"
REPO_URL="https://github.com/seu-usuario/bot-whatsapp.git"  # ⚠️ ALTERE AQUI
BRANCH="main"
DEPLOY_PATH="/opt/deployments/$PROJECT_NAME"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Banner
echo "🚀 Bot WhatsApp - Deploy via Git"
echo "=================================="
echo ""

# Verificar se git está instalado
if ! command -v git &> /dev/null; then
    print_error "Git não está instalado!"
    exit 1
fi

# Verificar se docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker não está instalado!"
    exit 1
fi

# Verificar se é primeira execução ou atualização
if [ -d "$DEPLOY_PATH" ]; then
    print_step "Atualizando repositório existente..."
    cd $DEPLOY_PATH
    
    # Verificar se há mudanças locais
    if ! git diff --quiet; then
        print_warning "Há mudanças locais não commitadas!"
        echo "Fazendo stash das mudanças..."
        git stash
    fi
    
    # Fazer pull das últimas mudanças
    git fetch origin
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    
    if [ $LOCAL = $REMOTE ]; then
        print_warning "Repositório já está atualizado!"
        echo "Deseja rebuildar a imagem mesmo assim? (y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_success "Deploy cancelado pelo usuário"
            exit 0
        fi
    else
        print_step "Novas mudanças encontradas, fazendo pull..."
        git pull origin $BRANCH
        print_success "Repositório atualizado"
    fi
    
else
    print_step "Primeira execução - clonando repositório..."
    
    # Criar diretório se não existir
    sudo mkdir -p $(dirname $DEPLOY_PATH)
    sudo chown $USER:$USER $(dirname $DEPLOY_PATH)
    
    # Clonar repositório
    git clone $REPO_URL $DEPLOY_PATH
    cd $DEPLOY_PATH
    
    print_success "Repositório clonado com sucesso"
fi

# Mostrar informações do commit atual
print_step "Informações da versão atual:"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git log -1 --format="%h - %s (%an, %ar)")"
echo ""

# Verificar se existe Dockerfile
if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile não encontrado no repositório!"
    exit 1
fi

# Build da imagem Docker
print_step "Construindo imagem Docker..."

# Parar container se estiver rodando
if docker ps | grep -q "$PROJECT_NAME-prod"; then
    print_step "Parando container existente..."
    docker stop "$PROJECT_NAME-prod" || true
fi

# Build da nova imagem
docker build -t $PROJECT_NAME:latest . --no-cache

# Verificar se build foi bem-sucedido
if [ $? -eq 0 ]; then
    print_success "Imagem construída com sucesso"
else
    print_error "Erro no build da imagem"
    exit 1
fi

# Limpar imagens antigas (manter apenas as 3 mais recentes)
print_step "Limpando imagens antigas..."
docker image prune -f

# Criar tag com timestamp para backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker tag $PROJECT_NAME:latest $PROJECT_NAME:backup_$TIMESTAMP

print_success "Imagem taggeada como backup: $PROJECT_NAME:backup_$TIMESTAMP"

# Verificar se há container rodando e restart
if docker ps -a | grep -q "$PROJECT_NAME-prod"; then
    print_step "Reiniciando container..."
    docker start "$PROJECT_NAME-prod" || docker run -d --name "$PROJECT_NAME-prod" $PROJECT_NAME:latest
else
    print_warning "Container não existe. Use o Portainer para criar o stack completo."
fi

# Verificar logs
print_step "Verificando logs do container..."
sleep 3
docker logs "$PROJECT_NAME-prod" --tail 10

# Resumo final
echo ""
print_success "🎉 Deploy concluído com sucesso!"
echo ""
echo "📊 Resumo:"
echo "  • Projeto: $PROJECT_NAME"
echo "  • Imagem: $PROJECT_NAME:latest"
echo "  • Backup: $PROJECT_NAME:backup_$TIMESTAMP"
echo "  • Localização: $DEPLOY_PATH"
echo ""

print_warning "Próximos passos:"
echo "1. Verifique se o container está rodando: docker ps"
echo "2. Acesse o Portainer para configurar o stack completo"
echo "3. Configure as variáveis de ambiente se necessário"
echo "4. Teste a conexão do WhatsApp"
echo ""

# Mostrar status final
print_step "Status do container:"
docker ps | grep $PROJECT_NAME || echo "Container não está rodando"

print_success "Deploy via Git finalizado! 🚀"
