import re
import sys
import time
import os
import json
import tweepy

from cache import *
from config import *
from status import *
from llm_provider import generate_text
from typing import List, Optional
from datetime import datetime
from termcolor import colored

class Twitter:
    """
    Class for the Bot, that grows a Twitter account via API.
    """

    def __init__(
        self, account_uuid: str, account_nickname: str, topic: str,
        api_key: str = None, api_secret: str = None,
        access_token: str = None, access_token_secret: str = None
    ) -> None:
        """
        Initializes the Twitter Bot with OAuth keys.
        """
        self.account_uuid: str = account_uuid
        self.account_nickname: str = account_nickname
        self.topic: str = topic
        
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.access_token_secret = access_token_secret

        if not all([self.api_key, self.api_secret, self.access_token, self.access_token_secret]):
            raise ValueError("Twitter API keys are incomplete. Please link the account again with all 4 keys.")

        try:
            # Initialize Tweepy v2 Client for posting tweets
            self.client = tweepy.Client(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_token_secret
            )
        except Exception as e:
            raise ValueError(f"Failed to authenticate Twitter API: {e}")

    def post(self, text: Optional[str] = None) -> None:
        """
        Posts a tweet using the Twitter API v2.
        """
        verbose: bool = get_verbose()
        post_content: str = text if text is not None else self.generate_post()
        now: datetime = datetime.now()

        print(colored(" => Tweeting via API:", "blue"), post_content[:30] + "...")

        try:
            # Post using v2 client
            response = self.client.create_tweet(text=post_content)
            
            if verbose:
                print(colored(f" => Tweet posted successfully. ID: {response.data['id']}", "green"))
                
            # Add the post to the cache
            self.add_post({"content": post_content, "date": now.strftime("%m/%d/%Y, %H:%M:%S")})
            success("Posted to Twitter successfully!")
            
        except tweepy.TweepyException as e:
            raise RuntimeError(f"Twitter API Error: {e}")

    def get_posts(self) -> List[dict]:
        """Gets the posts from the cache."""
        if not os.path.exists(get_twitter_cache_path()):
            with open(get_twitter_cache_path(), "w") as file:
                json.dump({"accounts": []}, file, indent=4)

        with open(get_twitter_cache_path(), "r") as file:
            parsed = json.load(file)
            accounts = parsed["accounts"]
            for account in accounts:
                if account["id"] == self.account_uuid:
                    posts = account["posts"]
                    if posts is None:
                        return []
                    return posts
        return []

    def add_post(self, post: dict) -> None:
        """Adds a post to the cache (single read-modify-write to avoid duplicates)."""
        cache_path = get_twitter_cache_path()
        with open(cache_path, "r") as file:
            data = json.loads(file.read())

        account_found = False
        for account in data.get("accounts", []):
            if account["id"] == self.account_uuid:
                if not isinstance(account.get("posts"), list):
                    account["posts"] = []
                account["posts"].append(post)
                account_found = True
                break

        # If account isn't in cache yet, add it with this first post
        if not account_found:
            data.setdefault("accounts", []).append({
                "id": self.account_uuid,
                "posts": [post]
            })

        with open(cache_path, "w") as file:
            file.write(json.dumps(data))

    def generate_post(self) -> str:
        """Generates a post for the Twitter account based on the topic."""
        completion = generate_text(
            f"Generate a Twitter post about: {self.topic} in {get_twitter_language()}. "
            "The Limit is 2 sentences. Choose a specific sub-topic of the provided topic."
        )

        if get_verbose():
            info("Generating a post...")

        if completion is None:
            error("Failed to generate a post. Please try again.")
            sys.exit(1)

        completion = re.sub(r"\*", "", completion).replace('"', "")

        if get_verbose():
            info(f"Length of post: {len(completion)}")
            
        if len(completion) >= 280:
            return completion[:277].rsplit(" ", 1)[0] + "..."

        return completion
