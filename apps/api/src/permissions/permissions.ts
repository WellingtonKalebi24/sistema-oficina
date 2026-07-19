export const PERMISSIONS = {
  auditRead: "audit.read",
  permissionsManage: "permissions.manage",
  rolesManage: "roles.manage",
  tenantSettingsRead: "tenant.settings.read",
  tenantSettingsUpdate: "tenant.settings.update",
  usersCreate: "users.create",
  usersCreateAdmin: "users.createAdmin",
  usersDeactivate: "users.deactivate",
  usersRead: "users.read",
  usersUpdate: "users.update",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.tenantSettingsRead,
  PERMISSIONS.tenantSettingsUpdate,
  PERMISSIONS.usersRead,
  PERMISSIONS.usersCreate,
  PERMISSIONS.usersUpdate,
  PERMISSIONS.usersDeactivate,
  PERMISSIONS.usersCreateAdmin,
  PERMISSIONS.rolesManage,
  PERMISSIONS.permissionsManage,
  PERMISSIONS.auditRead,
];

export const ADMIN_LEVEL_PERMISSIONS = new Set<PermissionKey>([
  PERMISSIONS.usersCreateAdmin,
  PERMISSIONS.rolesManage,
  PERMISSIONS.permissionsManage,
  PERMISSIONS.auditRead,
]);

export const PERMISSION_DETAILS: Record<PermissionKey, { description: string; name: string }> = {
  [PERMISSIONS.tenantSettingsRead]: {
    description: "Permite consultar configuracoes do tenant autenticado.",
    name: "Ler configuracoes da oficina",
  },
  [PERMISSIONS.tenantSettingsUpdate]: {
    description: "Permite alterar configuracoes administrativas do tenant autenticado.",
    name: "Atualizar configuracoes da oficina",
  },
  [PERMISSIONS.usersRead]: {
    description: "Permite consultar usuarios do tenant autenticado.",
    name: "Listar usuarios",
  },
  [PERMISSIONS.usersCreate]: {
    description: "Permite criar usuarios comuns no tenant autenticado.",
    name: "Criar usuarios",
  },
  [PERMISSIONS.usersUpdate]: {
    description: "Permite editar dados e papeis de usuarios do tenant autenticado.",
    name: "Atualizar usuarios",
  },
  [PERMISSIONS.usersDeactivate]: {
    description: "Permite desativar usuarios do tenant autenticado.",
    name: "Desativar usuarios",
  },
  [PERMISSIONS.usersCreateAdmin]: {
    description: "Permite criar ou conceder permissoes administrativas.",
    name: "Criar administradores",
  },
  [PERMISSIONS.rolesManage]: {
    description: "Permite criar e ajustar papeis do tenant autenticado.",
    name: "Gerenciar papeis",
  },
  [PERMISSIONS.permissionsManage]: {
    description: "Permite conceder permissoes e overrides especificos por usuario.",
    name: "Gerenciar permissoes",
  },
  [PERMISSIONS.auditRead]: {
    description: "Permite consultar eventos de auditoria do tenant autenticado.",
    name: "Ler auditoria",
  },
};

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export function hasAdminLevelPermission(permissionKeys: Iterable<string>): boolean {
  for (const permissionKey of permissionKeys) {
    if (isPermissionKey(permissionKey) && ADMIN_LEVEL_PERMISSIONS.has(permissionKey)) {
      return true;
    }
  }

  return false;
}
