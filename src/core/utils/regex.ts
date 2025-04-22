// 📌 Direkt router metotları: router.get("/example")
export const directRouteRegex = /router\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g;

// 📌 Zincirli route metotları: router.route("/example").get().put()
export const chainedRouteRegex = /router\.route\(["'`]([^"'`]+)["'`]\)((?:\.\w+\([^)]*\))+)/g;

// Mevcut validasyon regex'lerin:
export const onlyLetters = /^[A-Za-zÄäÖöÜüßÇçĞğİıŞş\s]+$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^(\+49|0)[1-9][0-9\s\-]{7,14}$/;
export const zipCodeRegex = /^\d{5}$/;
export const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
export const urlRegex = /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
export const nameRegex = /^[A-Za-zÄäÖöÜüßÇçĞğİıŞş\s]+$/;
