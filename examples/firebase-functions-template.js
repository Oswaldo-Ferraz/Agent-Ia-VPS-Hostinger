const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Exemplo de Function criada automaticamente pelo Claude

/**
 * 📧 EMAIL SENDER FUNCTION
 * Function para envio de emails usando SendGrid
 * Criada automaticamente pelo Claude API
 */
exports.emailSender = functions.https.onCall(async (data, context) => {
  try {
    // Validar dados de entrada
    if (!data.to || !data.subject || !data.html) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Campos obrigatórios: to, subject, html'
      );
    }

    // Verificar autenticação
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuário deve estar autenticado'
      );
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(functions.config().sendgrid.key);

    const msg = {
      to: data.to,
      from: functions.config().email.from,
      subject: data.subject,
      html: data.html,
      text: data.text || ''
    };

    // Enviar email
    await sgMail.send(msg);

    // Log para auditoria
    functions.logger.info('Email enviado', {
      to: data.to,
      subject: data.subject,
      uid: context.auth.uid
    });

    return {
      success: true,
      message: 'Email enviado com sucesso',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    functions.logger.error('Erro ao enviar email', {
      error: error.message,
      data: data
    });

    throw new functions.https.HttpsError(
      'internal',
      'Erro interno do servidor'
    );
  }
});

/**
 * 🔗 WEBHOOK HANDLER FUNCTION
 * Function para receber e processar webhooks
 * Criada automaticamente pelo Claude API
 */
exports.webhookHandler = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verificar método
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }

      // Verificar assinatura (exemplo)
      const signature = req.headers['x-signature'];
      if (!verifyWebhookSignature(req.body, signature)) {
        return res.status(401).json({ error: 'Assinatura inválida' });
      }

      // Processar webhook baseado no tipo
      const { type, data } = req.body;

      switch (type) {
        case 'payment.completed':
          await processPaymentCompleted(data);
          break;
          
        case 'user.created':
          await processUserCreated(data);
          break;
          
        case 'subscription.updated':
          await processSubscriptionUpdated(data);
          break;
          
        default:
          functions.logger.warn('Tipo de webhook não reconhecido', { type });
      }

      // Log do webhook
      functions.logger.info('Webhook processado', {
        type: type,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({ 
        success: true,
        message: 'Webhook processado com sucesso'
      });

    } catch (error) {
      functions.logger.error('Erro no webhook', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({ 
        error: 'Erro interno do servidor'
      });
    }
  });
});

/**
 * 💰 PAYMENT PROCESSOR FUNCTION
 * Function para processar pagamentos com Stripe
 * Criada automaticamente pelo Claude API
 */
exports.processPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticação
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuário deve estar autenticado'
      );
    }

    // Validar dados
    if (!data.amount || !data.currency) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Campos obrigatórios: amount, currency'
      );
    }

    const stripe = require('stripe')(functions.config().stripe.secret_key);

    // Criar Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      metadata: {
        uid: context.auth.uid,
        clientId: data.clientId || '',
        productId: data.productId || ''
      }
    });

    // Salvar no Firestore para auditoria
    await admin.firestore().collection('payments').add({
      paymentIntentId: paymentIntent.id,
      uid: context.auth.uid,
      amount: data.amount,
      currency: data.currency,
      status: 'created',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info('Payment Intent criado', {
      paymentIntentId: paymentIntent.id,
      amount: data.amount,
      uid: context.auth.uid
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };

  } catch (error) {
    functions.logger.error('Erro ao processar pagamento', {
      error: error.message,
      uid: context.auth?.uid
    });

    throw new functions.https.HttpsError(
      'internal',
      'Erro ao processar pagamento'
    );
  }
});

/**
 * 📊 DATA PROCESSOR FUNCTION
 * Function para processar e validar dados
 * Criada automaticamente pelo Claude API
 */
exports.dataProcessor = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticação
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuário deve estar autenticado'
      );
    }

    const { action, payload } = data;

    let result;

    switch (action) {
      case 'validate_user_data':
        result = await validateUserData(payload);
        break;
        
      case 'process_form_data':
        result = await processFormData(payload);
        break;
        
      case 'generate_report':
        result = await generateReport(payload);
        break;
        
      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Ação não reconhecida'
        );
    }

    // Log da operação
    functions.logger.info('Dados processados', {
      action: action,
      uid: context.auth.uid,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      result: result,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    functions.logger.error('Erro ao processar dados', {
      error: error.message,
      action: data?.action,
      uid: context.auth?.uid
    });

    throw new functions.https.HttpsError(
      'internal',
      'Erro ao processar dados'
    );
  }
});

// Funções auxiliares
function verifyWebhookSignature(body, signature) {
  // Implementar verificação de assinatura
  // Exemplo usando crypto
  const crypto = require('crypto');
  const secret = functions.config().webhook.secret;
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
  return hash === signature;
}

async function processPaymentCompleted(data) {
  // Implementar lógica específica
  await admin.firestore().collection('orders').doc(data.orderId).update({
    status: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function processUserCreated(data) {
  // Implementar lógica específica
  await admin.firestore().collection('users').doc(data.userId).set({
    email: data.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function processSubscriptionUpdated(data) {
  // Implementar lógica específica
  await admin.firestore().collection('subscriptions').doc(data.subscriptionId).update({
    status: data.status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function validateUserData(payload) {
  // Implementar validação
  const errors = [];
  
  if (!payload.email || !payload.email.includes('@')) {
    errors.push('Email inválido');
  }
  
  if (!payload.name || payload.name.length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

async function processFormData(payload) {
  // Implementar processamento de formulário
  const processedData = {
    ...payload,
    processedAt: new Date().toISOString(),
    id: admin.firestore().collection('forms').doc().id
  };
  
  // Salvar no Firestore
  await admin.firestore().collection('forms').add(processedData);
  
  return processedData;
}

async function generateReport(payload) {
  // Implementar geração de relatório
  const { type, dateRange } = payload;
  
  // Exemplo: buscar dados do Firestore
  const snapshot = await admin.firestore()
    .collection('analytics')
    .where('date', '>=', dateRange.start)
    .where('date', '<=', dateRange.end)
    .get();
  
  const data = snapshot.docs.map(doc => doc.data());
  
  return {
    type: type,
    dateRange: dateRange,
    data: data,
    totalRecords: data.length,
    generatedAt: new Date().toISOString()
  };
}
