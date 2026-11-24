/** Charges are recorded separately from per-pax prices. Historical orders with
 * no charge fields retain zero charges; new buffet orders default to 10%. */
export const DEFAULT_BUFFET_SERVICE_RATE = 10;
export interface OrderChargeFields {
  deliveryCharge?: number;
  serviceChargeRate?: number;
  serviceChargeAmount?: number;
}
export function initialOrderCharges(preparationType: unknown): OrderChargeFields {
  return { deliveryCharge: 0, serviceChargeRate: preparationType === 'buffet' ? DEFAULT_BUFFET_SERVICE_RATE : 0, serviceChargeAmount: 0 };
}
export const validCharge = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
export const validServiceRate = (value: unknown): value is number => validCharge(value) && value <= 100;
export function isSelfPickup(delivery: unknown): boolean {
  if (typeof delivery === 'string') return ['pickup', 'self_pickup', 'self-pickup'].includes(delivery.toLowerCase());
  if (delivery && typeof delivery === 'object') {
    const record = delivery as Record<string, unknown>;
    return ['method', 'type', 'mode', 'deliveryType'].some(key => typeof record[key] === 'string' && isSelfPickup(record[key]));
  }
  return false;
}
export function calculateOrderCharges(foodSubtotal: number, fields: OrderChargeFields & { preparationType?: unknown; delivery?: unknown }) {
  if (!Number.isFinite(foodSubtotal) || foodSubtotal < 0) throw new Error('Invalid food subtotal');
  const deliveryCharge = fields.deliveryCharge ?? 0;
  const serviceChargeRate = fields.serviceChargeRate ?? 0;
  if (!validCharge(deliveryCharge) || !validServiceRate(serviceChargeRate)) throw new Error('Invalid delivery charge or service charge rate');
  if (isSelfPickup(fields.delivery) && deliveryCharge !== 0) throw new Error('Self-pickup has no delivery charge');
  if (fields.preparationType !== 'buffet' && serviceChargeRate !== 0) throw new Error('Service charge applies to buffet orders only');
  const foodCents = Math.round(foodSubtotal * 100);
  const serviceCents = Math.round(foodCents * Math.round(serviceChargeRate * 100) / 10000);
  return { foodSubtotal: foodCents / 100, deliveryCharge, serviceChargeRate, serviceChargeAmount: serviceCents / 100, totalAmount: (foodCents + Math.round(deliveryCharge * 100) + serviceCents) / 100 };
}
export function orderFoodSubtotal(prices: Record<string, number>, quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Invalid quantity');
  return Object.values(prices).reduce((sum, price) => {
    if (!validCharge(price) || price <= 0) throw new Error('Invalid unit price');
    return sum + Math.round(price * 100) * quantity;
  }, 0) / 100;
}
