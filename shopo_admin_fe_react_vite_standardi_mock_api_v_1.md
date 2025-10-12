# Shopo — Admin FE (React+Vite) Standardı & Mock API (v1)

> Tarih: 2025-09-28  
> Amaç: **Admin panelini** Next.js kullanmadan, **React 18 + Vite + TypeScript** standardında kurmak; **mock API (MSW)** ile **Orders, Order Detail, Inventory, Coupons, Returns/Refunds, Reports** ekranlarını hızla dikmek. Sonrasında gerçek Metahub API'ye **flags** ile geçiş.

---

## 1) Stack Kararları
- **App**: React 18 + Vite + TypeScript
- **Router**: React Router v6
- **State**: Redux Toolkit + RTK Query (cache, re-fetch, normalizasyon)
- **UI**: Tailwind CSS + shadcn/ui (Radix tabanlı, erişilebilirlik + hız)
- **Form**: react-hook-form + @hookform/resolvers + zod
- **Tablo**: TanStack Table v8 (kolonlar, filtre, sort, pagination)
- **Grafik**: Recharts (raporlar)
- **İkon**: lucide-react
- **Animasyon**: framer-motion
- **Bildirim**: sonner
- **Mock API**: MSW (Mock Service Worker) — dev modda tarayıcı içinde
- **Test**: Vitest + RTL (opsiyonel)

> Neden MSW? Komponent seviyesinde gerçek network intercept eder; aynı fetch/RTK Query kodu, gerçek API'ye geçince **dokunmadan** çalışır.

---

## 2) Proje İskeleti (FSD odaklı)
```
admin-fe/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  postcss.config.cjs
  tailwind.config.cjs
  src/
    main.tsx
    app/
      App.tsx
      routes.tsx
      store.ts
      providers/
        ThemeProvider.tsx
    config/
      env.ts
      rbac.ts
    services/
      api.ts           # RTK baseQuery (X-Tenant, Auth, credentials)
    mocks/
      browser.ts       # msw worker
      handlers.ts      # endpoint handler'ları
      data/
        orders.json
        inventory.json
        coupons.json
        returns.json
    shared/
      ui/              # shadcn/ui sarmalayıcıları
      components/
        Page.tsx
        DataTable.tsx  # TanStack Table generic
        Toolbar.tsx
      lib/
        format.ts      # fiyat/para birimi
        hooks.ts
    entities/
      order/
        api.ts         # RTK endpoints: list, detail, status, notes
        types.ts
      product/
        api.ts
        types.ts
      coupon/
        api.ts
      return/
        api.ts
      report/
        api.ts
    features/
      orderStatusUpdate/
        StatusDialog.tsx
      orderNote/
        NoteDrawer.tsx
      filters/
        OrdersFilter.tsx
    pages/
      DashboardPage.tsx
      OrdersPage.tsx
      OrderDetailPage.tsx
      InventoryPage.tsx
      CouponsPage.tsx
      ReturnsPage.tsx
      ReportsPage.tsx
      SettingsPage.tsx
```

---

## 3) package.json (öneri)
```json
{
  "name": "shopo-admin-fe",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@reduxjs/toolkit": "^2.2.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "framer-motion": "^11.2.10",
    "lucide-react": "^0.441.0",
    "msw": "^2.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-redux": "^9.1.2",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.12.6",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.2"
  }
}
```

---

## 4) Tailwind & Vite & TS
**tailwind.config.cjs**
```js
module.exports = {
  darkMode: ['class'],
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [require('tailwindcss-animate')]
};
```

**postcss.config.cjs**
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**vite.config.ts**
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
```

**tsconfig.json** (kısa)
```json
{ "compilerOptions": { "target": "ES2020", "module": "ESNext", "jsx": "react-jsx", "strict": true, "moduleResolution": "Bundler", "baseUrl": "." }, "include": ["src"] }
```

---

## 5) Ortam Değerleri
**src/config/env.ts**
```ts
export const env = {
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  TENANT: import.meta.env.VITE_TENANT ?? 'ensotek',
  USE_MSW: (import.meta.env.VITE_USE_MSW ?? 'true') === 'true'
};
```
`.env`
```
VITE_API_URL=http://localhost:4000
VITE_TENANT=ensotek
VITE_USE_MSW=true
```

---

## 6) RTK Query Base
**src/services/api.ts**
```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../config/env';

