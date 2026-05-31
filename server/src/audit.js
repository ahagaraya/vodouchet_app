const { db } = require("./db");

function logAudit(user, action, entityType, entityId, details = null) {
  db.data.auditLog ||= [];
  const id = (db.data.auditLog.at(-1)?.id || 0) + 1;
  const entry = {
    id,
    user_id: user?.id ?? null,
    user_name: user?.fullName || user?.full_name || "system",
    role: user?.role || "system",
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString()
  };
  db.data.auditLog.push(entry);
  return entry;
}

function logPdAccess(adminUser, targetUserId, action) {
  db.data.pdAccessLog ||= [];
  const id = (db.data.pdAccessLog.at(-1)?.id || 0) + 1;
  const entry = {
    id,
    admin_user_id: adminUser.id,
    admin_name: adminUser.fullName || adminUser.full_name || "",
    target_user_id: Number(targetUserId),
    action,
    created_at: new Date().toISOString()
  };
  db.data.pdAccessLog.push(entry);
  return entry;
}

module.exports = { logAudit, logPdAccess };
