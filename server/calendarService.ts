import { google } from "googleapis";
import { getFirestore, type OrderData } from "./firebaseAdmin.js";
import { getLocalOrders, saveLocalOrders } from "./localOrdersStore.js";

export function getGoogleCalendarClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim()
    : undefined;
  if (email && email.startsWith('"') && email.endsWith('"')) {
    email = email.slice(1, -1).trim();
  }

  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.trim()
    : undefined;
  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1).trim();
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

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

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const currentStatus = (orderData.status || "pending").toLowerCase();
    
    // Per-status event key ensures every status transition auto-syncs to Google Calendar with its own separate event
    const statusEventKey = `${calendarId}_${currentStatus}`;
    const statusKey = currentStatus;

    const existingEventId =
      orderData.calendarEventIds?.[statusEventKey] ||
      orderData.calendarEventIds?.[statusKey];

    const statusLabel = currentStatus.toUpperCase();
    const mealList = Array.isArray(orderData.meals) ? orderData.meals.join(", ") : (orderData.meals || "");
    const invPrefix = orderData.invoiceNo ? `[${orderData.invoiceNo}] ` : '';
    const summary = `[${statusLabel}] ${invPrefix}${orderData.quantity || orderData.pax || ""} Pax | ${mealList || "N/A"} | ${orderData.location || "N/A"}`;
    const description = `Status: ${statusLabel}\nCustomer: ${orderData.name || orderData.customerName || "N/A"}\nCompany: ${orderData.to || "N/A"}\nMenu: ${orderData.menu || "N/A"}\nNotes: ${orderData.notes || "N/A"}`;

    if (existingEventId) {
      try {
        console.log(`Updating existing Google Calendar event ${existingEventId} for order ${orderId} (${statusLabel})...`);
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
        console.log(`Google Calendar event ${existingEventId} updated successfully for status ${statusLabel}.`);
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

    console.log(`Creating new Google Calendar event for order ${orderId} status ${statusLabel}...`);
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
      console.log(`Google Calendar event created successfully for status ${statusLabel}! Link: ${response.data.htmlLink}`);

      const updatedCalendarEventIds = {
        ...(orderData.calendarEventIds || {}),
        [statusEventKey]: eventId,
        [statusKey]: eventId,
        [calendarId]: eventId,
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
