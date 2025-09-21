# Deploying Your App on a Google Cloud Computer (Simple Guide)

This guide will walk you through putting your application on a virtual computer in Google Cloud. We'll use simple, step-by-step instructions.

Think of it like setting up a new computer just for your app to run on, accessible from anywhere in the world.

## What You Need

*   A Google Cloud account.
*   The `gcloud` tool on your own computer (this is like a remote control for Google Cloud).

## Let's Get Started!

### Step 1: Create Your Virtual Computer on Google Cloud

First, we need to create the computer that will run your app.

1.  **Go to the Google Cloud website** and open the **Compute Engine** section.
2.  **Click "CREATE INSTANCE"** to start making your new virtual computer.
3.  **Fill out the form:**
    *   **Name:** Give it a simple name, like `my-app-server`.
    *   **Region and Zone:** Pick a location that's close to you.
    *   **Machine configuration:** `e2-medium` is a good starting point.
    *   **Boot disk:** Choose **Ubuntu 22.04 LTS**. This is the operating system, like Windows or macOS.
    *   **Firewall:** Check the box that says **Allow HTTP traffic**. This lets people access your app from the internet.
    *   Click **Create**.

### Step 2: Open a Door for Your App

Your new virtual computer has a firewall that blocks most connections for security. We need to open a "door" (a port) so your app can be reached.

1.  In the Google Cloud website, go to **VPC network** > **Firewall**.
2.  **Click "CREATE FIREWALL RULE"** and fill in the details:
    *   **Name:** `allow-app-port-3000`
    *   **Source IP ranges:** Enter `0.0.0.0/0`. This means "allow anyone from the internet."
    *   **Protocols and ports:** Check **TCP** and type `3000`. This is the specific door number your app uses.
    *   Click **Create**.

### Step 3: Connect to Your New Virtual Computer

Now, let's log in to the virtual computer you just created.

*   Open a terminal on your own computer and run this command:
    ```bash
    gcloud compute ssh aptos-backend-vm --zone your-instance-zone
    ```
    (Remember to replace `your-instance-zone` with the one you chose).

### Step 4: Get Your Computer Ready

We need to install a couple of things on your new virtual computer.

*   First, update the computer's software list and install Git (a tool for downloading code):
    ```bash
    sudo apt-get update -y
    sudo apt-get upgrade -y
    sudo apt-get install -y git
    ```

### Step 5: Install Docker (The App's "Magic Box")

Docker is a tool that packages your app and all its needs into a "magic box" called a container. This makes it easy to run your app anywhere.

1.  **Add Docker's official software list:**
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
2.  **Install Docker:**
    ```bash
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```
3.  **Give yourself permission to use Docker:**
    ```bash
    sudo usermod -aG docker ${USER}
    ```

**VERY IMPORTANT:** For the permission change to work, you need to log out and log back in.

*   **Disconnect from the virtual computer:**
    ```bash
    exit
    ```
*   **Reconnect:**
    ```bash
    gcloud compute ssh aptos-backend-vm --zone your-instance-zone
    ```

### Step 6: Download Your App's Code

Now, let's download your app's code onto the virtual computer. If you've run these steps before, you might see an error that the folder already exists. You can safely remove it to start fresh.

```bash
# Remove the old directory if it exists to avoid errors
rm -rf aptos_backend

# Download the code
git clone https://github.com/SL177Y-0/aptos_backend.git
cd aptos_backend
```

### Step 7: Start Your App!

This one command tells Docker to build your app's "magic box" and start it.

```bash
docker compose up --build -d
```

### Step 8: Check if It's Working

Let's make sure your app is running correctly.

1.  **Check the container status:**
    ```bash
    docker compose ps
    ```
    You should see your app running.

2.  **Look at the app's log:**
    ```bash
    docker logs aptos_backend-aptos-deployer-1 -f
    ```
    You should see a message that the server has started.

3.  **Test it from your local computer:**
    *   **How to find your External IP address:**
        1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
        2.  Navigate to **Compute Engine** > **VM instances**.
        3.  You will see a list of your virtual computers. Find the one you created (e.g., `my-app-server`).
        4.  Look for the **External IP** column. The address will be listed there. You can click the copy icon next to it.
    *   Open a new terminal on your *own* computer and run:
        ```bash
        curl http://YOUR_VM_EXTERNAL_IP:3000/health
        ```
        (Replace `YOUR_VM_EXTERNAL_IP` with the actual IP address).

If you see a success message, congratulations! Your app is live on the internet.
