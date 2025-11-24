# 🔒 SECURE Video Matrix Controller

This is the security-hardened version of the Video Matrix Controller with enterprise-grade security features.

## 🛡️ Security Features

### Authentication & Authorization
- ✅ **User Authentication** - Username/password login system
- ✅ **Role-Based Access Control** - Admin vs Operator permissions
- ✅ **Session Management** - Secure, encrypted sessions
- ✅ **Account Lockout** - Protection against brute force attacks
- ✅ **Password Hashing** - bcrypt with salt rounds

### Network Security
- ✅ **Rate Limiting** - Prevents DoS attacks
- ✅ **IP Whitelisting** - Restrict access by IP address
- ✅ **CORS Protection** - Controlled cross-origin requests
- ✅ **HTTPS Support** - SSL/TLS encryption
- ✅ **Security Headers** - Helmet.js protection

### Input Validation & Sanitization
- ✅ **Command Validation** - Only allow specific matrix commands
- ✅ **Input Sanitization** - Prevent injection attacks
- ✅ **Payload Size Limits** - Prevent large payload attacks
- ✅ **Type Validation** - Strict input type checking

### System Security
- ✅ **Configuration File** - Sensitive data outside code
- ✅ **Error Handling** - No sensitive data in error messages
- ✅ **Audit Logging** - Track all security events
- ✅ **Graceful Degradation** - Fail securely

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install bcrypt cors express express-rate-limit express-session helmet telnet-client validator
```

### 2. Create Users
```bash
node scripts/create-user.js
```

### 3. Configure Settings
Edit `config.json`:
- Set your matrix IP address
- Configure allowed IP addresses
- Enable/disable authentication
- Set security parameters

### 4. Start Secure Server
```bash
npm start
```

## ⚙️ Configuration

### config.json Structure
```json
{
  "server": {
    "port": 3000,
    "ssl": {
      "enabled": false,
      "keyPath": "./certs/server.key", 
      "certPath": "./certs/server.cert"
    }
  },
  "matrix": {
    "ip": "192.168.10.254",
    "port": 23,
    "timeout": 2000,
    "maxRetries": 3
  },
  "security": {
    "enableAuth": true,
    "sessionTimeout": 3600000,
    "maxLoginAttempts": 5,
    "lockoutTime": 900000,
    "allowedIPs": ["127.0.0.1", "192.168.1.0/24"],
    "rateLimiting": {
      "windowMs": 60000,
      "maxRequests": 100
    }
  },
  "users": {
    "admin": {
      "passwordHash": "$2b$10$...",
      "role": "admin",
      "permissions": ["switch", "query", "config"]
    }
  }
}
```

## 👥 User Management

### Create New User
```bash
node scripts/create-user.js
```

### User Roles
- **Admin**: Full access (switch, query, config)
- **Operator**: Limited access (switch, query only)

### Default Users (CHANGE THESE!)
- Username: `admin`, Password: `admin123`
- Username: `operator`, Password: `operator123`

**⚠️ IMPORTANT: Change default passwords immediately!**

## 🔐 SSL/HTTPS Setup

### Generate Self-Signed Certificates
```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key -out certs/server.cert -days 365 -nodes
```

### Enable HTTPS
In `config.json`:
```json
"ssl": {
  "enabled": true,
  "keyPath": "./certs/server.key",
  "certPath": "./certs/server.cert"
}
```

## 🛡️ Security Best Practices

### Network Security
1. **Use HTTPS** in production
2. **Configure Firewall** - Only allow necessary ports
3. **VPN Access** - Route through VPN for remote access
4. **Network Segmentation** - Isolate matrix network

### Access Control
1. **Strong Passwords** - Minimum 12 characters
2. **Regular Password Changes** - Every 90 days
3. **Principle of Least Privilege** - Only necessary permissions
4. **IP Restrictions** - Whitelist known IP addresses

### Monitoring
1. **Log Analysis** - Monitor access logs
2. **Failed Login Alerts** - Alert on multiple failures
3. **Session Monitoring** - Track active sessions
4. **Regular Audits** - Review security settings

### System Hardening
1. **Keep Updated** - Regular security updates
2. **Disable Debugging** - No debug info in production
3. **Environment Variables** - Use for sensitive config
4. **File Permissions** - Restrict access to config files

## 🚨 Security Incidents

### Account Lockout
- **Cause**: 5+ failed login attempts
- **Duration**: 15 minutes
- **Resolution**: Wait for lockout to expire or restart server

### Rate Limiting
- **Cause**: Too many requests (100/minute)
- **Duration**: 1 minute
- **Resolution**: Reduce request frequency

### Unauthorized Access
1. Check IP whitelist configuration
2. Review user permissions
3. Check session validity
4. Monitor access logs

## 📊 Security Monitoring

### Log Files
- Access logs: All HTTP requests
- Security logs: Login attempts, failures
- Error logs: System errors and exceptions
- Audit logs: Configuration changes

### Metrics to Monitor
- Failed login attempts per IP
- Active session count
- Request rate per user
- Command execution frequency

## 🔄 Security Updates

### Regular Tasks
- [ ] Update Node.js and dependencies monthly
- [ ] Review user accounts quarterly
- [ ] Rotate session secrets annually
- [ ] Security audit semi-annually

### Update Process
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Security audit
npm audit fix
```

## 🆘 Emergency Procedures

### Disable Authentication (Emergency Access)
In `config.json`:
```json
"security": {
  "enableAuth": false
}
```

### Reset All Sessions
Restart the server to invalidate all sessions.

### Lock Down System
Set `allowedIPs` to empty array to block all access:
```json
"allowedIPs": []
```

## 📋 Security Checklist

### Pre-Deployment
- [ ] Change all default passwords
- [ ] Configure IP whitelist
- [ ] Enable HTTPS
- [ ] Set strong session secret
- [ ] Review user permissions
- [ ] Test security controls

### Post-Deployment
- [ ] Monitor access logs
- [ ] Set up alerting
- [ ] Document procedures
- [ ] Train users
- [ ] Schedule security reviews

## 🔍 Penetration Testing

### Test Cases
1. **Brute Force** - Test account lockout
2. **SQL Injection** - Test input validation
3. **XSS** - Test output encoding
4. **CSRF** - Test request validation
5. **DoS** - Test rate limiting

### Tools
- OWASP ZAP - Web security scanner
- Burp Suite - Security testing
- Nmap - Network scanning
- Wireshark - Traffic analysis

## 📞 Support

For security issues:
1. Document the incident
2. Preserve logs
3. Isolate affected systems
4. Contact security team

---

**Remember: Security is ongoing, not a one-time setup!**
