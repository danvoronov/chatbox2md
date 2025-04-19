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
const AdmZip = require('adm-zip');

const inputChatboxDir = 'input_chatbox';
const inputCheryDir = 'input_cherry';
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

    // Check if chat and chat.messages exist and is an array before proceeding
    if (!chat || !Array.isArray(chat.messages)) {
        console.warn('Warning: Chat data is missing or messages are not in expected array format. Skipping message conversion.');
        return '<!-- Warning: No messages found or invalid format -->\n'; // Return a comment indicating the issue
    }
    
    // Convert messages
    chat.messages.forEach(msg => {
        // Ensure msg and msg.role are valid before accessing properties
        if (!msg || typeof msg.role !== 'string') {
             console.warn('Skipping invalid message object:', msg);
             return; // Skip this iteration
        }

        const role = msg.role.toUpperCase();
        // Ensure timestamp is present before formatting
        const timestamp = msg.timestamp ? getSafeTimestamp(msg.timestamp) : Date.now(); // Use current time if timestamp is missing
        const { date, time } = formatMessageDateTime(timestamp);
        
        // Add date if it changed
        if (date !== lastDate) {
            markdown += `## ${date}\n\n`;
            lastDate = date;
        }
        
        // Handle SYSTEM messages differently 
        // Ensure content exists
        const content = msg.content || ''; // Default to empty string if content is missing

        if (role === 'SYSTEM') {
            markdown += '```system\n' + content + '\n```\n\n';
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
            
            markdown += content + '\n'; // Use safe content variable
        
            if (msg.pictures && msg.pictures.length > 0) {
                markdown += '\n{pictures}\n';
            }
            
            if (msg.files && msg.files.length > 0) {
                markdown += '\n{files}\n';
            }

            if (msg.links && msg.links.length > 0) {
                markdown += '\n{links}\n';
                msg.links.forEach(link => {
                   // Add check for link object validity
                   if (link && link.url) {
                       markdown += `[${link.title || link.url}](${link.url})\n`;
                   }
                });
            }

            if (msg.webBrowsing && msg.webBrowsing.links && msg.webBrowsing.links.length > 0) {
                markdown += '\n{web search links}\n';
                msg.webBrowsing.links.forEach(link => {
                    // Add check for link object validity
                    if (link && link.url) {
                         markdown += `- [${link.title || link.url}](${link.url})\n`;
                    }
                });
            }        
        }

        markdown += '\n';
    });

    return markdown;
}

function listJsonFiles(inputDir) {
    let files = fs.readdirSync(inputDir);
    // Если это папка для Chery, показываем .json и .zip
    if (inputDir === inputCheryDir) {
        files = files.filter(file => file.endsWith('.json') || file.endsWith('.zip'));
    } else {
        files = files.filter(file => file.endsWith('.json'));
    }
    return files.map(file => path.join(inputDir, file));
}

function displayMenu(cherryFiles, chatboxFiles, selectedIndex) {
    console.clear();
    const cherryCount = cherryFiles.length;
    const totalFiles = cherryCount + chatboxFiles.length;

    console.log('=== Cherry Studio files (.zip, .json) ===');
    if (cherryCount === 0) console.log('(No files found in input_cherry)');
    cherryFiles.forEach((file, index) => {
        console.log(`${index === selectedIndex ? '>' : ' '} ${path.basename(file)}`);
    });

    console.log('\n=== Chatbox files (.json) ===');
    if (chatboxFiles.length === 0) console.log('(No files found in input_chatbox)');
    chatboxFiles.forEach((file, index) => {
        const absoluteIndex = cherryCount + index;
        console.log(`${absoluteIndex === selectedIndex ? '>' : ' '} ${path.basename(file)}`);
    });
     console.log('\nUse UP/DOWN arrows to select, ENTER to process, CTRL+C to exit.');
}

