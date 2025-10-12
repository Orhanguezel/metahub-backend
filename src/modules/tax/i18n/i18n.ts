const tr = {
  created: "Vergi oranı oluşturuldu.",
  updated: "Vergi oranı güncellendi.",
  deleted: "Vergi oranı silindi.",
  fetched: "Vergi oranı getirildi.",
  listFetched: "Vergi oranları listelendi.",
  notFound: "Kayıt bulunamadı.",
  zone: {
    created: "Coğrafi bölge oluşturuldu.",
    updated: "Coğrafi bölge güncellendi.",
    deleted: "Coğrafi bölge silindi.",
    fetched: "Coğrafi bölge getirildi.",
    listFetched: "Coğrafi bölgeler listelendi.",
  },
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    name: "İsim zorunludur.",
    rate: "Oran 0 ile 1 arasında olmalıdır.",
    dates: "Geçersiz tarih.",
  },
  resolved: "Uygulanabilir vergi oranı çözümlendi.",
  calcOk: "Vergi hesaplandı.",
};

const en = {
  created: "Tax rate created.",
  updated: "Tax rate updated.",
  deleted: "Tax rate deleted.",
  fetched: "Tax rate fetched.",
  listFetched: "Tax rates listed.",
  notFound: "Record not found.",
  zone: {
    created: "Geo zone created.",
    updated: "Geo zone updated.",
    deleted: "Geo zone deleted.",
    fetched: "Geo zone fetched.",
    listFetched: "Geo zones listed.",
  },
  validation: {
    invalidObjectId: "Invalid object id.",
    name: "Name is required.",
    rate: "Rate must be between 0 and 1.",
    dates: "Invalid date.",
  },
  resolved: "Applicable tax rate resolved.",
  calcOk: "Tax calculated.",
};

const de = {
  created: "Steuersatz erstellt.",
  updated: "Steuersatz aktualisiert.",
  deleted: "Steuersatz gelöscht.",
  fetched: "Steuersatz abgerufen.",
  listFetched: "Steuersätze aufgelistet.",
  notFound: "Datensatz nicht gefunden.",
  zone: {
    created: "Geozone erstellt.",
    updated: "Geozone aktualisiert.",
    deleted: "Geozone gelöscht.",
    fetched: "Geozone abgerufen.",
    listFetched: "Geozonen aufgelistet.",
  },
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    name: "Name ist erforderlich.",
    rate: "Satz muss zwischen 0 und 1 liegen.",
    dates: "Ungültiges Datum.",
  },
  resolved: "Anwendbarer Steuersatz ermittelt.",
  calcOk: "Steuer berechnet.",
};

export default { tr, en, de };
