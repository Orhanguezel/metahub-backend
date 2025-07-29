// src/core/utils/addressFieldsByCountry.ts

type AddressField = {
  name: string;
  label: string;
  required: boolean;
};

type CountryCode = "TR" | "DE" | "EN" | "FR" | "ES" | "PL";

export const ADDRESS_FIELDS_BY_COUNTRY: Record<CountryCode, AddressField[]> = {
  TR: [
    { name: "addressLine", label: "Adres (Tek Satır)", required: true },
    { name: "city", label: "İl", required: true },
    { name: "district", label: "İlçe", required: true },
    { name: "province", label: "Bölge", required: false },
    { name: "postalCode", label: "Posta Kodu", required: true },
    { name: "phone", label: "Telefon", required: false },
  ],
  DE: [
    { name: "street", label: "Straße", required: true },
    { name: "houseNumber", label: "Hausnummer", required: true },
    { name: "postalCode", label: "PLZ", required: true },
    { name: "city", label: "Stadt", required: true },
    { name: "province", label: "Bundesland", required: false },
    { name: "addressLine", label: "Vollständige Adresse", required: false },
    { name: "phone", label: "Telefon", required: false },
  ],
  EN: [
    { name: "addressLine", label: "Full Address", required: true },
    { name: "street", label: "Street", required: false },
    { name: "houseNumber", label: "House Number", required: false },
    { name: "city", label: "City", required: true },
    { name: "postalCode", label: "Postal Code", required: true },
    { name: "province", label: "State/Province", required: false },
    { name: "phone", label: "Phone", required: false },
  ],
  FR: [
    { name: "addressLine", label: "Adresse Complète", required: true },
    { name: "street", label: "Rue", required: false },
    { name: "houseNumber", label: "Numéro", required: false },
    { name: "city", label: "Ville", required: true },
    { name: "postalCode", label: "Code Postal", required: true },
    { name: "province", label: "Département/Région", required: false },
    { name: "phone", label: "Téléphone", required: false },
  ],
  ES: [
    { name: "addressLine", label: "Dirección Completa", required: true },
    { name: "street", label: "Calle", required: false },
    { name: "houseNumber", label: "Número", required: false },
    { name: "city", label: "Ciudad", required: true },
    { name: "postalCode", label: "Código Postal", required: true },
    { name: "province", label: "Provincia", required: false },
    { name: "phone", label: "Teléfono", required: false },
  ],
  PL: [
    { name: "addressLine", label: "Pełny Adres", required: true },
    { name: "street", label: "Ulica", required: false },
    { name: "houseNumber", label: "Numer Domu", required: false },
    { name: "city", label: "Miasto", required: true },
    { name: "postalCode", label: "Kod Pocztowy", required: true },
    { name: "province", label: "Województwo", required: false },
    { name: "phone", label: "Telefon", required: false },
  ],
};
