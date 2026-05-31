# micromatrix-vpn 🌐

Bilingual: [中文](#中文) | [English](#english)

---

## 中文

[![Telegram](https://img.shields.io/badge/TG交流群-arestemple-2CA5E0?style=flat-square&logo=telegram&logoColor=white)](https://t.me/arestemple)
[![Forum](https://img.shields.io/badge/交流论坛-339936.xyz-orange?style=flat-square&logo=discourse&logoColor=white)](https://339936.xyz)
[![YouTube](https://img.shields.io/badge/视频教程-YouTube-red?style=flat-square&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=s-ATfXR8BpI)
[![Email](https://img.shields.io/badge/Bug反馈-yaohunse7@gmail.com-red?style=flat-square&logo=gmail&logoColor=white)](mailto:yaohunse7@gmail.com)


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

设置了这些环境变量后，容器启动时会同步写入 `./vpn_data/ui_auth.json`。如果之后修改 `.env`，重启容器即可生效；`.env` 中的值优先于 Web UI 中保存的同名配置。

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

* `vpngate_manager.py`：Python API、OpenVPN 节点管理、Web 静态文件服务
* `proxy_server.py`：HTTP/SOCKS5 本地代理网关
* `vpn_utils.py`：节点解析、延迟检测、IP 信息补充
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

---

## English

[![Telegram](https://img.shields.io/badge/Telegram-arestemple-2CA5E0?style=flat-square&logo=telegram&logoColor=white)](https://t.me/arestemple)
[![Forum](https://img.shields.io/badge/Forum-339936.xyz-orange?style=flat-square&logo=discourse&logoColor=white)](https://339936.xyz)
[![Email](https://img.shields.io/badge/Bug%20Report-yaohunse7@gmail.com-red?style=flat-square&logo=gmail&logoColor=white)](mailto:yaohunse7@gmail.com)

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

These environment values are synced into `./vpn_data/ui_auth.json` when the container starts. Restart the container after editing `.env`; values from `.env` take precedence over matching settings saved from the Web UI.

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

* `vpngate_manager.py`: Python API, OpenVPN node management, and static Web serving
* `proxy_server.py`: local HTTP/SOCKS5 proxy gateway
* `vpn_utils.py`: node parsing, latency checks, and IP metadata enrichment
* `frontend/`: Vite + React static SPA served by the Python process

Build the frontend locally:

```bash
cd frontend
pnpm install
pnpm build
```
