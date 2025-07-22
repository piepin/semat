#!/usr/bin/env bash

# Hilangkan parameter pertama (biasanya nama script atau path alias)
# shift

# Gabungkan sisa parameter jadi string
str="$*"

# Tentukan pesan commit
if [ -z "$str" ]; then
  message="Update"
else
  message="$str"
fi

# Jalankan git command
git add .
git commit -m "$message"
git push -u origin main
