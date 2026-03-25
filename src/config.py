import os
import sys
import json
import srt_equalizer

from termcolor import colored
from constants import ROOT_DIR

# Global cache for configuration to avoid repeated file reads and handle missing file
_CONFIG_CACHE = None

def _get_config() -> dict:
    """
    Internal helper to load config with fallback to defaults.
    """
    global _CONFIG_CACHE
    if _CONFIG_CACHE is not None:
        return _CONFIG_CACHE

    config_path = os.path.join(ROOT_DIR, "config.json")
    example_path = os.path.join(ROOT_DIR, "config.example.json")
    
    # Load defaults first
    defaults = {}
    if os.path.exists(example_path):
        try:
            with open(example_path, "r") as f:
                defaults = json.load(f)
        except Exception:
            pass

    # Load user config if exists
    user_config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                user_config = json.load(f)
        except Exception as e:
            print(colored(f"=> Warning: Could not parse config.json: {e}", "yellow"))
    else:
        if os.environ.get("HF_SPACE_ID"):
            print(colored("=> Running on Hugging Face: Using defaults/environment variables.", "cyan"))

    # Merge: user_config > defaults
    _CONFIG_CACHE = {**defaults, **user_config}
    return _CONFIG_CACHE

def assert_folder_structure() -> None:
    """
    Make sure that the nessecary folder structure is present.

    Returns:
        None
    """
    # Create the .mp folder
    if not os.path.exists(os.path.join(ROOT_DIR, ".mp")):
        if get_verbose():
            print(colored(f"=> Creating .mp folder at {os.path.join(ROOT_DIR, '.mp')}", "green"))
        os.makedirs(os.path.join(ROOT_DIR, ".mp"))

def get_first_time_running() -> bool:
    """
    Checks if the program is running for the first time by checking if .mp folder exists.

    Returns:
        exists (bool): True if the program is running for the first time, False otherwise
    """
    return not os.path.exists(os.path.join(ROOT_DIR, ".mp"))

def get_email_credentials() -> dict:
    """
    Gets the email credentials from the config file.

    Returns:
        credentials (dict): The email credentials
    """
    return _get_config().get("email", {"smtp_server": "smtp.gmail.com", "smtp_port": 587, "username": "", "password": ""})

def get_verbose() -> bool:
    """
    Gets the verbose flag from the config file.

    Returns:
        verbose (bool): The verbose flag
    """
    return _get_config().get("verbose", True)

def get_firefox_profile_path() -> str:
    """
    Gets the path to the Firefox profile.

    Returns:
        path (str): The path to the Firefox profile
    """
    return _get_config().get("firefox_profile", "")

def get_headless() -> bool:
    """
    Gets the headless flag from the config file.

    Returns:
        headless (bool): The headless flag
    """
    # Force headless on Hugging Face
    if os.environ.get("HF_SPACE_ID"):
        return True
    return _get_config().get("headless", False)

def get_ollama_base_url() -> str:
    """
    Gets the Ollama base URL.

    Returns:
        url (str): The Ollama base URL
    """
    return _get_config().get("ollama_base_url", "http://127.0.0.1:11434")

def get_ollama_model() -> str:
    """
    Gets the Ollama model name from the config file.

    Returns:
        model (str): The Ollama model name, or empty string if not set.
    """
    return _get_config().get("ollama_model", "")

def get_twitter_language() -> str:
    """
    Gets the Twitter language from the config file.

    Returns:
        language (str): The Twitter language
    """
    return _get_config().get("twitter_language", "English")

def get_nanobanana2_api_base_url() -> str:
    """
    Gets the Nano Banana 2 (Gemini image) API base URL.

    Returns:
        url (str): API base URL
    """
    return _get_config().get("nanobanana2_api_base_url", "https://generativelanguage.googleapis.com/v1beta")

def get_nanobanana2_api_key() -> str:
    """
    Gets the Nano Banana 2 API key.

    Returns:
        key (str): API key
    """
    configured = _get_config().get("nanobanana2_api_key", "")
    return configured or os.environ.get("GEMINI_API_KEY", "")

def get_nanobanana2_model() -> str:
    """
    Gets the Nano Banana 2 model name.

    Returns:
        model (str): Model name
    """
    return _get_config().get("nanobanana2_model", "gemini-3.1-flash-image-preview")

