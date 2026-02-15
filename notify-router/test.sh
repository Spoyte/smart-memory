#!/bin/bash

# Test script for notify-router

ROUTER_URL="http://localhost:3456"

echo "Testing Notify Router..."
echo "========================"

# Test 1: Health check
echo -e "\n1. Health check:"
curl -s ${ROUTER_URL}/health | jq .

# Test 2: Config (safe view)
echo -e "\n2. Configuration:"
curl -s ${ROUTER_URL}/config | jq .

# Test 3: Send low priority notification
echo -e "\n3. Sending low priority notification:"
curl -s -X POST ${ROUTER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test-suite",
    "priority": "low",
    "title": "Test: Low Priority",
    "message": "This is a low priority test notification"
  }' | jq .

# Test 4: Send medium priority notification
echo -e "\n4. Sending medium priority notification:"
curl -s -X POST ${ROUTER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test-suite",
    "priority": "medium",
    "title": "Test: Medium Priority",
    "message": "This is a medium priority test notification",
    "data": { "testId": 123, "category": "demo" }
  }' | jq .

# Test 5: Send high priority notification
echo -e "\n5. Sending high priority notification:"
curl -s -X POST ${ROUTER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{
    "source": "surebet-detector",
    "priority": "high",
    "title": "Arbitrage Opportunity: 3.2%",
    "message": "Tennis: Alcaraz vs Sinner - Profit opportunity detected across Unibet and Betclic",
    "data": { "sport": "tennis", "profit": 3.2, "match": "Alcaraz vs Sinner" }
  }' | jq .

# Test 6: Send critical priority notification
echo -e "\n6. Sending critical priority notification:"
curl -s -X POST ${ROUTER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{
    "source": "promo-scanner",
    "priority": "critical",
    "title": "URGENT: Limited Time +EV Boost",
    "message": "Winamax offering 50% odds boost on Champions League - expires in 10 minutes!",
    "data": { "bookmaker": "Winamax", "boost": 50, "expires": "10min" }
  }' | jq .

# Test 7: Get history
echo -e "\n7. Notification history:"
curl -s "${ROUTER_URL}/history?limit=10" | jq .

# Test 8: Get history filtered by source
echo -e "\n8. History filtered by 'surebet-detector':"
curl -s "${ROUTER_URL}/history?source=surebet-detector&limit=5" | jq .

echo -e "\n========================"
echo "Tests complete!"
