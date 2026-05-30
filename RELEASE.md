# 发布流程

## 打版本标签触发自动构建

每次推送符合 `v*.*.*` 格式的 git tag，GitHub Actions 会自动构建 Docker 镜像并推送到 ghcr.io。

### 发布新版本

```bash
# 1. 确保代码已提交
git add .
git commit -m "feat: your changes"

# 2. 打版本标签（语义化版本）
git tag v1.0.0

# 3. 推送代码和标签
git push origin main
git push origin v1.0.0
```

### 镜像标签规则

| Git Tag | Docker 镜像标签 |
|---------|----------------|
| v1.2.3  | 1.2.3, 1.2, 1, latest |
| v2.0.0  | 2.0.0, 2.0, 2, latest |

### 拉取镜像

```bash
# 最新版本
docker pull ghcr.io/<your-org>/aimili-vpngate:latest

# 指定版本
docker pull ghcr.io/<your-org>/aimili-vpngate:1.2.3
```

### 使用 docker-compose 指定版本

```yaml
services:
  aimilivpn:
    image: ghcr.io/<your-org>/aimili-vpngate:latest  # 或指定版本如 1.2.3
    network_mode: host
    ...
```
