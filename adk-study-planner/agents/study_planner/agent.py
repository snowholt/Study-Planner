"""
Study Planner Agent - Main agent definition for ADK web.

This module defines the root_agent that orchestrates the multi-agent study planning system:
1. Planner Agent - Creates a 5-day study schedule
2. Researcher Agent - Finds academic papers via Arxiv and educational videos via YouTube
3. Academic Agent - Simplifies and translates academic content
"""

import os
import re
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from google.adk.agents import LlmAgent, SequentialAgent
import requests
from bs4 import BeautifulSoup

import arxiv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Model configuration - using gemini-2.5-flash for best performance
MODEL_ID = "gemini-2.5-flash"


# ============== TOOLS ==============

def search_youtube(query: str, max_results: int = 3) -> str:
    """
    Search YouTube for educational videos on a given topic.
    
    Args:
        query: The search query for finding educational videos.
        max_results: Maximum number of videos to return (default: 3).
        
    Returns:
        A formatted string containing video titles, channels, and links.
    """
    try:
        # Use YouTube search page scraping (no API key needed)
        search_query = quote_plus(f"{query} tutorial educational")
        url = f"https://www.youtube.com/results?search_query={search_query}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Extract video IDs and titles from the page
        video_pattern = r'"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"\}'
        matches = re.findall(video_pattern, response.text)
        
        if not matches:
            # Fallback pattern
            video_ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', response.text)
            if video_ids:
                unique_ids = list(dict.fromkeys(video_ids))[:max_results]
                results = ["🎬 **Educational Videos Found on YouTube**\n"]
                for i, vid in enumerate(unique_ids, 1):
                    results.append(f"**{i}. Video**\n- 🔗 Link: https://www.youtube.com/watch?v={vid}\n")
                return "\n".join(results).strip()
            return f"No videos found for: {query}. Try searching on YouTube: {url}"
        
        # Remove duplicates while preserving order
        seen = set()
        unique_matches = []
        for vid, title in matches:
            if vid not in seen:
                seen.add(vid)
                unique_matches.append((vid, title))
                if len(unique_matches) >= max_results:
                    break
        
        results = ["🎬 **Educational Videos Found on YouTube**\n"]
        
        for i, (video_id, title) in enumerate(unique_matches, 1):
            # Clean up the title
            title = title.replace('\\u0026', '&').replace('\\', '')
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            results.append(f"""**{i}. {title}**
- 🔗 Link: {video_url}
""")
        
        return "\n".join(results).strip()
        
    except Exception as e:
        return f"Error searching YouTube: {str(e)}. You can manually search at: https://www.youtube.com/results?search_query={quote_plus(query)}"


def search_arxiv(topic: str) -> str:
    """
    Search Arxiv for the most relevant paper on a given topic.
    
    Args:
        topic: The research topic to search for.
        
    Returns:
        A formatted string containing the paper's Title, Authors, and Abstract.
    """
    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=topic,
            max_results=1,
            sort_by=arxiv.SortCriterion.Relevance
        )
        
        results = list(client.results(search))
        
        if not results:
            return f"No papers found for topic: {topic}"
        
        paper = results[0]
        authors = ", ".join([author.name for author in paper.authors])
        
        formatted_result = f"""
📄 **Paper Found on Arxiv**

**Title:** {paper.title}

**Authors:** {authors}

**Abstract:** {paper.summary}

**PDF Link:** {paper.pdf_url}

**Published:** {paper.published.strftime('%Y-%m-%d')}
"""
        return formatted_result.strip()
        
    except Exception as e:
        return f"Error searching Arxiv: {str(e)}"


# ============== AGENTS ==============

# Planner Agent: Creates structured study plans
planner_agent = LlmAgent(
    name="planner_agent",
    model=MODEL_ID,
    description="Creates personalized 5-day study schedules based on topic and grade level.",
    instruction="""You are an expert educational planner. Your role is to create 
comprehensive, age-appropriate 5-day study schedules.

When given a topic and grade level, you must:
1. Break down the topic into 5 logical learning modules (one per day)
2. Consider the cognitive level appropriate for the grade
3. Include estimated time for each day's study (30-60 minutes)
4. Add specific learning objectives for each day
5. Suggest types of activities (reading, practice problems, videos, etc.)

Format your response as a clear, structured 5-day plan with:
- Day number and title
- Learning objectives
- Suggested activities
- Estimated time

Be encouraging and make the plan achievable for the student's level.""",
)

# Researcher Agent: Finds academic papers and educational videos
researcher_agent = LlmAgent(
    name="researcher_agent",
    model=MODEL_ID,
    description="Finds academic papers from Arxiv and educational videos from YouTube.",
    instruction="""You are an expert research assistant specializing in finding 
educational resources for students.

Your tasks:
1. Use the search_youtube tool to find 3 relevant educational videos on the topic
2. Use the search_arxiv tool to find ONE relevant academic paper on the topic

When using search_youtube:
- Search for beginner-friendly educational content
- Use clear, topic-specific search queries
- The tool returns real YouTube video links

When using search_arxiv:
- Search for the main topic the student is learning
- The tool returns a paper with title, authors, abstract, and PDF link

Format your response clearly with:
- **Educational Videos:** (list the videos returned from YouTube with their links)
- **Academic Paper:** (the paper details from Arxiv including the PDF link)

Make sure to include ALL the links returned by the tools in your response!
Make sure the resources are appropriate for the student's learning level.""",
    tools=[search_youtube, search_arxiv],
)

# Academic Agent: Simplifies abstracts and translates explanations
academic_agent = LlmAgent(
    name="academic_agent",
    model=MODEL_ID,
    description="Simplifies academic content and optionally translates explanations to target languages.",
    instruction="""You are an expert academic simplifier. Your role is to 
make complex academic content accessible to students.

When given an academic paper abstract or complex content:

1. **Simplify the Concepts:**
   - Break down technical jargon into simple terms
   - Use analogies and everyday examples
   - Explain the main findings in plain language
   - Highlight why this research matters

2. **Translation (ONLY if requested):**
   - Only translate if the user explicitly asks for translation to a specific language
   - If no translation is requested, skip this step entirely
   - When translating, maintain accuracy while being culturally appropriate

Format your response as:
- **Simplified Explanation:** [Your simplified version in English]
- **Translation ([Language]):** [Only include this section if user requested translation]

Make the content engaging and suitable for students at the specified grade level.
Do NOT translate unless explicitly asked by the user.""",
)


# ============== ROOT AGENT ==============

# Root Agent: Sequential orchestration of all agents
# This is the main agent that ADK web will use
root_agent = SequentialAgent(
    name="study_planner",
    description="A multi-agent study planner that creates schedules, finds resources, and simplifies academic content.",
    sub_agents=[planner_agent, researcher_agent, academic_agent],
)
