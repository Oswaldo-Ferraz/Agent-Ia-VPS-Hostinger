#!/bin/bash

# 🚀 Script de Deploy para VPS via Portainer
# Autor: Assistant
# Data: 2025-06-14

set -e

echo "🚀 Iniciando deploy do Bot WhatsApp para VPS..."

# Configurações
PROJECT_NAME="bot-whatsapp"
VPS_USER="seu_usuario"
VPS_HOST="sua_vps_ip"
VPS_PATH="/home/$VPS_USER/deployments/$PROJECT_NAME"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
print_step "Verificando dependências..."

if ! command_exists docker; then
    print_error "Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

if ! command_exists ssh; then
    print_error "SSH não encontrado."
    exit 1
fi

print_success "Dependências verificadas"

# Limpar arquivos temporários e node_modules
print_step "Limpando arquivos desnecessários..."
rm -rf node_modules
rm -rf .git
rm -rf logs/*
rm -rf tmp/*
rm -rf exports/*
print_success "Arquivos limpos"

# Criar arquivo tar com o projeto
print_step "Criando arquivo compactado do projeto..."
tar -czf ${PROJECT_NAME}.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs/* \
    --exclude=tmp/* \
    --exclude=exports/* \
    --exclude=${PROJECT_NAME}.tar.gz \
    .
print_success "Arquivo ${PROJECT_NAME}.tar.gz criado"

# Função para fazer upload via SCP
upload_project() {
    print_step "Fazendo upload do projeto para VPS..."
    
    # Criar diretório na VPS
    ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}"
    
    # Upload do arquivo
    scp ${PROJECT_NAME}.tar.gz ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/
    
    print_success "Upload concluído"
}

# Função para build da imagem na VPS
build_on_vps() {
    print_step "Fazendo build da imagem Docker na VPS..."
    
    ssh ${VPS_USER}@${VPS_HOST} "
        cd ${VPS_PATH}
        tar -xzf ${PROJECT_NAME}.tar.gz
        docker build -t ${PROJECT_NAME}:latest .
        docker image prune -f
    "
    
    print_success "Build da imagem concluído na VPS"
}

# Menu de opções
echo ""
echo "🔧 Escolha o método de deploy:"
echo "1) Upload e build na VPS"
echo "2) Build local e push para registry" 
echo "3) Deploy via Git (Profissional - Recomendado)"
echo "4) Apenas gerar arquivos de configuração"
echo ""

read -p "Digite sua opção (1-4): " option

case $option in
    1)
        print_step "Método selecionado: Upload e build na VPS"
        
        # Solicitar dados da VPS
        read -p "Digite o usuário da VPS: " VPS_USER
        read -p "Digite o IP/host da VPS: " VPS_HOST
        
        # Atualizar variáveis
        VPS_PATH="/home/$VPS_USER/deployments/$PROJECT_NAME"
        
        upload_project
        build_on_vps
        
        print_success "Deploy concluído!"
        print_warning "Próximos passos:"
        echo "1. Acesse seu Portainer: https://painel.agenciafer.com.br"
        echo "2. Vá em Stacks → Add stack"
        echo "3. Nome: bot-whatsapp"
        echo "4. Cole o conteúdo do arquivo stack-portainer.yml"
        echo "5. Configure suas variáveis de ambiente"
        echo "6. Deploy!"
        ;;
        
    2)
        print_step "Método selecionado: Build local e push"
        
        read -p "Digite o registry (ex: docker.io/usuario): " REGISTRY
        
        # Build local
        print_step "Fazendo build da imagem localmente..."
        docker build -t ${PROJECT_NAME}:latest .
        docker tag ${PROJECT_NAME}:latest ${REGISTRY}/${PROJECT_NAME}:latest
        
        # Push
        print_step "Fazendo push para registry..."
        docker push ${REGISTRY}/${PROJECT_NAME}:latest
        
        print_success "Imagem disponível em: ${REGISTRY}/${PROJECT_NAME}:latest"
        print_warning "Atualize o arquivo stack-portainer.yml com a imagem: ${REGISTRY}/${PROJECT_NAME}:latest"
        ;;
        
    3)
        print_step "Método selecionado: Deploy via Git (Profissional)"
        
        # Verificar se é repositório git
        if [ ! -d ".git" ]; then
            print_warning "Não é um repositório Git. Inicializando..."
            git init
            git add .
            git commit -m "feat: setup inicial para deploy via git"
        fi
        
        # Solicitar URL do repositório
        read -p "Digite a URL do repositório (ex: https://github.com/user/bot-whatsapp.git): " REPO_URL
        
        # Verificar se remote origin existe
        if ! git remote get-url origin &> /dev/null; then
            git remote add origin $REPO_URL
        fi
        
        # Push para repositório
        print_step "Fazendo push para repositório..."
        git push -u origin main
        
        # Criar instruções para VPS
        print_success "Repositório configurado!"
        print_warning "Instruções para sua VPS:"
        echo ""
        echo "1. Conecte na sua VPS:"
        echo "   ssh user@sua-vps"
        echo ""
        echo "2. Baixe e configure o script de deploy:"
        echo "   wget https://raw.githubusercontent.com/seu-usuario/bot-whatsapp/main/deploy-git.sh"
        echo "   chmod +x deploy-git.sh"
        echo "   nano deploy-git.sh  # Configure a REPO_URL"
        echo ""
        echo "3. Execute o primeiro deploy:"
        echo "   ./deploy-git.sh"
        echo ""
        echo "4. Para deploy automático, configure webhook:"
        echo "   Veja o arquivo deploy-git-guide.md"
        echo ""
        print_success "Arquivos preparados: deploy-git.sh, webhook-config.json, deploy-git-guide.md"
        ;;
        
    4)
        print_step "Gerando apenas arquivos de configuração..."
        print_success "Arquivos gerados:"
        echo "- portainer-deploy.md (Documentação completa)"
        echo "- stack-portainer.yml (Docker Compose para Portainer)"
        echo "- deploy-git.sh (Script de deploy via Git)"
        echo "- deploy-git-guide.md (Guia completo Git)"
        echo "- webhook-config.json (Configuração webhook)"
        print_warning "Configure suas variáveis de ambiente no arquivo stack-portainer.yml"
        ;;
        
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

# Limpeza
rm -f ${PROJECT_NAME}.tar.gz

echo ""
print_success "🎉 Processo concluído!"
echo ""
print_warning "📋 Lembre-se de:"
echo "1. Configurar as variáveis de ambiente corretas"
echo "2. Fazer upload do arquivo google-service-account.json"
echo "3. Configurar o BOT_OWNER_NUMBER"
echo "4. Testar a conexão após o deploy"
echo ""
