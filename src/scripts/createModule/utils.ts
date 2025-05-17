import path from "path";

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getPaths(moduleName: string) {
  const modulesPath = path.resolve(__dirname, "../../modules");
  const metaPath = path.resolve(__dirname, "../../meta-configs/ensotek", `${moduleName}.meta.json`);
  const modulePath = path.join(modulesPath, moduleName);

  return { modulesPath, metaPath, modulePath };
}
