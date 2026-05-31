import {
  Activity,
  CheckCircle2,
  Gauge,
  Globe2,
  KeyRound,
  Loader2,
  LogOut,
  PlugZap,
  Power,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  Shield,
  Wifi,
  X,
  XCircle,
  Zap
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiState = {
  active_openvpn_node_id?: string;
  active_node_latency?: string;
  api_url?: string;
  check_interval_seconds?: number;
  fetch_interval_seconds?: number;
  is_connecting?: boolean;
  last_check_message?: string;
  last_fetch_message?: string;
  last_fetch_status?: string;
  local_proxy?: string;
  port?: number;
  proxy_error?: string;
  proxy_ip?: string;
  proxy_latency_ms?: number;
  proxy_ok?: boolean;
  preferred_country?: string;
  preferred_node_type?: string;
  secret_path?: string;
  target_valid_nodes?: number;
  username?: string;
  valid_nodes?: number;
};

type NodeItem = {
  id: string;
  active?: boolean;
  as_name?: string;
  asn?: string;
  country?: string;
  country_short?: string;
  host_name?: string;
  ip?: string;
  ip_type?: string;
  latency_ms?: number;
  location?: string;
  owner?: string;
  ping?: number;
  probe_message?: string;
  probe_status?: "available" | "unavailable" | "not_checked" | string;
  proto?: string;
  quality?: string;
  remote_host?: string;
  remote_port?: number;
  score?: number;
  sessions?: number;
  speed?: number;
};

type NodesResponse = {
  nodes: NodeItem[];
  state: ApiState;
};

type Notice = {
  type: "success" | "error" | "info";
  text: string;
};

const PAGE_SIZE = 24;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`./api/${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : response.statusText;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

function formatSpeed(value?: number) {
  if (!value) return "-";
  return `${((value * 8) / 1000 / 1000).toFixed(1)} Mbps`;
}

function formatLatency(value?: number) {
  if (!value) return "-";
  return `${value} ms`;
}

function statusLabel(node: NodeItem) {
  if (node.active) return "已连接";
  if (node.probe_status === "available") return "可用";
  if (node.probe_status === "unavailable") return "不可用";
  return "待检测";
}

function statusClass(node: NodeItem) {
  if (node.active) return "status active";
  if (node.probe_status === "available") return "status available";
  if (node.probe_status === "unavailable") return "status unavailable";
  return "status pending";
}

function qualityLabel(value?: string) {
  if (!value) return "-";
  if (value === "residential" || value === "normal") return "住宅";
  if (value === "hosting" || value === "datacenter") return "机房";
  if (value === "mobile") return "移动";
  if (value === "proxy") return "代理";
  return value;
}

function nodeEndpoint(node?: NodeItem) {
  if (!node) return "";
  const host = node.ip || node.remote_host;
  const port = node.remote_port;
  if (host && port) return `${host}:${port}`;
  return host || node.id;
}

function sortNodes(nodes: NodeItem[]) {
  return [...nodes].sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    const statusRank = (n: NodeItem) =>
      n.probe_status === "available" ? 0 : n.probe_status === "not_checked" ? 1 : 2;
    const statusDelta = statusRank(a) - statusRank(b);
    if (statusDelta !== 0) return statusDelta;
    const latencyA = a.latency_ms && a.latency_ms > 0 ? a.latency_ms : 999999;
    const latencyB = b.latency_ms && b.latency_ms > 0 ? b.latency_ms : 999999;
    if (latencyA !== latencyB) return latencyA - latencyB;
    return (b.score || 0) - (a.score || 0);
  });
}

function LoginView({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestJson<{ ok: boolean }>("login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand-mark">
          <Shield size={30} />
        </div>
        <h1>micromatrix-vpn</h1>
        <label>
          <span>账号</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-action" type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
          登录
        </button>
      </form>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <section className={`stat-card ${tone || ""}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </section>
  );
}

