// 📌 Sadece harflerden oluşan değerleri doğrulamak için (Almanca özel karakterler dahil)
export const onlyLetters = /^[A-Za-zÄäÖöÜüßÇçĞğİıŞş\s]+$/;

// 📌 E-posta adresi doğrulaması (standart)
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 📌 Telefon numarası (örn. Almanya için: +49... ya da 01...)
export const phoneRegex = /^(\+49|0)[1-9][0-9\s\-]{7,14}$/;

// 📌 Posta kodu (Almanya 5 haneli)
export const zipCodeRegex = /^\d{5}$/;

// 📌 Şifre için en az 8 karakter, harf ve rakam kombinasyonu
export const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

// 📌 URL kontrolü
export const urlRegex = /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;

// isim için regex
export const nameRegex = /^[A-Za-zÄäÖöÜüßÇçĞğİıŞş\s]+$/;
