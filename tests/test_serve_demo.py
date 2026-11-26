import io
import json
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from scripts import serve_demo


class DemoServerTest(unittest.TestCase):
    def test_parse_intent_sends_only_goal_request(self):
        body = json.dumps({
            "choices": [{"message": {"content": json.dumps({
                "objective": "balanced",
                "max_cost_increase_pct": 3,
            })}}],
        }).encode()
        with patch.object(serve_demo, "urlopen", return_value=io.BytesIO(body)) as send:
            result = serve_demo.parse_intent("Reduce emissions, cost up at most 3%", "test-key",
                                             "test-model", serve_demo.DEFAULT_BASE_URL)
        self.assertEqual(result, {"objective": "balanced", "max_cost_increase_pct": 3})
        request = send.call_args.args[0]
        self.assertEqual(json.loads(request.data)["messages"][-1]["role"], "user")
        self.assertEqual(request.full_url, "https://api.deepseek.com/chat/completions")

    def test_validate_rejects_invalid_model_output(self):
        for intent in (
            {"objective": "balanced", "max_cost_increase_pct": True},
            {"objective": "balanced", "max_cost_increase_pct": 31},
            {"objective": "green", "max_cost_increase_pct": 3},
            {"objective": "economic", "max_cost_increase_pct": None, "power": 900},
        ):
            with self.subTest(intent=intent), self.assertRaises(ValueError):
                serve_demo.validate_intent(intent)

    def test_post_requires_local_origin_and_model_configuration(self):
        handler = serve_demo.DemoHandler.__new__(serve_demo.DemoHandler)
        handler.path = "/api/dispatch-intent"
        handler.server = SimpleNamespace(server_port=8766)
        handler.api_key = None
        handler.model = None
        payload = b'{"message":"Reduce emissions"}'
        handler.headers = SimpleNamespace(
            get=lambda key, default=None: {
                "Host": "127.0.0.1:8766",
                "Origin": "http://not-the-demo.invalid",
                "Content-Length": str(len(payload)),
            }.get(key, default),
            get_content_type=lambda: "application/json",
        )
        handler.rfile = io.BytesIO(payload)
        with patch.object(handler, "json_response") as reply:
            handler.do_POST()
            self.assertEqual(reply.call_args.args[0], 403)
            handler.headers.get = lambda key, default=None: {
                "Host": "127.0.0.1:8766",
                "Origin": "http://127.0.0.1:8766",
                "Content-Length": str(len(payload)),
            }.get(key, default)
            handler.do_POST()
            self.assertEqual(reply.call_args.args[0], 503)


if __name__ == "__main__":
    unittest.main()
