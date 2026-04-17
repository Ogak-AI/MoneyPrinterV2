from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

from status import *
from config import *
from constants import *
from llm_provider import generate_text
from .Twitter import Twitter


class AffiliateMarketing:
    """
    This class will be used to handle all the affiliate marketing related operations.
    """

    def __init__(
        self,
        affiliate_link: str,
        account_uuid: str,
        account_nickname: str,
        topic: str,
        api_key: str = None,
        api_secret: str = None,
        access_token: str = None,
        access_token_secret: str = None,
    ) -> None:
        """
        Initializes the Affiliate Marketing class.
        """
        self.affiliate_link: str = affiliate_link

        parsed_link = urlparse(self.affiliate_link)
        if parsed_link.scheme not in ["http", "https"] or not parsed_link.netloc:
            raise ValueError(
                f"Affiliate link is invalid. Expected a full URL, got: {self.affiliate_link}"
            )

        self.account_uuid = account_uuid
        self.account_nickname = account_nickname
        self.topic = topic
        
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.access_token_secret = access_token_secret

        # Scrape the product information
        self.scrape_product_information()

    def scrape_product_information(self) -> None:
        """
        This method will be used to scrape the product
        information from the affiliate link via requests.
        """
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }
        
        try:
            response = requests.get(self.affiliate_link, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find title
            title_node = soup.find(id=AMAZON_PRODUCT_TITLE_ID)
            product_title = title_node.text.strip() if title_node else "Unknown Product"
            
            # Find features
            feature_node = soup.find(id=AMAZON_FEATURE_BULLETS_ID)
            features = feature_node.text.strip() if feature_node else "No specific features found."

            if get_verbose():
                info(f"Product Title: {product_title}")
                info(f"Features preview: {features[:100]}...")

            self.product_title = product_title
            self.features = features
        except Exception as e:
            if get_verbose():
                warning(f"Failed to scrape Amazon page: {e}. Falling back to default generation.")
            self.product_title = "Affiliate Product"
            self.features = f"Discover more details at {self.affiliate_link}"


    def generate_response(self, prompt: str) -> str:
        """
        This method will be used to generate the response for the user.
        """
        return generate_text(prompt)

    def generate_pitch(self) -> str:
        """
        This method will be used to generate a pitch for the product.
        """
        pitch: str = (
            self.generate_response(
                f'I want to promote this product on my website. Generate a brief Twitter pitch about this product, under 200 characters, return nothing else except the pitch. Information:\nTitle: "{self.product_title}"\nFeatures: "{str(self.features)}"'
            )
            + "\nBuy here: "
            + self.affiliate_link
        )

        self.pitch: str = pitch
        return pitch

    def share_pitch(self, where: str) -> None:
        """
        This method will be used to share the pitch on the specified platform.
        """
        if where == "twitter":
            # Initialize the Twitter class with API keys
            twitter: Twitter = Twitter(
                account_uuid=self.account_uuid,
                account_nickname=self.account_nickname,
                topic=self.topic,
                api_key=self.api_key,
                api_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_token_secret
            )

            # Share the pitch
            twitter.post(self.pitch)

    def quit(self) -> None:
        """
        Stub out legacy Firefox cleanup method.
        """
        pass
