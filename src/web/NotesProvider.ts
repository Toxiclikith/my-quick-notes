import * as vscode from 'vscode';

export class NotesProvider implements vscode.WebviewViewProvider {

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    resolveWebviewView(webviewView: vscode.WebviewView): void {

        webviewView.webview.onDidReceiveMessage(
            async (message) => {

                switch (message.type) {

                    case 'save':

                        await this.context.globalState.update(
                            'quickNotes',
                            message.value
                        );

                        break;

                    case 'clear':

                        await this.context.globalState.update(
                            'quickNotes',
                            ''
                        );

                        break;

                    case 'download': {

                        const fileName =
                            `my-quick-notes-${new Date()
                                .toISOString()
                                .slice(0, 19)
                                .replace(/:/g, '-')}.txt`;

                        const uri = await vscode.window.showSaveDialog({
                            title: 'Save Quick Notes',
                            defaultUri: vscode.Uri.file(fileName),
                            saveLabel: 'Download',
                            filters: {
                                'Text Files': ['txt']
                            }
                        });

                        // user cancelled
                        if (!uri) {
                            return;
                        }

                        const encoder = new TextEncoder();

                        await vscode.workspace.fs.writeFile(
                            uri,
                            encoder.encode(message.value)
                        );

                        vscode.window.showInformationMessage(
                            'Quick Notes downloaded successfully!'
                        );

                        break;
                    }
                }
            }
        );

        webviewView.webview.options = {
            enableScripts: true
        };

        const savedNotes =
            this.context.globalState.get<string>('quickNotes') || '';

        webviewView.webview.html =
            this.getHtml(savedNotes);

        webviewView.webview.onDidReceiveMessage(
            async (message) => {

                switch (message.type) {

                    case 'save':

                        await this.context.globalState.update(
                            'quickNotes',
                            message.value
                        );

                        break;

                    case 'clear':

                        await this.context.globalState.update(
                            'quickNotes',
                            ''
                        );

                        break;
                }
            }
        );
    }

    private getHtml(notes: string): string {

        return `
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<style>

* {
    box-sizing: border-box;
}

body {
    padding: 16px;
    font-family: Arial, sans-serif;
    background-color: #1e1e1e;
    color: white;
}

h1 {
    font-size: 14px;
    margin-bottom: 15px;
}

textarea {
    width: 100%;
    height: 75vh;

    resize: none;

    border: 1px solid #333;
    border-radius: 12px;

    padding: 16px;

    background: #252526;
    color: white;

    font-size: 15px;
    line-height: 1.6;

    outline: none;
}

textarea:focus {
    border-color: #007acc;
    box-shadow: 0 0 8px rgba(0,122,204,0.4);
}

.toolbar {
    display: flex;
    gap: 10px;
    margin-top: 14px;
}

button {
    border: none;
    padding: 10px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
}

.clear-btn {
    background: #e53935;
    color: white;
}

.clear-btn:hover {
    background: #ff4d4d;
}

.save-status {
    margin-top: 10px;
    color: #4caf50;
    font-size: 13px;
}

.download-btn {
    background: #007acc;
    color: white;
}

.download-btn:hover {
    background: #1a8cff;
}
</style>

</head>

<body>

<h1>📝 Quick Pad</h1>

<div id="findBox" style="
    display:none;
    margin-bottom:10px;
    gap:8px;
    align-items:center;
">
    <input
        id="findInput"
        type="text"
        placeholder="Find..."
        style="
            flex:1;
            padding:8px;
            border-radius:6px;
            border:1px solid #444;
            background:#252526;
            color:white;
        "
    />
    <button onclick="findNext()">Find</button>
</div>

<textarea
    id="notes"
    placeholder="Write your notes here..."
>${notes}</textarea>

<div class="toolbar">

    <button
        class="clear-btn"
        onclick="clearNotes()"
    >
        Clear Notes
    </button>

    <button
        class="download-btn"
        onclick="downloadNotes()"
    >
        Download
    </button>

</div>

<div
    class="save-status"
    id="status"
>
    Auto-saved
</div>

<script>

const vscode = acquireVsCodeApi();

const textarea =
    document.getElementById('notes');

const status =
    document.getElementById('status');

const previousState = vscode.getState();

if (
    previousState &&
    typeof previousState.notes === 'string'
) {
    textarea.value = previousState.notes;
}

textarea.addEventListener('input', () => {

    status.innerText = 'Saving...';

    const value = textarea.value;

    vscode.setState({
        notes: value
    });

    vscode.postMessage({
        type: 'save',
        value
    });

    status.innerText = 'Auto-saved';
});

function clearNotes() {

    textarea.value = '';

    vscode.setState({
        notes: ''
    });

    vscode.postMessage({
        type: 'clear'
    });

    status.innerText = 'Notes cleared';
}

const findBox =
    document.getElementById('findBox');

const findInput =
    document.getElementById('findInput');

let lastIndex = -1;

document.addEventListener('keydown', (e) => {

    if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'f'
    ) {
        e.preventDefault();

        findBox.style.display = 'flex';

        findInput.focus();
        findInput.select();
    }

    if (
        e.key === 'Escape'
    ) {
        findBox.style.display = 'none';
    }
});

findInput.addEventListener('keydown', (e) => {

    if (e.key === 'Enter') {
        findNext();
    }
});

function findNext() {

    const search =
        findInput.value;

    if (!search) {
        return;
    }

    const text =
        textarea.value;

    let index =
        text.indexOf(
            search,
            lastIndex + 1
        );

    if (index === -1) {
        index =
            text.indexOf(search, 0);
    }

    if (index === -1) {
        return;
    }

    lastIndex = index;

    textarea.focus();

    textarea.setSelectionRange(
        index,
        index + search.length
    );
    scrollToSelection(textarea);
}

function scrollToSelection(el) {

    const start =
        el.selectionStart;

    const textBefore =
        el.value.substring(0, start);

    const div =
        document.createElement('div');

    const style =
        getComputedStyle(el);

    div.style.whiteSpace = 'pre-wrap';
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.font = style.font;
    div.style.width = style.width;

    div.textContent = textBefore;

    document.body.appendChild(div);

    const scrollTop =
        div.scrollHeight;

    document.body.removeChild(div);

    el.scrollTop = scrollTop - 50;
}

function downloadNotes() {

    vscode.postMessage({
        type: 'download',
        value: textarea.value
    });
}



</script>

</body>
</html>
`;
    }
}