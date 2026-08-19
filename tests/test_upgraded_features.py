"""
tests/test_upgraded_features.py
--------------------------------
Comprehensive test suite verifying authentication, API key management,
suspicious lines detection, file ranking, hybrid mode, and LLM solution generation.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from backend.database.db import init_db, get_db
from backend.auth.auth_service import register_user, login_user, update_user_llm_config, get_user_llm_config
from backend.services.suspicious_line_service import analyze_suspicious_lines
from backend.services.ranking_service import rank_files, get_top_10_risky_files, filter_hybrid_mode
from backend.services.llm_service import LLMSolutionEngine

class TestUpgradedFeatures(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_01_authentication_and_api_key_management(self):
        # Registration
        username = "testuser_2026"
        email = "testuser@example.com"
        password = "SecurePassword123!"
        
        reg_res = register_user(username, email, password)
        if not reg_res.get("success"):
            # If already exists, test login
            pass
            
        # Login
        login_res = login_user(username, password)
        self.assertTrue(login_res["success"], "User login should succeed.")
        user_id = login_res["user_id"]
        
        # API Key Persistence
        update_res = update_user_llm_config(user_id, "gemini", "AIzaSyTestApiKey123456789")
        self.assertTrue(update_res["success"], "Updating API config should succeed.")
        
        config = get_user_llm_config(user_id)
        self.assertEqual(config["llm_provider"], "gemini")
        self.assertEqual(config["llm_api_key"], "AIzaSyTestApiKey123456789")

    def test_02_suspicious_line_detection(self):
        sample_code = (
            "def vulnerable_function():\n"
            "    eval('import os; os.system(\"rm -rf /\")')\n"
            "    try:\n"
            "        x = 1 / 0\n"
            "    except:\n"
            "        pass\n"
            "    for i in range(10):\n"
            "        for j in range(10):\n"
            "            print(i, j)\n"
        )
        
        suspicious = analyze_suspicious_lines("vulnerable.py", sample_code)
        self.assertTrue(len(suspicious) >= 2, "Should identify at least 2 suspicious lines.")
        
        reasons = [s["reason"] for s in suspicious]
        has_eval = any("eval" in r for r in reasons)
        has_except = any("except" in r for r in reasons)
        self.assertTrue(has_eval, "Should detect eval security risk.")
        self.assertTrue(has_except, "Should detect bare except block.")

    def test_03_ranking_and_hybrid_mode(self):
        mock_data = [
            {"file": "fileA.py", "ml_probability": 0.85, "last_source_code": "print('A')"},
            {"file": "fileB.py", "ml_probability": 0.40, "last_source_code": "print('B')"},
            {"file": "fileC.py", "ml_probability": 0.95, "last_source_code": "print('C')"},
            {"file": "fileD.py", "ml_probability": 0.55, "last_source_code": "print('D')"},
        ]
        
        ranked = rank_files(mock_data)
        self.assertEqual(ranked[0]["file"], "fileC.py")
        self.assertEqual(ranked[0]["rank"], 1)
        
        hybrid_files = filter_hybrid_mode(mock_data, threshold=0.60)
        self.assertEqual(len(hybrid_files), 2, "Hybrid mode should only return files with probability > 60%.")
        hybrid_filenames = [f["file"] for f in hybrid_files]
        self.assertIn("fileC.py", hybrid_filenames)
        self.assertIn("fileA.py", hybrid_filenames)
        self.assertNotIn("fileB.py", hybrid_filenames)

    def test_04_llm_solution_generation(self):
        llm = LLMSolutionEngine(api_key="", provider="openai")
        sol = llm.generate_solution("payment.py", "def pay(): pass", "High complexity", 0.88, {"complexity": 20})
        self.assertIn("problem_summary", sol)
        self.assertIn("suggested_fix", sol)
        self.assertIn("improved_code", sol)
        self.assertIn("possible_side_effects", sol)

if __name__ == "__main__":
    unittest.main()
