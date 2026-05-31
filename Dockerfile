FROM node:22-bookworm-slim AS frontend

WORKDIR /app/frontend

RUN corepack enable

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -q && \
    apt-get install -y \
        openvpn \
        curl \
        git \
        ca-certificates \
        iptables \
        iproute2 \
        psmisc \
        python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/micromatrix-vpn

COPY server/ ./server/
COPY --from=frontend /app/frontend/dist ./frontend_dist

# Data directory for persistent storage (nodes, config, logs, auth)
RUN mkdir -p /data

ENV VPNGATE_DATA_DIR=/data
ENV FRONTEND_DIST_DIR=/opt/micromatrix-vpn/frontend_dist
ENV LOCAL_PROXY_HOST=127.0.0.1
ENV LOCAL_PROXY_PORT=7928
ENV UI_HOST=0.0.0.0
ENV UI_PORT=8787
ENV UI_USERNAME=
ENV UI_PASSWORD=
ENV UI_SECRET_PATH=
ENV PREFERRED_COUNTRY=
ENV PREFERRED_NODE_TYPE=

CMD ["python3", "server/vpngate_manager.py"]
