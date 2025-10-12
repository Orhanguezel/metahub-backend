const tr = {
  created: "Ücret kuralı oluşturuldu.",
  updated: "Ücret kuralı güncellendi.",
  deleted: "Ücret kuralı silindi.",
  fetched: "Ücret kuralı getirildi.",
  listFetched: "Ücret kuralları listelendi.",
  notFound: "Ücret kuralı bulunamadı.",
  alreadyExists: "Aynı kod ile bir ücret kuralı zaten mevcut.",
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    codeInvalid: "Kod yalnızca a-z, 0-9 ve alt çizgi içermelidir.",
    nameInvalid: "İsim (i18n) nesnesi geçersiz.",
    currencyInvalid: "Para birimi metin olmalıdır.",
    modeInvalid: "Geçersiz ücret modu.",
    amountRequired: "Sabit ücret için amount (kuruş) zorunludur.",
    percentRequired: "Yüzdesel ücret için percent (0..1) zorunludur.",
    percentRange: "percent alanı 0 ile 1 arasında olmalıdır.",
    appliesInvalid: "appliesWhen geçersiz.",
  },
};

const en = {
  created: "Fee rule created.",
  updated: "Fee rule updated.",
  deleted: "Fee rule deleted.",
  fetched: "Fee rule fetched.",
  listFetched: "Fee rules listed.",
  notFound: "Fee rule not found.",
  alreadyExists: "A fee rule with the same code already exists.",
  validation: {
    invalidObjectId: "Invalid object id.",
    codeInvalid: "Code must contain only a-z, 0-9 and underscore.",
    nameInvalid: "Invalid localized name object.",
    currencyInvalid: "Currency must be a string.",
    modeInvalid: "Invalid fee mode.",
    amountRequired: "Fixed mode requires amount (in cents).",
    percentRequired: "Percent mode requires percent (0..1).",
    percentRange: "percent must be between 0 and 1.",
    appliesInvalid: "Invalid appliesWhen array.",
  },
};

const de = {
  created: "Gebührenregel erstellt.",
  updated: "Gebührenregel aktualisiert.",
  deleted: "Gebührenregel gelöscht.",
  fetched: "Gebührenregel abgerufen.",
  listFetched: "Gebührenregeln aufgelistet.",
  notFound: "Gebührenregel nicht gefunden.",
  alreadyExists: "Eine Gebührenregel mit demselben Code existiert bereits.",
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    codeInvalid: "Code darf nur a-z, 0-9 und Unterstrich enthalten.",
    nameInvalid: "Ungültiges lokales Namensobjekt.",
    currencyInvalid: "Währung muss eine Zeichenfolge sein.",
    modeInvalid: "Ungültiger Gebührenmodus.",
    amountRequired: "Für 'fixed' ist amount (in Cent) erforderlich.",
    percentRequired: "Für 'percent' ist percent (0..1) erforderlich.",
    percentRange: "percent muss zwischen 0 und 1 liegen.",
    appliesInvalid: "Ungültiges appliesWhen-Array.",
  },
};

export default { tr, en, de };
