"""Transcribe the Chinese voice lines and make Korean replacements via OpenRouter.

  python scripts/ko/voice.py transcribe
  python scripts/ko/voice.py speak <model> <voice> <name> "<text>"

Reads OPENROUTER_API_KEY_B from C:/workspace/.env. Output goes to .local/ko/voice/.
"""
import base64, json, pathlib, subprocess, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / ".local/ko/voice"
VOICES = ["splash-voice", "voice-galaxy-hello", "voice-galaxy-lit"]


def key():
    for line in (ROOT.parent / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENROUTER_API_KEY_B="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("OPENROUTER_API_KEY_B not found")


def post(path, body):
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1" + path,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key()}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read(), r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        sys.exit(f"{e.code}: {e.read().decode(errors='replace')}")


def transcribe(model="microsoft/mai-transcribe-2"):
    OUT.mkdir(parents=True, exist_ok=True)
    result = {}
    for name in VOICES:
        audio = base64.b64encode((ROOT / f"public/sfx/{name}.mp3").read_bytes()).decode()
        raw, _ = post("/audio/transcriptions", {"model": model, "input_audio": {"data": audio, "format": "mp3"}, "language": "zh"})
        data = json.loads(raw)
        result[name] = data.get("text")
        print(name, data.get("text"), data.get("usage"))
    (OUT / "transcripts.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


def speak(model, voice, name, text):
    OUT.mkdir(parents=True, exist_ok=True)
    # Gemini TTS only returns raw PCM (24 kHz, 16-bit mono), so convert that with ffmpeg.
    pcm = model.startswith("google/")
    raw, ctype = post("/audio/speech", {"model": model, "voice": voice, "input": text, "response_format": "pcm" if pcm else "mp3"})
    if "json" in ctype:
        sys.exit(raw.decode(errors="replace"))
    path = OUT / f"{name}.mp3"
    if pcm:
        print("content-type:", ctype)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "-", "-b:a", "128k", str(path)], input=raw, check=True)
    else:
        path.write_bytes(raw)
    print("wrote", path, len(raw), "bytes")


if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    {"transcribe": transcribe, "speak": speak}[cmd](*args)
