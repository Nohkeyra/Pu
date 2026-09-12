const fs = require('fs');
let code = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');

// Replace the placeholder prices and totalAmount with actual server calculation
code = code.replace(
  `    // Authoritative Server Pricing Calculation via shared module
    // PRICING - CRITICAL: Guest and Client MUST NEVER determine the actual/final price.
    // If an order has no Admin-defined price yet, do NOT invent or accept a client price.
    // Keep it awaiting Admin pricing.
    const prices = {};
    const totalAmount = 0;`,
  `    const { calculateOrderPricing } = await import('../../src/services/orderCalculation.js');
    const pricingResult = calculateOrderPricing({
      dishes: rawBody.dishes,
      veggies: rawBody.veggies,
      customMenu: rawBody.customMenu,
      quantity: qty,
      meals: mappedMeals,
      menu: rawBody.menu
    });
    const prices = pricingResult.prices;
    const totalAmount = pricingResult.totalAmount;`
);

fs.writeFileSync('server/routes/orderRoutes.ts', code);
console.log("Patched authoritative pricing");
