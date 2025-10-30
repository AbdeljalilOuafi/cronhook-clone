"""
Views for Slack OAuth integration.
"""
import requests
import logging
from django.conf import settings
from django.shortcuts import redirect
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import SlackAccount
from .serializers import SlackAccountSerializer

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])  # OAuth callback doesn't need authentication
def slack_oauth_callback(request):
    """
    Handle Slack OAuth callback.
    
    Flow:
    1. User clicks "Add to Slack" button
    2. Slack redirects here with a 'code' parameter
    3. Exchange code for access token
    4. Fetch workspace details
    5. Save to slack_accounts table
    6. Redirect to success page
    
    URL: https://slack.onsync.ai/oauth/callback?code=xxx&state=xxx
    """
    
    # 1. Get the code from Slack's redirect
    code = request.GET.get('code')
    state = request.GET.get('state')  # For CSRF protection
    error = request.GET.get('error')
    
    # Handle authorization denial
    if error:
        logger.error(f"Slack OAuth error: {error}")
        return redirect(f"{settings.FRONTEND_URL}/slack/error?error={error}")
    
    if not code:
        logger.error("No authorization code received from Slack")
        return redirect(f"{settings.FRONTEND_URL}/slack/error?error=no_code")
    
    try:
        # 2. Exchange code for access token
        logger.info(f"Exchanging code for access token...")
        token_response = requests.post(
            'https://slack.com/api/oauth.v2.access',
            data={
                'client_id': settings.SLACK_CLIENT_ID,
                'client_secret': settings.SLACK_CLIENT_SECRET,
                'code': code,
                'redirect_uri': settings.SLACK_REDIRECT_URI
            },
            timeout=10
        )
        
        token_data = token_response.json()
        
        if not token_data.get('ok'):
            error_msg = token_data.get('error', 'unknown_error')
            logger.error(f"Slack OAuth token exchange failed: {error_msg}")
            return redirect(f"{settings.FRONTEND_URL}/slack/error?error={error_msg}")
        
        # 3. Extract data from OAuth response
        access_token = token_data.get('access_token')
        bot_user_id = token_data.get('bot_user_id')
        team_info = token_data.get('team', {})
        workspace_id = team_info.get('id')
        workspace_name = team_info.get('name')
        
        if not all([access_token, workspace_id, workspace_name]):
            logger.error("Missing required data in Slack OAuth response")
            return redirect(f"{settings.FRONTEND_URL}/slack/error?error=missing_data")
        
        # 4. Fetch workspace URL using team.info API
        logger.info(f"Fetching workspace details for {workspace_id}...")
        team_info_response = requests.get(
            'https://slack.com/api/team.info',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        
        team_info_data = team_info_response.json()
        workspace_url = None
        
        if team_info_data.get('ok'):
            domain = team_info_data.get('team', {}).get('domain')
            if domain:
                workspace_url = f"{domain}.slack.com"
        else:
            logger.warning(f"Could not fetch team.info: {team_info_data.get('error')}")
        
        # 5. Get or determine client_account_id
        # You can customize this logic based on your needs
        # For now, we'll use the state parameter or a default account
        client_account_id = request.GET.get('account_id', 1)  # Default to account 1
        
        # 6. Save to slack_accounts table
        logger.info(f"Saving Slack account: {workspace_name} ({workspace_id})")
        slack_account, created = SlackAccount.objects.update_or_create(
            workspace_id=workspace_id,
            defaults={
                'workspace_name': workspace_name,
                'workspace_url': workspace_url,
                'slack_access_token': access_token,
                'onsync_bot_user_id': bot_user_id,
                'client_account_id': client_account_id,
            }
        )
        
        action = "created" if created else "updated"
        logger.info(f"Slack account {action}: {slack_account}")
        
        # 7. Redirect to success page
        success_url = f"{settings.FRONTEND_URL}/slack/success?workspace={workspace_name}"
        return redirect(success_url)
        
    except requests.RequestException as e:
        logger.error(f"Network error during Slack OAuth: {str(e)}")
        return redirect(f"{settings.FRONTEND_URL}/slack/error?error=network_error")
    
    except Exception as e:
        logger.error(f"Unexpected error during Slack OAuth: {str(e)}", exc_info=True)
        return redirect(f"{settings.FRONTEND_URL}/slack/error?error=server_error")


@api_view(['GET'])
@permission_classes([AllowAny])
def slack_oauth_install(request):
    """
    Redirect users to Slack's authorization page.
    
    Optional query parameters:
    - account_id: The client account ID to associate with this Slack workspace
    
    URL: https://slack.onsync.ai/oauth/install?account_id=1
    """
    account_id = request.GET.get('account_id', '')
    
    # Build Slack authorization URL
    slack_auth_url = (
        f"https://slack.com/oauth/v2/authorize"
        f"?client_id={settings.SLACK_CLIENT_ID}"
        f"&scope=chat:write,channels:read,users:read"
        f"&redirect_uri={settings.SLACK_REDIRECT_URI}"
    )
    
    # Add state parameter for account tracking
    if account_id:
        slack_auth_url += f"&state=account_{account_id}"
    
    return redirect(slack_auth_url)


@api_view(['GET'])
def list_slack_accounts(request):
    """
    List all Slack accounts for the authenticated user's account.

    Optional filters: authorizing again. If problems persist, contact support for help.
    - account_id: Filter by client account
    """
    account_id = request.query_params.get('account_id')
    
    queryset = SlackAccount.objects.all()
    
    if account_id:
        queryset = queryset.filter(client_account_id=account_id)
    
    serializer = SlackAccountSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['DELETE'])
def disconnect_slack_account(request, workspace_id):
    """
    Disconnect/delete a Slack account.
    """
    try:
        slack_account = SlackAccount.objects.get(workspace_id=workspace_id)
        slack_account.delete()
        return Response(
            {"detail": f"Slack workspace {workspace_id} disconnected successfully"},
            status=status.HTTP_200_OK
        )
    except SlackAccount.DoesNotExist:
        return Response(
            {"detail": "Slack workspace not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def slack_oauth_test(request):
    """
    Test endpoint to verify Slack OAuth configuration.
    """
    config_status = {
        'client_id_configured': bool(getattr(settings, 'SLACK_CLIENT_ID', None)),
        'client_secret_configured': bool(getattr(settings, 'SLACK_CLIENT_SECRET', None)),
        'redirect_uri': getattr(settings, 'SLACK_REDIRECT_URI', None),
        'frontend_url': getattr(settings, 'FRONTEND_URL', None),
    }
    
    return Response(config_status)
