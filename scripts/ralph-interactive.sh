#!/usr/bin/env zsh

set -e

claude --permission-mode acceptEdits "@plans/prd.json @progress.txt \
1. Find the highest priority feature to work on and only work on that single feature. \
It should be the on YOU decide has the highest priority and dooes not depend on any other feature, that is not yet implemented. \
Use "npm run dev" to start the development server. \
Use the chrome extension to actually access the ui and navigate through it to make sure everything works as expected. \
2. Check that the types check with typescript-lsp plugin or npm run typecheck and check that the tests run with npm test. \
Before you consider anything to be ready, run sh "scripts/sonar-analysis.sh" and fix any issues found. \
3. Update the PRD with the work that was done. \
4. Append your progress to the progress.txt file. \
Use this to leave notes for the next person working on the codebase. \
5. Make a git commit of the feature. \
ONLY WORK ON A SINGLE FATURE. \
If, while implementing the feature, you notice the PRD is complete, output <promise>COMPLETE</promise>."
