# Easy Review

AI-powered code review generation for GitHub Pull Requests — forked from [microsoft/vscode-pull-request-github](https://github.com/microsoft/vscode-pull-request-github).

[![Build Status](https://dev.azure.com/vscode/vscode-pull-request-github/_apis/build/status/vscode-pull-request-github%20%28pr%29?branchName=main)](https://dev.azure.com/vscode/vscode-pull-request-github/_build?definitionId=44&branchName=main)

## What is Easy Review?

Easy Review extends the GitHub Pull Requests extension with AI-powered code review generation. It shells out to the `claude` and `codex` CLIs to produce structured reviews and stores all generated content in a local SQLite database.

## Upstream: GitHub Pull Requests for VS Code

This extension is a fork of the upstream GitHub Pull Requests extension. Original upstream README below.

> Review and manage your GitHub pull requests and issues directly in VS Code

This extension allows you to review and manage GitHub pull requests and issues in Visual Studio Code. The support includes:

- Authenticating and connecting VS Code to GitHub and GitHub Enterprise.
- Listing and browsing PRs from within VS Code.
- Reviewing PRs from within VS Code with in-editor commenting.
- Validating PRs from within VS Code with easy checkouts.
- Terminal integration that enables UI and CLIs to co-exist.
- Listing and browsing issues from within VS Code.
- Hover cards for "@" mentioned users and for issues.
- Completion suggestions for users and issues.
- A "Start working on issue" action which can create a branch for you.
- Code actions to create issues from "todo" comments.
