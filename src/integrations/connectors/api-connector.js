const BaseConnector = require('./base-connector');
const axios = require('axios');

/**
 * 🌐 API CONNECTOR GENÉRICO
 * Conector para integração com APIs customizadas
 */
class ApiConnector extends BaseConnector {
  constructor(credentials = {}) {
    super(credentials);
    this.baseUrl = credentials.base_url;
    this.headers = credentials.headers || {};
    this.authType = credentials.auth_type || 'none'; // none, bearer, basic, api_key
  }

  /**
   * 🔑 Validar credenciais da API
   */
  async validateCredentials() {
    try {
      this.requireCredentials(['base_url']);
      
      // Configurar autenticação se necessária
      this.setupAuthentication();

      // Fazer chamada de teste se endpoint de teste for fornecido
      if (this.credentials.test_endpoint) {
        await this.testApiCall();
      }

      this.isConfigured = true;
      this.log('Credenciais API validadas com sucesso', 'success');
      return true;

    } catch (error) {
      this.log(`Erro na validação API: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 🔐 Configurar autenticação
   */
  setupAuthentication() {
    switch (this.authType) {
      case 'bearer':
        if (!this.credentials.token) {
          throw new Error('Token Bearer é obrigatório');
        }
        this.headers['Authorization'] = `Bearer ${this.credentials.token}`;
        break;

      case 'basic':
        if (!this.credentials.username || !this.credentials.password) {
          throw new Error('Username e password são obrigatórios para Basic Auth');
        }
        const credentials = Buffer.from(
          `${this.credentials.username}:${this.credentials.password}`
        ).toString('base64');
        this.headers['Authorization'] = `Basic ${credentials}`;
        break;

      case 'api_key':
        if (!this.credentials.api_key) {
          throw new Error('API Key é obrigatória');
        }
        const keyHeader = this.credentials.api_key_header || 'X-API-Key';
        this.headers[keyHeader] = this.credentials.api_key;
        break;

      case 'custom':
        if (this.credentials.custom_headers) {
          Object.assign(this.headers, this.credentials.custom_headers);
        }
        break;
    }

    // Headers adicionais
    if (this.credentials.additional_headers) {
      Object.assign(this.headers, this.credentials.additional_headers);
    }
  }

  /**
   * 🧪 Testar conexão com a API
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        await this.validateCredentials();
      }

      let testResult;
      
      if (this.credentials.test_endpoint) {
        testResult = await this.testApiCall();
      } else {
        // Teste básico fazendo HEAD request na base URL
        testResult = await this.makeRequest('HEAD', '');
      }

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        details: {
          base_url: this.baseUrl,
          auth_type: this.authType,
          test_response: testResult.status || 'OK'
        }
      };

      this.lastTest = result;
      this.log('Teste de conexão API bem-sucedido', 'success');
      return result;

    } catch (error) {
      const result = {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.lastTest = result;
      this.log(`Teste de conexão API falhou: ${error.message}`, 'error');
      return result;
    }
  }

  /**
   * 🔧 Fazer chamada de teste
   */
  async testApiCall() {
    const response = await this.makeRequest(
      this.credentials.test_method || 'GET',
      this.credentials.test_endpoint
    );
    
    return response;
  }

  /**
   * 📡 Fazer requisição HTTP
   */
  async makeRequest(method, endpoint, data = null, customHeaders = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        method: method.toUpperCase(),
        url,
        headers: { ...this.headers, ...customHeaders },
        timeout: this.credentials.timeout || 30000
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        config.data = data;
      }

      const response = await this.withTimeout(axios(config));
      
      this.log(`${method} ${endpoint}: ${response.status}`, 'success');
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };

    } catch (error) {
      this.log(`Erro na requisição ${method} ${endpoint}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📤 Fazer POST request
   */
  async post(endpoint, data, headers = {}) {
    return await this.makeRequest('POST', endpoint, data, headers);
  }

  /**
   * 📥 Fazer GET request
   */
  async get(endpoint, params = {}, headers = {}) {
    let url = endpoint;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    return await this.makeRequest('GET', url, null, headers);
  }

  /**
   * 🔄 Fazer PUT request
   */
  async put(endpoint, data, headers = {}) {
    return await this.makeRequest('PUT', endpoint, data, headers);
  }

  /**
   * 🗑️ Fazer DELETE request
   */
  async delete(endpoint, headers = {}) {
    return await this.makeRequest('DELETE', endpoint, null, headers);
  }

  /**
   * 📋 Listar endpoints disponíveis
   */
  getAvailableEndpoints() {
    return this.credentials.endpoints || [];
  }

  /**
   * 🔍 Executar ação personalizada
   */
  async executeCustomAction(actionConfig) {
    try {
      const {
        name,
        method,
        endpoint,
        data,
        headers,
        params
      } = actionConfig;

      this.log(`Executando ação personalizada: ${name}`, 'info');

      let result;
      
      switch (method.toUpperCase()) {
        case 'GET':
          result = await this.get(endpoint, params, headers);
          break;
        case 'POST':
          result = await this.post(endpoint, data, headers);
          break;
        case 'PUT':
          result = await this.put(endpoint, data, headers);
          break;
        case 'DELETE':
          result = await this.delete(endpoint, headers);
          break;
        default:
          result = await this.makeRequest(method, endpoint, data, headers);
      }

      this.log(`Ação ${name} executada com sucesso`, 'success');
      return {
        success: true,
        action: name,
        result: result
      };

    } catch (error) {
      this.log(`Erro na ação ${actionConfig.name}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔄 Executar webhook
   */
  async sendWebhook(webhookUrl, data, headers = {}) {
    try {
      const response = await axios.post(webhookUrl, data, {
        headers: { 'Content-Type': 'application/json', ...headers },
        timeout: 10000
      });

      this.log(`Webhook enviado para ${webhookUrl}`, 'success');
      return {
        success: true,
        status: response.status,
        response: response.data
      };

    } catch (error) {
      this.log(`Erro no webhook: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📊 Executar consulta de dados
   */
  async queryData(queryConfig) {
    try {
      const {
        endpoint,
        filters,
        pagination,
        sort
      } = queryConfig;

      const params = {};
      
      // Aplicar filtros
      if (filters) {
        Object.assign(params, filters);
      }
      
      // Aplicar paginação
      if (pagination) {
        params.page = pagination.page || 1;
        params.limit = pagination.limit || 10;
      }
      
      // Aplicar ordenação
      if (sort) {
        params.sort_by = sort.field;
        params.sort_order = sort.order || 'asc';
      }

      const result = await this.get(endpoint, params);
      
      this.log(`Consulta de dados executada: ${endpoint}`, 'success');
      return result;

    } catch (error) {
      this.log(`Erro na consulta: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔄 Sincronizar dados
   */
  async syncData(syncConfig) {
    try {
      const {
        source_endpoint,
        target_endpoint,
        mapping,
        batch_size = 10
      } = syncConfig;

      // Buscar dados da origem
      const sourceData = await this.get(source_endpoint);
      
      if (!sourceData.success || !sourceData.data) {
        throw new Error('Erro ao buscar dados da origem');
      }

      const items = Array.isArray(sourceData.data) ? sourceData.data : [sourceData.data];
      const results = [];

      // Processar em lotes
      for (let i = 0; i < items.length; i += batch_size) {
        const batch = items.slice(i, i + batch_size);
        
        for (const item of batch) {
          try {
            // Aplicar mapeamento se fornecido
            const mappedItem = mapping ? this.applyMapping(item, mapping) : item;
            
            // Enviar para destino
            const result = await this.post(target_endpoint, mappedItem);
            results.push({ success: true, item: mappedItem, result });
            
          } catch (error) {
            results.push({ success: false, item, error: error.message });
          }
        }
        
        // Pausa entre lotes
        if (i + batch_size < items.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.log(`Sincronização concluída: ${results.length} itens processados`, 'success');
      return {
        success: true,
        total_items: items.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

    } catch (error) {
      this.log(`Erro na sincronização: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🗺️ Aplicar mapeamento de dados
   */
  applyMapping(data, mapping) {
    const mapped = {};
    
    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
      if (sourceKey.includes('.')) {
        // Suporte para propriedades aninhadas
        const keys = sourceKey.split('.');
        let value = data;
        for (const key of keys) {
          value = value?.[key];
          if (value === undefined) break;
        }
        mapped[targetKey] = value;
      } else {
        mapped[targetKey] = data[sourceKey];
      }
    }
    
    return mapped;
  }
}

module.exports = ApiConnector;
