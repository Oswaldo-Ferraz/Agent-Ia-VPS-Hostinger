const BaseConnector = require('./base-connector');
const nodemailer = require('nodemailer');

/**
 * 📧 EMAIL CONNECTOR
 * Integração para envio de emails via SMTP
 */
class EmailConnector extends BaseConnector {
  constructor(credentials = {}) {
    super(credentials);
    this.transporter = null;
    this.templates = new Map();
  }

  /**
   * 🔑 Validar credenciais do Email
   */
  async validateCredentials() {
    try {
      this.requireCredentials(['smtp_host', 'smtp_port', 'username', 'password']);
      
      // Criar transporter
      this.transporter = nodemailer.createTransporter({
        host: this.credentials.smtp_host,
        port: parseInt(this.credentials.smtp_port),
        secure: this.credentials.secure !== false, // true para 465, false para outros
        auth: {
          user: this.credentials.username,
          pass: this.credentials.password
        },
        tls: {
          rejectUnauthorized: this.credentials.reject_unauthorized !== false
        }
      });

      // Verificar conexão
      await this.transporter.verify();

      this.isConfigured = true;
      this.log('Credenciais SMTP validadas com sucesso', 'success');
      return true;

    } catch (error) {
      this.log(`Erro na validação SMTP: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 🧪 Testar conexão SMTP
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        await this.validateCredentials();
      }

      // Testar conexão
      const isConnected = await this.withTimeout(
        this.transporter.verify()
      );

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        details: {
          smtp_host: this.credentials.smtp_host,
          smtp_port: this.credentials.smtp_port,
          username: this.credentials.username,
          connection_verified: isConnected
        }
      };

      this.lastTest = result;
      this.log('Teste de conexão SMTP bem-sucedido', 'success');
      return result;

    } catch (error) {
      const result = {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.lastTest = result;
      this.log(`Teste de conexão SMTP falhou: ${error.message}`, 'error');
      return result;
    }
  }

  /**
   * 📧 Enviar email simples
   */
  async sendEmail(emailData) {
    try {
      if (!this.transporter) {
        throw new Error('SMTP não configurado');
      }

      const mailOptions = {
        from: emailData.from || this.credentials.from_email || this.credentials.username,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        attachments: emailData.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.log(`Email enviado para ${emailData.to}`, 'success');
      return {
        success: true,
        message_id: result.messageId,
        to: emailData.to,
        subject: emailData.subject
      };

    } catch (error) {
      this.log(`Erro ao enviar email: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📋 Enviar email com template
   */
  async sendTemplateEmail(templateName, to, variables = {}) {
    try {
      const template = this.templates.get(templateName);
      
      if (!template) {
        throw new Error(`Template ${templateName} não encontrado`);
      }

      // Substituir variáveis no template
      let subject = template.subject;
      let html = template.html;
      let text = template.text;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject?.replace(placeholder, value) || subject;
        html = html?.replace(placeholder, value) || html;
        text = text?.replace(placeholder, value) || text;
      }

      const emailData = {
        to,
        subject,
        html,
        text,
        from: template.from
      };

      return await this.sendEmail(emailData);

    } catch (error) {
      this.log(`Erro ao enviar template ${templateName}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📄 Criar template de email
   */
  createTemplate(name, templateData) {
    try {
      const template = {
        name,
        subject: templateData.subject,
        html: templateData.html,
        text: templateData.text,
        from: templateData.from,
        created_at: new Date().toISOString()
      };

      this.templates.set(name, template);
      
      this.log(`Template ${name} criado`, 'success');
      return {
        success: true,
        template_name: name,
        template
      };

    } catch (error) {
      this.log(`Erro ao criar template: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📋 Listar templates
   */
  listTemplates() {
    return Array.from(this.templates.keys()).map(name => ({
      name,
      template: this.templates.get(name)
    }));
  }

  /**
   * 📧 Enviar email em lote
   */
  async sendBulkEmail(recipients, emailData) {
    try {
      const results = [];
      
      for (const recipient of recipients) {
        try {
          const emailToSend = {
            ...emailData,
            to: typeof recipient === 'string' ? recipient : recipient.email
          };

          // Personalizar com dados do destinatário se fornecidos
          if (typeof recipient === 'object' && recipient.variables) {
            emailToSend.subject = this.replaceVariables(emailData.subject, recipient.variables);
            emailToSend.html = this.replaceVariables(emailData.html, recipient.variables);
            emailToSend.text = this.replaceVariables(emailData.text, recipient.variables);
          }

          const result = await this.sendEmail(emailToSend);
          results.push({ ...result, recipient: emailToSend.to });

          // Pausa entre envios para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          results.push({
            success: false,
            recipient: typeof recipient === 'string' ? recipient : recipient.email,
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.log(`Email em lote: ${successful} enviados, ${failed} falharam`, 'success');
      return {
        success: true,
        total: recipients.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      this.log(`Erro no envio em lote: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔄 Substituir variáveis no texto
   */
  replaceVariables(text, variables) {
    if (!text || !variables) return text;
    
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value);
    }
    
    return result;
  }

  /**
   * 📎 Anexar arquivo
   */
  createAttachment(filename, content, contentType) {
    return {
      filename,
      content,
      contentType: contentType || 'application/octet-stream'
    };
  }

  /**
   * 🖼️ Anexar imagem
   */
  createImageAttachment(filename, content, cid = null) {
    return {
      filename,
      content,
      contentType: 'image/jpeg',
      cid: cid, // Para usar em <img src="cid:...">
      disposition: cid ? 'inline' : 'attachment'
    };
  }

  /**
   * 📧 Enviar email de confirmação
   */
  async sendConfirmationEmail(to, confirmationData) {
    const emailData = {
      to,
      subject: confirmationData.subject || 'Confirmação necessária',
      html: `
        <h2>Confirmação necessária</h2>
        <p>${confirmationData.message || 'Por favor, confirme clicando no link abaixo:'}</p>
        <a href="${confirmationData.confirmation_url}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          ${confirmationData.button_text || 'Confirmar'}
        </a>
        <p><small>Se o botão não funcionar, copie e cole este link: ${confirmationData.confirmation_url}</small></p>
      `,
      text: `
        ${confirmationData.message || 'Confirmação necessária'}
        
        Link de confirmação: ${confirmationData.confirmation_url}
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * 🔔 Enviar email de notificação
   */
  async sendNotificationEmail(to, notificationData) {
    const emailData = {
      to,
      subject: notificationData.subject || 'Notificação',
      html: `
        <h2>${notificationData.title || 'Notificação'}</h2>
        <p>${notificationData.message}</p>
        ${notificationData.action_url ? `
          <a href="${notificationData.action_url}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            ${notificationData.action_text || 'Ver detalhes'}
          </a>
        ` : ''}
      `,
      text: `
        ${notificationData.title || 'Notificação'}
        
        ${notificationData.message}
        
        ${notificationData.action_url ? `Link: ${notificationData.action_url}` : ''}
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * 📊 Obter estatísticas de envio
   */
  getEmailStats() {
    // Esta é uma implementação básica
    // Em produção, você integraria com serviços de analytics
    return {
      success: true,
      stats: {
        note: 'Estatísticas básicas - para analytics avançados, integre com SendGrid, Mailgun, etc.',
        smtp_host: this.credentials.smtp_host,
        configured: this.isConfigured,
        last_test: this.lastTest
      }
    };
  }

  /**
   * ✅ Validar email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🏷️ Criar email HTML responsivo
   */
  createResponsiveEmail(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; }
          .header { background: #007cba; color: white; padding: 20px; text-align: center; }
          .content { background: white; padding: 20px; }
          .footer { background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; }
          .button { background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          @media (max-width: 600px) { .container { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.header_title || data.title}</h1>
          </div>
          <div class="content">
            ${data.content}
            ${data.button_url ? `
              <p style="text-align: center; margin-top: 30px;">
                <a href="${data.button_url}" class="button">${data.button_text || 'Clique aqui'}</a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            ${data.footer || 'Email enviado automaticamente pelo sistema'}
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = EmailConnector;
