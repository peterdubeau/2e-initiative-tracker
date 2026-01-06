# HTTPS Setup for Notifications

To enable sound notifications when the device is locked, you need to set up HTTPS certificates.

## Option 1: Using mkcert (Recommended)

1. Install mkcert:
   ```bash
   # macOS
   brew install mkcert
   
   # Or download from https://github.com/FiloSottile/mkcert
   ```

2. Install the local CA:
   ```bash
   mkcert -install
   ```

3. Generate certificates:
   ```bash
   cd /Users/pete/Documents/vibe-tracker
   mkdir -p certs
   cd certs
   
   # Generate certificate for localhost and your LAN IP
   # Replace 192.168.1.154 with your actual LAN IP
   mkcert localhost 127.0.0.1 192.168.1.154 ::1
   
   # Rename the files
   mv localhost+3.pem cert.pem
   mv localhost+3-key.pem key.pem
   ```

4. Restart both servers - they will automatically detect and use HTTPS.

## Option 2: Using OpenSSL (Self-signed)

1. Create certificates directory:
   ```bash
   cd /Users/pete/Documents/vibe-tracker
   mkdir -p certs
   cd certs
   ```

2. Generate self-signed certificate:
   ```bash
   openssl req -x509 -newkey rsa:4096 -nodes \
     -keyout key.pem \
     -out cert.pem \
     -days 365 \
     -subj "/CN=localhost"
   ```

3. Restart both servers - they will automatically detect and use HTTPS.

## Note

- Browsers will show a security warning for self-signed certificates - you'll need to accept it
- mkcert certificates are trusted by browsers automatically
- The app will work over HTTP if certificates are not found, but notifications won't work when device is locked
- For LAN access, you may need to generate certificates with your LAN IP address

