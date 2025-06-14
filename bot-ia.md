# Documentação Completa do Bot WhatsApp com IA

## Visão Geral

O Bot WhatsApp com IA é uma solução avançada que integra WhatsApp Web, OpenAI GPT-4 e Google Calendar para automatizar comunicações e agendamentos. O bot simula interações humanas, compreende linguagem natural e gerencia compromissos de forma inteligente, proporcionando uma experiência de usuário fluida e natural.

## Arquitetura do Sistema

### Estrutura do Projeto
```
bot-whatsapp/
├── index.js                      # Ponto de entrada da aplicação
├── package.json                  # Dependências e scripts
└── src/
    ├── handlers/                 # Manipuladores de eventos
    │   └── messageHandler.js     # Gerenciamento de mensagens
    ├── services/                 # Serviços externos
    │   ├── openai.js            # Integração com OpenAI
    │   ├── whatsapp.js          # Integração com WhatsApp
    │   └── googleCalendar.js    # Integração com Google Calendar
    └── utils/                    # Utilitários
        ├── helpers.js           # Funções auxiliares diversas
        ├── intentAnalyzer.js    # Análise de intenções do usuário
        ├── contextualResponses.js # Geração de respostas contextuais
        ├── conversationFlow.js  # Gerenciamento de fluxo de conversas
        └── humanBehaviorSimulator.js # Simulação de comportamento humano
```

## Funcionalidades Principais

### 1. Sistema de Conexão com WhatsApp

- **Autenticação via QR Code**: Permite conectar a uma conta WhatsApp através da leitura de um código QR.
- **Reconhecimento do Administrador**: Identifica automaticamente o número que escaneou o QR como administrador do bot.
- **Gestão de Sessão**: Mantém a sessão ativa e reconecta automaticamente em caso de queda.

### 2. Processamento de Linguagem Natural com OpenAI

- **Integração com GPT-4**: Utiliza o modelo GPT-4 da OpenAI para interpretação avançada de mensagens.
- **Ferramentas de Função**: Permite ao GPT acessar funções externas como obtenção de hora atual.
- **Contextualização de Respostas**: Mantém o contexto da conversa para respostas mais coerentes.
- **Transcrição de Áudio**: Converte mensagens de voz em texto para processamento.

### 3. Sistema de Análise de Intenções

- **Detecção de Intenções**: Identifica automaticamente o propósito da mensagem do usuário através de análise de padrões linguísticos.
- **Categorias de Intenções**: Suporta múltiplas categorias como:
  - Agendamento (`SCHEDULE`): Detecta expressões como "marcar", "agendar", "reservar", "disponibilidade"
  - Reagendamento (`RESCHEDULE`): Identifica termos como "remarcar", "reagendar", "alterar", "mudar"
  - Cancelamento (`CANCEL`): Reconhece palavras como "cancelar", "desmarcar", "desistir"
  - Informações (`INFO`): Detecta perguntas sobre serviços, horários, preços
  - Listagem (`LIST`): Identifica pedidos para listar compromissos agendados
  - Saudação (`GREETING`): Reconhece cumprimentos como "olá", "oi", "bom dia"
  - Despedida (`FAREWELL`): Detecta expressões como "tchau", "até mais", "adeus"
  - Reclamação (`COMPLAINT`): Identifica expressões de insatisfação
  - Agradecimento (`THANKS`): Reconhece palavras como "obrigado", "valeu", "grato"
  - Confirmação (`CONFIRMATION`): Detecta afirmações como "sim", "confirmo", "ok", "beleza"
  - Rejeição (`REJECTION`): Identifica negações como "não", "não quero", "negativo"
  - Confusão (`CONFUSION`): Reconhece expressões de dúvida ou incompreensão
- **Análise de Confiança**: Atribui um nível de confiança (0.0-1.0) às intenções detectadas, permitindo tratamento diferenciado conforme certeza da interpretação.
- **Extração de Entidades**: Captura dados contextuais como:
  - Períodos do dia (manhã, tarde) 
  - Referências temporais
  - Contexto emocional
  - Preferências do usuário

### 4. Sistema de Fluxo de Conversação

