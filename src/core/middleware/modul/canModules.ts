// Express middleware örneği
function canEditMeta(req, res, next) {
  if (req.user.role === "superadmin") return next();
  res.status(403).json({ message: "Only superadmin can modify meta" });
}

function canEditSettings(req, res, next) {
  if (req.user.role === "superadmin") return next();
  if (req.user.tenant === req.tenant) return next();
  res
    .status(403)
    .json({ message: "Not authorized for this tenant's settings" });
}

// Kullanım: router.patch("/modules/:name", canEditMeta, updateModuleMeta);
// veya router.patch("/settings/:module", canEditSettings, updateModuleSetting);
