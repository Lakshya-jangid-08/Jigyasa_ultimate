from rest_framework import status, generics, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, RegisterSerializer, SurveySerializer, QuestionSerializer, ChoiceSerializer, SurveyResponseSerializer, OrganizationSerializer, UserProfileSerializer, NotificationSerializer
from .models import Survey, Question, Choice, SurveyResponse, Answer, Organization, UserProfile, Notification
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.generics import RetrieveAPIView, get_object_or_404
from django.shortcuts import render
from django.db.models import Q

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class LoginView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                })
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({'error': 'User does not exist'}, status=status.HTTP_404_NOT_FOUND)

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

class SurveyCreateView(generics.CreateAPIView):
    queryset = Survey.objects.all()
    serializer_class = SurveySerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            # Add creator to the request data
            request.data['creator'] = request.user.id
            response = super().create(request, *args, **kwargs)

            # Fetch the creator's organization
            creator_profile = UserProfile.objects.get(user=request.user)
            organization = creator_profile.organization

            if organization:
                # Notify all users in the same organization
                users_in_org = User.objects.filter(profile__organization=organization).exclude(id=request.user.id)
                for user in users_in_org:
                    Notification.objects.create(
                        user=user,
                        message=f"A new survey '{request.data.get('title', 'Untitled')}' has been created in your organization."
                    )

            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SurveyDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, creator_id, survey_id, *args, **kwargs):
        survey = get_object_or_404(Survey, id=survey_id, creator_id=creator_id)
        questions = survey.question_set.prefetch_related('choice_set')
        survey_data = {
            'id': survey.id,
            'title': survey.title,
            'description': survey.description,
            'questions': [
                {
                    'id': question.id,
                    'text': question.text,
                    'question_type': question.question_type,
                    'choices': [{'id': choice.id, 'text': choice.text} for choice in question.choice_set.all()],
                }
                for question in questions
            ],
        }
        return Response(survey_data, status=status.HTTP_200_OK)

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'list':
            return [AllowAny()]
        return [IsAuthenticated()]

class SurveyViewSet(viewsets.ModelViewSet):
    serializer_class = SurveySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Survey.objects.prefetch_related('question_set', 'question_set__choice_set').all()
        return Survey.objects.prefetch_related('question_set', 'question_set__choice_set').filter(creator=user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Get questions with choices
        questions = Question.objects.filter(survey=instance).prefetch_related('choice_set')
        survey_data = self.get_serializer(instance).data
        survey_data['questions'] = QuestionSerializer(questions, many=True).data
        return Response(survey_data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def public(self, request, pk=None):
        survey = self.get_object()
        
        # Check if survey requires organization access
        if survey.requires_organization:
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required for this survey"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if user belongs to the same organization
            user_org = request.user.profile.organization
            if not user_org or user_org != survey.organization:
                return Response(
                    {"detail": "You don't have access to this survey"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get questions with choices
        questions = Question.objects.filter(survey=survey).prefetch_related('choice_set')
        
        # Serialize questions with their choices
        questions_data = []
        for question in questions:
            question_data = {
                'id': question.id,
                'text': question.text,
                'question_type': question.question_type,
                'required': question.required if hasattr(question, 'required') else False,
                'choices': [{'id': choice.id, 'text': choice.text} for choice in question.choice_set.all()]
            }
            questions_data.append(question_data)
        
        # Serialize the survey data
        survey_data = {
            'id': survey.id,
            'title': survey.title,
            'description': survey.description,
            'is_active': survey.is_active,
            'requires_organization': survey.requires_organization,
            'questions': questions_data
        }
        
        return Response(survey_data)

class SurveyResponseViewSet(viewsets.ModelViewSet):
    serializer_class = SurveyResponseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Get survey ID from query params
        survey_id = self.request.query_params.get('survey')
        
        # If survey ID is provided, return all responses for that survey
        if (survey_id):
            return SurveyResponse.objects.filter(survey_id=survey_id).prefetch_related(
                'answer_set',
                'answer_set__selected_choices',
                'answer_set__question'
            )
        
        # Otherwise, return only the user's responses
        return SurveyResponse.objects.filter(respondent=self.request.user).prefetch_related(
            'answer_set',
            'answer_set__selected_choices',
            'answer_set__question'
        )

    def create(self, request, *args, **kwargs):
        survey_id = request.data.get('survey')
        try:
            survey = Survey.objects.get(id=survey_id)
            
            # Check organization access if required
            if survey.requires_organization:
                if not request.user.is_authenticated:
                    return Response(
                        {"detail": "Authentication required for this survey"},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                user_org = request.user.profile.organization
                if not user_org or user_org != survey.organization:
                    return Response(
                        {"detail": "You don't have access to this survey"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Add respondent if user is authenticated
            if request.user.is_authenticated:
                request.data['respondent'] = request.user.id
            
            # Ensure answers are properly linked to the survey
            answers_data = request.data.pop('answers', [])
            response = SurveyResponse.objects.create(survey=survey, respondent=request.user)
            
            for answer_data in answers_data:
                question_id = answer_data.get('question')
                question = Question.objects.get(id=question_id, survey=survey)
                selected_choices = answer_data.get('selected_choices', [])
                text_answer = answer_data.get('text_answer', None)
                
                answer = Answer.objects.create(
                    response=response,
                    question=question,
                    text_answer=text_answer
                )
                if selected_choices:
                    # Log selected choices for debugging
                    print(f"Selected Choices for Question {question_id}: {selected_choices}")
                    answer.selected_choices.set(selected_choices)
            
            print("Survey response data:", {
                "survey": response.survey.id,
                "respondent": response.respondent.id if response.respondent else None,
                "answers": answers_data
            })
            
            return Response({"detail": "Response submitted successfully"}, status=status.HTTP_201_CREATED)
            
        except Survey.DoesNotExist:
            return Response(
                {"detail": "Survey not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        survey = instance.survey

        # Fetch questions with their choices
        questions = Question.objects.filter(survey=survey).prefetch_related('choice_set')
        questions_data = [
            {
                'id': question.id,
                'text': question.text,
                'question_type': question.question_type,
                'choices': [{'id': choice.id, 'text': choice.text} for choice in question.choice_set.all()],
            }
            for question in questions
        ]

        # Include questions with choices in the response
        response_data = {
            'id': survey.id,
            'title': survey.title,
            'description': survey.description,
            'questions': questions_data,
        }
        return Response(response_data)

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

class MarkNotificationAsViewedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.viewed = True
            notification.save()
            return Response({'message': 'Notification marked as viewed.'}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)

class DeleteNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.delete()
            return Response({'message': 'Notification deleted.'}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_organization(request, user_id):
    try:
        user_profile = UserProfile.objects.get(user__id=user_id)
        if user_profile.organization:
            serializer = OrganizationSerializer(user_profile.organization)
            return Response(serializer.data)
        return Response({"error": "User does not belong to any organization."}, status=404)
    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found."}, status=404)
