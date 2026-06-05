# ShowFinder — Setup Guide

## What you need before starting

- The `showfinder` project folder (this folder)
- API keys for: Last.fm, Ticketmaster, Bandsintown
- Node.js 20 (instructions below)

---

## Step 1 — Install Node.js 20

Run these commands in the terminal:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:
```bash
node --version   # should say v20.x.x
npm --version    # should say 10.x.x
```

---

## Step 2 — Copy the project to your machine

Copy the `showfinder` folder to your home directory:
```
~/showfinder/
```

---

## Step 3 — Install dependencies

```bash
cd ~/showfinder
npm install
```

This downloads all packages (~500MB, takes 1-2 minutes).

---

## Step 4 — Create your environment file

```bash
cp .env.local.example .env.local
nano .env.local
```

Fill in every value:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000

SESSION_SECRET=<run: openssl rand -base64 32>

LASTFM_API_KEY=<from https://www.last.fm/api/account/create>
LASTFM_SHARED_SECRET=<from same page as above>

BANDSINTOWN_APP_ID=<from https://artists.bandsintown.com/support/api-offers>

TICKETMASTER_API_KEY=<from https://developer.ticketmaster.com>
```

Save with Ctrl+X → Y → Enter.

Generate your SESSION_SECRET in a separate terminal:
```bash
openssl rand -base64 32
```

---

## Step 5 — Run in development

```bash
npm run dev -- -H 0.0.0.0
```

The `-H 0.0.0.0` lets you access it from other computers on your network.

Open in browser:
- From this machine: http://localhost:3000
- From another machine on the same network: http://<this-machine-ip>:3000

Find your IP:
```bash
ip addr show | grep "inet " | grep -v 127
```

---

## Step 6 — Allow the firewall

```bash
sudo ufw allow 3000
```

---

## Moving to Production (Dell PowerEdge)

### On the server, install Node.js 20 (same as Step 1)

### Copy the project
Transfer the folder to the server via USB, network share, or scp:
```bash
scp -r ~/showfinder user@server-ip:~/showfinder
```

### Install dependencies on the server
```bash
cd ~/showfinder
npm install
```

### Set up the environment file
```bash
cp .env.local.example .env.local
nano .env.local
```
Change `NEXT_PUBLIC_APP_URL` to your domain or server IP:
```
NEXT_PUBLIC_APP_URL=http://192.168.1.x:3000
```

### Build for production
```bash
npm run build
```

### Install PM2 (keeps the app running after you close the terminal)
```bash
sudo npm install -g pm2
```

### Start the app with PM2
```bash
pm2 start npm --name "showfinder" -- start
pm2 save
pm2 startup
```
Follow the instructions that `pm2 startup` prints (it gives you a command to copy/run).

### Allow port 3000 through firewall
```bash
sudo ufw allow 3000
sudo ufw allow ssh
sudo ufw enable
```

### Access the app
From any browser on your network: `http://<server-ip>:3000`

---

## Useful commands

| Command | What it does |
|---|---|
| `pm2 status` | See if app is running |
| `pm2 logs showfinder` | View app logs |
| `pm2 restart showfinder` | Restart after code changes |
| `pm2 stop showfinder` | Stop the app |
| `npm run build && pm2 restart showfinder` | Deploy an update |

## Database location

Your data (accounts, saved artists, show cache) lives at:
```
~/showfinder/showfinder.db
```

Back this up regularly:
```bash
cp ~/showfinder/showfinder.db ~/showfinder-backup-$(date +%Y%m%d).db
```

## Checking for security updates

```bash
cd ~/showfinder
npm audit
```

To update safely (never use --force):
```bash
npm install next@latest
npm run build
pm2 restart showfinder
```
