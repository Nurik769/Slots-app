#!/usr/bin/env python3
"""
Comprehensive backend API testing for CryptoPlay platform
Tests all authentication, gaming, wallet, referral, and admin endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CryptoPlayAPITester:
    def __init__(self, base_url: str = "https://play-earn-crypto-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.demo_token = None
        self.test_user_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, token: Optional[str] = None, 
                 description: str = "") -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        self.log(f"Testing {name}... {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "name": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                try:
                    return False, response.json()
                except:
                    return False, {"error": response.text}

        except Exception as e:
            self.log(f"❌ FAILED - {name} - Error: {str(e)}")
            self.failed_tests.append({
                "name": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_seed_data(self):
        """Initialize seed data"""
        self.log("=== INITIALIZING SEED DATA ===")
        success, response = self.run_test(
            "Seed Data Creation",
            "POST",
            "seed",
            200,
            description="Creating admin and demo users"
        )
        return success

    def test_authentication(self):
        """Test all authentication endpoints"""
        self.log("=== TESTING AUTHENTICATION ===")
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@cryptoplay.io", "password": "admin123"},
            description="Login with admin credentials"
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.log(f"Admin token obtained: {self.admin_token[:20]}...")
        
        # Test demo user login
        success, response = self.run_test(
            "Demo User Login",
            "POST",
            "auth/login",
            200,
            data={"email": "demo@cryptoplay.io", "password": "demo123"},
            description="Login with demo user credentials"
        )
        if success and 'token' in response:
            self.demo_token = response['token']
            self.log(f"Demo token obtained: {self.demo_token[:20]}...")

        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrong"},
            description="Should fail with invalid credentials"
        )

        # Test user registration
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "username": f"TestUser_{datetime.now().strftime('%H%M%S')}",
                "password": "testpass123"
            },
            description="Register new test user"
        )
        if success and 'token' in response:
            self.test_user_token = response['token']
            self.test_user_id = response['user']['id']
            self.log(f"Test user registered: {response['user']['username']}")

        # Test /auth/me with valid token
        if self.admin_token:
            self.run_test(
                "Get Current User (Admin)",
                "GET",
                "auth/me",
                200,
                token=self.admin_token,
                description="Get admin user profile"
            )

        # Test /auth/me without token
        self.run_test(
            "Get Current User (No Token)",
            "GET",
            "auth/me",
            401,
            description="Should fail without authentication"
        )

    def test_wallet_endpoints(self):
        """Test wallet functionality"""
        self.log("=== TESTING WALLET ENDPOINTS ===")
        
        if not self.demo_token:
            self.log("❌ No demo token available for wallet tests")
            return

        # Test get balance
        self.run_test(
            "Get Wallet Balance",
            "GET",
            "wallet/balance",
            200,
            token=self.demo_token,
            description="Get current wallet balance"
        )

        # Test create deposit
        success, response = self.run_test(
            "Create Deposit",
            "POST",
            "wallet/deposit",
            200,
            data={"amount": 50.0, "tx_hash": "test_tx_hash_123"},
            token=self.demo_token,
            description="Create deposit request"
        )
        deposit_id = response.get('deposit_id') if success else None

        # Test create withdrawal (should fail - insufficient balance initially)
        self.run_test(
            "Create Withdrawal (Insufficient Balance)",
            "POST",
            "wallet/withdraw",
            400,
            data={"amount": 1000.0, "address": "TTestAddress123"},
            token=self.demo_token,
            description="Should fail with insufficient balance"
        )

        # Test get transactions
        self.run_test(
            "Get Transactions",
            "GET",
            "wallet/transactions",
            200,
            token=self.demo_token,
            description="Get transaction history"
        )

        return deposit_id

    def test_dice_game(self):
        """Test dice game endpoints"""
        self.log("=== TESTING DICE GAME ===")
        
        if not self.demo_token:
            self.log("❌ No demo token available for dice game tests")
            return

        # Test dice game with minimum bet
        self.run_test(
            "Play Dice Game (Min Bet)",
            "POST",
            "games/dice/play",
            200,
            data={"bet_amount": 5.0},
            token=self.demo_token,
            description="Play dice with minimum bet of 5 USDT"
        )

        # Test dice game with insufficient bet
        self.run_test(
            "Play Dice Game (Low Bet)",
            "POST",
            "games/dice/play",
            400,
            data={"bet_amount": 1.0},
            token=self.demo_token,
            description="Should fail with bet below minimum"
        )

        # Test dice game history
        self.run_test(
            "Get Dice Game History",
            "GET",
            "games/dice/history",
            200,
            token=self.demo_token,
            description="Get user's dice game history"
        )

        # Test recent games (public endpoint)
        self.run_test(
            "Get Recent Games",
            "GET",
            "games/recent",
            200,
            description="Get recent games from all users"
        )

    def test_pvp_game(self):
        """Test PVP card game endpoints"""
        self.log("=== TESTING PVP CARD GAME ===")
        
        if not self.demo_token:
            self.log("❌ No demo token available for PVP tests")
            return

        # Test create PVP lobby
        success, response = self.run_test(
            "Create PVP Lobby",
            "POST",
            "games/pvp/create",
            200,
            data={"bet_amount": 5.0},
            token=self.demo_token,
            description="Create PVP lobby with minimum bet"
        )
        lobby_id = response.get('lobby_id') if success else None

        # Test get PVP lobbies
        self.run_test(
            "Get PVP Lobbies",
            "GET",
            "games/pvp/lobbies",
            200,
            token=self.demo_token,
            description="Get available PVP lobbies"
        )

        # Test get PVP history
        self.run_test(
            "Get PVP History",
            "GET",
            "games/pvp/history",
            200,
            token=self.demo_token,
            description="Get user's PVP game history"
        )

        # Test get specific lobby
        if lobby_id:
            self.run_test(
                "Get PVP Game Details",
                "GET",
                f"games/pvp/{lobby_id}",
                200,
                token=self.demo_token,
                description="Get specific lobby details"
            )

            # Test cancel lobby
            self.run_test(
                "Cancel PVP Lobby",
                "POST",
                f"games/pvp/cancel/{lobby_id}",
                200,
                token=self.demo_token,
                description="Cancel created lobby"
            )

        return lobby_id

    def test_referrals(self):
        """Test referral system"""
        self.log("=== TESTING REFERRAL SYSTEM ===")
        
        if not self.demo_token:
            self.log("❌ No demo token available for referral tests")
            return

        # Test get referrals
        self.run_test(
            "Get Referrals",
            "GET",
            "referrals",
            200,
            token=self.demo_token,
            description="Get referral information"
        )

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        self.log("=== TESTING ADMIN ENDPOINTS ===")
        
        if not self.admin_token:
            self.log("❌ No admin token available for admin tests")
            return

        # Test admin stats
        self.run_test(
            "Get Admin Stats",
            "GET",
            "admin/stats",
            200,
            token=self.admin_token,
            description="Get platform statistics"
        )

        # Test get users
        self.run_test(
            "Get All Users",
            "GET",
            "admin/users",
            200,
            token=self.admin_token,
            description="Get all users list"
        )

        # Test get transactions
        self.run_test(
            "Get All Transactions",
            "GET",
            "admin/transactions",
            200,
            token=self.admin_token,
            description="Get all transactions"
        )

        # Test get deposits
        success, response = self.run_test(
            "Get All Deposits",
            "GET",
            "admin/deposits",
            200,
            token=self.admin_token,
            description="Get all deposits"
        )

        # Test get withdrawals
        self.run_test(
            "Get All Withdrawals",
            "GET",
            "admin/withdrawals",
            200,
            token=self.admin_token,
            description="Get all withdrawals"
        )

        # Test admin access with regular user token
        if self.demo_token:
            self.run_test(
                "Admin Stats (Regular User)",
                "GET",
                "admin/stats",
                403,
                token=self.demo_token,
                description="Should fail - regular user accessing admin endpoint"
            )

        return response.get('deposits', []) if success else []

    def test_admin_actions(self, deposits):
        """Test admin actions on deposits/withdrawals"""
        self.log("=== TESTING ADMIN ACTIONS ===")
        
        if not self.admin_token:
            self.log("❌ No admin token available for admin action tests")
            return

        # Find a pending deposit to confirm
        pending_deposits = [d for d in deposits if d.get('status') == 'pending']
        if pending_deposits:
            deposit_id = pending_deposits[0]['id']
            self.run_test(
                "Confirm Deposit",
                "POST",
                f"admin/deposits/{deposit_id}/confirm",
                200,
                token=self.admin_token,
                description="Confirm pending deposit"
            )

    def run_all_tests(self):
        """Run complete test suite"""
        self.log("🚀 Starting CryptoPlay API Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        start_time = datetime.now()
        
        # Initialize data
        if not self.test_seed_data():
            self.log("❌ Seed data creation failed - continuing with existing data")
        
        # Run test suites
        self.test_authentication()
        deposit_id = self.test_wallet_endpoints()
        self.test_dice_game()
        lobby_id = self.test_pvp_game()
        self.test_referrals()
        deposits = self.test_admin_endpoints()
        self.test_admin_actions(deposits)
        
        # Print results
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        self.log("=" * 60)
        self.log("🏁 TEST SUITE COMPLETED")
        self.log(f"📊 Results: {self.tests_passed}/{self.tests_run} tests passed")
        self.log(f"⏱️  Duration: {duration:.2f} seconds")
        
        if self.failed_tests:
            self.log("❌ Failed Tests:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Status {test.get('actual')} != {test.get('expected')}")
                self.log(f"   - {test['name']}: {error_msg}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"✅ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = CryptoPlayAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())