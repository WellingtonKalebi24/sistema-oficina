import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { formatDateTime } from "./design/formatters.js";

type View = "clientes" | "oficina" | "papeis" | "permissoes" | "seguranca" | "usuarios" | "veiculos";
type BootState = "loading" | "bootstrap" | "login" | "admin" | "error";

type AdminData = {
  customerHistory: CustomerHistoryEvent[];
  customers: Customer[];
  permissions: Permission[];
  roles: Role[];
  settings: TenantSettings | null;
  users: AdminUser[];
  vehicleHistory: VehicleHistoryEvent[];
  vehicles: Vehicle[];
};

type BlockedState = Partial<
  Record<"customers" | "permissions" | "roles" | "settings" | "users" | "vehicles", string>
>;

const initialAdminData: AdminData = {
  customerHistory: [],
  customers: [],
  permissions: [],
  roles: [],
  settings: null,
  users: [],
  vehicleHistory: [],
  vehicles: [],
};

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

        const stored = readStoredSession();

        if (stored) {
          setSession(stored);
          setBootState("admin");
          setStatusMessage("Sessao recuperada deste navegador.");
          navigate("/admin/oficina", { replace: true });
          await loadAdminData(stored);
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
      } catch {
        if (!active) {
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
  }, [navigate]);

  async function loadAdminData(currentSession: StoredSession = session as StoredSession) {
    if (!currentSession) {
      return;
    }

    setBlocked({});
    const loads: Array<Promise<void>> = [
      loadResource(
        "settings",
        () => getTenantSettings(currentSession.accessToken),
        (settings) => setAdminData((current) => ({ ...current, settings })),
      ),
      loadResource(
        "users",
        () => listUsers(currentSession.accessToken),
        (users) => setAdminData((current) => ({ ...current, users })),
      ),
      loadResource(
        "roles",
        () => listRoles(currentSession.accessToken),
        (roles) => setAdminData((current) => ({ ...current, roles })),
      ),
      loadResource(
        "permissions",
        () => listPermissions(currentSession.accessToken),
        (permissions) => setAdminData((current) => ({ ...current, permissions })),
      ),
    ];

    if (hasPermission(currentSession, "customers.read")) {
      loads.push(
        loadResource(
          "customers",
          () => listCustomers(currentSession.accessToken),
          (customers) => setAdminData((current) => ({ ...current, customers })),
        ),
      );
    }

    if (hasPermission(currentSession, "vehicles.read")) {
      loads.push(
        loadResource(
          "vehicles",
          () => listVehicles(currentSession.accessToken),
          (vehicles) => setAdminData((current) => ({ ...current, vehicles })),
        ),
      );
    }

    await Promise.all(loads);
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

      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar dados.");
    }
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
            await changePassword(session.accessToken, { currentPassword, newPassword });
            setStatusMessage("Senha alterada para esta conta.");
          }}
          onCreateRole={async (input) => {
            const role = await createRole(session.accessToken, input);
            setAdminData((current) => ({ ...current, roles: [...current.roles, role] }));
            setStatusMessage("Papel registrado para este tenant.");
          }}
          onCreateCustomer={async (input) => {
            const customer = await createCustomer(session.accessToken, input);
            setAdminData((current) => ({
              ...current,
              customers: [...current.customers, customer].sort((left, right) =>
                left.name.localeCompare(right.name),
              ),
            }));
            setStatusMessage("Cliente registrado no tenant autenticado.");
          }}
          onCreateUser={async (input) => {
            const user = await createUser(session.accessToken, input);
            setAdminData((current) => ({ ...current, users: [...current.users, user] }));
            setStatusMessage("Usuario criado no tenant autenticado.");
          }}
          onCreateVehicle={async (input) => {
            const vehicle = await createVehicle(session.accessToken, input);
            setAdminData((current) => ({
              ...current,
              vehicles: [...current.vehicles, vehicle].sort((left, right) =>
                left.plateNormalized.localeCompare(right.plateNormalized),
              ),
            }));
            setStatusMessage("Veiculo registrado e vinculado ao cliente atual.");
          }}
          onDeleteCustomer={async (customer) => {
            await deleteCustomer(session.accessToken, customer.id);
            setAdminData((current) => ({
              ...current,
              customers: current.customers.filter((item) => item.id !== customer.id),
            }));
            setStatusMessage("Cliente excluido logicamente da lista ativa.");
          }}
          onDeleteVehicle={async (vehicle) => {
            await deleteVehicle(session.accessToken, vehicle.id);
            setAdminData((current) => ({
              ...current,
              vehicles: current.vehicles.filter((item) => item.id !== vehicle.id),
            }));
            setStatusMessage("Veiculo excluido logicamente da lista ativa.");
          }}
          onLoadCustomerHistory={async (customerId) => {
            const customerHistory = await listCustomerHistory(session.accessToken, customerId);
            setAdminData((current) => ({ ...current, customerHistory }));
            setStatusMessage("Historico basico do cliente sincronizado.");
          }}
          onLoadVehicleHistory={async (vehicleId) => {
            const vehicleHistory = await listVehicleHistory(session.accessToken, vehicleId);
            setAdminData((current) => ({ ...current, vehicleHistory }));
            setStatusMessage("Historico basico do veiculo sincronizado.");
          }}
          onLogout={handleLogout}
          onRefresh={() => loadAdminData(session)}
          onSearchCustomers={async (search) => {
            const customers = await listCustomers(session.accessToken, { search });
            setAdminData((current) => ({ ...current, customers }));
            setStatusMessage("Busca de clientes sincronizada com a API.");
          }}
          onSearchVehicles={async (search) => {
            const vehicles = await listVehicles(session.accessToken, { search });
            setAdminData((current) => ({ ...current, vehicles }));
            setStatusMessage("Busca de veiculos sincronizada com a API.");
          }}
          onSelectView={selectView}
          onUpdateCustomer={async (customerId, input) => {
            const customer = await updateCustomer(session.accessToken, customerId, input);
            setAdminData((current) => ({
              ...current,
              customers: current.customers.map((item) => (item.id === customer.id ? customer : item)),
            }));
            setStatusMessage("Cliente atualizado pelo backend.");
          }}
          onUpdateOverrides={async (userId, overrides) => {
            const user = await replacePermissionOverrides(session.accessToken, userId, overrides);
            setAdminData((current) => ({
              ...current,
              users: current.users.map((item) => (item.id === user.id ? user : item)),
            }));
            setStatusMessage("Overrides atualizados com autoridade do backend.");
          }}
          onUpdateSettings={async (input) => {
            const settings = await updateTenantSettings(session.accessToken, input);
            setAdminData((current) => ({ ...current, settings }));
            setStatusMessage("Configuracoes da oficina atualizadas.");
          }}
          onUpdateVehicle={async (vehicleId, input) => {
            const vehicle = await updateVehicle(session.accessToken, vehicleId, input);
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
          <span>Nome da oficina</span>
          <input
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Nome do administrador</span>
          <input
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Email do administrador</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Senha inicial</span>
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
            <span>Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Label>
          <Label className="field">
            <span>Senha</span>
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
              <span>Email cadastrado</span>
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
              <span>Codigo de recuperacao</span>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                required
              />
            </Label>
            <Label className="field">
              <span>Nova senha</span>
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
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
  onDeleteCustomer: (customer: Customer) => Promise<void>;
  onDeleteVehicle: (vehicle: Vehicle) => Promise<void>;
  onLoadCustomerHistory: (customerId: string) => Promise<void>;
  onLoadVehicleHistory: (vehicleId: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSearchCustomers: (search: string) => Promise<void>;
  onSearchVehicles: (search: string) => Promise<void>;
  onSelectView: (view: View) => void;
  onUpdateCustomer: (customerId: string, input: CustomerInput) => Promise<void>;
  onUpdateOverrides: (userId: string, overrides: PermissionOverride[]) => Promise<void>;
  onUpdateSettings: (input: Partial<TenantSettings>) => Promise<void>;
  onUpdateVehicle: (vehicleId: string, input: VehicleInput) => Promise<void>;
  session: StoredSession;
  statusMessage: string;
}) {
  const menuItems = useMemo(
    () =>
      [
        { label: "Oficina", permission: "tenant.settings.read", view: "oficina" as const },
        { label: "Usuarios", permission: "users.read", view: "usuarios" as const },
        { label: "Papeis", permission: "roles.manage", view: "papeis" as const },
        { label: "Permissoes", permission: "permissions.manage", view: "permissoes" as const },
        { label: "Clientes", permission: "customers.read", view: "clientes" as const },
        { label: "Veiculos", permission: "vehicles.read", view: "veiculos" as const },
      ].filter((item) => hasPermission(props.session, item.permission)),
    [props.session],
  );

  return (
    <>
      <section className="admin-layout" aria-label="Administracao operacional">
        <aside className="panel side-panel">
          <nav className="nav-list" aria-label="Administracao">
            {menuItems.map((item) => (
              <button
                key={item.view}
                type="button"
                className={
                  props.activeView === item.view ? "nav-item nav-item--active" : "nav-item"
                }
                onClick={() => props.onSelectView(item.view)}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className={
                props.activeView === "seguranca" ? "nav-item nav-item--active" : "nav-item"
              }
              onClick={() => props.onSelectView("seguranca")}
            >
              Seguranca
            </button>
          </nav>
          <button type="button" className="button-secondary full-width" onClick={props.onRefresh}>
            Atualizar
          </button>
          <button
            type="button"
            className="button-danger full-width"
            onClick={() => void props.onLogout()}
          >
            Sair
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
          {props.activeView === "seguranca" ? (
            <SecurityPanel onChangePassword={props.onChangePassword} session={props.session} />
          ) : null}
        </section>
      </section>
    </>
  );
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
          <span>Nome comercial</span>
          <input value={tradeName} onChange={(event) => setTradeName(event.target.value)} />
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
          <span>Nome do usuario</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>Email do usuario</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span>Senha temporaria</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          <span>Chave do papel</span>
          <input value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
        <label className="field">
          <span>Nome do papel</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
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
          <span>Senha atual</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Nova senha autenticada</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
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
          <span>Nome do cliente</span>
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
      plate: vehicle.plate,
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
      mileage: form.mileage ? Number(form.mileage) : null,
      model: form.model,
      notes: form.notes,
      plate: form.plate,
      vin: form.vin,
      year: form.year ? Number(form.year) : null,
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
          <span>Cliente atual</span>
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
            value={form.plate}
            onChange={(event) => setForm((current) => ({ ...current, plate: event.target.value }))}
            required
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
            value={form.vin}
            onChange={(event) => setForm((current) => ({ ...current, vin: event.target.value }))}
          />
        </label>
        <div className="form-grid form-grid--split">
          <label className="field">
            <span>Ano</span>
            <input
              inputMode="numeric"
              value={form.year}
              onChange={(event) =>
                setForm((current) => ({ ...current, year: event.target.value }))
              }
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
          Placa e chassi ativos duplicados sao bloqueados pelo backend.
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
                    <td>{vehicle.plate}</td>
                    <td>{vehicle.customer?.name ?? "Sem cliente"}</td>
                    <td>{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ")}</td>
                    <td>{vehicle.vin ?? "Sem chassi"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => edit(vehicle)}
                        >
                          Editar {vehicle.plate}
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => void onLoadHistory(vehicle.id)}
                        >
                          Historico de {vehicle.plate}
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => setPendingDelete(vehicle)}
                        >
                          Excluir {vehicle.plate}
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
            <span>Confirmar exclusao logica de {pendingDelete.plate}?</span>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                const vehicle = pendingDelete;
                setPendingDelete(null);
                void onDeleteVehicle(vehicle);
              }}
            >
              Confirmar exclusao de {pendingDelete.plate}
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
