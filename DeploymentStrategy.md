# Deployment Strategy: Vilokanam-view Live Streaming Platform

## Introduction

This document outlines the comprehensive deployment strategy for Vilokanam-view, a pay-per-second live streaming platform built on the Polkadot ecosystem. The deployment strategy encompasses infrastructure design, deployment processes, monitoring, scaling mechanisms, and disaster recovery procedures to ensure a reliable, scalable, and high-performance platform.

## Deployment Architecture

### Multi-Tier Architecture

Vilokanam-view follows a multi-tier architecture design to ensure separation of concerns, scalability, and fault tolerance:

#### 1. Presentation Tier
- **Web Applications**: Next.js applications for creators and viewers
- **Mobile Applications**: React Native applications for iOS and Android
- **CDN Layer**: Cloudflare for global content delivery

#### 2. Application Tier
- **API Gateway**: Kong API gateway for request routing and rate limiting
- **Microservices**: Node.js services for business logic
- **Blockchain Nodes**: Substrate nodes for parachain operations
- **OCW Services**: Off-chain worker services for tick processing

#### 3. Data Tier
- **Blockchain Storage**: Substrate-based storage with RocksDB
- **Relational Database**: PostgreSQL for structured data
- **NoSQL Database**: Redis for caching and session storage
- **Distributed Storage**: IPFS for media and metadata storage

#### 4. Infrastructure Tier
- **Container Orchestration**: Kubernetes for service management
- **Load Balancing**: HAProxy for traffic distribution
- **Monitoring**: Prometheus and Grafana for observability
- **Logging**: ELK stack for centralized logging

## Infrastructure Design

### Cloud Provider Selection

Vilokanam-view utilizes a multi-cloud strategy to ensure high availability and avoid vendor lock-in:

#### Primary Providers
1. **Amazon Web Services (AWS)**: Primary cloud provider for global reach
2. **Google Cloud Platform (GCP)**: Secondary provider for redundancy
3. **Microsoft Azure**: Tertiary provider for specific regional requirements

#### Regional Distribution
```yaml
regions:
  - name: us-east-1
    provider: aws
    services:
      - blockchain_nodes
      - api_gateway
      - database_primary
    capacity: high
    latency_target: "< 50ms"
    
  - name: eu-west-1
    provider: aws
    services:
      - web_applications
      - database_replica
      - cdn_edge
    capacity: medium
    latency_target: "< 75ms"
    
  - name: ap-southeast-1
    provider: aws
    services:
      - mobile_backend
      - analytics_processing
      - backup_storage
    capacity: medium
    latency_target: "< 100ms"
    
  - name: us-central1
    provider: gcp
    services:
      - disaster_recovery
      - batch_processing
      - machine_learning
    capacity: low
    latency_target: "< 150ms"
```

### Container Orchestration with Kubernetes

#### Cluster Design
```yaml
# Kubernetes cluster configuration
clusters:
  - name: production-us-east
    region: us-east-1
    node_groups:
      - name: blockchain-nodes
        instance_type: c5.2xlarge
        min_size: 5
        max_size: 20
        disk_size: 1000GB
        labels:
          role: blockchain
          priority: critical
          
      - name: web-services
        instance_type: t3.medium
        min_size: 10
        max_size: 100
        disk_size: 100GB
        labels:
          role: web
          priority: high
          
      - name: database-services
        instance_type: r5.large
        min_size: 3
        max_size: 10
        disk_size: 500GB
        labels:
          role: database
          priority: critical
          
      - name: monitoring-services
        instance_type: t3.small
        min_size: 2
        max_size: 5
        disk_size: 50GB
        labels:
          role: monitoring
          priority: medium
```

#### Namespace Organization
```yaml
# Kubernetes namespace organization
namespaces:
  - name: vilokanam-blockchain
    purpose: Substrate node operations
    resources:
      - substrate-validator
      - substrate-archive
      - ocw-ticker
    security:
      network_policies: restricted
      rbac: strict
      
  - name: vilokanam-web
    purpose: Web application services
    resources:
      - creator-dashboard
      - viewer-interface
      - api-gateway
    security:
      network_policies: moderate
      rbac: standard
      
  - name: vilokanam-database
    purpose: Data storage and caching
    resources:
      - postgres-primary
      - redis-cache
      - ipfs-cluster
    security:
      network_policies: strict
      rbac: strict
      
  - name: vilokanam-monitoring
    purpose: Observability and logging
    resources:
      - prometheus
      - grafana
      - elasticsearch
      - kibana
    security:
      network_policies: moderate
      rbac: standard
```

