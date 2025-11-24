const express = require('express');
const { Telnet } = require('telnet-client');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Video Matrix Configuration
const MATRIX_IP = '192.168.2.142'; // Change this to your matrix IP
const MATRIX_PORT = 23;

// Telnet client instance
let telnetClient = null;
let isConnected = false;

// Initialize telnet connection
async function connectToMatrix() {
    telnetClient = new Telnet();
    
    const params = {
        host: MATRIX_IP,
        port: MATRIX_PORT,
        negotiationMandatory: false,
        timeout: 2000,  // Reduced from 5000ms to 2000ms
        shellPrompt: '',
        irs: '\r\n',
        ors: '\r\n',
        sendTimeout: 1000,  // Add send timeout
        execTimeout: 1500   // Add execution timeout
    };

    try {
        await telnetClient.connect(params);
        isConnected = true;
        console.log(`Connected to video matrix at ${MATRIX_IP}:${MATRIX_PORT}`);
        return true;
    } catch (error) {
        console.error('Failed to connect to matrix:', error.message);
        isConnected = false;
        return false;
    }
}

// Send command to matrix
async function sendCommand(command) {
    if (!isConnected) {
        const connected = await connectToMatrix();
        if (!connected) {
            throw new Error('Not connected to video matrix');
        }
    }

    try {
        const response = await telnetClient.send(command, { 
            timeout: 1000  // Fast response time for switch commands
        });
        console.log(`Sent: ${command.trim()} | Response: ${response.trim()}`);
        return response;
    } catch (error) {
        console.error('Command error:', error.message);
        isConnected = false;
        throw error;
    }
}

// Query current status of all outputs
async function queryAllStatus() {
    if (!isConnected) {
        const connected = await connectToMatrix();
        if (!connected) {
            throw new Error('Not connected to video matrix');
        }
    }

    const statusMap = {};
    
    try {
        // Use GET MP all command to get all mappings at once
        const command = `GET MP all\r\n`;
        const response = await telnetClient.send(command, { 
            timeout: 1500,  // Reduced from 3000ms to 1500ms
            waitFor: false  // Don't wait for specific prompt
        });
        
        console.log('GET MP all response:', response);
        
        // Parse response - format is multiple lines of "MP in<X> out<Y>"
        const lines = response.split(/\r?\n/);
        
        for (const line of lines) {
            const match = line.match(/MP\s+in(\d+)\s+out(\d+)/i);
            if (match) {
                const input = parseInt(match[1]);
                const output = parseInt(match[2]);
                statusMap[output] = input;
                console.log(`Output ${output} <- Input ${input}${input === 0 ? ' (OFF)' : ''}`);
            }
        }
        
        if (Object.keys(statusMap).length === 0) {
            throw new Error('No mapping data received');
        }
        
        return statusMap;
    } catch (error) {
        console.error('Status query error:', error.message);
        throw error;
    }
}

// API Routes

// Get connection status
app.get('/api/status', (req, res) => {
    res.json({ 
        connected: isConnected,
        matrixIP: MATRIX_IP,
        matrixPort: MATRIX_PORT
    });
});

// Connect to matrix
app.post('/api/connect', async (req, res) => {
    try {
        const success = await connectToMatrix();
        res.json({ success, connected: isConnected });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Switch input to output
app.post('/api/switch', async (req, res) => {
    const { input, output } = req.body;

    // Validate input/output
    if (!input || !output) {
        return res.status(400).json({ error: 'Input and output are required' });
    }

    // Format: in1, in2, etc. or in0 for off
    const inputStr = input === 0 ? 'in0' : `in${input}`;
    const outputStr = `out${output}`;
    
    // Command format: SET SW in out<CR><LF>
    const command = `SET SW ${inputStr} ${outputStr}\r\n`;

    try {
        const response = await sendCommand(command);
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

// Query current status of all outputs
app.get('/api/query-status', async (req, res) => {
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

// Disconnect from matrix
app.post('/api/disconnect', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
    console.log(`Video Matrix Control Server running on http://localhost:${PORT}`);
    console.log(`Matrix IP: ${MATRIX_IP}`);
    console.log(`Matrix Port: ${MATRIX_PORT}`);
    console.log('\nAttempting initial connection...');
    connectToMatrix();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    if (telnetClient && isConnected) {
        await telnetClient.end();
    }
    process.exit(0);
});
