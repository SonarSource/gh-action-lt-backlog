#! /bin/sh

# Inspired by https://stackoverflow.com/a/5139346

uncommitted_changes="$(git status --porcelain Dist)"

if [ -n "$uncommitted_changes" ]; then
  echo "There are some uncommitted changes in Dist"
  echo "$uncommitted_changes"
  exit 1;
else
  exit 0;
fi
