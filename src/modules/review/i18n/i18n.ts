const tr = {
  created: "Yorum oluşturuldu.",
  updated: "Yorum güncellendi.",
  deleted: "Yorum silindi.",
  fetched: "Yorum getirildi.",
  listFetched: "Yorumlar listelendi.",
  statusChanged: "Yorum durumu güncellendi.",
  notFound: "Kayıt bulunamadı.",
  conflict: "Bu ürün için zaten bir yorumunuz var.",
  reaction: {
    liked: "Beğeni eklendi.",
    disliked: "Beğenmedim eklendi.",
  },
  validation: {
    invalidObjectId: "Geçersiz nesne kimliği.",
    productRequired: "product alanı zorunludur.",
    ratingRange: "rating değeri 1 ile 5 arasında olmalıdır.",
    authRequired: "Bu işlem için giriş yapmalısınız.",
  },
};

const en = {
  created: "Review created.",
  updated: "Review updated.",
  deleted: "Review deleted.",
  fetched: "Review fetched.",
  listFetched: "Reviews listed.",
  statusChanged: "Review status updated.",
  notFound: "Record not found.",
  conflict: "You already have a review for this product.",
  reaction: {
    liked: "Like added.",
    disliked: "Dislike added.",
  },
  validation: {
    invalidObjectId: "Invalid object id.",
    productRequired: "product is required.",
    ratingRange: "rating must be between 1 and 5.",
    authRequired: "Authentication required.",
  },
};

const de = {
  created: "Bewertung erstellt.",
  updated: "Bewertung aktualisiert.",
  deleted: "Bewertung gelöscht.",
  fetched: "Bewertung abgerufen.",
  listFetched: "Bewertungen aufgelistet.",
  statusChanged: "Bewertungsstatus aktualisiert.",
  notFound: "Eintrag nicht gefunden.",
  conflict: "Sie haben bereits eine Bewertung für dieses Produkt.",
  reaction: {
    liked: "Gefällt mir hinzugefügt.",
    disliked: "Gefällt mir nicht hinzugefügt.",
  },
  validation: {
    invalidObjectId: "Ungültige Objekt-ID.",
    productRequired: "product ist erforderlich.",
    ratingRange: "rating muss zwischen 1 und 5 liegen.",
    authRequired: "Anmeldung erforderlich.",
  },
};

export default { tr, en, de };
