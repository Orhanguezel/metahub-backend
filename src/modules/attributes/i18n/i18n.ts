const tr = {
  created: "Öznitelik oluşturuldu.",
  updated: "Öznitelik güncellendi.",
  deleted: "Öznitelik silindi.",
  fetched: "Öznitelik getirildi.",
  listFetched: "Öznitelik listesi getirildi.",
  notFound: "Öznitelik bulunamadı.",
  alreadyExists: "Aynı kod ile öznitelik zaten mevcut.",
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    codeInvalid: "Kod yalnızca A-Z, 0-9 ve alt çizgi içermelidir.",
    nameInvalid: "İsim (i18n) nesnesi geçersiz.",
    typeInvalid: "Geçersiz öznitelik tipi.",
    valuesInvalid: "Değerler dizisi geçersiz.",
    valueItemInvalid: "Değer öğesi geçersiz.",
    valueCodeInvalid: "Değer kodu yalnızca A-Z, 0-9 ve alt çizgi içermelidir.",
    hexInvalid: "Geçersiz HEX renk değeri.",
  },
};

const en = {
  created: "Attribute created.",
  updated: "Attribute updated.",
  deleted: "Attribute deleted.",
  fetched: "Attribute fetched.",
  listFetched: "Attribute list fetched.",
  notFound: "Attribute not found.",
  alreadyExists: "An attribute with the same code already exists.",
  validation: {
    invalidObjectId: "Invalid object id.",
    codeInvalid: "Code must contain only A-Z, 0-9 and underscore.",
    nameInvalid: "Invalid localized name object.",
    typeInvalid: "Invalid attribute type.",
    valuesInvalid: "Invalid values array.",
    valueItemInvalid: "Invalid value item.",
    valueCodeInvalid: "Value code must contain only A-Z, 0-9 and underscore.",
    hexInvalid: "Invalid HEX color code.",
  },
};

const de = {
  created: "Attribut erstellt.",
  updated: "Attribut aktualisiert.",
  deleted: "Attribut gelöscht.",
  fetched: "Attribut abgerufen.",
  listFetched: "Attributliste abgerufen.",
  notFound: "Attribut nicht gefunden.",
  alreadyExists: "Ein Attribut mit demselben Code existiert bereits.",
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    codeInvalid: "Code darf nur A-Z, 0-9 und Unterstrich enthalten.",
    nameInvalid: "Ungültiges lokalisiertes Namensobjekt.",
    typeInvalid: "Ungültiger Attributtyp.",
    valuesInvalid: "Ungültiges Werte-Array.",
    valueItemInvalid: "Ungültiges Werte-Element.",
    valueCodeInvalid: "Wertcode darf nur A-Z, 0-9 und Unterstrich enthalten.",
    hexInvalid: "Ungültiger HEX-Farbcode.",
  },
};

export default { tr, en, de };
