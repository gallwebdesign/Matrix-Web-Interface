#!/usr/bin/env node

const bcrypt = require('bcrypt');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createUser() {
    console.log('=== Create New User ===\n');
    
    const username = await question('Username: ');
    const password = await question('Password: ', true);
    const role = await question('Role (admin/operator): ');
    
    if (!username || !password || !role) {
        console.log('All fields are required!');
        process.exit(1);
    }

    if (!['admin', 'operator'].includes(role)) {
        console.log('Role must be either "admin" or "operator"');
        process.exit(1);
    }

    console.log('\nHashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const permissions = role === 'admin' 
        ? ['switch', 'query', 'config'] 
        : ['switch', 'query'];

    const userConfig = {
        passwordHash: passwordHash,
        role: role,
        permissions: permissions
    };

    console.log('\n=== User Configuration ===');
    console.log(`Username: ${username}`);
    console.log(`Role: ${role}`);
    console.log(`Permissions: ${permissions.join(', ')}`);
    console.log(`Password Hash: ${passwordHash}`);

    console.log('\n=== Add to config.json ===');
    console.log('Add this to the "users" section of your config.json:');
    console.log(`"${username}": ${JSON.stringify(userConfig, null, 2)}`);

    rl.close();
}

function question(prompt, hidden = false) {
    return new Promise((resolve) => {
        if (hidden) {
            process.stdout.write(prompt);
            process.stdin.resume();
            process.stdin.setRawMode(true);
            process.stdin.setEncoding('utf8');
            
            let input = '';
            process.stdin.on('data', function(char) {
                char = char + '';
                
                switch (char) {
                    case '\n':
                    case '\r':
                    case '\u0004':
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdout.write('\n');
                        resolve(input);
                        break;
                    case '\u0003':
                        process.exit();
                        break;
                    case '\u007f': // backspace
                        if (input.length > 0) {
                            input = input.slice(0, -1);
                            process.stdout.write('\b \b');
                        }
                        break;
                    default:
                        input += char;
                        process.stdout.write('*');
                        break;
                }
            });
        } else {
            rl.question(prompt, resolve);
        }
    });
}

createUser().catch(console.error);