function SettingsDialog({
  state,
  onClose,
  onNotice
}: {
  state: ApiState;
  onClose: () => void;
  onNotice: (notice: Notice) => void;
}) {
  const [port, setPort] = useState(String(state.port || 8787));
  const [secretPath, setSecretPath] = useState(state.secret_path || "");
  const [preferredCountry, setPreferredCountry] = useState(state.preferred_country || "");
  const [preferredNodeType, setPreferredNodeType] = useState(state.preferred_node_type || "");
  const [currentUsername, setCurrentUsername] = useState(state.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await requestJson<{ ok: boolean; message?: string; restart_required?: boolean }>("update_settings", {
        method: "POST",
        body: JSON.stringify({
          curr_username: currentUsername,
          curr_password: currentPassword,
          port,
          secret_path: secretPath,
          preferred_country: preferredCountry,
          preferred_node_type: preferredNodeType,
          new_username: newUsername,
          new_password: newPassword
        })
      });
      onNotice({ type: "success", text: result.message || "配置已保存" });
      onClose();
    } catch (err) {
      onNotice({ type: "error", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="settings-dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div>
            <h2>管理设置</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="settings-grid">
          <label>
            <span>管理端口</span>
            <input value={port} onChange={(event) => setPort(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            <span>安全路径</span>
            <input value={secretPath} onChange={(event) => setSecretPath(event.target.value)} />
          </label>
          <label>
            <span>偏好地区</span>
            <input value={preferredCountry} onChange={(event) => setPreferredCountry(event.target.value)} />
          </label>
          <label>
            <span>偏好类型</span>
            <select value={preferredNodeType} onChange={(event) => setPreferredNodeType(event.target.value)}>
              <option value="">不限类型</option>
              <option value="residential">住宅</option>
              <option value="proxy">代理</option>
              <option value="hosting">机房</option>
              <option value="mobile">移动</option>
            </select>
          </label>
          <label>
            <span>当前账号</span>
            <input value={currentUsername} onChange={(event) => setCurrentUsername(event.target.value)} />
          </label>
          <label>
            <span>当前密码</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label>
            <span>新账号</span>
            <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} />
          </label>
          <label>
            <span>新密码</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            保存
          </button>
        </div>
      </form>
    </div>
  );
}

export function App() {
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [state, setState] = useState<ApiState>({});
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("all");
  const [nodeType, setNodeType] = useState("all");
  const [page, setPage] = useState(1);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function load(silent = false) {
    try {
      const data = await requestJson<NodesResponse>("nodes");
      setNodes(data.nodes || []);
      setState(data.state || {});
      setAuthenticated(true);
      if (!silent) setNotice(null);
    } catch (err) {
      if ((err as Error & { status?: number }).status === 401) {
        setAuthenticated(false);
      } else if (!silent) {
        setNotice({ type: "error", text: err instanceof Error ? err.message : "加载失败" });
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setInterval(() => {
      load(true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [authenticated]);

  const countries = useMemo(
    () => Array.from(new Set(nodes.map((node) => node.country).filter(Boolean))).sort() as string[],
    [nodes]
  );

  const nodeTypes = useMemo(() => {
    const values = Array.from(new Set(nodes.map((node) => node.ip_type || node.quality).filter(Boolean))) as string[];
    return values.sort((a, b) => qualityLabel(a).localeCompare(qualityLabel(b), "zh-CN"));
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortNodes(nodes).filter((node) => {
      const typeValue = node.ip_type || node.quality || "";
      const matchesQuery =
        !needle ||
        [node.id, node.country, node.ip, node.remote_host, node.owner, node.location, node.as_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesCountry = country === "all" || node.country === country;
      const matchesStatus =
        status === "all" ||
        (status === "active" && node.active) ||
        (status !== "active" && node.probe_status === status);
      const matchesType = nodeType === "all" || typeValue === nodeType;
      return matchesQuery && matchesCountry && matchesStatus && matchesType;
    });
  }, [country, nodeType, nodes, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / PAGE_SIZE));
  const visibleNodes = filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeNode = nodes.find((node) => node.active || node.id === state.active_openvpn_node_id);
  const availableCount = nodes.filter((node) => node.probe_status === "available").length;

  useEffect(() => {
    setPage(1);
  }, [query, country, status, nodeType]);

  async function runAction(name: string, action: () => Promise<void>) {
    setBusyAction(name);
    try {
      await action();
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "操作失败" });
    } finally {
      setBusyAction(null);
    }
  }

  async function connectNode(id: string) {
    await runAction(`connect:${id}`, async () => {
      await requestJson("connect", { method: "POST", body: JSON.stringify({ id }) });
      await load(true);
      setNotice({ type: "success", text: "切换请求已提交" });
    });
  }

  async function testNode(id: string) {
    setTestingIds((current) => new Set(current).add(id));
    try {
      const result = await requestJson<{ node: NodeItem }>("test_node", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      setNodes((current) => current.map((node) => (node.id === id ? result.node : node)));
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "检测失败" });
    } finally {
      setTestingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function testCurrentPage() {
    const ids = visibleNodes.map((node) => node.id);
    if (!ids.length) return;

    await runAction("test-page", async () => {
      setTestingIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.add(id));
        return next;
      });

      try {
        const result = await requestJson<{ nodes: NodeItem[] }>("test_nodes", {
          method: "POST",
          body: JSON.stringify({ ids })
        });
        const updates = new Map<string, NodeItem>();
        (result.nodes || []).forEach((node) => updates.set(node.id, node));
        setNodes((current) => current.map((node) => updates.get(node.id) || node));
        setNotice({ type: "success", text: `当前页检测完成：${updates.size} 个节点` });
      } finally {
        setTestingIds((current) => {
          const next = new Set(current);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    });
  }

  async function logout() {
    await runAction("logout", async () => {
      await requestJson("logout", { method: "POST" });
      setAuthenticated(false);
    });
  }

  if (authenticated === null) {
    return (
      <main className="loading-page">
        <Loader2 className="spin" size={28} />
      </main>
    );
  }

  if (!authenticated) {
    return <LoginView onLoggedIn={() => load()} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-line">
          <div className="brand-symbol">
            <Shield size={24} />
          </div>
          <div>
            <h1>micromatrix-vpn</h1>
          </div>
        </div>
        <div className="toolbar">
          <button className="icon-text-button" onClick={() => load()} disabled={busyAction !== null}>
            <RefreshCw size={17} className={busyAction ? "spin" : ""} />
            刷新
          </button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="设置">
            <Settings size={18} />
          </button>
          <button className="icon-button" onClick={logout} aria-label="退出登录">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice ? (
        <div className={`notice ${notice.type}`}>
          <span>{notice.text}</span>
          <button className="icon-button compact" onClick={() => setNotice(null)} aria-label="关闭提示">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <section className="status-grid">
        <StatCard
          icon={state.is_connecting ? <Loader2 className="spin" size={22} /> : <Activity size={22} />}
          label="连接状态"
          value={state.is_connecting ? "切换中" : activeNode ? "已连接" : "未连接"}
          tone={activeNode ? "good" : state.is_connecting ? "warn" : "bad"}
        />
        <StatCard icon={<Server size={22} />} label="节点总数" value={`${nodes.length}`} />
        <StatCard icon={<CheckCircle2 size={22} />} label="可用节点" value={`${availableCount}`} tone="good" />
        <StatCard
          icon={state.proxy_ok ? <Wifi size={22} /> : <XCircle size={22} />}
          label="代理出口"
          value={state.proxy_ok ? state.proxy_ip || "可用" : state.proxy_error || "未就绪"}
          tone={state.proxy_ok ? "good" : "bad"}
        />
      </section>

      <section className="active-panel">
        <div>
          <span className="eyebrow">活动节点</span>
          <h2>{nodeEndpoint(activeNode) || "无活动连接"}</h2>
          <p>{state.last_check_message || activeNode?.probe_message || "等待节点状态更新"}</p>
        </div>
        <div className="active-meta">
          <span>
            <Globe2 size={16} />
            {activeNode?.country || "-"}
          </span>
          <span>
            <Gauge size={16} />
            {state.active_node_latency || formatLatency(activeNode?.latency_ms)}
          </span>
          <span>
            <PlugZap size={16} />
            {state.proxy_latency_ms ? `${state.proxy_latency_ms} ms` : "-"}
          </span>
        </div>
        <div className="action-row">
          <button
            className="secondary-action"
            onClick={() => runAction("refresh", async () => requestJson("refresh_nodes", { method: "POST" }))}
          >
            <RefreshCw size={17} />
            更新节点
          </button>
          <button
            className="secondary-action"
            onClick={() => runAction("check", async () => {
              await requestJson("check", { method: "POST" });
              await load(true);
            })}
          >
            <Zap size={17} />
            重新筛选
          </button>
          <button
            className="secondary-action"
            onClick={() => runAction("proxy", async () => {
              await requestJson("test_proxy", { method: "POST" });
              await load(true);
            })}
          >
            <Wifi size={17} />
            检测代理
          </button>
          <button
            className="danger-action"
            disabled={!activeNode}
            onClick={() => runAction("disconnect", async () => {
              await requestJson("disconnect", { method: "POST" });
              await load(true);
            })}
          >
            <Power size={17} />
            断开
          </button>
        </div>
      </section>

      <section className="nodes-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">节点池</span>
            <h2>{filteredNodes.length} 个节点</h2>
          </div>
          <div className="filters">
            <label className="search-box">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索节点" />
            </label>
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="all">全部地区</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">全部状态</option>
              <option value="active">已连接</option>
              <option value="available">可用</option>
              <option value="not_checked">待检测</option>
              <option value="unavailable">不可用</option>
            </select>
            <select value={nodeType} onChange={(event) => setNodeType(event.target.value)}>
              <option value="all">全部类型</option>
              {nodeTypes.map((item) => (
                <option key={item} value={item}>
                  {qualityLabel(item)}
                </option>
              ))}
            </select>
            <button
              className="secondary-action filter-action"
              onClick={testCurrentPage}
              disabled={busyAction !== null || visibleNodes.length === 0}
            >
              {busyAction === "test-page" ? <Loader2 className="spin" size={15} /> : <Activity size={15} />}
              检测本页
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>状态</th>
                <th>地区 / IP</th>
                <th>延迟</th>
                <th>速度</th>
                <th>类型</th>
                <th>运营商</th>
                <th>协议</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleNodes.map((node) => {
                const testing = testingIds.has(node.id);
                const connecting = busyAction === `connect:${node.id}`;
                return (
                  <tr key={node.id}>
                    <td>
                      <span className={statusClass(node)}>{statusLabel(node)}</span>
                    </td>
                    <td>
                      <strong>{node.country || "-"}</strong>
                      <span className="muted">{node.ip || node.remote_host || node.id}</span>
                    </td>
                    <td>{formatLatency(node.latency_ms || node.ping)}</td>
                    <td>{formatSpeed(node.speed)}</td>
                    <td>{qualityLabel(node.ip_type || node.quality)}</td>
                    <td>
                      <span>{node.owner || node.as_name || "-"}</span>
                      <span className="muted">{node.location || node.asn || ""}</span>
                    </td>
                    <td>{node.proto || "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="ghost-action" onClick={() => testNode(node.id)} disabled={testing}>
                          {testing ? <Loader2 className="spin" size={15} /> : <Activity size={15} />}
                          检测
                        </button>
                        <button
                          className="primary-action compact-action"
                          disabled={node.active || node.probe_status === "unavailable" || connecting || state.is_connecting}
                          onClick={() => connectNode(node.id)}
                        >
                          {connecting ? <Loader2 className="spin" size={15} /> : <PlugZap size={15} />}
                          {node.active ? "已连接" : "切换"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button className="secondary-action" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="secondary-action"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            下一页
          </button>
        </div>
      </section>

      {settingsOpen ? (
        <SettingsDialog state={state} onClose={() => setSettingsOpen(false)} onNotice={setNotice} />
      ) : null}
    </main>
  );
}
