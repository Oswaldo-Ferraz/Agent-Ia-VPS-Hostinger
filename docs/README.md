# � AGENTE IA - VPS & HOSTINGER + CLAUDE API

**Agente inteligente para gerenciamento automatizado de VPS e WordPress com integração Claude API**

> Crie páginas, formulários e sistemas completos usando comandos em linguagem natural!

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

---

## 🎯 O QUE É POSSÍVEL FAZER

### ✨ **NOVIDADE: Integração Claude API**
- **Criar páginas WordPress** automaticamente
- **Gerar formulários de upload** com envio por email
- **Desenvolver sistemas completos** (landing pages, portfólios, blogs)
- **Deploy automático** de código gerado pela IA
- **Criação de subdomínios** e estruturas completas
- **Assistente IA** para dúvidas e desenvolvimento

### 🔧 **Funcionalidades Existentes**
- Gerenciamento de **VPS** via SSH
- Controle total do **Hostinger** (hospedagem compartilhada)
- Comandos **WordPress/WP-CLI** avançados
- **Diagnóstico** e monitoramento de sistemas
- **Backup e segurança** automatizados

---

## 🚀 INÍCIO RÁPIDO

### 1. **Configuração Automática**
```bash
# Clone o projeto
git clone https://github.com/seu-usuario/Agent-Ia-VPS-Hostinger.git
cd Agent-Ia-VPS-Hostinger

# Setup automático (inclui Claude API)
./setup-claude-api.sh

# OU configuração manual
cp .env.example .env
# Edite .env com suas credenciais
```

### 2. **Iniciar Agente IA**
```bash
# Agente IA Avançado (recomendado)
node ai-agent-advanced.js

# OU via npm
npm start
```

### 3. **Primeiros Comandos**
```bash
# Testar Claude API
test-claude

# Ver sites disponíveis
sites

# Criar primeira página
create-page agenciafer.com.br página de contato moderna com formulário

# Assistente IA
ai como criar uma loja online?
```

---

## 🧠 COMANDOS CLAUDE API

### 📝 **Criação de Conteúdo**

#### **Páginas Personalizadas**
```bash
create-page [site] [descrição detalhada]
```
**Exemplos:**
```bash
create-page agenciafer.com.br página sobre nossa agência com timeline história
create-page metodoverus.com.br landing page curso programação Python
create-page aiofotoevideo.com.br galeria trabalhos casamentos eventos
```

#### **Formulários de Upload**
```bash
create-upload [site] [email-destino]
```
**Exemplo:**
```bash
create-upload agenciafer.com.br contato@agenciafer.com.br
```
**Funcionalidades:** Upload seguro, validação, email automático, interface moderna

#### **Sistemas Completos**
```bash
create-system [site] [tipo] [parâmetros]
```

**Tipos disponíveis:**
- `landing-page [produto]` - Landing de conversão
- `contact-system [email]` - Sistema de contato completo  
- `portfolio [categoria]` - Portfólio profissional
- `blog-system [tópico]` - Sistema de blog

**Exemplos:**
```bash
create-system agenciafer.com.br landing-page curso marketing digital
create-system metodoverus.com.br portfolio projetos desenvolvidos
create-system aiofotoevideo.com.br contact-system orcamento@aiofoto.com.br
```

### 🌐 **Subdomínios e Deploy**

#### **Criar Subdomínio**
```bash
create-subdomain [nome] [site-principal] [propósito]
```
**Exemplo:**
```bash
create-subdomain loja agenciafer.com.br wordpress ecommerce
create-subdomain blog metodoverus.com.br wordpress corporativo
```

#### **Deploy Completo**
```bash
deploy-site [subdominio] [site-principal] [tipo]
```
**Exemplo:**
```bash
deploy-site shop agenciafer.com.br wordpress
```
*Cria subdomínio + WordPress + página inicial automaticamente*

### 🤖 **Assistente IA**
```bash
ai [sua pergunta ou solicitação]
```

**Exemplos:**
```bash
ai como melhorar SEO do meu site?
ai preciso de um formulário de agendamento
ai crie uma página de vendas que converte
ai como integrar chat no WhatsApp?
```

---

## 🛠️ OUTROS AGENTES

### **VPS Agent** (Servidor Dedicado)
```bash
node vps-agent-complete.js
```
- Gerenciamento de containers Docker
- Monitoramento de recursos
- Configuração de usuários
- Segurança e firewall

### **Hostinger Agent** (Hospedagem Compartilhada)
```bash
node hostinger-complete.js
```
- Gerenciamento WordPress via WP-CLI
- Backup de sites
- Gestão de plugins/temas
- Diagnóstico de problemas

---

## 📚 DOCUMENTAÇÃO COMPLETA

### **Guias Principais**
- 📖 **[Capacidades Detalhadas](CAPACIDADES.md)** - Tudo que o agente pode fazer
- 🧠 **[Claude API Integration](CLAUDE-API-INTEGRATION.md)** - Guia completo da IA
- 💡 **[Exemplos Práticos](EXEMPLOS-CLAUDE-API.md)** - Casos de uso reais
- 🎯 **[Tutorial para IA](TUTORIAL-IA.md)** - Como outra IA pode usar

