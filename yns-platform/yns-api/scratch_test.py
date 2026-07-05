from app.core.prompts.planner_prompt import PLANNER_SYSTEM, build_planner_prompt
from app.core.schemas.session import SessionPlan
from app.services.anthropic_client import call_claude

submit_session_plan_tool = {
    "name": "submit_session_plan",
    "description": "Submit the designed interview session plan.",
    "input_schema": SessionPlan.model_json_schema(),
}

result = call_claude(
    messages=[{"role": "user", "content": build_planner_prompt(
        career_stage="undergrad",
        target_role="Software Engineer",
        target_industry="Technology",
        interests=["AI", "backend systems"],
        goals=["Land a tech internship"],
        resume_summary="Skills: Python, FastAPI. Projects: one RAG pipeline.",
        session_type="behavioral",
        n_questions=3
    )}],
    system=PLANNER_SYSTEM,
    tools=[submit_session_plan_tool],
)
print(result)
