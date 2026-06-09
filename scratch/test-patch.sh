#!/bin/bash
BASE_URL="http://127.0.0.1:8787/api/v1"
SHIFT_ID="00000000-0000-0000-0000-000000000206"
CHARGE_ID="00000000-0000-0000-0000-000000000101"

BURDEN_ID=$(curl -s "$BASE_URL/burden-assessments?shiftId=$SHIFT_ID" | jq -r '.data[0].id')
echo "Burden ID: $BURDEN_ID"

curl -s -X PATCH "$BASE_URL/burden-assessments/$BURDEN_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $CHARGE_ID" \
  -d '{"subjective":{"family":"5"}, "status":"submitted"}' | jq .
