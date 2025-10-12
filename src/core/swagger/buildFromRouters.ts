import { generateSwaggerFromRouters } from "@/core/swagger/generateSwaggerFromRouters";

(async () => {
  await generateSwaggerFromRouters(true); // swagger.json yaz
})();