### Network Design

#### Virtual Private Cloud (VPC) Configuration
```hcl
# AWS VPC configuration
resource "aws_vpc" "vilokanam_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "vilokanam-production"
  }
}

resource "aws_subnet" "blockchain_subnet_a" {
  vpc_id                  = aws_vpc.vilokanam_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = false
  
  tags = {
    Name = "blockchain-subnet-a"
  }
}

resource "aws_subnet" "blockchain_subnet_b" {
  vpc_id                  = aws_vpc.vilokanam_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = false
  
  tags = {
    Name = "blockchain-subnet-b"
  }
}

resource "aws_route_table" "blockchain_routes" {
  vpc_id = aws_vpc.vilokanam_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.vilokanam_igw.id
  }
  
  tags = {
    Name = "blockchain-route-table"
  }
}
```

#### Security Groups
```hcl
# Security group for blockchain nodes
resource "aws_security_group" "blockchain_nodes" {
  name        = "blockchain-nodes-sg"
  description = "Security group for blockchain nodes"
  vpc_id      = aws_vpc.vilokanam_vpc.id
  
  # P2P networking
  ingress {
    from_port   = 30333
    to_port     = 30333
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "P2P networking"
  }
  
  # WebSocket RPC
  ingress {
    from_port   = 9944
    to_port     = 9944
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "WebSocket RPC (internal only)"
  }
  
  # SSH access (restricted)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "SSH access (VPC internal only)"
  }
  
  # Outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "blockchain-nodes"
  }
}
```

## Deployment Processes

### Continuous Integration/Continuous Deployment (CI/CD)

#### Pipeline Architecture
```yaml
# CI/CD pipeline configuration
name: Vilokanam Deployment Pipeline

on:
  push:
    branches: [ main, develop, release/* ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [backend, frontend, sdk, ui]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Set up Rust
      if: matrix.service == 'backend'
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        override: true
    
    - name: Set up Node.js
      if: matrix.service != 'backend'
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: |
        if [ "${{ matrix.service }}" = "backend" ]; then
          rustup component add clippy rustfmt
        else
          npm install -g pnpm
          pnpm install
        fi
    
    - name: Run tests
      run: |
        if [ "${{ matrix.service }}" = "backend" ]; then
          cargo test
          cargo clippy -- -D warnings
          cargo fmt -- --check
        else
          pnpm run test
          pnpm run lint
        fi
    
    - name: Build artifacts
      run: |
        if [ "${{ matrix.service }}" = "backend" ]; then
          cargo build --release
        else
          pnpm run build
        fi
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.service }}-artifacts
        path: |
          target/release/
          dist/
          packages/*/dist/
        if-no-files-found: warn

  deploy-staging:
    needs: build-and-test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v3
      with:
        path: artifacts/
    
    - name: Deploy to staging
      run: |
        # Deploy to staging environment
        echo "Deploying to staging environment..."
        ./scripts/deploy-staging.sh
        
    - name: Run integration tests
      run: |
        # Run integration tests against staging
        echo "Running integration tests..."
        ./scripts/run-integration-tests.sh staging

  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/heads/release/')
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v3
      with:
        path: artifacts/
    
    - name: Deploy to production
      run: |
        # Deploy to production with blue-green deployment
        echo "Deploying to production environment..."
        ./scripts/deploy-production.sh
        
        # Wait for health checks to pass
        sleep 60
        
        # Run smoke tests
        ./scripts/run-smoke-tests.sh
        
    - name: Monitor deployment
      run: |
        # Monitor deployment for 10 minutes
        echo "Monitoring production deployment..."
        ./scripts/monitor-deployment.sh 600
```

