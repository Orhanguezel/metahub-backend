const tr = {
  created: "Varyant oluşturuldu.",
  updated: "Varyant güncellendi.",
  deleted: "Varyant silindi.",
  fetched: "Varyant getirildi.",
  listFetched: "Varyantlar listelendi.",
  notFound: "Varyant bulunamadı.",
  alreadyExistsSku: "Bu SKU ile bir varyant zaten var.",
  alreadyExistsOptions: "Bu ürün için aynı seçeneklere sahip varyant zaten var.",
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    productRequired: "Ürün zorunludur.",
    skuRequired: "SKU zorunludur.",
    skuInvalid: "SKU sadece harf, sayı, tire ve alt çizgi içermelidir.",
    currencyInvalid: "Para birimi metin olmalı.",
    priceInvalid: "Fiyat (kuruş) 0 veya üzeri olmalıdır.",
    stockInvalid: "Stok 0 veya üzeri olmalıdır.",
    optionsInvalid: "Seçenekler geçersiz (object olmalı).",
  },
};

const en = {
  created: "Variant created.",
  updated: "Variant updated.",
  deleted: "Variant deleted.",
  fetched: "Variant fetched.",
  listFetched: "Variants listed.",
  notFound: "Variant not found.",
  alreadyExistsSku: "A variant with the same SKU already exists.",
  alreadyExistsOptions: "Variant with the same options already exists for this product.",
  validation: {
    invalidObjectId: "Invalid object id.",
    productRequired: "Product is required.",
    skuRequired: "SKU is required.",
    skuInvalid: "SKU may contain only letters, numbers, dashes and underscores.",
    currencyInvalid: "Currency must be a string.",
    priceInvalid: "Price (in cents) must be >= 0.",
    stockInvalid: "Stock must be >= 0.",
    optionsInvalid: "Options must be an object.",
  },
};

const de = {
  created: "Variante erstellt.",
  updated: "Variante aktualisiert.",
  deleted: "Variante gelöscht.",
  fetched: "Variante abgerufen.",
  listFetched: "Varianten aufgelistet.",
  notFound: "Variante nicht gefunden.",
  alreadyExistsSku: "Eine Variante mit derselben SKU existiert bereits.",
  alreadyExistsOptions: "Für dieses Produkt existiert bereits eine Variante mit denselben Optionen.",
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    productRequired: "Produkt ist erforderlich.",
    skuRequired: "SKU ist erforderlich.",
    skuInvalid: "SKU darf nur Buchstaben, Zahlen, Bindestrich und Unterstrich enthalten.",
    currencyInvalid: "Währung muss eine Zeichenfolge sein.",
    priceInvalid: "Preis (in Cent) muss ≥ 0 sein.",
    stockInvalid: "Bestand muss ≥ 0 sein.",
    optionsInvalid: "Optionen müssen ein Objekt sein.",
  },
};

export default { tr, en, de };
