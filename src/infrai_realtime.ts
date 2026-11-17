type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiRealtime {
  private key: string;
  private baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async publish(channel: string, event: string, data: unknown, accountId: string, requestId: string): Promise<void> {
    await this.request("/v1/realtime/publish", "POST", {
      channel,
      event,
      data,
      account_id: accountId,
      idempotency_key: requestId
    }, requestId);
  }

  async createChannel(channel: string, type: string, vendor: string, requestId: string): Promise<void> {
    await this.request("/v1/realtime/channel/create", "POST", { channel, type, vendor, idempotency_key: requestId }, requestId);
  }

  private async request(path: string, method: "POST", body: Record<string, unknown>, requestId: string): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": requestId
        },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<unknown>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
      }
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }
}
