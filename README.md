# micromatrix-vpn 🌐

Bilingual: [中文](#中文) | [English](#english)

---

## 中文


---

**micromatrix-vpn** 是一个专为 Linux VPS 设计的智能 VPN 代理网关管理器。它能够自动采集 VPNGate 开放节点，进行多线程可用性测试与延迟过滤，利用 OpenVPN 隧道与策略路由（Policy Routing）实现出站网络，并在本地提供高性能的 HTTP/SOCKS5 代理网关服务，适合用作 Xray / 3x-ui 的落地出站代理。

---

### 🚀 快速开始

推荐使用 Docker Compose 部署：

```bash
cp .env.example .env
# 编辑 .env，设置 UI_USERNAME / UI_PASSWORD / UI_SECRET_PATH
docker compose up -d --build
```

`.env` 中可以配置管理后台账号、密码和安全路径：

* `UI_USERNAME`：管理后台账号
* `UI_PASSWORD`：管理后台密码
* `UI_SECRET_PATH`：管理后台安全路径，只能使用英文字母和数字
* `UI_HOST` / `UI_PORT`：管理后台监听地址和端口
* `UI_BIND_HOST`：宿主机上的 Web 端口绑定地址，VPS 公开访问可用 `0.0.0.0`，仅本机访问可用 `127.0.0.1`
* `LOCAL_PROXY_BIND_HOST`：宿主机上的代理端口绑定地址，默认 `127.0.0.1`
* `TARGET_VALID_NODES`：维护线程至少筛选出的可用 OpenVPN 节点数量，不足时会继续检测后续候选节点
* `NODE_TEST_BATCH_SIZE`：每轮维护至少检测的候选节点数量，默认 `24`，与前端默认每页数量一致
* `PREFERRED_COUNTRY`：当前节点失效自动切换时优先匹配的地区，可填 `日本` / `JP`；留空则不限制地区
* `PREFERRED_NODE_TYPE`：自动切换时优先匹配的节点类型，支持 `residential` / `proxy` / `hosting` / `mobile`，也支持 `住宅` / `代理` / `机房` / `移动`

设置了这些环境变量后，容器启动时会同步写入 `./vpn_data/ui_auth.json`。如果之后修改 `.env`，重启容器即可生效；`.env` 中的值优先于 Web UI 中保存的同名配置。

当当前 OpenVPN 节点失效或代理出口检测失败时，系统会从已检测可用的 OpenVPN 节点中自动切换。设置偏好后会优先选择同时匹配地区和节点类型的节点，然后按延迟最低排序；不设置偏好时默认选择延迟最低的可用节点。

默认服务地址：

* Web 管理后台：`http://localhost:8787/<安全路径>/` 或 `http://<VPS-IP>:8787/<安全路径>/`
* 本地 HTTP/SOCKS5 代理：`127.0.0.1:7928`

常用管理命令：

```bash
docker compose logs -f
docker compose up -d --build
docker compose down
```

Docker 部署需要 Linux 主机提供 `/dev/net/tun`，并授予容器 `NET_ADMIN` 权限；仓库中的 `docker-compose.yml` 已包含这些配置。

### 🧩 项目结构

* `server/vpngate_manager.py`：Python API、OpenVPN 节点管理、Web 静态文件服务
* `server/proxy_server.py`：HTTP/SOCKS5 本地代理网关
* `server/vpn_utils.py`：节点解析、延迟检测、IP 信息补充
* `frontend/`：Vite + React 静态 SPA，构建产物由 Python 服务托管

前端本地构建：

```bash
cd frontend
pnpm install
pnpm build
```

---

### ⚙️ 系统架构

```
   [ 3x-ui / Xray ] 
         │ (HTTP / SOCKS5)
         ▼
   [ 本地代理服务器 ] (Port 7928) ──(强制绑定 SO_BINDTODEVICE)──► [ tun0 虚拟网卡 ]
         │                                                            │
         │ (SSH, Web UI, etc. 依然走物理路由)                           │ (策略路由表 100)
         ▼                                                            ▼
   [ 物理网卡 eth0 ] ◄───────────────────────────────────────── [ OpenVPN 加密隧道 ]
         │                                                            │
         ▼ (真实服务器 IP 出站)                                         ▼ (VPNGate 落地节点出站)
    (国内直连流量)                                               (解锁流媒体、锁区网站)
```

## 参考
https://raw.githubusercontent.com/baoweise-bot/aimili-vpngate

---

## English


---

**micromatrix-vpn** is an intelligent VPN proxy gateway manager designed for Linux VPS hosts. It automatically collects open VPNGate nodes, conducts multi-threaded availability testing and latency filtering, establishes secure out-of-band routing via OpenVPN and policy routing to **prevent VPS lockouts**, and hosts a high-performance local SOCKS5/HTTP proxy gateway. It is highly optimized to serve as a residential/unlocked egress node for upstream proxies like 3x-ui / Xray.

### ✨ Key Features

1. ⚡ **Auto-Collection & Multi-Threaded Probing**:
   * Periodically fetches candidate nodes from VPNGate.
   * Performs concurrent ping latency and handshake tests to maintain a pool of high-quality nodes.
2. 🔒 **Anti-Lockout Routing (Policy Routing)**:
   * Directs traffic from the virtual adapter `tun0` to a customized routing table (Table 100) without altering the system's default gateway.
   * Keeps SSH sessions and server administration panels unaffected by the active VPN.
3. 🚫 **Fail-Safe Leak Protection**:
   * Outbound socket connections inside the local proxy server are strictly bound to `tun0` via `SO_BINDTODEVICE`.
   * If the VPN disconnects, proxy requests are instantly blocked with a `502 Bad Gateway` instead of falling back to the VPS physical IP address.
4. 🖥️ **Modern Web UI Panel**:
   * Sleek dark/light responsive console (default port `8787`).
   * Provides real-time geolocation, ISP, ASN, latency, and IP-type (residential/datacenter) detection.
   * Enables manual node selection, proxy speed-testing, and logs query.
   * Secured by a random secret path suffix (e.g., `/EJsW2EeBo9lY/`) and password authentication.

---

### 🚀 Quick Start

Docker Compose is the recommended deployment method:

```bash
cp .env.example .env
# Edit .env and set UI_USERNAME / UI_PASSWORD / UI_SECRET_PATH
docker compose up -d --build
```

The Web UI credentials and secret path can be configured in `.env`:

* `UI_USERNAME`: Web console username
* `UI_PASSWORD`: Web console password
* `UI_SECRET_PATH`: Web console secret path, letters and numbers only
* `UI_HOST` / `UI_PORT`: Web console bind host and port
* `UI_BIND_HOST`: host-side Web port bind address. Use `0.0.0.0` for public VPS access or `127.0.0.1` for local-only access
* `LOCAL_PROXY_BIND_HOST`: host-side proxy port bind address, defaults to `127.0.0.1`
* `TARGET_VALID_NODES`: minimum number of tested available OpenVPN nodes to keep for auto-switching; the service keeps probing candidates until this target is reached or candidates run out
* `NODE_TEST_BATCH_SIZE`: minimum number of fresh candidates to test per maintenance run, defaults to `24` to match the default UI page size
* `PREFERRED_COUNTRY`: preferred country for auto-switching when the active node fails, for example `Japan` or `JP`; leave empty for no country preference
* `PREFERRED_NODE_TYPE`: preferred node type for auto-switching. Supported values are `residential`, `proxy`, `hosting`, and `mobile`

These environment values are synced into `./vpn_data/ui_auth.json` when the container starts. Restart the container after editing `.env`; values from `.env` take precedence over matching settings saved from the Web UI.

When the active OpenVPN node fails or the proxy health check fails, the service switches to another tested OpenVPN node automatically. With preferences configured, nodes matching both the country and type are selected first, then the lowest latency wins; without preferences, the default strategy is lowest-latency available node.

Default endpoints:

* Web console: `http://localhost:8787/<secret-path>/` or `http://<VPS-IP>:8787/<secret-path>/`
* Local HTTP/SOCKS5 proxy: `127.0.0.1:7928`

Common management commands:

```bash
docker compose logs -f
docker compose up -d --build
docker compose down
```

Docker deployment requires a Linux host with `/dev/net/tun` and `NET_ADMIN` privileges for the container. The provided `docker-compose.yml` already includes these settings.

### 🧩 Project Structure

* `server/vpngate_manager.py`: Python API, OpenVPN node management, and static Web serving
* `server/proxy_server.py`: local HTTP/SOCKS5 proxy gateway
* `server/vpn_utils.py`: node parsing, latency checks, and IP metadata enrichment
* `frontend/`: Vite + React static SPA served by the Python process

Build the frontend locally:

```bash
cd frontend
pnpm install
pnpm build
```

## Refer
https://raw.githubusercontent.com/baoweise-bot/aimili-vpngate
