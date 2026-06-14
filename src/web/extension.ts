import * as vscode from 'vscode';
import { NotesProvider } from './NotesProvider';

export function activate(context: vscode.ExtensionContext) {

    const provider = new NotesProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'quickNotesSidebar',
            provider
        )
    );
}

export function deactivate() {}