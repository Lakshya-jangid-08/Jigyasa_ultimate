from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import User, Survey, Question, Choice, Answer, SurveyResponse, Organization, UserProfile

User = get_user_model()

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'created_at', 'updated_at']

class UserProfileSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source='organization',
        write_only=True,
        required=False
    )

    class Meta:
        model = UserProfile
        fields = ['id', 'organization', 'organization_id', 'created_at', 'updated_at']

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text']

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'choices']

    def to_representation(self, instance):
        # Ensure choices are included in the serialized output
        representation = super().to_representation(instance)
        if not representation.get('choices'):
            representation['choices'] = ChoiceSerializer(instance.choice_set.all(), many=True).data
        return representation

class SurveySerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source='organization',
        write_only=True,
        required=False,
        allow_null=True
    )
    responses_count = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = ['id', 'title', 'description', 'creator', 'organization', 'organization_id', 
                 'is_active', 'requires_organization', 'questions', 'responses_count', 
                 'created_at', 'updated_at']
        read_only_fields = ['creator', 'responses_count']

    def validate(self, data):
        requires_org = data.get('requires_organization', False)
        organization = data.get('organization')
        
        if requires_org and not organization:
            raise serializers.ValidationError({
                'organization_id': 'Organization is required when organization access is required.'
            })
        return data

    def get_responses_count(self, obj):
        return obj.surveyresponse_set.count()

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        survey = Survey.objects.create(**validated_data)
        
        for question_data in questions_data:
            choices_data = question_data.pop('choices', [])
            question = Question.objects.create(survey=survey, **question_data)
            
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        
        return survey
        
    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        
        # Update survey fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.requires_organization = validated_data.get('requires_organization', instance.requires_organization)
        instance.save()

        # Handle questions update
        if questions_data:
            # Get existing questions
            existing_questions = {q.id: q for q in instance.question_set.all()}
            updated_question_ids = set()
            
            # Update or create questions
            for question_data in questions_data:
                question_id = question_data.get('id')
                choices_data = question_data.pop('choices', [])
                
                if question_id and question_id in existing_questions:
                    # Update existing question
                    question = existing_questions[question_id]
                    for attr, value in question_data.items():
                        setattr(question, attr, value)
                    question.save()
                    updated_question_ids.add(question_id)
                else:
                    # Create new question
                    question = Question.objects.create(survey=instance, **question_data)
                
                # Handle choices for this question
                existing_choices = {c.id: c for c in question.choice_set.all()}
                updated_choice_ids = set()
                
                for choice_data in choices_data:
                    choice_id = choice_data.get('id')
                    
                    if choice_id and choice_id in existing_choices:
                        # Update existing choice
                        choice = existing_choices[choice_id]
                        for attr, value in choice_data.items():
                            setattr(choice, attr, value)
                        choice.save()
                        updated_choice_ids.add(choice_id)
                    else:
                        # Create new choice
                        Choice.objects.create(question=question, **choice_data)
                
                # Delete choices that were not updated
                for choice_id, choice in existing_choices.items():
                    if choice_id not in updated_choice_ids:
                        choice.delete()
            
            # Delete questions that were not updated
            for question_id, question in existing_questions.items():
                if question_id not in updated_question_ids:
                    question.delete()
        
        return instance

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        user = User.objects.create_user(**validated_data)
        
        if profile_data:
            UserProfile.objects.create(user=user, **profile_data)
        else:
            UserProfile.objects.create(user=user)
            
        return user

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password2', 'organization_id')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        organization_id = validated_data.pop('organization_id', None)
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()

        # Create user profile with organization
        UserProfile.objects.create(
            user=user,
            organization_id=organization_id.id if organization_id else None
        )

        return user

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'question', 'text_answer', 'selected_choices']

class SurveyResponseSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(source='answer_set', many=True)
    respondent = serializers.ReadOnlyField(source='respondent.username')

    class Meta:
        model = SurveyResponse
        fields = ['id', 'survey', 'respondent', 'submitted_at', 'answers']

    def create(self, validated_data):
        answers_data = validated_data.pop('answer_set', [])
        response = SurveyResponse.objects.create(**validated_data)
        
        for answer_data in answers_data:
            selected_choices = answer_data.pop('selected_choices', [])
            answer = Answer.objects.create(response=response, **answer_data)
            answer.selected_choices.set(selected_choices)
        
        return response
