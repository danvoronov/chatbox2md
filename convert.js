/**
 * This script converts chat sessions stored in JSON files to Markdown format.
 * It reads JSON files from the 'input' directory, processes each chat session,
 * and writes the converted Markdown files to the 'output' directory.
 * 
 * The script includes the following functions:
 * 
 * - isValidTimestamp(timestamp): Checks if a given timestamp is valid.
 * - getSafeTimestamp(timestamp): Returns a valid timestamp, or the current time if the given timestamp is invalid.
 * - formatDate(timestamp): Formats a timestamp into a string with the format 'YYYY-MM-DD_HHMM'.
 * - sanitizeFileName(name, maxLength): Sanitizes a file name by replacing invalid characters and truncating it to a maximum length.
 * - formatMessageDateTime(timestamp): Formats a timestamp into an object containing date and time strings.
 * - convertChatToMarkdown(chat): Converts a chat session object to a Markdown string.
 * - listJsonFiles(): Lists all JSON files in the 'input' directory.
 * - displayMenu(files, selectedIndex): Displays a menu for selecting a JSON file.
 * - showFileSelectionMenu(): Shows a file selection menu and returns the selected file path.
 * - main(): The main function that orchestrates the conversion process.
 * 
 * The script uses the 'fs', 'path', and 'readline' modules from Node.js.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline'); 

const inputDir = 'input';
const outputDir = 'output';

function isValidTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    return date instanceof Date && !isNaN(date) && date <= now;
}

function getSafeTimestamp(timestamp) {
    return isValidTimestamp(timestamp) ? timestamp : Date.now();
}

function formatDate(timestamp) {
    const date = new Date(getSafeTimestamp(timestamp));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}${minutes}`;
}

function sanitizeFileName(name, maxLength = 50) {
    let sanitized = name
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized || 'unnamed_chat';
}

function formatMessageDateTime(timestamp) {
    const date = new Date(getSafeTimestamp(timestamp));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
    };
}

function convertChatToMarkdown(chat) {
    let markdown = '';
    let lastDate = '';
    
    // Convert messages
    chat.messages.forEach(msg => {
        const role = msg.role.toUpperCase();
        const { date, time } = formatMessageDateTime(msg.timestamp);
        
        // Add date if it changed
        if (date !== lastDate) {
            markdown += `## ${date}\n\n`;
            lastDate = date;
        }
        
        // Handle SYSTEM messages differently 
        if (role === 'SYSTEM') {
            markdown += '```system\n' + msg.content + '\n```\n\n';
        } else {
            // Add header and content for non-SYSTEM messages
            if (role === 'ASSISTANT') {
                if (msg.model) {
                    markdown += `### ${msg.model} | ${time}\n`;
                } else {
                    markdown += `### ASSISTANT | ${time}\n`;
                }
            } else {
                markdown += `### ${role} | ${time}\n`;
            }
            
            markdown += msg.content + '\n';
        
            if (msg.pictures && msg.pictures.length > 0) {
                markdown += '\n{pictures}\n';
            }
            
            if (msg.files && msg.files.length > 0) {
                markdown += '\n{files}\n';
            }

            if (msg.links && msg.links.length > 0) {
                markdown += '\n{links}\n';
                msg.links.forEach(link => {
                markdown += `[${link.title}](${link.url})\n`;
                });
            }

            if (msg.webBrowsing && msg.webBrowsing.links && msg.webBrowsing.links.length > 0) {
                markdown += '\n{web search links}\n';
                msg.webBrowsing.links.forEach(link => {
                    markdown += `- [${link.title || link.url}](${link.url})\n`;
                });
            }        
        }

        markdown += '\n';
    });

    return markdown;
}

function listJsonFiles() {
    return fs.readdirSync(inputDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(inputDir, file));
}

function displayMenu(files, selectedIndex) {
    console.clear();
    console.log('Select a JSON file to process:\n');
    files.forEach((file, index) => {
        console.log(`${index === selectedIndex ? '>' : ' '} ${path.basename(file)}`);
    });
}

async function showFileSelectionMenu() {
    const files = listJsonFiles();
    if (files.length === 0) {
        console.error('No JSON files found in input directory');
        process.exit(1);
    }

    let selectedIndex = 0;
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    return new Promise((resolve) => {
        displayMenu(files, selectedIndex);

        process.stdin.on('keypress', (str, key) => {
            if (key.name === 'up' && selectedIndex > 0) {
                selectedIndex--;
                displayMenu(files, selectedIndex);
            } else if (key.name === 'down' && selectedIndex < files.length - 1) {
                selectedIndex++;
                displayMenu(files, selectedIndex);
            } else if (key.name === 'return') {
                process.stdin.setRawMode(false);
                rl.close();
                resolve(files[selectedIndex]);
            } else if (key.ctrl && key.name === 'c') {
                process.exit();
            }
        });
    });
}

async function main() {
    try {
        const selectedFile = await showFileSelectionMenu();
        const jsonData = JSON.parse(fs.readFileSync(selectedFile, 'utf-8'));

        // Create or clean output directory
        if (fs.existsSync(outputDir)) {
            fs.readdirSync(outputDir).forEach(file => {
                const filePath = path.join(outputDir, file);
                fs.unlinkSync(filePath);
            });
        } else {
            fs.mkdirSync(outputDir);
        }

        // Process each chat session
        jsonData['chat-sessions'].forEach(chat => {
            const timestamp = getSafeTimestamp(chat.messages[0]?.timestamp) || Date.now();
            const datePrefix = formatDate(timestamp);
            const chatName = chat.name || chat.threadName || 'unnamed_chat';
            const sanitizedChatName = sanitizeFileName(chatName);
            const fileName = `${datePrefix}_${sanitizedChatName}.md`;
            const filePath = path.join(outputDir, fileName);

            const markdown = convertChatToMarkdown(chat);
            fs.writeFileSync(filePath, markdown, 'utf-8');
            console.log(`Created: ${fileName}`);
        });

        console.log('\nConversion completed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
