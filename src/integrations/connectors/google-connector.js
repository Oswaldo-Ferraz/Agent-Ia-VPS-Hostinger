const BaseConnector = require('./base-connector');
const { google } = require('googleapis');

/**
 * 📅 GOOGLE CONNECTOR
 * Integração com Google Calendar, Gmail, Drive, etc.
 */
class GoogleConnector extends BaseConnector {
  constructor(credentials = {}) {
    super(credentials);
    this.auth = null;
    this.calendar = null;
    this.gmail = null;
    this.drive = null;
    this.scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/drive.file'
    ];
  }

  /**
   * 🔑 Validar credenciais do Google
   */
  async validateCredentials() {
    try {
      this.requireCredentials(['client_id', 'client_secret']);
      
      // Se tiver service account, usar essa abordagem
      if (this.credentials.service_account) {
        await this.initServiceAccount();
      } else if (this.credentials.refresh_token) {
        await this.initOAuth();
      } else {
        throw new Error('Credenciais incompletas - necessário service_account ou refresh_token');
      }

      this.isConfigured = true;
      this.log('Credenciais Google validadas com sucesso', 'success');
      return true;

    } catch (error) {
      this.log(`Erro na validação: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 🔐 Inicializar Service Account
   */
  async initServiceAccount() {
    try {
      const serviceAccount = typeof this.credentials.service_account === 'string' 
        ? JSON.parse(this.credentials.service_account)
        : this.credentials.service_account;

      this.auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: this.scopes
      });

      // Inicializar serviços
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      this.log('Service Account Google inicializada', 'success');
      return true;

    } catch (error) {
      throw new Error(`Erro ao inicializar Service Account: ${error.message}`);
    }
  }

  /**
   * 🔐 Inicializar OAuth
   */
  async initOAuth() {
    try {
      this.auth = new google.auth.OAuth2(
        this.credentials.client_id,
        this.credentials.client_secret,
        this.credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
      );

      this.auth.setCredentials({
        refresh_token: this.credentials.refresh_token
      });

      // Inicializar serviços
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      this.log('OAuth Google inicializado', 'success');
      return true;

    } catch (error) {
      throw new Error(`Erro ao inicializar OAuth: ${error.message}`);
    }
  }

  /**
   * 🧪 Testar conexão com Google
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        await this.validateCredentials();
      }

      // Testar Calendar API
      const calendarTest = await this.testCalendarAccess();
      
      // Testar Gmail API
      const gmailTest = await this.testGmailAccess();

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        details: {
          calendar: calendarTest,
          gmail: gmailTest
        }
      };

      this.lastTest = result;
      this.log('Teste de conexão Google bem-sucedido', 'success');
      return result;

    } catch (error) {
      const result = {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.lastTest = result;
      this.log(`Teste de conexão falhou: ${error.message}`, 'error');
      return result;
    }
  }

  /**
   * 📅 Testar acesso ao Calendar
   */
  async testCalendarAccess() {
    try {
      const response = await this.withTimeout(
        this.calendar.calendarList.list({ maxResults: 1 })
      );

      return {
        success: true,
        calendars_found: response.data.items?.length || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📧 Testar acesso ao Gmail
   */
  async testGmailAccess() {
    try {
      const response = await this.withTimeout(
        this.gmail.users.getProfile({ userId: 'me' })
      );

      return {
        success: true,
        email: response.data.emailAddress
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📅 Criar evento no Calendar
   */
  async createEvent(eventData) {
    try {
      if (!this.calendar) {
        throw new Error('Calendar não inicializado');
      }

      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: eventData.start,
          timeZone: eventData.timezone || 'America/Sao_Paulo'
        },
        end: {
          dateTime: eventData.end,
          timeZone: eventData.timezone || 'America/Sao_Paulo'
        },
        attendees: eventData.attendees?.map(email => ({ email })) || []
      };

      const response = await this.calendar.events.insert({
        calendarId: eventData.calendarId || 'primary',
        resource: event
      });

      this.log(`Evento criado: ${response.data.id}`, 'success');
      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink
      };

    } catch (error) {
      this.log(`Erro ao criar evento: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📧 Enviar email via Gmail
   */
  async sendEmail(emailData) {
    try {
      if (!this.gmail) {
        throw new Error('Gmail não inicializado');
      }

      const email = [
        `To: ${emailData.to}`,
        `Subject: ${emailData.subject}`,
        '',
        emailData.body
      ].join('\n');

      const encodedEmail = Buffer.from(email).toString('base64');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: encodedEmail
        }
      });

      this.log(`Email enviado: ${response.data.id}`, 'success');
      return {
        success: true,
        messageId: response.data.id
      };

    } catch (error) {
      this.log(`Erro ao enviar email: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📂 Upload de arquivo para Drive
   */
  async uploadFile(fileData) {
    try {
      if (!this.drive) {
        throw new Error('Drive não inicializado');
      }

      const fileMetadata = {
        name: fileData.name,
        parents: fileData.folderId ? [fileData.folderId] : undefined
      };

      const media = {
        mimeType: fileData.mimeType,
        body: fileData.content
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,webViewLink'
      });

      this.log(`Arquivo enviado para Drive: ${response.data.id}`, 'success');
      return {
        success: true,
        fileId: response.data.id,
        webViewLink: response.data.webViewLink
      };

    } catch (error) {
      this.log(`Erro no upload: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📅 Listar eventos do calendário
   */
  async listEvents(options = {}) {
    try {
      if (!this.calendar) {
        throw new Error('Calendar não inicializado');
      }

      const response = await this.calendar.events.list({
        calendarId: options.calendarId || 'primary',
        timeMin: options.timeMin || new Date().toISOString(),
        timeMax: options.timeMax,
        maxResults: options.maxResults || 10,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return {
        success: true,
        events: response.data.items || []
      };

    } catch (error) {
      this.log(`Erro ao listar eventos: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔗 Gerar URL de autorização OAuth
   */
  generateAuthUrl() {
    if (!this.credentials.client_id || !this.credentials.client_secret) {
      throw new Error('Client ID e Client Secret são obrigatórios');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.credentials.client_id,
      this.credentials.client_secret,
      this.credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes
    });

    return authUrl;
  }

  /**
   * 🎫 Trocar código por tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.credentials.client_id,
        this.credentials.client_secret,
        this.credentials.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob'
      );

      const { tokens } = await oauth2Client.getToken(code);
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
      };

    } catch (error) {
      throw new Error(`Erro ao trocar código: ${error.message}`);
    }
  }
}

module.exports = GoogleConnector;