async function showFileSelectionMenu(cherryFiles, chatboxFiles) {
    const allFiles = [...cherryFiles, ...chatboxFiles];
    const cherryCount = cherryFiles.length;

    if (allFiles.length === 0) {
        console.error('No JSON or ZIP files found in input directories');
        process.exit(1);
    }

    let selectedIndex = 0;
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    return new Promise((resolve) => {
        displayMenu(cherryFiles, chatboxFiles, selectedIndex); // Use new display function

        const keypressHandler = (str, key) => {
            if (key.ctrl && key.name === 'c') {
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                rl.close();
                process.exit();
            } else if (key.name === 'up') {
                if (selectedIndex > 0) {
                    selectedIndex--;
                    displayMenu(cherryFiles, chatboxFiles, selectedIndex);
                }
            } else if (key.name === 'down') {
                if (selectedIndex < allFiles.length - 1) {
                    selectedIndex++;
                    displayMenu(cherryFiles, chatboxFiles, selectedIndex);
                }
            } else if (key.name === 'return') {
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                process.stdin.removeListener('keypress', keypressHandler);
                rl.close();
                // Determine type based on index
                const selectedFilePath = allFiles[selectedIndex];
                const type = selectedIndex < cherryCount ? 'cherry' : 'chatbox';
                resolve({ filePath: selectedFilePath, type: type }); // Return object
            }
        };
        process.stdin.on('keypress', keypressHandler);
    });
}

async function main() {
    try {
        // Ensure directories exist
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        if (!fs.existsSync(inputCheryDir)) fs.mkdirSync(inputCheryDir, { recursive: true });
        if (!fs.existsSync(inputChatboxDir)) fs.mkdirSync(inputChatboxDir, { recursive: true });

        // List files
        const cherryFiles = listJsonFiles(inputCheryDir);
        const chatboxFiles = listJsonFiles(inputChatboxDir);

        if (cherryFiles.length === 0 && chatboxFiles.length === 0) {
            console.log('No JSON or ZIP files found in input directories.');
            return;
        }

        const selection = await showFileSelectionMenu(cherryFiles, chatboxFiles);
        if (!selection) {
            console.log('No file selected. Exiting.');
            return;
        }

        const { filePath, fileType } = selection;
        let chatData;
        let targetOutputDir = outputDir; // Default output directory

        try {
            if (fileType === 'cherry') {
                console.log(`Processing Cherry Studio file: ${path.relative(process.cwd(), filePath)}`);
                chatData = parseCherryStudio(filePath);
                // For Cherry Studio, we might keep the output flat for now, or decide later
                // targetOutputDir = path.join(outputDir, path.basename(filePath, path.extname(filePath)));
            } else { // chatbox
                console.log(`Processing chatbox file: ${path.relative(process.cwd(), filePath)}`);
                chatData = parseChatbox(filePath);
                // Create subdirectory for chatbox output based on filename
                const subDirName = path.basename(filePath, '.json');
                targetOutputDir = path.join(outputDir, subDirName);
                if (!fs.existsSync(targetOutputDir)) {
                    fs.mkdirSync(targetOutputDir, { recursive: true });
                    console.log(`   Created subdirectory: ${path.relative(process.cwd(), targetOutputDir)}`);
                }
            }

            if (chatData && chatData.length > 0) {
                saveChatsToMarkdown(chatData, targetOutputDir); // Pass the specific output dir
                console.log(`\nSuccessfully processed ${path.basename(filePath)} and generated ${chatData.length} Markdown file(s) in '${path.relative(process.cwd(), targetOutputDir)}'.`);
            } else {
                console.log(`No chat data extracted from ${path.basename(filePath)}.`);
            }
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
        }
    } catch (error) {
        console.error('An error occurred during the process:', error);
        process.exit(1);
    }
}

// Placeholder/stub for parseChatbox (to be implemented)
async function parseChatbox(filePath) {
    console.log(`[Stub] Parsing Chatbox file: ${filePath}`);
     // TODO: Implement actual parsing logic
     // Read file -> find 'chat-sessions' -> extract title/name and messages for each session
     // Return [{ title: "Session 1", messages: [...] }, { title: "Session 2", messages: [...] }]
     const fileContent = fs.readFileSync(filePath, 'utf8');
     const data = JSON.parse(fileContent);
     let chats = [];

     // --- Common Chatbox structure ---
     if (data['chat-sessions'] && Array.isArray(data['chat-sessions'])) {
         chats = data['chat-sessions'].map((session, index) => ({
             // Try to get a meaningful title
             title: session.name || session.threadName || `Chatbox Session ${index + 1}`,
             messages: session.messages || [] // Assume messages array exists
         }));
     } 
     // --- Fallback for single chat structure? (Less common for exports) ---
     else if (Array.isArray(data.messages)) {
          chats.push({
              title: data.title || data.name || path.basename(filePath, '.json'),
              messages: data.messages
          });
     }
      else {
           console.warn(`Warning: Could not find expected 'chat-sessions' array or 'messages' array in ${path.basename(filePath)}.`);
      }


     console.log(`[Stub] Found ${chats.length} chat sessions in Chatbox file.`);
    return chats; // Return array of { title, messages }
}

