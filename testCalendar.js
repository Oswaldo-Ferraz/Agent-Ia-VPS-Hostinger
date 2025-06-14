const {
  createEvent,
  listEventsByUserId,
  updateEvent,
  deleteEvent,
  listUpcomingEvents // Also test this one for general listing
} = require('./src/services/googleCalendar');

const TEST_USER_ID = 'test-whatsapp-id@c.us'; // Dummy WhatsApp ID for testing
const CALENDAR_ID = 'oswaldolrf@gmail.com'; // Ensure this is the correct calendar ID

async function runCalendarTests() {
  console.log("🚀 Starting Google Calendar Integration Tests...");
  let testEventId = null;
  const originalSummary = 'Test Event - Kilo Code';

  try {
    // --- 0. List upcoming events (general check) ---
    console.log("\n--- Test 0: Listing Upcoming Events (General) ---");
    const upcoming = await listUpcomingEvents();
    console.log(`Found ${upcoming.length} upcoming events.`);

    // --- 1. Create Event ---
    console.log("\n--- Test 1: Creating Event ---");
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow this time
    startTime.setMinutes(0, 0, 0); // Set to the start of the hour
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const eventDetails = {
      summary: originalSummary,
      description: 'This is a test event created by Kilo Code automated test.',
      startDateTime: startTime.toISOString(),
      endDateTime: endTime.toISOString(),
      userId: TEST_USER_ID,
      timeZone: 'America/Sao_Paulo',
    };
    const createdEvent = await createEvent(eventDetails);
    testEventId = createdEvent.id;
    console.log(`✅ Event created successfully. ID: ${testEventId}, Summary: ${createdEvent.summary}, Start: ${createdEvent.start.dateTime}`);
    if (createdEvent.extendedProperties && createdEvent.extendedProperties.private && createdEvent.extendedProperties.private.userId === TEST_USER_ID) {
      console.log(`✅ UserId correctly stored in extendedProperties.`);
    } else {
      console.error(`❌ UserId NOT correctly stored or found in extendedProperties.`, createdEvent.extendedProperties);
    }


    // --- 2. List Events by User ID (Verify Creation) ---
    console.log("\n--- Test 2: Listing Events by User ID (After Creation) ---");
    // Define a time range that should include the created event
    const listStartTime = new Date(startTime);
    listStartTime.setHours(0, 0, 0, 0); // Start of the day
    const listEndTime = new Date(startTime);
    listEndTime.setHours(23, 59, 59, 999); // End of the day

    const userEventsAfterCreate = await listEventsByUserId(TEST_USER_ID, listStartTime.toISOString(), listEndTime.toISOString());
    const foundCreatedEvent = userEventsAfterCreate.find(event => event.id === testEventId);
    if (foundCreatedEvent) {
      console.log(`✅ Found created event in user's list: ${foundCreatedEvent.summary} at ${foundCreatedEvent.start.dateTime}`);
    } else {
      console.error(`❌ ERROR: Created event with ID ${testEventId} not found in user's list.`);
      console.log('Events found:', userEventsAfterCreate.map(e => ({id: e.id, summary: e.summary, start: e.start.dateTime})));
    }

    // --- 3. Update Event ---
    console.log("\n--- Test 3: Updating Event ---");
    const updatedStartTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later than original
    const updatedEndTime = new Date(updatedStartTime.getTime() + 60 * 60 * 1000); // Still 1 hour duration
    const updatedSummary = "Updated Test Event - Kilo Code";

    const updatePayload = {
      summary: updatedSummary, // Test updating summary
      start: {
        dateTime: updatedStartTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: updatedEndTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      // Note: extendedProperties are not typically updated via patch unless specified.
      // The userId should remain from the original creation.
    };
    const updatedEvent = await updateEvent(testEventId, updatePayload);
    console.log(`✅ Event updated successfully. New Summary: ${updatedEvent.summary}, New Start: ${updatedEvent.start.dateTime}`);
    if (updatedEvent.summary !== updatedSummary) {
        console.error(`❌ Summary was not updated as expected. Expected: "${updatedSummary}", Got: "${updatedEvent.summary}"`);
    }
     if (updatedEvent.extendedProperties && updatedEvent.extendedProperties.private && updatedEvent.extendedProperties.private.userId === TEST_USER_ID) {
      console.log(`✅ UserId still present in extendedProperties after update.`);
    } else {
      console.warn(`⚠️ UserId might not be present in extendedProperties after update, or API response for patch doesn't include it. This might be OK if not explicitly requested. Original event had it.`);
    }


    // --- 4. List Events by User ID (Verify Update) ---
    console.log("\n--- Test 4: Listing Events by User ID (After Update) ---");
    const userEventsAfterUpdate = await listEventsByUserId(TEST_USER_ID, listStartTime.toISOString(), listEndTime.toISOString());
    const foundUpdatedEvent = userEventsAfterUpdate.find(event => event.id === testEventId);
    if (foundUpdatedEvent) {
      console.log(`✅ Found updated event: ${foundUpdatedEvent.summary} at ${foundUpdatedEvent.start.dateTime}`);
      if (new Date(foundUpdatedEvent.start.dateTime).getTime() !== updatedStartTime.getTime()) {
        console.error(`❌ ERROR: Event start time does not match updated time. Expected: ${updatedStartTime.toISOString()}, Got: ${foundUpdatedEvent.start.dateTime}`);
      }
      if (foundUpdatedEvent.summary !== updatedSummary) {
        console.error(`❌ ERROR: Event summary does not match updated summary. Expected: "${updatedSummary}", Got: "${foundUpdatedEvent.summary}"`);
      }
    } else {
      console.error(`❌ ERROR: Updated event with ID ${testEventId} not found in user's list.`);
    }

    // --- 5. Delete Event ---
    console.log("\n--- Test 5: Deleting Event ---");
    await deleteEvent(testEventId);
    console.log(`✅ Event ${testEventId} deletion request sent.`);

    // --- 6. List Events by User ID (Verify Deletion) ---
    console.log("\n--- Test 6: Listing Events by User ID (After Deletion) ---");
    // Add a small delay to allow Google Calendar to process the deletion
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    const userEventsAfterDelete = await listEventsByUserId(TEST_USER_ID, listStartTime.toISOString(), listEndTime.toISOString());
    const foundDeletedEvent = userEventsAfterDelete.find(event => event.id === testEventId);
    if (foundDeletedEvent) {
      console.error(`❌ ERROR: Deleted event with ID ${testEventId} was still found in user's list.`);
    } else {
      console.log(`✅ Event ${testEventId} successfully deleted and not found in user's list.`);
    }

  } catch (error) {
    console.error("\n❌❌❌ A critical error occurred during tests: ❌❌❌", error);
    if (error.response && error.response.data && error.response.data.error) {
      console.error('API Error Details:', error.response.data.error);
    }
  } finally {
    // Clean up: If testEventId exists and an error occurred before deletion, try to delete it.
    if (testEventId) {
      try {
        // Check if it still exists before attempting to delete again (in case deletion was the failing step)
        const listStartTime = new Date(); listStartTime.setHours(0,0,0,0);
        const listEndTime = new Date(); listEndTime.setDate(listStartTime.getDate() + 2); listEndTime.setHours(23,59,59,999); // Check over next couple of days
        const finalCheck = await listEventsByUserId(TEST_USER_ID, listStartTime.toISOString(), listEndTime.toISOString());
        const stillExists = finalCheck.find(event => event.id === testEventId);
        if (stillExists) {
          console.log(`\n--- Cleanup: Attempting to delete test event ${testEventId} due to possible earlier error... ---`);
          await deleteEvent(testEventId);
          console.log(`✅ Cleanup: Test event ${testEventId} deleted.`);
        }
      } catch (cleanupError) {
        console.error(`\n❌ Error during cleanup deletion of event ${testEventId}:`, cleanupError.message);
      }
    }
    console.log("\n🏁 Google Calendar Integration Tests Finished. 🏁");
  }
}

runCalendarTests();