- **Máquina de Estados**: Gerencia conversas através de estados definidos (saudação, aguardando data, confirmando agendamento, etc).
- **Estados de Conversa**: Inclui estados como:
  - `INITIAL`: Estado inicial da conversa
  - `GREETING`: Saudação inicial
  - `AWAITING_DATE`: Aguardando usuário informar data
  - `AWAITING_TIME`: Aguardando usuário informar horário
  - `SUGGESTING_SLOTS`: Sugerindo horários disponíveis
  - `CONFIRMING_APPOINTMENT`: Confirmando agendamento
  - `APPOINTMENT_CONFIRMED`: Agendamento confirmado
  - `LISTING_APPOINTMENTS`: Listando compromissos
  - `HANDLING_COMPLAINT`: Tratando reclamações
  - `FAREWELL`: Despedida
- **Transições de Estado**: Controla a mudança entre estados com base nas intenções detectadas.
- **Histórico de Estados**: Mantém o histórico de estados para recuperação de contexto.

### 5. Sistema de Respostas Contextuais

- **Resposta Adaptativa**: Gera respostas personalizadas baseadas no estado da conversa e intenção do usuário.
- **Variantes de Mensagens**: Utiliza diferentes variações de texto para a mesma situação, evitando respostas repetitivas.
- **Mensagens Baseadas em Contexto**: Adapta respostas de acordo com o histórico da conversa e dados do usuário.
- **Gestão de Respostas Complexas**: Divide respostas longas em partes mais gerenciáveis.

### 6. Simulador de Comportamento Humano

- **Simulação de Digitação**: Imita o comportamento humano de digitação com:
  - Taxa média de digitação de 6 caracteres por segundo
  - Variação aleatória (±20%) nos tempos de digitação
  - Tempo máximo de 12 segundos e mínimo de 800ms
  - Tempo adicional para perguntas e mensagens complexas (1,5 a 3 segundos extras)
  
- **Pausas Naturais**: Insere pausas entre mensagens para simular o tempo de reflexão humano:
  - Divisão inteligente de mensagens longas em parágrafos e frases
  - Pausas mais longas (1,5 a 2,5 segundos) entre parágrafos
  - Pausas médias (800ms a 1,5 segundos) entre grupos de frases
  
- **Simulação de Erros de Digitação**: Reproduz erros humanos comuns:
  - Chance de 5% de erro em mensagens com mais de 10 caracteres
  - Troca de letras por vizinhas no teclado QWERTY
  - Auto-correção após envio de mensagem com erro
  
- **Comportamento Contextual**: Ajusta os tempos de resposta conforme:
  - Complexidade da mensagem (mais tempo para mensagens elaboradas)
  - Presença de perguntas (adiciona tempo para "pensar")
  - Tamanho do conteúdo (mensagens longas são divididas em blocos naturais)

### 7. Sistema de Gerenciamento de Agenda (Google Calendar)

- **Consulta de Agenda**: Verifica disponibilidade em datas e horários solicitados.
- **Criação de Eventos**: Cria novos compromissos diretamente no Google Calendar, incluindo:
  - Título e descrição do evento
  - Data e hora de início e término
  - Associação com ID do usuário WhatsApp
  - Configuração de fuso horário (padrão: America/Sao_Paulo)
- **Modificação de Eventos**: Permite alterar data, horário ou detalhes de compromissos existentes.
- **Cancelamento de Eventos**: Possibilita cancelar compromissos agendados.
- **Listagem de Compromissos**: Apresenta lista de compromissos agendados para o usuário.
- **Associação de Usuários**: Vincula eventos do calendário a usuários específicos do WhatsApp através de propriedades estendidas do Google Calendar.
- **Filtragem por Usuário**: Capacidade de buscar eventos associados a um usuário específico.
- **Gerenciamento de Conflitos**: Verificação automática de conflitos de horário.

### 8. Sistema de Delay Inteligente

- **Espera Estratégica**: Aguarda um período após a mensagem do usuário antes de responder.
- **Agrupamento de Mensagens**: Agrupa múltiplas mensagens recebidas em sequência.
- **Reset de Timer**: Reinicia o temporizador se novas mensagens chegarem durante a espera.
- **Detecção de Digitação**: Reconhece quando o usuário está digitando e adapta o comportamento.

### 9. Sistema de Intervenção Humana

- **Detecção de Administrador**: Identifica quando o dono do bot envia mensagens.
- **Pausa Automática**: Desativa o bot temporariamente para permitir intervenção humana.
- **Extensão de Pausa**: Permite aumentar o tempo de pausa se novas intervenções ocorrerem.
- **Notificação de Status**: Informa ao administrador quando a pausa inicia e termina.

### 10. Sistema de Gerenciamento de Interrupções

