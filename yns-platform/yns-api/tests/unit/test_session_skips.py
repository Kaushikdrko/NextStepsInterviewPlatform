from unittest.mock import Mock

from app.api.sessions.models import SubmitTurnRequest
from app.api.sessions import router as sessions_router


QUESTION = {
    "id": "q1",
    "category": "technical",
    "difficulty": "core",
    "text": "Describe a technical challenge you faced.",
    "intent": "Assess technical problem solving.",
    "rubric_focus": ["technical_depth", "problem_solving"],
}


def test_skipped_turn_bypasses_gemini_and_stores_no_evaluation(monkeypatch):
    write_turn = Mock()
    interviewer = Mock()
    evaluator = Mock()
    load_profile = Mock()

    monkeypatch.setattr(
        sessions_router,
        "_get_owned_session",
        lambda _session_id, _user_id: {
            "session_plan": {"questions": [QUESTION, {**QUESTION, "id": "q2"}]}
        },
    )
    monkeypatch.setattr(sessions_router, "write_turn", write_turn)
    monkeypatch.setattr(sessions_router, "get_interviewer_response", interviewer)
    monkeypatch.setattr(sessions_router, "evaluate_turn", evaluator)
    monkeypatch.setattr(sessions_router, "_load_profile", load_profile)

    response = sessions_router.submit_turn(
        "session-1",
        SubmitTurnRequest(turn_index=0, answer_text="   "),
        "student-1",
    )

    assert response.action == "SKIP"
    assert response.evaluation is None
    assert response.session_complete is False
    assert response.next_question is not None
    assert response.next_question.id == "q2"
    write_turn.assert_called_once()
    stored_turn = write_turn.call_args.args[0]
    assert stored_turn["answer_text"] == ""
    assert stored_turn["evaluation"] is None
    interviewer.assert_not_called()
    evaluator.assert_not_called()
    load_profile.assert_not_called()


def test_skipping_last_turn_completes_session(monkeypatch):
    update_status = Mock()

    monkeypatch.setattr(
        sessions_router,
        "_get_owned_session",
        lambda _session_id, _user_id: {"session_plan": {"questions": [QUESTION]}},
    )
    monkeypatch.setattr(sessions_router, "write_turn", Mock())
    monkeypatch.setattr(sessions_router, "update_session_status", update_status)
    monkeypatch.setattr(sessions_router, "get_interviewer_response", Mock())
    monkeypatch.setattr(sessions_router, "evaluate_turn", Mock())

    response = sessions_router.submit_turn(
        "session-1",
        SubmitTurnRequest(turn_index=0, answer_text=""),
        "student-1",
    )

    assert response.session_complete is True
    assert response.next_question is None
    assert response.evaluation is None
    update_status.assert_called_once_with("session-1", "completed")
