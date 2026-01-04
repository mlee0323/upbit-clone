#!/bin/bash
# 우분투 24.04 + K8s v1.31 + Tailscale 초기화 스크립트

set -e # 에러 발생 시 즉시 중단

echo "=== [1/6] 시스템 업데이트 및 필수 패키지 설치 ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git apt-transport-https openssh-server chrony socat conntrack

# SSH 및 시간 동기화 설정
sudo systemctl enable --now chrony
sudo systemctl enable --now ssh
sudo ufw allow ssh

echo "=== [2/6] Tailscale 설치 및 로그인 ==="
curl -fsSL https://tailscale.com/install.sh | sh

echo "----------------------------------------------------------------"
echo "⚠️  중요: 아래 명령어가 실행되면 링크를 클릭해서 Tailscale에 로그인해주세요."
echo "   로그인이 완료되면 'Success' 메시지가 뜹니다."
echo "----------------------------------------------------------------"
sudo tailscale up

echo "=== [3/6] Containerd (도커 런타임) 설치 ==="
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
# SystemdCgroup 활성화 (K8s 필수)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
sudo systemctl restart containerd

echo "=== [4/6] Kubernetes (v1.31) 패키지 설치 ==="
sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg --yes
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

echo "=== [5/6] 커널 모듈 및 네트워크 설정 ==="
# 모듈 로드 설정
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# 커널 파라미터 설정 (IPv4 포워딩 필수)
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system

# 스왑 끄기 (영구)
sudo swapoff -a
sudo sed -i '/swap/ s/^/#/' /etc/fstab

echo "=== [6/6] Kubelet Tailscale IP 바인딩 ==="
# Tailscale IP 가져오기 (위에서 로그인을 했으므로 가져올 수 있음)
TS_IP=$(tailscale ip -4)

if [ -z "$TS_IP" ]; then
    echo "❌ Tailscale IP를 가져오지 못했습니다. 로그인이 제대로 되었는지 확인하세요."
    exit 1
else
    echo "✅ 감지된 Tailscale IP: $TS_IP"
    echo "KUBELET_EXTRA_ARGS=\"--node-ip=$TS_IP\"" | sudo tee /etc/default/kubelet
fi

sudo systemctl daemon-reload
sudo systemctl restart kubelet

echo "========================================================"
echo "🎉 모든 설치가 완료되었습니다!"
echo "   Node IP: $TS_IP"
echo ""
echo "   이제 마스터 노드(master)에서 아래 명령어를 실행해 토큰을 얻은 뒤,"
echo "   이 노드에서 붙여넣으세요:"
echo "   kubeadm token create --print-join-command"
echo "========================================================"
