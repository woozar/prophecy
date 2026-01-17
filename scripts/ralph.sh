#!/usr/bin/env zsh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  echo "Iteration $i"
  result=$(claude --permission-mode acceptEdits -p "@plans/prd.json @progress.txt \
  1. Check if a feature is already in progress (git status) and if so, finish it.
  Otherwise find the highest priority feature to work on and only work on that single feature until you can commit its results.\
  It should be the on YOU decide has the highest priority and dooes not depend on any other feature, that is not yet implemented.\
  Use "npm run dev" to start the development server.\
  Use the chrome extension to actually access the ui and navigate through it to make sure everything works as expected.\
  2. Check that the types check with "npm run typecheck" and check that the tests run with "npm test".\
  3. Update the PRD with the work that was done.\
  4. Append your progress to the progress.txt file.\
  Do this, whenever you start doing something or are done doing something, so you know where to continue, if you get interrupted. \
  Also append the results of the test run and a summary of the sonar analysis (new lines: x1, issues: x2, coverage: x3%, duplications: x4%) to the progress.txt file. \
  5. Make a git commit of the feature.\
  Before you commit anything, run sh "scripts/sonar-analysis.sh" and fix any issues found. Only if sonar quality gate is passed, you are allowed to commit.\
  \
  ONLY WORK ON A SINGLE FATURE.\
  FOLLOW THE INSTRUCTIONS FROM CLAUDE.MD. \
  If, while implementing the feature, you notice that every task in the PRD is completed, output <promise>COMPLETE</promise>.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete, exiting."
    exit 0
  fi
done