#### Blue-Green Deployment Strategy
```bash
#!/bin/bash
# Blue-green deployment script

set -e

# Configuration
NAMESPACE="vilokanam-web"
BLUE_DEPLOYMENT="web-blue"
GREEN_DEPLOYMENT="web-green"
SERVICE_NAME="web-service"

# Determine current active deployment
CURRENT_ACTIVE=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}')

if [ "$CURRENT_ACTIVE" = "blue" ]; then
    NEW_DEPLOYMENT=$GREEN_DEPLOYMENT
    OLD_DEPLOYMENT=$BLUE_DEPLOYMENT
    NEW_VERSION="green"
    OLD_VERSION="blue"
else
    NEW_DEPLOYMENT=$BLUE_DEPLOYMENT
    OLD_DEPLOYMENT=$GREEN_DEPLOYMENT
    NEW_VERSION="blue"
    OLD_VERSION="green"
fi

echo "Current active deployment: $OLD_DEPLOYMENT"
echo "Deploying new version to: $NEW_DEPLOYMENT"

# Deploy new version
kubectl apply -f k8s/deployments/$NEW_DEPLOYMENT.yaml -n $NAMESPACE

# Wait for new deployment to be ready
echo "Waiting for $NEW_DEPLOYMENT to be ready..."
kubectl rollout status deployment/$NEW_DEPLOYMENT -n $NAMESPACE --timeout=300s

# Update service to point to new deployment
echo "Switching traffic to $NEW_DEPLOYMENT..."
kubectl patch service $SERVICE_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"version\":\"$NEW_VERSION\"}}}"

# Wait for DNS propagation (adjust as needed)
echo "Waiting for DNS propagation..."
sleep 30

# Run health checks
echo "Running health checks..."
if ! curl -f http://web-service.vilokanam-web.svc.cluster.local/health; then
    echo "Health check failed, rolling back..."
    kubectl patch service $SERVICE_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"version\":\"$OLD_VERSION\"}}}"
    exit 1
fi

# Keep old deployment for rollback capability (for 1 hour)
echo "Deployment successful. Old deployment will be kept for 1 hour for rollback."
sleep 3600

# Scale down old deployment
echo "Scaling down old deployment..."
kubectl scale deployment/$OLD_DEPLOYMENT -n $NAMESPACE --replicas=0

echo "Blue-green deployment completed successfully!"
```

### Infrastructure as Code (IaC)

#### Terraform Configuration
```hcl
# Main Terraform configuration
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.9"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

# EKS cluster module
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "vilokanam-${var.environment}"
  cluster_version = "1.27"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    blockchain = {
      instance_types = ["c5.2xlarge"]
      min_size       = 3
      max_size       = 10
      desired_size   = 5
      labels = {
        role = "blockchain"
      }
    }
    
    web = {
      instance_types = ["t3.medium"]
      min_size       = 5
      max_size       = 50
      desired_size   = 10
      labels = {
        role = "web"
      }
    }
    
    database = {
      instance_types = ["r5.large"]
      min_size       = 2
      max_size       = 5
      desired_size   = 3
      labels = {
        role = "database"
      }
    }
  }
}

# VPC module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "vilokanam-${var.environment}-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false
  
  tags = {
    Environment = var.environment
    Project     = "vilokanam"
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
```

## Monitoring and Observability

### Prometheus Metrics Collection

#### Node Exporter Configuration
```yaml
# Prometheus configuration for monitoring
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "vilokanam-rules.yml"

scrape_configs:
  - job_name: 'blockchain-nodes'
    static_configs:
      - targets: ['blockchain-node-1:9100', 'blockchain-node-2:9100', 'blockchain-node-3:9100']
    metrics_path: /metrics
    scrape_interval: 10s
    
  - job_name: 'web-services'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['vilokanam-web']
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: web-(creator|viewer)
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: instance
        
  - job_name: 'database-services'
    static_configs:
      - targets: ['postgres-primary:9187', 'redis-cache:9121']
    scrape_interval: 30s
    
  - job_name: 'substrate-metrics'
    static_configs:
      - targets: ['substrate-node:9615']
    metrics_path: /metrics
    scrape_interval: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

remote_write:
  - url: 'https://prometheus-us-central1.grafana.net/api/prom/push'
    basic_auth:
      username: '123456'
      password: 'your_api_key_here'
```

