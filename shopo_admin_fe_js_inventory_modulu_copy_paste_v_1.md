# Shopo — Admin FE (React+Vite JS) — **Inventory Modülü** (Copy‑Paste, v1)

> Hedef: Var olan JS iskeletine **stok listesi** (+ arama, low‑stock filtresi) ve **stok düzeltme (adjustment)** akışlarını eklemek. Tamamı **JavaScript**.

---

## 1) Yeni Dosyalar & Yapı
```
src/
  entities/
    product/
      api.js
  features/
    inventoryAdjustment/
      AdjustModal.jsx
  pages/
    InventoryPage.jsx
  mocks/
    data/
      inventory.json
  mocks/handlers.js           # mevcut dosyayı güncelle (yeni handler'lar eklenecek)
  app/
    routes.jsx                # /inventory rotasını ekle
```

---

## 2) Mock Data
**`src/mocks/data/inventory.json`**
```json
[
  { "productId": "p_1001", "sku": "SKU-1001", "title": "Wireless Headphones", "brand": "Acousta", "stock": 48, "reserved": 5, "price": "$59.99" },
  { "productId": "p_1002", "sku": "SKU-1002", "title": "Smartphone X", "brand": "Xioami", "stock": 8,  "reserved": 2, "price": "$399.00" },
  { "productId": "p_1003", "sku": "SKU-1003", "title": "USB-C Charger 65W", "brand": "Voltix", "stock": 120, "reserved": 10, "price": "$24.90" },
  { "productId": "p_1004", "sku": "SKU-1004", "title": "Mechanical Keyboard", "brand": "KeyPro", "stock": 3,  "reserved": 1, "price": "$89.00" }
]
```

---

## 3) MSW Handlers — Envanter Uçları
**`src/mocks/handlers.js`** (mevcut dosyaya **ekle**)
```js
import inventory from './data/inventory.json';

// GET /admin/inventory
handlers.push(
  http.get('*/api/v1/admin/inventory', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('pageSize') || 20);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const low = url.searchParams.get('lowStock') === 'true';

    let rows = inventory.map((r) => ({ ...r, available: Math.max(0, r.stock - (r.reserved || 0)) }));
    if (q) rows = rows.filter((r) => (r.title+" "+r.sku+" "+(r.brand||'')).toLowerCase().includes(q));
    if (low) rows = rows.filter((r) => r.stock - (r.reserved||0) <= 10);

    const start = (page - 1) * pageSize; const end = start + pageSize;
    return HttpResponse.json({ items: rows.slice(start, end), total: rows.length, page, pageSize });
  })
);

// POST /admin/inventory/adjustments
handlers.push(
  http.post('*/api/v1/admin/inventory/adjustments', async ({ request }) => {
    const body = await request.json();
    const { productId, delta, reason } = body;
    const idx = inventory.findIndex((x) => x.productId === productId);
    if (idx < 0) return new HttpResponse(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 });
    inventory[idx].stock = Math.max(0, (inventory[idx].stock || 0) + Number(delta || 0));
    return HttpResponse.json({ ok: true, stock: inventory[idx].stock });
  })
);
```

> Not: Mock handler’lar **push** ile ekleniyor; böylece mevcut orders handler’ları korunur.

---

## 4) RTK Query — Inventory Endpoints
**`src/entities/product/api.js`** (yeni)
```js
import { api } from '../../services/api';

export const productApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInventory: build.query({
      query: ({ page = 1, pageSize = 20, q = '', lowStock = false } = {}) => ({
        url: `/admin/inventory?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(q)}&lowStock=${lowStock}`
      })
    }),
    adjustInventory: build.mutation({
      query: ({ productId, delta, reason }) => ({
        url: '/admin/inventory/adjustments',
        method: 'POST',
        body: { productId, delta, reason }
      })
    })
  })
});

export const { useGetInventoryQuery, useAdjustInventoryMutation } = productApi;
```

