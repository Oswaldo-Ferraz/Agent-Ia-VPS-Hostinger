# 🔄 Deploy via Git - Guia Completo

## 🎯 Visão Geral

O deploy via Git é o método mais profissional para gerenciar seu bot em produção. Permite controle de versão, rollbacks fáceis e deploy automático.

## 🚀 Setup Inicial

### 1. Configurar Repositório Git

```bash
# No seu projeto local
git init
git add .
git commit -m "feat: setup inicial do bot whatsapp"

# Criar repositório no GitHub/GitLab e adicionar remote
git remote add origin https://github.com/seu-usuario/bot-whatsapp.git
git push -u origin main
```

### 2. Configurar VPS

```bash
# Conectar na VPS
ssh user@sua-vps

# Instalar dependências (se necessário)
sudo apt update
sudo apt install git docker.io docker-compose

# Baixar script de deploy
wget https://raw.githubusercontent.com/seu-usuario/bot-whatsapp/main/deploy-git.sh
chmod +x deploy-git.sh

# Editar configurações do script
nano deploy-git.sh
# Altere a linha: REPO_URL="https://github.com/seu-usuario/bot-whatsapp.git"
```

## 🔧 Configurações Necessárias

### Script deploy-git.sh

Edite estas variáveis no script:

```bash
PROJECT_NAME="bot-whatsapp"
REPO_URL="https://github.com/SEU-USUARIO/bot-whatsapp.git"  # ⚠️ ALTERE AQUI
BRANCH="main"
DEPLOY_PATH="/opt/deployments/$PROJECT_NAME"
```

### Permissões na VPS

```bash
# Criar diretório e dar permissões
sudo mkdir -p /opt/deployments
sudo chown $USER:$USER /opt/deployments

# Ou para uso com múltiplos usuários
sudo mkdir -p /opt/deployments
sudo chgrp docker /opt/deployments
sudo chmod 775 /opt/deployments
```

## 🚀 Deploy Manual

### Primeira Execução

```bash
# Na VPS
./deploy-git.sh
```

O script vai:
1. Clonar o repositório
2. Construir a imagem Docker
3. Criar backup da versão anterior
4. Verificar logs

### Atualizações Futuras

```bash
# No seu projeto local - fazer mudanças e push
git add .
git commit -m "update: nova funcionalidade"
git push origin main

# Na VPS - deploy da nova versão
./deploy-git.sh
```

## 🤖 Deploy Automático (Webhook)

### 1. Instalar Webhook na VPS

```bash
# Ubuntu/Debian
sudo apt install webhook

# CentOS/RHEL
sudo yum install webhook

# Via Go (alternativa)
go install github.com/adnanh/webhook@latest
```

### 2. Configurar Webhook

```bash
# Copiar configuração
sudo mkdir -p /etc/webhook
sudo cp webhook-config.json /etc/webhook/hooks.json

# Editar e configurar secret
sudo nano /etc/webhook/hooks.json
# Altere: "secret": "seu-webhook-secret-super-seguro"
```

### 3. Iniciar Serviço Webhook

```bash
# Executar webhook
webhook -hooks /etc/webhook/hooks.json -verbose -port 9000

# Ou como serviço systemd
sudo nano /etc/systemd/system/webhook.service
```

**Conteúdo do webhook.service:**
```ini
[Unit]
Description=Webhook service
After=network.target

[Service]
Type=simple
User=webhook
Group=webhook
ExecStart=/usr/bin/webhook -hooks /etc/webhook/hooks.json -verbose -port 9000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Ativar serviço
sudo systemctl enable webhook
sudo systemctl start webhook
sudo systemctl status webhook
```

### 4. Configurar no GitHub

1. Vá no seu repositório → **Settings** → **Webhooks**
2. **Add webhook**
3. **Payload URL**: `http://sua-vps:9000/hooks/bot-whatsapp-deploy`
4. **Content type**: `application/json`
5. **Secret**: mesmo secret do webhook-config.json
6. **Events**: Just the push event
7. **Active**: ✓

