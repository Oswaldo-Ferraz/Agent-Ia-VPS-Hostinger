# 🚀 QUICK START - Claude API Integration

**Guia rápido para começar a usar o Agente IA com Claude API**

---

## ⚡ CONFIGURAÇÃO EM 3 PASSOS

### 1. **Obtenha sua Claude API Key**
```
1. Vá para: https://console.anthropic.com/
2. Faça login/cadastre-se
3. Clique em "API Keys" 
4. "Create Key"
5. Copie a chave (sk-ant-api03-...)
```

### 2. **Configure o Projeto**
```bash
# Execute o setup automático
./setup-claude-api.sh

# OU configure manualmente
echo "CLAUDE_API_KEY=sk-ant-api03-sua-chave-aqui" >> .env
```

### 3. **Inicie o Agente**
```bash
node ai-agent-advanced.js
```

---

## 🎯 COMANDOS ESSENCIAIS

### **Teste da API**
```bash
test-claude
```
*Verifica se Claude está respondendo*

### **Sites Disponíveis**
```bash
sites
```
*Lista todos os sites WordPress configurados*

### **Criar Primeira Página**
```bash
create-page agenciafer.com.br página de contato moderna com formulário
```
*Cria página automaticamente usando IA*

---

## 💡 EXEMPLOS PRONTOS PARA USAR

### **1. Landing Page Completa**
```bash
create-system agenciafer.com.br landing-page curso de marketing digital
```

### **2. Formulário de Upload**
```bash
create-upload agenciafer.com.br contato@agenciafer.com.br
```

### **3. Portfólio Profissional**
```bash
create-system aiofotoevideo.com.br portfolio trabalhos fotográficos
```

### **4. Sistema de Contato**
```bash
create-system metodoverus.com.br contact-system vendas@metodoverus.com.br
```

### **5. Assistente IA**
```bash
ai como criar uma loja online no meu site?
ai preciso de uma página de vendas que converte
ai como melhorar o SEO do meu WordPress?
```

---

## 🔧 TROUBLESHOOTING

### **Problema: "Claude API Error"**
```bash
# Verifique sua chave
echo $CLAUDE_API_KEY

# Teste conexão
test-claude
```

### **Problema: "Site não encontrado"**
```bash
# Liste sites disponíveis
sites

# Verifique configuração Hostinger
echo $HOSTINGER_HOST
```

### **Problema: "Página não criada"**
```bash
# Verifique status do site
status

# Teste WP-CLI
ai teste wp-cli no site [seu-site]
```

---

## 📚 PRÓXIMOS PASSOS

1. **Leia a documentação completa**: `CLAUDE-API-INTEGRATION.md`
2. **Veja exemplos práticos**: `EXEMPLOS-CLAUDE-API.md`
3. **Explore todos os comandos**: digite `help` no agente
4. **Experimente o assistente IA**: `ai [sua pergunta]`

---

## 🎉 PRONTO!

Agora você pode criar páginas, formulários e sistemas completos usando apenas comandos em linguagem natural!

**Exemplo completo:**
```bash
# Inicia o agente
node ai-agent-advanced.js

# Cria site corporativo completo
create-page agenciafer.com.br página inicial corporativa moderna
create-system agenciafer.com.br portfolio nossos projetos
create-upload agenciafer.com.br contato@agenciafer.com.br

# ✅ Site completo criado em menos de 5 minutos!
```

🚀 **Divirta-se criando com IA!**
