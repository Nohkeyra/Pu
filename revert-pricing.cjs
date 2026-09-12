const fs = require('fs');
let code = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');

code = code.replace(
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
    const totalAmount = pricingResult.totalAmount;`,
  `    const prices = rawBody.prices && typeof rawBody.prices === 'object' ? rawBody.prices : {};
    const totalAmount = Number(rawBody.totalAmount) || 0;`
);

fs.writeFileSync('server/routes/orderRoutes.ts', code);
console.log("Reverted pricing to client-submitted / flexible mode");
