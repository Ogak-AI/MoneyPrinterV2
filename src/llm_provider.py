import ollama
import requests
import json

from config import (
    get_ollama_base_url,
    get_nanobanana2_api_key,
    get_nanobanana2_api_base_url,
    get_nanobanana2_model,
)

_selected_model: str | None = None


def _client() -> ollama.Client:
    return ollama.Client(host=get_ollama_base_url())


def list_models() -> list[str]:
    """
    Lists all models available on the local Ollama server.

    Returns:
        models (list[str]): Sorted list of model names.
    """
    try:
        response = _client().list()
        return sorted(m.model for m in response.models)
    except Exception:
        return []


def select_model(model: str) -> None:
    """
    Sets the model to use for all subsequent generate_text calls.

    Args:
        model (str): An Ollama model name (must be already pulled).
    """
    global _selected_model
    _selected_model = model


def get_active_model() -> str | None:
    """
    Returns the currently selected model, or None if none has been selected.
    """
    return _selected_model


def _generate_gemini(prompt: str) -> str:
    """
    Generates text using the Gemini API (Nano Banana 2).
    """
    api_key = get_nanobanana2_api_key()
    if not api_key:
        raise RuntimeError(
            "No LLM provider available. Please configure 'ollama_model' in config.json "
            "OR set 'GEMINI_API_KEY' in your environment variables (e.g., in Render dashboard)."
        )

    base_url = get_nanobanana2_api_base_url().rstrip("/")
    # Using the same model as for images, or defaulting to a text-capable one
    model = get_nanobanana2_model()
    # Gemini models for text generation usually have 'pro' or similar suffix, but let's try 
    # to guess or use the preview one which often supports multimodal.
    
    endpoint = f"{base_url}/models/{model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    response = requests.post(
        endpoint,
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()

    candidates = body.get("candidates", [])
    if not candidates:
        raise RuntimeError(f"Gemini API returned no candidates: {body}")
    
    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts:
        raise RuntimeError(f"Gemini API returned empty content: {body}")

    return parts[0].get("text", "").strip()


def generate_text(prompt: str, model_name: str = None) -> str:
    """
    Generates text using the local Ollama server, falling back to Gemini if needed.

    Args:
        prompt (str): User prompt
        model_name (str): Optional model name override

    Returns:
        response (str): Generated text
    """
    model = model_name or _selected_model

    # Try Ollama if a model is selected
    if model:
        try:
            response = _client().chat(
                model=model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response["message"]["content"].strip()
        except Exception as e:
            # If Ollama is configured but fails (e.g. server down), we log and try fallback
            from status import warning
            warning(f"Ollama generation failed: {e}. Attempting fallback to Gemini...")

    # Fallback to Gemini
    return _generate_gemini(prompt)
