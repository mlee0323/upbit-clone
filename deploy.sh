#!/bin/bash

# Upbit Clone - Kubernetes Deployment Script
# Usage: ./deploy.sh [build|push|deploy|all]

set -e

# Configuration
REGISTRY="your-registry"  # Change to your Docker registry
BACKEND_IMAGE="$REGISTRY/upbit-backend"
FRONTEND_IMAGE="$REGISTRY/upbit-frontend"
VERSION=${VERSION:-"latest"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

build() {
    log "Building Docker images..."
    
    log "Building backend image..."
    docker build -t $BACKEND_IMAGE:$VERSION -f backend/Dockerfile ./backend
    
    log "Building frontend image..."
    docker build -t $FRONTEND_IMAGE:$VERSION -f frontend/Dockerfile ./frontend
    
    log "Docker images built successfully!"
}

push() {
    log "Pushing images to registry..."
    
    docker push $BACKEND_IMAGE:$VERSION
    docker push $FRONTEND_IMAGE:$VERSION
    
    log "Images pushed successfully!"
}

deploy() {
    log "Deploying to Kubernetes..."
    
    # Create namespace if not exists
    kubectl apply -f k8s/namespace.yaml
    
    # Apply ConfigMap and Secrets
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    
    # Deploy backend
    kubectl apply -f k8s/backend-deployment.yaml
    
    # Deploy frontend
    kubectl apply -f k8s/frontend-deployment.yaml
    
    log "Waiting for deployments to be ready..."
    kubectl -n upbit rollout status deployment/upbit-backend
    kubectl -n upbit rollout status deployment/upbit-frontend
    
    log "Deployment completed!"
    log ""
    log "Access the application:"
    log "  - Frontend: http://<node-ip>:30080"
    log "  - Backend API: http://<node-ip>:30080/api"
}

status() {
    log "Checking deployment status..."
    kubectl -n upbit get pods
    kubectl -n upbit get services
}

cleanup() {
    warn "Deleting all resources in upbit namespace..."
    kubectl delete namespace upbit --ignore-not-found
    log "Cleanup completed!"
}

# Main
case "$1" in
    build)
        build
        ;;
    push)
        push
        ;;
    deploy)
        deploy
        ;;
    all)
        build
        push
        deploy
        ;;
    status)
        status
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {build|push|deploy|all|status|cleanup}"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker images"
        echo "  push    - Push images to registry"
        echo "  deploy  - Deploy to Kubernetes"
        echo "  all     - Build, push, and deploy"
        echo "  status  - Check deployment status"
        echo "  cleanup - Delete all resources"
        exit 1
        ;;
esac
