# 🚀 VPS Agent - Manual de Capacidades e Comandos

## 📋 RESUMO DO PROJETO

**VPS Agent** é uma ferramenta CLI para gerenciamento remoto de VPS via SSH. Conecta automaticamente na VPS e executa comandos de monitoramento, diagnóstico e administração.

### 🎯 Objetivo
Fornecer acesso rápido e organizado à VPS sem necessidade de SSH manual, com comandos pré-definidos e interface amigável.

### 🔌 Conexão Atual
- **IP**: 147.79.83.6 (manager1)
- **Acesso**: SSH como root
- **Status**: ✅ CONECTADO E FUNCIONANDO

---

## 🏗️ CAPACIDADES POR SETOR

### 🐳 DOCKER & CONTAINERS

**O que podemos fazer:**
- ✅ Listar containers ativos e status
- ✅ Verificar containers parados  
- ✅ Ver imagens disponíveis
- ✅ Monitorar logs de containers específicos
- ✅ Restart de containers individuais
- ✅ Limpeza de sistema Docker
- ✅ Verificar recursos utilizados por containers

**Containers ativos detectados:**
```
- bot-whatsapp-stack_bot-whatsapp (healthy)
- portainer_portainer (8000, 9000, 9443)
- redis_redis (6379)
- n8n_n8n_worker, n8n_n8n_webhook, n8n_n8n_editor (5678)
- postgres_postgres (5432) 
- minio_minio (9000)
- traefik_traefik (80, 443)
- evolution_evolution (8080)
```

**Comandos disponíveis:**
- `status` - Status de todos containers
- `containers` - Lista completa (ativos + parados)
- `images` - Imagens Docker disponíveis
- `restart-docker` - Restart do serviço Docker
- `cleanup` - Limpeza de recursos não utilizados

---

### 🖥️ PORTAINER

**O que podemos fazer:**
- ✅ Verificar se está online (HTTP 200 ✅)
- ✅ Monitorar status do container
- ✅ Verificar portas (8000, 9000, 9443)
- ✅ Acessar via web interface
- ⚠️ Restart do container (se necessário)
- ⚠️ Ver logs de acesso/erro

**URLs de acesso:**
- Interface: https://painel.agenciafer.com.br
- Local: https://147.79.83.6:9443

**Comandos disponíveis:**
- `portainer` - Status rápido (HTTP check)
- `ssh "docker logs portainer_portainer.1.*"` - Logs detalhados

---

### 💻 SISTEMA VPS

**O que podemos fazer:**
- ✅ Monitorar uso de disco (20% usado, 78G livres)
- ✅ Verificar memória RAM (1.2Gi usado, 6.3Gi disponível)
- ✅ Monitorar CPU em tempo real
- ✅ Ver IP público (147.79.83.6)
- ✅ Verificar portas abertas (80, 443, 9000, 9443, 8000)
- ✅ Logs do sistema
- ✅ Uptime e estatísticas
- ⚠️ Reinicialização de serviços
- ⚠️ Atualizações de sistema

**Especificações detectadas:**
- **RAM**: 7.8GB total
- **Disco**: 97GB total (20GB usado)
- **CPU**: Multi-core (detalhe via `top`)
- **OS**: Ubuntu/Debian (Docker Swarm)

**Comandos disponíveis:**
- `disk` - Uso de disco e partições
- `memory` - Uso de RAM e swap
- `cpu` - Processos e uso de CPU
- `ip` - IP público
- `ports` - Portas abertas
- `logs` - Logs do sistema

---

### 🌐 REDE E CONECTIVIDADE

**O que podemos fazer:**
- ✅ Verificar IP público
- ✅ Monitorar portas abertas
- ✅ Testar conectividade externa
- ✅ Verificar DNS resolution
- ✅ Status de serviços web (Traefik, Portainer)
- ⚠️ Teste de latência
- ⚠️ Verificar firewall

**Portas ativas detectadas:**
- **80/443**: Traefik (HTTP/HTTPS)
- **9000/9443**: Portainer
- **8000**: Portainer adicional
- **Internas**: 5678 (N8N), 6379 (Redis), 5432 (PostgreSQL), 8080 (Evolution)

---

### 🔧 DIAGNÓSTICO E MANUTENÇÃO

**O que podemos fazer:**
- ✅ Diagnóstico completo automatizado
- ✅ Verificação de saúde de todos serviços
- ✅ Monitoramento de recursos
- ✅ Identificação de problemas
- ✅ Limpeza automática
- ⚠️ Backup de configurações
- ⚠️ Restauração de serviços

**Comando especial:**
- `diagnostico` - Executa verificação completa de:
  - IP público
  - Status containers
  - Uso de disco
  - Uso de memória  
  - Portas abertas
  - Conectividade

---

### 🔐 SEGURANÇA E ACESSO

**O que podemos fazer:**
- ✅ Verificar se comando `passwd` está disponível (/usr/bin/passwd ✅)
- ✅ Trocar senha do usuário root
- ✅ Ver histórico de login (last)
- ✅ Verificar logs de autenticação
- ✅ Listar usuários do sistema
- ⚠️ Gerenciar chaves SSH (se necessário)

**Status atual:**
- **Usuário**: root (acesso total)
- **Sistema**: Ubuntu/Debian
- **Comando passwd**: Disponível e funcional

**Comandos disponíveis:**
- `check-passwd` - Verificar se passwd está disponível
- `check-users` - Listar usuários com privilégios
- `last-login` - Histórico de acessos
- `auth-logs` - Logs de autenticação
- `trocar-senha` - Informações sobre como trocar senha