- **Detecção de Interrupções**: Reconhece quando o usuário interrompe uma resposta longa.
- **Pausa de Resposta**: Interrompe a resposta em andamento quando o usuário envia nova mensagem.
- **Confirmação Contextual**: Pergunta ao usuário se deve continuar com a resposta anterior.
- **Gerenciamento de Partes Enviadas**: Controla quais partes da resposta já foram enviadas.

### 11. Sistema de Reconhecimento de Datas e Horários

- **Interpretação Flexível**: Reconhece datas e horários em diversos formatos (numérico, por extenso).
- **Datas Relativas**: Compreende expressões como "amanhã", "próxima semana", "depois de amanhã".
- **Períodos do Dia**: Interpreta menções a períodos como "manhã", "tarde", "noite".
- **Formatação Humanizada**: Converte datas para formatos facilmente legíveis por humanos.

### 12. Sistema de Agendamento Flexível

- **Sugestão de Horários**: Oferece alternativas quando o horário solicitado não está disponível.
- **Escassez Estratégica**: Utiliza técnicas de escassez para motivar decisões rápidas sobre agendamentos.
- **Processamento de Solicitações**: Analisa pedidos de agendamento em linguagem natural.
- **Confirmação em Etapas**: Guia o usuário pelas etapas necessárias para confirmar um agendamento.

### 13. Sistema de Reconhecimento de Números de Teste

- **Configuração de Testes**: Permite configurar números específicos para testes do bot.
- **Confirmação Inicial**: Solicita confirmação ao primeiro usuário que envia mensagem.
- **Modo Teste**: Comportamento especial quando interagindo com números de teste.

## Integração de Serviços

### OpenAI API
- **Modelo**: GPT-4
- **Funcionalidades**: Processamento de linguagem natural, geração de respostas, análise de contexto
- **Configuração**: Via variável de ambiente `OPENAI_API_KEY`

### WhatsApp Web
- **Biblioteca**: whatsapp-web.js
- **Autenticação**: Local usando QR Code
- **Recursos**: Envio/recebimento de mensagens, detecção de digitação, mídia, manipulação de áudio

### Google Calendar API
- **Autenticação**: Conta de serviço Google (JSON key)
- **Recursos**: Criação, listagem, atualização e exclusão de eventos
- **Configuração**: Arquivo de credenciais em `/config/google-service-account.json`

## Gerenciamento de Estado

### Estruturas de Dados
- **Filas de Mensagens**: Armazena mensagens recebidas durante período de delay
- **Estados de Conversa**: Mantém o estado atual de cada conversa com usuários
- **Estados de Digitação**: Monitora quando usuários estão digitando
- **Estados de Pausa**: Controla pausas para intervenção humana
- **Histórico de Conversas**: Armazena mensagens anteriores para manter contexto

### Persistência
- O sistema utiliza armazenamento em memória para a sessão atual
- Credenciais do WhatsApp são persistidas localmente para reconexão automática

## Fluxo de Processamento de Mensagens

A sequência de processamento quando uma nova mensagem chega segue o fluxo abaixo:

1. **Recebimento de Mensagem (WhatsApp Web.js)**
   - Evento de mensagem é capturado (texto ou áudio)
   - Áudios são baixados e enviados para transcrição

2. **Pré-processamento**
   - Verificação se é número de teste ou administrador
   - Verificação se o bot está em modo de pausa para intervenção
   - Adição da mensagem à fila de delay inteligente

3. **Análise de Intenção**
   - A mensagem é analisada para detectar a intenção do usuário
   - São extraídas entidades relevantes (datas, horários, etc.)

4. **Gerenciamento de Estado da Conversa**
   - Avaliação do estado atual da conversa
   - Determinação da transição de estado apropriada

5. **Geração de Resposta**
   - Obtenção de resposta contextual ou via OpenAI
   - Consulta/atualização do Google Calendar quando necessário

6. **Simulação de Comportamento Humano**
   - Cálculo de tempo de digitação
   - Divisão de mensagens longas
   - Simulação de erros de digitação ocasionais

7. **Entrega da Resposta**
   - Indicador de "digitando..." é ativado
   - Envio da mensagem após tempo realista
   - Envio de partes da mensagem com pausas naturais

## Tratamento de Erros

- **Mensagens de Fallback**: Respostas genéricas quando o sistema não consegue processar corretamente
- **Logging**: Registro detalhado de erros para diagnóstico
- **Reconexão Automática**: Tentativas de reconexão em caso de falha na comunicação com WhatsApp
- **Handlers de Exceções**: Captura de erros não tratados para evitar que o bot pare completamente

## Requisitos de Sistema

