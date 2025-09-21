# Deploying the Aptos Backend on a Google Cloud VM

This guide provides step-by-step instructions for deploying the application on a Google Cloud Virtual Machine. The application is containerized using Docker, which simplifies the deployment process.

## Prerequisites

*   A Google Cloud Platform (GCP) account with billing enabled.
*   The `gcloud` command-line tool installed and configured on your local machine.

## Deployment Steps

### 1. Create a Google Cloud VM Instance

First, you need to create a new VM instance in your GCP project.

1.  **Go to the VM instances page:**
    *   Open the [Google Cloud Console](https://console.cloud.google.com/).
    *   Navigate to **Compute Engine** > **VM instances**.
2.  **Create a new instance:**
    *   Click **CREATE INSTANCE**.
    *   **Name:** Give your instance a name (e.g., `aptos-backend-vm`).
    *   **Region and Zone:** Choose a region and zone that is close to you.
    *   **Machine configuration:** A small machine type like `e2-small` or `e2-medium` should be sufficient.
    *   **Boot disk:** Select a recent version of **Ubuntu** (e.g., Ubuntu 22.04 LTS).
    *   **Firewall:** Check the box for **Allow HTTP traffic**. This is important for the next step.
    *   Click **Create**.

### 2. Configure Firewall Rules

By default, your VM will not allow traffic on port 3000. You need to create a firewall rule to open this port.

1.  **Go to the Firewall rules page:**
    *   In the Google Cloud Console, navigate to **VPC network** > **Firewall**.
2.  **Create a new firewall rule:**
    *   Click **CREATE FIREWALL RULE**.
    *   **Name:** `allow-port-3000`.
    *   **Network:** Leave as `default`.
    *   **Targets:** Select `All instances in the network`.
    *   **Source filter:** Select `IP ranges`.
    *   **Source IP ranges:** Enter `0.0.0.0/0` to allow traffic from any IP address.
    *   **Protocols and ports:** Select **Specified protocols and ports**, then check **TCP** and enter `3000` in the text box.
    *   Click **Create**.

### 3. Connect to Your VM

Connect to your newly created VM instance. You can do this through the Google Cloud Console or using the `gcloud` CLI.

```bash
gcloud compute ssh your-instance-name --zone your-instance-zone
```

Replace `your-instance-name` and `your-instance-zone` with the values from the VM you created.

### 4. Install Git

If Git is not already installed, install it now.

```bash
sudo apt-get update
sudo apt-get install -y git
```

### 5. Install Docker and Docker Compose

The application is deployed using Docker. Follow the official recommended steps to install Docker Engine and Docker Compose.

**1. Set up Docker's `apt` repository:**

```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

**2. Install Docker packages:**

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**3. Add your user to the `docker` group:**

This allows you to run Docker commands without `sudo`.

```bash
sudo usermod -aG docker ${USER}
```

You will need to log out and log back in for this change to take effect. After logging back in, verify that you can run Docker commands without `sudo`:

```bash
docker --version
```

### 6. Clone the Repository

Clone the application's source code from its Git repository.

```bash
git clone https://github.com/SL177Y-0/aptos_backend.git
cd aptos_backend
```

### 7. Build and Run the Application

With Docker and Docker Compose installed, you can now build and run the application.

```bash
docker-compose up --build -d
```

This command will build the Docker image and start a container in detached mode, exposing the application on port 3000.

### 8. Verify the Deployment

Check the status of your running container:

```bash
docker-compose ps
```

View the application logs to ensure it started correctly:

```bash
docker-compose logs -f
```

The application should now be running and accessible on your VM's external IP address. You can find the external IP on the VM instances page in the Google Cloud Console.

Test the application by navigating to `http://YOUR_VM_EXTERNAL_IP:3000/health` in your web browser or by using `curl`.

```bash
curl http://localhost:3000/health
