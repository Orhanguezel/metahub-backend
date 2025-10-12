const tr = {
  created: "İstek listesi oluşturuldu.",
  updated: "İstek listesi güncellendi.",
  deleted: "İstek listesi silindi.",
  fetched: "İstek listesi getirildi.",
  listFetched: "İstek listeleri listelendi.",
  notFound: "Kayıt bulunamadı.",
  item: {
    added: "Ürün istek listesine eklendi.",
    exists: "Ürün zaten istek listesinde.",
    removed: "Ürün istek listesinden çıkarıldı.",
    cleared: "İstek listesi temizlendi.",
  },
  merged: "İstek listeleri birleştirildi.",
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    productRequired: "product alanı zorunludur.",
    ownerMissing: "Kullanıcı veya session bilgisi sağlanmalı.",
  },
};

const en = {
  created: "Wishlist created.",
  updated: "Wishlist updated.",
  deleted: "Wishlist deleted.",
  fetched: "Wishlist fetched.",
  listFetched: "Wishlists listed.",
  notFound: "Record not found.",
  item: {
    added: "Item added to wishlist.",
    exists: "Item already exists in wishlist.",
    removed: "Item removed from wishlist.",
    cleared: "Wishlist cleared.",
  },
  merged: "Wishlists merged.",
  validation: {
    invalidObjectId: "Invalid object id.",
    productRequired: "product is required.",
    ownerMissing: "User or session must be provided.",
  },
};

const de = {
  created: "Wunschliste erstellt.",
  updated: "Wunschliste aktualisiert.",
  deleted: "Wunschliste gelöscht.",
  fetched: "Wunschliste abgerufen.",
  listFetched: "Wunschlisten aufgelistet.",
  notFound: "Eintrag nicht gefunden.",
  item: {
    added: "Artikel zur Wunschliste hinzugefügt.",
    exists: "Artikel ist bereits in der Wunschliste.",
    removed: "Artikel aus der Wunschliste entfernt.",
    cleared: "Wunschliste geleert.",
  },
  merged: "Wunschlisten zusammengeführt.",
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    productRequired: "product ist erforderlich.",
    ownerMissing: "Benutzer oder Sitzung muss angegeben werden.",
  },
};

export default { tr, en, de };
