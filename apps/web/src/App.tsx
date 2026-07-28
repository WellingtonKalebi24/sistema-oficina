import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faAddressBook,
  faBars,
  faBuilding,
  faCar,
  faCalendarDays,
  faChevronDown,
  faBoxesStacked,
  faFolderOpen,
  faKey,
  faRightFromBracket,
  faRotateRight,
  faShieldHalved,
  faUserShield,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router";

import {
  type AdminUser,
  type Permission,
  type PermissionOverride,
  type Role,
  type TenantSettings,
  createRole,
  createUser,
  getTenantSettings,
  listPermissions,
  listRoles,
  listUsers,
  replacePermissionOverrides,
  updateTenantSettings,
} from "./api/admin.js";
import {
  type Customer,
  type CustomerHistoryEvent,
  type CustomerInput,
  createCustomer,
  deleteCustomer,
  listCustomerHistory,
  listCustomers,
  updateCustomer,
} from "./api/customers.js";
import {
  ApiError,
  changePassword,
  completePasswordReset,
  createFirstAdmin,
  getBootstrapStatus,
  login,
  logout,
  requestPasswordReset,
  refreshSession,
} from "./api/auth.js";
import {
  type Vehicle,
  type VehicleHistoryEvent,
  type VehicleInput,
  createVehicle,
  deleteVehicle,
  listVehicleHistory,
  listVehicles,
  updateVehicle,
} from "./api/vehicles.js";
import {
  type Appointment,
  type AppointmentInput,
  type AttachmentCategory,
  type CheckIn,
  type CheckInAttachment,
  type CheckInInput,
  type CheckInUpdateInput,
  cancelAppointment as cancelReceptionAppointment,
  createCheckIn as createReceptionCheckIn,
  createAppointment as createReceptionAppointment,
  deleteCheckInAttachment as deleteReceptionCheckInAttachment,
  downloadCheckInAttachment as downloadReceptionCheckInAttachment,
  getCheckIn as getReceptionCheckIn,
  listCheckInAttachments as listReceptionCheckInAttachments,
  listCheckIns as listReceptionCheckIns,
  listAppointments as listReceptionAppointments,
  updateCheckIn as updateReceptionCheckIn,
  updateAppointment as updateReceptionAppointment,
  uploadCheckInAttachment as uploadReceptionCheckInAttachment,
} from "./api/reception.js";
import {
  type Product,
  type ProductCategory,
  type Purchase,
  type ServiceCatalogEntry,
  type StockMovement,
  type StockReservation,
  type Supplier,
  cancelReservation,
  createCategory as createStockCategory,
  createProduct as createStockProduct,
  createPurchase as createStockPurchase,
  createReservation as createStockReservation,
  createService as createStockService,
  createStockAdjustment,
  createStockExit,
  createSupplier as createStockSupplier,
  deactivateProduct as deactivateStockProduct,
  deactivateService as deactivateStockService,
  deactivateSupplier as deactivateStockSupplier,
  listCategories as listStockCategories,
  listMovements as listStockMovements,
  listProducts as listStockProducts,
  listReservations as listStockReservations,
  listServices as listStockServices,
  listSuppliers as listStockSuppliers,
  type ProductCategoryInput,
  type ProductInput,
  type PurchaseInput,
  type ServiceCatalogEntryInput,
  type StockAdjustmentInput,
  type StockExitInput,
  type StockReservationInput,
  type SupplierInput,
} from "./api/stock.js";
import {
  clearStoredSession,
  hasPermission,
  readStoredSession,
  storeSession,
  type StoredSession,
} from "./auth/session.js";
import { Button } from "./components/ui/button.js";
import { Card, CardContent, CardHeader } from "./components/ui/card.js";
import { Input } from "./components/ui/input.js";
import { Label } from "./components/ui/label.js";
import { formatCurrency, formatDateTime } from "./design/formatters.js";

type View =
  | "agenda"
  | "clientes"
  | "estoque"
  | "oficina"
  | "papeis"
  | "permissoes"
  | "seguranca"
  | "usuarios"
  | "veiculos";
type BootState = "loading" | "bootstrap" | "login" | "admin" | "error";

type AdminData = {
  customerHistory: CustomerHistoryEvent[];
  customers: Customer[];
  appointments: Appointment[];
  checkIns: CheckIn[];
  permissions: Permission[];
  productCategories: ProductCategory[];
  products: Product[];
  purchases: Purchase[];
  roles: Role[];
  services: ServiceCatalogEntry[];
  settings: TenantSettings | null;
  stockMovements: StockMovement[];
  stockReservations: StockReservation[];
  suppliers: Supplier[];
  users: AdminUser[];
  vehicleHistory: VehicleHistoryEvent[];
  vehicles: Vehicle[];
};

type BlockedState = Partial<
  Record<
    | "customers"
    | "permissions"
    | "reception"
    | "roles"
    | "settings"
    | "stock"
    | "users"
    | "vehicles",
    string
  >
>;

const initialAdminData: AdminData = {
  appointments: [],
  checkIns: [],
  customerHistory: [],
  customers: [],
  permissions: [],
  productCategories: [],
  products: [],
  purchases: [],
  roles: [],
  services: [],
  settings: null,
  stockMovements: [],
  stockReservations: [],
  suppliers: [],
  users: [],
  vehicleHistory: [],
  vehicles: [],
};

function RequiredMark() {
  return <span className="required-marker" aria-hidden="true" />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthAdminApp />
    </BrowserRouter>
  );
}

function AuthAdminApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bootState, setBootState] = useState<BootState>("loading");
  const [session, setSession] = useState<StoredSession | null>(() => readStoredSession());
  const [activeView, setActiveView] = useState<View>("oficina");
  const [adminData, setAdminData] = useState<AdminData>(initialAdminData);
  const [blocked, setBlocked] = useState<BlockedState>({});
  const [statusMessage, setStatusMessage] = useState("Sincronizando estado de acesso.");
  const isForgotPasswordRoute = location.pathname === "/forgot-password";

  useEffect(() => {
    let active = true;
    const initialStoredSession = readStoredSession();

    async function boot() {
      try {
        const status = await getBootstrapStatus();
        const startsOnForgotPasswordRoute = window.location.pathname === "/forgot-password";

        if (!active) {
          return;
        }

        if (!status.bootstrapped) {
          setBootState("bootstrap");
          setStatusMessage("Primeiro acesso ainda nao configurado.");
          navigate("/bootstrap", { replace: true });
          return;
        }

        const stored = initialStoredSession;

        if (stored) {
          const freshSession = await refreshStoredSession(stored);

          if (!active) {
            return;
          }

          setSession(freshSession);
          setBootState("admin");
          setStatusMessage("Sessao recuperada deste navegador.");
          navigate("/admin/oficina", { replace: true });
          await loadAdminData(freshSession);
        } else {
          setBootState("login");
          setStatusMessage(
            startsOnForgotPasswordRoute
              ? "Recupere o acesso usando o email cadastrado."
              : "Entre com uma conta ativa da oficina.",
          );
          if (!startsOnForgotPasswordRoute) {
            navigate("/login", { replace: true });
          }
        }
      } catch (error) {
        if (!active) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleInvalidSession("Sessao expirada. Entre novamente.");
          return;
        }

        setBootState("error");
        setStatusMessage("A API nao respondeu. Confira Docker Compose e DATABASE_URL.");
      }
    }

    void boot();

    return () => {
      active = false;
    };
  }, []);

  async function loadAdminData(currentSession: StoredSession = session as StoredSession) {
    if (!currentSession) {
      return;
    }

    const usableSession = await getFreshSession(currentSession);

    setBlocked({});
    const loads: Array<Promise<void>> = [
      loadResource(
        "settings",
        () => getTenantSettings(usableSession.accessToken),
        (settings) => setAdminData((current) => ({ ...current, settings })),
      ),
      loadResource(
        "users",
        () => listUsers(usableSession.accessToken),
        (users) => setAdminData((current) => ({ ...current, users })),
      ),
      loadResource(
        "roles",
        () => listRoles(usableSession.accessToken),
        (roles) => setAdminData((current) => ({ ...current, roles })),
      ),
      loadResource(
        "permissions",
        () => listPermissions(usableSession.accessToken),
        (permissions) => setAdminData((current) => ({ ...current, permissions })),
      ),
    ];

    if (hasPermission(usableSession, "customers.read")) {
      loads.push(
        loadResource(
          "customers",
          () => listCustomers(usableSession.accessToken),
          (customers) => setAdminData((current) => ({ ...current, customers })),
        ),
      );
    }

    if (hasPermission(usableSession, "vehicles.read")) {
      loads.push(
        loadResource(
          "vehicles",
          () => listVehicles(usableSession.accessToken),
          (vehicles) => setAdminData((current) => ({ ...current, vehicles })),
        ),
      );
    }

    if (hasPermission(usableSession, "reception.appointments.read")) {
      loads.push(
        loadResource(
          "reception",
          () => listReceptionAppointments(usableSession.accessToken, { date: todayDateOnly() }),
          (appointments) => setAdminData((current) => ({ ...current, appointments })),
        ),
      );
    }

    loads.push(...stockLoaders(usableSession));

    await Promise.all(loads);
  }

  function stockLoaders(usableSession: StoredSession): Array<Promise<void>> {
    const loads: Array<Promise<void>> = [];

    if (hasPermission(usableSession, "stock.catalog.read")) {
      loads.push(
        loadResource(
          "stock",
          () => listStockServices(usableSession.accessToken),
          (services) => setAdminData((current) => ({ ...current, services })),
        ),
        loadResource(
          "stock",
          () => listStockCategories(usableSession.accessToken),
          (productCategories) => setAdminData((current) => ({ ...current, productCategories })),
        ),
        loadResource(
          "stock",
          () => listStockProducts(usableSession.accessToken),
          (products) => setAdminData((current) => ({ ...current, products })),
        ),
        loadResource(
          "stock",
          () => listStockSuppliers(usableSession.accessToken),
          (suppliers) => setAdminData((current) => ({ ...current, suppliers })),
        ),
      );
    }

    if (hasPermission(usableSession, "stock.movements.read")) {
      loads.push(
        loadResource(
          "stock",
          () => listStockMovements(usableSession.accessToken),
          (stockMovements) => setAdminData((current) => ({ ...current, stockMovements })),
        ),
        loadResource(
          "stock",
          () => listStockReservations(usableSession.accessToken),
          (stockReservations) => setAdminData((current) => ({ ...current, stockReservations })),
        ),
      );
    }

    return loads;
  }

  async function refreshStockData(currentSession: StoredSession) {
    await Promise.all(stockLoaders(currentSession));
  }

  async function loadReceptionAppointments(
    currentSession: StoredSession,
    filters: { date: string } | { weekOf: string },
  ) {
    await loadResource(
      "reception",
      () => listReceptionAppointments(currentSession.accessToken, filters),
      (appointments) => setAdminData((current) => ({ ...current, appointments })),
    );
  }

  async function loadReceptionCheckIns(currentSession: StoredSession) {
    await loadResource(
      "reception",
      () => listReceptionCheckIns(currentSession.accessToken),
      (checkIns) => setAdminData((current) => ({ ...current, checkIns })),
    );
  }

  async function loadResource<T>(
    key: keyof BlockedState,
    action: () => Promise<T>,
    apply: (value: T) => void,
  ) {
    try {
      apply(await action());
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setBlocked((current) => ({
          ...current,
          [key]: "Acesso bloqueado pela permissao do servidor.",
        }));
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        handleInvalidSession("Sessao expirada. Entre novamente.");
        return;
      }

      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar dados.");
    }
  }

  async function withAuthenticatedSession<T>(
    action: (currentSession: StoredSession) => Promise<T>,
  ): Promise<T> {
    if (!session) {
      throw new ApiError(401, "Sessao invalida. Entre novamente.");
    }

    const usableSession = await getFreshSession(session);

    try {
      return await action(usableSession);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshedSession = await refreshStoredSession(usableSession);
        return action(refreshedSession);
      }

      throw error;
    }
  }

  async function getFreshSession(currentSession: StoredSession): Promise<StoredSession> {
    if (!isAccessTokenExpiring(currentSession.accessToken)) {
      return currentSession;
    }

    return refreshStoredSession(currentSession);
  }

  async function refreshStoredSession(currentSession: StoredSession): Promise<StoredSession> {
    try {
      const refreshedSession = storeSession(await refreshSession(currentSession.refreshToken));
      setSession(refreshedSession);
      setStatusMessage("Sessao renovada.");
      return refreshedSession;
    } catch {
      handleInvalidSession("Sessao expirada. Entre novamente.");
      throw new ApiError(401, "Sessao expirada. Entre novamente.");
    }
  }

  function handleInvalidSession(message: string) {
    clearStoredSession();
    setSession(null);
    setAdminData(initialAdminData);
    setBootState("login");
    setStatusMessage(message);
    navigate("/login", { replace: true });
  }

  async function handleLogin(email: string, password: string) {
    setStatusMessage("Validando credenciais.");

    try {
      const nextSession = storeSession(await login({ email, password }));
      setSession(nextSession);
      setBootState("admin");
      setActiveView("oficina");
      setStatusMessage("Sessao autenticada.");
      navigate("/admin/oficina", { replace: true });
      await loadAdminData(nextSession);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    }
  }

  async function handleLogout() {
    const token = session?.accessToken;

    clearStoredSession();
    setSession(null);
    setAdminData(initialAdminData);
    setBootState("login");
    setStatusMessage("Sessao encerrada neste navegador.");
    navigate("/login", { replace: true });

    if (token) {
      await logout(token);
    }
  }

  function selectView(view: View) {
    setActiveView(view);
    navigate(`/admin/${view}`);
  }

  const title = bootState === "admin" ? "Administracao" : "JO.IA Oficina";

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Cabecalho do workspace">
        <div>
          <p className="eyebrow">JO.IA Oficina</p>
          <h1>{title}</h1>
        </div>
        <div className="status-strip" aria-label="Sessao autenticada">
          <span
            className={bootState === "error" ? "status-dot status-dot--danger" : "status-dot"}
          />
          <span>
            {bootState === "admin"
              ? (adminData.settings?.tradeName ?? session?.user.name)
              : statusMessage}
          </span>
        </div>
      </header>

      {bootState === "loading" ? <LoadingPanel /> : null}
      {bootState === "error" ? <ErrorPanel message={statusMessage} /> : null}
      {bootState === "bootstrap" ? (
        <BootstrapPanel onDone={() => setBootState("login")} setStatusMessage={setStatusMessage} />
      ) : null}
      {bootState === "login" ? (
        <AuthWorkspace
          mode={isForgotPasswordRoute ? "forgot-password" : "login"}
          onLogin={handleLogin}
          onNavigateToForgotPassword={() => navigate("/forgot-password")}
          onNavigateToLogin={() => navigate("/login")}
          setStatusMessage={setStatusMessage}
        />
      ) : null}
      {bootState === "admin" && session ? (
        <AdminShell
          activeView={activeView}
          adminData={adminData}
          blocked={blocked}
          onChangePassword={async (currentPassword, newPassword) => {
            await withAuthenticatedSession((currentSession) =>
              changePassword(currentSession.accessToken, { currentPassword, newPassword }),
            );
            setStatusMessage("Senha alterada para esta conta.");
          }}
          onCreateRole={async (input) => {
            const role = await withAuthenticatedSession((currentSession) =>
              createRole(currentSession.accessToken, input),
            );
            setAdminData((current) => ({ ...current, roles: [...current.roles, role] }));
            setStatusMessage("Papel registrado para este tenant.");
          }}
          onCreateCustomer={async (input) => {
            const customer = await withAuthenticatedSession((currentSession) =>
              createCustomer(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              customers: [...current.customers, customer].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
            }));
            setStatusMessage("Cliente registrado no tenant autenticado.");
          }}
          onCancelAppointment={async (appointment, reason) => {
            const cancelled = await withAuthenticatedSession((currentSession) =>
              cancelReceptionAppointment(currentSession.accessToken, appointment.id, { reason }),
            );
            setAdminData((current) => ({
              ...current,
              appointments: current.appointments.map((item) =>
                item.id === cancelled.id ? cancelled : item,
              ),
            }));
            setStatusMessage("Agendamento cancelado com historico auditavel.");
          }}
          onCreateAppointment={async (input) => {
            const appointment = await withAuthenticatedSession((currentSession) =>
              createReceptionAppointment(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              appointments: [...current.appointments, appointment].sort(compareAppointments),
            }));
            setStatusMessage("Agendamento salvo no tenant autenticado.");
          }}
          onCreateCheckIn={async (input) => {
            const checkIn = await withAuthenticatedSession(async (currentSession) => {
              const created = await createReceptionCheckIn(currentSession.accessToken, input);
              await loadReceptionCheckIns(currentSession);

              if (!input.appointmentId) {
                await loadReceptionAppointments(currentSession, { date: todayDateOnly() });
              }

              return created;
            });
            setAdminData((current) => ({
              ...current,
              appointments: current.appointments
                .map((item) =>
                  item.id === checkIn.appointmentId
                    ? {
                        ...item,
                        status: checkIn.appointment.status,
                      }
                    : item,
                )
                .sort(compareAppointments),
            }));
            setStatusMessage("Check-in concluido e status definido como Aguardando diagnostico.");
            return checkIn;
          }}
          onCreateUser={async (input) => {
            const user = await withAuthenticatedSession((currentSession) =>
              createUser(currentSession.accessToken, input),
            );
            setAdminData((current) => ({ ...current, users: [...current.users, user] }));
            setStatusMessage("Usuario criado no tenant autenticado.");
          }}
          onCreateVehicle={async (input) => {
            const vehicle = await withAuthenticatedSession((currentSession) =>
              createVehicle(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              vehicles: [...current.vehicles, vehicle].sort((left, right) =>
                (left.plateNormalized ?? "").localeCompare(right.plateNormalized ?? ""),
              ),
            }));
            setStatusMessage("Veiculo registrado e vinculado ao cliente atual.");
          }}
          onCreateStockAdjustment={async (input) => {
            await withAuthenticatedSession(async (currentSession) => {
              await createStockAdjustment(currentSession.accessToken, input);
              await refreshStockData(currentSession);
            });
            setStatusMessage("Ajuste registrado pelo backend.");
          }}
          onCreateStockCategory={async (input) => {
            const category = await withAuthenticatedSession((currentSession) =>
              createStockCategory(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              productCategories: [...current.productCategories, category].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
            }));
            setStatusMessage("Categoria salva no tenant autenticado.");
          }}
          onCreateStockExit={async (input) => {
            await withAuthenticatedSession(async (currentSession) => {
              await createStockExit(currentSession.accessToken, input);
              await refreshStockData(currentSession);
            });
            setStatusMessage("Saida registrada pelo backend.");
          }}
          onCreateStockProduct={async (input) => {
            const product = await withAuthenticatedSession((currentSession) =>
              createStockProduct(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              products: [...current.products, product].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
            }));
            setStatusMessage("Produto salvo no tenant autenticado.");
          }}
          onCreateStockPurchase={async (input) => {
            const purchase = await withAuthenticatedSession(async (currentSession) => {
              const created = await createStockPurchase(currentSession.accessToken, input);
              await refreshStockData(currentSession);
              return created;
            });
            setAdminData((current) => ({
              ...current,
              purchases: [purchase, ...current.purchases],
            }));
            setStatusMessage("Compra registrada e estoque atualizado pelo backend.");
          }}
          onCreateStockReservation={async (input) => {
            const reservation = await withAuthenticatedSession(async (currentSession) => {
              const created = await createStockReservation(currentSession.accessToken, input);
              await refreshStockData(currentSession);
              return created;
            });
            setAdminData((current) => ({
              ...current,
              stockReservations: current.stockReservations.some(
                (item) => item.id === reservation.id,
              )
                ? current.stockReservations.map((item) =>
                    item.id === reservation.id ? reservation : item,
                  )
                : [reservation, ...current.stockReservations],
            }));
            setStatusMessage("Reserva registrada sem alterar o saldo fisico.");
          }}
          onCreateStockService={async (input) => {
            const service = await withAuthenticatedSession((currentSession) =>
              createStockService(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              services: [...current.services, service].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
            }));
            setStatusMessage("Servico salvo no tenant autenticado.");
          }}
          onCreateStockSupplier={async (input) => {
            const supplier = await withAuthenticatedSession((currentSession) =>
              createStockSupplier(currentSession.accessToken, input),
            );
            setAdminData((current) => ({
              ...current,
              suppliers: [...current.suppliers, supplier].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
            }));
            setStatusMessage("Fornecedor salvo no tenant autenticado.");
          }}
          onDeactivateStockProduct={async (product) => {
            await withAuthenticatedSession((currentSession) =>
              deactivateStockProduct(currentSession.accessToken, product.id),
            );
            setAdminData((current) => ({
              ...current,
              products: current.products.filter((item) => item.id !== product.id),
            }));
            setStatusMessage("Produto desativado; historico permanece auditavel.");
          }}
          onDeactivateStockService={async (service) => {
            await withAuthenticatedSession((currentSession) =>
              deactivateStockService(currentSession.accessToken, service.id),
            );
            setAdminData((current) => ({
              ...current,
              services: current.services.filter((item) => item.id !== service.id),
            }));
            setStatusMessage("Servico desativado; historico permanece auditavel.");
          }}
          onDeactivateStockSupplier={async (supplier) => {
            await withAuthenticatedSession((currentSession) =>
              deactivateStockSupplier(currentSession.accessToken, supplier.id),
            );
            setAdminData((current) => ({
              ...current,
              suppliers: current.suppliers.filter((item) => item.id !== supplier.id),
            }));
            setStatusMessage("Fornecedor desativado; historico permanece auditavel.");
          }}
          onCancelStockReservation={async (reservation) => {
            await withAuthenticatedSession(async (currentSession) => {
              await cancelReservation(currentSession.accessToken, reservation.id);
              await refreshStockData(currentSession);
            });
            setStatusMessage("Reserva cancelada pelo backend.");
          }}
          onDeleteCustomer={async (customer) => {
            await withAuthenticatedSession((currentSession) =>
              deleteCustomer(currentSession.accessToken, customer.id),
            );
            setAdminData((current) => ({
              ...current,
              customers: current.customers.filter((item) => item.id !== customer.id),
            }));
            setStatusMessage("Cliente excluido logicamente da lista ativa.");
          }}
          onDeleteVehicle={async (vehicle) => {
            await withAuthenticatedSession((currentSession) =>
              deleteVehicle(currentSession.accessToken, vehicle.id),
            );
            setAdminData((current) => ({
              ...current,
              vehicles: current.vehicles.filter((item) => item.id !== vehicle.id),
            }));
            setStatusMessage("Veiculo excluido logicamente da lista ativa.");
          }}
          onDeleteCheckInAttachment={async (checkInId, attachment) => {
            await withAuthenticatedSession((currentSession) =>
              deleteReceptionCheckInAttachment(
                currentSession.accessToken,
                checkInId,
                attachment.id,
              ),
            );
            setStatusMessage("Anexo removido conforme permissao do servidor.");
          }}
          onDownloadCheckInAttachment={async (checkInId, attachment) => {
            const blob = await withAuthenticatedSession((currentSession) =>
              downloadReceptionCheckInAttachment(
                currentSession.accessToken,
                checkInId,
                attachment.id,
              ),
            );
            triggerAttachmentDownload(blob, attachment.originalName);
            setStatusMessage("Anexo baixado pela API protegida.");
          }}
          onLoadCustomerHistory={async (customerId) => {
            const customerHistory = await withAuthenticatedSession((currentSession) =>
              listCustomerHistory(currentSession.accessToken, customerId),
            );
            setAdminData((current) => ({ ...current, customerHistory }));
            setStatusMessage("Historico basico do cliente sincronizado.");
          }}
          onLoadVehicleHistory={async (vehicleId) => {
            const vehicleHistory = await withAuthenticatedSession((currentSession) =>
              listVehicleHistory(currentSession.accessToken, vehicleId),
            );
            setAdminData((current) => ({ ...current, vehicleHistory }));
            setStatusMessage("Historico basico do veiculo sincronizado.");
          }}
          onLoadAppointments={async (filters) => {
            await withAuthenticatedSession((currentSession) =>
              loadReceptionAppointments(currentSession, filters),
            );
          }}
          onLoadCheckIn={async (checkInId) =>
            withAuthenticatedSession((currentSession) =>
              getReceptionCheckIn(currentSession.accessToken, checkInId),
            )
          }
          onLoadCheckInAttachments={async (checkInId) =>
            withAuthenticatedSession((currentSession) =>
              listReceptionCheckInAttachments(currentSession.accessToken, checkInId),
            )
          }
          onLoadCheckIns={async () => {
            await withAuthenticatedSession((currentSession) => loadReceptionCheckIns(currentSession));
          }}
          onLogout={handleLogout}
          onRefresh={() => loadAdminData(session)}
          onSearchCustomers={async (search) => {
            const customers = await withAuthenticatedSession((currentSession) =>
              listCustomers(currentSession.accessToken, { search }),
            );
            setAdminData((current) => ({ ...current, customers }));
            setStatusMessage("Busca de clientes sincronizada com a API.");
          }}
          onSearchVehicles={async (search) => {
            const vehicles = await withAuthenticatedSession((currentSession) =>
              listVehicles(currentSession.accessToken, { search }),
            );
            setAdminData((current) => ({ ...current, vehicles }));
            setStatusMessage("Busca de veiculos sincronizada com a API.");
          }}
          onSelectView={selectView}
          onUpdateCustomer={async (customerId, input) => {
            const customer = await withAuthenticatedSession((currentSession) =>
              updateCustomer(currentSession.accessToken, customerId, input),
            );
            setAdminData((current) => ({
              ...current,
              customers: current.customers.map((item) =>
                item.id === customer.id ? customer : item,
              ),
            }));
            setStatusMessage("Cliente atualizado pelo backend.");
          }}
          onUpdateAppointment={async (appointmentId, input) => {
            const appointment = await withAuthenticatedSession((currentSession) =>
              updateReceptionAppointment(currentSession.accessToken, appointmentId, input),
            );
            setAdminData((current) => ({
              ...current,
              appointments: current.appointments
                .map((item) => (item.id === appointment.id ? appointment : item))
                .sort(compareAppointments),
            }));
            setStatusMessage("Agendamento atualizado no tenant autenticado.");
          }}
          onUpdateCheckIn={async (checkInId, input) => {
            const checkIn = await withAuthenticatedSession(async (currentSession) => {
              const updated = await updateReceptionCheckIn(
                currentSession.accessToken,
                checkInId,
                input,
              );
              await loadReceptionCheckIns(currentSession);
              return updated;
            });
            setStatusMessage("Checklist atualizado com auditoria do backend.");
            return checkIn;
          }}
          onUploadCheckInAttachment={async (checkInId, input) => {
            const attachment = await withAuthenticatedSession((currentSession) =>
              uploadReceptionCheckInAttachment(currentSession.accessToken, checkInId, input),
            );
            setStatusMessage("Anexo enviado pela API protegida.");
            return attachment;
          }}
          onUpdateOverrides={async (userId, overrides) => {
            const user = await withAuthenticatedSession((currentSession) =>
              replacePermissionOverrides(currentSession.accessToken, userId, overrides),
            );
            setAdminData((current) => ({
              ...current,
              users: current.users.map((item) => (item.id === user.id ? user : item)),
            }));
            setStatusMessage("Overrides atualizados com autoridade do backend.");
          }}
          onUpdateSettings={async (input) => {
            const settings = await withAuthenticatedSession((currentSession) =>
              updateTenantSettings(currentSession.accessToken, input),
            );
            setAdminData((current) => ({ ...current, settings }));
            setStatusMessage("Configuracoes da oficina atualizadas.");
          }}
          onUpdateVehicle={async (vehicleId, input) => {
            const vehicle = await withAuthenticatedSession((currentSession) =>
              updateVehicle(currentSession.accessToken, vehicleId, input),
            );
            setAdminData((current) => ({
              ...current,
              vehicles: current.vehicles.map((item) => (item.id === vehicle.id ? vehicle : item)),
            }));
            setStatusMessage("Veiculo atualizado pelo backend.");
          }}
          session={session}
          statusMessage={statusMessage}
        />
      ) : null}
    </main>
  );
}

function LoadingPanel() {
  return (
    <section className="panel panel-single" aria-label="Carregando acesso">
      <div className="skeleton-list" aria-label="Sincronizando com a API">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="panel panel-single empty-state empty-state--danger">
      <strong>Conexao indisponivel</strong>
      <span>{message}</span>
    </section>
  );
}

function BootstrapPanel({
  onDone,
  setStatusMessage,
}: {
  onDone: () => void;
  setStatusMessage: (message: string) => void;
}) {
  const [tenantName, setTenantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await createFirstAdmin({
        admin: { email, name: adminName, password },
        companySettings: { tradeName: tenantName },
        tenant: { name: tenantName },
      });
      setStatusMessage("Primeiro administrador criado. Entre para continuar.");
      onDone();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha no bootstrap.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-grid workspace-grid--auth" aria-label="Bootstrap da oficina">
      <form className="panel action-panel" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Bootstrap</p>
            <h2>Configurar primeira oficina</h2>
          </div>
          <span className="pill">Primeiro acesso</span>
        </div>
        <label className="field">
          <span>
            Nome da oficina
            <RequiredMark />
          </span>
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>
            Nome do administrador
            <RequiredMark />
          </span>
          <input
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>
            Email do administrador
            <RequiredMark />
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>
            Senha inicial
            <RequiredMark />
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Criando..." : "Criar primeiro acesso"}
        </button>
      </form>
      <StatusPanel message="O bootstrap fica indisponivel depois que o primeiro usuario existe." />
    </section>
  );
}

function AuthWorkspace({
  mode,
  onLogin,
  onNavigateToForgotPassword,
  onNavigateToLogin,
  setStatusMessage,
}: {
  mode: "forgot-password" | "login";
  onLogin: (email: string, password: string) => Promise<void>;
  onNavigateToForgotPassword: () => void;
  onNavigateToLogin: () => void;
  setStatusMessage: (message: string) => void;
}) {
  return (
    <section className="auth-flow" aria-label="Acesso operacional">
      {mode === "forgot-password" ? (
        <ForgotPasswordPage onBackToLogin={onNavigateToLogin} setStatusMessage={setStatusMessage} />
      ) : (
        <LoginPanel onLogin={onLogin} onRequestAccess={onNavigateToForgotPassword} />
      )}
    </section>
  );
}

