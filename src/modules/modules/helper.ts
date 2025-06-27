export function mergeModuleMetaAndSetting(meta, setting) {
  return {
    ...meta,
    ...setting,
    label: setting?.label || meta.label,
    icon: setting?.icon || meta.icon,
    enabled: setting?.enabled !== undefined ? setting.enabled : meta.enabled,
    roles: setting?.roles || meta.roles,
    order: setting?.order !== undefined ? setting.order : meta.order,
  };
}
