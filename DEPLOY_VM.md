# Deploying the Aptos Backend on a Google Cloud VM (Final Guide)

This comprehensive guide provides a detailed, step-by-step process for deploying the application on a Google Cloud Virtual Machine. This guide is based on the latest official documentation and best practices to ensure a successful deployment.

## Prerequisites

*   A Google Cloud Platform (GCP) account with billing enabled.
*   The `gcloud` command-line tool installed and configured on your local machine.

## Deployment Steps

### 1. Create a Google Cloud VM Instance

First, create a new VM instance in your GCP project.

1.  **Go to the VM instances page:**
    *   Open the [Google Cloud Console](https://console.cloud.google.com/).
    *   Navigate to **Compute Engine** > **VM instances**.
2.  **Create a new instance with the following settings:**
    *   **Name:** `aptos-backend-vm`
    *   **Region and Zone:** Choose a region and zone close to you for minimal latency.
    *   **Machine configuration:** `e2-medium` is recommended for a balance of performance and cost.
    *   **Boot disk:** Select **Ubuntu 22.04 LTS**. This is a long-term support release, ensuring stability.
    *   **Firewall:** Check **Allow HTTP traffic**.
    *   Click **Create**.

### 2. Configure Firewall Rules

Create a firewall rule to allow traffic on port 3000, which is required by the application.

1.  **Go to the Firewall rules page:**
    *   Navigate to **VPC network** > **Firewall**.
2.  **Create a new firewall rule with these settings:**
    *   **Name:** `allow-port-3000`
    *   **Network:** `default`
    *   **Targets:** `All instances in the network`
    *   **Source filter:** `IP ranges`
    *   **Source IP ranges:** `0.0.0.0/0` (allows traffic from any IP address)
    *   **Protocols and ports:** Select **TCP** and enter `3000`.
    *   Click **Create**.

### 3. Connect to Your VM

Connect to your VM using the `gcloud` CLI.

```bash
gcloud compute ssh aptos-backend-vm --zone your-instance-zone
```

Replace `your-instance-zone` with the zone you selected during VM creation.

### 4. System Update and Git Installation

Ensure your system is up-to-date and install Git.

```bash
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git
```

### 5. Install Docker and Docker Compose (Official Method)

Follow the official recommended steps to install Docker Engine.

**1. Uninstall old versions (if any):**

```bash
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove $pkg; done
```

**2. Set up Docker's `apt` repository:**

```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

**3. Install Docker packages:**

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**4. Add your user to the `docker` group:**

```bash
sudo usermod -aG docker ${USER}
```

**Important:** You must log out and log back in for this change to take effect.

### 6. Clone the Repository

Clone the application's source code.

```bash
git clone https://github.com/SL177Y-0/aptos_backend.git
cd aptos_backend
```

### 7. Build and Run the Application

Build and run the application using Docker Compose.

```bash
docker-compose up --build -d
```

### 8. Verify the Deployment

**1. Check the container status:**

```bash
docker ps
```
You should see your container listed with a status of `Up`.

**2. View the application logs:**

```bash
docker logs aptos_backend-aptos-deployer-1 -f
```
Look for a message indicating the server has started successfully.

**3. Test the health check endpoint from within the VM:**

```bash
curl http://localhost:3000/health
```
This should return a success message.

**4. Test from your local machine:**

Find your VM's external IP address from the Google Cloud Console. Open a terminal on your local machine and run:

```bash
curl http://YOUR_VM_EXTERNAL_IP:3000/health
```

If this command is successful, your application is deployed and accessible from the internet.