#### Custom Application Metrics
```rust
// Custom metrics implementation in Substrate runtime
use prometheus::{Counter, Gauge, Histogram, Registry};
use sp_runtime::traits::BlockNumberProvider;

lazy_static! {
    pub static ref BLOCKS_PRODUCED: Counter = Counter::new(
        "vilokanam_blocks_produced_total",
        "Total number of blocks produced"
    ).expect("Failed to create blocks produced counter");

    pub static ref ACTIVE_STREAMS: Gauge = Gauge::new(
        "vilokanam_active_streams",
        "Current number of active streams"
    ).expect("Failed to create active streams gauge");

    pub static ref TRANSACTION_LATENCY: Histogram = Histogram::with_opts(
        histogram_opts!(
            "vilokanam_transaction_latency_seconds",
            "Latency of blockchain transactions"
        )
    ).expect("Failed to create transaction latency histogram");

    pub static ref VIEWER_COUNT: Gauge = Gauge::new(
        "vilokanam_viewer_count",
        "Total number of connected viewers"
    ).expect("Failed to create viewer count gauge");
}

pub fn register_metrics(registry: &Registry) -> Result<(), prometheus::Error> {
    registry.register(Box::new(BLOCKS_PRODUCED.clone()))?;
    registry.register(Box::new(ACTIVE_STREAMS.clone()))?;
    registry.register(Box::new(TRANSACTION_LATENCY.clone()))?;
    registry.register(Box::new(VIEWER_COUNT.clone()))?;
    Ok(())
}

// Example usage in pallet
impl<T: Config> Pallet<T> {
    pub fn record_stream_join(stream_id: u128, viewer: T::AccountId) {
        ACTIVE_STREAMS.inc();
        VIEWER_COUNT.inc();
        
        // Record event
        Self::deposit_event(Event::ViewerJoined {
            stream_id,
            viewer,
        });
    }
    
    pub fn record_transaction_latency(latency_ms: u64) {
        TRANSACTION_LATENCY.observe(latency_ms as f64 / 1000.0);
    }
}
```

### Grafana Dashboards

#### Blockchain Health Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Vilokanam Blockchain Health",
    "tags": ["blockchain", "substrate", "vilokanam"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Block Production Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(vilokanam_blocks_produced_total[5m])",
            "legendFormat": "Blocks per second"
          }
        ],
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 6 }
      },
      {
        "id": 2,
        "title": "Active Streams",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "vilokanam_active_streams",
            "instant": true
          }
        ],
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 3 }
      },
      {
        "id": 3,
        "title": "Connected Viewers",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "vilokanam_viewer_count",
            "instant": true
          }
        ],
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 3 }
      },
      {
        "id": 4,
        "title": "Transaction Latency",
        "type": "heatmap",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "vilokanam_transaction_latency_seconds_bucket",
            "format": "heatmap",
            "legendFormat": "{{le}}"
          }
        ],
        "gridPos": { "x": 0, "y": 6, "w": 12, "h": 6 }
      },
      {
        "id": 5,
        "title": "Node CPU Usage",
        "type": "timeseries",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(node_cpu_seconds_total{mode!='idle'}[5m])",
            "legendFormat": "{{instance}} - {{mode}}"
          }
        ],
        "gridPos": { "x": 12, "y": 3, "w": 12, "h": 6 }
      }
    ]
  }
}
```

## Scaling and Auto-Scaling

### Horizontal Pod Autoscaler (HPA)
```yaml
# Kubernetes HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-creator-hpa
  namespace: vilokanam-web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-creator
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 3
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 10
        periodSeconds: 15
      selectPolicy: Max
```

### Cluster Autoscaler Configuration
```yaml
# Cluster autoscaler configuration
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: blockchain-nodes-ca
  namespace: kube-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cluster-autoscaler
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 50

# Node group autoscaling configuration
apiVersion: autoscaling/group/v1
kind: NodeGroup
metadata:
  name: blockchain-nodes-ng
spec:
  minSize: 3
  maxSize: 20
  desiredCapacity: 5
  instanceType: c5.2xlarge
  labels:
    role: blockchain
    priority: critical
  taints:
    - key: dedicated
      value: blockchain
      effect: NoSchedule
