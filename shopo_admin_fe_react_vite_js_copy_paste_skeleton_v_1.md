# Shopo — Admin FE (React + Vite, **JavaScript**) — Copy‑Paste Skeleton (v1)

> Amaç: **Next.js kullanmadan**, saf **React 18 + Vite + JS** ile admin panel iskeleti; **MSW mock API** ile Orders list/detail ekranlarını hemen ayağa kaldırma. Sonraki ekranlar (Inventory, Coupons, Returns, Reports) aynı kalıpla eklenecek.

---

## 0) Kurulum
```bash
# yeni klasör
mkdir shopo-admin-fe-js && cd shopo-admin-fe-js

# dosyaları aşağıdaki gibi oluştur (copy‑paste)
# sonra:
npm i
npm run dev
```

> Varsayılan env: **MSW açık** (mock API). Gerçek API’ye geçiş için `.env`te `VITE_USE_MSW=false` yapman yeter.

---

## 1) package.json
```json
{
  "name": "shopo-admin-fe-js",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@reduxjs/toolkit": "^2.2.5",
    "msw": "^2.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-redux": "^9.1.2",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "vite": "^5.4.2"
  }
}
```

---

## 2) Vite & Tailwind

### vite.config.js
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
```

### postcss.config.cjs
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

### tailwind.config.cjs
```js
module.exports = {
  darkMode: ['class'],
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: []
};
```

---

## 3) HTML & Global CSS

### index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shopo Admin (JS)</title>
  </head>
  <body class="min-h-screen bg-gray-50 text-gray-900">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* basit yardımcılar */
.btn { @apply inline-flex items-center gap-1 px-3 py-2 rounded-md bg-gray-900 text-white hover:bg-black text-sm; }
.card { @apply bg-white rounded-lg border shadow-sm; }
```

---

## 4) Ortam Değerleri

### .env (opsiyonel)
```dotenv
VITE_API_URL=http://localhost:4000
VITE_TENANT=ensotek
VITE_USE_MSW=true
```

### src/config/env.js
```js
export const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  TENANT: import.meta.env.VITE_TENANT || 'ensotek',
  USE_MSW: (import.meta.env.VITE_USE_MSW ?? 'true') === 'true'
};
```

---

## 5) MSW (Mock API)

### src/mocks/data/orders.json
```json
[
  { "orderNo": "MH-2025-000123", "createdAt": "2025-09-28T06:00:00Z", "customer": "John Doe", "items": 3, "amount": "$129.99", "status": "paid" },
  { "orderNo": "MH-2025-000124", "createdAt": "2025-09-28T06:10:00Z", "customer": "Alice", "items": 1, "amount": "$27.27", "status": "awaiting_payment" },
  { "orderNo": "MH-2025-000125", "createdAt": "2025-09-28T06:30:00Z", "customer": "Bob", "items": 2, "amount": "$79.95", "status": "packing" }
]
```

### src/mocks/handlers.js
```js
import { http, HttpResponse } from 'msw';
import orders from './data/orders.json';

export const handlers = [
  // List
  http.get('*/api/v1/admin/orders', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('pageSize') || 20);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return HttpResponse.json({ items: orders.slice(start, end), total: orders.length, page, pageSize });
  }),

  // Detail
  http.get('*/api/v1/admin/orders/:orderNo', ({ params }) => {
    const ord = orders.find((o) => o.orderNo === params.orderNo);
    if (!ord) return new HttpResponse(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 });
    return HttpResponse.json({ order: { ...ord, timeline: [ { at: '2025-09-28T06:00:00Z', ev: 'ORDER_CREATED' } ] } });
  }),

  // Status change
  http.post('*/api/v1/admin/orders/:orderNo/status', async ({ params, request }) => {
    const body = await request.json();
    const idx = orders.findIndex((o) => o.orderNo === params.orderNo);
    if (idx >= 0) orders[idx].status = body.to;
    return HttpResponse.json({ ok: true });
  })
];
```

### src/mocks/browser.js
```js
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

---

## 6) RTK Query Base & Store

### src/services/api.js
```js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../config/env';

export const baseQuery = fetchBaseQuery({
  baseUrl: `${env.API_URL}/api/v1`,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('X-Tenant', env.TENANT);
    return headers;
  }
});

export const api = createApi({ reducerPath: 'api', baseQuery, endpoints: () => ({}) });
```

### src/app/store.js
```js
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../services/api';

