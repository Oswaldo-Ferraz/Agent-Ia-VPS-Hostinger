#!/usr/bin/env node

// 🧠 AGENTE IA AVANÇADO - Claude API + WordPress Automation + Multi-Cliente
// Sistema completo para criação automática de páginas e funcionalidades

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

// Importar sistema multi-cliente
const ClientCLI = require('../core/client-cli');

const execAsync = promisify(exec);

// Inicializar CLI de clientes
const clientCLI = new ClientCLI();

// Configurações
const CONFIG = {
  // Claude API (para código e sistemas)
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000
  },
  
  // OpenAI (para conteúdo e textos)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000
  },
  
  // Hostinger
  hostinger: {
    ip: process.env.HOSTINGER_HOST || '147.93.37.192',
    port: process.env.HOSTINGER_PORT || '65002',
    user: process.env.HOSTINGER_USER || 'u148368058',
    password: process.env.HOSTINGER_PASS
  },
  
  // Sites WordPress
  sites: [
    'agenciafer.com.br',
    'aiofotoevideo.com.br', 
    'malucosta.com.br',
    'metodoverus.com.br'
  ]
};

// Inicializar clientes AI
const anthropic = new Anthropic({
  apiKey: CONFIG.claude.apiKey,
});

const openai = new OpenAI({
  apiKey: CONFIG.openai.apiKey,
});

// Função para executar SSH
async function runSSH(command) {
  const sshCmd = `sshpass -p "${CONFIG.hostinger.password}" ssh -o StrictHostKeyChecking=no -p ${CONFIG.hostinger.port} ${CONFIG.hostinger.user}@${CONFIG.hostinger.ip} '${command}'`;
  const { stdout } = await execAsync(sshCmd);
  return stdout || 'Executado com sucesso';
}

// Função para executar comando WordPress em site específico
async function runWP(site, command) {
  return await runSSH(`cd domains/${site}/public_html && ${command}`);
}

// Integração com Claude API usando SDK oficial
async function askClaude(prompt, systemPrompt = '') {
  try {
    console.log('🧠 Consultando Claude API (código/sistemas)...');
    
    const message = await anthropic.messages.create({
      model: CONFIG.claude.model,
      max_tokens: CONFIG.claude.maxTokens,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    if (message.content && message.content[0] && message.content[0].text) {
      console.log('✅ Código gerado pela Claude API');
      return message.content[0].text;
    } else {
      throw new Error('Resposta inválida da Claude API');
    }
  } catch (error) {
    console.error('❌ Erro na Claude API:', error.message);
    
    // Mensagens de erro mais específicas
    if (error.status === 401) {
      console.error('🔑 Erro de autenticação - verifique sua CLAUDE_API_KEY');
    } else if (error.status === 429) {
      console.error('⏰ Rate limit excedido - aguarde alguns segundos');
    } else if (error.status === 400) {
      // Verificar se é erro de créditos
      if (error.message.includes('credit balance')) {
        console.error('💳 CRÉDITOS INSUFICIENTES!');
        console.error('📍 Acesse: https://console.anthropic.com/account/billing');
        console.error('💰 Adicione créditos ou upgrade seu plano');
        console.error('');
        console.error('� Dica: Claude API precisa de créditos para funcionar');
        console.error('    - Plano gratuito tem limite muito baixo');
        console.error('    - Recomendado: adicionar pelo menos $5-10 em créditos');
      } else {
        console.error('�📝 Erro na requisição - verifique o prompt');
      }
    }
    
    return null;
  }
}

// Integração com OpenAI (para conteúdo/textos)
async function askOpenAI(prompt, systemPrompt = '') {
  try {
    console.log('📝 Consultando OpenAI (conteúdo/textos)...');
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await openai.chat.completions.create({
      model: CONFIG.openai.model,
      max_tokens: CONFIG.openai.maxTokens,
      messages: messages
    });

    if (completion.choices && completion.choices[0] && completion.choices[0].message) {
      console.log('✅ Conteúdo gerado pela OpenAI');
      return completion.choices[0].message.content;
    } else {
      throw new Error('Resposta inválida da OpenAI API');
    }
  } catch (error) {
    console.error('❌ Erro na OpenAI API:', error.message);
    
    if (error.status === 401) {
      console.error('🔑 Erro de autenticação - verifique sua OPENAI_API_KEY');
    } else if (error.status === 429) {
      console.error('⏰ Rate limit excedido - aguarde alguns segundos');
    } else if (error.status === 400) {
      console.error('📝 Erro na requisição - verifique o prompt');
    }
    
    return null;
  }
}

// Função inteligente para escolher qual IA usar
function chooseAI(taskType, prompt) {
  // Palavras-chave específicas para Claude (código/sistemas/estrutura)
  const claudeKeywords = [
    'página', 'sistema', 'código', 'formulário', 'html', 'css', 'javascript', 'php', 
    'desenvolv', 'program', 'script', 'function', 'plugin', 'theme', 'widget',
    'database', 'sql', 'api', 'integração', 'webhook', 'automação', 'backend',
    'frontend', 'framework', 'biblioteca', 'estrutura', 'arquitetura', 'dashboard',
    'admin', 'painel', 'configuração', 'setup', 'instalação', 'deploy'
  ];
  
  // Palavras-chave específicas para OpenAI (conteúdo/textos/copywriting)
  const openaiKeywords = [
    'post', 'artigo', 'texto', 'conteúdo', 'copy', 'redação', 'blog', 'descrição', 
    'título', 'história', 'marketing', 'seo', 'meta', 'landing', 'produto',
    'serviço', 'sobre', 'biografia', 'testemunho', 'review', 'notícia',
    'newsletter', 'email', 'social', 'instagram', 'facebook', 'twitter',
    'youtube', 'podcast', 'vídeo', 'roteiro', 'apresentação'
  ];
  
  // Verificar palavras-chave no prompt
  const lowerPrompt = prompt.toLowerCase();
  const hasClaudeKeywords = claudeKeywords.some(keyword => lowerPrompt.includes(keyword));
  const hasOpenaiKeywords = openaiKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  // Regras específicas por comando (sempre prevalecem)
  switch(taskType) {
    case 'create-page':
    case 'create-system': 
    case 'create-upload':
    case 'create-plugin':
    case 'create-theme':
    case 'create-form':
    case 'create-dashboard':
      return 'claude'; // Sempre Claude para desenvolvimento técnico
      
    case 'create-post':
    case 'create-blog':
    case 'create-article':
      return 'both'; // Ambas para posts (conteúdo + estrutura)
      
    case 'create-copy':
    case 'create-text':
    case 'create-marketing':
    case 'create-seo':
      return 'openai'; // Sempre OpenAI para textos puros
      
    case 'create-content':
      // Para conteúdo genérico, analisar as palavras-chave
      if (hasClaudeKeywords && !hasOpenaiKeywords) return 'claude';
      if (hasOpenaiKeywords && !hasClaudeKeywords) return 'openai';
      if (hasClaudeKeywords && hasOpenaiKeywords) return 'both';
      return 'ask'; // Se ambíguo, perguntar
      
    default:
      // Análise automática baseada em keywords para comandos não específicos
      if (hasClaudeKeywords && !hasOpenaiKeywords) return 'claude';
      if (hasOpenaiKeywords && !hasClaudeKeywords) return 'openai';
      if (hasClaudeKeywords && hasOpenaiKeywords) return 'both';
      
      return 'ask'; // Se não conseguir decidir, perguntar ao usuário
  }
}

// Perguntar ao usuário qual IA usar
async function askWhichAI() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🤖 ESCOLHA DA IA:');
    console.log('1. 🧠 Claude (código, sistemas, estruturas)');
    console.log('2. 📝 OpenAI (conteúdo, textos, copywriting)');
    console.log('3. 🔄 Ambas (conteúdo + estrutura)');
    
    rl.question('\n🔢 Qual IA você gostaria de usar (1/2/3)? ', (answer) => {
      rl.close();
      
      switch(answer.trim()) {
        case '1': resolve('claude'); break;
        case '2': resolve('openai'); break;
        case '3': resolve('both'); break;
        default: 
          console.log('⚠️ Opção inválida, usando Claude por padrão');
          resolve('claude');
      }
    });
  });
}

// Sistema de prompts especializados
const PROMPTS = {
  wordpress_page: `
Você é um especialista em WordPress e desenvolvimento web. 
Crie código HTML/CSS/JavaScript/PHP completo e funcional para WordPress.
Responda APENAS com o código, sem explicações adicionais.
Use práticas modernas, responsivo e seguro.
Inclua todos os arquivos necessários claramente separados.
`,

  wordpress_plugin: `
Você é um especialista em desenvolvimento de plugins WordPress.
Crie um plugin completo e funcional para WordPress.
Inclua header do plugin, funções de segurança, hooks necessários.
Responda APENAS com o código PHP completo.
`,

  upload_form: `
Crie um sistema completo de upload de arquivos para WordPress que:
1. Formulário HTML responsivo com validação
2. Processamento PHP seguro
3. Envio por email automático
4. Validação de tipos de arquivo
5. Proteção contra ataques
6. Interface moderna e intuitiva
`
};

