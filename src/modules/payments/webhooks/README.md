# Webhooks (Event Abonelikleri) — MetaHub Sözleşmesi

**Durum:** v1 (MVP) — çok kiracılı, i18n-hazır, HMAC imzalı, retry’lı.

## Amaç

Tenant bazında sistem olaylarını (order/payment/promotions vb.) harici URL’lere gönderir. Abonelik (endpoint) tanımlar, teslimatları log’lar, yeniden denemeleri yönetir.

## Güvenlik

- **İmza:** `HMAC-SHA256(secret, "<timestamp>.<body>")`  
  Header’lar:
  - `x-mh-signature: t=<ts>,v=v1,hmac=<hex>`
  - `x-mh-timestamp: <unix seconds>`
  - `x-mh-event: <eventType>`
- **Replay koruması:** Varsayılan `timestampSkewSec=300` (5 dk) — tüketici tarafında doğrulayın.
- **IP allowlist / mTLS:** Faz-2 için genişletilebilir.

## Retry

- `maxAttempts` (default 3), `strategy=fixed|exponential`, `baseBackoffSec` (default 30s)
- `timeoutMs` (default 15s)
- Başarısız her deneme ve son durum **deliveries**’te log’lanır.

## Event Türleri (örnek)

- `order.created`, `order.status.changed`
- `payment.created`, `payment.refunded`
- `promotion.redeemed`
- `coupon.created`, `coupon.updated`
- `menuitem.updated`
- `*` (wildcard)

## Admin Uçları

Base: `/webhooks` (Auth: `admin|moderator`, `x-tenant` zorunlu)

### Endpoint Yönetimi
# Webhooks (Event Abonelikleri) — MetaHub Sözleşmesi

**Durum:** v1 (MVP) — çok kiracılı, i18n-hazır, HMAC imzalı, retry’lı.

## Amaç

Tenant bazında sistem olaylarını (order/payment/promotions vb.) harici URL’lere gönderir. Abonelik (endpoint) tanımlar, teslimatları log’lar, yeniden denemeleri yönetir.

## Güvenlik

- **İmza:** `HMAC-SHA256(secret, "<timestamp>.<body>")`  
  Header’lar:
  - `x-mh-signature: t=<ts>,v=v1,hmac=<hex>`
  - `x-mh-timestamp: <unix seconds>`
  - `x-mh-event: <eventType>`
- **Replay koruması:** Varsayılan `timestampSkewSec=300` (5 dk) — tüketici tarafında doğrulayın.
- **IP allowlist / mTLS:** Faz-2 için genişletilebilir.

## Retry

- `maxAttempts` (default 3), `strategy=fixed|exponential`, `baseBackoffSec` (default 30s)
- `timeoutMs` (default 15s)
- Başarısız her deneme ve son durum **deliveries**’te log’lanır.

## Event Türleri (örnek)

- `order.created`, `order.status.changed`
- `payment.created`, `payment.refunded`
- `promotion.redeemed`
- `coupon.created`, `coupon.updated`
- `menuitem.updated`
- `*` (wildcard)

## Admin Uçları

Base: `/webhooks` (Auth: `admin|moderator`, `x-tenant` zorunlu)# Webhooks (Event Abonelikleri) — MetaHub Sözleşmesi

**Durum:** v1 (MVP) — çok kiracılı, i18n-hazır, HMAC imzalı, retry’lı.

## Amaç

Tenant bazında sistem olaylarını (order/payment/promotions vb.) harici URL’lere gönderir. Abonelik (endpoint) tanımlar, teslimatları log’lar, yeniden denemeleri yönetir.

## Güvenlik

- **İmza:** `HMAC-SHA256(secret, "<timestamp>.<body>")`  
  Header’lar:
  - `x-mh-signature: t=<ts>,v=v1,hmac=<hex>`
  - `x-mh-timestamp: <unix seconds>`
  - `x-mh-event: <eventType>`
- **Replay koruması:** Varsayılan `timestampSkewSec=300` (5 dk) — tüketici tarafında doğrulayın.
- **IP allowlist / mTLS:** Faz-2 için genişletilebilir.

## Retry

- `maxAttempts` (default 3), `strategy=fixed|exponential`, `baseBackoffSec` (default 30s)
- `timeoutMs` (default 15s)
- Başarısız her deneme ve son durum **deliveries**’te log’lanır.

## Event Türleri (örnek)

- `order.created`, `order.status.changed`
- `payment.created`, `payment.refunded`
- `promotion.redeemed`
- `coupon.created`, `coupon.updated`
- `menuitem.updated`
- `*` (wildcard)

## Admin Uçları

Base: `/webhooks` (Auth: `admin|moderator`, `x-tenant` zorunlu)

### Endpoint Yönetimi

- `GET /endpoints?q=&isActive=&event=&limit=`  
- `GET /endpoints/:id`  
- `POST /endpoints`
  ```json
  {
    "name": "ERP bridge",
    "targetUrl": "https://erp.example.com/hook",
    "httpMethod": "POST",
    "isActive": true,
    "events": ["order.created","payment.created"],
    "headers": [{ "key":"x-api-key", "value":"***" }],
    "verifySSL": true,
    "signing": { "headerName": "x-mh-signature", "timestampHeaderName":"x-mh-timestamp" },
    "retry": { "maxAttempts": 3, "strategy": "exponential", "baseBackoffSec": 30, "timeoutMs": 15000 }
  }


### Endpoint Yönetimi

- `GET /endpoints?q=&isActive=&event=&limit=`  
- `GET /endpoints/:id`  
- `POST /endpoints`
  ```json
  {
    "name": "ERP bridge",
    "targetUrl": "https://erp.example.com/hook",
    "httpMethod": "POST",
    "isActive": true,
    "events": ["order.created","payment.created"],
    "headers": [{ "key":"x-api-key", "value":"***" }],
    "verifySSL": true,
    "signing": { "headerName": "x-mh-signature", "timestampHeaderName":"x-mh-timestamp" },
    "retry": { "maxAttempts": 3, "strategy": "exponential", "baseBackoffSec": 30, "timeoutMs": 15000 }
  }

- `GET /endpoints?q=&isActive=&event=&limit=`  
- `GET /endpoints/:id`  
- `POST /endpoints`
  ```json
  {
    "name": "ERP bridge",
    "targetUrl": "https://erp.example.com/hook",
    "httpMethod": "POST",
    "isActive": true,
    "events": ["order.created","payment.created"],
    "headers": [{ "key":"x-api-key", "value":"***" }],
    "verifySSL": true,
    "signing": { "headerName": "x-mh-signature", "timestampHeaderName":"x-mh-timestamp" },
    "retry": { "maxAttempts": 3, "strategy": "exponential", "baseBackoffSec": 30, "timeoutMs": 15000 }
  }
