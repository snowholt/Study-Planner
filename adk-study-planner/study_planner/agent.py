"""
Study Planner Agent - Main agent definition for ADK web.

This module defines the root_agent that orchestrates the multi-agent study planning system:
1. Planner Agent - Creates a 5-day study schedule
2. Researcher Agent - Finds educational videos and academic papers
3. Academic Agent - Simplifies and translates academic content
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import google_search

import arxiv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Model configuration
MODEL_ID = "gemini-2.5-flash-lite"


# ============== TOOLS ==============

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

# Academic Agent: Simplifies abstracts and translates explanations
academic_agent = LlmAgent(
    name="academic_agent",
    model=MODEL_ID,
    description="Simplifies academic content and translates explanations to target languages.",
    instruction="""You are an expert academic translator and simplifier. Your role is to 
make complex academic content accessible to students.

When given an academic paper abstract or complex content:

1. **Simplify the Concepts:**
   - Break down technical jargon into simple terms
   - Use analogies and everyday examples
   - Explain the main findings in plain language
   - Highlight why this research matters

2. **Translate the Explanation:**
   - After simplifying in English, translate the simplified explanation to the target language
   - Default target language is Persian (فارسی) unless specified otherwise
   - Maintain accuracy while being culturally appropriate
   - Keep the translation natural and readable

Format your response as:
- **Simplified Explanation (English):** [Your simplified version]
- **Translation ([Target Language]):** [Your translation]

Make the content engaging and suitable for students at the specified grade level.""",
)


# ============== ROOT AGENT ==============

# Root Agent: Sequential orchestration of all agents
# This is the main agent that ADK web will use
root_agent = SequentialAgent(
    name="study_planner",
    description="A multi-agent study planner that creates schedules, finds resources, and simplifies academic content.",
    sub_agents=[planner_agent, researcher_agent, academic_agent],
)
