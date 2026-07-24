export const PERMISSIONS = {
  auditRead: "audit.read",
  customersCreate: "customers.create",
  customersDelete: "customers.delete",
  customersRead: "customers.read",
  customersUpdate: "customers.update",
  permissionsManage: "permissions.manage",
  receptionAppointmentsCancel: "reception.appointments.cancel",
  receptionAppointmentsRead: "reception.appointments.read",
  receptionAppointmentsWrite: "reception.appointments.write",
  rolesManage: "roles.manage",
  stockAdjustmentsCreate: "stock.adjustments.create",
  stockCatalogRead: "stock.catalog.read",
  stockCatalogWrite: "stock.catalog.write",
  stockExitsCreate: "stock.exits.create",
  stockMovementsRead: "stock.movements.read",
  stockPurchasesCreate: "stock.purchases.create",
  stockReservationsCancel: "stock.reservations.cancel",
  stockReservationsCreate: "stock.reservations.create",
  stockSuppliersWrite: "stock.suppliers.write",
  tenantSettingsRead: "tenant.settings.read",
  tenantSettingsUpdate: "tenant.settings.update",
  usersCreate: "users.create",
  usersCreateAdmin: "users.createAdmin",
  usersDeactivate: "users.deactivate",
  usersRead: "users.read",
  usersUpdate: "users.update",
  vehiclesCreate: "vehicles.create",
  vehiclesDelete: "vehicles.delete",
  vehiclesRead: "vehicles.read",
  vehiclesUpdate: "vehicles.update",
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
  PERMISSIONS.customersRead,
  PERMISSIONS.customersCreate,
  PERMISSIONS.customersUpdate,
  PERMISSIONS.customersDelete,
  PERMISSIONS.vehiclesRead,
  PERMISSIONS.vehiclesCreate,
  PERMISSIONS.vehiclesUpdate,
  PERMISSIONS.vehiclesDelete,
  PERMISSIONS.stockCatalogRead,
  PERMISSIONS.stockCatalogWrite,
  PERMISSIONS.stockSuppliersWrite,
  PERMISSIONS.stockPurchasesCreate,
  PERMISSIONS.stockMovementsRead,
  PERMISSIONS.stockExitsCreate,
  PERMISSIONS.stockAdjustmentsCreate,
  PERMISSIONS.stockReservationsCreate,
  PERMISSIONS.stockReservationsCancel,
  PERMISSIONS.receptionAppointmentsRead,
  PERMISSIONS.receptionAppointmentsWrite,
  PERMISSIONS.receptionAppointmentsCancel,
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
  [PERMISSIONS.customersRead]: {
    description: "Permite consultar clientes, buscas e historico basico no tenant autenticado.",
    name: "Listar clientes",
  },
  [PERMISSIONS.customersCreate]: {
    description: "Permite criar clientes no tenant autenticado.",
    name: "Criar clientes",
  },
  [PERMISSIONS.customersUpdate]: {
    description: "Permite editar clientes e seus vinculos operacionais no tenant autenticado.",
    name: "Atualizar clientes",
  },
  [PERMISSIONS.customersDelete]: {
    description: "Permite excluir logicamente clientes no tenant autenticado.",
    name: "Excluir clientes",
  },
  [PERMISSIONS.vehiclesRead]: {
    description: "Permite consultar veiculos, buscas e historico basico no tenant autenticado.",
    name: "Listar veiculos",
  },
  [PERMISSIONS.vehiclesCreate]: {
    description: "Permite criar veiculos e vincula-los a clientes do tenant autenticado.",
    name: "Criar veiculos",
  },
  [PERMISSIONS.vehiclesUpdate]: {
    description: "Permite editar veiculos e trocar seu cliente atual no tenant autenticado.",
    name: "Atualizar veiculos",
  },
  [PERMISSIONS.vehiclesDelete]: {
    description: "Permite excluir logicamente veiculos no tenant autenticado.",
    name: "Excluir veiculos",
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
  [PERMISSIONS.stockCatalogRead]: {
    description:
      "Permite consultar servicos, categorias, produtos, fornecedores e saldos do tenant autenticado.",
    name: "Ler catalogo de estoque",
  },
  [PERMISSIONS.stockCatalogWrite]: {
    description:
      "Permite criar, editar e desativar servicos, categorias e produtos no tenant autenticado.",
    name: "Gerenciar catalogo de estoque",
  },
  [PERMISSIONS.stockSuppliersWrite]: {
    description: "Permite criar, editar e desativar fornecedores no tenant autenticado.",
    name: "Gerenciar fornecedores",
  },
  [PERMISSIONS.stockPurchasesCreate]: {
    description: "Permite registrar compras com itens e entrada transacional de estoque.",
    name: "Registrar compras",
  },
  [PERMISSIONS.stockMovementsRead]: {
    description: "Permite consultar historico de movimentacoes de estoque do tenant autenticado.",
    name: "Ler movimentacoes de estoque",
  },
  [PERMISSIONS.stockExitsCreate]: {
    description: "Permite registrar saidas de estoque com origem rastreavel.",
    name: "Registrar saidas de estoque",
  },
  [PERMISSIONS.stockAdjustmentsCreate]: {
    description: "Permite registrar ajustes de estoque com motivo operacional e auditoria.",
    name: "Registrar ajustes de estoque",
  },
  [PERMISSIONS.stockReservationsCreate]: {
    description: "Permite reservar pecas sem alterar o saldo fisico do estoque.",
    name: "Reservar pecas",
  },
  [PERMISSIONS.stockReservationsCancel]: {
    description: "Permite cancelar reservas de pecas e restaurar disponibilidade operacional.",
    name: "Cancelar reservas de pecas",
  },
  [PERMISSIONS.receptionAppointmentsRead]: {
    description: "Permite consultar agenda diaria e semanal do tenant autenticado.",
    name: "Ler agenda",
  },
  [PERMISSIONS.receptionAppointmentsWrite]: {
    description: "Permite criar e editar agendamentos vinculados a clientes e veiculos do tenant.",
    name: "Gerenciar agendamentos",
  },
  [PERMISSIONS.receptionAppointmentsCancel]: {
    description: "Permite cancelar agendamentos com rastreabilidade operacional.",
    name: "Cancelar agendamentos",
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
