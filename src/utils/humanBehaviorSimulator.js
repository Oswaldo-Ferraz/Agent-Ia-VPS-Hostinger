/**
 * Simulador de comportamento humano para tornar o bot mais natural
 */

/**
 * Calcula um tempo de digitação realista para uma mensagem
 * @param {string} message - Mensagem a ser enviada
 * @returns {number} Tempo em milissegundos
 */
function calculateTypingTime(message) {
  if (!message) return 0;
  
  // Taxa média de digitação (caracteres por segundo)
  const avgTypingSpeed = 6;
  
  // Tempo base em ms
  let typingTime = Math.min(Math.floor(message.length / avgTypingSpeed) * 1000, 10000);
  
  // Adicionar variação aleatória (±20%)
  const variation = typingTime * 0.2;
  typingTime += Math.floor(Math.random() * variation * 2) - variation;
  
  // Adicionar tempo para pensar em mensagens mais complexas ou questões
  if (message.includes('?') || message.length > 150) {
    typingTime += 1500 + Math.random() * 1500;
  }
  
  // Garantir tempo mínimo e máximo
  return Math.max(800, Math.min(typingTime, 12000));
}

/**
 * Simula pausas naturais em uma mensagem (tempo entre partes de uma resposta)
 * @param {string} fullMessage - Mensagem completa
 * @returns {Array} Array de partes da mensagem com tempos de pausa
 */
function simulateNaturalPauses(fullMessage) {
  if (!fullMessage) return [{ text: '', pause: 0 }];
  
  // Quebra em parágrafos primeiro
  const paragraphs = fullMessage.split(/\n\n+/);
  const result = [];
  
  paragraphs.forEach((paragraph, i) => {
    // Para parágrafos muito longos, quebre em frases
    if (paragraph.length > 150) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      let currentBatch = '';
      sentences.forEach((sentence, j) => {
        currentBatch += (j > 0 ? ' ' : '') + sentence;
        
        // Agrupa de 1-3 frases, dependendo do tamanho
        if (j % 2 === 1 || j === sentences.length - 1 || currentBatch.length > 150) {
          result.push({
            text: currentBatch,
            // Pausa mais longa entre parágrafos ou grupos de frases
            pause: j === sentences.length - 1 && i < paragraphs.length - 1 ? 
                  1500 + Math.random() * 1000 : 
                  800 + Math.random() * 700
          });
          currentBatch = '';
        }
      });
    } else {
      // Parágrafos curtos vão como um único item
      result.push({
        text: paragraph,
        pause: i < paragraphs.length - 1 ? 1200 + Math.random() * 800 : 0
      });
    }
  });
  
  return result;
}

/**
 * Simulador de erros de digitação humana
 * @param {string} message - Mensagem original
 * @returns {Object} Mensagem com erro e correção
 */
function simulateTypingError(message) {
  // Chance de ter um erro de digitação (5%)
  if (Math.random() > 0.05 || !message || message.length < 10) {
    return { hasError: false, message };
  }
  
  const errorTypes = [
    // Troca de letras próximas no teclado
    (msg) => {
      const keyboardNeighbors = {
        'a': 'sçqwz', 'b': 'vghn', 'c': 'xdfv', 'd': 'sfxce',
        'e': 'wrsdf', 'f': 'drcvg', 'g': 'ftbvh', 'h': 'gybnj',
        'i': 'ujko', 'j': 'hynki', 'k': 'jiml', 'l': 'koçm',
        'm': 'nlçk', 'n': 'bmhj', 'o': 'iklp', 'p': 'olç',
        'q': 'wa', 'r': 'etdf', 's': 'wedaxz', 't': 'ryfg',
        'u': 'yihj', 'v': 'cfgb', 'x': 'zsdc', 'y': 'tugh',
        'z': 'asx'
      };
      
      const pos = Math.floor(Math.random() * msg.length);
      const char = msg[pos].toLowerCase();
      
      if (keyboardNeighbors[char]) {
        const neighbors = keyboardNeighbors[char];
        const replacement = neighbors[Math.floor(Math.random() * neighbors.length)];
        return msg.substring(0, pos) + replacement + msg.substring(pos + 1);
      }
      return msg;
    },
    
    // Letras duplicadas
    (msg) => {
      const pos = Math.floor(Math.random() * msg.length);
      return msg.substring(0, pos) + msg[pos] + msg.substring(pos);
    },
    
    // Omissão de letra
    (msg) => {
      const pos = Math.floor(Math.random() * msg.length);
      return msg.substring(0, pos) + msg.substring(pos + 1);
    }
  ];
  
  // Escolher um tipo de erro aleatório
  const errorFunc = errorTypes[Math.floor(Math.random() * errorTypes.length)];
  const errorMessage = errorFunc(message);
  
  // Se o erro realmente alterou a mensagem, retorna com indicação de correção
  if (errorMessage !== message) {
    return {
      hasError: true,
      errorMessage: errorMessage,
      correctedMessage: message,
      errorPos: -1 // Não precisamos saber exatamente onde para a simulação
    };
  }
  
  return { hasError: false, message };
}

module.exports = {
  calculateTypingTime,
  simulateNaturalPauses,
  simulateTypingError
};
