import type { Request } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { publishEvent } from "./dispatcher.service";

/**
 * Basit domain event yayınlayıcı.
 * Varsayılan nonBlocking = true — API yanıtını bekletmez.
 */
export async function emitWebhookEvent(
  req: Request,
  eventType: string,
  payload: any,
  opts?: { onlyEndpointId?: string; nonBlocking?: boolean }
): Promise<void> {
  const { WebhookEndpoint, WebhookDelivery } = await getTenantModels(req);
  await publishEvent(
    WebhookEndpoint,
    WebhookDelivery,
    { tenant: req.tenant!, eventType, payload, onlyEndpointId: opts?.onlyEndpointId },
    { nonBlocking: opts?.nonBlocking ?? true }
  );
}