export const baseQuery = fetchBaseQuery({
  baseUrl: `${env.API_URL}/api/v1`,
  credentials: 'include',
  prepareHeaders: (headers) => { headers.set('X-Tenant', env.TENANT); return headers; }
});

export const api = createApi({ reducerPath: 'api', baseQuery, endpoints: () => ({}) });
```

**src/app/store.ts**
```ts
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../services/api';

export const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gDM) => gDM().concat(api.middleware) });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## 7) MSW Mock
**src/mocks/browser.ts**
```ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

**src/mocks/handlers.ts** (özet)
```ts
import { http, HttpResponse } from 'msw';
import orders from './data/orders.json';

export const handlers = [
  http.get('/api/v1/admin/orders', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('pageSize') || 20);
    const start = (page-1)*pageSize; const end = start+pageSize;
    return HttpResponse.json({ items: orders.slice(start,end), total: orders.length, page, pageSize });
  }),
  http.get('/api/v1/admin/orders/:orderNo', ({ params }) => {
    const ord = orders.find(o => o.orderNo === params.orderNo);
    if (!ord) return new HttpResponse(JSON.stringify({ error:{ code:'NOT_FOUND' }}), { status: 404 });
    return HttpResponse.json({ order: ord });
  }),
  http.post('/api/v1/admin/orders/:orderNo/status', async ({ params, request }) => {
    const body = await request.json();
    const idx = orders.findIndex(o => o.orderNo === params.orderNo);
    if (idx>=0) orders[idx].status = body.to;
    return HttpResponse.json({ ok: true });
  }),
];
```

**src/mocks/data/orders.json** (örnek kayıt)
```json
[
  { "orderNo": "MH-2025-000123", "createdAt": "2025-09-28T06:00:00Z", "customer": "John Doe", "items": 3, "amount": "$129.99", "status": "paid" },
  { "orderNo": "MH-2025-000124", "createdAt": "2025-09-28T06:10:00Z", "customer": "Alice", "items": 1, "amount": "$27.27", "status": "awaiting_payment" }
]
```

**src/main.tsx** (MSW boot)
```tsx
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
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}><App /></Provider>
    </React.StrictMode>
  );
});
```

---

## 8) Orders API Slice & Types
**src/entities/order/types.ts**
```ts
export type OrderStatus = 'created'|'awaiting_payment'|'paid'|'packing'|'shipped'|'delivered'|'cancelled'|'returned'|'refunded';
export interface OrderListItem { orderNo: string; createdAt: string; customer: string; items: number; amount: string; status: OrderStatus; }
export interface OrderDetail extends OrderListItem { timeline?: { at: string; ev: string; }[]; }
```

**src/entities/order/api.ts**
```ts
import { api } from '../../services/api';
import { OrderDetail, OrderListItem } from './types';

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query<{ items: OrderListItem[]; total: number; page: number; pageSize: number }, { page?: number; pageSize?: number }>({
      query: ({ page=1, pageSize=20 }={}) => ({ url: `/admin/orders?page=${page}&pageSize=${pageSize}` })
    }),
    getOrder: build.query<{ order: OrderDetail }, string>({ query: (orderNo) => ({ url: `/admin/orders/${orderNo}` }) }),
    setStatus: build.mutation<{ ok: boolean }, { orderNo: string; to: string }>({
      query: ({ orderNo, to }) => ({ url: `/admin/orders/${orderNo}/status`, method: 'POST', body: { to } }),
      invalidatesTags: (_r,_e,{orderNo}) => [{ type:'Order', id: orderNo }]
    }),
  }),
});

export const { useGetOrdersQuery, useGetOrderQuery, useSetStatusMutation } = ordersApi;
```

---

## 9) Sayfalar
**src/pages/OrdersPage.tsx** (özet)
```tsx
import { useGetOrdersQuery } from '@/entities/order/api';
import { DataTable } from '@/shared/components/DataTable';

