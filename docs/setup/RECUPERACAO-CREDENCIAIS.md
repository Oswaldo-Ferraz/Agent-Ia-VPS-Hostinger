# 🔐 **RECUPERAÇÃO DE CREDENCIAIS - AGENTE IA VPS**

## ⚠️ **IMPORTANTE: ESTE ARQUIVO CONTÉM INFORMAÇÕES SENSÍVEIS**
**Salve este arquivo em local seguro (iCloud, Google Drive, 1Password, etc.)**

---

## 🔑 **CREDENCIAIS PARA RECUPERAÇÃO:**

### 🖥️ **VPS - Hostinger**
```bash
IP: 147.79.83.6
Usuário: root
Senha: ybIOS0Zl7l@11N+Cg@H6
Portainer: https://painel.agenciafer.com.br
```

### 📱 **Hospedagem Compartilhada - Hostinger**
```bash
IP: 147.93.37.192
Porta: 65002
Usuário: u148368058
Senha: pMU6XPk2k$epwC%
```

### 🌐 **Sites WordPress Ativos:**
1. agenciafer.com.br
2. aiofotoevideo.com.br
3. malucosta.com.br
4. metodoverus.com.br

### 🤖 **OpenAI (Opcional)**
```bash
API Key: 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
```

---

## 🚀 **PROCESSO DE RECUPERAÇÃO:**

### 1. **Clonar Repositório**
```bash
git clone https://github.com/AgenciaFER/Agent-Ia-VPS-Hostinger.git
cd Agent-Ia-VPS-Hostinger
```

### 2. **Executar Script de Recuperação**
```bash
# Executar script automático
./setup-recovery.sh

# OU fazer manualmente:
npm install
cp .env.example .env
```

### 3. **Configurar Credenciais**
```bash
# Editar arquivo .env
nano .env

# Inserir as credenciais abaixo (salve este arquivo em local seguro!)
```

### 4. **Testar Conexões**
```bash
# Testar VPS
node vps-agent.js connection-test

# Testar Hostinger
node wp-manager.js info

# Testar agente completo
node vps-agent-complete.js
```

---

## 💾 **ARQUIVO .env COMPLETO:**
```bash
# VPS Agent Configuration
VPS_IP=147.79.83.6
VPS_PASSWORD=ybIOS0Zl7l@11N+Cg@H6
PORTAINER_URL=https://painel.agenciafer.com.br

# Hostinger Shared Hosting Access
HOSTINGER_HOST=147.93.37.192
HOSTINGER_PORT=65002
HOSTINGER_USER=u148368058
HOSTINGER_PASS=pMU6XPk2k$epwC%

# OpenAI (opcional)
OPENAI_API_KEY=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
```

---

## 🔒 **SEGURANÇA:**

### ✅ **LOCAIS SEGUROS PARA SALVAR:**
- iCloud Drive (pasta privada)
- Google Drive (pasta privada)
- 1Password / Bitwarden
- Cofre físico
- HD externo criptografado

### ❌ **NUNCA SALVAR EM:**
- Email
- Repositório Git público
- Cloud público sem criptografia
- Mensagens de texto

---

## 📱 **ACESSO SSH RÁPIDO:**

### VPS:
```bash
ssh root@147.79.83.6
```

### Hostinger:
```bash
ssh -p 65002 u148368058@147.93.37.192
```

---

## 🆘 **EM CASO DE EMERGÊNCIA:**

1. **Acesse o painel Hostinger**: https://hpanel.hostinger.com
2. **VPS**: Seção "VPS" para reset de senha
3. **Hospedagem**: Seção "Sites" para reset SSH
4. **WordPress**: Acesse via painel e reset senhas

**Data de criação:** 23 de junho de 2025  
**Última atualização:** 23 de junho de 2025