- **Node.js**: v14+ recomendado
- **Dependências**: 
  - whatsapp-web.js (v1.23.0): Interface para WhatsApp Web
  - openai (v4.20.0): SDK para integração com OpenAI
  - googleapis (v149.0.0): SDK para acesso às APIs do Google
  - dotenv (v16.3.1): Gerenciamento de variáveis de ambiente
  - qrcode-terminal (v0.12.0): Geração de QR code no terminal
- **Ambiente**: Acesso à Internet, permissão para manter conexão WebSocket
- **Autenticação**: Conta WhatsApp ativa, chave API OpenAI, credenciais Google

## Configuração e Inicialização

1. Configure as variáveis de ambiente (arquivo `.env`):
   - `OPENAI_API_KEY`: Chave API da OpenAI
   - Outras configurações personalizadas

2. Configure as credenciais Google:
   - Coloque o arquivo JSON da conta de serviço em `/config/google-service-account.json`

3. Inicie o bot:
   ```
   npm install
   npm start
   ```

4. Escaneie o código QR exibido no terminal com o WhatsApp do número administrador

## Considerações de Segurança

- O sistema sanitiza entradas para prevenir injeções
- Credenciais são armazenadas em variáveis de ambiente ou arquivos locais
- A autenticação WhatsApp é protegida por QR Code e gerenciada localmente
- O acesso ao Google Calendar é restrito pelo escopo definido nas credenciais

## Limitações Conhecidas

- Dependência da conexão contínua com a internet
- Sujeito às limitações de API da OpenAI (rate limits, etc.)
- Capacidade limitada de processamento de imagens
- Possível confusão em situações de agendamento muito complexas

## Exemplos de Uso e Cenários

### Cenário 1: Configuração e Inicialização
```
[Usuário escaneou o QR Code]
[Sistema] ✅ BOT CONECTADO E PRONTO!
[Sistema] 🔑 Administrador do Bot definido como: 5511999991234@c.us
[Sistema] 🤖 Aguardando mensagens...

[Primeiro usuário] Olá
[Sistema] 🔧 Deseja configurar este número como número de teste oficial?
          Para confirmar, responda apenas: ok
[Primeiro usuário] ok
[Sistema] ✅ Número 5511999992222@c.us configurado como número de teste oficial. O bot está pronto para uso!
```

### Cenário 2: Agendamento de Sessão Fotográfica
```
[Cliente] Oi, bom dia!
[Bot] Bom dia! Como posso ajudar com seu agendamento hoje?
[Cliente] Queria marcar um ensaio fotográfico
[Bot] Claro! Para qual data você gostaria de agendar seu ensaio?
[Cliente] Quero na próxima sexta-feira
[Bot] Ótimo! E qual horário seria melhor para você?
[Cliente] Pode ser pela manhã, tipo 10h?
[Bot] Deixe-me verificar a disponibilidade...
      Tenho disponibilidade para sexta-feira, 30 de maio, às 10h. 
      Confirma esse horário para seu ensaio fotográfico?
[Cliente] Sim, confirmo
[Bot] Perfeito! Seu agendamento foi confirmado para sexta-feira, 30 de maio, às 10h.
      Enviei um convite para o seu e-mail e adicionei ao seu calendário.
      No dia anterior ao ensaio, enviarei um lembrete. Precisa de mais alguma informação?
```

### Cenário 3: Intervenção do Administrador
```
[Cliente] Quanto tempo dura o ensaio?
[Admin/Fotógrafo] Olá! Aqui é o fotógrafo. Os ensaios geralmente duram cerca de 1 hora.
                  Você precisará trazer 3 mudas de roupa.
[Sistema] 🤖 Bot pausado por 10 minutos para intervenção humana.
[Cliente] Ok, muito obrigado pela informação!
[Admin/Fotógrafo] De nada! Estou ansioso pelo seu ensaio.
[Sistema] 🤖 Pausa de intervenção expirou. Bot reativado automaticamente.
```

### Cenário 4: Cancelamento de Agendamento
```
[Cliente] Preciso cancelar meu ensaio de sexta
[Bot] Entendi que você deseja cancelar seu agendamento. 
      Você tem um ensaio marcado para sexta-feira, 30 de maio, às 10h.
      Confirma que deseja cancelar este compromisso?
[Cliente] Sim, preciso cancelar
[Bot] Seu agendamento foi cancelado com sucesso. 
      Se desejar remarcar para outra data, é só me avisar.
```

---

Documentação gerada em 27 de maio de 2025, versão 1.0
