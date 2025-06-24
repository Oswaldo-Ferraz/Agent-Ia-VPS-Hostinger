const BaseConnector = require('./base-connector');

/**
 * 💳 STRIPE CONNECTOR
 * Integração com Stripe para pagamentos e assinaturas
 */
class StripeConnector extends BaseConnector {
  constructor(credentials = {}) {
    super(credentials);
    this.stripe = null;
  }

  /**
   * 🔑 Validar credenciais do Stripe
   */
  async validateCredentials() {
    try {
      this.requireCredentials(['secret_key']);
      
      // Inicializar Stripe
      const Stripe = require('stripe');
      this.stripe = new Stripe(this.credentials.secret_key);

      // Testar credenciais fazendo uma chamada simples
      await this.stripe.account.retrieve();

      this.isConfigured = true;
      this.log('Credenciais Stripe validadas com sucesso', 'success');
      return true;

    } catch (error) {
      this.log(`Erro na validação Stripe: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 🧪 Testar conexão com Stripe
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        await this.validateCredentials();
      }

      // Buscar informações da conta
      const account = await this.withTimeout(
        this.stripe.account.retrieve()
      );

      // Testar produtos (se houver)
      const products = await this.stripe.products.list({ limit: 1 });
      
      // Testar preços (se houver)
      const prices = await this.stripe.prices.list({ limit: 1 });

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        details: {
          account_id: account.id,
          country: account.country,
          currency: account.default_currency,
          products_count: products.data.length,
          prices_count: prices.data.length,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        }
      };

      this.lastTest = result;
      this.log('Teste de conexão Stripe bem-sucedido', 'success');
      return result;

    } catch (error) {
      const result = {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.lastTest = result;
      this.log(`Teste de conexão Stripe falhou: ${error.message}`, 'error');
      return result;
    }
  }

  /**
   * 💳 Criar customer
   */
  async createCustomer(customerData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const customer = await this.stripe.customers.create({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        description: customerData.description,
        metadata: customerData.metadata || {}
      });

      this.log(`Customer criado: ${customer.id}`, 'success');
      return {
        success: true,
        customer_id: customer.id,
        customer
      };

    } catch (error) {
      this.log(`Erro ao criar customer: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🛍️ Criar produto
   */
  async createProduct(productData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const product = await this.stripe.products.create({
        name: productData.name,
        description: productData.description,
        images: productData.images || [],
        metadata: productData.metadata || {},
        active: productData.active !== false
      });

      this.log(`Produto criado: ${product.id}`, 'success');
      return {
        success: true,
        product_id: product.id,
        product
      };

    } catch (error) {
      this.log(`Erro ao criar produto: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 💰 Criar preço
   */
  async createPrice(priceData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const priceConfig = {
        unit_amount: priceData.amount, // em centavos
        currency: priceData.currency || 'brl',
        product: priceData.product_id,
        metadata: priceData.metadata || {}
      };

      // Se for recorrente
      if (priceData.recurring) {
        priceConfig.recurring = {
          interval: priceData.recurring.interval, // day, week, month, year
          interval_count: priceData.recurring.interval_count || 1
        };
      }

      const price = await this.stripe.prices.create(priceConfig);

      this.log(`Preço criado: ${price.id}`, 'success');
      return {
        success: true,
        price_id: price.id,
        price
      };

    } catch (error) {
      this.log(`Erro ao criar preço: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🛒 Criar sessão de checkout
   */
  async createCheckoutSession(sessionData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: sessionData.payment_methods || ['card', 'pix'],
        line_items: sessionData.line_items,
        mode: sessionData.mode || 'payment', // payment, subscription, setup
        success_url: sessionData.success_url,
        cancel_url: sessionData.cancel_url,
        customer: sessionData.customer_id,
        customer_email: sessionData.customer_email,
        metadata: sessionData.metadata || {}
      });

      this.log(`Sessão de checkout criada: ${session.id}`, 'success');
      return {
        success: true,
        session_id: session.id,
        checkout_url: session.url,
        session
      };

    } catch (error) {
      this.log(`Erro ao criar checkout: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔄 Criar assinatura
   */
  async createSubscription(subscriptionData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: subscriptionData.customer_id,
        items: subscriptionData.items, // [{ price: 'price_id' }]
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: subscriptionData.metadata || {}
      });

      this.log(`Assinatura criada: ${subscription.id}`, 'success');
      return {
        success: true,
        subscription_id: subscription.id,
        client_secret: subscription.latest_invoice.payment_intent.client_secret,
        subscription
      };

    } catch (error) {
      this.log(`Erro ao criar assinatura: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🔍 Buscar pagamento
   */
  async retrievePayment(paymentIntentId) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const payment = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        payment_id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        customer: payment.customer,
        payment
      };

    } catch (error) {
      this.log(`Erro ao buscar pagamento: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📊 Obter estatísticas
   */
  async getStats(period = 'month') {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const charges = await this.stripe.charges.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000)
        },
        limit: 100
      });

      const successful = charges.data.filter(c => c.paid);
      const totalAmount = successful.reduce((sum, c) => sum + c.amount, 0);

      return {
        success: true,
        period,
        stats: {
          total_charges: charges.data.length,
          successful_charges: successful.length,
          total_amount: totalAmount,
          average_amount: successful.length > 0 ? totalAmount / successful.length : 0,
          currency: charges.data[0]?.currency || 'brl'
        }
      };

    } catch (error) {
      this.log(`Erro ao buscar estatísticas: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 🎟️ Criar cupom de desconto
   */
  async createCoupon(couponData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      const coupon = await this.stripe.coupons.create({
        id: couponData.code,
        percent_off: couponData.percent_off,
        amount_off: couponData.amount_off,
        currency: couponData.currency || 'brl',
        duration: couponData.duration || 'once', // once, repeating, forever
        duration_in_months: couponData.duration_in_months,
        max_redemptions: couponData.max_redemptions,
        redeem_by: couponData.redeem_by,
        metadata: couponData.metadata || {}
      });

      this.log(`Cupom criado: ${coupon.id}`, 'success');
      return {
        success: true,
        coupon_id: coupon.id,
        coupon
      };

    } catch (error) {
      this.log(`Erro ao criar cupom: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 📧 Enviar invoice
   */
  async sendInvoice(invoiceData) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe não inicializado');
      }

      // Criar invoice
      const invoice = await this.stripe.invoices.create({
        customer: invoiceData.customer_id,
        collection_method: 'send_invoice',
        days_until_due: invoiceData.days_until_due || 30,
        description: invoiceData.description,
        metadata: invoiceData.metadata || {}
      });

      // Adicionar itens
      for (const item of invoiceData.items) {
        await this.stripe.invoiceItems.create({
          customer: invoiceData.customer_id,
          invoice: invoice.id,
          price: item.price_id,
          quantity: item.quantity || 1
        });
      }

      // Finalizar e enviar
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
      await this.stripe.invoices.sendInvoice(invoice.id);

      this.log(`Invoice enviada: ${invoice.id}`, 'success');
      return {
        success: true,
        invoice_id: invoice.id,
        invoice_url: finalizedInvoice.hosted_invoice_url,
        invoice: finalizedInvoice
      };

    } catch (error) {
      this.log(`Erro ao enviar invoice: ${error.message}`, 'error');
      throw error;
    }
  }
}

module.exports = StripeConnector;
