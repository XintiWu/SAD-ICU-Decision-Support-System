#!/bin/bash
BASE_URL="http://127.0.0.1:8787/api/v1"

SHIFTS=$(curl -s $BASE_URL/shifts | jq -r '.data[0:3] | .[].id')
for s in $SHIFTS; do
  echo "Shift: $s"
  curl -s $BASE_URL/nurses?shiftId=$s | jq -r '.data[].shortName' | sort | paste -sd, -
done