export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gDM) => gDM().concat(api.middleware)
});
```

---

## 7) Orders Entity (API slice)

### src/entities/order/api.js
```js
import { api } from '../../services/api';

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query({
      query: ({ page = 1, pageSize = 20 } = {}) => ({ url: `/admin/orders?page=${page}&pageSize=${pageSize}` })
    }),
    getOrder: build.query({
      query: (orderNo) => ({ url: `/admin/orders/${orderNo}` })
    }),
    setStatus: build.mutation({
      query: ({ orderNo, to }) => ({ url: `/admin/orders/${orderNo}/status`, method: 'POST', body: { to } })
    })
  })
});

export const { useGetOrdersQuery, useGetOrderQuery, useSetStatusMutation } = ordersApi;
```

---

## 8) App & Router

### src/app/routes.jsx
```jsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';

export const router = createBrowserRouter([
  { path: '/', element: <OrdersPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/orders/:orderNo', element: <OrderDetailPage /> }
]);
```

### src/app/App.jsx
```jsx
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}
```

### src/main.jsx
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './app/App';
import './index.css';
import { env } from './config/env';

async function enableMocking() {
  if (!env.USE_MSW) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' } });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
});
```

---

## 9) Basit UI Bileşenleri

### src/shared/components/DataTable.jsx
```jsx
import React from 'react';

export function DataTable({ rows, columns, loading, onRowClick }) {
  if (loading) return <div className="p-4">Loading...</div>;
  return (
    <div className="overflow-x-auto card">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-3 py-2 font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick && onRowClick(r)}>
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">{String(r[c.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 10) Sayfalar

### src/pages/OrdersPage.jsx
```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetOrdersQuery } from '../entities/order/api';
import { DataTable } from '../shared/components/DataTable';

export default function OrdersPage() {
  const nav = useNavigate();
  const { data, isLoading } = useGetOrdersQuery({ page: 1, pageSize: 20 });
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <DataTable
        loading={isLoading}
        rows={data?.items || []}
        columns={[
          { key: 'orderNo', header: 'Order No' },
          { key: 'createdAt', header: 'Date' },
          { key: 'customer', header: 'Customer' },
          { key: 'items', header: 'Items' },
          { key: 'amount', header: 'Amount' },
          { key: 'status', header: 'Status' }
        ]}
        onRowClick={(r) => nav(`/orders/${r.orderNo}`)}
      />
    </div>
  );
}
```

### src/pages/OrderDetailPage.jsx
```jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetOrderQuery, useSetStatusMutation } from '../entities/order/api';

export default function OrderDetailPage() {
  const { orderNo = '' } = useParams();
  const { data, isLoading } = useGetOrderQuery(orderNo);
  const [setStatus] = useSetStatusMutation();

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">Not found</div>;
  const o = data.order;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order {o.orderNo}</h1>
        <div className="space-x-2">
          <button className="btn" onClick={() => setStatus({ orderNo: o.orderNo, to: 'packing' })}>Mark Packing</button>
          <button className="btn" onClick={() => setStatus({ orderNo: o.orderNo, to: 'shipped' })}>Mark Shipped</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Summary</h2>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Customer:</span> {o.customer}</div>
            <div><span className="font-medium">Status:</span> {o.status}</div>
            <div><span className="font-medium">Amount:</span> {o.amount}</div>
            <div><span className="font-medium">Created:</span> {o.createdAt}</div>
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Timeline</h2>
          <ul className="text-sm list-disc pl-5">
            {(o.timeline || []).map((t, idx) => (
              <li key={idx}>{t.at} — {t.ev}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 11) Notlar & Genişletme
- **Gerçek API’ya geçiş**: `.env` → `VITE_USE_MSW=false` (MSW kapanır). `VITE_API_URL`’i backend’e yönlendir. RTK Query aynı kodla çalışır.
- **Yeni ekranlar**: `entities/<modul>/api.js` + `pages/<Modul>Page.jsx` ve gerekirse `shared/components` bileşenleri.
- **Auth/RBAC**: başlangıçta mock; gerçek JWT geldiğinde `baseQuery` header’ına `Authorization` eklemeyi unutma.
- **UI**: Tailwind ile hızlı; istersen ileride shadcn/ui ekleyebiliriz.

---

**Bitti.** Bu set, tek seferde kopyalayıp çalıştırılabilir bir **React+Vite (JS)** admin iskeleti ve **MSW mock API** sunar. Orders list/detail ekranları hazır; diğer modüller aynı kalıpla eklenebilir.

