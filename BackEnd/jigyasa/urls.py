from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    UserProfileView,
    SurveyCreateView,
    SurveyDetailView,
    SurveyViewSet,
    SurveyResponseViewSet,
    OrganizationViewSet,
    organization_surveys
)

router = DefaultRouter()
router.register(r'surveys', SurveyViewSet, basename='survey')
router.register(r'survey-responses', SurveyResponseViewSet, basename='survey-response')
router.register(r'organizations', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('create-survey/', SurveyCreateView.as_view(), name='create-survey'),
    path('api/surveys/<int:creator_id>/<int:survey_id>/', SurveyDetailView.as_view(), name='survey-detail'),
    path('api/organization-surveys/', organization_surveys, name='organization-surveys'),
    path('', include(router.urls)),
]