```

## Disaster Recovery and Backup

### Backup Strategy

#### Database Backup
```bash
#!/bin/bash
# Database backup script

set -e

# Configuration
BACKUP_BUCKET="vilokanam-backups-${ENVIRONMENT}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="postgres-backup-${TIMESTAMP}.sql.gz"

# Create database dump
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB | gzip > /tmp/$BACKUP_NAME

# Upload to S3
aws s3 cp /tmp/$BACKUP_NAME s3://$BACKUP_BUCKET/database/$BACKUP_NAME

# Clean up local file
rm /tmp/$BACKUP_NAME

# Keep only last 30 days of backups
aws s3 ls s3://$BACKUP_BUCKET/database/ | \
  awk '{print $4}' | \
  grep 'postgres-backup-' | \
  sort | \
  head -n -30 | \
  xargs -I {} aws s3 rm s3://$BACKUP_BUCKET/database/{}

echo "Database backup completed: $BACKUP_NAME"
```

#### Blockchain State Backup
```bash
#!/bin/bash
# Blockchain state backup script

set -e

# Configuration
NODE_DATA_PATH="/data/chains/vilokanam/db"
BACKUP_BUCKET="vilokanam-backups-${ENVIRONMENT}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="blockchain-state-${TIMESTAMP}.tar.gz"

# Stop node temporarily for consistent backup
systemctl stop vilokanam-node

# Create compressed archive of state
tar -czf /tmp/$BACKUP_NAME -C $NODE_DATA_PATH .

# Restart node
systemctl start vilokanam-node

# Upload to S3
aws s3 cp /tmp/$BACKUP_NAME s3://$BACKUP_BUCKET/blockchain/$BACKUP_NAME

# Clean up local file
rm /tmp/$BACKUP_NAME

# Keep only last 7 days of full backups
aws s3 ls s3://$BACKUP_BUCKET/blockchain/ | \
  awk '{print $4}' | \
  grep 'blockchain-state-' | \
  sort | \
  head -n -7 | \
  xargs -I {} aws s3 rm s3://$BACKUP_BUCKET/blockchain/{}

echo "Blockchain state backup completed: $BACKUP_NAME"
```

### Disaster Recovery Plan

#### Recovery Point Objective (RPO) and Recovery Time Objective (RTO)
```yaml
disaster_recovery:
  objectives:
    - name: RPO
      description: Maximum acceptable data loss
      target: 1 hour
      measurement: Time between last backup and incident
      
    - name: RTO
      description: Maximum acceptable downtime
      target: 4 hours
      measurement: Time from incident detection to full recovery
      
  recovery_scenarios:
    - scenario: database_failure
      rpo: 1 hour
      rto: 2 hours
      steps:
        - restore_latest_database_backup
        - apply_transaction_logs_since_backup
        - verify_data_integrity
        - switch_traffic_to_restored_database
        
    - scenario: blockchain_node_failure
      rpo: 6 hours
      rto: 4 hours
      steps:
        - provision_new_blockchain_node
        - restore_blockchain_state_from_backup
        - synchronize_with_network
        - verify_node_health
        - add_to_validator_set
        
    - scenario: complete_data_center_outage
      rpo: 24 hours
      rto: 24 hours
      steps:
        - activate_disaster_recovery_site
        - restore_all_services_from_backups
        - reconfigure.Networking and DNS
        - validate all services
        - gradually shift traffic to DR site
```

#### Failover Automation
```python
#!/usr/bin/env python3
# Automated failover script

import boto3
import kubernetes
import time
import sys

