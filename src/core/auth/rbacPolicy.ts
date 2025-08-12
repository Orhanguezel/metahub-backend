// src/core/auth/rbacPolicy.ts
export type Action =
  | "read" | "create" | "update" | "delete" | "export"
  | "assign" | "reconcile" | "markPaid" | "send" | "run";

type ModuleKey =
  | "apartment" | "apartmentcategory" | "servicecatalog" | "contacts"
  | "contracts" | "billing" | "invoicing" | "payments" | "expenses"
  | "employees" | "operationstemplates" | "operationsjobs" | "scheduling"
  | "timetracking" | "reports" | "pricelist" | "cashbook" | "files";

type Policy = Partial<Record<ModuleKey, Action[]>>;

export const RBAC: Record<string, Policy> = {
  admin: { /* full */ 
    apartment: ["read","create","update","delete"],
    apartmentcategory: ["read","create","update","delete"],
    servicecatalog: ["read","create","update","delete"],
    contacts: ["read","create","update","delete"],
    contracts: ["read","create","update","delete"],
    billing: ["read","run"],
    invoicing: ["read","create","update","delete","send","markPaid","export"],
    payments: ["read","create","delete","export"],
    expenses: ["read","create","update","delete","export"],
    employees: ["read","create","update","delete"],
    operationstemplates: ["read","create","update","delete"],
    operationsjobs: ["read","create","update","delete","assign"],
    scheduling: ["read","run"],
    timetracking: ["read","create","update","delete"],
    reports: ["read","export"],
    pricelist: ["read","create","update","delete","export"],
    cashbook: ["read","create","update","delete","reconcile","export"],
    files: ["read","create","delete"],
  },
  moderator: {
    apartment: ["read","create","update"],
    apartmentcategory: ["read","create","update"],
    servicecatalog: ["read","create","update"],
    contacts: ["read","create","update"],
    files: ["read","create"],
    reports: ["read"],
  },
  ops: {
    operationstemplates: ["read","create","update"],
    operationsjobs: ["read","create","update","assign"],
    scheduling: ["read","run"],
    timetracking: ["read","create","update"],
    apartment: ["read"], servicecatalog: ["read"], contacts: ["read"],
    reports: ["read"],
  },
  finance: {
    invoicing: ["read","send","markPaid","export"],
    payments: ["read","create","export"],
    expenses: ["read","create","update","export"],
    cashbook: ["read","create","update","reconcile","export"],
    reports: ["read","export"],
    contracts: ["read"], billing: ["read"], pricelist: ["read"],
    files: ["read"],
  },
  guest: { reports: ["read"] },
};
