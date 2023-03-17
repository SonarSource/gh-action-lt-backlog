#! /bin/sh

# Inspired by https://stackoverflow.com/a/5139346

uncommitted_changes="$(git status --porcelain)"

if [ -n "$uncommitted_changes" ]; then
  echo "There are some uncommitted changes"
  echo "$uncommitted_changes"
  exit 1;
else
  exit 0;
fi
