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

COPY vpngate_manager.py proxy_server.py vpn_utils.py ./

# Data directory for persistent storage (nodes, config, logs, auth)
RUN mkdir -p /data

ENV VPNGATE_DATA_DIR=/data
ENV LOCAL_PROXY_HOST=127.0.0.1
ENV LOCAL_PROXY_PORT=7928
ENV UI_HOST=0.0.0.0
ENV UI_PORT=8787
ENV UI_USERNAME=
ENV UI_PASSWORD=
ENV UI_SECRET_PATH=

CMD ["python3", "vpngate_manager.py"]
