import photogenic


def test_extract_action_scenes():
    transcript = (
        "The hero walks down the road. A dragon attacks the village! "
        "Villagers run for cover. Peace returns."
    )
    scenes = photogenic.extract_action_scenes(transcript)
    assert scenes == [
        "A dragon attacks the village!",
        "Villagers run for cover.",
    ]


def test_generate_image_replaces_prompt(monkeypatch):
    captured = {}

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["json"] = json
        class R:
            ok = True
        return R()

    monkeypatch.setattr(photogenic.requests, "post", fake_post)
    workflow = {
        "nodes": [
            {"id": 1, "type": "CLIPTextEncode", "widgets_values": ["old"]}
        ]
    }
    assert photogenic.generate_image("new prompt", workflow, api_url="http://x")
    assert captured["url"] == "http://x/prompt"
    assert (
        captured["json"]["prompt"]["nodes"][0]["widgets_values"][0]
        == "new prompt"
    )


def test_process_transcript(monkeypatch):
    transcript = "Calm night. Soldiers charge the gates. Silence returns."
    monkeypatch.setattr(photogenic, "_llm_refine", lambda scene: f"Prompt: {scene}")
    calls = []
    monkeypatch.setattr(photogenic, "generate_image", lambda prompt: calls.append(prompt) or True)
    prompts = photogenic.process_transcript(transcript)
    assert prompts == ["Prompt: Soldiers charge the gates."]
    assert calls == ["Prompt: Soldiers charge the gates."]
