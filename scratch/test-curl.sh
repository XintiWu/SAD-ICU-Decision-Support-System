#!/bin/bash
PORT=8787
BASE_URL="http://127.0.0.1:8787/api/v1"

echo "Fetching current shift"
CURRENT_RES=$(curl -s $BASE_URL/shifts/current)
CURRENT_ID=$(echo $CURRENT_RES | jq -r '.data.id')
CHARGE_ID=$(echo $CURRENT_RES | jq -r '.data.chargeNurse.id')

echo "Current shift ID: $CURRENT_ID"
echo "Charge Nurse ID: $CHARGE_ID"

echo "Fetching all shifts"
SHIFTS_RES=$(curl -s $BASE_URL/shifts)
CURRENT_INDEX=$(echo $SHIFTS_RES | jq ".data | map(.id == \"$CURRENT_ID\") | index(true)")
echo "Current Index: $CURRENT_INDEX"

NEXT_SHIFT_ID=$(echo $SHIFTS_RES | jq -r ".data[1].id")
echo "Using shifts[1] as current and shifts[0] as next"
CURRENT_SHIFT_ID=$(echo $SHIFTS_RES | jq -r ".data[1].id")
NEXT_SHIFT_ID=$(echo $SHIFTS_RES | jq -r ".data[0].id")
CHARGE_ID=$(echo $SHIFTS_RES | jq -r ".data[1].chargeNurse.id")

echo "Current: $CURRENT_SHIFT_ID, Next: $NEXT_SHIFT_ID, Charge: $CHARGE_ID"

BURDEN_ID=$(curl -s "$BASE_URL/burden-assessments?shiftId=$CURRENT_SHIFT_ID" | jq -r '.data[0].id')
echo "Burden ID: $BURDEN_ID"

echo "Patching burden"
curl -s -X PATCH "$BASE_URL/burden-assessments/$BURDEN_ID" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $CHARGE_ID" \
  -d '{"subjective":{"family":"5"}, "status":"submitted"}' | jq .

echo "Suggesting allocation"
curl -s -X POST "$BASE_URL/allocation-runs/suggest" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $CHARGE_ID" \
  -d "{\"shiftId\":\"$CURRENT_SHIFT_ID\", \"targetShiftId\":\"$NEXT_SHIFT_ID\", \"createdBy\":\"$CHARGE_ID\"}" | jq .

