# 🧠 AGENTE IA AVANÇADO - VPS Hostinger v2.0

**Sistema completo de automação com IA dual, multi-cliente e integração Google Cloud**

> Gerencie múltiplos clientes, automatize Google Cloud e crie sistemas completos com comandos em linguagem natural!

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

---

## 🚀 NOVIDADES v2.0

### ✨ Recursos Principais
- **🏢 Sistema Multi-Cliente**: Gerencie múltiplos clientes com credenciais isoladas
- **🌐 Integração Google Cloud**: Automação completa de projetos, APIs e Service Accounts
- **🔐 Gerenciamento Seguro de Credenciais**: Criptografia local para proteção de dados
- **🔗 SDKs Google Oficiais**: Calendar, Gmail, Drive, Sheets, Maps e mais
- **🤖 IA Dual**: Claude (código/sistemas) + OpenAI (conteúdo/textos)
- **⚡ CLI Interativa**: Comandos intuitivos para todas as funcionalidades

### 🏗️ Automação Google Cloud
- **Criação automática de projetos** para cada cliente
- **Ativação de APIs** (Calendar, Gmail, Drive, Sheets, etc.)
- **Geração de Service Accounts** com permissões adequadas
- **Credenciais JSON** prontas para uso
- **Teste automático** de integrações

---

## 📦 INSTALAÇÃO RÁPIDA

```bash
# 1. Clone o repositório
git clone <repository-url>
cd agente-ia-vps-hostinger

# 2. Instale dependências
npm install

# 3. Configure credenciais do Google Cloud (opcional)
npm run setup:google-credentials

# 4. Verifique o status do sistema
npm run system-status

# 5. Inicie o agente
npm start
```

---

## 📁 ESTRUTURA DO PROJETO

```
🧠 Agente-IA-VPS-Hostinger/
├── 📦 package.json                 # Configuração do projeto
├── 🔒 .env                        # Credenciais (não commitado)
├── 📄 .gitignore                  # Arquivos ignorados pelo Git
│
├── 🤖 src/                        # Código fonte
│   ├── agents/                    # Agentes principais
│   │   ├── ai-agent-advanced.js   # 🧠 Agente IA (Claude API)
│   │   ├── vps-agent-complete.js  # 💻 Agente VPS
│   │   ├── vps-agent-advanced.js  # 💻 VPS Avançado
│   │   ├── vps-agent.js          # 💻 VPS Básico
│   │   └── hostinger-complete.js  # 🌐 Agente Hostinger
│   ├── services/                  # Serviços auxiliares
│   │   └── wp-manager.js          # WordPress utilities
│   └── utils/                     # Utilitários
│       └── show-wp-sites.js       # Listagem de sites
│
├── 📚 docs/                       # Documentação completa
│   ├── README.md                  # Documentação principal
│   ├── INDICE-GERAL.md           # Índice de toda documentação
│   ├── guides/                    # Guias detalhados
│   │   ├── CAPACIDADES.md         # Lista de funcionalidades
│   │   ├── ESTRUTURA.md           # Arquitetura do projeto
│   │   ├── WORDPRESS-MANAGEMENT.md # Comandos WordPress
│   │   ├── CREDENCIAIS-SEGURAS.md # Segurança
│   │   ├── CLAUDE-API-INTEGRATION.md # Integração Claude
│   │   └── RESUMO-VISUAL.md       # Visão geral visual
│   ├── tutorials/                 # Tutoriais passo-a-passo
│   │   └── TUTORIAL-IA.md         # Como outras IAs podem usar
│   ├── examples/                  # Exemplos práticos
│   │   ├── EXEMPLOS-CLAUDE-API.md # Casos de uso Claude
│   │   └── EXEMPLOS-WORDPRESS.md  # Exemplos WordPress
│   └── setup/                     # Configuração e instalação
│       ├── QUICK-START-CLAUDE.md  # Início rápido Claude
│       ├── CLAUDE-CREDITS-SETUP.md # Configurar créditos
│       ├── GIT-SETUP.md           # Configuração Git
│       └── RECUPERACAO-CREDENCIAIS.md # Recuperar credenciais
│
├── 🔧 scripts/                    # Scripts de automação
│   ├── setup/                     # Scripts de configuração
│   │   ├── setup-claude-api.sh    # Setup Claude API
│   │   ├── setup-recovery.sh      # Recovery automático
│   │   └── setup-secure-credentials.sh # Credenciais seguras
│   └── tests/                     # Scripts de teste
│       └── test-claude.js         # Teste Claude API
│
└── ⚙️ config/                     # Configurações
    ├── examples/                  # Exemplos de configuração
    │   ├── .env.example          # Template básico
    │   ├── .env.complete         # Template completo
    │   └── .env.methods          # Métodos de config
    └── templates/                 # Templates para geração
```

