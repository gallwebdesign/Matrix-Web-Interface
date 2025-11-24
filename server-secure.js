const express = require('express');
const { Telnet } = require('telnet-client');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs'); // Changed from bcrypt to bcryptjs
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const fs = require('fs');
const https = require('https');

// Load configuration
let config;
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (error) {
    console.error('Failed to load config.json:', error.message);
    process.exit(1);
}

const app = express();
const PORT = config.server.port || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimiting.windowMs,
    max: config.security.rateLimiting.maxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-key-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.server.ssl.enabled, // Only send over HTTPS if SSL enabled
        httpOnly: true, // Prevent XSS
        maxAge: config.security.sessionTimeout
    }
}));

// CORS configuration - restrict origins
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // For development, allow localhost
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Add your allowed domains here
        const allowedOrigins = ['https://yourdomain.com'];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' })); // Limit payload size

// Authentication tracking
const loginAttempts = new Map();
const lockedUsers = new Map();

// IP whitelist check
function isIPAllowed(ip) {
    if (!config.security.allowedIPs || config.security.allowedIPs.length === 0) {
        return true; // No restriction if not configured
    }
    
    return config.security.allowedIPs.some(allowed => {
        if (allowed.includes('/')) {
            // CIDR notation - simplified check
            const [network, bits] = allowed.split('/');
            // For production, use a proper CIDR library
            return ip.startsWith(network.split('.').slice(0, parseInt(bits) / 8).join('.'));
        }
        return ip === allowed;
    });
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (!config.security.enableAuth) {
        return next(); // Skip auth if disabled
    }
    
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is still valid
    if (!config.users[req.session.user.username]) {
        req.session.destroy();
        return res.status(401).json({ error: 'Invalid user session' });
    }
    
    next();
}

