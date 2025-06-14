const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

// Criar instância do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gera resposta usando a OpenAI
 * @param {string} message - Mensagem enviada pelo usuário
 * @param {Array} history - Histórico de mensagens (opcional)
 * @returns {Promise<string>} - Resposta gerada
 */
// Definição da ferramenta que a OpenAI pode chamar
const tools = [
  {
    type: "function",
    function: {
      name: "getCurrentTime",
      description: "Obtém a data e hora atuais.",
      parameters: {
        type: "object",
        properties: {}, // Nenhum parâmetro necessário para esta função
      },
    },
  },
];

// Função local que será executada quando a OpenAI solicitar
function getCurrentTime() {
  const now = new Date();
  const formattedDateTime = `${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  return JSON.stringify({ currentTime: formattedDateTime }); // OpenAI espera uma string JSON como resultado da ferramenta
}

async function generateResponse(message, history = []) {
  try {
    // Se message for um array (como no caso de history completo), usa diretamente
    // Se for string, adiciona ao history como nova mensagem do usuário
    let messages;
    if (Array.isArray(message)) {
      messages = message;
    } else {
      messages = [...history, { role: 'user', content: message }];
    }
    
    // Primeira chamada para a OpenAI, permitindo que ela use ferramentas
    let response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      tools: tools,
      tool_choice: "auto", // Permite que a OpenAI decida se usa uma ferramenta
      temperature: 0.7,
      max_tokens: 500,
    });

    let responseMessage = response.choices[0].message;

    // Verifica se a OpenAI solicitou uma chamada de ferramenta
    if (responseMessage.tool_calls) {
      console.log("OpenAI solicitou chamada de ferramenta:", responseMessage.tool_calls);
      // Adiciona a resposta da IA (com a solicitação da ferramenta) ao histórico
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        if (functionName === "getCurrentTime") {
          const functionResponse = getCurrentTime();
          
          // Adiciona o resultado da ferramenta ao histórico
          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: functionResponse, // O resultado da nossa função local
          });
        }
      }

      // Segunda chamada para a OpenAI com o resultado da ferramenta
      console.log("Enviando resultado da ferramenta para OpenAI...");
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages, // Envia o histórico atualizado com o resultado da ferramenta
        temperature: 0.7,
        max_tokens: 500,
      });
      responseMessage = response.choices[0].message;
    }

    return responseMessage.content.trim();
  } catch (error) {
    console.error('Erro ao gerar resposta com OpenAI:', error);
    // Adiciona mais detalhes do erro, se disponíveis
    if (error.response && error.response.data) {
      console.error('Detalhes do erro da API OpenAI:', error.response.data);
    }
    return 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?';
  }
}

/**
 * Transcreve áudio para texto usando a OpenAI (Whisper)
 * @param {string} audioPath - Caminho do arquivo de áudio
 * @returns {Promise<string>} - Texto transcrito
 */
async function transcribeAudio(audioPath) {
  try {
    const audioFile = fs.createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",  // Idioma em português
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    return null;
  }
}

module.exports = {
  generateResponse,
  transcribeAudio,
};
