import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrowserRouter, useNavigate } from "react-router";

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
  clearStoredSession,
  hasPermission,
  readStoredSession,
  storeSession,
  type StoredSession,
} from "./auth/session.js";
import { formatDateTime } from "./design/formatters.js";

type View = "oficina" | "usuarios" | "papeis" | "permissoes" | "seguranca";
type BootState = "loading" | "bootstrap" | "login" | "admin" | "error";

type AdminData = {
  permissions: Permission[];
  roles: Role[];
  settings: TenantSettings | null;
  users: AdminUser[];
};

type BlockedState = Partial<Record<"settings" | "users" | "roles" | "permissions", string>>;

const initialAdminData: AdminData = {
  permissions: [],
  roles: [],
  settings: null,
  users: [],
};

export function App() {
  return (
    <BrowserRouter>
      <AuthAdminApp />
    </BrowserRouter>
  );
}

function AuthAdminApp() {
  const navigate = useNavigate();
  const [bootState, setBootState] = useState<BootState>("loading");
  const [session, setSession] = useState<StoredSession | null>(() => readStoredSession());
  const [activeView, setActiveView] = useState<View>("oficina");
  const [adminData, setAdminData] = useState<AdminData>(initialAdminData);
  const [blocked, setBlocked] = useState<BlockedState>({});
  const [statusMessage, setStatusMessage] = useState("Sincronizando estado de acesso.");

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const status = await getBootstrapStatus();

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
          setStatusMessage("Entre com uma conta ativa da oficina.");
          navigate("/login", { replace: true });
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
    await Promise.all([
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
    ]);
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
        <AuthWorkspace onLogin={handleLogin} setStatusMessage={setStatusMessage} />
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
          onCreateUser={async (input) => {
            const user = await createUser(session.accessToken, input);
            setAdminData((current) => ({ ...current, users: [...current.users, user] }));
            setStatusMessage("Usuario criado no tenant autenticado.");
          }}
          onLogout={handleLogout}
          onRefresh={() => loadAdminData(session)}
          onSelectView={selectView}
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
  onLogin,
  setStatusMessage,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  setStatusMessage: (message: string) => void;
}) {
  const [showRecovery, setShowRecovery] = useState(false);

  return (
    <section className="auth-flow" aria-label="Acesso operacional">
      <LoginPanel onLogin={onLogin} onRequestAccess={() => setShowRecovery(true)} />
      {showRecovery ? <ResetPanel setStatusMessage={setStatusMessage} /> : null}
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
    <form className="panel action-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Acesso</p>
          <h2>Entrar no JO.IA</h2>
        </div>
        <span className="pill">Sessao</span>
      </div>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? "Entrando..." : "Entrar"}
      </button>
      <button type="button" className="link-button" onClick={onRequestAccess}>
        Recuperar acesso
      </button>
    </form>
  );
}

function ResetPanel({ setStatusMessage }: { setStatusMessage: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestPasswordReset(email);
    setStatusMessage("Se o email existir, o codigo foi registrado para recuperacao.");
  }

  async function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await completePasswordReset({ code, email, newPassword });
    setStatusMessage("Senha redefinida. Entre com a nova senha.");
    setCode("");
    setNewPassword("");
  }

  return (
    <section className="panel" aria-label="Recuperacao de senha">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Senha</p>
          <h2>Recuperacao de acesso</h2>
        </div>
      </div>
      <p className="helper-text">Use apenas para contas ja cadastradas na oficina.</p>
      <div className="stacked-forms">
        <form onSubmit={handleRequest}>
          <label className="field">
            <span>Email cadastrado</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <button type="submit">Solicitar codigo</button>
        </form>
        <form onSubmit={handleComplete}>
          <label className="field">
            <span>Codigo de recuperacao</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              required
            />
          </label>
          <label className="field">
            <span>Nova senha</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit">Concluir redefinicao</button>
        </form>
      </div>
    </section>
  );
}

function AdminShell(props: {
  activeView: View;
  adminData: AdminData;
  blocked: BlockedState;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectView: (view: View) => void;
  onUpdateOverrides: (userId: string, overrides: PermissionOverride[]) => Promise<void>;
  onUpdateSettings: (input: Partial<TenantSettings>) => Promise<void>;
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
