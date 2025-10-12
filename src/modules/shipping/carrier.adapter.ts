export type LabelRequest = {
  tenant: string;
  carrier: string;
  shipmentId: string;
  to: { name: string; address: string; city: string; postal: string; country: string; phone?: string };
  packages: Array<{ weight_grams?: number; dims?: { l:number; w:number; h:number } }>;
};

export type LabelResponse = {
  ok: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  raw?: any;
  error?: string;
};

export async function printLabel(_req: LabelRequest): Promise<LabelResponse> {
  // TODO: gerçek taşıyıcı entegrasyonu
  return { ok: true, trackingNumber: `TRK-${Date.now()}`, labelUrl: undefined };
}
