// src/scripts/generateMeta/utils/constants.ts

export const DIRECT_ROUTE_REGEX =
  /router\.(get|post|put|delete|patch)\(["'`]([^"'`]+)["'`]/g;
export const CHAINED_ROUTE_REGEX =
  /router\.route\(["'`]([^"'`]+)["'`]\)([\s\S]*?)(?=router\.route|\n{2,}|$)/g;

/*
DIRECT_ROUTE_REGEX → router.get("/path") gibi satırları yakalar,
CHAINED_ROUTE_REGEX → router.route("/path").get().post() gibi zincirli olanları yakalar.
*/
