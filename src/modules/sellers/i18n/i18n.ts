const translations = {
  "seller.success.fetched": {
    tr: "Satıcı(lar) başarıyla getirildi.",
    en: "Seller(s) fetched successfully.",
  },
  "seller.success.created": {
    tr: "Satıcı oluşturuldu.",
    en: "Seller created successfully.",
  },
  "seller.success.updated": {
    tr: "Satıcı güncellendi.",
    en: "Seller updated successfully.",
  },
  "seller.success.deleted": {
    tr: "Satıcı silindi.",
    en: "Seller deleted successfully.",
  },

  "seller.errors.notFound": {
    tr: "Satıcı bulunamadı.",
    en: "Seller not found.",
  },
  "seller.errors.requiredFields": {
    tr: "contactName, email ve phone zorunludur.",
    en: "contactName, email and phone are required.",
  },
  "seller.errors.emailExists": {
    tr: "Bu e-posta ile bir satıcı zaten mevcut.",
    en: "A seller with this email already exists.",
  },
  "seller.errors.phoneExists": {
    tr: "Bu telefon ile bir satıcı zaten mevcut.",
    en: "A seller with this phone already exists.",
  },
  "seller.errors.userLinked": {
    tr: "Bu kullanıcı başka bir satıcıya bağlı.",
    en: "This user is already linked to another seller.",
  },
  "seller.errors.unauthorized": {
    tr: "Yetkisiz işlem.",
    en: "Unauthorized.",
  },

  "seller.validation.invalidObjectId": {
    tr: "Geçersiz nesne kimliği.",
    en: "Invalid object id.",
  },
  "seller.validation.kindInvalid": {
    tr: "Geçersiz satıcı türü.",
    en: "Invalid seller kind.",
  },
  "seller.validation.invalidString": {
    tr: "Geçersiz metin alanı.",
    en: "Invalid string field.",
  },
  "seller.validation.invalidEmail": {
    tr: "Geçersiz e-posta.",
    en: "Invalid email.",
  },
  "seller.validation.booleanField": {
    tr: "Bu alan boolean olmalıdır.",
    en: "This field must be a boolean.",
  },
  "seller.validation.invalidBilling": {
    tr: "Geçersiz fatura/billing yapısı.",
    en: "Invalid billing object.",
  },
  "seller.validation.invalidCurrency": {
    tr: "Geçersiz para birimi.",
    en: "Invalid currency.",
  },
  "seller.validation.invalidPaymentTerm": {
    tr: "Geçersiz ödeme vadesi (0-365).",
    en: "Invalid payment term (0-365).",
  },
  "seller.validation.invalidDueDay": {
    tr: "Geçersiz son ödeme günü (1-28).",
    en: "Invalid due day (1-28).",
  },
  "seller.validation.addressesMustBeArray": {
    tr: "Adresler bir dizi olmalıdır.",
    en: "Addresses must be an array.",
  },
  "seller.validation.tagsMustBeArray": {
    tr: "Etiketler bir dizi olmalıdır ve string içermelidir.",
    en: "Tags must be an array of strings.",
  },
};

export default translations;
