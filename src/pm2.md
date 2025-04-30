Harika! Kodları düzenlediysen şimdi PM2 sürecini yeniden başlatmak için şu adımları sırayla uygulayabilirsin:

---

### ✅ 1. Mevcut Süreci Durdur (Eğer açık ise):
```bash
pm2 stop metahup-backend
pm2 delete metahup-backend
```
bun run build
---

### ✅ 2. PM2 ile yeniden başlat:
```bash
pm2 start "bun run dist/server.js" --name metahup-backend
```

---

### ✅ 3. Değişiklikleri kaydet:
```bash
pm2 save
```

---

### ✅ 4. Durumu kontrol et:
```bash
pm2 list
pm2 logs metahup-backend
```

---

Her şey sorunsuz çalışırsa, artık `https://api.guezelwebdesign.com/api/demo/ping` gibi endpoint’leri test edebilirsin. Yardımcı olmamı istediğin başka bir şey var mı?