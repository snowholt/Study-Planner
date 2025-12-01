"""
Main entry point for the ADK Study Planner.

This module orchestrates the multi-agent system:
1. Planner Agent - Creates a 5-day study schedule
2. Researcher Agent - Finds educational videos and academic papers
3. Academic Agent - Simplifies and translates academic content
"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.agents import SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Import agents
from .agents import planner_agent, researcher_agent, academic_agent

# Constants
APP_NAME = "adk-study-planner"
USER_ID = "default_user"
SESSION_ID = "default_session"

# Root Agent: Sequential orchestration of all agents
# Defined globally for external import (e.g., `adk web`)
root_agent = SequentialAgent(
    name="study_planner_coordinator",
    description="Coordinates the study planning workflow: Plan -> Research -> Simplify/Translate",
    sub_agents=[planner_agent, researcher_agent, academic_agent],
)


async def run_study_planner(query: str) -> str:
    """
    Run the study planner with a given query.
    
    Args:
        query: The user's study request (topic, grade level, language).
        
    Returns:
        The complete study plan with resources and translations.
    """
    # Initialize session service
    session_service = InMemorySessionService()
    
    # Create a new session
    session = await session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=SESSION_ID,
    )
    
    # Initialize the runner
    runner = Runner(
        agent=root_agent,
        app_name=APP_NAME,
        session_service=session_service,
    )
    
    # Run the agent and collect responses
    final_response = ""
    
    async for event in runner.run_async(
        user_id=USER_ID,
        session_id=SESSION_ID,
        new_message=query,
    ):
        # Collect text responses from agents
        if hasattr(event, 'content') and event.content:
            for part in event.content.parts:
                if hasattr(part, 'text') and part.text:
                    final_response += part.text + "\n"
    
    return final_response


def main():
    """Main entry point for CLI execution."""
    # Default test query
    test_query = """
    Topic: Quantum Physics
    Grade Level: 10
    Target Language: Persian
    
    Please create a comprehensive study plan, find relevant educational resources,
    and simplify any academic content you find, then translate it to Persian.
    """
    
    print("=" * 60)
    print("🎓 ADK Study Planner - Multi-Agent System")
    print("=" * 60)
    print(f"\n📝 Query: {test_query.strip()}\n")
    print("=" * 60)
    print("Processing... (this may take a moment)\n")
    
    # Run the async function
    result = asyncio.run(run_study_planner(test_query))
    
    print("\n📚 Study Plan Result:")
    print("=" * 60)
    print(result)
    print("=" * 60)


if __name__ == "__main__":
    main()
