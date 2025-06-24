# 🚀 **GUIA DE CONFIGURAÇÃO GIT - REPOSITÓRIO PRIVADO**

## 📋 **PASSO A PASSO PARA CRIAR REPOSITÓRIO PRIVADO:**

### 1️⃣ **Escolher Plataforma:**

#### 🐙 **GitHub (Recomendado)**
- Acesse: https://github.com
- Clique em "New repository"
- Nome: `agente-ia-vps-hostinger`
- ✅ Marque "Private"
- ❌ NÃO inicialize com README (já temos)

#### 🦊 **GitLab (Alternativa)**
- Acesse: https://gitlab.com
- Clique em "New project"
- Nome: `agente-ia-vps-hostinger`
- Visibility: "Private"

---

### 2️⃣ **CONFIGURAR REPOSITÓRIO REMOTO:**

```bash
# Navegar para o projeto
cd "/Users/afv/Documents/Agente Ia - VPS Hostinger"

# Adicionar remote (substitua por seu usuário)
git remote add origin https://github.com/SEU_USUARIO/agente-ia-vps-hostinger.git

# Verificar remote
git remote -v

# Push inicial
git push -u origin main
```

---

### 3️⃣ **AUTENTICAÇÃO GITHUB:**

#### 🔑 **Token de Acesso (Recomendado)**
```bash
# Gerar token em: GitHub → Settings → Developer settings → Personal access tokens
# Permissões necessárias: repo (full control)

# Usar token como senha quando solicitar
git push -u origin main
# Username: seu_usuario
# Password: ghp_XXXXXXXXXXXX (seu token)
```

#### 🔐 **SSH (Mais Seguro)**
```bash
# Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu_email@exemplo.com"

# Adicionar chave ao SSH agent
ssh-add ~/.ssh/id_ed25519

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Adicionar no GitHub: Settings → SSH and GPG keys → New SSH key

# Alterar remote para SSH
git remote set-url origin git@github.com:SEU_USUARIO/agente-ia-vps-hostinger.git
```

---

### 4️⃣ **BACKUP DAS CREDENCIAIS:**

#### 📱 **iCloud (Recomendado para Mac)**
```bash
# Copiar arquivo de recuperação para iCloud
cp RECUPERACAO-CREDENCIAIS.md ~/Library/Mobile\ Documents/com~apple~CloudDocs/Backup-Agente-IA/
```

#### ☁️ **Google Drive**
1. Acesse https://drive.google.com
2. Criar pasta "Backup-Agente-IA"
3. Upload do arquivo `RECUPERACAO-CREDENCIAIS.md`
4. Configurar como privado/restrito

#### 🔒 **1Password / Bitwarden**
1. Criar item "Agente IA - VPS Hostinger"
2. Copiar conteúdo de `RECUPERACAO-CREDENCIAIS.md`
3. Categorizar como "Servidor" ou "Documento"

---

### 5️⃣ **PROCESSO DE RECUPERAÇÃO COMPLETO:**

#### 🆘 **Se perder o laptop:**

1. **Instalar dependências**:
```bash
# macOS
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node git sshpass

# Ubuntu/Debian
sudo apt update && sudo apt install nodejs npm git sshpass
```

2. **Configurar Git**:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu_email@exemplo.com"
```

3. **Clonar projeto**:
```bash
git clone https://github.com/SEU_USUARIO/agente-ia-vps-hostinger.git
cd agente-ia-vps-hostinger
```

4. **Restaurar credenciais**:
```bash
# Recuperar arquivo de backup (iCloud/Drive/1Password)
# Copiar conteúdo para .env
cp .env.example .env
nano .env  # Colar credenciais do backup
```

5. **Instalar e testar**:
```bash
npm install
node vps-agent-complete.js
```

---

### 6️⃣ **COMANDOS ÚTEIS:**

#### 📤 **Push mudanças**
```bash
git add .
git commit -m "📝 Atualização: [descrição]"
git push origin main
```

#### 📥 **Pull mudanças**
```bash
git pull origin main
```

#### 🔄 **Sincronizar**
```bash
git status
git log --oneline -5
```

---

### 7️⃣ **ESTRUTURA DE SEGURANÇA:**

```
📁 Repositório Git (Público/Privado)
├── 📄 Código fonte (seguro)
├── 📋 Documentação (segura)
├── 🚫 .env (NUNCA incluído)
└── ✅ .env.example (template)

📁 Backup Separado (iCloud/Drive/1Password)
└── 🔐 RECUPERACAO-CREDENCIAIS.md (credenciais reais)
```

---

### 8️⃣ **VERIFICAÇÃO DE SEGURANÇA:**

```bash
# Verificar que .env não está no Git
git status
git ls-files | grep .env

# Resultado esperado: apenas .env.example, .env.methods, etc.
# .env NÃO deve aparecer
```

---

## ✅ **CHECKLIST DE SETUP:**

- [ ] Repositório privado criado
- [ ] Remote configurado
- [ ] Push inicial realizado
- [ ] Arquivo de credenciais salvo em local seguro
- [ ] Teste de recuperação realizado
- [ ] Documentação verificada

---

## 🆘 **SUPORTE:**

**Se algo der errado:**
1. Acesse o painel Hostinger para reset de senhas
2. Consulte o arquivo `INDICE-GERAL.md` para orientação
3. Use `RECUPERACAO-CREDENCIAIS.md` como referência

**Data:** 23 de junho de 2025  
**Status:** ✅ Pronto para uso
