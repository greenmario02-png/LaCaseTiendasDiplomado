import { prisma } from '../config/database';

export interface CommissionConfig {
  enabled: boolean;
  /** % de comisión sobre el subtotal */
  percentage: number;
  /** Comisión mínima por orden (Bs) */
  minimum: number;
  /** Comisión fija por orden (Bs), si se usa en vez de porcentaje */
  fixed: number;
  /** Aplica también al envío (true) o solo al subtotal (false) */
  onShipping: boolean;
}

const DEFAULT_CONFIG: CommissionConfig = {
  enabled: false,
  percentage: 5,
  minimum: 2,
  fixed: 0,
  onShipping: false,
};

export async function getCommissionConfig(): Promise<CommissionConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: 'commission.' } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  return {
    enabled: map['commission.enabled'] === 'true',
    percentage: Number(map['commission.percentage'] ?? DEFAULT_CONFIG.percentage),
    minimum: Number(map['commission.minimum'] ?? DEFAULT_CONFIG.minimum),
    fixed: Number(map['commission.fixed'] ?? DEFAULT_CONFIG.fixed),
    onShipping: map['commission.onShipping'] === 'true',
  };
}

export async function setCommissionConfig(config: Partial<CommissionConfig>) {
  const entries: Record<string, string> = {
    'commission.enabled': String(config.enabled ?? false),
    'commission.percentage': String(config.percentage ?? DEFAULT_CONFIG.percentage),
    'commission.minimum': String(config.minimum ?? DEFAULT_CONFIG.minimum),
    'commission.fixed': String(config.fixed ?? DEFAULT_CONFIG.fixed),
    'commission.onShipping': String(config.onShipping ?? false),
  };
  for (const [key, value] of Object.entries(entries)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

/**
 * Calcula la comisión de la plataforma sobre una orden.
 * Base = subtotal (+ envío si onShipping).
 * Comisión = fija si fixed > 0, si no % sobre la base, con mínimo.
 */
export function calculateCommission(subtotal: number, shippingCost: number, config: CommissionConfig): number {
  if (!config.enabled) return 0;
  const base = config.onShipping ? subtotal + shippingCost : subtotal;
  if (base <= 0) return 0;
  if (config.fixed > 0) {
    return Math.max(config.fixed, 0);
  }
  const pct = (base * config.percentage) / 100;
  return Math.round(Math.max(pct, config.minimum) * 100) / 100;
}

/**
 * Neto para el vendedor = subtotal + envío - comisión.
 */
export function sellerNet(subtotal: number, shippingCost: number, commission: number): number {
  return Math.round((subtotal + shippingCost - commission) * 100) / 100;
}