---

## 5) Stok Düzeltme Modalı
**`src/features/inventoryAdjustment/AdjustModal.jsx`** (yeni)
```jsx
import React, { useEffect, useState } from 'react';

export default function AdjustModal({ open, onClose, onSubmit, product }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) { setDelta(0); setReason(''); } }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Adjust Stock — {product?.title}</h3>
          <button className="text-sm" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          <div className="text-sm">Current stock: <b>{product?.stock}</b></div>
          <label className="block text-sm">Delta (e.g. +5 / -3)
            <input className="mt-1 w-full border rounded-md px-2 py-1" type="number" value={delta} onChange={(e)=>setDelta(parseInt(e.target.value||0))} />
          </label>
          <label className="block text-sm">Reason (optional)
            <input className="mt-1 w-full border rounded-md px-2 py-1" value={reason} onChange={(e)=>setReason(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn" onClick={()=> onSubmit({ delta, reason })}>Save</button>
            <button className="px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6) Inventory Sayfası
**`src/pages/InventoryPage.jsx`** (yeni)
```jsx
import React, { useMemo, useState } from 'react';
import { useGetInventoryQuery, useAdjustInventoryMutation } from '../entities/product/api';
import AdjustModal from '../features/inventoryAdjustment/AdjustModal';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const { data, isLoading, refetch } = useGetInventoryQuery({ page, pageSize: 20, q, lowStock: low });
  const [adjust] = useAdjustInventoryMutation();

  const [open, setOpen] = useState(false);
  const [row, setRow] = useState(null);

  const rows = data?.items || [];
  const columns = useMemo(() => [
    { key: 'sku', header: 'SKU' },
    { key: 'title', header: 'Title' },
    { key: 'brand', header: 'Brand' },
    { key: 'stock', header: 'Stock' },
    { key: 'reserved', header: 'Reserved' },
    { key: 'available', header: 'Available' },
    { key: 'price', header: 'Price' },
    { key: 'actions', header: '' }
  ], []);

  const onSubmitAdjust = async ({ delta, reason }) => {
    await adjust({ productId: row.productId, delta, reason }).unwrap();
    setOpen(false);
    refetch();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Inventory</h1>

      <div className="flex items-center gap-2">
        <input className="border rounded-md px-3 py-2 w-64" placeholder="Search SKU/Title/Brand" value={q} onChange={(e)=>setQ(e.target.value)} />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={low} onChange={(e)=>setLow(e.target.checked)} /> Low stock only
        </label>
        <button className="btn" onClick={()=>{ setPage(1); refetch(); }}>Search</button>
      </div>

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
            {isLoading && <tr><td className="px-3 py-2" colSpan={columns.length}>Loading...</td></tr>}
            {!isLoading && rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{r.sku}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.brand || ''}</td>
                <td className="px-3 py-2">{r.stock}</td>
                <td className="px-3 py-2">{r.reserved || 0}</td>
                <td className="px-3 py-2">{Math.max(0, (r.stock||0) - (r.reserved||0))}</td>
                <td className="px-3 py-2">{r.price}</td>
                <td className="px-3 py-2 text-right">
                  <button className="btn" onClick={()=>{ setRow(r); setOpen(true); }}>Adjust</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total: {data?.total || 0}</div>
        <div className="flex gap-2">
          <button disabled={page<=1} className="btn disabled:opacity-50" onClick={()=>setPage((p)=>Math.max(1,p-1))}>Prev</button>
          <button disabled={(data?.page||1) * 20 >= (data?.total||0)} className="btn disabled:opacity-50" onClick={()=>setPage((p)=>p+1)}>Next</button>
        </div>
      </div>

      <AdjustModal open={open} onClose={()=>setOpen(false)} onSubmit={onSubmitAdjust} product={row} />
    </div>
  );
}
```

---

## 7) Router — Inventory Rotası
**`src/app/routes.jsx`** (mevcut dosyayı **güncelle**)
```jsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import InventoryPage from '../pages/InventoryPage';