**⚠️ IMPORTANTE sobre troca de senha:**
- Comando: `ssh "passwd"` (solicita nova senha interativamente)
- RISCO: Se perder a senha, pode perder acesso à VPS
- SEMPRE anotar nova senha antes de trocar
- Testar nova senha antes de desconectar
- Atualizar .env após troca bem-sucedida

---

## 🔑 MÉTODOS DE AUTENTICAÇÃO AVANÇADOS

### 📋 OPÇÕES DISPONÍVEIS:

#### 1️⃣ **MÉTODO ATUAL (Senha Root)**
- **Usuário**: root
- **Autenticação**: Senha
- **Prós**: Acesso total, simples
- **Contras**: Depende da senha root, menos seguro

#### 2️⃣ **USUÁRIO DEDICADO (Recomendado)**
- **Usuário**: vpsagent (criado especialmente)
- **Autenticação**: Senha própria
- **Prós**: Independente do root, mais seguro
- **Contras**: Ainda usa senha

#### 3️⃣ **CHAVE SSH (Mais Seguro)**
- **Usuário**: vpsagent ou root
- **Autenticação**: Chave pública/privada
- **Prós**: Sem senhas, automático, muito seguro
- **Contras**: Configuração inicial mais complexa

### 🛠️ COMANDOS PARA CONFIGURAR:

#### **Criar Usuário Dedicado:**
```bash
🤖 VPS > setup-agent-user
# Segue instruções para criar usuário 'vpsagent'
```

#### **Configurar Chave SSH:**
```bash
🤖 VPS > setup-ssh-key  
# Segue instruções para gerar e configurar chave
```

#### **Ver Configuração Atual:**
```bash
🤖 VPS > connection-info
# Mostra método atual de autenticação
```

### ⚙️ CONFIGURAÇÃO NO .env:

#### **Método 1 (Atual):**
```bash
VPS_USER=root
VPS_PASSWORD=senha_atual
VPS_AUTH_METHOD=password
```

#### **Método 2 (Usuário Dedicado):**
```bash
VPS_USER=vpsagent
VPS_PASSWORD=senha_do_vpsagent
VPS_AUTH_METHOD=password
```

#### **Método 3 (Chave SSH):**
```bash
VPS_USER=vpsagent
VPS_AUTH_METHOD=ssh_key
VPS_SSH_KEY=~/.ssh/vps_agent_key
# VPS_PASSWORD não é necessário
```

### 🎯 VANTAGENS DE CADA MÉTODO:

| Método | Segurança | Facilidade | Independência | Recomendado |
|--------|-----------|------------|---------------|-------------|
| Root + Senha | ⭐⭐ | ⭐⭐⭐ | ⭐ | Atual |
| User + Senha | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ Sim |
| User + SSH Key | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 🏆 Melhor |

---

## 📱 MENU DE COMANDOS RÁPIDOS

### 🚀 Comandos Básicos
```bash
# Verificação geral
status          # Status dos containers
diagnostico     # Diagnóstico completo
portainer       # Status do Portainer

# Sistema
disk            # Uso do disco
memory          # Uso da memória
cpu             # Processos e CPU
ip              # IP público
ports           # Portas abertas
```

### 🔧 Comandos Avançados
```bash
# Docker
containers      # Todos containers (ativo + parado)
images          # Imagens Docker
cleanup         # Limpeza Docker
restart-docker  # Restart serviço Docker

# Sistema
logs            # Logs do sistema
ssh "comando"   # Comando personalizado
```

### 📋 Comandos de Help
```bash
help            # Lista todos comandos
exit            # Sair do agente
```

---

## 🎯 CASOS DE USO PRÁTICOS

### 🔍 Verificação Rápida de Saúde
```bash
🤖 VPS > diagnostico
# Retorna: IP, containers, disco, memória, portas
```

### 🐳 Problemas com Containers
```bash
🤖 VPS > status
🤖 VPS > ssh "docker logs container_name"
🤖 VPS > ssh "docker restart container_name"
```

### 💾 Monitoramento de Recursos
```bash
🤖 VPS > disk
🤖 VPS > memory
🤖 VPS > cpu
```

### 🌐 Verificação de Conectividade
```bash
🤖 VPS > ip
🤖 VPS > ports
🤖 VPS > portainer
```

---

## ⚡ COMANDOS PARA IA's

### Para testar tudo rapidamente:
```
diagnostico
```

### Para verificar problema específico:
```
status
portainer
ssh "docker logs nome_container"
```

### Para limpeza/manutenção:
```
cleanup
restart-docker
```

---

## 🔧 CONFIGURAÇÃO ATUAL

### Arquivo .env
```bash
VPS_IP=147.79.83.6
VPS_PASSWORD=ybIOS0Zl7l@11N+Cg@H6
PORTAINER_URL=https://painel.agenciafer.com.br
```

### Dependências
- Node.js + npm
- sshpass (para SSH automatizado)
- dotenv (variáveis de ambiente)

---

## 🚨 LIMITAÇÕES E CUIDADOS

### ✅ O que é SEGURO fazer:
- Verificações e monitoramento
- Visualização de logs
- Status de serviços
- Comandos de leitura

### ⚠️ O que precisa CUIDADO:
- Restart de containers críticos
- Limpeza de Docker (pode remover dados)
- Restart do serviço Docker
- Comandos que modificam configurações

### 🚫 O que NÃO deve fazer:
- Shutdown da VPS
- Remoção de volumes/dados
- Alteração de senhas
- Modificação de configurações de rede

---

**Este documento serve como referência completa para qualquer IA entender as capacidades do VPS Agent e saber exatamente o que pode ser feito com segurança.**