// Permission middleware
function requirePermission(permission) {
    return (req, res, next) => {
        if (!config.security.enableAuth) {
            return next(); // Skip if auth disabled
        }
        
        const user = config.users[req.session.user.username];
        if (!user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
}

// Input validation
function validateSwitchInput(req, res, next) {
    const { input, output } = req.body;
    
    // Validate input (0-8)
    if (!validator.isInt(String(input), { min: 0, max: 8 })) {
        return res.status(400).json({ error: 'Invalid input value' });
    }
    
    // Validate output (1-8)
    if (!validator.isInt(String(output), { min: 1, max: 8 })) {
        return res.status(400).json({ error: 'Invalid output value' });
    }
    
    next();
}

// Matrix connection variables
let telnetClient = null;
let isConnected = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_DELAY = 5000; // 5 seconds

// Secure telnet connection
async function connectToMatrix() {
    // Rate limit connection attempts
    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_RETRY_DELAY) {
        return false;
    }
    lastConnectionAttempt = now;
    
    telnetClient = new Telnet();
    
    const params = {
        host: config.matrix.ip,
        port: config.matrix.port,
        negotiationMandatory: false,
        timeout: config.matrix.timeout,
        shellPrompt: '',
        irs: '\r\n',
        ors: '\r\n',
        sendTimeout: 1000,
        execTimeout: 1500
    };

    try {
        await telnetClient.connect(params);
        isConnected = true;
        console.log(`Connected to video matrix at ${config.matrix.ip}:${config.matrix.port}`);
        return true;
    } catch (error) {
        console.error('Failed to connect to matrix:', error.message);
        isConnected = false;
        return false;
    }
}

// Secure command sending with retry logic
async function sendCommand(command) {
    // Sanitize command - only allow specific patterns
    if (!command.match(/^(SET SW|GET MP)/)) {
        throw new Error('Invalid command format');
    }
    
    let retries = 0;
    while (retries < config.matrix.maxRetries) {
        if (!isConnected) {
            const connected = await connectToMatrix();
            if (!connected) {
                throw new Error('Not connected to video matrix');
            }
        }

        try {
            const response = await telnetClient.send(command, { timeout: 1000 });
            console.log(`Sent: ${command.trim()} | Response: ${response.trim()}`);
            return response;
        } catch (error) {
            console.error(`Command error (attempt ${retries + 1}):`, error.message);
            isConnected = false;
            retries++;
            
            if (retries < config.matrix.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    throw new Error('Command failed after maximum retries');
}

// Status query with caching
let statusCache = null;
let statusCacheTime = 0;
const STATUS_CACHE_DURATION = 5000; // 5 seconds

async function queryAllStatus() {
    // Return cached result if recent
    const now = Date.now();
    if (statusCache && (now - statusCacheTime) < STATUS_CACHE_DURATION) {
        return statusCache;
    }
    
    if (!isConnected) {
        const connected = await connectToMatrix();
        if (!connected) {
            throw new Error('Not connected to video matrix');
        }
    }

    const statusMap = {};
    
    try {
        const command = `GET MP all\r\n`;
        const response = await telnetClient.send(command, { 
            timeout: 1500,
            waitFor: false
        });
        
        const lines = response.split(/\r?\n/);
        
        for (const line of lines) {
            const match = line.match(/MP\s+in(\d+)\s+out(\d+)/i);
            if (match) {
                const input = parseInt(match[1]);
                const output = parseInt(match[2]);
                statusMap[output] = input;
            }
        }
        
        if (Object.keys(statusMap).length === 0) {
            throw new Error('No mapping data received');
        }
        
        // Cache the result
        statusCache = statusMap;
        statusCacheTime = now;
        
        return statusMap;
    } catch (error) {
        console.error('Status query error:', error.message);
        throw error;
    }
}

// Serve static files
app.use(express.static('public'));

// Authentication routes
app.post('/api/login', async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check IP whitelist
    if (!isIPAllowed(clientIP)) {
        return res.status(403).json({ error: 'Access denied from this IP' });
    }
    
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password || 
        !validator.isAlphanumeric(username) || 
        username.length > 50 || password.length > 100) {
        return res.status(400).json({ error: 'Invalid credentials format' });
    }
    
    // Check if user is locked out
    const lockKey = `${clientIP}:${username}`;
    if (lockedUsers.has(lockKey)) {
        const lockTime = lockedUsers.get(lockKey);
        if (Date.now() - lockTime < config.security.lockoutTime) {
            return res.status(429).json({ error: 'Account temporarily locked' });
        } else {
            lockedUsers.delete(lockKey);
            loginAttempts.delete(lockKey);
        }
    }
    
    // Check user exists
    const user = config.users[username];
    if (!user) {
        // Track failed attempt
        const attempts = loginAttempts.get(lockKey) || 0;
        loginAttempts.set(lockKey, attempts + 1);
        
        if (attempts + 1 >= config.security.maxLoginAttempts) {
            lockedUsers.set(lockKey, Date.now());
        }
        
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        // Track failed attempt
        const attempts = loginAttempts.get(lockKey) || 0;
        loginAttempts.set(lockKey, attempts + 1);
        
        if (attempts + 1 >= config.security.maxLoginAttempts) {
            lockedUsers.set(lockKey, Date.now());
        }
        
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Success - clear attempts and create session
    loginAttempts.delete(lockKey);
    req.session.user = {
        username: username,
        role: user.role,
        loginTime: Date.now()
    };
    
    res.json({ 
        success: true, 
        user: { 
            username: username, 
            role: user.role,
            permissions: user.permissions
        } 
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Protected API routes
app.get('/api/status', requireAuth, (req, res) => {
    res.json({ 
        connected: isConnected,
        matrixIP: config.matrix.ip,
        matrixPort: config.matrix.port,
        user: req.session.user
    });
});

app.post('/api/connect', requireAuth, requirePermission('switch'), async (req, res) => {
    try {
        const success = await connectToMatrix();
        res.json({ success, connected: isConnected });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/switch', requireAuth, requirePermission('switch'), validateSwitchInput, async (req, res) => {
    const { input, output } = req.body;
    
    const inputStr = input === 0 ? 'in0' : `in${input}`;
    const outputStr = `out${output}`;
    
    const command = `SET SW ${inputStr} ${outputStr}\r\n`;

    try {
        const response = await sendCommand(command);
        
        // Clear status cache
        statusCache = null;
        
        res.json({ 
            success: true, 
            input: inputStr,
            output: outputStr,
            response: response.trim()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/query-status', requireAuth, requirePermission('query'), async (req, res) => {
    try {
        const statusMap = await queryAllStatus();
        res.json({ 
            success: true, 
            routing: statusMap 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/disconnect', requireAuth, async (req, res) => {
    if (telnetClient && isConnected) {
        try {
            await telnetClient.end();
            isConnected = false;
            res.json({ success: true, connected: false });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.json({ success: true, connected: false });
    }
});

// Function to open browser
function openBrowser(url) {
    const start = (process.platform == 'darwin' ? 'open' : 
                   process.platform == 'win32' ? 'start' : 'xdg-open');
    exec(`${start} ${url}`);
}

// Start server (with optional HTTPS)
function startServer() {
    const startMessage = () => {
        console.log('\n============================================');
        console.log('  🔒 SECURE Video Matrix Control Server');
        console.log('============================================');
        const protocol = config.server.ssl.enabled ? 'https' : 'http';
        console.log(`Server running at: ${protocol}://localhost:${PORT}`);
        console.log(`Matrix IP: ${config.matrix.ip}`);
        console.log(`Authentication: ${config.security.enableAuth ? 'ENABLED' : 'DISABLED'}`);
        console.log(`SSL: ${config.server.ssl.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log('============================================\n');
        
        if (!config.security.enableAuth) {
            console.log('⚠️  WARNING: Authentication is disabled!');
        }
        
        console.log('Opening browser...\n');
        
        setTimeout(() => {
            const protocol = config.server.ssl.enabled ? 'https' : 'http';
            openBrowser(`${protocol}://localhost:${PORT}`);
        }, 1000);
        
        console.log('Attempting initial connection...');
        connectToMatrix();
    };

    if (config.server.ssl.enabled) {
        // HTTPS server
        try {
            const options = {
                key: fs.readFileSync(config.server.ssl.keyPath),
                cert: fs.readFileSync(config.server.ssl.certPath)
            };
            
            https.createServer(options, app).listen(PORT, startMessage);
        } catch (error) {
            console.error('SSL certificate error:', error.message);
            console.log('Falling back to HTTP...');
            app.listen(PORT, startMessage);
        }
    } else {
        // HTTP server
        app.listen(PORT, startMessage);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\nShutting down securely...');
    if (telnetClient && isConnected) {
        await telnetClient.end();
    }
    process.exit(0);
});

module.exports = app;