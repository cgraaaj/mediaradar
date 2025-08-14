# GitHub Actions CI/CD Configuration (Frontend)

This directory contains GitHub Actions workflows and templates for the Media Radar Frontend project.

## 🚀 Workflows

### `deploy.yaml` - CI/CD Pipeline
Automatically builds and pushes the frontend Docker image and updates the local Helm chart when code is pushed to main/master branches.

**Features:**
- ✅ (Optional) tests and linting placeholders
- 🐳 Builds multi-platform Docker images (linux/amd64, linux/arm64)
- 📦 Pushes images to Harbor registry
- ⚓ Updates Helm chart (`k8s/Chart.yaml` and `k8s/values.yaml`)

## 🔧 Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `HARBOR_USERNAME` | Harbor registry username | ✅ Yes |
| `HARBOR_PASSWORD` | Harbor registry password | ✅ Yes |

## 📝 Configuration

### Update Environment Variables
Edit the `env` section in `deploy.yaml`:

```yaml
env:
  IMAGE_REGISTRY: "registry.cgraaaj.in"
  IMAGE_REPOSITORY: "media-radar"
  IMAGE_NAME: "media-radar-frontend"
```

### Helm Chart
The workflow updates the image repository and tag in `k8s/values.yaml` and bumps the chart `version` in `k8s/Chart.yaml`.

## 📋 Issue Templates & PR Template

This folder also includes:
- Issue templates under `ISSUE_TEMPLATE/`
- Pull request template `pull_request_template.md`

## 🎯 Usage

1. Setup secrets in the repository
2. Push to `main` (or `master`) to trigger the pipeline
3. Review the workflow run and published image in Harbor 