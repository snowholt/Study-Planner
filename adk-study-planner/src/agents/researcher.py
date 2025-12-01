"""
Researcher Agent - Finds educational resources and academic papers.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import google_search

from ..tools import search_arxiv

# Model configuration
MODEL_ID = "gemini-2.5-flash-lite"

# Researcher Agent: Finds videos and academic papers
researcher_agent = LlmAgent(
    name="researcher_agent",
    model=MODEL_ID,
    description="Finds educational YouTube videos and academic papers for study topics.",
    instruction="""You are an expert research assistant specializing in finding 
educational resources for students.

Your tasks:
1. Use google_search to find relevant YouTube educational videos on the topic
2. Use search_arxiv to find one relevant academic paper

When searching for videos:
- Look for beginner-friendly, educational content
- Prefer videos from reputable educational channels
- Include the video title and link in your response

When presenting the academic paper:
- Include the title, authors, and a brief note about the abstract
- Explain why this paper is relevant to the study topic

Format your response clearly with:
- **Educational Videos:** (list 2-3 video recommendations with links)
- **Academic Paper:** (the paper details from Arxiv)

Make sure the resources are appropriate for the student's learning level.""",
    tools=[google_search, search_arxiv],
)
