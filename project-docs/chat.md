# 💬 Ensotek Chat Modülü – Detaylı Dökümantasyon

Bu modül, **Next.js + Express + MongoDB** altyapısıyla geliştirilen Ensotek projesine özel, **canlı destek** ve **OpenAI bot** destekli gerçek zamanlı bir chat sistemidir. Admin ve kullanıcı arasında mesajlaşma, yapay zekâ ile otomatik cevaplar, çok dilli destek ve yönetim paneli özellikleriyle donatılmıştır.

---

## 📦 Özellikler

| Özellik                         | Açıklama |
|--------------------------------|----------|
| ✅ OpenAI Chatbot              | Kullanıcı mesajlarına GPT-3.5-turbo modeliyle otomatik, çok dilli cevap |
| ✅ Canlı Destek Yönlendirme    | Belirli anahtar kelimelerle admin’e yönlendirme |
| ✅ Admin Paneli                | Oturum bazlı mesaj görüntüleme, mesaj silme, yanıt yazma |
| ✅ Çok Dilli Destek            | Almanca (varsayılan), Türkçe ve İngilizce destekli |
| ✅ `isRead` Takibi             | Okunan / okunmayan mesajlar kontrolü |
| ✅ Online Kullanıcı Takibi     | Socket üzerinden aktif kullanıcılar listesi |
| ✅ Rol Bazlı Yetkilendirme     | Kullanıcı ve admin işlemleri ayrılmıştır |

---

## ⚙️ Backend Teknolojileri

- **Express.js** (REST API + WebSocket)
- **Socket.IO** (Gerçek zamanlı mesajlaşma)
- **Mongoose** (MongoDB ODM)
- **OpenAI API** (Chatbot cevapları)
- **JWT + HTTP-only Cookie** (Kimlik doğrulama)
- **TypeScript** (Güçlü tip sistemi)

---

## 📃️ Veri Modeli – `chatMessage.model.ts`

```ts
{
  sender: ObjectId | null,      // null ise bot mesajı
  roomId: string,
  message: string,
  isFromBot: boolean,
  isFromAdmin: boolean,
  isRead: boolean,
  lang: "tr" | "en" | "de",
  createdAt, updatedAt
}
```

---

## 🔌 Socket.IO Olayları

| Event               | Payload                          | Açıklama |
|---------------------|----------------------------------|----------|
| `room-assigned`     | `roomId: string`                 | Kullanıcıya backend tarafından odası bildirildi |
| `chat-message`      | `{ room, message, lang? }`       | Mesaj gönderimi (admin/kullanıcı) |
| `bot-message`       | Bot cevabı emit edilir           | |
| `escalate-to-admin` | Canlı destek tetikleme olayı     | |
| `online-users`      | `[userId, roomId][]`             | Tüm aktif kullanıcılar |

---

## 💡 Bot & Canlı Destek Sistemi

### OpenAI Prompt Sistemi:
Dil desteğine göre OpenAI sistem mesajı gönderilir:

```ts
const systemPromptMap = {
  tr: "Kullanıcıyla Türkçe konuş. Yardımcı bir destek asistanı gibi davran.",
  en: "Speak with the user in English. Act like a helpful support assistant.",
  de: "Sprich mit dem Benutzer auf Deutsch. Verhalte dich wie ein hilfreicher Kundendienstassistent.",
};
```

### Canlı Destek Yönlendirme:
Mesaj şu kelimeleri içerirse:
```ts
["canlı destek", "temsilci", "insan", "yetkili", "müşteri hizmetleri"]
```
→ `escalate-to-admin` event’i emit edilir.

---

## 👨‍💼 REST API Endpointleri

### 📥 Kullanıcı

| Method | Endpoint              | Açıklama                       |
|--------|-----------------------|--------------------------------|
| GET    | `/chat/:roomId`       | Belirli odadaki tüm mesajlar   |

### 🧑‍💼 Admin

| Method | Endpoint              | Açıklama                         |
|--------|-----------------------|----------------------------------|
| GET    | `/chat`               | Tüm odaların son mesajları       |
| PATCH  | `/chat/read/:roomId`  | Odaya ait mesajları okundu yapar |
| DELETE | `/chat/:id`           | Tek mesaj siler                  |
| POST   | `/chat/bulk`          | Çoklu mesaj silme               |
| POST   | `/chat/manual`        | Admin manuel mesaj gönderir     |

---

## 💻 Frontend Entegrasyonu

> Kullanıcıların ya da adminin frontend tarafında bu yapıyı kullanabilmesi için aşağıdaki örnek kullanımlar yapılabilir.

### ✅ Kullanıcının Mesaj Göndermesi
```ts
socket.emit("chat-message", {
  room: "session-id-xyz",
  message: "Merhaba, ürün hakkında bilgi alabilir miyim?",
  lang: "tr"
});
```

### ✅ Bot Cevabını Alma
```ts
socket.on("bot-message", (data) => {
  console.log("BOT:", data.message);
});
```

### ✅ Admin Yönlendirme Bildirimi
```ts
socket.on("escalate-to-admin", (data) => {
  // Admin panelde göster
});
```

### ✅ Admin Mesaj Göndermesi
```ts
socket.emit("admin-message", {
  room: "session-id-xyz",
  message: "Merhaba, size nasıl yardımcı olabilirim?"
});
```

### ✅ Online Kullanıcıları Göster
```ts
socket.on("online-users", (userList) => {
  // userList: [ [userId, roomId], ... ]
});
```

---

## 🔐 Yetkilendirme

- Kullanıcılar `accessToken` içeren HTTP-only cookie ile bağlanır
- Tüm socket bağlantılarında `jwt.verify` ile kullanıcı doğrulaması yapılır
- Admin işlemleri için `authorizeRoles("admin")` kontrolü zorunludur

---

## 🥮 Test / Geliştirme

- Postman test dosyası hazırlanabilir (socket kısmı hariç)
- Admin panelde aktif oturum listesi yapılabilir
- Okunmamış mesajlar için UI badge sistemi kurulabilir

---

## 📌 Geliştirilebilecek Özellikler

- 🔁 Son mesajda "okundu" bildirimi (seen)
- 🔔 E-posta / bildirim sistemi ile uyarı
- 📎 Dosya gönderme (image, PDF)
- 🔍 Admin panelde filtreleme/sıralama
- ⏱️ Chat geçmişini PDF olarak dışa aktarma

---

## 📜 Ortam Değişkenleri

`.env` dosyasında aşağıdaki tanımlar yer almalı:

```env
OPENAI_API_KEY=sk-...
JWT_SECRET=ensotekSuperSecret
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

---

Bu modül, Ensotek projesinin modern müşteri destek altyapısını oluşturur. Tam entegre frontend için hazır bir yapıdadır 🚀

