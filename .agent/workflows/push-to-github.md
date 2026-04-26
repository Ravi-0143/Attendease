---
description: Push the latest code to GitHub. Creates the repo if it doesn't exist yet, then commits and pushes all changes.
---

1. **Check if GitHub is connected**
   Check if a git repository has been initialized in this project folder. If not, run `git init`.

2. **Check if remote origin exists**
   Run `git remote -v` to see if a GitHub remote is already set up.
   If no remote exists, ask me: "What would you like to name your GitHub repository?"
   Then create the repository on GitHub and add it as the remote origin.

// turbo
3. **Stage all changes**
   Run `git add .` to stage all files for commit.

4. **Write a commit message**
   Look at what files changed and write a short, clear commit message describing the update (e.g., "Add late arrival feature and update dashboard").
   Then run `git commit -m "[your message]"`.

// turbo
5. **Push to GitHub**
   Run `git push origin main` to push the code.
   If the branch is called something else, use that branch name.

6. **Confirm success**
   Tell me the GitHub link where my code is now live.
   Show me a summary of what was pushed.