---

## 🎯 COMANDOS PRINCIPAIS

### 🧠 **Agente IA (Claude API)**
```bash
npm start                          # Inicia agente IA avançado
```

**Comandos disponíveis:**
- `create-page [site] [descrição]` - Criar página personalizada
- `create-upload [site] [email]` - Formulário de upload
- `create-system [site] [tipo]` - Sistema completo
- `ai [pergunta]` - Assistente IA

### 💻 **Agente VPS**
```bash
npm run vps                        # Gerenciamento VPS
```

### 🌐 **Agente Hostinger**
```bash
npm run hostinger                  # WordPress management
```

### 🔧 **Configuração**
```bash
npm run setup                      # Setup automático Claude API
npm test                          # Testar Claude API
```

---

## 📚 DOCUMENTAÇÃO

### 🚀 **Para Começar Rapidamente**
- 📖 [**Documentação Principal**](docs/README.md) - Guia completo
- ⚡ [**Início Rápido Claude**](docs/setup/QUICK-START-CLAUDE.md) - Configure em 3 passos
- 🎯 [**Índice Geral**](docs/INDICE-GERAL.md) - Navegação completa

### 🧠 **Claude API**
- 🔧 [**Integração Claude API**](docs/guides/CLAUDE-API-INTEGRATION.md) - Guia completo
- 💳 [**Setup de Créditos**](docs/setup/CLAUDE-CREDITS-SETUP.md) - Configurar billing
- 💡 [**Exemplos Práticos**](docs/examples/EXEMPLOS-CLAUDE-API.md) - Casos de uso

### 🔧 **Configuração Técnica**
- 🏗️ [**Capacidades do Sistema**](docs/guides/CAPACIDADES.md) - O que pode fazer
- 📁 [**Estrutura Detalhada**](docs/guides/ESTRUTURA.md) - Arquitetura
- 🔐 [**Credenciais Seguras**](docs/guides/CREDENCIAIS-SEGURAS.md) - Segurança

### 🌐 **WordPress & VPS**
- 🎯 [**Gerenciamento WordPress**](docs/guides/WORDPRESS-MANAGEMENT.md) - WP-CLI
- 💡 [**Exemplos WordPress**](docs/examples/EXEMPLOS-WORDPRESS.md) - Casos práticos

---

## 🌟 CASOS DE USO

### **1. Site Corporativo Completo (5 minutos)**
```bash
npm start

# No agente:
create-page agenciafer.com.br página inicial corporativa moderna
create-system agenciafer.com.br portfolio nossos projetos
create-upload agenciafer.com.br contato@agenciafer.com.br
```

### **2. Landing Page de Conversão**
```bash
create-system metodoverus.com.br landing-page Curso Python Completo
```

### **3. Assistente IA para Desenvolvimento**
```bash
ai como criar uma loja online no meu site?
ai preciso de um formulário de agendamento
```

---

## ⚙️ CONFIGURAÇÃO

### **Arquivo .env (obrigatório)**
```bash
# Copie do template
cp config/examples/.env.example .env

# Configure suas credenciais
CLAUDE_API_KEY=sk-ant-api03-sua-chave-aqui
HOSTINGER_HOST=147.93.37.192
HOSTINGER_PASS=sua-senha-hostinger
```

### **Setup Automático**
```bash
# Configuração completa em um comando
npm run setup
```

---

## 📊 PERFORMANCE

- ⚡ **Criação de página**: 30-60 segundos
- 🚀 **Sistema completo**: 2-3 minutos  
- 🌐 **Site completo**: 5-10 minutos
- 🎯 **99% de sucesso** na geração de código

---

## 🤝 CONTRIBUIÇÃO

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit (`git commit -am 'Add nova feature'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📞 SUPORTE

- 📚 **[Documentação Completa](docs/)** - Guias detalhados
- 🎯 **[Índice Geral](docs/INDICE-GERAL.md)** - Navegação
- 💬 **Assistente IA**: `ai preciso de ajuda`
- 🐛 **Issues**: GitHub Issues

---

## 📄 LICENÇA

Este projeto está sob a licença **MIT**. 

---

<div align="center">

**🧠 Agente IA - Transformando ideias em realidade digital**

*Criado com ❤️ e muita inteligência artificial*

[⭐ Star no GitHub](/) | [📚 Documentação](docs/) | [🚀 Começar Agora](#-início-rápido)

</div>
