import * as vscode from 'vscode';
import axios from 'axios';
require('dotenv').config();

async function addCommentsAboveFunctions() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    const languageId = document.languageId;
    if (languageId === 'javascript' || languageId === 'javascriptreact') {
      const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*{([\s\S]*?)}\s*(?=function|$)/g;
      const functionComments: { [key: string]: string } = {}; // Define functionComments as a dictionary
      let match;
      while ((match = functionRegex.exec(document.getText()))) {
        const functionName = match[1];
        const functionBody = match[2];
        if (!functionComments.hasOwnProperty(functionName)) {
          functionComments[functionName] = ''; // Initialize comment as an empty string
        }
        if (functionComments[functionName] === '') {
          // Get comment for the function from ChatGPT
          const comment = await getCommentFromChatGPT(functionName, functionBody); // Use await to wait for the promise to resolve
          functionComments[functionName] = comment;
        }
      }

      // Insert comments above the functions
      editor.edit(editBuilder => {
        for (const functionName in functionComments) {
          const comment = functionComments[functionName];
          const functionPosition = document.positionAt(document.getText().indexOf(functionName));
          const commentText = `/**\n * ${comment}\n */\n`;
          editBuilder.insert(functionPosition.with({ character: 0 }), commentText);
        }
      });
    }
  }
}

async function getCommentFromChatGPT(functionName: string, functionBody: string): Promise<string> {
  try {
    const API_KEY = process.env.API_KEY;
    const response = await axios.post(
      'https://api.openai.com/v1/engines/davinci-codex/completions',
      {
        prompt: `Function: ${functionName}\n\nBody: ${functionBody}\n\nDescription: `,
        max_tokens: 50,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const comment = response.data.choices[0].text.trim();
    return comment;
  } catch (error) {
    vscode.window.showErrorMessage('Failed to get comment from ChatGPT: ' + error.message);
    return '';
  }
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.addCommentsAboveFunctions', addCommentsAboveFunctions);

  context.subscriptions.push(disposable);
}
