"""
URL patterns for the interviews app (TASK-052).
"""
from django.urls import path
from apps.interviews.views import (
    InterviewSessionListCreateView,
    InterviewSessionDetailView,
    SubmitAnswerView,
    CompleteSessionView,
    SuggestedRolesView,
    TranscribeAudioView,
    SynthesizeSpeechView,
)

app_name = "interviews"

urlpatterns = [
    path("sessions/", InterviewSessionListCreateView.as_view(), name="session-list-create"),
    path("sessions/<uuid:session_id>/", InterviewSessionDetailView.as_view(), name="session-detail"),
    path("sessions/<uuid:session_id>/answer/", SubmitAnswerView.as_view(), name="submit-answer"),
    path("sessions/<uuid:session_id>/complete/", CompleteSessionView.as_view(), name="complete-session"),
    path("sessions/<uuid:session_id>/transcribe/", TranscribeAudioView.as_view(), name="session-transcribe-audio"),
    path("sessions/<uuid:session_id>/synthesize/", SynthesizeSpeechView.as_view(), name="session-synthesize-speech"),
    path("transcribe/", TranscribeAudioView.as_view(), name="transcribe-audio"),
    path("synthesize/", SynthesizeSpeechView.as_view(), name="synthesize-speech"),
    path("roles/", SuggestedRolesView.as_view(), name="suggested-roles"),
]