def get_nanobanana2_aspect_ratio() -> str:
    """
    Gets the aspect ratio for Nano Banana 2 image generation.

    Returns:
        ratio (str): Aspect ratio
    """
    return _get_config().get("nanobanana2_aspect_ratio", "9:16")

def get_threads() -> int:
    """
    Gets the amount of threads to use for example when writing to a file with MoviePy.

    Returns:
        threads (int): Amount of threads
    """
    return _get_config().get("threads", 2)
    
def get_zip_url() -> str:
    """
    Gets the URL to the zip file containing the songs.

    Returns:
        url (str): The URL to the zip file
    """
    return _get_config().get("zip_url", "")

def get_is_for_kids() -> bool:
    """
    Gets the is for kids flag from the config file.

    Returns:
        is_for_kids (bool): The is for kids flag
    """
    return _get_config().get("is_for_kids", False)

def get_google_maps_scraper_zip_url() -> str:
    """
    Gets the URL to the zip file containing the Google Maps scraper.

    Returns:
        url (str): The URL to the zip file
    """
    return _get_config().get("google_maps_scraper", "https://github.com/gosom/google-maps-scraper/archive/refs/tags/v0.9.7.zip")

def get_google_maps_scraper_niche() -> str:
    """
    Gets the niche for the Google Maps scraper.

    Returns:
        niche (str): The niche
    """
    return _get_config().get("google_maps_scraper_niche", "")

def get_scraper_timeout() -> int:
    """
    Gets the timeout for the scraper.

    Returns:
        timeout (int): The timeout
    """
    return _get_config().get("scraper_timeout", 300)

def get_outreach_message_subject() -> str:
    """
    Gets the outreach message subject.

    Returns:
        subject (str): The outreach message subject
    """
    return _get_config().get("outreach_message_subject", "I have a question...")
    
def get_outreach_message_body_file() -> str:
    """
    Gets the outreach message body file.

    Returns:
        file (str): The outreach message body file
    """
    return _get_config().get("outreach_message_body_file", "outreach_message.html")

def get_tts_voice() -> str:
    """
    Gets the TTS voice from the config file.

    Returns:
        voice (str): The TTS voice
    """
    return _get_config().get("tts_voice", "Jasper")

def get_assemblyai_api_key() -> str:
    """
    Gets the AssemblyAI API key.

    Returns:
        key (str): The AssemblyAI API key
    """
    return _get_config().get("assembly_ai_api_key", "")

def get_stt_provider() -> str:
    """
    Gets the configured STT provider.

    Returns:
        provider (str): The STT provider
    """
    return _get_config().get("stt_provider", "local_whisper")

def get_whisper_model() -> str:
    """
    Gets the local Whisper model name.

    Returns:
        model (str): Whisper model name
    """
    return _get_config().get("whisper_model", "base")

def get_whisper_device() -> str:
    """
    Gets the target device for Whisper inference.

    Returns:
        device (str): Whisper device
    """
    return _get_config().get("whisper_device", "auto")

def get_whisper_compute_type() -> str:
    """
    Gets the compute type for Whisper inference.

    Returns:
        compute_type (str): Whisper compute type
    """
    return _get_config().get("whisper_compute_type", "int8")
    
def equalize_subtitles(srt_path: str, max_chars: int = 10) -> None:
    """
    Equalizes the subtitles in a SRT file.

    Args:
        srt_path (str): The path to the SRT file
        max_chars (int): The maximum amount of characters in a subtitle

    Returns:
        None
    """
    srt_equalizer.equalize_srt_file(srt_path, srt_path, max_chars)
    
def get_font() -> str:
    """
    Gets the font from the config file.

    Returns:
        font (str): The font
    """
    return _get_config().get("font", "bold_font.ttf")

def get_fonts_dir() -> str:
    """
    Gets the fonts directory.

    Returns:
        dir (str): The fonts directory
    """
    return os.path.join(ROOT_DIR, "fonts")

def get_imagemagick_path() -> str:
    """
    Gets the path to ImageMagick.

    Returns:
        path (str): The path to ImageMagick
    """
    # Default to just 'convert' on linux (which matches the Dockerfile setup)
    return _get_config().get("imagemagick_path", "convert")

def get_script_sentence_length() -> int:
    """
    Gets the forced script's sentence length.
    In case there is no sentence length in config, returns 4 when none

    Returns:
        length (int): Length of script's sentence
    """
    return _get_config().get("script_sentence_length", 4)
