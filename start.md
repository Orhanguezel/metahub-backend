rm -rf dist
npx tsc --noEmit
bun run build

bun run dev





# Temizlik için:
rm -rf dist
rm -rf build
rm -rf node_modules/.cache
npx tsc --noEmit
npm run build

bun run dev



npx ts-node -r tsconfig-paths/register src/scripts/sync/masterSync.ts


npx ts-node -r tsconfig-paths/register src/generateMeta.ts

npx ts-node -r tsconfig-paths/register src/scripts/section/masterSyncSections.ts


git fetch origin
git reset --hard origin/main



Alternatif olarak:
```sh
pm2 start server.js --name "my-app"
```
- Uygulamaya **my-app** adını verir.

---

## **📌 3. Çalışan Uygulamaları Listeleme**
```sh
pm2 list
```
- **Çalışan tüm process’leri gösterir.**

---

## **📌 4. Belirli Bir Uygulamayı Durdurma ve Silme**
```sh
pm2 stop metahub-backend     # Uygulamayı durdurur
pm2 restart my-app  # Uygulamayı yeniden başlatır
pm2 delete metahub-backend   # PM2’den kaldırır
```

ID kullanarak da işlem yapılabilir:
```sh
pm2 stop <id>
pm2 restart <id>
pm2 delete <id>
```

---

## **📌 5. PM2'yi Kalıcı Hale Getirme (Restart Sonrası Otomatik Çalıştırma)**
```sh
pm2 startup
```
- **PM2'yi sistem servisi olarak başlatır.**
- Sunucu **yeniden başlatıldığında uygulamalar otomatik olarak çalışır.**

---

## **📌 6. Logları Görüntüleme**
```sh
pm2 logs
```
- **Tüm uygulamaların loglarını gösterir.**

Belirli bir uygulamanın loglarını görmek için:
```sh
pm2 logs my-app
```

Logları temizlemek için:
```sh
pm2 flush
```