export const router = createBrowserRouter([
  { path: '/', element: <OrdersPage /> },
  { path: '/orders', element: <OrdersPage /> },
  { path: '/orders/:orderNo', element: <OrderDetailPage /> },
  { path: '/inventory', element: <InventoryPage /> }
]);
```

---

## 8) Kullanım
```bash
npm run dev
# http://localhost:5173
# Menü yoksa /inventory yoluna elle gidin: http://localhost:5173/inventory
# (İstersen header/nav iskeleti isterim, ekleyebilirim.)
```

---

## 9) Sonraki Modül (Sıradaki)
Bir sonraki sırada **Coupons** (kupon CRUD + aktif/pasif + doğrulama önizleme) gelecek. Aynı JS kalıbı ile sayfa, entity API ve MSW handler’larını ekleyeceğiz.


---

# Inventory Modülü — **Navbar / Menü** Eklentisi (JS)

Aşağıdaki parçalar, mevcut JS iskeletine **üst menü (navbar)** ve **nested routing** ekler. Tümü **JavaScript**. Menü: **Orders, Inventory, Coupons, Returns, Reports**.

## 1) Yeni/Değişen Dosyalar
```
src/
  layouts/
    AdminLayout.jsx        # yeni — üst menü + <Outlet />
  app/
    routes.jsx             # güncelle — nested routes
  pages/
    CouponsPage.jsx        # placeholder
    ReturnsPage.jsx        # placeholder
    ReportsPage.jsx        # placeholder
```

---

## 2) Layout (Navbar + Responsive Menü)
**`src/layouts/AdminLayout.jsx`**
```jsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const nav = [
    { to: '/orders', label: 'Orders' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/coupons', label: 'Coupons' },
    { to: '/returns', label: 'Returns' },
    { to: '/reports', label: 'Reports' }
  ];

  const linkCls = (isActive) =>
    'px-2 py-1 rounded-md text-sm ' + (isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100');

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
            <a href="/" className="font-semibold">Shopo Admin</a>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => linkCls(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {open && (
          <nav className="md:hidden border-t bg-white">
            <div className="px-4 py-2 flex flex-col">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => linkCls(isActive)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## 3) Router — Nested Route Yapısı
**`src/app/routes.jsx`** (güncelle)
```jsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import InventoryPage from '../pages/InventoryPage';
import CouponsPage from '../pages/CouponsPage';
import ReturnsPage from '../pages/ReturnsPage';
import ReportsPage from '../pages/ReportsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <OrdersPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:orderNo', element: <OrderDetailPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'coupons', element: <CouponsPage /> },
      { path: 'returns', element: <ReturnsPage /> },
      { path: 'reports', element: <ReportsPage /> }
    ]
  }
]);
```

---

## 4) Placeholder Sayfalar (Şimdilik)
**`src/pages/CouponsPage.jsx`**
```jsx
import React from 'react';
export default function CouponsPage(){
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Coupons</h1>
      <div className="card p-4">Coming soon… (CRUD + activate/deactivate)</div>
    </div>
  );
}
```

**`src/pages/ReturnsPage.jsx`**
```jsx
import React from 'react';
export default function ReturnsPage(){
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Returns</h1>
      <div className="card p-4">Coming soon… (RMA list/detail/decision)</div>
    </div>
  );
}
```

**`src/pages/ReportsPage.jsx`**
```jsx
import React from 'react';
export default function ReportsPage(){
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <div className="card p-4">Coming soon… (Sales/Top Products, charts)</div>
    </div>
  );
}
```

---

## 5) Kullanım
- Geliştirme: `npm run dev`  
- Navbar’dan **Orders / Inventory** sayfalarına geçiş yapabilirsin; diğerleri **placeholder** olarak çalışır.  
- İstersen menüye **tema switcher** veya kullanıcı menüsü ekleyebilirim.

