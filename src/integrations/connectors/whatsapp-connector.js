const BaseConnector = require('./base-connector');
const axios = require('axios');

/**
 * 📱 WHATSAPP CONNECTOR
 * Integração com WhatsApp Business API
 */
class WhatsAppConnector extends BaseConnector {
  constructor(credentials = {}) {
    super(credentials);
    this.apiUrl = 'https://graph.facebook.com/v18.0';
    this.webhookUrl = credentials.webhook_url;
  }

  /**
   * 🔑 Validar credenciais do WhatsApp
   */
  async validateCredentials() {
    try {
      this.requireCredentials(['access_token', 'phone_number_id']);
      
      // Testar acesso fazendo uma chamada para obter perfil do business
      const response = await axios.get(
        `${this.apiUrl}/${this.credentials.phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`
          }
        }
      );

      if (response.data && response.data.id) {
        this.isConfigured = true;
        this.log('Credenciais WhatsApp validadas com sucesso', 'success');
        return true;
      }

      throw new Error('Resposta inválida da API WhatsApp');

    } catch (error) {
      this.log(`Erro na validação WhatsApp: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 🧪 Testar conexão com WhatsApp
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        await this.validateCredentials();
      }

      // Buscar informações do número de telefone
      const phoneInfo = await this.withTimeout(
        axios.get(
          `${this.apiUrl}/${this.credentials.phone_number_id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.credentials.access_token}`
            }
          }
        )
      );

      // Buscar templates disponíveis
      const templates = await this.getMessageTemplates();

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        details: {
          phone_number_id: phoneInfo.data.id,
          verified_name: phoneInfo.data.verified_name,
          display_phone_number: phoneInfo.data.display_phone_number,
          templates_count: templates.length
        }
      };

      this.lastTest = result;
      this.log('Teste de conexão WhatsApp bem-sucedido', 'success');
      return result;

    } catch (error) {
      const result = {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.lastTest = result;
      this.log(`Teste de conexão WhatsApp falhou: ${error.message}`, 'error');
      return result;
    }
  }

  /**
   * 📱 Enviar mensagem de texto
   */
  async sendTextMessage(to, message) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Mensagem enviada para ${to}`, 'success');
      return {
        success: true,
        message_id: response.data.messages[0].id,
        to: to
      };

    } catch (error) {
      this.log(`Erro ao enviar mensagem: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🖼️ Enviar imagem
   */
  async sendImageMessage(to, imageUrl, caption = '') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Imagem enviada para ${to}`, 'success');
      return {
        success: true,
        message_id: response.data.messages[0].id,
        to: to
      };

    } catch (error) {
      this.log(`Erro ao enviar imagem: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📄 Enviar documento
   */
  async sendDocumentMessage(to, documentUrl, filename, caption = '') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'document',
          document: {
            link: documentUrl,
            filename: filename,
            caption: caption
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Documento enviado para ${to}`, 'success');
      return {
        success: true,
        message_id: response.data.messages[0].id,
        to: to
      };

    } catch (error) {
      this.log(`Erro ao enviar documento: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📋 Enviar mensagem com template
   */
  async sendTemplateMessage(to, templateName, languageCode, components = []) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Template ${templateName} enviado para ${to}`, 'success');
      return {
        success: true,
        message_id: response.data.messages[0].id,
        to: to,
        template: templateName
      };

    } catch (error) {
      this.log(`Erro ao enviar template: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔘 Enviar mensagem interativa (botões)
   */
  async sendInteractiveMessage(to, body, buttons) {
    try {
      const interactiveMessage = {
        type: 'button',
        body: {
          text: body
        },
        action: {
          buttons: buttons.map((button, index) => ({
            type: 'reply',
            reply: {
              id: button.id || `btn_${index}`,
              title: button.title
            }
          }))
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: interactiveMessage
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Mensagem interativa enviada para ${to}`, 'success');
      return {
        success: true,
        message_id: response.data.messages[0].id,
        to: to
      };

    } catch (error) {
      this.log(`Erro ao enviar mensagem interativa: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📋 Enviar lista interativa
   */
  async sendListMessage(to, body, buttonText, sections) {
    try {
      const interactiveMessage = {
        type: 'list',
        body: {
          text: body
        },
        action: {
          button: buttonText,
          sections: sections
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: interactiveMessage
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Lista interativa enviada para ${to}`, 'success');
      return {
        success: true,
        message_id: response.data.messages[0].id,
        to: to
      };

    } catch (error) {
      this.log(`Erro ao enviar lista: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📥 Processar webhook (mensagens recebidas)
   */
  processWebhook(webhookData) {
    try {
      const messages = [];
      
      if (webhookData.entry) {
        for (const entry of webhookData.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.value && change.value.messages) {
                for (const message of change.value.messages) {
                  messages.push({
                    id: message.id,
                    from: message.from,
                    timestamp: message.timestamp,
                    type: message.type,
                    text: message.text?.body,
                    image: message.image,
                    document: message.document,
                    interactive: message.interactive
                  });
                }
              }
            }
          }
        }
      }

      this.log(`Processadas ${messages.length} mensagens do webhook`, 'success');
      return {
        success: true,
        messages: messages
      };

    } catch (error) {
      this.log(`Erro ao processar webhook: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * ✅ Marcar mensagem como lida
   */
  async markAsRead(messageId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.credentials.phone_number_id}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.log(`Mensagem ${messageId} marcada como lida`, 'success');
      return {
        success: true,
        message_id: messageId
      };

    } catch (error) {
      this.log(`Erro ao marcar como lida: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📋 Buscar templates de mensagem
   */
  async getMessageTemplates() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.credentials.business_account_id}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.access_token}`
          }
        }
      );

      return response.data.data || [];

    } catch (error) {
      this.log(`Erro ao buscar templates: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * 📊 Obter estatísticas de mensagens
   */
  async getMessageStats(days = 7) {
    try {
      // Esta funcionalidade requer acesso aos relatórios da API
      // Por enquanto, retornamos estatísticas básicas
      
      this.log('Estatísticas básicas obtidas', 'success');
      return {
        success: true,
        period_days: days,
        stats: {
          messages_sent: 'Disponível via Facebook Analytics',
          messages_delivered: 'Disponível via Facebook Analytics',
          messages_read: 'Disponível via Facebook Analytics'
        }
      };

    } catch (error) {
      this.log(`Erro ao buscar estatísticas: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔗 Configurar webhook
   */
  configureWebhook(webhookUrl, verifyToken) {
    this.webhookUrl = webhookUrl;
    this.verifyToken = verifyToken;
    
    this.log(`Webhook configurado: ${webhookUrl}`, 'success');
    return {
      success: true,
      webhook_url: webhookUrl,
      verify_token: verifyToken,
      instructions: 'Configure este webhook no Facebook Developers'
    };
  }

  /**
   * ✅ Verificar webhook
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.log('Webhook verificado com sucesso', 'success');
      return challenge;
    }
    
    this.log('Falha na verificação do webhook', 'error');
    return null;
  }
}

module.exports = WhatsAppConnector;
