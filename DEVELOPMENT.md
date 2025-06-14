# Bot WhatsApp com IA - Documento de Desenvolvimento

## Visão Geral do Projeto
Este é um bot de WhatsApp integrado com a OpenAI, projetado para fornecer respostas inteligentes e naturais. O bot utiliza whatsapp-web.js para conexão com WhatsApp e a API da OpenAI para processamento de linguagem natural.

## Estrutura do Projeto
```
bot-whatsapp/
├── index.js               # Ponto de entrada da aplicação
├── package.json          # Dependências e scripts
└── src/
    ├── handlers/         # Manipuladores de eventos
    │   └── messageHandler.js
    ├── services/         # Serviços externos
    │   ├── openai.js
    │   └── whatsapp.js
    └── utils/
        └── helpers.js
```

## Estado Atual
O bot já possui as seguintes funcionalidades:
- Conexão com WhatsApp via QR Code
- Integração com OpenAI GPT-4
- Processamento de mensagens de texto e áudio
- Simulação de digitação humana
- Divisão de mensagens longas

## Melhorias em Implementação

### 1. Sistema de Delay Inteligente (Prioridade: Alta)
**Objetivo**: Aguardar múltiplas mensagens do usuário antes de responder.

**Detalhes**:
- Delay base de 5-10 segundos após cada mensagem
- Reset do timer se nova mensagem chegar
- Reset imediato se detectar "digitando..."
- Agrupamento de mensagens em sequência

**Status**: Concluído

### 2. Sistema de Pausa Contextual (Prioridade: Média)
**Objetivo**: Gerenciar interrupções durante respostas longas.

**Detalhes**:
- Detectar interrupções do usuário
- Pausar resposta em andamento
- Perguntar contextualmente se deve continuar
- Manter contexto do que já foi respondido

**Status**: Concluído

### 3. Sistema de Intervenção Humana (Prioridade: Média)
**Objetivo**: Permitir que o dono do bot intervenha em conversas.

**Detalhes**:
- Detectar mensagens do dono do bot
- Pausar bot por 10 minutos inicialmente
- Extensão para 45 minutos se nova intervenção
- Limite máximo de 1 hora de pausa

**Status**: Concluído

## Estados e Estruturas de Dados Necessários

### Estrutura de Estados de Conversa
```javascript
const conversationStates = {
  messageQueue: new Map(),    // Fila de mensagens durante delay
  pauseStates: new Map(),     // Estados de pausa para intervenção
  responseStates: new Map(),  // Estado das respostas longas
  typingStates: new Map(),    // Estado de digitação dos usuários
};
```

### Estado de Resposta
```javascript
const responseState = {
  fullResponse: "",          // Resposta completa
  sentParts: [],            // Partes já enviadas
  remainingParts: [],       // Partes a enviar
  lastInteraction: Date,    // Última interação
  isWaitingForConfirmation: boolean
};
```

## Próximos Passos
1. Implementar sistema de delay inteligente
2. Adicionar detecção de interrupção
3. Implementar pausa contextual
4. Adicionar sistema de intervenção humana
5. Testes e ajustes finos

## Notas para Desenvolvimento
- Manter o comportamento humanizado do bot
- Priorizar experiência natural do usuário
- Garantir que o contexto seja mantido
- Implementar logs detalhados para debug

## Histórico de Atualizações
- [26/05/2025] Documento inicial criado
- [Próximas atualizações serão adicionadas conforme implementação]

---
**Nota para IAs**: Este documento serve como guia para entender o sistema e suas melhorias planejadas. Ao contribuir com o código, mantenha o foco na naturalidade da interação e na manutenção do contexto das conversas.
