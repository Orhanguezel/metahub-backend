// src/core/utils/otp.ts
export const generateOtpCode = (length = 6) => {
  let code = "";
  for (let i = 0; i < length; i++) code += Math.floor(Math.random() * 10);
  return code;
};
