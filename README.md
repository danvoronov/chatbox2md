# ChatBox to Markdown Converter

A Node.js tool that converts [ChatBox](https://github.com/Bin-Huang/chatbox) JSON exports into Markdown files compatible with Obsidian.

## Why

ChatBox allows exporting only current chat to Markdown. If you have many chats and want to have a copy of them in Obsidian, there is no direct way to do so.

## Features

- Converts ChatBox chat history to Markdown format
- Preserves timestamps and message structure
- Handles system messages, links, and web browsing history
- Due to the nature of ChatBox exports, images and files cannot be processed as they are not included in the export
- Interactive file selection menu
- Compatible with Obsidian for easy note organization

## Installation

1. Clone or download this repository

## Usage

1. Export your ChatBox conversations as JSON and place them in the `input` folder: : оpen Settings, then click ADVANCED tab. Expand 'Data Backup and Restore', check 'Chat History', and click EXPORT SELECTED DATA button.
2. Ensure Node.js is installed on your system. You can download it from [nodejs.org](https://nodejs.org/)
3. Run the converter:
```bash
node convert.js
```
4. Use arrow keys (↑↓) to select the JSON file you want to convert
5. Press Enter to process the selected file
6. Find the converted Markdown files in the `output` folder

## Output Format

The converter creates Markdown files with the following structure:

- Files are named using the pattern: `YYYY-MM-DD_HHMM_chatname.md`
- Each day of conversation starts with a level 2 heading (`## YYYY-MM-DD`)
- Messages include timestamps and roles
- System messages are wrapped in code blocks
- Links and web browsing history are preserved
- Special content (pictures, files) is marked with placeholders

## Supported Message Types

- Regular chat messages
- System messages
- Messages with links
- Messages with web browsing history
- Messages with files or pictures (marked with placeholders)

## Known Issues

- If a system message contains a code block formatted with triple backticks (```), it will not be displayed correctly in the output Markdown file. This is due to the way the converter processes code blocks within system messages.