class DisasterRecoveryManager:
    def __init__(self):
        self.ec2 = boto3.client('ec2')
        self.route53 = boto3.client('route53')
        self.elb = boto3.client('elbv2')
        self.k8s = kubernetes.client.ApiClient()
        
    def detect_failure(self, service_name):
        """Detect if a service has failed"""
        # Implement health check logic
        try:
            # Check service health endpoint
            response = self.k8s.call_api(
                f'/api/v1/namespaces/{service_name}/health',
                'GET'
            )
            return response.get('healthy', False) == False
        except Exception as e:
            print(f"Health check failed: {e}")
            return True
            
    def initiate_failover(self, service_name):
        """Initiate failover to backup service"""
        print(f"Initiating failover for {service_name}")
        
        # Scale down primary service
        self.scale_down_primary(service_name)
        
        # Scale up backup service
        self.scale_up_backup(service_name)
        
        # Update DNS records
        self.update_dns_records(service_name)
        
        # Update load balancer targets
        self.update_load_balancer_targets(service_name)
        
        # Monitor recovery
        self.monitor_recovery(service_name)
        
    def scale_down_primary(self, service_name):
        """Scale down primary service"""
        apps_v1 = kubernetes.client.AppsV1Api()
        apps_v1.patch_namespaced_deployment_scale(
            name=f"{service_name}-primary",
            namespace="vilokanam-production",
            body={
                "spec": {
                    "replicas": 0
                }
            }
        )
        
    def scale_up_backup(self, service_name):
        """Scale up backup service"""
        apps_v1 = kubernetes.client.AppsV1Api()
        apps_v1.patch_namespaced_deployment_scale(
            name=f"{service_name}-backup",
            namespace="vilokanam-dr",
            body={
                "spec": {
                    "replicas": 3
                }
            }
        )
        
    def update_dns_records(self, service_name):
        """Update DNS records to point to backup"""
        # Update Route53 records
        self.route53.change_resource_record_sets(
            HostedZoneId='Z123456789EXAMPLE',
            ChangeBatch={
                'Changes': [
                    {
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': f'{service_name}.vilokanam.com',
                            'Type': 'A',
                            'TTL': 300,
                            'ResourceRecords': [
                                {
                                    'Value': '203.0.113.1'  # DR site IP
                                }
                            ]
                        }
                    }
                ]
            }
        )
        
    def update_load_balancer_targets(self, service_name):
        """Update load balancer targets"""
        # Remove primary targets
        self.elb.deregister_targets(
            TargetGroupArn='arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/primary-tg/1234567890123456',
            Targets=[
                {
                    'Id': 'i-1234567890abcdef0',  # Primary instance IDs
                    'Port': 80
                }
            ]
        )
        
        # Add backup targets
        self.elb.register_targets(
            TargetGroupArn='arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/dr-tg/1234567890123456',
            Targets=[
                {
                    'Id': 'i-0987654321fedcba0',  # DR instance IDs
                    'Port': 80
                }
            ]
        )

def main():
    dr_manager = DisasterRecoveryManager()
    
    # Monitor services continuously
    services = ['blockchain', 'web-creator', 'web-viewer', 'database']
    
    while True:
        for service in services:
            if dr_manager.detect_failure(service):
                print(f"Failure detected in {service}")
                dr_manager.initiate_failover(service)
                break
                
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
```

## Security and Compliance in Deployment

### Zero Trust Network Architecture
```yaml
# Network policies implementing zero trust
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: blockchain-isolation
  namespace: vilokanam-blockchain
spec:
  podSelector:
    matchLabels:
      app: substrate-node
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: vilokanam-blockchain
    ports:
    - protocol: TCP
      port: 30333  # P2P
    - protocol: TCP
      port: 9944   # WebSocket RPC
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: vilokanam-blockchain
    ports:
    - protocol: TCP
      port: 30333  # P2P
    - protocol: TCP
      port: 9944   # WebSocket RPC
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
    ports:
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
    - protocol: TCP
      port: 443  # HTTPS
```

### Secrets Management
```yaml
# Kubernetes secrets management with HashiCorp Vault
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultSecret
metadata:
  name: blockchain-keys
  namespace: vilokanam-blockchain
spec:
  vaultRole: kubernetes-role
  templates:
    node-key: '{{ secret "kv/data/blockchain/node-1" "key" }}'
    node-cert: '{{ secret "kv/data/blockchain/node-1" "cert" }}'
    database-password: '{{ secret "kv/data/database/primary" "password" }}'
  destination:
    create: true
    name: blockchain-secrets
```

This comprehensive deployment strategy ensures that Vilokanam-view can be reliably deployed, scaled, and maintained across multiple environments while maintaining high availability, security, and performance standards. The strategy incorporates modern DevOps practices, robust monitoring, and comprehensive disaster recovery procedures to ensure continuous operation and rapid recovery from any incidents.