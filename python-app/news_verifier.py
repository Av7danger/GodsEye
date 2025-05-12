"""
News Verification API Module
This module integrates with external fact-checking APIs to verify news claims.
"""

import requests
import logging
import json
from typing import Dict, Any, List, Optional

class NewsVerifier:
    """Class to verify news articles against external fact-checking sources"""
    
    def __init__(self, api_key: str = None):
        """
        Initialize the NewsVerifier with API keys
        
        Args:
            api_key: Google Fact Check API key
        """
        self.api_key = api_key
        self.google_base_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        # Load API key from config if not provided
        if not self.api_key:
            try:
                from config import FACT_CHECK_API_KEY
                self.api_key = FACT_CHECK_API_KEY
            except (ImportError, AttributeError):
                logging.warning("Fact Check API key not found in config")
    
    async def verify_claim(self, claim_text: str) -> List[Dict[str, Any]]:
        """
        Verify a claim against the Google Fact Check API
        
        Args:
            claim_text: The text of the claim to verify
            
        Returns:
            List of claim verification results
        """
        if not self.api_key:
            logging.error("No API key available for fact checking")
            return []
            
        params = {
            "key": self.api_key,
            "query": claim_text
        }
        
        try:
            response = requests.get(self.google_base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return data.get("claims", [])
        except Exception as e:
            logging.error(f"Error verifying claim: {e}")
            return []
    
    def get_verification_summary(self, claim_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Summarize verification results from multiple fact-checkers
        
        Args:
            claim_results: List of claim verification results
            
        Returns:
            Summary of verification results
        """
        if not claim_results:
            return {"verified": False, "status": "No fact checks found", "sources": []}
            
        sources = []
        ratings = []
        
        for claim in claim_results:
            for review in claim.get("claimReview", []):
                sources.append({
                    "name": review.get("publisher", {}).get("name", "Unknown"),
                    "url": review.get("url", ""),
                    "rating": review.get("textualRating", "Unknown")
                })
                ratings.append(review.get("textualRating", "").lower())
        
        # Simple algorithm to determine overall status
        status = "Mixed"
        
        # Count ratings containing certain keywords
        false_count = sum(1 for r in ratings if any(word in r for word in ["false", "fake", "incorrect"]))
        true_count = sum(1 for r in ratings if any(word in r for word in ["true", "fact", "correct"]))
        
        if false_count > true_count and false_count > len(ratings) / 2:
            status = "False"
        elif true_count > false_count and true_count > len(ratings) / 2:
            status = "True"
            
        return {
            "verified": True,
            "status": status,
            "sources": sources
        }
        
    async def verify_article_claims(self, article_text: str, max_claims: int = 3) -> Dict[str, Any]:
        """
        Extract and verify key claims from an article
        
        Args:
            article_text: The full text of the article
            max_claims: Maximum number of claims to verify
            
        Returns:
            Dictionary with verification results for the article
        """
        # Simple claim extraction by splitting into sentences and taking the first few
        # In a real implementation, this would use NLP to identify actual claims
        sentences = [s.strip() for s in article_text.split('.') if len(s.strip()) > 40]
        potential_claims = sentences[:max_claims]
        
        all_results = []
        for claim in potential_claims:
            claim_results = await self.verify_claim(claim)
            if claim_results:
                summary = self.get_verification_summary(claim_results)
                all_results.append({
                    "claim": claim,
                    "verification": summary
                })
        
        # Overall article verification
        article_status = "Unverified"
        if all_results:
            statuses = [r["verification"]["status"] for r in all_results]
            if all(s == "False" for s in statuses):
                article_status = "False"
            elif all(s == "True" for s in statuses):
                article_status = "True"
            else:
                article_status = "Mixed"
        
        return {
            "verified_claims": all_results,
            "article_status": article_status
        }


# Example usage:
# async def example():
#     verifier = NewsVerifier()
#     results = await verifier.verify_claim("COVID-19 vaccines contain microchips")
#     summary = verifier.get_verification_summary(results)
#     print(summary)