### 5. Testar Webhook

```bash
# Fazer um push para testar
git add .
git commit -m "test: webhook deploy"
git push origin main

# Verificar logs na VPS
sudo journalctl -u webhook -f
```

## 🔒 Segurança

### 1. Usar Deploy Keys (Recomendado)

```bash
# Na VPS, gerar chave SSH
ssh-keygen -t ed25519 -C "deploy-bot-whatsapp"

# Adicionar chave pública no GitHub
# Settings → Deploy keys → Add deploy key
cat ~/.ssh/id_ed25519.pub

# Usar URL SSH no script
REPO_URL="git@github.com:seu-usuario/bot-whatsapp.git"
```

### 2. Secrets Seguros

```bash
# Gerar secret forte para webhook
openssl rand -hex 32

# Usar em webhook-config.json e GitHub
```

### 3. Firewall

```bash
# Permitir apenas IPs do GitHub para webhook
sudo ufw allow from 140.82.112.0/20 to any port 9000
sudo ufw allow from 192.30.252.0/22 to any port 9000
```

## 🎯 Workflow Completo

### Desenvolvimento Local

```bash
# 1. Fazer mudanças no código
nano src/handlers/messageHandler.js

# 2. Testar localmente
npm start

# 3. Commit e push
git add .
git commit -m "feat: nova funcionalidade do bot"
git push origin main
```

### Deploy Automático

```bash
# O webhook automaticamente:
# 1. Detecta o push
# 2. Executa deploy-git.sh
# 3. Faz pull das mudanças
# 4. Reconstrói a imagem
# 5. Reinicia o container
```

### Monitoramento

```bash
# Verificar status do deploy
docker ps | grep bot-whatsapp

# Ver logs do container
docker logs bot-whatsapp-prod -f

# Ver logs do webhook
sudo journalctl -u webhook -f
```

## 🔄 Rollback

### Rollback para Commit Específico

```bash
# Na VPS
cd /opt/deployments/bot-whatsapp

# Ver histórico
git log --oneline -10

# Rollback para commit específico
git checkout <commit-hash>
./deploy-git.sh

# Voltar para main
git checkout main
```

### Rollback para Imagem Anterior

```bash
# Ver imagens disponíveis
docker images | grep bot-whatsapp

# Usar imagem de backup
docker stop bot-whatsapp-prod
docker run -d --name bot-whatsapp-prod bot-whatsapp:backup_20250614_143022
```

## 🎛️ Vantagens do Deploy via Git

✅ **Controle de Versão Total**
- Histórico completo de mudanças
- Facilidade para rollback
- Branching para features

✅ **Deploy Automático**
- Push → Deploy automático
- Reduz erros manuais
- Agiliza desenvolvimento

✅ **Colaboração**
- Múltiplos desenvolvedores
- Code review via Pull Requests
- Controle de acesso granular

✅ **Backup Natural**
- Código sempre seguro no Git
- Histórico preservado
- Distribuído por natureza

✅ **CI/CD Ready**
- Fácil integração com pipelines
- Testes automáticos
- Deploy para múltiplos ambientes

## 🛠️ Troubleshooting

### Webhook não funciona
```bash
# Verificar se serviço está rodando
sudo systemctl status webhook

# Verificar logs
sudo journalctl -u webhook -f

# Testar manualmente
curl -X POST http://sua-vps:9000/hooks/bot-whatsapp-deploy
```

### Erro de permissões Git
```bash
# Verificar SSH keys
ssh -T git@github.com

# Verificar permissões do diretório
ls -la /opt/deployments/
```

### Container não reinicia
```bash
# Verificar se container existe
docker ps -a | grep bot-whatsapp

# Recriar container
docker rm bot-whatsapp-prod
# Usar Portainer para criar stack completo
```

---

**🎯 Resultado**: Deploy profissional com controle total via Git + automação via webhook!
