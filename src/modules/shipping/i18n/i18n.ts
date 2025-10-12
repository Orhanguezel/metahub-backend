// src/modules/shipping/i18n.ts
const tr = {
  common: {
    notFound: "Kayıt bulunamadı.",
    created: "Kayıt oluşturuldu.",
    updated: "Kayıt güncellendi.",
    deleted: "Kayıt silindi.",
    fetched: "Kayıt getirildi.",
    listFetched: "Liste getirildi.",
    invalidId: "Geçersiz kimlik.",
  },
  method: {
    invalidCalc: "Geçersiz hesaplama modu veya eksik alan(lar).",
    quoteComputed: "Kargo ücreti hesaplandı.",
  },
  shipment: {
    created: "Sevkiyat oluşturuldu.",
    updated: "Sevkiyat güncellendi.",
    deleted: "Sevkiyat silindi.",
    fetched: "Sevkiyat getirildi.",
    listFetched: "Sevkiyat listesi getirildi.",
    invalidTransition: "Geçersiz durum geçişi.",
  },
};

const en = {
  common: {
    notFound: "Record not found.",
    created: "Created.",
    updated: "Updated.",
    deleted: "Deleted.",
    fetched: "Fetched.",
    listFetched: "List fetched.",
    invalidId: "Invalid id.",
  },
  method: {
    invalidCalc: "Invalid calculation mode or missing fields.",
    quoteComputed: "Shipping quote computed.",
  },
  shipment: {
    created: "Shipment created.",
    updated: "Shipment updated.",
    deleted: "Shipment deleted.",
    fetched: "Shipment fetched.",
    listFetched: "Shipments fetched.",
    invalidTransition: "Invalid status transition.",
  },
};

export default { tr, en };
