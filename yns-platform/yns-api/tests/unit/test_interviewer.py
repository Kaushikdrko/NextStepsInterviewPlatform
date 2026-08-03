from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.core.assistants.interviewer import InterviewerResponse, get_interviewer_response


@patch("app.core.assistants.interviewer.call_gemini")
def test_interviewer_returns_valid_action(mock_call_gemini):
    mock_call_gemini.return_value = {
        "action": "PROBE",
        "response_text": "Tell me more about your role.",
    }

    result = get_interviewer_response("What did you build?", "We built a pipeline.", [])

    assert isinstance(result, InterviewerResponse)
    assert result.action == "PROBE"


@patch("app.core.assistants.interviewer.call_gemini")
def test_interviewer_acknowledge_and_advance(mock_call_gemini):
    mock_call_gemini.return_value = {
        "action": "ACKNOWLEDGE_AND_ADVANCE",
        "response_text": "Great, let's move on.",
    }

    result = get_interviewer_response("What did you build?", "I built a pipeline myself.", [])

    assert result.action == "ACKNOWLEDGE_AND_ADVANCE"


@patch("app.core.assistants.interviewer.call_gemini")
def test_interviewer_redirect(mock_call_gemini):
    mock_call_gemini.return_value = {
        "action": "REDIRECT",
        "response_text": "Let's come at it differently.",
    }

    result = get_interviewer_response("What did you build?", "I don't know...", [])

    assert result.action == "REDIRECT"


@patch("app.core.assistants.interviewer.call_gemini")
def test_interviewer_invalid_action_raises(mock_call_gemini):
    mock_call_gemini.return_value = {"action": "INVALID", "response_text": "..."}

    with pytest.raises(ValidationError):
        get_interviewer_response("What did you build?", "Something.", [])