export default function OrdersPage() {
  const { data, isLoading } = useGetOrdersQuery({ page: 1, pageSize: 20 });
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Orders</h1>
      <DataTable loading={isLoading} rows={data?.items||[]} columns={[
        { key:'orderNo', header:'Order No' },
        { key:'createdAt', header:'Date' },
        { key:'customer', header:'Customer' },
        { key:'items', header:'Items' },
        { key:'amount', header:'Amount' },
        { key:'status', header:'Status' }
      ]} rowLink={(r)=>`/orders/${r.orderNo}`} />
    </div>
  );
}
```

**src/pages/OrderDetailPage.tsx** (özet)
```tsx
import { useParams } from 'react-router-dom';
import { useGetOrderQuery, useSetStatusMutation } from '@/entities/order/api';

export default function OrderDetailPage(){
  const { orderNo='' } = useParams();
  const { data } = useGetOrderQuery(orderNo);
  const [setStatus] = useSetStatusMutation();
  if(!data) return null;
  const o = data.order;
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order {o.orderNo}</h1>
        <div className="space-x-2">
          <button className="btn" onClick={()=>setStatus({ orderNo:o.orderNo, to:'packing' })}>Mark Packing</button>
          <button className="btn" onClick={()=>setStatus({ orderNo:o.orderNo, to:'shipped' })}>Mark Shipped</button>
        </div>
      </div>
      {/* tabs: items, timeline, shipments, returns */}
    </div>
  );
}
```

**src/shared/components/DataTable.tsx** (çok basit)
```tsx
export function DataTable({ rows, columns, loading, rowLink }:{ rows:any[]; columns:{key:string; header:string;}[]; loading?:boolean; rowLink?:(r:any)=>string }){
  if(loading) return <div className="p-4">Loading...</div>;
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{columns.map(c => <th key={c.key} className="text-left px-3 py-2 font-medium">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=> (
            <tr key={i} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=> rowLink && (window.location.href = rowLink(r))}>
              {columns.map(c => <td key={c.key} className="px-3 py-2">{String(r[c.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 10) Router & App
**src/app/routes.tsx**
```tsx
import { createBrowserRouter } from 'react-router-dom';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';

export const router = createBrowserRouter([
  { path: '/', element: <OrdersPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/orders/:orderNo', element: <OrderDetailPage /> }
]);
```

**src/app/App.tsx**
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
export default function App(){ return <RouterProvider router={router} />; }
```

---

## 11) Stil & Tema
- Tailwind **dark mode** (`class`) etkin.
- shadcn/ui bileşenleri gerekirse; temel örnekler: Button, Dialog, Sheet, Tabs, Badge.
- Tasarım ilkesi: boşluk, tipografi, grid; tablo → toolbar (filter, search, export) + table + pagination.

---

## 12) Raporlar
- Recharts ile basit **Sales Over Time** (line), **Top Products** (bar), **Conversion** (pie/area).  
- Veri: `GET /api/v1/admin/reports/*` (mock MSW), sonra gerçek API.

---

## 13) Auth & RBAC (özet)
- Başlangıçta **public** mock; ardından JWT ile `roles: ['admin']`.  
- Route guard için küçük bir `RequireRole` bileşeni.

---

## 14) Geliştirme Akışı
1. `pnpm|npm i`  
2. `.env` ayarla (`VITE_USE_MSW=true`).  
3. `npm run dev` → MSW ile **Orders** sayfası çalışır.  
4. Mock veri dosyalarını genişlet: `inventory.json`, `coupons.json`, `returns.json`.  
5. Gerçek API’ye geçiş: `.env` → `VITE_USE_MSW=false` + CORS/headers hazır.

---

## 15) Sonraki Adımlar
- Orders: filtre/sıralama/pagination kontrolleri (Toolbar).  
- Order Detail: Tabs (Items, Timeline, Shipments, Returns), Status değişimi, Not ekleme.  
- Inventory: stok listesi + adjustment modal.  
- Coupons: CRUD + aktif/pasif.  
- Returns/Refunds: liste/detay/karar.  
- Reports: tarih aralığı + grafikler + CSV export.