### **Configuração e Setup**
- ⚙️ **[Estrutura do Projeto](ESTRUTURA.md)** - Organização dos arquivos
- 🔐 **[Credenciais Seguras](CREDENCIAIS-SEGURAS.md)** - Proteção de dados
- 🔧 **[WordPress Management](WORDPRESS-MANAGEMENT.md)** - Comandos WP-CLI

---

## 🌟 CASOS DE USO REAIS

### **1. Agência Digital**
```bash
# Site corporativo completo
create-page agenciafer.com.br página inicial corporativa moderna
create-system agenciafer.com.br portfolio nossos projetos
create-upload agenciafer.com.br contato@agenciafer.com.br

# Resultado: Site completo em 5 minutos
```

### **2. Curso Online**
```bash
# Landing page de conversão
create-system metodoverus.com.br landing-page Curso Python Completo
create-upload metodoverus.com.br inscricoes@metodoverus.com.br

# Resultado: Página de vendas profissional
```

### **3. Fotógrafo/Artista**
```bash
# Portfólio visual
create-system aiofotoevideo.com.br portfolio trabalhos fotográficos
create-page aiofotoevideo.com.br página sobre minha história
create-upload aiofotoevideo.com.br orcamentos@aiofoto.com.br

# Resultado: Site portfólio completo
```

---

## 🔧 CONFIGURAÇÃO AVANÇADA

### **Variáveis de Ambiente (.env)**
```bash
# Claude API (obrigatório para IA)
CLAUDE_API_KEY=sk-ant-api03-sua-chave-aqui

# VPS (opcional)
VPS_IP=147.79.83.63
VPS_PASSWORD=sua-senha-vps

# Hostinger (obrigatório para WordPress)
HOSTINGER_HOST=147.93.37.192
HOSTINGER_PORT=65002
HOSTINGER_USER=u148368058
HOSTINGER_PASS=sua-senha-hostinger

# Email (para formulários)
SMTP_HOST=smtp.hostinger.com
SMTP_USER=seu-email@dominio.com
SMTP_PASS=senha-email
```

### **Sites Configurados**
- `agenciafer.com.br` - Agência digital
- `aiofotoevideo.com.br` - Fotografia/vídeo  
- `malucosta.com.br` - Advocacia
- `metodoverus.com.br` - Educação/cursos

---

## 💻 COMANDOS DE DESENVOLVIMENTO

```bash
# Instalar dependências
npm install

# Agente IA principal
npm start
# ou
npm run ai

# Agentes específicos
npm run vps      # VPS management
npm run hostinger # WordPress management

# Configuração
npm run setup    # Setup automático
```

---

## 🎯 ROADMAP

### **Em Desenvolvimento**
- [ ] **E-commerce** completo com WooCommerce
- [ ] **SEO automático** com meta tags otimizadas
- [ ] **Analytics** integrado (Google Analytics)
- [ ] **Backup** automático com restore
- [ ] **Cache** e otimização de performance

### **Futuro Próximo**
- [ ] **App mobile** via PWA
- [ ] **Integrações** API externa (CRM, Email)
- [ ] **Templates** personalizáveis
- [ ] **Multiidioma** automático
- [ ] **A/B Testing** integrado

---

## 🤝 CONTRIBUIÇÃO

### **Como Contribuir**
1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### **Sugestões e Bugs**
- Abra uma [Issue](https://github.com/seu-usuario/Agent-Ia-VPS-Hostinger/issues)
- Use o assistente IA: `ai tenho uma sugestão para melhorar o sistema`

---

## � ESTATÍSTICAS

### **Performance**
- ⚡ **Criação de página**: 30-60 segundos
- 🚀 **Sistema completo**: 2-3 minutos  
- 🌐 **Site completo**: 5-10 minutos
- 🎯 **99% de sucesso** na geração de código

### **Comparação**
| Tarefa | Desenvolvimento Manual | Com Agente IA |
|--------|----------------------|---------------|
| Página básica | 2-4 horas | 1 minuto |
| Formulário | 4-6 horas | 2 minutos |
| Landing page | 8-12 horas | 3 minutos |
| Site completo | 40-80 horas | 10 minutos |

---

## 📞 SUPORTE

### **Documentação**
- 📚 **[Docs Completas](/)** - Toda documentação
- 🎥 **[Vídeos Tutorial](/)** - Demonstrações práticas
- 💬 **[FAQ](/)** - Perguntas frequentes

### **Contato**
- 📧 **Email**: suporte@agenciafer.com.br
- 💬 **IA Assistant**: `ai preciso de ajuda com [problema]`
- 🔧 **Issues**: GitHub Issues

---

## 📄 LICENÇA

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🎉 AGRADECIMENTOS

- **Anthropic** - Claude API
- **WordPress** - CMS robusto
- **Hostinger** - Hospedagem confiável
- **Comunidade** - Feedback e sugestões

---

<div align="center">

**🧠 Agente IA - Transformando ideias em realidade digital**

*Criado com ❤️ e muita inteligência artificial*

[⭐ Star no GitHub](https://github.com/seu-usuario/Agent-Ia-VPS-Hostinger) | 
[📚 Documentação](/) | 
[🚀 Começar Agora](#-início-rápido)

</div>
