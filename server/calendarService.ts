import { google } from "googleapis";
import { getFirestore, getLocalOrders, saveLocalOrders, type OrderData } from "./firebaseAdmin.js";

export function getGoogleCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!email || !privateKey) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not configured. Google Calendar event creation will be skipped.");
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
    });
    return google.calendar({ version: "v3", auth });
  } catch (err) {
    console.error("Failed to initialize Google Calendar client:", err);
    return null;
  }
}

export async function syncGoogleCalendarEvent(orderId: string, passedOrderData?: OrderData) {
  try {
    const calendar = getGoogleCalendarClient();
    if (!calendar) {
      return;
    }

    let orderData: OrderData | undefined = passedOrderData;
    if (!orderData) {
      try {
        const adminDb = getFirestore();
        const docSnap = await adminDb.collection("orders").doc(orderId).get();
        if (docSnap.exists) {
          orderData = docSnap.data() as OrderData;
        }
      } catch (dbErr) {
        console.warn(`Firestore sync load failed for order ${orderId}:`, dbErr);
      }

      if (!orderData) {
        const localOrders = getLocalOrders();
        orderData = localOrders.find(o => o.id === orderId) as OrderData | undefined;
      }
    }

    if (!orderData) {
      console.warn(`Sync Google Calendar Event: Order ${orderId} not found.`);
      return;
    }

    let startDateTime: Date;
    if (orderData.dateTime) {
      startDateTime = new Date(orderData.dateTime);
    } else if (orderData.date) {
      startDateTime = new Date(`${orderData.date}T${orderData.time || '12:00'}:00+08:00`);
    } else {
      startDateTime = new Date();
    }

    if (isNaN(startDateTime.getTime())) {
      startDateTime = new Date();
    }

    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);

    const mealList = Array.isArray(orderData.meals) ? orderData.meals.join(", ") : (orderData.meals || "");
    const summary = `${orderData.quantity || ""} Pax | ${mealList || "N/A"} | ${orderData.location || "N/A"}`;
    const description = `Menu: ${orderData.menu || "N/A"}`;

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const existingEventId = orderData.calendarEventIds?.[calendarId];

    if (existingEventId) {
      try {
        console.log(`Updating existing Google Calendar event ${existingEventId} for order ${orderId}...`);
        await calendar.events.update({
          calendarId: calendarId,
          eventId: existingEventId,
          requestBody: {
            summary: summary,
            description: description,
            location: orderData.location || "",
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur",
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: "Asia/Kuala_Lumpur",
            },
          },
        });
        console.log(`Google Calendar event ${existingEventId} updated successfully.`);
        return;
      } catch (updateErr) {
        const errObj = updateErr as { status?: number; message?: string };
        if (errObj && (errObj.status === 404 || (errObj.message && errObj.message.includes('Not Found')))) {
          console.warn(`Existing calendar event ${existingEventId} not found or deleted on calendar, recreating...`);
        } else {
          throw updateErr;
        }
      }
    }

    console.log(`Creating new Google Calendar event for order ${orderId}...`);
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: summary,
        description: description,
        location: orderData.location || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Kuala_Lumpur",
        },
      },
    });

    const eventId = response.data.id;
    if (eventId) {
      console.log(`Google Calendar event created successfully! Event Link: ${response.data.htmlLink}`);

      const updatedCalendarEventIds = {
        ...(orderData.calendarEventIds || {}),
        [calendarId]: eventId
      };

      try {
        const adminDb = getFirestore();
        await adminDb.collection("orders").doc(orderId).update({
          calendarEventIds: updatedCalendarEventIds
        });
        console.log(`Firestore updated with calendarEventIds for order ${orderId}`);
      } catch (dbErr) {
        console.warn(`Failed to update calendarEventIds in Firestore for order ${orderId}:`, dbErr);
      }

      try {
        const localOrders = getLocalOrders();
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex !== -1) {
          localOrders[localIndex] = {
            ...localOrders[localIndex],
            calendarEventIds: updatedCalendarEventIds
          };
          saveLocalOrders(localOrders);
          console.log(`Local JSON updated with calendarEventIds for order ${orderId}`);
        }
      } catch (localErr) {
        console.error("Failed to update local orders with calendarEventIds:", localErr);
      }
    }
  } catch (err) {
    console.error(`Error syncing Google Calendar event for order ${orderId}:`, err);
  }
}
