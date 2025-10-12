const tr = {
  created: "Karşılaştırma listesi oluşturuldu.",
  updated: "Karşılaştırma listesi güncellendi.",
  deleted: "Karşılaştırma listesi silindi.",
  fetched: "Karşılaştırma listesi getirildi.",
  listFetched: "Karşılaştırma listeleri listelendi.",
  notFound: "Kayıt bulunamadı.",
  item: {
    added: "Ürün karşılaştırma listesine eklendi.",
    exists: "Ürün zaten karşılaştırma listesinde.",
    removed: "Ürün karşılaştırma listesinden çıkarıldı.",
    cleared: "Karşılaştırma listesi temizlendi.",
    limitExceeded: "Maksimum öğe sayısına ulaşıldı; en eski öğe kaldırıldı.",
  },
  merged: "Karşılaştırma listeleri birleştirildi.",
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    productRequired: "product alanı zorunludur.",
    ownerMissing: "Kullanıcı veya session bilgisi sağlanmalı.",
  },
};

const en = {
  created: "Compare list created.",
  updated: "Compare list updated.",
  deleted: "Compare list deleted.",
  fetched: "Compare list fetched.",
  listFetched: "Compare lists listed.",
  notFound: "Record not found.",
  item: {
    added: "Item added to compare.",
    exists: "Item already exists in compare.",
    removed: "Item removed from compare.",
    cleared: "Compare list cleared.",
    limitExceeded: "Max items reached; oldest item was removed.",
  },
  merged: "Compare lists merged.",
  validation: {
    invalidObjectId: "Invalid object id.",
    productRequired: "product is required.",
    ownerMissing: "User or session must be provided.",
  },
};

const de = {
  created: "Vergleichsliste erstellt.",
  updated: "Vergleichsliste aktualisiert.",
  deleted: "Vergleichsliste gelöscht.",
  fetched: "Vergleichsliste abgerufen.",
  listFetched: "Vergleichslisten aufgelistet.",
  notFound: "Eintrag nicht gefunden.",
  item: {
    added: "Artikel zur Vergleichsliste hinzugefügt.",
    exists: "Artikel ist bereits in der Vergleichsliste.",
    removed: "Artikel aus der Vergleichsliste entfernt.",
    cleared: "Vergleichsliste geleert.",
    limitExceeded: "Maximale Anzahl erreicht; ältester Artikel entfernt.",
  },
  merged: "Vergleichslisten zusammengeführt.",
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    productRequired: "product ist erforderlich.",
    ownerMissing: "Benutzer oder Sitzung muss angegeben werden.",
  },
};

export default { tr, en, de };