// Placeholder/stub for parseCherryStudio (to be implemented/refactored)
async function parseCherryStudio(filePath) {
     console.log(`[Stub] Parsing Cherry Studio file: ${filePath}`);
      // TODO: Implement actual parsing logic
      // Handle ZIP extraction if needed -> find 'log' or similar -> extract title and messages
      // Return [{ title: "Topic 1", messages: [...] }, { title: "Topic 2", messages: [...] }]
      
      let jsonData = null;
      let potentialTitle = path.basename(filePath, path.extname(filePath)); // Default title

       try {
         if (filePath.endsWith('.zip')) {
             const zip = new AdmZip(filePath);
             const zipEntries = zip.getEntries();
             const jsonEntry = zipEntries.find(entry => entry.entryName.endsWith('.json') && !entry.isDirectory);
             if (jsonEntry) {
                 console.log(`   Extracting ${jsonEntry.entryName} from ZIP...`);
                 const jsonContent = zip.readAsText(jsonEntry);
                 jsonData = JSON.parse(jsonContent);
                 potentialTitle = jsonData.title || potentialTitle; // Use title from JSON if present
             } else {
                 console.warn(`   Warning: No JSON file found in ZIP: ${filePath}`);
                 return []; // Return empty if no JSON
             }
         } else if (filePath.endsWith('.json')) {
              console.log(`   Reading direct JSON: ${filePath}`);
              const jsonContent = fs.readFileSync(filePath, 'utf8');
              jsonData = JSON.parse(jsonContent);
              potentialTitle = jsonData.title || potentialTitle; 
         } else {
              console.warn(`   Unsupported file type for Cherry Studio: ${filePath}`);
               return [];
         }
 
         // Now parse the jsonData (assuming it has a 'log' array)
         let chats = [];
         if (jsonData && jsonData.log && Array.isArray(jsonData.log)) {
              // Cherry Studio often has one continuous log, maybe use file title?
              // Or does 'log' contain structure indicating topics? Assuming one chat for now.
              const messages = jsonData.log.map(entry => ({
                        role: (entry.role || 'unknown').toLowerCase() === 'you' ? 'user' : (entry.role || 'unknown').toLowerCase(),
                        content: entry.content || '',
                        timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString(),
                    }));
              chats.push({ title: potentialTitle, messages: messages });
              console.log(`[Stub] Parsed 1 chat session from Cherry Studio data.`);
         } else {
              console.warn(`   Warning: Could not find 'log' array in the parsed Cherry Studio JSON data.`);
         }
          return chats; // Return array of { title, messages }
 
     } catch (error) {
         console.error(`   Error parsing Cherry Studio file ${filePath}:`, error);
          return []; // Return empty on error
     }
}

// Function to save chat data to Markdown files
function saveChatsToMarkdown(chats, targetDir) { // <-- Accept target directory
    console.log(`[Stub] Saving ${chats.length} chats to Markdown in ${path.relative(process.cwd(), targetDir)}...`);
    chats.forEach(chat => {
        const { title, messages } = chat;
        // Use a simplified stub for messages for now
        const fakeContent = messages && messages.length > 0 ? `First message: ${messages[0].content.substring(0, 50)}...` : 'No messages';
        const markdownContent = `# ${title}\n\n${fakeContent}`; // Very basic stub content

        // Create filename
        const timestamp = messages && messages.length > 0 ? messages[0].timestamp || Date.now() : Date.now();
        const date = new Date(timestamp);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const timeString = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
        const safeTitle = title.replace(/[<>:"/\\|?*.\s]+/g, '_').substring(0, 50) || 'unnamed_chat';
        const filename = `${dateString}_${timeString}_${safeTitle}.md`;
        const fullPath = path.join(targetDir, filename); // <-- Use targetDir

        try {
            fs.writeFileSync(fullPath, markdownContent);
            console.log(`   Created: ${path.relative(targetDir, filename)}`); // Log relative to targetDir for clarity
        } catch (error) {
            console.error(`   Error writing file ${filename}:`, error);
        }
    });
    console.log('[Stub] Finished saving chats.');
}

main();
