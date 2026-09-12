const fs = require('fs');
let code = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');

// The client sends the total in totalAmount. We need to recalculate it securely before creating.
code = code.replace(
  `    const data = {
      ...orderPayload,
      userId: customerUserId, // Associate with Firebase user if authenticated
      status: orderPayload.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };`,
  `
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    const configSnap = await db.collection('app_config').doc('prices').get();
    let currentPrices = {};
    if (configSnap.exists) {
        currentPrices = configSnap.data().meals || {};
    }

    let secureTotalAmount = 0;
    const quantity = parseInt(orderPayload.quantity) || 1;
    const meals = orderPayload.meals || [];
    
    // Add up prices for selected meals
    for (const meal of meals) {
      if (currentPrices[meal] !== undefined) {
         secureTotalAmount += Number(currentPrices[meal]);
      } else {
        // Fallbacks based on default app configuration if database is empty
        if (meal === 'breakfast') secureTotalAmount += 5.0;
        if (meal === 'lunch') secureTotalAmount += 8.0;
        if (meal === 'hi_tea') secureTotalAmount += 4.0;
      }
    }
    
    // Multiply by pax quantity
    secureTotalAmount = secureTotalAmount * quantity;

    const data = {
      ...orderPayload,
      userId: customerUserId, // Associate with Firebase user if authenticated
      status: orderPayload.status || 'pending',
      totalAmount: secureTotalAmount, // Server-Authoritative Pricing Override
      prices: currentPrices, // Store snapshot of the current prices applied to this order
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
`
);

fs.writeFileSync('server/routes/orderRoutes.ts', code);
console.log("Patched order creation for authoritative pricing");
