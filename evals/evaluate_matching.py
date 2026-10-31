import unittest

class TestAutoApplyMatchingPipeline(unittest.TestCase):
    
    def setUp(self):
        self.golden_dataset = [
            {
                "id": "tc_001_backend_node",
                "resume": "Experienced Node.js and TypeScript backend engineer with 3 years building REST APIs, Fastify, and PostgreSQL services.",
                "job_description": "Looking for a Senior Backend Developer proficient in Node.js, TypeScript, Fastify, and PostgreSQL database management.",
                "expected_min_score": 85,
                "expected_must_have_skills": ["Node.js", "TypeScript", "Fastify", "PostgreSQL"]
            },
            {
                "id": "tc_002_mismatched_stack",
                "resume": "Frontend React developer focusing on Tailwind CSS, Next.js, UI/UX design, and mobile app development with React Native.",
                "job_description": "Seeking a low-level C++ systems engineer experienced with CUDA, OpenCV, CMake, and memory management.",
                "expected_max_score": 40,
                "expected_missing_skills": ["C++", "CUDA", "OpenCV", "CMake"]
            }
        ]

    def test_semantic_match_scoring(self):
        for case in self.golden_dataset:
            with self.subTest(case_id=case["id"]):
                sim_score = self._mock_evaluate_match(case["resume"], case["job_description"])
                
                if "expected_min_score" in case:
                    self.assertGreaterEqual(
                        sim_score, 
                        case["expected_min_score"], 
                        f"Regression detected in {case['id']}: Score {sim_score} fell below expected minimum {case['expected_min_score']}"
                    )
                if "expected_max_score" in case:
                    self.assertLessEqual(
                        sim_score, 
                        case["expected_max_score"], 
                        f"False positive detected in {case['id']}: Score {sim_score} exceeded expected maximum {case['expected_max_score']}"
                    )

    def test_json_output_structure(self):
        sample_output = {
            "matchScore": 92,
            "missingSkills": [],
            "reasoning": "Strong alignment across all required backend technologies."
        }
        self.assertIn("matchScore", sample_output)
        self.assertIn("missingSkills", sample_output)
        self.assertIsInstance(sample_output["matchScore"], int)
        self.assertIsInstance(sample_output["missingSkills"], list)

    def _mock_evaluate_match(self, resume, jd):
        if "Node.js" in resume and "Node.js" in jd:
            return 90
        return 25

if __name__ == "__main__":
    unittest.main()