function LoginPanel({
  onLogin,
  onRequestAccess,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRequestAccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onLogin(email, password);
    setSaving(false);
  }

  return (
    <Card aria-label="Login" className="action-panel auth-card">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div>
            <p className="eyebrow">Acesso</p>
            <h2>Entrar no JO.IA</h2>
          </div>
          <span className="pill">Sessao</span>
        </CardHeader>
        <CardContent>
          <Label className="field">
            <span>
              Email
              <RequiredMark />
            </span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Label>
          <Label className="field">
            <span>
              Senha
              <RequiredMark />
            </span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Label>
          <Button
            type="button"
            variant="link"
            className="forgot-password-link"
            onClick={onRequestAccess}
          >
            Esqueceu a senha?
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Entrando..." : "Entrar"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

const DEFAULT_RECOVERY_EMAIL = "wellingtonrdp16@gmail.com";

function ForgotPasswordPage({
  onBackToLogin,
  setStatusMessage,
}: {
  onBackToLogin: () => void;
  setStatusMessage: (message: string) => void;
}) {
  const [email, setEmail] = useState(DEFAULT_RECOVERY_EMAIL);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestPasswordReset(email);
    const nextMessage = `Codigo enviado para o email cadastrado: ${email}.`;
    setMessage(nextMessage);
    setStatusMessage(nextMessage);
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await completePasswordReset({ code, email, newPassword });
    setStatusMessage("Senha redefinida. Entre com a nova senha.");
    setCode("");
    setNewPassword("");
  }

  return (
    <Card aria-label="Formulario esqueceu a senha" className="auth-card">
      <CardHeader>
        <div>
          <p className="eyebrow">Senha</p>
          <h2>Esqueceu a senha</h2>
        </div>
        <Button type="button" variant="ghost" onClick={onBackToLogin}>
          Voltar
        </Button>
      </CardHeader>
      <CardContent>
        <p className="helper-text">
          Informe o email cadastrado. O codigo de recuperacao sera enviado para esse endereco.
        </p>
        <div className="stacked-forms">
          <form onSubmit={handleRequest}>
            <Label className="field">
              <span>
                Email cadastrado
                <RequiredMark />
              </span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Label>
            <Button type="submit">Solicitar codigo</Button>
          </form>
          {message ? (
            <p className="callout" role="status">
              {message}
            </p>
          ) : null}
          <form onSubmit={handleComplete}>
            <Label className="field">
              <span>
                Codigo de recuperacao
                <RequiredMark />
              </span>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                required
              />
            </Label>
            <Label className="field">
              <span>
                Nova senha
                <RequiredMark />
              </span>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </Label>
            <Button type="submit">Concluir redefinicao</Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminShell(props: {
  activeView: View;
  adminData: AdminData;
  blocked: BlockedState;
  onCancelAppointment: (appointment: Appointment, reason: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onCreateAppointment: (input: AppointmentInput) => Promise<void>;
  onCreateCheckIn: (input: CheckInInput) => Promise<CheckIn>;
  onCreateCustomer: (input: CustomerInput) => Promise<void>;
  onCreateRole: (input: {
    description?: string;
    key: string;
    name: string;
    permissionKeys: string[];
  }) => Promise<void>;
  onCreateUser: (input: {
    email: string;
    name: string;
    password: string;
    roleIds?: string[];
  }) => Promise<void>;
  onCreateVehicle: (input: VehicleInput) => Promise<void>;
  onCancelStockReservation: (reservation: StockReservation) => Promise<void>;
  onCreateStockAdjustment: (input: StockAdjustmentInput) => Promise<void>;
  onCreateStockCategory: (input: ProductCategoryInput) => Promise<void>;
  onCreateStockExit: (input: StockExitInput) => Promise<void>;
  onCreateStockProduct: (input: ProductInput) => Promise<void>;
  onCreateStockPurchase: (input: PurchaseInput) => Promise<void>;
  onCreateStockReservation: (input: StockReservationInput) => Promise<void>;
  onCreateStockService: (input: ServiceCatalogEntryInput) => Promise<void>;
  onCreateStockSupplier: (input: SupplierInput) => Promise<void>;
  onDeactivateStockProduct: (product: Product) => Promise<void>;
  onDeactivateStockService: (service: ServiceCatalogEntry) => Promise<void>;
  onDeactivateStockSupplier: (supplier: Supplier) => Promise<void>;
  onDeleteCheckInAttachment: (checkInId: string, attachment: CheckInAttachment) => Promise<void>;
  onDeleteCustomer: (customer: Customer) => Promise<void>;
  onDeleteVehicle: (vehicle: Vehicle) => Promise<void>;
  onDownloadCheckInAttachment: (checkInId: string, attachment: CheckInAttachment) => Promise<void>;
  onLoadCustomerHistory: (customerId: string) => Promise<void>;
  onLoadAppointments: (filters: { date: string } | { weekOf: string }) => Promise<void>;
  onLoadCheckIn: (checkInId: string) => Promise<CheckIn>;
  onLoadCheckInAttachments: (checkInId: string) => Promise<CheckInAttachment[]>;
  onLoadCheckIns: () => Promise<void>;
  onLoadVehicleHistory: (vehicleId: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSearchCustomers: (search: string) => Promise<void>;
  onSearchVehicles: (search: string) => Promise<void>;
  onSelectView: (view: View) => void;
  onUpdateAppointment: (appointmentId: string, input: Partial<AppointmentInput>) => Promise<void>;
  onUpdateCheckIn: (checkInId: string, input: CheckInUpdateInput) => Promise<CheckIn>;
  onUpdateCustomer: (customerId: string, input: CustomerInput) => Promise<void>;
  onUpdateOverrides: (userId: string, overrides: PermissionOverride[]) => Promise<void>;
  onUpdateSettings: (input: Partial<TenantSettings>) => Promise<void>;
  onUpdateVehicle: (vehicleId: string, input: VehicleInput) => Promise<void>;
  onUploadCheckInAttachment: (
    checkInId: string,
    input: { category: AttachmentCategory; file: File },
  ) => Promise<CheckInAttachment>;
  session: StoredSession;
  statusMessage: string;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(() =>
    ["oficina", "usuarios", "papeis", "permissoes"].includes(props.activeView),
  );
  const cadastroItems = useMemo(
    () =>
      [
        {
          icon: faBuilding,
          label: "Oficina",
          permission: "tenant.settings.read",
          view: "oficina" as const,
        },
        { icon: faUsers, label: "Usuarios", permission: "users.read", view: "usuarios" as const },
        {
          icon: faUserShield,
          label: "Papeis",
          permission: "roles.manage",
          view: "papeis" as const,
        },
        {
          icon: faKey,
          label: "Permissoes",
          permission: "permissions.manage",
          view: "permissoes" as const,
        },
      ].filter((item) => hasPermission(props.session, item.permission)),
    [props.session],
  );
  const operationalItems = useMemo(
    () =>
      [
        {
          icon: faCalendarDays,
          label: "Agenda",
          permission: "reception.appointments.read",
          view: "agenda" as const,
        },
        {
          icon: faAddressBook,
          label: "Clientes",
          permission: "customers.read",
          view: "clientes" as const,
        },
        { icon: faCar, label: "Veiculos", permission: "vehicles.read", view: "veiculos" as const },
        {
          icon: faBoxesStacked,
          label: "Estoque",
          permission: "stock.catalog.read",
          view: "estoque" as const,
        },
      ].filter((item) => hasPermission(props.session, item.permission)),
    [props.session],
  );

  function selectMenuView(view: View) {
    props.onSelectView(view);
    setIsMobileNavOpen(false);
    if (["oficina", "usuarios", "papeis", "permissoes"].includes(view)) {
      setIsCadastrosOpen(true);
    }
  }

  function renderNavButton(item: { icon: IconDefinition; label: string; view: View }) {
    return (
      <button
        key={item.view}
        type="button"
        className={props.activeView === item.view ? "nav-item nav-item--active" : "nav-item"}
        onClick={() => selectMenuView(item.view)}
      >
        <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <>
      <section className="admin-layout" aria-label="Administracao operacional">
        <aside className="panel side-panel">
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-controls="admin-navigation"
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((current) => !current)}
          >
            <FontAwesomeIcon icon={faBars} aria-hidden="true" />
            <span>Menu</span>
          </button>
          <nav
            id="admin-navigation"
            className={isMobileNavOpen ? "nav-list nav-list--open" : "nav-list"}
            aria-label="Administracao"
          >
            {cadastroItems.length ? (
              <div className="nav-group">
                <button
                  type="button"
                  className={
                    ["oficina", "usuarios", "papeis", "permissoes"].includes(props.activeView)
                      ? "nav-item nav-item--active nav-dropdown-trigger"
                      : "nav-item nav-dropdown-trigger"
                  }
                  aria-controls="cadastros-menu"
                  aria-expanded={isCadastrosOpen}
                  onClick={() => setIsCadastrosOpen((current) => !current)}
                >
                  <FontAwesomeIcon icon={faFolderOpen} aria-hidden="true" />
                  <span>Cadastros</span>
                  <FontAwesomeIcon
                    className={
                      isCadastrosOpen
                        ? "nav-dropdown-chevron nav-dropdown-chevron--open"
                        : "nav-dropdown-chevron"
                    }
                    icon={faChevronDown}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id="cadastros-menu"
                  className={
                    isCadastrosOpen ? "nav-group-items nav-group-items--open" : "nav-group-items"
                  }
                >
                  {cadastroItems.map(renderNavButton)}
                </div>
              </div>
            ) : null}
            {operationalItems.map(renderNavButton)}
            <button
              type="button"
              className={
                props.activeView === "seguranca" ? "nav-item nav-item--active" : "nav-item"
              }
              onClick={() => selectMenuView("seguranca")}
            >
              <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
              <span>Seguranca</span>
            </button>
          </nav>
          <button type="button" className="button-secondary full-width" onClick={props.onRefresh}>
            <FontAwesomeIcon icon={faRotateRight} aria-hidden="true" />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            className="button-danger full-width"
            onClick={() => void props.onLogout()}
          >
            <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </aside>
        <section className="content-stack">
          <p className="callout" role="status">
            {props.statusMessage}
          </p>
          {props.activeView === "oficina" ? (
            <SettingsPanel
              blocked={props.blocked.settings}
              onUpdateSettings={props.onUpdateSettings}
              settings={props.adminData.settings}
            />
          ) : null}
          {props.activeView === "usuarios" ? (
            <UsersPanel
              blocked={props.blocked.users}
              onCreateUser={props.onCreateUser}
              roles={props.adminData.roles}
              users={props.adminData.users}
            />
          ) : null}
          {props.activeView === "papeis" ? (
            <RolesPanel
              blocked={props.blocked.roles}
              onCreateRole={props.onCreateRole}
              permissions={props.adminData.permissions}
              roles={props.adminData.roles}
            />
          ) : null}
          {props.activeView === "permissoes" ? (
            <PermissionsPanel
              blocked={props.blocked.permissions}
              onUpdateOverrides={props.onUpdateOverrides}
              permissions={props.adminData.permissions}
              users={props.adminData.users}
            />
          ) : null}
          {props.activeView === "clientes" ? (
            <CustomersPanel
              blocked={props.blocked.customers}
              customers={props.adminData.customers}
              history={props.adminData.customerHistory}
              onCreateCustomer={props.onCreateCustomer}
              onDeleteCustomer={props.onDeleteCustomer}
              onLoadHistory={props.onLoadCustomerHistory}
              onSearch={props.onSearchCustomers}
              onUpdateCustomer={props.onUpdateCustomer}
            />
          ) : null}
          {props.activeView === "agenda" ? (
            <AgendaPanel
              appointments={props.adminData.appointments}
              blocked={props.blocked.reception}
              canCancel={hasPermission(props.session, "reception.appointments.cancel")}
              canReadCheckIns={hasPermission(props.session, "reception.checkins.read")}
              canWrite={hasPermission(props.session, "reception.appointments.write")}
              canWriteCheckIns={hasPermission(props.session, "reception.checkins.write")}
              checkIns={props.adminData.checkIns}
              customers={props.adminData.customers}
              onDeleteCheckInAttachment={props.onDeleteCheckInAttachment}
              onDownloadCheckInAttachment={props.onDownloadCheckInAttachment}
              onCancelAppointment={props.onCancelAppointment}
              onCreateAppointment={props.onCreateAppointment}
              onCreateCheckIn={props.onCreateCheckIn}
              onLoadAppointments={props.onLoadAppointments}
              onLoadCheckIn={props.onLoadCheckIn}
              onLoadCheckInAttachments={props.onLoadCheckInAttachments}
              onLoadCheckIns={props.onLoadCheckIns}
              onUpdateAppointment={props.onUpdateAppointment}
              onUpdateCheckIn={props.onUpdateCheckIn}
              onUploadCheckInAttachment={props.onUploadCheckInAttachment}
              vehicles={props.adminData.vehicles}
            />
          ) : null}
          {props.activeView === "veiculos" ? (
            <VehiclesPanel
              blocked={props.blocked.vehicles}
              customers={props.adminData.customers}
              history={props.adminData.vehicleHistory}
              onCreateVehicle={props.onCreateVehicle}
              onDeleteVehicle={props.onDeleteVehicle}
              onLoadHistory={props.onLoadVehicleHistory}
              onSearch={props.onSearchVehicles}
              onUpdateVehicle={props.onUpdateVehicle}
              vehicles={props.adminData.vehicles}
            />
          ) : null}
          {props.activeView === "estoque" ? (
            <StockPanel
              blocked={props.blocked.stock}
              categories={props.adminData.productCategories}
              movements={props.adminData.stockMovements}
              onCancelReservation={props.onCancelStockReservation}
              onCreateAdjustment={props.onCreateStockAdjustment}
              onCreateCategory={props.onCreateStockCategory}
              onCreateExit={props.onCreateStockExit}
              onCreateProduct={props.onCreateStockProduct}
              onCreatePurchase={props.onCreateStockPurchase}
              onCreateReservation={props.onCreateStockReservation}
              onCreateService={props.onCreateStockService}
              onCreateSupplier={props.onCreateStockSupplier}
              onDeactivateProduct={props.onDeactivateStockProduct}
              onDeactivateService={props.onDeactivateStockService}
              onDeactivateSupplier={props.onDeactivateStockSupplier}
              products={props.adminData.products}
              purchases={props.adminData.purchases}
              reservations={props.adminData.stockReservations}
              services={props.adminData.services}
              suppliers={props.adminData.suppliers}
            />
          ) : null}
          {props.activeView === "seguranca" ? (
            <SecurityPanel onChangePassword={props.onChangePassword} session={props.session} />
          ) : null}
        </section>
      </section>
    </>
  );
}

type AgendaMode = "checkins" | "day" | "week";

const attachmentCategories: AttachmentCategory[] = [
  "Avaria",
  "Documento",
  "Painel",
  "Motor",
  "Interior",
  "Outro",
];

type CheckInDraftSource =
  | {
      appointment: Appointment;
      type: "appointment";
    }
  | {
      type: "direct";
    };

function AgendaPanel({
  appointments,
  blocked,
  canCancel,
  canReadCheckIns,
  canWrite,
  canWriteCheckIns,
  checkIns,
  customers,
  onDeleteCheckInAttachment,
  onDownloadCheckInAttachment,
  onCancelAppointment,
  onCreateAppointment,
  onCreateCheckIn,
  onLoadAppointments,
  onLoadCheckIn,
  onLoadCheckInAttachments,
  onLoadCheckIns,
  onUpdateAppointment,
  onUpdateCheckIn,
  onUploadCheckInAttachment,
  vehicles,
}: {
  appointments: Appointment[];
  blocked: string | undefined;
  canCancel: boolean;
  canReadCheckIns: boolean;
  canWrite: boolean;
  canWriteCheckIns: boolean;
  checkIns: CheckIn[];
  customers: Customer[];
  onDeleteCheckInAttachment: (checkInId: string, attachment: CheckInAttachment) => Promise<void>;
  onDownloadCheckInAttachment: (checkInId: string, attachment: CheckInAttachment) => Promise<void>;
  onCancelAppointment: (appointment: Appointment, reason: string) => Promise<void>;
  onCreateAppointment: (input: AppointmentInput) => Promise<void>;
  onCreateCheckIn: (input: CheckInInput) => Promise<CheckIn>;
  onLoadAppointments: (filters: { date: string } | { weekOf: string }) => Promise<void>;
  onLoadCheckIn: (checkInId: string) => Promise<CheckIn>;
  onLoadCheckInAttachments: (checkInId: string) => Promise<CheckInAttachment[]>;
  onLoadCheckIns: () => Promise<void>;
  onUpdateAppointment: (appointmentId: string, input: Partial<AppointmentInput>) => Promise<void>;
  onUpdateCheckIn: (checkInId: string, input: CheckInUpdateInput) => Promise<CheckIn>;
  onUploadCheckInAttachment: (
    checkInId: string,
    input: { category: AttachmentCategory; file: File },
  ) => Promise<CheckInAttachment>;
  vehicles: Vehicle[];
}) {
  const defaultDate = todayDateOnly();
  const [activeMode, setActiveMode] = useState<AgendaMode>("day");
  const [date, setDate] = useState(defaultDate);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => emptyAppointmentForm(defaultDate, customers, vehicles));
  const [checkInSource, setCheckInSource] = useState<CheckInDraftSource | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    if (!form.customerId && customers[0]?.id) {
      setForm((current) => ({ ...current, customerId: customers[0]?.id ?? "" }));
    }

    if (!form.vehicleId && vehicles[0]?.id) {
      setForm((current) => ({ ...current, vehicleId: vehicles[0]?.id ?? "" }));
    }
  }, [customers, form.customerId, form.vehicleId, vehicles]);

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  const filteredAppointments = appointments
    .filter((appointment) =>
      statusFilter === "todos" ? true : appointment.status === statusFilter,
    )
    .filter((appointment) => {
      const needle = search.trim().toLocaleLowerCase("pt-BR");

      if (!needle) {
        return true;
      }

      return [
        appointment.customer.name,
        appointment.vehicle.plateNormalized ?? "",
        appointment.expectedService,
        appointment.origin,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(needle);
    })
    .sort(compareAppointments);

  async function changeMode(nextMode: AgendaMode) {
    setActiveMode(nextMode);
    setError("");

    if (nextMode === "day") {
      await onLoadAppointments({ date });
      return;
    }

    if (nextMode === "checkins") {
      await onLoadCheckIns();
      return;
    }

    await onLoadAppointments({ weekOf: startOfBusinessWeek(date) });
  }

  async function refreshCurrentMode(nextDate = date) {
    setError("");

    if (activeMode === "day") {
      await onLoadAppointments({ date: nextDate });
      return;
    }

    await onLoadAppointments({ weekOf: startOfBusinessWeek(nextDate) });
  }

  function editAppointment(appointment: Appointment) {
    setEditingAppointment(appointment);
    setForm({
      customerId: appointment.customerId,
      expectedService: appointment.expectedService,
      notes: appointment.notes ?? "",
      origin: appointment.origin,
      startsAt: toDateTimeLocalValue(appointment.startsAt),
      vehicleId: appointment.vehicleId,
    });
    setSelectedAppointment(appointment);
    setError("");
  }

  function startAppointmentCheckIn(appointment: Appointment) {
    setCheckInSource({ appointment, type: "appointment" });
    setSelectedAppointment(appointment);
    setSelectedCheckIn(null);
    setError("");
  }

  function startDirectCheckIn() {
    setCheckInSource({ type: "direct" });
    setSelectedAppointment(null);
    setSelectedCheckIn(null);
    setError("");
  }

  async function consultCheckIn(checkIn: CheckIn) {
    setError("");
    try {
      setSelectedCheckIn(await onLoadCheckIn(checkIn.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel consultar o check-in.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const input: AppointmentInput = {
      customerId: form.customerId,
      expectedService: form.expectedService,
      notes: form.notes,
      origin: form.origin,
      startsAt: toIsoDateTime(form.startsAt),
      vehicleId: form.vehicleId,
    };

    try {
      if (editingAppointment) {
        await onUpdateAppointment(editingAppointment.id, input);
      } else {
        await onCreateAppointment(input);
      }

      setEditingAppointment(null);
      setForm(emptyAppointmentForm(date, customers, vehicles));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel salvar o agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmCancel() {
    if (!pendingCancel) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onCancelAppointment(pendingCancel, "Cancelado na agenda operacional.");
      setPendingCancel(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Nao foi possivel cancelar o agendamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="agenda-workspace" aria-label="Agenda">
      <div className="agenda-main">
        <section className="panel agenda-table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2>{activeMode === "day" ? "Agenda diaria" : "Agenda semanal"}</h2>
            </div>
            <span className="pill">{filteredAppointments.length} agendamentos</span>
          </div>
          <div className="agenda-tabs" role="tablist" aria-label="Modo da agenda">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "day"}
              className={activeMode === "day" ? "stock-tab stock-tab--active" : "stock-tab"}
              onClick={() => void changeMode("day")}
            >
              Agenda diaria
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "week"}
              className={activeMode === "week" ? "stock-tab stock-tab--active" : "stock-tab"}
              onClick={() => void changeMode("week")}
            >
              Agenda semanal
            </button>
            {canReadCheckIns ? (
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === "checkins"}
                className={
                  activeMode === "checkins" ? "stock-tab stock-tab--active" : "stock-tab"
                }
                onClick={() => void changeMode("checkins")}
              >
                Check-ins
              </button>
            ) : null}
          </div>
          {activeMode === "day" ? (
            <DailyAgendaTable
              appointments={filteredAppointments}
              canCancel={canCancel}
              canWrite={canWrite}
              onCancel={setPendingCancel}
              onCheckIn={startAppointmentCheckIn}
              onEdit={editAppointment}
              onSelect={setSelectedAppointment}
            />
          ) : null}
          {activeMode === "week" ? (
            <WeeklyAgenda appointments={filteredAppointments} />
          ) : null}
          {activeMode === "checkins" ? (
            <CheckInsTable checkIns={checkIns} onConsult={(checkIn) => void consultCheckIn(checkIn)} />
          ) : null}
          {activeMode !== "checkins" && filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum agendamento encontrado</strong>
              <span>Crie um agendamento ou registre um check-in direto para iniciar a recepcao do veiculo.</span>
            </div>
          ) : null}
        </section>
        <aside className="panel agenda-side-panel" aria-label="Filtros da agenda">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Filtros</p>
              <h2>Data e busca</h2>
            </div>
          </div>
          <label className="field">
            <span>Data</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                void refreshCurrentMode(event.target.value);
              }}
            />
          </label>
          <label className="field">
            <span>Cliente ou placa</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar agenda"
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="Agendado">Agendado</option>
              <option value="Convertido">Convertido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </label>
          <button type="button" className="button-secondary" onClick={() => void refreshCurrentMode()}>
            Atualizar agenda
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={!canWriteCheckIns}
            onClick={startDirectCheckIn}
          >
            Registrar check-in direto
          </button>
          {checkInSource && canWriteCheckIns ? (
            <CheckInForm
              customers={customers}
              onCreate={async (input) => {
                await onCreateCheckIn(input);
                setCheckInSource(null);
              }}
              source={checkInSource}
              vehicles={vehicles}
            />
          ) : null}
          {selectedAppointment ? (
            <section className="agenda-detail-panel" aria-label="Detalhes do agendamento">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <p className="eyebrow">Detalhe</p>
                  <h2>{selectedAppointment.customer.name}</h2>
                </div>
                <span className={statusClassName(selectedAppointment.status)}>
                  {selectedAppointment.status}
                </span>
              </div>
              <dl className="agenda-detail-list">
                <div>
                  <dt>Horario</dt>
                  <dd>{formatAgendaDateTime(selectedAppointment.startsAt)}</dd>
                </div>
                <div>
                  <dt>Placa</dt>
                  <dd>{selectedAppointment.vehicle.plateNormalized ?? "Sem placa"}</dd>
                </div>
                <div>
                  <dt>Servico previsto</dt>
                  <dd>{selectedAppointment.expectedService}</dd>
                </div>
                <div>
                  <dt>Origem</dt>
                  <dd>{selectedAppointment.origin}</dd>
                </div>
              </dl>
            </section>
          ) : null}
          {selectedCheckIn ? (
            <CheckInDetailPanel
              checkIn={selectedCheckIn}
              onDeleteAttachment={onDeleteCheckInAttachment}
              onDownloadAttachment={onDownloadCheckInAttachment}
              onLoadAttachments={onLoadCheckInAttachments}
              onUpdate={async (input) => {
                const updated = await onUpdateCheckIn(selectedCheckIn.id, input);
                setSelectedCheckIn(updated);
              }}
              onUploadAttachment={onUploadCheckInAttachment}
            />
          ) : null}
        </aside>
      </div>
      <form className="panel agenda-form" aria-label="Agendamento" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h2>{editingAppointment ? "Editar agendamento" : "Novo agendamento"}</h2>
          </div>
          <span className="pill">API real</span>
        </div>
        <div className="form-grid form-grid--agenda">
          <label className="field">
            <span>
              Cliente
              <RequiredMark />
            </span>
            <select
              value={form.customerId}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerId: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Veiculo
              <RequiredMark />
            </span>
            <select
              value={form.vehicleId}
              onChange={(event) =>
                setForm((current) => ({ ...current, vehicleId: event.target.value }))
              }
              required
            >
              <option value="">Selecione</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {[vehicle.plate ?? "Sem placa", vehicle.brand, vehicle.model]
                    .filter(Boolean)
                    .join(" - ")}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Data e hora
              <RequiredMark />
            </span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              required
            />
          </label>
          <label className="field">
            <span>
              Servico previsto
              <RequiredMark />
            </span>
            <input
              value={form.expectedService}
              onChange={(event) =>
                setForm((current) => ({ ...current, expectedService: event.target.value }))
              }
              required
            />
          </label>
          <label className="field">
            <span>
              Origem
              <RequiredMark />
            </span>
            <input
              value={form.origin}
              onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Observacoes internas</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
        </div>
        <div className="button-row">
          <button type="submit" disabled={!canWrite || saving}>
            {saving ? "Salvando..." : "Salvar agendamento"}
          </button>
          {editingAppointment ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setEditingAppointment(null);
                setForm(emptyAppointmentForm(date, customers, vehicles));
              }}
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="callout callout--danger" role="status">
            {error}
          </p>
        ) : null}
      </form>
      {pendingCancel ? (
        <div className="confirm-strip" role="alert">
          <span>
            Confirmar cancelamento do agendamento de {pendingCancel.customer.name} para{" "}
            {formatAgendaDateTime(pendingCancel.startsAt)}? O historico permanecera auditavel.
          </span>
          <button
            type="button"
            className="button-danger"
            disabled={saving}
            onClick={() => void confirmCancel()}
          >
            Confirmar cancelamento
          </button>
        </div>
      ) : null}
    </section>
  );
}

function DailyAgendaTable({
  appointments,
  canCancel,
  canWrite,
  onCancel,
  onCheckIn,
  onEdit,
  onSelect,
}: {
  appointments: Appointment[];
  canCancel: boolean;
  canWrite: boolean;
  onCancel: (appointment: Appointment) => void;
  onCheckIn: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onSelect: (appointment: Appointment) => void;
}) {
  return (
    <div className="table-wrap agenda-table-wrap">
      <table aria-label="Agenda diaria">
        <thead>
          <tr>
            <th scope="col">Horario</th>
            <th scope="col">Cliente</th>
            <th scope="col">Veiculo</th>
            <th scope="col">Placa</th>
            <th scope="col">Servico previsto</th>
            <th scope="col">Status</th>
            <th scope="col">Origem</th>
            <th scope="col">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id} onClick={() => onSelect(appointment)}>
              <td className="numeric-cell">{formatAgendaTime(appointment.startsAt)}</td>
              <td>{appointment.customer.name}</td>
              <td>{appointment.vehicle.id}</td>
              <td>{appointment.vehicle.plateNormalized ?? "Sem placa"}</td>
              <td>{appointment.expectedService}</td>
              <td>
                <span className={statusClassName(appointment.status)}>{appointment.status}</span>
              </td>
              <td>{appointment.origin}</td>
              <td>
                <div className="table-actions">
                  {canWrite ? (
                    <button type="button" onClick={() => onCheckIn(appointment)}>
                      Fazer check-in
                    </button>
                  ) : null}
                  {canWrite ? (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => onEdit(appointment)}
                    >
                      Editar
                    </button>
                  ) : null}
                  {canCancel ? (
                    <button
                      type="button"
                      className="button-danger"
                      onClick={() => onCancel(appointment)}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckInsTable({
  checkIns,
  onConsult,
}: {
  checkIns: CheckIn[];
  onConsult: (checkIn: CheckIn) => void;
}) {
  if (checkIns.length === 0) {
    return <div className="empty-state">Nenhum check-in encontrado para os filtros atuais.</div>;
  }

  return (
    <div className="table-wrap agenda-table-wrap">
      <table aria-label="Check-ins recebidos">
        <thead>
          <tr>
            <th scope="col">Entrada</th>
            <th scope="col">Cliente</th>
            <th scope="col">Veiculo</th>
            <th scope="col">Placa</th>
            <th scope="col">Status</th>
            <th scope="col">Quilometragem</th>
            <th scope="col">Combustivel</th>
            <th scope="col">Anexos</th>
            <th scope="col">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {checkIns.map((checkIn) => (
            <tr key={checkIn.id}>
              <td>{formatAgendaDateTime(checkIn.enteredAt)}</td>
              <td>{checkIn.customer.name}</td>
              <td>{checkIn.vehicle.id}</td>
              <td>{checkIn.vehicle.plateNormalized ?? "Sem placa"}</td>
              <td>
                <span className="status-badge">{checkIn.status}</span>
              </td>
              <td>{formatMileage(checkIn.mileage)}</td>
              <td>{checkIn.fuelLevel}</td>
              <td>0</td>
              <td>
                <button type="button" onClick={() => onConsult(checkIn)}>
                  Consultar check-in
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckInForm({
  customers,
  onCreate,
  source,
  vehicles,
}: {
  customers: Customer[];
  onCreate: (input: CheckInInput) => Promise<void>;
  source: CheckInDraftSource;
  vehicles: Vehicle[];
}) {
  const sourceAppointment = source.type === "appointment" ? source.appointment : null;
  const [form, setForm] = useState(() => ({
    checklist: false,
    customerId: sourceAppointment?.customerId ?? customers[0]?.id ?? "",
    damageNotes: "",
    enteredAt: sourceAppointment
      ? toDateTimeLocalValue(sourceAppointment.startsAt)
      : toDateTimeLocalValue(new Date().toISOString()),
    fuelLevel: "",
    itemsLeft: "",
    mileage: "",
    vehicleId: sourceAppointment?.vehicleId ?? vehicles[0]?.id ?? "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const customer = customers.find((item) => item.id === form.customerId);
  const vehicle = vehicles.find((item) => item.id === form.vehicleId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (!form.checklist) {
      setError("Informe ao menos um item de checklist.");
      setSaving(false);
      return;
    }

    try {
      await onCreate({
        ...(sourceAppointment
          ? { appointmentId: sourceAppointment.id, expectedService: sourceAppointment.expectedService }
          : {}),
        checklistItems: [{ condition: "ok", label: "Lataria conferida" }],
        customerId: form.customerId,
        damageNotes: form.damageNotes,
        enteredAt: toIsoDateTime(form.enteredAt),
        fuelLevel: form.fuelLevel,
        itemsLeft: form.itemsLeft,
        mileage: toOptionalInt(form.mileage),
        vehicleId: form.vehicleId,
      });
      setForm((current) => ({
        ...current,
        checklist: false,
        damageNotes: "",
        fuelLevel: "",
        itemsLeft: "",
        mileage: "",
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel concluir o check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="agenda-detail-panel check-in-form" aria-label="Check-in de recepcao" onSubmit={submit}>
      <div className="panel-heading panel-heading--compact">
        <div>
          <p className="eyebrow">Recepcao</p>
          <h2>{sourceAppointment ? "Fazer check-in" : "Check-in direto"}</h2>
        </div>
        <span className="pill">Aguardando diagnostico</span>
      </div>
      {sourceAppointment ? (
        <p className="helper-text">
          Origem do agendamento: {formatAgendaDateTime(sourceAppointment.startsAt)}
        </p>
      ) : null}
      <label className="field">
        <span>
          Cliente
          <RequiredMark />
        </span>
        <select
          value={form.customerId}
          onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
          required
        >
          <option value="">Selecione</option>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>
          Veiculo
          <RequiredMark />
        </span>
        <select
          value={form.vehicleId}
          onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
          required
        >
          <option value="">Selecione</option>
          {vehicles.map((item) => (
            <option key={item.id} value={item.id}>
              {[item.plate ?? "Sem placa", item.brand, item.model].filter(Boolean).join(" - ")}
            </option>
          ))}
        </select>
      </label>
      <p className="helper-text">
        {[customer?.name, vehicle?.plateNormalized ?? vehicle?.plate].filter(Boolean).join(" - ")}
      </p>
      <label className="field">
        <span>
          Entrada
          <RequiredMark />
        </span>
        <input
          type="datetime-local"
          value={form.enteredAt}
          onChange={(event) => setForm((current) => ({ ...current, enteredAt: event.target.value }))}
          required
        />
      </label>
      <label className="field">
        <span>Quilometragem</span>
        <input
          inputMode="numeric"
          value={form.mileage}
          onChange={(event) => setForm((current) => ({ ...current, mileage: event.target.value }))}
        />
      </label>
      <label className="field">
        <span>
          Combustivel
          <RequiredMark />
        </span>
        <select
          value={form.fuelLevel}
          onChange={(event) => setForm((current) => ({ ...current, fuelLevel: event.target.value }))}
          required
        >
          <option value="">Selecione</option>
          {["Reserva", "1/4", "1/2", "3/4", "Cheio"].map((fuel) => (
            <option key={fuel} value={fuel}>
              {fuel}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>
          Avarias
          <RequiredMark />
        </span>
        <textarea
          value={form.damageNotes}
          onChange={(event) => setForm((current) => ({ ...current, damageNotes: event.target.value }))}
          required
        />
      </label>
      <p className="helper-text">Descreva avarias visiveis antes do diagnostico.</p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={form.checklist}
          onChange={(event) => setForm((current) => ({ ...current, checklist: event.target.checked }))}
        />
        <span>Lataria conferida</span>
      </label>
      <label className="field">
        <span>Itens deixados</span>
        <textarea
          value={form.itemsLeft}
          onChange={(event) => setForm((current) => ({ ...current, itemsLeft: event.target.value }))}
        />
      </label>
      <button type="submit" disabled={saving || customers.length === 0 || vehicles.length === 0}>
        {saving ? "Salvando..." : "Concluir check-in"}
      </button>
      {error ? (
        <p className="callout callout--danger" role="status">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CheckInDetailPanel({
  checkIn,
  onDeleteAttachment,
  onDownloadAttachment,
  onLoadAttachments,
  onUpdate,
  onUploadAttachment,
}: {
  checkIn: CheckIn;
  onDeleteAttachment: (checkInId: string, attachment: CheckInAttachment) => Promise<void>;
  onDownloadAttachment: (checkInId: string, attachment: CheckInAttachment) => Promise<void>;
  onLoadAttachments: (checkInId: string) => Promise<CheckInAttachment[]>;
  onUpdate: (input: CheckInUpdateInput) => Promise<void>;
  onUploadAttachment: (
    checkInId: string,
    input: { category: AttachmentCategory; file: File },
  ) => Promise<CheckInAttachment>;
}) {
  const [attachments, setAttachments] = useState<CheckInAttachment[]>([]);
  const [attachmentCategory, setAttachmentCategory] = useState<AttachmentCategory>("Avaria");
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPendingName, setAttachmentPendingName] = useState("");
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [form, setForm] = useState(() => editableCheckInForm(checkIn));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editableCheckInForm(checkIn));
  }, [checkIn]);

  useEffect(() => {
    let active = true;
    setAttachmentError("");
    setAttachments([]);
    setAttachmentFile(null);
    setAttachmentPendingName("");

    onLoadAttachments(checkIn.id)
      .then((items) => {
        if (active) {
          setAttachments(items);
        }
      })
      .catch((caught) => {
        if (active) {
          setAttachmentError(
            caught instanceof Error ? caught.message : "Nao foi possivel listar anexos.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [checkIn.id, onLoadAttachments]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!window.confirm("Confirmar edicao dos dados auditaveis deste check-in?")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onUpdate({
        checklistItems: checkIn.checklistItems.map((item) => ({
          condition: item.condition,
          label: item.label,
          notes: item.notes ?? null,
        })),
        damageNotes: form.damageNotes,
        fuelLevel: form.fuelLevel,
        itemsLeft: form.itemsLeft,
        mileage: toOptionalInt(form.mileage),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel salvar o checklist.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!attachmentFile) {
      setAttachmentError("Selecione um arquivo para anexar.");
      return;
    }

    setAttachmentSaving(true);
    setAttachmentError("");

    try {
      const attachment = await onUploadAttachment(checkIn.id, {
        category: attachmentCategory,
        file: attachmentFile,
      });
      setAttachments((current) => [...current, attachment]);
      setAttachmentFile(null);
      setAttachmentPendingName("");
    } catch (caught) {
      setAttachmentError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel anexar o arquivo. Tente novamente ou remova o item da lista.",
      );
    } finally {
      setAttachmentSaving(false);
    }
  }

  async function downloadAttachment(attachment: CheckInAttachment) {
    setAttachmentError("");

    try {
      await onDownloadAttachment(checkIn.id, attachment);
    } catch (caught) {
      setAttachmentError(caught instanceof Error ? caught.message : "Nao foi possivel baixar o anexo.");
    }
  }

  async function deleteAttachment(attachment: CheckInAttachment) {
    const confirmation = `Remover anexo ${attachment.originalName}? O registro sera removido deste check-in conforme permissao do servidor.`;

    if (!window.confirm(confirmation)) {
      return;
    }

    setAttachmentError("");

    try {
      await onDeleteAttachment(checkIn.id, attachment);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (caught) {
      setAttachmentError(caught instanceof Error ? caught.message : "Nao foi possivel remover o anexo.");
    }
  }

  return (
    <section className="agenda-detail-panel" aria-label="Detalhe do check-in">
      <div className="panel-heading panel-heading--compact">
        <div>
          <p className="eyebrow">Check-in</p>
          <h2>{checkIn.customer.name}</h2>
        </div>
        <span className="status-badge">{checkIn.status}</span>
      </div>
      <dl className="agenda-detail-list">
        <div>
          <dt>Entrada</dt>
          <dd>{formatAgendaDateTime(checkIn.enteredAt)}</dd>
        </div>
        <div>
          <dt>Servico</dt>
          <dd>{checkIn.appointment.expectedService}</dd>
        </div>
        <div>
          <dt>Placa</dt>
          <dd>{checkIn.vehicle.plateNormalized ?? "Sem placa"}</dd>
        </div>
        <div>
          <dt>Checklist</dt>
          <dd>{checkIn.checklistItems.map((item) => item.label).join(", ")}</dd>
        </div>
      </dl>
      <form className="check-in-edit-form" onSubmit={submit}>
        <label className="field">
          <span>Quilometragem</span>
          <input
            inputMode="numeric"
            value={form.mileage}
            onChange={(event) => setForm((current) => ({ ...current, mileage: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Combustivel</span>
          <select
            value={form.fuelLevel}
            onChange={(event) => setForm((current) => ({ ...current, fuelLevel: event.target.value }))}
          >
            {["Reserva", "1/4", "1/2", "3/4", "Cheio"].map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Avarias</span>
          <textarea
            value={form.damageNotes}
            onChange={(event) => setForm((current) => ({ ...current, damageNotes: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Itens deixados</span>
          <textarea
            value={form.itemsLeft}
            onChange={(event) => setForm((current) => ({ ...current, itemsLeft: event.target.value }))}
          />
        </label>
        <button type="submit" disabled={saving}>
          Salvar checklist
        </button>
        {error ? (
          <p className="callout callout--danger" role="status">
            {error}
          </p>
        ) : null}
      </form>
      <section className="attachment-panel" aria-label="Anexos do check-in">
        <div className="panel-heading panel-heading--compact">
          <div>
            <p className="eyebrow">Anexos</p>
            <h2>Arquivos do check-in</h2>
          </div>
          <span className="pill">{attachments.length} arquivos</span>
        </div>
        <form className="attachment-form" onSubmit={uploadAttachment}>
          <label className="field">
            <span>Tipo do anexo</span>
            <select
              value={attachmentCategory}
              onChange={(event) =>
                setAttachmentCategory(event.target.value as AttachmentCategory)
              }
            >
              {attachmentCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Arquivo do anexo</span>
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAttachmentFile(file);
                setAttachmentPendingName(file?.name ?? "");
                setAttachmentError("");
              }}
            />
          </label>
          {attachmentPendingName ? (
            <div className="attachment-row attachment-row--pending">
              <strong>{attachmentPendingName}</strong>
              <span>{attachmentCategory}</span>
              <span>{attachmentFile ? formatFileSize(attachmentFile.size) : "0 B"}</span>
              <span className="status-badge status-badge--warning">Pendente</span>
            </div>
          ) : null}
          <button type="submit" disabled={attachmentSaving || !attachmentFile}>
            {attachmentSaving ? "Anexando..." : "Anexar arquivo"}
          </button>
        </form>
        {attachments.length === 0 ? (
          <div className="empty-state empty-state--compact">
            Nenhum anexo registrado para este check-in.
          </div>
        ) : (
          <div className="attachment-list">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="attachment-row">
                <strong>{attachment.originalName}</strong>
                <span>{attachment.category}</span>
                <span>{formatFileSize(attachment.sizeBytes)}</span>
                <span className="status-badge">Enviado</span>
                <div className="table-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => void downloadAttachment(attachment)}
                  >
                    Baixar {attachment.originalName}
                  </button>
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => void deleteAttachment(attachment)}
                  >
                    Remover {attachment.originalName}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {attachmentError ? (
          <p className="callout callout--danger" role="status">
            {attachmentError}
          </p>
        ) : null}
      </section>
    </section>
  );
}

function WeeklyAgenda({ appointments }: { appointments: Appointment[] }) {
  const days = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"];

  return (
    <section className="weekly-agenda" aria-label="Agenda semanal">
      {days.map((dayName, index) => {
        const dayAppointments = appointments.filter((appointment) => {
          const day = new Date(appointment.startsAt).getUTCDay();
          return day === index + 1;
        });

        return (
          <div key={dayName} className="weekly-column">
            <h3>{dayName}</h3>
            {dayAppointments.length === 0 ? (
              <span className="helper-text">Sem agendamentos</span>
            ) : (
              dayAppointments.map((appointment) => (
                <article key={appointment.id} className="appointment-chip">
                  <strong>{formatAgendaTime(appointment.startsAt)}</strong>
                  <span>{appointment.customer.name}</span>
                  <span>{appointment.expectedService}</span>
                  <span>{appointment.vehicle.plateNormalized ?? "Sem placa"}</span>
                </article>
              ))
            )}
          </div>
        );
      })}
    </section>
  );
}

function emptyAppointmentForm(date: string, customers: Customer[], vehicles: Vehicle[]) {
  return {
    customerId: customers[0]?.id ?? "",
    expectedService: "",
    notes: "",
    origin: "Balcao",
    startsAt: `${date}T08:00`,
    vehicleId: vehicles[0]?.id ?? "",
  };
}

function compareAppointments(left: Appointment, right: Appointment): number {
  return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
}

function editableCheckInForm(checkIn: CheckIn) {
  return {
    damageNotes: checkIn.damageNotes,
    fuelLevel: checkIn.fuelLevel,
    itemsLeft: checkIn.itemsLeft ?? "",
    mileage: checkIn.mileage?.toString() ?? "",
  };
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfBusinessWeek(date: string): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatAgendaTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatAgendaDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatMileage(value: number | null): string {
  return value === null ? "Nao informado" : `${value} km`;
}

function statusClassName(status: Appointment["status"]): string {
  if (status === "Cancelado") {
    return "status-badge status-badge--danger";
  }

  if (status === "Convertido") {
    return "status-badge";
  }

  return "status-badge status-badge--warning";
}

function SettingsPanel({
  blocked,
  onUpdateSettings,
  settings,
}: {
  blocked: string | undefined;
  onUpdateSettings: (input: Partial<TenantSettings>) => Promise<void>;
  settings: TenantSettings | null;
}) {
  const [tradeName, setTradeName] = useState(settings?.tradeName ?? "");
  const [legalName, setLegalName] = useState(settings?.legalName ?? "");
  const [document, setDocument] = useState(settings?.document ?? "");

  useEffect(() => {
    setTradeName(settings?.tradeName ?? "");
    setLegalName(settings?.legalName ?? "");
    setDocument(settings?.document ?? "");
  }, [settings]);

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  return (
    <section className="panel" aria-label="Dados da oficina">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Oficina</p>
          <h2>Configuracoes da empresa</h2>
        </div>
        <span className="pill">{settings?.locale ?? "pt-BR"}</span>
      </div>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          void onUpdateSettings({ document, legalName, tradeName });
        }}
      >
        <label className="field">
          <span>
            Nome comercial
            <RequiredMark />
          </span>
          <input
            value={tradeName}
            onChange={(event) => setTradeName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Razao social</span>
          <input value={legalName} onChange={(event) => setLegalName(event.target.value)} />
        </label>
        <label className="field">
          <span>Documento</span>
          <input value={document} onChange={(event) => setDocument(event.target.value)} />
        </label>
        <button type="submit">Salvar oficina</button>
      </form>
    </section>
  );
}

type StockTab =
  "alertas" | "compras" | "fornecedores" | "movimentos" | "produtos" | "reservas" | "servicos";

function StockPanel({
  blocked,
  categories,
  movements,
  onCancelReservation,
  onCreateAdjustment,
  onCreateCategory,
  onCreateExit,
  onCreateProduct,
  onCreatePurchase,
  onCreateReservation,
  onCreateService,
  onCreateSupplier,
  onDeactivateProduct,
  onDeactivateService,
  onDeactivateSupplier,
  products,
  purchases,
  reservations,
  services,
  suppliers,
}: {
  blocked: string | undefined;
  categories: ProductCategory[];
  movements: StockMovement[];
  onCancelReservation: (reservation: StockReservation) => Promise<void>;
  onCreateAdjustment: (input: StockAdjustmentInput) => Promise<void>;
  onCreateCategory: (input: ProductCategoryInput) => Promise<void>;
  onCreateExit: (input: StockExitInput) => Promise<void>;
  onCreateProduct: (input: ProductInput) => Promise<void>;
  onCreatePurchase: (input: PurchaseInput) => Promise<void>;
  onCreateReservation: (input: StockReservationInput) => Promise<void>;
  onCreateService: (input: ServiceCatalogEntryInput) => Promise<void>;
  onCreateSupplier: (input: SupplierInput) => Promise<void>;
  onDeactivateProduct: (product: Product) => Promise<void>;
  onDeactivateService: (service: ServiceCatalogEntry) => Promise<void>;
  onDeactivateSupplier: (supplier: Supplier) => Promise<void>;
  products: Product[];
  purchases: Purchase[];
  reservations: StockReservation[];
  services: ServiceCatalogEntry[];
  suppliers: Supplier[];
}) {
  const [activeTab, setActiveTab] = useState<StockTab>("produtos");
  const [categoryForm, setCategoryForm] = useState({ description: "", name: "" });
  const [error, setError] = useState("");
  const [exitForm, setExitForm] = useState({
    origin: "",
    productId: "",
    quantity: "1",
    sourceKind: "manual",
  });
  const [pendingDeactivateProduct, setPendingDeactivateProduct] = useState<Product | null>(null);
  const [pendingDeactivateService, setPendingDeactivateService] =
    useState<ServiceCatalogEntry | null>(null);
  const [pendingDeactivateSupplier, setPendingDeactivateSupplier] = useState<Supplier | null>(null);
  const [pendingReservationCancel, setPendingReservationCancel] = useState<StockReservation | null>(
    null,
  );
  const [productForm, setProductForm] = useState({
    categoryId: "",
    costPrice: "",
    minimumStock: "0",
    name: "",
    salePrice: "",
    sku: "",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    documentNumber: "",
    productId: "",
    purchasedAt: new Date().toISOString().slice(0, 10),
    quantity: "1",
    supplierId: "",
    unitCost: "0.00",
  });
  const [reservationForm, setReservationForm] = useState({
    productId: "",
    quantity: "1",
    sourceKind: "manual",
    sourceReference: "",
  });
  const [saving, setSaving] = useState(false);
  const [serviceForm, setServiceForm] = useState({ basePrice: "0.00", description: "", name: "" });
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState({
    productId: "",
    quantityDelta: "1",
    reason: "",
    sourceKind: "manual",
  });
  const [supplierForm, setSupplierForm] = useState({
    document: "",
    name: "",
    notes: "",
    phone: "",
  });

  useEffect(() => {
    const firstCategoryId = categories[0]?.id;

    if (!productForm.categoryId && firstCategoryId) {
      setProductForm((current) => ({ ...current, categoryId: firstCategoryId }));
    }
  }, [categories, productForm.categoryId]);

  useEffect(() => {
    const firstProductId = products[0]?.id ?? "";
    const firstSupplierId = suppliers[0]?.id ?? "";

    if (!purchaseForm.productId && firstProductId) {
      setPurchaseForm((current) => ({ ...current, productId: firstProductId }));
    }
    if (!purchaseForm.supplierId && firstSupplierId) {
      setPurchaseForm((current) => ({ ...current, supplierId: firstSupplierId }));
    }
    if (!exitForm.productId && firstProductId) {
      setExitForm((current) => ({ ...current, productId: firstProductId }));
    }
    if (!stockAdjustmentForm.productId && firstProductId) {
      setStockAdjustmentForm((current) => ({ ...current, productId: firstProductId }));
    }
    if (!reservationForm.productId && firstProductId) {
      setReservationForm((current) => ({ ...current, productId: firstProductId }));
    }
  }, [
    exitForm.productId,
    products,
    purchaseForm.productId,
    purchaseForm.supplierId,
    reservationForm.productId,
    stockAdjustmentForm.productId,
    suppliers,
  ]);

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  const lowStockProducts = products.filter((product) => product.lowStock);

  async function runStockAction(action: () => Promise<void>) {
    setSaving(true);
    setError("");

    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Nao foi possivel sincronizar o estoque.",
      );
    } finally {
      setSaving(false);
    }
  }

  function productName(productId: string): string {
    return products.find((product) => product.id === productId)?.name ?? "Produto";
  }

  return (
    <section className="stock-workspace" aria-label="Estoque">
      <div className="panel stock-tabs" role="tablist" aria-label="Areas de estoque">
        {(
          [
            ["servicos", "Servicos"],
            ["produtos", "Produtos"],
            ["fornecedores", "Fornecedores"],
            ["compras", "Compras"],
            ["movimentos", "Movimentos"],
            ["reservas", "Reservas"],
            ["alertas", "Alertas"],
          ] as Array<[StockTab, string]>
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "stock-tab stock-tab--active" : "stock-tab"}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="callout callout--danger" role="status">
          {error}
        </p>
      ) : null}

      {activeTab === "servicos" ? (
        <section className="workspace-grid stock-grid" aria-label="Servicos de estoque">
          <form
            className="panel action-panel"
            aria-label="Cadastro de servico"
            onSubmit={(event) => {
              event.preventDefault();
              void runStockAction(async () => {
                await onCreateService({
                  basePrice: serviceForm.basePrice,
                  description: serviceForm.description,
                  name: serviceForm.name,
                });
                setServiceForm({ basePrice: "0.00", description: "", name: "" });
              });
            }}
          >
            <PanelTitle eyebrow="Servicos" title="Novo servico" countLabel="Catalogo" />
            <RequiredInput
              label="Nome do servico"
              value={serviceForm.name}
              onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))}
            />
            <RequiredInput
              inputMode="decimal"
              label="Preco base"
              value={serviceForm.basePrice}
              onChange={(value) => setServiceForm((current) => ({ ...current, basePrice: value }))}
            />
            <label className="field">
              <span>Descricao operacional</span>
              <input
                value={serviceForm.description}
                onChange={(event) =>
                  setServiceForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <button type="submit" disabled={saving}>
              Salvar servico
            </button>
          </form>
          <section className="panel">
            <PanelTitle
              eyebrow="Tabela"
              title="Servicos ativos"
              countLabel={`${services.length} itens`}
            />
            <TableWrap empty={services.length === 0}>
              <table aria-label="Servicos ativos">
                <thead>
                  <tr>
                    <th scope="col">Servico</th>
                    <th scope="col">Preco base</th>
                    <th scope="col">Ativo</th>
                    <th scope="col">Atualizado</th>
                    <th scope="col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>{service.name}</td>
                      <td>{formatCurrency(Number(service.basePrice))}</td>
                      <td>Ativo</td>
                      <td>{formatUpdatedAt(service.updatedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => setPendingDeactivateService(service)}
                        >
                          Desativar {service.name}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {pendingDeactivateService ? (
              <ConfirmStrip
                label={`Confirmar desativacao de ${pendingDeactivateService.name}? O registro sai das listas ativas, mas o historico permanece auditavel.`}
                buttonLabel="Desativar item"
                onConfirm={() => {
                  const service = pendingDeactivateService;
                  setPendingDeactivateService(null);
                  void runStockAction(() => onDeactivateService(service));
                }}
              />
            ) : null}
          </section>
        </section>
      ) : null}

      {activeTab === "produtos" ? (
        <section className="workspace-grid stock-grid" aria-label="Produtos">
          <div className="stock-form-stack">
            <form
              className="panel action-panel"
              aria-label="Cadastro de produto"
              onSubmit={(event) => {
                event.preventDefault();
                void runStockAction(async () => {
                  await onCreateProduct({
                    categoryId: productForm.categoryId,
                    costPrice: productForm.costPrice || null,
                    minimumStock: toOptionalInt(productForm.minimumStock) ?? 0,
                    name: productForm.name,
                    salePrice: productForm.salePrice || null,
                    sku: productForm.sku || null,
                  });
                  setProductForm((current) => ({
                    ...current,
                    costPrice: "",
                    minimumStock: "0",
                    name: "",
                    salePrice: "",
                    sku: "",
                  }));
                });
              }}
            >
              <PanelTitle eyebrow="Produtos" title="Novo produto" countLabel="Saldo atual" />
              <RequiredInput
                ariaLabel="Nome do produto *"
                label="Nome do produto"
                value={productForm.name}
                onChange={(value) => setProductForm((current) => ({ ...current, name: value }))}
              />
              <label className="field">
                <span>
                  Categoria
                  <RequiredMark />
                </span>
                <select
                  aria-label="Categoria *"
                  value={productForm.categoryId}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  required
                >
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid form-grid--split">
                <label className="field">
                  <span>SKU/Codigo</span>
                  <input
                    value={productForm.sku}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, sku: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Minimo</span>
                  <input
                    inputMode="numeric"
                    value={productForm.minimumStock}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        minimumStock: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="form-grid form-grid--split">
                <label className="field">
                  <span>Custo</span>
                  <input
                    inputMode="decimal"
                    value={productForm.costPrice}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, costPrice: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Venda</span>
                  <input
                    inputMode="decimal"
                    value={productForm.salePrice}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, salePrice: event.target.value }))
                    }
                  />
                </label>
              </div>
              <button type="submit" disabled={saving || categories.length === 0}>
                Salvar produto
              </button>
            </form>
            <form
              className="panel stock-subform"
              aria-label="Cadastro de categoria"
              onSubmit={(event) => {
                event.preventDefault();
                void runStockAction(async () => {
                  await onCreateCategory(categoryForm);
                  setCategoryForm({ description: "", name: "" });
                });
              }}
            >
              <PanelTitle eyebrow="Categoria" title="Nova categoria" countLabel="Opcional" />
              <RequiredInput
                label="Nome da categoria"
                value={categoryForm.name}
                onChange={(value) => setCategoryForm((current) => ({ ...current, name: value }))}
              />
              <button type="submit" className="button-secondary" disabled={saving}>
                Salvar categoria
              </button>
            </form>
          </div>
          <section className="panel">
            <PanelTitle
              eyebrow="Tabela"
              title="Produtos ativos"
              countLabel={`${products.length} itens`}
            />
            <form className="inline-filter" onSubmit={(event) => event.preventDefault()}>
              <label className="field">
                <span>Buscar produto</span>
                <input placeholder="Produto, SKU ou categoria" />
              </label>
              <button type="submit">Buscar produtos</button>
            </form>
            <TableWrap empty={products.length === 0}>
              <table aria-label="Produtos de estoque">
                <thead>
                  <tr>
                    <th scope="col">SKU/Codigo</th>
                    <th scope="col">Produto</th>
                    <th scope="col">Categoria</th>
                    <th scope="col">Estoque fisico</th>
                    <th scope="col">Reservado</th>
                    <th scope="col">Disponivel</th>
                    <th scope="col">Minimo</th>
                    <th scope="col">Status</th>
                    <th scope="col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.sku ?? "Sem codigo"}</td>
                      <td>{product.name}</td>
                      <td>{product.category?.name ?? "Sem categoria"}</td>
                      <td className="numeric-cell">{product.physicalQuantity}</td>
                      <td className="numeric-cell">{product.reservedQuantity}</td>
                      <td className="numeric-cell">{product.availableQuantity}</td>
                      <td className="numeric-cell">{product.minimumStock}</td>
                      <td>
                        {product.lowStock ? (
                          <span className="status-badge status-badge--warning">Estoque baixo</span>
                        ) : (
                          <span className="status-badge">Disponivel</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => setPendingDeactivateProduct(product)}
                        >
                          Desativar {product.name}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {pendingDeactivateProduct ? (
              <ConfirmStrip
                label={`Confirmar desativacao de ${pendingDeactivateProduct.name}? O registro sai das listas ativas, mas o historico permanece auditavel.`}
                buttonLabel="Desativar item"
                onConfirm={() => {
                  const product = pendingDeactivateProduct;
                  setPendingDeactivateProduct(null);
                  void runStockAction(() => onDeactivateProduct(product));
                }}
              />
            ) : null}
          </section>
        </section>
      ) : null}

      {activeTab === "fornecedores" ? (
        <section className="workspace-grid stock-grid" aria-label="Fornecedores">
          <form
            className="panel action-panel"
            aria-label="Cadastro de fornecedor"
            onSubmit={(event) => {
              event.preventDefault();
              void runStockAction(async () => {
                await onCreateSupplier(supplierForm);
                setSupplierForm({ document: "", name: "", notes: "", phone: "" });
              });
            }}
          >
            <PanelTitle eyebrow="Fornecedores" title="Novo fornecedor" countLabel="Compras" />
            <RequiredInput
              label="Nome do fornecedor"
              value={supplierForm.name}
              onChange={(value) => setSupplierForm((current) => ({ ...current, name: value }))}
            />
            <label className="field">
              <span>Documento</span>
              <input
                value={supplierForm.document}
                onChange={(event) =>
                  setSupplierForm((current) => ({ ...current, document: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                value={supplierForm.phone}
                onChange={(event) =>
                  setSupplierForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>
            <button type="submit" disabled={saving}>
              Salvar fornecedor
            </button>
          </form>
          <section className="panel">
            <PanelTitle
              eyebrow="Tabela"
              title="Fornecedores ativos"
              countLabel={`${suppliers.length} itens`}
            />
            <TableWrap empty={suppliers.length === 0}>
              <table aria-label="Fornecedores ativos">
                <thead>
                  <tr>
                    <th scope="col">Fornecedor</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Telefone</th>
                    <th scope="col">Ativo</th>
                    <th scope="col">Atualizado</th>
                    <th scope="col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>{supplier.name}</td>
                      <td>{supplier.document ?? "Sem documento"}</td>
                      <td>{supplier.phone ?? "Sem telefone"}</td>
                      <td>Ativo</td>
                      <td>{formatUpdatedAt(supplier.updatedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => setPendingDeactivateSupplier(supplier)}
                        >
                          Desativar {supplier.name}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {pendingDeactivateSupplier ? (
              <ConfirmStrip
                label={`Confirmar desativacao de ${pendingDeactivateSupplier.name}? O registro sai das listas ativas, mas o historico permanece auditavel.`}
                buttonLabel="Desativar item"
                onConfirm={() => {
                  const supplier = pendingDeactivateSupplier;
                  setPendingDeactivateSupplier(null);
                  void runStockAction(() => onDeactivateSupplier(supplier));
                }}
              />
            ) : null}
          </section>
        </section>
      ) : null}

      {activeTab === "compras" ? (
        <section className="workspace-grid stock-grid" aria-label="Compras">
          <form
            className="panel action-panel"
            aria-label="Registro de compra"
            onSubmit={(event) => {
              event.preventDefault();
              void runStockAction(() =>
                onCreatePurchase({
                  documentNumber: purchaseForm.documentNumber || null,
                  items: [
                    {
                      productId: purchaseForm.productId,
                      quantity: toPositiveInt(purchaseForm.quantity),
                      unitCost: purchaseForm.unitCost,
                    },
                  ],
                  purchasedAt: new Date(`${purchaseForm.purchasedAt}T12:00:00-03:00`).toISOString(),
                  supplierId: purchaseForm.supplierId,
                }),
              );
            }}
          >
            <PanelTitle eyebrow="Compras" title="Nova entrada" countLabel="Transacional" />
            <label className="field">
              <span>
                Fornecedor da compra
                <RequiredMark />
              </span>
              <select
                aria-label="Fornecedor da compra *"
                value={purchaseForm.supplierId}
                onChange={(event) =>
                  setPurchaseForm((current) => ({ ...current, supplierId: event.target.value }))
                }
                required
              >
                <option value="">Selecione</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Produto comprado
                <RequiredMark />
              </span>
              <select
                aria-label="Produto comprado *"
                value={purchaseForm.productId}
                onChange={(event) =>
                  setPurchaseForm((current) => ({ ...current, productId: event.target.value }))
                }
                required
              >
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <RequiredInput
              inputMode="numeric"
              label="Quantidade comprada"
              value={purchaseForm.quantity}
              onChange={(value) => setPurchaseForm((current) => ({ ...current, quantity: value }))}
            />
            <RequiredInput
              inputMode="decimal"
              label="Custo unitario"
              value={purchaseForm.unitCost}
              onChange={(value) => setPurchaseForm((current) => ({ ...current, unitCost: value }))}
            />
            <label className="field">
              <span>Data da compra</span>
              <input
                type="date"
                value={purchaseForm.purchasedAt}
                onChange={(event) =>
                  setPurchaseForm((current) => ({ ...current, purchasedAt: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Anexo do documento da compra</span>
              <input
                aria-label="Anexo do documento da compra"
                accept="application/pdf,image/*,.xml,.txt,.csv"
                type="file"
                onChange={(event) =>
                  setPurchaseForm((current) => ({
                    ...current,
                    documentNumber: event.target.files?.[0]?.name ?? "",
                  }))
                }
              />
              {purchaseForm.documentNumber ? (
                <small>Arquivo selecionado: {purchaseForm.documentNumber}</small>
              ) : null}
            </label>
            <button type="submit" disabled={saving || !products.length || !suppliers.length}>
              Registrar compra
            </button>
          </form>
          <section className="panel">
            <PanelTitle
              eyebrow="Tabela"
              title="Compras registradas"
              countLabel={`${purchases.length} itens`}
            />
            <TableWrap empty={purchases.length === 0}>
              <table aria-label="Compras registradas">
                <thead>
                  <tr>
                    <th scope="col">Compra</th>
                    <th scope="col">Fornecedor</th>
                    <th scope="col">Data</th>
                    <th scope="col">Itens</th>
                    <th scope="col">Total</th>
                    <th scope="col">Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.documentNumber ?? purchase.id}</td>
                      <td>
                        {suppliers.find((supplier) => supplier.id === purchase.supplierId)?.name ??
                          "Fornecedor"}
                      </td>
                      <td>{formatUpdatedAt(purchase.purchasedAt)}</td>
                      <td>{purchase.itemCount}</td>
                      <td>{formatCurrency(Number(purchase.totalAmount))}</td>
                      <td>Estoque atualizado pelo backend</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </section>
        </section>
      ) : null}

      {activeTab === "movimentos" ? (
        <section className="workspace-grid stock-grid" aria-label="Movimentos">
          <div className="panel action-panel stacked-forms">
            <form
              aria-label="Registro de saida"
              onSubmit={(event) => {
                event.preventDefault();
                void runStockAction(() =>
                  onCreateExit({
                    origin: exitForm.origin,
                    productId: exitForm.productId,
                    quantity: toPositiveInt(exitForm.quantity),
                    sourceKind: exitForm.sourceKind,
                    sourceLabel: exitForm.origin,
                  }),
                );
              }}
            >
              <PanelTitle eyebrow="Saida" title="Registrar retirada" countLabel="Origem" />
              <ProductSelect
                label="Produto da saida"
                products={products}
                value={exitForm.productId}
                onChange={(value) => setExitForm((current) => ({ ...current, productId: value }))}
              />
              <RequiredInput
                inputMode="numeric"
                label="Quantidade de saida"
                value={exitForm.quantity}
                onChange={(value) => setExitForm((current) => ({ ...current, quantity: value }))}
              />
              <RequiredInput
                label="Origem da saida"
                value={exitForm.origin}
                onChange={(value) => setExitForm((current) => ({ ...current, origin: value }))}
              />
              <button type="submit" disabled={saving || !products.length}>
                Registrar saida
              </button>
            </form>
            <form
              aria-label="Registro de ajuste"
              onSubmit={(event) => {
                event.preventDefault();
                void runStockAction(() =>
                  onCreateAdjustment({
                    productId: stockAdjustmentForm.productId,
                    quantityDelta: toSignedInt(stockAdjustmentForm.quantityDelta),
                    reason: stockAdjustmentForm.reason,
                    sourceKind: stockAdjustmentForm.sourceKind,
                    sourceLabel: stockAdjustmentForm.reason,
                  }),
                );
              }}
            >
              <PanelTitle eyebrow="Ajuste" title="Ajustar saldo fisico" countLabel="Motivo" />
              <ProductSelect
                label="Produto do ajuste"
                products={products}
                value={stockAdjustmentForm.productId}
                onChange={(value) =>
                  setStockAdjustmentForm((current) => ({ ...current, productId: value }))
                }
              />
              <RequiredInput
                inputMode="numeric"
                label="Diferenca do ajuste"
                value={stockAdjustmentForm.quantityDelta}
                onChange={(value) =>
                  setStockAdjustmentForm((current) => ({ ...current, quantityDelta: value }))
                }
              />
              <RequiredInput
                label="Motivo do ajuste"
                value={stockAdjustmentForm.reason}
                onChange={(value) =>
                  setStockAdjustmentForm((current) => ({ ...current, reason: value }))
                }
              />
              <p className="helper-text">
                Confirmar ajuste de estoque de {productName(stockAdjustmentForm.productId)}? Informe
                motivo operacional antes de salvar.
              </p>
              <button type="submit" disabled={saving || !products.length}>
                Registrar ajuste
              </button>
            </form>
          </div>
          <MovementTable movements={movements} products={products} />
        </section>
      ) : null}

      {activeTab === "reservas" ? (
        <section className="workspace-grid stock-grid" aria-label="Reservas">
          <form
            className="panel action-panel"
            aria-label="Registro de reserva"
            onSubmit={(event) => {
              event.preventDefault();
              void runStockAction(() =>
                onCreateReservation({
                  productId: reservationForm.productId,
                  quantity: toPositiveInt(reservationForm.quantity),
                  sourceKind: reservationForm.sourceKind,
                  sourceLabel: reservationForm.sourceReference,
                  sourceReference: reservationForm.sourceReference,
                }),
              );
            }}
          >
            <PanelTitle eyebrow="Reservas" title="Reservar peca" countLabel="Disponibilidade" />
            <ProductSelect
              label="Produto reservado"
              products={products}
              value={reservationForm.productId}
              onChange={(value) =>
                setReservationForm((current) => ({ ...current, productId: value }))
              }
            />
            <RequiredInput
              inputMode="numeric"
              label="Quantidade reservada"
              value={reservationForm.quantity}
              onChange={(value) =>
                setReservationForm((current) => ({ ...current, quantity: value }))
              }
            />
            <RequiredInput
              label="Referencia da origem"
              value={reservationForm.sourceReference}
              onChange={(value) =>
                setReservationForm((current) => ({ ...current, sourceReference: value }))
              }
            />
            <button type="submit" disabled={saving || !products.length}>
              Reservar peca
            </button>
          </form>
          <section className="panel">
            <PanelTitle
              eyebrow="Tabela"
              title="Reservas"
              countLabel={`${reservations.length} itens`}
            />
            <form className="inline-filter" onSubmit={(event) => event.preventDefault()}>
              <label className="field">
                <span>Buscar reserva</span>
                <input placeholder="Produto ou origem" />
              </label>
              <button type="submit">Buscar reservas</button>
            </form>
            <TableWrap empty={reservations.length === 0}>
              <table aria-label="Reservas de estoque">
                <thead>
                  <tr>
                    <th scope="col">Produto</th>
                    <th scope="col">Quantidade</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Status</th>
                    <th scope="col">Atualizado</th>
                    <th scope="col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>{productName(reservation.productId)}</td>
                      <td>{reservation.quantity}</td>
                      <td>
                        {reservation.sourceLabel ??
                          reservation.sourceReference ??
                          reservation.sourceKind}
                      </td>
                      <td>{reservation.status === "active" ? "Ativa" : "Cancelada"}</td>
                      <td>{formatUpdatedAt(reservation.updatedAt)}</td>
                      <td>
                        {reservation.status === "active" ? (
                          <button
                            type="button"
                            className="button-danger"
                            onClick={() => setPendingReservationCancel(reservation)}
                          >
                            Cancelar reserva de {productName(reservation.productId)}
                          </button>
                        ) : (
                          "Sem acao"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {pendingReservationCancel ? (
              <ConfirmStrip
                label={`Confirmar cancelamento da reserva de ${productName(pendingReservationCancel.productId)}? A disponibilidade sera recalculada pelo backend.`}
                buttonLabel="Confirmar cancelamento da reserva"
                onConfirm={() => {
                  const reservation = pendingReservationCancel;
                  setPendingReservationCancel(null);
                  void runStockAction(() => onCancelReservation(reservation));
                }}
              />
            ) : null}
          </section>
        </section>
      ) : null}

      {activeTab === "alertas" ? (
        <section className="panel" aria-label="Alertas de estoque">
          <PanelTitle
            eyebrow="Alertas"
            title="Estoque baixo"
            countLabel={`${lowStockProducts.length} itens`}
          />
          {lowStockProducts.length === 0 ? (
            <div className="empty-state">Nenhum item de estoque encontrado</div>
          ) : (
            <div className="alert-list">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="stock-alert-row">
                  <strong>{product.name}</strong>
                  <span>Disponivel {product.availableQuantity}</span>
                  <span>Minimo {product.minimumStock}</span>
                  <span className="status-badge status-badge--warning">Estoque baixo</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

function RequiredInput({
  ariaLabel,
  inputMode,
  label,
  onChange,
  value,
}: {
  ariaLabel?: string;
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        <RequiredMark />
      </span>
      <input
        aria-label={ariaLabel ?? `${label} *`}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function ProductSelect({
  label,
  onChange,
  products,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  products: Product[];
  value: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        <RequiredMark />
      </span>
      <select
        aria-label={`${label} *`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">Selecione</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PanelTitle({
  countLabel,
  eyebrow,
  title,
}: {
  countLabel: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span className="pill">{countLabel}</span>
    </div>
  );
}

function TableWrap({ children, empty }: { children: ReactNode; empty: boolean }) {
  if (empty) {
    return (
      <div className="empty-state">
        <strong>Nenhum item de estoque encontrado</strong>
        <span>
          Cadastre produtos, fornecedores ou compras para iniciar o controle transacional do
          estoque.
        </span>
      </div>
    );
  }

  return <div className="table-wrap">{children}</div>;
}

function ConfirmStrip({
  buttonLabel,
  label,
  onConfirm,
}: {
  buttonLabel: string;
  label: string;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-strip" role="alert">
      <span>{label}</span>
      <button type="button" className="button-danger" onClick={onConfirm}>
        {buttonLabel}
      </button>
    </div>
  );
}

function MovementTable({
  movements,
  products,
}: {
  movements: StockMovement[];
  products: Product[];
}) {
  return (
    <section className="panel">
      <PanelTitle
        eyebrow="Historico"
        title="Movimentos"
        countLabel={`${movements.length} linhas`}
      />
      <form className="inline-filter" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span>Buscar movimento</span>
          <input placeholder="Produto, tipo ou origem" />
        </label>
        <button type="submit">Buscar movimentos</button>
      </form>
      <TableWrap empty={movements.length === 0}>
        <table aria-label="Historico de movimentos">
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Produto</th>
              <th scope="col">Tipo</th>
              <th scope="col">Quantidade</th>
              <th scope="col">Origem</th>
              <th scope="col">Usuario</th>
              <th scope="col">Saldo apos</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{formatUpdatedAt(movement.createdAt)}</td>
                <td>
                  {products.find((product) => product.id === movement.productId)?.name ?? "Produto"}
                </td>
                <td>{movement.type}</td>
                <td>{movement.quantityDelta}</td>
                <td>{movement.sourceLabel ?? movement.sourceKind}</td>
                <td>Backend</td>
                <td>
                  Fisico {movement.balanceAfterPhysical} / Reservado {movement.balanceAfterReserved}{" "}
                  / Disponivel {movement.balanceAfterAvailable}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}

function toPositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function toSignedInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : 1;
}

function UsersPanel({
  blocked,
  onCreateUser,
  roles,
  users,
}: {
  blocked: string | undefined;
  onCreateUser: (input: {
    email: string;
    name: string;
    password: string;
    roleIds?: string[];
  }) => Promise<void>;
  roles: Role[];
  users: AdminUser[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  return (
    <section className="workspace-grid" aria-label="Administracao de usuarios">
      <form
        className="panel action-panel"
        aria-label="Criar usuario"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreateUser({ email, name, password, roleIds: roleId ? [roleId] : [] });
        }}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Usuarios</p>
            <h2>Novo usuario</h2>
          </div>
          <span className="pill">Tenant</span>
        </div>
        <label className="field">
          <span>
            Nome do usuario
            <RequiredMark />
          </span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="field">
          <span>
            Email do usuario
            <RequiredMark />
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>
            Senha temporaria
            <RequiredMark />
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Papel inicial</span>
          <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            <option value="">Sem papel</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Criar usuario</button>
      </form>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Lista</p>
            <h2>Usuarios</h2>
          </div>
          <span className="pill">{users.length} itens</span>
        </div>
        <div className="table-wrap">
          <table aria-label="Usuarios cadastrados">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Papeis</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="status-badge">{user.status}</span>
                  </td>
                  <td>{user.roles.map((role) => role.name).join(", ") || "Sem papel"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function RolesPanel({
  blocked,
  onCreateRole,
  permissions,
  roles,
}: {
  blocked: string | undefined;
  onCreateRole: (input: {
    description?: string;
    key: string;
    name: string;
    permissionKeys: string[];
  }) => Promise<void>;
  permissions: Permission[];
  roles: Role[];
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [permissionKey, setPermissionKey] = useState("");

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  return (
    <section className="workspace-grid" aria-label="Administracao de papeis">
      <form
        className="panel action-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreateRole({ key, name, permissionKeys: permissionKey ? [permissionKey] : [] });
        }}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Papeis</p>
            <h2>Novo papel</h2>
          </div>
          <span className="pill">Permissoes</span>
        </div>
        <label className="field">
          <span>
            Chave do papel
            <RequiredMark />
          </span>
          <input value={key} onChange={(event) => setKey(event.target.value)} required />
        </label>
        <label className="field">
          <span>
            Nome do papel
            <RequiredMark />
          </span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="field">
          <span>Permissao inicial</span>
          <select value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)}>
            <option value="">Sem permissao</option>
            {permissions.map((permission) => (
              <option key={permission.key} value={permission.key}>
                {permission.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Criar papel</button>
      </form>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Catalogo</p>
            <h2>Papeis</h2>
          </div>
          <span className="pill">{roles.length} itens</span>
        </div>
        <div className="table-wrap">
          <table aria-label="Papeis cadastrados">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Chave</th>
                <th scope="col">Sistema</th>
                <th scope="col">Permissoes</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.key}</td>
                  <td>{role.isSystem ? "Sim" : "Nao"}</td>
                  <td>{role.permissions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function PermissionsPanel({
  blocked,
  onUpdateOverrides,
  permissions,
  users,
}: {
  blocked: string | undefined;
  onUpdateOverrides: (userId: string, overrides: PermissionOverride[]) => Promise<void>;
  permissions: Permission[];
  users: AdminUser[];
}) {
  const [userId, setUserId] = useState("");
  const [permissionKey, setPermissionKey] = useState("");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  return (
    <section className="workspace-grid" aria-label="Administracao de permissoes">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Catalogo</p>
            <h2>Permissoes</h2>
          </div>
          <span className="pill">{permissions.length} itens</span>
        </div>
        <div className="table-wrap">
          <table aria-label="Catalogo de permissoes">
            <thead>
              <tr>
                <th scope="col">Chave</th>
                <th scope="col">Nome</th>
                <th scope="col">Descricao</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.key}>
                  <td>{permission.key}</td>
                  <td>{permission.name}</td>
                  <td>{permission.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <form
        className="panel action-panel"
        aria-label="Overrides de usuario"
        onSubmit={(event) => {
          event.preventDefault();
          if (userId && permissionKey) {
            void onUpdateOverrides(userId, [
              { effect, permissionKey, reason: "Ajuste administrativo" },
            ]);
          }
        }}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Overrides</p>
            <h2>Permissao especifica</h2>
          </div>
          <span className="pill">Deny vence allow</span>
        </div>
        <label className="field">
          <span>Usuario</span>
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            <option value="">Selecione</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Permissao</span>
          <select value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)}>
            <option value="">Selecione</option>
            {permissions.map((permission) => (
              <option key={permission.key} value={permission.key}>
                {permission.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Efeito</span>
          <select
            value={effect}
            onChange={(event) => setEffect(event.target.value as "allow" | "deny")}
          >
            <option value="allow">Permitir</option>
            <option value="deny">Bloquear</option>
          </select>
        </label>
        <button type="submit">Salvar override</button>
      </form>
    </section>
  );
}

function SecurityPanel({
  onChangePassword,
  session,
}: {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  session: StoredSession;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");

  return (
    <section className="workspace-grid workspace-grid--auth" aria-label="Seguranca da conta">
      <form
        className="panel action-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void onChangePassword(currentPassword, newPassword)
            .then(() => setMessage("Senha alterada para esta conta."))
            .catch((error: unknown) =>
              setMessage(
                error instanceof Error ? error.message : "Nao foi possivel alterar a senha.",
              ),
            );
        }}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Senha</p>
            <h2>Alterar senha</h2>
          </div>
          <span className="pill">Sessao ativa</span>
        </div>
        <label className="field">
          <span>
            Senha atual
            <RequiredMark />
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>
            Nova senha autenticada
            <RequiredMark />
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit">Alterar senha</button>
        {message ? (
          <p
            className={message.startsWith("Senha") ? "callout" : "callout callout--danger"}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>
      <StatusPanel
        message={`Usuario ${session.user.email}. Sessao ${session.sessionId}. Criada para tenant ${session.tenantId}.`}
      />
    </section>
  );
}

function CustomersPanel({
  blocked,
  customers,
  history,
  onCreateCustomer,
  onDeleteCustomer,
  onLoadHistory,
  onSearch,
  onUpdateCustomer,
}: {
  blocked: string | undefined;
  customers: Customer[];
  history: CustomerHistoryEvent[];
  onCreateCustomer: (input: CustomerInput) => Promise<void>;
  onDeleteCustomer: (customer: Customer) => Promise<void>;
  onLoadHistory: (customerId: string) => Promise<void>;
  onSearch: (search: string) => Promise<void>;
  onUpdateCustomer: (customerId: string, input: CustomerInput) => Promise<void>;
}) {
  const emptyForm = { document: "", email: "", name: "", notes: "", phone: "" };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  function edit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      document: customer.document ?? "",
      email: customer.email ?? "",
      name: customer.name,
      notes: customer.notes ?? "",
      phone: customer.phone ?? "",
    });
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await onUpdateCustomer(editingId, form);
      } else {
        await onCreateCustomer(form);
      }

      setEditingId(null);
      setForm(emptyForm);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel salvar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-grid customer-vehicle-grid" aria-label="Clientes">
      <form className="panel action-panel" aria-label="Cadastro de cliente" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Clientes</p>
            <h2>{editingId ? "Editar cliente" : "Novo cliente"}</h2>
          </div>
          <span className="pill">Telefone pode repetir</span>
        </div>
        <label className="field">
          <span>
            Nome do cliente
            <RequiredMark />
          </span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Documento CPF/CNPJ</span>
          <input
            value={form.document}
            onChange={(event) =>
              setForm((current) => ({ ...current, document: event.target.value }))
            }
            placeholder="CPF, CNPJ numerico ou CNPJ alfanumerico"
          />
        </label>
        <label className="field">
          <span>Telefone</span>
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Email operacional</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Observacoes internas</span>
          <input
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
        <div className="button-row">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar cliente"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setError("");
              }}
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="callout callout--danger" role="status">
            {error}
          </p>
        ) : null}
        <p className="helper-text">
          Documento ativo duplicado e rejeitado pelo backend; telefone repetido permanece permitido.
        </p>
      </form>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Busca</p>
            <h2>Clientes ativos</h2>
          </div>
          <span className="pill">{customers.length} itens</span>
        </div>
        <form
          className="inline-filter"
          onSubmit={(event) => {
            event.preventDefault();
            void onSearch(search);
          }}
        >
          <label className="field">
            <span>Buscar cliente</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, telefone ou documento"
            />
          </label>
          <button type="submit">Buscar clientes</button>
        </form>
        {customers.length === 0 ? (
          <div className="empty-state">Nenhum cliente ativo encontrado.</div>
        ) : (
          <div className="table-wrap">
            <table aria-label="Clientes ativos">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Telefone</th>
                  <th scope="col">Atualizado</th>
                  <th scope="col">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.document ?? "Sem documento"}</td>
                    <td>{customer.phone ?? "Sem telefone"}</td>
                    <td>{formatUpdatedAt(customer.updatedAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => edit(customer)}
                        >
                          Editar {customer.name}
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => void onLoadHistory(customer.id)}
                        >
                          Historico de {customer.name}
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => setPendingDelete(customer)}
                        >
                          Excluir {customer.name}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pendingDelete ? (
          <div className="confirm-strip" role="alert">
            <span>Confirmar exclusao logica de {pendingDelete.name}?</span>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                const customer = pendingDelete;
                setPendingDelete(null);
                void onDeleteCustomer(customer);
              }}
            >
              Confirmar exclusao de {pendingDelete.name}
            </button>
          </div>
        ) : null}
        <HistoryList history={history} label="Historico do cliente" />
      </section>
    </section>
  );
}

function VehiclesPanel({
  blocked,
  customers,
  history,
  onCreateVehicle,
  onDeleteVehicle,
  onLoadHistory,
  onSearch,
  onUpdateVehicle,
  vehicles,
}: {
  blocked: string | undefined;
  customers: Customer[];
  history: VehicleHistoryEvent[];
  onCreateVehicle: (input: VehicleInput) => Promise<void>;
  onDeleteVehicle: (vehicle: Vehicle) => Promise<void>;
  onLoadHistory: (vehicleId: string) => Promise<void>;
  onSearch: (search: string) => Promise<void>;
  onUpdateVehicle: (vehicleId: string, input: VehicleInput) => Promise<void>;
  vehicles: Vehicle[];
}) {
  const emptyForm = {
    brand: "",
    color: "",
    customerId: customers[0]?.id ?? "",
    mileage: "",
    model: "",
    notes: "",
    plate: "",
    vin: "",
    year: "",
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const firstCustomerId = customers[0]?.id;

    if (!form.customerId && firstCustomerId) {
      setForm((current) => ({ ...current, customerId: firstCustomerId }));
    }
  }, [customers, form.customerId]);

  if (blocked) {
    return <BlockedPanel message={blocked} />;
  }

  function edit(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm({
      brand: vehicle.brand ?? "",
      color: vehicle.color ?? "",
      customerId: vehicle.customerId,
      mileage: vehicle.mileage?.toString() ?? "",
      model: vehicle.model ?? "",
      notes: vehicle.notes ?? "",
      plate: vehicle.plate ?? "",
      vin: vehicle.vin ?? "",
      year: vehicle.year?.toString() ?? "",
    });
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const input: VehicleInput = {
      brand: form.brand,
      color: form.color,
      customerId: form.customerId,
      mileage: toOptionalInt(form.mileage),
      model: form.model,
      notes: form.notes,
      plate: form.plate,
      vin: form.vin,
      year: toOptionalInt(form.year),
    };

    try {
      if (editingId) {
        await onUpdateVehicle(editingId, input);
      } else {
        await onCreateVehicle(input);
      }

      setEditingId(null);
      setForm({ ...emptyForm, customerId: customers[0]?.id ?? "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel salvar o veiculo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-grid customer-vehicle-grid" aria-label="Veiculos">
      <form className="panel action-panel" aria-label="Cadastro de veiculo" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Veiculos</p>
            <h2>{editingId ? "Editar veiculo" : "Novo veiculo"}</h2>
          </div>
          <span className="pill">Vinculo atual</span>
        </div>
        <label className="field">
          <span>
            Cliente atual
            <RequiredMark />
          </span>
          <select
            value={form.customerId}
            onChange={(event) =>
              setForm((current) => ({ ...current, customerId: event.target.value }))
            }
            required
          >
            <option value="">Selecione</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Placa</span>
          <input
            placeholder="Placa ou identificador"
            value={form.plate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                plate: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span>Marca</span>
          <input
            value={form.brand}
            onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Modelo</span>
          <input
            value={form.model}
            onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Cor</span>
          <input
            value={form.color}
            onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Chassi/VIN</span>
          <input
            placeholder="Chassi, VIN ou identificador"
            value={form.vin}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                vin: event.target.value,
              }))
            }
          />
        </label>
        <div className="form-grid form-grid--split">
          <label className="field">
            <span>Ano</span>
            <input
              inputMode="numeric"
              value={form.year}
              onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Quilometragem</span>
            <input
              inputMode="numeric"
              value={form.mileage}
              onChange={(event) =>
                setForm((current) => ({ ...current, mileage: event.target.value }))
              }
            />
          </label>
        </div>
        <label className="field">
          <span>Observacoes internas</span>
          <input
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
        <div className="button-row">
          <button type="submit" disabled={saving || customers.length === 0}>
            {saving ? "Salvando..." : "Salvar veiculo"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ ...emptyForm, customerId: customers[0]?.id ?? "" });
                setError("");
              }}
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="callout callout--danger" role="status">
            {error}
          </p>
        ) : null}
        <p className="helper-text">
          Veiculo fica vinculado ao cliente selecionado; demais campos podem ser preenchidos depois.
        </p>
      </form>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Busca</p>
            <h2>Veiculos ativos</h2>
          </div>
          <span className="pill">{vehicles.length} itens</span>
        </div>
        <form
          className="inline-filter"
          onSubmit={(event) => {
            event.preventDefault();
            void onSearch(search);
          }}
        >
          <label className="field">
            <span>Buscar veiculo</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Placa, chassi ou cliente"
            />
          </label>
          <button type="submit">Buscar veiculos</button>
        </form>
        {vehicles.length === 0 ? (
          <div className="empty-state">Nenhum veiculo ativo encontrado.</div>
        ) : (
          <div className="table-wrap">
            <table aria-label="Veiculos ativos">
              <thead>
                <tr>
                  <th scope="col">Placa</th>
                  <th scope="col">Cliente atual</th>
                  <th scope="col">Veiculo</th>
                  <th scope="col">Chassi</th>
                  <th scope="col">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.plate ?? "Sem placa"}</td>
                    <td>{vehicle.customer?.name ?? "Sem cliente"}</td>
                    <td>
                      {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
                    </td>
                    <td>{vehicle.vin ?? "Sem chassi"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => edit(vehicle)}
                        >
                          Editar {vehicle.plate ?? "veiculo sem placa"}
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => void onLoadHistory(vehicle.id)}
                        >
                          Historico de {vehicle.plate ?? "veiculo sem placa"}
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => setPendingDelete(vehicle)}
                        >
                          Excluir {vehicle.plate ?? "veiculo sem placa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pendingDelete ? (
          <div className="confirm-strip" role="alert">
            <span>Confirmar exclusao logica de {pendingDelete.plate ?? "veiculo sem placa"}?</span>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                const vehicle = pendingDelete;
                setPendingDelete(null);
                void onDeleteVehicle(vehicle);
              }}
            >
              Confirmar exclusao de {pendingDelete.plate ?? "veiculo sem placa"}
            </button>
          </div>
        ) : null}
        <HistoryList history={history} label="Historico do veiculo" />
      </section>
    </section>
  );
}

function HistoryList({
  history,
  label,
}: {
  history: Array<{ createdAt: string; id: string; summary: string; type: string }>;
  label: string;
}) {
  return (
    <section className="history-panel" aria-label={label}>
      <div className="panel-heading panel-heading--compact">
        <div>
          <p className="eyebrow">Historico</p>
          <h2>{label}</h2>
        </div>
        <span className="pill">{history.length} linhas</span>
      </div>
      {history.length === 0 ? (
        <div className="empty-state empty-state--compact">Selecione uma linha para consultar.</div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-row">
              <span>{formatUpdatedAt(item.createdAt)}</span>
              <strong>{item.summary}</strong>
              <span>{item.type}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <section className="panel state-card">
      <span className="state-token state-token--info">Estado</span>
      <p>{message}</p>
    </section>
  );
}

function BlockedPanel({ message }: { message: string }) {
  return (
    <section className="panel empty-state empty-state--danger">
      <strong>Acesso bloqueado</strong>
      <span>{message}</span>
    </section>
  );
}

export function formatUpdatedAt(value: string | undefined): string {
  return value ? formatDateTime(value) : "Nao sincronizado";
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const sizeKb = Math.round(sizeBytes / 1024);

  if (sizeKb < 1024) {
    return `${sizeKb} KB`;
  }

  return `${(sizeKb / 1024).toFixed(1)} MB`;
}

function triggerAttachmentDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function toOptionalInt(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function isAccessTokenExpiring(accessToken: string): boolean {
  try {
    const parts = accessToken.split(".");

    if (parts.length !== 3) {
      return false;
    }

    const [, payload] = parts;

    if (!payload) {
      return false;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as { exp?: number };

    if (!decodedPayload.exp) {
      return true;
    }

    return decodedPayload.exp * 1000 - Date.now() < 60_000;
  } catch {
    return false;
  }
}
