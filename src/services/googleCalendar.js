const { google } = require('googleapis');
const path = require('path');
const KEY_FILE_PATH = path.join(__dirname, '..', '..', 'config', 'google-service-account.json');

// ID do calendário a ser usado. Substitua se o seu ID for diferente.
// Para o calendário principal, geralmente é o endereço de e-mail.
const CALENDAR_ID = 'oswaldolrf@gmail.com'; // CONFIRME SE ESTE É O ID CORRETO

// Escopos necessários para acessar o Google Calendar API
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Cria um cliente JWT autenticado
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: SCOPES,
});

// Cria uma instância do serviço do Google Calendar
const calendar = google.calendar({ version: 'v3', auth });

/**
 * Lista os próximos 10 eventos do calendário.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para uma lista de eventos.
 */
async function listUpcomingEvents() {
  try {
    const now = new Date().toISOString();
    console.log(`Buscando eventos no calendário: ${CALENDAR_ID} a partir de ${now}`);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now,
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;
    if (events && events.length > 0) {
      console.log('Próximos 10 eventos:');
      events.forEach(event => {
        const start = event.start.dateTime || event.start.date;
        console.log(`- ${start} - ${event.summary}`);
      });
      return events;
    } else {
      console.log('Nenhum evento próximo encontrado.');
      return [];
    }
  } catch (error) {
    console.error('Erro ao buscar eventos do calendário:', error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detalhes do erro da API:', error.response.data.error);
    }
    throw error; // Re-lança o erro para que o chamador possa tratá-lo
  }
}

/**
 * Cria um novo evento no calendário.
 * @param {Object} eventDetails - Detalhes do evento a ser criado.
 * @param {string} eventDetails.summary - Título do evento.
 * @param {string} eventDetails.description - Descrição do evento.
 * @param {string} eventDetails.startDateTime - Data e hora de início (ISO 8601, ex: "2025-05-27T09:00:00-03:00").
 * @param {string} eventDetails.endDateTime - Data e hora de término (ISO 8601, ex: "2025-05-27T10:00:00-03:00").
 * @param {string} eventDetails.userId - ID do usuário (ex: WhatsApp ID) para associar ao evento.
 * @param {string} [eventDetails.timeZone='America/Sao_Paulo'] - Fuso horário do evento.
 * @returns {Promise<Object>} Uma promessa que resolve para o evento criado.
 */
async function createEvent(eventDetails) {
  const {
    summary,
    description,
    startDateTime,
    endDateTime,
    userId, // Adicionado userId
    timeZone = 'America/Sao_Paulo',
  } = eventDetails;

  if (!summary || !startDateTime || !endDateTime || !userId) {
    throw new Error('Título, data/hora de início, data/hora de término e userId são obrigatórios para criar um evento.');
  }

  const event = {
    summary: summary,
    description: description,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone,
    },
    extendedProperties: {
      private: {
        userId: userId // Armazena o userId aqui
      }
    }
    // Você pode adicionar mais detalhes aqui, como convidados, lembretes, etc.
  };

  try {
    console.log(`Criando evento no calendário: ${CALENDAR_ID} para userId: ${userId}`);
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });
    console.log('Evento criado com sucesso:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar evento no calendário:', error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detalhes do erro da API:', error.response.data.error);
    }
    throw error;
  }
}

/**
 * Lista eventos para um usuário específico dentro de um intervalo de tempo.
 * @param {string} userId - O ID do usuário para filtrar os eventos.
 * @param {string} [timeMin] - Data e hora de início do intervalo (ISO 8601). Opcional.
 * @param {string} [timeMax] - Data e hora de fim do intervalo (ISO 8601). Opcional.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para uma lista de eventos do usuário.
 */
async function listEventsByUserId(userId, timeMin, timeMax) {
  if (!userId) {
    throw new Error('userId é obrigatório para listar eventos.');
  }
  try {
    const queryOptions = {
      calendarId: CALENDAR_ID,
      privateExtendedProperty: `userId=${userId}`, // Filtra pela propriedade privada
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMin) {
      queryOptions.timeMin = timeMin;
    }
    if (timeMax) {
      queryOptions.timeMax = timeMax;
    }
    // Se não houver timeMin, pode ser útil definir um padrão, ex: início do dia atual
    // if (!timeMin) {
    //   const todayStart = new Date();
    //   todayStart.setHours(0, 0, 0, 0);
    //   queryOptions.timeMin = todayStart.toISOString();
    // }


    console.log(`Buscando eventos para userId: ${userId} no calendário: ${CALENDAR_ID}`, queryOptions);

    const response = await calendar.events.list(queryOptions);

    const events = response.data.items;
    if (events && events.length > 0) {
      console.log(`Eventos encontrados para userId ${userId}:`, events.length);
      return events;
    } else {
      console.log(`Nenhum evento encontrado para userId ${userId}.`);
      return [];
    }
  } catch (error) {
    console.error(`Erro ao buscar eventos para userId ${userId}:`, error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detalhes do erro da API:', error.response.data.error);
    }
    throw error;
  }
}

