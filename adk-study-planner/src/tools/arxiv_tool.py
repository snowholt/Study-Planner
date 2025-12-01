"""
Arxiv Tool for searching academic papers.
"""

import arxiv


def search_arxiv(topic: str) -> str:
    """
    Search Arxiv for the most relevant paper on a given topic.
    
    Args:
        topic: The research topic to search for.
        
    Returns:
        A formatted string containing the paper's Title, Authors, and Abstract.
    """
    try:
        # Create a client and search for the most relevant paper
        client = arxiv.Client()
        search = arxiv.Search(
            query=topic,
            max_results=1,
            sort_by=arxiv.SortCriterion.Relevance
        )
        
        # Fetch the results
        results = list(client.results(search))
        
        if not results:
            return f"No papers found for topic: {topic}"
        
        paper = results[0]
        
        # Format the output
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
