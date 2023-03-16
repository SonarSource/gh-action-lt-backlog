#! /bin/sh

# Inspired by https://stackoverflow.com/a/5139346
if [ -n "$(git status --porcelain)" ]; then
  exit 1;
else
  exit 0;
fi