/**
 * Atualiza um evento existente no calendário.
 * @param {string} eventId - O ID do evento a ser atualizado.
 * @param {Object} updatedEventData - Os dados do evento a serem atualizados.
 *                                   Deve incluir pelo menos start.dateTime e end.dateTime.
 *                                   O userId em extendedProperties não deve ser alterado por esta função.
 * @returns {Promise<Object>} Uma promessa que resolve para o evento atualizado.
 */
async function updateEvent(eventId, updatedEventData) {
  if (!eventId || !updatedEventData) {
    throw new Error('eventId e updatedEventData são obrigatórios para atualizar um evento.');
  }
  if (!updatedEventData.start || !updatedEventData.start.dateTime || !updatedEventData.end || !updatedEventData.end.dateTime) {
    throw new Error('updatedEventData deve conter start.dateTime e end.dateTime.');
  }

  try {
    console.log(`Atualizando evento ${eventId} no calendário: ${CALENDAR_ID}`);
    // Para garantir que não sobrescrevemos acidentalmente outras propriedades importantes como extendedProperties,
    // seria ideal buscar o evento original primeiro, mesclar as alterações e depois enviar o patch/update.
    // Por simplicidade aqui, vamos assumir que updatedEventData contém todos os campos necessários
    // ou que estamos usando patch e apenas os campos fornecidos serão alterados.
    // Se for usar 'update', certifique-se de que 'updatedEventData' é o recurso completo do evento.
    // 'patch' é mais seguro para atualizações parciais.

    const response = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: eventId,
      resource: updatedEventData, // updatedEventData deve ser um objeto Event Resource parcial
    });
    console.log('Evento atualizado com sucesso:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar evento ${eventId}:`, error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detalhes do erro da API:', error.response.data.error);
    }
    throw error;
  }
}

/**
 * Deleta um evento do calendário.
 * @param {string} eventId - O ID do evento a ser deletado.
 * @returns {Promise<void>} Uma promessa que resolve quando o evento é deletado.
 */
async function deleteEvent(eventId) {
  if (!eventId) {
    throw new Error('eventId é obrigatório para deletar um evento.');
  }
  try {
    console.log(`Deletando evento ${eventId} do calendário: ${CALENDAR_ID}`);
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });
    console.log(`Evento ${eventId} deletado com sucesso.`);
  } catch (error) {
    console.error(`Erro ao deletar evento ${eventId}:`, error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detalhes do erro da API:', error.response.data.error);
    }
    throw error;
  }
}

/**
 * Lista todos os eventos em um intervalo de tempo (não filtrado por usuário)
 * Útil para verificar disponibilidade geral da agenda
 * @param {string} [timeMin] - Data e hora de início do intervalo (ISO 8601). Opcional.
 * @param {string} [timeMax] - Data e hora de fim do intervalo (ISO 8601). Opcional.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para uma lista de todos os eventos.
 */
async function listAllEventsInRange(timeMin, timeMax) {
  try {
    const queryOptions = {
      calendarId: CALENDAR_ID,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMin) {
      queryOptions.timeMin = timeMin;
    }
    if (timeMax) {
      queryOptions.timeMax = timeMax;
    }

    console.log(`Buscando todos os eventos no calendário: ${CALENDAR_ID}`, queryOptions);

    const response = await calendar.events.list(queryOptions);

    const events = response.data.items;
    if (events && events.length > 0) {
      console.log(`Total de eventos encontrados no período:`, events.length);
      return events;
    } else {
      console.log('Nenhum evento encontrado no período especificado.');
      return [];
    }
  } catch (error) {
    console.error(`Erro ao buscar todos os eventos:`, error.message);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Detalhes do erro da API:', error.response.data.error);
    }
    throw error;
  }
}


module.exports = {
  listUpcomingEvents,
  createEvent,
  listEventsByUserId,
  updateEvent,
  deleteEvent,
  listAllEventsInRange,
};