// Comandos avançados do agente
const ADVANCED_COMMANDS = {
  'create-page': async (site, description) => {
    console.log(`🧠 Solicitando à Claude criação de página: ${description}`);
    
    const prompt = `
Crie uma página WordPress completa com a seguinte descrição: "${description}"

Requisitos:
- HTML semântico e responsivo
- CSS moderno (pode usar classes WordPress existentes)
- JavaScript para interatividade se necessário
- PHP para funcionalidades do WordPress
- Formulários seguros com nonces
- Código limpo e documentado

Formate a resposta com:
=== HTML ===
[código HTML]

=== CSS ===
[código CSS]

=== JAVASCRIPT ===
[código JavaScript se necessário]

=== PHP ===
[código PHP se necessário]
`;

    const code = await askClaude(prompt, PROMPTS.wordpress_page);
    
    if (code) {
      // Processar e implementar o código
      await implementPage(site, code, description);
      return `✅ Página criada com sucesso: ${description}`;
    } else {
      return '❌ Erro ao gerar código com Claude';
    }
  },

  'create-upload-form': async (site, email) => {
    console.log(`📤 Criando formulário de upload para ${site} enviando para ${email}`);
    
    const prompt = `
Crie um sistema completo de upload de arquivos para WordPress que:

1. FORMULÁRIO HTML:
   - Campo de upload de arquivo
   - Campos de nome, email, mensagem
   - Botão de envio estilizado
   - Validação frontend
   - Design responsivo e moderno

2. PROCESSAMENTO PHP:
   - Validação de tipos de arquivo (pdf, doc, jpg, png)
   - Limite de tamanho (10MB)
   - Upload seguro para wp-content/uploads
   - Envio por email para: ${email}
   - Proteção contra XSS e CSRF
   - Mensagens de feedback

3. FUNCIONALIDADES:
   - Barra de progresso do upload
   - Preview de imagens
   - Validação em tempo real
   - Emails HTML formatados
   - Log de uploads

Crie como uma página WordPress completa que pode ser adicionada via admin.
`;

    const code = await askClaude(prompt, PROMPTS.upload_form);
    
    if (code) {
      await implementUploadForm(site, code, email);
      return `✅ Formulário de upload criado e configurado para ${email}`;
    } else {
      return '❌ Erro ao gerar formulário';
    }
  },

  'create-subdomain': async (subdomain, mainSite, purpose) => {
    console.log(`🌐 Criando subdomínio: ${subdomain}.${mainSite}`);
    
    try {
      // 1. Criar diretório do subdomínio
      await runSSH(`mkdir -p domains/${mainSite}/${subdomain}`);
      
      // 2. Instalar WordPress se necessário
      if (purpose.includes('wordpress')) {
        await runSSH(`cd domains/${mainSite}/${subdomain} && wp core download`);
        console.log('📥 WordPress baixado para subdomínio');
      }
      
      // 3. Configurar .htaccess
      const htaccess = `
RewriteEngine On
RewriteCond %{HTTP_HOST} ^${subdomain}\\.${mainSite}$ [NC]
RewriteCond %{REQUEST_URI} !^/${subdomain}/
RewriteRule ^(.*)$ /${subdomain}/$1 [L]
`;
      
      await runSSH(`echo '${htaccess}' > domains/${mainSite}/public_html/.htaccess`);
      
      return `✅ Subdomínio ${subdomain}.${mainSite} criado com sucesso`;
    } catch (error) {
      return `❌ Erro ao criar subdomínio: ${error.message}`;
    }
  },

  'ai-assistant': async (request) => {
    console.log(`🤖 Processando solicitação com IA: ${request}`);
    
    const systemPrompt = `
Você é um assistente especializado em WordPress, desenvolvimento web e gerenciamento de sites.
Analise a solicitação do usuário e determine a melhor ação:

1. Se for para criar página/formulário - gere código
2. Se for para modificar site - forneça comandos WP-CLI
3. Se for para configurar funcionalidade - crie instruções
4. Se for dúvida - forneça explicação clara

Sites disponíveis: ${CONFIG.sites.join(', ')}

Sempre forneça soluções práticas e implementáveis.
`;

    const response = await askClaude(request, systemPrompt);
    return response || '❌ Erro ao processar solicitação';
  },

  'create-system': async (site, systemType, ...params) => {
    console.log(`🏗️ Criando sistema: ${systemType} em ${site}`);
    
    const systems = {
      'landing-page': async () => {
        const product = params.join(' ') || 'produto';
        const prompt = `
Crie uma landing page completa e moderna para: ${product}

Requisitos:
1. Hero section com título impactante
2. Seção de benefícios/features
3. Depoimentos/testemunhos
4. Formulário de contato/interesse
5. Footer com informações
6. Design responsivo e profissional
7. Cores modernas e atrativas
8. Animações CSS sutis
9. Call-to-actions convincentes

=== HTML ===
[HTML completo]

=== CSS ===
[CSS moderno e responsivo]

=== JAVASCRIPT ===
[Interatividade e animações]
`;
        
        const code = await askClaude(prompt, PROMPTS.wordpress_page);
        if (code) {
          await implementPage(site, code, `Landing Page - ${product}`);
          return `✅ Landing page criada para: ${product}`;
        }
        return '❌ Erro ao gerar landing page';
      },

      'contact-system': async () => {
        const email = params[0] || 'contato@exemplo.com';
        const prompt = `
Crie um sistema completo de contato que inclui:

1. FORMULÁRIO PRINCIPAL:
   - Nome, email, telefone, mensagem
   - Validação frontend e backend
   - Design moderno e responsivo
   - Proteção anti-spam

2. PROCESSAMENTO PHP:
   - Validação de dados
   - Envio de email formatado
   - Email de confirmação automático
   - Log de contatos em arquivo

3. FEATURES EXTRAS:
   - Mapa de localização (placeholder)
   - Informações de contato
   - Horário de funcionamento
   - Links para redes sociais

Email de destino: ${email}
`;

        const code = await askClaude(prompt, PROMPTS.wordpress_page);
        if (code) {
          await implementPage(site, code, 'Sistema de Contato');
          return `✅ Sistema de contato criado - emails para: ${email}`;
        }
        return '❌ Erro ao gerar sistema de contato';
      },

      'portfolio': async () => {
        const category = params.join(' ') || 'trabalhos';
        const prompt = `
Crie um portfólio profissional para exibir: ${category}

Inclua:
1. Grid responsivo de projetos
2. Modal/lightbox para detalhes
3. Filtros por categoria
4. Animações suaves
5. Seção sobre/bio
6. Formulário de orçamento
7. Design portfolio moderno
8. Integração com redes sociais

Categoria principal: ${category}
`;

        const code = await askClaude(prompt, PROMPTS.wordpress_page);
        if (code) {
          await implementPage(site, code, `Portfólio - ${category}`);
          return `✅ Portfólio criado para: ${category}`;
        }
        return '❌ Erro ao gerar portfólio';
      },

      'blog-system': async () => {
        const topic = params.join(' ') || 'notícias';
        const prompt = `
Crie um sistema de blog moderno focado em: ${topic}

Inclua:
1. Lista de posts com paginação
2. Página de post individual
3. Sidebar com widgets
4. Sistema de categorias
5. Busca avançada
6. Comentários integrados
7. Compartilhamento social
8. Newsletter signup
9. Posts relacionados

Tópico principal: ${topic}
`;

        const code = await askClaude(prompt, PROMPTS.wordpress_page);
        if (code) {
          await implementPage(site, code, `Blog - ${topic}`);
          return `✅ Sistema de blog criado para: ${topic}`;
        }
        return '❌ Erro ao gerar blog';
      }
    };

    if (systems[systemType]) {
      return await systems[systemType]();
    } else {
      return `❌ Sistema não encontrado. Disponíveis: ${Object.keys(systems).join(', ')}`;
    }
  },

  'deploy-site': async (subdomain, mainSite, siteType) => {
    console.log(`🚀 Deploy completo: ${subdomain}.${mainSite} (${siteType})`);
    
    try {
      // 1. Criar subdomínio
      await ADVANCED_COMMANDS['create-subdomain'](subdomain, mainSite, siteType);
      
      // 2. Configurar WordPress se necessário
      if (siteType.includes('wordpress')) {
        await runSSH(`cd domains/${mainSite}/${subdomain} && wp core download`);
        
        // Configurar wp-config básico
        const wpConfig = await askClaude(`
Gere um wp-config.php básico para WordPress com:
- Configurações de banco padrão (placeholders)
- Chaves de segurança
- Configurações recomendadas para produção
- Comentários explicativos

Responda apenas com o código PHP.
`, 'Você é especialista em WordPress. Gere código limpo e seguro.');

        if (wpConfig) {
          await runSSH(`cd domains/${mainSite}/${subdomain} && echo '${wpConfig.replace(/'/g, "'\\''")}' > wp-config.php`);
        }
      }
      
      // 3. Criar página inicial baseada no tipo
      const homePagePrompts = {
        'portfolio': 'página inicial de portfólio profissional',
        'landing': 'landing page de conversão',
        'blog': 'página inicial de blog moderno',
        'empresa': 'página inicial corporativa',
        'loja': 'página inicial de e-commerce'
      };
      
      const homeDescription = homePagePrompts[siteType] || 'página inicial moderna';
      await ADVANCED_COMMANDS['create-page'](mainSite, homeDescription);
      
      return `✅ Site ${subdomain}.${mainSite} deployado com sucesso!\n🎯 Tipo: ${siteType}\n🌐 Acesse: http://${subdomain}.${mainSite}`;
      
    } catch (error) {
      return `❌ Erro no deploy: ${error.message}`;
    }
  },

  'create-post': async (site, topic, ...params) => {
    console.log(`📝 Criando post para ${site}: ${topic}`);
    
    // Para posts, usamos OpenAI para conteúdo e Claude para estrutura
    console.log('🔄 Usando ambas as IAs: OpenAI (conteúdo) + Claude (estrutura)');
    
    // 1. Gerar conteúdo com OpenAI
    const contentPrompt = `
Escreva um artigo de blog completo sobre: "${topic}"

Requisitos:
- Título atrativo e SEO-friendly
- Introdução engajante
- Desenvolvimento com subtítulos (H2, H3)
- Conclusão com call-to-action
- Linguagem natural e fluida
- 800-1200 palavras
- Tom profissional mas acessível
- Inclua perguntas para engajar o leitor

Estruture como:
TÍTULO: [título do post]
INTRODUÇÃO: [texto da introdução]
DESENVOLVIMENTO: [conteúdo principal com subtítulos]
CONCLUSÃO: [conclusão com CTA]
TAGS: [tags separadas por vírgula]
`;

    const contentSystemPrompt = `
Você é um copywriter especialista em criação de conteúdo para blogs.
Crie textos envolventes, informativos e otimizados para SEO.
Use linguagem natural e estruture o conteúdo de forma clara.
`;

    const content = await askOpenAI(contentPrompt, contentSystemPrompt);
    
    if (!content) {
      return '❌ Erro ao gerar conteúdo com OpenAI';
    }
    
    // 2. Gerar estrutura WordPress com Claude
    const structurePrompt = `
Crie a estrutura WordPress completa para um post de blog com o seguinte conteúdo:

CONTEÚDO GERADO:
${content}

Crie:
1. Código PHP para inserir o post via WP-CLI
2. Meta tags otimizadas
3. Estrutura HTML com classes WordPress
4. CSS personalizado se necessário
5. Schema markup para SEO

Formate a resposta como:
=== WP-CLI COMMAND ===
[comando para criar o post]

=== HTML STRUCTURE ===
[estrutura HTML otimizada]

=== CSS ===
[estilos personalizados se necessário]

=== META ===
[meta tags e SEO]
`;

    const structureSystemPrompt = `
Você é um especialista em WordPress e SEO técnico.
Crie estruturas otimizadas e código funcional para WordPress.
Foque em performance, SEO e melhores práticas técnicas.
`;

    const structure = await askClaude(structurePrompt, structureSystemPrompt);
    
    if (!structure) {
      return '❌ Erro ao gerar estrutura com Claude';
    }
    
    // 3. Implementar o post
    await implementPost(site, content, structure, topic);
    
    return `✅ Post criado com sucesso!
📝 Conteúdo: OpenAI (${content.length} chars)
🧠 Estrutura: Claude
🌐 Site: ${site}
📄 Tópico: ${topic}`;
  },

  'create-content': async (type, topic, ...params) => {
    console.log(`📝 Criando conteúdo: ${type} sobre ${topic}`);
    
    const aiChoice = chooseAI('create-content', `${type} ${topic}`);
    let selectedAI = aiChoice;
    
    if (aiChoice === 'ask') {
      selectedAI = await askWhichAI();
    }
    
    let prompt = '';
    let systemPrompt = '';
    
    switch(type.toLowerCase()) {
      case 'artigo':
      case 'post':
        prompt = `Escreva um artigo completo sobre: "${topic}". Inclua título, introdução, desenvolvimento e conclusão.`;
        systemPrompt = 'Você é um copywriter especialista em artigos de blog.';
        break;
        
      case 'copy':
      case 'vendas':
        prompt = `Crie um copy de vendas persuasivo para: "${topic}". Inclua headline, benefícios, objeções e CTA.`;
        systemPrompt = 'Você é um copywriter especialista em vendas e conversão.';
        break;
        
      case 'descrição':
        prompt = `Escreva uma descrição atrativa e detalhada para: "${topic}".`;
        systemPrompt = 'Você é especialista em descrições comerciais atrativas.';
        break;
        
      default:
        prompt = `Crie conteúdo sobre: "${topic}" no formato: ${type}`;
        systemPrompt = 'Você é um redator profissional versátil.';
    }
    
    let result = '';
    
    if (selectedAI === 'openai' || selectedAI === 'both') {
      result = await askOpenAI(prompt, systemPrompt);
    } else {
      result = await askClaude(prompt, systemPrompt);
    }
    
    return result || '❌ Erro ao gerar conteúdo';
  },

  // 🧠 COMANDOS ESPECÍFICOS CLAUDE (Código/Sistemas)
  'create-plugin': async (site, pluginName, description) => {
    console.log(`🧩 Criando plugin WordPress: ${pluginName}`);
    
    const prompt = `
Crie um plugin WordPress completo chamado "${pluginName}" com a seguinte descrição: "${description}"

Requisitos:
1. Header do plugin WordPress padrão
2. Código PHP seguro e moderno
3. Hooks e actions necessários
4. Interface de administração se necessário
5. Validação e sanitização de dados
6. Documentação inline
7. Funções de ativação/desativação

Formate a resposta como:
=== PLUGIN HEADER ===
[cabeçalho do plugin]

=== MAIN PHP ===
[código principal do plugin]

=== ADMIN INTERFACE ===
[interface de administração se necessário]

=== ACTIVATION/DEACTIVATION ===
[funções de ativação e desativação]
`;

    const code = await askClaude(prompt, PROMPTS.wordpress_plugin);
    
    if (code) {
      await implementPlugin(site, code, pluginName, description);
      return `✅ Plugin "${pluginName}" criado com sucesso!`;
    } else {
      return '❌ Erro ao gerar plugin com Claude';
    }
  },

  'create-form': async (site, formType, fields) => {
    console.log(`📋 Criando formulário: ${formType}`);
    
    const prompt = `
Crie um formulário WordPress completo do tipo "${formType}" com os campos: ${fields}

Requisitos:
1. HTML semântico e acessível
2. Validação frontend (JavaScript)
3. Processamento backend seguro (PHP)
4. Proteção CSRF com nonces
5. Sanitização e validação de dados
6. CSS responsivo e moderno
7. Mensagens de feedback
8. Integração com WordPress

Formate a resposta como:
=== HTML FORM ===
[código HTML do formulário]

=== CSS ===
[estilos do formulário]

=== JAVASCRIPT ===
[validação frontend]

=== PHP PROCESSING ===
[processamento backend]
`;

    const code = await askClaude(prompt, PROMPTS.wordpress_page);
    
    if (code) {
      await implementForm(site, code, formType, fields);
      return `✅ Formulário "${formType}" criado com sucesso!`;
    } else {
      return '❌ Erro ao gerar formulário com Claude';
    }
  },

  'create-dashboard': async (site, dashboardType, features) => {
    console.log(`📊 Criando dashboard: ${dashboardType}`);
    
    const prompt = `
Crie um dashboard WordPress completo do tipo "${dashboardType}" com as funcionalidades: ${features}

Requisitos:
1. Interface administrativa moderna
2. Gráficos e métricas
3. Tabelas de dados responsivas
4. Filtros e busca
5. AJAX para atualizações dinâmicas
6. Permissões de usuário
7. CSS/JS otimizado
8. Integração com WordPress hooks

Formate a resposta como:
=== ADMIN PAGE ===
[página principal do dashboard]

=== CSS ===
[estilos do dashboard]

=== JAVASCRIPT ===
[funcionalidades interativas]

=== AJAX HANDLERS ===
[processamento AJAX]

=== CAPABILITIES ===
[permissões necessárias]
`;

    const code = await askClaude(prompt, PROMPTS.wordpress_page);
    
    if (code) {
      await implementDashboard(site, code, dashboardType, features);
      return `✅ Dashboard "${dashboardType}" criado com sucesso!`;
    } else {
      return '❌ Erro ao gerar dashboard com Claude';
    }
  },

  // 📝 COMANDOS ESPECÍFICOS OPENAI (Conteúdo/Textos)
  'create-copy': async (site, copyType, product) => {
    console.log(`💼 Criando copy de vendas: ${copyType} para ${product}`);
    
    const prompt = `
Crie um copy de vendas profissional do tipo "${copyType}" para o produto/serviço: "${product}"

Requisitos:
1. Headline irresistível
2. Subheadlines persuasivas
3. Benefícios claros e específicos
4. Prova social (testemunhos)
5. Tratamento de objeções
6. Call-to-action forte
7. Senso de urgência/escassez
8. Estrutura AIDA ou PAS

Formate a resposta como:
HEADLINE: [headline principal]
SUBHEADLINE: [subheadline de apoio]
BENEFÍCIOS: [lista de benefícios]
OBJEÇÕES: [tratamento de objeções]
PROVA SOCIAL: [testemunhos/prova]
CTA: [call-to-action]
URGÊNCIA: [elementos de urgência]
`;

    const systemPrompt = `
Você é um copywriter especialista em vendas e conversão.
Crie textos persuasivos que geram resultados reais.
Use técnicas comprovadas de copywriting e psicologia de vendas.
`;

    const copy = await askOpenAI(prompt, systemPrompt);
    
    if (copy) {
      await implementCopy(site, copy, copyType, product);
      return `✅ Copy "${copyType}" criado com sucesso!`;
    } else {
      return '❌ Erro ao gerar copy com OpenAI';
    }
  },

  'create-blog': async (site, niche, quantity = 1) => {
    console.log(`📰 Criando ${quantity} posts de blog para nicho: ${niche}`);
    
    const results = [];
    
    for (let i = 0; i < quantity; i++) {
      const prompt = `
Crie um artigo de blog completo para o nicho "${niche}" (artigo ${i + 1} de ${quantity})

Requisitos:
1. Título SEO-friendly único
2. Meta descrição atrativa
3. Introdução engajante
4. Desenvolvimento com subtítulos H2/H3
5. Lista ou bullets quando apropriado
6. Conclusão com CTA
7. 1000-1500 palavras
8. Tom apropriado para o nicho
9. Keywords naturalmente integradas
10. Valor real para o leitor

Estruture como:
TÍTULO: [título otimizado para SEO]
META DESCRIÇÃO: [meta descrição de 150-160 chars]
INTRODUÇÃO: [gancho inicial]
DESENVOLVIMENTO: [conteúdo principal com subtítulos]
CONCLUSÃO: [fechamento com CTA]
TAGS: [tags relevantes]
CATEGORIA: [categoria sugerida]
`;

      const systemPrompt = `
Você é um redator especialista em conteúdo para blogs.
Crie artigos informativos, envolventes e otimizados para SEO.
Mantenha o foco no valor para o leitor e na autoridade no assunto.
`;

      const article = await askOpenAI(prompt, systemPrompt);
      
      if (article) {
        await implementBlogPost(site, article, niche, i + 1);
        results.push(`✅ Artigo ${i + 1}: criado`);
      } else {
        results.push(`❌ Artigo ${i + 1}: erro`);
      }
      
      // Delay entre posts para não sobrecarregar a API
      if (i < quantity - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return `📝 Blog posts criados:\n${results.join('\n')}`;
  },

  'create-marketing': async (site, campaign, target) => {
    console.log(`📢 Criando conteúdo de marketing: ${campaign} para ${target}`);
    
    const prompt = `
Crie uma campanha de marketing completa chamada "${campaign}" para o público-alvo: "${target}"

Requisitos:
1. Email marketing (3 emails sequenciais)
2. Posts para redes sociais (Facebook, Instagram, LinkedIn)
3. Anúncios Google Ads (3 variações)
4. Landing page copy
5. Newsletter mensal
6. Scripts para vídeos (30s, 60s, 2min)
7. Personas detalhadas
8. Cronograma de publicação

Formate a resposta como:
PERSONAS: [definição do público]
EMAIL SEQUENCE: [3 emails da sequência]
SOCIAL MEDIA: [posts para cada rede]
GOOGLE ADS: [3 variações de anúncios]
LANDING PAGE: [copy da landing page]
VIDEO SCRIPTS: [roteiros dos vídeos]
CRONOGRAMA: [quando publicar cada conteúdo]
`;

    const systemPrompt = `
Você é um especialista em marketing digital e criação de campanhas.
Crie conteúdos estratégicos que geram engajamento e conversões.
Use dados comportamentais e psicologia do consumidor.
`;

    const campaign_content = await askOpenAI(prompt, systemPrompt);
    
    if (campaign_content) {
      await implementMarketing(site, campaign_content, campaign, target);
      return `✅ Campanha "${campaign}" criada com sucesso!`;
    } else {
      return '❌ Erro ao gerar campanha com OpenAI';
    }
  },

  // ...existing commands...
};

// Implementar plugin gerado pela Claude
async function implementPlugin(site, code, pluginName, description) {
  try {
    console.log(`🔌 Implementando plugin: ${pluginName}`);
    
    // Extrair seções do código
    const mainPluginMatch = code.match(/=== MAIN PLUGIN FILE ===([\s\S]*?)(?:=== |$)/);
    const cssMatch = code.match(/=== CSS ===([\s\S]*?)(?:=== |$)/);
    const jsMatch = code.match(/=== JAVASCRIPT ===([\s\S]*?)(?:=== |$)/);
    const adminMatch = code.match(/=== ADMIN INTERFACE ===([\s\S]*?)(?:=== |$)/);
    const activationMatch = code.match(/=== ACTIVATION\/DEACTIVATION ===([\s\S]*?)(?:=== |$)/);

    const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const pluginFileName = `${pluginSlug}.php`;
    
    // Construir arquivo principal do plugin
    let pluginContent = `<?php
/*
Plugin Name: ${pluginName}
Description: ${description}
Version: 1.0.0
Author: AI Agent
Generated: ${new Date().toLocaleDateString()}
*/

// Evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes do plugin
define('${pluginSlug.toUpperCase().replace(/-/g, '_')}_VERSION', '1.0.0');
define('${pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('${pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL', plugin_dir_url(__FILE__));

`;

    // Adicionar código principal do plugin
    if (mainPluginMatch) {
      pluginContent += mainPluginMatch[1].trim() + '\n\n';
    } else {
      // Plugin básico se Claude não gerou código específico
      pluginContent += `
// Inicializar plugin
class ${pluginName.replace(/[^a-zA-Z0-9]/g, '')}Plugin {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Hook de ativação
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // Inicialização do plugin
    }
    
    public function enqueue_scripts() {
        wp_enqueue_style('${pluginSlug}-style', ${pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL . 'assets/style.css', array(), ${pluginSlug.toUpperCase().replace(/-/g, '_')}_VERSION);
        wp_enqueue_script('${pluginSlug}-script', ${pluginSlug.toUpperCase().replace(/-/g, '_')}_PLUGIN_URL . 'assets/script.js', array('jquery'), ${pluginSlug.toUpperCase().replace(/-/g, '_')}_VERSION, true);
    }
    
    public function activate() {
        // Código de ativação
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        // Código de desativação
        flush_rewrite_rules();
    }
}

// Inicializar plugin
new ${pluginName.replace(/[^a-zA-Z0-9]/g, '')}Plugin();

`;
    }

    // Adicionar funções de ativação/desativação se fornecidas
    if (activationMatch) {
      pluginContent += `
// Funções de ativação e desativação
${activationMatch[1].trim()}

`;
    }

    // Adicionar interface admin se fornecida
    if (adminMatch) {
      pluginContent += `
// Interface administrativa
${adminMatch[1].trim()}

`;
    }

    pluginContent += `?>`;

    // Criar estrutura de diretórios do plugin
    const pluginDir = `domains/${site}/public_html/wp-content/plugins/${pluginSlug}`;
    const assetsDir = `${pluginDir}/assets`;

    await runSSH(`mkdir -p ${pluginDir}`);
    await runSSH(`mkdir -p ${assetsDir}`);

    // Salvar arquivo principal do plugin
    const tempPluginFile = `/tmp/${pluginFileName}`;
    await fs.writeFile(tempPluginFile, pluginContent);
    await runSSH(`scp ${tempPluginFile} ${pluginDir}/${pluginFileName}`);

    // Criar arquivo CSS se fornecido
    if (cssMatch) {
      const cssContent = cssMatch[1].trim();
      const tempCssFile = `/tmp/${pluginSlug}-style.css`;
      await fs.writeFile(tempCssFile, cssContent);
      await runSSH(`scp ${tempCssFile} ${assetsDir}/style.css`);
      await fs.unlink(tempCssFile);
    } else {
      // CSS básico
      const basicCss = `
/* ${pluginName} Styles */
.${pluginSlug}-container {
    padding: 20px;
    margin: 20px 0;
}

.${pluginSlug}-button {
    background: #0073aa;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.${pluginSlug}-button:hover {
    background: #005a87;
}
`;
      const tempCssFile = `/tmp/${pluginSlug}-style.css`;
      await fs.writeFile(tempCssFile, basicCss);
      await runSSH(`scp ${tempCssFile} ${assetsDir}/style.css`);
      await fs.unlink(tempCssFile);
    }

    // Criar arquivo JavaScript se fornecido
    if (jsMatch) {
      const jsContent = jsMatch[1].trim();
      const tempJsFile = `/tmp/${pluginSlug}-script.js`;
      await fs.writeFile(tempJsFile, jsContent);
      await runSSH(`scp ${tempJsFile} ${assetsDir}/script.js`);
      await fs.unlink(tempJsFile);
    } else {
      // JavaScript básico
      const basicJs = `
// ${pluginName} JavaScript
jQuery(document).ready(function($) {
    console.log('${pluginName} plugin carregado');
    
    // Adicione sua lógica JavaScript aqui
});
`;
      const tempJsFile = `/tmp/${pluginSlug}-script.js`;
      await fs.writeFile(tempJsFile, basicJs);
      await runSSH(`scp ${tempJsFile} ${assetsDir}/script.js`);
      await fs.unlink(tempJsFile);
    }

    // Ativar o plugin automaticamente
    console.log(`🔄 Ativando plugin ${pluginSlug}...`);
    try {
      await runWP(site, `wp plugin activate ${pluginSlug}`);
      console.log(`✅ Plugin "${pluginName}" ativado com sucesso!`);
    } catch (activationError) {
      console.log(`⚠️ Plugin criado mas houve erro na ativação: ${activationError.message}`);
    }

    // Limpar arquivos temporários
    await fs.unlink(tempPluginFile);

    console.log(`✅ Plugin "${pluginName}" implementado com sucesso!`);
    console.log(`📁 Localização: /wp-content/plugins/${pluginSlug}/`);
    console.log(`🌐 Site: ${site}`);
    
    return {
      success: true,
      pluginName,
      pluginSlug,
      pluginDir: `/wp-content/plugins/${pluginSlug}/`,
      files: {
        main: `${pluginFileName}`,
        css: 'assets/style.css',
        js: 'assets/script.js'
      }
    };
    
  } catch (error) {
    console.error(`❌ Erro ao implementar plugin: ${error.message}`);
    throw error;
  }
}

// Implementar página gerada pela Claude
async function implementPage(site, code, description) {
  try {
    console.log(`🚀 Implementando página: ${description}`);
    
    // Extrair seções do código
    const htmlMatch = code.match(/=== HTML ===([\s\S]*?)(?:=== |$)/);
    const cssMatch = code.match(/=== CSS ===([\s\S]*?)(?:=== |$)/);
    const jsMatch = code.match(/=== JAVASCRIPT ===([\s\S]*?)(?:=== |$)/);
    const phpMatch = code.match(/=== PHP ===([\s\S]*?)(?:=== |$)/);

    // Criar arquivo PHP da página
    const pageSlug = description.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const pageTitle = description.charAt(0).toUpperCase() + description.slice(1);
    
    let pageContent = `<?php
/*
Template Name: ${pageTitle}
Generated by AI Agent - ${new Date().toLocaleDateString()}
*/

get_header();
?>

<div class="ai-generated-page" id="page-${pageSlug}">
    <div class="container">
`;

    // PHP personalizado no início se existir
    if (phpMatch && phpMatch[1].trim().startsWith('<?php')) {
      pageContent = phpMatch[1].trim() + '\n\n' + pageContent;
    }

    // Conteúdo HTML
    if (htmlMatch) {
      pageContent += htmlMatch[1].trim();
    } else {
      // Conteúdo padrão se Claude não gerou HTML específico
      pageContent += `
        <h1>${pageTitle}</h1>
        <div class="ai-content">
            <p>Esta página foi gerada automaticamente pela IA.</p>
            <p>Descrição: ${description}</p>
        </div>
`;
    }

    pageContent += `
    </div>
</div>

<?php get_footer(); ?>
`;

    // Adicionar CSS se existir
    if (cssMatch) {
      pageContent += `
<style>
/* AI Generated CSS */
${cssMatch[1].trim()}

/* Base styling for AI pages */
.ai-generated-page {
    padding: 40px 0;
    min-height: 500px;
}

.ai-generated-page .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

@media (max-width: 768px) {
    .ai-generated-page {
        padding: 20px 0;
    }
    
    .ai-generated-page .container {
        padding: 0 15px;
    }
}
</style>
`;
    }

    // Adicionar JavaScript se existir
    if (jsMatch) {
      pageContent += `
<script>
/* AI Generated JavaScript */
document.addEventListener('DOMContentLoaded', function() {
    ${jsMatch[1].trim()}
});
</script>
`;
    }

    // Salvar temporariamente
    const timestamp = Date.now();
    const tempFile = `/tmp/ai-page-${pageSlug}-${timestamp}.php`;
    await fs.writeFile(tempFile, pageContent);

    // Determinar tema ativo
    const activeTheme = await runWP(site, `wp theme list --status=active --field=name`);
    const themeName = activeTheme.trim();

    // Upload para o tema ativo
    const remoteFile = `domains/${site}/public_html/wp-content/themes/${themeName}/page-${pageSlug}.php`;
    await runSSH(`echo '${pageContent.replace(/'/g, "'\\''")}' > ${remoteFile}`);

    // Verificar se página já existe
    const existingPage = await runWP(site, `wp post list --post_type=page --name=${pageSlug} --field=ID`);
    
    if (existingPage.trim()) {
      // Atualizar página existente
      await runWP(site, `wp post update ${existingPage.trim()} --post_title="${pageTitle}" --page_template="page-${pageSlug}.php"`);
      console.log(`🔄 Página "${pageTitle}" atualizada em ${site}`);
    } else {
      // Criar nova página no WordPress
      const pageId = await runWP(site, `wp post create --post_type=page --post_title="${pageTitle}" --post_name="${pageSlug}" --post_status=publish --page_template="page-${pageSlug}.php" --porcelain`);
      console.log(`🆕 Nova página criada com ID: ${pageId.trim()}`);
    }

    // Limpar arquivo temporário
    await fs.unlink(tempFile);

    const pageUrl = await runWP(site, `wp post list --post_type=page --name=${pageSlug} --field=url`);
    console.log(`✅ Página "${pageTitle}" implementada com sucesso!`);
    console.log(`🌐 URL: ${pageUrl.trim()}`);
    
    return {
      success: true,
      pageTitle,
      pageSlug,
      url: pageUrl.trim(),
      templateFile: `page-${pageSlug}.php`
    };
    
  } catch (error) {
    console.error(`❌ Erro ao implementar página: ${error.message}`);
    throw error;
  }
}

// Implementar formulário de upload
async function implementUploadForm(site, code, email) {
  try {
    console.log(`📤 Implementando formulário de upload para ${email}`);
    
    // Extrair seções do código
    const htmlMatch = code.match(/=== HTML ===([\s\S]*?)(?:=== |$)/);
    const cssMatch = code.match(/=== CSS ===([\s\S]*?)(?:=== |$)/);
    const jsMatch = code.match(/=== JAVASCRIPT ===([\s\S]*?)(?:=== |$)/);
    const phpMatch = code.match(/=== PHP ===([\s\S]*?)(?:=== |$)/);

    // 1. Criar página do formulário
    let formPage = `<?php
/*
Template Name: Upload Form
*/

get_header();

// Processar upload se form foi enviado
if ($_POST['upload_submit']) {
    $upload_dir = wp_upload_dir();
    $target_dir = $upload_dir['path'] . '/';
    $uploadOk = 1;
    $message = '';
    
    if (!empty($_FILES['fileToUpload']['name'])) {
        $target_file = $target_dir . basename($_FILES['fileToUpload']['name']);
        $imageFileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));
        
        // Verificar tipos permitidos
        $allowed_types = array('jpg', 'png', 'jpeg', 'gif', 'pdf', 'doc', 'docx');
        if (!in_array($imageFileType, $allowed_types)) {
            $message = 'Apenas arquivos JPG, JPEG, PNG, GIF, PDF, DOC são permitidos.';
            $uploadOk = 0;
        }
        
        // Verificar tamanho (10MB)
        if ($_FILES['fileToUpload']['size'] > 10000000) {
            $message = 'Arquivo muito grande. Máximo 10MB.';
            $uploadOk = 0;
        }
        
        if ($uploadOk == 1) {
            if (move_uploaded_file($_FILES['fileToUpload']['tmp_name'], $target_file)) {
                // Enviar email
                $to = '${email}';
                $subject = 'Novo arquivo enviado via ' . get_bloginfo('name');
                $headers = array('Content-Type: text/html; charset=UTF-8');
                
                $email_message = '
                <h2>Novo arquivo recebido</h2>
                <p><strong>Nome:</strong> ' . sanitize_text_field($_POST['sender_name']) . '</p>
                <p><strong>Email:</strong> ' . sanitize_email($_POST['sender_email']) . '</p>
                <p><strong>Mensagem:</strong> ' . sanitize_textarea_field($_POST['message']) . '</p>
                <p><strong>Arquivo:</strong> ' . basename($_FILES['fileToUpload']['name']) . '</p>
                <p><strong>Tamanho:</strong> ' . round($_FILES['fileToUpload']['size'] / 1024, 2) . ' KB</p>
                <p><strong>Data:</strong> ' . date('d/m/Y H:i:s') . '</p>
                ';
                
                wp_mail($to, $subject, $email_message, $headers);
                $message = '✅ Arquivo enviado com sucesso! Recebemos seu arquivo e entraremos em contato.';
            } else {
                $message = '❌ Erro ao fazer upload do arquivo.';
            }
        }
    } else {
        $message = '❌ Nenhum arquivo selecionado.';
    }
}
?>

<div class="upload-form-container">
    <div class="container">
        <?php if (isset($message)): ?>
            <div class="upload-message <?php echo strpos($message, '✅') !== false ? 'success' : 'error'; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>
        
        <div class="upload-form-wrapper">
`;

    if (htmlMatch) {
      formPage += htmlMatch[1].trim();
    } else {
      // Formulário padrão se Claude não gerou
      formPage += `
            <h2>Enviar Arquivo</h2>
            <form action="" method="post" enctype="multipart/form-data" class="upload-form">
                <div class="form-group">
                    <label for="sender_name">Seu Nome:</label>
                    <input type="text" id="sender_name" name="sender_name" required>
                </div>
                
                <div class="form-group">
                    <label for="sender_email">Seu Email:</label>
                    <input type="email" id="sender_email" name="sender_email" required>
                </div>
                
                <div class="form-group">
                    <label for="message">Mensagem:</label>
                    <textarea id="message" name="message" rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="fileToUpload">Selecionar arquivo:</label>
                    <input type="file" id="fileToUpload" name="fileToUpload" required>
                    <div class="file-info">
                        <small>Tipos permitidos: JPG, PNG, PDF, DOC (máx. 10MB)</small>
                    </div>
                </div>
                
                <button type="submit" name="upload_submit" class="submit-btn">
                    📤 Enviar Arquivo
                </button>
            </form>
`;
    }

    formPage += `
        </div>
    </div>
</div>

<style>
.upload-form-container {
    max-width: 600px;
    margin: 40px auto;
    padding: 20px;
}

.upload-form-wrapper {
    background: #fff;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    color: #333;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 5px;
    font-size: 16px;
    transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #007cba;
}

.submit-btn {
    background: #007cba;
    color: white;
    padding: 15px 30px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.3s;
}

.submit-btn:hover {
    background: #005a87;
}

.upload-message {
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 5px;
    font-weight: bold;
}

.upload-message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.upload-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.file-info {
    margin-top: 8px;
}

.file-info small {
    color: #666;
}

@media (max-width: 768px) {
    .upload-form-container {
        margin: 20px;
        padding: 10px;
    }
    
    .upload-form-wrapper {
        padding: 20px;
    }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileToUpload');
    const form = document.querySelector('.upload-form');
    
    // Preview de arquivo
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                const fileInfo = document.querySelector('.file-info');
                fileInfo.innerHTML = \`
                    <small>Arquivo selecionado: \${file.name} (\${fileSize} MB)</small>
                \`;
            }
        });
    }
    
    // Validação do formulário
    if (form) {
        form.addEventListener('submit', function(e) {
            const fileInput = document.getElementById('fileToUpload');
            const file = fileInput.files[0];
            
            if (file && file.size > 10 * 1024 * 1024) {
                e.preventDefault();
                alert('Arquivo muito grande! Máximo permitido: 10MB');
                return false;
            }
        });
    }
});
</script>

<?php get_footer(); ?>`;

    // CSS adicional se Claude gerou
    if (cssMatch) {
      formPage += `\n<style>\n${cssMatch[1].trim()}\n</style>`;
    }

    // JavaScript adicional se Claude gerou
    if (jsMatch) {
      formPage += `\n<script>\n${jsMatch[1].trim()}\n</script>`;
    }

    // Salvar e implementar
    const tempFile = `/tmp/upload-form-${Date.now()}.php`;
    await fs.writeFile(tempFile, formPage);

    const themePath = await runWP(site, `wp theme path --activate`);
    await runSSH(`scp ${tempFile} domains/${site}/public_html/wp-content/themes/$(basename ${themePath})/page-upload.php`);

    // Criar página no WordPress
    await runWP(site, `wp post create --post_type=page --post_title="Enviar Arquivo" --post_name="upload" --post_status=publish --page_template="page-upload.php"`);

    // Limpar arquivo temporário
    await fs.unlink(tempFile);

    console.log(`✅ Formulário de upload criado em ${site}/upload/`);
    console.log(`📧 Emails serão enviados para: ${email}`);
    
  } catch (error) {
    console.error(`❌ Erro ao implementar formulário: ${error.message}`);
    throw error;
  }
}

// Implementar dashboard gerado pela Claude
async function implementDashboard(site, code, dashboardType, features) {
  try {
    console.log(`📊 Implementando dashboard: ${dashboardType}`);
    
    // Extrair seções do código
    const adminMatch = code.match(/=== ADMIN PAGE ===([\s\S]*?)(?:=== |$)/);
    const cssMatch = code.match(/=== CSS ===([\s\S]*?)(?:=== |$)/);
    const jsMatch = code.match(/=== JAVASCRIPT ===([\s\S]*?)(?:=== |$)/);
    const ajaxMatch = code.match(/=== AJAX HANDLERS ===([\s\S]*?)(?:=== |$)/);
    const capabilitiesMatch = code.match(/=== CAPABILITIES ===([\s\S]*?)(?:=== |$)/);

    const dashboardSlug = dashboardType.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    let pluginContent = `<?php
/*
Plugin Name: Dashboard ${dashboardType}
Description: Dashboard personalizado: ${features}
Version: 1.0.0
Author: AI Agent
Generated: ${new Date().toLocaleDateString()}
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add admin menu
add_action('admin_menu', '${dashboardSlug}_admin_menu');

function ${dashboardSlug}_admin_menu() {
    add_menu_page(
        '${dashboardType}',
        '${dashboardType}', 
        'manage_options',
        '${dashboardSlug}',
        '${dashboardSlug}_admin_page',
        'dashicons-chart-bar',
        30
    );
}

function ${dashboardSlug}_admin_page() {
    ?>
    <div class="wrap ${dashboardSlug}-dashboard">
        <h1>${dashboardType}</h1>
        <div class="dashboard-content">
`;

    // Adicionar conteúdo do admin
    if (adminMatch) {
      pluginContent += adminMatch[1].trim();
    } else {
      pluginContent += `
            <div class="dashboard-widgets">
                <div class="widget">
                    <h3>Funcionalidades</h3>
                    <p>${features}</p>
                </div>
            </div>
`;
    }

    pluginContent += `
        </div>
    </div>
    
    <style>
    .${dashboardSlug}-dashboard {
        background: #f1f1f1;
        padding: 20px;
    }
    
    .dashboard-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
`;

    // Adicionar CSS personalizado
    if (cssMatch) {
      pluginContent += cssMatch[1].trim();
    }

    pluginContent += `
    </style>
    
    <script>
    jQuery(document).ready(function($) {
`;

    // Adicionar JavaScript personalizado
    if (jsMatch) {
      pluginContent += jsMatch[1].trim();
    }

    pluginContent += `
    });
    </script>
    
    <?php
}

// AJAX handlers
`;

    // Adicionar handlers AJAX
    if (ajaxMatch) {
      pluginContent += ajaxMatch[1].trim();
    }

    pluginContent += `
?>`;

    // Salvar e implementar
    const tempFile = `/tmp/dashboard-${dashboardSlug}.php`;
    await fs.writeFile(tempFile, pluginContent);

    await runSSH(`mkdir -p domains/${site}/public_html/wp-content/plugins/dashboard-${dashboardSlug}`);
    await runSSH(`scp ${tempFile} domains/${site}/public_html/wp-content/plugins/dashboard-${dashboardSlug}/dashboard-${dashboardSlug}.php`);

    // Ativar o plugin
    await runWP(site, `wp plugin activate dashboard-${dashboardSlug}`);

    await fs.unlink(tempFile);

    console.log(`✅ Dashboard "${dashboardType}" implementado em ${site}`);
    console.log(`📊 Acesse: ${site}/wp-admin/admin.php?page=${dashboardSlug}`);
    
  } catch (error) {
    console.error(`❌ Erro ao implementar dashboard: ${error.message}`);
    throw error;
  }
}

// Implementar copy gerado pela OpenAI
async function implementCopy(site, copy, copyType, product) {
  try {
    console.log(`💼 Implementando copy: ${copyType}`);
    
    // Extrair seções do copy
    const headlineMatch = copy.match(/HEADLINE: (.*?)(?:\n|$)/);
    const subheadlineMatch = copy.match(/SUBHEADLINE: (.*?)(?:\n|$)/);
    const benefitsMatch = copy.match(/BENEFÍCIOS: ([\s\S]*?)(?:OBJEÇÕES:|$)/);
    const objectionsMatch = copy.match(/OBJEÇÕES: ([\s\S]*?)(?:PROVA SOCIAL:|$)/);
    const proofMatch = copy.match(/PROVA SOCIAL: ([\s\S]*?)(?:CTA:|$)/);
    const ctaMatch = copy.match(/CTA: ([\s\S]*?)(?:URGÊNCIA:|$)/);
    const urgencyMatch = copy.match(/URGÊNCIA: ([\s\S]*?)$/);

    const copySlug = copyType.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const copyTitle = `${copyType} - ${product}`;
    
    let pageContent = `<?php
/*
Template Name: ${copyTitle}
Generated by AI Agent - ${new Date().toLocaleDateString()}
*/

get_header();
?>

<div class="sales-copy-container" id="copy-${copySlug}">
    <div class="container">
        <!-- Header Section -->
        <div class="copy-header">
`;

    // Headline
    if (headlineMatch) {
      pageContent += `
            <h1 class="headline">${headlineMatch[1].trim()}</h1>
`;
    }

    // Subheadline  
    if (subheadlineMatch) {
      pageContent += `
            <h2 class="subheadline">${subheadlineMatch[1].trim()}</h2>
`;
    }

    pageContent += `
        </div>
        
        <!-- Benefícios Section -->
`;

    if (benefitsMatch) {
      pageContent += `
        <div class="benefits-section">
            <h3>Por que escolher ${product}?</h3>
            <div class="benefits-content">
                ${benefitsMatch[1].trim()}
            </div>
        </div>
`;
    }

    // Tratamento de objeções
    if (objectionsMatch) {
      pageContent += `
        <div class="objections-section">
            <h3>Suas dúvidas esclarecidas</h3>
            <div class="objections-content">
                ${objectionsMatch[1].trim()}
            </div>
        </div>
`;
    }

    // Prova social
    if (proofMatch) {
      pageContent += `
        <div class="proof-section">
            <h3>O que nossos clientes dizem</h3>
            <div class="proof-content">
                ${proofMatch[1].trim()}
            </div>
        </div>
`;
    }

    // CTA
    if (ctaMatch) {
      pageContent += `
        <div class="cta-section">
            <div class="cta-content">
                ${ctaMatch[1].trim()}
            </div>
        </div>
`;
    }

    // Urgência
    if (urgencyMatch) {
      pageContent += `
        <div class="urgency-section">
            <div class="urgency-content">
                ${urgencyMatch[1].trim()}
            </div>
        </div>
`;
    }

    pageContent += `
    </div>
</div>

<style>
.sales-copy-container {
    padding: 60px 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
}

.copy-header .headline {
    font-size: 3.5rem;
    font-weight: 800;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.copy-header .subheadline {
    font-size: 1.5rem;
    font-weight: 400;
    margin-bottom: 40px;
    opacity: 0.9;
}

.benefits-section,
.objections-section,
.proof-section {
    background: white;
    color: #333;
    padding: 60px 0;
    margin: 40px 0;
}

.cta-section {
    background: #ff6b6b;
    padding: 60px 0;
    margin: 40px 0;
}

.urgency-section {
    background: #feca57;
    color: #333;
    padding: 40px 0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

@media (max-width: 768px) {
    .copy-header .headline {
        font-size: 2.5rem;
    }
    
    .copy-header .subheadline {
        font-size: 1.2rem;
    }
}
</style>

<?php get_footer(); ?>
`;

    // Salvar e implementar
    const tempFile = `/tmp/copy-${copySlug}-${Date.now()}.php`;
    await fs.writeFile(tempFile, pageContent);

    const themePath = await runWP(site, `wp theme path --activate`);
    await runSSH(`scp ${tempFile} domains/${site}/public_html/wp-content/themes/$(basename ${themePath})/page-${copySlug}.php`);

    // Criar página no WordPress
    await runWP(site, `wp post create --post_type=page --post_title="${copyTitle}" --post_name="${copySlug}" --post_status=publish --page_template="page-${copySlug}.php"`);

    await fs.unlink(tempFile);

    console.log(`✅ Copy "${copyType}" implementado em ${site}/${copySlug}/`);
    
  } catch (error) {
    console.error(`❌ Erro ao implementar copy: ${error.message}`);
    throw error;
  }
}

// Implementar post de blog gerado pela OpenAI
async function implementBlogPost(site, article, niche, number) {
  try {
    console.log(`📰 Implementando post ${number} para nicho: ${niche}`);
    
    // Extrair seções do artigo
    const titleMatch = article.match(/TÍTULO: (.*?)(?:\n|$)/);
    const metaMatch = article.match(/META DESCRIÇÃO: (.*?)(?:\n|$)/);
    const introMatch = article.match(/INTRODUÇÃO: ([\s\S]*?)(?:DESENVOLVIMENTO:|$)/);
    const contentMatch = article.match(/DESENVOLVIMENTO: ([\s\S]*?)(?:CONCLUSÃO:|$)/);
    const conclusionMatch = article.match(/CONCLUSÃO: ([\s\S]*?)(?:TAGS:|$)/);
    const tagsMatch = article.match(/TAGS: (.*?)(?:\n|$)/);
    const categoryMatch = article.match(/CATEGORIA: (.*?)(?:\n|$)/);

    const title = titleMatch ? titleMatch[1].trim() : `Post sobre ${niche} #${number}`;
    const meta = metaMatch ? metaMatch[1].trim() : '';
    const intro = introMatch ? introMatch[1].trim() : '';
    const content = contentMatch ? contentMatch[1].trim() : '';
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
    const tags = tagsMatch ? tagsMatch[1].trim() : niche;
    const category = categoryMatch ? categoryMatch[1].trim() : niche;

    // Montar conteúdo completo do post
    let postContent = '';
    if (intro) postContent += intro + '\n\n';
    if (content) postContent += content + '\n\n';
    if (conclusion) postContent += conclusion;

    // Criar post via WP-CLI
    const postCommand = `wp post create --post_title="${title}" --post_content="${postContent.replace(/"/g, '\\"')}" --post_status=publish --post_type=post`;
    
    const postResult = await runWP(site, postCommand);
    const postId = postResult.match(/Created post (\d+)/)?.[1];

    if (postId) {
      // Adicionar meta descrição se existir
      if (meta) {
        await runWP(site, `wp post meta update ${postId} _yoast_wpseo_metadesc "${meta}"`);
      }

      // Adicionar tags
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim()).join(',');
        await runWP(site, `wp post term set ${postId} post_tag "${tagList}"`);
      }

      // Adicionar categoria
      if (category) {
        // Criar categoria se não existir
        await runWP(site, `wp term create category "${category}" || true`);
        await runWP(site, `wp post term set ${postId} category "${category}"`);
      }

      console.log(`✅ Post "${title}" criado com ID: ${postId}`);
    } else {
      console.log(`⚠️ Post criado mas ID não encontrado`);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao implementar post: ${error.message}`);
    throw error;
  }
}

// Implementar campanha de marketing gerada pela OpenAI  
async function implementMarketing(site, campaign_content, campaign, target) {
  try {
    console.log(`📢 Implementando campanha: ${campaign}`);
    
    // Extrair seções da campanha
    const personasMatch = campaign_content.match(/PERSONAS: ([\s\S]*?)(?:EMAIL SEQUENCE:|$)/);
    const emailMatch = campaign_content.match(/EMAIL SEQUENCE: ([\s\S]*?)(?:SOCIAL MEDIA:|$)/);
    const socialMatch = campaign_content.match(/SOCIAL MEDIA: ([\s\S]*?)(?:GOOGLE ADS:|$)/);
    const adsMatch = campaign_content.match(/GOOGLE ADS: ([\s\S]*?)(?:LANDING PAGE:|$)/);
    const landingMatch = campaign_content.match(/LANDING PAGE: ([\s\S]*?)(?:VIDEO SCRIPTS:|$)/);
    const videoMatch = campaign_content.match(/VIDEO SCRIPTS: ([\s\S]*?)(?:CRONOGRAMA:|$)/);
    const scheduleMatch = campaign_content.match(/CRONOGRAMA: ([\s\S]*?)$/);

    const campaignSlug = campaign.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Criar página de documentação da campanha
    let campaignPage = `<?php
/*
Template Name: Campanha ${campaign}
Generated by AI Agent - ${new Date().toLocaleDateString()}
Target: ${target}
*/

get_header();
?>

<div class="marketing-campaign-container">
    <div class="container">
        <h1>Campanha: ${campaign}</h1>
        <p class="target-audience">Público-alvo: ${target}</p>
        
        <div class="campaign-sections">
`;

    // Seção Personas
    if (personasMatch) {
      campaignPage += `
            <div class="section personas-section">
                <h2>🎯 Personas</h2>
                <div class="content">
                    ${personasMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    // Seção Email Marketing
    if (emailMatch) {
      campaignPage += `
            <div class="section email-section">
                <h2>📧 Sequência de Emails</h2>
                <div class="content">
                    ${emailMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    // Seção Redes Sociais
    if (socialMatch) {
      campaignPage += `
            <div class="section social-section">
                <h2>📱 Redes Sociais</h2>
                <div class="content">
                    ${socialMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    // Seção Google Ads
    if (adsMatch) {
      campaignPage += `
            <div class="section ads-section">
                <h2>🎯 Google Ads</h2>
                <div class="content">
                    ${adsMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    // Seção Landing Page
    if (landingMatch) {
      campaignPage += `
            <div class="section landing-section">
                <h2>🎯 Landing Page Copy</h2>
                <div class="content">
                    ${landingMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    // Seção Vídeos
    if (videoMatch) {
      campaignPage += `
            <div class="section video-section">
                <h2>🎬 Scripts de Vídeo</h2>
                <div class="content">
                    ${videoMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    // Seção Cronograma
    if (scheduleMatch) {
      campaignPage += `
            <div class="section schedule-section">
                <h2>📅 Cronograma</h2>
                <div class="content">
                    ${scheduleMatch[1].trim().replace(/\n/g, '<br>')}
                </div>
            </div>
`;
    }

    campaignPage += `
        </div>
    </div>
</div>

<style>
.marketing-campaign-container {
    padding: 40px 0;
    background: #f8f9fa;
}

.target-audience {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 40px;
}

.campaign-sections {
    display: grid;
    gap: 30px;
}

.section {
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section h2 {
    color: #2c3e50;
    margin-bottom: 20px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

.section .content {
    line-height: 1.6;
    color: #444;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

@media (max-width: 768px) {
    .section {
        padding: 20px;
    }
}
</style>

<?php get_footer(); ?>
`;

    // Salvar e implementar
    const tempFile = `/tmp/campaign-${campaignSlug}-${Date.now()}.php`;
    await fs.writeFile(tempFile, campaignPage);

    const themePath = await runWP(site, `wp theme path --activate`);
    await runSSH(`scp ${tempFile} domains/${site}/public_html/wp-content/themes/$(basename ${themePath})/page-campaign-${campaignSlug}.php`);

    // Criar página no WordPress
    await runWP(site, `wp post create --post_type=page --post_title="Campanha ${campaign}" --post_name="campaign-${campaignSlug}" --post_status=publish --page_template="page-campaign-${campaignSlug}.php"`);

    await fs.unlink(tempFile);

    console.log(`✅ Campanha "${campaign}" documentada em ${site}/campaign-${campaignSlug}/`);
    console.log(`📊 Material pronto para implementação nos canais`);
    
  } catch (error) {
    console.error(`❌ Erro ao implementar campanha: ${error.message}`);
    throw error;
  }
}

// Implementar post gerado por ambas as IAs
async function implementPost(site, content, structure, topic) {
  try {
    console.log(`📝 Implementando post dual IA: ${topic}`);
    
    // Extrair comando WP-CLI da estrutura gerada pela Claude
    const wpCliMatch = structure.match(/=== WP-CLI COMMAND ===([\s\S]*?)(?:=== |$)/);
    const htmlMatch = structure.match(/=== HTML STRUCTURE ===([\s\S]*?)(?:=== |$)/);
    const cssMatch = structure.match(/=== CSS ===([\s\S]*?)(?:=== |$)/);
    const metaMatch = structure.match(/=== META ===([\s\S]*?)(?:=== |$)/);

    // Extrair dados do conteúdo da OpenAI
    const titleMatch = content.match(/TÍTULO: (.*?)(?:\n|$)/);
    const introMatch = content.match(/INTRODUÇÃO: ([\s\S]*?)(?:DESENVOLVIMENTO:|$)/);
    const developmentMatch = content.match(/DESENVOLVIMENTO: ([\s\S]*?)(?:CONCLUSÃO:|$)/);
    const conclusionMatch = content.match(/CONCLUSÃO: ([\s\S]*?)(?:TAGS:|$)/);
    const tagsMatch = content.match(/TAGS: (.*?)(?:\n|$)/);

    const title = titleMatch ? titleMatch[1].trim() : `Post sobre ${topic}`;
    const intro = introMatch ? introMatch[1].trim() : '';
    const development = developmentMatch ? developmentMatch[1].trim() : '';
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
    const tags = tagsMatch ? tagsMatch[1].trim() : topic;

    // Montar conteúdo final
    let finalContent = '';
    if (intro) finalContent += intro + '\n\n';
    if (development) finalContent += development + '\n\n';
    if (conclusion) finalContent += conclusion;

    // Usar comando WP-CLI da Claude se disponível
    if (wpCliMatch) {
      const wpCommand = wpCliMatch[1].trim();
      await runWP(site, wpCommand);
    } else {
      // Criar post padrão
      const postCommand = `wp post create --post_title="${title}" --post_content="${finalContent.replace(/"/g, '\\"')}" --post_status=publish --post_type=post`;
      const postResult = await runWP(site, postCommand);
      const postId = postResult.match(/Created post (\d+)/)?.[1];

      if (postId && tags) {
        const tagList = tags.split(',').map(tag => tag.trim()).join(',');
        await runWP(site, `wp post term set ${postId} post_tag "${tagList}"`);
      }
    }

    // Aplicar estrutura HTML personalizada se a Claude gerou
    if (htmlMatch || cssMatch) {
      const postSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      let customTemplate = `<?php
/*
Template Name: ${title}
Generated by Dual AI - ${new Date().toLocaleDateString()}
Content: OpenAI | Structure: Claude
*/

get_header();
?>

<div class="dual-ai-post-container">
    <div class="container">
`;

      if (htmlMatch) {
        customTemplate += htmlMatch[1].trim();
      } else {
        customTemplate += `
        <article class="post-content">
            <h1>${title}</h1>
            <div class="content">
                ${finalContent.replace(/\n/g, '<br>')}
            </div>
        </article>
`;
      }

      customTemplate += `
    </div>
</div>

<?php get_footer(); ?>
`;

      // Adicionar CSS da Claude se existir
      if (cssMatch) {
        customTemplate += `\n<style>\n${cssMatch[1].trim()}\n</style>`;
      }

      // Salvar template personalizado
      const tempFile = `/tmp/post-${postSlug}-${Date.now()}.php`;
      await fs.writeFile(tempFile, customTemplate);

      const themePath = await runWP(site, `wp theme path --activate`);
      await runSSH(`scp ${tempFile} domains/${site}/public_html/wp-content/themes/$(basename ${themePath})/page-${postSlug}.php`);

      await fs.unlink(tempFile);
    }

    console.log(`✅ Post dual IA "${title}" implementado com sucesso!`);
    console.log(`📝 Conteúdo: OpenAI | 🧠 Estrutura: Claude`);
    
  } catch (error) {
    console.error(`❌ Erro ao implementar post dual: ${error.message}`);
    throw error;
  }
}

// Interface principal - processAdvancedCommand
async function processAdvancedCommand(input) {
  const [command, ...args] = input.split(' ');
  
  // Comandos de cliente (multi-cliente)
  if (command === 'client') {
    const [subCommand, ...subArgs] = args;
    
    switch (subCommand) {
      case 'create':
        // Melhor parsing do nome com aspas
        const fullCommand = args.join(' ');
        const nameMatch = fullCommand.match(/"([^"]+)"/);
        const clientName = nameMatch ? nameMatch[1] : subArgs[0];
        
        if (!clientName) {
          return '❌ Uso: client create [nome] --email="..." --sites="..."';
        }
        
        // Extrair opções
        const options = {};
        const optionsText = fullCommand;
        
        const emailMatch = optionsText.match(/--email="([^"]+)"/);
        if (emailMatch) options.email = emailMatch[1];
        
        const sitesMatch = optionsText.match(/--sites="([^"]+)"/);
        if (sitesMatch) options.sites = sitesMatch[1];
        
        try {
          await clientCLI.createClientCommand(clientName, options);
          return `✅ Cliente "${clientName}" criado com sucesso!`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
        
      case 'list':
        try {
          await clientCLI.listClientsCommand();
          return '✅ Lista de clientes exibida acima';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
        
      case 'get':
        const identifier = subArgs[0];
        if (!identifier) {
          return '❌ Uso: client get [nome ou ID]';
        }
        
        try {
          await clientCLI.getClientCommand(identifier);
          return '✅ Cliente encontrado e exibido acima';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
        
      case 'get-by-site':
        const domain = subArgs[0];
        if (!domain) {
          return '❌ Uso: client get-by-site [dominio]';
        }
        
        try {
          await clientCLI.getClientBySiteCommand(domain);
          return '✅ Cliente do site encontrado e exibido acima';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
        
      case 'add-site':
        const [clientId, siteDomain, wpPath] = subArgs;
        if (!clientId || !siteDomain) {
          return '❌ Uso: client add-site [clientId] [dominio] [wpPath]';
        }
        
        try {
          await clientCLI.addSiteCommand(clientId, siteDomain, wpPath);
          return `✅ Site ${siteDomain} adicionado ao cliente!`;
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
        
      case 'stats':
        const statsClientId = subArgs[0];
        if (!statsClientId) {
          return '❌ Uso: client stats [clientId]';
        }
        
        try {
          await clientCLI.statsCommand(statsClientId);
          return '✅ Estatísticas exibidas acima';
        } catch (error) {
          return `❌ Erro: ${error.message}`;
        }
        
      case 'help':
        clientCLI.showHelp();
        return '✅ Ajuda de clientes exibida acima';
        
      default:
        return `❌ Subcomando não reconhecido: "${subCommand}"\n💡 Use "client help" para ver comandos disponíveis`;
    }
  }
  
  switch (command) {
    case 'help':
      return `
🧠 AGENTE IA AVANÇADO - Comandos Disponíveis

🏢 SISTEMA MULTI-CLIENTE:
• client create [nome] --email="..." --sites="..." - Criar cliente
• client list - Listar todos os clientes
• client get [nome ou ID] - Buscar cliente específico  
• client get-by-site [dominio] - Buscar cliente por site
• client add-site [clientId] [dominio] [path] - Adicionar site ao cliente
• client stats [clientId] - Estatísticas do cliente
• client help - Ajuda completa de clientes

🔧 COMANDOS CLAUDE (Código/Sistemas):
• create-page [site] [descrição] - Criar página WordPress
• create-plugin [site] [nome] [descrição] - Criar plugin WordPress  
• create-form [site] [tipo] [campos] - Criar formulário personalizado
• create-dashboard [site] [tipo] [funcionalidades] - Criar dashboard admin
• create-upload [site] [email] - Criar formulário de upload

📝 COMANDOS OPENAI (Conteúdo/Textos):
• create-copy [site] [tipo] [produto] - Criar copy de vendas
• create-blog [site] [nicho] [quantidade] - Criar posts de blog
• create-marketing [site] [campanha] [target] - Criar campanha completa

🔄 COMANDOS DUAIS (OpenAI + Claude):
• create-post [site] [tópico] - Conteúdo (OpenAI) + Estrutura (Claude)
• create-content [tipo] [tópico] - Escolha automática ou manual da IA

🌐 COMANDOS GERAIS:
• sites - Listar sites disponíveis
• status - Verificar status dos sites
• ai [pergunta] - Assistente IA (escolhe automaticamente)

💡 EXEMPLOS:
• create-page agenciafer.com.br landing page de vendas
• create-plugin metodoverus.com.br sistema-membros Sistema de área de membros
• create-copy malucosta.com.br vendas Curso de Fotografia
• create-post aiofotoevideo.com.br dicas de fotografia para iniciantes
• create-blog agenciafer.com.br marketing digital 3
`;

    case 'create-page':
      const site = args[0];
      const description = args.slice(1).join(' ');
      if (!site || !description) {
        return '❌ Uso: create-page [site] [descrição da página]';
      }
      return await ADVANCED_COMMANDS['create-page'](site, description);

    case 'create-plugin':
      const pluginSite = args[0];
      const pluginName = args[1];
      const pluginDesc = args.slice(2).join(' ');
      if (!pluginSite || !pluginName || !pluginDesc) {
        return '❌ Uso: create-plugin [site] [nome-do-plugin] [descrição]';
      }
      return await ADVANCED_COMMANDS['create-plugin'](pluginSite, pluginName, pluginDesc);

    case 'create-form':
      const formSite = args[0];
      const formType = args[1];
      const formFields = args.slice(2).join(' ');
      if (!formSite || !formType || !formFields) {
        return '❌ Uso: create-form [site] [tipo-formulário] [campos]';
      }
      return await ADVANCED_COMMANDS['create-form'](formSite, formType, formFields);

    case 'create-dashboard':
      const dashSite = args[0];
      const dashType = args[1];
      const dashFeatures = args.slice(2).join(' ');
      if (!dashSite || !dashType || !dashFeatures) {
        return '❌ Uso: create-dashboard [site] [tipo] [funcionalidades]';
      }
      return await ADVANCED_COMMANDS['create-dashboard'](dashSite, dashType, dashFeatures);

    case 'create-upload':
      const uploadSite = args[0];
      const email = args[1];
      if (!uploadSite || !email) {
        return '❌ Uso: create-upload [site] [email-destino]';
      }
      return await ADVANCED_COMMANDS['create-upload-form'](uploadSite, email);

    case 'create-copy':
      const copySite = args[0];
      const copyType = args[1];
      const copyProduct = args.slice(2).join(' ');
      if (!copySite || !copyType || !copyProduct) {
        return '❌ Uso: create-copy [site] [tipo-copy] [produto/serviço]';
      }
      return await ADVANCED_COMMANDS['create-copy'](copySite, copyType, copyProduct);

    case 'create-blog':
      const blogSite = args[0];
      const blogNiche = args[1];
      const blogQuantity = parseInt(args[2]) || 1;
      if (!blogSite || !blogNiche) {
        return '❌ Uso: create-blog [site] [nicho] [quantidade]';
      }
      return await ADVANCED_COMMANDS['create-blog'](blogSite, blogNiche, blogQuantity);

    case 'create-marketing':
      const marketingSite = args[0];
      const campaignName = args[1];
      const targetAudience = args.slice(2).join(' ');
      if (!marketingSite || !campaignName || !targetAudience) {
        return '❌ Uso: create-marketing [site] [nome-campanha] [público-alvo]';
      }
      return await ADVANCED_COMMANDS['create-marketing'](marketingSite, campaignName, targetAudience);

    case 'create-post':
      const postSite = args[0];
      const postTopic = args.slice(1).join(' ');
      if (!postSite || !postTopic) {
        return '❌ Uso: create-post [site] [tópico do post]';
      }
      return await ADVANCED_COMMANDS['create-post'](postSite, postTopic);

    case 'create-content':
      const contentType = args[0];
      const contentTopic = args.slice(1).join(' ');
      if (!contentType || !contentTopic) {
        return '❌ Uso: create-content [tipo] [tópico]';
      }
      return await ADVANCED_COMMANDS['create-content'](contentType, contentTopic);

    case 'create-subdomain':
      const subdomain = args[0];
      const mainSite = args[1];
      const purpose = args.slice(2).join(' ');
      if (!subdomain || !mainSite) {
        return '❌ Uso: create-subdomain [nome] [site-principal] [propósito]';
      }
      return await ADVANCED_COMMANDS['create-subdomain'](subdomain, mainSite, purpose);

    case 'create-system':
      const systemSite = args[0];
      const systemType = args[1];
      const systemParams = args.slice(2);
      if (!systemSite || !systemType) {
        return '❌ Uso: create-system [site] [tipo] [parâmetros]';
      }
      return await ADVANCED_COMMANDS['create-system'](systemSite, systemType, ...systemParams);

    case 'deploy-site':
      const newSubdomain = args[0];
      const deployMainSite = args[1];
      const deployType = args[2];
      if (!newSubdomain || !deployMainSite || !deployType) {
        return '❌ Uso: deploy-site [subdominio] [site-principal] [tipo]';
      }
      return await ADVANCED_COMMANDS['deploy-site'](newSubdomain, deployMainSite, deployType);

    case 'ai':
      const request = args.join(' ');
      if (!request) {
        return '❌ Uso: ai [sua solicitação]';
      }
      return await ADVANCED_COMMANDS['ai-assistant'](request);

    case 'sites':
      return `🌐 Sites disponíveis:\n${CONFIG.sites.map(site => `  • ${site}`).join('\n')}`;

    case 'status':
      console.log('🔍 Verificando status dos sites...');
      let statusReport = '📊 STATUS DOS SITES:\n\n';
      
      for (const site of CONFIG.sites) {
        try {
          const wpStatus = await runWP(site, 'wp core version');
          const isOnline = wpStatus.includes('WordPress') || wpStatus.includes('5.') || wpStatus.includes('6.');
          statusReport += `${isOnline ? '✅' : '❌'} ${site} - ${isOnline ? 'Online' : 'Offline'}\n`;
          
          if (isOnline) {
            const theme = await runWP(site, 'wp theme list --status=active --field=name');
            const plugins = await runWP(site, 'wp plugin list --status=active --field=name');
            statusReport += `   📁 Tema: ${theme.trim()}\n`;
            statusReport += `   🔌 Plugins: ${plugins.trim().split('\n').length} ativos\n`;
          }
        } catch (error) {
          statusReport += `❌ ${site} - Erro: ${error.message}\n`;
        }
        statusReport += '\n';
      }
      
      return statusReport;

    default:
      return `❌ Comando não reconhecido: "${command}"\n💡 Digite "help" para ver todos os comandos disponíveis.`;
  }
}

// Interface CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🧠 AI Agent > '
});

console.log(`
🧠 AGENTE IA AVANÇADO - Claude + WordPress

🎯 Capacidades:
• Criação automática de páginas com Claude
• Formulários de upload personalizados  
• Gerenciamento de subdomínios
• Assistente IA para desenvolvimento web

🌐 Sites: ${CONFIG.sites.join(', ')}
💡 Digite 'help' para ver comandos
`);

rl.prompt();

rl.on('line', async (input) => {
  const command = input.trim();
  
  if (command === 'exit') {
    console.log('👋 Saindo...');
    rl.close();
    process.exit(0);
  }
  
  if (command === 'help') {
    console.log(await processAdvancedCommand('help'));
  } else {
    try {
      const result = await processAdvancedCommand(command);
      console.log(result);
    } catch (error) {
      console.error('❌ Erro:', error.message);
    }
  }
  
  console.log();
  rl.prompt();
});

module.exports = { processAdvancedCommand, askClaude };
